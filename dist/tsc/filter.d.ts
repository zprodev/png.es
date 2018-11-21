export declare function inflateFilter(data: Uint8Array, width: number, height: number, bitDepth: number, colorType: number, palette: Uint8Array | undefined, transparency: Uint8Array | undefined): Uint8Array;
export declare function deflateFilter(rawData: Uint8Array, width: number, height: number, bitDepth: number, colorType: number): Uint8Array;
export declare function calcPixelPropsLen(colorType: number): number;
export declare function calcPixelByte(colorType: number, bitDepth: number): number;
