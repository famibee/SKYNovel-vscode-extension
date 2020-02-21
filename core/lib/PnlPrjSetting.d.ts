import { ExtensionContext } from 'vscode';
export declare class PnlPrjSetting {
    readonly ctx: ExtensionContext;
    readonly dir: string;
    private readonly chgTitle;
    private readonly fnPrjJs;
    private readonly fnPkgJs;
    private readonly fnAppJs;
    private readonly localResourceRoots;
    private static htmSrc;
    constructor(ctx: ExtensionContext, dir: string, chgTitle: (title: string) => void);
    private oCfg;
    private pnlWV;
    open(): void;
    private inputProc;
    private readonly hRep;
}
