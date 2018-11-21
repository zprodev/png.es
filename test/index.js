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

const RGBA_PNG_DATA = fs.readFileSync(path.join(__dirname, 'png', 'rgba.png'));
const RGB_PNG_DATA = fs.readFileSync(path.join(__dirname, 'png', 'rgb.png'));
const INDEX_PNG_DATA = fs.readFileSync(path.join(__dirname, 'png', 'index.png'));
const GRAY_SCALE_PNG_DATA = fs.readFileSync(path.join(__dirname, 'png', 'g.png'));
const GRAY_SCALE_A_PNG_DATA = fs.readFileSync(path.join(__dirname, 'png', 'ga.png'));

describe('parse', function() {
  it('RGBA', function() {
    assert.deepEqual(
      RGBA,
      pnges.parse(RGBA_PNG_DATA).data
    );
  });
  it('RGB', function() {
    assert.deepEqual(
      RGB,
      pnges.parse(RGB_PNG_DATA).data
    );
  });
  it('Index', function() {
    assert.deepEqual(
      RGBA,
      pnges.parse(INDEX_PNG_DATA).data
    );
  });
  it('GrayScale', function() {
    assert.deepEqual(
      GRAY_SCALE,
      pnges.parse(GRAY_SCALE_PNG_DATA).data
    );
  });
  it('GrayScale Alpha', function() {
    assert.deepEqual(
      GRAY_SCALE_A,
      pnges.parse(GRAY_SCALE_A_PNG_DATA).data
    );
  });
});

describe('pack', function() {
  it('RGBA', function() {
    const png = new pnges.PNG(3, 3, pnges.COLOR_TYPE.RGBA);
    png.setData(RGBA);
    const packData = pnges.pack(png);
    const rePng = pnges.parse(packData);
    assert.deepEqual( RGBA, rePng.data );
  });
  it('RGB', function() {
    const png = new pnges.PNG(3, 3, pnges.COLOR_TYPE.RGB);
    png.setData(RGB);
    const packData = pnges.pack(png);
    const rePng = pnges.parse(packData);
    assert.deepEqual( RGB, rePng.data );
  });
  it('Index (throw error)', function() {
    assert.throws(() => {
      new pnges.PNG(3, 3, pnges.COLOR_TYPE.INDEX);
    });
  });
  it('GrayScale', function() {
    const png = new pnges.PNG(3, 3, pnges.COLOR_TYPE.GRAY);
    png.setData(GRAY_SCALE);
    const packData = pnges.pack(png);
    const rePng = pnges.parse(packData);
    assert.deepEqual( GRAY_SCALE, rePng.data );
  });
  it('GrayScale Alpha', function() {
    const png = new pnges.PNG(3, 3, pnges.COLOR_TYPE.GRAY_ALPHA);
    png.setData(GRAY_SCALE_A);
    const packData = pnges.pack(png);
    const rePng = pnges.parse(packData);
    assert.deepEqual( GRAY_SCALE_A, rePng.data );
  });
});

describe('re pack', function() {
  it('RGBA', function() {
    const png = pnges.parse(RGBA_PNG_DATA);
    const packData = pnges.pack(png);
    const rePng = pnges.parse(packData);
    assert.deepEqual( png.data, rePng.data );
  });
  it('RGB', function() {
    const png = pnges.parse(RGB_PNG_DATA);
    const packData = pnges.pack(png);
    const rePng = pnges.parse(packData);
    assert.deepEqual( png.data, rePng.data );
  });
  it('Index', function() {
    const png = pnges.parse(INDEX_PNG_DATA);
    const packData = pnges.pack(png);
    const rePng = pnges.parse(packData);
    assert.deepEqual( png.data, rePng.data );
  });
  it('GrayScale', function() {
    const png = pnges.parse(GRAY_SCALE_PNG_DATA);
    const packData = pnges.pack(png);
    const rePng = pnges.parse(packData);
    assert.deepEqual( png.data, rePng.data );
  });
  it('GrayScale Alpha', function() {
    const png = pnges.parse(GRAY_SCALE_A_PNG_DATA);
    const packData = pnges.pack(png);
    const rePng = pnges.parse(packData);
    assert.deepEqual( png.data, rePng.data );
  });
});
