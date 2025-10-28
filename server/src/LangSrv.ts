/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_ALL_L2S} from './LspWs';
import {LspWs} from './LspWs';
import {FULL_PATH, fullSchPath2fp, REQ_ID} from '../../src/CmnLib';

import {
	CodeActionKind,
	createConnection,
	DidChangeConfigurationNotification,
	ProposedFeatures,
	TextDocumentIdentifier,
	TextDocuments,
	TextDocumentSyncKind} from 'vscode-languageserver/node';
import {TextDocument} from 'vscode-languageserver-textdocument';


export type T_MES_L2S = T_ALL_L2S & {
	pathWs	: string;
};

function getLspWs(tdi: TextDocumentIdentifier): LspWs | undefined {
	const fp = fullSchPath2fp(tdi.uri);		// 'file://'外し
	const pathWs = [...mLspWs.keys()].find(wsFld=> fp.startsWith(wsFld));
	if (! pathWs) return undefined;

	return mLspWs.get(pathWs);
}


const conn = createConnection(ProposedFeatures.all);
	console.log = (...args)=> conn.console.log(String(args));
	console.error = (...args)=> conn.console.error(String(args));
		// 拡張機能ホストの[出力]-[SKYNovel Language Server]に出る
	process.on('unhandledRejection', e=> {
		conn.console.error(`Unhandled exception ${String(e)}`);
	});

const docs = new TextDocuments(TextDocument);

let hasCfgCap = false;
let hasDiagRelatedInfCap = false;

const mLspWs = new Map<FULL_PATH, LspWs>();


conn.onInitialize(prm=> {
	const cap = prm.capabilities;
	hasCfgCap = Boolean(cap.workspace?.configuration);
	const hasWsFldCap = Boolean(cap.workspace?.workspaceFolders);
	hasDiagRelatedInfCap =
	!! cap.textDocument?.publishDiagnostics?.relatedInformation;
	const inlayHintSupport = Boolean(cap.workspace?.inlayHint?.refreshSupport);
	//let inlayValueSupport = false;

	conn.onInitialized(()=> {
		// すべての構成変更を登録
		if (hasCfgCap) void conn.client.register(DidChangeConfigurationNotification.type, undefined);

		// vsix デバッグ用（【出力】-【ログ（ウインドウ）】にも出す）
		console.log = (...args)=> {
			const txt = String(args);
			conn.console.log(txt);
			void conn.sendRequest(REQ_ID, {cmd: 'log', txt});
		};
		console.error = (...args)=> {
			const txt = String(args);
			conn.console.error(txt);
			void conn.sendRequest(REQ_ID, {cmd: 'error', txt});
		};

		// クライアントからの受信
		conn.onRequest(REQ_ID, (ls: T_MES_L2S)=> mLspWs.get(ls.pathWs)?.onRequest(ls));

		// コード内に挿入して表示するインレイヒント
		if (inlayHintSupport) conn.languages.inlayHint
		.on(prm=> getLspWs(prm.textDocument)?.onInlayHint(prm));

		// 起動時のワークスペースのフォルダに対し管理オブジェクトを生成
		mLspWs.clear();
		for (const wf of prm.workspaceFolders ?? []) mLspWs.set(
			fullSchPath2fp(wf.uri),
			new LspWs(wf, conn, docs, hasDiagRelatedInfCap),
		);

		// aLspWs = (prm.workspaceFolders ?? []).map(wf=> new LspWs(wf, conn, docs, hasDiagRelatedInfCap));
		// ワークスペースのフォルダ数変化
		if (hasWsFldCap) conn.workspace.onDidChangeWorkspaceFolders(e=> {
			for (const {uri} of e.removed) mLspWs.delete(uri);
			for (const wf of e.added) mLspWs.set(
				fullSchPath2fp(wf.uri),
				new LspWs(wf, conn, docs, hasDiagRelatedInfCap),
			);
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
		//	hoverProvider	: true,		// 識別子上にマウスホバーしたとき表示するヒント
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
			// NOTE: 色づけ、LSPでやったほうが軽い？ 優先順位低いが

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
	const wf = getLspWs(prm.textDocument);
	if (! wf) return undefined;

	const aCi = wf.onCompletion(prm);
	if (aCi) {wfCompletioning = wf; return aCi;}

	return undefined;
});
let wfCompletioning: LspWs;
//	// 自動補完候補の選択（補完リストで選択された項目の追加情報を解決するハンドラー）
conn.onCompletionResolve(ci=> wfCompletioning.onCompletionResolve(ci));


// === 引数の説明 ===
conn.onSignatureHelp(prm=> getLspWs(prm.textDocument)?.onSignatureHelp(prm));


// === 定義へ移動、定義をここに表示 ===
conn.onDefinition(prm=> getLspWs(prm.textDocument)?.onDefinition(prm));

// === 参照へ移動、参照をここに表示 ===
conn.onReferences(prm=> getLspWs(prm.textDocument)?.onReferences(prm));


//conn.onWorkspaceSymbol

// === ドキュメントアウトライン ===
conn.onDocumentSymbol(prm=> getLspWs(prm.textDocument)?.onDocumentSymbol(prm));


// === コードアクション ===
conn.onCodeAction(prm=> getLspWs(prm.textDocument)?.onCodeAction(prm));


// === リンク ===
conn.onDocumentLinks(prm=> getLspWs(prm.textDocument)?.onDocumentLinks(prm));
	// if (wf) wfDocumentLinks = wf;
/*
	let wfDocumentLinks: LspWs;
	conn.onDocumentLinkResolve(prm=> {
// console.log(`fn:LangSrv.ts line:272 prm:${JSON.stringify(prm)}`);
		return wfDocumentLinks.onDocumentLinkResolve(prm)
	});
	//conn.onDocumentLinkResolve(prm=> wfDocumentLinks.onDocumentLinkResolve(prm));
*/


// === シンボルの名前変更・準備 ===
conn.onPrepareRename(prm=> getLspWs(prm.textDocument)?.onPrepareRename(prm));
// === シンボルの名前変更 ===
conn.onRenameRequest(prm=> getLspWs(prm.textDocument)?.onRenameRequest(prm));


conn.onShutdown(()=> {
	mLspWs.forEach(wf=> wf.destroy());
	mLspWs.clear();
});


// === ファイル開きイベント（ファイルを開いたときにも） ===
const hDocThrowOpCl: {[uri: string]: 0} = {};
docs.onDidOpen(prm=> {	// 開いた時のみのイベントにする
	const {uri} = prm.document;
	hDocThrowOpCl[uri] = 0;

	return getLspWs(prm.document)?.onDidOpen(prm);
});

// === ファイル変更イベント（手入力が対象） ===
docs.onDidChangeContent(prm=> {	// 変更時のみのイベントにする
	const {uri} = prm.document;
	// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
	if (uri in hDocThrowOpCl) {delete hDocThrowOpCl[uri]; return;}

	getLspWs(prm.document)?.onDidChangeContent(prm);
});

// === ファイル保存前イベント ===
// docs.onWillSave(e=> {
// 	const {uri} = e.document;
// 	if (uri in hDocThrowOpCl) {delete hDocThrowOpCl[uri]; return;}

// 	for (const wf of aLspWs) wf.onWillSave(e);
// });

// === ファイル閉じイベント
// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
docs.onDidClose(({document: {uri}})=> delete hDocThrowOpCl[uri]);


// === ファイル変更イベント（手入力以外が対象） ===
//	// LanguageClientOptions.synchronize.fileEvents での設定によるイベント
//	// Changed は保存時に発生する
// conn.onDidChangeWatchedFiles(e=> {
// 	for (const wf of aLspWs) wf.onDidChangeWatchedFiles(e);
// });



// =======================================
docs.listen(conn);
conn.listen();
