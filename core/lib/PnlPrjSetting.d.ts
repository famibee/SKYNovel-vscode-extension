import { CodingSupporter } from './CodingSupporter';
import { ExtensionContext } from 'vscode';
export declare class PnlPrjSetting {
    readonly ctx: ExtensionContext;
    readonly dir: string;
    private readonly chgTitle;
    private readonly ss;
    private readonly fnPrj;
    private readonly fnPrjJs;
    private readonly fnPkgJs;
    private readonly fnAppJs;
    private readonly localResourceRoots;
    private static htmSrc;
    constructor(ctx: ExtensionContext, dir: string, chgTitle: (title: string) => void, ss: CodingSupporter);
    private oCfg;
    get cfg(): any;
    private pnlWV;
    open(): void;
    private openSub;
    private inputProc;
    private readonly hRep;
}
