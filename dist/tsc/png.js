import { deflate, inflate } from 'zlib.es';
import { packChunk, parseChunk } from './chunk';
import { COLOR_TYPE } from './const';
import { calcPixelByte, calcPixelPropsLen, deflateFilter, inflateFilter } from './filter';
import { readUInt32BE, readUint8, writeUInt32BE, writeUInt8 } from './utils/Uint8ArrayUtil';
export { COLOR_TYPE } from './const';
export class PNG {
    constructor(width, height, colorType = 6, bitDepth = 8) {
        //  public compressionMethod = 0;
        //  public filterMethod = 0;
        //  public interlaceMethod = 0;
        this._pixelPropsNum = 0;
        // TODO: Add support IndexedColor
        if (colorType === COLOR_TYPE.INDEX) {
            throw new Error('Not support IndexedColor');
        }
        this._width = width;
        this._height = height;
        this._colorType = colorType;
        this._bitDepth = bitDepth;
        this._pixelPropsNum = calcPixelPropsLen(colorType);
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
    get pixelLength() {
        return this._pixelPropsNum;
    }
    setData(data) {
        if (this._data.length !== data.length) {
            throw new Error('Data size does not match');
        }
        const length = this._data.length;
        for (let i = 0; i < length; i++) {
            this._data[i] = data[i];
        }
    }
    getPixel(x, y) {
        const pixelData = [];
        const index = ((x - 1) + this._width * (y - 1)) * this._pixelPropsNum;
        const data = this._data;
        for (let i = index, iEnd = index + this._pixelPropsNum; i < iEnd; i++) {
            pixelData.push(data[i]);
        }
        return pixelData;
    }
    setPixel(x, y, pixelData) {
        if (pixelData.length !== this._pixelPropsNum) {
            throw new Error('Don\'t match pixelData size');
        }
        const index = ((x - 1) + this._width * (y - 1)) * this._pixelPropsNum;
        const data = this._data;
        for (let i = 0; i < this._pixelPropsNum; i++) {
            data[i + index] = pixelData[i];
        }
    }
}
export function parse(input, oprion) {
    const chunks = parseChunk(input);
    const ihdr = chunks.get('IHDR');
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
    const idat = chunks.get('IDAT');
    const palette = (chunks.has('PLTE')) ? chunks.get('PLTE').data : undefined;
    const transparency = (chunks.has('tRNS')) ? chunks.get('tRNS').data : undefined;
    const rawData = (oprion && oprion.inflate) ? oprion.inflate(idat.data) : inflate(idat.data);
    const pixelData = inflateFilter(rawData, width, height, bitDepth, colorType, palette, transparency);
    // TODO: Add support IndexedColor
    if (colorType === COLOR_TYPE.INDEX) {
        const png = new PNG(width, height);
        png.setData(pixelData);
        return png;
    }
    else {
        const png = new PNG(width, height, colorType, bitDepth);
        png.setData(pixelData);
        return png;
    }
}
export function pack(png, oprion) {
    const chunks = new Map();
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
