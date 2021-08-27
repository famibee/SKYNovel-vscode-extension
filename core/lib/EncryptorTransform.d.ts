/// <reference types="node" />
import { Transform } from 'stream';
import { Encryptor } from './Encryptor';
export declare class EncryptorTransform extends Transform {
    private readonly encry;
    readonly short_path: string;
    private static readonly LEN_ENC;
    private cnt_code;
    private ite_buf;
    private bh;
    private readonly hExt2N;
    constructor(encry: Encryptor, short_path: string);
    _transform(chunk: any, _enc: BufferEncoding, cb: () => void): void;
    _final(cb: () => void): void;
    private codeArea;
}
