/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {LspWs} from './LspWs';

import {
	CodeActionKind,
	createConnection,
	DidChangeConfigurationNotification,
	ProposedFeatures,
	TextDocuments,
	TextDocumentSyncKind} from 'vscode-languageserver/node';
import {TextDocument} from 'vscode-languageserver-textdocument';


const conn = createConnection(ProposedFeatures.all);
	console.log = (...args)=> conn.console.log(String(args));
	console.error = (...args)=> conn.console.error(String(args));
		// 拡張機能ホストの[出力]-[SKYNovel Language Server]に出る
	process.on('unhandledRejection', e=> {
		conn.console.error(`Unhandled exception ${e}`);
	});

const docs = new TextDocuments(TextDocument);

let hasCfgCap = false;
let hasDiagRelatedInfCap = false;

let aLspWs: LspWs[]	= [];

conn.onInitialize(prm=> {
	const cap = prm.capabilities;
	hasCfgCap = !!cap.workspace?.configuration;
	const hasWsFldCap = !!cap.workspace?.workspaceFolders;
	hasDiagRelatedInfCap = !!(
		cap.textDocument?.publishDiagnostics?.relatedInformation
	);
	const inlayHintSupport = !!cap.workspace?.inlayHint?.refreshSupport;
	//let inlayValueSupport = false;

	conn.onInitialized(()=> {
		// すべての構成変更を登録
		if (hasCfgCap) conn.client.register(DidChangeConfigurationNotification.type, undefined);

		// vsix デバッグ用（【出力】-【ログ（ウインドウ）】にも出す）
		console.log = (...args)=> {
			const txt = String(args);
			conn.console.log(txt);
			conn.sendRequest(LspWs.REQ_ID, {cmd: 'log', txt});
		};
		console.error = (...args)=> {
			const txt = String(args);
			conn.console.error(txt);
			conn.sendRequest(LspWs.REQ_ID, {cmd: 'error', txt});
		};

		conn.onRequest(LspWs.REQ_ID, hd=> {
			for (const wf of aLspWs) wf.onRequest(hd);
		});

		// === コード内に挿入して表示するインレイヒント ===
		if (inlayHintSupport) conn.languages.inlayHint.on(prm=> {
			for (const wf of aLspWs) {
				const ret = wf.onInlayHint(prm);
				if (ret) return ret;
			}

			return null;
		});

		// 起動時のワークスペースのフォルダに対し管理オブジェクトを生成
		aLspWs = (prm.workspaceFolders ?? []).map(wf=> new LspWs(wf, conn, docs, hasDiagRelatedInfCap));
		// ワークスペースのフォルダ数変化
		if (hasWsFldCap) conn.workspace.onDidChangeWorkspaceFolders(e=> {
			for (const {uri} of e.removed) {
				aLspWs = aLspWs.filter(wf=> wf.destroy(uri));
			}
			for (const wf of e.added) {
				aLspWs.push(new LspWs(wf, conn, docs, hasDiagRelatedInfCap));
			}
		});
	});

	return {
		capabilities: {
		//	positionEncoding?		// 規定値でOK
			textDocumentSync	: TextDocumentSyncKind.Incremental,	// 規定値でOK
				// TextDocumentSyncOptions、同.openClose を指定すると止まる
		//	notebookDocumentSync?
			completionProvider: {	// コード補完機能
				resolveProvider		: true,
				triggerCharacters	: ['[', ' ', '='],
			},
		///	hoverProvider	: true,		// 識別子上にマウスホバーしたとき表示するヒント
			// client側で行うこととする

			signatureHelpProvider: {	// 引数の説明
				triggerCharacters	: ['='],
			},

		//	declarationProvider?		// 宣言に移動

			definitionProvider		: true,		// 定義へ移動、定義をここに表示
			//	{workDoneProgress?: boolean;}

		//	implementationProvider?: boolean | ImplementationOptions | ImplementationRegistrationOptions;
			// インターフェイスからこのインターフェイスを実装するクラスに移動したり、抽象メソッドから実装メソッドのリストに移動したり

			referencesProvider		: true,		// 参照へ移動、参照をここに表示
			//	{workDoneProgress?: boolean;}

//	textDocument/documentHighlight	ハイライト対象シンボルの利用（参照）のリスト取得
		//	documentHighlightProvider?: boolean | DocumentHighlightOptions;

			documentSymbolProvider	: true,		// ドキュメントアウトライン

//	textDocument/codeAction			コード アクションのリストの取得
			codeActionProvider: {
				codeActionKinds: [CodeActionKind.QuickFix],
			},

//	textDocument/codeLens			code lensのリストの取得
//	codeLens/resolve				code lensの処理の実行
		//	codeLensProvider?: CodeLensOptions;

			documentLinkProvider	: {resolveProvider: false},	// リンク
	//		documentLinkProvider	: {resolveProvider: true},	// リンク

		//	colorProvider?: boolean | DocumentColorOptions | DocumentColorRegistrationOptions;

//	workspace/symbol			ワークスペース全体からクエリ条件に合致するシンボルの取得
		//	workspaceSymbolProvider	: true,
		//	workspaceSymbolProvider	: {resolveProvider: true,},

		//	documentFormattingProvider			// ドキュメントの整形	// 規定値でOK
		//	documentRangeFormattingProvider?:		// 規定値でOK
		//	documentOnTypeFormattingProvider	// タイプ時の整形	// 規定値でOK

			renameProvider	: {prepareProvider: true,},		// シンボルの名前変更

		//	foldingRangeProvider?				// 規定値でOK

		//	selectionRangeProvider?: boolean | SelectionRangeOptions | SelectionRangeRegistrationOptions;
	//		selectionRangeProvider	: true,		// 規定値でOK

		//	executeCommandProvider?: ExecuteCommandOptions;		// コマンド登録
//		executeCommandProvider: {commands: ['skynovel.openReferencePallet']},

		//	callHierarchyProvider?: boolean | CallHierarchyOptions | CallHierarchyRegistrationOptions;
			// documentSelector: DocumentSelector | null;

		//	linkedEditingRangeProvider?: boolean | LinkedEditingRangeOptions | LinkedEditingRangeRegistrationOptions;
			// documentSelector: DocumentSelector | null;
			// Visual Studio Code November 2020 https://code.visualstudio.com/updates/v1_52#_linked-editing-range-provider

		//	semanticTokensProvider?: SemanticTokensOptions | SemanticTokensRegistrationOptions;
			// Semantic Tokens｜Language Server Protocol に対応したミニ言語処理系を作る https://zenn.dev/takl/books/0fe11c6e177223/viewer/d2d307
			// Semantic Highlight Guide | Visual Studio Code Extension API https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide
			// NOTE: 色づけ、LSPでやったほうが軽い？　優先順位低いが

		//	monikerProvider?: boolean | MonikerOptions | MonikerRegistrationOptions;

		//	typeHierarchyProvider?: boolean | TypeHierarchyOptions | TypeHierarchyRegistrationOptions;

		//	inlineValueProvider?: boolean | InlineValueOptions | InlineValueRegistrationOptions;

			inlayHintProvider: inlayHintSupport,
			//    resolveProvider?: boolean;

			workspace	: hasWsFldCap ?{
				workspaceFolders: {
					supported			: true,
				//	changeNotifications	: true,
				},
			//	fileOperations?: FileOperationOptions;
			} :undefined,

		//	experimental?: T;
	}};
});


// =======================================


/*	// 未使用
interface MySettings {
	maxNumberOfProblems: number;
}

// Cache the settings of all open documents
const mapDocStg: Map<string, Thenable<MySettings>> = new Map;

conn.onDidChangeConfiguration(_chg=> {
	if (hasCfgCap) mapDocStg.clear();	// Reset all cached document settings

	const [{uri}] = docs.all();
	if (uri) for (const wf of aLspWs) wf.fullScan(uri);
});

// 開いているドキュメントの設定のみを保持
docs.onDidClose(({document: {uri}})=> mapDocStg.delete(uri));
*/


// === 識別子上にマウスホバーしたとき表示するヒント ===
	// client側で行うこととする
/*
conn.onHover(prm=> {
	for (const wf of aLspWs) {
		const ret = wf.onHover(prm);
		if (ret) return ret;
	}
	return {contents: []};
});
*/


// === コード補完機能 ===
//	// 自動補完（初期リストを返すハンドラー）
conn.onCompletion(prm=> {
	for (const wf of aLspWs) {
		const ret = wf.onCompletion(prm);
		if (ret) {wfCompletioning = wf; return ret;}
	}
	return [];
});
let wfCompletioning: LspWs;
//	// 自動補完候補の選択（補完リストで選択された項目の追加情報を解決するハンドラー）
conn.onCompletionResolve(ci=> wfCompletioning.onCompletionResolve(ci));


// === 引数の説明 ===
conn.onSignatureHelp(prm=> {
	for (const wf of aLspWs) {
		const ret = wf.onSignatureHelp(prm);
		if (ret) return ret;
	}
	return null;
});


// === 定義へ移動、定義をここに表示 ===
conn.onDefinition((prm=> {
	for (const wf of aLspWs) {
		const ret = wf.onDefinition(prm);
		if (ret) return ret;
	}
	return null;
}));

// === 参照へ移動、参照をここに表示 ===
conn.onReferences((prm=> {
	for (const wf of aLspWs) {
		const ret = wf.onReferences(prm);
		if (ret) return ret;
	}
	return null;
}));


//conn.onWorkspaceSymbol

// === ドキュメントアウトライン ===
conn.onDocumentSymbol((prm=> {
	for (const wf of aLspWs) {
		const ret = wf.onDocumentSymbol(prm);
		if (ret) return ret;
	}
	return null;
}));


// === コードアクション ===
conn.onCodeAction((prm=> {
	for (const wf of aLspWs) {
		const ret = wf.onCodeAction(prm);
		if (ret) return ret;
	}
	return null;
}));


// === リンク ===
conn.onDocumentLinks((prm=> {
	for (const wf of aLspWs) {
		const ret = wf.onDocumentLinks(prm);
		if (ret) return ret;
//		if (ret) {wfDocumentLinks = wf; return ret;}
	}
	return null;
}));
/*
	let wfDocumentLinks: LspWs;
	conn.onDocumentLinkResolve(prm=> {
// console.log(`fn:LangSrv.ts line:272 prm:${JSON.stringify(prm)}`);
		return wfDocumentLinks.onDocumentLinkResolve(prm)
	});
	//conn.onDocumentLinkResolve(prm=> wfDocumentLinks.onDocumentLinkResolve(prm));
*/


// === シンボルの名前変更・準備 ===
conn.onPrepareRename(prm=> {
	for (const wf of aLspWs) {
		const ret = wf.onPrepareRename(prm);
		if (ret) return ret;
	}
	return null;
});
// === シンボルの名前変更 ===
conn.onRenameRequest(prm=> {
	for (const wf of aLspWs) {
		const ret = wf.onRenameRequest(prm);
		if (ret) return ret;
	}
	return null;
});


conn.onShutdown(()=> {for (const wf of aLspWs) wf.destroy(); aLspWs = [];});


// === ファイル開きイベント（ファイルを開いたときにも） ===
const hDocThrowOpCl: {[uri: string]: 0} = {};
docs.onDidOpen(chg=> {	// 開いた時のみのイベントにする
	const {uri} = chg.document;
	hDocThrowOpCl[uri] = 0;
	for (const wf of aLspWs) wf.onDidOpen(chg);
});

// === ファイル変更イベント（手入力が対象） ===
docs.onDidChangeContent(chg=> {	// 変更時のみのイベントにする
	const {uri} = chg.document;
	if (uri in hDocThrowOpCl) {delete hDocThrowOpCl[uri]; return;}

	for (const wf of aLspWs) wf.onDidChangeContent(chg);
});

// === ファイル閉じイベント
docs.onDidClose(({document: {uri}})=> delete hDocThrowOpCl[uri]);


// === ファイル変更イベント（手入力以外が対象） ===
//	// LanguageClientOptions.synchronize.fileEvents での設定によるイベント
//	// Changed は保存時に発生する
conn.onDidChangeWatchedFiles(chg=> {
	for (const wf of aLspWs) wf.onDidChangeWatchedFiles(chg);
});



// =======================================
docs.listen(conn);
conn.listen();
