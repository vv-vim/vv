import throttle from 'lodash/throttle';

import { modifierPrefix, shiftPrefix } from './keyboard';
import { screenCoords } from '../screen';
import nvim from '../nvim';

const SCROLL_STEP_X = 6;
const SCROLL_STEP_Y = 3;
const MOUSE_BUTTON = ['Left', 'Middle', 'Right'];

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

const buttonName = (event, type) =>
  [
    '<',
    shiftPrefix(event),
    modifierPrefix(event),
    event.buttons ? MOUSE_BUTTON[event.button] : '',
    type,
    '>',
  ].join('');

const mousePosition = event => `<${screenCoords(event.clientX, event.clientY).join(',')}>`;

const mouseInput = (event, type) => {
  mouseCoordsChanged(event);
  nvim.input(`${buttonName(event, type)}${mousePosition(event)}`);
};

const calculateScroll = event => {
  let [scrollX, scrollY] = screenCoords(Math.abs(scrollDeltaX), Math.abs(scrollDeltaY));
  scrollX = Math.floor(scrollX / SCROLL_STEP_X);
  scrollY = Math.floor(scrollY / SCROLL_STEP_Y);

  if (scrollY === 0 && scrollX === 0) return;

  if (scrollY !== 0) {
    mouseInput(event, `ScrollWheel${scrollDeltaY > 0 ? 'Down' : 'Up'}`);
    scrollDeltaY = 0;
  }

  if (scrollX !== 0) {
    mouseInput(event, `ScrollWheel${scrollDeltaX > 0 ? 'Right' : 'Left'}`);
    scrollDeltaX = 0;
  }
};

const throttledCalculateScroll = throttle(calculateScroll, 10);

const handleMousewheel = event => {
  const { deltaX, deltaY } = event;
  if (scrollDeltaY * deltaY < 0) scrollDeltaY = 0;
  scrollDeltaX += deltaX;
  scrollDeltaY += deltaY;
  throttledCalculateScroll(event);
};

const handleMousedown = event => {
  event.preventDefault();
  event.stopPropagation();
  mouseButtonDown = true;
  mouseInput(event, 'Mouse');
};

const handleMouseup = event => {
  if (mouseButtonDown) {
    event.preventDefault();
    event.stopPropagation();
    mouseButtonDown = false;
  }
};

const mousemove = event => {
  if (mouseButtonDown) {
    event.preventDefault();
    event.stopPropagation();
    if (mouseCoordsChanged(event)) mouseInput(event, 'Drag');
  }
};

const handleMousemove = throttle(mousemove, 50);

const initMouse = () => {
  document.addEventListener('mousedown', handleMousedown);
  document.addEventListener('mouseup', handleMouseup);
  document.addEventListener('mousemove', handleMousemove);
  document.addEventListener('wheel', handleMousewheel);
};

export default initMouse;
