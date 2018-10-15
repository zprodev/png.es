import {FILTER_TYPE} from './const';
import {readUint8} from './utils/Uint8ArrayUtil';

export function inflateFilter(
  data: Uint8Array,
  width: number,
  height: number,
  bitDepth: number,
  colorType: number,
) {
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
  const lineLength = width * pixelByte;
  for (let i = 0; i < height; i++) {
    const filterType = readUint8(data, dataIndex);
    dataIndex++;
    if (FILTER_TYPE.NONE === filterType) {
      for (let j = 0; j < lineLength; j++) {
        pixelData[pixelDataIndex + j] = data[dataIndex + j];
      }
    } else if (FILTER_TYPE.SUB === filterType) {
      for (let j = 0; j < lineLength; j++) {
        if (j < pixelByte) {
          pixelData[pixelDataIndex + j] = data[dataIndex + j];
        } else {
          pixelData[pixelDataIndex + j] = (pixelData[pixelDataIndex + j - pixelByte] + data[dataIndex + j]) % 256;
        }
      }
    } else if (FILTER_TYPE.UP === filterType) {
      for (let j = 0; j < lineLength; j++) {
        if (pixelDataIndex < lineByte) {
          pixelData[pixelDataIndex + j] = data[dataIndex + j];
        } else {
          pixelData[pixelDataIndex + j] = (pixelData[pixelDataIndex + j - lineByte] + data[dataIndex + j]) % 256;
        }
      }
    } else if (FILTER_TYPE.AVERAGE === filterType) {
      for (let j = 0; j < lineLength; j++) {
        left = up = 0;
        if (j >= pixelByte) {
          left = pixelData[pixelDataIndex + j - pixelByte];
        }
        if (pixelDataIndex >= lineByte) {
          up = pixelData[pixelDataIndex + j - lineByte];
        }
        pixelData[pixelDataIndex + j] = ((left + up) / 2 + data[dataIndex + j]) % 256;
      }
    } else if (FILTER_TYPE.PAETH === filterType) {
      for (let j = 0; j < lineLength; j++) {
        left = up = upleft = 0;
        if (j >= pixelByte && pixelDataIndex >= lineByte) {
          left = pixelData[pixelDataIndex + j - pixelByte];
          up = pixelData[pixelDataIndex + j - lineByte];
          upleft = pixelData[pixelDataIndex + j - lineByte - pixelByte];
        } else if (j >= pixelByte) {
          left = pixelData[pixelDataIndex + j - pixelByte];
        } else if (pixelDataIndex >= lineByte) {
          up = pixelData[pixelDataIndex + j - lineByte];
        }
        pixelData[pixelDataIndex + j] = (calcPaeth(left, up, upleft) + data[dataIndex + j]) % 256;
      }
    } else {
      throw new Error('Unknown filter');
    }
    dataIndex += lineLength;
    pixelDataIndex += lineLength;
  }
  return pixelData;
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
  for (let i = 0; i < height; i++) {
    // TODO:filtering
    dataIndex++;
    for (let j = 0; j < lineByte; j++) {
      data[dataIndex + j] = rawData[rawDataIndex + j];
    }
    dataIndex += lineByte;
    rawDataIndex += lineByte;
  }
  return data;
}

export function calcPixelByte(colorType: number, bitDepth: number) {
  let result = 0;
  if (0 === colorType) {
    result = bitDepth / 8;
  } else if (2 === colorType) {
    result = bitDepth / 8 * 3;
  } else if (3 === colorType) {
    throw new Error('IndexColor does not support');
  } else if (4 === colorType) {
    result = bitDepth / 8 * 2;
  } else if (6 === colorType) {
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
