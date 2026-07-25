import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronDown, Circle, FileWarning, TerminalSquare, Trash2, X } from "lucide-react";
import { Card } from "./ui/Card";

export type LogEntry = { time: string; level: "INFO" | "OK" | "HINT" | "WARN" | "ERROR"; text: string };

type AutomationConsoleProps = {
  logs: LogEntry[];
  running: boolean;
  paused: boolean;
  language: "de" | "en";
  checkWarnings: LogEntry[];
  additionalFiles: string[];
  onDismissWarnings: () => void;
  onDeleteAdditionalFiles: () => void;
};

export function AutomationConsole({ logs, running, paused, language, checkWarnings, additionalFiles, onDismissWarnings, onDeleteAdditionalFiles }: AutomationConsoleProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [showAdditionalFiles, setShowAdditionalFiles] = useState(false);
  const en = language === "en";

  useEffect(() => {
    if (additionalFiles.length === 0) {
      setShowAdditionalFiles(false);
      return;
    }
    setShowAdditionalFiles(true);
    const timeout = window.setTimeout(() => setShowAdditionalFiles(false), 10_000);
    return () => window.clearTimeout(timeout);
  }, [additionalFiles]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const scrollToLatest = () => {
      body.scrollTop = body.scrollHeight;
    };
    scrollToLatest();
    const frame = window.requestAnimationFrame(scrollToLatest);
    return () => window.cancelAnimationFrame(frame);
  }, [logs]);

  return (
    <Card className="console-card">
      <div className="console-card__header">
        <div><p className="eyebrow">LIVE OUTPUT</p><h2>Automation</h2></div>
        <span className={`console-card__status ${running ? "console-card__status--running" : ""}`}><Circle size={7} fill="currentColor" /> {paused ? (en ? "paused" : "pausiert") : running ? (en ? "running" : "läuft") : (en ? "ready" : "bereit")} <ChevronDown size={14} /></span>
      </div>
      {checkWarnings.length > 0 && (
        <section className="warning-summary" aria-label={en ? "Collected SZS check warnings" : "Gesammelte SZS-Prüfwarnungen"}>
          <div className="warning-summary__header">
            <span><AlertTriangle size={15} /><b>{en ? `SZS check: ${checkWarnings.length} warning(s)` : `SZS-Prüfung: ${checkWarnings.length} Warnung(en)`}</b></span>
            <button onClick={onDismissWarnings}><X size={14} />{en ? "Hide" : "Ausblenden"}</button>
          </div>
          <div className="warning-summary__list">
            {checkWarnings.map((entry, index) => <p key={`${entry.time}-${entry.text}-${index}`}>{entry.text.replace(/^\[wszst\]\s*/i, "")}</p>)}
          </div>
        </section>
      )}
      <AnimatePresence initial={false}>
        {showAdditionalFiles && additionalFiles.length > 0 && (
          <motion.section
            className="additional-files-summary"
            aria-label={en ? "Additional files found by SZS check" : "Von der SZS-Prüfung gefundene zusätzliche Dateien"}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.42, ease: "easeInOut" }}
          >
            <div>
              <span><FileWarning size={15} /><b>{en ? `${additionalFiles.length} additional file(s)` : `${additionalFiles.length} zusätzliche Datei(en)`}</b></span>
              <small>{en ? "Can be deleted together after confirmation. This notice closes after 10 seconds." : "Können nach Bestätigung gemeinsam gelöscht werden. Dieser Hinweis schließt nach 10 Sekunden."}</small>
            </div>
            <button disabled={running} onClick={onDeleteAdditionalFiles}><Trash2 size={14} />{en ? "Delete all" : "Alle löschen"}</button>
          </motion.section>
        )}
      </AnimatePresence>
      <div className="console-card__body" ref={bodyRef} role="log" aria-live="polite">
        {logs.map((entry, index) => {
          const groupStart = entry.text.trimStart().startsWith("---");
          return (
          <div className={`log-line log-line--${entry.level.toLowerCase()} ${groupStart ? "log-line--group-start" : ""}`} key={`${entry.time}-${index}`}>
            <span>{entry.time}</span><b>{entry.level}</b><p>{entry.text}</p>
          </div>
        )})}
      </div>
      <div className="console-card__footer"><TerminalSquare size={14} /><span>{running ? (en ? "Native automation active" : "Native Automatisierung aktiv") : (en ? "No running processes" : "Keine laufenden Prozesse")}</span></div>
    </Card>
  );
}
