let g:vv = 1

source <sfile>:h/vvset.vim
source <sfile>:h/reloadChanged.vim

set mouse=a       " Enable all mouse events
set title         " Turn on title
set titlestring&  " Set default titlestring
set icon          " Turn on icon 

" map <D-w> :q<CR>  " Cmd+W to close window (TODO)

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

" Close window
" If we have opened tabs or splits, just does :q
" If this is the last window, notify client to close window
function! VVcloseWindow()
  if tabpagenr('$') > 1 || winnr('$') > 1
    q
  else
    echo 'close'
    call rpcnotify(0, "vv:close_window")
  endif
endfunction
command! -nargs=0 VVcloseWindow :call VVcloseWindow()

