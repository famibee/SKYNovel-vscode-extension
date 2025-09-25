/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_E2V_NOTICE_COMPONENT, T_E2V_OPTSND, T_OPTSND} from '../views/types';
import {DEF_OPTSND} from '../views/types';
import {getFn, v2fp} from './CmnLib';
import {FLD_PRJ_BASE} from './Project';
import {WatchFile2Batch} from './WatchFile2Batch';

import {Uri, workspace} from 'vscode';
import {existsSync, readJson, remove, writeJson} from 'fs-extra';

const PROC_ID = 'cnv.mat.snd';
const ptnSrcBaseInPrj	= 'doc/prj/*/*.{mp3,wav}';
const ptnSrcOptInPrj	= 'doc/prj/*/*.{m4a,aac,ogg}';


export class WfbOptSnd extends WatchFile2Batch {
	readonly	#PATH_LOG;

	//MARK: コンストラクタ
	constructor() {
		super();
		this.#PATH_LOG = WatchFile2Batch.PATH_WS +`/${WatchFile2Batch.FLD_SRC}/batch/cnv_mat_snd.json`;
	}

	//MARK: 初期化
	async init() {await Promise.allSettled([
		// 音声最適化
		WatchFile2Batch.watchFld(
			ptnSrcBaseInPrj,
			'doc/prj/*/[FN].{m4a,aac,ogg}',
			async ()=> {},	// 処理はないが処理を動かしたい
			(uri, cre)=> this.#onCreChg(uri, cre),
			uri=> this.#onDel(uri),
		),
		// 退避素材の更新
		WatchFile2Batch.watchFld(
			`${WatchFile2Batch.FLD_SRC}/${FLD_PRJ_BASE}/*/*.{mp3,wav}`,
			'',
			undefined,
			(uri, cre)=> this.#onCreChg(uri, cre),
			undefined,
		),
		async ()=> {
			if (existsSync(this.#PATH_LOG)) this.#oLog = await readJson(this.#PATH_LOG, {encoding: 'utf8'});
			else await writeJson(this.#PATH_LOG, this.#oLog = DEF_OPTSND);
		},
	])}

	//MARK: #on追加・更新
	async #onCreChg(uri: Uri, _cre=false) {
// console.log(`fn:WfbOptSnd.ts onCreChgInp sw:${! WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path} cre:${_cre}`);
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		// 素材ファイルを追加・更新時、退避に上書き移動して最適化
		const path = v2fp(uri.path);
		const isBase = this.isBaseUrl(path);
		await this.#cnv_mat(isBase ?'base_scan' :'prj_scan');

		// 最適化ファイルを暗号化
		await WatchFile2Batch.encIfNeeded(
			Uri.file(this.#prjBase2Prj(path))	// isBase 両対応
		);
	}
		#prjBase2Prj(path: string) {
			path = path
			.replace(WatchFile2Batch.PATH_PRJ_BASE, WatchFile2Batch.PATH_PRJ);
			for (const ext of ['m4a','aac','ogg']) {
				const pathDest = path
				.replace(this.#REG_SRC_EXT, '.'+ ext);
				if (existsSync(pathDest)) return pathDest;
			}

			return path;
		}
		readonly	#REG_SRC_EXT	= /\.(mp3|wav)$/;

	//MARK: #on削除
	async #onDel(uri: Uri): Promise<boolean> {
// console.log(`fn:OptSnd.ts onDelInp sw:${! WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path}`);
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return true;

		const path = v2fp(uri.path);
		const isBase = this.isBaseUrl(path);
		if (! isBase) {
			// 変換後ファイルを消したら退避ファイルも削除
			const path2 = path.replace(WatchFile2Batch.PATH_PRJ, WatchFile2Batch.PATH_PRJ_BASE);
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
				.replace(WatchFile2Batch.PATH_PRJ_BASE, WatchFile2Batch.PATH_PRJ)
				.replace(this.#REG_SRC_EXT, '.'+ ext)
			))
		);

		// 退避を消したケースでのみログ更新（このメソッドが多重発生）
		const fn = getFn(path);
		if (fn in this.#oLog.hSize) {
			const {baseSize, optSize} = this.#oLog.hSize[fn]!;
			this.#oLog.sum.baseSize -= baseSize;
			this.#oLog.sum.optSize -= optSize;
			delete this.#oLog.hSize[fn];
			await writeJson(this.#PATH_LOG, this.#oLog, {encoding: 'utf8'});
			this.#dispBase();
		}
		return true;
	}

	//MARK: 情報出力・表示更新
	async disp() {
		this.#oLog = await readJson(this.#PATH_LOG, {encoding: 'utf8'});
		this.#dispBase();
	}
	//MARK: 情報表示更新
	#dispBase() {
		WatchFile2Batch.ps.cmd2Vue(<T_E2V_OPTSND>{
			cmd: 'update.optSnd',
			oOptSnd: <T_OPTSND>{...this.#oLog, sum: {
				...this.#oLog.sum,
				pathSndOpt	: WatchFile2Batch.ps.wvuWs +'/doc/prj/',
				pathSndBase	: WatchFile2Batch.ps.wvuWs +`/${WatchFile2Batch.FLD_SRC}/${FLD_PRJ_BASE}/`,
			}},
		});
	}
	#oLog	: T_OPTSND;


	//MARK: 変換有効化
	async enable() {return this.#procOnOff('enable', ptnSrcOptInPrj)}

	//MARK: 変換無効化
	async disable() {return this.#procOnOff('disable', ptnSrcBaseInPrj)}

	async #procOnOff(proc: 'enable'|'disable', ptn: string) {
		WatchFile2Batch.watchFile = false;

		// 暗号化状態での最適化状態切り替えの場合、切り替え前の暗号化ファイルを削除
		await WatchFile2Batch.delOldDiff(this.#REG_DiffExtSnd);

		await this.#cnv_mat(proc);

		// 最適化ファイル・復元したファイルを暗号化
		await Promise.allSettled((await workspace.findFiles(ptn))
			.map(uri=> WatchFile2Batch.encIfNeeded(uri))
		);

		WatchFile2Batch.updPathJson();
		WatchFile2Batch.watchFile = true;
	}
	readonly	#REG_DiffExtSnd	= /\.(mp3|m4a|ogg|aac|flac|wav)$/;

	async #cnv_mat(modeInp: string) {
		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		WatchFile2Batch.ps.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		WatchFile2Batch.exeTask(
			'cnv_mat_snd',
			`${modeInp} '{"codec":"${
				WatchFile2Batch.ps.oWss['cnv.mat.snd.codec']
			}"}' "${WatchFile2Batch.PATH_PRJ}" "${
				WatchFile2Batch.PATH_PRJ_BASE}"`,
		);
		await this.disp();

		o.mode = 'comp';
		WatchFile2Batch.ps.cmd2Vue(o);
	}


	//MARK: 再変換
	async reconv() {
		if (! WatchFile2Batch.ps.oWss['cnv.mat.snd']) return;

		WatchFile2Batch.watchFile = false;

		// 現状、UI的に「常にエンコーダー変更」なので、旧全生成物削除→全変換
		// 暗号化状態でのエンコーダー変更の場合、変更前の暗号化ファイルを削除
		await WatchFile2Batch.delOldDiff(this.#REG_DiffExtSnd);

		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		await this.#cnv_mat('reconv');
		WatchFile2Batch.updPathJson();
		WatchFile2Batch.watchFile = true;
	}

}
