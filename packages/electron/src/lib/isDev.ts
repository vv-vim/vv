const isDev = <T, F>(dev: T, notDev: F) => (process.env.NODE_ENV === 'development' ? dev : notDev);

export default isDev;
