import { ExtensionContext, Uri } from 'vscode';
export declare class ReferenceProvider {
    private context;
    private static readonly pickItems;
    constructor(context: ExtensionContext);
    private static hMacro;
    private readonly alzTagArg;
    updPrj(wd: string): void;
    private updPrj_file;
    chgPrj(e: Uri): void;
    repPrj(e: Uri): void;
    private delPrj;
    private loadCfg;
    private compare;
    private hScript;
    private readonly REG_TAG_LET_ML;
    private resolveScript;
    private replaceScript_let_ml;
    private openPallet;
    readonly REG_TOKEN: RegExp;
    private readonly REG_MULTILINE_TAG;
    private static readonly REG_MULTILINE_TAG_SPLIT;
    private cnvMultilineTag;
    private readonly REG_TAG;
}
