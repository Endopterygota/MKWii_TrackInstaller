import { AlertTriangle, Archive, DatabaseZap, Disc3, FileOutput, Gamepad2, Languages, PauseCircle, Play, Square } from "lucide-react";
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

export function SettingsPage({ language, dolphin, wit, iso, testIso, scrubber, busy, paused, onLanguageToggle, onBrowseDolphin, onBrowseWit, onBrowseIso, onBrowseTestIso, onBrowseScrubber, onPauseToggle, onStop }: SettingsPageProps) {
  const en = language === "en";
  return (
    <div className="page">
      <header className="page-header"><div><p className="eyebrow"><span className="eyebrow-dot" /> APPLICATION</p><h1>{en ? "Settings" : "Einstellungen"}</h1><p>{en ? "Appearance, emulator, and run controls." : "Darstellung, Emulator und Ablaufsteuerung."}</p></div></header>
      <Card className="settings-list">
        <Setting icon={<Languages />} title={en ? "Language" : "Sprache"} description={en ? "German or English for the entire interface" : "Deutsch oder Englisch für die gesamte Oberfläche"} control={<button className="segmented" onClick={onLanguageToggle}><span className={language === "de" ? "active" : ""}>DE</span><span className={language === "en" ? "active" : ""}>EN</span></button>} />
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
