import { IFn2Path } from './CmnLib';
import { TINF_FONT2STR } from './ScriptScanner';
import { HoverProvider, DefinitionProvider, ReferenceProvider, ReferenceContext, RenameProvider, CompletionItemProvider, CancellationToken, CompletionContext, CompletionItem, CompletionList, Definition, DefinitionLink, ExtensionContext, Hover, Location, Position, ProviderResult, Range, TextDocument, Uri, WorkspaceEdit, SignatureHelpProvider, SignatureHelpContext, SignatureHelp, DocumentSymbolProvider, SymbolInformation, DocumentSymbol } from 'vscode';
export declare class CodingSupporter implements HoverProvider, DefinitionProvider, ReferenceProvider, RenameProvider, CompletionItemProvider, SignatureHelpProvider, DocumentSymbolProvider {
    #private;
    readonly pathWs: string;
    constructor(ctx: ExtensionContext, pathWs: string, curPrj: string, cmd: (nm: string, val: string) => Promise<boolean>);
    goAll(): void;
    getInfFont2Str(): TINF_FONT2STR;
    private static initClass;
    provideHover(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Hover>;
    provideDefinition(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Definition | DefinitionLink[]>;
    provideReferences(doc: TextDocument, pos: Position, _ctx: ReferenceContext, _token: CancellationToken): ProviderResult<Location[]>;
    prepareRename(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Range | {
        placeholder: string;
        range: Range;
    }>;
    provideRenameEdits(_doc: TextDocument, _pos: Position, newName: string, _token: CancellationToken): ProviderResult<WorkspaceEdit>;
    provideCompletionItems(doc: TextDocument, pos: Position, _token: CancellationToken, cc: CompletionContext): ProviderResult<CompletionItem[] | CompletionList>;
    resolveCompletionItem(ci: CompletionItem, _token: CancellationToken): ProviderResult<CompletionItem>;
    provideSignatureHelp(doc: TextDocument, pos: Position, _token: CancellationToken, shc: SignatureHelpContext): ProviderResult<SignatureHelp>;
    provideDocumentSymbols(doc: TextDocument, _token: CancellationToken): ProviderResult<SymbolInformation[] | DocumentSymbol[]>;
    setHDefPlg(hDefPlg: {
        [def_nm: string]: Location;
    }): void;
    setEscape(ce: string): void;
    readonly crePrj: (_: Uri) => void;
    readonly chgPrj: (uri: Uri) => void;
    readonly delPrj: (_: Uri) => void;
    updPath(hPath: IFn2Path): void;
}
