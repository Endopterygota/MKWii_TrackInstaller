# MKWii Track Installer

Desktop application for creating, validating, installing, and testing custom Mario Kart Wii tracks. Built with Electron + React (TypeScript) and a native C# automation backend.

![version](https://img.shields.io/badge/version-0.10.1-blue) ![platform](https://img.shields.io/badge/platform-Windows%20only-red)

## Features

- **Project management** — auto-detects track file folders and SZS archives from your project directory
- **SZS tools** — run `wszst create` and `wszst check` in the background with a live color-coded console
- **SZS content diff** — compare newly built archives against the previous version, showing added, modified, and removed files
- **One-click install & launch** — inject tracks into a WIT test ISO and start Dolphin automatically
- **Dual language** — full German and English UI support
- **Portable distribution** — self-contained EXE with no installation required

## Requirements

| Tool | Purpose |
|---|---|
| [MKWii original ISO](https://www.wiimm.fi/wiki/Mario_Kart_WII) | Source game data |
| [Wiimm's SZS Tools (wszst)](https://code.google.com/archive/p/wiimm-szs-tools/) | Create and validate track archives |
| [Wiimm's ISO Tools (WIT)](https://code.google.com/archive/p/wii-iso-tools/) | Modify the test ISO |
| [Dolphin](https://dolphin-emu.org/) | Emulator for testing tracks |

## Quick start

Download the portable EXE from the `release/` folder, run it, and configure your tool paths in Settings. No installation or dependencies needed.

## Development

```bash
npm install

# Verify code quality (lint → typecheck)
npm run lint
npm run typecheck

# Run tests
npm run test:szs-diff

# Vite dev server (browser, no Electron)
npm run dev

# Full stack: compile C# backend → build → launch Electron
npm run desktop

# Build portable Windows EXE into release/
npm run build:exe
```

## Architecture

Three layers communicating via IPC and environment variables:

| Layer | Tech | Entry point |
|---|---|---|
| **UI** | React 19 + TypeScript (Vite, ESM) | `src/main.tsx` → `App.tsx` |
| **Electron main** | CommonJS (`.cjs`) | `electron/main.cjs` |
| **Native backend** | C# (.NET Framework WinForms) | `native/TrackInstallerBackend.cs` → `MKWiiBackend.exe` |

### Automation pipeline

The native backend handles GUI automation for external tools. It communicates with Electron via environment variables (`MKWII_*`) and tab-delimited log lines prefixed with `MKWII_LOG\t<level>\t<base64 text>`.

Seven automation commands flow through `startAutomation()` in the main process:

| Command | Pipeline |
|---|---|
| `install` | WIT → swap SZS into test ISO |
| `install-play` | WIT → Dolphin |
| `build-wit-install-play` | wszst create → WIT → Dolphin |
| `wszst-create` | wszst create (with content diff) |
| `wszst-check` | wszst check |
| `wit-install` | WIT install only |
| `wit-install-play` | WIT install → Dolphin |

### Pages

No router — five conditionally rendered pages in `App.tsx`:

- **Overview** — project health, ISO status, quick install actions
- **Track Project** — project folder analysis, SZS selection, structure generator
- **Tools** — wszst create/check, SZS content diff viewer
- **Settings** — language, tool paths, run controls (pause/stop)
- **Legacy** — deprecated WiiScrubber bridge

## Build pipeline

```
scripts/build-native.ps1  →  native/bin/MKWiiBackend.exe
tsc -b + vite build       →  dist/
electron-builder          →  release/*.exe
```

The C# backend is compiled via `csc.exe` from the .NET Framework (not the modern `dotnet` CLI). The portable EXE bundles Electron, the UI, and the native backend into a single file.

## Safety notes

- Never modify your backup ISO — only the designated test ISO is modified
- Original ISO and WIT test ISO may reside in any accessible folder
- Config persists to `%APPDATA%/mkwiitrackinstaller/settings.json`
