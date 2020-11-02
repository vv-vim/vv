let g:vv = 1

source <sfile>:h/vvset.vim

set termguicolors

autocmd VimEnter * call rpcnotify(0, "vv:vim_enter")

" Send unsaved buffers to client
function! VVunsavedBuffers()
  let l:buffers = getbufinfo()
  call filter(l:buffers, "v:val['changed'] == 1")
  let l:buffers = map(l:buffers , "{ 'name': v:val['name'] }" )
  return l:buffers
endfunction
