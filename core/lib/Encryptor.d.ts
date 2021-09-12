import { lib } from 'crypto-js';
import { IDecryptInfo } from './CmnLib';
export declare class Encryptor {
    private readonly hPass;
    private readonly pbkdf2;
    private readonly iv;
    constructor(hPass: IDecryptInfo);
    get strHPass(): string;
    uuidv5(short_path: string): string;
    enc(s: string | lib.WordArray): string;
    dec(s: string): string;
}
