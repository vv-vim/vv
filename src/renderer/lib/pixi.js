// Customized minimal build for pixi.js
// https://github.com/pixijs/pixi.js/blob/dev/bundles/pixi.js/src/index.js

import { Application } from '@pixi/app';
import { Renderer, BatchRenderer } from '@pixi/core';
import { TickerPlugin } from '@pixi/ticker';
import * as utils from '@pixi/utils';

Renderer.registerPlugin('batch', BatchRenderer);
Application.registerPlugin(TickerPlugin);

export * from '@pixi/app';
export * from '@pixi/core';
export * from '@pixi/sprite';
export { utils };
