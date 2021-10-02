import { TreeItem, ExtensionContext, WorkspaceFolder } from 'vscode';
export interface TREEITEM_CFG {
    cmd: string;
    exe?: boolean;
    icon: string;
    label: string;
    desc?: string;
    npm?: string;
    children?: TREEITEM_CFG[];
    forMac?: boolean;
}
declare type ON_BTN = (ti: TreeItem, btn_nm: string, cfg: TREEITEM_CFG) => void;
export declare class PrjTreeItem extends TreeItem {
    #private;
    readonly cfg: TREEITEM_CFG;
    private readonly pathWs;
    readonly ctx: ExtensionContext;
    static create(ctx: ExtensionContext, wsFld: WorkspaceFolder, onBtn: ON_BTN): PrjTreeItem;
    private constructor();
    private static regCmds;
    get children(): TreeItem[];
}
export {};
