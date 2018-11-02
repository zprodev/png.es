# png.es

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
