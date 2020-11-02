declare global {
  interface Window {
    electron: {
      ipcRenderer: Electron.IpcRenderer;
    };
  }
}

export const { ipcRenderer } = window.electron || {};
