import { TreeItem, ExtensionContext, WorkspaceFolder } from 'vscode';
declare const aPrjBtnName: readonly ["SnUpd", "SnUpd_waited", "ReBuild", "PrjSet", "Crypto", "Crypto_waited", "TaskWeb", "TaskWebDbg", "TaskWebStop", "TaskApp", "TaskAppStop", "TaskAppDbg", "TaskAppDbgStop", "PackWin", "PackWin32", "PackMac", "PackMacArm64", "PackLinux", "PackFreem"];
export declare type PrjBtnName = typeof aPrjBtnName[keyof typeof aPrjBtnName];
export interface TREEITEM_CFG {
    cmd: PrjBtnName | '';
    exe?: boolean;
    icon: string;
    label: string;
    desc?: string;
    npm?: string;
    children?: TREEITEM_CFG[];
    forMac?: boolean;
}
declare type ON_BTN = (ti: TreeItem, btn_nm: PrjBtnName, cfg: TREEITEM_CFG) => void;
export declare class PrjTreeItem extends TreeItem {
    #private;
    readonly cfg: TREEITEM_CFG;
    private readonly pathWs;
    readonly ctx: ExtensionContext;
    static create(ctx: ExtensionContext, wsFld: WorkspaceFolder, onBtn: ON_BTN): PrjTreeItem;
    private constructor();
    private static regCmds;
    get children(): TreeItem[];
}
export {};
