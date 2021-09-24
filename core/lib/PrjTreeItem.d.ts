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
    readonly cfg: TREEITEM_CFG;
    private readonly pathWs;
    readonly ctx: ExtensionContext;
    private static readonly aTreeTmp;
    static create(ctx: ExtensionContext, wsFld: WorkspaceFolder, onBtn: ON_BTN): PrjTreeItem;
    private static hPathWs2onBtn;
    private _children;
    private constructor();
    private static regCmds;
    private static regCmd;
    get children(): TreeItem[];
}
export {};
