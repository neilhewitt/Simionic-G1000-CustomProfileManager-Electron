import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface StoreData {
  lastFolderPath: string | null;
  lastCheckForUpdate: string | null;
}

const DEFAULTS: StoreData = {
  lastFolderPath: null,
  lastCheckForUpdate: null,
};

function getStorePath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readStore(): StoreData {
  try {
    const raw = fs.readFileSync(getStorePath(), 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeStore(data: StoreData): void {
  const dir = path.dirname(getStorePath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getStorePath(), JSON.stringify(data, null, 2), 'utf-8');
}

export function getLastFolderPath(): string | null {
  return readStore().lastFolderPath;
}

export function setLastFolderPath(value: string): void {
  const data = readStore();
  data.lastFolderPath = value;
  writeStore(data);
}

export function getLastCheckForUpdate(): Date | null {
  const val = readStore().lastCheckForUpdate;
  return val ? new Date(val) : null;
}

export function setLastCheckForUpdate(value: Date): void {
  const data = readStore();
  data.lastCheckForUpdate = value.toISOString();
  writeStore(data);
}
