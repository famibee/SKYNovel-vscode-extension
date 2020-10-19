import { TreeDataProvider, TreeItem, ExtensionContext } from 'vscode';
export declare class TreeDPDoc implements TreeDataProvider<TreeItem> {
    private readonly ctx;
    private readonly aTreeTmp;
    private readonly aTiRoot;
    constructor(ctx: ExtensionContext);
    private generate;
    readonly getTreeItem: (t: TreeItem) => TreeItem;
    getChildren(t?: TreeItem): TreeItem[];
}
