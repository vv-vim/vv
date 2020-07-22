# VV

VV is a Neovim client for macOS. A pure, fast, minimalistic Vim experience with good macOS integration. Optimized for speed and nice font rendering.

![VV screenshot](assets/screenshot.png)

- Fast text render via WebGL.
- OS integration: copy/paste, mouse, scroll.
- Fullscreen support for native and simple (fast) mode.
- All app settings configurable via vimscript.
- Command line launcher.
- “Save All” dialog on quit and “Refresh” dialog on external changes.
- Text zoom.

VV is built on Electron. There are no barriers to porting it to Windows or Linux, or making plugins with Javascript, HTML, and CSS.

## Installation

### Install via Homebrew

VV is available via Homebrew Cask:

```
$ brew cask install vv
```

It will also install Neovim (if it is not installed) and command line launcher `vv`.

### Download

Or you can download the most recent release from the [Releases](https://github.com/vv-vim/vv/releases/latest) page.

You need Neovim to run VV. You can install it via Homebrew: `$ brew install neovim`. Or you can find Neovim installation instructions here: [https://github.com/neovim/neovim/wiki/Installing-Neovim](https://github.com/neovim/neovim/wiki/Installing-Neovim). Neovim version 0.4.0 and higher is required.

### Build manually

You can also build it manually. You will need [Node.js](https://nodejs.org/en/download/) and [Yarn](https://yarnpkg.com/lang/en/) installed.

```
$ git clone git@github.com:vv-vim/vv.git
$ cd vv
$ yarn
$ yarn build
```

This will generate a VV.app binary in the dist directory. Copy VV.app to your /Applications folder and add the CLI launcher `vv` to your `/usr/local/bin`.

## Command Line Launcher

You can use the `vv` command to run VV in a Terminal. Install it via the `VV → Command Line Launcher...` menu item. VV will add the command to your `/usr/local/bin` folder. If you prefer another place, you can link the command manually:

```
ln -s -f /Applications/VV.app/Contents/Resources/bin/vv [dir from $PATH]/vv
```

Usage: `vv [options] [file ...]`

Options are passed to `nvim`. You can check available options in nvim help: `nvim --help`.

## Settings

You can setup VV-specific options via the `:VVset` command. It works the same as the vim built-in command `:set`. For example `:VVset nofullscreen` is the same as `:VVset fullscreen=0`. You can use `:help set` for syntax reference.

- `fullscreen`, `fu`: Switch to fullscreen mode. You can also toggle fullscreen with `Cmd+Ctrl+F`. Default: `0`.
- `simplefullscreen`, `sfu`: Use simple or standard fullscreen mode. Simple mode is faster than standard macOS fullscreen mode. It does not have any transition animation. Default: `1`.
- `bold`: Allow bold font. You can completely disable bold even if the colorscheme uses it. Default: `1`.
- `italic'`: Allow italic. Default: `1`.
- `underline`: Allow underline. Default: `1`.
- `undercurl`: Allow undercurl. Default: `1`.
- `fontfamily`: Font family. Syntax is the same as CSS `font-family`. Default: `monospace`.
- `fontsize`: Font size in pixels. Default: `12`.
- `lineheight`: Line height related to font size. Pixel value is `fontsize * lineheight`. Default: `1.25`.
- `letterspacing`: Fine-tuning letter spacing in retina pixels. Can be a negative value. For retina screens the value is physical pixels. For non-retina screens it works differently: it divides the value by 2 and rounds it. For example, `:VVset letterspacing=1` will make characters 1 pixel wider on retina displays and will do nothing on non-retina displays. Value 2 is 2 physical pixels on retina and 1 physical pixel on non-retina. Default: `0`.
- `reloadchanged`: Show dialog when opened files are changed externally. For example, when you switch git branches. It will prompt you to keep your changes or reload the file. Default: `0`.
- `windowwidth`, `width`: Window width. Can be a number in pixels or percentage of display width.
- `windowheight`, `height`: Window height.
- `windowleft`, `left`: Window position from left. Can be a number in pixels or a percentage. Percent values work the same as the `background-position` rule in CSS. For example: `25%` means that the vertical line on the window that is 25% from the left will be placed at the line that is 25% from the display's left. 0% — the very left, 100% — the very right, 50% — center.
- `windowtop`, `top`: Window position top.
- `quitoncloselastwindow`: Quit app on close last window. Default: `0`.
- `autoupdateinterval`: Autoupdate interval in minutes. `0` — disable autoupdate. Default: `1440`, one day.
- `openinproject`: Open file in existing VV instance if this file is located inside current directory of this instance. By default it will obey [`switchbuf`](https://neovim.io/doc/user/options.html#'switchbuf') option, but you can set `switchbuf` override as a value of this option, for example: `:VVset openinproject=newtab`. Possible values are: `1` use switchbuf, `0` open in new instance, any valid `switchbuf` value. Default: `1`.

You can use these settings in your `init.vim` or change them any time. You can check if VV is loaded by checking the `g:vv` variable:

```
if exists('g:vv')
  VVset nobold
  VVset noitalic
  VVset windowheight=100%
  VVset windowwidth=60%
  VVset windowleft=0
  VVset windowtop=0
endif
```

VV also sets `set termguicolors` on startup.

## Development

First, you need start a webpack watch process in a separate terminal:

```
yarn webpack:watch
```

Then you can run the app:

```
yarn start
```

You can run tests with `yarn test` and ESLint with `yarn lint` commands.

## Name

The VV name comes from the bash shortcut `vv` that I use to start Vim.

## License

VV is released under the [MIT License](https://opensource.org/licenses/MIT).
