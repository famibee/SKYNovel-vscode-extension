/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {foldProc, repWvUri, vsc2fp} from './CmnLib';
import {getNonce} from './ActivityBar';
import {SEARCH_PATH_ARG_EXT} from './ConfigBase';
import type {PrjCmn} from './PrjCmn';

import type {WebviewPanel} from 'vscode';
import {ViewColumn, Uri, window} from 'vscode';
import {readFile} from 'fs-extra';


export class WPFolder {
	#wp			: WebviewPanel | undefined	= undefined;
	#uriOpen	: Uri | null				= null;
	#uriWvPrj	: Uri | null				= null;

	readonly	#uriRes	: Uri;
				#htmSrc	: string;


	//MARK: コンストラクタ
	constructor(
		private readonly pc		: PrjCmn,
	) {
		const path_res = this.pc.ctx.extensionPath +'/views/';
		this.#uriRes = Uri.file(path_res);
		void readFile(path_res +'folder.htm', {encoding: 'utf8'})
		.then(t=> this.#htmSrc = t
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
		if (this.#uriOpen === uri && wp) {wp.reveal(column); return;}

		if (! wp) {
			const wp = this.#wp = window.createWebviewPanel('SKYNovel-folder', '', column ?? ViewColumn.One, {
				enableScripts		: true,
			//	retainContextWhenHidden: true,// 楽だがメモリオーバーヘッド高らしい
				localResourceRoots	: [
					this.#uriRes,
					Uri.file(this.pc.PATH_WS),
				],
			});
			const wv = wp.webview;
			this.pc.ctx.subscriptions.push(
				wp.onDidDispose(()=> this.#wp = undefined, undefined, this.pc.ctx.subscriptions),	// 閉じられたとき

				wv.onDidReceiveMessage(({cmd, text}: {cmd: string, text: string})=> {switch (cmd) {
					case 'info': window.showInformationMessage(text); break;
					case 'warn': window.showWarningMessage(text); break;
				}}, false),
			);

			wv.html = repWvUri(this.#htmSrc, wv, this.#uriRes)
			.replace(/<!--SOL-->.+?<!--EOL-->/s, '');
				// https://regex101.com/r/8RaTsD/1
		}
		this.#uriOpen = uri;

		this.#update(uri);
	}
	//MARK: ビュー更新
	#update(uri: Uri) {
		const vfp = uri.path;
		const fp = vsc2fp(vfp);
		const pp = this.pc.diff.fp2pp(fp);
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this.#wp!.title = pp +' フォルダ';

		let htm = '';
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const wv = this.#wp!.webview;
		this.#uriWvPrj = wv.asWebviewUri(Uri.file(this.pc.PATH_PRJ));
		const pathWp = String(this.#uriWvPrj);	// 必ず String() で
		foldProc(fp, (vfp2, nm)=> {
			const fp2 = vsc2fp(Uri.file(vfp2).path);
			const pp2 = this.pc.diff.fp2pp(fp2);
			if (this.#REG_MOV.test(fp2)) {	// GrpよりMovを先に
				htm +=
`<div class="col pe-0">
	<div class="card text-bg-secondary">
		<video controls controlsList="nodownload" playsinline preload="metadata" class="w-100" src="${pathWp}${pp2}" class="card-img-top"></video>
		<div class="card-body">
			<a href="${pathWp}${pp2}" title="エディタにドラッグできます" class="btn btn-primary" title="エディタにドラッグできます">${nm}</a>
		</div>
	</div>
</div>`;
				return;
			}

			if (this.#REG_GRP.test(pp2)) {
				htm +=
`<div class="col pe-0">
	<img loading="lazy" src="${pathWp}${pp2}" title="${nm}"/>
</div>`;
				return;
			}

			if (this.#REG_SND.test(pp2)) {
				htm +=
`<div class="col pe-0">
	<div class="card text-bg-secondary">
		<audio controls src="${pathWp}${pp2}" class="card-img-top"></audio>
		<div class="card-body">
			<a href="${pathWp}${pp2}" title="エディタにドラッグできます" class="btn btn-primary" title="エディタにドラッグできます">${nm}</a>
		</div>
	</div>
</div>`;
				return;
			}

		}, ()=> { /* empty */ });
		wv.postMessage({cmd: 'refresh', o: {htm}});
	}
		readonly #REG_MOV = /\.(mp4|webm)$/;
		// (new RegExp('\')) の場合は、バックスラッシュは２つ必要
		readonly #REG_GRP = new RegExp(`\\.${SEARCH_PATH_ARG_EXT.SP_GSM}$`);
		readonly #REG_SND = new RegExp(`\\.${SEARCH_PATH_ARG_EXT.SOUND}$`);

	//MARK: ビュー遅延更新
	updateDelay({path}: Uri) {
		const uri = this.#uriOpen;
		if (! this.#wp || ! uri) return;
		const fp = vsc2fp(path);			// /c:/
		const fpOF = vsc2fp(uri.path);	// /C:/
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
		this.#uriOpen = null;
	}

}
