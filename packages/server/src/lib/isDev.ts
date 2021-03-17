type IsDevFunction = {
  <T, F>(dev: T, notDev: F): T | F;
  (): boolean;
};

const isDev: IsDevFunction = (dev = true, notDev = false) =>
  process.env.NODE_ENV === 'development' ? dev : notDev;

export default isDev;
