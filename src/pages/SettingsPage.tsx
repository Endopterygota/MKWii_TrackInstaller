import { DatabaseZap, Gamepad2, Languages, MonitorCog, PauseCircle, Play, Square } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

type SettingsPageProps = {
  language: "de" | "en";
  dolphin: string;
  wit: string;
  busy: boolean;
  paused: boolean;
  onLanguageToggle: () => void;
  onBrowseDolphin: () => void;
  onBrowseWit: () => void;
  onPauseToggle: () => void;
  onStop: () => void;
};

export function SettingsPage({ language, dolphin, wit, busy, paused, onLanguageToggle, onBrowseDolphin, onBrowseWit, onPauseToggle, onStop }: SettingsPageProps) {
  const en = language === "en";
  return (
    <div className="page">
      <header className="page-header"><div><p className="eyebrow"><span className="eyebrow-dot" /> APPLICATION</p><h1>{en ? "Settings" : "Einstellungen"}</h1><p>{en ? "Appearance, emulator, and run controls." : "Darstellung, Emulator und Ablaufsteuerung."}</p></div></header>
      <Card className="settings-list">
        <Setting icon={<Languages />} title={en ? "Language" : "Sprache"} description={en ? "German or English for the entire interface" : "Deutsch oder Englisch für die gesamte Oberfläche"} control={<button className="segmented" onClick={onLanguageToggle}><span className={language === "de" ? "active" : ""}>DE</span><span className={language === "en" ? "active" : ""}>EN</span></button>} />
        <Setting icon={<Gamepad2 />} title="Dolphin" description={dolphin} control={<button className="setting-link" disabled={busy} onClick={onBrowseDolphin}>{en ? "Choose" : "Auswählen"}</button>} />
        <Setting icon={<DatabaseZap />} title="Wiimms ISO Tools (WIT)" description={wit} control={<button className="setting-link" disabled={busy} onClick={onBrowseWit}>{en ? "Choose wit.exe" : "wit.exe auswählen"}</button>} />
        <Setting icon={<MonitorCog />} title={en ? "Desktop mode" : "Desktop-Modus"} description={en ? "Wide navigation and an always-visible console" : "Breite Navigation und dauerhaft sichtbare Konsole"} control={<Toggle checked label={en ? "Toggle desktop mode" : "Desktop-Modus umschalten"} />} />
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
    </div>
  );
}

function Setting({ icon, title, description, control }: { icon: React.ReactNode; title: string; description: string; control: React.ReactNode }) {
  return <div className="setting-row"><span className="setting-row__icon">{icon}</span><div><h3>{title}</h3><p>{description}</p></div>{control}</div>;
}

function Toggle({ checked, label }: { checked: boolean; label: string }) {
  return <button className={`toggle ${checked ? "toggle--checked" : ""}`} aria-label={label}><span /></button>;
}
