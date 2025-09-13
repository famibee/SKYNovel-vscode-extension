/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {getFn, v2fp} from './CmnLib';
import {FLD_PRJ_BASE} from './Project';
import {WatchFile2Batch} from './WatchFile2Batch';
import type {T_E2V_NOTICE_COMPONENT, T_E2V_OPTSND, T_OPTSND} from '../views/types';
import {DEF_OPTSND} from '../views/types';

import {Uri} from 'vscode';
import {existsSync, readJson, remove, writeJson} from 'fs-extra';

const PROC_ID = 'cnv.mat.snd';


export class WfbOptSnd extends WatchFile2Batch {
	readonly	#PATH_OPT_SND;

	//MARK: コンストラクタ
	constructor() {
		super();
		this.#PATH_OPT_SND = WatchFile2Batch.PATH_WS +`/${WatchFile2Batch.FLD_SRC}/batch/cnv_mat_snd.json`;
	}

	//MARK: 初期化
	async init() {
		await WatchFile2Batch.watchFld(
			'doc/prj/*/*.{mp3,wav}',
			'doc/prj/*/[FN].{m4a,aac,ogg}',
			async ()=> {},	// 処理はないが暗号化処理を動かしたい
			this.#onCreChgOptSnd, async uri=> {
// console.log(`fn:OptSnd.ts del sw:${WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path}`);
				if (! WatchFile2Batch.ps.oWss[PROC_ID]) return true;

				WatchFile2Batch.ps.pnlWVFolder.updateDelay(uri);
				await this.#onDelOptSnd(uri);
				return true;
			}
		);
		await WatchFile2Batch.watchFld(
			`${WatchFile2Batch.FLD_SRC}/${FLD_PRJ_BASE}/*/*.{mp3,wav}`,
			`doc/prj/*/[FN].{m4a,aac,ogg}`, undefined, this.#onCreChgOptSnd, undefined
		);

		if (existsSync(this.#PATH_OPT_SND)) this.#oOptSnd = await readJson(this.#PATH_OPT_SND, {encoding: 'utf8'});
		else await writeJson(this.#PATH_OPT_SND, this.#oOptSnd = DEF_OPTSND);
	}
	async #onCreChgOptSnd(uri: Uri, _cre=false) {
// console.log(`fn:WfbOptSnd.ts line:32 crechg sw:${WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path}`);
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

// console.log(`fn:OptSnd.ts crechg uri:${uri.path} cre:${_cre}`);
		WatchFile2Batch.ps.pnlWVFolder.updateDelay(uri);
		await this.#procOptPic(uri);	// 更新の自動変換
	}

	//MARK: #on追加・更新
	#oOptSnd	: T_OPTSND;
	async #procOptPic({path}: Uri) {
		path = v2fp(path);
		if (this.#REG_EXT_SND_REST.test(path)) return;

		// WatchFile2Batch.watchFile = false;	// cnv_mat_snd() exeTask() でやる
		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		WatchFile2Batch.ps.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		// ファイルを追加・更新時、退避に上書き移動して最適化
		const isBase = this.isBaseUrl(path);
		await this.#cnv_mat_snd(isBase ?'base_scan' :'prj_scan');

		this.#oOptSnd = await readJson(this.#PATH_OPT_SND, {encoding: 'utf8'});
		this.dispOptSnd();

		o.mode = 'comp';
		WatchFile2Batch.ps.cmd2Vue(o);
		// WatchFile2Batch.watchFile = true;	// cnv_mat_snd() exeTask() でやる
	}
	//MARK: #on削除
	async #onDelOptSnd({path}: Uri) {
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		WatchFile2Batch.watchFile = false;	// バッチ処理自身が発端を再度引き起こすので
		path = v2fp(path);
		const isBase = this.isBaseUrl(path);
		if (! isBase) {		// 変換後ファイルを消したら退避ファイルも削除
			const path2 = path.replace(WatchFile2Batch.PATH_PRJ, WatchFile2Batch.PATH_PRJ_BASE);
			for await (const ext of ['mp3','wav']) {
				remove(path2.replace(/(m4a|aac|ogg)$/, ext));
			}
			WatchFile2Batch.watchFile = true;
			return;
		}

		// 退避ファイルを消したら変換後  aac... も削除
		for await (const ext of ['m4a','aac','ogg']) remove(
			path.replace(WatchFile2Batch.PATH_PRJ_BASE, WatchFile2Batch.PATH_PRJ)
			.replace(this.#REG_EXT_SND_CNV, '.'+ ext)
		);
		const fn = getFn(path);
		if (fn in this.#oOptSnd.hSize) {
			const {baseSize, optSize} = this.#oOptSnd.hSize[fn]!;
			this.#oOptSnd.sum.baseSize -= baseSize;
			this.#oOptSnd.sum.optSize -= optSize;
			delete this.#oOptSnd.hSize[fn];
			await writeJson(this.#PATH_OPT_SND, this.#oOptSnd, {encoding: 'utf8'});
			this.dispOptSnd();
		}
		WatchFile2Batch.watchFile = true;
	}
		readonly	#REG_EXT_SND_REST	= /\.(m4a|aac|ogg)$/;
		readonly	#REG_EXT_SND_CNV	= /\.(mp3|wav)$/;

	//MARK: 情報表示更新
	dispOptSnd() {
		WatchFile2Batch.ps.cmd2Vue(<T_E2V_OPTSND>{
			cmd: 'update.optSnd',
			oOptSnd: <T_OPTSND>{...this.#oOptSnd, sum: {
				...this.#oOptSnd.sum,
				pathSndOpt	: WatchFile2Batch.ps.wvuWs +'/doc/prj/',
				pathSndBase	: WatchFile2Batch.ps.wvuWs +`/${WatchFile2Batch.FLD_SRC}/${FLD_PRJ_BASE}/`,
			}},
		});
	}
	//MARK: 情報出力・表示更新
	async updOptSnd() {
		this.#oOptSnd = await readJson(this.#PATH_OPT_SND, {encoding: 'utf8'});
		this.dispOptSnd();
	}


	//MARK: 変換有効化
	async enable() {
		await this.#cnv_mat_snd('enable');
		WatchFile2Batch.updPathJson();
	}

	//MARK: 変換無効化
	async disable() {
		await this.#cnv_mat_snd('disable');
		WatchFile2Batch.updPathJson();
	}

	//MARK: 再変換
	async reconv() {
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		await this.#cnv_mat_snd('reconv');
		WatchFile2Batch.updPathJson();
	}
		readonly	#cnv_mat_snd = (modeInp: string)=> WatchFile2Batch.exeTask(
			'cnv_mat_snd',
			`${modeInp} '{"codec":"${WatchFile2Batch.ps.oWss['cnv.mat.snd.codec']
			}"}' "${WatchFile2Batch.PATH_PRJ}" "${WatchFile2Batch.PATH_PRJ_BASE}"`,
		);

}
