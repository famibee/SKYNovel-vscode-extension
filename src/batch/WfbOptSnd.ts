/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {vsc2fp} from '../CmnLib';
import {FLD_PRJ_BASE} from '../PrjCmn';
import {WatchFile} from './WatchFile';
import {BatOptSnd, PROC_ID_SND} from './BatOptSnd';

import {Uri, workspace} from 'vscode';
import {existsSync, remove} from 'fs-extra';


const ptnSrcBaseInPrj	= 'doc/prj/*/*.{mp3,wav}';
const ptnSrcOptInPrj	= 'doc/prj/*/*.{m4a,aac,ogg}';


export class WfbOptSnd extends WatchFile {
	#bat: BatOptSnd;

	//MARK: 初期化
	async init() {
		await Promise.allSettled([
			// 音声最適化
			this.watchFld(
				ptnSrcBaseInPrj,
				'doc/prj/*/[FN].{m4a,aac,ogg}',
				async ()=> { /* empty */ },	// 処理はないが処理を動かしたい
				(uri, cre)=> this.#onCreChg(uri, cre),
				uri=> this.#onDel(uri),
				true,
			),
			// 退避素材の更新
			this.watchFld(
				`${this.pc.FLD_SRC}/${FLD_PRJ_BASE}/*/*.{mp3,wav}`,
				'',
				undefined,
				(uri, cre)=> this.#onCreChg(uri, cre),
				uri=> this.#onDel(uri),
				true,
			),
		]);
		this.#bat = new BatOptSnd(this.pc);
	}

	//MARK: #on追加・更新
	async #onCreChg(uri: Uri, _cre=false) {
// console.log(`fn:WfbOptSnd.ts onCreChgInp sw:${! WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path} cre:${_cre}`);
		if (! this.pc.ps.oWss[PROC_ID_SND]) return;

		// 素材ファイルを追加・更新時、退避に上書き移動して最適化
		const path = vsc2fp(uri.path);
		const isBase = this.pc.isBaseUrl(path);
		await this.#bat.go(isBase ?'base_scan' :'prj_scan');

		// 最適化ファイルを暗号化
		await this.pc.encIfNeeded(
			Uri.file(this.#prjBase2Prj(path))	// isBase 両対応
		);
	}
		#prjBase2Prj(path: string) {
			const pathRet = path
			.replace(this.pc.PATH_PRJ_BASE, this.pc.PATH_PRJ);
			for (const ext of ['m4a','aac','ogg']) {
				const pathDest = pathRet
				.replace(this.#REG_SRC_EXT, '.'+ ext);
				if (existsSync(pathDest)) return pathDest;
			}

			return pathRet;
		}
		readonly	#REG_SRC_EXT	= /\.(mp3|wav)$/;

	//MARK: #on削除
	async #onDel(uri: Uri): Promise<boolean> {
// console.log(`fn:OptSnd.ts onDelInp sw:${! WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path}`);
		if (! this.pc.ps.oWss[PROC_ID_SND]) return true;

		const path = vsc2fp(uri.path);
		const isBase = this.pc.isBaseUrl(path);
		if (! isBase) {
			// 変換後ファイルを消したら退避ファイルも削除
			const path2 = path.replace(this.pc.PATH_PRJ, this.pc.PATH_PRJ_BASE);
			await Promise.allSettled(
				['mp3','wav']
				.map(ext=> remove(path2.replace(/(m4a|aac|ogg)$/, ext)))
			);
			return true;
		}

		// 退避ファイルを消したら変換後ファイルも削除
		await Promise.allSettled(
			['m4a','aac','ogg']
			.map(ext=> remove(
				path
				.replace(this.pc.PATH_PRJ_BASE, this.pc.PATH_PRJ)
				.replace(this.#REG_SRC_EXT, '.'+ ext)
			))
		);

		// 退避を消したケースでのみログ更新（このメソッドが多重発生）
		await this.#bat.delRes(path);

		return true;
	}

	//MARK: 情報出力・表示更新
	disp() {return this.#bat.disp()}


	//MARK: 変換有効化
	enable() {return this.#procOnOff('enable', ptnSrcOptInPrj)}

	//MARK: 変換無効化
	disable() {return this.#procOnOff('disable', ptnSrcBaseInPrj)}

	async #procOnOff(proc: 'enable'|'disable', ptn: string) {
		this.pc.watchFile = false;

		// 暗号化状態での最適化状態切り替えの場合、切り替え前の暗号化ファイルを削除
		await this.delOldDiff(this.#REG_DiffExtSnd);

		// 最適化・バッチ処理
		await this.#bat.go(proc);

		// 最適化ファイル・復元したファイルを暗号化
		await Promise.allSettled((await workspace.findFiles(ptn))
			.map(uri=> this.pc.encIfNeeded(uri))
		);

		this.pc.watchFile = true;
	}
	readonly	#REG_DiffExtSnd	= /\.(mp3|m4a|ogg|aac|flac|wav)$/;


	//MARK: 再変換
	async reconv() {
		if (! this.pc.ps.oWss[PROC_ID_SND]) return;

		this.pc.watchFile = false;

		// 現状、UI的に「常にエンコーダー変更」なので、旧全生成物削除→全変換
		// 暗号化状態でのエンコーダー変更の場合、変更前の暗号化ファイルを削除
		await this.delOldDiff(this.#REG_DiffExtSnd);

		await this.#bat.go('reconv');

		this.pc.watchFile = true;
	}

}
