/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {getFn, int, REG_SCRIPT} from './CmnLib';
import {Grammar, Script} from './Grammar';
import {AnalyzeTagArg, HPRM} from './AnalyzeTagArg';
import {MD_PARAM_DETAILS, MD_STRUCT} from '../../dist/md2json';
const hMd: {[tag_nm: string]: MD_STRUCT} = require('../dist/md.json');

import {CompletionItem, CompletionItemKind, Connection, Definition, DefinitionLink, DefinitionParams, Diagnostic, DiagnosticSeverity, DidChangeWatchedFilesParams, DocumentLink, DocumentLinkParams, DocumentSymbol, DocumentSymbolParams, FileChangeType, Hover, InlayHint, InlayHintKind, InlayHintParams, InsertTextFormat, Location, MarkupContent, ParameterInformation, Position, PrepareRenameParams, Range, ReferenceParams, RenameParams, SignatureHelp, SignatureHelpParams, SignatureInformation, SymbolInformation, SymbolKind, TextDocumentChangeEvent, TextDocumentPositionParams, TextDocuments, TextEdit, WorkspaceEdit, WorkspaceFolder} from 'vscode-languageserver/node';
import {DocumentUri, TextDocument} from 'vscode-languageserver-textdocument';

type ARG_TAG_PROC = {
	setKw	: Set<string>,
	hArg	: HPRM,
	uri		: string,
	pp		: string,
	token	: string,
	rng		: Range,
	aDi		: Diagnostic[],
	pBefore	: Position,
	p		: Position,
	rng_nm	: Range,
	aDsOutline	: DocumentSymbol[];
};
interface MacroDef {
	loc		: Location;
	hPrm	: HPRM;

	sum?	: string;
	param	: MD_PARAM_DETAILS[];
/*	// NOTE: スニペット
	snippet: {
		nm: string;
		txt: string;
	}[];
 */
	detail?	: string;

	name_v_ln		: number;
	name_v_ch		: number;
}

// フォントと使用文字情報
type TFONT2STR = {
	[font_nm: string]	: string;
};
type TFONT_ERR = {
	err	: string;
	nm	: string;
	sl	: number;
	sc	: number;
	el	: number;
	ec	: number;
};
type TINF_INTFONT = {
	defaultFontName	: string;
	hSn2Font2Str	: {[sn: string]: TFONT2STR};
	hUri2FontErr	: {[uri: string]: TFONT_ERR[]}
};

type PluginDef = {
	uri: string, sl: number, sc: number, el: number, ec: number,
};


type ArgDesc = {[name: string]: {
	label	: string;
	doc		: string;
}};


type TH_FN2LBLRNG = {[label: string]: Range};

export interface IExts { [ext: string]: string; };
export interface IFn2Path { [fn: string]: IExts; };

const enum SEARCH_PATH_ARG_EXT {	// #searchPath 使用時、第二引数用
	DEFAULT		= '',
	SP_GSM	= 'png|jpg|jpeg|json|svg|webp|mp4|webm',
		// NOTE: ogvがそもそも再生できないので、ogvのみ保留
	SCRIPT	= 'sn|ssn',
	FONT	= 'woff2|woff|otf|ttf',
	SOUND	= 'mp3|m4a|ogg|aac|flac|wav',
	HTML	= 'htm|html',
};


type T_DBPIC = {w: number, h: number,};
type TH_DBPIC = { [fn: string]: T_DBPIC; };


export class LspWs {
	// === 新キーワード選択値はここに追加する。存在チェックもなるべく同時に
	// #scanInitAll() でクリア・初期値
	readonly	#hSetWords	: {[key: string]: Set<string>}	= {
		'代入変数名'	: new Set,	// & 変数操作、[let_ml][let]

		'ジャンプ先'	: new Set,	// * ラベル（なにに使ってる？　過去値比較のみ？）

		'レイヤ名'		: new Set,	// #hTagProc -> [add_lay]
		'文字レイヤ名'	: new Set,
		'画像レイヤ名'	: new Set,

		'マクロ名'		: new Set,	// #scanEnd()

		'スクリプトファイル名': new Set,	// #updPath() で設定
		'画像ファイル名': new Set,
		'音声ファイル名': new Set,
		'HTMLファイル名': new Set,

		'差分名称'		: new Set,	// #hTagProc -> [add_face]
		'フレーム名'	: new Set,	// #hTagProc -> [add_frame]
		'サウンドバッファ': new Set,	// -> [playbgm][playse][button][link]
		'文字出現演出名': new Set,	// #hTagProc -> [ch_in_style]
		'文字消去演出名': new Set,	// #hTagProc -> [ch_out_style]
	};
	readonly	#hPreWords	: {[key: string]: string}	= {
		'イベント名':
`|Click
RightClick
MiddleClick
UpWheel
DownWheel
Control
Alt
Meta
Backspace
Enter
=
dom=\\S👾+
sn:exported
sn:imported
<ワンキー>
alt+<ワンキー>
ctrl+<ワンキー>
shift+<ワンキー>
alt+ctrl+<ワンキー>
ctrl+shift+<ワンキー>
alt+shift+<ワンキー>
alt+ctrl+shift+<ワンキー>
 
ArrowLeft
ArrowRight
ArrowUp
ArrowDown
F1
F\\d
Tab
Shift
Delete
Home
End
Escape
PageUp
PageDown|`,
		'animation-timing-function':
`|ease
ease-in
ease-out
ease-in-out
linear
step-start
step-end
cubic-bezier(...)|`,
		'イージング名':
`|Back.In
Back.InOut
Back.Out
Bounce.In
Bounce.InOut
Bounce.Out
Circular.In
Circular.InOut
Circular.Out
Cubic.In
Cubic.InOut
Cubic.Out
Elastic.In
Elastic.InOut
Elastic.Out
Exponential.In
Exponential.InOut
Exponential.Out
Linear.None
Quadratic.In
Quadratic.InOut
Quadratic.Out
Quartic.In
Quartic.InOut
Quartic.Out
Quintic.In
Quintic.InOut
Quintic.Out
Sinusoidal.In
Sinusoidal.InOut
Sinusoidal.Out|`,
		'ブレンドモード名':
`|normal
add
multiply
screen|`,
	};
	readonly	#hRegPreWords	: {[key: string]: RegExp}	= {};
	static readonly	#sPredefWrtVar	=
`const.Date.getDateStr
const.Date.getTime
const.sn.bookmark.json
const.sn.config.book.title
const.sn.config.book.creator
const.sn.config.book.cre_url
const.sn.config.book.publisher
const.sn.config.book.pub_url
const.sn.config.book.detail
const.sn.config.book.version
const.sn.config.init.bg_color
const.sn.config.init.tagch_msecwait
const.sn.config.init.auto_msecpagewait
const.sn.config.init.escape
const.sn.config.window.height
const.sn.config.window.width
const.sn.displayState
const.sn.frm.（フレーム名）
const.sn.frm.（フレーム名）.alpha
const.sn.frm.（フレーム名）.height
const.sn.frm.（フレーム名）.rotate
const.sn.frm.（フレーム名）.scale_x
const.sn.frm.（フレーム名）.scale_y
const.sn.frm.（フレーム名）.visible
const.sn.frm.（フレーム名）.width
const.sn.frm.（フレーム名）.x
const.sn.frm.（フレーム名）.y
const.sn.isApp
const.sn.isDarkMode
const.sn.isDbg
const.sn.isDebugger
const.sn.isFirstBoot
const.sn.isKidoku
const.sn.isPackaged
const.sn.key.alternate
const.sn.key.back
const.sn.key.command
const.sn.key.control
const.sn.key.end
const.sn.key.escape
const.sn.last_page_text
const.sn.lay.（レイヤ名）
const.sn.lay.（レイヤ名）.（foreかback）.alpha
const.sn.lay.（レイヤ名）.（foreかback）.height
const.sn.lay.（レイヤ名）.（foreかback）.visible
const.sn.lay.（レイヤ名）.（foreかback）.width
const.sn.lay.（レイヤ名）.（foreかback）.x
const.sn.lay.（レイヤ名）.（foreかback）.y
const.sn.log.json
const.sn.Math.PI
const.sn.needClick2Play
const.sn.platform
const.sn.sound.codecs
const.sn.vctCallStk.length
save:const.sn.autowc.enabled
save:const.sn.autowc.text
save:const.sn.autowc.time
save:const.sn.layer.（文字レイヤ名）.enabled
save:const.sn.loopPlaying
save:const.sn.mesLayer
save:const.sn.scriptFn
save:const.sn.scriptIdx
save:const.sn.sLog
save:sn.doRecLog
sn.auto.enabled
sn.button.fontFamily
sn.event.domdata.（任意）
sn.eventArg
sn.eventLabel
sn.skip.all
sn.skip.enabled
sn.tagL.enabled
sys:const.sn.nativeWindow.x
sys:const.sn.nativeWindow.y
sys:const.sn.save.place
sys:const.sn.sound.BGM.volume
sys:const.sn.sound.SE.volume
sys:const.sn.sound.SYS.volume
sys:const.sn.sound.【buf】.volume
sys:sn.auto.msecLineWait
sys:sn.auto.msecLineWait_Kidoku
sys:sn.auto.msecPageWait
sys:sn.auto.msecPageWait_Kidoku
sys:sn.skip.mode
sys:sn.sound.global_volume
sys:sn.sound.movie_volume
sys:sn.tagCh.canskip
sys:sn.tagCh.doWait
sys:sn.tagCh.doWait_Kidoku
sys:sn.tagCh.msecWait
sys:sn.tagCh.msecWait_Kidoku
sys:TextLayer.Back.Alpha`.replaceAll('\n', ',');


	static		inited		= false;
	static		#hTag		: {[tag_nm: string]: boolean}	= {};
	static		#hSnippet	: {[tag_nm: string]: string}	= {};
	static	readonly	#aCITag			: CompletionItem[]	= [];

	readonly	#curPrj		: string;	// 'file:///'付き
	readonly	#lenCurPrj	: number;

	readonly	#grm	= new Grammar;


	constructor(private readonly wf: WorkspaceFolder, private readonly conn: Connection, private readonly docs:TextDocuments<TextDocument>, readonly hasDiagRelatedInfCap: boolean) {
		this.#curPrj = this.wf.uri +'/doc/prj/';	// 'file:///'付き
		this.#lenCurPrj = this.#curPrj.length;

		if (! LspWs.inited) {
			LspWs.inited = true;

			//const command = {title: '「スクリプト再捜査」「引数の説明」', command: 'extension.skynovel.scanScr_trgParamHints'};
				// NOTE: Lsp が呼んでくれない
				// onCompletion() if (trgChr === '[') で呼ぶはず
			for (const [tag_nm, {sum, snippet}] of Object.entries(hMd)) {
				LspWs.#hTag[tag_nm] = true;

				const doc = sum.split(' ')[0];
				LspWs.#hTagArgDesc[tag_nm] = {
					label	: `[${tag_nm} ...]`,
					doc,
				};

				const documentation: string | MarkupContent = sum
				? {kind: 'markdown', value: `$(book)[タグリファレンス](https://famibee.github.io/SKYNovel/tag.html#${tag_nm})

---
${sum}`,}
				: '';

				for (const {nm, txt} of snippet) {
					LspWs.#hSnippet[nm] = txt;

					LspWs.#aCITag.push({
						label	: nm,
					//	labelDetails: {detail: '=LSP=', description: '***'},
						// 選択で消える不具合
							// detail: labelのすぐ右にくっつく
							// description: 左端
						kind	: CompletionItemKind.Snippet,
					//	tags?	: CompletionItemTag[];
						detail	: doc,		// 最初に出る一覧の右二つ
						documentation,
					/*	// 以下は未検討
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
					*/
					//	command,
					//	data?: LSPAny;
					})
				}
			}
		}

		this.#hTagProc.let_abs =
		this.#hTagProc.let_char_at =
		this.#hTagProc.let_index_of =
		this.#hTagProc.let_length =
		this.#hTagProc.let_replace =
		this.#hTagProc.let_round =
		this.#hTagProc.let_search =
		this.#hTagProc.let_substr = this.#hTagProc.let;
		this.#hTagProc.set_frame = this.#hTagProc.let_frame;

		this.#hTagProc.event =
		this.#hTagProc.jump =
		this.#hTagProc.return = this.#hTagProc.s;
		this.#hTagProc.else = this.#hTagProc.elsif;

		for (const [k, v] of Object.entries(this.#hPreWords)) {
			const re = v.slice(1, -1)
			.replaceAll(/([|\.+])/g, '\\$1')	// 正規表現のエスケープ
			.replaceAll('<ワンキー>', '\\w+')
			.replaceAll('👾\\', '')
			.replaceAll('\n', '|');
			this.#hRegPreWords[k] = new RegExp(
				`^(${re})$`,
				k === 'イベント名' ?'i': ''
			);

			this.#hPreWords[k] = v
			.replaceAll(/([|,])/g, '\\$1')	// スニペット構文のエスケープ
			.replaceAll('\n', ',');
		}
	}
	destroy(path?: string) {
		if (path && ! this.#checkRelated(path)) return false;

		return true;
	}


	// =======================================
	static readonly REQ_ID = ':SKYNovel:';
	#sendRequest(cmd: string, o = {}) {
		this.conn.sendRequest(LspWs.REQ_ID, {cmd, curPrj: this.#curPrj, o});
	}
	onRequest({cmd, curPrj, o}: {cmd: string, curPrj: string, o: any}) {
//console.log(`fn:LspWs.ts onRequest cmd:${cmd} o:${Object.keys(o)}:`);
		if (curPrj === this.#curPrj) this.#hCmd2ReqProc[cmd]?.(o);
	}
	#hCmd2ReqProc: {[cmd: string]: (o: any)=> void}	= {
		'ready': ()=> {this.#fullScan(); this.#sendRequest('db_pic');},
		'init.res':	o=> {
			this.#hCmd2ReqProc = this.#hCmd2ReqProc_Inited;
			this.#scanAll(o);
		},
		// これ以上ここに追加してはいけない
	};
	#hDbPic: TH_DBPIC	= {};
	readonly	#hCmd2ReqProc_Inited: {[cmd: string]: (o: any)=> void}	= {
		'init.res'		: o=> this.#scanAll(o),
		'def_plg.upd'	: o=> this.#hDefPlugin = o,
		'def_esc.upd'	: ()=> this.#fullScan(),
		'db_pic.res'	: o=> this.#hDbPic = o.hDbPic,
		'db_pic.add'	: o=> {
			for (const fn of Object.keys(o.hDbPic)) this.#hDbPic[fn] = o.hDbPic[fn];
		},
	};
	#fullScan() {this.#sendRequest('init');}


	// === ファイル変更イベント（手入力が対象） ===
	onDidChangeContent(chg: TextDocumentChangeEvent<TextDocument>) {
		const {uri} = chg.document;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return;

		if (! REG_SCRIPT.test(uri)) return;

		const pp = uri.slice(this.#lenCurPrj);
		if (! pp) return;
//console.log(`fn:LspWs.ts onDidChangeContent pp:${pp} ver:${chg.document.version}`);

/*	// NOTE: Score
		if (uri.slice(-3) === '.sn') Debugger.noticeChgDoc(this.curPrj, e);
		else {
//console.log(`fn:LspWs.ts chgTxtDoc (ssn) uri:${uri}`);
			this.#cteScore.separation(uri);
			e.contentChanges.forEach(c=> {
				const sl = c.range.start.line;
				const el = c.range.end.line;
//console.log(`fn:LspWs.ts line:294 * (${sl},${c.range.start.character})(${el},${c.range.end.character})=${c.text}=`);
				const text = (sl === el && c.text.slice(-1) !== '\n')
					? doc.lineAt(sl).text
					: c.text;
				hUpdScore[uri] ||= this.#cteScore.updLine(doc, c.range, text, this.#resolveScript(text).aToken);
			});
			this.#cteScore.combining(uri);
		}
*/

		// scanScript 本編
		this.#scanBegin();
		this.#sNeedScan = new Set();
		this.#hScript[pp] = this.#grm.resolveScript(chg.document.getText());
		this.#scanInit(pp);
		this.#scanScript(pp);
		this.#goFinish(pp);

		// （変更前・変更後問わず）このファイルで定義されたマクロを使用しているファイルは
		// すべて追加走査（重複走査・永久ループに留意）
			// 重複定義時は、最初に見つかったもののみ #hMacro(Old) に入っている
		const mon = {...this.#hOldDefMacro, ...this.#hDefMacro};
		for (const [nm, {loc}] of Object.entries(mon)) {
			if (loc.uri === uri || this.#hDupMac2aUse[nm]?.some(locUse=> locUse.uri === uri)) {
				// このファイルで使用している、別ファイルで定義されたマクロ
				// このファイルで定義されたマクロ、を使用している別ファイル
				for (const locUse of this.#hMacro2aLocUse[nm] ?? []) {
					//if (locUse.uri !== uri) // 略、.delete(uri)するので
					this.#sNeedScan.add(locUse.uri.slice(this.#lenCurPrj));
				}
			}
		}

		// 追加走査
		this.#sNeedScan.delete(uri);	// 処理重複につき
//console.log(`fn:LspWs.ts pp2:${[...this.#sNeedScan.keys()].join(',')}:`);
		for (const pp2 of this.#sNeedScan) {
			this.#scanInit(pp2);
			this.#scanScript(pp2);
			this.#goFinish(pp2);
		}
		this.#scanEnd();
	}
	#sNeedScan	= new Set<string>();	// スキャン必要フラグ（単体ファイル走査時）
		// {[pp: string]: 0}

	// === ファイル変更イベント（手入力以外が対象） ===
	// LanguageClientOptions.synchronize.fileEvents での設定によるイベント
	//	// Changed は保存時に発生する
	onDidChangeWatchedFiles({changes}: DidChangeWatchedFilesParams) {
		const {uri} = changes[0];	// 'file:///'付き
		if (! this.#checkRelated(uri)) return;
//console.log(`fn:LspWs.ts onDidChangeWatchedFiles !`);

		for (const {type, uri} of changes) {
			const pp = uri.slice(this.#lenCurPrj);
//console.log(`fn:LspWs.ts   pp:${pp}:`);
			if (pp === 'path.json'
			&& (type === FileChangeType.Created ||
				type === FileChangeType.Changed)) {this.#fullScan(); continue;}
		}
	}


	// === 識別子上にマウスホバーしたとき表示するヒント ===
	onHover(prm: TextDocumentPositionParams): Hover | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = uri.slice(this.#lenCurPrj);
		const aUse = this.#hDoc2TagMacUse[pp] ??= [];
		if (! aUse) return null;
		const p = prm.position;
		const u = aUse.find(u=> this.#contains(u.rng, p));
		if (! u) return null;

		const d = this.docs.get(uri);
		if (! d) return null;
		const token = d.getText(u.rng);
		const hVal: {[key: string]: string} = {};
		const args = token.slice(1 +u.nm.length, -1);
		this.#alzTagArg.parse(args);
		for (const pr of Object.entries(this.#alzTagArg.hPrm)) {
			const [prK, prV] = pr;
			hVal[prK] = prV.val;
		}

		// マクロ
		const md = this.#hDefMacro[u.nm];
		if (md) {
			const {param, sum} = md;
			return {range: u.rng, contents: {kind: 'markdown', value: `~~~skynovel
(マクロ) [${u.nm}${
	param.map(md=> this.#cnvMdParam2Str(md)).join('')
}]
~~~
---
${sum ?? ''} [定義位置：${ getFn(md.loc.uri) }](${ md.loc.uri }#L${ md.loc.range.start.line +1 })${this.#prmPic2md(param, hVal)}`
			}};
		}

		// プラグイン定義タグ
		const pd = this.#hDefPlugin[u.nm];
		if (pd) return {range: u.rng, contents: {kind: 'markdown', value:
`~~~skynovel
(プラグイン定義タグ) [${u.nm}]
~~~
---
[定義位置：${ getFn(pd.uri) }](${ pd.uri }#L${ pd.sl +1 })`
		}};

		// タグ
		const td = hMd[u.nm];
		if (td) {
			const {param, sum} = td;
			return {range: u.rng, contents: {kind: 'markdown', value: `~~~skynovel
(タグ) [${u.nm}${
	param.map(md=> this.#cnvMdParam2Str(md)).join('')
}]
~~~
---
${sum.replace('\n', `[タグリファレンス](https://famibee.github.io/SKYNovel/tag.html#${u.nm})${this.#prmPic2md(param, hVal)}`)}`
			}};
		}

		return null;
	}
		#prmPic2md(param: MD_PARAM_DETAILS[], hVal: {[key: string]: string}): string {
			if (param.length === 0) return '';

			return '  \n  \n'+ param.flatMap(({rangetype, name})=> {
				if (rangetype !== '画像ファイル名') return [];

				const v = hVal[name];
				if (! v || ! this.#hSetWords.画像ファイル名.has(v)) return [];

				const {w, h} = this.#hDbPic[v] ?? {w: 0, h: 0};
				const path = this.#searchPath(v, SEARCH_PATH_ARG_EXT.SP_GSM);
				const src = `${path}|width=${this.#whThumbnail}|height=${this.#whThumbnail}`;
/*
console.log(`fn:LspWs.ts path:${path}:`);

//				const browseFileCommandUrl = `https://notepm.jp`;
				const args = ['file://'+ path];
				const browseFileCommandUrl = `command:revealFileInOS?${encodeURIComponent(JSON.stringify(args))}`;
console.log(`fn:LspWs.ts line:577 ==${browseFileCommandUrl}==`);

				return `- ${name} = ${v} ${w}x${h} [Open Containing Folder](${browseFileCommandUrl} "Open Containing Folder")  \n![${v}](${src} "${v}")`;
*/
				return `- ${name} = ${v} ${w}x${h}  \n![${v}](${src} "${v}")`;
			}).join('  \n');	// 【半角空白二つ + \n】で改行
		}
		readonly	#whThumbnail = 120;

		readonly #checkRelated = (uri: string)=> this.#curPrj === uri.slice(0, this.#lenCurPrj);
		readonly	#cnvMdParam2Str = ({name, required, def, rangetype}: MD_PARAM_DETAILS)=> ` ${name}=${
			required === 'y'
			? `【必須】${this.#escHighlight(rangetype)}`
			: `${this.#escHighlight(rangetype)}|${this.#escHighlight(def)}`
		}`;
		readonly	#escHighlight = (s = '')=> {
			if (s.charAt(0) === `'` && s.at(-1) === `'`) return s;
			return [']',' '].some(el=> s.includes(el)) ?`'${s}'` :s;
		}


	// === コード補完機能 ===
	//	// 自動補完（初期リストを返すハンドラー）
	onCompletion(prm: TextDocumentPositionParams): CompletionItem[] | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = uri.slice(this.#lenCurPrj);
		if (! pp) return null;
		const d = this.docs.get(uri);
		if (! d) return null;

		const {position: p, position: {line: l, character: c}} = prm;
		const trgChr = d.getText({start: {line: l, character: c -1}, end: p});
		if (trgChr === '[') return this.#aCITagMacro;	// タグやマクロ候補を表示

		const aUse = this.#hDoc2TagMacUse[pp];
		if (! aUse) return null;
		const u = aUse.find(o=> this.#contains(o.rng, p));
		if (! u) return null;
		const md = this.#hDefMacro[u.nm] ?? hMd[u.nm];
		if (! md) return null;

		// 属性候補を表示
		const {param} = md;
		if (trgChr === ' ') return param.map(({name, comment})=> ({
			label	: name,
			kind	: CompletionItemKind.Field,
			detail	: comment,	// 属性候補選択時のコメント
		}));

		// 属性値候補を表示
		// if (trgChr === '=')
		const token = d.getText(u.rng);
		const hRng = this.#alzTagArg.parseinDetail(token, u.nm.length, u.rng.start.line, u.rng.start.character);
		const pr = Object.entries(hRng).find(([, {k_ln, k_ch, v_ln, v_ch, v_len}])=> this.#contains(Range.create(k_ln, k_ch, v_ln, v_ch +v_len), p));
		if (! pr) return null;
		const [prK] = pr;
		const prm_details = param.find(pd=> pd.name === prK);
		if (! prm_details) return null;

		let {rangetype} = prm_details;
		switch (rangetype) {
			case 'Boolean':	rangetype = 'true、false'; break;
		}
		if (rangetype.includes('、')) return rangetype.split('、')
		.map(label=> ({label, kind: CompletionItemKind.Keyword,}));

		let kind: CompletionItemKind = CompletionItemKind.Value;
		const words = this.#hPreWords[rangetype];
		if (! words) return prm_details?.def ?[{label: prm_details.def, kind,}] :[];
		switch (rangetype) {
			case 'イベント名':	kind = CompletionItemKind.Event;	break;

			case '代入変数名':	kind = CompletionItemKind.Variable;	break;
			case 'ジャンプ先':	kind = CompletionItemKind.Reference;	break;
			case 'レイヤ名':
			case '文字レイヤ名':
			case '画像レイヤ名':	kind = CompletionItemKind.Folder;	break;
			case 'マクロ名':	kind = CompletionItemKind.Function;	break;
			case 'スクリプトファイル名':
			case '画像ファイル名':
			case '音声ファイル名':
			case 'HTMLファイル名':	kind = CompletionItemKind.File;	break;
			case '差分名称':	kind = CompletionItemKind.Struct;	break;

		//	case 'フレーム名':
		//	case 'サウンドバッファ':
		//	case '文字出現演出名':
		//	case '文字消去演出名':

			default:	kind = CompletionItemKind.EnumMember;	break;
		}
		return words.slice(1, -1).split(',').map(v=> ({
			label	: v,
			kind	:
				v.slice(0, 6) === 'const.' ? CompletionItemKind.Constant :kind,
		}));
	}
		#contains({start, end}: Range, {line: l, character: c}: Position): boolean {
			if (l < start.line || end.line < l) return false;
			if (l === start.line && c < start.character) return false;
			if (l === end.line && end.character < c) return false;

			return true;
		}
	#activeUri = '';
	// 自動補完候補の選択
	//	// 補完リストで選択された項目の追加情報を解決するハンドラー
	onCompletionResolve(ci: CompletionItem): CompletionItem {
		// 遅延で各要素の詳細な情報(detail, documentationプロパティ)を
		if (ci.kind === CompletionItemKind.Snippet) {
			const sn = LspWs.#hSnippet[ci.label];
			if (sn) {
			//	ci.insertTextMode = InsertTextMode.asIs;
			//	ci.insertTextMode = InsertTextMode.adjustIndentation;
				ci.insertTextFormat = InsertTextFormat.Snippet;
				ci.insertText = this.#cnvSnippet(sn, getFn(this.#activeUri));
			}
		}

		return ci;
	}
	#cnvSnippet	= (s: string, _cur_fn: string)=> s;
	#aCITagMacro		: CompletionItem[]	= [];
	#hFn2JumpSnippet	: {[fn: string]: string}	= {};
	#prepareSnippet() {
		let eq = true;
		for (const [key, set] of Object.entries(this.#hSetWords)) {
			const str = `|${
				[...set.values()].sort().join('\n')
				.replaceAll(/([|,])/g, '\\$1')	// スニペット構文のエスケープ
				.replaceAll('\n', ',')
			}|`;
			if (this.#hPreWords[key] !== str) {
				eq = false;
			//	this.#cteScore.updWords(key, set);	// NOTE: Score
					// この中は参照渡しとReq/Res型なので、更新確認は別にいらない
			}
			this.#hPreWords[key] = (str === '||') ?`:${key}` :str;
		}
		if (eq) return;

		this.#aCITagMacro = [
			...LspWs.#aCITag,

			...Object.entries(this.#hDefMacro).map(([nm, {sum}])=> ({
				label	: nm,
			//	labelDetails: {detail: '=LSP=', description: '***'},
				// 選択で消える不具合
					// detail: labelのすぐ右にくっつく
					// description: 左端
				kind	: CompletionItemKind.Snippet,
			//	tags?	: CompletionItemTag[];
				detail	: sum?.split(' ')[0],	// 最初に出る一覧の右二つ
		//		documentation	: docu,
			/*	// 以下は未検討
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
			*/
		//		command	: cmdScanScr_trgPrm,
			//	data?: LSPAny;
			})),

			...Object.entries(this.#hDefPlugin).map(([nm, _pd])=> ({
				label	: nm,
				kind	: CompletionItemKind.Snippet,
			//	tags?	: CompletionItemTag[];
				detail	: '（プラグインにより追加されたタグ）',	// 最初に出る一覧の右二つ	// NOTE: プラグインの概要
			})),
		];

		// NOTE: マクロやプラグインのスニペットは未実装。優先順位低い
		this.#hFn2JumpSnippet = {};
		this.#cnvSnippet = (s, cur_fn)=> {
			const bk = this.#hPreWords.ジャンプ先;

			const jsn = this.#hFn2JumpSnippet[cur_fn];
			this.#hPreWords.ジャンプ先 = jsn ?? (()=> {
				if (typeof bk !== 'string') return 'ジャンプ先';
				let cur_sn = '';
				const sn = (bk.slice(1, -1) +',').replace(
					new RegExp(`fn=${cur_fn},(?:fn=${cur_fn} [^,|]+,)*`),
					m=> {cur_sn = m; return '';}
				)
				return this.#hFn2JumpSnippet[cur_fn]
					= `|${(cur_sn + sn).slice(0, -1)}|`;
			})();

			this.#hPreWords.ジャンプ先 = bk;

			return s.replace(/{{([^\}]+)}}/g, (_, p)=> this.#hPreWords[p]);
		};
	}


	// === 引数の説明 ===
						#hArgDesc		: ArgDesc	= {};
	static	readonly	#hTagArgDesc	: ArgDesc	= {};
	onSignatureHelp(prm: SignatureHelpParams): SignatureHelp | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = uri.slice(this.#lenCurPrj);
		const aUse = this.#hDoc2TagMacUse[pp];
		if (! aUse) return null;
		const {position: p, context} = prm;
		const u = aUse.find(u=> this.#contains(u.rng, p));
		if (! u) return null;
		const md = this.#hDefMacro[u.nm] ?? hMd[u.nm];
		if (! md) return null;

		const ret: SignatureHelp = {signatures: []};
		const {param} = md;
		if (! context?.isRetrigger) {
			const ad = this.#hArgDesc[u.nm];
			if (! ad) {
				console.log(`fn:LspWs.ts hArgDesc[${u.nm}] 定義なし`);
				return null;
			}
			let sPrm = '';
			const aPI: ParameterInformation[] = [];
			if (param[0]?.name) for (const md of param) {
				const p = this.#cnvMdParam2Str(md);
				sPrm += ' '+ p;
				// 検索文字列、属性概要
				aPI.push({label: p, documentation: {kind: 'markdown', value: md.comment}});
			}

			// 全体、タグ説明
			const si = SignatureInformation.create(`[${u.nm}${sPrm}]`, ad.doc);
			si.parameters = aPI;
			ret.signatures = [si];
		}

		const d = this.docs.get(uri);
		if (! d) return ret;
		const token = d.getText(u.rng);
//console.log(`fn:LspWs.ts token:${token}: u.nm:${u.nm}: p(${p.line}, ${p.character}) u.rng.start(${JSON.stringify(u.rng.start)})`);
		const hRng = this.#alzTagArg.parseinDetail(token, u.nm.length, u.rng.start.line, u.rng.start.character);
		const pr = Object.entries(hRng).find(([, {k_ln, k_ch, v_ln, v_ch, v_len}])=> this.#contains(Range.create(k_ln, k_ch, v_ln, v_ch +v_len), p));
		if (pr) {
			const [prK] = pr;
			ret.activeParameter = param.findIndex(p=> p.name === prK);
		}
		//else ret.activeParameter = -1;

		return ret;
	}


	// === 定義へ移動、定義をここに表示 ===
	onDefinition(prm: DefinitionParams): Definition | DefinitionLink[] | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = uri.slice(this.#lenCurPrj);
		const aUse = this.#hDoc2TagMacUse[pp] ??= [];
		if (! aUse) return null;
		const p = prm.position;
		const u = aUse.find(u=> this.#contains(u.rng, p));
		if (! u) return null;

		let name = u.nm;
		switch (u.nm) {
			case 'macro':
			case 'char2macro':{
				const d = this.docs.get(uri);
				if (! d) return null;

				const token = d.getText(u.rng);
				const hRng = this.#alzTagArg.parseinDetail(token, u.nm.length, u.rng.start.line, u.rng.start.character);
				const r = hRng.name;
				if (! r) return null;

				const {v_ln, v_ch, v_len} = r;
				name = d.getText(Range.create(v_ln, v_ch, v_ln, v_ch +v_len));
			}
		}

		const locMd = this.#hDefMacro[name]?.loc;
	//	if (locMd) return locMd;	// シンプル版
		return locMd ?[<DefinitionLink>{
			targetUri	: locMd.uri,
			targetRange	: locMd.range,
			targetSelectionRange	: locMd.range,	// 一瞬だけ選択する？
		}] :[];
	}

	// === 参照へ移動、参照をここに表示 ===
	onReferences(prm: ReferenceParams): Location[] | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = uri.slice(this.#lenCurPrj);
		const aUse = this.#hDoc2TagMacUse[pp] ??= [];
		if (! aUse) return null;
		const p = prm.position;
		const u = aUse.find(u=> this.#contains(u.rng, p));
		if (! u) return null;

		let name = u.nm;
		switch (u.nm) {
			case 'macro':
			case 'char2macro':{
				const d = this.docs.get(uri);
				if (! d) return null;

				const token = d.getText(u.rng);
				const hRng = this.#alzTagArg.parseinDetail(token, u.nm.length, u.rng.start.line, u.rng.start.character);
				const r = hRng.name;
				if (! r) return null;

				const {v_ln, v_ch, v_len} = r;
				name = d.getText(Range.create(v_ln, v_ch, v_ln, v_ch +v_len));
				break;
			}
		}

		return this.#hMacro2aLocUse[name];
	}


	// === ドキュメントアウトライン ===
	onDocumentSymbol(prm: DocumentSymbolParams): SymbolInformation[] | DocumentSymbol[] | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = uri.slice(this.#lenCurPrj);
		return this.#hSn2aDsOutline[pp];
	}

	// === リンク ===
	onDocumentLinks(prm: DocumentLinkParams): DocumentLink[] | DocumentSymbol[] | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		return this.#Uri2Links[uri] ?? [];
	}
/*
	onDocumentLinkResolve(prm: DocumentLink): DocumentLink | null {
//console.log(`fn:LspWs.ts onDocumentLinkResolve prm:${JSON.stringify(prm)}`);

		return null;
	}
*/

	// === シンボルの名前変更・準備 ===
	onPrepareRename(prm: PrepareRenameParams): Range | {range: Range; placeholder: string;} | null {
		const {uri} = prm.textDocument;
		if (! this.#checkRelated(uri)) return null;

		const pp = uri.slice(this.#lenCurPrj);
		const aUse = this.#hDoc2TagMacUse[pp] ??= [];
		if (! aUse) return null;
		const p = prm.position;
		const u = aUse.find(u=> this.#contains(u.rng, p));
		if (! u) return null;
		if (u.nm in LspWs.#hTag) return null;		// タグは変名不可
		if (u.nm in this.#hDefPlugin) return null;	// プラグイン定義タグは変名不可

		this.#oldName = u.nm;
		return Range.create(
			u.rng.start.line, u.rng.start.character +1,
			u.rng.start.line, u.rng.start.character +1 +u.nm.length,
		);
	//	return {range: r.range, placeholder: '変更後のマクロ名'};
		// placeholder というより変更前の単語を置き換える
	}
	#oldName = '';
		static	readonly	#REG_NG4MAC_NM = /[\s"'#;\]　]+/;
	// === シンボルの名前変更 ===
	onRenameRequest(prm: RenameParams): WorkspaceEdit | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const {newName} = prm;
		if (LspWs.#REG_NG4MAC_NM.test(newName)) return null;// 異常な文字があります
		if (newName in LspWs.#hTag) return null;		// 既にあるタグ名です
		if (newName in this.#hDefMacro) return null;	// 既にあるマクロ名です
		if (newName in this.#hDefPlugin) return null;	// 既にあるプラグイン定義タグ名です

		const oldName = this.#oldName;
		const locMd = this.#hDefMacro[oldName]?.loc;
		if (! locMd) return null;	// 未定義マクロです

		const changes: {[uri: DocumentUri]: TextEdit[]} = {};
		// 使用箇所
		const aUse = this.#hMacro2aLocUse[oldName];
		if (aUse) {
			this.#hMacro2aLocUse[newName] = aUse;
			delete this.#hMacro2aLocUse[oldName];

			for (const {uri, range} of aUse) {
				(changes[uri] ??= []).push(TextEdit.replace(range, newName));
			}
		}

		// マクロ定義
		const md = this.#hDefMacro[oldName];
		this.#hDefMacro[newName] = md;
		delete this.#hDefMacro[oldName];

		(changes[locMd.uri] ??= []).push(TextEdit.replace(
			Range.create(
				md.name_v_ln, md.name_v_ch,
				md.name_v_ln, md.name_v_ch +oldName.length +1,
			),
			newName,
		));

		return {changes};

/*
WorkspaceEdit
	ワークスペースの編集は、ワークスペースで管理されている多くのリソースへの変更を表します。 編集は、`changes` または `documentChanges` のいずれかを提供する必要があります。 documentChanges が存在する場合、クライアントがバージョン管理されたドキュメントの編集を処理できる場合は、`changes` よりも優先されます。
	*
	* バージョン 3.13.0 以降、ワークスペースの編集にリソース操作も含めることができます。 リソース操作が存在する場合、クライアントは提供された順序で操作を実行する必要があります。 たとえば、ワークスペースの編集は、次の 2 つの変更で構成できます。
	* (1) ファイル a.txt の作成と (2) ファイル a.txt にテキストを挿入するテキスト ドキュメントの編集。
	*
	* 無効なシーケンス (例: (1) ファイル a.txt を削除し、(2) ファイル a.txt にテキストを挿入する) は、操作の失敗を引き起こします。 クライアントが障害から回復する方法は、クライアント機能によって記述されます: `workspace.workspaceEdit.failureHandling`

クライアントの機能に応じて、`workspace.workspaceEdit.resourceOperations` ドキュメントの変更は、n 個の異なるテキスト ドキュメントへの変更を表す `TextDocumentEdit` の配列であり、各テキスト ドキュメント編集はテキスト ドキュメントの特定のバージョンに対応します。 または、上記の `TextDocumentEdit` を、ファイル/フォルダの作成、名前変更、および削除操作と混合して含めることができます。
*
* クライアントがバージョン管理されたドキュメントの編集をサポートするかどうかは、`workspace.workspaceEdit.documentChanges` クライアント機能によって表現されます。
*
* クライアントが「documentChanges」も「workspace.workspaceEdit.resourceOperations」もサポートしない場合は、「changes」プロパティを使用したプレーンな「TextEdit」のみがサポートされます。

	documentChanges?: (TextDocumentEdit | CreateFile | RenameFile | DeleteFile)[];

`AnnotatedTextEdit` で参照できる変更注釈のマップ、またはファイル/フォルダ操作の作成、名前変更、および削除。
*
* クライアントがこのプロパティを尊重するかどうかは、クライアントの機能 `workspace.changeAnnotationSupport` によって異なります。

	changeAnnotations?: {
		[id: ChangeAnnotationIdentifier]: ChangeAnnotation;
	};
*/
	}

	// === コード内に挿入して表示するインレイヒント ===
	onInlayHint(prm: InlayHintParams): InlayHint[] | null | undefined {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = uri.slice(this.#lenCurPrj);
		return this.#hDoc2InlayHint[pp] ?? [];
	}


	// =======================================
	#oCfg: any = {};
	#scanAll(o: {
		pp2s	: {[pp: string]: string},
		hDefPlg	: {[def_nm: string]: PluginDef},	// 'file:///'なし
	}) {
		this.#oCfg = JSON.parse(o.pp2s['prj.json'] ?? '{}');
		this.#grm.setEscape(this.#oCfg?.init?.escape ?? '');

		this.#hDefPlugin = o.hDefPlg;

		this.#scanBegin();
		this.#scanInitAll();
		this.#updPath(o.pp2s['path.json'] ?? '{}');		// 必ず #scanInitAll() 後
		for (const [pp, s] of Object.entries(o.pp2s)) {
			if (! REG_SCRIPT.test(pp)) continue;

			this.#hScript[pp] = this.#grm.resolveScript(s);
			this.#scanInit(pp);
			this.#scanScript(pp);
			this.#goFinish(pp);
		}
		this.#scanEnd();
	}
		#updPath(sJson: string) {
			const oJs = JSON.parse(sJson);
			const curPrj = this.#curPrj.slice(7);	// とりあえず'file:///'なし
			for (const [nm, v] of Object.entries(oJs)) {
				const h = this.#hPathFn2Exts[nm] = <any>v;
				for (const [ext, w] of Object.entries(h)) {
					if (ext === ':cnt') continue;
					h[ext] = curPrj + w;

					if (LspWs.#REG_SCRIPT.test(ext)) {
						this.#hSetWords.スクリプトファイル名.add(nm);
						continue;
					}
					if (LspWs.#REG_SP_GSM.test(ext)) {
						this.#hSetWords.画像ファイル名.add(nm);
						continue;
					}
					if (LspWs.#REG_SOUND.test(ext)) {
						this.#hSetWords.音声ファイル名.add(nm);
						continue;
					}
					if (LspWs.#REG_HTML.test(ext)) {
						this.#hSetWords.HTMLファイル名.add(nm);
						continue;
					}
				}
			}
		}
		static	readonly	#REG_SCRIPT	= new RegExp(SEARCH_PATH_ARG_EXT.SCRIPT);
		static	readonly	#REG_SP_GSM	= new RegExp(SEARCH_PATH_ARG_EXT.SP_GSM);	// https://regex101.com/r/DPaLv3/1
		static	readonly	#REG_SOUND	= new RegExp(SEARCH_PATH_ARG_EXT.SOUND);
		static	readonly	#REG_HTML	= new RegExp(SEARCH_PATH_ARG_EXT.HTML);


	#scanBegin() {this.#aOldUri2Diag = Object.keys(this.#uri2Diag);}
	#aOldUri2Diag	: string[]	= [];
	#aEndingJob	: (()=> void)[]	= [];
	#scanEnd() {
		const setマクロ名 = this.#hSetWords.マクロ名;
		const hMacArgDesc: ArgDesc	= {};
		for (const [mac_nm, {sum}] of Object.entries(this.#hDefMacro)) {
			setマクロ名.add(mac_nm);
			hMacArgDesc[mac_nm] = {
				label	: `[${mac_nm} ...]`,
				doc		: sum ?? '',
			};
		}
		this.#hArgDesc = {...LspWs.#hTagArgDesc, ...hMacArgDesc};

		for (const j of this.#aEndingJob) j();
		this.#aEndingJob = [];


		const d定義重複 = this.#hDiag.マクロ定義重複;
		for (const [nm, aUse] of Object.entries(this.#hDupMac2aUse)) {
			if (aUse.length < 2) continue;

			const mes = d定義重複.mes.replace('$', nm);
			// 同じ警告は一度全て削除
			for (const [uri, a] of Object.entries(this.#uri2Diag)) {
				this.#uri2Diag[uri] = a.flatMap(d=> d.message == mes ?[] :d);
			}

		//	if (false) {	// 4 tst
			if (this.hasDiagRelatedInfCap) {
				const [{range, uri}] = aUse;
				const diag = Diagnostic.create(range, mes, d定義重複.sev);
				diag.relatedInformation = aUse.map(u=> ({
					location	: {uri: u.uri, range: u.range},
					message		: this.#hDiag.マクロ定義重複_その他.mes,
				}));
				(this.#uri2Diag[uri] ??= []).push(diag);
			}
			else for (const u of aUse) (this.#uri2Diag[u.uri] ??= [])
			.push(Diagnostic.create(u.range, mes, d定義重複.sev));
		}

		const d未定義 = this.#hDiag.未定義マクロ;
		for (const [nm, aUse] of Object.entries(this.#hMacro2aLocUse)) {
			if (nm in this.#hDefMacro) continue;
			if (nm in this.#hDefPlugin) continue;

			const mes = d未定義.mes.replace('$', nm);
			// 同じ警告は一度全て削除
			for (const [uri, a] of Object.entries(this.#uri2Diag)) {
				this.#uri2Diag[uri] = a.flatMap(d=> d.message == mes ?[] :d);
			}

			for (const {uri, range} of aUse) (this.#uri2Diag[uri] ??= [])
			.push(Diagnostic.create(range, mes, d未定義.sev));
		}

		// Send the computed diagnostics to VSCode.
		for (const [uri, diagnostics] of Object.entries(this.#uri2Diag)) this.conn.sendDiagnostics({uri, diagnostics});
		// スクリプト削除時にエラーや警告を消す
		for (const uri of this.#aOldUri2Diag) {
			if (uri in this.#uri2Diag) continue;
			this.conn.sendDiagnostics({uri, diagnostics: []});
		}


		this.#sendRequest('analyze_inf', {
			InfFont			: this.#InfFont,

			aQuickPickMac	: Object.entries(this.#hDefMacro)
			.map(([nm, {sum, loc: {uri}}])=> ({
		//	.map(([nm, {sum, loc: {uri, range}}])=> ({
				label		: nm,
				description	: `（マクロ）${sum?.split(' ')[0] ?? ''}`,
				//detail,	// 別の行になる
			//	uri	: `ws-file:///doc/prj/${uri.slice(this.#lenCurPrj)}#L${range.start.line}`,	// 効かない
				uri	: `ws-file:///doc/prj/${uri.slice(this.#lenCurPrj)}`,
			})),

			aQuickPickPlg	: Object.entries(this.#hDefPlugin)
			.map(([nm, {uri}])=> ({
				label		: nm,
				description	: '（プラグインによる定義）',
				//detail,	// 別の行になる
				uri	: `ws-file:///doc/prj/${uri.slice(this.#lenCurPrj)}`,
			})),
		});


		this.#prepareSnippet();

		this.conn.languages.inlayHint.refresh();
	}


	readonly	#hDiag	:{[code_name: string]: {
		mes	: string;
		sev	: DiagnosticSeverity;
	}} = {
		マクロ定義重複: {
			mes	: 'マクロ定義 [macro name=$] が重複しています。一つにして下さい',
			sev	: DiagnosticSeverity.Error,
		},
		マクロ定義重複_その他: {
			mes	: 'その他の定義箇所',
			sev	: DiagnosticSeverity.Error,
		},
		ラベル重複: {
			mes	: '同一スクリプトにラベル【$】が重複しています',
			sev	: DiagnosticSeverity.Error,
		},
		タグ記述異常: {
			mes	: 'タグ記述【$】異常です',
			sev	: DiagnosticSeverity.Error,
		},
		マクロ定義_名称異常: {
			mes	: 'マクロ定義の name属性が異常です',
			sev	: DiagnosticSeverity.Error,
		},
		マクロ定義_同名タグ: {
			mes	: '定義済みのタグ[$]と同名のマクロは定義できません',
			sev	: DiagnosticSeverity.Error,
		},
		マクロ定義_同名プラグイン: {
			mes	: 'プラグイン定義済みのタグ[$]と同名のマクロは定義できません',
			sev	: DiagnosticSeverity.Error,
		},
		マクロ定義異常: {
			mes	: 'マクロ定義（[$]）が異常です',
			sev	: DiagnosticSeverity.Error,
		},
		一文字マクロ定義_属性異常: {
			mes	: '一文字マクロ定義[$]の属性が異常です',
			sev	: DiagnosticSeverity.Error,
		},
		ラベル不明: {
			mes	: 'ラベル $ がありません',
			sev	: DiagnosticSeverity.Error,
		},
		フォントファイル不明: {
			mes	: 'フォントファイル $ がありません',
			sev	: DiagnosticSeverity.Error,
		},
		キーワード不明: {
			mes	: '属性 $ $ がありません',
			sev	: DiagnosticSeverity.Error,
		},
		キーワード異常: {
			mes	: '属性 $ が異常な値 $ です',
			sev	: DiagnosticSeverity.Error,
		},
		未定義マクロ: {
			mes	: '未定義マクロ[$]を使用、あるいはスペルミスです',
			sev	: DiagnosticSeverity.Warning,
		},
		未使用マクロ: {
			mes	: '未使用のマクロ[$]があります',
			sev	: DiagnosticSeverity.Information,
		},
		改行64行超: {
			mes	: '改行タグが64行を超えています',
			sev	: DiagnosticSeverity.Information,
		},
	};


	#hScript		: {[pp: string]: Script}		= {};

	#hDefPlugin		: {[nm: string]: PluginDef}		= {};
	#hDefMacro		: {[nm: string]: MacroDef}		= {};
	#hMacro2aLocUse	: {[nm: string]: Location[]}	= {};
	#hDoc2TagMacUse	: {[pp: string]: {nm: string, rng: Range}[]}	= {};

	#hOldDefMacro	: {[nm: string]: MacroDef}	= {};	// 変更前に存在したマクロ群
//	#aMacroAdd		: string[]	= [];

	#hScr2KeyWord	: {[pp: string]: Set<string>}	= {};
	#OldhScr2KeyWord	= new Set<string>();	// キーワード削除対応
	#hSn2aDsOutline	: {[pp: string]: DocumentSymbol[]}	= {};
	#hDupMac2aUse	: {[nm: string]: Location[]}	= {};	// 重複マクロ定義検知用

	#hFn2label		: {[fn: string]: TH_FN2LBLRNG}	= {};	// ラベル存在チェック用
	#hPp2JoinLabel	: {[pp: string]: string}		= {};	// ラベル名結合文字列
		// ジャンプ先変更チェック用。無名以外のラベル名を結合

	#hDoc2InlayHint	: {[pp: string]: InlayHint[]}	= {};

	#uri2Diag	: {[uri: string]: Diagnostic[]}		= {};
	#Uri2Links	: {[uri: string]: DocumentLink[]}	= {};

	#scanInitAll() {
		for (const key of Object.keys(this.#hSetWords)) this.#hSetWords[key].clear();
		this.#hSetWords.代入変数名.add(LspWs.#sPredefWrtVar);
		this.#hSetWords.文字出現演出名.add('default');
		this.#hSetWords.文字消去演出名.add('default');

		this.#hDefMacro = {};
		this.#hMacro2aLocUse = {};
		this.#hDoc2TagMacUse = {};

		this.#hScr2KeyWord = {};
		this.#hSn2aDsOutline = {};
		this.#InfFont = {defaultFontName: '', hSn2Font2Str: {}, hUri2FontErr: {}};
		this.#hDupMac2aUse = {};

		this.#hFn2label = {};
		this.#hPp2JoinLabel = {};

		this.#hDoc2InlayHint = {};

		this.#uri2Diag = {};
		this.#Uri2Links = {};
	}
	#scanInit(pp: string) {
		// 単体ファイル走査時
		const uri = this.#curPrj + pp;
		{
			const hMD: {[nm: string]: MacroDef} = {};
			this.#hOldDefMacro = {};	// 変更前に存在したマクロ群を退避
			for (const [nm, md] of Object.entries(this.#hDefMacro)) {
				if (md.loc.uri !== uri) hMD[nm] = md;
				else this.#hOldDefMacro[nm] = md;
			//	else {this.#hOldDefMacro[nm] = md; this.#cteScore.undefMacro(nm);}	// NOTE: Score
			}
			this.#hDefMacro = hMD;		// 別snで定義されたマクロのみにした
//			this.#aMacroAdd = [];
		}
		{
			const hMU: {[nm: string]: Location[]} = {};
			for (const [nm, aUse] of Object.entries(this.#hMacro2aLocUse)) {
				for (const locUse of aUse) {
					if (locUse.uri !== uri) (hMU[nm] ??= []).push(locUse);
				}
			}
			this.#hMacro2aLocUse = hMU;	// 別snで使用されたマクロのみにした
		}
		this.#hDoc2TagMacUse[pp] = [];

		this.#OldhScr2KeyWord = this.#hScr2KeyWord[pp] ??= new Set;
		this.#hScr2KeyWord[pp] = new Set;
		this.#hSn2aDsOutline[pp] = [];
		this.#InfFont.hUri2FontErr[uri] = [];
	//	this.#hSn2label[path] = {};	// #scanScriptで
	//	this.#hFn2Jump[path] = {};	// #scanScriptで

		// 重複マクロ定義検知
		for (const [nm, aUse] of Object.entries(this.#hDupMac2aUse)) this.#hDupMac2aUse[nm] = aUse.filter(locUse=> locUse.uri !== uri);

		this.#hDoc2InlayHint[pp] = [];

		// メッセージをクリア
		this.#uri2Diag[uri] = [];
		this.#Uri2Links[uri] = [];
	}
	#goFinish(pp: string) {
		// キーワード削除対応
		const now = this.#hScr2KeyWord[pp];
		for (const s of this.#OldhScr2KeyWord) {
			if (now.has(s)) continue;

			if (Object.entries(this.#hScr2KeyWord).some(
				([pp2, v])=> pp2 !== pp && v.has(s)
			)) continue;	// 別のpathにあるので削除されてない

			const [k, w] = s.split('\t');
			this.#hSetWords[k].delete(w);
		}

		const {mes, sev} = this.#hDiag.未使用マクロ;
		const uri = this.#curPrj + pp;
		for (const [nm, {hPrm, loc}] of Object.entries(this.#hDefMacro)) {
			if (nm in this.#hMacro2aLocUse) continue;
			if (hPrm?.nowarn_unused?.val) continue;
			if (pp && loc.uri !== uri) continue;	// 更新分のみ

			(this.#uri2Diag[loc.uri] ??= []).push(Diagnostic.create(
				loc.range,
				mes.replace('$', nm),
				sev
			));
		}

/*	// NOTE: Score
		if (pp.slice(-4) === '.ssn') {	// NOTE: Score 変更して動作未確認
			const d = this.docs.get(this.#curPrj + pp);	// NOTE: LSPでは失敗する
			if (! d) return;

			const hMacroOld = this.#hOldDefMacro;
			for (const [nm, v] of Object.entries(hMacroOld)) {
				if (! (nm in this.#hDefMacro)	// マクロ定義が削除された
				||	Object.entries(this.#hDefMacro[nm].hPrm).sort().join()
				!==	Object.entries(v.hPrm).sort().join())
				// マクロ定義の引数が更新された
				this.#hMacro2UseLocs[nm]?.forEach(locUse=> {
					const txt = doc.lineAt(loc.range.start.line).text.trim();
					this.#cteScore.updLine(
						doc,
						loc.range,
						txt,
						this.#resolveScript(txt).aToken
					);	// 最新ssn定義で更新
				});
			}

			// 追加されたマクロ定義
			this.#aMacroAdd.forEach(nm=> this.#hMacro2UseLocs[nm]?.forEach(locUse=> {
				const txt = doc.lineAt(loc.range.start.line).text.trim();
				this.#cteScore.updLine(
					doc,
					loc.range,
					txt,
					this.#resolveScript(txt).aToken,
				);
			}));
		}
*/
	}


	// フォントと使用文字情報
	#InfFont	: TINF_INTFONT	= {
		defaultFontName	: '',
		hSn2Font2Str	: {},
		hUri2FontErr	: {},
	};
	#getFonts2ANm(fonts: string, uri: string, rng: Range): string {
		const aNm = fonts.split(',')
		.map(nm=> /^["'\s]*(?<text>[^,;"']+)/.exec(nm)?.groups?.text ?? '');
			// https://regex101.com/r/TA5y7N/1

		for (const nm of aNm) {
			(this.#InfFont.hUri2FontErr[uri] ??= []).push({
				err	: this.#hDiag.フォントファイル不明.mes.replace('$', nm),
				nm,
				sl	: rng.start.line,
				sc	: rng.start.character,
				el	: rng.end.line,
				ec	: rng.end.character,
			});
		}

		const [ret=''] = aNm;
		return ret;
	}


			readonly	#alzTagArg	= new AnalyzeTagArg;
	static	readonly	#regValName
		= /(?<=name\s*=\s*)([^"'#;\]]+|(["'#])(.*?)\2)/m;
	static	readonly	DEF_FONT = ':DEF_FONT:';
	#nowFontNm = LspWs.DEF_FONT;
	#scanScript(pp: string) {
		const fn = getFn(pp);
		const uri = this.#curPrj + pp;
		const aDi = this.#uri2Diag[uri];
		const f2s: TFONT2STR = this.#InfFont.hSn2Font2Str[pp] = {};
		this.#nowFontNm = LspWs.DEF_FONT;

		const hLblRng: TH_FN2LBLRNG = {};	// ラベル重複チェック用
		const setKw = this.#hScr2KeyWord[pp];	// キーワード削除チェック用
		const aDsOutline: DocumentSymbol[] = this.#hSn2aDsOutline[pp] = [];

		const tmpSj = `fn=${fn}`;
		const lenSj = tmpSj.length;
		this.#hSetWords.ジャンプ先 = new Set(
			[...this.#hSetWords.ジャンプ先]
			.filter(v=> v.slice(0, lenSj) !== tmpSj)
		);
		this.#setKwAdd(setKw, 'ジャンプ先', tmpSj);

		const sJumpFn = new Set();	// ジャンプ元から先(fn)への関連
		let sJoinLabel = '';	// ラベル変更検知用、jump情報・ラベル名結合文字列
								// [jump]タグなどの順番が変わっただけでも変更扱いで

		// procTokenBase を定義、procToken も同値で始める
		this.#procToken = this.#procTokenBase = (p: Position, token: string)=> {
			const uc = token.charCodeAt(0);	// TokenTopUnicode
			const len = token.length;
			if (uc === 9) {p.character += len; return;}	// \t タブ
			if (uc === 10) {p.line += len; p.character = 0; return;}// \n 改行
			if (uc === 59) {p.character += len; return;}	// ; コメント
			const rng = Range.create(
				p.line, p.character,
				p.line, p.character +len
			);
			if (uc === 38) {	// & 変数操作・変数表示
				p.character += len;
				if (token.slice(-1) === '&') return;
				//変数操作
				try {
					const {name, text} = LspWs.#splitAmpersand(token.slice(1));
					if (name.charAt(0) !== '&') {
						const kw = name.trimEnd();
						this.#setKwAdd(setKw, '代入変数名', kw);

						// doc/prj/script/setting.sn の デフォルトフォント
						if (kw === 'def_fonts') this.#InfFont.defaultFontName = this.#getFonts2ANm(text, uri, rng);
					}
				} catch (e) {console.error(`fn:LspWs.ts #scanScriptSrc & %o`, e);}
				return;
			}
			if ((uc === 42) && (token.length > 1)) {	// * ラベル
				p.character += len;

				const kw = `fn=${getFn(pp)} label=${token}`;
				this.#setKwAdd(setKw, 'ジャンプ先', kw);

				const [lbl] = token.split('|');
					// 吉里吉里仕様のセーブラベル名にあたる機能は無いが、属性指定時に
					//「|」後はデフォルト値解釈で無視されるので、この処理がいる
				aDsOutline.push({
					name	: token,
					detail	: '',
					kind	: SymbolKind.Key,
					range	: rng,
					selectionRange	: rng,
				});
				if (lbl.charAt(1) === '*') return;	// 無名ラベルは除外

				sJoinLabel += token;	// まぁ区切りなくていいか。*あるし
				const lr = hLblRng[lbl];
				if (lr) {
					const rngLbl = hLblRng[lbl];
					const {mes, sev} = this.#hDiag.ラベル重複;
					const mes2 = mes.replace('$', lbl);
					if (rngLbl) aDi.push(Diagnostic.create(rngLbl, mes2, sev));
					aDi.push(Diagnostic.create(rng, mes, sev));
				}
				else hLblRng[lbl] = rng;
				return;
			}
			if (uc !== 91) {	// 文字表示
				p.character += len;

				aDsOutline.push({
					name	: token,
					detail	: '',
					kind	: SymbolKind.String,
					range	: rng,
					selectionRange	: rng,
				});

				f2s[this.#nowFontNm] = (f2s[this.#nowFontNm] ?? '') + token;
				return;
			}

			// [ タグ開始
			const a_tag = this.#REG_TAG_NAME.exec(token.slice(1, -1));
			const use_nm = a_tag?.groups?.name;
			if (! use_nm) {	// []、[ ]など
				const {mes, sev} = this.#hDiag.タグ記述異常;
				aDi.push(Diagnostic.create(rng, mes.replace('$', token), sev));
				return;
			}

			const pBefore = {...p};
			// 複数行タグでの行カウント補正
			let lineTkn = 0;
			let j = -1;
			while ((j = token.indexOf('\n', j +1)) >= 0) ++lineTkn;
			if (lineTkn <= 0) p.character += len;
			else {
				p.line += lineTkn;
				p.character = len -token.lastIndexOf('\n') -1;
				const {mes, sev} = this.#hDiag.改行64行超;
				if (lineTkn > 64) aDi.push(Diagnostic.create(Range.create(
					rng.start.line, Math.max(rng.start.character -1, 0),
					p.line, 0
				), mes, sev));
			}

			this.#hDoc2TagMacUse[pp].push({nm: use_nm, rng: {
				start: rng.start, end: {...p}	// 値が変わるので、この瞬間の値を
			}});

			const rng_nm = Range.create(
				rng.start.line,
				rng.start.character,
				rng.end.line,
				rng.end.character +use_nm.length -len,
			);
			const rngp1 = Range.create(
				rng_nm.start.line,
				rng_nm.start.character +1,
				rng_nm.end.line,
				rng_nm.end.character +1,
			);

			const args = token.slice(1 +use_nm.length, -1);
			this.#alzTagArg.parse(args);
			const hArg = this.#alzTagArg.hPrm;
			hArg[':タグ名'] = <any>use_nm;
			if (use_nm in this.#hDefPlugin) return;	// プラグインはここまで

			// 引数調査（マクロ＋タグ）
			this.#aEndingJob.push(()=> {	// 遅延調査
				const param = this.#hDefMacro[use_nm]?.param ?? hMd[use_nm]?.param;
				if (! param) return;

				const hRng = this.#alzTagArg.parseinDetail(token, use_nm.length, rng_nm.start.line, rng_nm.start.character);
				for (const {rangetype, name} of param) {
					if (rangetype === 'ラベル名') {	// ラベルがあればジャンプ系タグ
						if (Boolean(hArg.del?.val)
						&& hArg[':タグ名'].val === 'event') continue;

						const argFn = hArg.fn?.val ?? getFn(pp);
						const argLbl = hArg.label?.val;
						if (this.#chkLiteral(argFn)) {
							// 変数・文字列操作系ならチェック不能
if (this.#hSetWords.スクリプトファイル名.has(argFn)) {
	sJumpFn.add(argFn);

	const {pBefore} = arg;
	const hRng = this.#alzTagArg.parseinDetail(token, use_nm.length, pBefore.line, pBefore.character);
	if (this.#chkLiteral4lbl(argLbl) && ! this.#hFn2label[argFn][argLbl]) {
		// 変数・文字列操作系ならチェック不能
		const {k_ln, k_ch, v_ln, v_ch, v_len} = hRng[name];
		const {mes, sev} = this.#hDiag.ラベル不明;
		aDi.push(Diagnostic.create(
			Range.create(k_ln, k_ch, v_ln, v_ch +v_len),
			mes.replace('$', argLbl),
			sev
		));
	}
	else {
		const to_uri = this.#searchPath(argFn, SEARCH_PATH_ARG_EXT.SCRIPT);
		const lnOpen = (this.#hFn2label[argFn][argLbl]?.start.line ?? 0) +1;
		for (const nmArg of ['fn', 'label']) {
			const r = hRng[nmArg];
			if (! r) continue;
			const {k_ln, k_ch, v_ln, v_ch, v_len} = r;
			(this.#Uri2Links[uri] ??= []).push({
				range	: Range.create(
					k_ln, k_ch,
					v_ln, v_ch +v_len,
				),
				target	: to_uri +`#L${lnOpen}`,
				tooltip	: `${fn}.sn の${argLbl ?'ラベル '+ argLbl :'冒頭'} を開く`,
			});
		}
	}
}
						}
					}
					if (! (name in hArg) || ! (name in hRng)) continue;
						// 未使用・未定義はここまで

					let {val} = hArg[name];
					if (! this.#chkLiteral(val)) continue;	// 変数・文字列操作系ならチェック不能

					switch (rangetype) {
						// #hSetWords
					//	case '代入変数名':	// 観察者効果により存在チェック不可

					//	case 'ジャンプ先':

						case 'レイヤ名':
						case '文字レイヤ名':
						case '画像レイヤ名':

						case 'マクロ名':

						case 'スクリプトファイル名':
						case '画像ファイル名':
						case '音声ファイル名':
						case 'HTMLファイル名':

						case '差分名称':
						case 'フレーム名':
					//	case 'サウンドバッファ':	// 観察者効果により存在チェック不可
						case '文字出現演出名':
						case '文字消去演出名':{
							if (this.#hSetWords[rangetype].has(val)) break;

							const {k_ln, k_ch, v_ln, v_ch, v_len} = hRng[name];
							const {mes, sev} = this.#hDiag.キーワード不明;
							aDi.push(Diagnostic.create(
								Range.create(k_ln, k_ch, v_ln, v_ch +v_len),
								mes.replace('$', `${name} (${rangetype.slice(0, -1)})`)
								.replace('$', val),
								sev
							));
						}	break;
						// フォントファイルは #getFonts2ANm()→ローカルにて。システムフォントを調べる必要がある

						// #hPreWords
						case 'イベント名':
						case 'イージング名':
						case 'ブレンドモード名':{
							if (this.#hRegPreWords[rangetype].test(val)) break;

							const {k_ln, k_ch, v_ln, v_ch, v_len} = hRng[name];
							const {mes, sev} = this.#hDiag.キーワード異常;
							aDi.push(Diagnostic.create(
								Range.create(k_ln, k_ch, v_ln, v_ch +v_len),
								mes.replace('$', `${name} (${rangetype})`)
								.replace('$', val),
								sev
							));
						}	break;
					}
				}
			});

			const arg = {setKw, hArg, uri, pp, token, rng: rngp1, aDi, pBefore, p, rng_nm, aDsOutline};
			if (use_nm in LspWs.#hTag) {this.#hTagProc[use_nm]?.(arg); return;}

			// ここからマクロのみ
			(this.#hMacro2aLocUse[use_nm] ??= []).push(Location.create(uri, rngp1));
		};

		const p = {line: 0, character: 0};
		try {
			for (const token of this.#hScript[pp].aToken) this.#procToken(p, token);
		} catch (e) {
			console.error(`#scanScript Err ${pp}(${p.line},${p.character}) e:${e.message}`);
		}

		this.#hFn2label[fn] = hLblRng;

		if (this.#hPp2JoinLabel[pp] !== sJoinLabel) {
			for (const [pp_from, v] of Object.entries(sJumpFn)) {
				if (v.has(fn)) this.#sNeedScan.add(pp_from);
			}
			this.#hPp2JoinLabel[pp] = sJoinLabel;
		}

//		if (isUpdScore && path.slice(-4) === '.ssn') this.#cteScore.updScore(path, this.curPrj, a);		// NOTE: Score
	}
		#chkLiteral(fn: string): boolean {return !!fn && /^[^*%&"'#]/.test(fn) && fn.at(-1) !== '*'}
		#chkLiteral4lbl(lbl: string): boolean {return !!lbl && /^\*[^*%&"'#]/.test(lbl)}
		#REG_TAG_NAME	= /(?<name>[^\s;\]]+)/;
		#setKwAdd(setKw: Set<string>, key: string, word: string) {
			setKw.add(`${key}\t${word}`);
			this.#hSetWords[key].add(word);
		}
		#procTokenBase = (_p: Position, _token: string)=> {};
	#procToken:  (p: Position, token: string)=> void	= this.#procTokenBase;
		// トークン解析実行するのはこのメソッド
		// [let_ml]処理中は一時差し替え → procToken に復帰
	readonly	#hTagProc: {[nm: string]: (arg: ARG_TAG_PROC)=> void}	= {
		// constructor で上書きしているので注意

		let_ml: ({setKw, hArg})=> {
			this.#procToken = (p, token)=> {
				const len2 = token.length;
				let lineTkn = 0;
				let j = -1;
				while ((j = token.indexOf('\n', j +1)) >= 0) ++lineTkn;
				if (lineTkn === 0) p.character += len2; else {
					p.line += lineTkn;
					p.character = len2 -token.lastIndexOf('\n') -1;
				}
				this.#procToken = this.#procTokenBase;
			};

			const v = hArg.name?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, '代入変数名', v);
		},

		macro: arg=> {
			const {uri, token, rng, aDi, pBefore, p, hArg} = arg;
			const nm = hArg.name?.val;
			if (! nm) {	// [macro name=]など
				const {mes, sev} = this.#hDiag.マクロ定義_名称異常;
				aDi.push(Diagnostic.create(rng, mes, sev));
				return;
			}

			if (nm in LspWs.#hTag) {
				const {mes, sev} = this.#hDiag.マクロ定義_同名タグ;
				aDi.push(Diagnostic.create(rng, mes.replace('$', nm), sev));
				return;
			}
			if (nm in this.#hDefPlugin) {
				const {mes, sev} = this.#hDiag.マクロ定義_同名プラグイン;
				aDi.push(Diagnostic.create(rng, mes.replace('$', nm), sev));
				return;
			}

			// 重複マクロ定義検知（複数スクリプトをまたがるので、あとで網羅処理）
			(this.#hDupMac2aUse[nm] ??= []).push(Location.create(uri, rng));
			if (nm in this.#hDefMacro) return;

			// 新規マクロ定義を登録
			const m = token.match(LspWs.#regValName);
			if (! m) {	// 失敗ケースが思い当たらない
				const {mes, sev} = this.#hDiag.マクロ定義異常;
				aDi.push(Diagnostic.create(rng, mes.replace('$', nm), sev));
				return;
			}

			const param: MD_PARAM_DETAILS[] = [];
			for (const [aNm, {val}] of Object.entries(hArg)) {
				if (aNm.charAt(0) !== '%') continue;

				const required = aNm.slice(-1) !== '?';
				const name = aNm.slice(1, required ?undefined :-1);
				const [rangetype, def, comment] = val.split('|');
//console.log(`fn:LspWs.ts [macro] nm:${nm} name:${name}= rangetype:${rangetype} def:${def} comment:${comment}`);
				param.push({
					name,
					required	: required ?'y' :'',
					def,
					rangetype,
					comment,
				});
			}

			const rng2 = Range.create(
				pBefore.line, pBefore.character,
				p.line, p.character,
			);
			const sum = hArg.sum?.val.replaceAll('\\n', '  \n');	
			const hRng = this.#alzTagArg.parseinDetail(token, 5, rng2.start.line, rng2.start.character);
			this.#hDefMacro[nm] = {
				loc		: Location.create(uri, rng2),
				hPrm	: hArg,
				sum,
				param,
				detail	: hArg.detail?.val.replaceAll('\\n', '  \n'),
				name_v_ln	: hRng.name.v_ln,
				name_v_ch	: hRng.name.v_ch,
			};
//			this.#aMacroAdd.push(nm);

			const ds = DocumentSymbol.create(nm, 'マクロ定義', SymbolKind.Class, rng2, rng2, sum ?[
				DocumentSymbol.create(sum.split(' ')[0], undefined, SymbolKind.String, rng2, rng2),
			] :undefined);
			arg.aDsOutline.push(ds);
			this.#aDsOutlineStack.push(arg.aDsOutline);
			arg.aDsOutline = [];
/*	// NOTE: Score
			if (uri.slice(-4) === '.ssn') {
				const o: {[k: string]: string} = {};
				for (const [k, v] of Object.entries(hArg)) o[k] = v.val ?? '';
//				this.#cteScore.defMacro(nm, o);
			}
*/
		},
		endmacro: arg=> arg.aDsOutline = this.#aDsOutlineStack.pop() ?? [],

		char2macro: ({uri, rng, aDi, hArg, token, pBefore})=> {
			const char = hArg.char?.val ?? '';
			const use_nm = hArg.name?.val ?? '';
			if (! char || ! use_nm) {	// [macro name=]など
				const {mes, sev} = this.#hDiag.一文字マクロ定義_属性異常;
				aDi.push(Diagnostic.create(rng, mes.replace('$', use_nm), sev));
				return;
			}
			if (use_nm in LspWs.#hTag || use_nm in this.#hDefPlugin) return;

			const hRng = this.#alzTagArg.parseinDetail(token, 10, pBefore.line, pBefore.character);
			const r = hRng.name;
			(this.#hMacro2aLocUse[use_nm] ??= []).push(Location.create(uri, Range.create(
				r.v_ln, r.v_ch,
				r.v_ln, r.v_ch +use_nm.length,
			)));
		},

		if: arg=> {
			const {token, rng} = arg;
			const ds = DocumentSymbol.create(token, '', SymbolKind.Function, rng, rng);
			arg.aDsOutline.push(ds);
			this.#aDsOutlineStack.push(arg.aDsOutline);
			arg.aDsOutline = ds.children ?? [];
		},
		elsif: arg=> {	
			this.#hTagProc.if(arg);

			arg.aDsOutline = this.#aDsOutlineStack.pop() ?? [];
		},
		// else:  = elsif
		endif: arg=> arg.aDsOutline = this.#aDsOutlineStack.pop() ?? [],

		// event:  = s
		// jump:  = s
		call: arg=> {
			this.#hTagProc.event(arg);

			const {pp, hArg, p} = arg;
			const fn = hArg.fn?.val ?? getFn(pp);
			if (!fn || fn.at(-1) !== '*') return;

			const a = this.#cnvFnWildcard2A(fn);
			const i = InlayHint.create({...p}, a.length === 0 ?'対象なし' :a.join(','), InlayHintKind.Parameter);
			i.paddingLeft = true;
			i.paddingRight = true;
			i.tooltip = 'ワイルドカード表現で対象となるスクリプト名';
			(this.#hDoc2InlayHint[pp] ??= []).push(i);
		},
		// return:  = s
		s: arg=> {
			const {token, rng} = arg;
			arg.aDsOutline.push(DocumentSymbol.create(token, '', SymbolKind.Function, rng, rng));
		},

		let: ({setKw, hArg})=> {
			const v = hArg.name?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, '代入変数名', v);
		},
		add_frame: ({setKw, hArg})=> {
			const v = hArg.id?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, 'フレーム名', v);
		},
		playbgm: ({setKw})=> {
			this.#setKwAdd(setKw, 'サウンドバッファ', 'BGM');
		},
		playse: ({setKw, hArg})=> {
			const v = hArg.buf?.val ?? 'SE';
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, 'サウンドバッファ', v)
		},
		button: arg=> {	
			this.#hTagProc.event(arg);

			const {hArg} = arg;
			const c = hArg.clicksebuf?.val ?? 'SYS';
			if (c && c.charAt(0) !== '&') this.#setKwAdd(arg.setKw, 'サウンドバッファ', c);
			const e = hArg.entersebuf?.val ?? 'SYS';
			if (e && e.charAt(0) !== '&') this.#setKwAdd(arg.setKw, 'サウンドバッファ', e);
			const l = hArg.leavesebuf?.val ?? 'SYS';
			if (l && l.charAt(0) !== '&') this.#setKwAdd(arg.setKw, 'サウンドバッファ', l);
		},

		link: arg=> {	
			this.#hTagProc.event(arg);

			const {hArg} = arg;
			const c = hArg.clicksebuf?.val ?? 'SYS';
			if (c && c.charAt(0) !== '&') this.#setKwAdd(arg.setKw, 'サウンドバッファ', c);
			const e = hArg.entersebuf?.val ?? 'SYS';
			if (e && e.charAt(0) !== '&') this.#setKwAdd(arg.setKw, 'サウンドバッファ', e);
			const l = hArg.leavesebuf?.val ?? 'SYS';
			if (l && l.charAt(0) !== '&') this.#setKwAdd(arg.setKw, 'サウンドバッファ', l);
		},
		ch_in_style: ({setKw, hArg})=> {
			const v = hArg.name?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, '文字出現演出名', v);
		},
		ch_out_style: ({setKw, hArg})=> {
			const v = hArg.name?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, '文字消去演出名', v);
		},
		add_lay: ({setKw, hArg})=> {
			const v = hArg.layer?.val;
			if (! v) return;

			this.#setKwAdd(setKw, 'レイヤ名', v);
			const cls = hArg.class?.val;
			const kwn = `${cls === 'grp' ?'画像' :'文字'}レイヤ名`;
			this.#setKwAdd(setKw, kwn, v);
		},
		add_face: ({setKw, hArg})=> {
			const v = hArg.name?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, '差分名称', v);
		},
		span: ({rng, uri, hArg})=> {
			const v = hArg.style?.val;
			if (! v) {this.#nowFontNm = LspWs.DEF_FONT; return;}

			// [span style='font-family: my_himajihoso; color: skyblue;']
			const fonts = /font-family\s*:\s+(?<fonts>[^;]+)/.exec(v)
			?.groups?.fonts ?? '';	// https://regex101.com/r/b93jbp/1
			if (! fonts) {this.#nowFontNm = LspWs.DEF_FONT; return;}

			const s = this.#getFonts2ANm(fonts, uri, rng);
			if (! s) this.#nowFontNm = s;
		},
	}	
	readonly	#aDsOutlineStack	: DocumentSymbol[][]	= [];
		#cnvFnWildcard2A(fn: string): string[] {
			const EXT = 'sn';
			return this.#matchPath('^'+ fn.slice(0, -1) +'.*', EXT).map(v=> decodeURIComponent(getFn(v[EXT])))
		}


	static	#splitAmpersand(token: string): {
		name: string;
		text: string;
		cast: string | null;
	} {
		const equa = token.replaceAll('==', '＝').replaceAll('!=', '≠').split('=');
			// != を弾けないので中途半端ではある
		const cnt_equa = equa.length;
		if (cnt_equa < 2 || cnt_equa > 3) throw '「&計算」書式では「=」指定が一つか二つ必要です';
		if (equa[1].charAt(0) === '&') throw '「&計算」書式では「&」指定が不要です';
		return {
			name: equa[0].replaceAll('＝', '==').replaceAll('≠', '!='),
			text: equa[1].replaceAll('＝', '==').replaceAll('≠', '!='),
			cast: ((cnt_equa === 3) ?equa[2].trim() :null)
		};
	}


	readonly	#REG_PATH = /([^\/\s]+)\.([^\d]\w+)/;
		// 4 match 498 step(~1ms)  https://regex101.com/r/tpVgmI/1
	#searchPath(fn: string, extptn: SEARCH_PATH_ARG_EXT = SEARCH_PATH_ARG_EXT.DEFAULT): string {
		if (! fn) throw '[searchPath] fnが空です';
		if (fn.slice(0, 7) === 'http://') return fn;
/*
		if (fn.slice(0, 11) === 'downloads:/') {
			const fp = this.sys.path_downloads + fn.slice(11);
			this.sys.ensureFileSync(fp);
			return fp;
		}
		if (fn.slice(0, 10) === 'userdata:/') {
			const fp = this.sys.path_userdata + 'storage/'+ fn.slice(10);
			this.sys.ensureFileSync(fp);
			return fp;
		}
*/
		const a = fn.match(this.#REG_PATH);
		let fn0 = a ?a[1] :fn;
		const ext = a ?a[2] :'';
		if (this.#userFnTail) {
			const utn = fn0 +'@@'+ this.#userFnTail;
			if (utn in this.#hPathFn2Exts) {
				if (extptn === '') fn0 = utn;
				else for (const e3 of Object.keys(this.#hPathFn2Exts[utn])) {
					if (`|${extptn}|`.indexOf(`|${e3}|`) === -1) continue;

					fn0 = utn;
					break;
				}
			}
		}
		const h_exts = this.#hPathFn2Exts[fn0];
		if (! h_exts) throw `サーチパスに存在しないファイル【${fn}】です`;

		let ret = '';
		if (! ext) {	// fnに拡張子が含まれていない
			//	extのどれかでサーチ（ファイル名サーチ→拡張子群にextが含まれるか）
			const hcnt = int(h_exts[':cnt']);
			if (extptn === '') {
				if (hcnt > 1) throw `指定ファイル【${fn}】が複数マッチします。サーチ対象拡張子群【${extptn}】で絞り込むか、ファイル名を個別にして下さい。`;

				return fn;
			}

			const search_exts = `|${extptn}|`;
			if (hcnt > 1) {
				let cnt = 0;
				for (const e2 of Object.keys(h_exts)) {
					if (search_exts.indexOf(`|${e2}|`) === -1) continue;
					if (++cnt > 1) throw `指定ファイル【${fn}】が複数マッチします。サーチ対象拡張子群【${extptn}】で絞り込むか、ファイル名を個別にして下さい。`;
				}
			}
			for (let e of Object.keys(h_exts)) {
				if (search_exts.indexOf(`|${e}|`) > -1) return h_exts[e];
			}
			throw `サーチ対象拡張子群【${extptn}】にマッチするファイルがサーチパスに存在しません。探索ファイル名=【${fn}】`;
		}

		// fnに拡張子xが含まれている
		//	ファイル名サーチ→拡張子群にxが含まれるか
		if (extptn !== '' && `|${extptn}|`.indexOf(`|${ext}|`) === -1) {
			throw `指定ファイルの拡張子【${ext}】は、サーチ対象拡張子群【${extptn}】にマッチしません。探索ファイル名=【${fn}】`;
		}

		ret = h_exts[ext];
		if (! ret) throw `サーチパスに存在しない拡張子【${ext}】です。探索ファイル名=【${fn}】、サーチ対象拡張子群【${extptn}】`;

		return ret;
	}
	#userFnTail		= '';
	#hPathFn2Exts	: IFn2Path	= {};

	#matchPath(fnptn: string, extptn: string = SEARCH_PATH_ARG_EXT.DEFAULT): ReadonlyArray<IExts> {
		const aRet :IExts[] = [];
		const regPtn = new RegExp(fnptn);
		const regExt = new RegExp(extptn);
		for (const [fn, h_exts] of Object.entries(this.#hPathFn2Exts)) {
			if (fn.search(regPtn) === -1) continue;
			if (extptn === '') {aRet.push(h_exts); continue;}

			const o :IExts = {};
			let isa = false;
			for (const ext of Object.keys(h_exts)) {
				if (ext.search(regExt) === -1) continue;

				o[ext] = fn;
				isa = true;
			}
			if (isa) aRet.push(o);
		}
		return aRet;
	}

}
