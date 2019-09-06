const initNow = Date.now();
let lastNow = initNow;
const log = (...text) => {
  // eslint-disable-next-line no-console
  console.log('profile', Date.now() - lastNow, Date.now() - initNow, ...text, initNow, Date.now());
  lastNow = Date.now();
};

log('Init log');

export default log;
