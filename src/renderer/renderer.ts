declare global {
  interface Window {
    api: {
      openDatabase(): Promise<{ profiles: string[]; path: string } | null>;
      saveDatabase(): Promise<void>;
      importProfiles(): Promise<{ profiles: string[]; importedNames: string[] } | null>;
      exportProfiles(indices: number[]): Promise<{ exportedNames: string[] } | null>;
      removeProfiles(indices: number[]): Promise<{ profiles: string[] } | null>;
      listDevices(): Promise<string[]>;
      extractFromiPad(deviceName: string): Promise<{ profiles: string[]; path: string; deviceName: string } | null>;
      pushToiPad(deviceName: string): Promise<{ success: boolean } | void>;
      showMessage(message: string, title: string, buttons?: string[]): Promise<number>;
    };
  }
}

const NO_PROFILE_MSG = '-- This database has no profiles --';

// DOM elements
const btnOpen = document.getElementById('btn-open') as HTMLButtonElement;
const btnExtract = document.getElementById('btn-extract') as HTMLButtonElement;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
const btnPush = document.getElementById('btn-push') as HTMLButtonElement;
const btnExport = document.getElementById('btn-export') as HTMLButtonElement;
const btnRemove = document.getElementById('btn-remove') as HTMLButtonElement;
const btnImport = document.getElementById('btn-import') as HTMLButtonElement;
const suppressAlerts = document.getElementById('suppress-alerts') as HTMLInputElement;
const profileList = document.getElementById('profile-list') as HTMLSelectElement;
const iPadNameEl = document.getElementById('ipad-name') as HTMLSpanElement;
const iPadStatusEl = document.getElementById('ipad-status') as HTMLSpanElement;

// Device picker dialog
const deviceDialog = document.getElementById('device-dialog') as HTMLDialogElement;
const deviceList = document.getElementById('device-list') as HTMLSelectElement;
const dialogExtractBtn = document.getElementById('dialog-extract') as HTMLButtonElement;
const dialogCancelBtn = document.getElementById('dialog-cancel') as HTMLButtonElement;

// State
let dbLoaded = false;
let connectedDeviceName: string | null = null;
let removedLastProfile = false;

function showAlerts(): boolean {
  return !suppressAlerts.checked;
}

function updateProfileList(profiles: string[]): void {
  profileList.innerHTML = '';

  if (profiles.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = NO_PROFILE_MSG;
    opt.disabled = true;
    profileList.appendChild(opt);
    profileList.disabled = true;
    if (!removedLastProfile) btnSave.disabled = true;
  } else {
    for (const name of profiles) {
      const opt = document.createElement('option');
      opt.textContent = name;
      opt.value = name;
      profileList.appendChild(opt);
    }
    profileList.disabled = false;
    btnSave.disabled = false;
  }

  btnExport.disabled = true;
  btnRemove.disabled = true;
}

function getSelectedIndices(): number[] {
  const indices: number[] = [];
  for (let i = 0; i < profileList.options.length; i++) {
    if (profileList.options[i].selected) {
      indices.push(i);
    }
  }
  return indices;
}

function setDbLoaded(): void {
  dbLoaded = true;
  btnImport.disabled = false;
  btnOpen.disabled = true;
  btnExtract.disabled = true;
}

// Event handlers

profileList.addEventListener('change', () => {
  const selected = getSelectedIndices();
  btnExport.disabled = selected.length === 0;
  btnRemove.disabled = selected.length === 0;
});

btnOpen.addEventListener('click', async () => {
  const result = await window.api.openDatabase();
  if (result) {
    setDbLoaded();
    updateProfileList(result.profiles);
  }
});

btnExtract.addEventListener('click', async () => {
  // Show device picker
  deviceList.innerHTML = '';
  dialogExtractBtn.disabled = true;

  const devices = await window.api.listDevices();
  if (devices.length === 0) {
    await window.api.showMessage(
      'No devices found. Make sure your iPad is connected and iTunes/Apple Devices is installed.',
      'No devices'
    );
    return;
  }

  for (const name of devices) {
    const opt = document.createElement('option');
    opt.textContent = name;
    opt.value = name;
    deviceList.appendChild(opt);
  }

  deviceDialog.showModal();
});

deviceList.addEventListener('change', () => {
  dialogExtractBtn.disabled = deviceList.selectedIndex < 0;
});

dialogExtractBtn.addEventListener('click', async () => {
  let deviceName: string;
  if (deviceList.selectedIndex < 0 && deviceList.options.length === 1) {
    deviceList.selectedIndex = 0;
  }
  if (deviceList.selectedIndex < 0) {
    await window.api.showMessage('Please select a device from the list and try again.', 'Select device');
    return;
  }

  deviceName = deviceList.options[deviceList.selectedIndex].value;
  deviceDialog.close();

  const result = await window.api.extractFromiPad(deviceName);
  if (result) {
    setDbLoaded();
    updateProfileList(result.profiles);
    connectedDeviceName = result.deviceName;
    iPadNameEl.textContent = connectedDeviceName;
    iPadStatusEl.textContent = 'Connected';
    iPadStatusEl.classList.add('connected');
    btnPush.disabled = false;
    btnExtract.disabled = true;
    btnOpen.disabled = true;
  }
});

dialogCancelBtn.addEventListener('click', () => {
  deviceDialog.close();
});

btnSave.addEventListener('click', async () => {
  if (showAlerts()) {
    const response = await window.api.showMessage(
      'This will save your changes to the database. This action cannot be undone. Are you sure?',
      'Warning',
      ['Yes', 'No']
    );
    if (response !== 0) return;
  }

  btnSave.disabled = true;
  btnSave.textContent = 'Saving...';
  await window.api.saveDatabase();
  btnSave.textContent = 'Save to disk';
  if (!removedLastProfile) btnSave.disabled = false;
  removedLastProfile = false;

  if (showAlerts()) {
    await window.api.showMessage('Changes saved to database.', 'Saved');
  }
});

btnPush.addEventListener('click', async () => {
  if (!connectedDeviceName) return;

  if (showAlerts()) {
    const response = await window.api.showMessage(
      `This will save your changes, and push the resulting database file back to '${connectedDeviceName}'. ` +
      'This will overwrite the existing database. A backup of your existing database will be created. Are you sure you want to do this?',
      'Push to iPad',
      ['Yes', 'No']
    );
    if (response !== 0) return;
  }

  const result = await window.api.pushToiPad(connectedDeviceName);
  if (result && 'success' in result && result.success) {
    if (showAlerts()) {
      await window.api.showMessage(
        `Successfully pushed the database to ${connectedDeviceName}.`,
        'Success'
      );
    }
  }
});

btnExport.addEventListener('click', async () => {
  const indices = getSelectedIndices();
  if (indices.length === 0) return;

  btnExport.disabled = true;
  btnExport.textContent = 'Exporting...';
  const result = await window.api.exportProfiles(indices);
  btnExport.textContent = 'Export selected';
  btnExport.disabled = false;

  if (result && showAlerts()) {
    let message = `Exported ${result.exportedNames.length} profiles. Each profile has been saved as a JSON file which can be imported into another database, or uploaded to the\nG1000 Profile Database (https://g1000profiledb.com).\n`;
    for (const name of result.exportedNames) {
      message += `\n\t${name}`;
    }
    await window.api.showMessage(message, 'Export complete');
  }
});

btnRemove.addEventListener('click', async () => {
  const indices = getSelectedIndices();
  if (indices.length === 0) return;

  if (showAlerts()) {
    const response = await window.api.showMessage(
      "This will remove the selected profiles from the database. Are you sure?\n\n(Changes don't take final effect until you click 'Save changes'.)",
      'Warning',
      ['Yes', 'No']
    );
    if (response !== 0) return;
  }

  const result = await window.api.removeProfiles(indices);
  if (result) {
    if (result.profiles.length === 0) removedLastProfile = true;
    updateProfileList(result.profiles);
  }
});

btnImport.addEventListener('click', async () => {
  const result = await window.api.importProfiles();
  if (result) {
    updateProfileList(result.profiles);

    if (showAlerts()) {
      const plural = result.importedNames.length > 1 ? 's' : '';
      await window.api.showMessage(
        `Added profile${plural} '${result.importedNames.join(', ')}'.\n\nNote that these will not be written to the custom profile database until you click 'Save changes', and if you exit the program without doing so, these changes will be lost.`,
        'Profile imported'
      );
    }
  }
});

export {};
