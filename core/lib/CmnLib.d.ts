import { DocumentFilter, ExtensionContext } from 'vscode';
export declare function int(o: any): number;
export declare function uint(o: any): number;
export declare const REG_SCRIPT: RegExp;
export declare const docsel: DocumentFilter;
export interface IExts {
    [ext: string]: string | number;
}
export interface IFn2Path {
    [fn: string]: IExts;
}
export declare function getNonce(): string;
export declare function setCtx4(ctx0: ExtensionContext): void;
export declare function oIcon(name: string): {
    light: string;
    dark: string;
};
export declare const is_win: boolean;
export declare const is_mac: boolean;
export declare const statBreak: {
    (): string;
};
export declare const regNoUseSysPath: RegExp;
export declare function treeProc(wd: string, fnc: (url: string) => void): void;
export declare function foldProc(wd: string, fnc: (url: string, nm: string) => void, fncFld: (nm: string) => void): void;
export declare function replaceFile(src: string, r: RegExp, rep: string, dest?: string): void;
export declare function chkBoolean(v: any): boolean;
export declare function getFn(path: string): string;
