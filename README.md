# MKWii Track Installer

MKWii Track Installer is a Windows desktop application for creating, checking, installing, and testing Mario Kart Wii custom tracks. It combines a React/Electron interface with a native C# automation backend.

Die Designanalyse und Übertragung auf die MKWii-Informationsarchitektur stehen in [`LOVABLE_ANALYSE.md`](./LOVABLE_ANALYSE.md).

## Preserved design patterns

- Responsive application shell with desktop side navigation and mobile bottom navigation
- Central semantic design tokens for color, type, radius, borders, shadows, and state colors
- Dark animated veil background and translucent liquid-glass surfaces
- Large page headings, uppercase eyebrow labels, status pills, stat cards, action cards, and navigation tiles
- Framer Motion page transitions, card lift, button press feedback, and modal transitions
- Reusable cards, buttons, fields, status pills, and dialogs
- Desktop-first split layout with a persistent automation console
- Responsive collapse to one column below 1200px and mobile navigation below 760px
- Reduced-motion support

## Removed Expense It concerns

- Expense, receipt, reimbursement, approval, trip, finance, policy, report, and AI-assistant routes
- Supabase schemas, server functions, queries, realtime subscriptions, and storage
- Email/password and Google authentication
- Employee, manager, finance, and administrator personas
- Receipt upload, camera, OCR, currency, and CSV logic

## MKWii information architecture

- **Overview** — project health, ISO target, quick install actions
- **Track project** — project folder, content-detected track-files folder, SZS dropdown, folder-structure generator, WiiScrubber, and ISO target file
- **SZS tools** — background `wszst create` and `wszst check` surfaces
- **Settings** — freely selectable original/test ISO paths, language, Dolphin, WIT, and run controls
- **Automation console** — persistent, color-coded process output

The UI is connected to the native automation backend for WiiScrubber, Dolphin, `wszst create`, and `wszst check`. Process output is streamed into the console automatically.

## Windows EXE

Die Oberfläche kann als portable Windows-EXE ohne separaten Browser gestartet werden. Die fertige Datei liegt nach dem Build unter:

```text
release/MKWii-Track-Installer-0.6.0-portable.exe
```

Die EXE enthält die benötigte Electron-Laufzeit und das native Automatisierungs-Backend. Eine Installation ist nicht erforderlich. Original-ISO und WIT-Test-ISO dürfen in jedem erreichbaren Ordner liegen. WiiScrubber, Dolphin, Wiimms ISO Tools und Wiimms SZS Tools werden über die in der App gewählten lokalen Pfade beziehungsweise den Windows-PATH verwendet.

## Development

```bash
npm install
npm run typecheck
npm run lint
npm run test:szs-diff
npm run build
npm run dev
npm run desktop
npm run build:exe
```
