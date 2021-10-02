/// <reference types="node" />
import { DebugConfiguration, WorkspaceFolder, TextDocumentChangeEvent } from 'vscode';
import { DebugProtocol } from 'vscode-debugprotocol';
import { EventEmitter } from 'events';
export interface InfoBreakpoint {
    id: number;
    ln: number;
    col: number;
    verified: boolean;
    condition?: string;
    hitCondition?: number;
}
export declare class Debugger extends EventEmitter {
    #private;
    readonly wsFld: WorkspaceFolder | undefined;
    private readonly hookTag;
    constructor(wsFld: WorkspaceFolder | undefined, hookTag: (o: any) => void);
    static send2SN(type: string, o?: object): void;
    attach(args: DebugConfiguration): void;
    private send2SN;
    end(): void;
    static noticeChgDoc(curPrj: string, e: TextDocumentChangeEvent): void;
    restart: (ri: number) => Promise<void>;
    continue: (reverse?: boolean) => void;
    step: (reverse?: boolean) => void;
    stepin: () => void;
    stepout: () => void;
    pause: () => void;
    var: (ri: number, scope: string) => Promise<{
        [nm: string]: any;
    }>;
    stack: (ri: number, start: number, end: number) => Promise<{
        nm: string;
        fn: string;
        ln: number;
        col: number;
        ma: string;
    }[]>;
    eval: (ri: number, txt: string) => Promise<string>;
    setBreakPoints(fn: string, a: DebugProtocol.SourceBreakpoint[]): InfoBreakpoint[];
    setDataBreakpoint: (ri: number, a: any[]) => Promise<void>;
    setFuncBreakpoint: (ri: number, a: any[]) => Promise<void>;
    setVariable: (ri: number, nm: string, val: string) => Promise<void>;
}
