VV
==

VV is a Neovim client for macOS. The goal is to provide a pure minimalistic Vim experience with a good macOS integration. And it should be fast.

Featues:
* Nice and fast text render.
* OS integration: copy/paste, mouse, scroll.
* Fullscreen in native and simple (fast) mode.
* All settings available from vimscript.
* Command line launcher.
* “Save All” dialog on quit and “Refresh” dialog on external changes.
* Text zoom.

It is built on Electron. There are no barriers to eventually port it to Windows and Linux and make plugins with Javascript/HTML/CSS.

Installation
------------

You need Neovim installed to run VV. You can find Neovim installation instructions here: https://github.com/neovim/neovim/wiki/Installing-Neovim. It is recommended to use Neovim version 0.3 and higher.

You can download most recent binary in the [Releases](https://github.com/igorgladkoborodov/vv/releases) page.

You can also build it manually. You need [Node.js](https://nodejs.org/en/download/) and [Yarn](https://yarnpkg.com/lang/en/) installed.

```
git clone git@github.com:igorgladkoborodov/vv.git
cd vv
yarn
yarn electron:build
```

It will generate VV.app binary in dist directory, copy it to your /Applications folder and add `vv` CLI launcher to `/usr/local/bin`.

Command Line Launcher
---------------------

You can use `vv` command to run VV from Terminal. You can install it via `VV → Command Line Launcher...` menu item. It will add it to `/usr/local/bin` folder. If you prefer another place, you can do it manually:

```
ln -s -f /Applications/VV.app/Contents/Resources/bin/vv [dir from $PATH]/vv
```

Usage: `vv [options] [file ...]`

You can specify one or more space separated files or directories. They will be opened in separate windows. If no files are passed, it will open current directory.

Options are passed no `nvim` as is. You can check available options in nvim help: `nvim --help`.

Settings
--------

You can setup VV-specific option via `:VVset` command. It works the same as vim built-in command `:set`. For example `:VVset nofullscreen` is the same as `:VVset fullscreen=0`. You can use `:help set` for syntax reference.

* `fullscreen`, `fu`: Switch to fullscreen mode. You can also toggle fullscreen by `Cmd+Ctrl+F`. Default: `0`.

* `simplefullscreen`, `sfu`: Use simple or standard fullscreen mode. Simple is faster than standard macOS fullscreen mode. It does not have any transition animation. Default: `1`.

* `bold`: Allow bold font. You can completely disable bold even if colorscheme has it. Default: `1`.
* `italic'`: Allow italic. Default: `1`.
* `underline`: Allow underline. Default: `1`.
* `undercurl`: Allow undercurl. Default: `1`.
* `fontfamily`: Font family. Syntax is the same as CSS `font-family`. Default: `monospace`.
* `fontsize`: Font size in pixels. Default: `12`.
* `lineheight`: Line height related to fontxsize. Pixel value is `fontsize * lineheight`. Default: `1.25`.
* `letterspacing`: Fine-tuning letter spacing in retina pixels. Might be a negative value. For retina screens the value is physical pixels. For non-retina screens it works differently: it divides value by 2 and rounds it. For example, `:VVset letterspacing=1` will make character 1 pixel wider on retina displays and will do nothing on non-retina displays. Value 2 is 2 physical pixels on retina and 1 physical pixel on non-retina. Default: `0`.
* `reloadchanged`: Show dialog when opened files were changed outside. For example, when you switch git branch. It will prompt you to keep your changes or reload file. Default: `1`.
* `windowwidth`, `width`: Window width. Might be a number in pixels or percentage of display width. Default: `60%`.
* `windowheight`, `height`: Window height. Default: `80%`.
* `windowleft`, `left`: Window position from left. Mighe be a number in pixels or percent. Percent value works the same as `background-position` rule in CSS. For example: 20% means the window’s 20% will be on the same line as 20% of the screen. 0% — the very left, 100% — the very right, 50% — center. Default: `50%`.
* `windowtop`, `top`: Window position top. Default: `50%`.

You can use these settings in your `init.vim`, you can check if VV is loaded by `g:vv` variable:

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

Development
-----------

First you need start webpack watch process in separate terminal:
```
yarn webpack:watch
```

Then you can run app:
```
yarn start
```

App is in active development. And honestly, I did not expect that my experiments with Neovim API might get so far. The code is quite chaotic, no tests, no static typing etc. So PR and feedback are highly welcome.

Testing
-------

TBD

Name
----

This VV name comes from a convenient bash shortcut `vv` that I use to start Vim.

License
-------

VV is released under the [MIT License](https://opensource.org/licenses/MIT).
