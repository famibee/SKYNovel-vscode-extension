import { TreeDataProvider, ExtensionContext, TreeItem, Event } from 'vscode';
export declare function oIcon(name: string): {
    light: string;
    dark: string;
};
export declare const is_win: boolean;
export declare const is_mac: boolean;
export declare class TreeDPDev implements TreeDataProvider<TreeItem> {
    private readonly aTree;
    private oTreePrj;
    private readonly rp;
    constructor(context: ExtensionContext);
    private fnc_onDidEndTaskProcess;
    private refresh;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: Event<TreeItem | undefined>;
    private readonly TreeChild;
    private wsf2tree;
    private oDisposeFSW;
    private updLocalSNVer;
    private fncDev;
    private readonly statBreak;
    getTreeItem: (elm: TreeItem) => TreeItem;
    getChildren(elm?: TreeItem): Thenable<TreeItem[]>;
    dispose(): void;
}
