import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { checkForNewVersion } from './updater';

const APP_VERSION = '1.0.5';

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 860,
    height: 480,
    resizable: false,
    title: `Simionic Custom Profile Manager ${APP_VERSION}`,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, '..', '..', '..', 'src', 'renderer', 'index.html'));

  return mainWindow;
}

app.whenReady().then(() => {
  registerIpcHandlers();
  const mainWindow = createWindow();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    checkForNewVersion(mainWindow);
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
