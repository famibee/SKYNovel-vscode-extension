/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {replaceFile, foldProc, getNonce} from './CmnLib';
import {CodingSupporter} from './CodingSupporter';

import {WorkspaceFolder, WebviewPanel, ExtensionContext, window, ViewColumn, Uri, env, workspace} from 'vscode';
import {existsSync, ensureFileSync, copyFileSync, copyFile, readJsonSync, outputJson, readFile, statSync, readFileSync} from 'fs-extra';
import m_path = require('path');
import {v4 as uuidv4} from 'uuid';

export class PrjSetting {
	private	readonly	fnPrj	: string;
	private	readonly	fnPrjJs	: string;
	private	readonly	fnPkgJs	: string;
	private	readonly	fnAppJs	: string;
	private				fnSetting	: string;
	private	readonly	fnInsNsh: string;
	private	readonly	fnIcon	: string;
	private	readonly	fnReadme4Freem	: string;
	private	readonly	localExtensionResRoots: Uri;

	private				htmSrc	= '';

	constructor(readonly ctx: ExtensionContext, readonly wsFld: WorkspaceFolder, private readonly chgTitle: (title: string)=> void, private readonly codSpt: CodingSupporter, private readonly searchPath: (path: string, extptn: string)=> string) {
		const pathWs = wsFld.uri.fsPath;
		this.fnPrj = pathWs +'/doc/prj/';
		this.fnPrjJs = this.fnPrj +'prj.json';
		this.fnAppJs = pathWs +'/doc/app.js';
		this.fnPkgJs = pathWs +'/package.json';

		this.fnReadme4Freem = pathWs +'/build/include/readme.txt';
		let init_freem = false;
		const path_ext = ctx.extensionPath;

		if (! existsSync(this.fnReadme4Freem)) {
			init_freem = true;
			ensureFileSync(this.fnReadme4Freem);
			copyFileSync(path_ext +'/res/readme.txt', this.fnReadme4Freem);

			workspace.openTextDocument(this.fnReadme4Freem)
			.then(doc=> window.showTextDocument(doc));
		}

		this.fnInsNsh = pathWs +'/build/installer.nsh';
		if (! existsSync(this.fnInsNsh)) copyFile(
			path_ext +'/res/installer.nsh', this.fnInsNsh
		);

		this.fnIcon = pathWs +'/build/icon.png';
		if (! existsSync(this.fnIcon)) copyFile(
			path_ext +'/res/icon.png', this.fnIcon
		);

		const fnLaunchJs = pathWs +'/.vscode/launch.json';
		if (! existsSync(fnLaunchJs)) copyFile(
			path_ext +'/res/launch.json', fnLaunchJs
		);

		this.oCfg = {...this.oCfg, ...readJsonSync(this.fnPrjJs, {encoding: 'utf8'})};

		chgTitle(this.oCfg.book.title);
		codSpt.setEscape(this.oCfg?.init?.escape ?? '');
		if (init_freem) {
			['title','version','creator','cre_url','publisher','pub_url',]
			.forEach(nm=> this.hRep['book.'+ nm](this.oCfg.book[nm]));
		}

		// prj.json に既にないディレクトリのcodeがあれば削除
		const a: string[] = [];
		foldProc(this.fnPrj, ()=> {}, nm=> a.push(nm));
		const oCode: {[name: string]: string} = {};
		for (const nm in this.oCfg.code) if (a.includes(nm)) oCode[nm] = this.oCfg[nm];
		this.oCfg.code = oCode;
		outputJson(this.fnPrjJs, this.oCfg);

		const path_ext_htm = path_ext +`/res/webview/`;
		this.localExtensionResRoots = Uri.file(path_ext_htm);
		readFile(path_ext_htm +`setting.htm`, {encoding: 'utf8'})
		.then(htm=> {
			this.htmSrc = htm
			.replace('<meta_autooff ', '<meta ')	// ローカルデバッグしたいので
			.replace(/\$\{nonce}/g, getNonce());

			if (this.oCfg.save_ns === 'hatsune'
			|| this.oCfg.save_ns === 'uc') this.open();
		})

		PrjSetting.hWsFld2token[wsFld.uri.path] = ()=> this.oCfg.debuger_token;
	}

	private	static	readonly	hWsFld2token: {[path: string]: ()=> string}= {};
	static	getDebugertoken(wsFld: WorkspaceFolder | undefined) {
		if (! wsFld) return '';
		return PrjSetting.hWsFld2token[wsFld.uri.path]() ?? '';
	}

	noticeCreDir(path: string) {
		if (! statSync(path).isDirectory()) return;

		this.oCfg.code[m_path.basename(path)] = false;
		//fs.outputJson(this.fnPrjJs, this.oCfg);
			// これを有効にすると（Cre & Del）時にファイルが壊れるので省略
		this.openSub();	// 出来れば一部だけ更新したいが
	}
	noticeDelDir(path: string) {
		delete this.oCfg.code[m_path.basename(path)];
		outputJson(this.fnPrjJs, this.oCfg);
		this.openSub();	// 出来れば一部だけ更新したいが
	}

	private oCfg	: any = {
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
	get cfg() {return this.oCfg}
	private	pnlWV	: WebviewPanel | null = null;
	open() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.pnlWV) {
			this.pnlWV.reveal(column);
			this.openSub();
			return;
		}

		const wv = this.pnlWV = window.createWebviewPanel('SKYNovel-prj_setting', '設定・基本情報', column || ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [this.localExtensionResRoots],
		});

		wv.onDidDispose(()=> this.pnlWV = null);	// 閉じられたとき

		wv.webview.onDidReceiveMessage(m=> {
			switch (m.cmd) {
			case 'get':		wv.webview.postMessage({cmd: 'res', o: this.oCfg});	break;
			case 'info':	window.showInformationMessage(m.text); break;
			case 'warn':	window.showWarningMessage(m.text); break;
			case 'openURL':	env.openExternal(Uri.parse(m.url)); break;
			case 'input':	this.inputProc(m.id, m.val);	break;
			}
		}, false);
		this.openSub();
	}
	private	readonly REG_SETTING = /;[^\n]*|(?:&(\S+)|\[let\s+name\s*=\s*(\S+)\s+text)\s*=\s*((["'#]).+?\4|[^;\s]+)(?:[^;]*;(.*))?/gm;	// https://regex101.com/r/90IOfX/1
	private openSub() {
		const a: string[] = [];
		foldProc(this.fnPrj, ()=> {}, nm=> a.push(nm));

		const wv = this.pnlWV!.webview;
		let h = this.htmSrc
		.replace(/\$\{webview.cspSource}/g, wv.cspSource)
		.replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(this.localExtensionResRoots)}/`)
		.replace(/(.+"code\.)\w+(.+span>)\w+(<.+\n)/, a.map(fld=> `$1${fld}$2${fld}$3`).join(''));	// codeチェックボックスを追加

		try {
			this.fnSetting = this.fnPrj + this.searchPath('setting', 'sn');
			if (! existsSync(this.fnSetting)) throw '';

			let hs = '';
			const src = readFileSync(this.fnSetting, {encoding: 'utf8'});
			for (const m of src.matchAll(this.REG_SETTING)) {
				if (m[0].charAt(0) === ';') continue;
				const nm = m[1] ?? m[2];
				const v = m[4] ?m[3].slice(1, -1) :m[3];
				const lbl = m[5].trim();
				if (v === 'true' || v === 'false') hs += `
	<div class="col-auto pe-1 mt-2 form-outline"><div class="form-check">
		<input id="/setting.sn:${nm}" type="checkbox" class="form-check-input sn-chk" checked="${v}"/>
		<label class="form-label" for="/setting.sn:${nm}">${lbl}</label>
	</div></div>`;
				else hs += `
	<div class="col-auto px-1 mt-2"><div class="form-outline">
		<input type="text" id="/setting.sn:${nm}" value="${v}" class="form-control sn-gray" placeholder="${lbl}"/>
		<label class="form-label" for="/setting.sn:${nm}">${lbl}</label>
	</div></div>`;
			}
			h = h.replace('<!-- 4replace_by_setting.sn -->', hs);
		} catch {
			h = h.replace(
				'<!-- 4replace_by_setting.sn -->',
				'<div class="col-12 px-1 pt-3"><h5>setting.sn が見つかりません</h5></div>'
			);
		}	// ない場合

		wv.html = h;
	}
	private inputProc(id: string, val: string) {
		const v = /^[-]?([1-9]\d*|0)$/.test(val)
			? val
			: String(val).replace(/"/g, '%22');
		if (id.charAt(0) === '/') {
			const nm = id.split(':')[1];
			replaceFile(
				this.fnSetting,
				new RegExp(`^(&${nm}\\s*=\\s*)((["'#]).+?\\3|[^;\\s]+)`, 'm'),
				`$1${ (v === 'true' || v === 'false') ?v :`#${v}#` }`
			);
			return;
		}

		const iP = id.indexOf('.');
		if (iP >= 0) {
			const nm = id.slice(iP +1);
			const id2 = id.slice(0, iP);
			this.oCfg[id2][nm] = v;
			if (id2 === 'init' && nm === 'escape') this.codSpt.setEscape(v);
		}
		else this.oCfg[id] = v;
		outputJson(this.fnPrjJs, this.oCfg);

		this.hRep[id]?.(v);
	}
	private	readonly	hRep	: {[name: string]: (val: string)=> void} = {
		"save_ns"	: val=> {
			replaceFile(this.fnPkgJs, /("name"\s*:\s*").*(")/, `$1${val}$2`);
			replaceFile(this.fnPkgJs, /("(?:appBundleId|appId)"\s*:\s*").*(")/g, `$1com.fc2.blog.famibee.skynovel.${val}$2`);

			if (! this.oCfg.debuger_token) {
				this.oCfg.debuger_token = uuidv4();
				outputJson(this.fnPrjJs, this.oCfg);
			}
		},
		'window.width'	: val=> replaceFile(this.fnAppJs,
			/(width\s*: ).*(,)/, `$1${val}$2`),
		'window.height'	: val=> replaceFile(this.fnAppJs,
			/(height\s*: ).*(,)/, `$1${val}$2`),
		'book.version'	: val=> {
			replaceFile(this.fnPkgJs, /("version"\s*:\s*").*(")/, `$1${val}$2`);
			replaceFile(this.fnReadme4Freem, /(【Version】)\S+/g, `$1${val}`);
		},
		'book.title'	: val=> {
			this.chgTitle(val);
			replaceFile(this.fnPkgJs, /("productName"\s*:\s*").*(")/, `$1${val}$2`);
			replaceFile(this.fnReadme4Freem, /(【タイトル】)\S+/g, `$1${val}`);
		},
		"book.creator"	: val=> {
			replaceFile(this.fnPkgJs, /("author"\s*:\s*").*(")/, `$1${val}$2`);
			replaceFile(this.fnPkgJs, /("appCopyright"\s*:\s*").*(")/, `$1(c)${val}$2`);
			replaceFile(this.fnReadme4Freem, /(【著 作 者】)\S+/g, `$1${val}`);
		},
		'book.cre_url'	: val=> {
			replaceFile(this.fnReadme4Freem, /(【連 絡 先】メール： )\S+/, `$1${val}`);
		},
		'book.publisher': val=> {
			replaceFile(this.fnAppJs, /(companyName\s*:\s*)(['"]).*\2/, `$1"${val}"`);
			replaceFile(this.fnInsNsh, /(!define PUBLISHER ").+"/, `$1${val}"`);

			// ついでに発表年を
			replaceFile(this.fnReadme4Freem, /(Copyright \(C\) )\d+ "([^"]+)"/g, `$1${(new Date()).getFullYear()} "${val}"`);
		},
		'book.pub_url'	: val=> {
			replaceFile(this.fnPkgJs, /("homepage"\s*:\s*").*(")/, `$1${val}$2`);
			replaceFile(this.fnReadme4Freem, /(　　　　　　ＷＥＢ： )\S+/g, `$1${val}`);

			// ついでに発表年を
			replaceFile(this.fnAppJs, /(npm_package_appCopyright \+' )\d+/, `$1${(new Date()).getFullYear()}`);
		},
		'book.detail'	: val=> replaceFile(this.fnPkgJs,
			/("description"\s*:\s*").*(")/, `$1${val}$2`),
	}

}
