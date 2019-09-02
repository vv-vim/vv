const nvimByWindowId = [];

export const getNvimByWindow = winOrId => {
  if (typeof winOrId === 'number') {
    return nvimByWindowId[winOrId];
  }
  if (winOrId.webContents) {
    return nvimByWindowId[winOrId.webContents.id];
  }
  return null;
};

export const setNvimByWindow = (win, nvim) => {
  if (win.webContents) {
    nvimByWindowId[win.webContents.id] = nvim;
  }
};

export const deleteNvimByWindow = win => {
  if (win.webContents) {
    delete nvimByWindowId[win.webContents.id];
  }
};
