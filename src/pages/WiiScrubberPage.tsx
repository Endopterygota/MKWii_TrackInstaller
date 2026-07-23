import { AlertTriangle, Gamepad2, Play, ScanSearch } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusPill } from "../components/ui/StatusPill";

type WiiScrubberPageProps = {
  onInstall: () => void;
  onInstallAndPlay: () => void;
  busy: boolean;
  language: "de" | "en";
};

export function WiiScrubberPage({ onInstall, onInstallAndPlay, busy, language }: WiiScrubberPageProps) {
  const en = language === "en";
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> WIISCRUBBER</p>
          <h1>{en ? "Direct ISO replacement." : "Direktes Ersetzen in der ISO."}</h1>
          <p>{en ? "The classic mode controls the WiiScrubber interface and changes the source ISO directly." : "Der klassische Modus steuert die WiiScrubber-Oberfläche und verändert die Quell-ISO direkt."}</p>
        </div>
        <StatusPill tone={busy ? "warning" : "success"}>{busy ? (en ? "Process running" : "Prozess läuft") : "WiiScrubber"}</StatusPill>
      </header>

      <Card className="mode-note mode-note--warning">
        <span><AlertTriangle /></span>
        <div><b>{en ? "WiiScrubber must be installed" : "WiiScrubber muss installiert sein"}</b><p>{en ? "Select WiiScrubber.exe in the track project. This mode modifies MarioKartWii [RMCP01].iso directly and temporarily uses mouse and keyboard automation." : "WiiScrubber.exe muss im Streckenprojekt ausgewählt sein. Dieser Modus verändert MarioKartWii [RMCP01].iso direkt und verwendet vorübergehend Maus- und Tastaturautomatisierung."}</p></div>
      </Card>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">WIISCRUBBER ACTIONS</p><h2>{en ? "Install track" : "Strecke einsetzen"}</h2></div></div>
        <div className="action-grid">
          <Card className="action-card" interactive>
            <span className="action-card__icon"><ScanSearch /></span>
            <h3>{en ? "Install track" : "Strecke einsetzen"}</h3>
            <p>{en ? "Replaces the selected slot directly in the original Mario Kart Wii ISO." : "Ersetzt den gewählten Slot direkt in der originalen Mario-Kart-Wii-ISO."}</p>
            <Button variant="primary" disabled={busy} onClick={onInstall} icon={<Play size={16} />}>{en ? "Install now" : "Jetzt einsetzen"}</Button>
          </Card>
          <Card className="action-card" interactive>
            <span className="action-card__icon action-card__icon--violet"><Gamepad2 /></span>
            <h3>{en ? "Install & launch" : "Einsetzen & starten"}</h3>
            <p>{en ? "Runs the WiiScrubber replacement and then launches Mario Kart Wii in Dolphin." : "Führt den WiiScrubber-Replace aus und startet danach Mario Kart Wii in Dolphin."}</p>
            <Button variant="dolphin" disabled={busy} onClick={onInstallAndPlay} icon={<Gamepad2 size={17} />}>{en ? "Launch with Dolphin" : "Mit Dolphin starten"}</Button>
          </Card>
        </div>
      </section>
    </div>
  );
}
