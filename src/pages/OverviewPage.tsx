import { CheckCircle2, DatabaseZap, Disc3, FolderCheck, Gamepad2, Play, Rocket, ShieldCheck } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusPill } from "../components/ui/StatusPill";

type OverviewProps = {
  onInstall: () => void;
  onInstallAndPlay: () => void;
  onBuildInstallAndPlay: () => void;
  trackName: string;
  targetFile: string;
  busy: boolean;
  language: "de" | "en";
};

export function OverviewPage({ onInstall, onInstallAndPlay, onBuildInstallAndPlay, trackName, targetFile, busy, language }: OverviewProps) {
  const en = language === "en";
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> DESKTOP WORKSPACE</p>
          <h1>{en ? "Ready for the next test drive." : "Bereit für die nächste Testfahrt."}</h1>
          <p>{en ? "Check the track, install it into the ISO, and launch it directly with Dolphin." : "Strecke prüfen, in die ISO einsetzen und direkt mit Dolphin starten."}</p>
        </div>
        <div className="page-header__actions">
          <StatusPill tone={busy ? "warning" : "success"}>{busy ? (en ? "Automation running" : "Automatisierung läuft") : (en ? "System ready" : "System bereit")}</StatusPill>
          <Button className="one-click-button" variant="primary" disabled={busy} onClick={onBuildInstallAndPlay} icon={<Rocket size={16} />}>{en ? "Build, install & launch" : "Erstellen, einsetzen & starten"}</Button>
        </div>
      </header>

      <section className="stat-grid">
        <Card accent><Stat icon={<FolderCheck />} label={en ? "Active project" : "Aktives Projekt"} value={trackName || (en ? "No project" : "Kein Projekt")} detail={en ? "SZS file selected" : "SZS-Datei ausgewählt"} /></Card>
        <Card><Stat icon={<Disc3 />} label={en ? "ISO status" : "ISO-Status"} value={en ? "Ready" : "Bereit"} detail="RMCP01 · PAL" /></Card>
        <Card><Stat icon={<CheckCircle2 />} label={en ? "Target slot" : "Ziel-Slot"} value="GC Peach Beach" detail={targetFile} /></Card>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">QUICK ACTIONS</p><h2>{en ? "Test track" : "Strecke testen"}</h2></div></div>
        <div className="action-grid">
          <Card className="action-card" interactive>
            <span className="action-card__icon action-card__icon--blue"><DatabaseZap /></span>
            <h3>{en ? "Install track" : "Strecke einsetzen"}</h3>
            <p>{en ? "Updates the selected slot in the fixed WIT test ISO in the background." : "Aktualisiert den gewählten Slot im Hintergrund in der festen WIT-Test-ISO."}</p>
            <Button variant="primary" disabled={busy} onClick={onInstall} icon={<Play size={16} />}>{en ? "Install now" : "Jetzt einsetzen"}</Button>
          </Card>
          <Card className="action-card" interactive>
            <span className="action-card__icon action-card__icon--violet"><Gamepad2 /></span>
            <h3>{en ? "Install & launch" : "Einsetzen & starten"}</h3>
            <p>{en ? "Updates the WIT test ISO and launches that exact ISO directly in Dolphin." : "Aktualisiert die WIT-Test-ISO und startet genau diese ISO direkt in Dolphin."}</p>
            <Button variant="dolphin" disabled={busy} onClick={onInstallAndPlay} icon={<Gamepad2 size={17} />}>{en ? "Launch with Dolphin" : "Mit Dolphin starten"}</Button>
          </Card>
        </div>
        <Card className="mode-note mode-note--wit">
          <span><ShieldCheck /></span>
          <div><b>{en ? "Wiimms ISO Tools (WIT) required" : "Wiimms ISO Tools (WIT) erforderlich"}</b><p>{en ? "Select wit.exe in Settings. The fixed Documents\\MarioKartWii-TrackTest.iso is created only on the first run; later runs update the same test ISO." : "Unter Einstellungen die wit.exe auswählen. Die feste Dokumente\\MarioKartWii-TrackTest.iso wird nur beim ersten Durchlauf angelegt; spätere Durchläufe aktualisieren dieselbe Test-ISO."}</p></div>
        </Card>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="stat"><span>{icon}</span><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>;
}
