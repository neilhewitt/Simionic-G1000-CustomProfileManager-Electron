import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { Profile, AircraftConfig, ConfigItem } from '../../shared/types';
import { buildProfile } from './profile-builder';
import { buildAircraftConfig } from './aircraft-config-builder';

function escapeSQL(value: string): string {
  return value.replace(/'/g, "''");
}

let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;

async function getSqlJs(): Promise<typeof SQL> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

export class CustomProfileDB {
  private _profiles: Profile[] = [];
  private _aircraft: AircraftConfig[] = [];
  private _configsByProfile: Map<Profile, AircraftConfig> = new Map();
  private _removed: { aircraftId: number; profile: Profile }[] = [];
  private _maxId: number = 0;
  private _newId: number = 0;
  private _dbPath: string;

  get databasePath(): string {
    return this._dbPath;
  }

  get profiles(): Profile[] {
    return this._profiles;
  }

  private constructor(filePath: string) {
    this._dbPath = filePath;
  }

  static async open(filePath: string): Promise<CustomProfileDB> {
    if (!fs.existsSync(filePath)) {
      throw new Error('Path not found.');
    }
    const instance = new CustomProfileDB(filePath);
    await instance.load();
    return instance;
  }

  private async load(): Promise<void> {
    const sqlJs = await getSqlJs();
    const buffer = fs.readFileSync(this._dbPath);
    const db = new sqlJs!.Database(buffer);

    try {
      const configItems: ConfigItem[] = [];
      const configResults = db.exec('SELECT ACNum, ConfigName, ConfigValue FROM ConfigItems');
      if (configResults.length > 0) {
        for (const row of configResults[0].values) {
          configItems.push({
            AircraftId: row[0] as number,
            Name: row[1] as string,
            Value: row[2] as string | number | null,
          });
        }
      }

      const aircraftResults = db.exec('SELECT ACNum, ACName FROM Aircraft');
      if (aircraftResults.length > 0) {
        for (const row of aircraftResults[0].values) {
          const id = row[0] as number;
          const name = row[1] as string;
          this._aircraft.push({
            Id: id,
            Name: name,
            ConfigItems: configItems.filter(x => x.AircraftId === id),
          });
        }
      }
    } finally {
      db.close();
    }

    this._maxId = this._aircraft.length > 0
      ? Math.max(...this._aircraft.map(x => x.Id))
      : 0;
    this._newId = this._maxId + 1;

    for (const aircraft of this._aircraft) {
      const profile = buildProfile(aircraft);
      this._configsByProfile.set(profile, aircraft);
      this._profiles.push(profile);
    }
  }

  addProfile(profile?: Profile): void {
    if (!profile) {
      profile = { Name: 'New Profile' } as Profile;
    }
    const config = buildAircraftConfig(profile, this._newId++);
    this._aircraft.push(config);
    this._profiles.push(profile);
    this._configsByProfile.set(profile, config);
  }

  removeProfile(profile: Profile): void {
    const config = this._configsByProfile.get(profile);
    if (!config) return;
    const id = config.Id;
    this._removed.push({ aircraftId: id, profile });
    this._configsByProfile.delete(profile);
    const idx = this._profiles.indexOf(profile);
    if (idx >= 0) this._profiles.splice(idx, 1);
    if (this._maxId === id && this._configsByProfile.size > 0) {
      this._maxId = Math.max(...Array.from(this._configsByProfile.values()).map(c => c.Id));
    }
  }

  fileIsValid(jsonPath: string): boolean {
    if (!fs.existsSync(jsonPath)) return false;
    try {
      const json = fs.readFileSync(jsonPath, 'utf-8');
      JSON.parse(json) as Profile;
      return true;
    } catch {
      return false;
    }
  }

  importProfileFromJson(jsonPath: string): Profile {
    if (!fs.existsSync(jsonPath)) {
      throw new Error('Invalid path.');
    }
    const json = fs.readFileSync(jsonPath, 'utf-8');
    const profile = JSON.parse(json) as Profile;
    this.addProfile(profile);
    return profile;
  }

  saveAllAsJson(folderPath: string): void {
    if (!fs.existsSync(folderPath)) return;
    for (const profile of this._profiles) {
      const json = JSON.stringify(profile, null, 2);
      const fileName = profile.Name.replace(/ /g, '-') + '.json';
      fs.writeFileSync(path.join(folderPath, fileName), json, 'utf-8');
    }
  }

  saveProfileAsJson(profile: Profile, folderPath: string): void {
    if (!fs.existsSync(folderPath)) return;
    const json = JSON.stringify(profile, null, 2);
    const fileName = profile.Name.replace(/ /g, '-') + '.json';
    fs.writeFileSync(path.join(folderPath, fileName), json, 'utf-8');
  }

  async saveToDatabase(): Promise<Buffer> {
    // make a backup first
    const backupFolder = path.dirname(this._dbPath);
    const backupFilename = `${path.parse(this._dbPath).name}_backup.db`;
    fs.copyFileSync(this._dbPath, path.join(backupFolder, backupFilename));

    const sqlJs = await getSqlJs();
    const buffer = fs.readFileSync(this._dbPath);
    const db = new sqlJs!.Database(buffer);

    try {
      for (const profile of this._profiles) {
        const existingConfig = this._configsByProfile.get(profile);
        if (!existingConfig) continue;
        const aircraftId = existingConfig.Id;

        if (aircraftId > this._maxId) {
          // new profile — INSERT
          db.run('INSERT INTO Aircraft (ACNum, ACName) VALUES (?, ?)', [aircraftId, profile.Name]);
          this._maxId = aircraftId;

          const config = buildAircraftConfig(profile, aircraftId);
          for (const item of config.ConfigItems) {
            db.run(
              'INSERT INTO ConfigItems (ACNum, ConfigName, ConfigValue) VALUES (?, ?, ?)',
              [item.AircraftId, item.Name, String(item.Value ?? '')]
            );
          }
        }
      }

      // delete removed profiles
      for (const removed of this._removed) {
        db.run('DELETE FROM ConfigItems WHERE ACNum = ?', [removed.aircraftId]);
        db.run('DELETE FROM Aircraft WHERE ACNum = ?', [removed.aircraftId]);
      }

      // Export the modified database back to file
      const data = db.export();
      const nodeBuffer = Buffer.from(data);
      fs.writeFileSync(this._dbPath, nodeBuffer);
      return nodeBuffer;
    } finally {
      db.close();
    }
  }
}
