import { TreeDataProvider, TreeItem, ExtensionContext, Event } from 'vscode';
export declare enum eTreeEnv {
    NODE = 0,
    NPM = 1,
    SKYNOVEL_VER = 2,
    TEMP_VER = 3
}
export declare class ActivityBar implements TreeDataProvider<TreeItem> {
    #private;
    private readonly ctx;
    static start(ctx: ExtensionContext): void;
    static stop(): void;
    static aReady: boolean[];
    private constructor();
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    readonly getTreeItem: (t: TreeItem) => TreeItem;
    getChildren(t?: TreeItem): Thenable<TreeItem[]>;
    chkLastSNVer(pathWs: string): void;
    getLocalSNVer(pathWs: string): {
        verSN: string;
        verTemp: string;
    };
    readonly repPrjFromTmp: (fnTo: string) => Thenable<void>;
}
