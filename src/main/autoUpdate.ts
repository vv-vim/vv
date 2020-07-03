import { dialog, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import html2plaintext from 'html2plaintext';

import { getSettings, onChangeSettings, SettingsCallback } from './nvim/settings';

import store from './lib/store';

let interval = 0;
let updaterIntervalId: NodeJS.Timeout;

const LAST_CHECKED = 'autoUpdate.lastCheckedForUpdate';

const MINUTE = 60 * 1000;

const needToCheck = () => {
  if (interval === 0) {
    return false;
  }
  const lastChecked = store.get(LAST_CHECKED);
  if (!lastChecked) {
    return true;
  }
  return Date.now() - lastChecked > interval * MINUTE;
};

const updater = () => {
  if (needToCheck()) {
    store.set(LAST_CHECKED, Date.now());
    autoUpdater.checkForUpdates();
  }
};

const startUpdater = () => {
  if (!updaterIntervalId) {
    updaterIntervalId = setInterval(updater, MINUTE);
  }
};

const updateInterval = (newInterval: string) => {
  if (interval !== parseInt(newInterval, 10)) {
    interval = parseInt(newInterval, 10);
    startUpdater();
  }
};

const handleChangeSettings: SettingsCallback = (_newSettings, allSettings) => {
  const { autoupdateinterval } = allSettings;
  if (autoupdateinterval !== undefined) {
    updateInterval(autoupdateinterval);
  }
};

const handleUpdateAvailable = ({
  version,
  releaseNotes,
}: {
  version: string;
  releaseNotes: string;
}) => {
  const response = dialog.showMessageBoxSync({
    type: 'question',
    buttons: ['Update', 'Ignore'],
    defaultId: 0,
    message: `Version ${version} is available, do you want to install it now?`,
    detail: html2plaintext(releaseNotes),
    title: 'Update available',
  });
  if (response === 0) {
    autoUpdater.downloadUpdate();
  }
};

const handleUpdateDownloaded = () => {
  dialog.showMessageBox({
    type: 'question',
    buttons: ['OK'],
    defaultId: 0,
    message: `Update Downloaded`,
    detail: 'Please restart app to install update.',
    title: 'Update Downloaded',
  });
};

const initAutoUpdate = ({ win }: { win: BrowserWindow }) => {
  updateInterval(getSettings().autoupdateinterval);
  onChangeSettings(win, handleChangeSettings);

  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', handleUpdateAvailable);
  autoUpdater.on('update-downloaded', handleUpdateDownloaded);
};

export default initAutoUpdate;
