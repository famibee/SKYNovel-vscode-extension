import { CodingSupporter } from './CodingSupporter';
import { WorkspaceFolder, ExtensionContext } from 'vscode';
export declare class PrjSetting {
    #private;
    readonly ctx: ExtensionContext;
    readonly wsFld: WorkspaceFolder;
    private readonly chgTitle;
    private readonly codSpt;
    private readonly searchPath;
    private cmd;
    constructor(ctx: ExtensionContext, wsFld: WorkspaceFolder, chgTitle: (title: string) => void, codSpt: CodingSupporter, searchPath: (path: string, extptn: string) => string, cmd: (nm: string, val: string) => Promise<boolean>);
    static getDebugertoken(wsFld: WorkspaceFolder | undefined): string;
    noticeCreDir(path: string): void;
    noticeDelDir(path: string): void;
    get cfg(): any;
    open(): void;
    private selectFile_icon;
    refreshFont(minify: boolean): void;
    updFontInfo(): void;
    updValid(id: string, mes: string): void;
}
