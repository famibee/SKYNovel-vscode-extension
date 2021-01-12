import { TreeItem, ExtensionContext } from 'vscode';
export interface TREEITEM_CFG {
    cmd: string;
    icon: string;
    label: string;
    desc?: string;
    npm?: string;
    children?: TREEITEM_CFG[];
    forMac?: boolean;
}
export declare class MyTreeItem extends TreeItem {
    private _children;
    constructor(cfg: TREEITEM_CFG, dir: string, ctx: ExtensionContext, onClickTreeItemBtn: (ti: TreeItem, cfg: TREEITEM_CFG) => void);
    get children(): TreeItem[];
}
