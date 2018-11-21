import {calcCrc32} from './crc32';
import {convertCodes, copy, readString, readUInt32BE, startsWith, writeUInt32BE} from './utils/Uint8ArrayUtil';

export interface Chunk {
  type: string;
  data: Uint8Array;
}

const SIGNATURE = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

export function parseChunk(target: Uint8Array) {
  if (!startsWith(target, SIGNATURE, 0)) {
    throw new Error('Not PNG');
  }
  let targetIndex = SIGNATURE.length;
  const chunks = new Map<string, Chunk>();
  const targetLength = target.length;
  while (targetIndex < targetLength) {
    const chunk = readChunk(target, targetIndex);
    targetIndex += chunk.data.length + 12;
    if (chunk.type === 'IDAT' && chunks.has('IDAT')) {
      const baseData = chunks.get('IDAT') as Chunk;
      const newData = new Uint8Array(baseData.data.length + chunk.data.length);
      newData.set(baseData.data);
      newData.set(chunk.data, baseData.data.length);
      chunks.set('IDAT', {type: 'IDAT', data: newData });
    } else {
      chunks.set(chunk.type, chunk);
    }
    if (chunk.type === 'IEND') {
      break;
    }
  }
  return chunks;
}

export function packChunk(chunks: Map<string, Chunk>) {
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

function readChunk(target: Uint8Array, targetStart: number) {
  const chunkLength = readUInt32BE(target, targetStart);
  const chunkType = readString(target, targetStart + 4, 4);
  const buffer = target.slice(targetStart + 8, targetStart + 8 + chunkLength);
  return {
    type: chunkType,
    data: buffer,
  };
}
