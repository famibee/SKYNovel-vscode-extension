import { ExtensionContext, Uri } from 'vscode';
export declare class ReferenceProvider {
    private curPrj;
    private static readonly pickItems;
    private readonly clDiag;
    constructor(ctx: ExtensionContext, curPrj: string);
    private scanAllScript;
    crePrj(e: Uri): void;
    chgPrj(e: Uri): void;
    delPrj(e: Uri): void;
    private static hMacro;
    private readonly alzTagArg;
    private updPrj_file;
    private loadCfg;
    private compare;
    private hScript;
    private readonly REG_TAG_LET_ML;
    private resolveScript;
    private replaceScript_let_ml;
    readonly REG_TOKEN: RegExp;
    private readonly REG_MULTILINE_TAG;
    private static readonly REG_MULTILINE_TAG_SPLIT;
    private cnvMultilineTag;
    private readonly REG_TAG;
}
