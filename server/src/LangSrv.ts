/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	MarkupContent
} from 'vscode-languageserver/node';
import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import {MD_STRUCT} from '../../dist/md2json';


// Also include all preview / proposed LSP features.
const conn = createConnection(ProposedFeatures.all);
	console.log = conn.console.log.bind(conn.console);		// おまじない
	console.error = conn.console.error.bind(conn.console);	// おまじない
	process.on('unhandledRejection', e=> {
		conn.console.error(`Unhandled exception ${e}`);
	});

const docs: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasCfgCap = false;
let hasWsFldCap = false;
let hasDiagRelatedInfCap = false;

conn.onInitialize((params: InitializeParams)=> {
	const cap = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// クライアントは「workspace/configuration」リクエストをサポート?
	// If not, we fall back using global settings.
	// そうでない場合は、グローバル設定を使用してフォールバック
	hasCfgCap = !!(
		cap.workspace && !!cap.workspace.configuration
	);
	hasWsFldCap = !!(
		cap.workspace && !!cap.workspace.workspaceFolders
	);
	hasDiagRelatedInfCap = !!(
		cap.textDocument &&
		cap.textDocument.publishDiagnostics &&
		cap.textDocument.publishDiagnostics.relatedInformation
	);

	const ret: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
/*
			diagnosticProvider: {
				documentSelector		: null,
				identifier	: 'skynovel',
				interFileDependencies	: true,
				workspaceDiagnostics	: false,
			},
*/
			completionProvider: {		// コード補完機能
				resolveProvider		: true,
				triggerCharacters	: ['[', ' ', '='],
			},
/*
			definitionProvider		: true,	// 定義へ移動、定義をここに表示
			documentLinkProvider	: {resolveProvider: true},// ラベルジャンプ？
			documentSymbolProvider	: true,	// アウトライン
			foldingRangeProvider	: true,
			renameProvider	: {prepareProvider: true,},	// シンボルの名前変更
			selectionRangeProvider	: true,
			workspaceSymbolProvider	: true,
			workspace: {
				workspaceFolders: {
					supported	: true,
					changeNotifications	: true,
				},
			},
*/
		}
	};
	if (hasWsFldCap) {
		ret.capabilities.workspace = {
			workspaceFolders: {
				supported: true,
			},
		};
	}
	return ret;
});

conn.onInitialized(()=> {
	if (hasCfgCap) {
		// Register for all configuration changes.
		// すべての構成変更を登録します。
		conn.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWsFldCap) {
		conn.workspace.onDidChangeWorkspaceFolders(_e=> {
			console.log('Workspace folder change event received.');
		});
	}

	initCompletion();
});


interface MySettings {
	maxNumberOfProblems: number;
}

const SETTING_DEF: MySettings = {maxNumberOfProblems: 1000,};
let glbStg: MySettings = SETTING_DEF;

// Cache the settings of all open documents
const mapDocStg: Map<string, Thenable<MySettings>> = new Map();

conn.onDidChangeConfiguration(chg=> {
	if (hasCfgCap) {
		mapDocStg.clear();	// Reset all cached document settings
	}
	else glbStg = <MySettings>(
		(chg.settings.SKYNovelLangSrv || SETTING_DEF)
	);

	docs.all().forEach(validateDoc);	// 開いている全Docを再検証
});

function getDocSettings(res: string): Thenable<MySettings> {
	if (! hasCfgCap) {
		return Promise.resolve(glbStg);
	}
	let ret = mapDocStg.get(res);
	if (! ret) {
		ret = conn.workspace.getConfiguration({
			scopeUri: res,
			section	: 'SKYNovelLangSrv'
		});
		mapDocStg.set(res, ret);
	}
	return ret;
}

// 開いているドキュメントの設定のみを保持
docs.onDidClose(e=> mapDocStg.delete(e.document.uri));

// 開かれたときや、変更時に来る
docs.onDidChangeContent(chg=> validateDoc(chg.document));

async function validateDoc(doc: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	// この単純な例では、すべての検証実行の設定を取得します。
	const stg = await getDocSettings(doc.uri);

	const txt = doc.getText();
//console.log(`validateDoc fn:${doc.uri.slice(-12)}`);
	const pattern = /\b[A-Z]{2,}\b/g;
	let m: RegExpExecArray | null;

	let cntPrb = 0;
	const aDiag: Diagnostic[] = [];
	while ((m = pattern.exec(txt)) && cntPrb < stg.maxNumberOfProblems) {
		cntPrb++;
		const d: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			range: {
				start	: doc.positionAt(m.index),
				end		: doc.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is all uppercase.`,
			source: 'ex',
		};
		if (hasDiagRelatedInfCap) {
			d.relatedInformation = [
				{
					location: {
						uri		: doc.uri,
						range	: {...d.range},
					},
					message: 'Spelling matters'
				},
				{
					location: {
						uri		: doc.uri,
						range	: {...d.range},
					},
					message: 'Particularly for names'
				}
			];
		}
		aDiag.push(d);
	}

	// Send the computed diagnostics to VSCode.
	conn.sendDiagnostics({uri: doc.uri, diagnostics: aDiag});
}

// LanguageClientOptions.synchronize.fileEvents での設定によるイベント
//	// Changed は保存時に発生する
conn.onDidChangeWatchedFiles(chg=> {
console.log('onDidChangeWatchedFiles !');

// NOTE: ワークスペース関係なくここに来る？　分岐はこちらの責任？

	chg.changes.forEach(e=> console.log(`  type:${e.type} uri:${e.uri.slice(-32)}`));
		/*
			const Created = 1;
			const Changed = 2;
			const Deleted = 3;
		*/
});

// =======================================
// コード補完機能
// =======================================
function initCompletion() {
	const hMd: {[tag_nm: string]: MD_STRUCT} = require('../dist/md.json');
	const cmdScanScr_trgPrm = {title: '「スクリプト再捜査」「引数の説明」', command: 'extension.skynovel.scanScr_trgParamHints'};
	for (const tag_nm in hMd) {
		const md = hMd[tag_nm];
		const docu: string | MarkupContent = md.comment
			? <MarkupContent>{
				kind	: 'markdown',
				value	: 
`$(book)[タグリファレンス](https://famibee.github.io/SKYNovel/tag.html#${tag_nm
})

---
${md.comment}`,}
			: '';
		md.snippet.forEach(v=> aCITag.push({
			label	: v.nm,
			kind	: CompletionItemKind.Snippet,
			detail	: md.detail,
			command	: cmdScanScr_trgPrm,
			documentation	: docu,
			// 以下は未検討
		/*
			labelDetails?: CompletionItemLabelDetails;
			tags?: CompletionItemTag[];
			deprecated?: boolean;
			preselect?: boolean;
			sortText?: string;
			filterText?: string;
			insertText?: string;
			insertTextFormat?: InsertTextFormat;
			insertTextMode?: InsertTextMode;
			textEdit?: TextEdit | InsertReplaceEdit;
			textEditText?: string;
			additionalTextEdits?: TextEdit[];
			commitCharacters?: string[];
			data?: LSPAny;
		*/
		}));
	}
	aCITagMacro = aCITag;
}
//const scrScn_hTagMacroUse: {[uri: string]: string}	= {};
let aCITag	: CompletionItem[]	= [];
//let aCIMacro	: CompletionItem[]	= [];
let aCITagMacro	: CompletionItem[]	= [];

//	// 初期リストを返すハンドラー
conn.onCompletion(
	(docPrm: TextDocumentPositionParams): CompletionItem[]=> {
		const d = docs.get(docPrm.textDocument.uri);
		if (! d) return [];
		const p = docPrm.position;
		const trgChr = d.getText({start: {line: p.line, character: p.character -1}, end: p});
console.log(`fn:lsp.ts line:274 trgChr:${trgChr}:`);
		if (trgChr === '[') return aCITagMacro;	// タグやマクロ候補を表示

		return [];
	}
);
//	// 補完リストで選択された項目の追加情報を解決するハンドラー
conn.onCompletionResolve(
	(ci: CompletionItem): CompletionItem=> {
		if (ci.data === 1) {
			ci.detail = 'TypeScript details';
			ci.documentation = 'TypeScript documentation';
		}
		else if (ci.data === 2) {
			ci.detail = 'JavaScript details';
			ci.documentation = 'JavaScript documentation';
		}
		return ci;
	}
);


docs.listen(conn);	// for open, change and close text document events
conn.listen();			// Listen on the connection
