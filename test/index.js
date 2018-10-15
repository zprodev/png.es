const assert = require('assert');
const pnges = require('../dist/cjs/png');
const path = require('path');
const fs = require('fs');

const RGBA = new Uint8Array([
  255,255,255,255, 255,255,255,255, 255,255,255,255, // white white white
  255,255,255,255,   0,  0,  0,255, 255,255,255,255, // white black white
  255,255,255,255, 255,  0,  0,255, 255,255,255,255, // white red   white 
]);

describe('parse', function() {
  it('RGBA', function() {
    const buffe = fs.readFileSync(path.join(__dirname, 'png', 'rgba.png'));
    assert.deepEqual(
      RGBA,
      pnges.parse(buffe).data
    );
  });
});
