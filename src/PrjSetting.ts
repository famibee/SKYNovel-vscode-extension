/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {foldProc, getNonce, openURL, replaceRegsFile, treeProc} from './CmnLib';
import {ActivityBar, eTreeEnv} from './ActivityBar';
import {DEF_CFG, DEF_WSS, REG_SN2TEMP, T_A_CNVFONT, T_E2V_INIT, T_E2V_TEMP, T_TEMP, T_V2E_SELECT_ICON_FILE, T_E2V_CNVFONT, T_V2E_TEMP, T_E2V_CFG, T_E2V_SELECT_ICON_INFO, T_E2V_NOTICE_COMPONENT, T_E2V_OPTIMG, T_OPTIMG, T_V2E_WSS, DEF_OPTIMG, T_E2V_CHG_RANGE_WEBP_Q, T_OPTSND, T_E2V_OPTSND, DEF_OPTSND, T_E2V_CHG_RANGE_WEBP_Q_DEF} from '../views/types';

import {WorkspaceFolder, WebviewPanel, ExtensionContext, window, ViewColumn, Uri, env} from 'vscode';
import {copyFile, ensureFile, existsSync, readFile, readFileSync, readJson, readJsonSync, remove, statSync, writeFile, writeJson, writeJsonSync} from 'fs-extra';
import {basename, parse} from 'path';
import {v4 as uuidv4} from 'uuid';
import {userInfo} from 'os';

export class PrjSetting {
	readonly	#wss;
				#oWss		= DEF_WSS;
	readonly	#pathWs		: string;
	readonly	#fnPrj		: string;
	readonly	#fnPrjJs	: string;
	readonly	#fnPkgJs	: string;
	readonly	#fnAppJs	: string;
				#fnSetting	: string;
	readonly	#fnInsNsh	: string;
	readonly	#fnIcon		: string;
	readonly	#fnReadme4Freem	: string;
	readonly	#localExtensionResRoots: Uri;

				#htmSrc	= '';

	readonly	#fnOptPic	: string;
	readonly	#fnOptSnd	: string;
				#oOptPic	: T_OPTIMG;
				#oOptSnd	: T_OPTSND;

	constructor(readonly ctx: ExtensionContext, readonly wsFld: WorkspaceFolder, private readonly chgTitle: (title: string)=> void, private readonly setEscape: ()=> void, private cmd: (nm: string, val: string)=> Promise<boolean>, private exeTask: (nm: 'subset_font'|'cut_round'|'cnv_mat_pic'|'cnv_mat_snd', arg: string)=> Promise<number>) {
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

		const a: (()=> Promise<void>)[] = [];

		this.#pathWs = wsFld.uri.fsPath;
		this.#fnPrj = this.#pathWs +'/doc/prj/';
		this.#fnPrjJs = this.#fnPrj +'prj.json';
		this.#fnAppJs = this.#pathWs +'/doc/app.js';
		this.#fnPkgJs = this.#pathWs +'/package.json';
		this.#fnPrjBase = this.#pathWs +'/doc/'+ PrjSetting.fld_prj_base
		+'/';
		this.#lenPrjBase = this.#fnPrjBase.length;

		this.#fnReadme4Freem = this.#pathWs +'/build/include/readme.txt';
		const path_ext = ctx.extensionPath;
		if (! existsSync(this.#fnReadme4Freem)) a.push(async ()=> {
			await ensureFile(this.#fnReadme4Freem);
			await copyFile(path_ext +'/res/readme.txt', this.#fnReadme4Freem);
		});

		this.#fnInsNsh = this.#pathWs +'/build/installer.nsh';
		if (! existsSync(this.#fnInsNsh)) a.push(()=> copyFile(
			path_ext +'/res/installer.nsh', this.#fnInsNsh
		));;

		this.#fnIcon = this.#pathWs +'/build/icon.png';
		if (! existsSync(this.#fnIcon)) a.push(()=> copyFile(
			path_ext +'/res/img/icon.png', this.#fnIcon
		));

		const fnLaunchJs = this.#pathWs +'/.vscode/launch.json';
		if (! existsSync(fnLaunchJs)) a.push(()=> copyFile(
			path_ext +'/res/launch.json', fnLaunchJs
		));

		const o = readJsonSync(this.#fnPrjJs, {encoding: 'utf8'});
		this.#oCfg = {	// 後方互換性対応にて二段階目も個別にコピー
			...this.#oCfg,
			...o,
			book	: {...DEF_CFG.book, ...o.book},
			window	: {...DEF_CFG.window, ...o.window},
			log		: {...DEF_CFG.log, ...o.log},
			init	: {...DEF_CFG.init, ...o.init},
			debug	: {...DEF_CFG.debug, ...o.debug},
			code	: {...DEF_CFG.code, ...o.code},
		};
	//	this.#oCfg = {...this.#oCfg, ...o};
//		setEscape();	// 非同期禁止

		this.#fnOptPic = this.#pathWs +'/build/cnv_mat_pic.json';
		this.#fnOptSnd = this.#pathWs +'/build/cnv_mat_snd.json';

		const path_vue_root = path_ext +`/views/`;
		this.#localExtensionResRoots = Uri.file(path_vue_root);
		a.push(
			async ()=> {
				chgTitle(this.#oCfg.book.title);
				PrjSetting.#hWsFld2token[wsFld.uri.path] = ()=> this.#oCfg.debuger_token;

				if (existsSync(this.#fnOptPic)) this.#oOptPic = readJsonSync(this.#fnOptPic, {encoding: 'utf8'});
				else writeJsonSync(this.#fnOptPic, this.#oOptPic = DEF_OPTIMG);

				if (existsSync(this.#fnOptSnd)) this.#oOptSnd = readJsonSync(this.#fnOptSnd, {encoding: 'utf8'});
				else writeJsonSync(this.#fnOptSnd, this.#oOptSnd = DEF_OPTSND);
			},

			async ()=> {// prj.json に既にないディレクトリのcodeがあれば削除
				foldProc(this.#fnPrj, ()=> {}, nm=> {
					if (nm in this.#oCfg.code) return;
					this.#oCfg.code[nm] = false;
				});
			},

			async ()=> {
				this.#htmSrc = (await readFile(
					path_vue_root +'setting.htm', {encoding: 'utf8'}
				))
				.replace('<meta_autooff ', '<meta ')// ローカルデバッグしたいので
				.replaceAll('${nonce}', getNonce())
				.replace('.ts"></script>', '.js"></script>');

				if (this.#oCfg.save_ns === 'hatsune'
				|| this.#oCfg.save_ns === 'uc') this.open();
			},

			async ()=> {
				treeProc(this.#fnPrj, path=> {
					if (path.slice(-11) !== '/setting.sn') return;
					this.#aPathSettingSn.push(path);
				});
				this.#chkMultiMatch_SettingSn();
			},
		);

		Promise.allSettled(a.map(t=> t()));
	}
	getLocalSNVer(): {verSN: string, verTemp: string} {
		const oPkg = readJsonSync(this.#fnPkgJs, {encoding: 'utf8'});
		const fnCngLog = this.#pathWs +'/CHANGELOG.md';
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

	onCreDir(path: string) {
		if (! statSync(path).isDirectory()) return;

		this.#oCfg.code[basename(path)] = false;
		//fs.outputJson(this.fnPrjJs, this.oCfg);
			// これを有効にすると（Cre & Del）時にファイルが壊れるので省略
		this.#cmd2Vue(<T_E2V_CFG>{cmd: 'update.oCfg', oCfg: this.#oCfg});
	}
	onDelDir(path: string) {
		delete this.#oCfg.code[basename(path)];
		this.#writePrjJs();
		this.#cmd2Vue(<T_E2V_CFG>{cmd: 'update.oCfg', oCfg: this.#oCfg});
	}
	#writePrjJs() {
		const o = {...this.#oCfg};
		o.code = {};
		for (const [nm, v] of Object.entries(this.#oCfg.code)) {
			if (v) o.code[nm] = true;
		}
		return writeFile(this.#fnPrjJs, JSON.stringify(o, null , '\t'));
	}

	// 複数マッチチェック用
	#aPathSettingSn		: string[] = [];
	onCreSettingSn(path: string) {
		this.#aPathSettingSn.push(path);
		this.#chkMultiMatch_SettingSn();
	}
	onDelSettingSn(path: string) {
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


	async	onCreChgOptSnd(_url: string) {}
	async	onDelOptSnd(_url: string) {}
	#disableOnOptSnd() {
		this.onCreChgOptSnd = async ()=> {};
		this.onDelOptSnd = async ()=> {};
	}
	#setOnOptSnd() {
		if (! this.#oWss['cnv.mat.snd']) {this.#disableOnOptSnd(); return;}

		this.onCreChgOptSnd = async url=> {
			// prj（変換後フォルダ）への drop か prj_base（退避素材ファイル）操作か判定
			const isBase = url.slice(0, this.#lenPrjBase) === this.#fnPrjBase;
			// mp3・wavファイルを追加・更新時、退避に上書き移動して aac化
			if (! isBase) this.#disableOnOptSnd();

			const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: 'cnv.mat.snd', mode: 'wait'};
			this.#cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

			await this.exeTask(
				'cnv_mat_snd',
				`"${isBase
					? url.replace(this.#fnPrjBase, this.#fnPrj)
					: url
				}" '{"codec":"${
					this.#oWss['cnv.mat.snd.codec']
				}"}' "${
					isBase
					? url
					: url.replace(this.#fnPrj, this.#fnPrjBase)
				}" ${isBase ?'no_move' :''}`,
			);
			if (! isBase) this.#setOnOptSnd();

			o.mode = 'comp';
			this.#cmd2Vue(o);

			this.#oOptSnd = await readJson(this.#fnOptSnd, {encoding: 'utf8'});
			this.#updOptSnd();
		};
		this.onDelOptSnd = async url=> {
			// prj（変換後フォルダ）下の削除か prj_base（退避素材ファイル）か判定
			const isBase = url.slice(0, this.#lenPrjBase) === this.#fnPrjBase;
			if (! isBase) return;

			// 退避素材ファイルを削除時、変換後 aac ファイルも削除
			await remove(
				url.replace(this.#fnPrjBase, this.#fnPrj)
				.replace(this.#REG_CNV_AAC, '.'+ this.#oWss['cnv.mat.snd.codec'])
			)
			const {name} = parse(url);
			const {baseSize, optSize} = this.#oOptSnd.hSize[name];
			this.#oOptSnd.sum.baseSize -= baseSize;
			this.#oOptSnd.sum.optSize -= optSize;
			delete this.#oOptSnd.hSize[name];
			await writeJson(this.#fnOptSnd, this.#oOptSnd, {encoding: 'utf8'});
			this.#updOptSnd();
		};
	}
	readonly	#REG_CNV_AAC	= /\.(mp3|wav)$/;


	async	onCreChgOptPic(_url: string) {}
	async	onDelOptPic(_url: string) {}
	#disableOnOptPic() {
		this.onCreChgOptPic = async ()=> {};
		this.onDelOptPic = async ()=> {};
	}
	#setOnOptPic() {
		if (! this.#oWss['cnv.mat.pic']) {this.#disableOnOptPic(); return;}

		this.onCreChgOptPic = async url=> {
			// prj（変換後フォルダ）への drop か prj_base（退避素材ファイル）操作か判定
			const isBase = url.slice(0, this.#lenPrjBase) === this.#fnPrjBase;
			// jpg・pngファイルを追加・更新時、退避に上書き移動して webp化
			if (! isBase) this.#disableOnOptPic();

			const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: 'cnv.mat.pic', mode: 'wait'};
			this.#cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

			await this.exeTask(
				'cnv_mat_pic',
				`"${isBase
					? url.replace(this.#fnPrjBase, this.#fnPrj)
					: url
				}" ${this.oWss['cnv.mat.webp_quality']} "${
					isBase
					? url
					: url.replace(this.#fnPrj, this.#fnPrjBase)
				}" ${isBase ?'no_move' :''}`,
			);
			if (! isBase) this.#setOnOptPic();

			o.mode = 'comp';
			this.#cmd2Vue(o);

			this.#oOptPic = await readJson(this.#fnOptPic, {encoding: 'utf8'});
			this.#updOptPic();
		};
		this.onDelOptPic = async url=> {
			// prj（変換後フォルダ）下の削除か prj_base（退避素材ファイル）か判定
			const isBase = url.slice(0, this.#lenPrjBase) === this.#fnPrjBase;
			if (! isBase) return;

			// 退避素材ファイルを削除時、変換後 WebP ファイルも削除
			await remove(
				url.replace(this.#fnPrjBase, this.#fnPrj)
				.replace(this.#REG_CNV_WEBP, '.webp')
			);
			const {name} = parse(url);
			const {baseSize, webpSize} = this.#oOptPic.hSize[name];
			this.#oOptPic.sum.baseSize -= baseSize;
			this.#oOptPic.sum.webpSize -= webpSize;
			delete this.#oOptPic.hSize[name];
			await writeJson(this.#fnOptPic, this.#oOptPic, {encoding: 'utf8'});
			this.#updOptPic();
		};
	}
	readonly	#lenPrjBase;
	readonly	#fnPrjBase;
	static readonly	fld_prj_base	= 'prj_base';
	readonly	#REG_CNV_WEBP	= /\.(jpe?g|png)$/;


	#oCfg	= DEF_CFG;
	get cfg() {return this.#oCfg}
	get oWss() {return this.#oWss}
	#pnlWV	: WebviewPanel | undefined = undefined;
	#cmd2Vue = (mes: any)=> {};
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
				Uri.file(this.#pathWs),
			],
		});
		p.onDidDispose(()=> this.#pnlWV = undefined, undefined, this.ctx.subscriptions);
		const wv = this.#pnlWV!.webview;
		this.#wvuWs = wv.asWebviewUri(Uri.file(this.#pathWs));
		this.#pathIcon = `${this.#wvuWs}/build/icon.png`;

		const {username} = userInfo();
		this.#cmd2Vue = (mes: any)=> wv.postMessage(mes);
		wv.onDidReceiveMessage(m=> {switch (m.cmd) {
		case '?':
			this.#cmd2Vue(<T_E2V_INIT>{
				cmd		: '!',
				oCfg	: this.#oCfg,
				oWss	: this.#oWss,
				pathIcon: this.#pathIcon,
			});
			this.updFontInfo();
			this.#updOptPic();
			this.#updOptSnd();
			this.#chkMultiMatch_SettingSn();
			break;

		case 'update.oCfg':{
			const e: T_E2V_CFG = m;
			const escOld = this.#oCfg.init.escape;
			const cfg = this.#oCfg = e.oCfg
			if (cfg.init.escape !== escOld) this.setEscape();
			cfg.debuger_token ||= uuidv4();
			this.#writePrjJs();

			this.chgTitle(cfg.book.title);

			const CopyrightYear = String((new Date()).getFullYear());
			Promise.allSettled([
				(async ()=> {
					const p = await readJson(this.#fnPkgJs, {encoding:'utf8'});
					p.name = cfg.save_ns;
					p.appBundleId = p.appId
					= `com.fc2.blog.famibee.skynovel.${cfg.save_ns}`;

					p.version = cfg.book.version;
					p.productName = cfg.book.title;
					p.author = cfg.book.creator;
					p.appCopyright = `(c)${cfg.book.creator}`;
					p.homepage = cfg.book.pub_url;
					p.description = cfg.book.detail;
					writeFile(this.#fnPkgJs, JSON.stringify(p, null , '\t'));
				})(),

				(async ()=> replaceRegsFile(this.#fnAppJs, [
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
				]))(),

				(async ()=> replaceRegsFile(this.#fnReadme4Freem, [
					[/(【Version】)[^\n]+/g, `$1${cfg.book.version}`],
					[/(【タイトル】)[^\n]+/g, `$1${cfg.book.title}`],
					[/(【著 作 者】)[^\n]+/g, `$1${cfg.book.creator}`],
					[/(【連 絡 先】メール： )[^\n]+/, `$1${cfg.book.cre_url}`],
					[	// ついでに発表年を
						/(Copyright \(C\) )\d+ "([^"]+)"/g,
						`$1${CopyrightYear} "${cfg.book.publisher}"`
					],
					[/(　　　　　　ＷＥＢ： )[^\n]+/g, `$1${cfg.book.pub_url}`],
				]))(),

				(async ()=> replaceRegsFile(this.#fnInsNsh, [
					[/(!define PUBLISHER ").+"/, `$1${cfg.book.publisher}"`],
				]))(),
			]);
		}	break;

		case 'change.range.webp_q_def':{
			// 変化のたびに動作するので 'update.oWss' と統合してはいけない
			if (! this.#oWss['cnv.mat.pic']) break;

			const e: T_E2V_CHG_RANGE_WEBP_Q_DEF = m;
			this.#wss.update('cnv.mat.webp_quality', this.#oWss['cnv.mat.webp_quality'] = e.webp_q);

			this.#disableOnOptPic();

			const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: 'cnv.mat.pic', mode: 'wait'};
			this.#cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

			this.cmd('cnv.mat.webp_quality', 'all_no_move')
			.then(()=> {
				this.#oOptPic = readJsonSync(this.#fnOptPic, {encoding: 'utf8'});
				this.#updOptPic();

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
			writeJsonSync(this.#fnOptPic, this.#oOptPic);

			// Baseフォルダを渡す事で再変換
			this.onCreChgOptPic(this.#fnPrjBase + fi.fld_nm +'.'+ fi.ext);
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
								this.#oOptPic = readJsonSync(this.#fnOptPic, {encoding: 'utf8'});
								this.#updOptPic();
								break;

							case 'cnv.mat.snd':
							case 'cnv.mat.snd.codec':
								this.#oOptSnd = readJsonSync(this.#fnOptSnd, {encoding: 'utf8'});
								this.#updOptSnd();
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
			this.#disableOnOptPic();
			this.#disableOnOptSnd();
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

		case 'openURL':	openURL(Uri.parse(m.url), this.#pathWs);	break;

		case 'copyTxt':{
			if (m.id !== 'copy.folder_save_app') break;

			switch (process.platform) {
			case 'win32':
				env.clipboard.writeText(`C:\\Users\\${username}\\AppData\\Roaming\\${this.#oCfg.save_ns}\\storage\\`);
				break;
			case 'darwin':
				env.clipboard.writeText(`/Users/${username}/Library/Application Support/${this.#oCfg.save_ns}/storage/`);
				break;
			case 'linux':
				env.clipboard.writeText(`~/.config/${this.#oCfg.save_ns}/storage/`);
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
		foldProc(this.#fnPrj, ()=> {}, nm=> a.push(nm));

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
					: (()=> readJsonSync(this.#pathWs +'/build/cut_round.json', {encoding: 'utf8'}).err)()
			});
		})
	}

	readonly	#hHead2Mes: {[head: string]: string}	= {
		'::PATH_PRJ_F'	: 'プロジェクト内（core/font/ 下）',
		'::PATH_USER_'	: 'OS（ユーザー別）へのインストール済みフォント',
		'::PATH_OS_FO'	: 'OS（ユーザー共通）へのインストール済みフォント',
	};
	updFontInfo() {
		if (! this.#pnlWV) return;

		const fn = this.#pathWs +'/core/font/subset_font.json';
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

	#updOptPic() {
		this.#cmd2Vue(<T_E2V_OPTIMG>{
			cmd: 'update.optImg',
			oOptImg: <T_OPTIMG>{...this.#oOptPic, sum: {
				...this.#oOptPic.sum,
				pathImgCmpWebP	: this.#wvuWs +'/doc/prj/',
				pathImgCmpBase	: this.#wvuWs +`/doc/`+ PrjSetting.fld_prj_base +'/',
			}},
		});
	}
	#updOptSnd() {
		this.#cmd2Vue(<T_E2V_OPTSND>{
			cmd: 'update.optSnd',
			oOptSnd: <T_OPTSND>{...this.#oOptSnd, sum: {
				...this.#oOptSnd.sum,
				pathSndOpt	: this.#wvuWs +'/doc/prj/',
				pathSndBase	: this.#wvuWs +'/doc/'+ PrjSetting.fld_prj_base +'/',
			}},
		});
	}

}
