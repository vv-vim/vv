let g:vv = 1

source <sfile>:h/vvset.vim
source <sfile>:h/reloadChanged.vim

set mouse=a       " Enable all mouse events
set title         " Turn on title
set titlestring&  " Set default titlestring
set icon          " Turn on icon 

" Send current file name to client
autocmd BufEnter * call rpcnotify(0, "vv:filename", expand('%:p'))

autocmd VimEnter * call rpcnotify(0, "vv:vim_enter")

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
