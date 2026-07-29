const { createHash } = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const https = require("node:https");
const path = require("node:path");
const { Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");

const repositoryOwner = "Endopterygota";
const repositoryName = "MKWii_TrackInstaller";
const latestReleaseUrl = `https://api.github.com/repos/${repositoryOwner}/${repositoryName}/releases/latest`;
const maximumAssetSize = 512 * 1024 * 1024;
const allowedHosts = new Set([
  "api.github.com",
  "github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com",
]);

function parseVersion(value) {
  const match = String(value || "").trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/i);
  if (!match) throw new Error(`Ungültige Versionsnummer: ${value}`);
  return match.slice(1).map(Number);
}

function normalizeVersion(value) {
  return parseVersion(value).join(".");
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function selectPortableAsset(release, version) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const escapedVersion = normalizeVersion(version).replace(/\./g, "\\.");
  const preferredPattern = new RegExp(`^MKWii-Track-Installer-${escapedVersion}-portable\\.exe$`, "i");
  const legacyPattern = new RegExp(`^MKWii-Track-Installer-v?${escapedVersion}\\.exe$`, "i");
  const candidates = assets.filter((asset) => asset?.state === "uploaded" && typeof asset.name === "string");
  return candidates.find((asset) => preferredPattern.test(asset.name))
    || candidates.find((asset) => legacyPattern.test(asset.name))
    || null;
}

function validateHttpsUrl(rawUrl, expectedPathPrefix = "") {
  const parsed = new URL(String(rawUrl || ""));
  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
    throw new Error("Die Update-Adresse ist nicht vertrauenswürdig.");
  }
  if (expectedPathPrefix && !parsed.pathname.toLowerCase().startsWith(expectedPathPrefix.toLowerCase())) {
    throw new Error("Das Release-Asset gehört nicht zum erwarteten Repository.");
  }
  return parsed;
}

function request(url, headers, redirectsLeft = 5) {
  const target = validateHttpsUrl(url);
  return new Promise((resolve, reject) => {
    const call = https.get(target, { headers }, (response) => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        if (redirectsLeft <= 0) {
          reject(new Error("Zu viele Weiterleitungen beim Update-Download."));
          return;
        }
        const redirected = new URL(response.headers.location, target);
        try { validateHttpsUrl(redirected); }
        catch (error) { reject(error); return; }
        resolve(request(redirected, headers, redirectsLeft - 1));
        return;
      }
      if (status !== 200) {
        response.resume();
        reject(new Error(`GitHub antwortete mit HTTP ${status}.`));
        return;
      }
      resolve(response);
    });
    call.setTimeout(30000, () => call.destroy(new Error("Zeitüberschreitung bei der Verbindung zu GitHub.")));
    call.once("error", reject);
  });
}

async function readJson(url) {
  const response = await request(url, {
    Accept: "application/vnd.github+json",
    "User-Agent": "MKWii-Track-Installer-Updater",
    "X-GitHub-Api-Version": "2022-11-28",
  });
  const chunks = [];
  let received = 0;
  for await (const chunk of response) {
    received += chunk.length;
    if (received > 2 * 1024 * 1024) throw new Error("Die GitHub-Antwort ist unerwartet groß.");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("Die GitHub-Release-Antwort konnte nicht gelesen werden."); }
}

function validateRelease(release, currentVersion) {
  if (!release || release.draft || release.prerelease) throw new Error("Kein stabiles GitHub-Release gefunden.");
  const latestVersion = normalizeVersion(release.tag_name);
  const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
  const result = {
    currentVersion: normalizeVersion(currentVersion),
    latestVersion,
    updateAvailable,
    releaseUrl: typeof release.html_url === "string" ? release.html_url : "",
    publishedAt: typeof release.published_at === "string" ? release.published_at : "",
    assetName: null,
    assetSize: null,
    checksumAvailable: false,
  };
  if (!updateAvailable) return { result, asset: null };

  const asset = selectPortableAsset(release, latestVersion);
  if (!asset) throw new Error(`Für v${latestVersion} wurde keine passende portable EXE gefunden.`);
  if (!Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > maximumAssetSize) {
    throw new Error("Das Update-Asset hat eine ungültige Größe.");
  }
  const expectedPrefix = `/${repositoryOwner}/${repositoryName}/releases/download/`;
  validateHttpsUrl(asset.browser_download_url, expectedPrefix);
  if (asset.digest != null && !/^sha256:[a-f0-9]{64}$/i.test(asset.digest)) {
    throw new Error("Die von GitHub gemeldete Prüfsumme ist ungültig.");
  }

  result.assetName = asset.name;
  result.assetSize = asset.size;
  result.checksumAvailable = Boolean(asset.digest);
  return { result, asset };
}

function isPathInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return Boolean(relative) && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function createUpdateService({ currentVersion, updatesDirectory, emitProgress }) {
  let checkedAsset = null;
  let downloadedUpdate = null;
  let downloadPromise = null;

  async function check() {
    const release = await readJson(latestReleaseUrl);
    const { result, asset } = validateRelease(release, currentVersion);
    checkedAsset = asset;
    downloadedUpdate = null;
    return result;
  }

  async function download() {
    if (downloadPromise) return downloadPromise;
    if (!checkedAsset) throw new Error("Bitte zuerst nach Updates suchen.");

    downloadPromise = (async () => {
      const safeName = path.basename(checkedAsset.name);
      if (safeName !== checkedAsset.name || path.extname(safeName).toLowerCase() !== ".exe") {
        throw new Error("Der Dateiname des Update-Assets ist ungültig.");
      }
      const versionDirectory = path.join(updatesDirectory, normalizeVersion(checkedAsset.name.match(/v?(\d+\.\d+\.\d+)/i)?.[1] || ""));
      const finalPath = path.join(versionDirectory, safeName);
      const partialPath = `${finalPath}.part`;
      if (!isPathInside(updatesDirectory, finalPath)) throw new Error("Ungültiger Update-Zielpfad.");

      await fsp.mkdir(versionDirectory, { recursive: true });
      await fsp.rm(partialPath, { force: true });
      const response = await request(checkedAsset.browser_download_url, {
        Accept: "application/octet-stream",
        "User-Agent": "MKWii-Track-Installer-Updater",
      });

      const hash = createHash("sha256");
      let received = 0;
      let lastPercent = -1;
      const meter = new Transform({
        transform(chunk, _encoding, callback) {
          received += chunk.length;
          if (received > checkedAsset.size || received > maximumAssetSize) {
            callback(new Error("Der Update-Download ist größer als von GitHub angekündigt."));
            return;
          }
          hash.update(chunk);
          const percent = Math.min(100, Math.floor((received / checkedAsset.size) * 100));
          if (percent !== lastPercent) {
            lastPercent = percent;
            emitProgress({ received, total: checkedAsset.size, percent });
          }
          callback(null, chunk);
        },
      });

      try {
        await pipeline(response, meter, fs.createWriteStream(partialPath, { flags: "wx" }));
        if (received !== checkedAsset.size) throw new Error("Der Update-Download ist unvollständig.");
        const actualDigest = hash.digest("hex");
        const expectedDigest = checkedAsset.digest?.slice("sha256:".length).toLowerCase() || null;
        if (expectedDigest && actualDigest !== expectedDigest) throw new Error("Die SHA-256-Prüfung des Updates ist fehlgeschlagen.");
        await fsp.rm(finalPath, { force: true });
        await fsp.rename(partialPath, finalPath);
        downloadedUpdate = {
          filePath: finalPath,
          assetName: safeName,
          version: normalizeVersion(checkedAsset.name.match(/v?(\d+\.\d+\.\d+)/i)?.[1] || ""),
          checksumVerified: Boolean(expectedDigest),
        };
        emitProgress({ received, total: checkedAsset.size, percent: 100 });
        return downloadedUpdate;
      } catch (error) {
        await fsp.rm(partialPath, { force: true }).catch(() => {});
        throw error;
      }
    })();

    try { return await downloadPromise; }
    finally { downloadPromise = null; }
  }

  async function getDownloadedUpdate() {
    if (!downloadedUpdate || !isPathInside(updatesDirectory, downloadedUpdate.filePath)) {
      throw new Error("Es wurde noch kein geprüftes Update heruntergeladen.");
    }
    const stat = await fsp.stat(downloadedUpdate.filePath).catch(() => null);
    if (!stat?.isFile()) throw new Error("Die heruntergeladene Update-Datei wurde nicht gefunden.");
    return downloadedUpdate;
  }

  return { check, download, getDownloadedUpdate };
}

module.exports = {
  compareVersions,
  createUpdateService,
  normalizeVersion,
  selectPortableAsset,
  validateRelease,
};
