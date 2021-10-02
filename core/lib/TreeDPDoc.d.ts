import { TreeDataProvider, TreeItem, ExtensionContext } from 'vscode';
export declare class TreeDPDoc implements TreeDataProvider<TreeItem> {
    #private;
    private readonly ctx;
    constructor(ctx: ExtensionContext);
    readonly getTreeItem: (t: TreeItem) => TreeItem;
    getChildren(t?: TreeItem): TreeItem[];
}
