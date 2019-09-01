const getColor = (c, defaultColor = null) => {
  if (typeof c !== 'number' || c === -1) return defaultColor;
  return `rgb(${(c >> 16) & 0xff},${(c >> 8) & 0xff},${c & 0xff})`; // eslint-disable-line no-bitwise
};

export default getColor;
