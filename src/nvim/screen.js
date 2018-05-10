let container;
let chars;
let cursor;
let cols;
let rows;
let foregroundColor;
let backgroundColor;
let fgColor;
let bgColor;
let reverse;

let cursorElement;

// let redrawCount = '1';
// const redraw = () => {
//   const d = Date.now();
//   redrawCount = `${(parseInt(redrawCount, 10) + 1) % 10}`;
//   for (let i = 0; i < rows; i += 1) {
//     for (let j = 0; j < cols; j += 1) {
//       chars[i][j].nodeValue = redrawCount;
//       // chars[i][j].innerHTML = redrawCount;
//     }
//   }
//   // console.log('redraw=', Date.now() - d);
// };
// document.addEventListener('keydown', redraw);

const createContainer = () => {
  container = document.createElement('div');
  document.getElementById('screen').appendChild(container);
  return container;
};

const createCharEl = (i, j, symbol) => {
  const charEl = document.createElement('span');
  charEl.textContent = symbol;
  chars[i][j] = charEl;
  return charEl;
};

export const cmdPut = (props) => {
  for (let i = 0; i < props.length; i += 1) {
    printChar(cursor[0], cursor[1], props[i][0]);
    cursor[1] += 1;
  }
};

export const cmdCursorGoto = (props) => {
  cursor = props[0];
  cursorElement.style.transform = `translate(${cursor[1]*7.203 -1}px, ${cursor[0]*15-1}px)`;
};

export const cmdEolClear = () => {
  for (let i = cursor[1]; i < cols; i += 1) {
    printChar(cursor[0], i, ' ');
  }
};

export const cmdClear = () => {
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      printChar(i, j, ' ');
      // chars[i][j].nodeValue = redrawCount;
      // chars[i][j].innerHTML = redrawCount;
    }
  }
};

const printChar = (i, j, char) => {
  chars[i][j].firstChild.nodeValue = char;
  chars[i][j].style.color = getForegroundColor();
  chars[i][j].style.background = getBackgroundColor();
};

const getBackgroundColor = () => (
  reverse ? (foregroundColor || fgColor) : (backgroundColor || bgColor)
);

const getForegroundColor = () => (
  reverse ? (backgroundColor || bgColor) : (foregroundColor || fgColor)
);

const getColorString = (rgb) => {
  if (!rgb) {
    return null;
  }
  const bgr = [];
  for (let i = 0; i < 3; i += 1) {
    bgr.push(rgb & 0xff);
    rgb >>= 8;
  }
  return `rgb(${bgr[2]},${bgr[1]},${bgr[0]})`;
};

export const cmdHighlightSet = (props) => {
  for (var i = 0; i < props.length; i += 1) {
    const { foreground, background, reverse: r } = props[i][0];
    foregroundColor = getColorString(foreground);
    backgroundColor = getColorString(background);
    reverse = r;
  }
};

export const cmdUpdateBg = (props) => {
  bgColor = getColorString(props[0]);
};

export const cmdUpdateFg = (props) => {
  fgColor = getColorString(props[0]);
};

const initCursorElement = () => {
  cursorElement = document.createElement('span');
  cursorElement.innerHTML = ' ';
  cursorElement.setAttribute('id', 'cursor');
  container.appendChild(cursorElement);
};

export const initScreen = (newCols, newRows) => {
  rows = newRows;
  cols = newCols;
  cursor = [0, 0];
  chars = [];
  createContainer();
  initCursorElement();
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
