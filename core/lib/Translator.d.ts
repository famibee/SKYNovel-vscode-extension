import { CodingSupporter } from './CodingSupporter';
import { WorkspaceFolder } from 'vscode';
export declare class Translator {
    readonly wsFld: WorkspaceFolder;
    private readonly codSpt;
    private readonly enableButton;
    private readonly pathWs;
    readonly curPlg: string;
    constructor(wsFld: WorkspaceFolder, codSpt: CodingSupporter, enableButton: (enable: boolean) => void);
    isCryptoMode: boolean;
    private readonly regPlgAddTag;
    updPlugin(): void;
    private initTask;
    finInitTask(): void;
}
