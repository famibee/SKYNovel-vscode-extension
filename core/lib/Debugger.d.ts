/// <reference types="node" />
import { DebugConfiguration } from 'vscode';
import { DebugProtocol } from 'vscode-debugprotocol';
import { EventEmitter } from 'events';
export interface InfoBreakpoint {
    id: number;
    ln: number;
    col: number;
    verified: boolean;
}
export declare class Debugger extends EventEmitter {
    private readonly hProcSnRes;
    launch(args: DebugConfiguration): void;
    attach(args: DebugConfiguration, runtype?: string): void;
    private sktDbg;
    private sktBuf;
    private send2SN;
    end(): void;
    restart: (ri: number) => Promise<void>;
    continue: (rev?: boolean) => void;
    step: (rev?: boolean) => void;
    stepin: () => void;
    stepout: () => void;
    pause: () => void;
    var: (ri: number, scope: string) => Promise<any[]>;
    stack: (ri: number, start: number, end: number) => Promise<any[]>;
    eval: (ri: number, txt: string) => Promise<any>;
    private idBP;
    private fn2ABP;
    setBreakPoints(fn: string, a: DebugProtocol.SourceBreakpoint[]): InfoBreakpoint[];
    private hScriptLines;
    private loadSource;
    setDataBreakpoint: (ri: number, a: any[]) => Promise<void>;
    setFuncBreakpoint: (ri: number, a: any[]) => Promise<void>;
    setVariable: (ri: number, nm: string, val: string) => Promise<void>;
    private sendEvent2Adpt;
}
