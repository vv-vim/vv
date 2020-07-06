// 'pixi.js' is added as dependency only for types, it is not used for producttion.

declare module '@pixi/app' {
  export { Application } from 'pixi.js';
}

declare module '@pixi/core' {
  export { Renderer, Texture, AbstractBatchRenderer as BatchRenderer } from 'pixi.js';
}

declare module '@pixi/sprite' {
  export { Sprite } from 'pixi.js';
}

declare module '@pixi/display' {
  export { Container } from 'pixi.js';
}

declare module '@pixi/graphics' {
  export { Graphics } from 'pixi.js';
}

declare module '@pixi/utils' {
  import { utils } from 'pixi.js';

  export = utils;
}

declare module '@pixi/ticker' {
  export { TickerPlugin } from 'pixi.js';
}
