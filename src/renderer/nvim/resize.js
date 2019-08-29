import debounce from 'lodash/debounce';
import { screenCoords } from './screen';
import nvim from './nvim';

import { remote } from '../preloaded/electron'

const { getContentSize } = remote.getCurrentWindow();

let cols;
let rows;
let uiAttached = false;

export const resize = (forceRedraw = false) => {
  const [newCols, newRows] = screenCoords(...getContentSize());
  if (
    newCols > 0 &&
    newRows > 0 &&
    (newCols !== cols || newRows !== rows || !uiAttached || forceRedraw)
  ) {
    cols = newCols;
    rows = newRows;

    if (uiAttached) {
      nvim.uiTryResize(cols, rows);
    } else {
      uiAttached = true;
      nvim.uiAttach(cols, rows, {ext_linegrid: true});
      window.addEventListener('resize', debounce(() => resize(), 100));
    }
  }
};
