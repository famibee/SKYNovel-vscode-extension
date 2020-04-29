/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {treeProc} from './CmnLib';
import {AnalyzeTagArg} from './AnalyzeTagArg';

import {QuickPickItem, HoverProvider, DefinitionProvider, ReferenceProvider, ReferenceContext, RenameProvider, DiagnosticCollection, ExtensionContext, commands, QuickPickOptions, workspace, window, Uri, languages, Location, Position, Range, Hover, Diagnostic, DiagnosticSeverity, TextDocument, CancellationToken, WorkspaceEdit, ProviderResult, Definition, DefinitionLink} from 'vscode';
import m_xregexp = require('xregexp');
const fs = require('fs-extra');

interface Script {
	aToken	: string[];		// トークン群
	len		: number;		// トークン数
	aLNum	: number[];		// トークンの行番号
};

function openTagRef(v: QuickPickItem) {
	commands.executeCommand('vscode.open', Uri.parse('https://famibee.github.io/SKYNovel/tag.htm#'+ v.label));
};

export class ScriptScanner implements HoverProvider, DefinitionProvider, ReferenceProvider, RenameProvider {
	private	static		inited	= false;
	private	static readonly	pickItems: QuickPickItem[] = [
		// 変数操作
		{label: 'clearsysvar', description: 'システム変数の全消去'},
		{label: 'clearvar', description: 'ゲーム変数の全消去'},
		{label: 'endlet_ml', description: 'インラインテキスト代入'},
		{label: 'let_abs', description: '絶対値'},
		{label: 'let_char_at', description: '文字列から一字取りだし'},
		{label: 'let_index_of', description: '文字列で検索'},
		{label: 'let_length', description: '文字列の長さ'},
		{label: 'let_ml', description: 'インラインテキスト代入'},
		{label: 'let_replace', description: '正規表現で置換'},
		{label: 'let_round', description: '四捨五入'},
		{label: 'let_search', description: '正規表現で検索'},
		{label: 'let_substr', description: '文字列から抜きだし'},
		{label: 'let', description: '変数代入・演算'},

		// レイヤ共通
		{label: 'add_lay', description: 'レイヤを追加する'},
		{label: 'clear_lay', description: 'レイヤ設定の消去'},
		{label: 'finish_trans', description: 'トランス強制終了'},
		{label: 'lay', description: 'レイヤ設定'},
		{label: 'trans', description: 'ページ裏表を交換'},
		{label: 'wt', description: 'トランス終了待ち'},

		// レイヤトゥイーン
		{label: 'pause_tsy', description: '一時停止'},
		{label: 'resume_tsy', description: '一時停止再開'},
		{label: 'stop_tsy', description: 'トゥイーン中断'},
		{label: 'tsy', description: 'トゥイーン開始'},
		{label: 'wait_tsy', description: 'トゥイーン終了待ち'},

		// 文字・文字レイヤ
		{label: 'autowc', description: '文字ごとのウェイト'},
		{label: 'ch_in_style', description: '文字出現演出定義'},
		{label: 'ch_out_style', description: '文字消去演出定義'},
		{label: 'ch', description: '文字を追加する'},
		{label: 'clear_text', description: '文字消去'},
		{label: 'current', description: 'デフォルト文字レイヤ設定'},
		{label: 'endlink', description: 'ハイパーリンクの終了'},
		{label: 'er', description: 'ページ両面の文字消去'},
		{label: 'graph', description: 'インライン画像表示'},
		{label: 'link', description: 'ハイパーリンク'},
		{label: 'r', description: '改行'},
		{label: 'rec_ch', description: '履歴書き込み'},
		{label: 'rec_r', description: '履歴改行'},
		{label: 'reset_rec', description: '履歴リセット'},
		{label: 'ruby2', description: '文字列と複数ルビの追加'},
		{label: 'set_focus', description: '未作成：フォーカス移動'},
		{label: 'span', description: 'インラインスタイル設定'},
		{label: 'tcy', description: '縦中横を表示する'},

		// 画像・画像レイヤ
		{label: 'add_face', description: '差分画像の追加'},
		{label: 'wv', description: '動画再生終了待ち'},

		// HTMLフレーム
		{label: 'add_frame', description: 'フレーム追加'},
		{label: 'frame', description: 'フレームに設定'},
		{label: 'let_frame', description: 'フレーム変数を取得'},
		{label: 'set_frame', description: 'フレーム変数に設定'},
		{label: 'tsy_frame', description: 'フレームをトゥイーン開始'},

		// イベント
		{label: 'clear_event', description: 'イベントを全消去'},
		{label: 'enable_event', description: 'イベント有無の切替'},
		{label: 'event', description: 'イベントを予約'},
		{label: 'l', description: '行末クリック待ち'},
		{label: 'p', description: '改ページクリック待ち'},
		{label: 's', description: '停止する'},
		{label: 'set_cancel_skip', description: 'スキップ中断予約'},
		{label: 'wait', description: 'ウェイトを入れる'},
		{label: 'waitclick', description: 'クリックを待つ'},

		// ＢＧＭ・効果音
		{label: 'fadebgm', description: 'BGMのフェード'},
		{label: 'fadeoutbgm', description: 'BGMのフェードアウト'},
		{label: 'fadeoutse', description: '効果音のフェードアウト'},
		{label: 'fadese', description: '効果音のフェード'},
		{label: 'playbgm', description: 'BGM の演奏'},
		{label: 'playse', description: '効果音の再生'},
		{label: 'stop_allse', description: '全効果音再生の停止'},
		{label: 'stopbgm', description: 'BGM 演奏の停止'},
		{label: 'stopfadese', description: '音声フェードの停止'},
		{label: 'stopse', description: '効果音再生の停止'},
		{label: 'volume', description: '音量設定'},
		{label: 'wb', description: 'BGM フェードの終了待ち'},
		{label: 'wf', description: '効果音フェードの終了待ち'},
		{label: 'wl', description: 'BGM 再生の終了待ち'},
		{label: 'ws', description: '効果音再生の終了待ち'},
		{label: 'xchgbuf', description: '再生トラックの交換'},

		// 条件分岐
		{label: 'else', description: 'その他ifブロック開始'},
		{label: 'elsif', description: '別条件のifブロック開始'},
		{label: 'endif', description: 'ifブロックの終端'},
		{label: 'if', description: 'ifブロックの開始'},

		// ラベル・ジャンプ
		{label: 'button', description: 'ボタンを表示'},
		{label: 'call', description: 'サブルーチンコール'},
		{label: 'jump', description: 'シナリオジャンプ'},
		{label: 'pop_stack', description: 'コールスタック破棄'},
		{label: 'return', description: 'サブルーチンから戻る'},

		// マクロ
		{label: 'bracket2macro', description: '括弧マクロの定義'},
		{label: 'break_macro', description: 'マクロから脱出'},
		{label: 'char2macro', description: '一文字マクロの定義'},
		{label: 'endmacro', description: 'マクロ定義の終了'},
		{label: 'macro', description: 'マクロ定義の開始'},

		// しおり
		{label: 'copybookmark', description: 'しおりの複写'},
		{label: 'erasebookmark', description: 'しおりの消去'},
		{label: 'load', description: 'しおりの読込'},
		{label: 'record_place', description: 'セーブポイント指定'},
		{label: 'reload_script', description: 'スクリプト再読込'},
		{label: 'save', description: 'しおりの保存'},

		// 画面揺らし
		{label: 'quake', description: '画面を揺らす'},
		{label: 'stop_quake', description: '画面揺らし中断'},
		{label: 'wq', description: '画面揺らし終了待ち'},

		// システム
		{label: 'close', description: 'アプリの終了'},
		{label: 'export', description: 'プレイデータをエクスポート'},
		{label: 'import', description: 'プレイデータをインポート'},
		{label: 'loadplugin', description: 'cssの読み込み'},
//		{label: 'mouse', description: 'マウスの設定'},
		{label: 'navigate_to', description: 'ＵＲＬを開く'},
//		{label: 'set_focus', description: 'フォーカス移動'},
		{label: 'snapshot', description: 'スナップショット'},
		{label: 'title', description: 'タイトル指定'},
		{label: 'toggle_full_screen', description: '全画面状態切替'},
//		{label: 'unzip', description: 'ネット素材取得'},
		{label: 'update_check', description: '更新チェック機能'},
		{label: 'window', description: 'アプリウインドウ設定'},

		// デバッグ・その他
		{label: 'dump_lay', description: 'レイヤのダンプ'},
		{label: 'dump_script', description: 'スクリプトのダンプ'},
		{label: 'dump_stack', description: 'スタックのダンプ'},
		{label: 'dump_val', description: '変数のダンプ'},
		{label: 'log', description: 'ログ出力'},
		{label: 'stats', description: 'パフォーマンス表示'},
		{label: 'trace', description: 'デバッグ表示へ出力'},
	];
	private	static		hTag	: {[name: string]: boolean}	= {};

	private	readonly	clDiag	: DiagnosticCollection;

	constructor(ctx: ExtensionContext, private curPrj: string) {
		this.lenRootPath = (workspace.rootPath ?? '').length +1;

		// コマンドパレット・イベント
		if (! ScriptScanner.inited) {
			ScriptScanner.inited = true;

			ScriptScanner.pickItems.map(q=> ScriptScanner.hTag[q.label] = true);

			ctx.subscriptions.push(commands.registerCommand('skynovel.openReferencePallet', ()=> {
				const options: QuickPickOptions = {
					'placeHolder': 'Which reference will you open?',
					'matchOnDescription': true,
				};

				window.showQuickPick<QuickPickItem>(ScriptScanner.pickItems, options).then(q=> {if (q) openTagRef(q)});
			}));
		}

		this.loadCfg();
		ctx.subscriptions.push(workspace.onDidChangeConfiguration(()=> this.loadCfg()));

		// 識別子の上にマウスカーソルを載せたとき
		const doc_sel = {scheme: 'file', language: 'skynovel'};
		ctx.subscriptions.push(languages.registerHoverProvider(doc_sel, this));
		// 「定義へ移動」「定義をここに表示」
		ctx.subscriptions.push(languages.registerDefinitionProvider(doc_sel, this));
		// 「参照へ移動」「参照をここに表示」
		ctx.subscriptions.push(languages.registerReferenceProvider(doc_sel, this));
		// 「シンボルの名前変更」
		ctx.subscriptions.push(languages.registerRenameProvider(doc_sel, this));
		// 診断機能
		this.clDiag = languages.createDiagnosticCollection('skynovel');
		ctx.subscriptions.push(this.clDiag);

		// コードアクション（電球マーク）
		// languages.registerCodeActionsProvider

		// TODO: ラベルジャンプ
	}
	private			readonly lenRootPath: number;
	private static	readonly regTagName	= /[^\s\[\]="'#;]+/;


	// 識別子の上にマウスカーソルを載せたとき
	provideHover(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Hover> {
		const r = doc.getWordRangeAtPosition(pos, ScriptScanner.regTagName);
		if (! r) return Promise.reject('No word here.');

		const nm = doc.lineAt(pos.line).text.slice(r.start.character, r.end.character);
		const loc = this.hMacro[nm];
		if (loc) return new Hover(`[${nm}] マクロです 定義ファイル：${loc.uri.fsPath.slice(this.lenRootPath)}`);

		const locPlg = this.hPlugin[nm];
		if (locPlg) return new Hover(`[${nm}] プラグイン定義タグです 定義ファイル：${locPlg.uri.fsPath.slice(this.lenRootPath)}`);

		const q = ScriptScanner.pickItems.find(q=> q.label == nm);
		if (q) return new Hover(`[${nm}] タグです 機能：${q.description}`);

		return Promise.reject('No word here.');
	}

	// 「定義へ移動」「定義をここに表示」
	provideDefinition(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Definition | DefinitionLink[]> {
		const r = doc.getWordRangeAtPosition(pos, ScriptScanner.regTagName);
		if (! r) return Promise.reject('No word here.');

		const isDirty = doc.isDirty;
		return doc.save()	// hMacroを更新するため
		.then(()=> new Promise((re, rj)=> {
			if (isDirty) this.scanAllScript();

			const nm = doc.lineAt(pos.line).text.slice(r.start.character, r.end.character);
			const loc = this.hMacro[nm];
			if (loc) return re(loc);

			const locPlg = this.hPlugin[nm];
			if (locPlg) return re(locPlg);

			const q = ScriptScanner.pickItems.find(q=> q.label == nm);
			if (q) {openTagRef(q); return re();}

			return rj('No definition found');
		}));
	}

	// 「参照へ移動」「参照をここに表示」
	provideReferences(doc: TextDocument, pos: Position, _ctx: ReferenceContext, _token: CancellationToken): ProviderResult<Location[]> {
		const r = doc.getWordRangeAtPosition(pos, ScriptScanner.regTagName);
		if (! r) return Promise.reject('No word here.');

		const isDirty = doc.isDirty;
		return doc.save()	// hMacroUseを更新するため
		.then(()=> new Promise((re, rj)=> {
			if (isDirty) this.scanAllScript();

			const nm = doc.lineAt(pos.line).text.slice(r.start.character, r.end.character);
			const loc = this.hMacroUse[nm];
			if (loc) return re(loc);

			return rj('No references found');
		}));
	}

	// 「シンボルの名前変更」
	prepareRename(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Range | {placeholder: string, range: Range}> {
		const r = doc.getWordRangeAtPosition(pos, ScriptScanner.regTagName);
		if (! r) return Promise.reject('No word here.');

		const isDirty = doc.isDirty;
		return doc.save()	// hMacroを更新するため
		.then(()=> new Promise((re, rj)=> {
			if (isDirty) this.scanAllScript();

			const nm = doc.lineAt(pos.line).text.slice(r.start.character, r.end.character);
			if (nm in ScriptScanner.hTag) return rj('タグは変名できません');

			const mp = this.hPlugin[nm];
			if (mp) {
				this.nm4rename = nm;
				return re(
					(doc.uri.path == mp.uri.path && mp.range.contains(pos))
					? mp.range
					: r
				);
			}

			const m = this.hMacro[nm];
			if (! m) return rj('未定義マクロ・タグです');
			this.nm4rename = nm;
			return re(
				(doc.uri.path == m.uri.path && m.range.contains(pos))
				? m.range
				: r
			);
		}));
	}
	private nm4rename = '';
	provideRenameEdits(_doc: TextDocument, _pos: Position, newName: string, _token: CancellationToken): ProviderResult<WorkspaceEdit> {
		return new Promise((re, rj)=> {
			// tokenに空白が含まれないこと
			if (/(\s|　)/.test(newName)) return rj('空白を含む変名はできません');
			if (newName in ScriptScanner.hTag) return rj('既にあるタグ名です');
			if (newName in this.hMacro) return rj('既にあるマクロ名です');
			if (newName in this.hPlugin) return rj('既にあるプラグイン定義タグ名です');

			// 使用箇所
			const we = new WorkspaceEdit();
			const mu = this.hMacroUse[this.nm4rename];
			if (mu) {
				this.hMacroUse[newName] = mu;
				delete this.hMacroUse[this.nm4rename];

				mu.forEach(p=> we.replace(p.uri, p.range, newName));
			}

			// プラグイン定義タグ定義
			const mp = this.hPlugin[this.nm4rename];
			if (mp) {
				this.hPlugin[newName] = mp;
				delete this.hPlugin[this.nm4rename];

				we.replace(mp.uri, mp.range, newName);
				return re(we);
			}

			// マクロ定義
			const m = this.hMacro[this.nm4rename];
			this.hMacro[newName] = m;
			delete this.hMacro[this.nm4rename];

			we.replace(m.uri, m.range, newName);
			return re(we);
		});
	}


	private nm2Diag	: {[path: string]: Diagnostic[]}= {};
	scanAllScript() {
		this.hMacro = {};
		this.hMacroUse = {};
		this.clDiag.clear();
		this.nm2Diag = {};
		treeProc(this.curPrj, url=> this.scanScript(url));

		for (const def_nm in this.hMacro) {
			if (def_nm in this.hMacroUse) continue;

			const loc = this.hMacro[def_nm];
			this.nm2Diag[loc.uri.path].push(new Diagnostic(
				loc.range,
				`未使用のマクロ[${def_nm}]があります`,
				DiagnosticSeverity.Information
			));
		}

		for (const use_nm in this.hMacroUse) {
			if (use_nm in this.hMacro) continue;
			if (use_nm in this.hPlugin) continue;

			const aLoc = this.hMacroUse[use_nm];
			aLoc.forEach(loc=> this.nm2Diag[loc.uri.path].push(new Diagnostic(
				loc.range,
				`未定義マクロ[${use_nm}]を使用、あるいはスペルミスです`,
				DiagnosticSeverity.Warning
			)));
		}

		for (const path in this.nm2Diag) {
			this.clDiag.set(Uri.file(path), this.nm2Diag[path]);
		}
	}

	private	hPlugin	: {[def_nm: string]: Location}	= {};
	setHDefPlg(hDefPlg: {[def_nm: string]: Location}) {this.hPlugin = hDefPlg}

	private	hMacro		: {[nm: string]: Location}		= {};
	private	hMacroUse	: {[nm: string]: Location[]}	= {};
	crePrj(_e: Uri) {this.scanAllScript()}	// ファイル増減
	chgPrj(_e: Uri) {this.scanAllScript()}	// ファイル変更
	delPrj(_e: Uri) {this.scanAllScript()}	// ファイル削除

	private			readonly	alzTagArg	= new AnalyzeTagArg;
	private	static	readonly	regValName
		= /(?<=name\s*=\s*)([^"'#;\]]+|(["'#])(.*?)\2)/m;
	private	scanScript(url: string) {
		if (url.slice(-3) != '.sn') return;

		this.nm2Diag[url] = this.nm2Diag[url] ?? [];
		const diags = this.nm2Diag[url];
		let show_mes = false;

		let line = 0, col = 0;
		const uri = Uri.file(url);
		let procToken = (token: string)=> {
			if (! token) return;
			const uc = token.charCodeAt(0);	// TokenTopUnicode
			const len = token.length;
			if (uc == 10) {line += len; col = 0; return;}	// \n 改行
			if (uc == 59) {	// ; コメント
				const a = token.match(/#NO_WARM_UNUSED_MACRO\s+(\S+)/);
				if (a) {
					const nm = a[1];
					const mu = this.hMacroUse[nm] ?? [];
					const rng = new Range(
						line, col +22,
						line, col +22 +len
					);
					mu.push(new Location(uri, rng));
					this.hMacroUse[nm] = mu;
				}
				col += len;
				return;
			}
			if (uc != 91) {col += len; return;}	// [ タグ開始

			const a_tag: any = m_xregexp.exec(token, ScriptScanner.REG_TAG);
			if (! a_tag) {	// []、[ ]など
				const rng = new Range(
					line, col,
					line, col +len
				);
				diags.push(new Diagnostic(rng, `タグ記述【${token}】異常です`, DiagnosticSeverity.Error));
				col += len;
				return;
			}

			// 複数行事の行カウント補正
			let lineTkn = 0;
			let j = -1;
			while ((j = token.indexOf('\n', j +1)) >= 0) ++lineTkn;

			const rng_nm = new Range(
				line, col,
				line, col +a_tag.name.length
			);
			if (lineTkn <= 0) col += len;
			else {
				line += lineTkn;
				col = len -token.lastIndexOf('\n') -1;
				if (lineTkn > 10) diags.push(new Diagnostic(
					new Range(
						rng_nm.start.line, rng_nm.start.character -1,
						line, 0
					),
					`改行タグが10行を超えています`,
					DiagnosticSeverity.Warning
				));
			}

			const rng = new Range(
				rng_nm.start.line, rng_nm.start.character +1,
				rng_nm.end.line, rng_nm.end.character +1
			);
			const use_nm = a_tag.name;
			if (use_nm != 'macro') {
			//	if (use_nm in this.$hDefPlg) return;	プラグイン定義タグも登録
				if (use_nm in ScriptScanner.hTag) {
					if (use_nm == 'let_ml') fncToken = tkn=> {
						if (! tkn) return;

						const lenTkn = tkn.length;
						let lineTkn = 0;
						let j = -1;
						while ((j = tkn.indexOf('\n', j +1)) >= 0) ++lineTkn;
						if (lineTkn == 0) col += lenTkn; else {
							line += lineTkn;
							col = lenTkn -tkn.lastIndexOf('\n') -1;
						}
						fncToken = procToken;
					}
					return;
				}

				// 使用箇所更新
				const mu = this.hMacroUse[use_nm] ?? [];
				mu.push(new Location(uri, rng));
				this.hMacroUse[use_nm] = mu;
				return;
			}

			// マクロ定義
			this.alzTagArg.go(a_tag.args);
			const def_nm = this.alzTagArg.hPrm.name?.val;
			if (! def_nm) {	// [macro name=]など
				diags.push(new Diagnostic(rng, `マクロ定義[${def_nm}]の引数が異常です`, DiagnosticSeverity.Error));
				return;
			}

			if (ScriptScanner.hTag[def_nm]) {
				diags.push(new Diagnostic(rng, `定義済みのタグ[${def_nm}]と同名のマクロは定義できません`, DiagnosticSeverity.Error));
				return;
			}
			if (this.hPlugin[def_nm]) {
				diags.push(new Diagnostic(rng, `プラグイン定義済みのタグ[${def_nm}]と同名のマクロは定義できません`, DiagnosticSeverity.Error));
				return;
			}

			const loc = this.hMacro[def_nm];
			if (! loc) {	// 新規マクロ定義を登録
				const m = token.match(ScriptScanner.regValName);
				if (! m) {	// 失敗ケースが思い当たらない
					diags.push(new Diagnostic(rng, `マクロ定義（[${def_nm}]）が異常です`, DiagnosticSeverity.Error));
					return;
				}

				const idx_name_v = (m.index ?? 0) +(m[3] ?1 :0);	// '"#分

				let lineNmVal = 0;
				let j = idx_name_v;
				while ((j = token.lastIndexOf('\n', j -1)) >= 0) ++lineNmVal;

				const line2 = line -lineTkn +lineNmVal;
				const col2 = ((lineNmVal == 0) ?col -len :0)
					+ idx_name_v -token.lastIndexOf('\n', idx_name_v) -1;
				this.hMacro[def_nm] = new Location(
					Uri.file(url),
					new Range(
						line2, col2,
						line2, col2 +def_nm.length,
					)
				);
				return;
			}

			// すでに定義済みのマクロ
			const dia = new Diagnostic(loc.range, `マクロ定義（[${def_nm}]）が重複`, DiagnosticSeverity.Error);
			if (! diags.find(d=> d.range == loc.range)) {
				if (loc.uri.fsPath == url) diags.push(dia);
				else this.clDiag.set(loc.uri, [dia]);
			}
			diags.push(new Diagnostic(
				new Range(rng_nm.start, new Position(line, col)),
				`マクロ定義（[${def_nm}]）が重複`,
				DiagnosticSeverity.Error
			));

			if (show_mes) return;
			show_mes = true;
			window.showErrorMessage(`[SKYNovel] プロジェクト内でマクロ定義【${def_nm}】が重複しています。どちらか削除して下さい`, {modal: true});
		};
		let fncToken = procToken;
		this.resolveScript(fs.readFileSync(url, {encoding: 'utf8'})).aToken
		.forEach(token=> fncToken(token));
	}


	private loadCfg = ()=> ScriptScanner.pickItems.sort(this.compare).forEach(q=> q.description += '（SKYNovel）');
	private compare(a: QuickPickItem, b: QuickPickItem): number {
		const aStr = a.label + a.description;
		const bStr = b.label + b.description;
		return aStr > bStr ? 1 : aStr === bStr ? 0 : -1;
	}


	private	static	readonly REG_TAG_LET_ML	= m_xregexp(`^\\[let_ml\\s`, 'g');
	private resolveScript(txt: string): Script {
		const a = txt
			.replace(/(\r\n|\r)/g, '\n')
			.match(this.REG_TOKEN) ?? [];
		for (let i=a.length -1; i>=0; --i) {
			const t = a[i];
			ScriptScanner.REG_TAG_LET_ML.lastIndex = 0;
			if (ScriptScanner.REG_TAG_LET_ML.test(t)) {
				const idx = t.indexOf(']') +1;
				if (idx == 0) throw '[let_ml]で閉じる【]】がありません';
				const s = t.slice(0, idx);
				const e = t.slice(idx);
				a.splice(i, 1, s, e);
			}
		}
		const scr = {aToken :a, len :a.length, aLNum :[]};
		this.replaceScript_let_ml(scr);

		return scr;
	}

	private replaceScript_let_ml(scr: Script, start_idx = 0) {
		for (let i=scr.len- 1; i >= start_idx; --i) {
			const token = scr.aToken[i];
			ScriptScanner.REG_TAG_LET_ML.lastIndex = 0;
			if (ScriptScanner.REG_TAG_LET_ML.test(token)) {
				const idxSpl = token.indexOf(']') +1;
				const ml = token.slice(idxSpl);
				const cnt = (ml.match(/\n/g) ?? []).length;
				scr.aToken.splice(i, 1, token.slice(0, idxSpl), ml);
				scr.aLNum.splice(i, 0, scr.aLNum[i]);
				const len = scr.aToken.length;
				for (let j=i +2; j<len; ++j) scr.aLNum[j] += cnt;
			}
		}
		scr.len = scr.aToken.length;
	}


	// =============== Grammar
	REG_TOKEN	: RegExp;
	private	mkEscape(ce: string) {return m_xregexp(
			// 1059 match 13935 step (8ms) https://regex101.com/r/ygXx16/6
		(ce	?`\\${ce}\\S |` :'')+	// エスケープシーケンス
		'	\\n+'+			// 改行
		'|	\\t+'+			// タブ
		`|	\\[let_ml \\s+ [^\\]]+ \\]`+
			`.+?`+	// [let_ml]〜[endlet_ml]間のテキスト
		`(?=\\[endlet_ml [\\]\\s])`+
		//		`| (?<= \\[let_ml \\s+ [^\\[\\]]+ \\])`+
			// iOS、過ぎ去った前を見る肯定後読み「(?<=」使えない。エラーになるので
			// Electronも？
		`|	\\[ (?: [^"'#;\\]]+ | (["'#]) .*? \\1 | ;[^\\n]* ) *? ]`+	// タグ
		'|	;[^\\n]*'+		// コメント
		'|	&[^&\\n]+&'+	// ＆表示＆
		'|	&&?[^;\\n\\t&]+'+// ＆代入
		'|	^\\*\\w+'+		// ラベル
		`| [^\\n\\t\\[;${ce ?`\\${ce}` :''}]+`,	// 本文
		'gxs');
	}
	setEscape(ce: string) {
	//	if (this.hC2M && (ce in this.hC2M)) throw '[エスケープ文字] char【'+ ce +'】が登録済みの括弧マクロまたは一文字マクロです';

		this.REG_TOKEN = this.mkEscape(ce);
		// TODO: シンタックスハイライトの正規表現：エスケープシーケンス
	//	RubySpliter.setEscape(ce);
	//	this.REG_CANTC2M = new RegExp(`[\w\s;[\]*=&｜《》${ce}]`);
	//	this.REG_TOKEN_NOTXT = new RegExp(`[\n\t;\[*&${ce ?`\\${ce}` :''}]`);

		this.scanAllScript();
	}

	private	static	readonly	REG_TAG	= m_xregexp(
		// 47 match 959 step (1ms) https://regex101.com/r/TKk1Iz/4
`\\[ (?<name>[^\\s;\\]]+) \\s*
	(?<args> (?: [^"'#\\]]+ | (["'#]) .*? \\3 )*?)
]`, 'x');

}
