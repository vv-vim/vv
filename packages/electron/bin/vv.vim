let g:vv = 1

let s:dir = expand('<sfile>:p:h')

execute 'source ' . fnameescape(s:dir . '/vvset.vim')
execute 'source ' . fnameescape(s:dir . '/reloadChanged.vim')
execute 'source ' . fnameescape(s:dir . '/openInProject.vim')

set termguicolors

autocmd VimEnter * call rpcnotify(get(g:, 'vv_channel', 1), "vv:vim_enter")

" Send unsaved buffers to client
function! VVunsavedBuffers()
  let l:buffers = getbufinfo()
  call filter(l:buffers, "v:val['changed'] == 1")
  let l:buffers = map(l:buffers , "{ 'name': v:val['name'] }" )
  return l:buffers
endfunction
