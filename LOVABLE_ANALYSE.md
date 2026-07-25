# Analyse und Übertragung der Lovable-Vorlage

## 1. Analysierter Ausgangsstand

Das private GitHub-Projekt `Endopterygota/claim-canvas-creative` ist eine React-/TypeScript-Anwendung mit Vite. Der ursprüngliche Stack kombiniert React 19, TanStack Router, Tailwind CSS 4, Radix-basierte UI-Bausteine, Framer Motion, Lucide Icons und Supabase. Lovable wird als Projekt- und Generierungsumgebung verwendet.

### Informationsarchitektur

Die ursprüngliche Anwendung besitzt öffentliche Authentifizierungsseiten und einen geschützten App-Bereich. Der generierte Route Tree enthält unter anderem:

- Login, Passwort-Reset und Passwort-vergessen
- Dashboard
- Expenses und Approvals
- Trips, Reports, Finance und Policies
- AI-Assistent und Profil
- mehrere Admin-Bereiche

Die Rollen- und Persona-Logik unterscheidet Mitarbeiter, Manager, Finance und Administration. Supabase stellt Authentifizierung, Datenabfragen, Realtime-Status, Storage und serverseitige Funktionen bereit.

### Visuelles System

- Sehr dunkler, leicht warmer Hintergrund (`#0b0a10`)
- Smaragdgrün als primäre Aktions- und Statusfarbe
- Große, eng gesetzte Überschriften mit Inter
- Transparente Karten mit feiner heller Kontur, Hintergrundunschärfe und weichem Tiefenschatten
- Große Radien für App-Flächen und Dialoge; kleinere, konsistente Radien für Felder und Buttons
- Pill-förmige Statusanzeigen und kompakte Versal-Eyebrows
- Subtile violette, blaue, gelbe und rote Sekundärzustände
- Animierter grüner Hintergrundschleier als Tiefenebene

### Navigation und responsive Struktur

- Desktop: feste seitliche Hauptnavigation
- Mobile: feste Bottom Navigation
- Inhaltsbereich mit Kartenrastern und kontextbezogenen Aktionen
- Modale Dialoge sowie mobil geeignete Sheet-/Overlay-Muster
- Responsive Reduktion mehrspaltiger Raster auf eine Spalte
- Persistente Status- und Aktionsflächen

### Interaktion und Animation

- Framer-Motion-Einblendungen bei Seitenwechseln
- Kurzer Karten-Lift bei Hover
- Skalierungsfeedback beim Drücken von Buttons
- Animierte aktive Navigationsmarkierung
- Ein-/Ausblendanimationen für Dialog und Backdrop
- Berücksichtigung von `prefers-reduced-motion`

## 2. Entfernte Spesen-Domäne

Die neue Grundlage enthält keinerlei Spesenabrechnungslogik. Entfernt beziehungsweise bewusst nicht übernommen wurden:

- Spesen, Belege, Erstattungen und Genehmigungen
- Reisen, Finance, Reports, Richtlinien und AI-Assistent
- OCR-, Kamera-, Upload-, CSV- und Währungslogik
- Mitarbeiter-, Manager-, Finance- und Administrator-Personas
- E-Mail-/Passwort- und Google-Authentifizierung
- Supabase-Schemas, Queries, Realtime, Storage und Server Functions

Das ursprüngliche GitHub-Projekt wurde dabei nicht überschrieben und es wurden keine Änderungen zu GitHub übertragen.

## 3. MKWii-Informationsarchitektur

| Bereich | Zweck |
| --- | --- |
| Übersicht | Projektstatus, ISO-Ziel und schnelle Installationsaktionen |
| Streckenprojekt | Streckenordner, SZS-Datei, WiiScrubber und Ziel-Slot |
| SZS-Werkzeuge | Oberflächen für `wszst create` und `wszst check` |
| Einstellungen | Sprache, Dolphin, Ablaufsteuerung und Direktmodus |
| Automation | Persistente, farbcodierte Prozessausgabe |

Desktop verwendet weiterhin eine Seitenleiste und zeigt die Automation-Konsole rechts neben dem Arbeitsbereich. Unter 1200 Pixeln wandert die Konsole unter den Inhalt. Unter 760 Pixeln wird die Seitenleiste durch eine mobile Bottom Navigation ersetzt.

## 4. Wiederverwendbare Komponenten

- `AppShell`: Desktop-Sidebar, Mobile-Bottom-Navigation, Seitenübergänge und Workspace
- `AutomationConsole`: persistente Logausgabe mit INFO-, OK-, HINT- und WARN-Zuständen
- `Card`: normale, interaktive und akzentuierte Glasflächen
- `Button`: Primary-, Secondary-, Ghost- und Danger-Varianten
- `Field`: beschriftete Eingabe mit Icon, Hinweis und optionaler Feldaktion
- `StatusPill`: kompakte Zustandsanzeige
- `Dialog`: zugänglicher, animierter Bestätigungsdialog mit Backdrop

## 5. Zentrale Design-Tokens

Alle wiederkehrenden Werte liegen in `src/styles.css` als Custom Properties:

- Farben: `--background`, `--surface`, `--surface-strong`, `--surface-hover`
- Konturen: `--border`, `--border-strong`
- Primärfarbe: `--primary`, `--primary-strong`, `--primary-soft`, `--primary-fg`
- Text: `--muted`, `--muted-soft`
- Zustände: `--warning`, `--danger`, `--info`
- Radien: `--radius-sm`, `--radius`, `--radius-lg`
- Schatten: `--shadow`

Die visuelle Wirkung der ursprünglichen Tailwind-/Radix-Tokens wurde in zentrale CSS Custom Properties übersetzt. Das reduziert Abhängigkeiten und hält die Grundlage für eine spätere Desktop-Hülle überschaubar.

## 6. Aktueller Funktionsumfang

Die Anwendung verbindet das responsive React-UI über eine abgesicherte Electron-IPC-Brücke mit dem nativen Automatisierungs-Backend. WiiScrubber, Dolphin, `wszst create` und `wszst check` werden real ausgeführt; ihre Ausgabe erscheint live in der automatisch mitscrollenden Konsole.

## 7. Qualitätssicherung

- TypeScript-Prüfung: erfolgreich
- ESLint: erfolgreich, keine Warnungen
- Produktions-Build: erfolgreich
- Desktop-Prüfung bei 1440 × 900: erfolgreich
- Mobile-Prüfung bei 390 × 844: erfolgreich
- Horizontales Seiten-Overflow: keines (`scrollWidth = viewportWidth`)
- Browser-Konsole: keine Warnungen oder Fehler
- Geprüfte Interaktionen: Navigation, Projektformular, Zustandsänderung und Bestätigungsdialog
