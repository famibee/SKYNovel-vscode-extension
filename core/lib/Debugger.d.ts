/// <reference types="node" />
import { DebugConfiguration } from 'vscode';
import { EventEmitter } from 'events';
export interface InfoBreakpoint {
    id: number;
    ln: number;
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
    continue(rev?: boolean): void;
    step(rev?: boolean): void;
    stepin(): void;
    stepout(): void;
    restart(ri: number): Promise<any>;
    var(ri: number, scope: string): Promise<{
        [nm: string]: any;
    }>;
    stack(ri: number, start: number, end: number): Promise<any[]>;
    eval(ri: number, txt: string): Promise<any>;
    getBreakpoints(_fn: string, ln: number): number[];
    private idBreakpoint;
    private mapPath2InfBP;
    setBreakPoint(fn: string, ln: number, o: any): InfoBreakpoint;
    delBreakPoint(fn: string, ln: number): InfoBreakpoint | undefined;
    clearBreakpoints(fn: string): void;
    private verifyBreakpoints;
    setDataBreakpoint: (ri: number, a: any[]) => Promise<void>;
    setFuncBreakpoint: (ri: number, a: any[]) => Promise<void>;
    setVariable: (ri: number, nm: string, val: string) => Promise<void>;
    private scriptFn_;
    get scriptFn(): string;
    private aLinesScript;
    private loadSource;
    private sendEvent2Adpt;
}
