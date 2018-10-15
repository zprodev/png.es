export function calcCrc32(
  input: Uint8Array,
  inputStart: number = 0,
  inputEnd?: number,
) {
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
    } else {
      tableValue = tableValue >>> 1;
    }
  }
  crc32table[i] = tableValue;
}
