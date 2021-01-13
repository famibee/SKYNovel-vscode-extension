/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {replaceFile, foldProc, getNonce} from './CmnLib';

import {WebviewPanel, ExtensionContext, window, ViewColumn, Uri, env} from 'vscode';
import fs = require('fs-extra');

export class PnlBodyDesign {
	private	readonly	fnPrj		: string;
	private	readonly	fnBodySn	: string;
	private	readonly	localExtensionResRoots: Uri;

	private				htmSrc		= '';

	constructor(readonly ctx: ExtensionContext, readonly pathWs: string) {
		this.fnPrj = pathWs +'/doc/prj/';
		const path_ext = ctx.extensionPath;

		this.fnBodySn = this.fnPrj +'layout/body.sn';
		if (fs.existsSync(this.fnBodySn))
		fs.readFile(this.fnBodySn, {encoding: 'utf8'})
		.then(snBody=> this.snBody = snBody);

		const path_ext_htm = path_ext +`/res/webview/`;
		this.localExtensionResRoots = Uri.file(path_ext_htm);
		fs.readFile(path_ext_htm +`bodydesign.htm`, {encoding: 'utf8'})
		.then(htm=> this.htmSrc = htm
			.replace('<meta_autooff ', '<meta ')	// ローカルデバッグしたいので
			.replace(/\$\{nonce}/g, getNonce())
		);
	}

	private	snBody	= '';
	private	pnlWV	: WebviewPanel | null = null;
	open() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.pnlWV) {
			this.pnlWV.reveal(column);
			this.openSub();
			return;
		}

		const wv = this.pnlWV = window.createWebviewPanel('SKYNovel-body_design', '本文デザイン', column || ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [this.localExtensionResRoots],
		});

		wv.onDidDispose(()=> this.pnlWV = null);	// 閉じられたとき

		wv.webview.onDidReceiveMessage(m=> {
			switch (m.cmd) {
			case 'get':		wv.webview.postMessage({cmd: 'res', sn: this.snBody});	break;
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
		wv.html = this.htmSrc
		.replace(/\$\{webview.cspSource}/g, wv.cspSource)
		.replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(this.localExtensionResRoots)}/`)
		.replace(/(.+"code\.)\w+(.+span>)\w+(<.+\n)/, a.map(fld=> `$1${fld}$2${fld}$3`).join(''));	// codeチェックボックスを追加
	}
	private inputProc(id: string, val: string) {
		const v: any = /^[-]?([1-9]\d*|0)$/.test(val)
		? Number(val)
		: /^(true|false)$/.test(val) ?val :String(val).replace(/"/g, '%22');
/*
		const iP = id.indexOf('.');
		if (iP >= 0) {
			const nm = id.slice(iP +1);
			const id2 = id.slice(0, iP);
			this.oCfg[id2][nm] = v;
		}
		else {
			this.oCfg[id] = v;
		}
		fs.outputFile(this.fnBodySn, this.snBody);
*/

		this.hRep[id]?.(v);
	}
	private	readonly	hRep	: {[name: string]: (val: string)=> void} = {
		'book.detail'	: val=> replaceFile(this.fnBodySn,
			/("description"\s*:\s*").*(")/, `$1${val}$2`),
	}

}
