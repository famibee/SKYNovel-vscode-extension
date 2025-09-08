/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {chkUpdate, foldProc, getFn, replaceRegsFile, v2fp} from './CmnLib';
import {ActivityBar, eTreeEnv, getNonce} from './ActivityBar';
import {Config} from './Config';
import {openURL} from './WorkSpaces';
import {DEF_WSS, REG_SN2TEMP} from '../views/types';
import type {T_A_CNVFONT, T_E2V_INIT, T_E2V_TEMP, T_TEMP, T_V2E_SELECT_ICON_FILE, T_E2V_CNVFONT, T_V2E_TEMP, T_E2V_CFG, T_E2V_SELECT_ICON_INFO, T_E2V_NOTICE_COMPONENT, T_V2E_WSS, T_E2V, T_CMD} from '../views/types';
import {WfbOptPic} from './WfbOptPic';
import {WfbOptSnd} from './WfbOptSnd';

import {Disposable, env, type ExtensionContext, RelativePattern, Uri, ViewColumn, type WebviewPanel, window, workspace, type WorkspaceFolder} from 'vscode';
import {copyFile, ensureFile, existsSync, mkdirs, readFile, readFileSync, readJson, readJsonSync, remove, statSync, writeFile} from 'fs-extra';
import {basename} from 'path';
import {randomUUID} from 'crypto';
import {userInfo} from 'os';


export class PrjSetting implements Disposable {
	readonly	#wss;
				#oWss			= DEF_WSS;
	get			oWss() {return this.#oWss}

	readonly	#PATH_WS		: string;
	readonly	#PATH_PRJ		: string;
	readonly	#PATH_PRJ_JSON	: string;
	readonly	#PATH_APP_JS	: string;
	readonly	#PATH_PKG_JSON	: string;

				#fnSetting		: string;
	readonly	#PATH_INS_NSH		: string;
	readonly	#PATH_ICON			: string;
	readonly	#PATH_README4FREEM	: string;
	readonly	#localExtensionResRoots: Uri;

				#htmSrc	= '';

	// DisposableStack is not implemented
//	readonly	#ds		= new DisposableStack;
	readonly	#ds		: Disposable[]	= [];

	readonly	#setEscape: ()=> void;

	//MARK: コンストラクタ
	constructor(
		private readonly ctx: ExtensionContext,
		readonly wsFld: WorkspaceFolder,
		private readonly cfg: Config,
		private readonly chgTitle: (title: string)=> void,
		private readonly sendRequest2LSP: (cmd: string, o?: any)=> void,
		private readonly onSettingEvt: (nm: string, val: string)=> Promise<boolean>,
		private readonly exeTask: (nm: T_CMD, arg: string)=> Promise<number>,
		private readonly optPic: WfbOptPic,
		private readonly optSnd: WfbOptSnd,
		private readonly fld_src: string,
		private readonly is_new_tmp: boolean,
		private readonly LEN_PATH_PRJ: number,
	) {
		this.#wss = ctx.workspaceState;
		const oWss = DEF_WSS as {[nm: string]: any};
		for (const [nm, v] of Object.entries(oWss)) {
			const d = this.#wss.get(nm);
			if (d) oWss[nm] = <any>d;
			else /* await */ this.#wss.update(nm, v);
		}
		this.#oWss = oWss as any;

		this.#PATH_WS = v2fp(wsFld.uri.path);
		this.#PATH_PRJ = this.#PATH_WS +'/doc/prj/';
		this.#PATH_PRJ_JSON = this.#PATH_PRJ +'prj.json';
		this.#PATH_APP_JS = this.#PATH_WS +'/doc/app.js';
		this.#PATH_PKG_JSON = this.#PATH_WS +'/package.json';

		this.#PATH_README4FREEM = this.#PATH_WS +'/build/include/readme.txt';
		const path_ext = ctx.extensionPath;
		const a = [];
		if (! existsSync(this.#PATH_README4FREEM)) a.push(async ()=> {
			await ensureFile(this.#PATH_README4FREEM);
			await copyFile(path_ext +'/res/readme.txt', this.#PATH_README4FREEM);
		});

		this.#PATH_INS_NSH = this.#PATH_WS +'/build/installer.nsh';
		if (! existsSync(this.#PATH_INS_NSH)) a.push(()=> copyFile(
			path_ext +'/res/installer.nsh', this.#PATH_INS_NSH
		));

		this.#PATH_ICON = this.#PATH_WS +'/build/icon.png';
		if (! existsSync(this.#PATH_ICON)) a.push(()=> copyFile(
			path_ext +'/res/img/icon.png', this.#PATH_ICON
		));

		const fnLaunchJs = this.#PATH_WS +'/.vscode/launch.json';
		if (! existsSync(fnLaunchJs)) a.push(()=> copyFile(
			path_ext +'/res/launch.json', fnLaunchJs
		));

//		setEscape();	// 非同期禁止

		this.#hHead2Mes = {
			'::PATH_PRJ_F'	: `${fld_src}/font/ 下）`,
			'::PATH_USER_'	: 'OS（ユーザー別）へのインストール済みフォント',
			'::PATH_OS_FO'	: 'OS（ユーザー共通）へのインストール済みフォント',
		};

		workspace.onDidSaveTextDocument(e=> {
			if (e.fileName.endsWith('/setting.sn')) this.#chkMultiMatch_SettingSn();
		}, null, ctx.subscriptions);

		const path_vue_root = path_ext +'/dist/';
		this.#localExtensionResRoots = Uri.file(path_vue_root);
		a.push(
			async ()=> {
				chgTitle(cfg.oCfg.book.title);
				PrjSetting.#hWsFld2token[wsFld.uri.path] = ()=> cfg.oCfg.debuger_token;
			},

			async ()=> {// prj.json に既にないディレクトリのcodeがあれば削除
				foldProc(this.#PATH_PRJ, ()=> {}, nm=> {
					if (nm in cfg.oCfg.code) return;
					cfg.oCfg.code[nm] = false;
				});
			},

			async ()=> {
				this.#htmSrc = (await readFile(
					path_vue_root +'setting.html', {encoding: 'utf8'}
				))
				.replace('<meta_autooff ', '<meta ')// ローカルデバッグしたいので
				.replaceAll('${nonce}', getNonce())
				.replace('.ts"></script>', '.js"></script>');

				// テンプレのままなら変更をうながすため設定画面を開く
				if (this.#setTmp_save_ns.has(cfg.oCfg.save_ns)) this.open();
			},

			async ()=> {
				const aUri = await workspace.findFiles(new RelativePattern(wsFld, 'doc/prj/*/setting.sn'));
				for (const {path} of aUri) {
					const fp = v2fp(path);
					this.#aPathSettingSn.push(fp)
				}
				this.#chkMultiMatch_SettingSn();
			},

			()=> mkdirs(this.#PATH_WS +`/${fld_src}/resource/`),
			async ()=> this.cnvWatch(
				new RelativePattern(wsFld, `${fld_src}/resource/*.psd`),
				`doc/prj/face/{[FN]_*.png,face[FN].sn}`, async ({fsPath})=> {
					const hn = getFn(fsPath);
					if (chkUpdate(fsPath, `${this.#PATH_PRJ}face/face${hn}.sn`)) await this.exeTask('cnv_psd_face', `"${fsPath}" "${this.#PATH_PRJ}"`);
				}, this.#ds,
				(uri, cre)=> this.optPic.optPic(uri, cre ?'CRE' :'CHG'),
				uri=>	 	 this.optPic.optPic(uri, 'DEL')
			),
		);

		Promise.allSettled(a.map(t=> t()));

		this.#setEscape = ()=> sendRequest2LSP('def_esc.upd');
	}
	#setTmp_save_ns	= new Set([
		'tmp_esm_uc',
		'tmp_cjs_sample',
		'tmp_cjs_hatsune',
		'tmp_cjs_uc',
		'sn_sample',
		'hatsune',
		'uc',
	]);

	//MARK: デストラクタ
//	[Symbol.dispose]() {this.#ds.dispose()}
	dispose() {for (const d of this.#ds) d.dispose()}


	//MARK: 変換処理とファイル監視
	//	fncGen	初期化時・ファイル生成・変更・削除のどれでも通る
	async cnvWatch(rpInp: RelativePattern, pathOut: string, fncGen: (uri: Uri)=> Promise<void>, aDs: Disposable[], crechg= async (uri: Uri, cre=false)=> {}, del= async (uri: Uri)=> {}) {
		await workspace.findFiles(rpInp).then(async aUri=> {
			// バッチ処理等なので並列処理しない
			for await (const uri of aUri) fncGen(uri);
		});

		const fw = workspace.createFileSystemWatcher(rpInp);
		aDs.push(fw.onDidCreate(async uri=> {
			if (statSync(uri.path).isDirectory()) return;

			return fncGen(uri).then(()=> crechg(uri, true));
		}));
		aDs.push(fw.onDidChange(async uri=> {
			if (statSync(uri.path).isDirectory()) return;

			await this.#delOut(pathOut, uri);
			return fncGen(uri).then(()=> crechg(uri));
		}));
		aDs.push(fw.onDidDelete(	// フォルダごと削除すると、発生しない！
			uri=> this.#delOut(pathOut, uri).then(()=> del(uri))
		));
	}
		async	#delOut(pathOut: string, {fsPath}: Uri) {
			if (pathOut === '') return;

			const hn = getFn(fsPath);
			const aUri = await workspace.findFiles(pathOut.replaceAll('[FN]', hn));
			await Promise.allSettled(aUri.map(({path})=> remove(path)));
		}


	getLocalSNVer(): {verSN: string, verTemp: string} {
		const oPkg = readJsonSync(this.#PATH_PKG_JSON, {encoding: 'utf8'});
		const fnCngLog = this.#PATH_WS +'/CHANGELOG.md';
		const lib_name = `@famibee/skynovel${this.is_new_tmp ?'_esm': ''}`;
		return {
			verSN	: oPkg.dependencies?.[lib_name]?.slice(1) ?? '',
			verTemp	: existsSync(fnCngLog)
				? readFileSync(fnCngLog, {encoding: 'utf8'}).match(/## v(.+)\s/)?.[1] ?? ''
				: '',
		};
	}

	static	readonly	#hWsFld2token: {[path: string]: ()=> string}= {};
	static	getDebugertoken(wsFld: WorkspaceFolder | undefined) {
		if (! wsFld) return '';
		return PrjSetting.#hWsFld2token[wsFld.uri.path]?.() ?? '';
	}

	onCreDir({path}: Uri) {
		this.cfg.oCfg.code[basename(path)] = false;
		//fs.outputJson(this.fnPrjJs, this.oCfg);
			// これを有効にすると（Cre & Del）時にファイルが壊れるので省略
		this.cmd2Vue(<T_E2V_CFG>{cmd: 'update.oCfg', oCfg: this.cfg.oCfg});
	}
	onDelDir({path}: Uri) {
		delete this.cfg.oCfg.code[basename(path)];
		this.#writePrjJs();
		this.cmd2Vue(<T_E2V_CFG>{cmd: 'update.oCfg', oCfg: this.cfg.oCfg});
	}
	#writePrjJs() {
		const o = {...this.cfg.oCfg};
		o.code = {};
		for (const [nm, v] of Object.entries(this.cfg.oCfg.code)) {
			if (v) o.code[nm] = true;
		}
		return writeFile(this.#PATH_PRJ_JSON, JSON.stringify(o, null , '\t'));
	}

	// 複数マッチチェック用
	#aPathSettingSn		: string[] = [];
	onCreSettingSn({path}: Uri) {
		this.#aPathSettingSn.push(path);
		this.#chkMultiMatch_SettingSn();
	}
//	onChgSettingSn(_: Uri) {}
	onDelSettingSn({path}: Uri) {
		this.#aPathSettingSn = this.#aPathSettingSn.filter(v=> v !== path);
	}
	#preventUpdHowl = true;	// 更新ハウリングを防ぐ
		// ついでに初回の不要な 'update.aTemp' を止めるため true 始まりで
	#chkMultiMatch_SettingSn() {
		this.#preventUpdHowl = true;

		const aTemp	: T_TEMP[]	= [];
		const cntSn = this.#aPathSettingSn.length;
		if (cntSn !== 1) {
			this.#fnSetting = '';
			this.cmd2Vue(<T_E2V_TEMP>{
				cmd		: 'update.aTemp',
				err		: (cntSn < 1
							? 'setting.sn がありません'
							: 'setting.sn が複数マッチします。一つにして下さい<br/>'
							+ this.#aPathSettingSn.map(v=> `ファイル位置：${v}`)
							.join('<br/>\n')
						),
				aTemp,
			});
			return;
		}

		this.#fnSetting = this.#aPathSettingSn[0]!;
		const src = readFileSync(this.#fnSetting, {encoding: 'utf8'});
		for (const [full, nm1, nm2, val='', sep='', lbl_json=''] of src.matchAll(REG_SN2TEMP)) {
			if (full.at(0) === ';') continue;

			const lbl = lbl_json.trim();
			if (lbl === '' || lbl.startsWith('(HIDE GUI)')) continue;

			const nm = nm1 ?? nm2 ?? '';
			let o: T_TEMP = {
				id	: '/setting.sn:'+ nm,
				nm,
				lbl,
				type: 'txt',
				val	: sep ?val.slice(1, -1) :val,
			};
			if (lbl.at(0) === '{') o = {...o, ...JSON.parse(lbl)};
			switch (o.type) {	// 型チェック
				case 'rng':	break;
		/*
			document.querySelectorAll('.form-range').forEach(c=> {
				const rngV = c.closest('.range-wrap').querySelector('.range-badge');
				const setValue = ()=> {
					const	val = Number( (c.value - c.min) *100 /(c.max - c.min) ),
							pos = 10 -(val *0.2);
					rngV.innerHTML = `<span>${c.value}</span>`;
					rngV.style.left = `calc(${val}% + (${pos}px))`;
				};
				setValue();
				c.addEventListener('input', setValue, {passive: true});
			});
		*/

				default:
					if (val === 'true' || val === 'false') o.type = 'chk';
			}
			aTemp.push(o);
		}
		this.cmd2Vue(<T_E2V_TEMP>{
			cmd		: 'update.aTemp',
			err		: '',
			aTemp,
		});
	}


	//MARK: 設定ビューを開く
	#pnlWV	: WebviewPanel | undefined = undefined;
	cmd2Vue = (_mes: T_E2V)=> {};
	#wvuWs		: Uri;
	get	wvuWs(): Uri {return this.#wvuWs}
	#pathIcon	: string;
	open() {
		if (! ActivityBar.aReady[eTreeEnv.NPM]) return;

		const column = window.activeTextEditor?.viewColumn;
		if (this.#pnlWV) {
			this.#pnlWV.reveal(column);
			this.#openSub();
			return;
		}

		const p = this.#pnlWV = window.createWebviewPanel('SKYNovel-setting', '設定', column || ViewColumn.One, {
			enableScripts		: true,
		//	retainContextWhenHidden: true,	// 楽だがメモリオーバーヘッド高らしい
			localResourceRoots	: [
				this.#localExtensionResRoots,
				Uri.file(this.#PATH_WS),
			],
		});
		p.onDidDispose(()=> this.#pnlWV = undefined, undefined, this.ctx.subscriptions);
		const wv = this.#pnlWV!.webview;
		this.#wvuWs = wv.asWebviewUri(Uri.file(this.#PATH_WS));
		this.#pathIcon = `${this.#wvuWs}/build/icon.png`;

		this.cmd2Vue = (mes: any)=> wv.postMessage(mes);
		wv.onDidReceiveMessage(m=> this.#procInput(m), undefined, this.ctx.subscriptions);
		this.#openSub();
	}
	#tiDelayUpdTemp: NodeJS.Timeout | undefined = undefined;
		#openSub() {
			const a: string[] = [];
			foldProc(this.#PATH_PRJ, ()=> {}, nm=> a.push(nm));

			const wv = this.#pnlWV!.webview;
			wv.html = this.#htmSrc
			.replaceAll('${webview.cspSource}', wv.cspSource)
			.replaceAll(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(this.#localExtensionResRoots)}`);
		}

	//MARK: パネル入力の対応
	async #procInput(m: any) {
		const {username} = userInfo();
		switch (m.cmd) {
		case '?':
			this.cmd2Vue(<T_E2V_INIT>{
				cmd		: '!',
				oCfg	: this.cfg.oCfg,
				oWss	: this.#oWss,
				pathIcon: this.#pathIcon,
				fld_src	: this.fld_src,
			});
			await this.dispFontInfo();
			this.optPic.dispOptPic();
			this.optSnd.dispOptSnd();
			this.#chkMultiMatch_SettingSn();
			break;

		case 'update.oCfg':{
			const e: T_E2V_CFG = m;
			const escOld = this.cfg.oCfg.init.escape;
			// コピー
			const oc = this.cfg.oCfg;
			const save_ns = e.oCfg.save_ns ?? oc.save_ns;
			const c = this.cfg.oCfg = {
				...oc,
				book	: {...oc.book, ...e.oCfg.book},
				save_ns,
				window	: {...oc.window, ...e.oCfg.window},
				log		: {...oc.log, ...e.oCfg.log},
				init	: {...oc.init, ...e.oCfg.init},
				debug	: {...oc.debug, ...e.oCfg.debug},
				code	: {...oc.code, ...e.oCfg.code},
				debuger_token	:
					this.#setTmp_save_ns.has(save_ns)
					? ''	// テンプレのままなら空白とする（使用者のみセットさせる）
					: (e.oCfg.debuger_token ?? oc.debuger_token) || randomUUID(),
			};

			if (c.init.escape !== escOld) this.#setEscape();
			await this.#writePrjJs();

			this.chgTitle(c.book.title);

			// package.json
			const CopyrightYear = String(new Date().getFullYear());
			const p = await readJson(this.#PATH_PKG_JSON, {encoding: 'utf8'});
			p.name = c.save_ns;
			p.appBundleId = p.appId
				= `com.fc2.blog.famibee.skynovel.${c.save_ns}`;
			
			p.version = c.book.version;
			p.productName = c.book.title;
			p.author = c.book.creator;
			p.appCopyright = `(c)${c.book.creator}`;
			p.homepage = c.book.pub_url;
			p.description = c.book.detail;
			
			p.build.appId = p.appId;
			p.build.productName = c.book.title.normalize('NFD');
			// p.build.productName = c.book.title;
				// electron-builder 不具合対策
				// macOS app crashes when build.productName contains NFC characters · Issue #9264 · electron-userland/electron-builder https://github.com/electron-userland/electron-builder/issues/9264
			p.build.artifactName = `\${name}-\${version}-\${arch}.\${ext}`;
			await writeFile(this.#PATH_PKG_JSON, JSON.stringify(p, null, '\t'));

			// src/main/main.ts, doc/app.js
			if (this.is_new_tmp) replaceRegsFile(this.#PATH_WS +'/src/main/main.ts', [
				[
					/(companyName\s*:\s*)(['"]).*\2/,
					`$1"${c.book.publisher}"`
				],
				[	// ついでに発表年を
					/(pkg.appCopyright \+' )\d+/,
					`$1${CopyrightYear}`
				],
			], false);
			else replaceRegsFile(this.#PATH_APP_JS, [
				[
					/(companyName\s*:\s*)(['"]).*\2/,
					`$1"${c.book.publisher}"`
				],
				[	// ついでに発表年を
					/(pkg.appCopyright \+' )\d+/,
					`$1${CopyrightYear}`
				],
			], false);

			// build/include/readme.txt
			replaceRegsFile(this.#PATH_README4FREEM, [
				[/(【Version】)[^\n]+/g, `$1${c.book.version}`],
				[/(【タイトル】)[^\n]+/g, `$1${c.book.title}`],
				[/(【著 作 者】)[^\n]+/g, `$1${c.book.creator}`],
				[/(【連 絡 先】メール： )[^\n]+/, `$1${c.book.cre_url}`],
				[	// ついでに発表年を
					/(Copyright \(C\) )\d+ "([^"]+)"/g,
					`$1${CopyrightYear} "${c.book.publisher}"`
				],
				[/(　　　　　　ＷＥＢ： )[^\n]+/g, `$1${c.book.pub_url}`],
			], false);

			// build/installer.nsh
			replaceRegsFile(this.#PATH_INS_NSH, [
				[/(!define PUBLISHER ").+"/, `$1${c.book.publisher}"`],
			], false);
		}	break;

		case 'change.range.webp_q_def':
			await this.optPic.chgWebp_q_def(m);
			break;

		case 'change.range.webp_q':
			await this.optPic.chgWebp_q(m);	// ファイル単体
			break;

		case 'update.oWss':{	// views/store/stWSS.ts .cmd2Ex() からの
			const e: T_V2E_WSS = m;
			for (const [id, val] of Object.entries(e.oWss)) {
				const old_val = (<any>this.#oWss)[id];
				if (old_val == val) continue;

				await this.#wss.update(id, val);
				(<any>this.#oWss)[id] = val;
				switch (id) {
					case 'cnv.font.subset':		break;
				//	case 'cnv.icon.shape':		continue;
					case 'cnv.mat.pic':			break;
				//	case 'cnv.mat.webp_quality':continue;		//===
					case 'cnv.mat.snd':			break;
					case 'cnv.mat.snd.codec':	break;
					default:	continue;
				}

				const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id, mode: 'wait'};
				this.cmd2Vue(o);

				const go = await this.onSettingEvt(id, String(val));
				if (go) {
					switch (id) {
						case 'cnv.mat.pic':
							this.optPic.updOptPic();
							break;

						case 'cnv.mat.snd':
						case 'cnv.mat.snd.codec':
							this.optSnd.updOptSnd();
							break;
					}
					o.mode = 'comp';
				}
				else {
					await this.#wss.update(id, (<any>this.#oWss[id]) = old_val);
					o.mode = 'cancel';
				}
				this.cmd2Vue(o);
				break;
			}
		}	break;

		case 'update.aTemp':{
			if (this.#preventUpdHowl) {this.#preventUpdHowl = false; break;}

			if (this.#tiDelayUpdTemp) clearTimeout(this.#tiDelayUpdTemp);	// 遅延
			this.#tiDelayUpdTemp = setTimeout(()=> {
				const e: T_V2E_TEMP = m;
				const a: [r: RegExp, rep: string][] = [];
				for (const {nm, val} of e.aRes) a.push([
					new RegExp(`(&${nm}\\s*=\\s*)((["'#]).+?\\3|[^;\\s]+)`),
					`$1$3${val}$3`,		// https://regex101.com/r/jD2znK/1
				]);	// (new RegExp("~")) の場合は、バックスラッシュは２つ必要
				if (replaceRegsFile(this.#fnSetting, a, false)) {
					const fp = this.#fnSetting;
					const pp = fp.slice(this.LEN_PATH_PRJ);
					const pp2s: {[pp: string]: string} = {};
					pp2s[pp] = readFileSync(fp, {encoding: 'utf8'});
					this.sendRequest2LSP('onchg_scr', {pp2s});
				}
					// 【file:///Users/...】 LSPの doc 特定で使う
			}, 500);
		}	break;

		case 'info':	window.showInformationMessage(m.mes); break;
		case 'warn':	window.showWarningMessage(m.mes); break;

		case 'openURL':	openURL(Uri.parse(m.url), this.#PATH_WS); break;

		case 'copyTxt':{
			if (m.id !== 'copy.folder_save_app') break;

			switch (process.platform) {
				case 'win32':
					env.clipboard.writeText(`C:\\Users\\${username}\\AppData\\Roaming\\${this.cfg.oCfg.save_ns}\\storage\\`);
					break;
				case 'darwin':
					env.clipboard.writeText(`/Users/${username}/Library/Application Support/${this.cfg.oCfg.save_ns}/storage/`);
					break;
				case 'linux':
					env.clipboard.writeText(`~/.config/${this.cfg.oCfg.save_ns}/storage/`);
					break;
			}
			window.showInformationMessage(`クリップボードに【アプリ版（通常実行）セーブデータ保存先パス】をコピーしました`);
		}	break;

		case 'selectFile': this.#selectFile_icon(m); break;
		}
	}
		#selectFile_icon({title, openlabel, path}: T_V2E_SELECT_ICON_FILE) {
			//if (id !== 'icon') return;
			window.showOpenDialog({
				title	: `${title}を選択して下さい`,
				openLabel		: openlabel ?? 'ファイルを選択',
				canSelectMany	: false,
				canSelectFiles	: false,
				canSelectFolders: false,
			}).then(async fileUri=> {
				const src = fileUri?.[0]?.fsPath;
				if (! src) return;	// キャンセル

				const exit_code = await this.exeTask(
					'cut_round',
					`"${src}" ${this.#oWss['cnv.icon.shape']} "${path}" ${this.is_new_tmp}`,
				);
				this.cmd2Vue(<T_E2V_SELECT_ICON_INFO>{
					cmd		: 'updpic',
					pathIcon: this.#pathIcon,
					err_mes	: exit_code === 0
						? ''
						: (()=> readJsonSync(this.#PATH_WS +'/build/cut_round.json', {encoding: 'utf8'}).err)()
				});
			})
		}

	readonly	#hHead2Mes: {[head: string]: string};
	async dispFontInfo() {
		if (! this.#pnlWV) return;

		const fn = `${this.#PATH_WS}/${this.fld_src}/font/subset_font.json`;
		if (! existsSync(fn)) {
			this.cmd2Vue(<T_E2V_CNVFONT>{cmd: 'update.cnvFont', aCnvFont: []});
			return;
		}

		const o = await readJson(fn);
		const aFontInfo: T_A_CNVFONT = Object.entries(o).map(([nm, v])=> ({
			nm,
			mes		: this.#hHead2Mes[(<any>v).inp.slice(0, 12)]!,
			iSize	: (<any>v).iSize,
			oSize	: (<any>v).oSize,
			err		: (<any>v).err,
		}));
		aFontInfo.sort();
		this.cmd2Vue(<T_E2V_CNVFONT>{cmd: 'update.cnvFont', aCnvFont: aFontInfo});
	}

}
