import {
  initScreen,
  cmdPut,
  cmdCursorGoto,
  cmdEolClear,
  cmdHighlightSet,
  cmdUpdateFg,
  cmdUpdateBg,
  cmdClear,
} from './screen';

// const { ipcRenderer } = window.require('electron');
//
//
const childProcess = global.require('child_process');
// const remote = require('remote');
// const Session = require('msgpack5rpc');


const attach = global.require('neovim').attach;

const handleNotification = (method, args) => {
  // console.log('hey', method, args);
  // console.log('nvim:notification', arg);
  // const dateStart = Date.now();
  if (method === 'redraw') {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      // console.log('cmd', cmd, props);
      if (cmd === 'put') {
        cmdPut(props);
      } else if (cmd === 'cursor_goto') {
        cmdCursorGoto(props);
      } else if (cmd === 'eol_clear') {
        cmdEolClear();
      } else if (cmd === 'highlight_set') {
        cmdHighlightSet(props);
      } else if (cmd === 'update_fg') {
        cmdUpdateFg(props);
      } else if (cmd === 'update_bg') {
        cmdUpdateBg(props);
      } else if (cmd === 'clear') {
        cmdClear();
      } else {
        // console.log('Unknown =========', cmd);
      }
    }
  }
  // console.log(Date.now() - date, dateStart - date)
  // console.log(`nvim:notification time=${Date.now() - d}`, arg);
};

const getKey = (event) => {
  // console.log('getkey', event);
  const { key, ctrlKey, keyCode } = event;

  switch (key) {
    case 'Escape': {
      if (ctrlKey && keyCode !== 27) {
        // Note:
        // When <C-[> is input
        // XXX:
        // Keycode of '[' is not available because it is 219 in OS X
        // and it is not for '['.
        return '[';
      }
      return '<Esc>';
    }
    case 'Backspace': {
      if (ctrlKey && keyCode === 72) {
        // Note:
        // When <C-h> is input (72 is key code of 'h')
        return 'h';
      }
      return '<BS>';
    }
    case 'Enter': {
      return '<CR>';
    }
    case 'Shift': {
      return null;
    }
    default: {
      return key;
    }
  }
};

// let nvim
const handleKeydown = (event) => {
  const key = getKey(event);
  if (key) {
    // ipcRenderer.send('nvim:input', key);
    nvim.request('vim_input', [key], () => {});
  }
};

let nvim;

async function initNvim() {
  // const nvimArgs = ['--embed']; //.concat remote.process.argv[2..]

  const nvimProcess = childProcess.spawn('nvim', ['--embed', 'test/test.jsx'], {
    stdio: ['pipe', 'pipe', process.stderr],
  });

  // Attach to neovim process
  nvim = await attach({ proc: nvimProcess });

  nvim.request('ui_attach', [150, 50, true]);

  nvim.on('notification', (method, args) => {
    handleNotification(method, args);
  })

  // nvim.command('vsp');
  // nvim.command('vsp');
  // nvim.command('vsp');
  // const windows = await nvim.windows;
  //
  // // expect(windows.length).toEqual(4);
  // // expect(windows[0] instanceof nvim.Window).toEqual(true);
  // // expect(windows[1] instanceof nvim.Window).toEqual(true);
  //
  // nvim.window = windows[2];
  // const win = await nvim.window;
  //
  // console.log('hey', win);
  // // expect(win).not.toEqual(windows[0]);
  // // expect(win).toEqual(windows[2]);
  //
  // const buf = await nvim.buffer;
  // // expect(buf instanceof nvim.Buffer).toEqual(true);
  //
  // const lines = await buf.lines;
  // // expect(lines).toEqual(['']);
  //
  // await buf.replace(['line1', 'line2'], 0);
  // const newLines = await buf.lines;
  // expect(newLines).toEqual(['line1', 'line2']);

  // const readStream = fs.createReadStream(nvimProcess.stdout);
  // const decodeStream = msgpack.createDecodeStream();
  //
  // // show multiple objects decoded from stream
  // readStream.pipe(decodeStream).on('data', console.warn);

  // console.log(nvimProcess.pid, nvimProcess.stdin, nvimProcess.stdout);

  // const session = new Session();
  // session.attach(nvimProcess.stdin, nvimProcess.stdout);
  // session.on('notification', (method, args) => {
  //   // console.log('notification', args);
  //   handleNotification(args);
  //   // mainWindow.webContents.send('nvim:notification', { method, args }, Date.now());
  //   // @ui.handle_redraw args if method == 'redraw'
  // });
  // session.request('ui_attach', [150, 50, true], () => {
  // console.log('ui attach');
  //   ipcMain.on('nvim:input', (e, arg) => {
  //     // console.log('vim_input');
  //     session.request('vim_input', [arg], () => {});
  //   });
  //   // ui.on('input', (e) => session.request 'vim_input', [e], -> )
  //   // ui.on('resize', (col, row) => session.request 'ui_try_resize', [col, row], () => {})
  // });
  //

  // console.log('initvim');
  initScreen(150, 50);
  // ipcRenderer.on('nvim:notification', handleNotification);
  // ipcRenderer.send('nvim:init');
  document.addEventListener('keydown', handleKeydown);
}

document.addEventListener('DOMContentLoaded', initNvim);
