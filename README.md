# png.es

[![Build Status](https://travis-ci.org/zprodev/png.es.svg?branch=master)](https://travis-ci.org/zprodev/png.es)
[![npm](https://img.shields.io/npm/v/png.es.svg)](https://www.npmjs.com/package/png.es)
[![license](https://img.shields.io/github/license/zprodev/png.es.svg)](LICENSE)

ECMAScript compliant lightweight PNG editor

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
import { pack } from 'png.es';

const rawData = pack(pngObject);
```
