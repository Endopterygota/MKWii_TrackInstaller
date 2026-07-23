import { CheckCircle2, Hammer, Play, TerminalSquare } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusPill } from "../components/ui/StatusPill";

export function ToolsPage({ onCreate, onCheck, trackTarget, busy, language }: { onCreate: () => void; onCheck: () => void; trackTarget: string; busy: boolean; language: "de" | "en" }) {
  const en = language === "en";
  return (
    <div className="page">
      <header className="page-header"><div><p className="eyebrow"><span className="eyebrow-dot" /> WIIMMS SZS TOOLS</p><h1>Build & Validation</h1><p>{en ? "All commands run hidden in the background; their output appears in the automation console." : "Alle Befehle laufen unsichtbar im Hintergrund; die Ausgabe erscheint in der Automation-Konsole."}</p></div><StatusPill tone={busy ? "warning" : "info"}>{busy ? (en ? "Process running" : "Prozess läuft") : (en ? "wszst ready" : "wszst bereit")}</StatusPill></header>
      <div className="tool-grid">
        <Card className="tool-card" interactive>
          <span className="tool-card__icon"><Hammer /></span><div><p className="eyebrow">CREATE</p><h2>{en ? "Create SZS" : "SZS erstellen"}</h2><p>{en ? "Creates" : "Erstellt"} <code>{trackTarget}.szs</code> {en ? "from the track-files folder with the same name." : "aus dem gleichnamigen Streckendateiordner."}</p></div>
          <div className="command"><TerminalSquare size={15} /><code>wszst create "{trackTarget}" -o</code></div>
          <Button variant="primary" disabled={busy} icon={<Play size={16} />} onClick={onCreate}>{en ? "Run in background" : "Im Hintergrund ausführen"}</Button>
        </Card>
        <Card className="tool-card" interactive>
          <span className="tool-card__icon tool-card__icon--blue"><CheckCircle2 /></span><div><p className="eyebrow">CHECK</p><h2>{en ? "Check SZS" : "SZS prüfen"}</h2><p>{en ? "Analyzes the track and shows hints, warnings, and errors in color in the console." : "Analysiert die Strecke und übernimmt Hints, Warnungen und Fehler farbig in die Konsole."}</p></div>
          <div className="command"><TerminalSquare size={15} /><code>wszst check "{trackTarget}"</code></div>
          <Button variant="check" disabled={busy} icon={<CheckCircle2 size={16} />} onClick={onCheck}>{en ? "Start validation" : "Validierung starten"}</Button>
        </Card>
      </div>
      <Card className="legend-card"><p className="eyebrow">OUTPUT LEVELS</p><div><StatusPill tone="success">{en ? "Success" : "Erfolg"}</StatusPill><StatusPill tone="warning">Hint</StatusPill><StatusPill tone="warning">Warning</StatusPill><StatusPill>Info</StatusPill></div></Card>
    </div>
  );
}
