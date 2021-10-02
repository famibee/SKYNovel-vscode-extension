import { CodingSupporter } from './CodingSupporter';
import { WorkspaceFolder, ExtensionContext } from 'vscode';
export declare class PrjSetting {
    #private;
    readonly ctx: ExtensionContext;
    readonly wsFld: WorkspaceFolder;
    private readonly chgTitle;
    private readonly codSpt;
    private readonly searchPath;
    constructor(ctx: ExtensionContext, wsFld: WorkspaceFolder, chgTitle: (title: string) => void, codSpt: CodingSupporter, searchPath: (path: string, extptn: string) => string);
    static getDebugertoken(wsFld: WorkspaceFolder | undefined): string;
    noticeCreDir(path: string): void;
    noticeDelDir(path: string): void;
    get cfg(): any;
    open(): void;
}
