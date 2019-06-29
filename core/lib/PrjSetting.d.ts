import { ExtensionContext } from 'vscode';
export declare class PrjSetting {
    readonly ctx: ExtensionContext;
    readonly dir: string;
    private readonly chgTitle;
    private readonly fnPrjJs;
    private readonly fnPkgJs;
    private readonly localResourceRoots;
    constructor(ctx: ExtensionContext, dir: string, chgTitle: (title: string) => void);
    private oCfg;
    private pnlWV;
    private open;
    private inputProc;
    private readonly hRep;
}
