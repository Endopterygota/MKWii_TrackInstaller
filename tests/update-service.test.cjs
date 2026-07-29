const assert = require("node:assert/strict");
const test = require("node:test");
const {
  compareVersions,
  normalizeVersion,
  selectPortableAsset,
  validateRelease,
} = require("../electron/update-service.cjs");

test("compares multi-digit semantic versions numerically", () => {
  assert.equal(compareVersions("0.10.2", "0.8.0"), 1);
  assert.equal(compareVersions("v1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("2.0.0", "2.0.1"), -1);
  assert.equal(normalizeVersion("v12.3.40"), "12.3.40");
});

test("selects the matching portable asset without accepting unrelated executables", () => {
  const release = {
    assets: [
      { name: "unrelated-0.10.2.exe", state: "uploaded" },
      { name: "MKWii-Track-Installer-0.10.2-portable.exe", state: "uploaded" },
      { name: "MKWii-Track-Installer-0.10.1-portable.exe", state: "uploaded" },
    ],
  };
  assert.equal(selectPortableAsset(release, "0.10.2")?.name, "MKWii-Track-Installer-0.10.2-portable.exe");
});

test("validates a GitHub release and exposes checksum availability", () => {
  const release = {
    tag_name: "v0.10.3",
    draft: false,
    prerelease: false,
    html_url: "https://github.com/Endopterygota/MKWii_TrackInstaller/releases/tag/v0.10.3",
    published_at: "2026-07-29T00:00:00Z",
    assets: [{
      name: "MKWii-Track-Installer-0.10.3-portable.exe",
      state: "uploaded",
      size: 90_000_000,
      digest: `sha256:${"a".repeat(64)}`,
      browser_download_url: "https://github.com/Endopterygota/MKWii_TrackInstaller/releases/download/v0.10.3/MKWii-Track-Installer-0.10.3-portable.exe",
    }],
  };
  const { result, asset } = validateRelease(release, "0.10.2");
  assert.equal(result.updateAvailable, true);
  assert.equal(result.latestVersion, "0.10.3");
  assert.equal(result.checksumAvailable, true);
  assert.equal(asset.name, release.assets[0].name);
});

test("does not require an asset when the installed version is current or newer", () => {
  const { result, asset } = validateRelease({
    tag_name: "v0.8.0",
    draft: false,
    prerelease: false,
    assets: [],
  }, "0.10.2");
  assert.equal(result.updateAvailable, false);
  assert.equal(asset, null);
});
