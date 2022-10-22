/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {statBreak, treeProc, foldProc, replaceFile, REG_IGNORE_SYS_PATH, is_win, docsel, openURL} from './CmnLib';
import {PrjSetting} from './PrjSetting';
import {Encryptor} from './Encryptor';
import {ActivityBar, eTreeEnv} from './ActivityBar';
import {EncryptorTransform} from './EncryptorTransform';
import {PrjTreeItem, TREEITEM_CFG, PrjBtnName, TASK_TYPE} from './PrjTreeItem';
import {aPickItems, QuickPickItemEx} from './WorkSpaces';
import {Config, SysExtension} from './Config';
import {SEARCH_PATH_ARG_EXT, IFn2Path} from './ConfigBase';

import {ExtensionContext, workspace, Disposable, tasks, Task, ShellExecution, window, Uri, Range, WorkspaceFolder, TaskProcessEndEvent, ProgressLocation, TreeItem, EventEmitter, ThemeIcon, debug, DebugSession, env, TaskExecution, languages, Diagnostic, DiagnosticSeverity, QuickPickItemKind, TextDocument, EvaluatableExpression, Position, ProviderResult, Hover, MarkdownString} from 'vscode';
import {closeSync, createReadStream, createWriteStream, ensureDir, ensureDirSync, existsSync, openSync, outputFile, outputFileSync, outputJson, outputJsonSync, readFileSync, readJsonSync, readSync, removeSync, writeJsonSync, copy, readJson, remove, ensureFile} from 'fs-extra';
import {extname} from 'path';
import img_size from 'image-size';
import {lib} from 'crypto-js';
import {v4 as uuidv4} from 'uuid';
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
type TINF_INTFONT = {
	defaultFontName	: string;
	hSn2Font2Str	: {[sn: string]: TFONT2STR};
	hUri2FontErr	: {[uri: string]: TFONT_ERR[]}
};


export class Project {
	readonly	#pathWs;
	readonly	#curPlg;
	readonly	#curPrj;
	readonly	#lenCurPrj;

	readonly	#curPrjBase;

	readonly	#curCrypto;
	static readonly	#fld_crypto_prj		= 'crypto_prj';
	static get fldnm_crypto_prj() {return Project.#fld_crypto_prj}
	#isCryptoMode	= false;
	readonly	#REG_NEEDCRYPTO		= /\.(ss?n|json|html?|jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv|html?)$/;
	readonly	#REG_FULLCRYPTO		= /\.(sn|ssn|json|html?)$/;
	readonly	#REG_REPPATHJSON	= /\.(jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)/g;
	readonly	#hExt2N: {[ext: string]: number} = {
		'jpg'	: 1,
		'jpeg'	: 1,
		'png'	: 2,
		'svg'	: 3,
		'webp'	: 4,
		'mp3'	: 10,
		'm4a'	: 11,
		'ogg'	: 12,
		'aac'	: 13,
		'flac'	: 14,
		'wav'	: 15,
		'mp4'	: 20,
		'webm'	: 21,
		'ogv'	: 22,
	};

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

	readonly	#fwPrjOptPic;
	readonly	#fwPrjOptSnd;

	readonly	#sendRequest2LSP: (cmd: string, o?: any)=> void;

	readonly	#clDiag;

	readonly	#cfg;


	constructor(private readonly ctx: ExtensionContext, private readonly actBar: ActivityBar, private readonly wsFld: WorkspaceFolder, readonly aTiRoot: TreeItem[], private readonly emPrjTD: EventEmitter<TreeItem | undefined>, private readonly hOnEndTask: Map<TASK_TYPE, (e: TaskProcessEndEvent)=> void>, readonly sendRequest2LSP: (cmd: string, curPrj: string, o?: any)=> void) {
		this.#pathWs = wsFld.uri.fsPath;
		this.#curPrj = this.#pathWs +'/doc/prj/';

		const sr = new SysExtension({cur: this.#curPrj, crypto: false, dip: ''});
		this.#cfg = new Config(sr);
		this.#cfg.loadEx(path_src=> this.#encFile(path_src), this.#clDiag);

		this.#curPrjBase = this.#pathWs +`/doc/${PrjSetting.fld_prj_base}/`;
		this.#lenCurPrj = this.#curPrj.length;
			// 遅らせると core/diff.json 生成でトラブル。0状態で処理してしまう
		this.#sendRequest2LSP = (cmd, o = {})=> this.sendRequest2LSP(cmd, 'file://'+ this.#curPrj, o);	// LSPにはfile:〜が必要なので

		const pti = PrjTreeItem.create(ctx, wsFld, (ti, btn_nm, cfg)=> this.#onBtn(ti, btn_nm, cfg));
		aTiRoot.push(pti);

		this.#curCrypto = this.#pathWs +`/doc/${Project.#fld_crypto_prj}/`;
		this.#isCryptoMode = existsSync(this.#curCrypto);
		const fnPass = this.#pathWs +'/pass.json';
		const exists_pass = existsSync(fnPass);
		this.#encry = new Encryptor(exists_pass
			? readJsonSync(fnPass, {throws: false})
			: {
				pass	: uuidv4(),
				salt	: String(lib.WordArray.random(128 / 8)),
				iv		: String(lib.WordArray.random(128 / 8)),
				keySize	: String(512 / 32),
				ite		: 500 + Math.floor(new Date().getTime() %300),
				stk		: String(lib.WordArray.random(128 / 8)),
			});
		if (! exists_pass) outputFileSync(fnPass, this.#encry.strHPass);

		try {
			this.#fnDiff = this.#pathWs +'/core/diff.json';
			if (existsSync(this.#fnDiff)) this.#hDiff = readJsonSync(this.#fnDiff);
		} catch (e) {
			// diff破損対策
			this.#hDiff = Object.create(null);
		}
		this.#ps = new PrjSetting(
			ctx,
			wsFld,
			this.#cfg,
			title=> {
				pti.label = title;
				this.emPrjTD.fire(pti);
			},
			()=> this.sendRequest2LSP('def_esc.upd', 'file://'+ this.#curPrj),
			(nm, val)=> this.#cmd(nm, val),
			(nm, arg)=> this.#exeTask(nm, arg),
		);
		this.#initCrypto();

		this.#curPlg = this.#pathWs +'/core/plugin/';
		ensureDirSync(this.#curPlg);	// 無ければ作る
		// updPlugin で goAll() が走る
		if (existsSync(this.#pathWs +'/node_modules')) this.#updPlugin(false);
		else {
			this.#build();
			if (ActivityBar.aReady[eTreeEnv.NPM]) window.showInformationMessage('初期化中です。ターミナルの処理が終わって止まるまでしばらくお待ち下さい。', {modal: true});
		}

		// ファイル増減を監視し、path.json を自動更新
		const fwPrj = workspace.createFileSystemWatcher(this.#curPrj +'*/*');
//		const fwPrjSn = workspace.createFileSystemWatcher(this.#curPrj +'*/*.{sn,ssn}');
		const fwPrjJs = workspace.createFileSystemWatcher(this.#curPrj +'prj.json');
		// prjルートフォルダ監視
		const fwFld = workspace.createFileSystemWatcher(this.#curPrj +'*');
		const fwStgSn = workspace.createFileSystemWatcher(this.#curPrj +'**/setting.sn');
		this.#fwPrjOptPic = workspace.createFileSystemWatcher(
			this.#pathWs +`/doc/{prj,${PrjSetting.fld_prj_base}}/**/*.{jpg,jpeg,png}`
		);
		this.#fwPrjOptSnd = workspace.createFileSystemWatcher(
			this.#pathWs +`/doc/{prj,${PrjSetting.fld_prj_base}}/**/*.{mp3,wav}`
		);
		this.#aFSW = [
			fwPrj.onDidCreate(uri=> {
				if (REG_IGNORE_SYS_PATH.test(uri.path)) return;
				this.#crePrj(uri);
			}),
			fwPrj.onDidChange(uri=> {
				if (REG_IGNORE_SYS_PATH.test(uri.path)) return;
				this.#chgPrj(uri);
			}),
			fwPrj.onDidDelete(uri=> {
				if (REG_IGNORE_SYS_PATH.test(uri.path)) return;
				this.#delPrj(uri);
			}),
			
//			fwPrjSn.onDidCreate(uri=> this.#codSpt.crePrj(uri)),
		//	fwPrjSn.onDidChange(uri=> this.#codSpt.chgPrj(uri)),
				// workspace.onDidChangeTextDocument() からやるので不要
//			fwPrjSn.onDidDelete(uri=> this.#codSpt.delPrj(uri)),

			fwPrjJs.onDidChange(e=> this.#chgPrj(e)),

			fwFld.onDidCreate(uri=> this.#ps.onCreDir(uri.path)),
			/*fwFld.onDidChange(uri=> {	// フォルダ名ではこれが発生せず、Cre & Del
				if (uri.path.slice(-5) === '.json') return;
	console.log(`fn:Project.ts Cha path:${uri.path}`);
			}),*/
			fwFld.onDidDelete(uri=> this.#ps.onDelDir(uri.path)),

			fwStgSn.onDidCreate(uri=> this.#ps.onCreSettingSn(uri.path)),
			fwStgSn.onDidDelete(uri=> this.#ps.onDelSettingSn(uri.path)),

			this.#fwPrjOptPic.onDidCreate(uri=> this.#ps.onCreChgOptPic(uri.path)),
			this.#fwPrjOptPic.onDidChange(uri=> this.#ps.onCreChgOptPic(uri.path)),
			this.#fwPrjOptPic.onDidDelete(uri=> this.#ps.onDelOptPic(uri.path)),

			this.#fwPrjOptSnd.onDidCreate(uri=> this.#ps.onCreChgOptSnd(uri.path)),
			this.#fwPrjOptSnd.onDidChange(uri=> this.#ps.onCreChgOptSnd(uri.path)),
			this.#fwPrjOptSnd.onDidDelete(uri=> this.#ps.onDelOptSnd(uri.path)),
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
			this.emPrjTD.fire(tiDevSnUpd);
			return o;
		};
		this.actBar.chkLastSNVer([this.getLocalSNVer()]);

		const tiDevCrypto = aTi[Project.#idxDevCrypto];
		this.dspCryptoMode = ()=> {
			tiDevCrypto.description = `-- ${this.#isCryptoMode ?'する' :'しない'}`
			this.emPrjTD.fire(tiDevCrypto);
		};
		this.dspCryptoMode();

		this.#updPathJson();


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
				|| txt.slice(-1)=== '=') return Promise.reject('No word here.');
				return new EvaluatableExpression(r, txt);
			},
		}));


		const {username} = userInfo();
		this.#aPlaceFont	= [
			`${this.#pathWs}/core/font`,
			is_win
				? `C:/Users/${username}/AppData/Local/Microsoft/Windows/Fonts`
				: `/Users/${username}/Library/Fonts`,
			is_win
				? 'C:/Windows/Fonts'
				: '/Library/Fonts',
		];

		// 診断機能
		this.#clDiag = languages.createDiagnosticCollection(docsel.language);

		this.#sendRequest2LSP('ready');
	}
	// https://regex101.com/r/G77XB6/3 20 match, 188 step(~1ms)
	static	readonly	#REG_VAR	= /;.+|[\[*]?[\d\w\.]+=?/;
	readonly	getLocalSNVer	: ()=> {verSN: string, verTemp: string};
				#aDbgSS			: DebugSession[]	= [];
	#onDidTermDbgSS = ()=> {}

	readonly	#ps;

	get title() {return this.#cfg.oCfg.book.title}
	get version() {return this.#cfg.oCfg.book.version}

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

				treeProc(this.#curPrj, path=> {
					if (! /\.(ss?n|json)$/.test(path)) return;

					const pp = path.slice(this.#lenCurPrj);
					pp2s[pp] = readFileSync(path, {encoding: 'utf8'});
				});

				this.#sendRequest2LSP(hd.cmd +'.res', {pp2s, hDefPlg: this.#hDefPlg,});
			}	break;

			case 'analyze_inf':{
				this.#aPickItems = [
					...aPickItems,
					{kind: QuickPickItemKind.Separator},
					...hd.o.aQuickPickMac,
					{kind: QuickPickItemKind.Separator},
					...hd.o.aQuickPickPlg
				];

				this.#InfFont = hd.o.InfFont;

				this.#clDiag.clear();
				for (const [uri, a] of Object.entries(this.#InfFont.hUri2FontErr)) {
					const aD: Diagnostic[] = [];
					for (const {err, nm, sl, sc, el, ec} of a) {
						if (this.#getFontNm2path(nm)) continue;

						aD.push(new Diagnostic(
							new Range(sl, sc, el, ec), err,
							DiagnosticSeverity.Error,
						));
					}
					this.#clDiag.set(Uri.parse(uri), aD);
				}
			}	break;

			case 'hover.res':	this.#hUri2Proc[hd.o?.uri]?.(hd.o);	break;
		}
	}
	#hUri2Proc: {[uri: string]: (o: any)=> void}	= {};
	provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
		return new Promise<Hover>(rs=> {
			// ホバーイベントを伝え、文字列加工だけ任せ文字列を返してもらい、ここで表示
			const uri = 'file://'+ doc.uri.path;
			this.#hUri2Proc[uri] = o=> {
				delete this.#hUri2Proc[uri];

				let value = String(o.value);
				if (! value) return;
				const a = value.split(/(?=\n---\n)/);
				if (a.length === 3) {
					// 中央部分のみ置換。SQLジャンクション的なものの対策
					const [args, ...detail] = a;
//console.log(`fn:Project.ts detail=${detail}=`);
					value = args + detail.join('').replaceAll(
						/<!-- ({.+?}) -->/g,
						(_, e1)=> {
	const o = JSON.parse(e1);
//console.log(`fn:Project.ts line:379 o:${JSON.stringify(o)}:`);

	const {name, val} = o;
	const path = this.#cfg.searchPath(val, SEARCH_PATH_ARG_EXT.SP_GSM);
	const {width = 0, height = 0} = img_size(path);

	const aPathEx = encodeURIComponent(JSON.stringify([Uri.file(path)]));

	const srcEx = `${path}|width=${this.#whThumbnail}|height=${this.#whThumbnail}`;

	return `- ${name} = ${val} (${width}x${height}) ${
		`[ファイルを見る](${path} "ファイルを見る")`
	} [サイドバーに表示](${
		Uri.parse(`command:revealInExplorer?${aPathEx}`)
	} "サイドバーに表示")
	[フォルダを開く](${
		Uri.parse(`command:revealFileInOS?${aPathEx}`)
	} "フォルダを開く")  \n`
	+ `![${val}](${srcEx} "${val}")`;
						}
					);
				}

				const ms = new MarkdownString(value);
			//	const ms = new MarkdownString(value, o.range);// 表示されない
//console.log(`fn:Project.ts ms=${ms.value}=`);
				ms.isTrusted = true;
			//	ms.supportHtml = true;
				rs(new Hover(ms));
			};
			this.#sendRequest2LSP('hover', {uri, pos});
		});
	}
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
		hUri2FontErr	: {},
	};
	readonly	#aPlaceFont;


	#aPickItems	: QuickPickItemEx[] = [];
	openReferencePallet() {
		window.showQuickPick<QuickPickItemEx>(this.#aPickItems, {
			placeHolder			: 'どのリファレンスを開きますか?',
			matchOnDescription	: true,
		})
		.then(q=> {if (q?.uri) openURL(Uri.parse(q.uri), this.#pathWs);});
	}


	// 主に設定画面からのアクション。falseを返すとスイッチなどコンポーネントを戻せる
	async #cmd(nm: string, val: string): Promise<boolean> {
//console.log(`fn:Project.ts #cmd nm:${nm} val:${val}`);
// await (new Promise((re: any)=> setTimeout(re, 2000)));
		// 最新は val。this.ctx.workspaceState.get(（など）) は前回値
		switch (nm) {
		case 'cnv.font.subset':
			if (await window.showInformationMessage('フォントサイズ最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			await this.#subsetFont(Boolean(val));
			break;

		case 'cnv.mat.pic':
			if (await window.showInformationMessage('画像ファイル最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;
			await this.#cnv_mat_pic(Boolean(val) ?'all' :'restore');
			break;
		case 'cnv.mat.webp_quality':
			if (! this.#ps.oWss['cnv.mat.pic']) break;

			await this.#cnv_mat_pic('all_no_move');
			break;

		case 'cnv.mat.snd':
			if (await window.showInformationMessage('音声ファイル最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;
			await this.#cnv_mat_snd(Boolean(val) ?'all' :'restore');
			break;
		case 'cnv.mat.snd.codec':
			if (! this.#ps.oWss['cnv.mat.snd']) break;

			await this.#cnv_mat_snd('all_no_move');
			break;
		}

		return true;
	}
	readonly	#cnv_mat_pic = (pathInp: string)=> this.#exeTask(
		'cnv_mat_pic',
		`${pathInp
		} ${this.#ps.oWss['cnv.mat.webp_quality']
		} "${this.#curPrj}" "${this.#curPrjBase}"`,
	);
	readonly	#cnv_mat_snd = (pathInp: string)=> this.#exeTask(
		'cnv_mat_snd',
		`${pathInp} '{"codec":"${
			this.#ps.oWss['cnv.mat.snd.codec']
		}"}' "${this.#curPrj}" "${this.#curPrjBase}"`,
	);

	readonly	#hTask2Inf = {
		'cut_round': {
			title		: 'アイコン生成・丸く切り抜く',
			pathCpyTo	: 'build',
			aNeedLib	: ['sharp', 'png2icons'],
		},
		'subset_font': {
			title		: 'フォントサイズ最適化',
			pathCpyTo	: 'core/font',
			aNeedLib	: [],
		},
		'cnv_mat_pic': {
			title		: '画像ファイル最適化',
			pathCpyTo	: 'build',
			aNeedLib	: ['sharp'],
		},
		'cnv_mat_snd': {
			title		: '音声ファイル最適化',
			pathCpyTo	: 'build',
			aNeedLib	: ['@ffmpeg-installer/ffmpeg','fluent-ffmpeg'],
		},
	};
	#exeTask(nm: 'subset_font'|'cut_round'|'cnv_mat_pic'|'cnv_mat_snd', arg: string): Promise<number> {
		const inf = this.#hTask2Inf[nm];

		return new Promise(fin=> window.withProgress({
			location	: ProgressLocation.Notification,
			title		: inf.title,
			cancellable	: false,
		}, prg=> new Promise<void>(async donePrg=> {
			const pathJs = this.#pathWs +`/${inf.pathCpyTo}/${nm}.js`;
			await copy(this.ctx.extensionPath +`/dist/${nm}.js`, pathJs);

			const oPkg = await readJson(this.#pathWs +'/package.json', {encoding: 'utf8'});
			const sNeedInst = inf.aNeedLib
			.filter(nm=> ! oPkg.devDependencies[nm])
			.join(' ');

			tasks.executeTask(new Task(
				{type: 'SKYNovel TaskSys'},	// タスクの一意性
				this.wsFld,
				inf.title,		// UIに表示
				'SKYNovel',		// source
				new ShellExecution(
					`cd "${this.#pathWs}" ${statBreak()} ${
						sNeedInst ?`npm i -D ${sNeedInst} ${statBreak()} ` :''
					}node ./${inf.pathCpyTo}/${nm}.js ${arg}`
				),
			))
			.then(
				re=> this.#hTaskExe.set(<any>nm, re),
				rj=> console.error(`fn:Project #exeTask() rj:${rj.message}`)
			);
			this.hOnEndTask.set('Sys', e=> {
				fin(e.exitCode ?? 0);
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
			this.#curPrj +'script/',
			(url, nm)=> {if (this.#REG_FONT.test(nm)) removeSync(url)},
			_=> {},
		);

		if (! minify) {
			// 【node subset_font.js】を実行。終了を待ったり待たなかったり
			await this.#exeTask('subset_font', '');
			this.#ps.updFontInfo();		// フォント情報更新
			return;
		}

		// フォント出現箇所から生成すべき最小限のフォント情報についてまとめる
		const oFont: {[font_nm: string]: {
			inp	: string;
			txt	: string;
		}} = {};
		oFont[Project.DEF_FONT] = {inp: '', txt: ''};

		const ensureFont2Str = (font_nm: string)=> oFont[font_nm] ??= {
			inp: this.#getFontNm2path(font_nm),
			txt: '',
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
		await outputJson(this.#pathWs +'/core/font/font.json', oFont);

		// 【node subset_font.js】を実行。終了を待ったり待たなかったり
		await this.#exeTask('subset_font', '--minify');
		this.#ps.updFontInfo();		// フォント情報更新
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
		let cmd = `cd "${this.#pathWs}" ${statBreak()} `;
		if (! existsSync(this.#pathWs +'/node_modules')) {
			cmd += `npm i ${statBreak()} `;	// 自動で「npm i」
			removeSync(this.#pathWs +'/package-lock.json');
		}

		// メイン処理
		if (cfg.npm) cmd += cfg.npm;
		switch (btn_nm) {	// タスク前処理
			case 'SnUpd':
				this.#termDbgSS()
				.then(()=> this.actBar.updPrjFromTmp(this.#pathWs))
				.then(()=> ncu.run({	// ncu -u --target minor
					packageFile: this.#pathWs +'/package.json',
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
				treeProc(this.#curPrj, path=> {
					if (find_ng || path.slice(-4) !== '.svg') return;

					find_ng = true;
					window.showErrorMessage(
						`ふりーむ！では svg ファイル使用禁止です。png などに置き換えて下さい`, 'フォルダを開く', 'Online Converter',
					)
					.then(a=> {switch (a) {
						case 'フォルダを開く':
							env.openExternal(Uri.file(dirname(path)));	break;
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
			case 'PackLinux':	this.hOnEndTask.set(task_type, ()=> {
				// アップデート用ファイル作成
				const oPkg = readJsonSync(this.#pathWs +'/package.json', {encoding: 'utf8'});

				const pathPkg = this.#pathWs +'/build/package';
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
					removeSync(pathUpd);
					ensureDirSync(pathUpd);
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
				const cn = this.#encry.uuidv5(sha512);

				const ma = /-(\w+)\.\D/.exec(path);
					// https://regex101.com/r/yH7nLk/1	13 steps, 0.0ms
				if (! ma) throw `path に arch が見つかりません`;
				const arch = ma[1];

				const key = (isMacBld ?'darwin' :isLinBld ?'linux' :'win32') +'_'+ arch;
				oUc[key] = {path, size, sha512, cn,};
				outputJsonSync(fnUcJs, oUc, {spaces: '\t'});

				// 古い（暗号化ファイル名）更新ファイルを削除
				const REG_OLD_SAMEKEY = new RegExp('^'+ key +'-');
				foldProc(pathUpd, (url, nm)=> {
					if (REG_OLD_SAMEKEY.test(nm)) removeSync(url);
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
				.append(createReadStream(this.#pathWs +'/doc/web.htm'), {name: 'index.html'})
				.append(createReadStream(this.#pathWs +'/build/include/readme.txt'), {name: 'readme.txt'})
				.glob('web.js', {cwd: this.#pathWs +'/doc/'})
				.glob('web.*.js', {cwd: this.#pathWs +'/doc/'})
				.glob(`${
					this.#isCryptoMode ?Project.fldnm_crypto_prj :'prj'
				}/**/*`, {cwd: this.#pathWs +'/doc/'})
				.glob('favicon.ico', {cwd: this.#pathWs +'/doc/'});

				const fn_out = `${basename(this.#pathWs)}_1.0freem.zip`;
				const ws = createWriteStream(this.#pathWs +`/build/package/${fn_out}`)
				.on('close', ()=> {
					done();
					window.showInformationMessage(
						`ふりーむ！形式で出力（${fn_out}）しました`,
						'出力フォルダを開く',
					).then(a=> {if (a) env.openExternal(Uri.file(this.#pathWs +'/build/package/'))})
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


	#crePrj(e: Uri) {this.#encIfNeeded(e.path); this.#updPathJson();}
	#chgPrj(e: Uri) {this.#encIfNeeded(e.path);}
	#delPrj(e: Uri) {
		const short_path = e.path.slice(this.#lenCurPrj);
		removeSync(
			this.#curCrypto + short_path
			.replace(this.#REG_REPPATHJSON, '.bin')
			.replace(/"/, '')
		);
		this.#updPathJson();

		delete this.#hDiff[short_path];
		this.#updDiffJson();
	}


	// 暗号化
	#initCrypto() {
		const fnc: (path: string)=> void = this.#isCryptoMode
			? path=> {if (this.#isDiff(path)) this.#encFile(path);}
			: path=> this.#isDiff(path)
		treeProc(this.#curPrj, fnc);
		this.#updDiffJson();
	}
	#encIfNeeded(url: string) {
		if (this.#isCryptoMode && this.#isDiff(url)) this.#encFile(url);
		this.#updDiffJson();
	}
	#updDiffJson() {writeJsonSync(this.#fnDiff, this.#hDiff);}
	readonly	#LEN_CHKDIFF	= 1024;
	#isDiff(url: string): boolean {
		const short_path = url.slice(this.#lenCurPrj);
		const diff = this.#hDiff[short_path];
		if (diff) {
			const url_c = url
			.replace(/\/prj\/.+$/, `/${Project.#fld_crypto_prj}/${diff.cn}`);
			if (! existsSync(url_c)) return true;
		}

		let hash = 0;
		if (this.#REG_FULLCRYPTO.test(url)) {
			hash = crc32.str(readFileSync(url, {encoding: 'utf8'}));
		}
		else {
			const b = new Uint8Array(this.#LEN_CHKDIFF);
			const fd = openSync(url, 'r');
			readSync(fd, b, 0, this.#LEN_CHKDIFF, 0);
			closeSync(fd);
			hash = crc32.buf(b);
		}
		if (diff?.hash === hash) return false;

		this.#hDiff[short_path] = {
			hash,
			cn: this.#REG_NEEDCRYPTO.test(short_path)
				? short_path.replace(
					this.#REG_SPATH2HFN,
					`$1/${this.#encry.uuidv5(short_path)}$2`
				)
				.replace(this.#REG_REPPATHJSON, '.bin')
				: short_path,
		};
		return true;
	}
	readonly	#REG_SPATH2HFN	= /([^\/]+)\/[^\/]+(\.\w+)/;


	readonly	#aRepl = [
		'core/app4webpack.js',
		'core/web4webpack.js',
	];
	#tglCryptoMode() {
		const pathPre = this.#curPlg +'snsys_pre';
		this.#isCryptoMode = ! this.#isCryptoMode;
		if (! this.#isCryptoMode) {
			removeSync(this.#curCrypto);

			removeSync(pathPre);

			// ビルド関連：SKYNovelが見に行くプロジェクトフォルダ名変更
			for (const url of this.#aRepl) replaceFile(
				this.#pathWs +'/'+ url,
				/\(hPlg, {.+?}\);/,
				`(hPlg);`,
			);
			// ビルド関連：パッケージするフォルダ名変更
			replaceFile(
				this.#pathWs +'/package.json',
				new RegExp(`"doc/${Project.#fld_crypto_prj}\\/",`),
				`"doc/prj/",`,
			);
			this.#updPlugin();	// doc/prj/prj.json 更新＆ビルド

			return;
		}

		ensureDir(this.#curCrypto);

		// ビルド関連：SKYNovelが見に行くプロジェクトフォルダ名変更
		for (const url of this.#aRepl) replaceFile(
			this.#pathWs +'/'+ url,
			/\(hPlg\);/,
			`(hPlg, {cur: '${Project.#fld_crypto_prj}/', crypto: true});`,
		);
		// ビルド関連：パッケージするフォルダ名変更
		replaceFile(
			this.#pathWs +'/package.json',
			/"doc\/prj\/",/,
			`"doc/${Project.#fld_crypto_prj}/",`,
		);
		// ビルド関連：プラグインソースに埋め込む
		replaceFile(
			this.ctx.extensionPath +`/dist/snsys_pre.js`,
			/pia\.tstDecryptInfo\(\)/,
			this.#encry.strHPass,
			pathPre +'/index.js',
		);
		this.#updPlugin();	// doc/prj/prj.json 更新＆ビルド

		this.#hDiff = Object.create(null);
		this.#initCrypto();
	}

	static	readonly #LEN_ENC	= 1024 *10;
			readonly #REG_DIR	= /(^.+)\//;
	#tiDelayEnc: NodeJS.Timer | null = null;
	async #encFile(path_src: string) {
		try {
			const short_path = path_src.slice(this.#lenCurPrj);
			const path_enc = this.#curCrypto + this.#hDiff[short_path].cn;
			if (! this.#REG_NEEDCRYPTO.test(path_src)) {
				await remove(path_enc);	// これがないとエラーが出るみたい
				await copy(path_src, path_enc);
				//.catch((e: any)=> console.error(`enc cp1 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラー
					// となるだけなので
				return;
			}

			if (this.#REG_FULLCRYPTO.test(short_path)) {	// この中はSync
				if (short_path !== 'path.json') {	// 内容も変更
					const s = readFileSync(path_src, {encoding: 'utf8'});
					outputFileSync(path_enc, this.#encry.enc(s));
					return;
				}

				if (this.#tiDelayEnc) clearTimeout(this.#tiDelayEnc);	// 遅延
				this.#tiDelayEnc = setTimeout(()=> {
					const s = readFileSync(path_src, {encoding: 'utf8'});
					// ファイル名匿名化
					const hPath: IFn2Path = JSON.parse(s);
					for (const hExt2N of Object.values(hPath)) {
						for (const [ext, v] of Object.entries(hExt2N)) {
							if (ext === ':cnt') continue;
							if (ext.slice(-10) === ':RIPEMD160') continue;
							const path = String(v);
							const dir = this.#REG_DIR.exec(path);
							if (dir && this.#cfg.oCfg.code[dir[1]]) continue;

							hExt2N[ext] = this.#hDiff[path].cn;
						}
					}
					const sNew = JSON.stringify(hPath);
					outputFileSync(path_enc, this.#encry.enc(sNew));
				}, 500);
				return;
			}

			const dir = this.#REG_DIR.exec(short_path);
			if (dir && this.#cfg.oCfg.code[dir[1]]) {
				await remove(path_enc);	// これがないとエラーが出るみたい
				await copy(path_src, path_enc);
				//.catch((e: any)=> console.error(`enc cp2 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラー
					// となるだけなので
				return;
			}

			let cnt_code = Project.#LEN_ENC;
			let ite_buf = 2;
			const bh = new Uint8Array(ite_buf + cnt_code);
			bh[0] = 0;	// bin ver
			bh[1] = this.#hExt2N[extname(short_path).slice(1)] ?? 0;

			const u2 = path_enc.replace(/\.[^.]+$/, '.bin');
			await ensureFile(u2);	// touch
			const ws = createWriteStream(u2)
			.on('error', e=> {ws.destroy(); console.error(`enc ws=%o`, e);});

			const rs = createReadStream(path_src)
			.on('error', e=> console.error(`enc rs=%o`, e));

			const tr = new EncryptorTransform(this.#encry, path_src);
			rs.pipe(tr).pipe(ws);
		}
		catch (e) {console.error(`enc other ${e.message} src:${path_src}`);}
	}


	readonly	#REG_PLGADDTAG	= /(?<=\.\s*addTag\s*\(\s*)(["'])(.+?)\1/g;
	#hDefPlg	: {[def_nm: string]: PluginDef}	= {};
	#updPlugin(build = true) {
		if (! existsSync(this.#curPlg)) return;

		const h4json	: {[def_nm: string]: number}	= {};
		this.#hDefPlg = {};
		foldProc(this.#curPlg, ()=> {}, nm=> {
			h4json[nm] = 0;

			const path = `${this.#curPlg}${nm}/index.js`;
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

		outputFile(this.#curPlg.slice(0, -1) +'.js', `export default ${JSON.stringify(h4json)};`)
		.then(build ?()=> this.#build() :()=> {})
		.catch((err: any)=> console.error(`Project updPlugin ${err}`));
	}
	#build = ()=> {
		if (! ActivityBar.aReady[eTreeEnv.NPM]) return;

		this.#build = ()=> {};	// onceにする
		// 起動時にビルドが走るのはこれ
		// 終了イベントは Project.ts の tasks.onDidEndTaskProcess で
		let cmd = `cd "${this.#pathWs}" ${statBreak()} `;
		if (! existsSync(this.#pathWs +'/node_modules')) {
			cmd += `npm i ${statBreak()} `;		// 自動で「npm i」
			removeSync(this.#pathWs +'/package-lock.json');
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
				this.#updPlugin();
				done();
			};
			tasks.onDidEndTaskProcess(fnc);

			tasks.executeTask(t)
			.then(undefined, rj=> console.error(`Project build() rj:${rj.message}`));
				// この resolve は「executeTask()できたかどうか」だけで、
				// Task終了を待って呼んでくれるわけではない
		}));
	}


	#tiDelayPathJson: NodeJS.Timer | null = null;
	#updPathJson() {
		if (this.#tiDelayPathJson) clearTimeout(this.#tiDelayPathJson);	// 遅延
		this.#tiDelayPathJson = setTimeout(()=> {
			this.#cfg.loadEx(path_src=> this.#encFile(path_src), this.#clDiag);
		}, 100);
	}

}
