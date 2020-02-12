import throttle from 'lodash/throttle';

import { modifierPrefix } from './keyboard';
import { screenCoords } from '../screen';
import nvim from '../nvim';

const GRID = 0;

const SCROLL_STEP_X = 6;
const SCROLL_STEP_Y = 3;
const MOUSE_BUTTON = {
  0: 'left',
  1: 'middle',
  2: 'right',
  WHEEL: 'wheel',
};

const ACTION = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  PRESS: 'press',
  DRAG: 'drag',
  RELEASE: 'release',
};

let scrollDeltaX = 0;
let scrollDeltaY = 0;

let mouseCoords = [];
let mouseButtonDown;

const mouseCoordsChanged = event => {
  const newCoords = screenCoords(event.clientX, event.clientY);
  if (newCoords[0] !== mouseCoords[0] || newCoords[1] !== mouseCoords[1]) {
    mouseCoords = newCoords;
    return true;
  }
  return false;
};

const buttonName = event =>
  event.type === 'wheel' ? MOUSE_BUTTON.WHEEL : MOUSE_BUTTON[event.button];

const mouseInput = (event, action) => {
  mouseCoordsChanged(event);
  const [col, row] = screenCoords(event.clientX, event.clientY);
  const button = buttonName(event);
  const modifier = modifierPrefix(event);
  nvim.inputMouse(button, action, modifier, GRID, row, col);
};

const calculateScroll = event => {
  let [scrollX, scrollY] = screenCoords(Math.abs(scrollDeltaX), Math.abs(scrollDeltaY));
  scrollX = Math.floor(scrollX / SCROLL_STEP_X);
  scrollY = Math.floor(scrollY / SCROLL_STEP_Y);

  if (scrollY === 0 && scrollX === 0) return;

  if (scrollY !== 0) {
    mouseInput(event, scrollDeltaY > 0 ? ACTION.DOWN : ACTION.UP);
    scrollDeltaY = 0;
  }

  if (scrollX !== 0) {
    mouseInput(event, scrollDeltaX > 0 ? ACTION.RIGHT : ACTION.LEFT);
    scrollDeltaX = 0;
  }
};

const handleMousewheel = event => {
  const { deltaX, deltaY } = event;
  if (scrollDeltaY * deltaY < 0) scrollDeltaY = 0;
  scrollDeltaX += deltaX;
  scrollDeltaY += deltaY;
  calculateScroll(event);
};

const handleMousedown = event => {
  event.preventDefault();
  event.stopPropagation();
  mouseButtonDown = true;
  mouseInput(event, ACTION.PRESS);
};

const handleMouseup = event => {
  event.preventDefault();
  event.stopPropagation();
  mouseButtonDown = false;
  mouseInput(event, ACTION.RELEASE);
};

const handleMousemove = event => {
  if (mouseButtonDown) {
    event.preventDefault();
    event.stopPropagation();
    if (mouseCoordsChanged(event)) mouseInput(event, ACTION.DRAG);
  }
};

const initMouse = () => {
  nvim.command('set mouse=a'); // Enable mouse events

  document.addEventListener('mousedown', handleMousedown);
  document.addEventListener('mouseup', handleMouseup);
  document.addEventListener('mousemove', throttle(handleMousemove, 50));
  document.addEventListener('wheel', throttle(handleMousewheel, 10));
};

export default initMouse;
