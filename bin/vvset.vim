let g:vv_settings_synonims = {
      \  'fu': 'fullscreen',
      \  'sfu': 'simplefullscreen',
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
      \  'reloadchanged': 0,
      \  'windowwidth': v:null,
      \  'windowheight': v:null,
      \  'windowleft': v:null,
      \  'windowtop': v:null,
      \  'quitoncloselastwindow': 0,
      \  'autoupdateinterval': 1440
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
