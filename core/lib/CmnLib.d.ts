export declare function int(o: any): number;
export declare function uint(o: any): number;
export declare function trim(s: string): string;
export declare function oIcon(name: string): {
    light: string;
    dark: string;
};
export declare const is_win: boolean;
export declare const is_mac: boolean;
export declare const statBreak: {
    (): string;
};
export declare function treeProc(wd: string, fnc: (url: string) => void): void;
export declare function foldProc(wd: string, fnc: (url: string, nm: string) => void, fncFld: (nm: string) => void): void;
export declare function replaceFile(src: string, r: RegExp, rep: string, dest?: string): Promise<void>;
