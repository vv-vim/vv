" Iterate on buffers and reload them from disk. No questions asked.
" Do it in temporary tab to keep the same windows layout.
function! VVrefresh(...)
  -tabnew
  for bufnr in a:000
    execute "buffer" bufnr
    execute "e!"
  endfor
  tabclose!
endfunction

" Checktime for all loaded buffers to trigger FileChangedShell for changed
function! VVchecktimeAll()
  let l:buffers = getbufinfo()
  call filter(l:buffers, "v:val['loaded'] == 1")
  for buf in l:buffers
    execute "checktime" buf['bufnr']
  endfor
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
