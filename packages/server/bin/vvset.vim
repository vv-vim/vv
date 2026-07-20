let g:vv_settings_synonims = {
\  'fu': 'fullscreen',
\  'sfu': 'simplefullscreen',
\  'width': 'windowwidth',
\  'height': 'windowheight',
\  'top': 'windowtop',
\  'left': 'windowleft',
\  'openinproject': 'openInProject'
\}

let g:vv_default_settings = {
\  'fullscreen': 0,
\  'simplefullscreen': 1,
\  'bold': 1,
\  'italic': 1,
\  'underline': 1,
\  'undercurl': 1,
\  'strikethrough': 1,
\  'fontfamily': 'monospace',
\  'fontsize': 12,
\  'lineheight': 1.25,
\  'letterspacing': 0,
\  'reloadchanged': 0,
\  'windowwidth': v:null,
\  'windowheight': v:null,
\  'windowleft': v:null,
\  'windowtop': v:null,
\  'quitoncloselastwindow': 0,
\  'autoupdateinterval': 1440,
\  'openInProject': 1
\}

let g:vv_settings = deepcopy(g:vv_default_settings)

" Guard against infinite recursion when syncing fontfamily/fontsize and &guifont.
let g:vv_syncing_font = 0

" Apply VV's current fontfamily + fontsize to nvim's &guifont.
" Builds "<family-1>:h<size>,<family-2>,..." so :set guifont? matches VV.
function! s:SyncGuifont()
  if g:vv_syncing_font | return | endif
  let l:parts = split(get(g:vv_settings, 'fontfamily', ''), ',')
  if empty(l:parts) | return | endif
  let l:size = get(g:vv_settings, 'fontsize', '')
  let l:first = escape(l:parts[0], ' \')
  if l:size !=# '' && l:size != 0
    let l:first .= ':h' . l:size
  endif
  let l:rest = map(l:parts[1:], 'escape(v:val, " \\")')
  let l:guifont = empty(l:rest) ? l:first : l:first . ',' . join(l:rest, ',')
  let g:vv_syncing_font = 1
  try
    execute 'set guifont=' . l:guifont
  catch
  endtry
  let g:vv_syncing_font = 0
endfunction

" Parse &guifont and apply its first entry's family + :h<size> to VV.
function! s:SyncFromGuifont(value)
  if g:vv_syncing_font || a:value ==# '' | return | endif
  let l:first = split(a:value, ',')[0]
  let l:family = substitute(l:first, ':h.*$', '', '')
  if l:family ==# '' | return | endif
  let l:size = matchstr(l:first, ':h\zs[0-9.]\+')
  let g:vv_syncing_font = 1
  call VVsetItem('fontfamily=' . l:family)
  if l:size !=# ''
    call VVsetItem('fontsize=' . l:size)
  endif
  let g:vv_syncing_font = 0
endfunction

augroup VVFontSync
  autocmd!
  autocmd OptionSet guifont call s:SyncFromGuifont(v:option_new)
  " Catch &guifont set in init.vim — OptionSet does not fire during startup.
  autocmd VimEnter * call s:SyncFromGuifont(&guifont)
augroup END

" Custom VVset command, mimic default set command (:help set) with
" settings specified in g:vv_default_settings
function! VVset(...)
  for arg in a:000
    call VVsetItem(arg)
  endfor
endfunction

function! VVsettingValue(name)
  let l:name = VVsettingName(a:name)
  if has_key(g:vv_settings, l:name)
    return g:vv_settings[l:name]
  else
    echoerr "Unknown option: ".a:name
  endif
endfunction

function! VVsettingName(name)
  if has_key(g:vv_settings_synonims, a:name)
    return g:vv_settings_synonims[a:name]
  else
    return a:name
  endif
endfunction

function! VVsetItem(name)
  if a:name == 'all'
    echo g:vv_settings
    return
  elseif a:name =~ '?'
    let l:name = VVsettingName(split(a:name, '?')[0])
    echo VVsettingValue(l:name)
    return
  elseif a:name =~ '&'
    let l:name = VVsettingName(split(a:name, '&')[0])
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
    let l:name = VVsettingName(l:split[0])
    let l:value = VVsettingValue(l:name) + l:split[1]
  elseif a:name =~ '-='
    let l:split = split(a:name, '-=')
    let l:name = VVsettingName(l:split[0])
    let l:value = VVsettingValue(l:name) - l:split[1]
  elseif a:name =~ '\^='
    let l:split = split(a:name, '\^=')
    let l:name = VVsettingName(l:split[0])
    let l:value = VVsettingValue(l:name) * l:split[1]
  elseif a:name =~ '='
    let l:split = split(a:name, '=')
    let l:name = l:split[0]
    let l:value = l:split[1]
  elseif a:name =~ ':'
    let l:split = split(a:name, ':')
    let l:name = l:split[0]
    let l:value = l:split[1]
  elseif a:name =~ '!'
    let l:name = VVsettingName(split(a:name, '!')[0])
    if VVsettingValue(l:name) == 0
      let l:value = 1
    else
      let l:value = 0
    endif
  elseif a:name =~ '^inv'
    let l:name = VVsettingName(strpart(a:name, 3))
    if VVsettingValue(l:name) == 0
      let l:value = 1
    else
      let l:value = 0
    endif
  elseif a:name =~ '^no'
    let l:name = strpart(a:name, 2)
    let l:value = 0
  else
    let l:name = a:name
    let l:value = 1
  endif

  let l:name = VVsettingName(l:name)

  if has_key(g:vv_settings, l:name)
    let g:vv_settings[l:name] = l:value
    call rpcnotify(get(g:, "vv_channel", 1), "vv:set", l:name, l:value)
    if l:name ==# 'fontfamily' || l:name ==# 'fontsize'
      call s:SyncGuifont()
    endif
  else
    echoerr "Unknown option: ".l:name
  endif
endfunction

function! VVsettings()
  for key in keys(g:vv_settings)
    call rpcnotify(get(g:, "vv_channel", 1), "vv:set", key, g:vv_settings[key])
  endfor
endfunction

command! -nargs=* VVset :call VVset(<f-args>)
command! -nargs=* VVse :call VVset(<f-args>)
command! -nargs=0 VVsettings :call VVsettings() " Send all settings to client
