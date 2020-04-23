import { TreeDataProvider, TreeItem, ExtensionContext } from 'vscode';
export declare class TreeDPDoc implements TreeDataProvider<TreeItem> {
    readonly ctx: ExtensionContext;
    private readonly aTiRoot;
    private readonly aTiTemp;
    private readonly aTiFamibee;
    private readonly aTiVSCodeEx;
    constructor(ctx: ExtensionContext);
    getTreeItem: (t: TreeItem) => TreeItem;
    getChildren(t?: TreeItem): Thenable<TreeItem[]>;
}
