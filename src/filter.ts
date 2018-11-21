import {COLOR_TYPE, FILTER_TYPE} from './const';
import {copy, readBits} from './utils/Uint8ArrayUtil';

export function inflateFilter(
  data: Uint8Array,
  width: number,
  height: number,
  bitDepth: number,
  colorType: number,
  palette: Uint8Array | undefined,
  transparency: Uint8Array | undefined,
) {
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
      for (let x = 0; x < linePropsNum; ++x ) {
        const value = readBits(data, dataIndex + x * bitDepth, bitDepth);
        // TODO: 効率化
        if (palette !== undefined && colorType === COLOR_TYPE.INDEX) {
          copy(palette, value * 3, result, resultIndex + x * 4, 3);
          if (transparency !== undefined && transparency[value] !== undefined) {
            result[resultIndex + x * 4 + 3] = transparency[value];
          } else {
            result[resultIndex + x * 4 + 3] = 255;
          }
        } else {
          result[resultIndex + x] = value;
        }
      }
    } else if (FILTER_TYPE.SUB === filterType) {
      for (let x = 0; x < linePropsNum; ++x ) {
        if (x < pixelPropsNum) {
          result[resultIndex + x] = readBits(data, dataIndex + x * bitDepth, bitDepth);
        } else {
          result[resultIndex + x] =
          (result[resultIndex + x - pixelPropsNum] + readBits(data, dataIndex + x * bitDepth, bitDepth)) % 256;
        }
      }
    } else if (FILTER_TYPE.UP === filterType) {
      for (let x = 0; x < linePropsNum; x++) {
        if (resultIndex < linePropsNum) {
          result[resultIndex + x] = readBits(data, dataIndex + x * bitDepth, bitDepth);
        } else {
          result[resultIndex + x] =
          (result[resultIndex + x - linePropsNum] + readBits(data, dataIndex + x * bitDepth, bitDepth)) % 256;
        }
      }
    } else if (FILTER_TYPE.AVERAGE === filterType) {
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
    } else if (FILTER_TYPE.PAETH === filterType) {
      for (let x = 0; x < linePropsNum; x++) {
        left = up = upleft = 0;
        if (x >= pixelPropsNum && resultIndex >= linePropsNum) {
          left = result[resultIndex + x - pixelPropsNum];
          up = result[resultIndex + x - linePropsNum];
          upleft = result[resultIndex + x - pixelPropsNum - linePropsNum];
        } else if (x >= pixelPropsNum) {
          left = result[resultIndex + x - pixelPropsNum];
        } else if (resultIndex >= linePropsNum) {
          up = result[resultIndex + x - linePropsNum];
        }
        result[resultIndex + x] =
        (calcPaeth(left, up, upleft) + readBits(data, dataIndex + x * bitDepth, bitDepth)) % 256;
      }
    } else {
      throw new Error('Unknown filter');
    }
    if (lineBitLen % 8 === 0) {
      dataIndex += lineBitLen;
    } else {
      dataIndex += lineBitLen + (8 - lineBitLen % 8);
    }
    resultIndex += resultLineByte;
  }
  return result;
}

export function deflateFilter(
  rawData: Uint8Array,
  width: number,
  height: number,
  bitDepth: number,
  colorType: number,
) {
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
    } else if (FILTER_TYPE.SUB === filterType) {
      for (let j = 0; j < lineByte; j++) {
        if (j < pixelByte) {
          data[dataIndex + j] = rawData[rawDataIndex + j];
        } else {
          data[dataIndex + j] = rawData[rawDataIndex + j] - rawData[rawDataIndex + j - pixelByte];
        }
      }
    } else if (FILTER_TYPE.UP === filterType) {
      for (let j = 0; j < lineByte; j++) {
        if (dataIndex < lineByte) {
          data[dataIndex + j] = rawData[rawDataIndex + j];
        } else {
          data[dataIndex + j] = rawData[rawDataIndex + j] - rawData[rawDataIndex + j - lineByte];
        }
      }

    } else if (FILTER_TYPE.AVERAGE === filterType) {
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
    } else if (FILTER_TYPE.PAETH === filterType) {
      for (let j = 0; j < lineByte; j++) {
        left = up = upleft = 0;
        if (j >= pixelByte && dataIndex >= lineByte) {
          left = rawData[rawDataIndex + j - pixelByte];
          up = rawData[rawDataIndex + j - lineByte];
          upleft = rawData[rawDataIndex + j - pixelByte - lineByte];
        } else if (j >= pixelByte) {
          left = rawData[rawDataIndex + j - pixelByte];
        } else if (dataIndex >= lineByte) {
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

export function calcPixelPropsLen(colorType: number) {
  let result = 0;
  if (COLOR_TYPE.GRAY === colorType) {
    // GrayScale
    result = 1;
  } else if (COLOR_TYPE.RGB === colorType) {
    // RGB
    result = 3;
  } else if (COLOR_TYPE.INDEX === colorType) {
    // Index
    result = 1;
  } else if (COLOR_TYPE.GRAY_ALPHA === colorType) {
    // GrayScale Alpha
    result = 2;
  } else if (COLOR_TYPE.RGBA === colorType) {
    // RGBA
    result = 4;
  } else {
    throw new Error('Unknown colorType');
  }
  return result;
}

export function calcPixelByte(colorType: number, bitDepth: number) {
  let result = 0;
  if (COLOR_TYPE.GRAY === colorType) {
    result = bitDepth / 8;
  } else if (COLOR_TYPE.RGB === colorType) {
    result = bitDepth / 8 * 3;
  } else if (COLOR_TYPE.INDEX === colorType) {
    result = 4;
  } else if (COLOR_TYPE.GRAY_ALPHA === colorType) {
    result = bitDepth / 8 * 2;
  } else if (COLOR_TYPE.RGBA === colorType) {
    result = bitDepth / 8 * 4;
  } else {
    throw new Error('Unknown colorType');
  }
  return result;
}

function calcPaeth(left: number, up: number, upleft: number) {
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

function calcExpectedValueNone(input: Uint8Array, offset: number, length: number) {
  let expectedValue = 0;
  for (let i = offset, iMax = offset + length; i < iMax; i++) {
    expectedValue += input[i];
  }
  return expectedValue;
}

function calcExpectedValueSub(input: Uint8Array, offset: number, length: number) {
  let expectedValue = 0;
  let tmpValue = 0;
  for (let i = offset, iMax = offset + length; i < iMax; i++) {
    if (i < length) {
      expectedValue += input[i];
    } else {
      tmpValue = input[i] - input[i - length];
      if (0 <= tmpValue) {
        expectedValue += tmpValue;
      } else {
        expectedValue += (tmpValue +  256);
      }
    }
  }
  return expectedValue;
}

function calcExpectedValueUp(input: Uint8Array, offset: number, length: number) {
  let expectedValue = 0;
  let tmpValue = 0;
  for (let i = offset, iMax = offset + length; i < iMax; i++) {
    if (i < length) {
      expectedValue += input[i];
    } else {
      tmpValue = input[i] - input[i - length];
      if (0 <= tmpValue) {
        expectedValue += tmpValue;
      } else {
        expectedValue += (tmpValue +  256);
      }
    }
  }
  return expectedValue;
}
function calcExpectedValueAverage(input: Uint8Array, offset: number, length: number, pixelByte: number) {
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
    } else {
      expectedValue += (tmpValue +  256);
    }
  }
  return expectedValue;
}
function calcExpectedValuePaeth(input: Uint8Array, offset: number, length: number, pixelByte: number) {
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
    } else if (i >= pixelByte) {
      left = input[i - pixelByte];
    } else if (i >= length) {
      up = input[i - length];
    }
    tmpValue = input[i] - calcPaeth(left, up, upleft);
    if (0 <= tmpValue) {
      expectedValue += tmpValue;
    } else {
      expectedValue += (tmpValue +  256);
    }
  }
  return expectedValue;
}
