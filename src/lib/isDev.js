const isDev = (dev = true, notDev = false) =>
  process.env.NODE_ENV === 'development' ? dev : notDev;

export default isDev;
