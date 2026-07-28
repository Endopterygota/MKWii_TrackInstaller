import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, BookOpen, FolderCog, Gauge, Languages, Settings2, Wrench, type LucideIcon } from "lucide-react";

export type PageId = "overview" | "project" | "tools" | "workflow" | "legacy" | "settings";

type NavItem = { id: PageId; label: string; shortLabel: string; icon: LucideIcon };

type AppShellProps = {
  page: PageId;
  onPageChange: (page: PageId) => void;
  language: "de" | "en";
  onLanguageToggle: () => void;
  children: ReactNode;
  consolePanel: ReactNode;
};

const EXPAND_THRESHOLD = 40;

export function AppShell({ page, onPageChange, language, onLanguageToggle, children, consolePanel }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const english = language === "en";

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (e.clientX <= EXPAND_THRESHOLD) {
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
        collapseTimer.current = null;
      }
      setSidebarCollapsed(false);
    } else if (!sidebarCollapsed && e.clientX > 160) {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
      collapseTimer.current = setTimeout(() => setSidebarCollapsed(true), 200);
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, [handleMouseMove]);

  const navItems: NavItem[] = [
    { id: "overview", label: english ? "Overview" : "Übersicht", shortLabel: "Home", icon: Gauge },
    { id: "project", label: english ? "Track project" : "Streckenprojekt", shortLabel: english ? "Project" : "Projekt", icon: FolderCog },
    { id: "tools", label: english ? "SZS tools" : "SZS-Werkzeuge", shortLabel: "Tools", icon: Wrench },
    { id: "workflow", label: english ? "Track workflow" : "Strecken-Workflow", shortLabel: "Workflow", icon: BookOpen },
    { id: "legacy", label: english ? "Legacy features" : "Veraltete Funktionen", shortLabel: "Legacy", icon: Archive },
    { id: "settings", label: english ? "Settings" : "Einstellungen", shortLabel: english ? "Setup" : "Setup", icon: Settings2 },
  ];
  return (
    <div className={`app-shell ${sidebarCollapsed ? "app-shell--collapsed" : ""}`}>
      <div className="veil" aria-hidden><span /><span /><span /></div>

      <aside className="sidebar glass-surface sidebar--liquid" aria-label={english ? "Application sidebar" : "Anwendungsseitenleiste"}>
        <div className="brand">
          <span className="brand__mark">MK</span>
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.div className="brand__text"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                <strong>MKWii</strong>
                <small>TRACK INSTALLER</small>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="sidebar__nav" aria-label={english ? "Main navigation" : "Hauptnavigation"}>
          {navItems.map((item) => (
            <NavButton key={item.id} item={item} active={page === item.id} collapsed={sidebarCollapsed} onClick={() => onPageChange(item.id)} />
          ))}
        </nav>

        <div className={`sidebar__extras ${sidebarCollapsed ? "sidebar__extras--collapsed" : ""}`}>
          <button className="language-button" onClick={onLanguageToggle} title={english ? "Change language" : "Sprache wechseln"} aria-label={english ? "Change language" : "Sprache wechseln"}>
            <Languages size={16} />
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{language === "de" ? "Deutsch" : "English"}</motion.span>}
            </AnimatePresence>
            {!sidebarCollapsed && <b>{language === "de" ? "DE" : "EN"}</b>}
          </button>

          <div className="sidebar__footer" title={english ? "Tools configured" : "Werkzeuge konfiguriert"}>
            <span className="online-dot" />
            {!sidebarCollapsed && <span>{english ? "Tools configured" : "Werkzeuge konfiguriert"}</span>}
          </div>
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

function NavButton({ item, active, collapsed, onClick }: { item: NavItem; active: boolean; collapsed: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button className={`nav-button ${active ? "nav-button--active" : ""} ${collapsed ? "nav-button--collapsed" : ""}`} onClick={onClick} title={collapsed ? item.label : undefined} aria-label={item.label} aria-current={active ? "page" : undefined}>
      <Icon size={18} />
      <AnimatePresence initial={false}>
        {!collapsed && <motion.span className="nav-button__label" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.14 }}>{item.label}</motion.span>}
      </AnimatePresence>
      {active && <motion.span layoutId="active-nav" className="nav-button__indicator" />}
    </button>
  );
}
