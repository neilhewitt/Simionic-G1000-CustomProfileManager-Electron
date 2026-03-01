import { contextBridge, ipcRenderer } from 'electron';

const api = {
  openDatabase(): Promise<{ profiles: string[]; path: string } | null> {
    return ipcRenderer.invoke('dialog:open-database');
  },

  saveDatabase(): Promise<void> {
    return ipcRenderer.invoke('db:save');
  },

  importProfiles(): Promise<{ profiles: string[]; importedNames: string[] } | null> {
    return ipcRenderer.invoke('db:import-profiles');
  },

  exportProfiles(indices: number[]): Promise<{ exportedNames: string[] } | null> {
    return ipcRenderer.invoke('db:export-profiles', indices);
  },

  removeProfiles(indices: number[]): Promise<{ profiles: string[] } | null> {
    return ipcRenderer.invoke('db:remove-profiles', indices);
  },

  listDevices(): Promise<string[]> {
    return ipcRenderer.invoke('ipad:list-devices');
  },

  extractFromiPad(deviceName: string): Promise<{ profiles: string[]; path: string; deviceName: string } | null> {
    return ipcRenderer.invoke('ipad:extract-database', deviceName);
  },

  pushToiPad(deviceName: string): Promise<{ success: boolean } | void> {
    return ipcRenderer.invoke('ipad:push-database', deviceName);
  },

  showMessage(message: string, title: string, buttons?: string[]): Promise<number> {
    return ipcRenderer.invoke('dialog:show-message', message, title, buttons);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
