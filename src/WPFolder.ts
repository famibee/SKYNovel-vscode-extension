/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {foldProc, v2fp} from './CmnLib';
import {getNonce} from './ActivityBar';
import {SEARCH_PATH_ARG_EXT} from './ConfigBase';
import {HDiff} from './HDiff';

import type {ExtensionContext, WebviewPanel} from 'vscode';
import {ViewColumn, Uri, window} from 'vscode';
import {readFile} from 'fs-extra';


export class WPFolder {
	#wp				: WebviewPanel | undefined	= undefined;
	#uriOpFolder	: Uri | null				= null;
	#uriWvPrj		: Uri | null				= null;

	readonly	#localExtensionResRoots: Uri;
				#htm	: string;


	//MARK: コンストラクタ
	constructor(
		private	readonly	ctx			: ExtensionContext,
		private	readonly	PATH_WS		: string,
		private	readonly	PATH_PRJ	: string,
		private	readonly	diff		: HDiff,
	) {
		const path_root = ctx.extensionPath +'/views/';
		this.#localExtensionResRoots = Uri.file(path_root);
		readFile(path_root +'folder.htm', {encoding: 'utf8'})
		.then(t=> this.#htm = t
			.replace('<meta_autooff ', '<meta ')// ローカルデバッグしたいので
			.replaceAll('${nonce}', getNonce())
			.replace('.ts"></script>', '.js"></script>')
		);
	}


	//MARK: ビューオープン
	open(uri: Uri) {
		// フォルダビュー
		const column = window.activeTextEditor?.viewColumn;
		const wp = this.#wp;
		if (this.#uriOpFolder === uri && wp) {wp.reveal(column); return;}

		if (! wp) {
			const wp = this.#wp = window.createWebviewPanel('SKYNovel-folder', '', column || ViewColumn.One, {
				enableScripts		: true,
			//	retainContextWhenHidden: true,// 楽だがメモリオーバーヘッド高らしい
				localResourceRoots	: [
					this.#localExtensionResRoots,
					Uri.file(this.PATH_WS),
				],
			});
			const wv = wp.webview;
			this.ctx.subscriptions.push(
				wp.onDidDispose(()=> this.#wp = undefined, undefined, this.ctx.subscriptions),	// 閉じられたとき

				wv.onDidReceiveMessage(m=> {switch (m.cmd) {
					case 'info': window.showInformationMessage(m.text); break;
					case 'warn': window.showWarningMessage(m.text); break;
				}}, false),
			);

			wv.html = this.#htm
				.replaceAll('${webview.cspSource}', wv.cspSource)
				.replaceAll(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(this.#localExtensionResRoots)}/`)
				.replace(/<!--SOL-->.+?<!--EOL-->/s, '');
					// https://regex101.com/r/8RaTsD/1
		}
		this.#uriOpFolder = uri;

		this.#update(uri);
	}
	//MARK: ビュー更新
	#update(uri: Uri) {
		const vfp = uri.path;
		const fp = v2fp(vfp);
		const pp = this.diff.fp2pp(fp);
		this.#wp!.title = pp +' フォルダ';

		let htm = '';
		const wv = this.#wp!.webview;
		this.#uriWvPrj = wv.asWebviewUri(Uri.file(this.PATH_PRJ));
		foldProc(fp, (vfp2, nm)=> {
			const fp2 = v2fp(Uri.file(vfp2).path);
			const pp2 = this.diff.fp2pp(fp2);
			if (this.#REG_MOV.test(fp2)) {	// GrpよりMovを先に
				htm +=
`<div class="col pe-0">
	<div class="card text-bg-secondary">
		<video controls controlsList="nodownload" playsinline preload="metadata" class="w-100" src="${this.#uriWvPrj}${pp2}" class="card-img-top"></video>
		<div class="card-body">
			<a href="${this.#uriWvPrj}${pp2}" title="エディタにドラッグできます" class="btn btn-primary" title="エディタにドラッグできます">${nm}</a>
		</div>
	</div>
</div>`;
				return;
			}

			if (this.#REG_GRP.test(pp2)) {
				htm +=
`<div class="col pe-0">
	<img loading="lazy" src="${this.#uriWvPrj}${pp2}" title="${nm}"/>
</div>`;
				return;
			}

			if (this.#REG_SND.test(pp2)) {
				htm +=
`<div class="col pe-0">
	<div class="card text-bg-secondary">
		<audio controls src="${this.#uriWvPrj}${pp2}" class="card-img-top"></audio>
		<div class="card-body">
			<a href="${this.#uriWvPrj}${pp2}" title="エディタにドラッグできます" class="btn btn-primary" title="エディタにドラッグできます">${nm}</a>
		</div>
	</div>
</div>`;
				return;
			}

		}, ()=> {});
		wv.postMessage({cmd: 'refresh', o: {htm}});
	}
		readonly #REG_MOV = /\.(mp4|webm)$/;
		// (new RegExp("~")) の場合は、バックスラッシュは２つ必要
		readonly #REG_GRP = new RegExp(`\\.${SEARCH_PATH_ARG_EXT.SP_GSM}$`);
		readonly #REG_SND = new RegExp(`\\.${SEARCH_PATH_ARG_EXT.SOUND}$`);

	//MARK: ビュー遅延更新
	updateDelay({path}: Uri) {
		const uri = this.#uriOpFolder;
		if (! this.#wp || ! uri) return;
		const fp = v2fp(path);			// /c:/
		const fpOF = v2fp(uri.path);	// /C:/
		if (! fp.startsWith(fpOF)) return;

		if (this.#tiDelay) clearTimeout(this.#tiDelay);	// 遅延
		this.#tiDelay = setTimeout(()=> {
			this.#tiDelay = undefined;
			this.#update(uri);
		}, 500);
	}
		#tiDelay: NodeJS.Timeout | undefined = undefined;


	//MARK: ？？？
	isOpend(path: string) {
		return !!this.#uriWvPrj && path.startsWith(this.#uriWvPrj.path);
	}

	//MARK: ビュークローズ
	close() {
		this.#wp?.dispose();
		this.#wp = undefined;
		this.#uriOpFolder = null;
	}

}
