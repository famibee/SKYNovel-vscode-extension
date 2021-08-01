/// <reference types="node" />
import { Transform } from 'stream';
import { WriteStream } from 'fs-extra';
import { Encryptor } from './Encryptor';
export declare class EncryptorTransform extends Transform {
    private readonly encry;
    readonly short_path: string;
    private readonly ws;
    private static readonly LEN_ENC;
    private cnt_code;
    private ite_buf;
    private bh;
    private readonly hExt2N;
    constructor(encry: Encryptor, short_path: string, ws: WriteStream);
    private transform;
    end(): void;
}
