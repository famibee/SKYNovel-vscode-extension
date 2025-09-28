/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_E2V_CHG_RANGE_WEBP_Q, T_E2V_CHG_RANGE_WEBP_Q_DEF, T_E2V_NOTICE_COMPONENT, T_E2V_OPTPIC, T_OPTPIC} from '../views/types';
import {DEF_OPTPIC} from '../views/types';
import {getFn, fsp2fp} from './CmnLib';
import {FLD_PRJ_BASE} from './Project';
import {WatchFile2Batch} from './WatchFile2Batch';

import {Uri, workspace} from 'vscode';
import {existsSync, mkdirs, readJson, remove, writeJson} from 'fs-extra';

const PROC_ID = 'cnv.mat.pic';
const ptnSrcBaseInPrj	= 'doc/prj/*/*.{jpg,jpeg,png}';
const ptnSrcOptInPrj	= 'doc/prj/*/*.webp';


export class WfbOptPic extends WatchFile2Batch {
	readonly	#PATH_LOG;

	//MARK: コンストラクタ
	constructor() {
		super();
		this.#PATH_LOG = WatchFile2Batch.PATH_WS +`/${WatchFile2Batch.FLD_SRC}/batch/cnv_mat_pic.json`;
	}

	//MARK: 初期化
	async init() {await Promise.allSettled([
		// 画像最適化
		WatchFile2Batch.watchFld(
			ptnSrcBaseInPrj,
			'doc/prj/*/[FN].webp',
			async ()=> {},	// 処理はないが処理を動かしたい
			(uri, cre)=> this.#onCreChg(uri, cre),
			uri=> this.#onDel(uri),
		),
		// 退避素材の更新
		WatchFile2Batch.watchFld(
			`${WatchFile2Batch.FLD_SRC}/${FLD_PRJ_BASE}/*/*.{jpg,jpeg,png}`,
			'',
			undefined,
			(uri, cre)=> this.#onCreChg(uri, cre),
			undefined,
		),
		async ()=> {
			if (existsSync(this.#PATH_LOG)) this.#oLog = await readJson(this.#PATH_LOG, {encoding: 'utf8'});
			else await writeJson(this.#PATH_LOG, this.#oLog = DEF_OPTPIC);
		},

		// 立ち絵素材生成機能
		mkdirs(WatchFile2Batch.PATH_WS +`/${WatchFile2Batch.FLD_SRC}/resource/`),
		WatchFile2Batch.watchFld(
			`${WatchFile2Batch.FLD_SRC}/resource/*.psd`,
			`{doc/prj,${WatchFile2Batch.FLD_SRC}/${FLD_PRJ_BASE}}/face/{[FN]_*.png,[FN]_*.webp,face[FN].sn}`,
			uri=> this.#onInitFacePsd(uri),
			(uri, cre)=> this.#onCreChgFacePsd(uri, cre),
			async ()=> true,	// 処理はないが処理を動かしたい
		),
	])}

	//MARK: #on追加・更新
	async #onCreChg(uri: Uri, _cre=false) {
// console.log(`fn:WfbOptPic.ts onCreChgInp sw:${! WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path} cre:${_cre}`);
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		// 素材ファイルを追加・更新時、退避に上書き移動して最適化
		const path = fsp2fp(uri.path);
		const isBase = this.isBaseUrl(path);
		await this.#cnv_mat(isBase ?'base_scan' :'prj_scan');

		// 最適化ファイルを暗号化
		const pathEncOpt = this.#prjBase2Prj(path);	// isBase 両対応
		await WatchFile2Batch.encIfNeeded(Uri.file(pathEncOpt));
	}
		#prjBase2Prj(path: string) {
			return path
			.replace(WatchFile2Batch.PATH_PRJ_BASE, WatchFile2Batch.PATH_PRJ)
			.replace(this.#REG_SRC_EXT, '.webp');
		}
		readonly	#REG_SRC_EXT	= /\.(jpeg|jpg|png)$/;

	//MARK: #on削除
	async #onDel(uri: Uri) {
// console.log(`fn:WfbOptPic.ts onDelInp sw:${! WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path}`);
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return true;

		const path = fsp2fp(uri.path);
		const isBase = this.isBaseUrl(path);
		if (! isBase) {
			// 変換後ファイルを消したら退避ファイルも削除
			const path2 = path.replace(WatchFile2Batch.PATH_PRJ, WatchFile2Batch.PATH_PRJ_BASE);
			await Promise.allSettled(
				['jpeg','jpg','png']
				.map(ext=> remove(path2.replace(/webp$/, ext)))
			);
			return true;
		}

		// 退避ファイルを消したら変換後ファイルも削除
		await remove(this.#prjBase2Prj(path));

		// 退避を消したケースでのみログ更新（このメソッドが多重発生）
		const fn = getFn(path);
		if (fn in this.#oLog.hSize) {
			const {baseSize, webpSize} = this.#oLog.hSize[fn]!;
			this.#oLog.sum.baseSize -= baseSize;
			this.#oLog.sum.webpSize -= webpSize;
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
		WatchFile2Batch.ps.cmd2Vue(<T_E2V_OPTPIC>{
			cmd: 'update.optPic',
			oOptPic: <T_OPTPIC>{...this.#oLog, sum: {
				...this.#oLog.sum,
				pathPicOpt	: WatchFile2Batch.ps.wvuWs +'/doc/prj/',
				pathPicBase	: WatchFile2Batch.ps.wvuWs +`/${WatchFile2Batch.FLD_SRC}/${FLD_PRJ_BASE}/`,
			}},
		});
	}
	#oLog	: T_OPTPIC;


	//MARK: 変換有効化
	async enable() {return this.#procOnOff('enable', ptnSrcOptInPrj)}

	//MARK: 変換無効化
	async disable() {return this.#procOnOff('disable', ptnSrcBaseInPrj)}

	async #procOnOff(proc: 'enable'|'disable', ptn: string) {
		WatchFile2Batch.watchFile = false;

		// 暗号化状態での最適化状態切り替えの場合、切り替え前の暗号化ファイルを削除
		await WatchFile2Batch.delOldDiff(this.#REG_DiffExtPic);

		await this.#cnv_mat(proc);

		// 最適化ファイル・復元したファイルを暗号化
		await Promise.allSettled((await workspace.findFiles(ptn))
			.map(uri=> WatchFile2Batch.encIfNeeded(uri))
		);

		WatchFile2Batch.updPathJson();
		WatchFile2Batch.watchFile = true;
	}
	readonly	#REG_DiffExtPic	= /\.(jpe?g|png|svg|webp)$/;

	//MARK: バッチ処理
	async #cnv_mat(modeInp: string) {
		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		WatchFile2Batch.ps.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		await WatchFile2Batch.exeTask(
			'cnv_mat_pic',
			`${modeInp} ${
				WatchFile2Batch.ps.oWss['cnv.mat.webp_quality']
			} "${WatchFile2Batch.PATH_PRJ}" "${
				WatchFile2Batch.PATH_PRJ_BASE}"`,
		);
		await this.disp();

		o.mode = 'comp';
		WatchFile2Batch.ps.cmd2Vue(o);
	}


	//MARK: PSD から立ち絵素材生成・素材最適化・暗号化
	async #onInitFacePsd(uri: Uri) {
		const {fsPath} = uri;
// console.log(`fn:WfbOptPic.ts onInitFacePsd fsPath:${fsPath}`);
		const hn = getFn(fsPath);
		if (WatchFile2Batch.chkUpdate(fsPath, `${WatchFile2Batch.PATH_PRJ}face/face${hn}.sn`)) await this.#onCreChgFacePsd(uri, false);
	}
	//MARK: PSD 変更
	async #onCreChgFacePsd(uri: Uri, _cre=false) {
		const {fsPath} = uri;
// console.log(`fn:WfbOptPic.ts onCreChgFacePsd _cre:${_cre} fsPath:${fsPath}`);
		await this.#exe_cnv_psd_face(fsPath);

		// 画像ファイルを追加・更新時、退避に上書き移動して最適化
		if (WatchFile2Batch.ps.oWss[PROC_ID]) await this.#cnv_mat('prj_scan');

		// 生成ファイルを暗号化
		const hn = getFn(fsPath);
		const aUri = await workspace.findFiles('doc/prj/*/[FN]_*.{jpg,jpeg,png,webp}'.replaceAll('[FN]', hn));

		// （aUri は画像素材だけなので）doc/prj/*/face[FN].sn をねじ込む
		const pathSn = aUri.at(0)?.path.replace(/[^\/]+\.\w+$/, `face${hn}.sn`);
		if (pathSn && existsSync(pathSn)) aUri.push(Uri.file(pathSn));

		await Promise.allSettled(aUri.map(u=> WatchFile2Batch.encIfNeeded(u)));
	}
		readonly #exe_cnv_psd_face = (fsPath: string)=> WatchFile2Batch.exeTask('cnv_psd_face', `"${fsPath}" "${WatchFile2Batch.PATH_PRJ}"`);


	//MARK: 基本の変換画質変更
	async chgWebp_q_def(e: T_E2V_CHG_RANGE_WEBP_Q_DEF) {
		// 変化のたびに動作するので 'update.oWss' と統合してはいけない
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		WatchFile2Batch.watchFile = false;

		await WatchFile2Batch.wss.update('cnv.mat.webp_quality', WatchFile2Batch.ps.oWss['cnv.mat.webp_quality'] = e.webp_q);

		await this.#cnv_mat('reconv');

		WatchFile2Batch.watchFile = true;
	}

	//MARK: ファイル個別変換画質変更
	async chgWebp_q(o: T_E2V_CHG_RANGE_WEBP_Q) {
		if (! WatchFile2Batch.ps.oWss[PROC_ID]) return;

		WatchFile2Batch.watchFile = false;

		const fi = this.#oLog.hSize[o.nm]!;
		if (o.no_def) fi.webp_q = o.webp_q;
		else delete fi.webp_q;
		await writeJson(this.#PATH_LOG, this.#oLog);
		this.#dispBase();

		// Baseフォルダを渡す事で再変換
		await this.#onCreChg(Uri.file(WatchFile2Batch.PATH_PRJ_BASE + fi.fld_nm +'.'+ fi.ext));

		WatchFile2Batch.watchFile = true;
	}

}
