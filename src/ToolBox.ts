/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2020-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {getNonce} from './ActivityBar';

import type {WebviewViewProvider, ExtensionContext, WebviewView, WebviewViewResolveContext, CancellationToken} from 'vscode';
import {Uri, window} from 'vscode';

type CTG_ACMD = {
	カテゴリ	: string;
	要素: {
		icon	: string;
		name	: string;
		style?	: string;
		scr		: string;
	}[];
}


export class ToolBox implements WebviewViewProvider {
	static	init(ctx: ExtensionContext): ToolBox {
		const tl = new ToolBox(ctx);
		ctx.subscriptions.push(window.registerWebviewViewProvider('skynovel-tb', tl));
		return tl;
	}

	readonly	#uriRes: Uri;
	private	constructor(readonly ctx: ExtensionContext) {
		this.#uriRes = Uri.file(ctx.extensionPath +'/views');
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
/**/	this.#aCtgACmd0 = this.#aCtgACmd0 ?? [];
	}

	readonly #aCtgACmd	: CTG_ACMD[]= [
/**/	]; readonly #aCtgACmd0 : CTG_ACMD[]= [
		// Solid Icons | Font Awesome https://fontawesome.com/icons?d=gallery&s=solid&m=free
		{カテゴリ: 'テキスト系', 要素: [
			{icon: 'fa-align-left', name: 'テキスト', style: 'btn-primary', scr: '[ch text=##]'},
			{icon: 'fa-comment', name: '表示', style: 'btn-primary', scr: '[txt_fi time=${ms}]'},
			{icon: 'fa-comment-slash', name: '消去', style: 'btn-outline-primary', scr: '[txt_fo time=${ms}]'},
			{icon: 'fa-ruler-combined', name: 'デザイン', style: 'btn-primary', scr: '[txt_cfg layer=${文字レイヤ名}]'},
		],},
		{カテゴリ: '背景・人物系', 要素: [
			{icon: 'fa-images', name: '背景切替', style: 'btn-success text-black', scr: '[bg_chg]'},
			{icon: 'fa-user', name: '人物登場・切替', style: 'btn-success text-black', scr: '[hu]'},
			{icon: 'fa-user-slash', name: '人物退場', style: 'btn-outline-success', scr: '[hu_hide]'},
			{icon: 'fa-running', name: '人物移動', style: 'btn-success text-black', scr: '[hu_mov]'},
			{icon: 'fa-door-open', name: '場面転換', style: 'btn-success text-black', scr: '[scene_change bg=${画像レイヤ名:bg} time=1000]'},
			{icon: 'fa-user-ninja', name: '場面準備', style: 'btn-success btn-rounded text-black', scr: '[scene_reserve layer=0 fn=${画像ファイル名} alpha=1]'},
		],},
		{カテゴリ: '音系', 要素: [
			{icon: 'fa-play', name: 'BGM再生', style: 'btn-info text-black', scr: '[bgm fn=${ＢＧＭファイル名} time=${ms}]'},
			{icon: 'fa-stop', name: 'BGM停止', style: 'btn-outline-info', scr: '[fadeoutbgm time=${ms}'},
			{icon: 'fa-bell', name: '効果音再生', style: 'btn-warning text-black', scr: '[se fn=${音声ファイル名}]'},
			{icon: 'fa-bell-slash', name: '効果音停止', style: 'btn-outline-warning', scr: ''},
		],},
		{カテゴリ: '選択肢やジャンプ系', 要素: [
			{icon: 'fa-project-diagram', name: '選択肢', style: 'btn-primary', scr: ''},
			{icon: 'fa-tag', name: 'ラベル', style: 'btn-outline-light', scr: '*（ラベル名宣言）'},
			{icon: 'fa-stop', name: '停止', style: 'btn-primary', scr: '[s]'},
			{icon: 'fa-external-link-alt', name: 'ジャンプ', scr: '[jump fn=${ファイル名} label=${ラベル名}]'},
			{icon: 'fa-exchange-alt', name: 'コール', scr: '[call fn=${ファイル名} label=${ラベル名}]'},
			{icon: 'fa-long-arrow-alt-left', name: '戻る', scr: '[return]'},
		],},
		{カテゴリ: '演出・その他', 要素: [
			{icon: '', name: '空行', style: 'btn-outline-primary', scr: '\n\n'},
			{icon: 'fa-comment-dots', name: 'コメント', style: 'btn-outline-light btn-rounded', scr: ';（コメント）'},
			{icon: 'fa-hourglass-start', name: '待機', style: 'btn-primary', scr: ''},
			{icon: 'fa-bolt', name: '振動', scr: '[quake time=${時間ms}]'},
			{icon: 'fa-th', name: 'アルバム解放', scr: '[アルバム解放 name=$$$]'},
			{icon: 'fa-calculator', name: '変数操作', style: 'btn-secondary', scr: '[let name=${代入変数名} text=#設定したい値#]'},
			{icon: 'fa-code', name: 'タグ・マクロ', style: 'btn-light', scr: ''},
		],},
	];

	resolveWebviewView(wvv: WebviewView, _ctx: WebviewViewResolveContext, _token: CancellationToken) {
		const wv = wvv.webview;
		wv.options = {
			enableScripts: true,
			localResourceRoots: [this.#uriRes],
		};
		const nonce = getNonce();
		const uri = wv.asWebviewUri(this.#uriRes);
		const {path} = uri;
		wv.html = `<!doctype html><html>
<head><meta charset="utf-8"/>
<title>スコア ツールボックス</title>
<meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: ${wv.cspSource} https:; script-src 'nonce-${nonce}' ${wv.cspSource}; style-src ${wv.cspSource} 'unsafe-inline'; font-src ${wv.cspSource};"/>
<link rel="stylesheet" href="${path}/lib/bootstrap.min.css">
<link rel="stylesheet" href="${path}/lib/bootstrap2vscode.css">
<link rel="stylesheet" href="${path}/lib/fontawesome/all.min.css">
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
<script defer nonce="${nonce}" src="${path}/lib/bootstrap.bundle.min.js"></script>
<script defer nonce="${nonce}" src="${path}/lib/fontawesome/all.min.js"></script>
<script defer nonce="${nonce}" src="${path}/toolbox.js"></script>
</head>
<body>

`+ this.#aCtgACmd.map(v=> {
	return v.カテゴリ +`
<div class="d-flex flex-wrap">`
	+ v.要素.map(vv=> `
	<button id="${vv.name}" type="button" class="btn ${vv.style ?? 'btn-secondary'} btn-sm text-start p-2 mt-1 mr-1" data-ripple-color="dark" draggable="true" data-scr="${encodeURIComponent(vv.scr)}">
		<i class="fas ${vv.icon}"></i>
		${vv.name}
	</button>`).join('')+ `
</div>`;
}).join('') +`

</body>
</html>`;

		wvv.webview.onDidReceiveMessage(({cmd, text}: {cmd: string; text: string;})=> {
			switch (cmd) {
			case 'info':	window.showInformationMessage(text); break;
			case 'warn':	window.showWarningMessage(text); break;
			}
		}, false);
	}

	dispose() { /* empty */ }

}
