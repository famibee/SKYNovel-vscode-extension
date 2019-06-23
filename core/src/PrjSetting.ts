/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {replaceFile} from './CmnLib';

import {WebviewPanel, ExtensionContext, window, ViewColumn, Uri, commands, env} from 'vscode';
const fs = require('fs-extra');

export class PrjSetting {
	private				buf_doc	: string;
	private	readonly	fnPrjJs	: string;
	private	readonly	fnPkgJs	: string;
	private	readonly	localResourceRoots: Uri;

	constructor(readonly context: ExtensionContext, readonly dir: string) {
		const path_doc = context.extensionPath +`/res/setting/`;
		this.fnPrjJs = dir +'/prj/prj.json';
		this.fnPkgJs = dir +'/package.json';

		this.localResourceRoots = Uri.file(path_doc);
		fs.readFile(path_doc +`index.htm`, {encoding: 'utf8'}, (err: any, data: any)=> {
			// 例外処理
			if (err) console.error(`PrjSetting constructor ${err}`);

			// リソースパス置換
			this.buf_doc = data
			.replace(/(href|src)="\.\//g, `$1="vscode-resource:${path_doc}/`);

			this.oCfg = fs.readJsonSync(this.fnPrjJs, {encoding: 'utf8'});
			if (this.oCfg.save_ns != 'hatsune' &&
				this.oCfg.save_ns != 'uc') return;
			this.open();
		});

		commands.registerCommand('skynovel.edPrjJson', ()=> this.open());
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
		},
		debug	: {	// デバッグ情報（プレイヤーもONに出来るので注意）
			devtool		: false,
			token		: false,
			tag			: false,
			putCh		: false,
			slideBaseSpan	: false,
			baseTx		: false,
			masume		: false,	// テキストレイヤ：ガイドマス目を表示するか
			variable	: false,
		},
	};
	private	pnlWV	: WebviewPanel | null = null;
	private open() {
		let src = this.buf_doc	// 値コピー
		.replace(`%save_ns%`, this.oCfg.save_ns);
		for (const k in this.oCfg.book) {	// prj.json の値を設定
			src = src.replace(`%book.${k}%`, this.oCfg.book[k]);
		}
		for (const k in this.oCfg.window) {
			src = src.replace(`%window.${k}%`, this.oCfg.window[k]);
		}
		for (const k in this.oCfg.init) {
			src = src.replace(`%init.${k}%`, this.oCfg.init[k]);
		}
		for (const k in this.oCfg.debug) src = src.replace(
			`c="%debug.${k}%"`, Boolean(this.oCfg.debug[k]) ?'checked' :''
		);

		const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;
		if (this.pnlWV) {
			this.pnlWV.reveal(column);
			this.pnlWV.webview.html = src;
			return;
		}

		this.pnlWV = window.createWebviewPanel('SKYNovel-prj_setting', 'プロジェクト設定', column || ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [this.localResourceRoots],
		});
		this.pnlWV.onDidDispose(()=> this.pnlWV = null);	// 閉じられたとき

		this.pnlWV.webview.onDidReceiveMessage(m=> {
			switch (m.cmd) {
			case 'info':	window.showInformationMessage(m.text); break;
			case 'warn':	window.showWarningMessage(m.text); break;
			case 'openURL':	env.openExternal(Uri.parse(m.url)); break;
			case 'input':	this.inputProc(m.id, m.val);	break;
			}
		}, false);
		this.pnlWV.webview.html = src;
	}
	private inputProc(id: string, val: string) {
		const v: any = (/^[-]?([1-9]\d*|0)$/).test(val) ?Number(val) :val;
		const iP = id.indexOf('.');
		if (iP >= 0) {
			const nm = id.slice(iP +1);
			this.oCfg[id.slice(0, iP)][nm] = v;
		}
		else {
			this.oCfg[id] = v;
		}
		fs.outputJson(this.fnPrjJs, this.oCfg);

		const r = this.hRep[id];
		if (r) r(val);
	}
	private	readonly	hRep	: {[name: string]: (val: string)=> void} = {
		"save_ns"	: async val=> {
			await replaceFile(this.fnPkgJs, /("name"\s*:\s*")(.+)(")/, `$1${val}$3`);
			await replaceFile(this.fnPkgJs, /("(?:appBundleId|appId)"\s*:\s*")(.+)(")/g, `$1com.fc2.blog.famibee.skynovel.${val}$3`);
		},
		'book.version'	: val=> replaceFile(this.fnPkgJs,
			/("version"\s*:\s*")(.+)(")/, `$1${val}$3`),
		'book.title'	: val=> replaceFile(this.fnPkgJs,
			/("productName"\s*:\s*")(.+)(")/, `$1${val}$3`),
		"book.creator"	: async val=> {
			await replaceFile(this.fnPkgJs, /("author"\s*:\s*")(.+)(")/, `$1${val}$3`);
			await replaceFile(this.fnPkgJs, /("appCopyright"\s*:\s*")(.+)(")/, `$1(c)${val}$3`);
		},
		'book.pub_url'	: val=> replaceFile(this.fnPkgJs,
			/("homepage"\s*:\s*")(.+)(")/, `$1${val}$3`),
		'book.detail'	: val=> replaceFile(this.fnPkgJs,
			/("description"\s*:\s*")(.+)(")/, `$1${val}$3`),
	}

}
