import { TreeDataProvider, ExtensionContext, TreeItem, Event } from 'vscode';
export declare class TreeDPDev implements TreeDataProvider<TreeItem> {
    private readonly ctx;
    private readonly aTree;
    private oTreePrj;
    private readonly TreeChild;
    private readonly idxDevPrjSet;
    private readonly idxDevTaskPackMac;
    private readonly idxDevCrypt;
    private oPfp;
    constructor(ctx: ExtensionContext);
    private fnc_onDidEndTaskProcess;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    private wsf2tree;
    private updLocalSNVer;
    private dspCryptMode;
    private onClickTreeItemBtn;
    getTreeItem: (elm: TreeItem) => TreeItem;
    getChildren(elm?: TreeItem): Thenable<TreeItem[]>;
    dispose(): void;
}
