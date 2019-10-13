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
