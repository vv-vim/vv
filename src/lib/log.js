const initNow = Date.now();
let lastNow = initNow;
const log = (...text) => {
  console.log( // eslint-disable-line no-console
    'profile',
    Date.now() - lastNow,
    Date.now() - initNow,
    ...text,
    initNow,
  ); // eslint-disable-line no-console
  lastNow = Date.now();
};

log('Init log');

export default log;
