/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_V2E_CFG, T_E2V_CFG, T_E2V, T_V2E, T_E2V_INIT, T_E2V_NOTICE_COMPONENT, TK_WSS} from './types';
import {DEF_WSS} from './types';
import {chkBoolean, replaceRegsFile, repWvUri} from './CmnLib';
import {ActivityBar, getNonce} from './ActivityBar';
import type {Config} from './Config';
import {openURL} from './WorkSpaces';
import type {T_LocalSNVer, T_reqPrj2LSP} from './Project';
import type {PrjCmn} from './PrjCmn';
import type {WfbOptPic} from './batch/WfbOptPic';
import type {WfbOptSnd} from './batch/WfbOptSnd';
import type {WfbOptFont} from './batch/WfbOptFont';
import {WPFolder} from './WPFolder';
import {WfbSettingSn} from './batch/WfbSettingSn';

import type {Disposable, WebviewPanel, WorkspaceFolder} from 'vscode';
import {env, Uri, ViewColumn, window} from 'vscode';
import {copyFile, ensureFile, existsSync, readFile, readFileSync, readJson, readJsonSync, writeFile} from 'fs-extra';
import {basename} from 'path';
import {randomUUID} from 'crypto';
import {userInfo} from 'os';


export class PrjSetting implements Disposable {
	readonly	#wss;
				#oWss	= DEF_WSS;
	get			oWss() {return this.#oWss}

	readonly	#PATH_PRJ_JSON	: string;
	readonly	#PATH_APP_JS	: string;
	readonly	#PATH_PKG_JSON	: string;

	readonly	#PATH_INS_NSH		: string;
	readonly	#PATH_ICON			: string;
	readonly	#PATH_README4FREEM	: string;
	readonly	#uriRes: Uri;

				#htmSrc	= '';

				#pnlWVFolder;
	get pnlWVFolder() {return this.#pnlWVFolder}

	readonly	#stgSn;

	// DisposableStack is not implemented
//	readonly	#ds		= new DisposableStack;
	readonly	#ds		: Disposable[]	= [];

	readonly	#setEscape: ()=> Promise<void>;


	//MARK: コンストラクタ
	constructor(
		private readonly pc		: PrjCmn,
		private readonly cfg	: Config,
		private readonly setTitle	: (title: string)=> void,
				readonly reqPrj2LSP	: T_reqPrj2LSP,
		private readonly optPic	: WfbOptPic,
		private readonly optSnd	: WfbOptSnd,
		private readonly optFont: WfbOptFont,
	) {
		this.#wss = this.pc.ctx.workspaceState;
		const oWss = DEF_WSS;
		for (const [nm, v] of Object.entries(oWss)) {
			const d = this.#wss.get(nm);
			if (d) oWss[<TK_WSS>nm] = <never>d;
			else void this.#wss.update(nm, v);
		}
		this.#oWss = oWss;

		this.#PATH_PRJ_JSON = this.pc.PATH_PRJ +'prj.json';
		this.#PATH_APP_JS = this.pc.PATH_WS +'/doc/app.js';
		this.#PATH_PKG_JSON = this.pc.PATH_WS +'/package.json';

		this.#pnlWVFolder = new WPFolder(this.pc);
		this.#stgSn = new WfbSettingSn(this.pc, reqPrj2LSP);

		this.#PATH_README4FREEM = this.pc.PATH_WS +'/build/include/readme.txt';
		this.#PATH_INS_NSH = this.pc.PATH_WS +'/build/installer.nsh';
		this.#PATH_ICON = this.pc.PATH_WS +'/build/icon.png';

		// setEscape();	// 非同期禁止

		this.#setEscape = ()=> reqPrj2LSP({cmd: 'need_go'});

		const path_ext = this.pc.ctx.extensionPath;
		const path_vue_root = path_ext +'/dist/';
		this.#uriRes = Uri.file(path_vue_root);
		void Promise.allSettled([
			()=> Promise.try(()=> {
				setTitle(cfg.oCfg.book.title);
				PrjSetting.#hWsFld2token[this.pc.wsFld.uri.path] = ()=> cfg.oCfg.debuger_token;
			}),

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

				const fnLaunchJs = this.pc.PATH_WS +'/.vscode/launch.json';
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
	dispose() {for (const d of this.#ds) d.dispose()}


	getLocalSNVer(): T_LocalSNVer {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const oPkg = readJsonSync(this.#PATH_PKG_JSON, {encoding: 'utf8'});
		const fnCngLog = this.pc.PATH_WS +'/CHANGELOG.md';
		const lib_name = `@famibee/skynovel${this.pc.IS_NEW_TMP ?'_esm': ''}`;
		return {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			ver_sn	: oPkg.dependencies?.[lib_name]?.slice(1) ?? '',
			is_new_tmp	: this.pc.IS_NEW_TMP,
			ver_temp	: existsSync(fnCngLog)
				? /## v(.+)\s/.exec(readFileSync(fnCngLog, {encoding: 'utf8'}))?.[1] ?? ''
				: '',
		};
	}

	static	readonly	#hWsFld2token: {[path: string]: ()=> string} = {};
	static	getDebugertoken(wsFld: WorkspaceFolder | undefined) {
		if (! wsFld) return '';
		return PrjSetting.#hWsFld2token[wsFld.uri.path]?.() ?? '';
	}

	async onCreDir({path}: Uri) {
		this.cfg.oCfg.code[basename(path)] = false;
		//fs.outputJson(this.fnPrjJs, this.oCfg);
			// これを有効にすると（Cre & Del）時にファイルが壊れるので省略
		await this.cmd2Vue(<T_E2V_CFG>{cmd: 'update.oCfg', oCfg: this.cfg.oCfg});
	}
	async onDelDir({path}: Uri) {
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete this.cfg.oCfg.code[basename(path)];
		void this.#writePrjJs();
		await this.cmd2Vue(<T_E2V_CFG>{cmd: 'update.oCfg', oCfg: this.cfg.oCfg});

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
	#wp	: WebviewPanel | undefined = undefined;
	#pathIcon	: string;
	open() {
		if (! ActivityBar.getReady('NPM')) return;
		const column = window.activeTextEditor?.viewColumn;
		if (this.#wp) {
			this.#wp.reveal(column);

			const wv = this.#wp.webview;
			wv.html = repWvUri(this.#htmSrc, wv, this.#uriRes);
			return;
		}
		const p = this.#wp = window.createWebviewPanel('SKYNovel-setting', '設定', column ?? ViewColumn.One, {
			enableScripts		: true,
		//	retainContextWhenHidden: true,	// 楽だがメモリオーバーヘッド高らしい
			localResourceRoots	: [
				this.#uriRes,
				Uri.file(this.pc.PATH_WS),
			],
		});
		p.onDidDispose(()=> {
			this.#wp = undefined;
			this.cmd2Vue = _=> Promise.resolve(false);
		}, undefined, this.pc.ctx.subscriptions);
		const wv = p.webview;
		this.#wvuWs = wv.asWebviewUri(Uri.file(this.pc.PATH_WS));
		this.#pathIcon = `${String(this.#wvuWs)}/build/icon.png`;	// 必ず String() で
		this.cmd2Vue = async mes=> wv.postMessage(mes);
		wv.onDidReceiveMessage((m: T_V2E)=> this.#onDidReceiveMessage(m), undefined, this.pc.ctx.subscriptions);
		wv.html = repWvUri(this.#htmSrc, wv, this.#uriRes);
	}
		cmd2Vue: (mes: T_E2V)=> Promise<boolean> = _=> Promise.resolve(false);

		#wvuWs	: Uri;
		get	wvuWs() {return String(this.#wvuWs)}	// 必ず String() で

	//MARK: パネル入力の対応
	async #onDidReceiveMessage(m: T_V2E) {switch (m.cmd) {
		case '?':
			await Promise.allSettled([
				(async ()=> {
					await this.cmd2Vue(<T_E2V_INIT>{
						cmd		: '!',
						oCfg	: this.cfg.oCfg,
						oWss	: this.#oWss,
						pathIcon: this.#pathIcon,
						fld_src	: this.pc.FLD_SRC,
					});
					this.#stgSn.chkMultiMatch();
				})(),
				this.optFont.disp(),
				this.optPic.disp(),
				this.optSnd.disp(),
			]);
			break;

		case 'update.oCfg':{
			const {oCfg}: T_V2E_CFG = m;
			const escOld = this.cfg.oCfg.init.escape;
			// コピー
			const oc = this.cfg.oCfg;
			const save_ns = oCfg.save_ns ?? oc.save_ns;
			const c = this.cfg.oCfg = {
				...oc,
				book	: {...oc.book, ...oCfg.book},
				save_ns,
				window	: {...oc.window, ...oCfg.window},
				log		: {...oc.log, ...oCfg.log},
				init	: {...oc.init, ...oCfg.init},
				debug	: {...oc.debug, ...oCfg.debug},
				code	: {...oc.code, ...oCfg.code},
				debuger_token	:
					this.#setTmp_save_ns.has(save_ns)
					? ''	// テンプレのままなら空白とする（使用者のみセットさせる）
					: (oCfg.debuger_token ?? oc.debuger_token) || randomUUID(),
			};

			if (c.init.escape !== escOld) await this.#setEscape();
			await this.#writePrjJs();

			this.setTitle(c.book.title);

			// package.json
			const CopyrightYear = new Date().getFullYear();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const p = await readJson(this.#PATH_PKG_JSON, {encoding: 'utf8'});
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			p.name = c.save_ns;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			p.appBundleId = p.appId = `com.fc2.blog.famibee.skynovel.${c.save_ns}`;

			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			p.version = c.book.version;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			p.productName = c.book.title;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			p.author = c.book.creator;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			p.appCopyright = `(c)${c.book.creator}`;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			p.homepage = c.book.pub_url;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			p.description = c.book.detail;

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			p.build.appId = p.appId;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			p.build.productName = c.book.title.normalize('NFD');
			// p.build.productName = c.book.title;
				// electron-builder 不具合対策
				// macOS app crashes when build.productName contains NFC characters · Issue #9264 · electron-userland/electron-builder https://github.com/electron-userland/electron-builder/issues/9264
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			p.build.artifactName = '${name}-${version}-${arch}.${ext}';
			await writeFile(this.#PATH_PKG_JSON, JSON.stringify(p, null, '\t'));

			// src/main/main.ts, doc/app.js
			if (this.pc.IS_NEW_TMP) replaceRegsFile(this.pc.PATH_WS +'/src/main/main.ts', [
			[	// ついでに発表年を
				/(pkg.appCopyright \+' )\d+/,
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`$1${CopyrightYear}`
			],
			], false);
			else replaceRegsFile(this.#PATH_APP_JS, [
			[
				/(companyName\s*:\s*)(['"]).*\2/,
				`$1"${c.book.publisher}"`
			],		// https://regex101.com/r/JydRMl/1
			[	// ついでに発表年を
				/(pkg.appCopyright \+' )\d+/,
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`$1${CopyrightYear} "${c.book.publisher}"`
			],
			// eslint-disable-next-line no-irregular-whitespace
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
			await this.optPic.chgWebp_q(m);
			break;

		case 'update.oWss':
			for (const [id, val] of Object.entries(m.oWss)) {
				const old_val = <never>this.#oWss[<TK_WSS>id];
				if (old_val === val) continue;

				await this.#wss.update(id, val);
				this.#oWss[<TK_WSS>id] = <never>val;
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
				await this.cmd2Vue(o);

				const go = await this.#onSettingEvt(id, String(val));
				if (go) o.mode = 'comp';
				else {
					await this.#wss.update(id, this.#oWss[<TK_WSS>id] = old_val);
					o.mode = 'cancel';
				}
				await this.cmd2Vue(o);
				break;
			}
			break;

		case 'update.aTemp': this.#stgSn.update(m); break;

		case 'info':	window.showInformationMessage(m.mes);	break;
		case 'warn':	window.showWarningMessage(m.mes);	break;
		case 'openURL':	openURL(Uri.parse(m.url), this.pc.PATH_WS);	break;

		case 'copyTxt':{
			if (m.id !== 'copy.folder_save_app') break;

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
			window.showInformationMessage('クリップボードに【アプリ版（通常実行）セーブデータ保存先パス】をコピーしました');
		}	break;

		case 'selectFile':
			await this.optPic.cnvIconShape(m, this.#pathIcon);
			break;
	}}


	//MARK: 設定パネルイベント
	// 主に設定画面からのアクション。falseを返すとスイッチなどコンポーネントを戻せる
	async #onSettingEvt(nm: string, val: string): Promise<boolean> {
//console.log(`fn:Project.ts #cmd nm:${nm} val:${val}`);
		// 最新は val。this.pc.ctx.workspaceState.get(（など）) は前回値
		switch (nm) {
		case 'cnv.font.subset':
			if (await window.showInformationMessage('フォントサイズ最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			if (! ActivityBar.getReady('PY_FONTTOOLS')) break;

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
