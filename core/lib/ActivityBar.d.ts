import { TreeDataProvider, TreeItem, ExtensionContext, Event } from 'vscode';
export declare class ActivityBar implements TreeDataProvider<TreeItem> {
    private readonly ctx;
    static start(ctx: ExtensionContext): void;
    private static actBar;
    private static workSps;
    private static tlBox;
    static stop(): void;
    private readonly aDevEnv;
    private readonly aTiRoot;
    private aReady;
    private verNode;
    private constructor();
    private dispose;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    readonly getTreeItem: (t: TreeItem) => TreeItem;
    getChildren(t?: TreeItem): Thenable<TreeItem[]>;
    private cntErr;
    private refreshWork;
    private chkLastSNVer;
    private pnlWV;
    private activityBarBadge;
}
