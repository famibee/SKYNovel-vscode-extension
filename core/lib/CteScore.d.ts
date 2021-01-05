import { IFn2Path } from './CmnLib';
import { CustomTextEditorProvider, TextDocument, WebviewPanel, CancellationToken, ExtensionContext, Range } from 'vscode';
export declare class CteScore implements CustomTextEditorProvider {
    private static htmBaseSrc;
    private static localExtensionResRoots;
    static init(ctx: ExtensionContext): void;
    private static hPath2Tokens;
    updScore(path: string, curPrj: string, aToken: string[]): void;
    private repWvUri;
    isSkipUpd(path: string): boolean;
    separation(path: string): void;
    combining(path: string): void;
    updLine(doc: TextDocument, rng: Range, txt: string, aToken: string[]): boolean;
    undefMacro(def_nm: string): void;
    defMacro(def_nm: string, hPrm: any): void;
    private static hPath2Wv;
    resolveCustomTextEditor(doc: TextDocument, webviewPanel: WebviewPanel, _token: CancellationToken): Promise<void>;
    private static regFld;
    private updWv_db;
    private static hPrj2hPath;
    updPath(curPrj: string, hPath: IFn2Path): void;
    private token2html;
    private make_tr;
    private make_tds_tag;
    private static readonly alzTagArg;
    private static hTag2Tds;
    private static macro_nm;
    private make_tds;
}
