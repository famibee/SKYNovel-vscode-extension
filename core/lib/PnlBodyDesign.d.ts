import { ExtensionContext } from 'vscode';
export declare class PnlBodyDesign {
    readonly ctx: ExtensionContext;
    readonly pathWs: string;
    private readonly fnPrj;
    private readonly fnBodySn;
    private readonly localExtensionResRoots;
    private htmSrc;
    constructor(ctx: ExtensionContext, pathWs: string);
    private snBody;
    private pnlWV;
    open(): void;
    private openSub;
    private inputProc;
    private readonly hRep;
}
