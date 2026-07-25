import { CheckCircle2, FileMinus2, FilePenLine, FilePlus2, GitCompareArrows, Hammer, Play, TerminalSquare, TriangleAlert } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusPill } from "../components/ui/StatusPill";

type ToolsPageProps = {
  onCreate: () => void;
  onCheck: () => void;
  trackTarget: string;
  busy: boolean;
  language: "de" | "en";
  comparison: SzsComparison | null;
};

export function ToolsPage({ onCreate, onCheck, trackTarget, busy, language, comparison }: ToolsPageProps) {
  const en = language === "en";
  const modified = comparison?.changes.filter((change) => change.kind === "modified") ?? [];
  const added = comparison?.changes.filter((change) => change.kind === "added") ?? [];
  const removed = comparison?.changes.filter((change) => change.kind === "removed") ?? [];
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
      <Card className="szs-diff-card">
        <div className="szs-diff-card__header">
          <div><p className="eyebrow">SZS CONTENT DIFF</p><h2>{en ? "Changes since the previous SZS" : "Änderungen seit der vorherigen SZS"}</h2></div>
          <GitCompareArrows size={21} />
        </div>
        {!comparison && <DiffEmpty icon={<GitCompareArrows />} text={en ? "Run wszst create to compare the new archive with the previous SZS." : "Führe wszst create aus, um das neue Archiv mit der vorherigen SZS zu vergleichen."} />}
        {comparison?.error && <DiffEmpty warning icon={<TriangleAlert />} text={en ? `Comparison unavailable: ${comparison.error}` : `Vergleich nicht verfügbar: ${comparison.error}`} />}
        {comparison && !comparison.error && !comparison.baselineAvailable && <DiffEmpty icon={<GitCompareArrows />} text={en ? "No previous SZS existed. The next successful build can be compared with this one." : "Es gab noch keine vorherige SZS. Der nächste erfolgreiche Build kann mit dieser Version verglichen werden."} />}
        {comparison?.baselineAvailable && !comparison.error && comparison.changes.length === 0 && <DiffEmpty success icon={<CheckCircle2 />} text={en ? "No archive files changed." : "Keine Dateien im Archiv wurden geändert."} />}
        {comparison?.baselineAvailable && !comparison.error && comparison.changes.length > 0 && (
          <>
            <div className="szs-diff-summary">
              <StatusPill tone="warning">{modified.length} {en ? "modified" : "geändert"}</StatusPill>
              <StatusPill tone="success">{added.length} {en ? "added" : "neu"}</StatusPill>
              <StatusPill>{removed.length} {en ? "removed" : "entfernt"}</StatusPill>
            </div>
            <div className="szs-diff-groups">
              <DiffGroup kind="modified" title={en ? "Modified" : "Geändert"} entries={modified} icon={<FilePenLine />} />
              <DiffGroup kind="added" title={en ? "Added" : "Neu"} entries={added} icon={<FilePlus2 />} />
              <DiffGroup kind="removed" title={en ? "Removed" : "Entfernt"} entries={removed} icon={<FileMinus2 />} />
            </div>
          </>
        )}
      </Card>
      <Card className="legend-card"><p className="eyebrow">OUTPUT LEVELS</p><div><StatusPill tone="success">{en ? "Success" : "Erfolg"}</StatusPill><StatusPill tone="warning">Hint</StatusPill><StatusPill tone="warning">Warning</StatusPill><StatusPill>Info</StatusPill></div></Card>
    </div>
  );
}

function DiffEmpty({ icon, text, warning = false, success = false }: { icon: React.ReactNode; text: string; warning?: boolean; success?: boolean }) {
  return <div className={`szs-diff-empty ${warning ? "szs-diff-empty--warning" : ""} ${success ? "szs-diff-empty--success" : ""}`}>{icon}<p>{text}</p></div>;
}

function DiffGroup({ kind, title, entries, icon }: { kind: SzsChange["kind"]; title: string; entries: SzsChange[]; icon: React.ReactNode }) {
  return (
    <section className={`szs-diff-group szs-diff-group--${kind}`}>
      <h3>{icon}<span>{title}</span><b>{entries.length}</b></h3>
      {entries.length === 0
        ? <small>—</small>
        : <div className="szs-diff-list">{entries.map((entry) => <code key={`${entry.kind}-${entry.path}`}>{entry.path}</code>)}</div>}
    </section>
  );
}
