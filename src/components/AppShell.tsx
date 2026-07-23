import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Disc3, FolderCog, Gauge, Languages, Settings2, Wrench, type LucideIcon } from "lucide-react";

export type PageId = "overview" | "project" | "tools" | "scrubber" | "settings";

type NavItem = { id: PageId; label: string; shortLabel: string; icon: LucideIcon };

type AppShellProps = {
  page: PageId;
  onPageChange: (page: PageId) => void;
  language: "de" | "en";
  onLanguageToggle: () => void;
  children: ReactNode;
  consolePanel: ReactNode;
};

export function AppShell({ page, onPageChange, language, onLanguageToggle, children, consolePanel }: AppShellProps) {
  const english = language === "en";
  const navItems: NavItem[] = [
    { id: "overview", label: english ? "Overview" : "Übersicht", shortLabel: "Home", icon: Gauge },
    { id: "project", label: english ? "Track project" : "Streckenprojekt", shortLabel: english ? "Project" : "Projekt", icon: FolderCog },
    { id: "tools", label: english ? "SZS tools" : "SZS-Werkzeuge", shortLabel: "Tools", icon: Wrench },
    { id: "scrubber", label: english ? "WiiScrubber mode" : "WiiScrubber-Modus", shortLabel: "Scrubber", icon: Disc3 },
    { id: "settings", label: english ? "Settings" : "Einstellungen", shortLabel: english ? "Setup" : "Setup", icon: Settings2 },
  ];
  return (
    <div className="app-shell">
      <div className="veil" aria-hidden><span /><span /><span /></div>

      <aside className="sidebar glass-surface">
        <div className="brand">
          <span className="brand__mark">MK</span>
          <div><strong>MKWii</strong><small>TRACK INSTALLER</small></div>
        </div>

        <nav className="sidebar__nav" aria-label={english ? "Main navigation" : "Hauptnavigation"}>
          {navItems.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => onPageChange(item.id)} />)}
        </nav>

        <button className="language-button" onClick={onLanguageToggle}>
          <Languages size={16} />
          <span>{language === "de" ? "Deutsch" : "English"}</span>
          <b>{language === "de" ? "DE" : "EN"}</b>
        </button>

        <div className="sidebar__footer">
          <span className="online-dot" />
          <span>{english ? "Tools configured" : "Werkzeuge konfiguriert"}</span>
        </div>
      </aside>

      <main className="workspace">
        <motion.div key={page} className="workspace__content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {children}
        </motion.div>
        <aside className="console-column">{consolePanel}</aside>
      </main>

      <nav className="bottom-nav glass-surface" aria-label={english ? "Mobile navigation" : "Mobile Navigation"}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => onPageChange(item.id)}>
              <Icon size={19} /><span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button className={`nav-button ${active ? "nav-button--active" : ""}`} onClick={onClick}>
      <Icon size={18} />
      <span>{item.label}</span>
      {active && <motion.span layoutId="active-nav" className="nav-button__indicator" />}
    </button>
  );
}
