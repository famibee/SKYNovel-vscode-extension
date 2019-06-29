import { TreeDataProvider, TreeItem, ExtensionContext, Event } from 'vscode';
export declare class ActivityBar implements TreeDataProvider<TreeItem> {
    private readonly context;
    static start(ctx: ExtensionContext): void;
    private static trDPEnv;
    private static trDPDev;
    static stopActBar(): void;
    private readonly aTree;
    private aReady;
    private constructor();
    private dispose;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    readonly getTreeItem: (elm: TreeItem) => TreeItem;
    getChildren(elm?: TreeItem): Thenable<TreeItem[]>;
    private refreshWork;
    private pnlWV;
    private activityBarBadge;
}
