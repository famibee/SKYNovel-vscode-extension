/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {treeProc, CmnLib, IFn2Path, REG_SCRIPT, chkBoolean} from './CmnLib';
import {AnalyzeTagArg} from './AnalyzeTagArg';
import {CteScore} from './CteScore';

import {DiagnosticCollection, Diagnostic, Location, DiagnosticSeverity, Uri, window, Range, Position, workspace, DocumentSymbol, SymbolKind, TextDocumentChangeEvent, TextDocument} from 'vscode';
import fs = require('fs-extra');

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
	(setKw: Set<string>, uri: Uri, token: string, rngp1: Range, diags: Diagnostic[], p: Pos, lineTkn: number, rng_nm: Range): void;
}
interface MacDef {
	loc		: Location;
	hPrm	: any;
}

export class ScriptScanner {
	constructor(private readonly curPrj: string, private readonly clDiag: DiagnosticCollection, private readonly hTag: {[name: string]: boolean}) {
		this.hTagProc['let_abs'] =
		this.hTagProc['let_char_at'] =
		this.hTagProc['let_index_of'] =
		this.hTagProc['let_length'] =
		this.hTagProc['let_replace'] =
		this.hTagProc['let_round'] =
		this.hTagProc['let_search'] =
		this.hTagProc['let_substr'] = this.hTagProc['let'];
		this.hTagProc['set_frame'] = this.hTagProc['let_frame'];
		this.hTagProc['jump'] =
		this.hTagProc['call'] =
		this.hTagProc['event'] =
		this.hTagProc['button'] =
		this.hTagProc['link'] =
		this.hTagProc['return'] = this.hTagProc['s'];
		this.hTagProc['else'] = this.hTagProc['elsif'];

		this.cteScore = new CteScore(curPrj);
	}

	hPlugin		: {[tm: string]: Location}		= {};
	hMacro		: {[nm: string]: MacDef}		= {};
	hMacroUse	: {[nm: string]: Location[]}	= {};
	hMacroUse4NoWarm	: {[nm: string]: Location[]}	= {};
	hTagMacroUse: {[fn: string]: {nm: string, rng: Range}[]}	= {};
	// 新キーワード選択値はここに追加する
	private readonly	hSetWords	: {[key: string]: Set<string>}	= {
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

	cnvSnippet	= (s: string, _cur_fn: string)=>s;
	// 変化が無い固定選択値はこちらに
	readonly	hPreWords		: {[key: string]: string}	= {
		'イベント名': `|Click,RightClick,MiddleClick,UpWheel,DownWheel,Control,Alt,Meta,Backspace,Enter,=,A,alt+A,ctrl+A,shift+A,alt+ctrl+A,ctrl+shift+A,alt+shift+A,alt+ctrl+shift+A,' ',ArrowLeft,ArrowRight,ArrowUp,ArrowDown,Tab,Delete,Home,End,PageUp,PageDown|`,
		'animation-timing-function': '|ease,ease-in,ease-out,ease-in-out,linear,step-start,step-end,cubic-bezier(...)|',
		'イージング名': '|Back.In,Back.InOut,Back.Out,Bounce.In,Bounce.InOut,Bounce.Out,Circular.In,Circular.InOut,Circular.Out,Cubic.In,Cubic.InOut,Cubic.Out,Elastic.In,Elastic.InOut,Elastic.Out,Exponential.In,Exponential.InOut,Exponential.Out,Linear.None,Quadratic.In,Quadratic.InOut,Quadratic.Out,Quartic.In,Quartic.InOut,Quartic.Out,Quintic.In,Quintic.InOut,Quintic.Out,Sinusoidal.In,Sinusoidal.InOut,Sinusoidal.Out|',
		'ブレンドモード名': '|normal,add,multiply,screen|',
	};
	private		hFn2JumpSnippet	: {[fn: string]: string}	= {};
	private	bldCnvSnippet() {
		let eq = true;

		const mn = this.hSetWords['マクロ名'];
		mn.clear();
		for (const mm in this.hMacro) mn.add(mm);

		this.hSetWords['代入変数名'].add(ScriptScanner.sPredefWrtVar);
		this.hSetWords['文字出現演出名'].add('default');
		this.hSetWords['文字消去演出名'].add('default');
		for (const key in this.hSetWords) {
			const set = this.hSetWords[key];
			const str = `|${[...set.values()].sort().join(',')}|`;
			if (this.hPreWords[key] !== str) {
				eq = false;
				this.cteScore.updWords(key, set);
					// この中は参照渡しとReq/Res型なので、更新確認は別にいらない
			}
			this.hPreWords[key] = (str === '||') ?`:${key}` :str;
		}
		if (eq) return;

		this.hFn2JumpSnippet = {};
		this.cnvSnippet = (s, cur_fn)=> {
			const bk = this.hPreWords['ジャンプ先'];

			const jsn = this.hFn2JumpSnippet[cur_fn];
			this.hPreWords['ジャンプ先'] = jsn ?? (()=> {
				if (typeof bk !== 'string') return 'ジャンプ先';
				let cur_sn = '';
				const sn = (bk.slice(1, -1) +',').replace(
					new RegExp(`fn=${cur_fn},(?:fn=${cur_fn} [^,|]+,)*`),
					m=> {cur_sn = m; return '';}
				)
				return this.hFn2JumpSnippet[cur_fn]
					= `|${(cur_sn + sn).slice(0, -1)}|`;
			})();

			const ret = s.replace(/{{([^\}]+)}}/g, (_, p)=> this.hPreWords[p]);

			this.hPreWords['ジャンプ先'] = bk;

			return ret;
		};
	}
	private	static readonly	sPredefWrtVar	=
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
sys:TextLayer.Back.Alpha`.replace(/\n/g, ',');


	private	nm2Diag	: {[url: string]: Diagnostic[]}= {};
	private	isDuplicateMacroDef		= false;
	private	wasDuplicateMacroDef	= false;
	hSn2aDsOutline	: {[sn: string]: DocumentSymbol[]}	= {};
	aDsOutline		: DocumentSymbol[];
	goAll() {
		this.isDuplicateMacroDef = false;
		this.hMacro = {};
		this.hMacroUse = {};
		this.hMacroUse4NoWarm = {};
		this.hTagMacroUse = {};
		for (const key in this.hSetWords) this.hSetWords[key] = new Set;
		this.clDiag.clear();
		this.nm2Diag = {};
		this.hScr2KeyWord = {};
		this.hSn2aDsOutline = {};

		treeProc(this.curPrj, url=> this.scanFile(Uri.file(url)));

		const mu = {...this.hMacroUse, ...this.hMacroUse4NoWarm};
		for (const def_nm in this.hMacro) {
			if (def_nm in mu) continue;

			const m = this.hMacro[def_nm];
			this.nm2Diag[m.loc.uri.path].push(new Diagnostic(
				m.loc.range,
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

		if (this.isDuplicateMacroDef && ! this.wasDuplicateMacroDef) window.showErrorMessage(`[SKYNovel] プロジェクト内でマクロ定義が重複しています。どちらか削除して下さい`, {modal: true});
		this.wasDuplicateMacroDef = this.isDuplicateMacroDef;

		this.bldCnvSnippet();
	}

	goFile(uri: Uri): void {
		this.goInitFile(uri);
		this.scanFile(uri);
		this.goFinishFile(uri);
	}
	private	hScr2KeyWord	: {[path: string]: Set<string>}	= {};
	goScriptSrc(aChgTxt: TextDocumentChangeEvent[]): void {
		const hDoc: {[path: string]: TextDocument} = {};
		const hUpdScore: {[path: string]: boolean} = {};
		aChgTxt.forEach(e=> {
			const doc = e.document;
			const path = doc.fileName;
			hDoc[path] = doc;
			if (path.slice(-4) !== '.ssn') return;

//console.log(`fn:ScriptScanner.ts line:217 goScriptSrc fn:${path}`);
			this.cteScore.separation(path);
			e.contentChanges.forEach(c=> {
				const sl = c.range.start.line;
				const el = c.range.end.line;
//console.log(`fn:ScriptScanner.ts line:222 * (${sl},${c.range.start.character})(${el},${c.range.end.character})=${c.text}=`);
				const text = (sl === el && c.text.slice(-1) !== '\n')
					? doc.lineAt(sl).text
					: c.text;
				hUpdScore[path] ||= this.cteScore.updLine(doc, c.range, text, this.resolveScript(text).aToken);
			});
			this.cteScore.combining(path);
		});

		for (const path in hDoc) {
			const doc = hDoc[path];
			const uri = doc.uri;
			this.goInitFile(uri);
			const old = this.hScr2KeyWord[path];
			this.hScr2KeyWord[path] = new Set;

			// TODO: （.snのみ）できれば差分更新したい
				// 内部辞書変更
				// 行増減考慮
			this.scanScriptSrc(uri, doc.getText(), hUpdScore[path]);

			this.goFinishFile(uri);
			// キーワード削除対応
			const now = this.hScr2KeyWord[path];
			for (const s of old) {
				if (now.has(s)) continue;
				let findOther = false;
				for (const path_other in this.hScr2KeyWord) {
					if (path_other === path) continue;
					if (findOther = this.hScr2KeyWord[path_other].has(s)) break;
				}
				if (findOther) continue;

				const a = s.split('\t');
				this.hSetWords[a[0]].delete(a[1]);
			}
		}
	}
	private goInitFile(uri: Uri) {
		// pathが同じ情報をクリア
		this.isDuplicateMacroDef = false;

		const path = uri.path;
		const hMD: {[nm: string]: MacDef} = {};
		const hMacroOld: {[nm: string]: MacDef} = {};
		for (const nm in this.hMacro) {
			const m = this.hMacro[nm];
			if (m.loc.uri.path !== path) hMD[nm] = m;
			else {hMacroOld[nm] = m; this.cteScore.undefMacro(nm);}
		}
		this.hMacro = hMD;
		this.hMacroOld = hMacroOld;
		this.aMacroAdd = [];

		const hMU: {[nm: string]: Location[]} = {};
		for (const nm in this.hMacroUse) this.hMacroUse[nm].forEach(loc=> {
			if (loc.uri.path != path) (hMU[nm] ??= []).push(loc);
		})
		this.hMacroUse = hMU;

		const hMU4NW: {[nm: string]: Location[]} = {};
		for (const nm in this.hMacroUse4NoWarm) this.hMacroUse4NoWarm[nm]
		.forEach(loc=> {
			if (loc.uri.path != path) (hMU4NW[nm] ??= []).push(loc);
		})
		this.hMacroUse4NoWarm = hMU4NW;

		this.hTagMacroUse[path] = [];
		this.clDiag.delete(uri);
		this.nm2Diag[path] = [];
	}
	private	hMacroOld	: {[nm: string]: MacDef}	= {};
	private	aMacroAdd	: string[]	= [];
	private	goFinishFile(uri: Uri) {
		const path = uri.path;
		const mu = {...this.hMacroUse, ...this.hMacroUse4NoWarm};
		for (const def_nm in this.hMacro) {
			if (def_nm in mu) continue;

			const m = this.hMacro[def_nm];
			if (m.loc.uri.path !== path) continue;	// 更新分のみ
			this.nm2Diag[path].push(new Diagnostic(
				m.loc.range,
				`未使用のマクロ[${def_nm}]があります`,
				DiagnosticSeverity.Information
			));
		}

		for (const use_nm in this.hMacroUse) {
			if (use_nm in this.hMacro) continue;
			if (use_nm in this.hPlugin) continue;

			const aLoc = this.hMacroUse[use_nm];
			aLoc.forEach(loc=> {
				if (loc.uri.path !== path) return;	// 更新分のみ
				this.nm2Diag[path].push(new Diagnostic(
					loc.range,
					`未定義マクロ[${use_nm}]を使用、あるいはスペルミスです`,
					DiagnosticSeverity.Warning
				))
			});
		}

		if (path.slice(-4) === '.ssn') {
			const doc = workspace.textDocuments.find(td=> td.fileName === uri.fsPath);
			if (doc) {
				const hMacroOld = this.hMacroOld;
				for (const nm in hMacroOld) {
					if (! (nm in this.hMacro)	// マクロ定義が削除された
					||	Object.entries(this.hMacro[nm].hPrm).sort().join()
					!==	Object.entries(hMacroOld[nm].hPrm).sort().join())
					// マクロ定義の引数が更新された
					this.hMacroUse[nm]?.forEach(loc=> {
						const txt =doc.lineAt(loc.range.start.line).text.trim();
						this.cteScore.updLine(
							doc,
							loc.range,
							txt,
							this.resolveScript(txt).aToken
						);	// 最新ssn定義で更新
					});
				}

				// 追加されたマクロ定義
				this.aMacroAdd.forEach(nm=> this.hMacroUse[nm]?.forEach(loc=> {
					const txt = doc.lineAt(loc.range.start.line).text.trim();
					this.cteScore.updLine(
						doc,
						loc.range,
						txt,
						this.resolveScript(txt).aToken,
					);
				}));
			}
		}

		this.clDiag.set(uri, this.nm2Diag[path]);	// 更新分のみ

		if (this.isDuplicateMacroDef && ! this.wasDuplicateMacroDef) window.showErrorMessage(`[SKYNovel] プロジェクト内でマクロ定義が重複しています。どちらか削除して下さい`, {modal: true});
		this.wasDuplicateMacroDef = this.isDuplicateMacroDef;

		this.bldCnvSnippet();
	}

	isSkipUpd(path: string): boolean {
		if (path.slice(-4) !== '.ssn') return false;
		return this.cteScore.isSkipUpd(path);
	}

	private	static	readonly	REG_SPRITE	= /\.(png|jpg|jpeg|json|svg|webp|mp4|webm)$/;	// https://regex101.com/r/DPaLv3/1
	private	static	readonly	REG_NOSPR	= /\/(path|prj)\.json$/;
		// https://regex101.com/r/DPaLv3/2
//	private	static	readonly	REG_FONT	= /\.(woff2|otf|ttf)$/;
	private	static	readonly	REG_SOUND	= /\.(mp3|m4a|ogg|aac|flac|wav)$/;
	private	static	readonly	REG_HTML	= /\.(htm|html)$/;
	private	scanFile(uri: Uri) {
		const path = uri.path;
		const fn = CmnLib.getFn(path);
		if (! REG_SCRIPT.test(path)) {
			if (ScriptScanner.REG_SPRITE.test(path)) {
				if (ScriptScanner.REG_NOSPR.test(path)) return;
				this.hSetWords['画像ファイル名'].add(fn);
			}
			else if (ScriptScanner.REG_SOUND.test(path)) {
				this.hSetWords['音声ファイル名'].add(fn);
			}
			else if (ScriptScanner.REG_HTML.test(path)) {
				this.hSetWords['HTMLファイル名'].add(fn);
			}
			return;
		}
		this.hSetWords['スクリプトファイル名'].add(fn);

		// goAll()で真っ先に通るので、goScriptSrc()では割愛
		this.nm2Diag[path] ??= [];
		this.hSetWords['ジャンプ先'].add(`fn=${fn}`);
		this.hTagMacroUse[path] ??= [];
		this.hScr2KeyWord[path] ??= new Set();

		const td = workspace.textDocuments.find(td=> td.fileName ===uri.fsPath);
		this.scanScriptSrc(
			uri,
			td?.getText() ?? fs.readFileSync(uri.fsPath, {encoding: 'utf8'}),
			true,
		);
	}

	private	readonly	cteScore	: CteScore;
	updPath(hPath: IFn2Path) {this.cteScore.updPath(hPath);}

	private			readonly	alzTagArg	= new AnalyzeTagArg;
	private	static	readonly	regValName
		= /(?<=name\s*=\s*)([^"'#;\]]+|(["'#])(.*?)\2)/m;
	private	scanScriptSrc(uri: Uri, src: string, isUpdScore: boolean) {
		const path = uri.path;
		const diags = this.nm2Diag[path];

		const hLabel: {[label_nm: string]: Range | null} = {};
			// ラベル重複チェック用
		const setKw = this.hScr2KeyWord[path];
			// キーワード削除チェック用
		this.aDsOutline = this.hSn2aDsOutline[path] = [];
		this.fncToken = this.procToken = (p: Pos, token: string)=> {
			const uc = token.charCodeAt(0);	// TokenTopUnicode
			const len = token.length;
			if (uc === 9) {p.col += len; return;}	// \t タブ
			if (uc === 10) {p.line += len; p.col = 0; return;}	// \n 改行
			if (uc === 38) {	// & 変数操作・変数表示
				p.col += len;
				if (token.substr(-1) === '&') return;
				//変数操作
				try {
					const o = ScriptScanner.splitAmpersand(token.slice(1));
					if (o.name.charAt(0) != '&') {
						const kw = o.name.trimEnd();
						this.hSetWords['代入変数名'].add(kw);
						setKw.add(`代入変数名\t${kw}`);
					}
				} catch {}
				return;
			}
			if (uc === 59) {p.col += len;	return;}	// ; コメント
			const rng = new Range(
				p.line, p.col,
				p.line, p.col +len
			);
			if ((uc === 42) && (token.length > 1)) {	// * ラベル
				p.col += len;

				const kw = `fn=${CmnLib.getFn(path)} label=${token}`;
				this.hSetWords['ジャンプ先'].add(kw);
				setKw.add(`ジャンプ先\t${kw}`);
				this.aDsOutline.push(new DocumentSymbol(token, '', SymbolKind.Key, rng, rng));
				if (token.charAt(1) === '*') return;	// 無名ラベルは除外

				if (token in hLabel) {
					const rng0 = hLabel[token];
					if (rng0) {
						diags.push(new Diagnostic(rng0, `同一スクリプトにラベル【${token}】が重複しています`, DiagnosticSeverity.Error));
						hLabel[token] = null;
					}
					diags.push(new Diagnostic(rng, `同一スクリプトにラベル【${token}】が重複しています`, DiagnosticSeverity.Error));
				}
				else hLabel[token] = rng;
				return;
			}
			if (uc !== 91) {	// 文字表示
				p.col += len;

				this.aDsOutline.push(new DocumentSymbol(token, '', SymbolKind.String, rng, rng));
				return;
			}

			// [ タグ開始
			const a_tag: any = ScriptScanner.REG_TAG.exec(token);
			if (! a_tag) {	// []、[ ]など
				diags.push(new Diagnostic(rng, `タグ記述【${token}】異常です`, DiagnosticSeverity.Error));
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
				if (lineTkn > 10) diags.push(new Diagnostic(new Range(
					rng.start.line, rng.start.character -1,
					p.line, 0
				), `改行タグが10行を超えています`, DiagnosticSeverity.Warning));
			}

			const use_nm = a_tag.groups.name;
			this.hTagMacroUse[path].push({nm: use_nm, rng:
				rng.with(undefined, new Position(p.line, p.col))
			});
			if (use_nm in this.hPlugin) return;

			const rng_nm = new Range(
				rng.start,
				rng.end.translate(0, a_tag.groups.name.length -len)
			);
			const rngp1 = new Range(
				rng_nm.start.translate(0, 1),
				rng_nm.end.translate(0, 1),
			);
			if (! (use_nm in this.hTag)) {
				const mu = this.hMacroUse[use_nm] ?? [];	// 使用箇所更新
				mu.push(new Location(uri, rngp1));
				this.hMacroUse[use_nm] = mu;
				return;
			}

			const fnc = this.hTagProc[use_nm];
			if (fnc) {
				this.alzTagArg.go(a_tag.groups.args);
				fnc(setKw, uri, token, rngp1, diags, p, lineTkn, rng_nm);
			}
		};

		const p = {line: 0, col: 0};
		const a = this.resolveScript(src.trim()).aToken;
		a.forEach(token=> {if (token) this.fncToken(p, token)});
		if (isUpdScore && path.slice(-4) === '.ssn') this.cteScore.updScore(path, this.curPrj, a);
	}
	private fncToken = this.procToken;
	private procToken(_p: Pos, _token: string) {}
	private	readonly	hTagProc: {[nm: string]: FncTagProc}	= {
		'let_ml': (setKw: Set<string>)=> {
			this.fncToken = (p, token)=> {
				const len2 = token.length;
				let lineTkn = 0;
				let j = -1;
				while ((j = token.indexOf('\n', j +1)) >= 0) ++lineTkn;
				if (lineTkn === 0) p.col += len2; else {
					p.line += lineTkn;
					p.col = len2 -token.lastIndexOf('\n') -1;
				}
				this.fncToken = this.procToken;
			};

			const v = this.alzTagArg.hPrm.name?.val;
			if (v && v.charAt(0) != '&') {
				setKw.add(`代入変数名\t${v}`);
				this.hSetWords['代入変数名'].add(v);
			}
		},

		'macro': (_setKw: Set<string>, uri: Uri, token: string, rngp1: Range, diags: Diagnostic[], p: Pos, lineTkn: number, rng_nm: Range)=> {	
			const hPrm = this.alzTagArg.hPrm;
			const def_nm = hPrm.name?.val;
			if (! def_nm) {	// [macro name=]など
				diags.push(new Diagnostic(rngp1, `マクロ定義[${def_nm}]の属性が異常です`, DiagnosticSeverity.Error));
				return;
			}

			if (this.hTag[def_nm]) {
				diags.push(new Diagnostic(rngp1, `定義済みのタグ[${def_nm}]と同名のマクロは定義できません`, DiagnosticSeverity.Error));
				return;
			}
			if (this.hPlugin[def_nm]) {
				diags.push(new Diagnostic(rngp1, `プラグイン定義済みのタグ[${def_nm}]と同名のマクロは定義できません`, DiagnosticSeverity.Error));
				return;
			}

			const m = this.hMacro[def_nm];
			if (! m) {	// 新規マクロ定義を登録
				const m2 = token.match(ScriptScanner.regValName);
				if (! m2) {	// 失敗ケースが思い当たらない
					diags.push(new Diagnostic(rngp1, `マクロ定義（[${def_nm}]）が異常です`, DiagnosticSeverity.Error));
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
					line2, col2 +def_nm.length,
				);
				this.hMacro[def_nm] = {
					loc: new Location(uri, rng2),
					hPrm: hPrm,
				};
				this.aMacroAdd.push(def_nm);

				const ds = new DocumentSymbol(def_nm, 'マクロ定義', SymbolKind.Class, rng2, rng2);
				this.aDsOutline.push(ds);
				this.aDsOutlineStack.push(this.aDsOutline);
				this.aDsOutline = ds.children;

				if ('nowarn_unused' in hPrm) {
					if (chkBoolean(hPrm.nowarn_unused.val)) this.hMacroUse4NoWarm[def_nm] = [new Location(uri, rng2)];
					else delete this.hMacroUse4NoWarm[def_nm];
				}
				if (uri.path.slice(-4) === '.ssn') {
					const o: {[k: string]: string} = {};
					for (const k in hPrm) o[k] = String(hPrm[k].val);
					this.cteScore.defMacro(def_nm, o);
				}

				return;
			}

			// すでに定義済みのマクロ
			this.isDuplicateMacroDef = true;
			if (! diags.find(d=> d.range === m.loc.range)) {
				// （走査上たまたまの）一つめ
				const dia = new Diagnostic(m.loc.range, `マクロ定義（[${def_nm}]）が重複`, DiagnosticSeverity.Error);
				if (m.loc.uri === uri) diags.push(dia);
				else this.clDiag.set(m.loc.uri, [dia]);
			}
			diags.push(new Diagnostic(	// （走査上たまたまの）二つめ以降
				rng_nm.with({end: new Position(p.line, p.col +def_nm.length)}),
				`マクロ定義（[${def_nm}]）が重複`,
				DiagnosticSeverity.Error
			));
		},
		'endmacro': ()=> this.aDsOutline = this.aDsOutlineStack.pop() ?? [],

		'if': (_setKw: Set<string>, _uri: Uri, token: string, rng: Range)=> {
			const ds = new DocumentSymbol(token, '', SymbolKind.Function, rng, rng);
			this.aDsOutline.push(ds);
			this.aDsOutlineStack.push(this.aDsOutline);
			this.aDsOutline = ds.children;
		},
		'elsif': (setKw: Set<string>, uri: Uri, token: string, rng: Range, diags: Diagnostic[], p: Pos, lineTkn: number, rng_nm: Range)=> {	
			this.hTagProc['if'](setKw, uri, token, rng, diags, p, lineTkn, rng_nm);

			this.aDsOutline = this.aDsOutlineStack.pop() ?? [];
		},
		//'else':  === elsif
		'endif': ()=> this.aDsOutline = this.aDsOutlineStack.pop() ?? [],

		's': (_setKw: Set<string>, _uri: Uri, token: string, rng: Range)=> {
			this.aDsOutline.push(new DocumentSymbol(token, '', SymbolKind.Function, rng, rng));
		},

		'let': (setKw: Set<string>)=> {
			const v = this.alzTagArg.hPrm.name?.val;
			if (v && v.charAt(0) != '&') {
				this.hSetWords['代入変数名'].add(v);
				setKw.add(`代入変数名\t${v}`);
			}
		},
		'add_frame': (setKw: Set<string>)=> {
			const v = this.alzTagArg.hPrm.id?.val;
			if (v && v.charAt(0) != '&') {
				this.hSetWords['フレーム名'].add(v);
				setKw.add(`フレーム名\t${v}`);
			}
		},
		'playbgm': (setKw: Set<string>)=> {
			this.hSetWords['サウンドバッファ'].add('BGM');
			setKw.add(`サウンドバッファ\tBGM`);
		},
		'playse': (setKw: Set<string>)=> {
			const v = this.alzTagArg.hPrm.buf?.val ?? 'SE';
			if (v && v.charAt(0) != '&') {
				this.hSetWords['サウンドバッファ'].add(v)};
				setKw.add(`サウンドバッファ\t${v}`);
		},
		'button': (setKw: Set<string>)=> {
			const c = this.alzTagArg.hPrm.clicksebuf?.val ?? 'SYS';
			if (c && c.charAt(0) != '&') {
				this.hSetWords['サウンドバッファ'].add(c)};
				setKw.add(`サウンドバッファ\t${c}`);
			const e = this.alzTagArg.hPrm.entersebuf?.val ?? 'SYS';
			if (e && e.charAt(0) != '&') {
				this.hSetWords['サウンドバッファ'].add(e)};
				setKw.add(`サウンドバッファ\t${e}`);
			const l = this.alzTagArg.hPrm.leavesebuf?.val ?? 'SYS';
			if (l && l.charAt(0) != '&') {
				this.hSetWords['サウンドバッファ'].add(l)};
				setKw.add(`サウンドバッファ\t${l}`);
		},
		'link': (setKw: Set<string>)=> {
			const c = this.alzTagArg.hPrm.clicksebuf?.val ?? 'SYS';
			if (c && c.charAt(0) != '&') {
				this.hSetWords['サウンドバッファ'].add(c)};
				setKw.add(`サウンドバッファ\t${c}`);
			const e = this.alzTagArg.hPrm.entersebuf?.val ?? 'SYS';
			if (e && e.charAt(0) != '&') {
				this.hSetWords['サウンドバッファ'].add(e)};
				setKw.add(`サウンドバッファ\t${e}`);
			const l = this.alzTagArg.hPrm.leavesebuf?.val ?? 'SYS';
			if (l && l.charAt(0) != '&') {
				this.hSetWords['サウンドバッファ'].add(l)};
				setKw.add(`サウンドバッファ\t${l}`);
		},
		'ch_in_style': (setKw: Set<string>)=> {
			const v = this.alzTagArg.hPrm.name?.val;
			if (v && v.charAt(0) != '&') {
				this.hSetWords['文字出現演出名'].add(v);
				setKw.add(`文字出現演出名\t${v}`);
			}
		},
		'ch_out_style': (setKw: Set<string>)=> {
			const v = this.alzTagArg.hPrm.name?.val;
			if (v && v.charAt(0) != '&') {
				this.hSetWords['文字消去演出名'].add(v);
				setKw.add(`文字消去演出名\t${v}`);
			}
		},
		'add_lay': (setKw: Set<string>)=> {
			const v = this.alzTagArg.hPrm.layer?.val;
			if (! v) return;

			this.hSetWords['レイヤ名'].add(v);
			setKw.add(`レイヤ名\t${v}`);
			const cls = this.alzTagArg.hPrm.class?.val;
			const kwn = `${cls === 'grp' ?'画像' :'文字'}レイヤ名`;
			this.hSetWords[kwn].add(v);
			setKw.add(`${kwn}\t${v}`);
		},
		'add_face': (setKw: Set<string>)=> {
			const v = this.alzTagArg.hPrm.name?.val;
			if (v && v.charAt(0) != '&') {
				this.hSetWords['差分名称'].add(v);
				setKw.add(`差分名称\t${v}`);
			}
		},
	};
	private	readonly	aDsOutlineStack		: DocumentSymbol[][]	= [];


	private	static	splitAmpersand(token: string): {
		name: string;
		text: string;
		cast: string | null;
	} {
		const equa = token.replace(/==/g, '＝').replace(/!=/g, '≠').split('=');
			// != を弾けないので中途半端ではある
		const cnt_equa = equa.length;
		if (cnt_equa < 2 || cnt_equa > 3) throw '「&計算」書式では「=」指定が一つか二つ必要です';
		if (equa[1].charAt(0) === '&') throw '「&計算」書式では「&」指定が不要です';
		return {
			name: equa[0].replace(/＝/g, '==').replace(/≠/g, '!='),
			text: equa[1].replace(/＝/g, '==').replace(/≠/g, '!='),
			cast: ((cnt_equa === 3) ?equa[2].trim() :null)
		};
	}

	private	static	readonly REG_TAG_LET_ML	= /^\[let_ml\s/g;
	private resolveScript(txt: string): Script {
		const a = txt
			.replace(/(\r\n|\r)/g, '\n')
			.match(this.REG_TOKEN) ?? [];
		for (let i=a.length -1; i>=0; --i) {
			const t = a[i];
			if (ScriptScanner.REG_TAG_LET_ML.test(t)) {
				const idx = t.indexOf(']') +1;
				if (idx === 0) throw '[let_ml]で閉じる【]】がありません';
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

	// 47 match 959 step (1ms) https://regex101.com/r/TKk1Iz/4
	static	readonly	REG_TAG	= /\[(?<name>[^\s;\]]+)\s*(?<args>(?:[^"'#\]]+|(["'#]).*?\3)*?)]/;

	static	analyzTagArg = (token: string)=> ScriptScanner.REG_TAG.exec(token);
	analyzToken(token: string): RegExpExecArray | null {
		this.REG_TOKEN.lastIndex = 0;	// /gなので必要
		return this.REG_TOKEN.exec(token);
	}

	// =============== Grammar
	private	REG_TOKEN	: RegExp;
	setEscape(ce: string) {
	//	if (this.hC2M && (ce in this.hC2M)) throw '[エスケープ文字] char【'+ ce +'】が登録済みの括弧マクロまたは一文字マクロです';

		// 1059 match 13935 step (8ms) https://regex101.com/r/ygXx16/6
		this.REG_TOKEN = new RegExp(
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

		this.goAll();
	}
}
