let container;
let chars;
let cursor;
let cols;
let rows;

let redrawCount = '1';
const redraw = () => {
  const d = Date.now();
  redrawCount = `${(parseInt(redrawCount, 10) + 1) % 10}`;
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      chars[i][j].nodeValue = redrawCount;
      // chars[i][j].innerHTML = redrawCount;
    }
  }
  console.log('redraw=', Date.now() - d);
};
document.addEventListener('keydown', redraw);

const createContainer = () => {
  container = document.createElement('div');
  document.getElementById('screen').appendChild(container);
  return container;
};

const createCharEl = (i, j, symbol) => {
  const charEl = document.createElement('span');
  charEl.textContent = symbol;
  chars[i][j] = charEl.firstChild;
  return charEl;
};

export const cmdPut = (props) => {
  for (let i = 0; i < props.length; i += 1) {
    chars[cursor[0]][cursor[1]].nodeValue = props[i][0];
    cursor[1] += 1;
  }
};

export const cmdCursorGoto = (props) => {
  cursor = props[0];
};

export const cmdEolClear = () => {
  for (let i = cursor[1]; i < cols; i += 1) {
    chars[cursor[0]][i].nodeValue = ' ';
  }
};

export const initScreen = (newCols, newRows) => {
  rows = newRows;
  cols = newCols;
  cursor = [0, 0];
  chars = [];
  createContainer();
  for (let i = 0; i < rows; i += 1) {
    const line = document.createElement('pre');
    chars[i] = [];
    for (let j = 0; j < cols; j += 1) {
      line.appendChild(createCharEl(i, j, ' '));
    }
    container.appendChild(line);
  }
};

export default initScreen;
