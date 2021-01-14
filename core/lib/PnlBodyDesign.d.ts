import { WorkspaceFolder, ExtensionContext } from 'vscode';
export declare class PnlBodyDesign {
    readonly ctx: ExtensionContext;
    private readonly wsFld;
    private readonly fnPrj;
    private readonly fnBodySn;
    private readonly localExtensionResRoots;
    private htmSrc;
    constructor(ctx: ExtensionContext, wsFld: WorkspaceFolder);
    private snBody;
    private pnlWV;
    open(): void;
    private openSub;
    private inputProc;
    private readonly hRep;
}
