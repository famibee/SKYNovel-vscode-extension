import { TreeDataProvider, ExtensionContext, TreeItem, Event } from 'vscode';
export declare class WorkSpaces implements TreeDataProvider<TreeItem> {
    private readonly ctx;
    private readonly chkLastVerSKYNovel;
    private readonly aTiRoot;
    private readonly oTiPrj;
    private readonly aTreeTmp;
    private readonly idxDevPrjSet;
    private readonly idxDevCrypto;
    private hPrj;
    constructor(ctx: ExtensionContext, chkLastVerSKYNovel: () => void);
    private tidDelay;
    private onUpdDoc;
    private teActive;
    private decChars;
    private static readonly REG_FN_OR_LABEL;
    private updDeco;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    private makePrj;
    private updLocalSNVer;
    private dspCryptoMode;
    private hOnEndTask;
    private onClickTreeItemBtn;
    getTreeItem: (t: TreeItem) => TreeItem;
    getChildren: (t?: TreeItem | undefined) => TreeItem[];
    dispose(): void;
}
