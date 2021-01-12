/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {replaceFile, foldProc, getNonce} from './CmnLib';
import {CodingSupporter} from './CodingSupporter';

import {WebviewPanel, ExtensionContext, window, ViewColumn, Uri, env, workspace} from 'vscode';
import fs = require('fs-extra');
import m_path = require('path');

export class PnlPrjSetting {
	private	readonly	fnPrj	: string;
	private	readonly	fnPrjJs	: string;
	private	readonly	fnPkgJs	: string;
	private	readonly	fnAppJs	: string;
	private	readonly	fnInsNsh: string;
	private	readonly	fnIcon	: string;
	private	readonly	fnReadme4Freem	: string;
	private	readonly	localExtensionResRoots: Uri;

	private	static	htmSrc	= '';

	constructor(readonly ctx: ExtensionContext, readonly pathWs: string, private readonly chgTitle: (title: string)=> void, private readonly codSpt: CodingSupporter) {
		this.fnPrj = pathWs +'/doc/prj/';
		this.fnPrjJs = this.fnPrj +'prj.json';
		this.fnAppJs = pathWs +'/doc/app.js';
		this.fnPkgJs = pathWs +'/package.json';

		this.fnReadme4Freem = pathWs +'/build/include/readme.txt';
		let init_freem = false;
		if (! fs.existsSync(this.fnReadme4Freem)) {
			init_freem = true;
			fs.ensureFileSync(this.fnReadme4Freem);
			fs.copyFileSync(
				this.ctx.extensionPath +'/res/readme.txt',
				this.fnReadme4Freem,
			);

			workspace.openTextDocument(this.fnReadme4Freem)
			.then(doc=> window.showTextDocument(doc));
		}

		this.fnInsNsh = pathWs +'/build/installer.nsh';
		if (! fs.existsSync(this.fnInsNsh)) fs.copyFileSync(
			this.ctx.extensionPath +'/res/installer.nsh',
			this.fnInsNsh,
		);

		this.fnIcon = pathWs +'/build/icon.png';
		if (! fs.existsSync(this.fnIcon)) fs.copyFileSync(
			this.ctx.extensionPath +'/res/icon.png',
			this.fnIcon,
		);

		if (PnlPrjSetting.htmSrc) {
			if (this.oCfg.save_ns === 'hatsune' ||
				this.oCfg.save_ns === 'uc') this.open();
			return;
		}

		this.oCfg = {...this.oCfg, ...fs.readJsonSync(this.fnPrjJs, {encoding: 'utf8'})};
		// v0.15.1【「slideBaseSpan」廃止】
		if ('slideBaseSpan' in this.oCfg.debug) {
			delete this.oCfg.debug['slideBaseSpan'];
			this.oCfg.debug['debugLog'] = false;
		}
		chgTitle(this.oCfg.book.title);
		this.codSpt.setEscape(this.oCfg?.init?.escape ?? '');
		if (init_freem) {
			['title','version','creator','cre_url','publisher','pub_url',]
			.forEach(nm=> this.hRep['book.'+ nm](this.oCfg.book[nm]));
		}

		// prj.json に既にないディレクトリのcodeがあれば削除
		const a: string[] = [];
		foldProc(this.fnPrj, ()=> {}, nm=> a.push(nm));
		const oCode: {[name: string]: string} = {};
		for (const nm in this.oCfg.code) {
			if (a.includes(nm)) oCode[nm] = this.oCfg[nm];
		}
		this.oCfg.code = oCode;
		fs.outputJson(this.fnPrjJs, this.oCfg);

		const path_ext_htm = ctx.extensionPath +`/res/webview/`;
		this.localExtensionResRoots = Uri.file(path_ext_htm);
		fs.readFile(path_ext_htm +`setting.htm`, {encoding: 'utf8'})
		.then(htm=> {
			PnlPrjSetting.htmSrc = htm
			.replace('<meta_autooff ', '<meta ')	// ローカルデバッグしたいので
			.replace(/\$\{nonce}/g, getNonce());

			if (this.oCfg.save_ns === 'hatsune'
			|| this.oCfg.save_ns === 'uc') this.open();
		})
	}

	noticeCreDir(path: string) {
		if (! fs.statSync(path).isDirectory()) return;

		this.oCfg.code[m_path.basename(path)] = false;
		//fs.outputJson(this.fnPrjJs, this.oCfg);
			// これを有効にすると（Cre & Del）時にファイルが壊れるので省略
		this.openSub();	// 出来れば一部だけ更新したいが
	}
	noticeDelDir(path: string) {
		delete this.oCfg.code[m_path.basename(path)];
		fs.outputJson(this.fnPrjJs, this.oCfg);
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

		const wv = this.pnlWV = window.createWebviewPanel('SKYNovel-prj_setting', 'プロジェクト設定', column || ViewColumn.One, {
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
	private openSub() {
		const a: string[] = [];
		foldProc(this.fnPrj, ()=> {}, nm=> a.push(nm));

		const wv = this.pnlWV!.webview;
		wv.html = PnlPrjSetting.htmSrc
		.replace(/\$\{webview.cspSource}/g, wv.cspSource)
		.replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(this.localExtensionResRoots)}/`)
		.replace(/(.+"code\.)\w+(.+span>)\w+(<.+\n)/, a.map(fld=> `$1${fld}$2${fld}$3`).join(''));	// codeチェックボックスを追加
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
			if (id2 === 'init' && nm === 'escape') this.codSpt.setEscape(v);
		}
		else {
			this.oCfg[id] = v;
		}
		fs.outputJson(this.fnPrjJs, this.oCfg);

		this.hRep[id]?.(v);
	}
	private	readonly	hRep	: {[name: string]: (val: string)=> void} = {
		"save_ns"	: val=> {
			replaceFile(this.fnPkgJs, /("name"\s*:\s*").*(")/, `$1${val}$2`);
			replaceFile(this.fnPkgJs, /("(?:appBundleId|appId)"\s*:\s*").*(")/g, `$1com.fc2.blog.famibee.skynovel.${val}$2`);
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
