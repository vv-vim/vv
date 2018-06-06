let g:vv = 1

set mouse=a       " Enable all mouse events
set title         " Turn on title
set titlestring&  " Set default titlestring
set icon          " Turn on icon 

map <D-w> :q<CR>  " Cmd+W to close window (TODO)

let g:vv_settings_synonims = {
      \  'fu': 'fullscreen',
      \  'simplefu': 'simplefullscreen',
      \  'sfu': 'simplefullscreen',
      \  'font': 'fontfamily',
      \  'line': 'lineheight',
      \  'spacing': 'letterspacing',
      \  'sp': 'letterspacing',
      \  'curl': 'undercurl',
      \  'under': 'underline',
      \  'rchanged': 'reloadchanged',
      \  'rch': 'reloadchanged',
      \  'width': 'windowwidth',
      \  'height': 'windowheight',
      \  'top': 'windowtop',
      \  'left': 'windowleft'
      \}

let g:vv_default_settings = {
      \  'fullscreen': 0,
      \  'simplefullscreen': 1,
      \  'bold': 1,
      \  'italic': 1,
      \  'underline': 1,
      \  'undercurl': 1,
      \  'fontfamily': 'monospace',
      \  'fontsize': 12,
      \  'lineheight': 1.25,
      \  'letterspacing': 0,
      \  'reloadchanged': 1,
      \  'windowwidth': '60%',
      \  'windowheight': '80%',
      \  'windowleft': '50%',
      \  'windowtop': '50%'
      \}

let g:vv_settings = deepcopy(g:vv_default_settings)

" Custom VVset command, mimic default set command (:help set) with
" settings specified in g:vv_default_settings
function! VVset(...)
  for arg in a:000
    call VVsetItem(arg)
  endfor
endfunction

function! VVsetItem(name)
  if a:name == 'all'
    echo g:vv_settings
    return
  elseif a:name =~ '?'
    let l:name = VVSettingName(split(a:name, '?')[0])
    if has_key(g:vv_settings, l:name)
      echo g:vv_settings[l:name]
    else
      echoerr "Unknown option: ".l:name
    endif
    return
  elseif a:name =~ '&'
    let l:name = VVSettingName(split(a:name, '&')[0])
    if l:name == 'all'
      let g:vv_settings = deepcopy(g:vv_default_settings)
      call VVsettings()
      return
    elseif has_key(g:vv_default_settings, l:name)
      let l:value = g:vv_default_settings[l:name]
    else
      echoerr "Unknown option: ".l:name
      return
    endif
  elseif a:name =~ '+='
    let l:split = split(a:name, '+=')
    let l:name = VVSettingName(l:split[0])
    if has_key(g:vv_settings, l:name)
      let l:value = g:vv_settings[l:name] + l:split[1]
    endif
  elseif a:name =~ '-='
    let l:split = split(a:name, '-=')
    let l:name = VVSettingName(l:split[0])
    if has_key(g:vv_settings, l:name)
      let l:value = g:vv_settings[l:name] - l:split[1]
    endif
  elseif a:name =~ '\^='
    let l:split = split(a:name, '\^=')
    let l:name = VVSettingName(l:split[0])
    if has_key(g:vv_settings, l:name)
      let l:value = g:vv_settings[l:name] * l:split[1]
    endif
  elseif a:name =~ '='
    let l:split = split(a:name, '=')
    let l:name = l:split[0]
    let l:value = l:split[1]
  elseif a:name =~ ':'
    let l:split = split(a:name, ':')
    let l:name = l:split[0]
    let l:value = l:split[1]
  elseif a:name =~ '!'
    let l:name = VVSettingName(split(a:name, '!')[0])
    if has_key(g:vv_settings, l:name)
      if g:vv_settings[l:name] == 0
        let l:value = 1
      else
        let l:value = 0
      end
    endif
  elseif a:name =~ '^inv'
    let l:name = VVSettingName(strpart(a:name, 3))
    if has_key(g:vv_settings, l:name)
      if g:vv_settings[l:name] == 0
        let l:value = 1
      else
        let l:value = 0
      end
    endif
  elseif a:name =~ '^no'
    let l:name = strpart(a:name, 2)
    let l:value = 0
  else
    let l:name = a:name
    let l:value = 1
  endif

  let l:name = VVSettingName(l:name)

  if has_key(g:vv_settings, l:name)
    let g:vv_settings[l:name] = l:value
    call rpcnotify(0, "vv:set", l:name, l:value)
  else
    echoerr "Unknown option: ".l:name
  endif
endfunction

function! VVSettingName(name)
  if has_key(g:vv_settings_synonims, a:name)
    return g:vv_settings_synonims[a:name]
  else
    return a:name
  endif
endfunction

function! VVsettings()
  for key in keys(g:vv_settings)
    call rpcnotify(0, "vv:set", key, g:vv_settings[key])
  endfor
endfunction

command! -nargs=* VVset :call VVset(<f-args>)
command! -nargs=* VVse :call VVset(<f-args>)
command! -nargs=0 VVsettings :call VVsettings() " Send all settings to client

" Notify client about char under cursor and it's style (bold, italic,
" underline, undercurl)
function! VVcharUnderCursor()
  let l:char = {
        \   'char': matchstr(getline("."), '\%' . col('.') . 'c.'),
        \   'bold': synIDattr(synIDtrans(synID(line("."), col("."), 1)), "bold"),
        \   'italic': synIDattr(synIDtrans(synID(line("."), col("."), 1)), "italic"),
        \   'underline': synIDattr(synIDtrans(synID(line("."), col("."), 1)), "underline"),
        \   'undercurl': synIDattr(synIDtrans(synID(line("."), col("."), 1)), "undercurl")
        \ }
  call rpcnotify(0, "vv:char_under_cursor", l:char)
endfunction

command! -nargs=0 VVcharUnderCursor :call VVcharUnderCursor()

" Send current file name to client
autocmd BufEnter * call rpcnotify(0, "vv:filename", expand('%:p'))

" Send unsaved buffers to client
function! VVunsavedBuffers()
  let l:buffers = getbufinfo()
  call filter(l:buffers, "v:val['changed'] == 1")
  let l:buffers = map(l:buffers , "{ 'name': v:val['name'] }" )
  call rpcnotify(0, "vv:unsaved_buffers", l:buffers)
endfunction
command! -nargs=0 VVunsavedBuffers :call VVunsavedBuffers()

" Iterate on buffers and reload them from disk. No questions asked.
" Then return to current.
function! VVrefresh(...)
  let l:current_buffer = bufnr("%")
  for bufnr in a:000
    execute "buffer" bufnr
    execute "e!"
  endfor
  execute "buffer" l:current_buffer
endfunction

" :checktime only fires for visible buffers. This function iterates on
" all opened buffers and call checktime for all of them to collect all
" buffers changed outside.
function! VVchecktimeAll()
  let l:current_buffer = bufnr("%")
  let l:buffers = getbufinfo()
  call filter(l:buffers, "v:val['loaded'] == 1")
  for buf in l:buffers
    execute "buffer" buf['bufnr']
    execute "checktime"
  endfor
  execute "buffer" l:current_buffer
endfunction

function! VVenableReloadChanged(enabled)
  if a:enabled
    let g:original_autoread = &autoread
    set noautoread
    augroup ReloadChanged
      autocmd!
      autocmd FileChangedShell * call rpcnotify(0, "vv:file_changed", { "name": expand("<afile>"), "bufnr": expand("<abuf>") })
      autocmd CursorHold * checktime
    augroup END
  else
    if exists(g:original_autoread)
      set autoread=g:original_autoread
      unlet g:original_autoread
    end
    autocmd! ReloadChanged *
  endif
endfunction

command! -nargs=* VVrefresh :call VVrefresh(<f-args>)
command! -nargs=0 VVchecktimeAll :call VVchecktimeAll()
command! -nargs=1 VVenableReloadChanged :call VVenableReloadChanged(<f-args>)
