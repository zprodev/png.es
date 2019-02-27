# png.es

[![npm](https://img.shields.io/npm/v/png.es.svg)](https://www.npmjs.com/package/png.es)
[![Build Size](https://badgen.net/bundlephobia/minzip/png.es)](https://bundlephobia.com/result?p=png.es)
[![Build Status](https://travis-ci.org/zprodev/png.es.svg?branch=master)](https://travis-ci.org/zprodev/png.es)
[![license](https://img.shields.io/github/license/zprodev/png.es.svg)](LICENSE)

ECMAScript compliant lightweight PNG editor

## Support

|Function|BitDepth|TrueColor|GrayScale|Alpha|IndexedColor|Interlace|
|:--|:--|:-:|:-:|:-:|:-:|:-:|
|parse|1, 4, 6, 8|o|o|o|o|x|
|pack|1, 4, 6, 8|o|o|o|x|x|

## Distribution

### npm

```
npm i png.es
```

### files

[for browser](https://github.com/zprodev/png.es/tree/master/dist/browser)

[for CommonJS](https://github.com/zprodev/png.es/tree/master/dist/cjs)

[for ESModules](https://github.com/zprodev/png.es/tree/master/dist/esm)

## Usage

### parse

```
import { parse } from 'png.es';

const pngObject = parse(rawData); // Input type is Uint8Array
```

### pack

```
import { PNG, pack, COLOR_TYPE } from 'png.es';

// 4px * 4px RGBA image
const pngObject = new PNG(4, 4, COLOR_TYPE.RGBA);
pngObject.setData([255, 255, ....]);

const uint8Array = pack(pngObject);
```

### edit

```
import { parse, pack } from 'png.es';

const pngObject = parse(rawData);
pngObject.setPixel(2, 2, [255, 0, 0, 255] ); // Set red to x2y2
const uint8Array = pack(pngObject);
```
