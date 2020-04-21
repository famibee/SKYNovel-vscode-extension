/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {replaceFile, foldProc} from './CmnLib';
import {ReferenceProvider} from './ReferenceProvider';

import {WebviewPanel, ExtensionContext, window, ViewColumn, Uri, env} from 'vscode';
const fs = require('fs-extra');

export class PnlPrjSetting {
	private	readonly	fnPrj	: string;
	private	readonly	fnPrjJs	: string;
	private	readonly	fnPkgJs	: string;
	private	readonly	fnAppJs	: string;
	private	readonly	localResourceRoots: Uri;

	private	static	htmSrc	= '';


	constructor(readonly ctx: ExtensionContext, readonly dir: string, private readonly chgTitle: (title: string)=> void, private readonly rp: ReferenceProvider) {
		this.fnPrj = dir +'/prj/';
		this.fnPrjJs = dir +'/prj/prj.json';
		this.fnPkgJs = dir +'/package.json';
		this.fnAppJs = dir +'/app.js';

		if (PnlPrjSetting.htmSrc) {
			if (this.oCfg.save_ns == 'hatsune' ||
				this.oCfg.save_ns == 'uc') this.open();
			return;
		}

		this.oCfg = {...this.oCfg, ...fs.readJsonSync(this.fnPrjJs, {encoding: 'utf8'})};
		// v0.15.1【「slideBaseSpan」廃止】
		if ('slideBaseSpan' in this.oCfg.debug) {
			delete this.oCfg.debug['slideBaseSpan'];
			this.oCfg.debug['debugLog'] = false;
		}
		chgTitle(this.oCfg.book.title);
		this.rp.setEscape(this.oCfg.init.escape ?? '');

		const path_doc = ctx.extensionPath +`/res/setting/`;
		this.localResourceRoots = Uri.file(path_doc);
		fs.readFile(path_doc +`index.htm`, {encoding: 'utf8'}, (err: any, data: any)=> {
			if (err) console.error(`PrjSetting constructor ${err}`);

			PnlPrjSetting.htmSrc = String(data);

			if (this.oCfg.save_ns == 'hatsune' ||
				this.oCfg.save_ns == 'uc') this.open();
		});
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
		code	: {},
	};
	get cfg() {return this.oCfg}
	private	pnlWV	: WebviewPanel | null = null;
	open() {
		const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;
		if (this.pnlWV) {
			this.pnlWV.reveal(column);
			this.openSub();
			return;
		}

		const wv = this.pnlWV = window.createWebviewPanel('SKYNovel-prj_setting', 'プロジェクト設定', column || ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [this.localResourceRoots],
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
	private openSub() {
		const a: string[] = [];
		foldProc(this.fnPrj, ()=> {}, nm=> {a.push(nm); this.oCfg.code[nm]});

		this.pnlWV!.webview.html = PnlPrjSetting.htmSrc
		.replace(/(href|src)="\.\//g, `$1="${this.pnlWV!.webview.asWebviewUri(this.localResourceRoots)}/`)
		.replace(/(.+)"code.\w+"(.+)<span>\w+(.+)\n/, a.map(fld=> `$1"code.${fld}"$2<span>${fld}$3\n`).join(''));
	}
	private inputProc(id: string, val: string) {
		const v: any = /^[-]?([1-9]\d*|0)$/.test(val)
		? Number(val)
		: /^(true|false)$/.test(val) ?val :String(val).replace(/"/g, '%22');
		const iP = id.indexOf('.');
		if (iP >= 0) {
			const nm = id.slice(iP +1);
			const id2 = id.slice(0, iP);
			this.oCfg[id2][nm] = v;
			if (id2 == 'init' && nm == 'escape') this.rp.setEscape(v);
		}
		else {
			this.oCfg[id] = v;
		}
		fs.outputJson(this.fnPrjJs, this.oCfg);

		const r = this.hRep[id];
		if (r) r(v);
	}
	private	readonly	hRep	: {[name: string]: (val: string)=> void} = {
		"save_ns"	: async val=> {
			await replaceFile(this.fnPkgJs, /("name"\s*:\s*").*(")/, `$1${val}$2`);
			await replaceFile(this.fnPkgJs, /("(?:appBundleId|appId)"\s*:\s*").*(")/g, `$1com.fc2.blog.famibee.skynovel.${val}$2`);
		},
		'window.width'	: val=> replaceFile(this.fnAppJs,
			/(width\s*: ).*(,)/, `$1${val}$2`),
		'window.height'	: val=> replaceFile(this.fnAppJs,
			/(height\s*: ).*(,)/, `$1${val}$2`),
		'book.version'	: val=> replaceFile(this.fnPkgJs,
			/("version"\s*:\s*").*(")/, `$1${val}$2`),
		'book.title'	: val=> {
			this.chgTitle(val);
			replaceFile(this.fnPkgJs, /("productName"\s*:\s*").*(")/, `$1${val}$2`);
		},
		"book.creator"	: async val=> {
			await replaceFile(this.fnPkgJs, /("author"\s*:\s*").*(")/, `$1${val}$2`);
			await replaceFile(this.fnPkgJs, /("appCopyright"\s*:\s*").*(")/, `$1(c)${val}$2`);
			await replaceFile(this.fnAppJs, /(companyName\s*:\s*)(['"]).*\2/, `$1"${val}"`);
		},
		'book.pub_url'	: async val=> {
			await replaceFile(this.fnPkgJs, /("homepage"\s*:\s*").*(")/, `$1${val}$2`);
			await replaceFile(this.fnAppJs, /((?:submitURL|homepage)\s*:\s*)(['"]).*\2/g, `$1"${val}"`);

			// ついでに発表年を
			await replaceFile(this.fnAppJs, /(npm_package_appCopyright \+' )\d+/, `$1${(new Date()).getFullYear()}`)
		},
		'book.detail'	: val=> replaceFile(this.fnPkgJs,
			/("description"\s*:\s*").*(")/, `$1${val}$2`),
	}

}
