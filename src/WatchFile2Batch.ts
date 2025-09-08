/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {getFn, v2fp} from './CmnLib';
import {FLD_PRJ_BASE, type T_CN} from './Project';
import type {T_CMD, T_E2V, T_WSS} from '../views/types';

import {Disposable, type ExtensionContext, RelativePattern, Uri, workspace, type WorkspaceFolder} from 'vscode';
import {remove, statSync} from 'fs-extra';


export class WatchFile2Batch {
	protected readonly	PATH_WS;
	protected readonly	PATH_PRJ;
	protected readonly	PATH_PRJ_BASE;
	protected readonly	LEN_PATH_PRJ_BASE;

	readonly	wss;
	protected static	readonly	ds		: Disposable[]	= [];

	//MARK: コンストラクタ
	constructor(
		readonly ctx: ExtensionContext,
		protected readonly wsFld: WorkspaceFolder, 
		protected readonly oWss: ()=> T_WSS,
		protected readonly cmd2Vue: (mes: T_E2V)=> void,
		protected readonly exeTask: (nm: T_CMD, arg: string)=> Promise<number>,
		protected readonly updPathJson: ()=> void,
		protected readonly encIfNeeded: (uri: Uri)=> void,
		protected readonly path2cn: (fp: string)=> T_CN,
		protected readonly FLD_SRC: string,
		protected readonly wvuWs: ()=> Uri,
		protected readonly onSettingEvt: (nm: string, val: string)=> Promise<boolean>,
		protected readonly chkWVFolder: (uri: Uri)=> void,
	) {
		this.wss = ctx.workspaceState;
		this.PATH_WS = v2fp(wsFld.uri.path);
		this.PATH_PRJ = this.PATH_WS +'/doc/prj/';
		this.PATH_PRJ_BASE = this.PATH_WS +`/${FLD_SRC}/${FLD_PRJ_BASE}/`;
		this.LEN_PATH_PRJ_BASE = this.PATH_PRJ_BASE.length;
	}

	//MARK: デストラクタ
	static	dispose() {for (const d of this.ds) d.dispose()}

	//MARK: #フォルダ監視
	async watchFld(rpInp: RelativePattern, pathOut: string, init?: (uri: Uri)=> Promise<void>, crechg?: (uri: Uri, cre: boolean)=> Promise<void>, del?: (uri: Uri)=> Promise<void>) {
		if (init) await workspace.findFiles(rpInp).then(async aUri=> {
			// バッチ処理等なので並列処理しない、直列処理
			for await (const uri of aUri) init(uri);	// await必須
		});

		const fw = workspace.createFileSystemWatcher(rpInp, !!crechg, !!crechg, !!del);
		if (crechg) WatchFile2Batch.ds.push(
			fw.onDidCreate(async uri=> {
				if (statSync(uri.path).isDirectory()) return;

				return crechg(uri, true);
			}),
			fw.onDidChange(async uri=> {
				if (statSync(uri.path).isDirectory()) return;

				await this.#delOut(pathOut, uri);	//NOTE: ?
				return crechg(uri, false);
			}),
		);
		if (del) WatchFile2Batch.ds.push(fw.onDidDelete(	// フォルダごと削除すると、発生しない！
			uri=> this.#delOut(pathOut, uri).then(()=> del(uri))
		));
	}
		async	#delOut(pathOut: string, {fsPath}: Uri) {
			if (pathOut === '') return;

			const hn = getFn(fsPath);
			const aUri = await workspace.findFiles(pathOut.replace('[FN]', hn));
			await Promise.allSettled(aUri.map(({path})=> remove(path)));
		}

}
