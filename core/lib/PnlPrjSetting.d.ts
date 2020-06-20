import { CodingSupporter } from './CodingSupporter';
import { ExtensionContext } from 'vscode';
export declare class PnlPrjSetting {
    readonly ctx: ExtensionContext;
    readonly pathWs: string;
    private readonly chgTitle;
    private readonly codSpt;
    private readonly fnPrj;
    private readonly fnPrjJs;
    private readonly fnPkgJs;
    private readonly fnAppJs;
    private readonly fnReadme4Freem;
    private readonly localResourceRoots;
    private static htmSrc;
    constructor(ctx: ExtensionContext, pathWs: string, chgTitle: (title: string) => void, codSpt: CodingSupporter);
    private oCfg;
    get cfg(): any;
    private pnlWV;
    open(): void;
    private openSub;
    private inputProc;
    private readonly hRep;
}
