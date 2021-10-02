import { IFn2Path } from './CmnLib';
import { TextDocument, ExtensionContext, Range } from 'vscode';
export declare class CteScore {
    #private;
    readonly curPrj: string;
    static init(ctx: ExtensionContext): void;
    constructor(curPrj: string);
    updScore(path: string, curPrj: string, aToken: string[]): void;
    add_lay(_o: any): void;
    isSkipUpd(path: string): boolean;
    separation(path: string): void;
    combining(path: string): void;
    updLine(doc: TextDocument, rng: Range, txt: string, aToken: string[]): boolean;
    updWords(key: string, Words: Set<string>): void;
    updPath(hPath: IFn2Path): void;
    undefMacro(def_nm: string): void;
    defMacro(def_nm: string, hPrm: any): void;
}
