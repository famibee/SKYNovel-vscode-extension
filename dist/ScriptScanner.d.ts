import { IFn2Path } from './CmnLib';
import { DiagnosticCollection, Location, Uri, Range, DocumentSymbol, TextDocumentChangeEvent } from 'vscode';
interface MacDef {
    loc: Location;
    hPrm: any;
}
export declare type TFONT2STR = {
    [font_nm: string]: string;
};
export declare type TINF_FONT2STR = {
    defaultFontName: string;
    hSn2Font2Str: {
        [sn: string]: {
            [font_nm: string]: string;
        };
    };
    hFontNm2Path: {
        [font_nm: string]: string;
    };
};
export declare type TINF_FONT_CHK = {
    font_nm: string;
    err: string;
};
export declare class ScriptScanner {
    #private;
    readonly pathWs: string;
    private readonly curPrj;
    private readonly clDiag;
    private readonly hTag;
    private cmd;
    constructor(pathWs: string, curPrj: string, clDiag: DiagnosticCollection, hTag: {
        [name: string]: boolean;
    }, cmd: (nm: string, val: string) => Promise<boolean>);
    hPlugin: {
        [tm: string]: Location;
    };
    hMacro: {
        [nm: string]: MacDef;
    };
    hMacroUse: {
        [nm: string]: Location[];
    };
    hMacroUse4NoWarm: {
        [nm: string]: Location[];
    };
    hTagMacroUse: {
        [fn: string]: {
            nm: string;
            rng: Range;
        }[];
    };
    cnvSnippet: (s: string, _cur_fn: string) => string;
    readonly hPreWords: {
        [key: string]: string;
    };
    hSn2aDsOutline: {
        [sn: string]: DocumentSymbol[];
    };
    goAll(): void;
    goFile(uri: Uri): void;
    chgTxtDoc(aChgTxt: TextDocumentChangeEvent[]): void;
    isSkipUpd(path: string): boolean;
    updPath(hPath: IFn2Path): void;
    getInfFont2Str(): TINF_FONT2STR;
    static readonly DEF_FONT = ":DEF_FONT:";
    static readonly REG_TAG: RegExp;
    static analyzTagArg: (token: string) => RegExpExecArray | null;
    analyzToken(token: string): RegExpExecArray | null;
    setEscape(ce: string): void;
}
export {};
