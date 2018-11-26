import { deflate, inflate } from 'zlib.es';

function calcCrc32(input, inputStart = 0, inputEnd) {
    if (!inputEnd) {
        inputEnd = input.length;
    }
    let crc = -1;
    for (let i = inputStart; i < inputEnd; i++) {
        crc = crc32table[(crc ^ input[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ -1;
}
const crc32table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let tableValue = i;
    for (let j = 0; j < 8; j++) {
        if (tableValue & 1) {
            tableValue = 0xedb88320 ^ (tableValue >>> 1);
        }
        else {
            tableValue = tableValue >>> 1;
        }
    }
    crc32table[i] = tableValue;
}

function startsWith(base, target, baseIndex = 0) {
    const index = baseIndex;
    const length = target.length;
    for (let i = 0; i < length; i++) {
        if (base[i + index] !== target[i]) {
            return false;
        }
    }
    return true;
}
function copy(base, baseOffset, target, targetOffset, length) {
    for (let i = 0; i < length; i++) {
        target[targetOffset + i] = base[baseOffset + i];
    }
}
function readString(target, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
        str += String.fromCharCode(target[i + offset]);
    }
    return str;
}
function convertCodes(target) {
    const length = target.length;
    const array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        array[i] = target.charCodeAt(i);
    }
    return array;
}
function readUint8(target, offset) {
    return target[offset];
}
function readUInt32BE(target, offset) {
    return (target[offset] * 0x1000000) +
        ((target[offset + 1] << 16) | (target[offset + 2] << 8) | target[offset + 3]);
}
function writeUInt8(value, target, offset) {
    target[offset] = value;
}
function writeUInt32BE(value, target, offset) {
    target[offset] = (value >>> 24);
    target[offset + 1] = (value >>> 16);
    target[offset + 2] = (value >>> 8);
    target[offset + 3] = (value & 0xff);
}
function readBits(target, offset, length) {
    const byteOffset = (offset / 8) | 0;
    const bitOffset = offset % 8;
    const bitOffsetFilter = 255 & (255 >>> bitOffset);
    // MEMO: length never crosses a byte boundary
    return (target[byteOffset] & bitOffsetFilter) >>> (8 - bitOffset - length);
}

const SIGNATURE = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
function parseChunk(target) {
    if (!startsWith(target, SIGNATURE, 0)) {
        throw new Error('Not PNG');
    }
    let targetIndex = SIGNATURE.length;
    const chunks = new Map();
    const targetLength = target.length;
    while (targetIndex < targetLength) {
        const chunk = readChunk(target, targetIndex);
        targetIndex += chunk.data.length + 12;
        if (chunk.type === 'IDAT' && chunks.has('IDAT')) {
            const baseData = chunks.get('IDAT');
            const newData = new Uint8Array(baseData.data.length + chunk.data.length);
            newData.set(baseData.data);
            newData.set(chunk.data, baseData.data.length);
            chunks.set('IDAT', { type: 'IDAT', data: newData });
        }
        else {
            chunks.set(chunk.type, chunk);
        }
        if (chunk.type === 'IEND') {
            break;
        }
    }
    return chunks;
}
function packChunk(chunks) {
    let length = 8;
    chunks.forEach((chunk) => {
        length += chunk.data.length;
        length += 12;
    });
    const packData = new Uint8Array(length);
    let packDataIndex = 0;
    copy(SIGNATURE, 0, packData, packDataIndex, SIGNATURE.length);
    packDataIndex += SIGNATURE.length;
    chunks.forEach((chunk) => {
        writeUInt32BE(chunk.data.length, packData, packDataIndex);
        packDataIndex += 4;
        const array = convertCodes(chunk.type);
        copy(array, 0, packData, packDataIndex, array.length);
        packDataIndex += 4;
        copy(chunk.data, 0, packData, packDataIndex, chunk.data.length);
        packDataIndex += chunk.data.length;
        const crc = calcCrc32(packData, packDataIndex - 4 - chunk.data.length, packDataIndex);
        writeUInt32BE(crc, packData, packDataIndex);
        packDataIndex += 4;
    });
    return packData;
}
function readChunk(target, targetStart) {
    const chunkLength = readUInt32BE(target, targetStart);
    const chunkType = readString(target, targetStart + 4, 4);
    const buffer = target.slice(targetStart + 8, targetStart + 8 + chunkLength);
    return {
        type: chunkType,
        data: buffer,
    };
}

const FILTER_TYPE = Object.freeze({
    NONE: 0,
    SUB: 1,
    UP: 2,
    AVERAGE: 3,
    PAETH: 4,
});
const COLOR_TYPE = Object.freeze({
    GRAY: 0,
    RGB: 2,
    INDEX: 3,
    GRAY_ALPHA: 4,
    RGBA: 6,
});

function inflateFilter(data, width, height, bitDepth, colorType, palette, transparency) {
    const pixelPropsNum = calcPixelPropsLen(colorType);
    const linePropsNum = pixelPropsNum * width;
    const pixelBitLen = pixelPropsNum * bitDepth;
    const lineBitLen = pixelBitLen * width;
    const resultPixelByte = calcPixelByte(colorType, bitDepth);
    const resultLineByte = resultPixelByte * width;
    const result = new Uint8Array(width * height * resultPixelByte);
    let dataIndex = 0;
    let resultIndex = 0;
    let left = 0;
    let up = 0;
    let upleft = 0;
    for (let y = 0; y < height; ++y) {
        const filterType = readBits(data, dataIndex, 8);
        dataIndex = dataIndex + 8;
        if (FILTER_TYPE.NONE === filterType) {
            for (let x = 0; x < linePropsNum; ++x) {
                const value = readBits(data, dataIndex + x * bitDepth, bitDepth);
                // TODO: 効率化
                if (palette !== undefined && colorType === COLOR_TYPE.INDEX) {
                    copy(palette, value * 3, result, resultIndex + x * 4, 3);
                    if (transparency !== undefined && transparency[value] !== undefined) {
                        result[resultIndex + x * 4 + 3] = transparency[value];
                    }
                    else {
                        result[resultIndex + x * 4 + 3] = 255;
                    }
                }
                else {
                    result[resultIndex + x] = value;
                }
            }
        }
        else if (FILTER_TYPE.SUB === filterType) {
            for (let x = 0; x < linePropsNum; ++x) {
                if (x < pixelPropsNum) {
                    result[resultIndex + x] = readBits(data, dataIndex + x * bitDepth, bitDepth);
                }
                else {
                    result[resultIndex + x] =
                        (result[resultIndex + x - pixelPropsNum] + readBits(data, dataIndex + x * bitDepth, bitDepth)) % 256;
                }
            }
        }
        else if (FILTER_TYPE.UP === filterType) {
            for (let x = 0; x < linePropsNum; x++) {
                if (resultIndex < linePropsNum) {
                    result[resultIndex + x] = readBits(data, dataIndex + x * bitDepth, bitDepth);
                }
                else {
                    result[resultIndex + x] =
                        (result[resultIndex + x - linePropsNum] + readBits(data, dataIndex + x * bitDepth, bitDepth)) % 256;
                }
            }
        }
        else if (FILTER_TYPE.AVERAGE === filterType) {
            for (let x = 0; x < linePropsNum; x++) {
                left = up = 0;
                if (x >= pixelPropsNum) {
                    left = result[resultIndex + x - pixelPropsNum];
                }
                if (resultIndex >= linePropsNum) {
                    up = result[resultIndex + x - linePropsNum];
                }
                result[resultIndex + x] = ((left + up) / 2 + readBits(data, dataIndex + x * bitDepth, bitDepth)) % 256;
            }
        }
        else if (FILTER_TYPE.PAETH === filterType) {
            for (let x = 0; x < linePropsNum; x++) {
                left = up = upleft = 0;
                if (x >= pixelPropsNum && resultIndex >= linePropsNum) {
                    left = result[resultIndex + x - pixelPropsNum];
                    up = result[resultIndex + x - linePropsNum];
                    upleft = result[resultIndex + x - pixelPropsNum - linePropsNum];
                }
                else if (x >= pixelPropsNum) {
                    left = result[resultIndex + x - pixelPropsNum];
                }
                else if (resultIndex >= linePropsNum) {
                    up = result[resultIndex + x - linePropsNum];
                }
                result[resultIndex + x] =
                    (calcPaeth(left, up, upleft) + readBits(data, dataIndex + x * bitDepth, bitDepth)) % 256;
            }
        }
        else {
            throw new Error('Unknown filter');
        }
        if (lineBitLen % 8 === 0) {
            dataIndex += lineBitLen;
        }
        else {
            dataIndex += lineBitLen + (8 - lineBitLen % 8);
        }
        resultIndex += resultLineByte;
    }
    return result;
}
function deflateFilter(rawData, width, height, bitDepth, colorType) {
    const pixelByte = calcPixelByte(colorType, bitDepth);
    const lineByte = pixelByte * width;
    const data = new Uint8Array(width * height * pixelByte + height);
    let dataIndex = 0;
    let rawDataIndex = 0;
    let left = 0;
    let up = 0;
    let upleft = 0;
    for (let i = 0; i < height; i++) {
        let filterType = FILTER_TYPE.NONE;
        let filterExpectedValue = calcExpectedValueNone(rawData, rawDataIndex, lineByte);
        let nextFilterExpectedValue = calcExpectedValueSub(rawData, rawDataIndex, lineByte);
        if (filterExpectedValue > nextFilterExpectedValue) {
            filterExpectedValue = nextFilterExpectedValue;
            filterType = FILTER_TYPE.SUB;
        }
        nextFilterExpectedValue = calcExpectedValueUp(rawData, rawDataIndex, lineByte);
        if (filterExpectedValue > nextFilterExpectedValue) {
            filterExpectedValue = nextFilterExpectedValue;
            filterType = FILTER_TYPE.UP;
        }
        nextFilterExpectedValue = calcExpectedValueAverage(rawData, rawDataIndex, lineByte, pixelByte);
        if (filterExpectedValue > nextFilterExpectedValue) {
            filterExpectedValue = nextFilterExpectedValue;
            filterType = FILTER_TYPE.AVERAGE;
        }
        nextFilterExpectedValue = calcExpectedValuePaeth(rawData, rawDataIndex, lineByte, pixelByte);
        if (filterExpectedValue > nextFilterExpectedValue) {
            filterExpectedValue = nextFilterExpectedValue;
            filterType = FILTER_TYPE.PAETH;
        }
        data[dataIndex] = filterType;
        dataIndex++;
        if (FILTER_TYPE.NONE === filterType) {
            for (let j = 0; j < lineByte; j++) {
                data[dataIndex + j] = rawData[rawDataIndex + j];
            }
        }
        else if (FILTER_TYPE.SUB === filterType) {
            for (let j = 0; j < lineByte; j++) {
                if (j < pixelByte) {
                    data[dataIndex + j] = rawData[rawDataIndex + j];
                }
                else {
                    data[dataIndex + j] = rawData[rawDataIndex + j] - rawData[rawDataIndex + j - pixelByte];
                }
            }
        }
        else if (FILTER_TYPE.UP === filterType) {
            for (let j = 0; j < lineByte; j++) {
                if (dataIndex < lineByte) {
                    data[dataIndex + j] = rawData[rawDataIndex + j];
                }
                else {
                    data[dataIndex + j] = rawData[rawDataIndex + j] - rawData[rawDataIndex + j - lineByte];
                }
            }
        }
        else if (FILTER_TYPE.AVERAGE === filterType) {
            for (let j = 0; j < lineByte; j++) {
                left = up = 0;
                if (j >= pixelByte) {
                    left = rawData[rawDataIndex + j - pixelByte];
                }
                if (dataIndex >= lineByte) {
                    up = rawData[rawDataIndex + j - lineByte];
                }
                data[dataIndex + j] = rawData[rawDataIndex + j] - (((left + up) / 2) | 0);
            }
        }
        else if (FILTER_TYPE.PAETH === filterType) {
            for (let j = 0; j < lineByte; j++) {
                left = up = upleft = 0;
                if (j >= pixelByte && dataIndex >= lineByte) {
                    left = rawData[rawDataIndex + j - pixelByte];
                    up = rawData[rawDataIndex + j - lineByte];
                    upleft = rawData[rawDataIndex + j - pixelByte - lineByte];
                }
                else if (j >= pixelByte) {
                    left = rawData[rawDataIndex + j - pixelByte];
                }
                else if (dataIndex >= lineByte) {
                    up = rawData[rawDataIndex + j - lineByte];
                }
                data[dataIndex + j] = rawData[rawDataIndex + j] - calcPaeth(left, up, upleft);
            }
        }
        dataIndex += lineByte;
        rawDataIndex += lineByte;
    }
    return data;
}
function calcPixelPropsLen(colorType) {
    let result = 0;
    if (COLOR_TYPE.GRAY === colorType) {
        // GrayScale
        result = 1;
    }
    else if (COLOR_TYPE.RGB === colorType) {
        // RGB
        result = 3;
    }
    else if (COLOR_TYPE.INDEX === colorType) {
        // Index
        result = 1;
    }
    else if (COLOR_TYPE.GRAY_ALPHA === colorType) {
        // GrayScale Alpha
        result = 2;
    }
    else if (COLOR_TYPE.RGBA === colorType) {
        // RGBA
        result = 4;
    }
    else {
        throw new Error('Unknown colorType');
    }
    return result;
}
function calcPixelByte(colorType, bitDepth) {
    let result = 0;
    if (COLOR_TYPE.GRAY === colorType) {
        result = bitDepth / 8;
    }
    else if (COLOR_TYPE.RGB === colorType) {
        result = bitDepth / 8 * 3;
    }
    else if (COLOR_TYPE.INDEX === colorType) {
        result = 4;
    }
    else if (COLOR_TYPE.GRAY_ALPHA === colorType) {
        result = bitDepth / 8 * 2;
    }
    else if (COLOR_TYPE.RGBA === colorType) {
        result = bitDepth / 8 * 4;
    }
    else {
        throw new Error('Unknown colorType');
    }
    return result;
}
function calcPaeth(left, up, upleft) {
    const p = left + up - upleft;
    const leftP = Math.abs(p - left);
    const upP = Math.abs(p - up);
    const upleftP = Math.abs(p - upleft);
    if (leftP <= upP && leftP <= upleftP) {
        return left;
    }
    if (upP <= upleftP) {
        return up;
    }
    return upleft;
}
function calcExpectedValueNone(input, offset, length) {
    let expectedValue = 0;
    for (let i = offset, iMax = offset + length; i < iMax; i++) {
        expectedValue += input[i];
    }
    return expectedValue;
}
function calcExpectedValueSub(input, offset, length) {
    let expectedValue = 0;
    let tmpValue = 0;
    for (let i = offset, iMax = offset + length; i < iMax; i++) {
        if (i < length) {
            expectedValue += input[i];
        }
        else {
            tmpValue = input[i] - input[i - length];
            if (0 <= tmpValue) {
                expectedValue += tmpValue;
            }
            else {
                expectedValue += (tmpValue + 256);
            }
        }
    }
    return expectedValue;
}
function calcExpectedValueUp(input, offset, length) {
    let expectedValue = 0;
    let tmpValue = 0;
    for (let i = offset, iMax = offset + length; i < iMax; i++) {
        if (i < length) {
            expectedValue += input[i];
        }
        else {
            tmpValue = input[i] - input[i - length];
            if (0 <= tmpValue) {
                expectedValue += tmpValue;
            }
            else {
                expectedValue += (tmpValue + 256);
            }
        }
    }
    return expectedValue;
}
function calcExpectedValueAverage(input, offset, length, pixelByte) {
    let expectedValue = 0;
    let tmpValue = 0;
    let left = 0;
    let up = 0;
    for (let i = offset, iMax = offset + length; i < iMax; i++) {
        left = up = 0;
        if (i >= pixelByte) {
            left = input[i - pixelByte];
        }
        if (i >= length) {
            up = input[i - length];
        }
        tmpValue = input[i] - (((left + up) / 2) | 0);
        if (0 <= tmpValue) {
            expectedValue += tmpValue;
        }
        else {
            expectedValue += (tmpValue + 256);
        }
    }
    return expectedValue;
}
function calcExpectedValuePaeth(input, offset, length, pixelByte) {
    let expectedValue = 0;
    let tmpValue = 0;
    let left = 0;
    let up = 0;
    let upleft = 0;
    for (let i = offset, iMax = offset + length; i < iMax; i++) {
        left = up = upleft = 0;
        if (i >= pixelByte && offset >= length) {
            left = input[i - pixelByte];
            up = input[i - length];
            upleft = input[i - length - pixelByte];
        }
        else if (i >= pixelByte) {
            left = input[i - pixelByte];
        }
        else if (i >= length) {
            up = input[i - length];
        }
        tmpValue = input[i] - calcPaeth(left, up, upleft);
        if (0 <= tmpValue) {
            expectedValue += tmpValue;
        }
        else {
            expectedValue += (tmpValue + 256);
        }
    }
    return expectedValue;
}

class PNG {
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
function parse(input, oprion) {
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
function pack(png, oprion) {
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

export { PNG, parse, pack, COLOR_TYPE };
