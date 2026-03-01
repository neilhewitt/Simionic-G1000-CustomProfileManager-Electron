import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { CustomProfileDB } from './database/custom-profile-db';
import { listDevices, extractDatabase, pushDatabase } from './ipad/device-manager';
import { getLastFolderPath, setLastFolderPath } from './store';

let profileDB: CustomProfileDB | null = null;

function getMainWindow(): BrowserWindow {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) throw new Error('No main window');
  return win;
}

function profileNames(): string[] {
  if (!profileDB) return [];
  return profileDB.profiles
    .slice()
    .sort((a, b) => a.Name.localeCompare(b.Name))
    .map(p => p.Name);
}

export function registerIpcHandlers(): void {
  ipcMain.handle('dialog:open-database', async () => {
    const win = getMainWindow();
    const { filePaths } = await dialog.showOpenDialog(win, {
      title: 'Open database',
      defaultPath: getLastFolderPath() || undefined,
      filters: [{ name: 'Sqlite DB files', extensions: ['db'] }],
      properties: ['openFile'],
    });

    if (filePaths.length === 0) return null;

    const filePath = filePaths[0];
    setLastFolderPath(path.dirname(filePath));

    try {
      profileDB = await CustomProfileDB.open(filePath);
      return { profiles: profileNames(), path: filePath };
    } catch (err: any) {
      await dialog.showMessageBox(win, {
        type: 'error',
        title: 'Error',
        message: `An unexpected error occurred reading the database file. Please check the file and try again. Error details:\n\n${err.message}`,
      });
      return null;
    }
  });

  ipcMain.handle('db:save', async () => {
    if (!profileDB) return;
    await profileDB.saveToDatabase();
  });

  ipcMain.handle('db:import-profiles', async () => {
    if (!profileDB) return null;
    const win = getMainWindow();
    const { filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import profiles',
      defaultPath: getLastFolderPath() || undefined,
      filters: [{ name: 'JSON files', extensions: ['json'] }],
      properties: ['openFile', 'multiSelections'],
    });

    if (filePaths.length === 0) return null;
    setLastFolderPath(path.dirname(filePaths[0]));

    // Validate all files first
    for (const filePath of filePaths) {
      if (!profileDB.fileIsValid(filePath)) {
        await dialog.showMessageBox(win, {
          type: 'error',
          title: 'Error',
          message: `An unexpected error occurred parsing the file '${path.basename(filePath)}'. All imports cancelled. Please check the file and try again.`,
        });
        return null;
      }
    }

    const importedNames: string[] = [];
    for (const filePath of filePaths) {
      try {
        const profile = profileDB.importProfileFromJson(filePath);
        importedNames.push(profile.Name);
      } catch {
        await dialog.showMessageBox(win, {
          type: 'error',
          title: 'Error',
          message: `An unexpected error occurred reading the file '${path.basename(filePath)}'. Please check the file and try again.`,
        });
      }
    }

    return { profiles: profileNames(), importedNames };
  });

  ipcMain.handle('db:export-profiles', async (_event, indices: number[]) => {
    if (!profileDB) return;
    const win = getMainWindow();

    const { filePaths } = await dialog.showOpenDialog(win, {
      title: 'Select export folder',
      defaultPath: getLastFolderPath() || undefined,
      properties: ['openDirectory'],
    });
    if (filePaths.length === 0) return null;

    const folderPath = filePaths[0];
    setLastFolderPath(folderPath);

    const sorted = profileDB.profiles.slice().sort((a, b) => a.Name.localeCompare(b.Name));
    const exportedNames: string[] = [];
    for (const idx of indices) {
      if (idx >= 0 && idx < sorted.length) {
        profileDB.saveProfileAsJson(sorted[idx], folderPath);
        exportedNames.push(sorted[idx].Name);
      }
    }

    return { exportedNames };
  });

  ipcMain.handle('db:remove-profiles', async (_event, indices: number[]) => {
    if (!profileDB) return null;

    const sorted = profileDB.profiles.slice().sort((a, b) => a.Name.localeCompare(b.Name));
    // Remove in reverse order to keep indices valid
    const toRemove = indices
      .filter(idx => idx >= 0 && idx < sorted.length)
      .sort((a, b) => b - a);
    for (const idx of toRemove) {
      profileDB.removeProfile(sorted[idx]);
    }

    return { profiles: profileNames() };
  });

  ipcMain.handle('ipad:list-devices', async () => {
    try {
      const devices = await listDevices();
      return devices.map(d => d.name);
    } catch {
      return [];
    }
  });

  ipcMain.handle('ipad:extract-database', async (_event, deviceName: string) => {
    const win = getMainWindow();

    try {
      const devices = await listDevices();
      const device = devices.find(d => d.name.toLowerCase() === deviceName.toLowerCase());
      if (!device) throw new Error('Device not found');

      await dialog.showMessageBox(win, {
        type: 'info',
        title: 'Extracting database',
        message: `Will extract database from ${deviceName}. Next, select a location to save the extracted file to.`,
      });

      const { filePaths } = await dialog.showOpenDialog(win, {
        title: 'Select save folder',
        properties: ['openDirectory'],
      });
      if (filePaths.length === 0) return null;

      const folderPath = filePaths[0];
      const buffer = await extractDatabase(device.udid);
      const savePath = path.join(folderPath, 'ACCustom.db');
      fs.writeFileSync(savePath, buffer);

      profileDB = await CustomProfileDB.open(savePath);
      return { profiles: profileNames(), path: savePath, deviceName };
    } catch (err: any) {
      await dialog.showMessageBox(win, {
        type: 'error',
        title: 'Error',
        message: `Could not extract the database from the device. Error: ${err.message}`,
      });
      return null;
    }
  });

  ipcMain.handle('ipad:push-database', async (_event, deviceName: string) => {
    if (!profileDB) return;
    const win = getMainWindow();

    try {
      const devices = await listDevices();
      const device = devices.find(d => d.name.toLowerCase() === deviceName.toLowerCase());
      if (!device) throw new Error('Device not found');

      const data = await profileDB.saveToDatabase();
      await pushDatabase(device.udid, data);

      return { success: true };
    } catch (err: any) {
      await dialog.showMessageBox(win, {
        type: 'error',
        title: 'Push to iPad failed',
        message: 'An unexpected error occurred. Is your iPad still connected?',
      });
      return { success: false };
    }
  });

  ipcMain.handle('dialog:show-message', async (_event, message: string, title: string, buttons?: string[]) => {
    const win = getMainWindow();
    const result = await dialog.showMessageBox(win, {
      type: 'info',
      title,
      message,
      buttons: buttons || ['OK'],
    });
    return result.response;
  });
}
