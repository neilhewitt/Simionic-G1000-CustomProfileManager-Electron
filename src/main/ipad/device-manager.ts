/**
 * iPad USB communication using appium-ios-device.
 * Port of iPadFileManager.cs and iPadBrowser.cs.
 *
 * Uses House Arrest + AFC services to read/write files in the
 * Simionic app's Documents folder on connected iPads.
 *
 * Prerequisite: iTunes or Apple Devices app must be installed
 * (provides usbmuxd service on port 27015).
 */

const SIMIONIC_BUNDLE_ID = 'com.koalar.CCHW';
const DB_FILENAME = '/ACCustom.db';

export interface DeviceInfo {
  udid: string;
  name: string;
}

export async function listDevices(): Promise<DeviceInfo[]> {
  // Dynamic import — appium-ios-device is ESM-only in recent versions
  const { Usbmux } = await import('appium-ios-device');
  const usbmux = new Usbmux();
  const devices: DeviceInfo[] = [];

  try {
    const deviceList: string[] = await usbmux.listDevices();
    if (!deviceList || deviceList.length === 0) return devices;

    for (const udid of deviceList) {
      try {
        const lockdown = await usbmux.connectLockdown(udid);
        const name: string = await lockdown.getValue({ key: 'DeviceName' }) || udid;
        devices.push({ udid, name });
      } catch {
        // device may not be paired — skip
        devices.push({ udid, name: udid });
      }
    }
  } catch {
    // No devices connected — this is fine
  }

  return devices;
}

export async function extractDatabase(udid: string): Promise<Buffer> {
  const { Usbmux, services } = await import('appium-ios-device');
  const usbmux = new Usbmux();

  const afcService = await services.startHouseArrestService(udid, {
    bundleId: SIMIONIC_BUNDLE_ID,
    command: 'VendDocuments',
  });

  try {
    const data = await afcService.pullFile(DB_FILENAME);
    return Buffer.from(data);
  } finally {
    afcService.close();
  }
}

export async function pushDatabase(udid: string, data: Buffer): Promise<void> {
  const { Usbmux, services } = await import('appium-ios-device');
  const usbmux = new Usbmux();

  const afcService = await services.startHouseArrestService(udid, {
    bundleId: SIMIONIC_BUNDLE_ID,
    command: 'VendDocuments',
  });

  try {
    await afcService.pushFile(data, DB_FILENAME);
  } finally {
    afcService.close();
  }
}
