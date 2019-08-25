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
  return l:buffers
endfunction
