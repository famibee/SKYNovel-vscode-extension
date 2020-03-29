import { TreeDataProvider, TreeItem, ExtensionContext, Event } from 'vscode';
export declare class ActivityBar implements TreeDataProvider<TreeItem> {
    private readonly ctx;
    static start(ctx: ExtensionContext): void;
    private static trDPEnv;
    private static trDPDev;
    static stopActBar(): void;
    private readonly aTiRoot;
    private aReady;
    private constructor();
    private dispose;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    readonly getTreeItem: (t: TreeItem) => TreeItem;
    getChildren(t?: TreeItem): Thenable<TreeItem[]>;
    private refreshWork;
    private pnlWV;
    private activityBarBadge;
}
