import { TreeDataProvider, ExtensionContext, TreeItem, Event } from 'vscode';
export declare class WorkSpaces implements TreeDataProvider<TreeItem> {
    private readonly ctx;
    private readonly chkLastVerSKYNovel;
    private readonly aTiRoot;
    private readonly oTiPrj;
    private readonly TreeChild;
    private readonly idxDevPrjSet;
    private readonly idxDevTaskPackMac;
    private readonly idxDevCrypto;
    private oPfp;
    constructor(ctx: ExtensionContext, chkLastVerSKYNovel: () => void);
    private tidDelay;
    private trgUpdDeco;
    private teActive;
    private decChars;
    private updDeco;
    private fnc_onDidEndTaskProcess;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    private makePrj;
    private updLocalSNVer;
    private dspCryptoMode;
    private onClickTreeItemBtn;
    getTreeItem: (t: TreeItem) => TreeItem;
    getChildren(t?: TreeItem): Thenable<TreeItem[]>;
    dispose(): void;
}
