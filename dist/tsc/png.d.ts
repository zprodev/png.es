export interface RGBA {
    r?: number;
    g?: number;
    b?: number;
    a?: number;
}
export declare class PNG {
    private _data;
    private _width;
    private _height;
    private _bitDepth;
    private _colorType;
    constructor(width: number, height: number, colorType?: number, bitDepth?: number);
    readonly data: Uint8Array;
    readonly width: number;
    readonly height: number;
    readonly colorType: number;
    readonly bitDepth: number;
    setData(data: Uint8Array): void;
    getPixel(x: number, y: number): RGBA;
    setPixel(x: number, y: number, rgba: RGBA): void;
}
export declare function parse(input: Uint8Array, oprion?: {
    inflate?: (data: Uint8Array) => Uint8Array;
}): PNG;
export declare function pack(png: PNG, oprion?: {
    deflate?: (data: Uint8Array) => Uint8Array;
}): Uint8Array;
