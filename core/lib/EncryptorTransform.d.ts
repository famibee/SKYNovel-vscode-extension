/// <reference types="node" />
import { Transform } from 'stream';
import { Encryptor } from './Encryptor';
export declare class EncryptorTransform extends Transform {
    #private;
    private readonly encry;
    readonly short_path: string;
    constructor(encry: Encryptor, short_path: string);
    _transform(chunk: any, _enc: BufferEncoding, cb: () => void): void;
    _final(cb: () => void): void;
}
