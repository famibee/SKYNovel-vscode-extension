/// <reference types="node" />
import { EventEmitter } from 'events';
export interface MockBreakpoint {
    id: number;
    line: number;
    verified: boolean;
}
export declare class MockRuntime extends EventEmitter {
    private _sourceFile;
    get sourceFile(): string;
    private _sourceLines;
    private _currentLine;
    private _breakPoints;
    private _breakpointId;
    private _breakAddresses;
    constructor();
    start(program: string, stopOnEntry: boolean): void;
    continue(reverse?: boolean): void;
    step(reverse?: boolean, event?: string): void;
    stack(startFrame: number, endFrame: number): any;
    getBreakpoints(_path: string, line: number): number[];
    setBreakPoint(path: string, line: number): MockBreakpoint;
    clearBreakPoint(path: string, line: number): MockBreakpoint | undefined;
    clearBreakpoints(path: string): void;
    setDataBreakpoint(address: string): boolean;
    clearAllDataBreakpoints(): void;
    private loadSource;
    private run;
    private verifyBreakpoints;
    private fireEventsForLine;
    private sendEvent;
}
