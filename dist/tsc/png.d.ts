export { COLOR_TYPE } from './const';
export declare class PNG {
    private _data;
    private _width;
    private _height;
    private _bitDepth;
    private _colorType;
    private _pixelPropsNum;
    constructor(width: number, height: number, colorType?: number, bitDepth?: number);
    readonly data: Uint8Array;
    readonly width: number;
    readonly height: number;
    readonly colorType: number;
    readonly bitDepth: number;
    readonly pixelLength: number;
    setData(data: Uint8Array): void;
    getPixel(x: number, y: number): number[];
    setPixel(x: number, y: number, pixelData: number[]): void;
}
export declare function parse(input: Uint8Array, oprion?: {
    inflate?: (data: Uint8Array) => Uint8Array;
}): PNG;
export declare function pack(png: PNG, oprion?: {
    deflate?: (data: Uint8Array) => Uint8Array;
}): Uint8Array;
