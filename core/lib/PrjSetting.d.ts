import { ExtensionContext } from 'vscode';
export declare class PrjSetting {
    readonly context: ExtensionContext;
    readonly dir: string;
    private buf_doc;
    private readonly fnPrjJs;
    private readonly fnPkgJs;
    private readonly localResourceRoots;
    constructor(context: ExtensionContext, dir: string);
    private oCfg;
    private pnlWV;
    private open;
    private inputProc;
    private readonly hRep;
}
