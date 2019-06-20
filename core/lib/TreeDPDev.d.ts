import { TreeDataProvider, ExtensionContext, TreeItem, Event } from 'vscode';
export declare class TreeDPDev implements TreeDataProvider<TreeItem> {
    private readonly context;
    private readonly aTree;
    private oTreePrj;
    private readonly TreeChild;
    private oPfp;
    constructor(context: ExtensionContext);
    private fnc_onDidEndTaskProcess;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    private wsf2tree;
    private updLocalSNVer;
    private dspCryptMode;
    private fncDev;
    getTreeItem: (elm: TreeItem) => TreeItem;
    getChildren(elm?: TreeItem): Thenable<TreeItem[]>;
    dispose(): void;
}
