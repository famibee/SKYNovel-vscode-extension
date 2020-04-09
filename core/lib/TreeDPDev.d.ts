import { TreeDataProvider, ExtensionContext, TreeItem, Event } from 'vscode';
export declare class TreeDPDev implements TreeDataProvider<TreeItem> {
    private readonly ctx;
    private readonly aTiRoot;
    private readonly oTiPrj;
    private readonly TreeChild;
    private readonly idxDevPrjSet;
    private readonly idxDevTaskPackMac;
    private readonly idxDevCrypto;
    private oPfp;
    constructor(ctx: ExtensionContext);
    private fnc_onDidEndTaskProcess;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    private wsf2tree;
    private updLocalSNVer;
    private dspCryptoMode;
    private onClickTreeItemBtn;
    getTreeItem: (t: TreeItem) => TreeItem;
    getChildren(t?: TreeItem): Thenable<TreeItem[]>;
    dispose(): void;
}
