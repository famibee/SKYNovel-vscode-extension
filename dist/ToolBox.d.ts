import { WebviewViewProvider, ExtensionContext, WebviewView, WebviewViewResolveContext, CancellationToken } from 'vscode';
export declare class ToolBox implements WebviewViewProvider {
    #private;
    readonly ctx: ExtensionContext;
    constructor(ctx: ExtensionContext);
    resolveWebviewView(wvv: WebviewView, _ctx: WebviewViewResolveContext, _token: CancellationToken): void;
    dispose(): void;
}
