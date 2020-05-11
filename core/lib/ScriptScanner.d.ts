import { DiagnosticCollection, Location, Uri, Range } from 'vscode';
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
        [mm: string]: Location;
    };
    hMacroUse: {
        [mm: string]: Location[];
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
    goAll(): void;
    goFile(uri: Uri): void;
    private hScr2KeyWord;
    goScriptSrc(uri: Uri, src: string): void;
    private goInitFile;
    private goFinishFile;
    private static readonly EXT_SPRITE;
    private static readonly EXT_SOUND;
    private static readonly EXT_HTML;
    private scanFile;
    private readonly alzTagArg;
    private static readonly regValName;
    private scanScriptSrc;
    private fncToken;
    private procToken;
    private readonly hTagProc;
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
