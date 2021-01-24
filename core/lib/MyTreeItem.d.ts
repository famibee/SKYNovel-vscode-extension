import { TreeItem, ExtensionContext } from 'vscode';
export interface TREEITEM_CFG {
    cmd: string;
    dbg?: boolean;
    icon: string;
    label: string;
    desc?: string;
    npm?: string;
    children?: TREEITEM_CFG[];
    forMac?: boolean;
}
export declare class MyTreeItem extends TreeItem {
    readonly cfg: TREEITEM_CFG;
    readonly dir: string;
    readonly ctx: ExtensionContext;
    readonly onClickTreeItemBtn: (ti: TreeItem, btn_nm: string, cfg: TREEITEM_CFG) => void;
    private _children;
    constructor(cfg: TREEITEM_CFG, dir: string, ctx: ExtensionContext, onClickTreeItemBtn: (ti: TreeItem, btn_nm: string, cfg: TREEITEM_CFG) => void);
    get children(): TreeItem[];
}
