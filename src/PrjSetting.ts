/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_E2V_INIT, T_E2V_CFG, T_E2V_NOTICE_COMPONENT, T_V2E_WSS, T_E2V} from '../views/types';
import {DEF_WSS} from '../views/types';
import {chkBoolean, replaceRegsFile, fsp2fp} from './CmnLib';
import {ActivityBar, eTreeEnv, getNonce} from './ActivityBar';
import type {Config} from './Config';
import {openURL} from './WorkSpaces';
import type {WfbOptPic} from './WfbOptPic';
import type {WfbOptSnd} from './WfbOptSnd';
import type {WfbOptFont} from './WfbOptFont';
import {WPFolder} from './WPFolder';
import {WfbSettingSn} from './WfbSettingSn';
import type {HDiff} from './HDiff';

import type {Disposable, ExtensionContext, WebviewPanel, WorkspaceFolder} from 'vscode';
import {env, Uri, ViewColumn, window} from 'vscode';
import {copyFile, ensureFile, existsSync, readFile, readFileSync, readJson, readJsonSync, writeFile} from 'fs-extra';
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

	readonly	#PATH_INS_NSH		: string;
	readonly	#PATH_ICON			: string;
	readonly	#PATH_README4FREEM	: string;
	readonly	#localExtensionResRoots: Uri;

				#htmSrc	= '';

				#pnlWVFolder;
	get pnlWVFolder() {return this.#pnlWVFolder}

	readonly	#stgSn;

	// DisposableStack is not implemented
//	readonly	#ds		= new DisposableStack;
	readonly	#ds		: Disposable[]	= [];

	readonly	#setEscape: ()=> void;

	//MARK: コンストラクタ
	constructor(
		private readonly ctx: ExtensionContext,
		readonly wsFld: WorkspaceFolder,
		private readonly cfg	: Config,
		private readonly setTitle: (title: string)=> void,
				readonly sendRequest2LSP: (cmd: string, o?: any)=> void,
				readonly diff	: HDiff,
		private readonly optPic	: WfbOptPic,
		private readonly optSnd	: WfbOptSnd,
		private readonly optFont: WfbOptFont,
		private readonly FLD_SRC: string,
		private readonly is_new_tmp	: boolean,
	) {
		this.#wss = ctx.workspaceState;
		const oWss = DEF_WSS as {[nm: string]: any};
		for (const [nm, v] of Object.entries(oWss)) {
			const d = this.#wss.get(nm);
			if (d) oWss[nm] = <any>d;
			else /* await */ this.#wss.update(nm, v);
		}
		this.#oWss = oWss as any;

		this.#PATH_WS = fsp2fp(wsFld.uri.path);
		this.#PATH_PRJ = this.#PATH_WS +'/doc/prj/';
		this.#PATH_PRJ_JSON = this.#PATH_PRJ +'prj.json';
		this.#PATH_APP_JS = this.#PATH_WS +'/doc/app.js';
		this.#PATH_PKG_JSON = this.#PATH_WS +'/package.json';

		this.#pnlWVFolder	= new WPFolder(
			ctx,
			this.#PATH_WS,
			this.#PATH_PRJ,
			diff,
		);
		this.#stgSn = new WfbSettingSn(sendRequest2LSP);

		this.#PATH_README4FREEM = this.#PATH_WS +'/build/include/readme.txt';
		this.#PATH_INS_NSH = this.#PATH_WS +'/build/installer.nsh';
		this.#PATH_ICON = this.#PATH_WS +'/build/icon.png';

//		setEscape();	// 非同期禁止

		this.#setEscape = ()=> sendRequest2LSP('need_go');

		const path_ext = ctx.extensionPath;
		const path_vue_root = path_ext +'/dist/';
		this.#localExtensionResRoots = Uri.file(path_vue_root);
		Promise.allSettled([
			async ()=> {
				setTitle(cfg.oCfg.book.title);
				PrjSetting.#hWsFld2token[wsFld.uri.path] = ()=> cfg.oCfg.debuger_token;
			},

			// 設定画面
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

			// setting.sn
			()=> this.#stgSn.init(),

			// ふりーむ向け
			async ()=> {
				if (! existsSync(this.#PATH_README4FREEM)) {
					await ensureFile(this.#PATH_README4FREEM);
					await copyFile(path_ext +'/res/readme.txt', this.#PATH_README4FREEM);
				}

				if (! existsSync(this.#PATH_INS_NSH)) await copyFile(
					path_ext +'/res/installer.nsh', this.#PATH_INS_NSH
				);

				if (! existsSync(this.#PATH_ICON)) await copyFile(
					path_ext +'/res/img/icon.png', this.#PATH_ICON
				);

				const fnLaunchJs = this.#PATH_WS +'/.vscode/launch.json';
				if (! existsSync(fnLaunchJs)) await copyFile(
					path_ext +'/res/launch.json', fnLaunchJs
				);
			},
		].map(p=> p()));
	}
	readonly	#setTmp_save_ns	= new Set([
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

	static	readonly	#hWsFld2token: {[path: string]: ()=> string} = {};
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

		this.#pnlWVFolder.close();
	}
	#writePrjJs() {
		const o = {...this.cfg.oCfg};
		o.code = {};
		for (const [nm, v] of Object.entries(this.cfg.oCfg.code)) {
			if (v) o.code[nm] = true;
		}
		return writeFile(this.#PATH_PRJ_JSON, JSON.stringify(o, null , '\t'));
	}


	//MARK: 設定ビューを開く
	#pnlWV	: WebviewPanel | undefined = undefined;
	get isOpenPnlWV() {return !!this.#pnlWV}
	cmd2Vue = (_mes: T_E2V)=> {};
	#wvuWs	: Uri;
	get	wvuWs() {return this.#wvuWs}
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
		wv.onDidReceiveMessage(m=> this.#hCmd2ProcInput[m.cmd]?.(m), undefined, this.ctx.subscriptions);
		this.#openSub();
	}
		#openSub() {
			const wv = this.#pnlWV!.webview;
			wv.html = this.#htmSrc
			.replaceAll('${webview.cspSource}', wv.cspSource)
			.replaceAll(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(this.#localExtensionResRoots)}`);
		}

	//MARK: パネル入力の対応
	readonly #hCmd2ProcInput: {[cmd: string]: (m: any)=> Promise<void>}	= {
		'?'	: async ()=> {
			this.cmd2Vue(<T_E2V_INIT>{
				cmd		: '!',
				oCfg	: this.cfg.oCfg,
				oWss	: this.#oWss,
				pathIcon: this.#pathIcon,
				fld_src	: this.FLD_SRC,
			});
			await this.optPic.disp();
			await this.optSnd.disp();
			await this.optFont.disp();
			this.#stgSn.chkMultiMatch();
		},

		'update.oCfg'	: async (e: T_E2V_CFG)=> {
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

			this.setTitle(c.book.title);

			// package.json
			const CopyrightYear = new Date().getFullYear();
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
		},

		'change.range.webp_q_def': m=> this.optPic.chgWebp_q_def(m),

		'change.range.webp_q'	: m=> this.optPic.chgWebp_q(m),

		// views/store/stWSS.ts .cmd2Ex() からのイベント
		'update.oWss'	: async (e: T_V2E_WSS)=> {
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

				const go = await this.#onSettingEvt(id, String(val));
				if (go) {
					switch (id) {
						case 'cnv.mat.pic':
							await this.optPic.disp();
							break;

						case 'cnv.mat.snd':
						case 'cnv.mat.snd.codec':
							await this.optSnd.disp();
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
		},

		'update.aTemp'		: m=> this.#stgSn.update(m),

		'info'	: m=> window.showInformationMessage(m.mes) as Promise<void>,
		'warn'	: m=> window.showWarningMessage(m.mes) as Promise<void>,

		'openURL': async m=> openURL(Uri.parse(m.url), this.#PATH_WS),

		'copyTxt': async m=> {
			if (m.id !== 'copy.folder_save_app') return;

			const {username} = userInfo();
			switch (process.platform) {
				case 'win32':
					await env.clipboard.writeText(`C:\\Users\\${username}\\AppData\\Roaming\\${this.cfg.oCfg.save_ns}\\storage\\`);
					break;
				case 'darwin':
					await env.clipboard.writeText(`/Users/${username}/Library/Application Support/${this.cfg.oCfg.save_ns}/storage/`);
					break;
				case 'linux':
					await env.clipboard.writeText(`~/.config/${this.cfg.oCfg.save_ns}/storage/`);
					break;
			}
			window.showInformationMessage(`クリップボードに【アプリ版（通常実行）セーブデータ保存先パス】をコピーしました`);
		},

		'selectFile'	: m=> this.optPic.cnvIconShape(m, this.#pathIcon),
	};

	//MARK: 設定パネルイベント
	// 主に設定画面からのアクション。falseを返すとスイッチなどコンポーネントを戻せる
	async #onSettingEvt(nm: string, val: string): Promise<boolean> {
//console.log(`fn:Project.ts #cmd nm:${nm} val:${val}`);
		// 最新は val。this.ctx.workspaceState.get(（など）) は前回値
		switch (nm) {
		case 'cnv.font.subset':
			if (await window.showInformationMessage('フォントサイズ最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			if (! ActivityBar.aReady[eTreeEnv.PY_FONTTOOLS]) break;

			if (chkBoolean(val)) await this.optFont.enable();
			else await this.optFont.disable();
			break;

		case 'cnv.mat.pic':
			if (await window.showInformationMessage('画像ファイル最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			if (chkBoolean(val)) await this.optPic.enable();
			else await this.optPic.disable();
			break;

		case 'cnv.mat.snd':
			if (await window.showInformationMessage('音声ファイル最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			if (chkBoolean(val)) await this.optSnd.enable();
			else await this.optSnd.disable();
			break;

		case 'cnv.mat.snd.codec':
			await this.optSnd.reconv();
			break;
		}

		return true;
	}

}
