const { spawn } = require("node:child_process");

const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

function normalizeArchivePath(value) {
  return String(value || "")
    .trim()
    .replace(/^\.([\\/])/, "")
    .replace(/\\/g, "/")
    .replace(/\s+\[[^\]]*\]\s*$/, "")
    .trim();
}

function parseWszstDiffOutput(output) {
  const records = new Map();

  function add(kind, rawPath) {
    const archivePath = normalizeArchivePath(rawPath);
    if (!archivePath || archivePath.endsWith("/")) return;
    const key = archivePath.toLocaleLowerCase("en-US");
    const current = records.get(key) || { path: archivePath, kinds: new Set() };
    current.kinds.add(kind);
    records.set(key, current);
  }

  for (const rawLine of String(output || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    let match = line.match(/^\*\s+Only in source #(1|2):\s+(.+?)\s*$/i);
    if (match) {
      add(match[1] === "1" ? "removed" : "added", match[2]);
      continue;
    }

    match = line.match(/^\*\s+.+?\s+differ:\s+(.+?)\s*$/i);
    if (match) add("modified", match[1]);
  }

  const changes = [];
  for (const record of records.values()) {
    const kind = record.kinds.has("modified") || (record.kinds.has("added") && record.kinds.has("removed"))
      ? "modified"
      : record.kinds.has("added") ? "added" : "removed";
    changes.push({ kind, path: record.path });
  }

  const order = { modified: 0, added: 1, removed: 2 };
  return changes.sort((left, right) => order[left.kind] - order[right.kind]
    || left.path.localeCompare(right.path, "de", { sensitivity: "base" }));
}

function compareSzsArchives(executable, previousArchive, currentArchive, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ["diff", previousArchive, currentArchive], {
      windowsHide: true,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const collect = (chunk) => {
      output += chunk.toString("utf8");
      if (Buffer.byteLength(output, "utf8") > MAX_OUTPUT_BYTES) {
        child.kill();
        finish(() => reject(new Error("Die wszst-DIFF-Ausgabe ist zu groß.")));
      }
    };

    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("error", (error) => finish(() => reject(error)));
    child.once("close", (code) => finish(() => {
      const changes = parseWszstDiffOutput(output);
      if (code === 0 || code === 1 || changes.length > 0) {
        resolve(changes);
        return;
      }
      const detail = output.trim().split(/\r?\n/).slice(-4).join(" ");
      reject(new Error(detail || `wszst diff wurde mit Exit-Code ${code ?? -1} beendet.`));
    }));

    const timer = setTimeout(() => {
      child.kill();
      finish(() => reject(new Error("Der SZS-Inhaltsvergleich hat das Zeitlimit überschritten.")));
    }, timeoutMs);
  });
}

module.exports = { compareSzsArchives, normalizeArchivePath, parseWszstDiffOutput };
