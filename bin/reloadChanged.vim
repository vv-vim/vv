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
  call filter(l:buffers, "v:val['changed'] == 1 && v:val['loaded'] == 1")
  for buf in l:buffers
    execute "buffer" buf['bufnr']
    execute "checktime"
  endfor
  execute "buffer" l:current_buffer
endfunction

function! VVenableReloadChanged(enabled)
  if a:enabled
    augroup ReloadChanged
      autocmd!
      autocmd FileChangedShell * call rpcnotify(0, "vv:file_changed", { "name": expand("<afile>"), "bufnr": expand("<abuf>") })
      autocmd CursorHold * checktime
    augroup END
  else
    autocmd! ReloadChanged *
  endif
endfunction

command! -nargs=* VVrefresh :call VVrefresh(<f-args>)
command! -nargs=0 VVchecktimeAll :call VVchecktimeAll()
command! -nargs=1 VVenableReloadChanged :call VVenableReloadChanged(<f-args>)
