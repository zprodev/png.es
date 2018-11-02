import { FILTER_TYPE } from './const';
import { readUint8 } from './utils/Uint8ArrayUtil';
export function inflateFilter(data, width, height, bitDepth, colorType) {
    if (bitDepth !== 8) {
        throw new Error('Only bit depth 8 is supported');
    }
    const pixelByte = calcPixelByte(colorType, bitDepth);
    const lineByte = pixelByte * width;
    const pixelData = new Uint8Array(width * height * pixelByte);
    let dataIndex = 0;
    let pixelDataIndex = 0;
    let left = 0;
    let up = 0;
    let upleft = 0;
    for (let i = 0; i < height; i++) {
        const filterType = readUint8(data, dataIndex);
        dataIndex++;
        if (FILTER_TYPE.NONE === filterType) {
            for (let j = 0; j < lineByte; j++) {
                pixelData[pixelDataIndex + j] = data[dataIndex + j];
            }
        }
        else if (FILTER_TYPE.SUB === filterType) {
            for (let j = 0; j < lineByte; j++) {
                if (j < pixelByte) {
                    pixelData[pixelDataIndex + j] = data[dataIndex + j];
                }
                else {
                    pixelData[pixelDataIndex + j] = (pixelData[pixelDataIndex + j - pixelByte] + data[dataIndex + j]) % 256;
                }
            }
        }
        else if (FILTER_TYPE.UP === filterType) {
            for (let j = 0; j < lineByte; j++) {
                if (pixelDataIndex < lineByte) {
                    pixelData[pixelDataIndex + j] = data[dataIndex + j];
                }
                else {
                    pixelData[pixelDataIndex + j] = (pixelData[pixelDataIndex + j - lineByte] + data[dataIndex + j]) % 256;
                }
            }
        }
        else if (FILTER_TYPE.AVERAGE === filterType) {
            for (let j = 0; j < lineByte; j++) {
                left = up = 0;
                if (j >= pixelByte) {
                    left = pixelData[pixelDataIndex + j - pixelByte];
                }
                if (pixelDataIndex >= lineByte) {
                    up = pixelData[pixelDataIndex + j - lineByte];
                }
                pixelData[pixelDataIndex + j] = ((left + up) / 2 + data[dataIndex + j]) % 256;
            }
        }
        else if (FILTER_TYPE.PAETH === filterType) {
            for (let j = 0; j < lineByte; j++) {
                left = up = upleft = 0;
                if (j >= pixelByte && pixelDataIndex >= lineByte) {
                    left = pixelData[pixelDataIndex + j - pixelByte];
                    up = pixelData[pixelDataIndex + j - lineByte];
                    upleft = pixelData[pixelDataIndex + j - lineByte - pixelByte];
                }
                else if (j >= pixelByte) {
                    left = pixelData[pixelDataIndex + j - pixelByte];
                }
                else if (pixelDataIndex >= lineByte) {
                    up = pixelData[pixelDataIndex + j - lineByte];
                }
                pixelData[pixelDataIndex + j] = (calcPaeth(left, up, upleft) + data[dataIndex + j]) % 256;
            }
        }
        else {
            throw new Error('Unknown filter');
        }
        dataIndex += lineByte;
        pixelDataIndex += lineByte;
    }
    return pixelData;
}
export function deflateFilter(rawData, width, height, bitDepth, colorType) {
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
                if (rawDataIndex >= lineByte) {
                    up = rawData[rawDataIndex + j - lineByte];
                }
                data[dataIndex + j] = rawData[rawDataIndex + j] - (((left + up) / 2) | 0);
            }
        }
        else if (FILTER_TYPE.PAETH === filterType) {
            for (let j = 0; j < lineByte; j++) {
                left = up = upleft = 0;
                if (j >= pixelByte && rawDataIndex >= lineByte) {
                    left = rawData[rawDataIndex + j - pixelByte];
                    up = rawData[rawDataIndex + j - lineByte];
                    upleft = rawData[rawDataIndex + j - lineByte - pixelByte];
                }
                else if (j >= pixelByte) {
                    left = rawData[rawDataIndex + j - pixelByte];
                }
                else if (rawDataIndex >= lineByte) {
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
export function calcPixelByte(colorType, bitDepth) {
    let result = 0;
    if (0 === colorType) {
        result = bitDepth / 8;
    }
    else if (2 === colorType) {
        result = bitDepth / 8 * 3;
    }
    else if (3 === colorType) {
        throw new Error('IndexColor does not support');
    }
    else if (4 === colorType) {
        result = bitDepth / 8 * 2;
    }
    else if (6 === colorType) {
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
