import { TreeItem, ExtensionContext } from 'vscode';
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
export declare class PrjTreeItem extends TreeItem {
    readonly cfg: TREEITEM_CFG;
    readonly dir: string;
    readonly ctx: ExtensionContext;
    readonly onClickTreeItemBtn: (ti: TreeItem, btn_nm: string, cfg: TREEITEM_CFG) => void;
    private _children;
    readonly exe: boolean;
    constructor(cfg: TREEITEM_CFG, dir: string, ctx: ExtensionContext, onClickTreeItemBtn: (ti: TreeItem, btn_nm: string, cfg: TREEITEM_CFG) => void);
    get children(): TreeItem[];
}
