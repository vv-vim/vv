let g:vv = 1

set mouse=a

map <D-w> :q<CR>
map <D-q> :qa<CR>

let g:vv_settings_synonims = {
      \ 'fu': 'fullscreen'
      \}

let g:vv_settings = {
      \  'fullscreen': 0,
      \  'bold': 1,
      \  'italic': 1,
      \  'underline': 1,
      \  'undercurl': 1,
      \  'font': 'monospace:h12',
      \  'lineheight': 1.25,
      \  'letterspacing': 0
      \}

" TODO: mimic default set (:help set)
" Set VV option and notify client about it.
" Available options and default values are set in g:vv_setings
function! VVset(name)

  if a:name =~ '='
    let l:split = split(a:name, '=')
    let l:name = l:split[0]
    let l:value = l:split[1]
  elseif a:name =~ '^no'
    let l:name = strpart(a:name, 2)
    let l:value = 0
  else
    let l:name = a:name
    let l:value = 1
  endif

  if has_key(g:vv_settings_synonims, l:name)
    let l:name = g:vv_settings_synonims[l:name]
  endif

  if has_key(g:vv_settings, l:name)
    let g:vv_settings[l:name] = l:value
    call rpcnotify(0, "vv:set", l:name, l:value)
  else
    echoerr "Unknown option: ".l:name
  endif
endfunction

command! -nargs=1 VVset :call VVset(<f-args>)
command! -nargs=1 VVse :call VVset(<f-args>)

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
