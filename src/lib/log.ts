const initNow = Date.now();
let lastNow = initNow;
const log = (...text: string[]) => {
  // eslint-disable-next-line no-console
  console.log(...text, Date.now() - lastNow, Date.now() - initNow, initNow, Date.now());
  lastNow = Date.now();
};

log('Init log');

export default log;
