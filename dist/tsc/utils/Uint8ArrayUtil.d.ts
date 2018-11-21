export declare function startsWith(base: Uint8Array, target: Uint8Array, baseIndex?: number): boolean;
export declare function copy(base: Uint8Array, baseOffset: number, target: Uint8Array, targetOffset: number, length: number): void;
export declare function readString(target: Uint8Array, offset: number, length: number): string;
export declare function convertCodes(target: string): Uint8Array;
export declare function readUint8(target: Uint8Array, offset: number): number;
export declare function readUInt32BE(target: Uint8Array, offset: number): number;
export declare function writeUInt8(value: number, target: Uint8Array, offset: number): void;
export declare function writeUInt32BE(value: number, target: Uint8Array, offset: number): void;
export declare function readBits(target: Uint8Array, offset: number, length: number): number;
