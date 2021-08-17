import { TreeDataProvider, TreeItem, ExtensionContext, Event } from 'vscode';
export declare enum eTreeEnv {
    NODE = 0,
    NPM = 1,
    SKYNOVEL_VER = 2
}
export declare class ActivityBar implements TreeDataProvider<TreeItem> {
    private readonly ctx;
    static start(ctx: ExtensionContext): void;
    private static actBar;
    static stop(): void;
    private readonly aEnv;
    private readonly aTiEnv;
    static aReady: boolean[];
    private workSps;
    private tlBox;
    private constructor();
    private dispose;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    readonly getTreeItem: (t: TreeItem) => TreeItem;
    getChildren(t?: TreeItem): Thenable<TreeItem[]>;
    private chkEnv;
    private chkLastSNVer;
    private pnlWV;
    private openEnvInfo;
}
