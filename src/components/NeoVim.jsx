import React from 'react';

const { ipcRenderer } = window.require('electron');

// import cp from 'child_process';

// const cp = require('child_process');
// import cp from 'child_process';
// const child_process = global.require('child_process');

// Attach to neovim process
// (async function() {
//   const nvim = await attach({ proc: nvim_proc });
//   nvim.command('vsp');
//   nvim.command('vsp');
//   nvim.command('vsp');
//   const windows = await nvim.windows;
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
//
//   const buf = await nvim.buffer;
//   // expect(buf instanceof nvim.Buffer).toEqual(true);
//
//   const lines = await buf.lines;
//   // expect(lines).toEqual(['']);
//
//   await buf.replace(['line1', 'line2'], 0);
//   const newLines = await buf.lines;
//   // expect(newLines).toEqual(['line1', 'line2']);
//
//   // nvim.quit();
//   // nvim_proc.disconnect();
// })();

class NeoVim extends React.Component {
  constructor(props) {
    super(props);
    this.cursor = [0, 0];
    this.chars = [];
    for (let i = 0; i < props.rows; i++) {
      this.chars[i] = [];
      for (let j = 0; j < props.cols; j++) {
        this.chars[i][j] = ' ';
      }
    }
    this.state = {
      chars: this.chars,
    }

    this.handleNotification = this.handleNotification.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.redraw = this.redraw.bind(this);
  }

  redraw() {
    // console.log('redraw');
    this.setState({ chars: this.chars });
  }

  handleKeydown(event) {
    const key = this.getKey(event);
    if (key) {
      ipcRenderer.send('nvim:input', key);
    }
  }

  getKey(event) {
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
          } else {
            return '<Esc>';
          }
      }
      case 'Backspace': {
          if (ctrlKey && keyCode === 72) {
              // Note:
              // When <C-h> is input (72 is key code of 'h')
              return 'h';
          } else {
            return '<BS>';
          }
      }
      case 'Enter': {
        return '<CR>';
      }
      case 'Shift': {
        return null;
      }
    }
    return key;
  }

  componentDidMount() {
    ipcRenderer.send('nvim:init');

    ipcRenderer.on('nvim:notification', this.handleNotification);
    document.addEventListener('keydown', this.handleKeydown);
  }

  handleNotification(e, arg) {
    // console.log('nvim:notification', e, arg);
    if (arg.method === 'redraw') {
      for (let [ cmd, ...props ] of arg.args) {
        // console.log('cmd', cmd, props);
        if (cmd === 'put') {
          this.cmdPut(props);
        } else if (cmd === 'cursor_goto') {
          this.cmdCursorGoto(props[0]);
        } else if (cmd === 'eol_clear') {
          this.cmdEolClear();
        }
      }
    }
    this.redraw();
  }

  cmdCursorGoto(props) {
    // console.log('cursor_goto', props);
    this.cursor = props;
  }

  cmdPut(props) {
    for (let char of props) {
      // console.log('char', char, 'cursor=', this.cursor);
      this.chars[this.cursor[0]][this.cursor[1]] = char[0];
      this.cursor[1] = this.cursor[1] + 1;
    }
  }

  cmdEolClear() {
    for (var i = this.cursor[1]; i < this.props.cols; i++) {
      this.chars[this.cursor[0]][i] = ' ';
    }
  }

  render() {
    console.log('render', this.state.chars);
    const { chars } = this.state;
    const flattenChars = chars.reduce((acc, val) => acc.concat(val), []);
    return (
      <div style={{ fontFamily: 'monospace', width: `${7.8 * this.props.cols}px`, whiteSpace: 'wrap' }}>
        { flattenChars.map((char, i) => (
          <Char key={i} char={char} />
        ))}
      </div>
    );
  }
}

const Line = ({ chars }) => (
  <div> {
    chars.map((char, j) => (
      <Char key={j} char={char} />
    ))
  }</div>
);

const Char = ({ char }) => (
  <span style={{ width: '7.8px', display: 'inline-block' }}>{ char }</span>
);

export default NeoVim;
