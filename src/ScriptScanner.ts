/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {treeProc, getFn, IFn2Path, REG_SCRIPT, is_win} from './CmnLib';
import {AnalyzeTagArg} from './AnalyzeTagArg';
import {Debugger} from './Debugger';
import {CteScore} from './CteScore';

import {DiagnosticCollection, Diagnostic, Location, DiagnosticSeverity, Uri, Range, Position, workspace, DocumentSymbol, SymbolKind, TextDocumentChangeEvent, DiagnosticRelatedInformation} from 'vscode';
import {existsSync, readFileSync} from 'fs-extra';
import {userInfo} from 'os';

interface Script {
	aToken	: string[];		// トークン群
	len		: number;		// トークン数
	aLNum	: number[];		// トークンの行番号
};
interface Pos {
	line	: number;
	col		: number;
}
interface FncTagProc {
	(setKw: Set<string>, uri: Uri, token: string, rng: Range, diags: Diagnostic[], p: Pos, lineTkn: number, rng_nm: Range): void;
}
interface MacDef {
	loc		: Location;
	hPrm	: any;
}

// フォントと使用文字情報
export type TFONT2STR = {
	[font_nm: string]: string;
};

export type TINF_FONT2STR = {
	defaultFontName	: string;
	hSn2Font2Str	: {[sn: string]: {[font_nm: string]: string}};
	hFontNm2Path	: {[font_nm: string]: string};
};

export type TINF_FONT_CHK = {
	font_nm	: string;
	err		: string;
};

class Diagnostic_EX extends Diagnostic {
	all_sn_chk?	: 1;

	constructor(range: Range, message: string, severity?: DiagnosticSeverity) {
		super(range, message, severity);
		this.all_sn_chk = 1;
	}
}

type TH_SN2LBLRNG = {[label: string]: Range};

export class ScriptScanner {
	readonly	#aPlaceFont;
	readonly	#aPlaceFontNm = ['PRJ','USER','OS'];

	constructor(readonly pathWs: string, private readonly curPrj: string, private readonly clDiag: DiagnosticCollection, private readonly hTag: {[name: string]: boolean}) {
		this.#hTagProc.let_abs =
		this.#hTagProc.let_char_at =
		this.#hTagProc.let_index_of =
		this.#hTagProc.let_length =
		this.#hTagProc.let_replace =
		this.#hTagProc.let_round =
		this.#hTagProc.let_search =
		this.#hTagProc.let_substr = this.#hTagProc.let;
		this.#hTagProc.set_frame = this.#hTagProc.let_frame;

		this.#hTagProc.call =
		this.#hTagProc.jump = this.#hTagProc.event;
		this.#hTagProc.return = this.#hTagProc.s;
		this.#hTagProc.else = this.#hTagProc.elsif;

		this.#procToken = this.#procTokenBase;

		this.#cteScore = new CteScore(curPrj);

		const {username} = userInfo();
		this.#aPlaceFont	= [
			`${pathWs}/core/font`,
			is_win
				? `C:/Users/${username}/AppData/Local/Microsoft/Windows/Fonts`
				: `/Users/${username}/Library/Fonts`,
			is_win
				? 'C:/Windows/Fonts'
				: '/Library/Fonts',
		];
	}

	hPlugin		: {[tm: string]: Location}		= {};
	hMacro		: {[nm: string]: MacDef}		= {};
	hMacroUse	: {[nm: string]: Location[]}	= {};
	hTagMacroUse: {[fn: string]: {nm: string, rng: Range}[]}	= {};
	// 新キーワード選択値はここに追加する
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

	cnvSnippet	= (s: string, _cur_fn: string)=> s;
	// 変化が無い固定選択値はこちらに
	readonly	hPreWords	: {[key: string]: string}	= {
		'イベント名': `|Click,RightClick,MiddleClick,UpWheel,DownWheel,Control,Alt,Meta,Backspace,Enter,=,A,alt+A,ctrl+A,shift+A,alt+ctrl+A,ctrl+shift+A,alt+shift+A,alt+ctrl+shift+A,' ',ArrowLeft,ArrowRight,ArrowUp,ArrowDown,Tab,Delete,Home,End,PageUp,PageDown|`,
		'animation-timing-function': '|ease,ease-in,ease-out,ease-in-out,linear,step-start,step-end,cubic-bezier(...)|',
		'イージング名': '|Back.In,Back.InOut,Back.Out,Bounce.In,Bounce.InOut,Bounce.Out,Circular.In,Circular.InOut,Circular.Out,Cubic.In,Cubic.InOut,Cubic.Out,Elastic.In,Elastic.InOut,Elastic.Out,Exponential.In,Exponential.InOut,Exponential.Out,Linear.None,Quadratic.In,Quadratic.InOut,Quadratic.Out,Quartic.In,Quartic.InOut,Quartic.Out,Quintic.In,Quintic.InOut,Quintic.Out,Sinusoidal.In,Sinusoidal.InOut,Sinusoidal.Out|',
		'ブレンドモード名': '|normal,add,multiply,screen|',
	};
	#hFn2JumpSnippet	: {[fn: string]: string}	= {};
	#bldCnvSnippet() {
		let eq = true;

		const mn = this.#hSetWords.マクロ名;
		mn.clear();
		for (const mm in this.hMacro) mn.add(mm);

		this.#hSetWords.代入変数名.add(ScriptScanner.#sPredefWrtVar);
		this.#hSetWords.文字出現演出名.add('default');
		this.#hSetWords.文字消去演出名.add('default');
		for (const key in this.#hSetWords) {
			const set = this.#hSetWords[key];
			const str = `|${[...set.values()].sort().join(',')}|`;
			if (this.hPreWords[key] !== str) {
				eq = false;
				this.#cteScore.updWords(key, set);
					// この中は参照渡しとReq/Res型なので、更新確認は別にいらない
			}
			this.hPreWords[key] = (str === '||') ?`:${key}` :str;
		}
		if (eq) return;

		this.#hFn2JumpSnippet = {};
		this.cnvSnippet = (s, cur_fn)=> {
			const bk = this.hPreWords['ジャンプ先'];

			const jsn = this.#hFn2JumpSnippet[cur_fn];
			this.hPreWords['ジャンプ先'] = jsn ?? (()=> {
				if (typeof bk !== 'string') return 'ジャンプ先';
				let cur_sn = '';
				const sn = (bk.slice(1, -1) +',').replace(
					new RegExp(`fn=${cur_fn},(?:fn=${cur_fn} [^,|]+,)*`),
					m=> {cur_sn = m; return '';}
				)
				return this.#hFn2JumpSnippet[cur_fn]
					= `|${(cur_sn + sn).slice(0, -1)}|`;
			})();

			const ret = s.replace(/{{([^\}]+)}}/g, (_, p)=> this.hPreWords[p]);

			this.hPreWords['ジャンプ先'] = bk;

			return ret;
		};
	}
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


	#uri2Diag	: {[url: string]: Diagnostic_EX[]}	= {};
	goAll() {
		this.#goInit();
		treeProc(this.curPrj, url=> this.goAllSub(Uri.file(url)));
		this.#goFinishSub();
	}

	static	readonly	#REG_SPRITE	= /\.(png|jpg|jpeg|json|svg|webp|mp4|webm)$/;	// https://regex101.com/r/DPaLv3/1
	static	readonly	#REG_NOSPR	= /\/(path|prj)\.json$/;
		// https://regex101.com/r/DPaLv3/2
//	static	readonly	#REG_FONT	= /\.(woff2|otf|ttf)$/;
	static	readonly	#REG_SOUND	= /\.(mp3|m4a|ogg|aac|flac|wav)$/;
	static	readonly	#REG_HTML	= /\.html?$/;
	goAllSub(uri: Uri) {
		const path = uri.path;
		const fn = getFn(path);
		if (! REG_SCRIPT.test(path)) {
			if (ScriptScanner.#REG_SPRITE.test(path)) {
				if (ScriptScanner.#REG_NOSPR.test(path)) return;
				this.#hSetWords.画像ファイル名.add(fn);
			}
			else if (ScriptScanner.#REG_SOUND.test(path)) {
				this.#hSetWords.音声ファイル名.add(fn);
			}
			else if (ScriptScanner.#REG_HTML.test(path)) {
				this.#hSetWords.HTMLファイル名.add(fn);
			}
			return;
		}
		this.#hSetWords.スクリプトファイル名.add(fn);

		this.#uri2Diag[path] ??= [];
		this.#hSetWords.ジャンプ先.add(`fn=${fn}`);
		this.hTagMacroUse[path] ??= [];
		this.#hScr2KeyWord[path] ??= new Set();

		const td = workspace.textDocuments.find(td=> td.fileName === uri.fsPath);
		this.#scanScript(
			uri,
			td?.getText() ?? readFileSync(uri.fsPath, {encoding: 'utf8'}),
			true,
		);
	}

	readonly	#cteScore	: CteScore;
	updPath(hPath: IFn2Path) {this.#cteScore.updPath(hPath);}

	#hScr2KeyWord	: {[path: string]: Set<string>}	= {};
	chgTxtDoc(aChgTxt: TextDocumentChangeEvent[]) {
		// 複数ファイル同時変更時（置換/Undo/Redoなど）は全ファイルを再走査
		if (aChgTxt.length > 1) {this.goAll(); return;}

		// 単体ファイル走査
		const e = aChgTxt[0];
		const doc = e.document;
		const path = doc.fileName;
		if (! REG_SCRIPT.test(path)) return;
		const hUpdScore: {[path: string]: boolean} = {};
		if (path.slice(-3) === '.sn') Debugger.noticeChgDoc(this.curPrj, e);
		else {
//console.log(`fn:ScriptScanner.ts chgTxtDoc (ssn) path:${path}`);
			this.#cteScore.separation(path);
			e.contentChanges.forEach(c=> {
				const sl = c.range.start.line;
				const el = c.range.end.line;
//console.log(`fn:ScriptScanner.ts line:294 * (${sl},${c.range.start.character})(${el},${c.range.end.character})=${c.text}=`);
				const text = (sl === el && c.text.slice(-1) !== '\n')
					? doc.lineAt(sl).text
					: c.text;
				hUpdScore[path] ||= this.#cteScore.updLine(doc, c.range, text, this.#resolveScript(text).aToken);
			});
			this.#cteScore.combining(path);
		}

		// scanScript 本編
		this.#goInit(path);
		this.#scanScript(doc.uri, doc.getText(), hUpdScore[path]);
		this.#goFinish(path);

		// （変更前・変更後問わず）このファイルで定義されたマクロを使用しているファイルは
		// すべて追加走査（重複走査・永久ループに留意）
			// 重複定義時は、最初に見つかったもののみ #hMacro(Old) に入っている
		const mon = {...this.#hMacroOld, ...this.hMacro};
		for (const nm in mon) {
			// 1.このファイルで定義されたマクロ
			const m = mon[nm];
			if (m.loc.uri.path !== path &&
				! this.#hDupMacro2ALoc[nm]?.map(loc=> loc.uri.path)
				.includes(path)) continue;	// 定義重複は別変数なので
			// 2.を使用しているファイル
			this.hMacroUse[nm]?.forEach(loc=> {
				if (loc.uri.path !== path) this.#sNeedScan.add(loc.uri.path);
			});
		}

		// 追加走査
		this.#sNeedScan.delete(path);	// 処理重複につき
		this.#sNeedScan.forEach(url=> {
			this.#goInit(url);
			const td = workspace.textDocuments.find(td=> td.uri.path === url);
			this.#scanScript(
				Uri.file(url),
				td?.getText() ?? readFileSync(url, {encoding: 'utf8'}),
				hUpdScore[url],
			);
			this.#goFinish(url);
		});
	}

	#sNeedScan	= new Set<string>();	// スキャン必要フラグ（単体ファイル走査時）

	#hMacroOld	: {[nm: string]: MacDef} = {};	// 変更前に存在したマクロ群
	#aMacroAdd	: string[]	= [];

	#hScr2KeyWordOld	= new Set<string>();	// キーワード削除対応
	hSn2aDsOutline	: {[path: string]: DocumentSymbol[]} = {}; // 外部から参照
	#hDupMacro2ALoc : {[nm: string]: Location[]} = {};

	#hFn2label	: {[path: string]: TH_SN2LBLRNG}= {};	// ラベル存在チェック用
	#hFn2JoinLabel	: {[path: string]: string}	= {};	// ラベル名結合文字列
		// ジャンプ先変更チェック用。無名以外のラベル名を結合
	#hFTJump	: {[path_from: string]: Set<string>} = {};	// to_fn
		// ジャンプ元から先への関連

	#goInit(path?: string) {
		if (! path) {	// 全ファイル走査
			this.hMacro = {};
			this.hMacroUse = {};
			this.hTagMacroUse = {};

			for (const key in this.#hSetWords) this.#hSetWords[key] = new Set;
			this.#hScr2KeyWord = {};
			this.hSn2aDsOutline = {};
			this.#hInfFont2Str = {defaultFontName: '', hSn2Font2Str: {}, hFontNm2Path: {},};	// NOTE: 凍結か

			this.#hDupMacro2ALoc = {};
			this.#hFn2label = {};
			this.#uri2Diag = {};
			this.#hFn2JoinLabel = {};
			this.#hFTJump = {};
			return;
		}

		// 単体ファイル走査時
		this.#sNeedScan = new Set();
		{
			const hMD: {[nm: string]: MacDef} = {};
			this.#hMacroOld = {};	// 変更前に存在したマクロ群を退避
			for (const nm in this.hMacro) {
				const m = this.hMacro[nm];
				if (m.loc.uri.path !== path) hMD[nm] = m;
				else {this.#hMacroOld[nm] = m; this.#cteScore.undefMacro(nm);}
			}
			this.hMacro = hMD;		// 別snで定義されたマクロのみにした
			this.#aMacroAdd = [];
		}
		{
			const hMU: {[nm: string]: Location[]} = {};
			for (const nm in this.hMacroUse) this.hMacroUse[nm].forEach(loc=> {
				if (loc.uri.path !== path) (hMU[nm] ??= []).push(loc);
			})
			this.hMacroUse = hMU;	// 別snで使用されたマクロのみにした
		}
		this.hTagMacroUse[path] = [];

		this.#hScr2KeyWordOld = this.#hScr2KeyWord[path] ??= new Set;
		this.#hScr2KeyWord[path] = new Set;
	//	this.hSn2aDsOutline = {};	// #scanScriptで
	//	this.#hSn2label[path] = {};	// #scanScriptで
	//	this.#hFn2Jump[path] = {};	// #scanScriptで

		// 重複マクロ定義検知
		for (const nm in this.#hDupMacro2ALoc) this.#hDupMacro2ALoc[nm] = this.#hDupMacro2ALoc[nm].filter(l=> l.uri.path !== path);

		// メッセージをクリア
		this.#uri2Diag[path] = [];
		// 他のスクリプトも（スクリプトをまたぐ判定必要な）マクロ定義重複のみ取り去る
		for (const path4 in this.#uri2Diag) this.#uri2Diag[path4] = this.#uri2Diag[path4].filter(dia=> ! dia.all_sn_chk);
	}
	#goFinish(path: string) {
		this.#goFinishSub(path);

		if (path.slice(-4) === '.ssn') {
			const doc = workspace.textDocuments.find(td=> td.fileName === path);
//			const doc = workspace.textDocuments.find(td=> td.fileName === uri.fsPath);
				// TODO: 変更して動作未確認
			if (doc) {
				const hMacroOld = this.#hMacroOld;
				for (const nm in hMacroOld) {
					if (! (nm in this.hMacro)	// マクロ定義が削除された
					||	Object.entries(this.hMacro[nm].hPrm).sort().join()
					!==	Object.entries(hMacroOld[nm].hPrm).sort().join())
					// マクロ定義の引数が更新された
					this.hMacroUse[nm]?.forEach(loc=> {
						const txt =doc.lineAt(loc.range.start.line).text.trim();
						this.#cteScore.updLine(
							doc,
							loc.range,
							txt,
							this.#resolveScript(txt).aToken
						);	// 最新ssn定義で更新
					});
				}

				// 追加されたマクロ定義
				this.#aMacroAdd.forEach(nm=> this.hMacroUse[nm]?.forEach(loc=> {
					const txt = doc.lineAt(loc.range.start.line).text.trim();
					this.#cteScore.updLine(
						doc,
						loc.range,
						txt,
						this.#resolveScript(txt).aToken,
					);
				}));
			}
		}
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
		改行10行超: {
			mes	: '改行タグが10行を超えています',
			sev	: DiagnosticSeverity.Information,
		},
	};
	#aFinishJob: (()=> void)[]	= [];
	#goFinishSub(path?: string) {
		this.#aFinishJob.forEach(j=> j());
		this.#aFinishJob = [];

		if (path) {		// 単体ファイル走査時
			// キーワード削除対応
			const now = this.#hScr2KeyWord[path];
			for (const s of this.#hScr2KeyWordOld) {
				if (now.has(s)) continue;
				let findOther = false;
				for (const path_other in this.#hScr2KeyWord) {
					if (path_other === path) continue;
					if (findOther = this.#hScr2KeyWord[path_other].has(s)) break;
				}
				if (findOther) continue;	// 別のpathにあるので削除されてない

				const [k, w] = s.split('\t');
				this.#hSetWords[k].delete(w);
			}
		}

		const d定義重複 = this.#hDiag.マクロ定義重複;
		for (const nm in this.#hDupMacro2ALoc) {
			const a = [...this.#hDupMacro2ALoc[nm]];	// 破壊禁止
			if (a.length < 2) continue;

			const loc = a.shift()!;
			const dia = new Diagnostic_EX(
				loc.range,
				d定義重複.mes.replace('$', nm),
				d定義重複.sev,
			);
			dia.relatedInformation = a.map(l=> new DiagnosticRelatedInformation(l, this.#hDiag.マクロ定義重複_その他.mes));
			(this.#uri2Diag[loc.uri.path] ??= []).push(dia);
		}

		const d未定義 = this.#hDiag.未定義マクロ;
		for (const use_nm in this.hMacroUse) {
			if (use_nm in this.hMacro) continue;
			if (use_nm in this.hPlugin) continue;

			this.hMacroUse[use_nm].forEach(loc=> {
				//if (path && loc.uri.path !== path) return;	// 更新分のみ
					// _EX で全スクリプトに影響するので上記処理させない

				const dia = new Diagnostic_EX(
					loc.range,
					d未定義.mes.replace('$', use_nm),
					d未定義.sev
				);
				(this.#uri2Diag[loc.uri.path] ??= []).push(dia);
			});
		}

		const d未使用マクロ = this.#hDiag.未使用マクロ;
		for (const nm in this.hMacro) {
			if (nm in this.hMacroUse) continue;
			const m = this.hMacro[nm];
			if (m.hPrm?.nowarn_unused?.val) continue;
			if (path && m.loc.uri.path !== path) continue;	// 更新分のみ

			const dia = new Diagnostic(	// _EX ではない
				m.loc.range,
				d未使用マクロ.mes.replace('$', nm),
				d未使用マクロ.sev
			);
			(this.#uri2Diag[m.loc.uri.path] ??= []).push(dia);
	}

		this.clDiag.clear();
		for (const path in this.#uri2Diag) {
			this.clDiag.set(Uri.file(path), this.#uri2Diag[path]);
		}

		this.#bldCnvSnippet();
	}

	isSkipUpd(path: string): boolean {
		if (path.slice(-4) !== '.ssn') return false;
		return this.#cteScore.isSkipUpd(path);
	}

	// フォントと使用文字情報
	#hInfFont2Str	: TINF_FONT2STR	= {
		defaultFontName: '',
		hSn2Font2Str: {},
		hFontNm2Path: {},
	};
	getInfFont2Str(): TINF_FONT2STR {
/*
		// テスト用に空オブジェクト削除
		const o: {[sn: string]: {[fn: string]: string}} = {};
		for (const sn in this.#hInfFont2Str.hSn2Font2Str) {
			const f2s = this.#hInfFont2Str.hSn2Font2Str[sn];
			if (Object.keys(f2s).length > 0) o[sn] = f2s;
		}
		this.#hInfFont2Str.hSn2Font2Str = o;
*/
		return this.#hInfFont2Str;
	}

	#Fonts2ANm(fonts: string, diags: Diagnostic[], rng: Range): TINF_FONT_CHK[] {
		return fonts.split(',')
		.map(nm=> /^["'\s]*(?<text>[^,;"']+)/.exec(nm)?.groups?.text ?? '')
			// https://regex101.com/r/TA5y7N/1
		.map(nm=> {
			// 存在チェック
			const f: TINF_FONT_CHK = {font_nm: nm, err: ''};
			if (nm in this.#hInfFont2Str.hFontNm2Path) return f;

			const d = this.#hDiag.フォントファイル不明;
			f.err = d.mes.replace('$', nm);
			this.#aPlaceFont
			.some((base, i)=> ['woff2','otf','ttf']
			.some(ext=> {
				const ret = existsSync(`${base}/${nm}.${ext}`);
				if (ret) {
					f.err = '';
					this.#hInfFont2Str.hFontNm2Path[nm] = `::PATH_${
						this.#aPlaceFontNm[i]
					}_FONTS::/${nm}.${ext}`;
				}
				return ret;
			}));

			if (f.err) diags.push(new Diagnostic(rng, f.err, d.sev));

			return f;
		});
	}


	#aDsOutline		: DocumentSymbol[];
			readonly	#alzTagArg	= new AnalyzeTagArg;
	static	readonly	#regValName
		= /(?<=name\s*=\s*)([^"'#;\]]+|(["'#])(.*?)\2)/m;
	static	readonly	DEF_FONT = ':DEF_FONT:';
	#nowFontNm = ScriptScanner.DEF_FONT;
	#scanScript(uri: Uri, src: string, isUpdScore: boolean) {
		const path = uri.path;
		const diags = this.#uri2Diag[path] ??= [];
		const f2s: TFONT2STR = this.#hInfFont2Str.hSn2Font2Str[path] = {};
		this.#nowFontNm = ScriptScanner.DEF_FONT;

		const hLblRng: TH_SN2LBLRNG = {};	// ラベル重複チェック用
		const setKw = this.#hScr2KeyWord[path];	// キーワード削除チェック用
		this.#aDsOutline = this.hSn2aDsOutline[path] = [];

		let sJoinLabel = '';	// ラベル変更検知用、jump情報・ラベル名結合文字列
								// [jump]タグなどの順番が変わっただけでも変更扱いで
		this.#hFTJump[path] = new Set();

		// procTokenBase を定義、procToken も同値で始める
		this.#procToken = this.#procTokenBase = (p: Pos, token: string)=> {
			const uc = token.charCodeAt(0);	// TokenTopUnicode
			const len = token.length;
			if (uc === 9) {p.col += len; return;}	// \t タブ
			if (uc === 10) {p.line += len; p.col = 0; return;}	// \n 改行
			if (uc === 59) {p.col += len; return;}	// ; コメント
			const rng = new Range(
				p.line, p.col,
				p.line, p.col +len
			);
			if (uc === 38) {	// & 変数操作・変数表示
				p.col += len;
				if (token.slice(-1) === '&') return;
				//変数操作
				try {
					const o = ScriptScanner.#splitAmpersand(token.slice(1));
					if (o.name.charAt(0) !== '&') {
						const kw = o.name.trimEnd();
						this.#setKwAdd(setKw, '代入変数名', kw);

						// doc/prj/script/setting.sn の デフォルトフォント
						if (kw === 'def_fonts') {
							const a = this.#Fonts2ANm(o.text, diags, rng);
							this.#hInfFont2Str.defaultFontName = a[0].font_nm;
/*
	// TODO: インストール済みフォント名から選択できればよいので、凍結
							this.cmd('updValid', '/setting.sn:def_fonts=');
							a.some(({err})=> {
								if (err) this.cmd('updValid', '/setting.sn:def_fonts='+ err);
								return err;
							});

// js/Vue
		case 'updValid'	:{
			const m = document.getElementById(e.data.id);
			m.parentElement.querySelector('div.invalid-feedback').textContent = e.data.mes;
			m.setCustomValidity(e.data.mes);
		}	return;
*/
						}
					}
				} catch (e) {console.error(`fn:ScriptScanner.ts #scanScriptSrc & %o`, e);}
				return;
			}
			if ((uc === 42) && (token.length > 1)) {	// * ラベル
				p.col += len;

				const kw = `fn=${getFn(path)} label=${token}`;
				this.#setKwAdd(setKw, 'ジャンプ先', kw);
				this.#aDsOutline.push(new DocumentSymbol(token, '', SymbolKind.Key, rng, rng));
				if (token.charAt(1) === '*') return;	// 無名ラベルは除外

				sJoinLabel += token;	// まぁ区切りなくていいか。*あるし
				const lr = hLblRng[token];
				if (lr) {
					const rng0 = hLblRng[token];
					const d = this.#hDiag.ラベル重複;
					const mes = d.mes.replace('$', token);
					if (rng0) diags.push(new Diagnostic(rng0, mes, d.sev));
					diags.push(new Diagnostic(rng, mes, d.sev));
				}
				else hLblRng[token] = rng;
				return;
			}
			if (uc !== 91) {	// 文字表示
				p.col += len;

				this.#aDsOutline.push(new DocumentSymbol(token, '', SymbolKind.String, rng, rng));

				f2s[this.#nowFontNm] = (f2s[this.#nowFontNm] ?? '') + token;
				return;
			}

			// [ タグ開始
			const a_tag = ScriptScanner.REG_TAG.exec(token);
			if (! a_tag) {	// []、[ ]など
				const d = this.#hDiag.タグ記述異常;
				diags.push(new Diagnostic(rng, d.mes.replace('$', token), d.sev));
				p.col += len;
				return;
			}

			// 複数行タグでの行カウント補正
			let lineTkn = 0;
			let j = -1;
			while ((j = token.indexOf('\n', j +1)) >= 0) ++lineTkn;
			if (lineTkn <= 0) p.col += len;
			else {
				p.line += lineTkn;
				p.col = len -token.lastIndexOf('\n') -1;
				const d = this.#hDiag.改行10行超;
				if (lineTkn > 10) diags.push(new Diagnostic(new Range(
					rng.start.line, rng.start.character -1,
					p.line, 0
				), d.mes, d.sev));
			}

			const use_nm = a_tag.groups?.name ?? '';
			this.hTagMacroUse[path].push({nm: use_nm, rng:
				rng.with(undefined, new Position(p.line, p.col))
			});
			if (use_nm in this.hPlugin) return;

			const rng_nm = new Range(
				rng.start,
				rng.end.translate(0, use_nm.length -len)
			);
			const rngp1 = new Range(
				rng_nm.start.translate(0, 1),
				rng_nm.end.translate(0, 1),
			);
			if (! (use_nm in this.hTag) && ! (use_nm in this.hPlugin)) {
				(this.hMacroUse[use_nm] ??= []).push(new Location(uri, rngp1));
				return;
			}

			const fnc = this.#hTagProc[use_nm];
			if (fnc) {
				this.#alzTagArg.go(a_tag.groups?.args ?? '');
				fnc(setKw, uri, token, rngp1, diags, p, lineTkn, rng_nm);
			}
		};

		const p = {line: 0, col: 0};
		const a = this.#resolveScript(src.trim()).aToken;
		a.forEach(token=> {if (token) this.#procToken(p, token)});

		const fn = getFn(path);
		this.#hFn2label[fn] = hLblRng;

		if (this.#hFn2JoinLabel[path] !== sJoinLabel) {
			for (const path_from in this.#hFTJump) {
				if (this.#hFTJump[path_from].has(fn)) this.#sNeedScan.add(path_from);
			}
		}
		this.#hFn2JoinLabel[path] = sJoinLabel;

		if (isUpdScore && path.slice(-4) === '.ssn') this.#cteScore.updScore(path, this.curPrj, a);
	}
	#procToken:  (p: Pos, token: string)=> void;
		// トークン解析実行するのはこのメソッド
		// [let_ml]処理中は一時差し替え → procToken に復帰
	#procTokenBase = (_p: Pos, _token: string)=> {}
	#setKwAdd(setKw: Set<string>, key: string, word: string) {
		setKw.add(`${key}\t${word}`);
		this.#hSetWords[key].add(word);
	}
	readonly	#hTagProc: {[nm: string]: FncTagProc}	= {
		// constructor で上書きしているので注意

		let_ml: (setKw: Set<string>)=> {
			this.#procToken = (p, token)=> {
				const len2 = token.length;
				let lineTkn = 0;
				let j = -1;
				while ((j = token.indexOf('\n', j +1)) >= 0) ++lineTkn;
				if (lineTkn === 0) p.col += len2; else {
					p.line += lineTkn;
					p.col = len2 -token.lastIndexOf('\n') -1;
				}
				this.#procToken = this.#procTokenBase;
			};

			const v = this.#alzTagArg.hPrm.name?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, '代入変数名', v);
		},

		macro: (_setKw: Set<string>, uri: Uri, token: string, rng: Range, diags: Diagnostic[], p: Pos, lineTkn: number, _rng_nm: Range)=> {	
			const hPrm = this.#alzTagArg.hPrm;
			const nm = hPrm.name?.val;
			if (! nm) {	// [macro name=]など
				const d = this.#hDiag.マクロ定義_名称異常;
				diags.push(new Diagnostic(rng, d.mes, d.sev));
				return;
			}

			if (this.hTag[nm]) {
				const d = this.#hDiag.マクロ定義_同名タグ;
				diags.push(new Diagnostic(rng, d.mes.replace('$', nm), d.sev));
				return;
			}
			if (this.hPlugin[nm]) {
				const d = this.#hDiag.マクロ定義_同名プラグイン;
				diags.push(new Diagnostic(rng, d.mes.replace('$', nm), d.sev));
				return;
			}

			(this.#hDupMacro2ALoc[nm] ??= []).push(new Location(uri, rng));

			const m = this.hMacro[nm];
			if (m) return;
			// 新規マクロ定義を登録
			const m2 = token.match(ScriptScanner.#regValName);
			if (! m2) {	// 失敗ケースが思い当たらない
				const d = this.#hDiag.マクロ定義異常;
				diags.push(new Diagnostic(rng, d.mes.replace('$', nm), d.sev));
				return;
			}

			const idx_name_v = (m2.index ?? 0) +(m2[3] ?1 :0);	// '"#分
			let lineNmVal = 0;
			let j = idx_name_v;
			while ((j = token.lastIndexOf('\n', j -1)) >= 0) ++lineNmVal;
			const line2 = p.line -lineTkn +lineNmVal;
			const col2 = ((lineNmVal === 0) ?p.col -token.length :0)
				+ idx_name_v -token.lastIndexOf('\n', idx_name_v) -1;
			const rng2 = new Range(
				line2, col2,
				line2, col2 +nm.length,
			);
			this.hMacro[nm] = {
				loc	: new Location(uri, rng2),
				hPrm: hPrm,
			};
			this.#aMacroAdd.push(nm);

			const ds = new DocumentSymbol(nm, 'マクロ定義', SymbolKind.Class, rng2, rng2);
			this.#aDsOutline.push(ds);
			this.#aDsOutlineStack.push(this.#aDsOutline);
			this.#aDsOutline = ds.children;

			if (uri.path.slice(-4) === '.ssn') {
				const o: {[k: string]: string} = {};
				for (const k in hPrm) o[k] = String(hPrm[k].val);
				this.#cteScore.defMacro(nm, o);
			}
		},
		endmacro: ()=> this.#aDsOutline = this.#aDsOutlineStack.pop() ?? [],

		char2macro: (_setKw: Set<string>, uri: Uri, _token: string, rng: Range, diags: Diagnostic[])=> {
			const hPrm = this.#alzTagArg.hPrm;
			const char = hPrm.char?.val ?? '';
			const use_nm = hPrm.name?.val ?? '';
			if (! char || ! use_nm) {	// [macro name=]など
				const d = this.#hDiag.一文字マクロ定義_属性異常;
				diags.push(new Diagnostic(rng, d.mes.replace('$', use_nm), d.sev));
				return;
			}
			if (this.hTag[use_nm] || this.hPlugin[use_nm]) return;

			(this.hMacroUse[use_nm] ??= []).push(new Location(uri, rng));
		},

		if: (_setKw: Set<string>, _uri: Uri, token: string, rng: Range)=> {
			const ds = new DocumentSymbol(token, '', SymbolKind.Function, rng, rng);
			this.#aDsOutline.push(ds);
			this.#aDsOutlineStack.push(this.#aDsOutline);
			this.#aDsOutline = ds.children;
		},
		elsif: (setKw: Set<string>, uri: Uri, token: string, rng: Range, diags: Diagnostic[], p: Pos, lineTkn: number, rng_nm: Range)=> {	
			this.#hTagProc.if(setKw, uri, token, rng, diags, p, lineTkn, rng_nm);

			this.#aDsOutline = this.#aDsOutlineStack.pop() ?? [];
		},
		// else:  = elsif
		endif: ()=> this.#aDsOutline = this.#aDsOutlineStack.pop() ?? [],

		event: (setKw: Set<string>, uri: Uri, token: string, rng: Range, diags: Diagnostic[], p: Pos, lineTkn: number, rng_nm: Range)=> {	
			this.#hTagProc.s(setKw, uri, token, rng, diags, p, lineTkn, rng_nm);

			// fn属性チェック
				// ファイル追加・削除時は（外部きっかけで）goAll()が走るのでヨシ
			const hPrm = this.#alzTagArg.hPrm;
			const fn = hPrm.fn?.val ?? getFn(uri.path);
			if (fn && fn.at(-1) !== '*') this.#aFinishJob.push(()=> {
				if (this.#hSetWords.スクリプトファイル名.has(fn)) return;
				const d = this.#hDiag.スクリプトファイル不明;
				diags.push(new Diagnostic(rng, d.mes.replace('$', fn), d.sev));
			});

			// label属性チェック
			const label = hPrm.label?.val ?? '';
			if (label && ! /^\*\*/.test(label)) this.#aFinishJob.push(()=> {
				if (label in this.#hFn2label[fn]) return;
				const d = this.#hDiag.ラベル不明;
				diags.push(new Diagnostic(rng, d.mes.replace('$', label), d.sev));
			});

			this.#hFTJump[uri.path].add(fn);
		},

		s: (_setKw: Set<string>, _uri: Uri, token: string, rng: Range)=> {
			this.#aDsOutline.push(new DocumentSymbol(token, '', SymbolKind.Function, rng, rng));
		},

		let: (setKw: Set<string>)=> {
			const v = this.#alzTagArg.hPrm.name?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, '代入変数名', v);
		},
		add_frame: (setKw: Set<string>)=> {
			const v = this.#alzTagArg.hPrm.id?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, 'フレーム名', v);
		},
		playbgm: (setKw: Set<string>)=> {
			this.#setKwAdd(setKw, 'サウンドバッファ', 'BGM');
		},
		playse: (setKw: Set<string>)=> {
			const v = this.#alzTagArg.hPrm.buf?.val ?? 'SE';
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, 'サウンドバッファ', v)
		},
		button: (setKw: Set<string>, uri: Uri, token: string, rng: Range, diags: Diagnostic[], p: Pos, lineTkn: number, rng_nm: Range)=> {	
			this.#hTagProc.event(setKw, uri, token, rng, diags, p, lineTkn, rng_nm);

			const c = this.#alzTagArg.hPrm.clicksebuf?.val ?? 'SYS';
			if (c && c.charAt(0) !== '&') this.#setKwAdd(setKw, 'サウンドバッファ', c);
			const e = this.#alzTagArg.hPrm.entersebuf?.val ?? 'SYS';
			if (e && e.charAt(0) !== '&') this.#setKwAdd(setKw, 'サウンドバッファ', e);
			const l = this.#alzTagArg.hPrm.leavesebuf?.val ?? 'SYS';
			if (l && l.charAt(0) !== '&') this.#setKwAdd(setKw, 'サウンドバッファ', l);
		},

		// call:  = event
		// jump:  = event
		// return:  = s

		link: (setKw: Set<string>, uri: Uri, token: string, rng: Range, diags: Diagnostic[], p: Pos, lineTkn: number, rng_nm: Range)=> {	
			this.#hTagProc.event(setKw, uri, token, rng, diags, p, lineTkn, rng_nm);

			const c = this.#alzTagArg.hPrm.clicksebuf?.val ?? 'SYS';
			if (c && c.charAt(0) !== '&') this.#setKwAdd(setKw, 'サウンドバッファ', c);
			const e = this.#alzTagArg.hPrm.entersebuf?.val ?? 'SYS';
			if (e && e.charAt(0) !== '&') this.#setKwAdd(setKw, 'サウンドバッファ', e);
			const l = this.#alzTagArg.hPrm.leavesebuf?.val ?? 'SYS';
			if (l && l.charAt(0) !== '&') this.#setKwAdd(setKw, 'サウンドバッファ', l);
		},
		ch_in_style: (setKw: Set<string>)=> {
			const v = this.#alzTagArg.hPrm.name?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, '文字出現演出名', v);
		},
		ch_out_style: (setKw: Set<string>)=> {
			const v = this.#alzTagArg.hPrm.name?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, '文字消去演出名', v);
		},
		add_lay: (setKw: Set<string>)=> {
			const v = this.#alzTagArg.hPrm.layer?.val;
			if (! v) return;

			this.#setKwAdd(setKw, 'レイヤ名', v);
			const cls = this.#alzTagArg.hPrm.class?.val;
			const kwn = `${cls === 'grp' ?'画像' :'文字'}レイヤ名`;
			this.#setKwAdd(setKw, kwn, v);
		},
		add_face: (setKw: Set<string>)=> {
			const v = this.#alzTagArg.hPrm.name?.val;
			if (v && v.charAt(0) !== '&') this.#setKwAdd(setKw, '差分名称', v);
		},
		span: (_setKw: Set<string>, _uri: Uri, _token: string, rng: Range, diags: Diagnostic[])=> {
			const v = this.#alzTagArg.hPrm.style?.val;
			if (! v) {this.#nowFontNm = ScriptScanner.DEF_FONT; return;}

			// [span style='font-family: my_himajihoso; color: skyblue;']
			const fonts = /font-family\s*:\s+(?<fonts>[^;]+)/.exec(v)
			?.groups?.fonts ?? '';	// https://regex101.com/r/b93jbp/1
			if (! fonts) {this.#nowFontNm = ScriptScanner.DEF_FONT; return;}

			const a = this.#Fonts2ANm(fonts, diags, rng);
			if (! a[0].err) this.#nowFontNm = a[0].font_nm;
		},
	};
	readonly	#aDsOutlineStack	: DocumentSymbol[][]	= [];


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
			ScriptScanner.#REG_TAG_LET_ML.lastIndex = 0;	// /gなので必要
			if (ScriptScanner.#REG_TAG_LET_ML.test(t)) {
				const idx = t.indexOf(']') +1;
				if (idx === 0) throw '[let_ml]で閉じる【]】がありません';
				const s = t.slice(0, idx);
				const e = t.slice(idx);
				a.splice(i, 1, s, e);
			}
		}
		const scr = {aToken :a, len :a.length, aLNum :[]};
		this.#replaceScript_let_ml(scr);

		return scr;
	}
	#replaceScript_let_ml(scr: Script, start_idx = 0) {
		for (let i=scr.len- 1; i >= start_idx; --i) {
			const token = scr.aToken[i];
			ScriptScanner.#REG_TAG_LET_ML.lastIndex = 0;	// /gなので必要
			if (ScriptScanner.#REG_TAG_LET_ML.test(token)) {
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

	// 47 match 959 step (1ms) https://regex101.com/r/TKk1Iz/4
	static	readonly	REG_TAG	= /\[(?<name>[^\s;\]]+)\s*(?<args>(?:[^"'#\]]+|(["'#]).*?\3)*?)]/;

	static	analyzTagArg = (token: string)=> ScriptScanner.REG_TAG.exec(token);
	analyzToken(token: string): RegExpExecArray | null {
		this.#REG_TOKEN.lastIndex = 0;	// /gなので必要
		return this.#REG_TOKEN.exec(token);
	}

	// =============== Grammar
	#REG_TOKEN	: RegExp;
	setEscape(ce: string) {
	//	if (this.hC2M && (ce in this.hC2M)) throw '[エスケープ文字] char【'+ ce +'】が登録済みの括弧マクロまたは一文字マクロです';

		// 1059 match 13935 step (8ms) https://regex101.com/r/ygXx16/6
		this.#REG_TOKEN = new RegExp(
		(ce	?`\\${ce}\\S|`:'')+	// エスケープシーケンス
		'\\n+'+				// 改行
		'|\\t+'+			// タブ
		`|\\[let_ml\\s+[^\\]]+\\]`+
			`.+?`+		// [let_ml]〜[endlet_ml]間のテキスト
		`(?=\\[endlet_ml[\\]\\s])`+
		`|\\[(?:[^"'#;\\]]+|(["'#]).*?\\1|;[^\\n]*)*?]`+	// タグ
		'|;[^\\n]*'+		// コメント
		'|&[^&\\n]+&'+		// ＆表示＆
		'|&&?[^;\\n\\t&]+'+	// ＆代入
		'|^\\*\\w+'+		// ラベル
		`|[^\\n\\t\\[;${ce?`\\${ce}`:''}]+`,	// 本文
		'gs');
	//	RubySpliter.setEscape(ce);
	//	this.REG_CANTC2M = new RegExp(`[\w\s;[\]*=&｜《》${ce}]`);
	//	this.REG_TOKEN_NOTXT = new RegExp(`[\n\t;\[*&${ce ?`\\${ce}` :''}]`);
	}
}
