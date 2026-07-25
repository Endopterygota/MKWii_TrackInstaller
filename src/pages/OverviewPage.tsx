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
  iso: string;
  testIso: string;
  busy: boolean;
  language: "de" | "en";
};

export function OverviewPage({ onInstall, onInstallAndPlay, onBuildInstallAndPlay, trackName, targetFile, iso, testIso, busy, language }: OverviewProps) {
  const en = language === "en";
  const isoReady = Boolean(iso && testIso);
  const isoName = fileName(iso);
  const systemReady = Boolean(trackName && iso && targetFile);
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> DESKTOP WORKSPACE</p>
          <h1>{en ? "Ready for the next test drive." : "Bereit für die nächste Testfahrt."}</h1>
          <p>{en ? "Check the track, install it into the ISO, and launch it directly with Dolphin." : "Strecke prüfen, in die ISO einsetzen und direkt mit Dolphin starten."}</p>
        </div>
        <div className="page-header__actions">
          <StatusPill tone={busy ? "warning" : (systemReady ? "success" : "warning")}>{busy ? (en ? "Automation running" : "Automatisierung läuft") : (systemReady ? (en ? "System ready" : "System bereit") : (en ? "System not ready!" : "System nicht bereit!"))}</StatusPill>
          <Button className="one-click-button" variant="primary" disabled={busy || !isoReady} onClick={onBuildInstallAndPlay} icon={<Rocket size={16} />}>{en ? "Build, install & launch" : "Erstellen, einsetzen & starten"}</Button>
        </div>
      </header>

      <section className="stat-grid">
        <Card accent className={!trackName ? "card--danger" : ""}><Stat icon={<FolderCheck />} label={en ? "Active project" : "Aktives Projekt"} value={trackName || (en ? "No project" : "Kein Projekt")} detail={en ? "SZS file selected" : "SZS-Datei ausgewählt"} invalid={!trackName} /></Card>
        <Card className={!iso ? "card--danger" : ""}><Stat icon={<Disc3 />} label={en ? "ISO status" : "ISO-Status"} value={isoName || (en ? "Not selected" : "Nicht ausgewählt")} detail={testIso ? (en ? "Test ISO target selected" : "Test-ISO-Ziel ausgewählt") : (en ? "Choose both ISO paths in Settings" : "Beide ISO-Pfade unter Einstellungen wählen")} invalid={!iso} /></Card>
        <Card className={!targetFile ? "card--danger" : ""}><Stat icon={<CheckCircle2 />} label={en ? "Target file" : "Zieldatei"} value={targetFile || (en ? "Not set" : "Nicht gesetzt")} detail="Partition:0 › Race › Course" invalid={!targetFile} /></Card>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">QUICK ACTIONS</p><h2>{en ? "Test track" : "Strecke testen"}</h2></div></div>
        <div className="action-grid">
          <Card className="action-card" interactive>
            <span className="action-card__icon action-card__icon--blue"><DatabaseZap /></span>
            <h3>{en ? "Install track" : "Strecke einsetzen"}</h3>
            <p>{en ? "Updates the selected target file in the chosen WIT test ISO in the background." : "Aktualisiert die gewählte Zieldatei im Hintergrund in der ausgewählten WIT-Test-ISO."}</p>
            <Button variant="primary" disabled={busy || !isoReady} onClick={onInstall} icon={<Play size={16} />}>{en ? "Install now" : "Jetzt einsetzen"}</Button>
          </Card>
          <Card className="action-card" interactive>
            <span className="action-card__icon action-card__icon--violet"><Gamepad2 /></span>
            <h3>{en ? "Install & launch" : "Einsetzen & starten"}</h3>
            <p>{en ? "Updates the WIT test ISO and launches that exact ISO directly in Dolphin." : "Aktualisiert die WIT-Test-ISO und startet genau diese ISO direkt in Dolphin."}</p>
            <Button variant="dolphin" disabled={busy || !isoReady} onClick={onInstallAndPlay} icon={<Gamepad2 size={17} />}>{en ? "Launch with Dolphin" : "Mit Dolphin starten"}</Button>
          </Card>
        </div>
        <Card className="mode-note mode-note--wit">
          <span><ShieldCheck /></span>
          <div><b>{en ? "Wiimms ISO Tools (WIT) required" : "Wiimms ISO Tools (WIT) erforderlich"}</b><p>{en ? "Select wit.exe, the original ISO, and a test ISO target in Settings. The test ISO is created on the first run; later runs update the same selected file." : "Unter Einstellungen wit.exe, die Original-ISO und ein Ziel für die Test-ISO auswählen. Beim ersten Durchlauf wird die Test-ISO angelegt; spätere Durchläufe aktualisieren dieselbe ausgewählte Datei."}</p></div>
        </Card>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, detail, invalid }: { icon: React.ReactNode; label: string; value: string; detail: string; invalid?: boolean }) {
  return <div className={`stat${invalid ? " stat--invalid" : ""}`}> <span>{icon}</span><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>;
}

function fileName(value: string) {
  return value.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "";
}
