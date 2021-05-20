import { BrowserWindow } from 'electron';

/**
 * When you have the window with simple fullscreen, then open a new window and switch back to the previous
 * one, status bar stays on top of the fullscreen window and does not hide as it shoud do.
 * This is a workaround to fix this bug. We have a hidden window, and when we focus on the window with
 * simple fullscreen, we trigger setSimpleFullScreen on the hidden window and it fixes menu bar.
 */
class SimpleFullScreenStatusBarFix {
  private sfsWindowFix: BrowserWindow;

  constructor() {
    this.sfsWindowFix = new BrowserWindow({ show: false });
  }

  addWindow(win: BrowserWindow): void {
    win.on('focus', () => this.sfsWindowFix.setSimpleFullScreen(win.isSimpleFullScreen()));
  }
}

export default SimpleFullScreenStatusBarFix;
