import { IFn2Path } from './CmnLib';
import { DiagnosticCollection, Location, Uri, Range, DocumentSymbol, TextDocumentChangeEvent } from 'vscode';
interface MacDef {
    loc: Location;
    hPrm: any;
}
export declare class ScriptScanner {
    #private;
    private readonly curPrj;
    private readonly clDiag;
    private readonly hTag;
    constructor(curPrj: string, clDiag: DiagnosticCollection, hTag: {
        [name: string]: boolean;
    });
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
    static readonly REG_TAG: RegExp;
    static analyzTagArg: (token: string) => RegExpExecArray | null;
    analyzToken(token: string): RegExpExecArray | null;
    setEscape(ce: string): void;
}
export {};
