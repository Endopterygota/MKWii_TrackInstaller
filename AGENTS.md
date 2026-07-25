# MKWii Track Installer — Agent Instructions

## Stack overview

Windows-only Electron desktop app. Three layers:
- **`src/`** — React 19 + TypeScript (Vite). UI entrypoint: `src/main.tsx` → `App.tsx`.
- **`electron/`** — CommonJS (`.cjs`). Main process: `electron/main.cjs`. IPC exposed via `preload.cjs` as `window.mkwii`.
- **`native/`** — Single C# source file (`TrackInstallerBackend.cs`) compiled to `native/bin/MKWiiBackend.exe` by a PowerShell script using the .NET Framework's `csc.exe` (NOT the modern `dotnet` CLI).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server in browser (no Electron, no native backend) |
| `npm run desktop` | Full stack: compile C# → Vite build → launch Electron |
| `npm run build:exe` | Build native + Vite then package portable EXE into `release/` |
| `npm run typecheck` | `tsc --noEmit` over `src/` only |
| `npm run lint` | ESLint on `src/` with `--max-warnings=0` |
| `npm run test:szs-diff` | Node built-in test runner on `tests/szs-diff.test.cjs` |

Always verify in order if unsure: **lint → typecheck → test**.

## Build order matters

`npm run desktop` and `npm run build:exe` both enforce the pipeline:
```
build:native  →  build (tsc -b + vite)  →  electron / electron-builder
```
Never skip `build:native`. The Electron main process looks for `MKWiiBackend.exe` at runtime.

## Native backend quirks

- Compiled by `scripts/build-native.ps1` using the legacy .NET Framework `csc.exe`. Requires a 64-bit .NET Framework install on Windows (searches `%WINDIR%\Microsoft.NET\Framework64\`).
- Output is always `native/bin/MKWiiBackend.exe` (gitignored).
- The backend communicates with Electron via environment variables (`MKWII_*`) and tab-delimited log lines prefixed with `MKWII_LOG\tLevel\t<base64 text>`.

## Architecture pointers

- `startAutomation()` in `electron/main.cjs` spawns the native backend via `child_process.spawn`. All seven automation commands flow through here.
- IPC channels and shared types are defined in `src/electron.d.ts`. The preload exposes exactly the methods listed there under `window.mkwii`.
- App state is spread across React `useState` hooks in `App.tsx`. No external state management library.
- Config persists to `%APPDATA%/mkwiitrackinstaller/settings.json` (Electron's `app.getPath("userData")`).

## Module systems

The repo uses **both** ESM and CommonJS side-by-side:
- `package.json` sets `"type": "module"`. Everything in `src/`, config files, and Vite are ESM.
- Electron main/preload and test helpers are explicitly `.cjs`.

## Testing

Single test file: `tests/szs-diff.test.cjs`. Uses Node's native `node:test` runner (no framework installed). Tests the SZS archive diff parser inside `electron/szs-diff.cjs`.

## Generated output

`native/bin/`, `dist/`, and `release/` are generated artifacts. Do not edit files inside them directly — they are overwritten on every build.

## ISO and filesystem safety

- Never modify a backup ISO. Only modify the explicitly selected test ISO.
- Never commit ISO, WBFS, SZS, extracted game files, or user-specific paths.
- Quote Windows paths when passing them to external processes.
- Validate external command exit codes and check stderr before proceeding.
- Tests must never use the user's real ISO or touch production data.

## Page/routes

No router. Five pages rendered conditionally in `App.tsx`:
- `OverviewPage`, `ProjectPage`, `ToolsPage`, `WiiScrubberPage`, `SettingsPage`
