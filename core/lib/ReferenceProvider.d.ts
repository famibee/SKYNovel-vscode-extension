import { ExtensionContext, Uri, Position, Range, Hover, RenameProvider, TextDocument, CancellationToken, WorkspaceEdit, ProviderResult, DefinitionProvider, Definition, DefinitionLink, HoverProvider } from 'vscode';
export declare class ReferenceProvider implements HoverProvider, DefinitionProvider, RenameProvider {
    private curPrj;
    private static readonly pickItems;
    private readonly clDiag;
    private static inited;
    constructor(ctx: ExtensionContext, curPrj: string);
    prepareRename(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Range | {
        placeholder: string;
        range: Range;
    }>;
    private macro_name4rename;
    provideRenameEdits(_doc: TextDocument, _pos: Position, newName: string, _token: CancellationToken): ProviderResult<WorkspaceEdit>;
    provideHover(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Hover>;
    provideDefinition(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Definition | DefinitionLink[]>;
    private scanAllScript;
    private static hMacro;
    private static hMacroUse;
    crePrj(e: Uri): void;
    chgPrj(e: Uri): void;
    delPrj(e: Uri): void;
    private readonly alzTagArg;
    private scanScript;
    private loadCfg;
    private compare;
    private hScript;
    private readonly REG_TAG_LET_ML;
    private resolveScript;
    private replaceScript_let_ml;
    REG_TOKEN: RegExp;
    private mkEscape;
    setEscape(ce: string): void;
    private readonly REG_MULTILINE_TAG;
    private static readonly REG_MULTILINE_TAG_SPLIT;
    private cnvMultilineTag;
    private readonly REG_TAG;
}
