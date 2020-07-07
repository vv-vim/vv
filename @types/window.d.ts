import { IpcRenderer, Remote } from 'electron';

declare global {
  interface Window {
    electron: {
      ipcRenderer: IpcRenderer;
      remote: Remote;
    };
  }
}
