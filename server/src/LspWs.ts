/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2024 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {getFn, int, is_win, REG_SCRIPT} from '../../src/CmnLib';
import {Grammar, Script} from './Grammar';
import {AnalyzeTagArg, HPRM, PRM_RANGE} from '../../src/AnalyzeTagArg';
import {MD_PARAM_DETAILS, MD_STRUCT} from '../../dist/md2json';
const hMd: {[tag_nm: string]: MD_STRUCT} = require('./md.json');
import {TFONT2STR, TINF_INTFONT, T_aExt2Snip, T_QuickPickItemEx} from '../../src/Project';
import {IExts, IFn2Path, SEARCH_PATH_ARG_EXT} from '../../src/ConfigBase';

import {CompletionItem, CompletionItemKind, Connection, Definition, DefinitionLink, DefinitionParams, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, DidChangeWatchedFilesParams, DocumentLink, DocumentLinkParams, DocumentSymbol, DocumentSymbolParams, InlayHint, InlayHintKind, InlayHintParams, InsertTextFormat, Location, MarkupContent, ParameterInformation, Position, PrepareRenameParams, Range, ReferenceParams, RenameParams, SignatureHelp, SignatureHelpParams, SignatureInformation, SymbolInformation, SymbolKind, TextDocumentChangeEvent, TextDocumentPositionParams, TextDocuments, TextEdit, WorkspaceEdit, WorkspaceFolder} from 'vscode-languageserver/node';
import {DocumentUri, TextDocument} from 'vscode-languageserver-textdocument';

type WORKSPACE_PATH	= string;	// doc/prj/script/main.sn
type PROJECT_PATH	= string;	// script/main.sn
type FULL_PATH		= string;	// /[user]/.../[prj]/doc/prj/script/main.sn
//type VSC_FULL_PATH= string;	// c:\[user]\...\[prj]\doc\prj\script\main.sn
type FULL_SCH_PATH	= string;	// file://c:\[user]\...\[prj]/doc/prj/
									// scheme つき


type ARG_TAG_PROC = {
	hArg	: HPRM;
	uri		: string;
	pp		: string;
	token	: string;
	rng		: Range;
	aDi		: Diagnostic[];
	pBefore	: Position;
	p		: Position;
	rng_nm	: Range;
	aDsOutline	: DocumentSymbol[];
	hRng	: {[key: string]: PRM_RANGE};
	f2s		: TFONT2STR;
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

	name_v_ln	: number;
	name_v_ch	: number;
}

type PluginDef = {
	uri: string, sl: number, sc: number, el: number, ec: number,
};


type ArgDesc = {[name: string]: {
	label	: string;
	doc		: string;
}};


type TH_FN2LBLRNG = {[label: string]: Range};


type MAP_KW2ALOC = Map<string, Location[]>;

type T_DIAG = {
	mes	: string;
	sev	: DiagnosticSeverity;
};


const	AA_EXT2SNIP: T_aExt2Snip	= [
	[SEARCH_PATH_ARG_EXT.SP_GSM	, '[${1|lay|} layer=${2{{画像レイヤ名}}} fn=...]$0'],
	[SEARCH_PATH_ARG_EXT.SOUND	, '[${1|playse,playbgm|} fn=...]$0'],
	[SEARCH_PATH_ARG_EXT.FONT	, "[span style='font-family: ...;']$0"],
	[SEARCH_PATH_ARG_EXT.SCRIPT	, '[${1|jump,call|} fn=...]$0'],
];
const H_SPAE2IDX: {[spae: string]: number}	= {
	'SP_GSM'	: 0,
	'SOUND'		: 1,
	'FONT'		: 2,
	'SCRIPT'	: 3,
};


const CHK重複_KEY = [
	'マクロ定義',
	'差分名称',
	'レイヤ定義',
	'フレーム定義',
	'文字出現演出定義',
	'文字消去演出定義',
	'一文字マクロ定義',
	'サウンドバッファ宣言',
] as const;
type T_CHK重複_KEY = typeof CHK重複_KEY[number]; // union type

const hInfKw: {[key in T_CHK重複_KEY]: T_KW_VAR} = {
	マクロ定義		: 'マクロ名',
	差分名称		: '差分名称',
	レイヤ定義		: 'レイヤ名',
	フレーム定義	: 'フレーム名',
	文字出現演出定義	: '文字出現演出名',
	文字消去演出定義	: '文字消去演出名',
	一文字マクロ定義	: '一文字マクロ文字',
	サウンドバッファ宣言	: 'サウンドバッファ',
};


const KW_FIX = [	// #scanAll() - #updPath() で設定
	// 実存ファイル組
	'スクリプトファイル名',
	'画像ファイル名',
	'音声ファイル名',
	'HTMLファイル名',
] as const;
type T_KW_FIX = typeof KW_FIX[number]; // union type

// T_NMKW組。スクリプトに登場
const KW_VAR = [
	// CHK重複
	'マクロ名',		// #recDefKw()でついでに #hT2Pp2Kw[i][pp] 記録、
	'差分名称',			// #scanEnd()で #hKey2KW に集積
	'レイヤ名',			// 〃
		'文字レイヤ名',		// #hTagProc -> [add_lay]
		'画像レイヤ名',		// #hTagProc -> [add_lay]
	'フレーム名',		// 〃
	'文字出現演出名',	// 〃
	'文字消去演出名',	// 〃
	'一文字マクロ文字',	// 〃
	'サウンドバッファ',	// 〃

	// 以外
	'代入変数名',	// & 変数操作、[let_ml][let]
	'ジャンプ先',	// * ラベル ほか（スニペット作成に使ってる）
] as const;
type T_KW_VAR = typeof KW_VAR[number]; // union type

type T_KW = T_KW_FIX | T_KW_VAR;


export class LspWs {
	// === 新キーワード選択値はここに追加する。存在チェックもなるべく同時に
	// #scanInitAll() （やその前後の流れ）でクリア・初期値
	readonly	#hKey2KW	: {[key in T_KW]: Set<string>};
	// キーワード集積・存在チェック用
	readonly	#hT2Pp2Kw	: {[key in T_KW]: {[pp: string]: Set<string>}};

	// キーワード重複チェック用
	readonly	#hT2DefKw2ALoc	: {[key in T_CHK重複_KEY]: MAP_KW2ALOC};


	// === キーワードスニペット（#prepareSnippet() でkey追加・更新。既存はノータッチ）
	readonly	#hK2Snp	: {[key: string]: string}	= {
		イベント名:
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
sn:chgDarkMode
sn:chgNavLang
sn:exported
sn:imported
<ワンキー>
alt+<ワンキー>
ctrl+<ワンキー>
meta+<ワンキー>
shift+<ワンキー>
alt+ctrl+<ワンキー>
ctrl+shift+<ワンキー>
alt+shift+<ワンキー>
alt+ctrl+shift+<ワンキー>
alt+meta+<ワンキー>
ctrl+meta+<ワンキー>
meta+shift+<ワンキー>
alt+ctrl+meta+<ワンキー>
ctrl+meta+shift+<ワンキー>
alt+meta+shift+<ワンキー>
alt+ctrl+meta+shift+<ワンキー>
 
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
		イージング名:
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
		ブレンドモード名:
`|normal
add
multiply
screen|`,
		フィルター名:
`|blur
noise
color_matrix
black_and_white
brightness
browni
color_tone
contrast
grayscale
hue
kodachrome
lsd
negative
night
polaroid
predator
saturate
sepia
technicolor
tint
to_bgr
vintage|`,
	};

	readonly	#hRegPreWords	: {[key: string]: RegExp}	= {};
	static readonly	#aPredefWrtVar	=
`const.Date.getDateStr
const.Date.getTime
const.sn.aIfStk.length
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
const.sn.fn2ext.json
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
const.sn.isPaging
const.sn.key.alternate
const.sn.key.back
const.sn.key.command
const.sn.key.control
const.sn.key.end
const.sn.key.escape
const.sn.last_page_plain_text
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
const.sn.navigator.language
const.sn.needClick2Play
const.sn.platform
const.sn.screenResolutionX
const.sn.screenResolutionY
const.sn.sound.codecs
const.sn.sound.【buf】.playing
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
save:const.sn.styPaging
save:sn.doRecLog
sn.auto.enabled
sn.button.fontFamily
sn.event.domdata.（任意）
sn.eventArg
sn.eventLabel
sn.skip.all
sn.skip.enabled
sn.tagL.enabled
sys:const.sn.aPageLog
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
sys:TextLayer.Back.Alpha`.split('\n');


	static		inited		= false;
	static		#hTag		: {[tag_nm: string]: boolean}	= {};
	static		#hSnippet	: {[tag_nm: string]: string}	= {};
	static	readonly	#aCITag	: CompletionItem[]			= [];

	readonly	#PATH_WS		: WORKSPACE_PATH;
	readonly	#LEN_PATH_WS;
	readonly	#PATH_PRJ		: string;	// 'file://'付き
	readonly	#LEN_PATH_PRJ	: number;

	readonly	#grm	= new Grammar;


	#fullSchPath2fp(fsp: FULL_SCH_PATH): FULL_PATH {
		return decodeURIComponent(fsp.replace(/file:\/\/(\/\w%3A)?/, ''));
	}	// 似たような名前のメソッドになるので目立たせる
		// 逆方向は難しそう、変換前の値は保存必要か

	#fp2wp(fp: FULL_PATH): WORKSPACE_PATH {return fp.slice(this.#LEN_PATH_WS)}
///	#wp2fp(wp: WORKSPACE_PATH): FULL_PATH {return this.#PATH_WS + wp}
///	#wp2pp(wp: )	WORKSPACE_PATH.slice(9) === PROJECT_PATH

//	#wp2pp(wp: WORKSPACE_PATH): PROJECT_PATH {return wp.slice(this.#LEN_PATH_PRJ)}
	#fp2pp(fp: FULL_PATH): PROJECT_PATH {return fp.slice(this.#LEN_PATH_PRJ)}


	//MARK: コンストラクタ
	constructor(readonly wf: WorkspaceFolder, private readonly conn: Connection, private readonly docs:TextDocuments<TextDocument>, readonly hasDiagRelatedInfCap: boolean) {
			// wf.uri=file:///c%3A/Users/[略]/win=
			// wf.uri=file:///Users/[略]/mac=
		this.#PATH_WS = this.#fp2wp( this.#fullSchPath2fp(wf.uri) );
		this.#LEN_PATH_WS = this.#PATH_WS.length;
//console.log(`005 fn:LspWs.ts constructor      u2p=${this.#PATH_WS}= wf.uri=${wf.uri}=`);
		this.#PATH_PRJ = this.#PATH_WS +'/doc/prj/';
		this.#LEN_PATH_PRJ = this.#PATH_PRJ.length;

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
${sum}`,}	// --- の前に空行がないとフォントサイズが大きくなる
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

		for (const [key, sn] of Object.entries(this.#hK2Snp)) {
			const re = sn.slice(1, -1)
			.replaceAll(/([|\.+])/g, '\\$1')	// 正規表現のエスケープ
			.replaceAll('<ワンキー>', '\\w+')
			.replaceAll('👾\\', '')		// 特殊文字処理だけど初期値なので問題なし
			.replaceAll('\n', '|');
			this.#hRegPreWords[key] = new RegExp(
				`^(${re})$`,
				key === 'イベント名' ?'i': ''
			);

			this.#hK2Snp[key] = `|${sn.slice(1, -1)
			.replaceAll(/([|,])/g, '\\$1')	// スニペット構文のエスケープ
			.replaceAll('\n', ',')}|`;
		}

		this.#hT2DefKw2ALoc = <{[key in T_CHK重複_KEY]: MAP_KW2ALOC}>Object
		.fromEntries( CHK重複_KEY.map(v=> [v, new Map]) );

		const aKw = [...KW_FIX, ...KW_VAR];
		this.#hKey2KW = <{[key in T_KW]: Set<string>}>Object
		.fromEntries( aKw.map(kw=> [kw, new Set]) );

		this.#hT2Pp2Kw = <{[key in T_KW]: {[pp: string]: Set<string>}}>Object.fromEntries( aKw.map(kw=> [kw, {}]) );
	}
	destroy(path?: string) {
		if (path && ! this.#checkRelated(path)) return false;

		return true;
	}


	// =======================================
	static readonly REQ_ID = ':SKYNovel:';
	#sendRequest(cmd: string, o = {}) {
//console.log(`050 fn:LspWs.ts ⬇ #sendRequest cmd:${cmd} o:${JSON.stringify(o).slice(0, 200)}`);
		this.conn.sendRequest(LspWs.REQ_ID, {cmd, pathWs: this.#PATH_WS, o});
	}
	onRequest({cmd, pathWs, o}: {cmd: string, pathWs: string, o: any}) {
//console.log(`040 fn:LspWs.ts ⬆ onRequest cmd:${cmd} pathWs=${pathWs}= #PATH_WS=${this.#PATH_WS}= o:${Object.keys(o)}:`);
		if (pathWs === this.#PATH_WS) this.#hCmd2ReqProc[cmd]?.(o);
	}
	#hCmd2ReqProc: {[cmd: string]: (o: any)=> void}	= {
		'ready': ()=> this.#fullScan(),
		'init.res':	o=> {
			this.#hCmd2ReqProc = this.#hCmd2ReqProc_Inited;
			this.#scanAll(o);
		},
		// これ以上ここに追加してはいけない
	};
	readonly	#hCmd2ReqProc_Inited: {[cmd: string]: (o: any)=> void}	= {
		'init.res'		: o=> this.#scanAll(o),
		'def_plg.upd'	: o=> this.#hDefPlugin = o,
		'def_esc.upd'	: ()=> this.#fullScan(),
		'credel_sn'		: ()=> this.#fullScan(),
		'hover'	: ({uri, pos})=> this.#sendRequest('hover.res', {uri, ...this.#genHover(uri, pos)}),
	};
	#fullScan() {this.#sendRequest('init');}


	// === ファイル変更イベント（手入力が対象） ===
	onDidChangeContent(chg: TextDocumentChangeEvent<TextDocument>) {
		const {uri} = chg.document;		// 'file://'付き
		if (! this.#checkRelated(uri)) return;

		if (! REG_SCRIPT.test(uri)) return;

		const fp = this.#fullSchPath2fp(uri);
		const pp = this.#fp2pp(fp);
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
				const text = (sl === el && c.text.at(-1) !== '\n')
					? doc.lineAt(sl).text
					: c.text;
				hUpdScore[uri] ||= this.#cteScore.updLine(doc, c.range, text, this.#resolveScript(text).aToken);
			});
			this.#cteScore.combining(uri);
		}
*/

		// scanScript 本編
		this.#scanBegin();
		this.#sFpNeedScan = new Set(
			Object.values(this.#hT2DefKw2ALoc)
			.flatMap(m=> [...m.values()]
			.flatMap(a=> a.map(l=> l.uri)))
		);
		this.#hScript[pp] = this.#grm.resolveScript(chg.document.getText());
		this.#scanScript(fp);

		// （変更前・変更後問わず）このファイルで定義されたマクロを使用しているファイルは
		// すべて追加走査（重複走査・永久ループに留意）
			// 重複定義時は、最初に見つかったもののみ #hMacro(Old) に入っている
		const mon = {...this.#hOldDefMacro, ...this.#hDefMacro};
		for (const [nm, {loc}] of Object.entries(mon)) {
			if (loc.uri !== uri) continue;

			// このファイルで使用している、別ファイルで定義されたマクロ
			// このファイルで定義されたマクロ、を使用している別ファイル
			for (const locUse of this.#hMacro2aLocUse[nm] ?? []) {
				//if (locUse.uri !== uri) // 略、.delete(uri)するので
				this.#sFpNeedScan.add(locUse.uri);
			}
		}

		// 追加走査
		this.#sFpNeedScan.delete(fp);	// 処理重複につき
		for (const fp2 of this.#sFpNeedScan) this.#scanScript(fp2);
		this.#scanEnd();
	}
	#sFpNeedScan	= new Set<string>;	// 派生スキャン必要sn（単体ファイル走査時）

	// === ファイル変更イベント（手入力以外が対象） ===
	// LanguageClientOptions.synchronize.fileEvents（ActivityBar.ts）での設定による
	//	// Changed は保存時に発生する
	onDidChangeWatchedFiles({changes}: DidChangeWatchedFilesParams) {
		const {uri} = changes[0];	// 'file://'付き
//console.log(`fn:LspWs.ts onDidChangeWatchedFiles uri=${uri}=`);
		if (! this.#checkRelated(uri)) return;

/*
		for (const {type, uri} of changes) {
			const pp = this.#fp2pp(this.#fullSchPath2fp(uri));
			if (pp === 'path.json'
			&& (type === FileChangeType.Created ||
				type === FileChangeType.Changed)) {this.#fullScan(); continue;}
					// ここでさせない、Project.ts 主導で
		}
*/
	}


	// === 識別子上にマウスホバーしたとき表示するヒント ===
	#genHover(uri: string, p: Position): {value: string, range: Range} | null {	// uri ... 'file://'付き
		const fp = this.#fullSchPath2fp(uri);
		const pp = this.#fp2pp(fp);
		const aUse = this.#hDoc2TagMacUse[pp] ??= [];
		if (! aUse) return null;
		const u = aUse.find(u=> this.#contains(u.rng, p));
		if (! u) return null;
//console.log(`fn:LspWs.ts #genHover ::${this.docs.keys().join(',')}::`);

		const d = this.docs.get(uri);
		if (! d) return null;
		const token = d.getText(u.rng);
		const hVal: {[nm: string]: string} = {};
		const args = token.slice(1 +u.nm.length, -1);
		this.#alzTagArg.parse(args);
		for (const pr of Object.entries(this.#alzTagArg.hPrm)) {
			const [k, v] = pr;
			hVal[k] = v.val;
		}
		const hRng = this.#alzTagArg.parseinDetail(token, u.nm.length, u.rng.start.line, u.rng.start.character);

		// マクロ
		const md = this.#hDefMacro[u.nm];
		if (md) {
			const {param, sum='', loc} = md;
			const onePrmMd = this.#p_prm2md(p, hRng, param, hVal);
			return {range: u.rng, value: `~~~skynovel
(マクロ) [${u.nm}${
	onePrmMd ?? (	// オンマウスの属性のみ
		param.slice(0, this.#属性表示最大数)	// 属性群を列挙
		.map(mpd=> this.#genPrm2Md(mpd)).join('')
		+ (param.length > this.#属性表示最大数 ?' ...以下略': '') +`]
~~~`
	)
}
---
${
	(sum +' \n').replace('\n', `[定義位置：${ getFn(loc.uri) }](${ loc.uri }#L${ loc.range.start.line +1 })${ onePrmMd ?'' :'\n\n---\n'+ this.#prmMat2md(param, hVal) }  \n`)	// --- の前に空行がないとフォントサイズが大きくなる
}`
			};
		}

		// タグ
		const td = hMd[u.nm];
		if (td) {
			const {param, sum=''} = td;
			const onePrmMd = this.#p_prm2md(p, hRng, param, hVal);
			return {range: u.rng, value: `~~~skynovel
(タグ) [${u.nm}${
	onePrmMd ?? (	// オンマウスの属性のみ
		param.slice(0, this.#属性表示最大数)	// 属性群を列挙
		.map(mpd=> this.#genPrm2Md(mpd)).join('')
		+ (param.length > this.#属性表示最大数 ?' ...以下略': '') +`]
~~~`
	)
}
---
${
	sum.replace('\n', `[タグリファレンス](https://famibee.github.io/SKYNovel/tag.html#${u.nm})${ onePrmMd ?'' :'\n\n---\n'+ this.#prmMat2md(param, hVal) }  \n`)	// --- の前に空行がないとフォントサイズが大きくなる
}`
			};
		}

		// プラグイン定義タグ
		const pd = this.#hDefPlugin[u.nm];
		if (pd) return {range: u.rng, value:
`~~~skynovel
(プラグイン定義タグ) [${u.nm}]
~~~
---
[定義位置：${ getFn(pd.uri) }](${ pd.uri }#L${ pd.sl +1 })`
		};

		return null;
	}
	readonly	#属性表示最大数 = 5;
		#p_prm2md(p: Position, hRng: {[key: string]: PRM_RANGE}, param: MD_PARAM_DETAILS[], hVal: {[nm: string]: string}): string | null {
			const pr = Object.entries(hRng).find(([, prm])=> this.#contains(this.#genPrm2Rng(prm), p));
			if (! pr) return null;

			const [prK] = pr;
			const mpd = param.find(({name})=> name === prK);
			if (! mpd) return null;

			return this.#genPrm2Md(mpd) +` ...以下略]
~~~
---`+ this.#prmMat2md([mpd], hVal);
		}
		#prmMat2md(param: MD_PARAM_DETAILS[], hVal: {[nm: string]: string}): string {
			if (param.length === 0) return '';

			return '\n  \n'+ param.flatMap(({rangetype, name})=> {
				if (rangetype !== '画像ファイル名') return [];

				const val = hVal[name];
				if (! val || ! this.#hKey2KW.画像ファイル名.has(val)) return [];

				return `<!-- ${JSON.stringify({name, val})} -->`;
			}).join('  \n');	// 【半角空白二つ + \n】で改行
		}

		readonly	#checkRelated = (uri: string)=> this.#PATH_PRJ === this.#fullSchPath2fp(uri).slice(0, this.#LEN_PATH_PRJ);
		readonly	#genPrm2Md = ({name, required, def, rangetype}: MD_PARAM_DETAILS)=> ` ${name}=${
			required === 'y'
			? ('【必須】'+ this.#escHighlight(rangetype))
			: (this.#escHighlight(rangetype) +'|'+ this.#escHighlight(def))
		}`;
		readonly	#escHighlight = (s = '')=> {
			if (s.at(0) === `'` && s.at(-1) === `'`) return s;
			return [']',' '].some(el=> s.includes(el)) ?`'${s}'` :s;
		}


	// === コード補完機能 ===
	//	// 自動補完（初期リストを返すハンドラー）
	onCompletion(prm: TextDocumentPositionParams): CompletionItem[] | null {
		const {uri} = prm.textDocument;		// 'file://'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = this.#fp2pp(this.#fullSchPath2fp(uri));
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
		const pr = Object.entries(hRng).find(([, prm])=> this.#contains(this.#genPrm2Rng(prm), p));
		if (! pr) return null;
		const [prK] = pr;
		const mpd = param.find(({name})=> name === prK);
		if (! mpd) return null;

		let {rangetype} = mpd;
		switch (rangetype) {
			case 'Boolean':	rangetype = 'true、false'; break;
		}
		if (rangetype.includes('、')) return rangetype.split('、')
		.map(label=> ({label, kind: CompletionItemKind.Keyword,}));

		let kind: CompletionItemKind = CompletionItemKind.Value;
		const words = this.#hK2Snp[rangetype];
		if (! words) return mpd?.def ?[{label: mpd.def, kind,}] :[];

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
		return words.slice(1, -1).split(',').map(label=> ({
			label,
			kind: label.slice(0, 6) === 'const.'
				? CompletionItemKind.Constant :kind,
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
	#cnvSnippet	= (sn: string, _fn_cur_sn: string)=> sn;
	#aCITagMacro		: CompletionItem[]	= [];
	#hFn2JumpSnippet	: {[fn: string]: string}	= {};
	#prepareSnippet() {
		// this.#hK2Snpに key追加・更新するメソッド。既存 key はノータッチ
		let eq = true;
		for (const [key, set] of Object.entries(this.#hKey2KW)) {
			const str = `|${
				[...set.values()].sort().join('\n')
				.replaceAll(/([|,])/g, '\\$1')	// スニペット構文のエスケープ
				.replaceAll('\n', ',')
			}|`;
			if (this.#hK2Snp[key] !== str) {
				eq = false;
			//	this.#cteScore.updWords(key, set);	// NOTE: Score
					// この中は参照渡しとReq/Res型なので、更新確認は別にいらない
			}
			this.#hK2Snp[key] = (str === '||') ?`:${key}` :str;
		}
		if (eq) return;	// 以降の不要処理を防ぐが、オーバースペックかも

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

			...Object.entries(this.#hDefPlugin).map(([nm])=> ({
				label	: nm,
				kind	: CompletionItemKind.Snippet,
			//	tags?	: CompletionItemTag[];
				detail	: '（プラグインにより追加されたタグ）',// 最初に出る一覧の右二つ
			})),
		];

		// NOTE: マクロやプラグインのスニペットは未実装。優先順位低い
		this.#hFn2JumpSnippet = {};
		this.#cnvSnippet = (sn, fn_cur_sn)=> {
			const jsn = this.#hFn2JumpSnippet[fn_cur_sn];
			if (jsn) this.#hK2Snp.ジャンプ先 = jsn;
			else {
				let cur_sn = '';
				const sn = (this.#hK2Snp.ジャンプ先.slice(1, -1) +',')
				.replace(
					new RegExp(`fn=${fn_cur_sn},(?:fn=${fn_cur_sn} [^,|]+,)*`),
					m=> {cur_sn = m; return '';}
				);
				this.#hK2Snp.ジャンプ先
				= this.#hFn2JumpSnippet[fn_cur_sn]
				= `|${(cur_sn + sn).slice(0, -1)}|`;
			}

			return sn.replaceAll(/{{([^\}]+)}}/g, (_, key)=> this.#hK2Snp[key]);
		};
	}


	// === 引数の説明 ===
						#hArgDesc		: ArgDesc	= {};
	static	readonly	#hTagArgDesc	: ArgDesc	= {};
	onSignatureHelp(prm: SignatureHelpParams): SignatureHelp | null {
		const {uri} = prm.textDocument;		// 'file://'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = this.#fp2pp(this.#fullSchPath2fp(uri));
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
				console.error(`fn:LspWs.ts hArgDesc[${u.nm}] 定義なし`);
				return null;
			}
			let sPrm = '';
			const aPI: ParameterInformation[] = [];
			if (param[0]?.name) for (const md of param) {
				const p = this.#genPrm2Md(md);
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
		const pr = Object.entries(hRng).find(([, prm])=> this.#contains(this.#genPrm2Rng(prm), p));
		if (pr) {
			const [prK] = pr;
			ret.activeParameter = param.findIndex(p=> p.name === prK);
		}
		//else ret.activeParameter = -1;

		return ret;
	}


	// === 定義へ移動、定義をここに表示 ===
	onDefinition(prm: DefinitionParams): Definition | DefinitionLink[] | null {
		const {uri} = prm.textDocument;		// 'file://'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = this.#fp2pp(this.#fullSchPath2fp(uri));
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
				const prm = hRng.name;
				if (! prm) return null;

				name = d.getText(this.#genPrm2Rng(prm));
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
		const {uri} = prm.textDocument;		// 'file://'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = this.#fp2pp(this.#fullSchPath2fp(uri));
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
				const prm = hRng.name;
				if (! prm) return null;

				name = d.getText(this.#genPrm2Rng(prm));
				break;
			}
		}

		return this.#hMacro2aLocUse[name];
	}


	// === ドキュメントアウトライン ===
	onDocumentSymbol(prm: DocumentSymbolParams): SymbolInformation[] | DocumentSymbol[] | null {
		const {uri} = prm.textDocument;		// 'file://'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = this.#fp2pp(this.#fullSchPath2fp(uri));
		return this.#hSn2aDsOutline[pp];
	}

	// === リンク ===
	onDocumentLinks(prm: DocumentLinkParams): DocumentLink[] | DocumentSymbol[] | null {
		const {uri} = prm.textDocument;		// 'file://'付き
		if (! this.#checkRelated(uri)) return null;

		const fp = this.#fullSchPath2fp(uri);
		return this.#Uri2Links[fp] ?? [];
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

		const pp = this.#fp2pp(this.#fullSchPath2fp(uri));
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
		const {uri} = prm.textDocument;		// 'file://'付き
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
		const {uri} = prm.textDocument;		// 'file://'付き
		if (! this.#checkRelated(uri)) return null;

		const pp = this.#fp2pp(this.#fullSchPath2fp(uri));
		return [this.#hDoc2InlayHint[pp], this.#pp2AQuoteInlayHint[pp]].flat();
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

		//console.log(`fn:LspWs.ts #scanAll() 1: #scanBegin()`);
		this.#scanBegin();
		//console.log(`fn:LspWs.ts #scanAll() 2: #scanInitAll()`);
		this.#scanInitAll();
		//console.log(`fn:LspWs.ts #scanAll() 3: #updPath()`);
		this.#updPath(o.pp2s['path.json'] ?? '{}');	// 必ず #scanInitAll() 後
		//console.log(`fn:LspWs.ts #scanAll() 4: #scanScript()`);
		for (const [pp, s] of Object.entries(o.pp2s)) {
			if (! REG_SCRIPT.test(pp)) continue;

			this.#hScript[pp] = this.#grm.resolveScript(s);
			const fp = this.#PATH_PRJ + pp;
			this.#scanScript(fp);
		}
		//console.log(`fn:LspWs.ts #scanAll() 8: #scanEnd()`);
		this.#scanEnd();
		//console.log(`fn:LspWs.ts #scanAll() 9:`);
	}
		#updPath(sJson: string) {
			this.#hPathFn2Exts = {};
			const oJs = JSON.parse(sJson);
			for (const [nm, v] of Object.entries(oJs)) {
				const h = this.#hPathFn2Exts[nm] = <any>v;
				for (const [ext, w] of Object.entries(h)) {
					if (ext === ':cnt') continue;
					h[ext] = this.#PATH_PRJ + w;

					if (LspWs.#REG_SCRIPT.test(ext)) {
						this.#hKey2KW.スクリプトファイル名.add(nm);
						continue;
					}
					if (LspWs.#REG_SP_GSM.test(ext)) {
						this.#hKey2KW.画像ファイル名.add(nm);
						continue;
					}
					if (LspWs.#REG_SOUND.test(ext)) {
						this.#hKey2KW.音声ファイル名.add(nm);
						continue;
					}
					if (LspWs.#REG_HTML.test(ext)) {
						this.#hKey2KW.HTMLファイル名.add(nm);
						continue;
					}
				}
			}
		}
		static	readonly	#REG_SCRIPT	= new RegExp(SEARCH_PATH_ARG_EXT.SCRIPT);
		static	readonly	#REG_SP_GSM	= new RegExp(SEARCH_PATH_ARG_EXT.SP_GSM);	// https://regex101.com/r/DPaLv3/1
		static	readonly	#REG_SOUND	= new RegExp(SEARCH_PATH_ARG_EXT.SOUND);
		static	readonly	#REG_HTML	= new RegExp(SEARCH_PATH_ARG_EXT.HTML);


	#scanBegin() {this.#aOldFp2Diag = Object.keys(this.#fp2Diag);}
	#aOldFp2Diag: FULL_PATH[]	= [];	// スクリプト削除時にエラーや警告を消す用
	#aEndingJob	: (()=> void)[]	= [];
	#scanEnd() {
		// == キーワードを全てマージ（スクリプトに登場したもの＋組み込み初期値）
		// 【実存ファイル組】を触ってはいけないので全ループ禁止
		for (const key of KW_VAR) this.#hKey2KW[key] = new Set(
			Object.values(this.#hT2Pp2Kw[key] ??= {})
			.flatMap(v=> [...v.keys()]),
		);
		this.#hKey2KW.差分名称 = new Set([
			...this.#hKey2KW.画像ファイル名,
			...this.#hKey2KW.差分名称,
		]);
		for (const kw of LspWs.#aPredefWrtVar) this.#hKey2KW.代入変数名.add(kw);
		this.#hKey2KW.文字出現演出名.add('default');
		this.#hKey2KW.文字消去演出名.add('default');

		this.#hKey2KW.サウンドバッファ.add('BGM');
		this.#hKey2KW.サウンドバッファ.add('SE');
		this.#hKey2KW.サウンドバッファ.add('SYS');


		// == 情報集積仕上げ（ここまでの情報を必要とする）
		for (const j of this.#aEndingJob) j();
		this.#aEndingJob = [];


		// == 情報集積ここまで、結果からDB作成系
		for (const i of CHK重複_KEY) this.#chkDupDefKw(i);

		// @@@引用
		for (const [ppBase, setPp] of Object.entries(this.#pp2SetQuotePp)) {
			setPp.forEach(pp=> {
				const scr = this.#hScript[ppBase];
				if (! scr) {delete this.#pp2AQuoteInlayHint[pp]; return;}

				this.#pp2AQuoteInlayHint[pp] = this.#pp2AQuoteLine[pp].flatMap(ln=> {
					let h = '';
					const len = scr.aToken.length;
					for (let i=0; i<len; ++i) {
						if (scr.aLNum[i] +1 < ln) continue;
						if (scr.aLNum[i] +1 > ln) break;

						const token = scr.aToken[i];
						const uc = token.charCodeAt(0);	// TokenTopUnicode
						if (uc === 10) break;	// \n 改行
						h += token;
					}
					h = h.trim();
					if (! h) return [];

					const i = InlayHint.create(Position.create(ln -1, 0), '<継承> '+ h, InlayHintKind.Parameter);
					i.paddingLeft = true;
					i.paddingRight = true;
					i.tooltip = '基底スクリプトからの継承';
					return [i];
				});
			});
		}
//this.conn.languages.inlayHint.refresh();

		const {mes, sev} = this.#hDiag.未使用マクロ;
		for (const [nm, {hPrm, loc}] of Object.entries(this.#hDefMacro)) {
			if (nm in this.#hMacro2aLocUse) continue;
			if (hPrm?.nowarn_unused?.val) continue;

			// loc.uri is fp
				// loc.uri=/Users/[略]/win/doc/prj/script/main.sn:
				// loc.uri=/Users/[略]/mac/doc/prj/script/main.sn:
			(this.#fp2Diag[loc.uri] ??= []).push(Diagnostic.create(
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


		const d未定義 = this.#hDiag.未定義マクロ;
		for (const [nm, aUse] of Object.entries(this.#hMacro2aLocUse)) {
			if (nm in this.#hDefMacro) continue;
			if (nm in this.#hDefPlugin) continue;

			const mes = d未定義.mes.replace('$', nm);
			// 同じ警告は一度全て削除
			for (const [fp, aD] of Object.entries(this.#fp2Diag)) {
				this.#fp2Diag[fp] = aD.flatMap(d=> d.message === mes ?[] :d);
			}

			for (const {uri, range} of aUse) (this.#fp2Diag[uri] ??= [])
			.push(Diagnostic.create(range, mes, d未定義.sev));
		}

		// Send the computed diagnostics to VSCode.
		for (const [fp, diagnostics] of Object.entries(this.#fp2Diag)) {
			const uri = is_win ?'file:///c:'+ fp :fp;
			this.conn.sendDiagnostics({uri, diagnostics});
		}
//		for (const [fp, diagnostics] of Object.entries(this.#fp2Diag)) this.conn.sendDiagnostics({uri: fp, diagnostics});
		// スクリプト削除時にエラーや警告を消す
		for (const fp of this.#aOldFp2Diag) {
			if (fp in this.#fp2Diag) continue;
			this.conn.sendDiagnostics({uri: fp, diagnostics: []});
		}

		const hMacArgDesc: ArgDesc	= {};
		const aaExt2Snip = [...AA_EXT2SNIP];
		const aaSnipAdd: string[][] = aaExt2Snip.map(_=> []);
		for (const [mac_nm, {sum, hPrm}] of Object.entries(this.#hDefMacro)) {
			// 重複後の解消時対策としてここでやる
			//（重複時はどれともいえないが、一つならそれが正解・最初の一個を取ればいい）
			hMacArgDesc[mac_nm] = {
				label	: `[${mac_nm} ...]`,
				doc		: sum ?? '',
			};

			const {snippet_ext} = hPrm;
			if (snippet_ext) {
				const i = H_SPAE2IDX[snippet_ext.val];
				if (i !== undefined) aaSnipAdd[i].push(mac_nm);
			}
		}
		this.#hArgDesc = {...LspWs.#hTagArgDesc, ...hMacArgDesc};

		this.#prepareSnippet();

		// == 結果を通知系
		this.#sendRequest('analyze_inf', {
			InfFont			: this.#InfFont,

			aQuickPickMac	: Object.entries(this.#hDefMacro)
			.map(([nm, {sum, loc: {uri}}])=> (<T_QuickPickItemEx>{
		//	.map(([nm, {sum, loc: {uri, range}}])=> (<T_QuickPickItemEx>{
				label		: nm,
				description	: `（マクロ）${sum?.split(' ')[0] ?? ''}`,
				//detail,	// 別の行になる
			//	uri	: `ws-file://${this.#fp2wp(uri)}#L${range.start.line}`,	// 効かない
				uri	: `ws-file://${this.#fp2wp(uri)}`,
			})),

			aQuickPickPlg	: Object.entries(this.#hDefPlugin)
			.map(([nm, {uri}])=> (<T_QuickPickItemEx>{
				label		: nm,
				description	: '（プラグインによる定義）',
				//detail,	// 別の行になる
				uri	: `ws-file://${this.#fp2wp(uri)}`,
			})),

			aExt2Snip		: aaExt2Snip.map(([spae, snip], i)=> [
				spae,
				snip
				.replace('[${1|', `$&${aaSnipAdd[i].sort().reverse().join(',')},`)
				.replaceAll(/{{([^\}]+)}}/g, (_, key)=> this.#hK2Snp[key] ?? '')
			]),
		});
	}


	readonly	#hDiag	:{[code_name: string]: T_DIAG} = {
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
		属性値異常: {
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
		snippet_ext属性異常: {
			mes	: '指定できる値は【SP_GSM, SOUND, FONT, SCRIPT】のいずれかです',
			sev	: DiagnosticSeverity.Error,
		},
	};


	#hScript		: {[pp: PROJECT_PATH]: Script}	= {};

	#hDefPlugin		: {[nm: string]: PluginDef}		= {};
	#hDefMacro		: {[nm: string]: MacroDef}		= {};
	#hMacro2aLocUse	: {[nm: string]: Location[]}	= {};
	#hDoc2TagMacUse	: {[pp: PROJECT_PATH]: {nm: string, rng: Range}[]}	= {};

	#hOldDefMacro	: {[nm: string]: MacroDef}	= {};	// 変更前に存在したマクロ群

	#hSn2aDsOutline	: {[pp: PROJECT_PATH]: DocumentSymbol[]}	= {};

	#hFn2label		: {[fn: string]: TH_FN2LBLRNG}	= {};	// ラベル存在チェック用
	#hPp2JoinLabel	: {[pp: PROJECT_PATH]: string}	= {};	// ラベル名結合文字列
		// ジャンプ先変更チェック用。無名以外のラベル名を結合

	#hDoc2InlayHint	: {[pp: PROJECT_PATH]: InlayHint[]}	= {};

	#fp2Diag	: {[fp: FULL_PATH]: Diagnostic[]}	= {};
	#Uri2Links	: {[fp: string]: DocumentLink[]}	= {};

	#pp2AQuoteLine	: {[pp: PROJECT_PATH]: number[]}			= {};
	#pp2SetQuotePp	: {[pp: PROJECT_PATH]: Set<PROJECT_PATH>}	= {};
	#pp2AQuoteInlayHint: {[pp: PROJECT_PATH]: InlayHint[]}		= {};

	#scanInitAll() {
		this.#hDefMacro = {};
		this.#hMacro2aLocUse = {};
		this.#hDoc2TagMacUse = {};

		for (const key of KW_VAR) this.#hT2Pp2Kw[key] = {};
		this.#hSn2aDsOutline = {};
		this.#InfFont = {defaultFontName: '', hSn2Font2Str: {}, hFp2FontErr: {}};

		this.#hFn2label = {};
		this.#hPp2JoinLabel = {};

		this.#hDoc2InlayHint = {};

		this.#fp2Diag = {};
		this.#Uri2Links = {};

		for (const m of Object.values(this.#hT2DefKw2ALoc)) m.clear();

		this.#pp2AQuoteLine = {};
		this.#pp2SetQuotePp = {};
		this.#pp2AQuoteInlayHint = {};
	}


	// フォントと使用文字情報
	#InfFont	: TINF_INTFONT	= {
		defaultFontName	: '',
		hSn2Font2Str	: {},
		hFp2FontErr		: {},
	};
	#getFonts2ANm(fonts: string, fp: string, rng: Range): string {
		const aNm = fonts.split(',')
		.map(nm=> /^["'\s]*(?<text>[^,;"']+)/.exec(nm)?.groups?.text ?? '');
			// https://regex101.com/r/TA5y7N/1
			// fonts = Meiryo, "Hiragino Sans", sans-serif;

		for (const nm of aNm) {
			(this.#InfFont.hFp2FontErr[fp] ??= []).push({
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
	#nowFontNm			= LspWs.DEF_FONT;
	#nowModeVal2font	= false;
	#nowModeVal2fontNm	= LspWs.DEF_FONT;
	#scanScript(fp: string) {
		const pp = this.#fp2pp(fp);
		for (const m of Object.values(this.#hT2DefKw2ALoc)) {
			this.#delDefKw(m, fp);
			for (const [nm, aLoc] of m.entries()) {
				m.set(nm, aLoc.flatMap(loc=> loc.uri === fp ?[] :loc));
			}
		}

		// 単体ファイル走査時
		{
			const hMD: {[nm: string]: MacroDef} = {};
			this.#hOldDefMacro = {};	// 変更前に存在したマクロ群を退避
			for (const [nm, md] of Object.entries(this.#hDefMacro)) {
				if (md.loc.uri !== fp) hMD[nm] = md;
				else this.#hOldDefMacro[nm] = md;
			//	else {this.#hOldDefMacro[nm] = md; this.#cteScore.undefMacro(nm);}	// NOTE: Score
			}
			this.#hDefMacro = hMD;		// 別snで定義されたマクロのみにした
		}
		{
			const hMU: {[nm: string]: Location[]} = {};
			for (const [nm, aUse] of Object.entries(this.#hMacro2aLocUse)) {
				for (const locUse of aUse) {
					if (locUse.uri !== fp) (hMU[nm] ??= []).push(locUse);
				}
			}
			this.#hMacro2aLocUse = hMU;	// 別snで使用されたマクロのみにした
		}
		this.#hDoc2TagMacUse[pp] = [];

		for (const pp2s of Object.values(this.#hT2Pp2Kw)) pp2s[pp] = new Set;
		this.#InfFont.hFp2FontErr[fp] = [];

		this.#hDoc2InlayHint[pp] = [];

		this.#pp2AQuoteInlayHint[pp] = [];
		let fncCR = (_line: number, _len: number)=> {};
		const mQuoteSn = /([^@.]+)@@@([^@]+)\.sn$/.exec(pp);
			// https://regex101.com/r/RNiWBm/1
		if (mQuoteSn) {
			this.#pp2AQuoteLine[pp] = [];
			fncCR = (line: number, len: number)=> {
				if (line === 0) this.#pp2AQuoteLine[pp].push(1);
				if (len < 2) return;
				for (let i=line +1; i<line +len; ++i) this.#pp2AQuoteLine[pp].push(i +1);
			};

			const ppBase = mQuoteSn[1] +'.sn';
			(this.#pp2SetQuotePp[ppBase] ??= new Set).add(pp);
		}

		const fn = getFn(pp);
		this.#hT2Pp2Kw.ジャンプ先[pp].add(`fn=${fn}`);

		const sJumpFn = new Set;	// ジャンプ元から先(fn)への関連
		let sJoinLabel = '';	// ラベル変更検知用、jump情報・ラベル名結合文字列
								// [jump]タグなどの順番が変わっただけでも変更扱いで
		this.#hFn2label[fn] ??= {};

		const aDsOutline: DocumentSymbol[] = this.#hSn2aDsOutline[pp] = [];

		const f2s: TFONT2STR = this.#InfFont.hSn2Font2Str[pp] = {};
		this.#nowFontNm = LspWs.DEF_FONT;
		this.#nowModeVal2font = false;
		this.#nowModeVal2fontNm	= LspWs.DEF_FONT;

		// メッセージをクリア
		const aDi: Diagnostic[] = this.#fp2Diag[fp] = [];
		this.#Uri2Links[fp] = [];
		const setUri2Links = new Set<string>();
		this.#hChkDup = {};

		// procTokenBase を定義、procToken も同値で始める
		this.#procToken = this.#procTokenBase = (p: Position, token: string)=> {
			const uc = token.charCodeAt(0);	// TokenTopUnicode
			const len = token.length;
			if (uc === 9) {p.character += len; return;}	// \t タブ
			if (uc === 10) {fncCR(p.line, len); p.line += len; p.character = 0; return;}// \n 改行
			if (uc === 59) {p.character += len; return;}	// ; コメント
			const rng = Range.create(
				p.line, p.character,
				p.line, p.character +len
			);
			if (uc === 38) {	// & 変数操作・変数表示
				p.character += len;
				if (token.at(-1) === '&') return;
				//変数操作
				try {
					const {name, text} = LspWs.#splitAmpersand(token.slice(1));
					if (name.at(0) !== '&') {
						const kw = name.trim();
						this.#hT2Pp2Kw.代入変数名[pp].add(kw);

						// doc/prj/script/setting.sn の デフォルトフォント
						if (kw === 'def_fonts') this.#InfFont.defaultFontName = this.#getFonts2ANm(text, fp, rng);
						else {
							// 変数代入文字列をフォント生成対象とする機能
							const tx = text.trim();
							if (`"'#`.includes(tx.at(0) ?? '')) {
								if (this.#nowModeVal2font) f2s[this.#nowModeVal2fontNm] = (f2s[this.#nowModeVal2fontNm] ?? '') + tx.slice(1, -1);
							}
						}
					}
				} catch (e) {console.error(`fn:LspWs.ts #scanScriptSrc & %o`, e);}
				return;
			}
			if ((uc === 42) && (token.length > 1)) {	// * ラベル
				p.character += len;

				this.#hT2Pp2Kw.ジャンプ先[pp].add(`fn=${fn} label=${token}`);

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
				this.#chkDupDiag(aDi, 'ラベル重複', lbl, fp, rng);
				this.#hFn2label[fn][lbl] = rng;
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
			hArg[':タグ名'] = {val: use_nm};
			if (use_nm in this.#hDefPlugin) return;	// プラグインはここまで

			// 引数検査（マクロ＋タグ）
			const hRng = this.#alzTagArg.parseinDetail(token, use_nm.length, pBefore.line, pBefore.character);
			this.#aEndingJob.push(()=> this.#chkTagMacArg(use_nm, hArg, pp, sJumpFn, hRng, aDi, setUri2Links, fp));

			if (use_nm in LspWs.#hTag) {this.#hTagProc[use_nm]?.({
				hArg, uri: fp, pp, token, rng: rngp1, aDi, pBefore, p, rng_nm, aDsOutline, hRng, f2s,
			}); return;}

			// ここからマクロのみ
			(this.#hMacro2aLocUse[use_nm] ??= []).push(Location.create(fp, rngp1));
		};

		const p = {line: 0, character: 0};
		try {
			const aLNum = this.#hScript[pp].aLNum;
			this.#hScript[pp].aToken.forEach((token, i)=> {
				aLNum[i] = p.line;
				this.#procToken(p, token);
			});
		} catch (e) {
			console.error(`#scanScript Err ${pp}(${p.line},${p.character}) e:${e.message}`);
		}

		if (this.#hPp2JoinLabel[pp] !== sJoinLabel) {
			for (const [pp_from, v] of Object.entries(sJumpFn)) {
				if (v.has(fn)) this.#sFpNeedScan.add(this.#PATH_PRJ + pp_from);
			}
			this.#hPp2JoinLabel[pp] = sJoinLabel;
		}

//		if (isUpdScore && path.slice(-4) === '.ssn') this.#cteScore.updScore(path, this.curPrj, a);		// NOTE: Score
	}
		#chkTagMacArg(use_nm: string, hArg: HPRM, pp: string, sJumpFn: Set<unknown>, hRng: { [key: string]: PRM_RANGE; }, aDi: Diagnostic[], setUri2Links: Set<string>, fp: string) {
			const param = this.#hDefMacro[use_nm]?.param ?? hMd[use_nm]?.param;
			if (! param) return;

			for (const {name, rangetype} of param) {
				if (rangetype === 'ラベル名') { // ラベルがあればジャンプ系タグ
					if (Boolean(hArg.del?.val) && use_nm === 'event') continue;

					const argFn = hArg.fn?.val ?? getFn(pp);
					const argLbl = hArg.label?.val;
					if (! this.#chkLiteral(argFn)) continue;
					// 変数・文字列操作系ならチェック不能
					if (this.#hKey2KW.スクリプトファイル名.has(argFn)) {
						sJumpFn.add(argFn);

						if (this.#chkLiteral4lbl(argLbl) && ! this.#hFn2label[argFn][argLbl]) {
							// 変数・文字列操作系ならチェック不能
							const prm = hRng[name];
							if (prm) {
								const {mes, sev} = this.#hDiag.ラベル不明;
								aDi.push(Diagnostic.create(
									this.#genPrm2Rng(prm),
									mes.replace('$', argLbl),
									sev
								));
							}
						}
						else {
							const to_uri = this.#searchPath(argFn, SEARCH_PATH_ARG_EXT.SCRIPT);
							const lnOpen = (this.#hFn2label[argFn][argLbl]?.start.line ?? 0) + 1;
							for (const nmArg of ['fn', 'label']) {
								const prm = hRng[nmArg];
								if (! prm) continue;

								const lbl = argLbl ? 'ラベル ' + argLbl : '冒頭';
								const fn_lbl = argFn + ':' + lbl;
								if (setUri2Links.has(fn_lbl)) continue; // 重複弾き

								setUri2Links.add(fn_lbl);
								(this.#Uri2Links[fp] ??= []).push({
									range: this.#genPrm2Rng(prm),
									target: to_uri + `#L${lnOpen}`,
									tooltip: `${argFn}.sn の${lbl} を開く`,
								});
							}
						}
					}
				}
				if (! (name in hArg) || ! (name in hRng)) continue;
				// 未使用・未定義はここまで
				const {val} = hArg[name];
				if (! this.#chkLiteral(val)) continue; // 変数・文字列操作系ならチェック不能

				const rng = {...hRng[name]};
				rng.k_ln = rng.v_ln;
				rng.k_ch = rng.v_ch;
				// カンマ区切りで複数可
				const [rt] = rangetype.split('；', 2);	// コメント以後をのぞく
				const a = rt.match(this.#REG_複数指定);
				if (a) {
					const [, one_rt] = a;
					for (const v of val.split(',')) {
						rng.v_len = v.length;
						this.#chkRangeType(one_rt as T_KW, v, use_nm, hArg, name, rng, aDi);	// Position から作り直さないと反映されない
						rng.k_ch = (rng.v_ch += rng.v_len +1);
					}
					continue;
				}
				rng.v_len = val.length;
				this.#chkRangeType(rt, val, use_nm, hArg, name, rng, aDi);
			}
		}
			readonly #REG_複数指定 = /(\S+)（カンマ区切りで複数可）/;

		#chkRangeType(rangetype: string, val: string, use_nm: string, hArg: HPRM, name: string, prm: PRM_RANGE, aDi: Diagnostic[]) {
			let is属性値正常 = true;
			switch (rangetype) {
				// メソッド系
				case '一文字':	is属性値正常 = val.length === 1;	break;
				case '整数':	is属性値正常 = this.#REG_整数.test(val);	break;
				case '実数':	is属性値正常 = this.#REG_実数.test(val);	break;

				// #hSetWords系
			//	case '代入変数名':	// 観察者効果により存在チェック不可

			//	case 'ジャンプ先':

				case '差分名称':
					if (use_nm === 'add_face') {
						if ('fn' in hArg) break;

						// nameがfnになるので、画像ファイル名としてチェック
						this.#chkKW(name, '画像ファイル名', val, prm, aDi);
						return;
					}

					// KW差分名称 は KW画像ファイル名も含んでいる
					this.#chkKW(name, rangetype, val, prm, aDi);
					return;

				case 'レイヤ名':
				case '文字レイヤ名':
				case '画像レイヤ名':

				case 'マクロ名':

				case 'スクリプトファイル名':
				case '画像ファイル名':
				case '音声ファイル名':
				case 'HTMLファイル名':

				case 'フレーム名':
			//	case 'サウンドバッファ名':	// 観察者効果により存在チェック不可
				case '文字出現演出名':
				case '文字消去演出名':
					this.#chkKW(name, rangetype, val, prm, aDi);
					return;
				// フォントファイルは #getFonts2ANm()→ローカルにて。システムフォントを調べる必要がある

				// #hPreWords系
				case 'イベント名':
				case 'イージング名':
				case 'ブレンドモード名':
					is属性値正常 = this.#hRegPreWords[rangetype].test(val);	break;

				default:{
	// 値域型（〜、上限省略可能）
	const a値域 = rangetype.match(this.#REG_値域型);
	if (a値域) {
		is属性値正常 = this.#REG_実数.test(val);
		if (! is属性値正常) break;

		const [, 下限, 上限=''] = a値域;
		const v = Number(val);
		if (Number(下限) > v) {is属性値正常 = false; break;}
		if (上限 && v > Number(上限)) {is属性値正常 = false; break;}
		break;
	}

	// 列挙型（,区切り）
	const a列挙型 = rangetype.split('、');
	if (a列挙型.length > 1) is属性値正常 = a列挙型.includes(val);
				}
			}
			if (is属性値正常) return;

			const {mes, sev} = this.#hDiag.属性値異常;
			aDi.push(Diagnostic.create(
				this.#genPrm2Rng(prm),
				mes.replace('$', `${name} (${rangetype})`)
				.replace('$', val),
				sev
			));
		}
			readonly #REG_整数 = /^[+-]?(?:[1-9]\d*|0)$/;
			readonly #REG_実数 = /^[+-]?\d+(?:\.\d+)?$/;
				// https://regex101.com/r/qnTUaH/1
			readonly #REG_値域型 = /(.+)〜(.+)?/;
				// https://regex101.com/r/qEJo77/1

		#chkDupDiag(aDi: Diagnostic[], key: string, name: string, uri: string, rng: Range) {
			const {mes, sev} = this.#hDiag[key];
			if (! this.hasDiagRelatedInfCap) {
				(aDi ??= []).push(Diagnostic.create(rng, mes.replace('$', name), sev));
				return;
			}

			const m = this.#hChkDup[key] ??= new Map;
			const d = m.get(name);
			if (! d) {
				m.set(name, Diagnostic.create(rng, mes.replace('$', name), sev));
				return;
			}
			if (! d.relatedInformation) {
				d.relatedInformation = [];
				aDi.push(d);
			}
			d.relatedInformation.push(DiagnosticRelatedInformation.create(
				Location.create(uri, rng),
				'その他の箇所'
			));
		}
		#hChkDup	: {[name: string]: Map<string, Diagnostic>}		= {};

		#chkKW(name: string, rangetype: T_KW, val: string, prm: PRM_RANGE, aDi: Diagnostic[]): void {
			if (! (rangetype in this.#hKey2KW)) return;
			if (this.#hKey2KW[rangetype].has(val)) return;

			const {mes, sev} = this.#hDiag.キーワード不明;
			aDi.push(Diagnostic.create(
				this.#genPrm2Rng(prm),
				mes.replace('$', `${name} (${rangetype.slice(0, -1)})`)
				.replace('$', val),
				sev
			));
		}
		#genPrm2Rng(prm: PRM_RANGE): Range {
			const {k_ln, k_ch, v_ln, v_ch, v_len} = prm;
			return Range.create(k_ln, k_ch, v_ln, v_ch +v_len);
		}

		#chkLiteral(fn: string): boolean {return !!fn && /^[^*%&"'#]/.test(fn) && fn.at(-1) !== '*'}
		#chkLiteral4lbl(lbl: string): boolean {return !!lbl && /^\*[^*%&"'#]/.test(lbl)}
		#REG_TAG_NAME	= /(?<name>[^\s;\]]+)/;


		#procTokenBase = (_p: Position, _token: string)=> {};
		#procToken:  (p: Position, token: string)=> void= this.#procTokenBase;
		// トークン解析実行するのはこのメソッド
		// [let_ml]処理中は一時差し替え → procToken に復帰
	readonly	#hTagProc: {[nm: string]: (arg: ARG_TAG_PROC)=> void}	= {
		// constructor で上書きしているので注意

		let_ml: ({hArg, pp})=> {
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

			const nm = hArg.name?.val;
			if (! nm || this.#REG_NO_LITERAL.test(nm)) return;

			this.#hT2Pp2Kw.代入変数名[pp].add(nm);
		},

		let: ({hArg, pp, f2s})=> {
			const nm = hArg.name?.val;
			if (! nm || this.#REG_NO_LITERAL.test(nm)) return;

			this.#hT2Pp2Kw.代入変数名[pp].add(nm);

			// 変数代入文字列をフォント生成対象とする／しない切り替える機能
			if ('val2font' in hArg) this.#nowModeVal2font = Boolean(hArg.val2font.val);
			if ('val2fontNm' in hArg) this.#nowModeVal2fontNm = hArg.val2fontNm.val ?? LspWs.DEF_FONT;

			if (this.#nowModeVal2font) {
				const tx = (hArg.text?.val ?? '').trim();
				if (tx.at(0) !== '&') f2s[this.#nowModeVal2fontNm] = (f2s[this.#nowModeVal2fontNm] ?? '') + tx;
			}
		},

		link: arg=> {
			this.#hTagProc.s(arg);

			this.#recAddKw('サウンドバッファ', 'clicksebuf', arg);
			this.#recAddKw('サウンドバッファ', 'entersebuf', arg);
			this.#recAddKw('サウンドバッファ', 'leavesebuf', arg);
		},

		add_frame: arg=> this.#recDefKw('フレーム定義', 'id', arg),

		s: arg=> {
			const {token, rng} = arg;
			arg.aDsOutline.push(DocumentSymbol.create(token, '', SymbolKind.Function, rng, rng));
		},

		fadeoutse: arg=> {this.#recAddKw('サウンドバッファ', 'buf', arg);},
		fadese: arg=> {this.#recAddKw('サウンドバッファ', 'buf', arg);},
		playse: arg=> {this.#recAddKw('サウンドバッファ', 'buf', arg);},
		stopfadese: arg=> {this.#recAddKw('サウンドバッファ', 'buf', arg);},
		stopse: arg=> {this.#recAddKw('サウンドバッファ', 'buf', arg);},
		volume: arg=> {this.#recAddKw('サウンドバッファ', 'buf', arg);},
		wf: arg=> {this.#recAddKw('サウンドバッファ', 'buf', arg);},
		ws: arg=> {this.#recAddKw('サウンドバッファ', 'buf', arg);},
		xchgbuf: arg=> {
			this.#recAddKw('サウンドバッファ', 'buf', arg);
			this.#recAddKw('サウンドバッファ', 'buf2', arg);
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

		button: arg=> {
			this.#hTagProc.s(arg);

			this.#recAddKw('サウンドバッファ', 'clicksebuf', arg);
			this.#recAddKw('サウンドバッファ', 'entersebuf', arg);
			this.#recAddKw('サウンドバッファ', 'leavesebuf', arg);
		},
		call: arg=> {
			this.#hTagProc.s(arg);

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
		// jump:  = s

		// return:  = s

		char2macro: arg=> {
			const {uri, rng, aDi, hArg, hRng} = arg;
			const char = hArg.char?.val ?? '';
			const use_nm = hArg.name?.val ?? '';
			if (! char || ! use_nm) {	// [macro name=]など
				const {mes, sev} = this.#hDiag.一文字マクロ定義_属性異常;
				aDi.push(Diagnostic.create(rng, mes.replace('$', use_nm), sev));
				return;
			}
			this.#recDefKw('一文字マクロ定義', 'char', arg);
			if (use_nm in LspWs.#hTag || use_nm in this.#hDefPlugin) return;

			const {v_ln, v_ch, v_len} = hRng.name;
			(this.#hMacro2aLocUse[use_nm] ??= []).push(Location.create(uri, Range.create(
				v_ln, v_ch,
				v_ln, v_ch +v_len,
			)));
		},
		endmacro: arg=> arg.aDsOutline = this.#aDsOutlineStack.pop() ?? [],
		macro: arg=> {
			const {uri, token, rng, aDi, pBefore, p, hArg, hRng} = arg;
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

			this.#recDefKw('マクロ定義', 'name', arg);
			if (nm in this.#hDefMacro) return;

			// 新規マクロ定義を登録
			const m = token.match(LspWs.#regValName);
			if (! m) {	// 失敗ケースが思い当たらない
				const {mes, sev} = this.#hDiag.マクロ定義異常;
				aDi.push(Diagnostic.create(rng, mes.replace('$', nm), sev));
				return;
			}

			const param: MD_PARAM_DETAILS[] = [];
			for (const [nm, {val}] of Object.entries(hArg)) {
				if (nm.at(0) !== '%') continue;

				const isRequired = nm.at(-1) !== '?';
				const name = nm.slice(1, isRequired ?undefined :-1);
				const [rangetype, def, comment] = val.split('|');
//console.log(`fn:LspWs.ts [macro] nm:${nm} name:${name}= rangetype:${rangetype} def:${def} comment:${comment}`);
				param.push({
					name,
					required	: isRequired ?'y' :'',
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
			const {v_ln, v_ch} = hRng.name;
			this.#hDefMacro[nm] = {
				loc		: Location.create(uri, rng2),
				hPrm	: hArg,
				sum,
				param,
				detail	: hArg.detail?.val.replaceAll('\\n', '  \n'),
				name_v_ln	: v_ln,
				name_v_ch	: v_ch,
			};

			const {snippet_ext} = hArg;
			if (snippet_ext) {
				if (H_SPAE2IDX[snippet_ext.val] === undefined) {
					const {mes, sev} = this.#hDiag.snippet_ext属性異常;
					const {k_ln, k_ch, v_ln, v_ch, v_len} = hRng.snippet_ext;
					aDi.push(Diagnostic.create(Range.create(
						k_ln, k_ch,
						v_ln, v_ch +v_len,
					), mes.replace('$', nm), sev));
				}
			}

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

		ch_in_style: arg=> this.#recDefKw('文字出現演出定義', 'name', arg),
		ch_out_style: arg=> this.#recDefKw('文字消去演出定義', 'name', arg),
		add_lay: arg=> {
			const {hArg, pp} = arg;
			const lay = hArg.layer?.val;
			if (! lay) return;
			if ('cond' in hArg && hArg.cond.val === '!const.sn.lay.'+ lay) return;	// タグが実行されない場合があり得るので無視

			this.#hT2Pp2Kw[
				hArg.class?.val === 'grp' ?'画像レイヤ名' :'文字レイヤ名'
			][pp].add(lay);

			this.#recDefKw('レイヤ定義', 'layer', arg);
		},
		add_face: arg=> {
			const {hArg} = arg;
			const nm = hArg.name?.val;
			if (! nm || this.#REG_NO_LITERAL.test(nm)) return;

			this.#recDefKw('差分名称', 'name', arg);
		},
		span: ({rng, uri, hArg})=> {
			const v = hArg.style?.val;
			if (! v) {this.#nowFontNm = LspWs.DEF_FONT; return;}

			// [span style='font-family: my_himajihoso; color: skyblue;']
			const fonts = /font-family\s*:\s+(?<fonts>[^;]+)/.exec(v)
			?.groups?.fonts ?? '';	// https://regex101.com/r/b93jbp/1
			if (! fonts || fonts.slice(0, 2) === '#{') {this.#nowFontNm = LspWs.DEF_FONT; return;}

			const s = this.#getFonts2ANm(fonts, uri, rng);
			if (s) this.#nowFontNm = s;
		},
		lay: arg=> {
			this.#hTagProc.span(arg);
		},
	}	
	readonly	#aDsOutlineStack	: DocumentSymbol[][]	= [];
		#cnvFnWildcard2A(fn: string): string[] {
			const EXT = 'sn';
			return this.#matchPath('^'+ fn.slice(0, -1) +'.*', EXT).map(v=> decodeURIComponent(getFn(v[EXT])))
		}


	readonly	#REG_NO_LITERAL	= /^[%&]/;
	#recAddKw(i: T_KW_VAR, nmArg: string, {hArg, pp}: ARG_TAG_PROC) {
		const kw = hArg[nmArg]?.val;
		if (! kw || this.#REG_NO_LITERAL.test(kw)) return;

		this.#hT2Pp2Kw[i][pp].add(kw);
	}


	// === 重複チェック系 ===
	#recDefKw(i: T_CHK重複_KEY, nmArg: string, {hArg, uri, hRng, pp}: ARG_TAG_PROC) {
		const kw = hArg[nmArg]?.val;
		if (! kw || this.#REG_NO_LITERAL.test(kw)) return;

		const m = this.#hT2DefKw2ALoc[i];
		const a = m.get(kw) ?? [];
		a.push(Location.create(uri, this.#genPrm2Rng(hRng[nmArg]),));
		m.set(kw, a);

		this.#hT2Pp2Kw[hInfKw[i]][pp].add(kw);
	}
	#chkDupDefKw(i: T_CHK重複_KEY) {
		const diag = i +' $ が重複しています';
		for (const [kw, aLoc] of this.#hT2DefKw2ALoc[i].entries()) {
			if (aLoc.length < 2) continue;

			// 同じ警告は一度全て削除
			const mes = diag.replace('$', kw);
			for (const [fp, a] of Object.entries(this.#fp2Diag)) {
				this.#fp2Diag[fp] = a.flatMap(d=> d.message === mes ?[] :d);
			}

			if (this.hasDiagRelatedInfCap) {
				const [{uri, range}] = aLoc;
				(this.#fp2Diag[uri] ??= []).push(Diagnostic.create(
					range, mes, undefined, undefined, undefined,
					aLoc.map(location=> ({location, message: 'その他の箇所'}))
				));
			}
			else for (const {uri, range} of aLoc) (this.#fp2Diag[uri] ??= []).push(Diagnostic.create(range, mes, DiagnosticSeverity.Error));
		}
	}
	#delDefKw(m: MAP_KW2ALOC, uri: string) {
		for (const [kw, aLoc] of m.entries()) {
			m.set(kw, aLoc.filter(loc=> loc.uri !== uri));
		}
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
		if (equa[1].at(0) === '&') throw '「&計算」書式では「&」指定が不要です';
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
				if (search_exts.indexOf(`|${e}|`) > -1) return String(h_exts[e]);
			}
			throw `サーチ対象拡張子群【${extptn}】にマッチするファイルがサーチパスに存在しません。探索ファイル名=【${fn}】`;
		}

		// fnに拡張子xが含まれている
		//	ファイル名サーチ→拡張子群にxが含まれるか
		if (extptn !== '' && `|${extptn}|`.indexOf(`|${ext}|`) === -1) {
			throw `指定ファイルの拡張子【${ext}】は、サーチ対象拡張子群【${extptn}】にマッチしません。探索ファイル名=【${fn}】`;
		}

		ret = String(h_exts[ext]);
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

