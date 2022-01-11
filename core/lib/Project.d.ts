import { ActivityBar } from './ActivityBar';
import { PrjBtnName } from './PrjTreeItem';
import { ExtensionContext, WorkspaceFolder, TaskProcessEndEvent, TreeItem, EventEmitter } from 'vscode';
export declare class Project {
    #private;
    private readonly ctx;
    private readonly actBar;
    private readonly wsFld;
    readonly aTiRoot: TreeItem[];
    private readonly emPrjTD;
    private readonly hOnEndTask;
    static get fldnm_crypto_prj(): string;
    private updLocalSNVer;
    private dspCryptoMode;
    enableBtn(enabled: boolean): void;
    constructor(ctx: ExtensionContext, actBar: ActivityBar, wsFld: WorkspaceFolder, aTiRoot: TreeItem[], emPrjTD: EventEmitter<TreeItem | undefined>, hOnEndTask: Map<PrjBtnName | 'テンプレ初期化', (e: TaskProcessEndEvent) => void>);
    private onDidTermDbgSS;
    get title(): any;
    get version(): any;
    dispose(): void;
    private build;
    finBuild(): void;
    readonly REGPATH: RegExp;
}
