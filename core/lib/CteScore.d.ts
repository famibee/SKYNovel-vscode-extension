import { IFn2Path } from './CmnLib';
import { CustomTextEditorProvider, TextDocument, WebviewPanel, CancellationToken, ExtensionContext, TextDocumentContentChangeEvent } from 'vscode';
export declare class CteScore implements CustomTextEditorProvider {
    private static htmBaseSrc;
    private static localExtensionResRoots;
    static init(ctx: ExtensionContext): void;
    private static hPath2Tokens;
    isSkipUpd(path: string): boolean;
    setAToken(path: string, curPrj: string, aToken: string[]): void;
    separation(path: string): void;
    combining(path: string): void;
    updDiffLine(path: string, c: TextDocumentContentChangeEvent, aToken: string[]): void;
    private static hPath2Wb;
    resolveCustomTextEditor(doc: TextDocument, webviewPanel: WebviewPanel, _token: CancellationToken): Promise<void>;
    private static regFld;
    private upd_webview_db;
    private static hPrj2hPath;
    updPath(curPrj: string, hPath: IFn2Path): void;
    private upd_webview;
    private token2html;
    private make_tr_td0;
    private make_tds_tag;
    private static readonly alzTagArg;
    private static hTag2Tds;
    private static macro_nm;
    private make_tds;
}
