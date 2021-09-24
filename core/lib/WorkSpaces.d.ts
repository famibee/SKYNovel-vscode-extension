import { ActivityBar } from './ActivityBar';
import { TreeDataProvider, ExtensionContext, TreeItem } from 'vscode';
export declare class WorkSpaces implements TreeDataProvider<TreeItem> {
    private readonly ctx;
    private readonly actBar;
    private readonly aTiRoot;
    private hPrj;
    constructor(ctx: ExtensionContext, actBar: ActivityBar);
    private tiLayers;
    private tidDelay;
    private onUpdDoc;
    private teActive;
    private decChars;
    private static readonly REG_FN_OR_LABEL;
    private updDeco;
    private refresh;
    private readonly emPrjTD;
    readonly onDidChangeTreeData: import("vscode").Event<TreeItem | undefined>;
    enableBtn(enable: boolean): void;
    private makePrj;
    private hOnEndTask;
    getTreeItem: (t: TreeItem) => TreeItem;
    getChildren: (t?: TreeItem | undefined) => TreeItem[];
    dispose(): void;
}
