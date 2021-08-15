import { TreeDataProvider, TreeItem, ExtensionContext, Event } from 'vscode';
export declare enum eTree {
    NODE = 0,
    NPM = 1,
    SKYNOVEL_VER = 2
}
export declare class ActivityBar implements TreeDataProvider<TreeItem> {
    private readonly ctx;
    static start(ctx: ExtensionContext): void;
    private static actBar;
    private static workSps;
    private static tlBox;
    static stop(): void;
    private readonly aDevEnv;
    private readonly aTiRoot;
    static aReady: boolean[];
    private constructor();
    private dispose;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    readonly getTreeItem: (t: TreeItem) => TreeItem;
    getChildren(t?: TreeItem): Thenable<TreeItem[]>;
    private refreshWork;
    private chkLastSNVer;
    private pnlWV;
    private openEnvInfo;
}
