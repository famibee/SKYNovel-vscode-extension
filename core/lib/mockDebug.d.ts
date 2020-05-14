import { LoggingDebugSession } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    program: string;
    stopOnEntry?: boolean;
    trace?: boolean;
}
export declare class MockDebugSession extends LoggingDebugSession {
    private static THREAD_ID;
    private _runtime;
    private _variableHandles;
    private _configurationDone;
    private _cancelationTokens;
    private _isLongrunning;
    private _reportProgress;
    private _progressId;
    private _cancelledProgressId;
    private _isProgressCancellable;
    constructor();
    protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void;
    protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void;
    protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): Promise<void>;
    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void;
    protected breakpointLocationsRequest(response: DebugProtocol.BreakpointLocationsResponse, args: DebugProtocol.BreakpointLocationsArguments, _request?: DebugProtocol.Request): void;
    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void;
    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void;
    protected scopesRequest(response: DebugProtocol.ScopesResponse, _args: DebugProtocol.ScopesArguments): void;
    protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request): Promise<void>;
    protected continueRequest(response: DebugProtocol.ContinueResponse, _args: DebugProtocol.ContinueArguments): void;
    protected reverseContinueRequest(response: DebugProtocol.ReverseContinueResponse, _args: DebugProtocol.ReverseContinueArguments): void;
    protected nextRequest(response: DebugProtocol.NextResponse, _args: DebugProtocol.NextArguments): void;
    protected stepBackRequest(response: DebugProtocol.StepBackResponse, _args: DebugProtocol.StepBackArguments): void;
    protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void;
    private progressSequence;
    protected dataBreakpointInfoRequest(response: DebugProtocol.DataBreakpointInfoResponse, args: DebugProtocol.DataBreakpointInfoArguments): void;
    protected setDataBreakpointsRequest(response: DebugProtocol.SetDataBreakpointsResponse, args: DebugProtocol.SetDataBreakpointsArguments): void;
    protected completionsRequest(response: DebugProtocol.CompletionsResponse, _args: DebugProtocol.CompletionsArguments): void;
    protected cancelRequest(_response: DebugProtocol.CancelResponse, args: DebugProtocol.CancelArguments): void;
    private createSource;
}
export {};
