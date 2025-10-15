/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_E2V_SELECT_ICON_INFO, T_BJ_cut_round, T_V2E_CHG_RANGE_WEBP_Q, T_V2E_CHG_RANGE_WEBP_Q_DEF, T_V2E_selectFile} from '../types';
import {getFn, vsc2fp, WORKSPACE_PATH} from '../CmnLib';
import {FLD_PRJ_BASE} from '../PrjCmn';
import {WatchFile} from './WatchFile';
import {BatOptPic, PROC_ID_PIC} from './BatOptPic';
import {BatPsdFace} from './BatPsdFace';

import {Uri, window, workspace} from 'vscode';
import {existsSync} from 'node:fs';
import {mkdirs, readJsonSync, remove, writeJson} from 'fs-extra/esm';


const ptnSrcBaseInPrj	= 'doc/prj/*/*.{jpg,jpeg,png}';
const ptnSrcOptInPrj	= 'doc/prj/*/*.webp';


export class WfbOptPic extends WatchFile {
	#bat		: BatOptPic;
	#batPsdFace	: BatPsdFace;

	readonly	#PATH_BJ_cut_round = this.pc.PATH_WS +`/${this.pc.FLD_SRC}/batch/cut_round.json`;


	//MARK: 初期化
	async init() {
		await Promise.allSettled([
			// 画像最適化
			this.watchFld(
				ptnSrcBaseInPrj,
				'doc/prj/*/[FN].webp',
				async ()=> { /* empty */ },	// 処理はないが処理を動かしたい
				(uri, cre)=> this.#onCreChg(uri, cre),
				uri=> this.#onDel(uri),
				true,
			),
			// 退避素材の更新
			this.watchFld(
				`${this.pc.FLD_SRC}/${FLD_PRJ_BASE}/*/*.{jpg,jpeg,png}`,
				'',
				undefined,
				(uri, cre)=> this.#onCreChg(uri, cre),
				uri=> this.#onDel(uri),
				true,
			),

			// 立ち絵素材生成機能
			mkdirs(this.pc.PATH_WS +`/${this.pc.FLD_SRC}/resource/`),
			this.watchFld(
				`${this.pc.FLD_SRC}/resource/*.psd`,
				`{doc/prj,${this.pc.FLD_SRC}/${FLD_PRJ_BASE}}/face/{[FN]_*.png,[FN]_*.webp,face[FN].sn}`,
				uri=> this.#onInitFacePsd(uri),
				(uri, cre)=> this.#onCreChgFacePsd(uri, cre),
				()=> Promise.resolve(true),	// 処理はないが処理を動かしたい
				true,
			),
		]);
		this.#bat = new BatOptPic(this.pc);
		this.#batPsdFace = new BatPsdFace(this.pc);
	}

	//MARK: #on追加・更新
	async #onCreChg(uri: Uri, _cre=false) {
// console.log(`fn:WfbOptPic.ts onCreChgInp sw:${! WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path} cre:${_cre}`);
		if (! this.pc.ps.oWss[PROC_ID_PIC]) return;

		// 素材ファイルを追加・更新時、退避に上書き移動して最適化
		const path = vsc2fp(uri.path);
		const isBase = this.pc.isBaseUrl(path);
		await this.#bat.go(isBase ?'base_scan' :'prj_scan');

		// 最適化ファイルを暗号化
		const pathEncOpt = this.#prjBase2Prj(path);	// isBase 両対応
		await this.pc.encIfNeeded(Uri.file(pathEncOpt));
	}
		#prjBase2Prj(path: string) {
			return path
			.replace(this.pc.PATH_PRJ_BASE, this.pc.PATH_PRJ)
			.replace(this.#REG_SRC_EXT, '.webp');
		}
		readonly	#REG_SRC_EXT	= /\.(jpeg|jpg|png)$/;

	//MARK: #on削除
	async #onDel(uri: Uri) {
// console.log(`fn:WfbOptPic.ts onDelInp sw:${! WatchFile2Batch.ps.oWss[PROC_ID]} uri:${uri.path}`);
		if (! this.pc.ps.oWss[PROC_ID_PIC]) return true;

		const path = vsc2fp(uri.path);
		const isBase = this.pc.isBaseUrl(path);
		if (! isBase) {
			// 変換後ファイルを消したら退避ファイルも削除
			await remove(this.wpOpt2Base(path));
			// 以下は乱暴版
			// const path2 = path.replace(this.pc.PATH_PRJ, this.pc.PATH_PRJ_BASE);
			// await Promise.allSettled(
			// 	['jpeg','jpg','png']
			// 	.map(ext=> remove(path2.replace(/webp$/, ext)))
			// );
			return true;
		}

		// 退避ファイルを消したら変換後ファイルも削除
		await remove(this.#prjBase2Prj(path));

		// 退避を消したケースでのみログ更新（このメソッドが多重発生）
		await this.#bat.delRes(path);

		return true;
	}

	//MARK: 画像パス、最適化状態なら元画像へのパスを返す
	wpOpt2Base(wp: WORKSPACE_PATH): WORKSPACE_PATH {
		if (! wp.endsWith('.webp')) return wp;

		const ret = wp
		.replace(this.pc.PATH_PRJ, this.pc.PATH_PRJ_BASE)
		.slice(0, -4);

		const ext = ['jpeg','jpg','png'].find(ext=> existsSync(ret + ext));
		return ext ?ret + ext :wp;
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
		await this.delOldDiff(/\.(jpe?g|png|svg|webp)$/);

		// 最適化・バッチ処理
		await this.#bat.go(proc);

		// 最適化ファイル・復元したファイルを暗号化
		await Promise.allSettled((await workspace.findFiles(ptn))
			.map(uri=> this.pc.encIfNeeded(uri))
		);

		this.pc.watchFile = true;
	}


	//MARK: アイコン加工
	async cnvIconShape({title, openlabel, path}: T_V2E_selectFile, pathIcon: string) {
		//if (id !== 'icon') return;
		const fileUri = await window.showOpenDialog({
			title	: `${title}を選択して下さい`,
			openLabel		: openlabel || 'ファイルを選択',
			canSelectMany	: false,
			canSelectFiles	: false,
			canSelectFolders: false,
		});
		const src = fileUri?.[0]?.fsPath;
		if (! src) return;	// キャンセル

		const cmd2Vue = (err_mes: string)=> {void this.pc.ps.cmd2Vue(<T_E2V_SELECT_ICON_INFO>{
			cmd		: 'updpic',
			pathIcon,
			err_mes,
		})};
		const is_src_pp = src.startsWith(this.pc.PATH_PRJ_BASE);
		const oBJ: T_BJ_cut_round = {
			order: {
				wp_src		: is_src_pp ?this.pc.src2pp(src) :src,
				is_src_pp,
				shape		: this.pc.ps.oWss['cnv.icon.shape'],
				wp_dest		: path,
				is_new_tmp	: this.pc.IS_NEW_TMP,
			},
			err: '',
		};
		await writeJson(this.#PATH_BJ_cut_round, oBJ, {encoding: 'utf8'});
		await this.pc.exeBatch('cut_round', '', exit_code=> {
			if (exit_code) {cmd2Vue(''); return}

			const oBJRes = <T_BJ_cut_round>readJsonSync(this.#PATH_BJ_cut_round, {encoding: 'utf8'});
			cmd2Vue(oBJRes.err);
		});
	}


	//MARK: PSD から立ち絵素材生成・素材最適化・暗号化
	async #onInitFacePsd(uri: Uri) {
		const {fsPath} = uri;
// console.log(`fn:WfbOptPic.ts onInitFacePsd fsPath:${fsPath}`);
		const hn = getFn(fsPath);
		if (this.chkUpdateByDiff(fsPath, `${this.pc.PATH_PRJ}face/face${hn}.sn`)) await this.#onCreChgFacePsd(uri, false);
	}
	//MARK: PSD 変更
	async #onCreChgFacePsd(uri: Uri, _cre=false) {
		const {fsPath} = uri;
// console.log(`fn:WfbOptPic.ts onCreChgFacePsd _cre:${String(_cre)} fsPath:${fsPath}`);
		await this.#batPsdFace.go(fsPath);


		// 画像ファイルを追加・更新時、退避に上書き移動して最適化
		if (this.pc.ps.oWss[PROC_ID_PIC]) await this.#bat.go('prj_scan');

		// 生成ファイルを暗号化
		const hn = getFn(fsPath);
		const aUri = await workspace.findFiles('doc/prj/*/[FN]_*.{jpg,jpeg,png,webp}'.replaceAll('[FN]', hn));

		// （aUri は画像素材だけなので）doc/prj/*/face[FN].sn をねじ込む
		const pathSn = aUri.at(0)?.path.replace(/[^/]+\.\w+$/, `face${hn}.sn`);
		if (pathSn && existsSync(pathSn)) aUri.push(Uri.file(pathSn));

		await Promise.allSettled(aUri.map(u=> this.pc.encIfNeeded(u)));
	}


	//MARK: 基本の変換画質変更
	async chgWebp_q_def(e: T_V2E_CHG_RANGE_WEBP_Q_DEF) {
		// 変化のたびに動作するので 'update.oWss' と統合してはいけない
		if (! this.pc.ps.oWss[PROC_ID_PIC]) return;

		this.pc.watchFile = false;

		await this.pc.wss.update('cnv.mat.webp_quality', this.pc.ps.oWss['cnv.mat.webp_quality'] = e.webp_q);

		await this.#bat.go('reconv');

		this.pc.watchFile = true;
	}

	//MARK: ファイル個別変換画質変更
	async chgWebp_q(o: T_V2E_CHG_RANGE_WEBP_Q) {
		if (! this.pc.ps.oWss[PROC_ID_PIC]) return;

		this.pc.watchFile = false;

		await this.#bat.chgBJ(async ()=> {
			const {oBJ} = this.#bat;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const fi = oBJ.hSize[o.nm]!;
			if (o.no_def) fi.webp_q = o.webp_q;
			else delete fi.webp_q;

			// Baseフォルダを渡す事で再変換
			await this.#onCreChg(Uri.file(this.pc.PATH_PRJ_BASE + fi.fld_nm +'.'+ fi.ext));
		});

		this.pc.watchFile = true;
	}

}
