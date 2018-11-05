const assert = require('assert');
const pnges = require('../dist/cjs/png');
const path = require('path');
const fs = require('fs');

const RGBA = new Uint8Array([
  255,255,255,255, 255,255,255,255, 255,255,255,255, // white white white
  255,255,255,255,   0,  0,  0,255, 255,255,255,255, // white black white
  255,255,255,255, 255,  0,  0,255, 255,255,255,255, // white red   white 
]);

const RGB = new Uint8Array([
  255,255,255, 255,255,255, 255,255,255, // white white white
  255,255,255,   0,  0,  0, 255,255,255, // white black white
  255,255,255, 255,  0,  0, 255,255,255, // white red   white 
]);

const GRAY_SCALE = new Uint8Array([
  255, 255, 255, // white white white
  255,   0, 255, // white black white
  255,  54, 255, // white gray  white 
]);

const GRAY_SCALE_A = new Uint8Array([
  255,255, 255,255, 255,255, // white white white
  255,255,   0,255, 255,255, // white black white
  255,255,  54,255, 255,255, // white gray  white 
]);

describe('parse', function() {
  it('RGBA', function() {
    const buffe = fs.readFileSync(path.join(__dirname, 'png', 'rgba.png'));
    assert.deepEqual(
      RGBA,
      pnges.parse(buffe).data
    );
  });
  it('RGB', function() {
    const buffe = fs.readFileSync(path.join(__dirname, 'png', 'rgb.png'));
    assert.deepEqual(
      RGB,
      pnges.parse(buffe).data
    );
  });
  it('GrayScale', function() {
    const buffe = fs.readFileSync(path.join(__dirname, 'png', 'g.png'));
    assert.deepEqual(
      GRAY_SCALE,
      pnges.parse(buffe).data
    );
  });
  it('GrayScale A', function() {
    const buffe = fs.readFileSync(path.join(__dirname, 'png', 'ga.png'));
    assert.deepEqual(
      GRAY_SCALE_A,
      pnges.parse(buffe).data
    );
  });
});

describe('pack', function() {
  it('RGBA', function() {
    const buffe = fs.readFileSync(path.join(__dirname, 'png', 'rgba.png'));
    const png = pnges.parse(buffe);
    pnges.pack(png);
    assert.ok(true);
  });
  it('RGB', function() {
    const buffe = fs.readFileSync(path.join(__dirname, 'png', 'rgb.png'));
    const png = pnges.parse(buffe);
    pnges.pack(png);
    assert.ok(true);
  });
  it('GrayScale', function() {
    const buffe = fs.readFileSync(path.join(__dirname, 'png', 'g.png'));
    const png = pnges.parse(buffe);
    pnges.pack(png);
    assert.ok(true);
  });
  it('GrayScale A', function() {
    const buffe = fs.readFileSync(path.join(__dirname, 'png', 'ga.png'));
    const png = pnges.parse(buffe);
    pnges.pack(png);
    assert.ok(true);
  });
});
