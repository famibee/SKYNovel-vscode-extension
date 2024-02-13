/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2024 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {treeProc, foldProc, replaceFile, REG_IGNORE_SYS_PATH, is_win, docsel, getFn, chkBoolean, v2fp, REG_SCRIPT} from './CmnLib';
import {PrjSetting} from './PrjSetting';
import {Encryptor, ab2hexStr, encStrBase64} from './Encryptor';
import {ActivityBar, eTreeEnv, getNonce} from './ActivityBar';
import {EncryptorTransform} from './EncryptorTransform';
import {PrjTreeItem, TREEITEM_CFG, PrjBtnName, TASK_TYPE, statBreak} from './PrjTreeItem';
import {aPickItems, QuickPickItemEx, openURL} from './WorkSpaces';
import {Config, SysExtension} from './Config';
import {SEARCH_PATH_ARG_EXT, IFn2Path} from './ConfigBase';

import {ExtensionContext, workspace, Disposable, tasks, Task, ShellExecution, window, Uri, Range, WorkspaceFolder, TaskProcessEndEvent, ProgressLocation, TreeItem, EventEmitter, ThemeIcon, debug, DebugSession, env, TaskExecution, languages, Diagnostic, DiagnosticSeverity, QuickPickItemKind, TextDocument, EvaluatableExpression, Position, ProviderResult, Hover, MarkdownString, DocumentDropEdit, SnippetString, WorkspaceEdit, commands, RelativePattern, ViewColumn, WebviewPanel} from 'vscode';
import {closeSync, createReadStream, createWriteStream, ensureDir, existsSync, openSync, outputFile, outputJson, readFileSync, readJsonSync, readSync, remove, removeSync, writeJsonSync, copy, readJson, ensureFile, copyFile, statSync, writeFile} from 'fs-extra';
import {extname, resolve} from 'path';
import img_size from 'image-size';
import {webcrypto, randomUUID, getRandomValues} from 'crypto';	// 後ろ二つはここでないとerr
const {subtle} = webcrypto;	// https://github.com/nodejs/node/blob/dae283d96fd31ad0f30840a7e55ac97294f505ac/doc/api/webcrypto.md
import * as crc32 from 'crc-32';
import * as archiver from 'archiver';
import {basename, dirname} from 'path';
import {execSync} from 'child_process';
import * as ncu from 'npm-check-updates';
import {userInfo} from 'os';


type BtnEnable = '_off'|'Stop'|'';
type PluginDef = {
	uri: string, sl: number, sc: number, el: number, ec: number,
};

		const	FLD_CRYPT_PRJ	= 'crypto_prj';
export	const	FLD_PRJ_BASE	= 'prj_base';

// フォントと使用文字情報
export type TFONT2STR = {
	[font_nm: string]: string;
};
type TFONT_ERR = {
	err	: string;
	nm	: string;
	sl	: number;
	sc	: number;
	el	: number;
	ec	: number;
};
export type TINF_INTFONT = {
	defaultFontName	: string;
	hSn2Font2Str	: {[sn: string]: TFONT2STR};
	hFp2FontErr		: {[fp: string]: TFONT_ERR[]}
};

export type T_QuickPickItemEx = {label: string, description: string, uri: string};


export type T_Ext2Snip = [SEARCH_PATH_ARG_EXT, string];
export type T_aExt2Snip = T_Ext2Snip[];


export class Project {
	readonly	#PATH_WS;
	readonly	#PATH_PRJ;
	readonly	#LEN_PATH_PRJ;

	readonly	#PATH_PLG;

	readonly	#PATH_PRJ_BASE;

	readonly	#PATH_CRYPT;
	#isCryptoMode	= false;
	readonly	#REG_NEEDCRYPTO		= /\.(ss?n|json|html?|jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv|html?)$/;
	readonly	#REG_FULLCRYPTO		= /\.(sn|ssn|json|html?)$/;
	readonly	#REG_REPPATHJSON	= /\.(jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)/g;

	readonly	#encry;

	readonly	#aFSW	: Disposable[];

	readonly	#fnDiff	: string;
				#hDiff	: {[fn: string]: {
		hash: number,	// ファイル変更検知ハッシュ
		cn	: string,	// ファイル名匿名化辞書
	}}	= Object.create(null);


	static	readonly #idxDevSnUpd	= 0;
	static	readonly #idxDevCrypto	= 3;
	private	dspCryptoMode() {}		// 暗号化状態

	readonly	#aTiFlat: TreeItem[]	= [];
	enableBtn(enabled: boolean): void {
		if (enabled) for (const ti of this.#aTiFlat) {
			ti.contextValue = ti.contextValue?.trimEnd();
			this.emPrjTD.fire(ti);
		}	// 値を戻してボタン表示
		else for (const ti of this.#aTiFlat) {
			ti.contextValue += ' ';
			this.emPrjTD.fire(ti);
		}	// 値を壊してボタン消去
	}

	readonly	#sendRequest2LSP: (cmd: string, o?: any)=> void;

	readonly	#clDiag;

	readonly	#cfg;

	readonly	#localExtensionResRoots: Uri;
	readonly	#htmOpFolder;


	constructor(private readonly ctx: ExtensionContext, private readonly actBar: ActivityBar, private readonly wsFld: WorkspaceFolder, readonly aTiRoot: TreeItem[], private readonly emPrjTD: EventEmitter<TreeItem | undefined>, private readonly hOnEndTask: Map<TASK_TYPE, (e: TaskProcessEndEvent)=> void>, readonly sendRequest2LSP: (cmd: string, uriWs: Uri, o?: any)=> void) {
		const vfp = wsFld.uri.path;
		this.#PATH_WS = v2fp(vfp);
		this.#PATH_PRJ = this.#PATH_WS +'/doc/prj/';
		this.#LEN_PATH_PRJ = this.#PATH_PRJ.length;
//console.log(`020 fn:Project.ts construct #PATH_WS=${this.#PATH_WS}=`);
		this.#PATH_PLG = this.#PATH_WS +'/core/plugin/';
		ensureDir(this.#PATH_PLG);	// 無ければ作る

		this.#PATH_PRJ_BASE = this.#PATH_WS +`/doc/${FLD_PRJ_BASE}/`;
		this.#sendRequest2LSP = (cmd, o = {})=> sendRequest2LSP(cmd, wsFld.uri, o);

		const path_view_root = ctx.extensionPath +'/views/';
		this.#localExtensionResRoots = Uri.file(path_view_root);
		this.#htmOpFolder = readFileSync(
			path_view_root +'folder.htm', {encoding: 'utf8'}
		)
		.replace('<meta_autooff ', '<meta ')// ローカルデバッグしたいので
		.replaceAll('${nonce}', getNonce())
		.replace('.ts"></script>', '.js"></script>');

		const pti = PrjTreeItem.create(ctx, wsFld, (ti, btn_nm, cfg)=> this.#onBtn(ti, btn_nm, cfg));
		aTiRoot.push(pti);

		// 暗号化処理
		this.#PATH_CRYPT = this.#PATH_WS +`/doc/${FLD_CRYPT_PRJ}/`;
		this.#isCryptoMode = existsSync(this.#PATH_CRYPT);
		const fnPass = this.#PATH_WS +'/pass.json';
		const exists_pass = existsSync(fnPass);
		this.#encry = new Encryptor(exists_pass
			? readJsonSync(fnPass, {throws: false})
			: {
				pass	: randomUUID(),
				salt	: ab2hexStr(getRandomValues(new Uint32Array(128 / 8))),
				iv		: ab2hexStr(getRandomValues(new Uint32Array(128 / 8))),
				keySize	: String(512 / 32),
				ite		: 500 + Math.floor(new Date().getTime() %300),
				stk		: ab2hexStr(getRandomValues(new Uint32Array(128 / 8))),
			}, subtle);
		if (! exists_pass) outputFile(fnPass, this.#encry.strHPass);

		try {
			this.#fnDiff = this.#PATH_WS +'/core/diff.json';
			if (existsSync(this.#fnDiff)) this.#hDiff = readJsonSync(this.#fnDiff);
		} catch (e) {this.#hDiff = Object.create(null);}	// diff破損対策

		// プロジェクト管理系
		const sr = new SysExtension({cur: this.#PATH_PRJ, crypto: this.#isCryptoMode, dip: ''});
		this.#cfg = new Config(sr, this.#encry);

		this.#ps = new PrjSetting(
			ctx,
			wsFld,
			this.#cfg,
			title=> {
				pti.label = title;
				emPrjTD.fire(pti);
			},
			()=> sendRequest2LSP('def_esc.upd', wsFld.uri),
			(nm, val)=> this.#cmd(nm, val),
			(nm, arg)=> this.#exeTask(nm, arg),
		);
		this.#initCrypto();

		// updPlugin で goAll() が走る
		const firstInit = ! existsSync(this.#PATH_WS +'/node_modules');
		if (firstInit) {
			this.#updPlugin();
			if (ActivityBar.aReady[eTreeEnv.NPM]) window.showInformationMessage('初期化中です。ターミナルの処理が終わって止まるまでしばらくお待ち下さい。', {modal: true});
		}
		else this.#updPlugin(false);

		// ファイル増減を監視し、path.json を自動更新など各種処理
			// 第一引数は new RelativePattern() 必須とする。win対応にも
		const fwPrj = workspace.createFileSystemWatcher(
			new RelativePattern(wsFld, `doc/{prj,${FLD_PRJ_BASE}}/*/**/*.[a-zA-Z][a-zA-Z0-9]*`)
		);	// sn,jpen,png などの他に woff2,mp3,m4a
		const fwPrjJs = workspace.createFileSystemWatcher(
			new RelativePattern(wsFld, 'doc/prj/prj.json')
		);
		// prjルートフォルダ監視
		const fwFld = workspace.createFileSystemWatcher(
			new RelativePattern(wsFld, 'doc/prj/[a-zA-Z0-9]*')
		);	// '.' 始まりフォルダを除外

		const regSetting = new RegExp(`^${wsFld.uri.path}\/doc\/prj\/.+\/setting.sn$`);	// 最適化変換対象


		const hFld2hFile: {[fld_nm: string]: {[fp: string]: 0}} = {};
		foldProc(this.#PATH_PRJ, ()=> {}, fld_nm=> {
			hFld2hFile[fld_nm] = {};

			foldProc(resolve(this.#PATH_PRJ, fld_nm), (vfp, _nm)=> {
				const fp = v2fp(Uri.file(vfp).path);
				hFld2hFile[fld_nm][fp] = 0;
			}, ()=> {});
		});

		const REG_CnvGrp = /\.(jpg|jpeg|png|webp)$/;		// 最適化変換対象
			// 2 matches (56 steps, 0.1ms) https://regex101.com/r/bAB2wH/1
		const REG_CnvSnd = /\.(mp3|wav|m4a|aac|ogg)$/;
		const onDidDelete = async (uri: Uri)=> {
//console.log(`fn:Project.ts fwPrj DEL path=${uri.path}=`);
			if (REG_CnvGrp.test(uri.path)) {
				if (uri.path.slice(0, this.#LEN_PATH_PRJ) === this.#PATH_PRJ
				&& (! this.#ps.oWss['cnv.mat.pic'] || REG_CnvGrpOut.test(uri.path))) {
					const {pathCn} = this.#path2cn(uri.path);
					if (pathCn) remove(pathCn);
				}
				if (this.#preventFileWatch) return;

				this.#chkWVFolder(uri, 'DEL');
				await this.#ps.onDelOptPic(uri);
				this.#updPathJson();
				return;
			}
			if (REG_CnvSnd.test(uri.path)) {
				if (uri.path.slice(0, this.#LEN_PATH_PRJ) === this.#PATH_PRJ
				&& (! this.#ps.oWss['cnv.mat.snd'] || REG_CnvSndOut.test(uri.path))) {
					const {pathCn} = this.#path2cn(uri.path);
					if (pathCn) remove(pathCn);
				}
				if (this.#preventFileWatch) return;

				this.#chkWVFolder(uri, 'DEL');
				await this.#ps.onDelOptSnd(uri);
				this.#updPathJson();
				return;
			}
			if (regSetting.test(uri.path)) {
				this.#ps.onDelSettingSn(uri);
				this.#updPathJson();
				return;
			}
			if (REG_IGNORE_SYS_PATH.test(uri.path)) return;
			if (uri.path.slice(0, this.#LEN_PATH_PRJ) !== this.#PATH_PRJ) return;

			// Del
			const {pathCn, pp} = this.#path2cn(uri.path);
			if (pathCn) remove(pathCn);
	
			delete this.#hDiff[pp];
			this.#updDiffJson();
	
			this.#updPathJson();
		};
		const REG_CnvGrpOut = /\.(webp)$/;			// 最適化変換後
		const REG_CnvSndOut = /\.(m4a|aac|ogg)$/;
		this.#aFSW = [
			fwPrj.onDidCreate(async uri=> {	// フォルダごと追加でも発生する（こちらが先）
//console.log(`fn:Project.ts fwPrj CRE path=${uri.path}=`);
				const fp = v2fp(uri.path);
				const pp = this.#fp2pp(fp);
				const fld_nm = dirname(pp);
				(hFld2hFile[fld_nm] ??= {})[fp] = 0;

				if (REG_CnvGrp.test(uri.path)) {
					// base_prj（最適化前の素材）や、最適化有効時の素材ファイルdropは暗号化しない
					if (uri.path.slice(0, this.#LEN_PATH_PRJ) === this.#PATH_PRJ
					&& (! this.#ps.oWss['cnv.mat.pic'] || REG_CnvGrpOut.test(uri.path))) this.#encIfNeeded(uri);
					if (this.#preventFileWatch) return;

					this.#chkWVFolder(uri, 'CRE');
					await this.#ps.onCreChgOptPic(uri);
					this.#updPathJson();
					return;
				}
				if (REG_CnvSnd.test(uri.path)) {
					// base_prj（最適化前の素材）や、最適化有効時の素材ファイルdropは暗号化しない
					if (uri.path.slice(0, this.#LEN_PATH_PRJ) === this.#PATH_PRJ
					&& (! this.#ps.oWss['cnv.mat.snd'] || REG_CnvSndOut.test(uri.path))) this.#encIfNeeded(uri);
					if (this.#preventFileWatch) return;

					this.#chkWVFolder(uri, 'CRE');
					await this.#ps.onCreChgOptSnd(uri);
					this.#updPathJson();
					return;
				}
				if (regSetting.test(uri.path)) {
					this.#ps.onCreSettingSn(uri);
					this.#encIfNeeded(uri);
					this.#updPathJson();
					return;
				}
				if (REG_IGNORE_SYS_PATH.test(uri.path)) return;
				if (uri.path.slice(0, this.#LEN_PATH_PRJ) !== this.#PATH_PRJ) return;

				// Cre
				this.#encIfNeeded(uri);
				this.#updPathJson();
			}),
			fwPrj.onDidChange(async uri=> {
//console.log(`fn:Project.ts fwPrj CHG path=${uri.path}=`);
				if (REG_CnvGrp.test(uri.path)) {
					// base_prj（最適化前の素材）や、最適化有効時の素材ファイルdropは暗号化しない
					if (uri.path.slice(0, this.#LEN_PATH_PRJ) === this.#PATH_PRJ
					&& (! this.#ps.oWss['cnv.mat.pic'] || REG_CnvGrpOut.test(uri.path))) this.#encIfNeeded(uri);
					if (this.#preventFileWatch) return;

					this.#chkWVFolder(uri, 'CHG');
					await this.#ps.onCreChgOptPic(uri);
					return;
				}
				if (REG_CnvSnd.test(uri.path)) {
					// base_prj（最適化前の素材）や、最適化有効時の素材ファイルdropは暗号化しない
					if (uri.path.slice(0, this.#LEN_PATH_PRJ) === this.#PATH_PRJ
					&& (! this.#ps.oWss['cnv.mat.snd'] || REG_CnvSndOut.test(uri.path))) this.#encIfNeeded(uri);
					if (this.#preventFileWatch) return;

					this.#chkWVFolder(uri, 'CHG');
					await this.#ps.onCreChgOptSnd(uri);
					return;
				}
				if (regSetting.test(uri.path)) {
				//	this.#ps.onChgSettingSn(uri);	// ここでやると変更が戻るループ
					this.#encIfNeeded(uri);
					return;
				}
				if (REG_IGNORE_SYS_PATH.test(uri.path)) return;
				if (uri.path.slice(0, this.#LEN_PATH_PRJ) !== this.#PATH_PRJ) return;

				// Chg
				this.#encIfNeeded(uri);
			}),
			fwPrj.onDidDelete(uri=> onDidDelete(uri)),
				// フォルダごと削除すると、発生しない！

			fwPrjJs.onDidChange(uri=> this.#encIfNeeded(uri)),

			fwFld.onDidCreate(uri=> {
				if (! statSync(uri.path).isDirectory()) return;
//console.log(`fn:Project.ts fwFld CRE:${uri.path.slice(this.#LEN_PATH_PRJ)}:`);

				this.#ps.onCreDir(uri);
			}),
			/*fwFld.onDidChange(uri=> {
				// フォルダ名では Change が発生せず、Cre → Del。fwPrj は「発生しない」
				// path.json, prj.json のみ発生する
			}),*/
			fwFld.onDidDelete(uri=> {
				//if (! statSync(uri.path).isDirectory()) return;
					// すでに削除されてしまっているので

				const fld_nm = uri.path.slice(this.#LEN_PATH_PRJ);
//console.log(`fn:Project.ts fwFld DEL:${fld_nm}:`);
				for (const fp of Object.keys(hFld2hFile[fld_nm])) onDidDelete(Uri.file(fp));
				delete hFld2hFile[fld_nm];

				if (this.#isCryptoMode) removeSync(this.#PATH_CRYPT + fld_nm);
				removeSync(this.#PATH_PRJ_BASE + fld_nm);

				if (this.#pnlWVFolder) {
					this.#pnlWVFolder?.dispose();
					this.#pnlWVFolder = undefined;
					this.#uriOpFolder = null;
				}

				this.#ps.onDelDir(uri)
			}),
		];

		const aTi = pti.children;
		const aC = (aTi[aTi.length -1] as PrjTreeItem).children;
		this.#aTiFlat = [...aTi.slice(0, -1), ...aC];
		const tiDevSnUpd = aTi[Project.#idxDevSnUpd];
		this.getLocalSNVer = ()=> {
			const o = this.#ps.getLocalSNVer();
			tiDevSnUpd.description = o.verSN
			? `-- ${o.verSN}`+ (o.verTemp ?` - ${o.verTemp}` :'')
			: '取得できません';
			emPrjTD.fire(tiDevSnUpd);
			return o;
		};
		if (! firstInit) actBar.chkLastSNVer([this.getLocalSNVer()]);

		const tiDevCrypto = aTi[Project.#idxDevCrypto];
		this.dspCryptoMode = ()=> {
			tiDevCrypto.description = `-- ${this.#isCryptoMode ?'する' :'しない'}`
			emPrjTD.fire(tiDevCrypto);
		};
		this.dspCryptoMode();


		debug.onDidTerminateDebugSession(_=> this.#onDidTermDbgSS());
		debug.onDidStartDebugSession(ds=> this.#aDbgSS.push(ds));

		// デバッグ中のみ有効なホバー
		ctx.subscriptions.push(languages.registerEvaluatableExpressionProvider(docsel, {
			provideEvaluatableExpression(doc: TextDocument, pos: Position): ProviderResult<EvaluatableExpression> {
				const r = doc.getWordRangeAtPosition(pos, Project.#REG_VAR);
				if (! r) return Promise.reject('No word here.');

				const txt = doc.getText(r);
				const hc = txt.at(0);
				if (hc === '[' || hc === '*' || hc === ';'
				|| txt.at(-1)=== '=') return Promise.reject('No word here.');
				return new EvaluatableExpression(r, txt);
			},
		}));

		const {username} = userInfo();
		this.#aPlaceFont	= [
			`${this.#PATH_WS}/core/font`,
			is_win
				? `C:/Users/${username}/AppData/Local/Microsoft/Windows/Fonts`
				: `/Users/${username}/Library/Fonts`,
			is_win
				? 'C:/Windows/Fonts'
				: '/Library/Fonts',
		];

		// 診断機能
		this.#clDiag = languages.createDiagnosticCollection(docsel.language);

		// use #encry、開かれる前にファイル追加・削除の対応
		this.#basePathJson()
		.then(()=> this.#sendRequest2LSP('ready'));
	}

		#path2cn(fp: string) {
			fp = v2fp(Uri.file(fp).path);
			const pp = this.#fp2pp(fp);
			const diff = this.#hDiff[pp];
			return {
				pathCn: diff
					? fp.replace(this.#REG_path2cn, `/${FLD_CRYPT_PRJ}/${diff.cn}`)
					: undefined,
				diff,
				pp,
			};
		}
		readonly	#REG_path2cn = new RegExp(`\\/(${FLD_PRJ_BASE}|prj)\\/.+$`);
		readonly	#REG_fp2pp	= new RegExp(`^.+\\/(${FLD_PRJ_BASE}|prj)\\/`);
		#fp2pp(fp: string): string {return fp.replace(this.#REG_fp2pp, '')}

	static	readonly	#REG_VAR	= /;.+|[\[*]?[\d\w\.]+=?/;
	// https://regex101.com/r/G77XB6/3 20 match, 188 step(~1ms)

	readonly	getLocalSNVer	: ()=> {verSN: string, verTemp: string};
				#aDbgSS			: DebugSession[]	= [];
	#onDidTermDbgSS = ()=> {}

	readonly	#ps;

	dispose() {for (const f of this.#aFSW) f.dispose();}


	#termDbgSS(): Promise<PromiseSettledResult<void>[]> {
		this.#hTaskExe.get('TaskWeb')?.terminate();
		this.#hTaskExe.delete('TaskWeb');
		this.#hTaskExe.get('TaskApp')?.terminate();
		this.#hTaskExe.delete('TaskApp');

		const a = this.#aDbgSS.map(ds=> debug.stopDebugging(ds));
		this.#aDbgSS = [];
		return Promise.allSettled(a);
	}


	// LSP
	onRequest(hd: any) {
		switch (hd.cmd) {
			case 'init':{
				const pp2s: {[pp: string]: string} = {};
				treeProc(this.#PATH_PRJ, fp=> {
					if (! /\.(ss?n|json)$/.test(fp)) return;

					fp = v2fp(Uri.file(fp).path);
					// まだセーブしてない Dirty状態の場合があるので doc優先
					const td = workspace.textDocuments.find(v=> v2fp(v.uri.path) === fp);
					const pp = fp.slice(this.#LEN_PATH_PRJ);
					pp2s[pp] = (REG_SCRIPT.test(fp) ?td?.getText() :undefined)
						?? readFileSync(fp, {encoding: 'utf8'});
				});
				this.#sendRequest2LSP(hd.cmd +'.res', {pp2s, hDefPlg: this.#hDefPlg,});
			}	break;

			case 'analyze_inf':{
				this.#aPickItems = [
					...aPickItems,

					{kind: QuickPickItemKind.Separator, label: ''},

					...(<T_QuickPickItemEx[]>hd.o.aQuickPickMac)
					.map(({label, description, uri})=> ({
						label, description, uri: Uri.parse(uri),
					})),

					{kind: QuickPickItemKind.Separator, label: ''},

					...(<T_QuickPickItemEx[]>hd.o.aQuickPickPlg)
					.map(({label, description, uri})=> ({
						label, description, uri: Uri.parse(uri),
					})),
				];

				this.#InfFont = hd.o.InfFont;

				this.#mExt2Snip = new Map(<T_aExt2Snip>hd.o.aExt2Snip);
//console.log(`fn:Project.ts mExt2Snip ${JSON.stringify(<T_aExt2Snip>hd.o.aExt2Snip)}`);

				this.#clDiag.clear();
				for (const [fp, a] of Object.entries(this.#InfFont.hFp2FontErr)) {
					const aD: Diagnostic[] = [];
//console.log(`080 fn:Project.ts analyze_inf uri:${uri}:`);
					for (const {err, nm, sl, sc, el, ec} of a) {
						if (this.#getFontNm2path(nm)) continue;

						aD.push(new Diagnostic(
							new Range(sl, sc, el, ec), err,
							DiagnosticSeverity.Error,
						));
					}
					this.#clDiag.set(Uri.file(fp), aD);
				}

				this.#basePathJsonAfter = ()=> this.#sendRequest2LSP('credel_sn');
			}	break;

			case 'hover.res':	{
				const {path} = Uri.parse(hd.o?.uri);
//console.log(`fn:Project.ts hover.res path:${path}: hd.o=${JSON.stringify(hd.o)}`);
				this.#hPath2Proc[path]?.(hd.o);
			}	break;
		}
	}

	#hPath2Proc: {[path: string]: (o: any)=> void}	= {};
	provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
		const vfp = doc.uri.path;
		return new Promise<Hover>((rs, rj)=> {
			// ホバーイベントを伝え、文字列加工だけ任せ文字列を返してもらい、ここで表示
			this.#hPath2Proc[vfp] = o=> {
//console.log(`fn:Project.ts Hover OK! o:${JSON.stringify(o)}:`);
				delete this.#hPath2Proc[vfp];

				let v = String(o.value);
				if (v === 'undefined') {rj(); return;}

				const a = v.split(/(?=\n---\n)/);
				if (a.length === 3) {
					// 中央部分のみ置換。SQLジャンクション的なものの対策
					const [args, ...detail] = a;
					v = args + detail.join('').replaceAll(
						/<!-- ({.+?}) -->/g,
						(_, e1)=> {
	const o = JSON.parse(e1);
	const {name, val} = o;
	const ppImg = this.#cfg.searchPath(val, SEARCH_PATH_ARG_EXT.SP_GSM);

	const vfpImg = this.#vpPrj + ppImg;
	const srcEx = `${vfpImg}|width=${this.#whThumbnail}|height=${this.#whThumbnail}`;
	const {width = 0, height = 0} = img_size(this.#PATH_PRJ + ppImg);
	const exImg = encodeURIComponent(JSON.stringify([Uri.parse(vfpImg)]));
//	const timestamp = new Date().getTime();
//console.log(`fn:Project.ts line:531 timestamp:${timestamp}`);

	return `- ${name} = ${val} (${width}x${height}) ${
		`[ファイルを見る](${vfpImg} "ファイルを見る")`
	} [サイドバーに表示](${
		Uri.parse(`command:revealInExplorer?${exImg}`)
	} "サイドバーに表示")
	[フォルダを開く](${
		Uri.parse(`command:revealFileInOS?${exImg}`)
	} "フォルダを開く")  \n`
//	+ `<img src="${vfpImg}?t=${timestamp}" title="${val}" width="${this.#whThumbnail}" height="${this.#whThumbnail *height /width}">`;
		// TODO: 画像ファイルを更新してもサムネイルが更新されない
//	+ `![${val}](${srcEx}?t=${timestamp} "${val}")`;
	+ `![${val}](${srcEx} "${val}")`;
						}
					);
				}

				const ms = new MarkdownString(v);
				ms.isTrusted = true;
			//	ms.supportHtml = true;
				rs(new Hover(ms));
			};
			this.#sendRequest2LSP('hover', {uri: doc.uri.toString(), pos});
				// 【file:///Users/...】 LSPの doc 特定で使う
		});
	}
	get	#vpPrj(): string {return this.wsFld.uri.toString() +'/doc/prj/'}
		readonly	#whThumbnail = 200;

	#getFontNm2path(font_nm: string): string {
		for (const base of this.#aPlaceFont) {
			for (const ext of ['woff2','otf','ttf']) {
				const path = `${base}/${font_nm}.${ext}`;
				if (existsSync(path)) return path;
			}
		}
		return '';
	};
	#InfFont	: TINF_INTFONT	= {	// フォントと使用文字情報
		defaultFontName	: '',
		hSn2Font2Str	: {},
		hFp2FontErr		: {},
	};
	readonly	#aPlaceFont;


	#aPickItems	: QuickPickItemEx[] = [];
	openReferencePallet() {
		window.showQuickPick<QuickPickItemEx>(this.#aPickItems, {
			placeHolder			: 'どのリファレンスを開きますか?',
			matchOnDescription	: true,
		})
		.then(q=> {if (q?.uri) openURL(q.uri, this.#PATH_WS);});
	}


	opView(uri: Uri) {
		const vfp = uri.path;
		const fp = v2fp(vfp);
		if (fp === this.#PATH_PRJ +'prj.json') {this.#ps.open(); return;}

		this.#opFolder(uri);
	}
	#opFolder(uri: Uri) {
		// フォルダビュー
		const column = window.activeTextEditor?.viewColumn;
		const wp = this.#pnlWVFolder;
		if (this.#uriOpFolder === uri && wp) {wp.reveal(column); return;}

		if (! wp) {
			const wp = this.#pnlWVFolder = window.createWebviewPanel('SKYNovel-folder', '', column || ViewColumn.One, {
				enableScripts		: true,
			//	retainContextWhenHidden: true,// 楽だがメモリオーバーヘッド高らしい
				localResourceRoots	: [
					this.#localExtensionResRoots,
					Uri.file(this.#PATH_WS),
				],
			});
			const wv = wp.webview;
			this.ctx.subscriptions.push(
				wp.onDidDispose(()=> this.#pnlWVFolder = undefined, undefined, this.ctx.subscriptions),	// 閉じられたとき

				wv.onDidReceiveMessage(m=> {switch (m.cmd) {
					case 'info': window.showInformationMessage(m.text); break;
					case 'warn': window.showWarningMessage(m.text); break;
				}}, false),
			);

			wv.html = this.#htmOpFolder
				.replaceAll('${webview.cspSource}', wv.cspSource)
				.replaceAll(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(this.#localExtensionResRoots)}/`)
				.replace(/<!--SOL-->.+?<!--EOL-->/s, '');
					// https://regex101.com/r/8RaTsD/1
		}
		this.#uriOpFolder = uri;

		this.#updWVFolder(uri);
	}
		#pnlWVFolder	: WebviewPanel | undefined	= undefined;
		#uriOpFolder	: Uri | null				= null;
		#uriWvPrj		: Uri | null				= null;

	#updWVFolder(uri: Uri) {
		const vfp = uri.path;
		const fp = v2fp(vfp);
		const pp = this.#fp2pp(fp);
		this.#pnlWVFolder!.title = pp +' フォルダ';

		let htm = '';
		const wv = this.#pnlWVFolder!.webview;
		this.#uriWvPrj = wv.asWebviewUri(Uri.file(this.#PATH_PRJ));
		foldProc(fp, (vfp2, nm)=> {
			const fp2 = v2fp(Uri.file(vfp2).path);
			const pp2 = this.#fp2pp(fp2);
			if (this.#regWVFolderMov.test(fp2)) {	// GrpよりMovを先に
				htm +=
`<div class="col pe-0">
	<div class="card text-bg-secondary">
		<video controls controlsList="nodownload" playsinline preload="metadata" class="w-100" src="${this.#uriWvPrj}${pp2}" class="card-img-top"></video>
		<div class="card-body">
			<a href="${this.#uriWvPrj}${pp2}" title="エディタにドラッグできます" class="btn btn-primary" title="エディタにドラッグできます">${nm}</a>
		</div>
	</div>
</div>`;
				return;
			}

			if (this.#regWVFolderGrp.test(pp2)) {
				htm +=
`<div class="col pe-0">
	<img loading="lazy" src="${this.#uriWvPrj}${pp2}" title="${nm}"/>
</div>`;
				return;
			}

			if (this.#regWVFolderSnd.test(pp2)) {
				htm +=
`<div class="col pe-0">
	<div class="card text-bg-secondary">
		<audio controls src="${this.#uriWvPrj}${pp2}" class="card-img-top"></audio>
		<div class="card-body">
			<a href="${this.#uriWvPrj}${pp2}" title="エディタにドラッグできます" class="btn btn-primary" title="エディタにドラッグできます">${nm}</a>
		</div>
	</div>
</div>`;
				return;
			}

		}, ()=> {});
		wv.postMessage({cmd: 'refresh', o: {htm}});
	}
		readonly #regWVFolderMov = /\.(mp4|webm)$/;
		readonly #regWVFolderGrp = new RegExp(`\\.${SEARCH_PATH_ARG_EXT.SP_GSM}$`);
		readonly #regWVFolderSnd = new RegExp(`\\.${SEARCH_PATH_ARG_EXT.SOUND}$`);

		#chkWVFolder({path}: Uri, _sEvt: 'CRE'|'CHG'|'DEL') {
//console.log(`fn:Project.ts #chkWVFolder sEvt:${sEvt} path=${path}=`);
			const uriOF = this.#uriOpFolder;
			if (! this.#pnlWVFolder || ! uriOF) return;
			const fp = v2fp(path);			// /c:/
			const fpOF = v2fp(uriOF.path);	// /C:/
			if (fp.slice(0, fpOF.length) !== fpOF) return;

			if (this.#tiDelayFolder) clearTimeout(this.#tiDelayFolder);	// 遅延
			this.#tiDelayFolder = setTimeout(()=> this.#updWVFolder(uriOF), 500);
		}
		#tiDelayFolder: NodeJS.Timeout | undefined = undefined;


	// 主に設定画面からのアクション。falseを返すとスイッチなどコンポーネントを戻せる
	async #cmd(nm: string, val: string): Promise<boolean> {
//console.log(`fn:Project.ts #cmd nm:${nm} val:${val}`);
// await (new Promise((re: any)=> setTimeout(re, 2000)));
		// 最新は val。this.ctx.workspaceState.get(（など）) は前回値
		switch (nm) {
		case 'cnv.font.subset':
			if (await window.showInformationMessage('フォントサイズ最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			await this.#subsetFont(chkBoolean(val));
			break;

		case 'cnv.mat.pic':
			if (await window.showInformationMessage('画像ファイル最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			// 暗号化状態での最適化状態切り替えの場合、切り替え前の暗号化ファイルを削除
			if (this.#isCryptoMode) {
				for (const pp in this.#hDiff) {
					if (! this.#REG_DiffExtPic.test(pp)) continue;

					const diff = this.#hDiff[pp];
					remove(`${this.#PATH_CRYPT}${diff.cn}`);
				}
			}

			await this.#cnv_mat_pic(chkBoolean(val) ?'enable' :'disable');
			this.#updPathJson();
			break;
		case 'cnv.mat.webp_quality':
			if (! this.#ps.oWss['cnv.mat.pic']) break;

			await this.#cnv_mat_pic('reconv');
		//	this.#updPathJson();	// 現状、別拡張子に変わらないので不要
			break;

		case 'cnv.mat.snd':
			if (await window.showInformationMessage('音声ファイル最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			// 暗号化状態での最適化状態切り替えの場合、切り替え前の暗号化ファイルを削除
			if (this.#isCryptoMode) {
				for (const pp in this.#hDiff) {
					if (! this.#REG_DiffExtSnd.test(pp)) continue;

					const diff = this.#hDiff[pp];
					remove(`${this.#PATH_CRYPT}${diff.cn}`);
				}
			}

			await this.#cnv_mat_snd(chkBoolean(val) ?'enable' :'disable');
			this.#updPathJson();
			break;
		case 'cnv.mat.snd.codec':
			if (! this.#ps.oWss['cnv.mat.snd']) break;

			// 現状、UI的に「常にエンコーダー変更」なので、旧全生成物削除→全変換
			// 暗号化状態でのエンコーダー変更の場合、変更前の暗号化ファイルを削除
			if (this.#isCryptoMode) {
				for (const pp in this.#hDiff) {
					if (! this.#REG_DiffExtSnd.test(pp)) continue;

					const diff = this.#hDiff[pp];
					remove(`${this.#PATH_CRYPT}${diff.cn}`);
				}
			}

			await this.#cnv_mat_snd('reconv');
			this.#updPathJson();
			break;
		}

		return true;
	}
		readonly	#REG_DiffExtPic	= /\.(jpe?g|png|svg|webp)$/;
		readonly	#REG_DiffExtSnd	= /\.(mp3|m4a|ogg|aac|flac|wav)$/;

	readonly	#cnv_mat_pic = (modeInp: string)=> this.#exeTask(
		'cnv_mat_pic',
		`${modeInp
		} ${this.#ps.oWss['cnv.mat.webp_quality']
		} "${this.#PATH_PRJ}" "${this.#PATH_PRJ_BASE}"`,
	);
	readonly	#cnv_mat_snd = (modeInp: string)=> this.#exeTask(
		'cnv_mat_snd',
		`${modeInp} '{"codec":"${
			this.#ps.oWss['cnv.mat.snd.codec']
		}"}' "${this.#PATH_PRJ}" "${this.#PATH_PRJ_BASE}"`,
	);

	readonly	#hTask2Inf = {
		'cut_round': {
			title		: 'アイコン生成・丸く切り抜く',
			pathCpyTo	: 'build',
			aNeedLib	: ['fs-extra','sharp', 'png2icons'],
		},
		'subset_font': {
			title		: 'フォントサイズ最適化',
			pathCpyTo	: 'core/font',
			aNeedLib	: ['fs-extra'],
		},
		'cnv_mat_pic': {
			title		: '画像ファイル最適化',
			pathCpyTo	: 'build',
			aNeedLib	: ['fs-extra','sharp','p-queue@6.6.2'],
		},
		'cnv_mat_snd': {
			title		: '音声ファイル最適化',
			pathCpyTo	: 'build',
			aNeedLib	: ['fs-extra','@ffmpeg-installer/ffmpeg','fluent-ffmpeg','p-queue@6.6.2'],
				// p-queue は v6 まで CJS だった。それが v7 で ESM に変わった
				// https://aminevsky.github.io/blog/posts/pqueue-sample/
		},
	};
	#preventFileWatch = false;	// バッチ実行中のファイル変更検知を抑制
	#exeTask(nm: 'subset_font'|'cut_round'|'cnv_mat_pic'|'cnv_mat_snd', arg: string): Promise<number> {
		this.#preventFileWatch = true;
		const inf = this.#hTask2Inf[nm];

		return new Promise(fin=> window.withProgress({
			location	: ProgressLocation.Notification,
			title		: inf.title,
			cancellable	: false,
		}, prg=> new Promise<void>(async donePrg=> {
			const pathJs = this.#PATH_WS +`/${inf.pathCpyTo}/${nm}.js`;
			let init = '';
		//	if (! existsSync(pathJs)) {		// 後から fs-extra を追加したので互換性のため
				const oPkg = await readJson(this.#PATH_WS +'/package.json', {encoding: 'utf8'});
				const sNeedInst = inf.aNeedLib
				.filter(nm=> ! oPkg.devDependencies[nm])
				.join(' ');
				init = `npm i -D ${sNeedInst} ${statBreak} `;
		//	}
			await copy(this.ctx.extensionPath +`/dist/${nm}.js`, pathJs);

			tasks.executeTask(new Task(
				{type: 'SKYNovel TaskSys'},	// タスクの一意性
				this.wsFld,
				inf.title,		// UIに表示
				'SKYNovel',		// source
				new ShellExecution(
					`cd "${this.#PATH_WS}" ${statBreak} ${ init } node ./${inf.pathCpyTo}/${nm}.js ${arg}`
				),
			))
			.then(
				re=> this.#hTaskExe.set(<any>nm, re),
				rj=> console.error(`fn:Project #exeTask() rj:${rj.message}`)
			);
			this.hOnEndTask.set('Sys', e=> {
				fin(e.exitCode ?? 0);
				this.#preventFileWatch = false;
				prg.report({message: '完了', increment: 100});
				setTimeout(()=> donePrg(), 4000);
			});
		})));
	}
	readonly	#REG_FONT	= /\.(woff2?|otf|ttf)$/;
	static	readonly	DEF_FONT = ':DEF_FONT:';
	async	#subsetFont(minify: boolean) {
		if (! ActivityBar.aReady[eTreeEnv.PY_FONTTOOLS]) return;

		// 旧フォントファイルはすべて一度削除
		foldProc(
			this.#PATH_PRJ +'script/',
			(fp, nm)=> {if (this.#REG_FONT.test(nm)) removeSync(fp)},
			()=> {},
		);

		if (! minify) {
			// 【node subset_font.js】を実行。終了を待ったり待たなかったり
			await this.#exeTask('subset_font', '');
			this.#ps.dispFontInfo();		// フォント情報更新
			return;
		}

		// フォント出現箇所から生成すべき最小限のフォント情報についてまとめる
		const oFont: {[font_nm: string]: {
			inp	: string;
			txt	: string;
		}} = {};
		oFont[Project.DEF_FONT] = {inp: '', txt: ''};

		const ensureFont2Str = (font_nm: string)=> oFont[font_nm] ??= {
			inp	: this.#getFontNm2path(font_nm)
				.replace(/^.+\/core\/font/, '::PATH_PRJ_FONTS::')
				.replace(
					is_win
					? /C:\/Users\/[^\/]+\/AppData\/Local\/Microsoft\/Windows\/Fonts/
					: /\/Users\/[^\/]+\/Library\/Fonts/,
					'::PATH_USER_FONTS::'
				)
				.replace(is_win ?`C:/Windows/Fonts` :`/Library/Fonts`, '::PATH_OS_FONTS::'),
			txt	: '',
		};
		const o = this.#InfFont;
		for (const f2s of Object.values(o.hSn2Font2Str)) {
			for (const [font_nm, v] of Object.entries(f2s)) {
				ensureFont2Str(font_nm);
				oFont[font_nm].txt += v;
			}
		}
		ensureFont2Str(o.defaultFontName);
			// デフォルトフォントと同じ値を直接値指定する[span]がない場合
		oFont[o.defaultFontName].txt += oFont[Project.DEF_FONT].txt;
		delete oFont[Project.DEF_FONT];

		for (const v of Object.values(oFont)) {	// 文字重複しない最小限とするように
			const s = new Set<string>(Array.from(v.txt));	// 一意化
				// txt.split('')や [...txt] はサロゲートペアで問題
			v.txt = [...s].sort().join('');	// sort()は不要だが綺麗
		//	v.txt = [...s].join('');
		}
		await outputJson(this.#PATH_WS +'/core/font/font.json', oFont);

		// 【node subset_font.js】を実行。終了を待ったり待たなかったり
		await this.#exeTask('subset_font', '--minify');
		this.#ps.dispFontInfo();		// フォント情報更新
	}


	readonly	#hPush2BtnEnable = new Map<PrjBtnName, BtnEnable[]>([
		['Crypto',		['','','','','','','','','','','','']],
		['TaskWeb',		['_off', '_off', '', '_off', 'Stop', '_off',
						'_off', '_off', '_off', '_off', '_off', '_off']],
		['TaskWebDbg',	['_off', '_off', '', '_off', 'Stop', '_off',
						'_off', '_off', '_off', '_off', '_off', '_off']],
		['TaskWebStop',	['','','','','','','','','','','','']],
	//	['TaskApp',		['_off', '_off', '', '_off', '_off', 'Stop',
	//						'_off', '_off', '_off', '_off', '_off', '_off']],
	//	['TaskAppDbg',	['_off', '_off', '', '_off', '_off', 'Stop',
	//						'_off', '_off', '_off', '_off', '_off', '_off']],
			// NOTE: Stop 実装方法策定中につき無効化中
		['TaskAppDbgStop', ['','','','','','','','','','','','']],
	]);
	#onBtn(ti: TreeItem, btn_nm: PrjBtnName, cfg: TREEITEM_CFG) {
		if (! ActivityBar.aReady[eTreeEnv.NPM]) return;

		// 値を壊してボタン消去など
		const aBtnEnable = this.#hPush2BtnEnable.get(btn_nm)
		?? ['_off', '_off', '_off', '_off', '_off', '_off',
			'_off', '_off', '_off', '_off', '_off', '_off'];
		this.#aTiFlat.forEach((ti, i)=> {
			ti.contextValue += aBtnEnable[i];
			this.emPrjTD.fire(ti);
		});

		if (btn_nm === 'TaskWebStop' || btn_nm === 'TaskAppStop') {
			this.#onBtn_sub(ti, btn_nm, cfg, ()=> {});
			return;
		}
		window.withProgress({
			location	: ProgressLocation.Notification,
			title		: String(ti.label) ?? '',
			cancellable	: false,
		}, prg=> new Promise(done=> {
			const iconPath = ti.iconPath;
			ti.iconPath = new ThemeIcon('sync~spin');

			this.#onBtn_sub(ti, btn_nm, cfg, (timeout = 4000)=> {
				ti.iconPath = iconPath;

				for (const ti of this.#aTiFlat) {
					switch (ti.contextValue?.slice(-4)) {
						case '_off':
						case 'Stop':
							ti.contextValue = ti.contextValue?.slice(0, -4);
							break;
					}
					this.emPrjTD.fire(ti);
				}	// 値を戻してボタン表示

				prg.report({message: '完了', increment: 100});
				setTimeout(()=> done(0), timeout);
			})
		}));
	}
	#onBtn_sub(ti: TreeItem, btn_nm: PrjBtnName, cfg: TREEITEM_CFG, done: (timeout?: number)=> void) {
		let cmd = `cd "${this.#PATH_WS}" ${statBreak} `;
		if (! existsSync(this.#PATH_WS +'/node_modules')) {
			cmd += `npm i ${statBreak} `;	// 自動で「npm i」
			removeSync(this.#PATH_WS +'/package-lock.json');
		}

		// メイン処理
		if (cfg.npm) cmd += cfg.npm;
		switch (btn_nm) {	// タスク前処理
			case 'SnUpd':
				this.#termDbgSS()
				.then(()=> this.actBar.updPrjFromTmp(this.#PATH_WS))
				.then(()=> ncu.run({	// ncu -u --target minor
					packageFile: this.#PATH_WS +'/package.json',
					// Defaults:
					// jsonUpgraded: true,
					// silent: true,
					upgrade: true,
					target: 'minor',
				})
				.then(()=> {
					this.getLocalSNVer();
					this.#onBtn_sub(ti, 'SnUpd_waited', cfg, done);
				}))
				.catch(()=> done(0));
				return;

			case 'SnUpd_waited':	break;	// Promise待ち後

			case 'PrjSet':	this.#ps.open();	done(0);	return;

			case 'Crypto':
				window.showInformationMessage('暗号化（する / しない）を切り替えますか？', {modal: true}, 'はい')
				.then(a=> {
					if (a !== 'はい') {done(0); return;}

					this.#termDbgSS().then(()=> {
						this.#tglCryptoMode();
						this.#onBtn_sub(ti, 'Crypto_waited', cfg, done);
					})
					.catch(err=> console.error(err));
				});
				return;
			case 'Crypto_waited':	break;	// Promise待ち後

			case 'TaskWebDbg':
			case 'TaskAppDbg':
				this.#termDbgSS().then(()=> {
					this.#onDidTermDbgSS = ()=> {
						this.#onDidTermDbgSS = ()=> {};
						done(0);
					};
					debug.startDebugging(
						this.wsFld,
						btn_nm === 'TaskWebDbg' ?'webデバッグ' :'appデバッグ',
					);
				});
				return;

			case 'TaskWebStop':
			case 'TaskAppStop':	this.#termDbgSS();	done(0);	return;

			case 'PackWin':
			case 'PackWin32':
			case 'PackMac':
			case 'PackMacArm64':
			case 'PackLinux':	this.#termDbgSS();	break;

			case 'PackFreem':
				this.#termDbgSS();

				let find_ng = false;
				treeProc(this.#PATH_PRJ, fp=> {
					if (find_ng || fp.slice(-4) !== '.svg') return;

					find_ng = true;
					window.showErrorMessage(
						`ふりーむ！では svg ファイル使用禁止です。png などに置き換えて下さい`, 'フォルダを開く', 'Online Converter',
					)
					.then(a=> {switch (a) {
						case 'フォルダを開く':
							env.openExternal(Uri.file(dirname(fp)));	break;
						case 'Online Converter':
							env.openExternal(Uri.parse('https://cancerberosgx.github.io/demos/svg-png-converter/playground/'));
							break;
					}});
				});
				if (find_ng) {done(); return;}
				break;
		}

		// Windowsでの PowerShell スクリプト実行ポリシーについて警告
		switch (btn_nm) {
			case 'PackWin':
			case 'PackWin32':
				if (! is_win) break;
				if (! /(Restricted|AllSigned)/.test(
					execSync('PowerShell Get-ExecutionPolicy').toString()
				)) break;

				done();
				window.showErrorMessage(`管理者として開いたPowerShell で実行ポリシーを RemoteSigned などに変更して下さい。\n例）Set-ExecutionPolicy RemoteSigned`, {modal: true}, '参考サイトを開く')
				.then(a=> {if (a) env.openExternal(Uri.parse('https://qiita.com/Targityen/items/3d2e0b5b0b7b04963750'));});
				return;
		}

		const task_type = cfg.task_type ?? 'Pkg';
		const t = new Task(
			{type: 'SKYNovel Task'+ task_type},	// タスクの一意性
			this.wsFld,
			cfg.label,		// UIに表示
			'SKYNovel',		// source
			new ShellExecution(cmd),
		);
		this.hOnEndTask.set(task_type, ()=> done());
		switch (btn_nm) {	// タスク後処理
			//case 'SnUpd':	// ここには来ない
			case 'SnUpd_waited':	// Promise待ち後
				this.hOnEndTask.set(task_type, ()=> {this.getLocalSNVer(); done();});
				break;

			case 'Crypto_waited':
				this.hOnEndTask.set(task_type, ()=> {this.dspCryptoMode(); done();});
				break;

			case 'PackWin':
			case 'PackWin32':
			case 'PackMac':
			case 'PackMacArm64':
			case 'PackLinux':	this.hOnEndTask.set(task_type, async ()=> {
				// アップデート用ファイル作成
				const oPkg = readJsonSync(this.#PATH_WS +'/package.json', {encoding: 'utf8'});

				const pathPkg = this.#PATH_WS +'/build/package';
				const pathUpd = pathPkg +'/update';
				const fnUcJs = pathUpd +'/_index.json';
				let oUc = existsSync(fnUcJs)
					? readJsonSync(fnUcJs, {encoding: 'utf8'})
					: {};

//console.log(`fn:Project.ts line:492 pkg ver:${oPkg.version}: @${btn_nm.slice(4, 7)}@`);
				const isMacBld = btn_nm.slice(4, 7) === 'Mac';
				const isLinBld = btn_nm.slice(4, 7) === 'Lin';
				const fnYml = pathPkg +`/latest${
					isMacBld ?'-mac' :isLinBld ?'-linux' :''
				}.yml`;
				const sYml = readFileSync(fnYml, {encoding: 'utf8'});
				const mv = /version: (.+)/.exec(sYml);
				if (! mv) throw `[Pack...] .yml に version が見つかりません`;
				const ver = mv[1];
//console.log(`fn:Project.ts line:499 ver=${ver}= eq=${oPkg.version == ver}`);
				if (oUc.version != ver || oUc.name != oPkg.name) {
					oUc = {};
					await remove(pathUpd);
					await ensureDir(pathUpd);
				}
				oUc.version = oPkg.version;
				oUc.name = oPkg.name;

				const mp = /path: (.+)/.exec(sYml);
				if (! mp) throw `[Pack...] .yml に path が見つかりません`;
				const path = mp[1];

				const ms = /size: (.+)/.exec(sYml);
				if (! ms) throw `[Pack...] .yml に size が見つかりません`;
				const size = Number(ms[1] ?? NaN);

				const mc = /sha512: (.+)/.exec(sYml);
				if (! mc) throw `[Pack...] .yml に sha512 が見つかりません`;
				const sha512 = mc[1] ?? '';
				const cn = encStrBase64(this.#encry.uuidv5(sha512));

				const ma = /-(\w+)\.\D/.exec(path);
					// https://regex101.com/r/yH7nLk/1	13 steps, 0.0ms
				if (! ma) throw `path に arch が見つかりません`;
				const arch = ma[1];

				const key = (isMacBld ?'darwin' :isLinBld ?'linux' :'win32') +'_'+ arch;
				oUc[key] = {path, size, sha512, cn,};
				await outputJson(fnUcJs, oUc, {spaces: '\t'});

				// 古い（暗号化ファイル名）更新ファイルを削除
				const REG_OLD_SAMEKEY = new RegExp('^'+ key +'-');
				foldProc(pathUpd, (fp, nm)=> {
					if (REG_OLD_SAMEKEY.test(nm)) removeSync(fp);
				}, ()=> {});

				// （暗号化ファイル名）更新ファイルをコピー
				copy(pathPkg +'/'+ path, pathUpd +'/'+ key +'-'+ cn);
					// ランダムなファイル名にしたいがkeyは人に分かるようにして欲しい、
					// という相反する要望を充たすような
					// 既存ファイル削除にも便利

				done();
				window.showInformationMessage(
					`${cfg.label} パッケージを生成しました`,
					'出力フォルダを開く',
				).then(a=> {if (a) env.openExternal(Uri.file(pathPkg))});
			});
				break;

			case 'PackFreem':	this.hOnEndTask.set(task_type, ()=> {
				const arc = archiver.create('zip', {zlib: {level: 9},})
				.append(createReadStream(this.#PATH_WS +'/doc/web.htm'), {name: 'index.html'})
				.append(createReadStream(this.#PATH_WS +'/build/include/readme.txt'), {name: 'readme.txt'})
				.glob('web.js', {cwd: this.#PATH_WS +'/doc/'})
				.glob('web.*.js', {cwd: this.#PATH_WS +'/doc/'})
				.glob(`${
					this.#isCryptoMode ?FLD_CRYPT_PRJ :'prj'
				}/**/*`, {cwd: this.#PATH_WS +'/doc/'})
				.glob('favicon.ico', {cwd: this.#PATH_WS +'/doc/'});

				const fn_out = `${basename(this.#PATH_WS)}_1.0freem.zip`;
				const ws = createWriteStream(this.#PATH_WS +`/build/package/${fn_out}`)
				.on('close', ()=> {
					done();
					window.showInformationMessage(
						`ふりーむ！形式で出力（${fn_out}）しました`,
						'出力フォルダを開く',
					).then(a=> {if (a) env.openExternal(Uri.file(this.#PATH_WS +'/build/package/'))})
				});
				arc.pipe(ws);
				arc.finalize();	// zip圧縮実行
			});
				break;
		}
		tasks.executeTask(t)
		.then(
			re=> this.#hTaskExe.set(btn_nm, re),
			rj=> console.error(`fn:Project onBtn_sub() rj:${rj.message}`)
		);
	}
	readonly	#hTaskExe	= new Map<PrjBtnName, TaskExecution>();


	// 暗号化
	async	#initCrypto() {
		await this.#encry.init();

		const fnc: (fp: string)=> void = this.#isCryptoMode
			? fp=> {
				const uri = Uri.file(fp);
				if (this.#isDiff(uri)) this.#encFile(uri);
			}
			: fp=> {
				const uri = Uri.file(fp);
				this.#isDiff(uri);
			};
		treeProc(this.#PATH_PRJ, fnc);
		this.#updDiffJson();
	}
	#encIfNeeded(uri: Uri) {
		if (this.#isCryptoMode && this.#isDiff(uri)) this.#encFile(uri);
		this.#updDiffJson();
	}
	#updDiffJson() {writeJsonSync(this.#fnDiff, this.#hDiff);}

	#isDiff({path}: Uri): boolean {
		const fp = v2fp(path);
		const {pathCn, diff, pp} = this.#path2cn(fp);
//console.log(`fn:Project.ts #isDiff fp:${fp} pp:${pp} pathCn:${pathCn} A:${! existsSync(pathCn ?? '')}`);
		if (pathCn && ! existsSync(pathCn)) return true;

		let hash = 0;
		if (this.#REG_FULLCRYPTO.test(fp)) {
			hash = crc32.buf(Buffer.from(readFileSync(fp, {encoding: 'utf8'}), 'binary'), 0);
		//	hash = crc32.str(readFileSync(fp, {encoding: 'utf8'}));
				// 高速らしい SheetJS/js-crc32: :cyclone: JS 標準 CRC-32 および CRC32C の実装 https://github.com/SheetJS/js-crc32
		}
		else {
			this.#bufChkDiff.fill(0, 0, Project.#LEN_CHKDIFF);
			const fd = openSync(fp, 'r');
			readSync(fd, this.#bufChkDiff, 0, Project.#LEN_CHKDIFF, 0);
			closeSync(fd);
			hash = crc32.buf(this.#bufChkDiff, 0);
		}
//console.log(`fn:Project.ts      B:${diff?.hash !== hash} b0:${diff?.hash} b1:${hash}`);
		if (diff?.hash === hash) return false;

		this.#hDiff[pp] = {
			hash,
			cn	: this.#REG_NEEDCRYPTO.test(pp)
				? pp.replace(this.#REG_SPATH2HFN, `$1/${this.#encry.uuidv5(pp)}$2`)
				.replace(this.#REG_REPPATHJSON, '.bin')
				: pp,
		};
		return true;
	}
	static	readonly	#LEN_CHKDIFF	= 1024 *20;		// o
//	static	readonly	#LEN_CHKDIFF	= 1024 *10;		// x 変更を検知しない場合があった
//	static	readonly	#LEN_CHKDIFF	= 1024;			// x 変更を検知しない場合があった
	readonly	#REG_SPATH2HFN	= /([^\/]+)\/[^\/]+(\.\w+)/;
	#bufChkDiff = new Uint8Array(Project.#LEN_CHKDIFF);


	readonly	#aRepl = [
		'core/app4webpack.js',
		'core/web4webpack.js',
	];
	#tglCryptoMode() {
		const pathPre = this.#PATH_PLG +'snsys_pre/';
		this.#isCryptoMode = ! this.#isCryptoMode;
		this.#cfg.setCryptoMode(this.#isCryptoMode);
		if (! this.#isCryptoMode) {
			removeSync(this.#PATH_CRYPT);

			removeSync(pathPre);

			// ビルド関連：SKYNovelが見に行くプロジェクトフォルダ名変更
			for (const url of this.#aRepl) replaceFile(
				this.#PATH_WS +'/'+ url,
				/\(hPlg, {.+?}\);/,
				`(hPlg);`,
			);
			// ビルド関連：パッケージするフォルダ名変更
			replaceFile(
				this.#PATH_WS +'/package.json',
				new RegExp(`"doc/${FLD_CRYPT_PRJ}\\/",`),
				`"doc/prj/",`,
			);
			this.#updPlugin();

			return;
		}

		ensureDir(this.#PATH_CRYPT);

		// ビルド関連：SKYNovelが見に行くプロジェクトフォルダ名変更
		for (const url of this.#aRepl) replaceFile(
			this.#PATH_WS +'/'+ url,
			/\(hPlg\);/,
			`(hPlg, {cur: '${FLD_CRYPT_PRJ}/', crypto: true});`,
		);
		// ビルド関連：パッケージするフォルダ名変更
		replaceFile(
			this.#PATH_WS +'/package.json',
			/"doc\/prj\/",/,
			`"doc/${FLD_CRYPT_PRJ}/",`,
		);
		// ビルド関連：プラグインソースに埋め込む
		replaceFile(
			this.ctx.extensionPath +`/dist/snsys_pre.js`,
			/[^\s=]+\.tstDecryptInfo\(\)/,
			this.#encry.strHPass,
			true,
			pathPre +'index.js',
		);
		this.#updPlugin();

		this.#hDiff = Object.create(null);
		this.#initCrypto();
	}

	async #encFile({path}: Uri) {
		const fp = v2fp(path);
		const pp = this.#fp2pp(fp);
//console.log(`fn:Project.ts #encFile pp=${pp}= =${this.#hDiff[pp].cn}`);
		try {
			const path_enc = this.#PATH_CRYPT + this.#hDiff[pp].cn;
			if (! this.#REG_NEEDCRYPTO.test(fp)) {
				await copy(fp, path_enc, {overwrite: true});
				//.catch((e: any)=> console.error(`enc cp1 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラー
					// となるだけなので
				return;
			}

			if (this.#REG_FULLCRYPTO.test(pp)) {	// この中はSync
				if (pp !== 'path.json') {	// 内容も変更
					const s = readFileSync(fp, {encoding: 'utf8'});
					await outputFile(path_enc, await this.#encry.enc(s));
					return;
				}

				if (this.#tiDelayEnc) clearTimeout(this.#tiDelayEnc);	// 遅延
				this.#tiDelayEnc = setTimeout(async ()=> {
					// ファイル名匿名化
					const hPath: IFn2Path = readJsonSync(fp, {encoding: 'utf8'});
					for (const hExt2N of Object.values(hPath)) {
						for (const [ext, pp2] of Object.entries(hExt2N)) {
							if (ext === ':cnt') continue;
							if (ext.slice(-3) === ':id') continue;
							const dir = this.#REG_DIR.exec(pp2);
							if (dir && this.#cfg.oCfg.code[dir[1]]) continue;

							hExt2N[ext] = this.#hDiff[pp2].cn;
						}
					}
					const s2 = JSON.stringify(hPath);
					await outputFile(path_enc, await this.#encry.enc(s2));
				}, 500);
				return;
			}

			const dir = this.#REG_DIR.exec(pp);
			if (dir && this.#cfg.oCfg.code[dir[1]]) {
				await copy(fp, path_enc, {overwrite: true});
				//.catch((e: any)=> console.error(`enc cp2 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラー
					// となるだけなので
				return;
			}

			const u2 = path_enc.replace(/\.[^.]+$/, '.bin');
			await ensureFile(u2);	// touch
			const ws = createWriteStream(u2)
			.on('error', e=> {ws.destroy(); console.error(`enc ws=%o`, e);});

			const rs = createReadStream(fp)
			.on('error', e=> console.error(`enc rs=%o`, e));

			const tr = new EncryptorTransform(this.#encry, fp);
			rs.pipe(tr).pipe(ws);
		}
		catch (e) {console.error(`enc other ${e.message} src:${fp}`);}
	}
		#tiDelayEnc: NodeJS.Timeout | undefined = undefined;
		readonly #REG_DIR	= /(^.+)\//;


	readonly	#REG_PLGADDTAG	= /(?<=\.\s*addTag\s*\(\s*)(["'])(.+?)\1/g;
	#hDefPlg	: {[def_nm: string]: PluginDef}	= {};
	#updPlugin(build = true) {
		if (! existsSync(this.#PATH_PLG)) return;

		const h4json	: {[def_nm: string]: number}	= {};
		this.#hDefPlg = {};
		foldProc(this.#PATH_PLG, ()=> {}, nm=> {
			h4json[nm] = 0;

			const path = `${this.#PATH_PLG}${nm}/index.js`;
			if (! existsSync(path)) return;

			const txt = readFileSync(path, 'utf8');
			let a;
			// 全ループリセットかかるので不要	.lastIndex = 0;	// /gなので必要
			while ((a = this.#REG_PLGADDTAG.exec(txt))) {
				const nm = a[2];
				const len_nm = nm.length;
				const idx_nm = this.#REG_PLGADDTAG.lastIndex -len_nm -1;

				let line = 0;
				let j = idx_nm;
				while ((j = txt.lastIndexOf('\n', j -1)) >= 0) ++line;

				const col = idx_nm -txt.lastIndexOf('\n', idx_nm) -1;
				this.#hDefPlg[nm] = {
					uri	: path,
					sl	: line,
					sc	: col,
					el	: line,
					ec	: col +len_nm,
				};
			}
		});
		this.#sendRequest2LSP('def_plg.upd', this.#hDefPlg);

		outputFile(this.#PATH_PLG.slice(0, -1) +'.js', `export default ${JSON.stringify(h4json)};`)
		.then(build ?()=> this.#build() :()=> {})
		.catch((err: any)=> console.error(`Project updPlugin ${err}`));
	}
	#build = ()=> {
		if (! ActivityBar.aReady[eTreeEnv.NPM]) return;

		this.#build = ()=> {};	// onceにする
		// 起動時にビルドが走るのはこれ
		// 終了イベントは Project.ts の tasks.onDidEndTaskProcess で
		let cmd = `cd "${this.#PATH_WS}" ${statBreak} `;
		if (! existsSync(this.#PATH_WS +'/node_modules')) {
			cmd += `npm i ${statBreak} `;		// 自動で「npm i」
			removeSync(this.#PATH_WS +'/package-lock.json');
		}
		cmd += 'npm run webpack:dev';
		const type = 'SKYNovel TaskSys';
		const name = '自動ビルド';
		const t = new Task(
			{type},			// タスクの一意性
			this.wsFld!,
			name,			// UIに表示
			'SKYNovel',		// source
			new ShellExecution(cmd),
		);

		this.enableBtn(false);
		window.withProgress({
			location	: ProgressLocation.Notification,
			title		: name,
			cancellable	: false
		}, _prg=> new Promise<void>(done=> {
			let fnc = (e: TaskProcessEndEvent)=> {
				if (e.execution.task.definition.type !== type) return;
				fnc = ()=> {};
				this.enableBtn(true);
				done();
			};
			tasks.onDidEndTaskProcess(fnc);

			tasks.executeTask(t)
			.then(undefined, rj=> console.error(`Project build() rj:${rj.message}`));
				// この resolve は「executeTask()できたかどうか」だけで、
				// Task終了を待って呼んでくれるわけではない
		}));
	}


	#tiDelayPathJson: NodeJS.Timeout | undefined = undefined;
	#updPathJson() {
		if (this.#tiDelayPathJson) clearTimeout(this.#tiDelayPathJson);	// 遅延
		this.#tiDelayPathJson = setTimeout(()=> this.#basePathJson(), 500);
	}
		async #basePathJson() {		// 初期化冒頭で直接呼ばれる
			// path.json 更新（暗号化もここ「のみ」で）
			await this.#cfg.loadEx(uri=> this.#encFile(uri), this.#clDiag);

			// ドロップ時コピー先候補
			for (const [spae, aFld] of this.#mExt2aFld) {
				const aPath: string[] = [];
				for (const fld_nm of aFld) if (existsSync(this.#PATH_WS +`/doc/prj/${fld_nm}/`)) aPath.push(fld_nm);
				this.#mExt2ToPath.set(spae, aPath);
			}

			this.#basePathJsonAfter();
		}
		#basePathJsonAfter = ()=> {};
	readonly	#mExt2aFld: Map<SEARCH_PATH_ARG_EXT, string[]> = new Map([
		[SEARCH_PATH_ARG_EXT.SP_GSM, ['bg','image']],
		[SEARCH_PATH_ARG_EXT.SOUND, ['music','sound']],
		[SEARCH_PATH_ARG_EXT.FONT, ['script']],
		[SEARCH_PATH_ARG_EXT.SCRIPT, ['script']],
	]);
	#mExt2ToPath	: Map<SEARCH_PATH_ARG_EXT, string[]>	= new Map;
	#getコピー先候補(ext: string): string[] {
		let aコピー先候補: string[] = [];
		for (const [spae, a] of this.#mExt2ToPath.entries()) {
			if (! new RegExp(spae).test(ext)) continue;

			aコピー先候補 = a;
			break;
		}

		return aコピー先候補;
	}

	async	drop(td: TextDocument, pos: Position, aUri: Uri[]): Promise<DocumentDropEdit | null | undefined> {
		// td.fileName	=c:\Users\[略]]\doc\prj\mat\main.sn=
		// td.uri.path	=/c:/Users/[略]/doc/prj/mat/main.sn=
		const aFpNew: string[] = [];
		for (const uri of aUri) {
			const {path, scheme} = uri;
			const ext = extname(path).slice(1);
			const fp = v2fp(path);
//console.log(`fn:Project.ts drop scheme:${scheme} fp:${fp}: uri:${uri.toString()}: path=${path}= fsPath-${uri.fsPath}-`);

			let fpNew = fp;
			const fn_ext = '/'+ basename(fp);
			const aコピー先候補 = this.#getコピー先候補(ext);
			switch (scheme) {
			case 'file':
				if (statSync(fp).isDirectory()) {	// フォルダドロップ
					if (fp.slice(0, this.#PATH_PRJ.length) !== this.#PATH_PRJ) return null;	// プロジェクト外なら鼻も引っ掛けない

					this.opView(uri);
					return null;
				}
				if (! ext) continue;	// 拡張子なしは無視（.gitignore 系も）

				if (fp.slice(0, this.#PATH_PRJ.length) === this.#PATH_PRJ) break;	// プロジェクト内からのドラッグ

				// プロジェクト外からのドラッグ
				// ファイルコピー
				switch (aコピー先候補.length) {
					case 0:		// 候補もなし、スクリプトと同じフォルダにコピー
						fpNew = v2fp(
							td.uri.path.slice(0, -basename(td.uri.path).length) + basename(fp)
						);
						break;

					case 1:		// 選ぶまでもなく確定
						fpNew = this.#PATH_PRJ + aコピー先候補[0] + fn_ext;
						break;

					default:{
						aコピー先候補.push('キャンセル');
						const ans = await window.showInformationMessage(
							basename(fp) +' のコピー先を選んでください',
							...aコピー先候補,
						);
						if (ans === 'キャンセル') return null;

						fpNew = this.#PATH_PRJ + ans + fn_ext;
					}	break;
				}
				await copyFile(fp, fpNew);
				break;

			case 'http':
			case 'https':{	// webブラウザ画像やURLリンクの場合はダウンロード
				if (! ext) continue;	// 拡張子なしは無視（.gitignore 系も）

				// webviewからのドラッグ
				if (this.#uriWvPrj) {
					const pp = this.#uriWvPrj.path;
					if (path.slice(0, pp.length) === pp) break;	// from WV
				}

				const uriDL = uri.toString();
//console.log(`fn:Project.ts urlDL=${uriDL}=`);
				const res = await fetch(uriDL);
				if (! res.ok) {
					window.showErrorMessage(`ダウンロードに失敗しました。手動でローカルにコピーして下さい uri=${uriDL}`);
					return null;
				}

				let ppNew = '';
				switch (aコピー先候補.length) {
					case 0:		// 候補もなし
						return null;	// サポートしないものとする

				//	case 1:		// 選ぶまでもなく確定
					default:	// 決め打ち
						ppNew = aコピー先候補[0] + fn_ext;
						break;
				}
				fpNew = this.#PATH_PRJ + ppNew;
				writeFile(fpNew, new Uint8Array(await res.arrayBuffer()));

				window.showInformationMessage(`素材をダウンロードしました。 path=${ppNew}`);
				// サイドバーに表示
				await commands.executeCommand('revealInExplorer', Uri.parse(this.#vpPrj + ppNew));

			}	break;

			default:	return null;
			}

			aFpNew.push(fpNew);
		}

		// スニペット挿入・値部を書き換え
		if (aFpNew.length === 0) return null;
		const fp = aFpNew[0];
		const ext = extname(fp).slice(1);
		const fn = getFn(fp);
		for (const [spae, snip] of this.#mExt2Snip.entries()) {
			if (! new RegExp(spae).test(ext)) continue;

			// 属性値にドロップした場合は、値部を書き換える
			const gw = this.#getWordRangeAtPosition(td, pos, this.#REG_FIELD);
			if (gw) {
				const {range, nm} = gw;
				if (nm) return {insertText: '', additionalEdit: this.#createWsEd_repVal(td.uri, range, nm, fn)};
			}

			// スニペット挿入
			const sni = snip.replace('...', fn)
			.replaceAll(/\${\d\|([^,]+)\|}/g, '$1');
				// https://regex101.com/r/QAiATp/1
//console.log(`fn:Project.ts sni=${sni}=`);
			return {insertText: new SnippetString(sni)};
		}

		return null;
	}
		#mExt2Snip: Map<SEARCH_PATH_ARG_EXT, string> = new Map();

		readonly	#REG_FIELD	= /(?<=\s)[^\s=[\]]+(?:=(?:[^"'#\s;\]]+|(["'#]).*?\1)?)?/g;	// https://regex101.com/r/1m4Hgp/1 7 matches 95 steps, 0.4ms
		#createWsEd_repVal(uri: Uri, range: Range, nm: string, val: string) {
			const we = new WorkspaceEdit;
			const v2 = /[\s=]/.test(val)
				? (/['#]/.test(val) ? `"${val}"` : `'${val}'`)
				: val;
			we.replace(uri, range, nm + '=' + v2);
			return we;
		}

		#getWordRangeAtPosition(td: TextDocument, {line, character}: Position, reg: RegExp): {hit: string, range: Range, nm: string, val: string} {
//			if (reg.flags.indexOf('g') === -1) console.log(`fn:LspWs.ts #getWordRangeAtPosition gフラグが必要です`);// TO DO: あとでコメントアウト

			const s = td.getText(new Range(line, 0, line, 9999));
			let e;
			reg.lastIndex = 0;	// /gなので必要
			while (e = reg.exec(s)) {
				const [hit] = e, b = reg.lastIndex -hit.length;

				const [nm, ...v] = hit.split('=');
				const val = v.join('=');

				if (b <= character && character <= reg.lastIndex) return {
					hit,
					range: new Range(line, b, line, reg.lastIndex),
					nm, val,
				};
			}
			return {hit: '', range: new Range(0, 0, 0, 0), nm: '', val: ''};
		}

}
