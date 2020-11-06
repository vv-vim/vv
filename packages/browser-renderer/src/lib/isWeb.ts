const isWeb = (): boolean =>
  window.location.protocol === 'http:' || window.location.protocol === 'https:';

export default isWeb;
