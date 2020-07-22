" Opens file respecting switchbuf setting.
function! VVopenInProject(filename, ...)
  " Take switch override from second parameter or from VV settings.
  let l:switchbuf_override = get(a:, 1, VVsettingValue('openInProject'))

  silent call VVopenInProjectLoud(a:filename, l:switchbuf_override)
endfunction

function! VVopenInProjectLoud(fileName, switchbuf_override)
  " Temporary override switchbuf if we have custom openInProject setting.
  if type(a:switchbuf_override) == v:t_string && a:switchbuf_override != '0' && a:switchbuf_override != '1'
    let l:original_switchbuf = &switchbuf
    let &switchbuf = a:switchbuf_override
  endif

  " Create temporary quickfix list with file we want to open
  if (!exists('g:vvOpenInProjectQfId') || getqflist({ 'id': 0 }).id != g:vvOpenInProjectQfId)
    call setqflist([], ' ', { 'title': 'VV Temporary Quickfix' })
    let g:vvOpenInProjectQfId = getqflist({ 'id': 0 }).id
  end

  " Add file to list and open it. It will be opened according to current switchbuf
  " setting.
  call setqflist([], 'r', { 'id': g:vvOpenInProjectQfId, 'items': [{ 'filename': a:fileName }] })
  cc! 1

  " Switch to previous quickfix list if there are other lists.
  if getqflist({'nr' : 0 }).nr > 1
    colder
  end

  " Rollback to original switchbuf option if needed.
  if exists('l:original_switchbuf')
    let &switchbuf = l:original_switchbuf
  endif
endfunction
