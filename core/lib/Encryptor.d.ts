import { lib } from 'crypto-js';
import { IDecryptInfo } from './CmnLib';
export declare class Encryptor {
    #private;
    private readonly hPass;
    constructor(hPass: IDecryptInfo);
    get strHPass(): string;
    uuidv5(short_path: string): string;
    enc(s: string | lib.WordArray): string;
    dec(s: string): string;
}
