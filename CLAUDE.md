# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron desktop app (TypeScript + HTML/CSS) for managing Simionic G1000 custom aircraft profiles on connected iPads via USB. This is a port of the original .NET Windows Forms app from the `Simionic-G1000-CustomProfiles` repository.

The app reads/writes `ACCustom.db` SQLite databases used by the Simionic G1000 iPad apps, and can extract/push those databases to connected iPads over USB.

## Tech Stack

- **Electron** — desktop shell (Chromium + Node.js)
- **TypeScript** — everywhere (main process, preload, renderer)
- **HTML/CSS** — vanilla DOM UI (no framework)
- **sql.js** — pure JavaScript SQLite read/write (no native addons)
- **appium-ios-device** — iPad USB communication (House Arrest + AFC protocols)
- **electron-builder** — packaging and distribution

## Build & Run Commands

```bash
# Install dependencies
npm install

# Compile TypeScript + launch app
npm run dev

# Compile TypeScript only
npm run compile

# Compile + package installer
npm run build
```

## Project Structure

```
src/
├── main/                          # Main process (Node.js)
│   ├── index.ts                   # App lifecycle, window creation
│   ├── ipc-handlers.ts            # All IPC handler registrations
│   ├── updater.ts                 # Version check against g1000profiledb.com
│   ├── store.ts                   # JSON file settings (replaces Windows Registry)
│   ├── declarations.d.ts          # Type declarations for sql.js, appium-ios-device
│   ├── ipad/
│   │   └── device-manager.ts      # List devices, extract/push ACCustom.db
│   └── database/
│       ├── custom-profile-db.ts   # SQLite operations (open, save, import/export)
│       ├── profile-builder.ts     # SQLite rows → Profile object
│       └── aircraft-config-builder.ts  # Profile object → SQLite rows
├── preload/
│   └── index.ts                   # contextBridge exposing typed IPC API
├── renderer/
│   ├── index.html                 # Main window UI
│   ├── styles.css                 # App styles
│   └── renderer.ts                # UI logic, event handlers, DOM manipulation
└── shared/
    └── types.ts                   # Profile, Gauge, GaugeRange, AircraftType, etc.
```

Output compiles to `dist/` with three separate tsconfig files for main, preload, and renderer.

## Architecture Details

### Data Model
`Profile` is the central entity containing 13 typed `Gauge` objects (CHT, EGT, RPM, FuelFlow, etc.), each with 4 colored ranges (`GaugeRange` with `RangeColour`). Profiles have an `AircraftType` enum (Piston, Turboprop, Jet). All types are in `src/shared/types.ts`.

### SQLite Database
The iPad app stores profiles in `ACCustom.db` with two tables: `Aircraft` (ACNum, ACName) and `ConfigItems` (ACNum, ConfigName, ConfigValue). The `profile-builder.ts` reads rows into Profile objects; `aircraft-config-builder.ts` converts back.

### Critical Database Details
1. **Spelling mistakes in DB keys**: `FEDEC` (not FADEC), `ContantSpeed` (not ConstantSpeed) — must match exactly
2. **Gauge prefix asymmetry**: `NG` (uppercase) when reading, `Ng` (lowercase g) when writing
3. **Engine count offset**: DB stores `engineNum` as 0-indexed (engines - 1), Profile stores 1-indexed
4. **Fuel gauge special keys**: `GaugeFuelUnit` and `GaugeFuelQty` are standalone keys (not prefixed)
5. **Backup naming**: `{original}_backup.db` in the same directory

### iPad Communication
Uses `appium-ios-device` to talk to iPads via Apple's usbmuxd service (port 27015). Requires iTunes or Apple Devices app installed. iPad app bundle ID: `com.koalar.CCHW`. File path within VendDocuments container: `/ACCustom.db`.

### IPC Architecture
Main process handles all file I/O, dialogs, and iPad communication. Renderer communicates via `window.api` (exposed through contextBridge in preload). All IPC channels are defined in `ipc-handlers.ts`.

### JSON Compatibility
Profile JSON export must be compatible with the web app at https://g1000profiledb.com. Uses `JSON.stringify(profile, null, 2)` to match .NET's `System.Text.Json` with `WriteIndented: true`.

## Packaging

Windows NSIS installer via `electron-builder`. Config in `electron-builder.yml`.
