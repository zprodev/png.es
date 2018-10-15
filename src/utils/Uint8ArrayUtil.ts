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

export function copy(base: Uint8Array, target: Uint8Array, targetOffset = 0) {
  const baseLength = base.length;
  for (let i = 0; i < baseLength; i++) {
    target[targetOffset + i] = base[i];
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
