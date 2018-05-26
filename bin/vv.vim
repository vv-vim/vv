let g:vv = 1

set mouse=a

map <D-w> :q<CR>
map <D-q> :qa<CR>

map <D-=> :VVset fontsize+=1<CR>
map <D--> :VVset fontsize-=1<CR>
map <D-0> :VVset fontsize&<CR>

let g:vv_settings_synonims = {
      \  'fu': 'fullscreen',
      \  'font': 'fontfamily'
      \}

let g:vv_default_settings = {
      \  'fullscreen': 0,
      \  'bold': 1,
      \  'italic': 1,
      \  'underline': 1,
      \  'undercurl': 1,
      \  'fontfamily': 'monospace',
      \  'fontsize': 12,
      \  'lineheight': 1.25,
      \  'letterspacing': 0
      \}

let g:vv_settings = deepcopy(g:vv_default_settings)

" :help set
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

command! -nargs=* VVset :call VVset(<f-args>)
command! -nargs=* VVse :call VVset(<f-args>)

function! VVsettings()
  for key in keys(g:vv_settings)
    call rpcnotify(0, "vv:set", key, g:vv_settings[key])
  endfor
endfunction

command! -nargs=0 VVsettings :call VVsettings()

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

source ~/.config/nvim/init.vim
