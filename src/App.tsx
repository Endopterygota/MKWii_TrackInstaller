import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, DatabaseZap, Gamepad2, Hammer, Play, Rocket, Trash2 } from "lucide-react";
import { AppShell, type PageId } from "./components/AppShell";
import { AutomationConsole, type LogEntry } from "./components/AutomationConsole";
import { Dialog } from "./components/ui/Dialog";
import { Button } from "./components/ui/Button";
import { OverviewPage } from "./pages/OverviewPage";
import { ProjectPage, type ProjectConfig } from "./pages/ProjectPage";
import { ToolsPage } from "./pages/ToolsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WiiScrubberPage } from "./pages/WiiScrubberPage";

type DialogKind = "install" | "play" | "create" | "check" | "wit-install" | "wit-play" | "full-run" | null;

const initialLogs: LogEntry[] = [
  { time: new Date().toLocaleTimeString("de-DE", { hour12: false }), level: "INFO", text: "MKWii Track Installer und natives Backend bereit." },
];

const defaultProject: ProjectConfig = {
  trackFolder: "G:\\Tracks\\GoombaPark",
  trackFilesFolder: "G:\\Tracks\\GoombaPark\\GoombaPark_gc",
  szsFile: "G:\\Tracks\\GoombaPark\\GoombaPark_gc.szs",
  scrubber: "C:\\Users\\Linus\\Documents\\WiiMods\\WiiScrubber\\WiiScrubber.exe",
  targetFile: "old_peach_gc.szs",
};

export default function App() {
  const [page, setPage] = useState<PageId>("overview");
  const [language, setLanguage] = useState<"de" | "en">("de");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [config, setConfig] = useState<ProjectConfig>(defaultProject);
  const [szsFiles, setSzsFiles] = useState<string[]>([defaultProject.szsFile]);
  const [folderDetection, setFolderDetection] = useState<"content" | "fallback">("fallback");
  const [dolphin, setDolphin] = useState("C:\\Users\\Linus\\Documents\\Dolphin-x64\\Dolphin.exe");
  const [wit, setWit] = useState("wit.exe");
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [structureName, setStructureName] = useState("");
  const [structureBasePath, setStructureBasePath] = useState("G:\\Tracks");
  const [structureBusy, setStructureBusy] = useState(false);
  const [checkWarnings, setCheckWarnings] = useState<LogEntry[]>([]);
  const [showCheckWarnings, setShowCheckWarnings] = useState(false);
  const [additionalFiles, setAdditionalFiles] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const activeCommandRef = useRef<AutomationCommand | null>(null);
  const warningsDismissedRef = useRef(false);

  const trackName = useMemo(() => config.trackFolder.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "", [config.trackFolder]);
  const trackFilesName = useMemo(() => config.trackFilesFolder.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "", [config.trackFilesFolder]);
  const trackTarget = trackFilesName || `${trackName || "Track"}_gc`;
  const desktopConfig = useMemo<DesktopConfig>(() => ({ ...config, dolphin, wit, language }), [config, dolphin, wit, language]);

  useEffect(() => {
    const api = window.mkwii;
    if (!api) {
      addLog("ERROR", "Native Desktop-Brücke nicht verfügbar. Bitte die portable EXE statt der Browser-Vorschau starten.");
      return;
    }

    void api.loadConfig().then(async (saved) => {
      setConfig({ trackFolder: saved.trackFolder, trackFilesFolder: saved.trackFilesFolder, szsFile: saved.szsFile, scrubber: saved.scrubber, targetFile: saved.targetFile });
      setDolphin(saved.dolphin);
      setWit(saved.wit);
      setLanguage(saved.language);
      setStructureBasePath(parentDirectory(saved.trackFolder));
      try {
        const analysis = await api.analyzeProject(saved.trackFolder, saved.szsFile);
        setConfig((current) => ({
          ...current,
          trackFolder: analysis.projectFolder,
          trackFilesFolder: analysis.trackFilesFolder,
          szsFile: analysis.selectedSzs || current.szsFile,
        }));
        setSzsFiles(analysis.szsFiles);
        setFolderDetection(analysis.detection);
      } catch (error) {
        addLog("WARN", `Projektordner konnte nicht automatisch analysiert werden: ${messageFrom(error)}`);
      }
    }).catch((error: unknown) => addLog("ERROR", messageFrom(error)));

    void api.getState().then((state) => {
      setBusy(state.running);
      setPaused(state.paused);
      activeCommandRef.current = state.running ? state.command : null;
    });
    const removeLog = api.onLog((entry) => {
      setLogs((current) => [...current, entry].slice(-1500));
      if (activeCommandRef.current === "wszst-check" && entry.level === "WARN" && /^\[wszst\]/i.test(entry.text)) {
        setCheckWarnings((current) => current.some((warning) => warning.text === entry.text) ? current : [...current, entry]);
        if (!warningsDismissedRef.current) setShowCheckWarnings(true);
      }
      if (activeCommandRef.current === "wszst-check" && entry.level === "HINT") {
        const additionalFile = extractAdditionalFile(entry.text);
        if (additionalFile) {
          setAdditionalFiles((current) => current.some((file) => file.toLowerCase() === additionalFile.toLowerCase()) ? current : [...current, additionalFile]);
        }
      }
    });
    const removeState = api.onState((state) => {
      setBusy(state.running);
      setPaused(state.paused);
      activeCommandRef.current = state.running ? state.command : null;
    });
    return () => { removeLog(); removeState(); };
  }, []);

  const dialogCopy = useMemo(() => {
    const en = language === "en";
    if (dialog === "install") return { title: en ? "Install track?" : "Strecke einsetzen?", description: en ? `WiiScrubber replaces ${config.targetFile} directly in the selected ISO.` : `WiiScrubber ersetzt ${config.targetFile} direkt in der ausgewählten ISO.`, icon: <Play size={18} />, action: en ? "Start replacement" : "Replace starten" };
    if (dialog === "play") return { title: en ? "Install and launch MKWii?" : "Einsetzen und MKWii starten?", description: en ? "After the replacement, Mario Kart Wii starts automatically with Dolphin." : "Nach dem Replace wird Mario Kart Wii automatisch mit Dolphin gestartet.", icon: <Gamepad2 size={18} />, action: en ? "Install & launch" : "Installieren & starten" };
    if (dialog === "create") return { title: en ? "Create SZS in the background?" : "SZS im Hintergrund erstellen?", description: en ? `wszst create generates ${trackTarget}.szs in the project folder.` : `wszst create erzeugt ${trackTarget}.szs im Projektordner.`, icon: <Hammer size={18} />, action: en ? "Run create" : "Create ausführen" };
    if (dialog === "check") return { title: en ? "Validate track?" : "Strecke validieren?", description: en ? "wszst check sends its complete output to the automation console." : "wszst check überträgt seine vollständige Ausgabe in die Automation-Konsole.", icon: <CheckCircle2 size={18} />, action: en ? "Start check" : "Check starten" };
    if (dialog === "wit-install") return { title: en ? "Install track?" : "Strecke einsetzen?", description: en ? "WIT creates the fixed test ISO on the first run and updates the same file on later runs." : "WIT legt beim ersten Durchlauf die feste Test-ISO an und aktualisiert bei späteren Durchläufen dieselbe Datei.", icon: <DatabaseZap size={18} />, action: en ? "Install now" : "Jetzt einsetzen" };
    if (dialog === "wit-play") return { title: en ? "Install & launch?" : "Einsetzen & starten?", description: en ? "WIT updates the fixed test ISO and Dolphin launches that exact file." : "WIT aktualisiert die feste Test-ISO und Dolphin startet genau diese Datei.", icon: <Gamepad2 size={18} />, action: en ? "Launch with Dolphin" : "Mit Dolphin starten" };
    if (dialog === "full-run") return { title: en ? "Build, install and launch?" : "Erstellen, einsetzen und starten?", description: en ? `wszst first creates ${trackTarget}.szs, WIT then installs it into the fixed test ISO, and Dolphin launches that ISO.` : `Zuerst erstellt wszst die ${trackTarget}.szs, danach setzt WIT sie in die feste Test-ISO ein und Dolphin startet genau diese ISO.`, icon: <Rocket size={18} />, action: en ? "Run all three steps" : "Alle drei Schritte starten" };
    return null;
  }, [dialog, config.targetFile, language, trackTarget]);

  function addLog(level: LogEntry["level"], text: string) {
    setLogs((current) => [...current, { time: new Date().toLocaleTimeString("de-DE", { hour12: false }), level, text }].slice(-1500));
  }

  async function runCommand(command: AutomationCommand) {
    const api = window.mkwii;
    if (!api) {
      addLog("ERROR", "Diese Aktion benötigt die portable Desktop-EXE.");
      return;
    }
    try {
      setBusy(true);
      setPaused(false);
      activeCommandRef.current = command;
      if (command === "wszst-check") {
        warningsDismissedRef.current = false;
        setCheckWarnings([]);
        setShowCheckWarnings(false);
        setAdditionalFiles([]);
      }
      const result = await api.start(command, desktopConfig);
      if (result.ok && (command === "wszst-create" || command === "build-wit-install-play")) {
        const analysis = await api.analyzeProject(config.trackFolder, config.szsFile);
        setConfig((current) => ({
          ...current,
          trackFilesFolder: analysis.trackFilesFolder,
          szsFile: analysis.selectedSzs || current.szsFile,
        }));
        setSzsFiles(analysis.szsFiles);
        setFolderDetection(analysis.detection);
      }
      if (!result.ok && !result.stopped) addLog("ERROR", `Der native Prozess wurde mit Exit-Code ${result.exitCode} beendet.`);
    } catch (error) {
      addLog("ERROR", messageFrom(error));
    } finally {
      activeCommandRef.current = null;
      setBusy(false);
      setPaused(false);
    }
  }

  function confirmDialog() {
    const selected = dialog;
    setDialog(null);
    const commands: Record<Exclude<DialogKind, null>, AutomationCommand> = {
      install: "install",
      play: "install-play",
      create: "wszst-create",
      check: "wszst-check",
      "wit-install": "wit-install",
      "wit-play": "wit-install-play",
      "full-run": "build-wit-install-play",
    };
    if (selected) void runCommand(commands[selected]);
  }

  async function saveProject() {
    try {
      const saved = await window.mkwii?.saveConfig(desktopConfig);
      if (saved) addLog("OK", "Projektkonfiguration gespeichert.");
    } catch (error) {
      addLog("ERROR", messageFrom(error));
    }
  }

  async function browse(kind: "folder" | "structure-base" | "scrubber" | "dolphin" | "wit") {
    const api = window.mkwii;
    const selected = await api?.choosePath(kind);
    if (!selected) return;
    if (kind === "dolphin") {
      setDolphin(selected);
      await api?.saveConfig({ ...desktopConfig, dolphin: selected });
      addLog("OK", language === "en" ? "Dolphin path saved." : "Dolphin-Pfad gespeichert.");
    }
    else if (kind === "wit") {
      setWit(selected);
      await api?.saveConfig({ ...desktopConfig, wit: selected });
      addLog("OK", language === "en" ? "WIT path saved." : "WIT-Pfad gespeichert.");
    }
    else if (kind === "structure-base") setStructureBasePath(selected);
    else if (kind === "folder") {
      if (!api) return;
      try {
        const analysis = await api.analyzeProject(selected);
        setConfig((current) => ({
          ...current,
          trackFolder: analysis.projectFolder,
          trackFilesFolder: analysis.trackFilesFolder,
          szsFile: analysis.selectedSzs,
        }));
        setSzsFiles(analysis.szsFiles);
        setFolderDetection(analysis.detection);
        if (analysis.detection === "content") addLog("OK", `Streckendateiordner anhand der Pflichtdateien erkannt: ${analysis.trackFilesFolder}`);
        else addLog("WARN", `Keine vollständige Track-Dateistruktur erkannt. Verwende _gc-Fallback: ${analysis.trackFilesFolder}`);
        addLog("INFO", `${analysis.szsFiles.length} SZS-Datei(en) im Projektordner gefunden.`);
      } catch (error) {
        addLog("ERROR", messageFrom(error));
      }
    } else setConfig((current) => ({ ...current, scrubber: selected }));
  }

  async function createStructure() {
    const api = window.mkwii;
    if (!api) {
      addLog("ERROR", language === "en" ? "This action requires the portable desktop EXE." : "Diese Aktion benötigt die portable Desktop-EXE.");
      return;
    }
    try {
      setStructureBusy(true);
      const analysis = await api.createProjectStructure(structureBasePath, structureName);
      setConfig((current) => ({
        ...current,
        trackFolder: analysis.projectFolder,
        trackFilesFolder: analysis.trackFilesFolder,
        szsFile: analysis.selectedSzs,
      }));
      setSzsFiles(analysis.szsFiles);
      setFolderDetection(analysis.detection);
      addLog("OK", language === "en" ? `Folder structure created: ${analysis.projectFolder}` : `Ordnerstruktur erstellt: ${analysis.projectFolder}`);
    } catch (error) {
      addLog("ERROR", messageFrom(error));
    } finally {
      setStructureBusy(false);
    }
  }

  function toggleLanguage() {
    const next = language === "de" ? "en" : "de";
    setLanguage(next);
    void window.mkwii?.saveConfig({ ...desktopConfig, language: next });
  }

  async function togglePause() {
    try { await window.mkwii?.pause(!paused); }
    catch (error) { addLog("ERROR", messageFrom(error)); }
  }

  async function stop() {
    try { await window.mkwii?.stop(); }
    catch (error) { addLog("ERROR", messageFrom(error)); }
  }

  async function deleteAdditionalFiles() {
    const api = window.mkwii;
    if (!api || additionalFiles.length === 0) return;
    try {
      setDeleteBusy(true);
      const result = await api.deleteAdditionalFiles(config.trackFilesFolder, additionalFiles);
      const deleted = new Set(result.deleted.map((file) => file.toLowerCase()));
      setAdditionalFiles((current) => current.filter((file) => !deleted.has(file.toLowerCase())));
      addLog("INFO", "--- Zusätzliche Dateien bereinigen ---");
      if (result.deleted.length > 0) addLog("OK", language === "en" ? `${result.deleted.length} additional file(s) deleted.` : `${result.deleted.length} zusätzliche Datei(en) gelöscht.`);
      for (const skipped of result.skipped) addLog("WARN", `${skipped.path}: ${skipped.reason}`);
    } catch (error) {
      addLog("ERROR", messageFrom(error));
    } finally {
      setDeleteBusy(false);
      setDeleteDialogOpen(false);
    }
  }

  return (
    <AppShell page={page} onPageChange={setPage} language={language} onLanguageToggle={toggleLanguage} consolePanel={<AutomationConsole logs={logs} running={busy} paused={paused} language={language} checkWarnings={showCheckWarnings ? checkWarnings : []} additionalFiles={additionalFiles} onDeleteAdditionalFiles={() => setDeleteDialogOpen(true)} onDismissWarnings={() => { warningsDismissedRef.current = true; setShowCheckWarnings(false); }} />}>
      {page === "overview" && <OverviewPage onInstall={() => setDialog("wit-install")} onInstallAndPlay={() => setDialog("wit-play")} onBuildInstallAndPlay={() => setDialog("full-run")} trackName={trackName} targetFile={config.targetFile} busy={busy} language={language} />}
      {page === "project" && <ProjectPage config={config} szsFiles={szsFiles} folderDetection={folderDetection} onChange={setConfig} onSave={() => void saveProject()} onBrowse={(kind) => void browse(kind)} structureName={structureName} structureBasePath={structureBasePath} structureBusy={structureBusy} onStructureNameChange={setStructureName} onStructureBasePathChange={setStructureBasePath} onBrowseStructureBase={() => void browse("structure-base")} onCreateStructure={() => void createStructure()} busy={busy} language={language} />}
      {page === "tools" && <ToolsPage onCreate={() => setDialog("create")} onCheck={() => setDialog("check")} trackTarget={trackTarget} busy={busy} language={language} />}
      {page === "scrubber" && <WiiScrubberPage onInstall={() => setDialog("install")} onInstallAndPlay={() => setDialog("play")} busy={busy} language={language} />}
      {page === "settings" && <SettingsPage language={language} dolphin={dolphin} wit={wit} busy={busy} paused={paused} onLanguageToggle={toggleLanguage} onBrowseDolphin={() => void browse("dolphin")} onBrowseWit={() => void browse("wit")} onPauseToggle={() => void togglePause()} onStop={() => void stop()} />}

      <Dialog open={dialog !== null} title={dialogCopy?.title ?? ""} description={dialogCopy?.description} closeLabel={language === "en" ? "Close dialog" : "Dialog schließen"} onClose={() => setDialog(null)}>
        <div className="dialog-summary"><span>{dialogCopy?.icon}</span><div><b>{trackTarget}.szs</b><small>{config.targetFile} · RMCP01</small></div></div>
        <div className="dialog-actions"><Button variant="ghost" onClick={() => setDialog(null)}>{language === "en" ? "Cancel" : "Abbrechen"}</Button><Button variant="primary" onClick={confirmDialog}>{dialogCopy?.action}</Button></div>
      </Dialog>

      <Dialog open={deleteDialogOpen} title={language === "en" ? "Delete additional files?" : "Zusätzliche Dateien löschen?"} description={language === "en" ? "This permanently deletes every file reported by wszst as ‘HINT: Additional file’. This cannot be undone." : "Dadurch werden alle von wszst als „HINT: Additional file“ gemeldeten Dateien endgültig gelöscht. Dies kann nicht rückgängig gemacht werden."} closeLabel={language === "en" ? "Close dialog" : "Dialog schließen"} onClose={() => !deleteBusy && setDeleteDialogOpen(false)}>
        <div className="dialog-summary dialog-summary--danger"><span><AlertTriangle size={18} /></span><div><b>{language === "en" ? `${additionalFiles.length} file(s)` : `${additionalFiles.length} Datei(en)`}</b><small>{config.trackFilesFolder}</small></div></div>
        <div className="delete-file-preview">{additionalFiles.slice(0, 8).map((file) => <code key={file}>{file}</code>)}{additionalFiles.length > 8 && <small>+ {additionalFiles.length - 8}</small>}</div>
        <div className="dialog-actions"><Button variant="ghost" disabled={deleteBusy} onClick={() => setDeleteDialogOpen(false)}>{language === "en" ? "Cancel" : "Abbrechen"}</Button><Button variant="danger" disabled={deleteBusy} icon={<Trash2 size={15} />} onClick={() => void deleteAdditionalFiles()}>{language === "en" ? "Delete permanently" : "Endgültig löschen"}</Button></div>
      </Dialog>
    </AppShell>
  );
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function parentDirectory(value: string) {
  const clean = value.replace(/[\\/]+$/, "");
  const separator = Math.max(clean.lastIndexOf("\\"), clean.lastIndexOf("/"));
  if (separator === 2 && clean[1] === ":") return clean.slice(0, 3);
  return separator > 0 ? clean.slice(0, separator) : clean;
}

function extractAdditionalFile(text: string) {
  const normalized = text.replace(/^\[wszst\]\s*/i, "").trim();
  const match = normalized.match(/\bHINT\s*:\s*Additional\s+file\b\s*:?\s*(.+?)\s*$/i);
  if (!match) return null;
  return match[1].trim().replace(/^[`'"]|[`'"]$/g, "").trim() || null;
}
