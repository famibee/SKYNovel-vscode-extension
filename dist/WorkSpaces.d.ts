import { ActivityBar } from './ActivityBar';
import { ExtensionContext, TreeDataProvider, TreeItem } from 'vscode';
export declare class WorkSpaces implements TreeDataProvider<TreeItem> {
    #private;
    private readonly ctx;
    private readonly actBar;
    constructor(ctx: ExtensionContext, actBar: ActivityBar);
    readonly onDidChangeTreeData: import("vscode").Event<TreeItem | undefined>;
    enableBtn(enable: boolean): void;
    getTreeItem: (t: TreeItem) => TreeItem;
    getChildren: (t?: TreeItem | undefined) => TreeItem[];
    dispose(): void;
}
