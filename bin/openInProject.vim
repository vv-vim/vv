" Opens file respecting switchbuf setting.
function! VVopenInProject(fileName)
  " Create temporary quickfix list with file we want to open
  call setqflist([], ' ', { 'title': 'VV Temporary Quickfix' })
  let l:id = getqflist({ 'id': 0 }).id
  call setqflist([], 'r', { 'id': l:id, 'items': [{ 'filename': a:fileName }] })

  " Open this file and switch to previous quickfix list
  cc! 1
  silent colder
endfunction
