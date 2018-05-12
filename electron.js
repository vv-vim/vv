const electron = require('electron');

const { app, BrowserWindow, ipcMain } = electron;

const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({ width: 1200, height: 900 });

  // and load the index.html of the app.
  mainWindow.loadURL('http://localhost:3000');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  mainWindow.webContents.setFrameRate(30);
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  // setInterval(() => {
  //   mainWindow.webContents.send('doorBell' , {msg:'hello from main process'});
  // }, 500);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
//
//
ipcMain.on('nvim:init', (...props) => {
  initNvim();
});

// /////////////////////////////////////////////////////////
// NeoVim
// const cp = require('child_process');

// const nvimProcess = cp.spawn('nvim', ['--embed', 'test/test.jsx'], {
//   stdio: ['pipe', 'pipe', process.stderr],
// });

// const Session = require('msgpack5rpc');

const initNvim = () => {
  const session = new Session();
  session.attach(nvimProcess.stdin, nvimProcess.stdout);
  session.on('notification', (method, args) => {
    // console.log('notification', args);
    mainWindow.webContents.send('nvim:notification', { method, args }, Date.now());
    // @ui.handle_redraw args if method == 'redraw'
  });
  session.request('ui_attach', [150, 50, true], () => {
    ipcMain.on('nvim:input', (e, arg) => {
      // console.log('vim_input');
      session.request('vim_input', [arg], () => {});
    });
    // ui.on('input', (e) => session.request 'vim_input', [e], -> )
    // ui.on('resize', (col, row) => session.request 'ui_try_resize', [col, row], () => {})
  });
};

// Attach to neovim process
// const initNvim = async () => {
// const nvim = await attach({ proc: nvim_proc });
//   nvim.command('vsp');
//   nvim.command('vsp');
//   nvim.command('vsp');
// const windows = await nvim.windows;
// console.log('0')
//
//   console.log('hey');
//   console.log(windows.length)
//
//   // expect(windows.length).toEqual(4);
//   // expect(windows[0] instanceof nvim.Window).toEqual(true);
//   // expect(windows[1] instanceof nvim.Window).toEqual(true);
//
//   nvim.window = windows[2];
//   const win = await nvim.window;
//
//   // expect(win).not.toEqual(windows[0]);
//   // expect(win).toEqual(windows[2]);
// console.log('1')
// const windows = await nvim.windows;
// console.log('windows ===================');
// console.log(windows);
// const buf = await nvim.buffer;
// console.log('buf ===================');
// console.log(buf);
// const lines = await buf.lines;
// console.log('lines ===================');
// console.log(lines);
//   // expect(buf instanceof nvim.Buffer).toEqual(true);
//
//   // expect(lines).toEqual(['']);
//
//   await buf.replace(['line1', 'line2'], 0);
//   const newLines = await buf.lines;
//   // expect(newLines).toEqual(['line1', 'line2']);
//
//   nvim.quit();
//   // nvim_proc.disconnect();
// };
