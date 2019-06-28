/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {trim, treeProc} from './CmnLib';
import {AnalyzeTagArg} from './AnalyzeTagArg';
import {QuickPickItem, ExtensionContext, commands, workspace, QuickPickOptions, window, Uri, languages, Location, Position, Range, Hover} from 'vscode';
import m_xregexp = require('xregexp');
const fs = require('fs-extra');

interface Script {
	aToken	: string[];		// トークン群
	len		: number;		// トークン数
	aLNum	: number[];		// トークンの行番号
};
interface HScript {
	[name: string]: Script;
};

function openTagRef(v: QuickPickItem) {
	commands.executeCommand('vscode.open', Uri.parse('https://famibee.github.io/SKYNovel/tag.htm#'+ v.label));
};

export class ReferenceProvider {
	private	static readonly	pickItems: QuickPickItem[] = [
		// 変数操作
		{label: 'clearsysvar', description: 'システム変数の全消去'},
		{label: 'clearvar', description: 'ゲーム変数の全消去'},
		{label: 'let', description: '変数代入・演算'},
		{label: 'let_abs', description: '絶対値'},
		{label: 'let_char_at', description: '文字列から一字取りだし'},
		{label: 'let_index_of', description: '文字列で検索'},
		{label: 'let_length', description: '文字列の長さ'},
		{label: 'let_ml', description: 'インラインテキスト代入'},
		{label: 'let_replace', description: '正規表現で置換'},
		{label: 'let_round', description: '四捨五入'},
		{label: 'let_search', description: '正規表現で検索'},
		{label: 'let_substr', description: '文字列から抜きだし'},

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

		// HTMLフレーム
		{label: 'add_frame', description: 'フレーム'},
		{label: 'let_frame', description: 'フレーム'},
		{label: 'set_frame', description: 'フレーム'},
		{label: 'frame', description: 'フレーム'},
		{label: 'tsy_frame', description: 'フレーム'},

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
		{label: 'loadplugin', description: 'プラグインの読み込み'},
		{label: 'navigate_to', description: 'ＵＲＬを開く'},
		{label: 'snapshot', description: 'スナップショット'},
		{label: 'title', description: 'タイトル指定'},
		{label: 'toggle_full_screen', description: '全画面状態切替'},
		{label: 'window', description: 'アプリウインドウ設定'},

		// デバッグ・その他
		{label: 'dump_val', description: '変数のダンプ'},
		{label: 'dump_script', description: 'スクリプトのダンプ'},
		{label: 'dump_stack', description: 'スタックのダンプ'},
		{label: 'log', description: 'ログ出力'},
		{label: 'dump_lay', description: 'レイヤのダンプ'},
		{label: 'stats', description: 'パフォーマンス表示'},
		{label: 'trace', description: 'デバッグ表示へ出力'},
	];

	constructor(context: ExtensionContext, curPrj: string) {
		this.loadCfg();

		// コマンドパレット・イベント
		const doc_sel = {scheme: 'file', language: 'skynovel'};
		context.subscriptions.push(commands.registerCommand('skynovel.openReferencePallet', ()=> {
			const options: QuickPickOptions = {
				'placeHolder': 'Which reference will you open?',
				'matchOnDescription': true,
			};

			window.showQuickPick<QuickPickItem>(ReferenceProvider.pickItems, options).then(q=> {if (q) openTagRef(q)});
		}));
		context.subscriptions.push(workspace.onDidChangeConfiguration(()=> this.loadCfg()));

		// hover provider（識別子の上にマウスカーソルを載せたとき）イベント
		languages.registerHoverProvider(doc_sel, {provideHover(doc, pos) {
			const rng = doc.getWordRangeAtPosition(pos, /\[[a-zA-Z0-9_]+/);
			if (rng) {
				const tag_name = doc.lineAt(pos.line).text.slice(rng.start.character +1, rng.end.character);
				const loc = ReferenceProvider.hMacro[tag_name];
				if (loc) return new Hover(`[${tag_name}] マクロです 定義ファイル：${loc.uri.fsPath}`);

				const len = ReferenceProvider.pickItems.length;
				for (let i=0; i<len; ++i) {
					const q = ReferenceProvider.pickItems[i];
					if (q.label == tag_name) return new Hover(`[${tag_name}] タグです 機能：${q.description}`);
				}
			}
			return Promise.reject('No word here.');
		}});

		// definition provider「定義へ移動」「定義をここに表示」イベント
		context.subscriptions.push(languages.registerDefinitionProvider(
			doc_sel, {provideDefinition(doc, pos) {
				const rng = doc.getWordRangeAtPosition(pos, /\[[a-zA-Z0-9_]+/);
				if (! rng) return Promise.reject('No word here.');

				const tag_name = doc.lineAt(pos.line).text.slice(rng.start.character +1, rng.end.character);
				const loc = ReferenceProvider.hMacro[tag_name];
				if (loc) return Promise.resolve(loc);

				const len = ReferenceProvider.pickItems.length;
				for (let i=0; i<len; ++i) {
					const q = ReferenceProvider.pickItems[i];
					if (q.label == tag_name) {openTagRef(q); break;}
				}
				return Promise.reject('No definition found');
			}
		}));

		// プロジェクトフォルダ以下全走査
		treeProc(curPrj, url=> this.updPrj_file(url));


		// TODO: ラベルジャンプ
		// TODO: registerRenameProvider(selector: DocumentSelector, provider: RenameProvider): Disposable

/*
		const opTxt = (doc: TextDocument): void=> {
			if (doc.fileName in this.hScript) return;
//console.log(`fn:ReferenceProvider.ts line:161 fileName:${doc.fileName}`);
			// fileName = FULL PATH

//			this.hScript[doc.fileName] = this.resolveScript(doc.getText());

			// TODO: ファイル→ラベル辞書
		}
		workspace.textDocuments.forEach(doc=> opTxt(doc));	// 既に開かれていた分
		workspace.onDidOpenTextDocument(doc=> opTxt(doc));	// 後に開かれた分
			// TODO: こうじゃなくて、随時勝手に探索が必要では
*/
	}


	// 全スクリプト走査（「定義へ移動」「定義をここに表示」など）
	private	static hMacro: {[name: string]: Location} = {};
	private	readonly	alzTagArg	= new AnalyzeTagArg;
	// ファイル内定義検知
	private	updPrj_file(url: string) {
		if (url.slice(-3) != '.sn') return;

		const txt = fs.readFileSync(url, {encoding: 'utf8'});
		const script = this.hScript[url] = this.resolveScript(txt);

		const len = script.len;
		let line = 0;
		let col = 0;
		for (let i=0; i<len; ++i) {
			const token = script.aToken[i];
			const uc = token.charCodeAt(0);	// TokenTopUnicode
			// \n 改行
			if (uc == 10) {line += token.length; col = 0; continue;}
			col += token.length;
			if (uc != 91) continue;

			// [ タグ開始
			const a_tag: any = m_xregexp.exec(token, this.REG_TAG);
//			if (a_tag == null) throw 'タグ記述['+ token +']異常です(タグ解析)';
			if (a_tag == null) continue;

			const tag_name = a_tag['name'];
			if (tag_name != 'macro') continue;

			// [macro name=lr][l][r][endmacro]
//			const tag_fnc = this.hTag[tag_name];
//			if (tag_fnc == null) throw '未定義のタグ['+ tag_name +']です';

			if (! this.alzTagArg.go(a_tag['args'])) throw '属性「'+ this.alzTagArg.literal +'」は異常です';

		//	for (const k in this.alzTagArg.hPrm) {
		//		let val = this.alzTagArg.hPrm[k].val;
		//	}

			const macro_name = this.alzTagArg.hPrm['name'].val;
			if (! macro_name) continue;

			const idx = token.indexOf(macro_name, 12);
			const mn_col = col -token.length +idx;
			const rng = new Range(
				new Position(line, mn_col),
				new Position(line, mn_col +macro_name.length),
			);
			const l = ReferenceProvider.hMacro[macro_name];
			if (! l) {
				ReferenceProvider.hMacro[macro_name] = new Location(
					Uri.file(url),
					rng,
				);
				continue;
			}

			window.showErrorMessage(`[SKYNovel] プロジェクト内でマクロ定義【${macro_name}】が重複しています。どちらか削除して下さい`, {modal: true})
			.then(()=> {
				window.showQuickPick([
					{
						label: `1) ${l.uri.fsPath}`,
						description: `行番号 ${l.range.start.line +1
						}、${l.range.start.character +1} 文字目`,
					},
					{
						label: `2) ${url}`,
						description: `行番号 ${rng.start.line +1
						}、${rng.start.character +1} 文字目`,
					},
				])
				.then(selected=> {
					if (! selected) return;

					const id = Number(selected.label.slice(0, 1));
					workspace.openTextDocument(id == 1 ?l.uri.fsPath :url)
					.then(doc=> window.showTextDocument(
						doc, {selection: id == 1 ?l.range :rng}
					));
				});
			});
			return;
		}
	}
	crePrj(e: Uri) {this.updPrj_file(e.path)}	// ファイル単位増減対応
	chgPrj(e: Uri) {	// ファイル変更対応・強制削除＆再定義
		this.delPrj(e);
		this.updPrj_file(e.path);
	}
	delPrj(e: Uri) {	// （ファイル削除により）定義削除
		for (const macnm in ReferenceProvider.hMacro) {
			if (ReferenceProvider.hMacro[macnm].uri.path != e.path) continue;
			delete ReferenceProvider.hMacro[macnm];
		}
	}


	private loadCfg = ()=> ReferenceProvider.pickItems.sort(this.compare).forEach(q=> {
		q.description += '（SKYNovel）';
	});
	private compare(a: QuickPickItem, b: QuickPickItem): number {
		const aStr = a.label + a.description;
		const bStr = b.label + b.description;
		return aStr > bStr ? 1 : aStr === bStr ? 0 : -1;
	}


	private hScript	: HScript	= Object.create(null);	//{} シナリオキャッシュ
	private	readonly REG_TAG_LET_ML		= m_xregexp(`^\\[let_ml\\s`, 'g');
	private resolveScript(txt: string): Script {
		txt = txt.replace(/(\r\n|\r)/g, '\n');
		const v = this.cnvMultilineTag(txt).match(this.REG_TOKEN);
		if (! v) throw 'this.cnvMultilineTag fail';
		for (let i=v.length -1; i>=0; --i) {
			const e = v[i];
			this.REG_TAG_LET_ML.lastIndex = 0;
			if (this.REG_TAG_LET_ML.test(e)) {
				const idx = e.indexOf(']') +1;
				if (idx == 0) throw '[let_ml]で閉じる【]】がありません';
				const a = e.slice(0, idx);
				const b = e.slice(idx);
				v.splice(i, 1, a, b);
			}
		}
		const scr = {aToken :v, len :v.length, aLNum :[]};
		this.replaceScript_let_ml(scr);

		return scr;
	}

	private replaceScript_let_ml(scr: Script, start_idx = 0) {
		for (let i=scr.len- 1; i >= start_idx; --i) {
			const token = scr.aToken[i];
			this.REG_TAG_LET_ML.lastIndex = 0;
			if (this.REG_TAG_LET_ML.test(token)) {
				const idxSpl = token.indexOf(']') +1;
				const ml = token.slice(idxSpl);
				const cnt = (ml.match(/\n/g) || []).length;
				scr.aToken.splice(i, 1, token.slice(0, idxSpl), ml);
				scr.aLNum.splice(i, 0, scr.aLNum[i]);
				const len = scr.aToken.length;
				for (let j=i +2; j<len; ++j) scr.aLNum[j] += cnt;
			}
		}
		scr.len = scr.aToken.length;
	}


	// =============== ScriptIterator
	readonly	REG_TOKEN		= m_xregexp(	// テスト用にpublic
		`(?: \\[let_ml \\s+ [^\\[\\]]+ \\])`+
			`(?: . | \\s)+?`+	// [let_ml]〜[endlet_ml]間のテキスト
		`(?=\\[endlet_ml \\s* \\])`+
		//		`| (?<= \\[let_ml \\s+ [^\\[\\]]+ \\])`+
			// iOS、過ぎ去った前を見る肯定後読み「(?<=」使えない。エラーになるので
			// Electronも？
		`| \\[ (?: ([\\"\\'\\#]) .*? \\1 | . ) *? \\]`+	// タグ
		'| \\n+'+			// 改行
		'| \\t+'+			// タブ
		'| &[^&\\n]+&'+		// ＆表示＆
		'| &&?[^;\\n\\t&]+'+// ＆代入
		'| ;[^\\n]+'+		// コメント
		'| ^\\*\\w+'+		// ラベル
		'| [^\\n\\t\\[;]+'	// 本文
		, 'gx');


	private	readonly	REG_MULTILINE_TAG	= m_xregexp(
	`\\[
		([^\\n\\]]+ \\n
			(?:
				(["'#]) .*? \\2
			|	[^\\[\\]]
			)*
		)
	\\]
|	;[^\\n]+`
		, 'gx');
	private	static	readonly	REG_MULTILINE_TAG_SPLIT	= m_xregexp(
		`((["'#]).*?\\2|;.*\\n|\\n+|[^\\n"'#;]+)`, 'g');
	private	cnvMultilineTag(txt: string): string {	// テスト用にpublic
		return txt.replace(
			this.REG_MULTILINE_TAG,
			function (): string {
				if (arguments[0].charAt(0) == ';') return arguments[0];

				let fore = '';
				let back = '';
				for (const v of arguments[1].match(ReferenceProvider.REG_MULTILINE_TAG_SPLIT)) {
					switch (v.substr(-1)) {
						case '\n':	back += v;	break;
						case `"`:
						case `'`:
						case `#`:	fore += v;	break;
						default:	fore += ' '+ trim(v);	break;
					}
				}

				return '['+ trim(fore.slice(1)) +']'+ back;
			}
		);
	}


	private	readonly	REG_TAG	= m_xregexp(`^\\[ (?<name>\\S*) (\\s+ (?<args>.+) )? ]$`, 'x');


}
