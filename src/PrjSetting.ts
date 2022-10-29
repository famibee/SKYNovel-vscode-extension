/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {foldProc, getFn, replaceRegsFile, treeProc, v2fp} from './CmnLib';
import {ActivityBar, eTreeEnv, getNonce} from './ActivityBar';
import {Config} from './Config';
import {openURL} from './WorkSpaces';
import {FLD_PRJ_BASE} from './Project';
import {DEF_WSS, REG_SN2TEMP, T_A_CNVFONT, T_E2V_INIT, T_E2V_TEMP, T_TEMP, T_V2E_SELECT_ICON_FILE, T_E2V_CNVFONT, T_V2E_TEMP, T_E2V_CFG, T_E2V_SELECT_ICON_INFO, T_E2V_NOTICE_COMPONENT, T_E2V_OPTIMG, T_OPTIMG, T_V2E_WSS, DEF_OPTIMG, T_E2V_CHG_RANGE_WEBP_Q, T_OPTSND, T_E2V_OPTSND, DEF_OPTSND, T_E2V_CHG_RANGE_WEBP_Q_DEF} from '../views/types';

import {WorkspaceFolder, WebviewPanel, ExtensionContext, window, ViewColumn, Uri, env} from 'vscode';
import {copyFile, ensureFile, existsSync, readFile, readFileSync, readJson, readJsonSync, remove, statSync, writeFile, writeJson, writeJsonSync} from 'fs-extra';
import {basename} from 'path';
import {v4 as uuidv4} from 'uuid';
import {userInfo} from 'os';


export class PrjSetting {
	readonly	#wss;
				#oWss			= DEF_WSS;
	readonly	#PATH_WS		: string;
	readonly	#PATH_PRJ		: string;
	readonly	#PATH_PRJ_JSON	: string;
	readonly	#PATH_APP_JS	: string;
	readonly	#PATH_PKG_JSON	: string;
	readonly	#PATH_PRJ_BASE;
	readonly	#LEN_PATH_PRJ_BASE;

				#fnSetting		: string;
	readonly	#PATH_INS_NSH		: string;
	readonly	#PATH_ICON			: string;
	readonly	#PATH_README4FREEM	: string;
	readonly	#localExtensionResRoots: Uri;

				#htmSrc	= '';

	readonly	#PATH_OPT_PIC	: string;
	readonly	#PATH_OPT_SND	: string;
				#oOptPic	: T_OPTIMG;
				#oOptSnd	: T_OPTSND;

	constructor(readonly ctx: ExtensionContext, readonly wsFld: WorkspaceFolder, private cfg: Config, private readonly chgTitle: (title: string)=> void, private readonly setEscape: ()=> void, private cmd: (nm: string, val: string)=> Promise<boolean>, private exeTask: (nm: 'subset_font'|'cut_round'|'cnv_mat_pic'|'cnv_mat_snd', arg: string)=> Promise<number>) {
		this.#wss = ctx.workspaceState;
		let oWss = DEF_WSS as {[nm: string]: any};
		for (const [nm, v] of Object.entries(oWss)) {
			const d: any = this.#wss.get(nm);
			if (d) oWss[nm] = d;
			else this.#wss.update(nm, v);
		}
		this.#oWss = oWss as any;
		this.#setOnOptPic();
		this.#setOnOptSnd();

		this.#PATH_WS = v2fp(wsFld.uri.path);
		this.#PATH_PRJ = this.#PATH_WS +'/doc/prj/';
		this.#PATH_PRJ_JSON = this.#PATH_PRJ +'prj.json';
		this.#PATH_APP_JS = this.#PATH_WS +'/doc/app.js';
		this.#PATH_PKG_JSON = this.#PATH_WS +'/package.json';
		this.#PATH_PRJ_BASE = this.#PATH_WS +`/doc/${FLD_PRJ_BASE}/`;
		this.#LEN_PATH_PRJ_BASE = this.#PATH_PRJ_BASE.length;

		this.#PATH_README4FREEM = this.#PATH_WS +'/build/include/readme.txt';
		const path_ext = ctx.extensionPath;
		const a: (()=> Promise<void>)[] = [];
		if (! existsSync(this.#PATH_README4FREEM)) a.push(async ()=> {
			await ensureFile(this.#PATH_README4FREEM);
			await copyFile(path_ext +'/res/readme.txt', this.#PATH_README4FREEM);
		});

		this.#PATH_INS_NSH = this.#PATH_WS +'/build/installer.nsh';
		if (! existsSync(this.#PATH_INS_NSH)) a.push(()=> copyFile(
			path_ext +'/res/installer.nsh', this.#PATH_INS_NSH
		));;

		this.#PATH_ICON = this.#PATH_WS +'/build/icon.png';
		if (! existsSync(this.#PATH_ICON)) a.push(()=> copyFile(
			path_ext +'/res/img/icon.png', this.#PATH_ICON
		));

		const fnLaunchJs = this.#PATH_WS +'/.vscode/launch.json';
		if (! existsSync(fnLaunchJs)) a.push(()=> copyFile(
			path_ext +'/res/launch.json', fnLaunchJs
		));

//		setEscape();	// 非同期禁止

		this.#PATH_OPT_PIC = this.#PATH_WS +'/build/cnv_mat_pic.json';
		this.#PATH_OPT_SND = this.#PATH_WS +'/build/cnv_mat_snd.json';

		const path_vue_root = path_ext +`/views/`;
		this.#localExtensionResRoots = Uri.file(path_vue_root);
		a.push(
			async ()=> {
				chgTitle(this.cfg.oCfg.book.title);
				PrjSetting.#hWsFld2token[wsFld.uri.path] = ()=> this.cfg.oCfg.debuger_token;

				if (existsSync(this.#PATH_OPT_PIC)) this.#oOptPic = readJsonSync(this.#PATH_OPT_PIC, {encoding: 'utf8'});
				else writeJsonSync(this.#PATH_OPT_PIC, this.#oOptPic = DEF_OPTIMG);

				if (existsSync(this.#PATH_OPT_SND)) this.#oOptSnd = readJsonSync(this.#PATH_OPT_SND, {encoding: 'utf8'});
				else writeJsonSync(this.#PATH_OPT_SND, this.#oOptSnd = DEF_OPTSND);
			},

			async ()=> {// prj.json に既にないディレクトリのcodeがあれば削除
				foldProc(this.#PATH_PRJ, ()=> {}, nm=> {
					if (nm in this.cfg.oCfg.code) return;
					this.cfg.oCfg.code[nm] = false;
				});
			},

			async ()=> {
				this.#htmSrc = (await readFile(
					path_vue_root +'setting.htm', {encoding: 'utf8'}
				))
				.replace('<meta_autooff ', '<meta ')// ローカルデバッグしたいので
				.replaceAll('${nonce}', getNonce())
				.replace('.ts"></script>', '.js"></script>');

				if (this.cfg.oCfg.save_ns === 'hatsune'
				|| this.cfg.oCfg.save_ns === 'uc') this.open();
			},

			async ()=> {
				treeProc(this.#PATH_PRJ, path=> {
					if (path.slice(-11) !== '/setting.sn') return;
					this.#aPathSettingSn.push(path);
				});
				this.#chkMultiMatch_SettingSn();
			},
		);

		Promise.allSettled(a.map(t=> t()));
	}


	getLocalSNVer(): {verSN: string, verTemp: string} {
		const oPkg = readJsonSync(this.#PATH_PKG_JSON, {encoding: 'utf8'});
		const fnCngLog = this.#PATH_WS +'/CHANGELOG.md';
		return {
			verSN	: oPkg.dependencies['@famibee/skynovel']?.slice(1) ?? '',
			verTemp	: existsSync(fnCngLog)
				? readFileSync(fnCngLog, {encoding: 'utf8'}).match(/## v(.+)\s/)?.[1] ?? ''
				: '',
		};
	}

	static	readonly	#hWsFld2token: {[path: string]: ()=> string}= {};
	static	getDebugertoken(wsFld: WorkspaceFolder | undefined) {
		if (! wsFld) return '';
		return PrjSetting.#hWsFld2token[wsFld.uri.path]() ?? '';
	}

	onCreDir({path}: Uri) {
		if (! statSync(path).isDirectory()) return;

		this.cfg.oCfg.code[basename(path)] = false;
		//fs.outputJson(this.fnPrjJs, this.oCfg);
			// これを有効にすると（Cre & Del）時にファイルが壊れるので省略
		this.#cmd2Vue(<T_E2V_CFG>{cmd: 'update.oCfg', oCfg: this.cfg.oCfg});
	}
	onDelDir({path}: Uri) {
		delete this.cfg.oCfg.code[basename(path)];
		this.#writePrjJs();
		this.#cmd2Vue(<T_E2V_CFG>{cmd: 'update.oCfg', oCfg: this.cfg.oCfg});
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
	onDelSettingSn({path}: Uri) {
		this.#aPathSettingSn = this.#aPathSettingSn.filter(v=> v !== path);
	}
	#chkMultiMatch_SettingSn() {
		this.#aTemp = [];
		const cntSn = this.#aPathSettingSn.length;
		if (cntSn !== 1) {
			this.#fnSetting = '';
			this.#cmd2Vue(<T_E2V_TEMP>{
				cmd		: 'update.aTemp',
				err		: (cntSn < 1
							? 'setting.sn がありません'
							: 'setting.sn が複数マッチします。一つにして下さい<br/>'
							+ this.#aPathSettingSn.map(v=> `ファイル位置：${v}`)
							.join('<br/>\n')
						),
				aTemp	: [],
			});
			return;
		}

		this.#fnSetting = this.#aPathSettingSn[0];
		const src = readFileSync(this.#fnSetting, {encoding: 'utf8'});
		for (const [full, nm1, nm2, val, sep = '', lbl_json = ''] of src.matchAll(REG_SN2TEMP)) {
			if (full.at(0) === ';') continue;

			const lbl = lbl_json.trim();
			if (lbl === '' || lbl.slice(0, 10) === '(HIDE GUI)') continue;

			const nm = nm1 ?? nm2;
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
					if (val === 'true' || val === 'false') {
						o.type = 'chk';
						break;
					}
			}
			this.#aTemp.push(o);
		}
//console.log(`fn:PrjSetting.ts line:237 this.#aTemp:%o`, this.#aTemp);
		this.#cmd2Vue(<T_E2V_TEMP>{
			cmd		: 'update.aTemp',
			err		: '',
			aTemp	: this.#aTemp,
		});
	}
	#aTemp	: T_TEMP[]	= [];


	async	onCreChgOptSnd(_url: Uri) {}
	async	onDelOptSnd(_url: Uri) {}
	#unsetOnOptSnd() {
		this.onCreChgOptSnd = async ()=> {};
		this.onDelOptSnd = async ()=> {};
	}
	#setOnOptSnd() {
		if (! this.#oWss['cnv.mat.snd']) {this.#unsetOnOptSnd(); return;}

		this.onCreChgOptSnd = async ({path})=> {
			path = v2fp(path);
			if (this.#REG_EXT_SND_REST.test(path)) return;

			// mp3・wavファイルを追加・更新時、退避に上書き移動して aac化
			const isBase = this.#isBaseUrl(path);
			this.#unsetOnOptSnd();

			const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: 'cnv.mat.snd', mode: 'wait'};
			this.#cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

			await this.exeTask(
				'cnv_mat_snd',
				`"${isBase
					? path.replace(this.#PATH_PRJ_BASE, this.#PATH_PRJ)
					: path
				}" '{"codec":"${ this.#oWss['cnv.mat.snd.codec'] }"}' "${
					isBase
					? path
					: path.replace(this.#PATH_PRJ, this.#PATH_PRJ_BASE)
				}" ${isBase ?'no_move' :''}`,
			);

			o.mode = 'comp';
			this.#cmd2Vue(o);

			this.#oOptSnd = await readJson(this.#PATH_OPT_SND, {encoding: 'utf8'});
			this.#dispOptSnd();

			this.#setOnOptSnd();
		};
		this.onDelOptSnd = async ({path})=> {
			path = v2fp(path);
			const isBase = this.#isBaseUrl(path);
			this.#unsetOnOptSnd();
			if (! isBase) {
				const path2 = path.replace(this.#PATH_PRJ, this.#PATH_PRJ_BASE);
				for (const ext of ['mp3','wav']) {
					await remove(path2.replace(/(m4a|aac|ogg)$/, ext));
				}
				this.#setOnOptSnd();
				return;
			}

			// 退避を消したら変換後  aac... も削除
			for (const ext of ['m4a','aac','ogg']) await remove(
				path.replace(this.#PATH_PRJ_BASE, this.#PATH_PRJ)
				.replace(this.#REG_EXT_SND_CNV, '.'+ ext)
			);
			const fn = getFn(path);
			if (fn in this.#oOptSnd.hSize) {
				const {baseSize, optSize} = this.#oOptSnd.hSize[fn];
				this.#oOptSnd.sum.baseSize -= baseSize;
				this.#oOptSnd.sum.optSize -= optSize;
				delete this.#oOptSnd.hSize[fn];
				await writeJson(this.#PATH_OPT_SND, this.#oOptSnd, {encoding: 'utf8'});
				this.#dispOptSnd();
			}
			this.#setOnOptSnd();
		};
	}
		readonly	#REG_EXT_SND_REST	= /\.(m4a|aac|ogg)$/;
		readonly	#REG_EXT_SND_CNV	= /\.(mp3|wav)$/;


	async	onCreChgOptPic(_url: Uri) {}
	async	onDelOptPic(_url: Uri) {}
	#unsetOnOptPic() {
		this.onCreChgOptPic = async ()=> {};
		this.onDelOptPic = async ()=> {};
	}
	#setOnOptPic() {
		if (! this.#oWss['cnv.mat.pic']) {this.#unsetOnOptPic(); return;}

		this.onCreChgOptPic = async ({path})=> {
			path = v2fp(path);
			if (this.#REG_EXT_PIC_REST.test(path)) return;

			// jpg・pngファイルを追加・更新時、退避に上書き移動して webp化
			const isBase = this.#isBaseUrl(path);
			this.#unsetOnOptPic();

			const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: 'cnv.mat.pic', mode: 'wait'};
			this.#cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

			await this.exeTask(
				'cnv_mat_pic',
				`"${isBase
					? path.replace(this.#PATH_PRJ_BASE, this.#PATH_PRJ)
					: path
				}" ${ this.oWss['cnv.mat.webp_quality'] } "${
					isBase
					? path
					: path.replace(this.#PATH_PRJ, this.#PATH_PRJ_BASE)
				}" ${isBase ?'no_move' :''}`,
			);

			o.mode = 'comp';
			this.#cmd2Vue(o);

			this.#oOptPic = await readJson(this.#PATH_OPT_PIC, {encoding: 'utf8'});
			this.#dispOptPic();

			this.#setOnOptPic();
		};
		this.onDelOptPic = async ({path})=> {
			path = v2fp(path);
			const isBase = this.#isBaseUrl(path);
			this.#unsetOnOptPic();
			if (! isBase) {
				const path2 = path.replace(this.#PATH_PRJ, this.#PATH_PRJ_BASE);
				for (const ext of ['jpeg','jpg','png']) {
					await remove(path2.replace(/webp$/, ext));
				}
				this.#setOnOptPic();
				return;
			}

			// 退避を消したら変換後 WebP も削除
			await remove(
				path.replace(this.#PATH_PRJ_BASE, this.#PATH_PRJ)
				.replace(this.#REG_EXT_PIC_CNV, '.webp')
			);
			// 退避を消したケースでのみ上方 json 更新（このメソッドが多重発生）
			const fn = getFn(path);
			if (fn in this.#oOptPic.hSize) {
				const {baseSize, webpSize} = this.#oOptPic.hSize[fn];
				this.#oOptPic.sum.baseSize -= baseSize;
				this.#oOptPic.sum.webpSize -= webpSize;
				delete this.#oOptPic.hSize[fn];
				await writeJson(this.#PATH_OPT_PIC, this.#oOptPic, {encoding: 'utf8'});
				this.#dispOptPic();
			}
			this.#setOnOptPic();
		};
	}
		readonly	#REG_EXT_PIC_REST	= /\.webp$/;
		readonly	#REG_EXT_PIC_CNV	= /\.(jpe?g|png)$/;
		// prj（変換後フォルダ）下の削除か prj_base（退避素材ファイル）か判定
		#isBaseUrl(url :string): boolean {return url.slice(0, this.#LEN_PATH_PRJ_BASE) === this.#PATH_PRJ_BASE;}


	get oWss() {return this.#oWss}
	#pnlWV	: WebviewPanel | undefined = undefined;
	#cmd2Vue = (_mes: T_E2V_CFG | T_E2V_INIT | T_E2V_TEMP | T_E2V_NOTICE_COMPONENT | T_E2V_SELECT_ICON_INFO | T_E2V_CNVFONT | T_E2V_OPTIMG | T_E2V_OPTSND)=> {};
	#wvuWs		: Uri;
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

		const {username} = userInfo();
		this.#cmd2Vue = (mes: any)=> wv.postMessage(mes);
		wv.onDidReceiveMessage(m=> {switch (m.cmd) {
		case '?':
			this.#cmd2Vue(<T_E2V_INIT>{
				cmd		: '!',
				oCfg	: this.cfg.oCfg,
				oWss	: this.#oWss,
				pathIcon: this.#pathIcon,
			});
			this.dispFontInfo();
			this.#dispOptPic();
			this.#dispOptSnd();
			this.#chkMultiMatch_SettingSn();
			break;

		case 'update.oCfg':{
			const e: T_E2V_CFG = m;
			const escOld = this.cfg.oCfg.init.escape;
			const cfg = this.cfg.oCfg = e.oCfg
			if (cfg.init.escape !== escOld) this.setEscape();
			cfg.debuger_token ||= uuidv4();
			this.#writePrjJs();

			this.chgTitle(cfg.book.title);

			const CopyrightYear = String((new Date()).getFullYear());
			Promise.allSettled([
				(async ()=> {
					const p = await readJson(this.#PATH_PKG_JSON, {encoding:'utf8'});
					p.name = cfg.save_ns;
					p.appBundleId = p.appId
					= `com.fc2.blog.famibee.skynovel.${cfg.save_ns}`;

					p.version = cfg.book.version;
					p.productName = cfg.book.title;
					p.author = cfg.book.creator;
					p.appCopyright = `(c)${cfg.book.creator}`;
					p.homepage = cfg.book.pub_url;
					p.description = cfg.book.detail;
					writeFile(this.#PATH_PKG_JSON, JSON.stringify(p, null , '\t'));
				})(),

				(async ()=> replaceRegsFile(this.#PATH_APP_JS, [
					[/(width\s*: ).*(,)/,	`$1${cfg.window.width}$2`],
					[/(height\s*: ).*(,)/,	`$1${cfg.window.height}$2`],
					[
						/(companyName\s*:\s*)(['"]).*\2/,
						`$1"${cfg.book.publisher}"`
					],
					[	// ついでに発表年を
						/(pkg.appCopyright \+' )\d+/,
						`$1${CopyrightYear}`
					],
				], false))(),

				(async ()=> replaceRegsFile(this.#PATH_README4FREEM, [
					[/(【Version】)[^\n]+/g, `$1${cfg.book.version}`],
					[/(【タイトル】)[^\n]+/g, `$1${cfg.book.title}`],
					[/(【著 作 者】)[^\n]+/g, `$1${cfg.book.creator}`],
					[/(【連 絡 先】メール： )[^\n]+/, `$1${cfg.book.cre_url}`],
					[	// ついでに発表年を
						/(Copyright \(C\) )\d+ "([^"]+)"/g,
						`$1${CopyrightYear} "${cfg.book.publisher}"`
					],
					[/(　　　　　　ＷＥＢ： )[^\n]+/g, `$1${cfg.book.pub_url}`],
				], false))(),

				(async ()=> replaceRegsFile(this.#PATH_INS_NSH, [
					[/(!define PUBLISHER ").+"/, `$1${cfg.book.publisher}"`],
				], false))(),
			]);
		}	break;

		case 'change.range.webp_q_def':{
			// 変化のたびに動作するので 'update.oWss' と統合してはいけない
			if (! this.#oWss['cnv.mat.pic']) break;

			const e: T_E2V_CHG_RANGE_WEBP_Q_DEF = m;
			this.#wss.update('cnv.mat.webp_quality', this.#oWss['cnv.mat.webp_quality'] = e.webp_q);

			this.#unsetOnOptPic();

			const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: 'cnv.mat.pic', mode: 'wait'};
			this.#cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

			this.cmd('cnv.mat.webp_quality', 'all_no_move')
			.then(()=> {
				this.#oOptPic = readJsonSync(this.#PATH_OPT_PIC, {encoding: 'utf8'});
				this.#dispOptPic();

				o.mode = 'comp';
				this.#cmd2Vue(o);

				this.#setOnOptPic();
			});
		}	break;

		case 'change.range.webp_q':{	// ファイル単体
			if (! this.#oWss['cnv.mat.pic']) break;

			const o: T_E2V_CHG_RANGE_WEBP_Q = m;
			const fi = this.#oOptPic.hSize[o.nm];
			if (o.no_def) fi.webp_q = o.webp_q;
			else delete fi.webp_q;
			writeJsonSync(this.#PATH_OPT_PIC, this.#oOptPic);

			// Baseフォルダを渡す事で再変換
			this.onCreChgOptPic(Uri.file(this.#PATH_PRJ_BASE + fi.fld_nm +'.'+ fi.ext));
		}	break;

		case 'update.oWss':{
			const e: T_V2E_WSS = m;
			const aP: (()=> Promise<void>)[] = [];
			for (const [id, val] of Object.entries(e.oWss)) {
				const old_val = (<any>this.#oWss)[id];
				if (old_val == val) continue;

				this.#wss.update(id, val);
				(<any>this.#oWss)[id] = val;
				switch (id) {
					case 'cnv.font.subset'		: break;
				//	case 'cnv.icon.cut_round'	: continue;
					case 'cnv.mat.pic'			: break;
				//	case 'cnv.mat.webp_quality'	: continue;		//===
					case 'cnv.mat.snd'			: break;
					case 'cnv.mat.snd.codec'	: break;
					default:	continue;
				}

				const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id, mode: 'wait'};
				this.#cmd2Vue(o);
				aP.push(()=> this.cmd(id, String(val)).then(go=> {
					if (go) {
						switch (id) {
							case 'cnv.mat.pic':
								this.#oOptPic = readJsonSync(this.#PATH_OPT_PIC, {encoding: 'utf8'});
								this.#dispOptPic();
								break;

							case 'cnv.mat.snd':
							case 'cnv.mat.snd.codec':
								this.#oOptSnd = readJsonSync(this.#PATH_OPT_SND, {encoding: 'utf8'});
								this.#dispOptSnd();
								break;
						}
						o.mode = 'comp';
					}
					else {
						this.#wss.update(id, (<any>this.#oWss[id]) = old_val);
						o.mode = 'cancel';
					}
					this.#cmd2Vue(o);
				}));
			}
			this.#unsetOnOptPic();
			this.#unsetOnOptSnd();
			Promise.allSettled(aP.map(t=> t())).then(()=> {
				this.#setOnOptPic();
				this.#setOnOptSnd();
			});
		}	break;

		case 'update.aTemp':{
			const e: T_V2E_TEMP = m;
			for (const v of e.aRes) {
				this.#fnSetting,
				new RegExp(`(&${v.nm}\\s*=\\s*)((["'#]).+?\\3|[^;\\s]+)`),
				`$1$3${v.val}$3`	// https://regex101.com/r/jD2znK/1
			}
		}	break;

		case 'info':	window.showInformationMessage(m.mes); break;
		case 'warn':	window.showWarningMessage(m.mes); break;

		case 'openURL':	openURL(Uri.parse(m.url), this.#PATH_WS);	break;

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

		case 'selectFile':	this.selectFile_icon(m);	break;
		}}, undefined, this.ctx.subscriptions);
		this.#openSub();
	}
	#openSub() {
		const a: string[] = [];
		foldProc(this.#PATH_PRJ, ()=> {}, nm=> a.push(nm));

		const wv = this.#pnlWV!.webview;
		wv.html = this.#htmSrc
		.replaceAll('${webview.cspSource}', wv.cspSource)
		.replaceAll(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(this.#localExtensionResRoots)}`);
	}

	selectFile_icon({title, openlabel, path}: T_V2E_SELECT_ICON_FILE) {
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
				`"${src}" ${this.#oWss['cnv.icon.cut_round']} "${path}"`,
			);
			this.#cmd2Vue(<T_E2V_SELECT_ICON_INFO>{
				cmd		: 'updimg',
				pathIcon: this.#pathIcon,
				err_mes	: exit_code === 0
					? ''
					: (()=> readJsonSync(this.#PATH_WS +'/build/cut_round.json', {encoding: 'utf8'}).err)()
			});
		})
	}

	readonly	#hHead2Mes: {[head: string]: string}	= {
		'::PATH_PRJ_F'	: 'プロジェクト内（core/font/ 下）',
		'::PATH_USER_'	: 'OS（ユーザー別）へのインストール済みフォント',
		'::PATH_OS_FO'	: 'OS（ユーザー共通）へのインストール済みフォント',
	};
	dispFontInfo() {
		if (! this.#pnlWV) return;

		const fn = this.#PATH_WS +'/core/font/subset_font.json';
		if (! existsSync(fn)) {
			this.#cmd2Vue(<T_E2V_CNVFONT>{cmd: 'update.cnvFont', aCnvFont: []});
			return;
		}

		const o = readJsonSync(fn);
		const aFontInfo: T_A_CNVFONT = Object.entries(o).map(([nm, v])=> ({
			nm,
			mes		: this.#hHead2Mes[(<any>v).inp.slice(0, 12)],
			iSize	: (<any>v).iSize,
			oSize	: (<any>v).oSize,
			err		: (<any>v).err,
		}));
		aFontInfo.sort();
		this.#cmd2Vue(<T_E2V_CNVFONT>{cmd: 'update.cnvFont', aCnvFont: aFontInfo});
	}

	#dispOptPic() {
		this.#cmd2Vue(<T_E2V_OPTIMG>{
			cmd: 'update.optImg',
			oOptImg: <T_OPTIMG>{...this.#oOptPic, sum: {
				...this.#oOptPic.sum,
				pathImgCmpWebP	: this.#wvuWs +'/doc/prj/',
				pathImgCmpBase	: this.#wvuWs +`/doc/${FLD_PRJ_BASE}/`,
			}},
		});
	}
	#dispOptSnd() {
		this.#cmd2Vue(<T_E2V_OPTSND>{
			cmd: 'update.optSnd',
			oOptSnd: <T_OPTSND>{...this.#oOptSnd, sum: {
				...this.#oOptSnd.sum,
				pathSndOpt	: this.#wvuWs +'/doc/prj/',
				pathSndBase	: this.#wvuWs +`/doc/${FLD_PRJ_BASE}/`,
			}},
		});
	}

}
