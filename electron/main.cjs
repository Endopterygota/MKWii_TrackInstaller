const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { compareSzsArchives } = require("./szs-diff.cjs");
const { createUpdateService } = require("./update-service.cjs");
const programFiles = process.env.ProgramFiles || process.env.ProgramW6432 || "";
const commonWitPath = programFiles ? path.join(programFiles, "Wiimm", "WIT", "wit.exe") : "";
const allowedExternalHosts = new Set([
  "www.blender.org",
  "github.com",
  "mkwiiki.org",
  "szs.wiimm.de",
  "wit.wiimm.de",
  "dolphin-emu.org",
  "www.dolphin-emu.org",
]);

const allowedCommands = new Set([
  "install",
  "install-play",
  "wszst-create",
  "wszst-check",
  "wit-install",
  "wit-install-play",
  "build-wit-install-play",
]);
const szsCreateCommands = new Set(["wszst-create", "build-wit-install-play"]);

const defaultConfig = {
  trackFolder: "",
  trackFilesFolder: "",
  szsFile: "",
  scrubber: "",
  targetFile: "old_peach_gc.szs",
  dolphin: "",
  wit: commonWitPath && fs.existsSync(commonWitPath) ? commonWitPath : "wit.exe",
  iso: "",
  testIso: "",
  language: "de",
};

let mainWindow = null;
let activeRun = null;
let updateService = null;

const configPath = () => path.join(app.getPath("userData"), "settings.json");
const backendPath = () => app.isPackaged
  ? path.join(process.resourcesPath, "native", "MKWiiBackend.exe")
  : path.join(__dirname, "..", "native", "bin", "MKWiiBackend.exe");

function sanitizeConfig(value) {
  const source = value && typeof value === "object" ? value : {};
  const clean = { ...defaultConfig };
  for (const key of Object.keys(defaultConfig)) {
    if (typeof source[key] === "string" && source[key].length <= 4096) clean[key] = source[key].trim();
  }
  clean.language = clean.language === "en" ? "en" : "de";
  if (clean.wit.toLowerCase() === "wit.exe" && commonWitPath && fs.existsSync(commonWitPath)) clean.wit = commonWitPath;
  return clean;
}

async function containsTrackFiles(directory) {
  try {
    const entries = await fsp.readdir(directory, { withFileTypes: true });
    const files = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name.toLowerCase()));
    return ["course.kcl", "course.kmp", "map_model.brres", "course_model.brres"].every((name) => files.has(name));
  } catch {
    return false;
  }
}

async function findSzsFiles(projectFolder) {
  const found = [];
  const pending = [{ directory: projectFolder, depth: 0 }];
  while (pending.length > 0) {
    const current = pending.shift();
    let entries;
    try { entries = await fsp.readdir(current.directory, { withFileTypes: true }); }
    catch { continue; }
    for (const entry of entries) {
      const fullPath = path.join(current.directory, entry.name);
      if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".szs") found.push(fullPath);
      else if (entry.isDirectory() && current.depth < 4) pending.push({ directory: fullPath, depth: current.depth + 1 });
    }
  }
  return found.sort((left, right) => left.localeCompare(right, "de", { sensitivity: "base" }));
}

async function analyzeProject(projectFolder, preferredSzs = "") {
  const resolvedProject = path.resolve(String(projectFolder || ""));
  const stat = await fsp.stat(resolvedProject).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`Projektordner nicht gefunden: ${resolvedProject}`);

  const projectName = path.basename(resolvedProject);
  const fallbackFolder = path.join(resolvedProject, `${projectName}_gc`);
  const entries = await fsp.readdir(resolvedProject, { withFileTypes: true });
  const subfolders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(resolvedProject, entry.name))
    .sort((left, right) => left.localeCompare(right, "de", { sensitivity: "base" }));
  const validFolders = [];
  for (const folder of subfolders) {
    if (await containsTrackFiles(folder)) validFolders.push(folder);
  }

  const expectedValidFolder = validFolders.find((folder) => path.basename(folder).toLowerCase() === `${projectName}_gc`.toLowerCase());
  const trackFilesFolder = expectedValidFolder || validFolders[0] || fallbackFolder;
  const detection = validFolders.length > 0 ? "content" : "fallback";
  const szsFiles = await findSzsFiles(resolvedProject);
  const expectedSzsName = `${path.basename(trackFilesFolder)}.szs`.toLowerCase();
  const matchingSzs = szsFiles.find((file) => path.basename(file).toLowerCase() === expectedSzsName);
  const normalizedPreferred = preferredSzs ? path.resolve(preferredSzs) : "";
  const preferredMatch = szsFiles.find((file) => file.toLowerCase() === normalizedPreferred.toLowerCase());
  const selectedSzs = matchingSzs || preferredMatch || szsFiles[0] || "";

  return { projectFolder: resolvedProject, trackFilesFolder, detection, szsFiles, selectedSzs };
}

function validateProjectName(rawName) {
  const name = String(rawName || "").trim();
  if (!name) throw new Error("Bitte einen Projektnamen eingeben.");
  if (name.length > 100) throw new Error("Der Projektname darf höchstens 100 Zeichen enthalten.");
  if (/[<>:"/\\|?*\u0000-\u001f]/.test(name) || /[. ]$/.test(name)) {
    throw new Error("Der Projektname enthält ein unter Windows nicht erlaubtes Zeichen.");
  }
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)) {
    throw new Error("Dieser Projektname ist unter Windows reserviert.");
  }
  return name;
}

async function createProjectStructure(basePath, rawName) {
  const name = validateProjectName(rawName);
  const resolvedBase = path.resolve(String(basePath || "").trim());
  const baseStat = await fsp.stat(resolvedBase).catch(() => null);
  if (!baseStat?.isDirectory()) throw new Error(`Zielpfad nicht gefunden: ${resolvedBase}`);

  const projectFolder = path.resolve(resolvedBase, name);
  if (path.dirname(projectFolder).toLowerCase() !== resolvedBase.toLowerCase()) {
    throw new Error("Der Projektordner würde außerhalb des gewählten Zielpfads liegen.");
  }
  if (fs.existsSync(projectFolder)) throw new Error(`Der Projektordner existiert bereits: ${projectFolder}`);

  await fsp.mkdir(projectFolder);
  try {
    await fsp.mkdir(path.join(projectFolder, `${name}_gc`));
    await fsp.mkdir(path.join(projectFolder, "Textures"));
  } catch (error) {
    await fsp.rm(projectFolder, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
  return analyzeProject(projectFolder);
}

async function deleteAdditionalFiles(trackFilesFolder, rawFiles) {
  const root = path.resolve(String(trackFilesFolder || "").trim());
  const rootStat = await fsp.stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) throw new Error(`Streckendateiordner nicht gefunden: ${root}`);
  if (!Array.isArray(rawFiles) || rawFiles.length === 0) throw new Error("Keine zusätzlichen Dateien zum Löschen übergeben.");
  if (rawFiles.length > 5000) throw new Error("Zu viele Dateien in einem Löschvorgang.");

  const realRoot = await fsp.realpath(root);
  const deleted = [];
  const skipped = [];
  const seen = new Set();

  for (const value of rawFiles) {
    const requested = typeof value === "string" ? value.trim() : "";
    if (!requested || requested.length > 4096 || seen.has(requested.toLowerCase())) continue;
    seen.add(requested.toLowerCase());
    const cleaned = requested.replace(/^['"]|['"]$/g, "").replace(/^\.([\\/])/, "");
    const target = path.resolve(root, cleaned);
    const targetStat = await fsp.lstat(target).catch(() => null);
    if (!targetStat) {
      skipped.push({ path: requested, reason: "Datei nicht gefunden" });
      continue;
    }
    if (!targetStat.isFile() || targetStat.isSymbolicLink()) {
      skipped.push({ path: requested, reason: "Kein regulärer Dateipfad" });
      continue;
    }
    const realTarget = await fsp.realpath(target);
    const relative = path.relative(realRoot, realTarget);
    if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
      skipped.push({ path: requested, reason: "Pfad liegt außerhalb des Streckendateiordners" });
      continue;
    }
    await fsp.unlink(target);
    deleted.push(requested);
  }
  return { deleted, skipped };
}

async function loadConfig() {
  try {
    return sanitizeConfig(JSON.parse(await fsp.readFile(configPath(), "utf8")));
  } catch {
    return { ...defaultConfig };
  }
}

async function saveConfig(value) {
  const clean = sanitizeConfig(value);
  await fsp.mkdir(path.dirname(configPath()), { recursive: true });
  await fsp.writeFile(configPath(), JSON.stringify(clean, null, 2), "utf8");
  return clean;
}

function emit(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function emitLog(level, text) {
  emit("automation:log", {
    time: new Date().toLocaleTimeString("de-DE", { hour12: false }),
    level,
    text,
  });
}

function generatedSzsPath(config) {
  const trackFilesFolder = path.resolve(String(config.trackFilesFolder || "").trim());
  const targetName = path.basename(trackFilesFolder.replace(/[\\/]+$/, ""));
  if (!targetName) throw new Error("Der Name des Streckendateiordners konnte nicht bestimmt werden.");
  return path.join(path.resolve(config.trackFolder), `${targetName}.szs`);
}

async function prepareSzsComparison(command, config, controlDir) {
  if (!szsCreateCommands.has(command)) return null;
  const archivePath = generatedSzsPath(config);
  const baselinePath = path.join(controlDir, "previous.szs");
  const archiveStat = await fsp.stat(archivePath).catch(() => null);
  if (!archiveStat?.isFile()) return { archivePath, baselinePath: null };
  try {
    await fsp.copyFile(archivePath, baselinePath);
    return { archivePath, baselinePath };
  } catch (error) {
    emitLog("WARN", `Vorherige SZS konnte nicht für den Inhaltsvergleich gesichert werden: ${error.message}`);
    return { archivePath, baselinePath: null, preparationError: error.message };
  }
}

async function finishSzsComparison(context) {
  if (!context) return null;
  if (!context.baselinePath) {
    return {
      archivePath: context.archivePath,
      baselineAvailable: false,
      changes: [],
      error: context.preparationError || null,
    };
  }

  const currentStat = await fsp.stat(context.archivePath).catch(() => null);
  if (!currentStat?.isFile()) {
    return {
      archivePath: context.archivePath,
      baselineAvailable: true,
      changes: [],
      error: "Die neu erstellte SZS-Datei wurde nicht gefunden.",
    };
  }

  try {
    const changes = await compareSzsArchives("wszst.exe", context.baselinePath, context.archivePath);
    const modified = changes.filter((change) => change.kind === "modified").length;
    const added = changes.filter((change) => change.kind === "added").length;
    const removed = changes.filter((change) => change.kind === "removed").length;
    if (changes.length === 0) emitLog("INFO", "SZS-Inhaltsvergleich: Keine Dateiänderungen gegenüber der vorherigen SZS.");
    else emitLog("OK", `SZS-Inhaltsvergleich: ${modified} geändert, ${added} neu, ${removed} entfernt.`);
    return { archivePath: context.archivePath, baselineAvailable: true, changes, error: null };
  } catch (error) {
    emitLog("WARN", `SZS-Inhaltsvergleich fehlgeschlagen: ${error.message}`);
    return {
      archivePath: context.archivePath,
      baselineAvailable: true,
      changes: [],
      error: error.message,
    };
  }
}

function parseBackendLine(line) {
  if (!line.startsWith("MKWII_LOG\t")) {
    if (line.trim()) emitLog("INFO", line.trim());
    return;
  }
  const parts = line.split("\t");
  if (parts.length < 3) return;
  let text = "";
  try { text = Buffer.from(parts.slice(2).join(""), "base64").toString("utf8"); }
  catch { text = "Backend-Ausgabe konnte nicht gelesen werden."; }
  if (/^Native EXE v\d+ (bereit|ready)\./i.test(text)) return;
  const raw = parts[1].toUpperCase();
  const level = raw === "OK" ? "OK" : raw === "HINT" ? "HINT" : raw === "WARN" || raw === "WARNING" ? "WARN" : raw === "FEHLER" || raw === "ERROR" ? "ERROR" : "INFO";
  emitLog(level, text);
}

async function startAutomation(command, rawConfig) {
  if (!allowedCommands.has(command)) throw new Error("Unbekannte Aktion.");
  if (activeRun) throw new Error("Es läuft bereits eine Automatisierung.");

  const executable = backendPath();
  if (!fs.existsSync(executable)) throw new Error(`Native Backend-Datei fehlt: ${executable}`);

  const config = await saveConfig(rawConfig);
  const controlDir = await fsp.mkdtemp(path.join(os.tmpdir(), "MKWiiTrackInstaller-Control-"));
  const szsComparisonContext = await prepareSzsComparison(command, config, controlDir);
  const child = spawn(executable, ["--backend", command], {
    windowsHide: true,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      MKWII_TRACK_FOLDER: config.trackFolder,
      MKWII_TRACK_FILES_FOLDER: config.trackFilesFolder,
      MKWII_SZS_FILE: config.szsFile,
      MKWII_SCRUBBER: config.scrubber,
      MKWII_TARGET_FILE: config.targetFile,
      MKWII_DOLPHIN: config.dolphin,
      MKWII_WIT: config.wit,
      MKWII_ISO: config.iso,
      MKWII_TEST_ISO: config.testIso,
      MKWII_LANGUAGE: config.language,
      MKWII_CONTROL_DIR: controlDir,
    },
  });

  activeRun = { child, command, controlDir, paused: false, stopTimer: null };
  emit("automation:state", { running: true, paused: false, command });

  readline.createInterface({ input: child.stdout }).on("line", parseBackendLine);
  readline.createInterface({ input: child.stderr }).on("line", (line) => {
    if (line.trim()) emitLog("ERROR", line.trim());
  });

  return await new Promise((resolve) => {
    child.once("error", async (error) => {
      emitLog("ERROR", `Backend konnte nicht gestartet werden: ${error.message}`);
      const current = activeRun;
      activeRun = null;
      if (current?.stopTimer) clearTimeout(current.stopTimer);
      await fsp.rm(controlDir, { recursive: true, force: true }).catch(() => {});
      emit("automation:state", { running: false, paused: false, command });
      resolve({ ok: false, stopped: false, exitCode: -1 });
    });
    child.once("close", async (code) => {
      const current = activeRun;
      activeRun = null;
      if (current?.stopTimer) clearTimeout(current.stopTimer);
      const szsComparison = code === 0 ? await finishSzsComparison(szsComparisonContext) : null;
      await fsp.rm(controlDir, { recursive: true, force: true }).catch(() => {});
      emit("automation:state", { running: false, paused: false, command });
      resolve({ ok: code === 0, stopped: code === 2, exitCode: code ?? -1, szsComparison });
    });
  });
}

async function setPaused(paused) {
  if (!activeRun) return { running: false, paused: false };
  const flag = path.join(activeRun.controlDir, "pause.flag");
  if (paused) await fsp.writeFile(flag, new Date().toISOString(), "utf8");
  else await fsp.rm(flag, { force: true });
  activeRun.paused = paused;
  emitLog(paused ? "WARN" : "INFO", paused ? "Ablauf pausiert. Der aktuelle Einzelschritt wird noch sicher beendet." : "Ablauf wird fortgesetzt.");
  emit("automation:state", { running: true, paused, command: activeRun.command });
  return { running: true, paused };
}

async function stopAutomation() {
  if (!activeRun) return { running: false };
  await fsp.rm(path.join(activeRun.controlDir, "pause.flag"), { force: true });
  await fsp.writeFile(path.join(activeRun.controlDir, "stop.flag"), new Date().toISOString(), "utf8");
  emitLog("WARN", "Stopp angefordert. Bereits geschriebene ISO-Änderungen können nicht rückgängig gemacht werden.");
  const run = activeRun;
  run.stopTimer = setTimeout(() => {
    if (activeRun === run && !run.child.killed) run.child.kill();
  }, 20000);
  return { running: true };
}

async function choosePath(kind, currentPath = "") {
  if (!mainWindow) return null;
  if (kind === "folder" || kind === "structure-base") {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"], defaultPath: currentPath || undefined });
    return result.canceled ? null : result.filePaths[0];
  }
  if (kind === "test-iso") {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: currentPath || "MarioKartWii-TrackTest.iso",
      filters: [{ name: "Wii ISO", extensions: ["iso"] }],
    });
    return result.canceled ? null : result.filePath;
  }
  const filters = kind === "iso"
    ? [{ name: "Wii ISO", extensions: ["iso"] }]
    : [{ name: "Programme", extensions: ["exe"] }];
  const result = await dialog.showOpenDialog(mainWindow, { properties: ["openFile"], filters, defaultPath: currentPath || undefined });
  return result.canceled ? null : result.filePaths[0];
}

function isAllowedExternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && allowedExternalHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function openExternalUrl(rawUrl) {
  if (!isAllowedExternalUrl(rawUrl)) return;
  void shell.openExternal(rawUrl).catch(() => {});
}

async function installDownloadedUpdate() {
  if (activeRun) throw new Error("Bitte den laufenden Ablauf vor dem Neustart beenden.");
  if (!app.isPackaged) throw new Error("Der Neustart mit Update ist nur in der gebauten App verfügbar.");
  const update = await updateService.getDownloadedUpdate();
  const child = spawn(update.filePath, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
    shell: false,
  });
  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  child.unref();
  setTimeout(() => app.quit(), 300);
  return { started: true, version: update.version };
}

function registerIpc() {
  ipcMain.handle("config:load", loadConfig);
  ipcMain.handle("config:save", (_event, value) => saveConfig(value));
  ipcMain.handle("dialog:choose-path", (_event, kind, currentPath) => choosePath(kind, currentPath));
  ipcMain.handle("project:analyze", (_event, projectFolder, preferredSzs) => analyzeProject(projectFolder, preferredSzs));
  ipcMain.handle("project:create-structure", (_event, basePath, projectName) => createProjectStructure(basePath, projectName));
  ipcMain.handle("project:delete-additional-files", (_event, trackFilesFolder, files) => deleteAdditionalFiles(trackFilesFolder, files));
  ipcMain.handle("automation:start", (_event, command, config) => startAutomation(command, config));
  ipcMain.handle("automation:pause", (_event, paused) => setPaused(Boolean(paused)));
  ipcMain.handle("automation:stop", stopAutomation);
  ipcMain.handle("automation:state", () => activeRun ? { running: true, paused: activeRun.paused, command: activeRun.command } : { running: false, paused: false, command: null });
  ipcMain.handle("updates:check", () => updateService.check());
  ipcMain.handle("updates:download", () => updateService.download());
  ipcMain.handle("updates:install", installDownloadedUpdate);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0b0a10",
    show: false,
    autoHideMenuBar: true,
    title: "MKWii Track Installer",
    icon: path.join(__dirname, "..", "public", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("file://")) return;
    event.preventDefault();
    openExternalUrl(url);
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(() => {
  updateService = createUpdateService({
    currentVersion: app.getVersion(),
    updatesDirectory: path.join(app.getPath("userData"), "updates"),
    emitProgress: (progress) => emit("updates:progress", progress),
  });
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  if (activeRun) {
    try { fs.writeFileSync(path.join(activeRun.controlDir, "stop.flag"), new Date().toISOString(), "utf8"); }
    catch { /* best effort */ }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
