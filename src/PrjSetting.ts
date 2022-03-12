/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {replaceFile, foldProc, getNonce} from './CmnLib';
import {CodingSupporter} from './CodingSupporter';
import {ActivityBar, eTreeEnv} from './ActivityBar';

import {WorkspaceFolder, WebviewPanel, ExtensionContext, window, ViewColumn, Uri, env, workspace} from 'vscode';
import {copy, copyFile, copyFileSync, ensureDirSync, ensureFileSync, existsSync, outputJson, readFile, readFileSync, readJsonSync, statSync, writeFileSync} from 'fs-extra';
import m_path = require('path');
import {v4 as uuidv4} from 'uuid';
import os = require('os');

const img_size = require('image-size');
//import sharp = require('sharp');
import png2icons = require('png2icons');

export class PrjSetting {
	readonly	#wss;
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

	constructor(readonly ctx: ExtensionContext, readonly wsFld: WorkspaceFolder, private readonly chgTitle: (title: string)=> void, private readonly codSpt: CodingSupporter, private readonly searchPath: (path: string, extptn: string)=> string, private cmd: (nm: string, val: string)=> Promise<boolean>) {
		this.#wss = ctx.workspaceState;
		this.#wss.update('cnv.font.subset', this.#wss.get('cnv.font.subset') ?? false);
		this.#wss.update('cnv.mat.webp_quality', this.#wss.get('cnv.mat.webp_quality') ?? 90);
		this.#pathWs = wsFld.uri.fsPath;
		this.#fnPrj = this.#pathWs +'/doc/prj/';
		this.#fnPrjJs = this.#fnPrj +'prj.json';
		this.#fnAppJs = this.#pathWs +'/doc/app.js';
		this.#fnPkgJs = this.#pathWs +'/package.json';

		this.#fnReadme4Freem = this.#pathWs +'/build/include/readme.txt';
		let init_freem = false;
		const path_ext = ctx.extensionPath;

		if (! existsSync(this.#fnReadme4Freem)) {
			init_freem = true;
			ensureFileSync(this.#fnReadme4Freem);
			copyFileSync(path_ext +'/res/readme.txt', this.#fnReadme4Freem);
		}

		this.#fnInsNsh = this.#pathWs +'/build/installer.nsh';
		if (! existsSync(this.#fnInsNsh)) copyFile(
			path_ext +'/res/installer.nsh', this.#fnInsNsh
		);

		this.#fnIcon = this.#pathWs +'/build/icon.png';
		if (! existsSync(this.#fnIcon)) copyFile(
			path_ext +'/res/icon.png', this.#fnIcon
		);

		const fnLaunchJs = this.#pathWs +'/.vscode/launch.json';
		if (! existsSync(fnLaunchJs)) copyFile(
			path_ext +'/res/launch.json', fnLaunchJs
		);

		this.#oCfg = {...this.#oCfg, ...readJsonSync(this.#fnPrjJs, {encoding: 'utf8'})};

		chgTitle(this.#oCfg.book.title);
		codSpt.setEscape(this.#oCfg?.init?.escape ?? '');
		if (init_freem) {
			['title','version','creator','cre_url','publisher','pub_url',]
			.forEach(nm=> this.#hRep['book.'+ nm](this.#oCfg.book[nm]));
		}

		// prj.json に既にないディレクトリのcodeがあれば削除
		const a: string[] = [];
		foldProc(this.#fnPrj, ()=> {}, nm=> a.push(nm));
		const oCode: {[name: string]: string} = {};
		for (const nm in this.#oCfg.code) if (a.includes(nm)) oCode[nm] = this.#oCfg[nm];
		this.#oCfg.code = oCode;
		outputJson(this.#fnPrjJs, this.#oCfg);

		const path_ext_htm = path_ext +`/res/webview/`;
		this.#localExtensionResRoots = Uri.file(path_ext_htm);
		readFile(path_ext_htm +`setting.htm`, {encoding: 'utf8'})
		.then(htm=> {
			this.#htmSrc = htm
			.replace('<meta_autooff ', '<meta ')	// ローカルデバッグしたいので
			.replaceAll('${nonce}', getNonce());

			if (this.#oCfg.save_ns === 'hatsune'
			|| this.#oCfg.save_ns === 'uc') this.open();
		})

		PrjSetting.#hWsFld2token[wsFld.uri.path] = ()=> this.#oCfg.debuger_token;
	}

	static	readonly	#hWsFld2token: {[path: string]: ()=> string}= {};
	static	getDebugertoken(wsFld: WorkspaceFolder | undefined) {
		if (! wsFld) return '';
		return PrjSetting.#hWsFld2token[wsFld.uri.path]() ?? '';
	}

	noticeCreDir(path: string) {
		if (! statSync(path).isDirectory()) return;

		this.#oCfg.code[m_path.basename(path)] = false;
		//fs.outputJson(this.fnPrjJs, this.oCfg);
			// これを有効にすると（Cre & Del）時にファイルが壊れるので省略
		this.#openSub();	// 出来れば一部だけ更新したいが
	}
	noticeDelDir(path: string) {
		delete this.#oCfg.code[m_path.basename(path)];
		outputJson(this.#fnPrjJs, this.#oCfg);
		this.#openSub();	// 出来れば一部だけ更新したいが
	}

	#oCfg	: any = {
		book	: {
			title		: '',	//作品タイトル
			creator		: '',	//著作者。同人ならペンネーム
			cre_url		: '',	//著作者URL。ツイッターやメール、サイトなど。省略可
			publisher	: '',	//出版社。同人ならサークル名
			pub_url		: '',	//出版社URL。省略可
			detail		: '',	// 内容紹介。端的に記入
			version		: '1.0',
		},
		save_ns		: '',		// 扱うセーブデータを一意に識別するキーワード文字列
		window	: {		// アプリケーションウインドウサイズ
			width	: 300,
			height	: 300,
		},
		log		: {max_len: 1024},	// プレイヤーが読んだ文章を読み返せる履歴の長さ
		init	: {
			bg_color			: 0x000000,	// 背景色
			tagch_msecwait		: 10,		// 通常文字表示待ち時間（未読／既読）
			auto_msecpagewait	: 3500,		// 自動文字表示、行クリック待ち時間（未読／既読）
			escape				: '',		// エスケープ文字
		},
		debug	: {	// デバッグ情報（プレイヤーもONに出来るので注意）
			devtool		: false,
			token		: false,
			tag			: false,
			putCh		: false,
			debugLog	: false,
			baseTx		: false,
			masume		: false,	// テキストレイヤ：ガイドマス目を表示するか
			variable	: false,
		},
		code	: {},	// 暗号化しないフォルダ
		debuger_token	: '',		// デバッガとの接続トークン
	};
	get cfg() {return this.#oCfg}
	#pnlWV	: WebviewPanel | undefined = undefined;
	open() {
		if (! ActivityBar.aReady[eTreeEnv.NPM]) return;

		const column = window.activeTextEditor?.viewColumn;
		if (this.#pnlWV) {
			this.#pnlWV.reveal(column);
			this.#openSub();
			return;
		}

		const p = this.#pnlWV = window.createWebviewPanel('SKYNovel-prj_setting', '設定', column || ViewColumn.One, {
			enableScripts		: true,
		//	retainContextWhenHidden: true,	// 楽だがメモリオーバーヘッド高らしい
			localResourceRoots	: [
				this.#localExtensionResRoots,
				Uri.file(this.#pathWs),
			],
		});
		p.onDidDispose(()=> this.#pnlWV = undefined, undefined, this.ctx.subscriptions);

		const {username} = os.userInfo();
		p.webview.onDidReceiveMessage(m=> {switch (m.cmd) {
			case '?':
				p.webview.postMessage({cmd: '!', o: this.#oCfg});
				this.updFontInfo();
				break;
			case 'info':	window.showInformationMessage(m.text); break;
			case 'warn':	window.showWarningMessage(m.text); break;

			case 'openURL':	
				const url = m.dataset.url;
				if (url.slice(0, 7) === 'wsf:///') {
					workspace.openTextDocument(
						url.replace('wsf://', this.#pathWs)
					)
					.then(doc=> window.showTextDocument(doc));
				}
				else env.openExternal(Uri.parse(url));
				break;

			case 'input':	this.#inputProc(m.id, m.val);	break;

			case 'copyText':
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

			case 'selectFile':
				const {title, openlabel, id, path} = m.dataset;
				window.showOpenDialog({
					title	: `${title}を選択して下さい`,
					openLabel		: openlabel ?? 'ファイルを選択',
//					openLabel: localize('init repo', "Initialize Repository")
					canSelectMany	: false,
					canSelectFiles	: false,
					canSelectFolders: false,
				}).then(fileUri=> {
					const src = fileUri?.[0]?.fsPath;
					if (! src) return;	// キャンセル

					if (id === 'icon') this.selectFile_icon(src, id, path, p);
				})
				break;
			}}, undefined, this.ctx.subscriptions
		);
		this.#openSub();
	}
	static	readonly #REG_SETTING = /;[^\n]*|(?:&(\S+)|\[let\s+name\s*=\s*(\S+)\s+text)\s*=\s*((["'#]).+?\4|[^;\s]+)(?:[^;\n]*;(.*))?/g;	// https://regex101.com/r/FpmGwf/1

	private async selectFile_icon(src: string, id: string, path: string, p: WebviewPanel) {
		const {width, height} = img_size(src);
		if (width < 1024 || height < 1024) {
			window.showInformationMessage(`元画像のサイズは 1024 x 1024 以上にして下さい。（${id} width:${width} height:${height}）`);
			return;
		}

		copy(src, this.#pathWs +'/'+ path)
		.then(()=> {
			p.webview.postMessage({cmd: 'updimg', id: 'img.'+ id});
			
			const fnIcon = this.#pathWs +'/build/icon.png';
			if (! existsSync(fnIcon)) return;

			const mtPng = statSync(fnIcon).mtimeMs;
			const bIconPng = readFileSync(fnIcon);
			ensureDirSync(this.#pathWs +'/build/icon/');
			//png2icons.setLogger(console.log);
		{
			const fn = this.#pathWs +'/build/icon/icon.icns';
			const mt = existsSync(fn) ?statSync(fn).mtimeMs :0;
			if (mtPng > mt) {
				const b = png2icons.createICNS(bIconPng, png2icons.BILINEAR, 0);
				if (b) writeFileSync(fn, b);
			}
		}
		{
			const fn = this.#pathWs +'/build/icon/icon.ico';
			const mt = existsSync(fn) ?statSync(fn).mtimeMs :0;
			if (mtPng > mt) {
				const b = png2icons.createICO(bIconPng, png2icons.BICUBIC2, 0, false, true);
				if (b) writeFileSync(fn, b);
			}
		}
			// 「このアプリについて」用
			copy(fnIcon, this.#pathWs +'/doc/app/icon.png');
		}) // サムネイル更新
		.catch((err: Error) => console.error(err));

/*
console.log(`fn:PrjSetting.ts line:247 id:${id} src:${src}`);
		sharp(src).metadata().then((info: any)=> {
console.log(`fn:PrjSetting.ts line:242 w:${info.width} h:${info.height}`);
		});
*/

/*
		sharp(src).metadata().then((info: any)=> {
			if (info.width < 1024 || info.height < 1024) {
				window.showInformationMessage(`元画像のサイズは 1024 x 1024 以上にして下さい。（${id} width:${info.width} height:${info.height}）`);
				return;
			}

			const s = sharp(src).png().resize({
				width	: 1024,
				height	: 1024,
				fit		: 'cover',
				background	: {r: 0, g: 0, b: 0, alpha: 0},
			});
			if (this.#wss.get('cnv.icon.cut_round')) {
				const r = 1024 /2;
				s.composite([{
					input	: Buffer.from(`<svg><circle cx="${r}" cy="${r}" r="${r}"/></svg>`),
					blend	: 'dest-in',
				}]);
			}
			s.toFile(this.#pathWs +'/'+ path)
			.then(()=> {
				p.webview.postMessage({cmd: 'updimg', id: 'img.'+ id});
				
				const fnIcon = this.#pathWs +'/build/icon.png';
				if (! existsSync(fnIcon)) return;

				const mtPng = statSync(fnIcon).mtimeMs;
				const bIconPng = readFileSync(fnIcon);
				ensureDirSync(this.#pathWs +'/build/icon/');
				//png2icons.setLogger(console.log);
			{
				const fn = this.#pathWs +'/build/icon/icon.icns';
				const mt = existsSync(fn) ?statSync(fn).mtimeMs :0;
				if (mtPng > mt) {
					const b = png2icons.createICNS(bIconPng, png2icons.BILINEAR, 0);
					if (b) writeFileSync(fn, b);
				}
			}
			{
				const fn = this.#pathWs +'/build/icon/icon.ico';
				const mt = existsSync(fn) ?statSync(fn).mtimeMs :0;
				if (mtPng > mt) {
					const b = png2icons.createICO(bIconPng, png2icons.BICUBIC2, 0, false, true);
					if (b) writeFileSync(fn, b);
				}
			}
				// 「このアプリについて」用
				copy(fnIcon, this.#pathWs +'/doc/app/icon.png');
			}) // サムネイル更新
			.catch((err: Error) => console.error(err));
		});
*/
	}

	#openSub() {
		const a: string[] = [];
		foldProc(this.#fnPrj, ()=> {}, nm=> a.push(nm));

		const wv = this.#pnlWV!.webview;
		const h = this.#htmSrc
		.replaceAll('${webview.cspSource}', wv.cspSource)
		.replaceAll('"../icon.png" data-src=', '')	// プレビューテスト用コード削除
		.replaceAll(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(this.#localExtensionResRoots)}`)
		.replaceAll(/ws_res:\/\/\//g, `${Uri.file(this.#pathWs).with({scheme: 'vscode-resource'})}/`)
		.replaceAll(/ws:\/\/\//g, `${this.#pathWs}/`)
		.replace(/<!-- 注意）以下は置換部分につき変更不可：暗号化しないフォルダ -->\n(.+"code\.)\w+(.+span>)\w+(<.+\n)/, a.map(fld=> `$1${fld}$2${fld}$3`).join(''));	// codeチェックボックスを追加 https://regex101.com/r/UXq1sM/1

		try {
			// setting.sn
			this.#fnSetting = this.#fnPrj + this.searchPath('setting', 'sn');
			let hs = '';
			const src = readFileSync(this.#fnSetting, {encoding: 'utf8'});
			for (const m of src.matchAll(PrjSetting.#REG_SETTING)) {
				if (m[0].charAt(0) === ';') continue;
				const m5 = (m[5] ?? '').trim();
				if (m5 === '' || m5.slice(0, 10) === '(HIDE GUI)') continue;

				const idv = m[1] ?? m[2];
				const v = m[4] ?m[3].slice(1, -1) :m[3];
				const o: {
					lbl		: string,
					type?	: string,
					max?	: string | number,
					min?	: string | number,
					step?	: number,
				} = m5.charAt(0) === '{' ?JSON.parse(m5) :{lbl: m5};
				const id = `/setting.sn:${idv}`;
				let c = '';
				if (v === 'true' || v === 'false') c = `
	<div class="form-check">
		<input class="form-check-input mb-3 sn_checkbox sn-chk" type="checkbox" id="${id}" checked="${v}"/>
		<label class="form-check-label" for="${id}">${o.lbl}</label>
	</div>`;
				else if (o.type === 'rng') c = `
	<div class="form-check range-wrap">
		<div class="range-badge range-badge-down"></div>
		<label for="${id}" class="form-label">${o.lbl}</label>
		<input type="range" class="form-range my-1 sn-vld" id="${id}" value="${v}" max="${o.max}" min="${o.min}" step="${o.step}"/>
	</div>`;
				else {
					let type = 'text';
					let ptn = '';
					let inv_mes = '';
					switch (o.type) {	// 型チェック
						case 'fn':
						case 'fn_grp':
						case 'fn_snd':	// [¥\/:*?"<>|]
							ptn = '[^&yen;\\\\/:*?&quot;&lt;&gt;|]+';
							inv_mes = 'ファイル名で許されない文字です';
							break;
						case 'num':
							type = 'number';
							inv_mes = `${o.type} 型違反です`;
							break;
						default:
							ptn = '.*';
					}
					c = `
	<form class="form-check was-validated">
		<label for="${id}" class="form-label">${o.lbl}</label>
		<input type="${type}" class="form-control form-control-sm sn-vld" id="${id}" value="${v}" pattern="${ptn}" placeholder="${o.lbl}"/>
		<div class="invalid-feedback">${inv_mes}</div>
	</form>`;	// required
				}
				hs += `
	<div class="col-6 col-md-3 px-1 py-2">${c}</div>`;
			}
			wv.html = h.replace('<!-- 注意）置換ワードにつき変更不可：doc/prj/script/setting.sn -->', hs)

			// workspaceState
			.replaceAll(	// https://regex101.com/r/aZjQXi/1
				/type="checkbox" id="\/workspaceState:([^"]+)"/g,
				(m, p1)=> m +(this.#wss.get(p1) ?' checked' :'')
			)
			.replaceAll(
				/(type="range" id="\/workspaceState:([^"]+)" value=")[^"]+/g,
				(_m, p1, p2)=> p1 + this.#wss.get(p2)
			);
		}
		catch (e) {wv.html = h.replace(
			'<!-- 注意）置換ワードにつき変更不可：doc/prj/script/setting.sn -->',
			`<div class="col-12 px-1 pt-3"><h5>${e}</h5></div>`
		);}
	}
	static	readonly #REG_BOL_OR_NUM = /^(?:true|false|[-+]?(?:[1-9]\d*|0)(?:\.\d+)?|0x[0-9a-fA-F]+)$/;	// https://regex101.com/r/NPNbRk/1
	#inputProc(id: string, val: string) {
		const [media, nm] = id.split(':');
//console.log(`fn:PrjSetting.ts #inputProc media:${media}: nm:${nm}: val:${val}:`);
		switch (media) {
		case '/setting.sn':
			replaceFile(
				this.#fnSetting,
				new RegExp(`(&${nm}\\s*=\\s*)((["'#]).+?\\3|[^;\\s]+)`),
				`$1$3${val}$3`	// https://regex101.com/r/jD2znK/1
			);
			break;

		case '/workspaceState':
			// 処理中はトグルスイッチを無効にする
			this.#pnlWV?.webview.postMessage({cmd: 'disable', id});
			this.cmd(nm, val).then(async go=> {
				if (go) await this.#wss.update(nm, val);
				else this.#pnlWV?.webview.postMessage({cmd: 'cancel', id});
				this.#pnlWV?.webview.postMessage({cmd: 'disable', id});
			});
			break;

		default:
			PrjSetting.#REG_BOL_OR_NUM.lastIndex = 0;
			const v = PrjSetting.#REG_BOL_OR_NUM.test(val) ?val :val.replaceAll('"', '%22');
			const iP = id.indexOf('.');
			if (iP >= 0) {
				const nm = id.slice(iP +1);
				const id2 = id.slice(0, iP);
				this.#oCfg[id2][nm] = v;
				if (id2 === 'init' && nm === 'escape') {
					this.codSpt.setEscape(v);
					this.codSpt.goAll();
				}
			}
			else this.#oCfg[id] = v;
			outputJson(this.#fnPrjJs, this.#oCfg);

			this.#hRep[id]?.(v);
		}
	}
	readonly	#hRep	: {[id: string]: (val: string)=> void} = {
		"save_ns"	: val=> {
			replaceFile(this.#fnPkgJs, /("name"\s*:\s*").*(")/, `$1${val}$2`);
			replaceFile(this.#fnPkgJs, /("(?:appBundleId|appId)"\s*:\s*").*(")/g, `$1com.fc2.blog.famibee.skynovel.${val}$2`);
			replaceFile(this.#fnPkgJs, /("artifactName"\s*:\s*").*(")/, `$1${val}-\${version}-\${arch}.\${ext}$2`);

			if (! this.#oCfg.debuger_token) {
				this.#oCfg.debuger_token = uuidv4();
				outputJson(this.#fnPrjJs, this.#oCfg);
			}
		},
		'window.width'	: val=> replaceFile(this.#fnAppJs,
			/(width\s*: ).*(,)/, `$1${val}$2`),
		'window.height'	: val=> replaceFile(this.#fnAppJs,
			/(height\s*: ).*(,)/, `$1${val}$2`),
		'book.version'	: val=> {
			replaceFile(this.#fnPkgJs, /("version"\s*:\s*").*(")/,`$1${val}$2`);
			replaceFile(this.#fnReadme4Freem, /(【Version】)\S+/g, `$1${val}`);
		},
		'book.title'	: val=> {
			this.chgTitle(val);
			replaceFile(this.#fnPkgJs, /("productName"\s*:\s*").*(")/, `$1${val}$2`);
			replaceFile(this.#fnReadme4Freem, /(【タイトル】)\S+/g, `$1${val}`);
		},
		"book.creator"	: val=> {
			replaceFile(this.#fnPkgJs, /("author"\s*:\s*").*(")/, `$1${val}$2`);
			replaceFile(this.#fnPkgJs, /("appCopyright"\s*:\s*").*(")/, `$1(c)${val}$2`);
			replaceFile(this.#fnReadme4Freem, /(【著 作 者】)\S+/g, `$1${val}`);
		},
		'book.cre_url'	: val=> {
			replaceFile(this.#fnReadme4Freem, /(【連 絡 先】メール： )\S+/, `$1${val}`);
		},
		'book.publisher': val=> {
			replaceFile(this.#fnAppJs, /(companyName\s*:\s*)(['"]).*\2/, `$1"${val}"`);
			replaceFile(this.#fnInsNsh, /(!define PUBLISHER ").+"/,`$1${val}"`);

			// ついでに発表年を
			replaceFile(this.#fnReadme4Freem, /(Copyright \(C\) )\d+ "([^"]+)"/g, `$1${(new Date()).getFullYear()} "${val}"`);
		},
		'book.pub_url'	: val=> {
			replaceFile(this.#fnPkgJs, /("homepage"\s*:\s*").*(")/, `$1${val}$2`);
			replaceFile(this.#fnReadme4Freem, /(　　　　　　ＷＥＢ： )\S+/g, `$1${val}`);

			// ついでに発表年を
			replaceFile(this.#fnAppJs, /(npm_package_appCopyright \+' )\d+/, `$1${(new Date()).getFullYear()}`);
		},
		'book.detail'	: val=> replaceFile(this.#fnPkgJs,
			/("description"\s*:\s*").*(")/, `$1${val}$2`),
	}

	refreshFont(minify: boolean) {
		this.#inputProc('/workspaceState:cnv.font.subset', String(minify));
	}

	readonly	#hHead2Mes: {[head: string]: string}	= {
		'::PATH_PRJ_F'	: 'プロジェクト内（core/font/ 下）',
		'::PATH_USER_'	: 'OS（ユーザー別）へのインストール済みフォント',
		'::PATH_OS_FO'	: 'OS（ユーザー共通）へのインストール済みフォント',
	};
	updFontInfo() {
		if (! this.#pnlWV) return;

		const o = readJsonSync(this.#pathWs +'/core/font/info.json');
		const a = Object.entries(o).map(([nm, v])=> {return {
			nm,
			mes		: this.#hHead2Mes[(<any>v).inp.slice(0, 12)],
			iSize	: (<any>v).iSize,
			oSize	: (<any>v).oSize,
		}});
		a.sort();

		const htm = a.map((e, i)=> {return `
<tr>
	<th scope="row">${i +1}</th>
	<td>${e.nm}</td>
	<td>${e.mes}</td>
	<td style="text-align: right;">${e.iSize.toLocaleString('ja-JP')} byte</td>
	<td style="text-align: right;">${e.oSize.toLocaleString('ja-JP')} byte</td>
	<td>${(e.oSize / e.iSize).toLocaleString('ja-JP')}</td>
</tr>`
		}).join('');
		this.#pnlWV.webview.postMessage({cmd: 'updFontInfo', htm});
	}
	updValid(id: string, mes: string) {
		this.#pnlWV?.webview.postMessage({cmd: 'updValid', id, mes});
	}


}
