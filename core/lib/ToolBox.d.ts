import { WebviewViewProvider, ExtensionContext, WebviewView, WebviewViewResolveContext, CancellationToken } from 'vscode';
export declare class ToolBox implements WebviewViewProvider {
    readonly ctx: ExtensionContext;
    private readonly localExtensionResRoots;
    constructor(ctx: ExtensionContext);
    private readonly aCtgACmd;
    resolveWebviewView(wvv: WebviewView, _ctx: WebviewViewResolveContext, _token: CancellationToken): void;
    dispose(): void;
}
