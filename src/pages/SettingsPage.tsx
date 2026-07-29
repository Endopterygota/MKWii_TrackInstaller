import { useEffect, useState } from "react";
import { AlertTriangle, Archive, CheckCircle2, DatabaseZap, Disc3, Download, FileOutput, Gamepad2, Languages, PauseCircle, Play, RefreshCw, RotateCw, Square } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

type SettingsPageProps = {
  language: "de" | "en";
  dolphin: string;
  wit: string;
  iso: string;
  testIso: string;
  scrubber: string;
  busy: boolean;
  paused: boolean;
  onLanguageToggle: () => void;
  onBrowseDolphin: () => void;
  onBrowseWit: () => void;
  onBrowseIso: () => void;
  onBrowseTestIso: () => void;
  onBrowseScrubber: () => void;
  onPauseToggle: () => void;
  onStop: () => void;
};

type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "downloaded" | "current" | "error" | "installing";

export function SettingsPage({ language, dolphin, wit, iso, testIso, scrubber, busy, paused, onLanguageToggle, onBrowseDolphin, onBrowseWit, onBrowseIso, onBrowseTestIso, onBrowseScrubber, onPauseToggle, onStop }: SettingsPageProps) {
  const en = language === "en";
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<UpdateDownloadResult | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState("");

  useEffect(() => window.mkwii?.onUpdateProgress((progress) => setUpdateProgress(progress.percent)), []);

  const updateDescription = (() => {
    if (updateStatus === "checking") return en ? "Checking the latest stable GitHub release…" : "Das neueste stabile GitHub-Release wird geprüft…";
    if (updateStatus === "available" && updateInfo) return en ? `v${updateInfo.latestVersion} is available (installed: v${updateInfo.currentVersion}).` : `v${updateInfo.latestVersion} ist verfügbar (installiert: v${updateInfo.currentVersion}).`;
    if (updateStatus === "downloading") return en ? `Downloading and verifying update: ${updateProgress}%` : `Update wird heruntergeladen und geprüft: ${updateProgress} %`;
    if (updateStatus === "downloaded" && downloadInfo) {
      if (downloadInfo.checksumVerified) return en ? `v${downloadInfo.version} passed SHA-256 verification and is ready to restart.` : `v${downloadInfo.version} wurde per SHA-256 geprüft und ist zum Neustart bereit.`;
      return en ? `v${downloadInfo.version} was downloaded securely from GitHub and is ready to restart.` : `v${downloadInfo.version} wurde sicher von GitHub geladen und ist zum Neustart bereit.`;
    }
    if (updateStatus === "current" && updateInfo) return en ? `Installed: v${updateInfo.currentVersion}. Latest GitHub release: v${updateInfo.latestVersion}.` : `Installiert: v${updateInfo.currentVersion}. Neuestes GitHub-Release: v${updateInfo.latestVersion}.`;
    if (updateStatus === "installing") return en ? "Starting the new version…" : "Die neue Version wird gestartet…";
    if (updateStatus === "error") return updateError;
    return en ? "Check GitHub Releases and update the portable app securely." : "GitHub Releases prüfen und die portable App sicher aktualisieren.";
  })();

  const runUpdateAction = async () => {
    const api = window.mkwii;
    if (!api) {
      setUpdateError(en ? "Updates are only available in the desktop app." : "Updates sind nur in der Desktop-App verfügbar.");
      setUpdateStatus("error");
      return;
    }
    try {
      setUpdateError("");
      if (updateStatus === "available") {
        setUpdateProgress(0);
        setUpdateStatus("downloading");
        const downloaded = await api.downloadUpdate();
        setDownloadInfo(downloaded);
        setUpdateStatus("downloaded");
        return;
      }
      if (updateStatus === "downloaded") {
        setUpdateStatus("installing");
        await api.installUpdate();
        return;
      }
      setUpdateStatus("checking");
      setDownloadInfo(null);
      const result = await api.checkForUpdates();
      setUpdateInfo(result);
      setUpdateStatus(result.updateAvailable ? "available" : "current");
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, "") : String(error);
      setUpdateError(message);
      setUpdateStatus("error");
    }
  };

  const updateWorking = updateStatus === "checking" || updateStatus === "downloading" || updateStatus === "installing";
  const updateButtonLabel = updateStatus === "checking" ? (en ? "Checking…" : "Prüfe…")
    : updateStatus === "available" && updateInfo ? (en ? `Download v${updateInfo.latestVersion}` : `v${updateInfo.latestVersion} laden`)
      : updateStatus === "downloading" ? `${updateProgress}%`
        : updateStatus === "downloaded" ? (en ? "Install & restart" : "Installieren & neu starten")
          : updateStatus === "installing" ? (en ? "Restarting…" : "Neustart…")
            : updateStatus === "idle" ? (en ? "Check for updates" : "Nach Updates suchen")
              : (en ? "Check again" : "Erneut prüfen");
  const updateButtonIcon = updateStatus === "available" ? <Download size={15} />
    : updateStatus === "downloaded" ? <RotateCw size={15} />
      : updateStatus === "current" ? <CheckCircle2 size={15} />
        : <RefreshCw className={updateWorking ? "spin" : ""} size={15} />;

  return (
    <div className="page">
      <header className="page-header"><div><p className="eyebrow"><span className="eyebrow-dot" /> APPLICATION</p><h1>{en ? "Settings" : "Einstellungen"}</h1><p>{en ? "Appearance, emulator, and run controls." : "Darstellung, Emulator und Ablaufsteuerung."}</p></div></header>
      <Card className="settings-list">
        <Setting icon={<Languages />} title={en ? "Language" : "Sprache"} description={en ? "German or English for the entire interface" : "Deutsch oder Englisch für die gesamte Oberfläche"} control={<button className="segmented" onClick={onLanguageToggle}><span className={language === "de" ? "active" : ""}>DE</span><span className={language === "en" ? "active" : ""}>EN</span></button>} />
        <Setting
          icon={<RefreshCw />}
          title={en ? "App updates" : "App-Updates"}
          description={updateDescription}
          control={
            <div className="update-controls">
              <Button variant={updateStatus === "available" || updateStatus === "downloaded" ? "primary" : "secondary"} disabled={busy || updateWorking} icon={updateButtonIcon} onClick={() => void runUpdateAction()}>{updateButtonLabel}</Button>
              {updateStatus === "downloading" && <span className="update-progress" aria-label={updateDescription}><span style={{ width: `${updateProgress}%` }} /></span>}
            </div>
          }
        />
        <Setting icon={<Disc3 />} title={en ? "Original ISO" : "Original-ISO"} description={iso || (en ? "No ISO selected" : "Keine ISO ausgewählt")} control={<button className="setting-link" disabled={busy} onClick={onBrowseIso}>{en ? "Choose ISO" : "ISO auswählen"}</button>} />
        <Setting icon={<FileOutput />} title={en ? "WIT test ISO" : "WIT-Test-ISO"} description={testIso || (en ? "Choose where the test ISO should be created" : "Speicherort der zu erstellenden Test-ISO auswählen")} control={<button className="setting-link" disabled={busy} onClick={onBrowseTestIso}>{en ? "Choose target" : "Ziel auswählen"}</button>} />
        <Setting icon={<Gamepad2 />} title="Dolphin" description={dolphin || (en ? "No executable selected" : "Keine Programmdatei ausgewählt")} control={<button className="setting-link" disabled={busy} onClick={onBrowseDolphin}>{en ? "Choose" : "Auswählen"}</button>} />
        <Setting icon={<DatabaseZap />} title="Wiimms ISO Tools (WIT)" description={wit} control={<button className="setting-link" disabled={busy} onClick={onBrowseWit}>{en ? "Choose wit.exe" : "wit.exe auswählen"}</button>} />
        <Setting
          icon={<PauseCircle />}
          title={en ? "Run controls" : "Ablaufsteuerung"}
          description={busy ? (en ? "Native automation is running" : "Native Automatisierung läuft") : (en ? "No process is currently active" : "Aktuell ist kein Prozess aktiv")}
          control={
            <div className="run-controls">
              <Button variant="secondary" disabled={!busy} icon={paused ? <Play size={15} /> : <PauseCircle size={15} />} onClick={onPauseToggle}>{paused ? (en ? "Resume" : "Weiter") : "Pause"}</Button>
              <Button variant="danger" disabled={!busy} icon={<Square size={14} />} onClick={onStop}>{en ? "Stop" : "Stopp"}</Button>
            </div>
          }
        />
      </Card>

      <Card className="settings-legacy-block">
        <Setting icon={<AlertTriangle />} title={en ? "WiiScrubber (Legacy / Broken)" : "WiiScrubber (Veraltet / Defekt)"} description={scrubber || (en ? "No executable selected" : "Keine Programmdatei ausgewählt")} control={<button className="setting-link setting-link--legacy" disabled={busy} onClick={onBrowseScrubber}>{en ? "Choose" : "Auswählen"}</button>} />
        <div className="settings-legacy-note">
          <Archive size={14} />
          <p>{en ? `WiiScrubber is legacy and currently broken. Mouse/keyboard automation used by this mode may stop working on newer Windows updates. This will likely break sooner or later.` : `WiiScrubber ist veraltet und derzeit defekt. Die Maus-/Tastaturautomatisierung dieses Modus kann bei künftigen Windows-Updates ausfallen. Wird früher oder später wahrscheinlich kaputtgehen.`}</p>
        </div>
      </Card>
    </div>
  );
}

function Setting({ icon, title, description, control }: { icon: React.ReactNode; title: string; description: string; control: React.ReactNode }) {
  return <div className="setting-row"><span className="setting-row__icon">{icon}</span><div><h3>{title}</h3><p>{description}</p></div>{control}</div>;
}
