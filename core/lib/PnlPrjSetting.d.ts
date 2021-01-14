import { CodingSupporter } from './CodingSupporter';
import { WorkspaceFolder, ExtensionContext } from 'vscode';
export declare class PnlPrjSetting {
    readonly ctx: ExtensionContext;
    readonly wsFld: WorkspaceFolder;
    private readonly chgTitle;
    private readonly codSpt;
    private readonly fnPrj;
    private readonly fnPrjJs;
    private readonly fnPkgJs;
    private readonly fnAppJs;
    private readonly fnInsNsh;
    private readonly fnIcon;
    private readonly fnReadme4Freem;
    private readonly localExtensionResRoots;
    private htmSrc;
    constructor(ctx: ExtensionContext, wsFld: WorkspaceFolder, chgTitle: (title: string) => void, codSpt: CodingSupporter);
    noticeCreDir(path: string): void;
    noticeDelDir(path: string): void;
    private oCfg;
    get cfg(): any;
    private pnlWV;
    open(): void;
    private openSub;
    private inputProc;
    private readonly hRep;
}
