import { HoverProvider, DefinitionProvider, ReferenceProvider, ReferenceContext, RenameProvider, ExtensionContext, Uri, Location, Position, Range, Hover, TextDocument, CancellationToken, WorkspaceEdit, ProviderResult, Definition, DefinitionLink } from 'vscode';
export declare class ScriptScanner implements HoverProvider, DefinitionProvider, ReferenceProvider, RenameProvider {
    private curPrj;
    private static inited;
    private static readonly pickItems;
    private static hTag;
    private readonly clDiag;
    constructor(ctx: ExtensionContext, curPrj: string);
    private readonly lenRootPath;
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
    private nm2Diag;
    scanAllScript(): void;
    private hPlugin;
    setHDefPlg(hDefPlg: {
        [def_nm: string]: Location;
    }): void;
    private hMacro;
    private hMacroUse;
    crePrj(_e: Uri): void;
    chgPrj(_e: Uri): void;
    delPrj(_e: Uri): void;
    private readonly alzTagArg;
    private static readonly regValName;
    private scanScript;
    private loadCfg;
    private compare;
    private static readonly REG_TAG_LET_ML;
    private resolveScript;
    private replaceScript_let_ml;
    REG_TOKEN: RegExp;
    private mkEscape;
    setEscape(ce: string): void;
    private static readonly REG_TAG;
}
