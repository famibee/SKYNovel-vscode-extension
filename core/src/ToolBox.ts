/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2020-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {getNonce} from './CmnLib';

import {WebviewViewProvider, ExtensionContext, WebviewView, WebviewViewResolveContext, CancellationToken, Uri, window} from 'vscode';

export class ToolBox implements WebviewViewProvider {
	private	readonly	localExtensionResRoots: Uri;
	constructor(readonly ctx: ExtensionContext) {
		this.localExtensionResRoots = Uri.file(ctx.extensionPath +'/res/webview');
	}

	private	readonly aCtgACmd : {
		カテゴリ	: string;
		要素: {
			icon	: string;
			name	: string;
			style?	: string;
			scr		: string;
		}[];
	}[]= [
		{カテゴリ: 'システム', 要素: [
			{icon: '', name: '空行', style: 'btn-outline-primary', scr: '\n\n'},
			{icon: 'fa-comment-dots', name: 'コメント', style: 'btn-outline-light btn-rounded', scr: ';$$$'},
			{icon: 'fa-stop', name: '停止する', style: 'btn-primary', scr: ''},
			{icon: 'fa-hourglass-start', name: '時間待ち', style: 'btn-primary', scr: ''},
			{icon: 'fa-calculator', name: '変数操作', style: 'btn-secondary', scr: ''},
			{icon: 'fa-th', name: 'アルバム解放', scr: '[アルバム解放 name=$$$]'},
			{icon: 'fa-code', name: 'SKYNovelタグ・マクロ', style: 'btn-light', scr: ''},
		],},
		{カテゴリ: '文字レイヤ', 要素: [
			{icon: 'fa-ruler-combined', name: '文字表現デザイン', style: 'btn-primary', scr: ''},
			{icon: 'fa-hourglass-start', name: 'クリック待ち', style: 'btn-primary', scr: '[waitclick]'},
			{icon: 'fa-align-left', name: '文字改行', style: 'btn-primary', scr: '[r]'},
			{icon: 'fa-caret-square-right', name: '改行待ち', style: 'btn-primary', scr: '[l]'},
			{icon: 'fa-book-open', name: '改ページ待ち', style: 'btn-primary', scr: '[plc]'},
			{icon: 'fa-sign-out-alt', name: '文字ボタン', style: 'btn-primary', scr: ''},
			{icon: 'fa-sign-out-alt', name: '画像ボタン', style: 'btn-primary', scr: ''},
		],},
		{カテゴリ: '画像レイヤ', 要素: [
			{icon: 'fa-images', name: '背景切替', style: 'btn-success text-black', scr: ''},
			{icon: 'fa-user', name: '立ち絵表示', style: 'btn-success text-black', scr: ''},
		],},
		{カテゴリ: '条件分岐', 要素: [
			{icon: 'fa-external-link-alt', name: 'ジャンプ', scr: '[jump fn=${ファイル名} label=${ラベル名}'},
			{icon: 'fa-exchange-alt', name: 'コール', scr: '[call fn=${ファイル名} label=${ラベル名}'},
			{icon: 'fa-long-arrow-alt-left', name: 'コール元へ戻る', scr: '[return]'},
			{icon: 'fa-tag', name: 'ラベル', style: 'btn-outline-light', scr: '*$$$'},
		],},
	];

	resolveWebviewView(wvv: WebviewView, _ctx: WebviewViewResolveContext, _token: CancellationToken) {
		wvv.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.localExtensionResRoots],
		};

		const wb = wvv.webview;
		const nonce = getNonce();
		const uri = wb.asWebviewUri(this.localExtensionResRoots);
		wvv.webview.html = `<!doctype html><html>
<head><meta charset="utf-8"/>
<title>スコア ツールボックス</title>
<meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${wb.cspSource} https:; script-src 'nonce-${nonce}' ${wb.cspSource}; style-src ${wb.cspSource} 'unsafe-inline'; font-src ${wb.cspSource};"/>
<link rel="stylesheet" href="${uri}/lib/mdb.min.css">
<link rel="stylesheet" href="${uri}/lib/fontawesome/all.min.css">
<style>
	body {
		padding: 0 var(--container-paddding);
		color: var(--vscode-foreground);
		font-size: var(--vscode-font-size);
		font-weight: var(--vscode-font-weight);
		font-family: var(--vscode-font-family);
		background-color: var(--vscode-editor-background);
	}
	.btn {text-transform: none; font-size: 14px;}
</style>
<script defer nonce="${nonce}" src="${uri}/lib/mdb.min.js"></script>
<script defer nonce="${nonce}" src="${uri}/toolbox.js"></script>
</head>
<body>

`+ this.aCtgACmd.map(v=> {
	return v.カテゴリ +`
<div class="d-flex flex-wrap">`
	+ v.要素.map(vv=> `
	<button id="${vv.name}" type="button" class="btn ${vv.style ?? 'btn-secondary'} btn-sm text-left p-2 mt-1 mr-1" data-ripple-color="dark" draggable="true" data-scr="${encodeURIComponent(vv.scr)}">
		<i class="fas ${vv.icon}"></i>
		${vv.name}
	</button>`).join('')+ `
</div>`;
}).join('') +`

</body>
</html>`;

		wvv.webview.onDidReceiveMessage(m=> {
			switch (m.cmd) {
			case 'info':	window.showInformationMessage(m.text); break;
			case 'warn':	window.showWarningMessage(m.text); break;
			}
		}, false);
	}

	dispose() {}

}
