/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {getFn, int, REG_SCRIPT} from './CmnLib';
import {AnalyzeTagArg, HPRM} from './AnalyzeTagArg';
import {MD_PARAM_DETAILS, MD_STRUCT} from '../../dist/md2json';
const hMd: {[tag_nm: string]: MD_STRUCT} = require('../dist/md.json');

import {CompletionItem, CompletionItemKind, Connection, Definition, DefinitionLink, DefinitionParams, Diagnostic, DiagnosticSeverity, DidChangeWatchedFilesParams, DocumentLink, DocumentLinkParams, DocumentSymbol, DocumentSymbolParams, FileChangeType, Hover, InlayHint, InlayHintKind, InlayHintParams, InsertTextFormat, Location, MarkupContent, ParameterInformation, Position, PrepareRenameParams, Range, ReferenceParams, RenameParams, SignatureHelp, SignatureHelpParams, SignatureInformation, SymbolInformation, SymbolKind, TextDocumentChangeEvent, TextDocumentPositionParams, TextDocuments, TextEdit, WorkspaceEdit, WorkspaceFolder} from 'vscode-languageserver/node';
import {DocumentUri, TextDocument} from 'vscode-languageserver-textdocument';

interface Script {
	aToken	: string[];		// トークン群
	len		: number;		// トークン数
	aLNum	: number[];		// トークンの行番号
};
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
/*
	snippet: {
		nm: string;
		txt: string;
	}[];
 */
	detail?	: string;
}

// フォントと使用文字情報
type TFONT2STR = {
	[font_nm: string]	: string;
};

type TINF_INTFONT = {
	defaultFontName	: string;
	hSn2Font2Str	: {[sn: string]: TFONT2STR};
	hFontNm2uri		: {[font_nm: string]: string};
};

type PluginDef = {
	uri: string, sl: number, sc: number, el: number, ec: number,
};


type ArgDesc = {[name: string]: {
	label	: string;
	doc		: string;
}};


type TH_SN2LBLRNG = {[label: string]: Range};

export interface IExts { [ext: string]: string; };
export interface IFn2Path { [fn: string]: IExts; };

const enum SEARCH_PATH_ARG_EXT {	// #searchPath 使用時、第二引数用
	DEFAULT		= '',
	SPRITE	= 'png|jpg|jpeg|json|svg|webp|mp4|webm',
		// NOTE: ogvがそもそも再生できないので、ogvのみ保留
	SCRIPT	= 'sn|ssn',
	FONT	= 'woff2|woff|otf|ttf',
	SOUND	= 'mp3|m4a|ogg|aac|flac|wav',
	HTML	= 'htm|html',
};


export class LspWs {
	// === 新キーワード選択値はここに追加する
	readonly	#hSetWords	: {[key: string]: Set<string>}	= {
		'代入変数名'	: new Set,
		'ジャンプ先'	: new Set,
		'レイヤ名'		: new Set,
		'文字レイヤ名'	: new Set,
		'画像レイヤ名'	: new Set,
		'マクロ名'		: new Set,
		'スクリプトファイル名': new Set,
		'画像ファイル名': new Set,
		'音声ファイル名': new Set,
		'HTMLファイル名': new Set,
		'差分名称'		: new Set,
		'フレーム名'	: new Set,
		'サウンドバッファ'	: new Set,
		'文字出現演出名': new Set,
		'文字消去演出名': new Set,
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
A
alt+A
ctrl+A
shift+A
alt+ctrl+A
ctrl+shift+A
alt+shift+A
alt+ctrl+shift+A
' '
ArrowLeft
ArrowRight
ArrowUp
ArrowDown
Tab
Delete
Home
End
PageUp
PageDown|`.replaceAll('\n', ','),
		'animation-timing-function':
`|ease
ease-in
ease-out
ease-in-out
linear
step-start
step-end
cubic-bezier(...)|`.replaceAll('\n', ','),
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
Sinusoidal.Out|`.replaceAll('\n', ','),
		'ブレンドモード名': '|normal,add,multiply,screen|',
	};
	static readonly	#sPredefWrtVar	=
`const.Date.getDateStr
const.Date.getTime
const.sn.bookmark.json
const.sn.config.（略）
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


	static	readonly	#REG_SPRITE	= new RegExp(`\\.(${SEARCH_PATH_ARG_EXT.SPRITE})$`);
		// https://regex101.com/r/DPaLv3/1
	static	readonly	#REG_NOSPR	= /\/(path|prj)\.json$/;
		// https://regex101.com/r/DPaLv3/2
//	static	readonly	#REG_FONT	= new RegExp(`\\.(${SEARCH_PATH_ARG_EXT.EXT_FONT})$`);
	static	readonly	#REG_SOUND	= new RegExp(`\\.(${SEARCH_PATH_ARG_EXT.SOUND})$`);
	static	readonly	#REG_HTML	= /\.html?$/;


	static		inited		= false;
	static		#hTag		: {[tag_nm: string]: boolean}	= {};
	static		#hSnippet	: {[tag_nm: string]: string}	= {};
	static	readonly	#aCITag			: CompletionItem[]	= [];

	readonly	#curPrj		: string;	// 'file:///'付き
	readonly	#lenCurPrj	: number;


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

		this.#hTagProc.jump = this.#hTagProc.event;
		this.#hTagProc.return = this.#hTagProc.s;
		this.#hTagProc.else = this.#hTagProc.elsif;
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
		'ready': ()=> this.#fullScan(),
		'init.res':	o=> {
			this.#hCmd2ReqProc = this.#hCmd2ReqProc_Inited;
			this.#scanAll(o);
		},
	};
	readonly	#hCmd2ReqProc_Inited: {[cmd: string]: (o: any)=> void}	= {
		'init.res'		: o=> this.#scanAll(o),
		'def_plg.upd'	: o=> this.#hDefPlugin = o,
		'def_esc.upd'	: ()=> this.#fullScan(),
		'int_font.upd'	: o=> this.#InfFont.hFontNm2uri = o,
	};
	#fullScan() {this.#sendRequest('init');}


	// === ファイル変更イベント（手入力が対象） ===
	onDidChangeContent(chg: TextDocumentChangeEvent<TextDocument>) {
		const {uri} = chg.document;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return;

		const pp = uri.slice(this.#lenCurPrj);
		if (! pp) return;
		const d = this.docs.get(uri);
		if (! d) return;
		if (! REG_SCRIPT.test(uri)) return;

		this.#hScript[pp] = this.#resolveScript(d.getText());

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
		this.#scanInit(pp);
		this.#scanScript(pp);
		this.#goFinish(pp);

		// （変更前・変更後問わず）このファイルで定義されたマクロを使用しているファイルは
		// すべて追加走査（重複走査・永久ループに留意）
			// 重複定義時は、最初に見つかったもののみ #hMacro(Old) に入っている
		const mon = {...this.#hOldDefMacro, ...this.#hDefMacro};
		for (const [nm, {loc}] of Object.entries(mon)) {
			// 1.このファイルで定義されたマクロ
			if (loc.uri !== uri &&
				! this.#hDupMac2aUse[nm]?.map(locUse=> locUse.uri)
				.includes(uri)) continue;	// 定義重複は別変数なので
			// 2.を使用しているファイル
			for (const locUse of this.#hMacro2aLocUse[nm] ?? []) {
				if (locUse.uri !== uri) this.#sNeedScan.add(locUse.uri.slice(this.#lenCurPrj));
			}
		}

		// 追加走査
		this.#sNeedScan.delete(uri);	// 処理重複につき
		for (const pp2 of this.#sNeedScan) {
			this.#scanInit(pp2);
			this.#scanScript(pp2);
			this.#goFinish(pp2);
		}

		this.#noticeAnalyzeInf();
	}

	// === ファイル変更イベント（手入力以外が対象） ===
	// LanguageClientOptions.synchronize.fileEvents での設定によるイベント
	//	// Changed は保存時に発生する
	onDidChangeWatchedFiles({changes}: DidChangeWatchedFilesParams) {
		const {uri} = changes[0];	// 'file:///'付き
		if (! this.#checkRelated(uri)) return;
//console.log(`fn:LspWs.ts onDidChangeWatchedFiles !`);

		for (const {type, uri} of changes) {
			const pp = uri.slice(this.#lenCurPrj);
			if (pp === 'path.json'
			&& (type === FileChangeType.Created ||
				type === FileChangeType.Changed)) {this.#fullScan(); continue;}
		}
	}


	// === 識別子上にマウスホバーしたとき表示するヒント ===
	static	readonly #regTagName	= /(?<=\[)[^\s\[\]="'#;]+/g;
	onHover(prm: TextDocumentPositionParams): Hover | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;
		const d = this.docs.get(uri);
		if (! d) return null;

		const p = prm.position;
		const r = this.#getWordRangeAtPosition(d, p, LspWs.#regTagName);
		if (! r) return {contents: []};
		const {hit, range} = r;

		// マクロ
		const md = this.#hDefMacro[hit];
		if (md) {
			const {param, sum} = md;
			return {range, contents: {kind: 'markdown', value: `~~~skynovel
(マクロ) [${hit}${
	param.map(md=> this.#cnvMdParam2Str(md)).join('')
}]
~~~
---
${sum ?? ''} [定義位置：${ getFn(md.loc.uri) }](${ md.loc.uri }#L${ md.loc.range.start.line +1 })  \n`
			}};	// 【半角空白二つ + \n】で改行
		}

		// プラグイン定義タグ
		const pd = this.#hDefPlugin[hit];
		if (pd) return {range, contents: {kind: 'markdown', value:
`~~~skynovel
(プラグイン定義タグ) [${hit}]
~~~
---
[定義位置：${ getFn(pd.uri) }](${ pd.uri }#L${ pd.sl +1 })`
		}};

		// タグ
		const td = hMd[hit];
		if (! td) return {contents: []};	// 前に警告出してる
		const {param, sum} = td;
		return {range, contents: {kind: 'markdown', value: `~~~skynovel
(タグ) [${hit}${
	param.map(md=> this.#cnvMdParam2Str(md)).join('')
}]
~~~
---
${sum.replace('\n', `[タグリファレンス](https://famibee.github.io/SKYNovel/tag.html#${hit})  \n`)}`		// 【半角空白二つ + \n】で改行
		}};
	}
		readonly #checkRelated = (uri: string)=> this.#curPrj === uri.slice(0, this.#lenCurPrj);
		#getWordRangeAtPosition(td: TextDocument, p: Position, reg: RegExp): {hit: string, range?: Range,} {
//			if (reg.flags.indexOf('g') === -1) console.log(`fn:LspWs.ts #getWordRangeAtPosition gフラグが必要です`);// TO DO: あとでコメントアウト

			const s = td.getText({start: {line: p.line, character: 0}, end: {line: p.line, character: 9999}});
			let e: RegExpExecArray | null = null;
			reg.lastIndex = 0;	// /gなので必要
			while (e = reg.exec(s)) {
				const hit = e[0], len = hit.length, b = reg.lastIndex -len;
				if (b <= p.character && p.character <= reg.lastIndex) return {
					hit,
					range: Range.create(p.line, Math.max(b, 0), p.line, reg.lastIndex),
				};
			}
			return {hit: ''};
		}
		readonly	#cnvMdParam2Str = ({name, required, def, rangetype}: MD_PARAM_DETAILS)=> ` ${name}=${
			required === 'y'
			? `【必須】${this.#escHighlight(rangetype)}`
			: `${this.#escHighlight(rangetype)}|${this.#escHighlight(def)}`
		}`;
		readonly	#escHighlight = (s = '')=> [']',' '].some(el=> s.includes(el)) ?`'${s}'` :s;


	// === コード補完機能 ===
	// 自動補完
	//	// 初期リストを返すハンドラー
	onCompletion(prm: TextDocumentPositionParams): CompletionItem[] | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = uri.slice(this.#lenCurPrj);
		if (! pp) return [];
		const d = this.docs.get(uri);
		if (! d) return [];

		const {position: p, position: {line: l, character: c}} = prm;
		const trgChr = d.getText({start: {line: l, character: c -1}, end: p});
		if (trgChr === '[') return this.#aCITagMacro;	// タグやマクロ候補を表示

		const aUse = this.#hDoc2TagMacUse[pp];
		if (! aUse) return [];
		const use = aUse.find(o=> this.#contains(o.rng, p));
		if (! use) return [];
		const md = this.#hDefMacro[use.nm] ?? hMd[use.nm];
		if (! md) return [];

		// 属性候補を表示
		const {param} = md;
		if (trgChr === ' ') return param.map(({name, comment})=> ({
			label	: name,
			kind	: CompletionItemKind.Field,
			detail	: comment,	// 属性候補選択時のコメント
		}));

		// 属性値候補を表示
		// if (trgChr === '=')
		const r = this.#getWordRangeAtPosition(d, p, LspWs.#REG_FIELD);
		if (! r) return [];
		const idxParam = this.#searchArgName(d.getText(r.range), param);
		if (idxParam === -1) return [];
		const prm_details = param[idxParam];
		if (! prm_details) return [];
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
			case 'スクリプトファイル名':
			case '画像ファイル名':
			case '音声ファイル名':
			case 'HTMLファイル名':	kind = CompletionItemKind.File;	break;
			// TODO: 意外にレイヤ名がない
			default:	kind = CompletionItemKind.EnumMember;	break;
		}
		return words.slice(1, -1).split(',').map(v=> ({
			label	: v,
			kind	:
				v.slice(0, 6) === 'const.' ? CompletionItemKind.Constant :kind,
		}));
	}
		#contains({start, end}: Range, {line: l, character: c}: Position): boolean {
			return	start.line <= l
				&&	l <= end.line
				&&	start.character <= c
				&&	c <= end.character;
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
	#aCITagMacro	: CompletionItem[]	= [];
	#hFn2JumpSnippet	: {[fn: string]: string}	= {};
	#bldCnvSnippet() {
		let eq = true;

		const mn = this.#hSetWords.マクロ名;
		mn.clear();
		const hMacArgDesc: ArgDesc	= {};
		for (const [mac_nm, {sum}] of Object.entries(this.#hDefMacro)) {
			mn.add(mac_nm);
			hMacArgDesc[mac_nm] = {
				label	: `[${mac_nm} ...]`,
				doc		: sum ?? '',
			};
		}
		this.#hArgDesc = {...LspWs.#hTagArgDesc, ...hMacArgDesc};

		this.#hSetWords.代入変数名.add(LspWs.#sPredefWrtVar);
		this.#hSetWords.文字出現演出名.add('default');
		this.#hSetWords.文字消去演出名.add('default');
		for (const [key, set] of Object.entries(this.#hSetWords)) {
			const str = `|${
				[...set.values()].sort().map(v=> v.replaceAll(',', '\\,'))
				.join(',').replaceAll('|', '\\|')	// スニペット構文のエスケープ
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
				detail	: '（プラグインにより追加されたタグ）',	// 最初に出る一覧の右二つ	// TODO: プラグインの概要
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

	static	readonly	#REG_FIELD	= /(?<=\s)[^\s=[\]]+(?:=(?:[^"'#\s;\]]+|(["'#]).*?\1)?)?/g;
	#searchArgName(inp: string, param: MD_PARAM_DETAILS[]): number {
		const includesEq = inp.search(/(?<=[^=]+)=/);
		// = 打鍵済みなら属性名確定で、同一を探す
		//（配列で前の方のyoyoにマッチしyにマッチしない、という事があるので）
		if (includesEq === -1) {
			const reg = new RegExp(`^${inp.replace(/=.*$/,'')}`);
			return param.findIndex(p=> reg.test(p.name));
		}

		const arg_nm = inp.slice(0, includesEq);
		return param.findIndex(p=> p.name === arg_nm);
	}


	// === 引数の説明 ===
	#preSigHelp	: SignatureHelp	= {signatures: []};
	#rngPreTag	: Range;
						#hArgDesc		: ArgDesc	= {};
	static	readonly	#hTagArgDesc	: ArgDesc	= {};
	onSignatureHelp(prm: SignatureHelpParams): SignatureHelp | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = uri.slice(this.#lenCurPrj);
		if (! pp) return null;
		const aUse = this.#hDoc2TagMacUse[pp];
		if (! aUse) return null;	// Nothing tag file.
		const d = this.docs.get(uri);
		if (! d) return null;

		let token = '';
		const {position: p, context} = prm;
		if (context?.isRetrigger) {	// すでに開いてる
			// Helpオープン中再訪時は、始点（変化しない）からタグ正規表現かけ終点を探す
			const r = {...this.#rngPreTag};
			if (! r) return null;
			r.end.line += 2;	// 二行分捕捉すれば、改行発生後どんな行長になっても対応できるはず
			const a = this.#analyzToken(d.getText(r));
			if (! a) return null;	// No tag here.

			token = a[0];
			const pp2 = d.positionAt(d.offsetAt(r.start) +token.length);
			if (! pp2) return null;
			r.end.line = pp2.line;
			r.end.character = pp2.character;
			if (! this.#contains(Range.create(
				r.start.line,
				r.start.character +1,
				r.end.line,
				Math.max(r.end.character, 0),	// タグ名と属性を入れてから押しっぱなしUNDOすると -1 になりエラーになるので
			), p)) return null;	// Out of tag.

			this.#rngPreTag = r;
		}
		else {
			const r2 = aUse.find(o=> this.#contains(o.rng, p))?.rng;
			if (! r2) return null;	// 'No args here.

			this.#rngPreTag = Range.create(r2.start.line, r2.start.character, r2.end.line, r2.end.character +1);	// 1は起動spaceキー文字分
			token = d.getText(this.#rngPreTag);
		}

		const a_tag = this.#REG_TAG_NAME.exec(token.slice(1));
		const g = a_tag?.groups;
		if (! g) return null;	// No args here.
		const {name} = g;
		const md = this.#hDefMacro[name] ?? hMd[name];
		if (! md) return null;

		const {param} = md;
		if (! context?.isRetrigger) {
			const ad = this.#hArgDesc[name];
			if (! ad) {
				console.log(`fn:LspWs.ts hArgDesc[${name}] 定義なし`);
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
			const si = SignatureInformation.create(`[${name}${sPrm}]`, ad.doc);
			si.parameters = aPI;
			this.#preSigHelp = {signatures: [si],};
		}
		const {range} = this.#getWordRangeAtPosition(d, p, LspWs.#REG_FIELD);
		this.#preSigHelp.activeParameter = range
			? this.#searchArgName(d.getText(range), param)
			: -1;

		return this.#preSigHelp;
	}
		#REG_TAG_NAME	= /(?<name>[^\s;\]]+)/;
		#analyzToken(token: string): RegExpExecArray | null {
			this.#REG_TOKEN.lastIndex = 0;	// /gなので必要
			return this.#REG_TOKEN.exec(token);
		}


	// === 定義へ移動、定義をここに表示 ===
	onDefinition(prm: DefinitionParams): Definition | DefinitionLink[] | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const d = this.docs.get(uri);
		if (! d) return null;
		const p = prm.position;
		const r = this.#getWordRangeAtPosition(d, p, LspWs.#regTagName);
		if (! r?.range) return null;	// No word here.

		const nm = d.getText(r.range);
		const locMd = this.#hDefMacro[nm]?.loc;
	//	if (locMd) return locMd;	// シンプル版
		if (locMd) return [<DefinitionLink>{
			targetUri	: locMd.uri,
			targetRange	: locMd.range,
			targetSelectionRange	: locMd.range,	// 一瞬だけ選択する？
		}];

		const pd = this.#hDefPlugin[nm];
		if (pd) return [<DefinitionLink>{
			targetUri	: pd.uri,
			targetRange	: Range.create(pd.sl, pd.sc, pd.el, pd.ec),
			targetSelectionRange	: Range.create(pd.sl, pd.sc, pd.el, pd.ec),	// 一瞬だけ選択する？
		}];

		return null;	// No definition found
	}

	// === 参照へ移動、参照をここに表示 ===
	static	readonly #regMacDefRefName	= /(?<=\[(macro\s+name=)?)[^\s\[\]="'#;]+/g;
	onReferences(prm: ReferenceParams): Location[] | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const d = this.docs.get(uri);
		if (! d) return null;
		const p = prm.position;
		const r = this.#getWordRangeAtPosition(d, p, LspWs.#regMacDefRefName);
		if (! r?.range) return null;	// No word here.

		const nm = d.getText(r.range);
		return this.#hMacro2aLocUse[nm];
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
	}	// TODO: ラベルジャンプ
	#Uri2Links: {[uri: string]: DocumentLink[]}	= {};
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

		const d = this.docs.get(uri);
		if (! d) return null;
		const p = prm.position;
		const r = this.#getWordRangeAtPosition(d, p, LspWs.#regMacDefRefName);
		if (! r?.range) return null;	// No word here.

		const nm = d.getText(r.range);
		if (nm in LspWs.#hTag) return null;		// タグは変名できません
		if (nm in this.#hDefPlugin) return null;// プラグイン定義タグは変名できません

		return r.range;
	//	return {range: r.range, placeholder: '変更後のマクロ名'};
		// placeholder というより変更前の単語を置き換える
	}
		static	readonly	#REG_NG4MAC_NM = new RegExp(`[\\s"'#;\\]　]+`);
	// === シンボルの名前変更 ===
	onRenameRequest(prm: RenameParams): WorkspaceEdit | null {
		const {uri} = prm.textDocument;		// 'file:///'付き
		if (! this.#checkRelated(uri)) return null;

		const {newName} = prm;
		if (LspWs.#REG_NG4MAC_NM.test(newName)) return null;// 異常な文字があります
		if (newName in LspWs.#hTag) return null;	// 既にあるタグ名です
		if (newName in this.#hDefMacro) return null;	// 既にあるマクロ名です
		if (newName in this.#hDefPlugin) return null;	// 既にあるプラグイン定義タグ名です

		const d = this.docs.get(uri);
		if (! d) return null;
		const p = prm.position;
		const r = this.#getWordRangeAtPosition(d, p, LspWs.#regMacDefRefName);
		if (! r?.range) return null;	// No word here.
		const oldName = d.getText(r.range);
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
		(changes[locMd.uri] ??= []).push(TextEdit.replace(locMd.range, newName));

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
	#uri2Diag	: {[uri: string]: Diagnostic[]}	= {};
	#oCfg: any = {};
	#scanAll(o: {
		pp2s	: {[pp: string]: string},
		hDefPlg	: {[def_nm: string]: PluginDef},	// 'file:///'なし
	}) {
		this.#oCfg = JSON.parse(o.pp2s['prj.json'] ?? '{}');
		this.#setEscape(this.#oCfg?.init?.escape ?? '');

		this.#updPath(o.pp2s['path.json'] ?? '{}');

		this.#hDefPlugin = o.hDefPlg;

		const aOldUri2Diag = Object.keys(this.#uri2Diag);
		this.#scanInit();
		for (const [pp, s] of Object.entries(o.pp2s)) this.#scanAllSub(pp, s);
		this.#scanFinishSub();

		// スクリプト削除時にエラーや警告を消す
		for (const uri of aOldUri2Diag) {
			if (uri in this.#uri2Diag) continue;
			this.conn.sendDiagnostics({uri, diagnostics: []});
		}

		this.#noticeAnalyzeInf();
	}
		#updPath(sJson: string) {
			const oJs = JSON.parse(sJson);
			const curPrj = this.#curPrj.slice(7);	// とりあえず'file:///'なし
			for (const [nm, v] of Object.entries(oJs)) {
				const h = this.#hPathFn2Exts[nm] = <any>v;
				for (const [ext, w] of Object.entries(h)) {
					if (ext !== ':cnt') h[ext] = curPrj + w;
				}
			}
		}
		#noticeAnalyzeInf() {
			this.conn.languages.inlayHint.refresh();

			this.#sendRequest('analyze_inf', {
				InfFont			: this.#InfFont,

				aQuickPickMac	: Object.entries(this.#hDefMacro)
				.map(([nm, {sum, loc: {uri}}])=> ({
					label		: nm,
					description	: `（マクロ）${sum?.split(' ')[0] ?? ''}`,
					//detail,	// 別の行になる
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
		}


	#hScr2KeyWord	: {[ppath: string]: Set<string>}	= {};
	#scanAllSub(pp: string, s: string) {
		const fn = getFn(pp);
		if (! REG_SCRIPT.test(pp)) {
			if (LspWs.#REG_SPRITE.test(pp)) {
				if (LspWs.#REG_NOSPR.test(pp)) return;
				this.#hSetWords.画像ファイル名.add(fn);
			}
			else if (LspWs.#REG_SOUND.test(pp)) {
				this.#hSetWords.音声ファイル名.add(fn);
			}
			else if (LspWs.#REG_HTML.test(pp)) {
				this.#hSetWords.HTMLファイル名.add(fn);
			}
			return;
		}
		this.#hSetWords.スクリプトファイル名.add(fn);

		this.#uri2Diag[this.#curPrj + pp] ??= [];
		this.#hSetWords.ジャンプ先.add(`fn=${fn}`);
		this.#hDoc2TagMacUse[pp] ??= [];
		this.#hScr2KeyWord[pp] ??= new Set();

		this.#hScript[pp] = this.#resolveScript(s);
		this.#scanScript(pp);
	}


	#hScript		: {[pp: string]: Script}		= {};

	#hDefPlugin		: {[nm: string]: PluginDef}		= {};
	#hDefMacro		: {[nm: string]: MacroDef}		= {};
	#hMacro2aLocUse	: {[nm: string]: Location[]}	= {};
	#hDoc2TagMacUse	: {[pp: string]: {nm: string, rng: Range}[]}	= {};

	#sNeedScan	= new Set<string>();	// スキャン必要フラグ（単体ファイル走査時）
		// {[pp: string]: 0}

	#hOldDefMacro	: {[nm: string]: MacroDef}	= {};	// 変更前に存在したマクロ群
	#aMacroAdd		: string[]	= [];

	#OldhScr2KeyWord	= new Set<string>();	// キーワード削除対応
	#hSn2aDsOutline	: {[pp: string]: DocumentSymbol[]}	= {};
	#hDupMac2aUse	: {[nm: string]: Location[]}	= {};

	#hFn2label		: {[fn: string]: TH_SN2LBLRNG}	= {};	// ラベル存在チェック用
	#hPp2JoinLabel	: {[pp: string]: string}		= {};	// ラベル名結合文字列
		// ジャンプ先変更チェック用。無名以外のラベル名を結合
	#hPp2JumpFn		: {[pp_from: string]: Set<string>}	= {};	// to_fn
		// ジャンプ元から先への関連

	#hDoc2InlayHint		: {[pp: string]: InlayHint[]}	= {};

	#scanInit(pp?: string) {
		if (! pp) {	// 全ファイル走査時
			this.#hDefMacro = {};
			this.#hMacro2aLocUse = {};
			this.#hDoc2TagMacUse = {};

			for (const k of Object.keys(this.#hSetWords)) this.#hSetWords[k] = new Set;
			this.#hScr2KeyWord = {};
			this.#hSn2aDsOutline = {};
			this.#InfFont = {defaultFontName: '', hSn2Font2Str: {}, hFontNm2uri: {},};

			this.#hDupMac2aUse = {};
			this.#hFn2label = {};
			this.#uri2Diag = {};
			this.#Uri2Links = {};
			this.#hPp2JoinLabel = {};
			this.#hPp2JumpFn = {};
			this.#hDoc2InlayHint = {};
			return;
		}

		// 単体ファイル走査時
		const uri = this.#curPrj + pp;
		this.#sNeedScan = new Set();
		{
			const hMD: {[nm: string]: MacroDef} = {};
			this.#hOldDefMacro = {};	// 変更前に存在したマクロ群を退避
			for (const [nm, md] of Object.entries(this.#hDefMacro)) {
				if (md.loc.uri !== uri) hMD[nm] = md;
				else this.#hOldDefMacro[nm] = md;
			//	else {this.#hOldDefMacro[nm] = md; this.#cteScore.undefMacro(nm);}	// NOTE: Score
			}
			this.#hDefMacro = hMD;		// 別snで定義されたマクロのみにした
			this.#aMacroAdd = [];
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
	//	this.#hSn2label[path] = {};	// #scanScriptで
	//	this.#hFn2Jump[path] = {};	// #scanScriptで

		// 重複マクロ定義検知
		for (const [nm, aUse] of Object.entries(this.#hDupMac2aUse)) this.#hDupMac2aUse[nm] = aUse.filter(locUse=> locUse.uri !== uri);

		// メッセージをクリア
		this.#uri2Diag[uri] = [];
		this.#Uri2Links[uri] = [];

		this.#hDoc2InlayHint[pp] = [];
	}
	#goFinish(pp: string) {
		this.#scanFinishSub(pp);

/*	// NOTE: Score
		if (pp.slice(-4) === '.ssn') {	// TODO: Score 変更して動作未確認
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
		スクリプトファイル不明: {
			mes	: 'スクリプトファイル $ が見つかりません',
			sev	: DiagnosticSeverity.Error,
		},
		ラベル不明: {
			mes	: 'ラベル $ が見つかりません',
			sev	: DiagnosticSeverity.Error,
		},
		フォントファイル不明: {
			mes	: 'フォントファイル $ が見つかりません',
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
		改行32行超: {
			mes	: '改行タグが32行を超えています',
			sev	: DiagnosticSeverity.Information,
		},
	};
	#aFinishJob: (()=> void)[]	= [];
	#scanFinishSub(pp?: string) {
		for (const j of this.#aFinishJob) j();
		this.#aFinishJob = [];

		if (pp) {		// 単体ファイル走査時
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
		}

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
				diag.relatedInformation = aUse.map(locUse=> ({
					location	: {uri: locUse.uri, range: locUse.range},
					message		: this.#hDiag.マクロ定義重複_その他.mes,
				}));
				(this.#uri2Diag[uri] ??= []).push(diag);
			}
			else for (const locUse of aUse) (this.#uri2Diag[locUse.uri] ??= [])
			.push(Diagnostic.create(locUse.range, mes, d定義重複.sev));
		}

		const d未定義 = this.#hDiag.未定義マクロ;
		for (const [nm, aUse] of Object.entries(this.#hMacro2aLocUse)) {
//console.log(`fn:LspWs.ts line:1159 nm:${nm} A:${nm in this.#hDefMacro} B:${nm in this.#hDefPlugin}`);
			if (nm in this.#hDefMacro) continue;
			if (nm in this.#hDefPlugin) continue;

			const mes = d未定義.mes.replace('$', nm);
//const reg = new RegExp(d未定義.mes.replace('$', '[^\\]]+'));
			// 同じ警告は一度全て削除
			for (const [uri, a] of Object.entries(this.#uri2Diag)) {
	//			this.#uri2Diag[uri] = a.flatMap(d=> reg.test(d.message) ?[] :d);
				this.#uri2Diag[uri] = a.flatMap(d=> d.message == mes ?[] :d);
			}

			for (const {uri, range} of aUse) (this.#uri2Diag[uri] ??= [])
			.push(Diagnostic.create(range, mes, d未定義.sev));
		}

		const d未使用マクロ = this.#hDiag.未使用マクロ;
		const uri = this.#curPrj + pp;
		for (const [nm, {hPrm, loc}] of Object.entries(this.#hDefMacro)) {
			if (nm in this.#hMacro2aLocUse) continue;
			if (hPrm?.nowarn_unused?.val) continue;
			if (pp && loc.uri !== uri) continue;	// 更新分のみ

			(this.#uri2Diag[loc.uri] ??= []).push(Diagnostic.create(
				loc.range,
				d未使用マクロ.mes.replace('$', nm),
				d未使用マクロ.sev
			));
		}

		// Send the computed diagnostics to VSCode.
		for (const [uri, diagnostics] of Object.entries(this.#uri2Diag)) this.conn.sendDiagnostics({uri, diagnostics});

		this.#bldCnvSnippet();
	}


	// フォントと使用文字情報
	#InfFont	: TINF_INTFONT	= {
		defaultFontName	: '',
		hSn2Font2Str	: {},
		hFontNm2uri		: {},
	};
	#getFonts2ANm(fonts: string, uri: string, rng: Range): string {
		const aNm = fonts.split(',')
		.map(nm=> /^["'\s]*(?<text>[^,;"']+)/.exec(nm)?.groups?.text ?? '');
			// https://regex101.com/r/TA5y7N/1

		for (const nm of aNm) this.#InfFont.hFontNm2uri[nm] ??= `${
			this.#hDiag.フォントファイル不明.mes.replace('$', nm)},${uri
			},${rng.start.line},${rng.start.character
			},${rng.end.line},${rng.end.character}`;

		return aNm[0] ?? '';
	}


			readonly	#alzTagArg	= new AnalyzeTagArg;
	static	readonly	#regValName
		= /(?<=name\s*=\s*)([^"'#;\]]+|(["'#])(.*?)\2)/m;
	static	readonly	DEF_FONT = ':DEF_FONT:';
	#nowFontNm = LspWs.DEF_FONT;
	#scanScript(pp: string) {
		const fn = getFn(pp);
		const uri = this.#curPrj + pp;
		const aDi = this.#uri2Diag[uri] ??= [];
		const f2s: TFONT2STR = this.#InfFont.hSn2Font2Str[pp] = {};
		this.#nowFontNm = LspWs.DEF_FONT;

		const hLblRng: TH_SN2LBLRNG = {};	// ラベル重複チェック用
		const setKw = this.#hScr2KeyWord[pp];	// キーワード削除チェック用
		const aDsOutline: DocumentSymbol[] = this.#hSn2aDsOutline[pp] = [];

		let sJoinLabel = '';	// ラベル変更検知用、jump情報・ラベル名結合文字列
								// [jump]タグなどの順番が変わっただけでも変更扱いで
		this.#hPp2JumpFn[pp] = new Set();

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

				const [label] = token.split('|');
					// 吉里吉里仕様のセーブラベル名にあたる機能は無いが、属性指定時に
					//「|」後はデフォルト値解釈で無視されるので、この処理がいる
				aDsOutline.push({
					name	: token,
					detail	: '',
					kind	: SymbolKind.Key,
					range	: rng,
					selectionRange	: rng,
				});
				if (label.charAt(1) === '*') return;	// 無名ラベルは除外

				sJoinLabel += token;	// まぁ区切りなくていいか。*あるし
				const lr = hLblRng[label];
				if (lr) {
					const rngLbl = hLblRng[label];
					const {mes, sev} = this.#hDiag.ラベル重複;
					const mes2 = mes.replace('$', label);
					if (rngLbl) aDi.push(Diagnostic.create(rngLbl, mes2, sev));
					aDi.push(Diagnostic.create(rng, mes, sev));
				}
				else hLblRng[label] = rng;
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
				const {mes, sev} = this.#hDiag.改行32行超;
				if (lineTkn > 32) aDi.push(Diagnostic.create(Range.create(
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
			if (! (use_nm in LspWs.#hTag) && ! (use_nm in this.#hDefPlugin)) {
				(this.#hMacro2aLocUse[use_nm] ??= []).push(Location.create(uri, rngp1));
				return;
			}

			const fnc = this.#hTagProc[use_nm];
			if (fnc) {
				const args = token.slice(1 +use_nm.length, -1);
				this.#alzTagArg.go(args);

				const hArg = this.#alzTagArg.hPrm;
				hArg[':タグ名'] = <any>use_nm;

				fnc({setKw, hArg, uri, pp, token, rng: rngp1, aDi, pBefore, p, rng_nm, aDsOutline});
			}
		};

		const p = {line: 0, character: 0};
		try {
			for (const token of this.#hScript[pp].aToken) this.#procToken(p, token);
		} catch (e) {
			console.error(`#scanScript Err ${pp}(${p.line},${p.character})`);
		}

		this.#hFn2label[fn] = hLblRng;

		if (this.#hPp2JoinLabel[pp] !== sJoinLabel) {
			for (const [pp_from, v] of Object.entries(this.#hPp2JumpFn)) {
				if (v.has(fn)) this.#sNeedScan.add(pp_from);
			}
		}
		this.#hPp2JoinLabel[pp] = sJoinLabel;

//		if (isUpdScore && path.slice(-4) === '.ssn') this.#cteScore.updScore(path, this.curPrj, a);		// NOTE: Score
	}
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
			this.#hDefMacro[nm] = {
				loc		: Location.create(uri, rng2),
				hPrm	: hArg,
				sum,
				param,
				detail	: hArg.detail?.val.replaceAll('\\n', '  \n'),
			};
			this.#aMacroAdd.push(nm);

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

		char2macro: ({uri, rng, aDi, hArg})=> {
			const char = hArg.char?.val ?? '';
			const use_nm = hArg.name?.val ?? '';
			if (! char || ! use_nm) {	// [macro name=]など
				const {mes, sev} = this.#hDiag.一文字マクロ定義_属性異常;
				aDi.push(Diagnostic.create(rng, mes.replace('$', use_nm), sev));
				return;
			}
			if (use_nm in LspWs.#hTag || use_nm in this.#hDefPlugin) return;

			(this.#hMacro2aLocUse[use_nm] ??= []).push(Location.create(uri, rng));
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

		event: arg=> {
			this.#hTagProc.s(arg);

			const {pp, hArg} = arg;
			const fn = hArg.fn?.val ?? getFn(pp);
			if (!fn || /^[*%&"'#]/.test(fn) || fn.at(-1) === '*') return;
				// fnが変数・文字列操作系ならチェック不能
			this.#hPp2JumpFn[pp].add(fn);

			if (Boolean(hArg.del?.val) && hArg[':タグ名'].val === 'event') return;
			this.#hTagProcSubFnLbl(arg, fn);
		},
		// jump:  = event
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
		#hTagProcSubFnLbl(arg: ARG_TAG_PROC, fn: string) {
			const {uri, aDi, rng, hArg} = arg;

			this.#aFinishJob.push(()=> {
				if (! this.#hSetWords.スクリプトファイル名.has(fn)) {	// 遅延調査
					const {mes, sev} = this.#hDiag.スクリプトファイル不明;
					aDi.push(Diagnostic.create(rng, mes.replace('$', fn), sev));
					return;
				}
				let to_uri = '';
				try {to_uri = this.#searchPath(fn, SEARCH_PATH_ARG_EXT.SCRIPT);} catch {
					console.error(`fn:LspWs.ts to_uri ERR`);
					return;
				}

				const fncLnk = ()=> (this.#Uri2Links[uri] ??= []).push({
					range	: rng,
					target	: to_uri,
					tooltip	: `${fn}.sn を開く`,
				});
				const label = hArg.label?.val ?? '';
				if (! label) {fncLnk(); return;}

				if (/^\*(?!\*)/.test(label)	// チェック（%&"'# も弾く）
				&& (! (fn in this.#hFn2label)
				|| ! (label in this.#hFn2label[fn]))) {
					const {mes, sev} = this.#hDiag.ラベル不明;
					aDi.push(Diagnostic.create(rng, mes.replace('$', label), sev));
					fncLnk();	// エラーは出すが、修正のためにリンクは出してあげる
					return;
				}

				fncLnk();
					// ラベルジャンプを作れないので
					//	tooltip	: `${fn}.sn、ラベル ${label} を開く`,
			});
		}
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


	static	readonly #REG_TAG_LET_ML	= /^\[let_ml\s/g;
	#resolveScript(txt: string): Script {
		const a = txt
		.replace(/(\r\n|\r)/g, '\n')
		.match(this.#REG_TOKEN) ?? [];
		for (let i=a.length -1; i>=0; --i) {
			const t = a[i];
			LspWs.#REG_TAG_LET_ML.lastIndex = 0;	// /gなので必要
			if (LspWs.#REG_TAG_LET_ML.test(t)) {
				const idx = t.indexOf(']') +1;
				if (idx === 0) throw '[let_ml]で閉じる【]】がありません';	// TODO: Diag化
				const s = t.slice(0, idx);
				const e = t.slice(idx);
				a.splice(i, 1, s, e);
			}
		}
		const scr = {aToken :a, len :a.length, aLNum :[]};
		this.#replaceScript_let_ml(scr);
//		this.#replaceScript_Wildcard();		// Hover やインラインなりでなにを呼ぶか出すのも

		return scr;
	}
	#replaceScript_let_ml(scr: Script, start_idx = 0) {
		for (let i=scr.len- 1; i >= start_idx; --i) {
			const token = scr.aToken[i];
			LspWs.#REG_TAG_LET_ML.lastIndex = 0;	// /gなので必要
			if (LspWs.#REG_TAG_LET_ML.test(token)) {
				const idxSpl = token.indexOf(']') +1;
				const ml = token.slice(idxSpl);
				const cnt = (ml.match(/\n/g) ?? []).length;
				scr.aToken.splice(i, 1, token.slice(0, idxSpl), ml);
				scr.aLNum.splice(i, 0, scr.aLNum[i]);
				const len = scr.aToken.length;
				for (let j=i +2; j<len; ++j) scr.aLNum[j] += cnt;
			}
		}
	}
/*
	readonly #REG_WILDCARD	= /^\[(call|loadplugin)\s/;
	readonly #REG_WILDCARD2	= /\bfn\s*=\s*[^\s\]]+/;
	#replaceScript_Wildcard = ()=> {
		for (let i=this.#script.len -1; i>=0; --i) {
			const token = this.#script.aToken[i];
			if (! this.#REG_WILDCARD.test(token)) continue;

			const [tag_name, args] = tagToken2Name_Args(token);
			this.alzTagArg.go(args);

			const p_fn = this.alzTagArg.hPrm.fn;
			if (! p_fn) continue;
			const {val: fn} = p_fn;
			if (! fn || fn.slice(-1) !== '*') continue;

			this.#script.aToken.splice(i, 1, '\t', '; '+ token);
			this.#script.aLNum.splice(i, 1, NaN, NaN);

			const ext = (tag_name === 'loadplugin') ?'css' :'sn';
			const a = this.cfg.matchPath('^'+ fn.slice(0, -1) +'.*', ext);
			for (const v of a) {
				const nt = token.replace(
					this.#REG_WILDCARD2,
					'fn='+ decodeURIComponent(getFn(v[ext]))
				);
				//console.log('\t='+ nt +'=');
				this.#script.aToken.splice(i, 0, nt);
				this.#script.aLNum.splice(i, 0, NaN);
			}
		}
		this.#script.len = this.#script.aToken.length;
	}
*/

	// =============== Grammar
	#REG_TOKEN	: RegExp;
	#setEscape(ce: string) {
	//	if (this.hC2M && (ce in this.hC2M)) throw '[エスケープ文字] char【'+ ce +'】が登録済みの括弧マクロまたは一文字マクロです';

		// 【2022/10/03 SKYNovel src/sn/Grammar.ts より引用】
		// 1059 match 13935 step (8ms) https://regex101.com/r/ygXx16/6
		this.#REG_TOKEN = new RegExp(
		(ce	?`\\${ce}\\S|` :'')+	// エスケープシーケンス
		'\\n+'+				// 改行
		'|\\t+'+			// タブ
		`|\\[let_ml\\s+[^\\]]+\\]`+
			`.+?`+		// [let_ml]〜[endlet_ml]間のテキスト
		`(?=\\[endlet_ml[\\]\\s])`+
		`|\\[(?:[^"'#;\\]]+|`+	// タグ
			`(["'#]).*?\\1` +
				// . は (?:\\${ ce??'\\' }.|[^\\1]) でなくてよさげ
		`|;[^\\n]*)*?]`+
		'|;[^\\n]*'+		// コメント
		'|&[^&\\n]+&'+			// ＆表示＆
		'|&&?[^&;\\n\\t]+'+		// ＆代入
		'|^\\*[^\\s\\[&;\\\\]+'+	// ラベル
		`|[^\\n\\t\\[;${ce ?`\\${ce}` :''}]+`,		// 本文
		'gs');
	//	RubySpliter.setEscape(ce);
	//	this.REG_CANTC2M = new RegExp(`[\w\s;[\]*=&｜《》${ce}]`);
	//	this.REG_TOKEN_NOTXT = new RegExp(`[\n\t;\[*&${ce ?`\\${ce}` :''}]`);
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
