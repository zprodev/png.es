import {deflate, inflate} from 'zlib.es';
import {Chunk, packChunk, parseChunk} from './chunk';
import {calcPixelByte, deflateFilter, inflateFilter} from './filter';
import {readUInt32BE, readUint8, writeUInt32BE, writeUInt8} from './utils/Uint8ArrayUtil';

export interface RGBA {
  r?: number;
  g?: number;
  b?: number;
  a?: number;
}

export class PNG {
  private _data: Uint8Array;
  private _width: number;
  private _height: number;
  private _bitDepth: number;
  private _colorType: number;
//  public compressionMethod = 0;
//  public filterMethod = 0;
//  public interlaceMethod = 0;

  constructor(width: number, height: number, colorType: number = 6, bitDepth: number = 8) {
    this._width = width;
    this._height = height;
    this._colorType = colorType;
    this._bitDepth = bitDepth;
    const pixelByte = calcPixelByte(colorType, bitDepth);
    this._data = new Uint8Array(width * height * pixelByte);
  }

  get data() {
    return this._data;
  }
  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }
  get colorType() {
    return this._colorType;
  }
  get bitDepth() {
    return this._bitDepth;
  }

  public setData(data: Uint8Array) {
    if (this._data.length !== data.length) {
      throw new Error('Data size does not match');
    }
    const length = this._data.length;
    for (let i = 0; i < length; i++) {
      this._data[i] = data[i];
    }
  }

  public getPixel(x: number, y: number): RGBA {
    const index = (x + this._width * y) * 4;
    const data = this._data;
    return {
      r: data[index],
      g: data[index + 1],
      b: data[index + 2],
      a: data[index + 3],
    };
  }
  public setPixel(x: number, y: number, rgba: RGBA) {
    const index = (x + this._width * y) * 4;
    const data = this._data;
    if (rgba.r !== undefined) {
      data[index] = rgba.r;
    }
    if (rgba.g !== undefined) {
      data[index + 1] = rgba.g;
    }
    if (rgba.b !== undefined) {
      data[index + 2] = rgba.b;
    }
    if (rgba.a !== undefined) {
      data[index + 3] = rgba.a;
    }
  }
}

export function parse(input: Uint8Array, oprion?: {inflate?: (data: Uint8Array) => Uint8Array} ) {
  const chunks = parseChunk(input);
  const ihdr = chunks.get('IHDR') as Chunk;
  const width = readUInt32BE(ihdr.data, 0);
  const height = readUInt32BE(ihdr.data, 4);
  const bitDepth = readUint8(ihdr.data, 8);
  const colorType = readUint8(ihdr.data, 9);
  const compressionMethod = readUint8(ihdr.data, 10);
  const filterMethod = readUint8(ihdr.data, 11);
  const interlaceMethod = readUint8(ihdr.data, 12);

  if (compressionMethod !== 0) {
    throw new Error('Unknown compression');
  }
  if (filterMethod !== 0) {
    throw new Error('Unknown filter');
  }
  if (interlaceMethod !== 0) {
    throw new Error('Interlace does not support');
  }

  const idat = chunks.get('IDAT') as Chunk;
  const rawData = (oprion && oprion.inflate) ? oprion.inflate(idat.data) : inflate(idat.data);
  const pixelData = inflateFilter(rawData, width, height, bitDepth, colorType);

  const png = new PNG(width, height, colorType, bitDepth);
  png.setData(pixelData);

  return png;
}

export function pack(png: PNG, oprion?: {deflate?: (data: Uint8Array) => Uint8Array}) {
  const chunks = new Map<string, Chunk>();

  const ihdrData = new Uint8Array(13);
  writeUInt32BE(png.width, ihdrData, 0);
  writeUInt32BE(png.height, ihdrData, 4);
  writeUInt8(png.bitDepth, ihdrData, 8);
  writeUInt8(png.colorType, ihdrData, 9);
//  writeUInt8(png.compressionMethod, ihdrData, 10); // No definition other than 0
//  writeUInt8(png.filterMethod, ihdrData, 11); // No definition other than 0
//  writeUInt8(png.interlaceMethod, ihdrData, 12); // Interlace does not support
  chunks.set('IHDR', {
    type: 'IHDR',
    data: ihdrData,
  });

  const filterData = deflateFilter(png.data, png.width, png.height, png.bitDepth, png.colorType);

  const idatData = (oprion && oprion.deflate) ? oprion.deflate(filterData) : deflate(filterData);
  chunks.set('IDAT', {
    type: 'IDAT',
    data: idatData,
  });

  const packData = packChunk(chunks);
  return packData;
}
