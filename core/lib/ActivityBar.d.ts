import * as vscode from 'vscode';
export declare class ActivityBar implements vscode.TreeDataProvider<vscode.TreeItem> {
    private readonly context;
    static start(context: vscode.ExtensionContext): void;
    private static trDPEnv;
    private static trDPDev;
    static stopActBar(): void;
    private readonly aTree;
    private aReady;
    private constructor();
    private dispose;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined>;
    readonly getTreeItem: (elm: vscode.TreeItem) => vscode.TreeItem;
    getChildren(elm?: vscode.TreeItem): Thenable<vscode.TreeItem[]>;
    private refreshWork;
    private pnlWV;
    private activityBarBadge;
}
