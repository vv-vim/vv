import { screen } from 'electron';
import { getInitialSettings, onChangeSettings } from '../settings';

const initWindowSize = ({ win, args }) => {
  let bounds = {};

  const set = {
    windowwidth: w => {
      let width = parseInt(w, 10);
      if (w.toString().indexOf('%') !== -1) {
        width = Math.round((screen.getPrimaryDisplay().workAreaSize.width * width) / 100);
      }
      bounds.width = width;
    },
    windowheight: h => {
      let height = parseInt(h, 10);
      if (h.toString().indexOf('%') !== -1) {
        height = Math.round((screen.getPrimaryDisplay().workAreaSize.height * height) / 100);
      }
      bounds.height = height;
    },
    windowleft: l => {
      let left = parseInt(l, 10);
      if (l.toString().indexOf('%') !== -1) {
        const displayWidth = screen.getPrimaryDisplay().workAreaSize.width;
        const winWidth = bounds.width;
        left = Math.round(((displayWidth - winWidth) * left) / 100);
      }
      bounds.x = left;
    },
    windowtop: t => {
      let top = parseInt(t, 10);
      if (t.toString().indexOf('%') !== -1) {
        const displayHeight = screen.getPrimaryDisplay().workAreaSize.height;
        const winHeight = bounds.height;
        top = Math.round(((displayHeight - winHeight) * top) / 100);
      }
      bounds.y = top;
    },
  };

  const updateWindowSize = (settings, allSettings) => {
    bounds = {};
    const { fullscreen } = allSettings || settings;
    if (!fullscreen) {
      ['windowwidth', 'windowheight', 'windowleft', 'windowtop'].forEach(key => {
        if (settings[key]) {
          set[key](settings[key]);
        }
      });
      if (Object.keys(bounds).length > 0) {
        win.setBounds(bounds);
      }
    }
  };

  updateWindowSize(getInitialSettings(win, args));
  onChangeSettings(win, updateWindowSize);
};

export default initWindowSize;
