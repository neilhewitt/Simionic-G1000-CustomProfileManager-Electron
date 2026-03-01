# Simionic Custom Profile Manager

Desktop app for managing [Simionic G1000](https://g1000profiledb.com) custom aircraft profiles on connected iPads via USB.

This is an Electron/TypeScript port of the original [.NET Windows Forms app](https://github.com/neilhewitt/Simionic-G1000-CustomProfiles). It reads and writes the `ACCustom.db` SQLite database used by the Simionic G1000 iPad apps, and can extract or push that database to a connected iPad over USB.

## Features

- **Open / Save** profile databases from disk
- **Extract / Push** databases directly to a connected iPad via USB
- **Import / Export** individual profiles as JSON (compatible with [g1000profiledb.com](https://g1000profiledb.com))
- **Remove** profiles from a database
- Supports **Piston**, **Turboprop**, and **Jet** aircraft types
- Configures all 13 engine gauges (CHT, EGT, RPM, Fuel Flow, Oil Pressure, etc.) with colored ranges
- V-speeds, trim, flaps, and vacuum/PSI settings

## Prerequisites

- **Node.js** 18+
- **iTunes** or **Apple Devices** app installed (required for iPad USB communication)

## Getting Started

```bash
# Install dependencies
npm install

# Compile TypeScript and launch the app
npm run dev
```

## Build

```bash
# Compile TypeScript only
npm run compile

# Compile and package a Windows installer
npm run build
```

The installer is output to the `release/` directory.

## How It Works

The Simionic G1000 iPad app stores custom aircraft profiles in a SQLite database (`ACCustom.db`) within its app container. This tool communicates with the iPad over USB using Apple's usbmuxd protocol (via [appium-ios-device](https://github.com/nicetester/appium-ios-device)) to extract and push that database. Profiles can also be imported/exported as JSON files for sharing through the [G1000 Profile Database](https://g1000profiledb.com) web app.

SQLite operations use [sql.js](https://github.com/nicetester/sql.js) (a pure-JS build of SQLite compiled to WebAssembly) so there are no native compilation dependencies.

## License

MIT
