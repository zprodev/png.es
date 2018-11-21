export function startsWith(base: Uint8Array, target: Uint8Array, baseIndex = 0) {
  const index = baseIndex;
  const length = target.length;
  for (let i = 0; i < length; i++) {
    if (base[i + index] !== target[i]) {
      return false;
    }
  }
  return true;
}

export function copy(base: Uint8Array, baseOffset: number, target: Uint8Array, targetOffset: number, length: number) {
  for (let i = 0; i < length; i++) {
    target[targetOffset + i] = base[baseOffset + i];
  }
}

export function readString(target: Uint8Array, offset: number, length: number) {
  let str = '';
  for (let i = 0; i < length; i++) {
    str += String.fromCharCode(target[i + offset]);
  }
  return str;
}

export function convertCodes(target: string) {
  const length = target.length;
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = target.charCodeAt(i);
  }
  return array;
}

export function readUint8(target: Uint8Array, offset: number) {
  return target[offset];
}

export function readUInt32BE(target: Uint8Array, offset: number) {
  return (target[offset] * 0x1000000) +
  ( (target[offset + 1] << 16) | (target[offset + 2] << 8) | target[offset + 3] );
}

export function writeUInt8(value: number, target: Uint8Array, offset: number) {
  target[offset] = value;
}

export function writeUInt32BE(value: number, target: Uint8Array, offset: number) {
  target[offset] = (value >>> 24);
  target[offset + 1] = (value >>> 16);
  target[offset + 2] = (value >>> 8);
  target[offset + 3] = (value & 0xff);
}

export function readBits(target: Uint8Array, offset: number, length: number) {
  const byteOffset = (offset / 8) | 0;
  const bitOffset = offset % 8;
  const bitOffsetFilter = 255 & (255 >>> bitOffset);
  // MEMO: length never crosses a byte boundary
  return (target[byteOffset] & bitOffsetFilter) >>> (8 - bitOffset - length);
}
