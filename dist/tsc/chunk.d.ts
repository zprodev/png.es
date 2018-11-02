export interface Chunk {
    type: string;
    data: Uint8Array;
}
export declare function parseChunk(target: Uint8Array): Map<string, Chunk>;
export declare function packChunk(chunks: Map<string, Chunk>): Uint8Array;
