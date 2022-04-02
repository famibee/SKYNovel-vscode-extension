/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {foldProc, getNonce, replaceFile, replaceRegsFile, treeProc} from './CmnLib';
import {CodingSupporter} from './CodingSupporter';
import {ActivityBar, eTreeEnv} from './ActivityBar';
import {DEF_CFG, DEF_WSS, REG_SN2TEMP, T_A_FONTINF, T_CFG, T_E2V_INIT, T_E2V_TEMP, T_TEMP, T_V2E_SELECT_ICON_FILE, T_E2V_AFONTINFO, T_V2E_TEMP, T_E2V_CFG, T_E2V_SELECT_ICON_INFO} from '../views/types';

import {WorkspaceFolder, WebviewPanel, ExtensionContext, window, ViewColumn, Uri, env, workspace} from 'vscode';
import {copy, copyFile, ensureFile, existsSync, readFile, readFileSync, readJson, readJsonSync, statSync, writeFile} from 'fs-extra';
import {basename} from 'path';
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
	readonly	#pathIcon	: string;

	constructor(readonly ctx: ExtensionContext, readonly wsFld: WorkspaceFolder, private readonly chgTitle: (title: string)=> void, private readonly codSpt: CodingSupporter, private cmd: (nm: string, val: string)=> Promise<boolean>, private exeTask: (nm: string, title: string, aNeedLib: string[], node: string)=> Promise<number>) {
		this.#wss = ctx.workspaceState;
		let oWss = DEF_WSS as {[nm: string]: any};
		for (const nm in oWss) {
			const d: any = this.#wss.get(nm);
			if (d) oWss[nm] = d;
			else this.#wss.update(nm, oWss[nm]);
		}
		this.#oWss = oWss as any;

		const a: (()=> Promise<void>)[] = [];

		this.#pathWs = wsFld.uri.fsPath;
		this.#fnPrj = this.#pathWs +'/doc/prj/';
		this.#fnPrjJs = this.#fnPrj +'prj.json';
		this.#fnAppJs = this.#pathWs +'/doc/app.js';
		this.#fnPkgJs = this.#pathWs +'/package.json';

		this.#pathIcon = 'https://file+.vscode-resource.vscode-webview.net'+ this.#pathWs +'/build/icon.png';
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

		const path_vue_root = path_ext +`/views/`;
		this.#localExtensionResRoots = Uri.file(path_vue_root);
		a.push(
			async ()=> {
				chgTitle(this.#oCfg.book.title);
				codSpt.setEscape(this.#oCfg?.init?.escape ?? '');
				PrjSetting.#hWsFld2token[wsFld.uri.path] = ()=> this.#oCfg.debuger_token;
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
				treeProc(this.#fnPrj, url=> {
					if (url.slice(-11) !== '/setting.sn') return;
					this.#aPathSettingSn.push(url);
				});
				this.#chkMultiMatch_SettingSn();
			},
		);

		new Promise(async ()=> {
			const o = await readJson(this.#fnPrjJs, {encoding: 'utf8'});
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
			await Promise.allSettled(a.map(v=> v()));
		});
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

	noticeCreDir(path: string) {
		if (! statSync(path).isDirectory()) return;

		this.#oCfg.code[basename(path)] = false;
		//fs.outputJson(this.fnPrjJs, this.oCfg);
			// これを有効にすると（Cre & Del）時にファイルが壊れるので省略
		this.#cmd2Vue(<T_E2V_CFG>{cmd: 'update.oCfg', oCfg: this.#oCfg});
	}
	noticeDelDir(path: string) {
		delete this.#oCfg.code[basename(path)];
		this.#writePrjJs();
		this.#cmd2Vue(<T_E2V_CFG>{cmd: 'update.oCfg', oCfg: this.#oCfg});
	}
	#writePrjJs() {
		const o = {...this.#oCfg};
		o.code = {};
		for (const nm in this.#oCfg.code) {
			if (this.#oCfg.code[nm]) o.code[nm] = true;
		}
		return writeFile(this.#fnPrjJs, JSON.stringify(o, null , '\t'));
	}

	// 複数マッチチェック用
	#aPathSettingSn		: string[] = [];
	noticeCreSettingSn(path: string) {
		this.#aPathSettingSn.push(path);
		this.#chkMultiMatch_SettingSn();
	}
	noticeDelSettingSn(path: string) {
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
			if (full.charAt(0) === ';') continue;

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
			if (lbl.charAt(0) === '{') o = {...o, ...JSON.parse(lbl)};
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


	#oCfg	= DEF_CFG;
	get cfg() {return this.#oCfg}
	#pnlWV	: WebviewPanel | undefined = undefined;
	#cmd2Vue = (mes: any)=> {};
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

		const {username} = userInfo();
		this.#cmd2Vue = (mes: any)=> p.webview.postMessage(mes);
		p.webview.onDidReceiveMessage(m=> {switch (m.cmd) {
		case '?':
			this.#cmd2Vue(<T_E2V_INIT>{
				cmd		: '!',
				oCfg	: this.#oCfg,
				oWss	: this.#oWss,
				pathIcon: this.#pathIcon,
			});
			this.updFontInfo();
			this.#chkMultiMatch_SettingSn();
			break;

		case 'update.oCfg':
			const cfg: T_CFG = this.#oCfg = m.oCfg
			const escape = cfg.init.escape;
			if (cfg.init.escape !== escape) {
				this.codSpt.setEscape(escape);
				this.codSpt.goAll();
			}
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
			break;

		case 'update.oWss':{
			const nm = 'cnv.font.subset';
			const val = m.oWss[nm];
			const chg = this.#oWss[nm] != val;
			this.#oWss = m.oWss;
			for (const nm in m.oWss) this.#wss.update(nm, m.oWss[nm]);

			if (chg) {// 処理中はトグルスイッチを無効にする
				this.#cmd2Vue({cmd: nm, val: 'wait'});
				this.cmd(nm, val).then(async go=> {
					if (go) {
						await this.#wss.update(nm, val);
						this.#cmd2Vue({cmd: nm, val: 'comp'});
						return;
					}

					this.#wss.update(nm, this.#oWss[nm] = ! val);
					this.#cmd2Vue({cmd: nm, val: 'cancel'});
				});
			}
		}	break;

		case 'update.aTemp':
			(<T_V2E_TEMP>m).aRes.forEach(v=> replaceFile(
				this.#fnSetting,
				new RegExp(`(&${v.nm}\\s*=\\s*)((["'#]).+?\\3|[^;\\s]+)`),
				`$1$3${v.val}$3`	// https://regex101.com/r/jD2znK/1
			));
			break;

		case 'info':	window.showInformationMessage(m.mes); break;
		case 'warn':	window.showWarningMessage(m.mes); break;

		case 'openURL':	
			const url = m.url;
			if (url.slice(0, 11) === 'ws-file:///') {
				workspace.openTextDocument(
					url.replace('ws-file://', this.#pathWs)
				)
				.then(doc=> window.showTextDocument(doc));
			}
			else env.openExternal(Uri.parse(
				url.replace('ws-folder://', this.#pathWs)
			));
			break;

		case 'copyTxt':
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
			break;

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

			const pathJs = this.#pathWs +'/build/cut_round.js';
			await copy(this.ctx.extensionPath +'/dist/cut_round.js', pathJs);

			const exit_code = await this.exeTask(
				'cut_round',
				'アイコン生成・丸く切り抜く',
				['sharp', 'png2icons'],
				`node ./build/cut_round.js "${src}" ${this.#oWss['cnv.icon.cut_round']} "${path}"`,
			);
			this.#cmd2Vue(<T_E2V_SELECT_ICON_INFO>{
				cmd		: 'updimg',
				pathIcon: this.#pathIcon,
				err_mes	: exit_code === 0
					? ''
					: (()=> {
						const o = readJsonSync(pathJs +'on',{encoding:'utf8'});
						return o.err;
					})()
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

		const fn = this.#pathWs +'/core/font/info.json';
		if (! existsSync(fn)) {
			this.#cmd2Vue(<T_E2V_AFONTINFO>{cmd: 'update.aFontInfo', aFontInfo: []});
			return;
		}

		const o = readJsonSync(fn);
		const aFontInfo: T_A_FONTINF = Object.entries(o).map(([nm, v])=> ({
			nm,
			mes		: this.#hHead2Mes[(<any>v).inp.slice(0, 12)],
			iSize	: (<any>v).iSize,
			oSize	: (<any>v).oSize,
		}));
		aFontInfo.sort();
		this.#cmd2Vue(<T_E2V_AFONTINFO>{cmd: 'update.aFontInfo', aFontInfo});
	}

}
