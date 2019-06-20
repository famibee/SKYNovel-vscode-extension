import { ExtensionContext, Uri } from 'vscode';
export declare class ReferenceProvider {
    private static readonly pickItems;
    constructor(context: ExtensionContext, curPrj: string);
    private static hMacro;
    private readonly alzTagArg;
    private updPrj_file;
    crePrj(e: Uri): void;
    chgPrj(e: Uri): void;
    delPrj(e: Uri): void;
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
