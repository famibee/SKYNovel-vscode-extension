/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {getFn, v2fp} from './CmnLib';
import {FLD_PRJ_BASE} from './Project';
import {WatchFile2Batch} from './WatchFile2Batch';
import type {T_E2V_CHG_RANGE_WEBP_Q, T_E2V_CHG_RANGE_WEBP_Q_DEF, T_E2V_NOTICE_COMPONENT, T_E2V_OPTPIC, T_OPTPIC} from '../views/types';
import {DEF_OPTPIC} from '../views/types';

import {Uri} from 'vscode';
import {existsSync, readJson, remove, writeJson} from 'fs-extra';

const PROC_ID = 'cnv.mat.pic';


export class WfbOptPic extends WatchFile2Batch {
	readonly	#PATH_OPT_PIC;

	//MARK: コンストラクタ
	constructor() {
		super();
		this.#PATH_OPT_PIC = WatchFile2Batch.PATH_WS +`/${WatchFile2Batch.FLD_SRC}/batch/cnv_mat_pic.json`;
	}

	//MARK: 初期化
	async init() {
		await WatchFile2Batch.watchFld(
			'doc/prj/*/*.{jpg,jpeg,png}',
			'doc/prj/*/[FN].webp',
			async ()=> {},	// 処理はないが暗号化処理を動かしたい
			this.#onCreChgOptPic, async uri=> {
// console.log(`fn:WfbOptPic.ts del sw:${WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path}`);
				if (! WatchFile2Batch.ps.oWss[PROC_ID]) return true;

				WatchFile2Batch.ps.pnlWVFolder.updateDelay(uri);
				await this.#onDelOptPic(uri);
				return true;
			}
		);
		await WatchFile2Batch.watchFld(
			`${WatchFile2Batch.FLD_SRC}/${FLD_PRJ_BASE}/*/*.{jpg,jpeg,png}`,
			'', undefined, this.#onCreChgOptPic, undefined
		);

		if (existsSync(this.#PATH_OPT_PIC)) this.#oOptPic = await readJson(this.#PATH_OPT_PIC, {encoding: 'utf8'});
		else await writeJson(this.#PATH_OPT_PIC, this.#oOptPic = DEF_OPTPIC);
	}
	async #onCreChgOptPic(uri: Uri, _cre=false) {
// console.log(`fn:WfbOptPic.ts line:32 crechg sw:${WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path}`);
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

// console.log(`fn:WfbOptPic.ts crechg uri:${uri.path} cre:${_cre}`);
		WatchFile2Batch.ps.pnlWVFolder.updateDelay(uri);
		await this.#procOptPic(uri);		// 更新の自動変換
	}

	//MARK: #on追加・更新
	#oOptPic	: T_OPTPIC;
	async #procOptPic({path}: Uri) {
		path = v2fp(path);
		if (this.#REG_EXT_PIC_REST.test(path)) return;

		// WatchFile2Batch.watchFile = false;	// cnv_mat_pic() exeTask() でやる
		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		WatchFile2Batch.ps.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		// 画像ファイルを追加・更新時、退避に上書き移動して最適化
		const isBase = this.isBaseUrl(path);
		await this.#cnv_mat_pic(isBase ?'base_scan' :'prj_scan');

		this.#oOptPic = await readJson(this.#PATH_OPT_PIC, {encoding: 'utf8'});
		this.dispOptPic();

		o.mode = 'comp';
		WatchFile2Batch.ps.cmd2Vue(o);
		// WatchFile2Batch.watchFile = true;	// cnv_mat_pic() exeTask() でやる
	}
	//MARK: #on削除
	async #onDelOptPic({path}: Uri) {
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		WatchFile2Batch.watchFile = false;	// バッチ処理自身が発端を引き起こすので
		path = v2fp(path);
		const isBase = this.isBaseUrl(path);
		if (! isBase) {		// 変換後ファイルを消したら退避ファイルも削除
			const path2 = path.replace(WatchFile2Batch.PATH_PRJ, WatchFile2Batch.PATH_PRJ_BASE);
			for await (const ext of ['jpeg','jpg','png']) {
				remove(path2.replace(/webp$/, ext));
			}
			WatchFile2Batch.watchFile = true;
			return;
		}

		// 退避ファイルを消したら変換後ファイルも削除
		await remove(
			path.replace(WatchFile2Batch.PATH_PRJ_BASE, WatchFile2Batch.PATH_PRJ)
			.replace(this.#REG_EXT_PIC_CNV, '.webp')
		);
		// 退避を消したケースでのみ上方 json 更新（このメソッドが多重発生）
		const fn = getFn(path);
		if (fn in this.#oOptPic.hSize) {
			const {baseSize, webpSize} = this.#oOptPic.hSize[fn]!;
			this.#oOptPic.sum.baseSize -= baseSize;
			this.#oOptPic.sum.webpSize -= webpSize;
			delete this.#oOptPic.hSize[fn];
			await writeJson(this.#PATH_OPT_PIC, this.#oOptPic, {encoding: 'utf8'});
			this.dispOptPic();
		}
		WatchFile2Batch.watchFile = true;
	}
		readonly	#REG_EXT_PIC_REST	= /\.(m4a|aac|ogg)$/;
		readonly	#REG_EXT_PIC_CNV	= /\.(mp3|wav)$/;

	//MARK: 情報表示更新
	dispOptPic() {
		WatchFile2Batch.ps.cmd2Vue(<T_E2V_OPTPIC>{
			cmd: 'update.optPic',
			oOptPic: <T_OPTPIC>{...this.#oOptPic, sum: {
				...this.#oOptPic.sum,
				pathPicOpt	: WatchFile2Batch.ps.wvuWs +'/doc/prj/',
				pathPicBase	: WatchFile2Batch.ps.wvuWs +`/${WatchFile2Batch.FLD_SRC}/${FLD_PRJ_BASE}/`,
			}},
		});
	}
	//MARK: 情報出力・表示更新
	async updOptPic() {
		this.#oOptPic = await readJson(this.#PATH_OPT_PIC, {encoding: 'utf8'});
		this.dispOptPic();
	}
	//MARK: 立ち絵 PSD 生成物を素材最適化・暗号化
	async facePsdCreChg() {
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		// WatchFile2Batch.watchFile = false;	// 画像素材最適化ONならそちらでやる
		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		WatchFile2Batch.ps.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		// 画像ファイルを追加・更新時、退避に上書き移動して最適化
		await this.#cnv_mat_pic('prj_scan');

		this.#oOptPic = await readJson(this.#PATH_OPT_PIC, {encoding: 'utf8'});
		this.dispOptPic();

		o.mode = 'comp';
		WatchFile2Batch.ps.cmd2Vue(o);
		// WatchFile2Batch.watchFile = true;	// 画像素材最適化ONならそちらでやる
	}
	//MARK: 立ち絵 PSD 生成物を削除
	async facePsdDel(uri: Uri) {
		WatchFile2Batch.ps.pnlWVFolder.updateDelay(uri);
		await this.#onDelOptPic(uri);
	}

	//MARK: 基本の変換画質変更
	async chgWebp_q_def(e: T_E2V_CHG_RANGE_WEBP_Q_DEF) {
		// 変化のたびに動作するので 'update.oWss' と統合してはいけない
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		WatchFile2Batch.watchFile = false;	// バッチ処理自身が発端を引き起こすので

		await WatchFile2Batch.wss.update('cnv.mat.webp_quality', WatchFile2Batch.ps.oWss['cnv.mat.webp_quality'] = e.webp_q);

		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		WatchFile2Batch.ps.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		await WatchFile2Batch.onSettingEvt('cnv.mat.webp_quality', '');	// 疑似イベント発生
		this.#oOptPic = await readJson(this.#PATH_OPT_PIC, {encoding: 'utf8'});
		this.dispOptPic();

		o.mode = 'comp';
		WatchFile2Batch.ps.cmd2Vue(o);
		WatchFile2Batch.watchFile = true;
	}

	//MARK: ファイル個別変換画質変更
	async chgWebp_q(o: T_E2V_CHG_RANGE_WEBP_Q) {
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		WatchFile2Batch.watchFile = false;	// バッチ処理自身が発端を引き起こすので
		const fi = this.#oOptPic.hSize[o.nm]!;
		if (o.no_def) fi.webp_q = o.webp_q;
		else delete fi.webp_q;
		await writeJson(this.#PATH_OPT_PIC, this.#oOptPic);

		// Baseフォルダを渡す事で再変換
		await this.#procOptPic(Uri.file(WatchFile2Batch.PATH_PRJ_BASE + fi.fld_nm +'.'+ fi.ext));
		// this.dispOptPic();	// 中でやる
		// WatchFile2Batch.watchFile = true;	// 中でやる
	}


	//MARK: 変換有効化
	async enable() {
		await this.#cnv_mat_pic('enable');
		WatchFile2Batch.updPathJson();
	}

	//MARK: 変換無効化
	async disable() {
		await this.#cnv_mat_pic('disable');
		WatchFile2Batch.updPathJson();
	}

	//MARK: 再変換
	async reconv() {
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		await this.#cnv_mat_pic('reconv');
		// WatchFile2Batch.updPathJson();	// 現状、別拡張子に変わらないので不要
	}
		readonly	#cnv_mat_pic = (modeInp: string)=> WatchFile2Batch.exeTask(
			'cnv_mat_pic',
			`${modeInp} ${WatchFile2Batch.ps.oWss['cnv.mat.webp_quality']
			} "${WatchFile2Batch.PATH_PRJ}" "${WatchFile2Batch.PATH_PRJ_BASE}"`,
		);

}
