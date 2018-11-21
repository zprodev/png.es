export function startsWith(base, target, baseIndex = 0) {
    const index = baseIndex;
    const length = target.length;
    for (let i = 0; i < length; i++) {
        if (base[i + index] !== target[i]) {
            return false;
        }
    }
    return true;
}
export function copy(base, baseOffset, target, targetOffset, length) {
    for (let i = 0; i < length; i++) {
        target[targetOffset + i] = base[baseOffset + i];
    }
}
export function readString(target, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
        str += String.fromCharCode(target[i + offset]);
    }
    return str;
}
export function convertCodes(target) {
    const length = target.length;
    const array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        array[i] = target.charCodeAt(i);
    }
    return array;
}
export function readUint8(target, offset) {
    return target[offset];
}
export function readUInt32BE(target, offset) {
    return (target[offset] * 0x1000000) +
        ((target[offset + 1] << 16) | (target[offset + 2] << 8) | target[offset + 3]);
}
export function writeUInt8(value, target, offset) {
    target[offset] = value;
}
export function writeUInt32BE(value, target, offset) {
    target[offset] = (value >>> 24);
    target[offset + 1] = (value >>> 16);
    target[offset + 2] = (value >>> 8);
    target[offset + 3] = (value & 0xff);
}
export function readBits(target, offset, length) {
    const byteOffset = (offset / 8) | 0;
    const bitOffset = offset % 8;
    const bitOffsetFilter = 255 & (255 >>> bitOffset);
    // MEMO: length never crosses a byte boundary
    return (target[byteOffset] & bitOffsetFilter) >>> (8 - bitOffset - length);
}
