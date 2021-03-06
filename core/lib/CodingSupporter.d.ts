import { IFn2Path } from './CmnLib';
import { HoverProvider, DefinitionProvider, ReferenceProvider, ReferenceContext, RenameProvider, CompletionItemProvider, ExtensionContext, Uri, Location, Position, Range, Hover, TextDocument, CancellationToken, WorkspaceEdit, ProviderResult, Definition, DefinitionLink, CompletionContext, CompletionItem, CompletionList, SignatureHelpProvider, SignatureHelpContext, SignatureHelp, DocumentSymbolProvider, SymbolInformation, DocumentSymbol } from 'vscode';
export declare class CodingSupporter implements HoverProvider, DefinitionProvider, ReferenceProvider, RenameProvider, CompletionItemProvider, SignatureHelpProvider, DocumentSymbolProvider {
    private readonly lenRootPath;
    private static readonly pickItems;
    private static hTag;
    private static hSnippet;
    private readonly clDiag;
    private readonly scrScn;
    private readonly hArgDesc;
    private static readonly CMD_SCANSCR_TRGPARAMHINTS;
    constructor(ctx: ExtensionContext, pathWs: string, curPrj: string);
    private static readonly REG_VAR;
    finInitTask(): void;
    private tidDelay;
    private aChgTxt;
    private hRsvNm2Then;
    private delayedUpdate;
    private static initClass;
    private static openTagRef;
    private static readonly regTagName;
    provideHover(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Hover>;
    provideDefinition(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Definition | DefinitionLink[]>;
    provideReferences(doc: TextDocument, pos: Position, _ctx: ReferenceContext, _token: CancellationToken): ProviderResult<Location[]>;
    prepareRename(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Range | {
        placeholder: string;
        range: Range;
    }>;
    private nm4rename;
    provideRenameEdits(_doc: TextDocument, _pos: Position, newName: string, _token: CancellationToken): ProviderResult<WorkspaceEdit>;
    private aCITagMacro;
    provideCompletionItems(doc: TextDocument, pos: Position, _token: CancellationToken, cc: CompletionContext): ProviderResult<CompletionItem[] | CompletionList>;
    resolveCompletionItem(ci: CompletionItem, _token: CancellationToken): ProviderResult<CompletionItem>;
    private preSigHelp;
    private rngPreTag;
    provideSignatureHelp(doc: TextDocument, pos: Position, _token: CancellationToken, shc: SignatureHelpContext): ProviderResult<SignatureHelp>;
    private static readonly REG_FIELD;
    private searchArgName;
    private hScr2Pro;
    provideDocumentSymbols(doc: TextDocument, _token: CancellationToken): ProviderResult<SymbolInformation[] | DocumentSymbol[]>;
    setHDefPlg(hDefPlg: {
        [def_nm: string]: Location;
    }): void;
    setEscape(ce: string): void;
    readonly crePrj: (_: Uri) => void;
    readonly chgPrj: (uri: Uri) => void;
    readonly delPrj: (_: Uri) => void;
    private loadCfg;
    private compare;
    updPath(hPath: IFn2Path): void;
}
