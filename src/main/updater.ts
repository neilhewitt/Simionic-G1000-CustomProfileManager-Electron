import { dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { setLastCheckForUpdate } from './store';

const APP_VERSION = '1.0.5';
const VERSION_URL = 'https://g1000profiledb.com/files/simionic-custom-profile-manager-version.txt';

export async function checkForNewVersion(mainWindow: BrowserWindow): Promise<void> {
  try {
    const response = await fetch(VERSION_URL);
    if (!response.ok) return;

    const version = (await response.text()).trim();
    const releaseVersionNumber = parseInt(version.replace(/\./g, ''), 10);
    const thisVersionNumber = parseInt(APP_VERSION.replace(/\./g, ''), 10);

    if (releaseVersionNumber > thisVersionNumber) {
      const { response: buttonIndex } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'New version available',
        message: `A new version ${version} is available. Download it?\n\nIf you say 'no' the application will ask again after 7 days.`,
        buttons: ['Yes', 'No', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
      });

      if (buttonIndex === 0) {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
          title: 'Select download folder',
          properties: ['openDirectory'],
        });

        if (filePaths.length > 0) {
          const folderPath = filePaths[0];
          try {
            const fileName = `SimionicCustomProfileManager-${version}.zip`;
            const downloadResponse = await fetch(`https://g1000profiledb.com/files/${fileName}`);
            if (!downloadResponse.ok) throw new Error('Download failed');
            const data = Buffer.from(await downloadResponse.arrayBuffer());
            fs.writeFileSync(path.join(folderPath, fileName), data);

            await dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Downloaded',
              message: 'Downloaded new version installer ZIP file. This application will now close. Please un-install the current version from Add/Remove Programs before installing the new version.',
            });

            mainWindow.close();
          } catch {
            await dialog.showMessageBox(mainWindow, {
              type: 'error',
              title: 'Error',
              message: 'Could not download the file. An unexpected error occurred. Check https://g1000profiledb.com/downloads for manual download.',
            });
          }
        }
      }
    }
  } catch {
    // ignore — site may be unavailable or retired
  }

  setLastCheckForUpdate(new Date());
}
