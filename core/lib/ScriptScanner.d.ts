import { IFn2Path } from './CmnLib';
import { DiagnosticCollection, Location, Uri, Range, DocumentSymbol, TextDocumentChangeEvent } from 'vscode';
interface MacDef {
    loc: Location;
    hPrm: any;
}
export declare class ScriptScanner {
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
    private readonly hSetWords;
    cnvSnippet: (s: string, _cur_fn: string) => string;
    readonly hPreWords: {
        [key: string]: string;
    };
    private hFn2JumpSnippet;
    private bldCnvSnippet;
    private static readonly sPredefWrtVar;
    private nm2Diag;
    private isDuplicateMacroDef;
    private wasDuplicateMacroDef;
    hSn2aDsOutline: {
        [sn: string]: DocumentSymbol[];
    };
    aDsOutline: DocumentSymbol[];
    goAll(): void;
    goFile(uri: Uri): void;
    private hScr2KeyWord;
    goScriptSrc(aChgTxt: TextDocumentChangeEvent[]): void;
    private goInitFile;
    private hMacroOld;
    private aMacroAdd;
    private goFinishFile;
    isSkipUpd(path: string): boolean;
    private static readonly REG_SPRITE;
    private static readonly REG_NOSPR;
    private static readonly REG_SOUND;
    private static readonly REG_HTML;
    private scanFile;
    private readonly cteScore;
    updPath(hPath: IFn2Path): void;
    private readonly alzTagArg;
    private static readonly regValName;
    private scanScriptSrc;
    private fncToken;
    private procToken;
    private readonly hTagProc;
    private readonly aDsOutlineStack;
    private static splitAmpersand;
    private static readonly REG_TAG_LET_ML;
    private resolveScript;
    private replaceScript_let_ml;
    static readonly REG_TAG: RegExp;
    static analyzTagArg: (token: string) => RegExpExecArray | null;
    analyzToken(token: string): RegExpExecArray | null;
    private REG_TOKEN;
    setEscape(ce: string): void;
}
export {};
