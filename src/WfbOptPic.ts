/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {getFn, v2fp} from './CmnLib';
import {FLD_PRJ_BASE, type T_CN} from './Project';
import {WatchFile2Batch} from './WatchFile2Batch';
import type {T_CMD, T_E2V, T_E2V_CHG_RANGE_WEBP_Q, T_E2V_CHG_RANGE_WEBP_Q_DEF, T_E2V_NOTICE_COMPONENT, T_E2V_OPTPIC, T_OPTPIC, T_WSS} from '../views/types';
import {DEF_OPTPIC} from '../views/types';

import {type ExtensionContext, RelativePattern, Uri, type WorkspaceFolder} from 'vscode';
import {existsSync, readJson, remove, writeJson} from 'fs-extra';

const PROC_ID = 'cnv.mat.pic';


export class WfbOptPic extends WatchFile2Batch {
	readonly	#PATH_OPT_PIC;

	//MARK: コンストラクタ
	constructor(
		ctx: ExtensionContext,
		wsFld: WorkspaceFolder, 
		oWss: ()=> T_WSS,
		cmd2Vue: (mes: T_E2V)=> void,
		exeTask: (nm: T_CMD, arg: string)=> Promise<number>,
		updPathJson: ()=> void,
		encIfNeeded: (uri: Uri)=> void,
		path2cn: (fp: string)=> T_CN,
		FLD_SRC: string,
		wvuWs: ()=> Uri,
		onSettingEvt: (nm: string, val: string)=> Promise<boolean>,
		chkWVFolder: (uri: Uri)=> void,
	) {
		super(
			ctx,
			wsFld,
			oWss,
			cmd2Vue,
			exeTask,
			updPathJson,
			encIfNeeded,
			path2cn,
			FLD_SRC,
			wvuWs,
			onSettingEvt,
			chkWVFolder,
		);
		this.#PATH_OPT_PIC = this.PATH_WS +`/${FLD_SRC}/batch/cnv_mat_pic.json`;
	}

	//MARK: 初期化
	async init() {
		const onCreChgOptPic = async (uri: Uri, _cre=false)=> {
			if (! this.#watchFile) return;

// console.log(`fn:OptPic.ts crechg uri:${uri.path} cre:${_cre}`);
			this.chkWVFolder(uri);
			await this.#onCreChgOptPic(uri);		// 更新音声の自動変換
			this.updPathJson();
		};
		await this.watchFld(
			new RelativePattern(this.wsFld, `doc/prj/*/*.{jpg,jpeg,png}`),
			`doc/prj/*/[FN].webp`, async uri=> {
				if (! this.oWss()[PROC_ID]) return;

// console.log(`fn:OptPic.ts [prj {jpg,jpeg,png}] init cnvPic uri:${uri.path}`);
				this.encIfNeeded(uri);
			}, onCreChgOptPic, async uri=> {
// console.log(`fn:OptPic.ts [prj {jpg,jpeg,png}] del cnvPic:${this.oWss()[PROC_ID]} watchFile:${this.#watchFile} uri:${uri.path}`);
					if (! this.oWss()[PROC_ID]) {
					const {pathCn} = this.path2cn(uri.path);
					if (pathCn) await remove(pathCn);
				}
				if (! this.#watchFile) return;

				this.chkWVFolder(uri);
				await this.#onDelOptPic(uri);
				this.updPathJson();
			}
		);
		await this.watchFld(
			new RelativePattern(this.wsFld, `${this.FLD_SRC}/${FLD_PRJ_BASE}}/*/*.{jpg,jpeg,png}`),
			`doc/prj/*/[FN].webp`, undefined, onCreChgOptPic, undefined
		);

		if (existsSync(this.#PATH_OPT_PIC)) this.#oOptPic = await readJson(this.#PATH_OPT_PIC, {encoding: 'utf8'});
		else await writeJson(this.#PATH_OPT_PIC, this.#oOptPic = DEF_OPTPIC);

		this.#watchFile = true;
	}
		#watchFile = false;
		set watchFile(v: boolean) {this.#watchFile = v}

	//MARK: #on音声追加・更新
	#oOptPic	: T_OPTPIC;
	async #onCreChgOptPic({path}: Uri) {
		path = v2fp(path);
		if (this.#REG_EXT_PIC_REST.test(path)) return;

		// this.#watchFile = false;	// cnv_mat_pic() exeTask() でやる
		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		this.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		// mp3・wavファイルを追加・更新時、退避に上書き移動して aac化
		const isBase = this.#isBaseUrl(path);
		await this.#cnv_mat_pic(isBase ?'base_scan' :'prj_scan');

		this.#oOptPic = await readJson(this.#PATH_OPT_PIC, {encoding: 'utf8'});
		this.dispOptPic();

		o.mode = 'comp';
		this.cmd2Vue(o);
		// this.#watchFile = true;	// cnv_mat_pic() exeTask() でやる
	}
	//MARK: #on音声削除
	async #onDelOptPic({path}: Uri) {
		if (! this.oWss()[PROC_ID]) return;

		this.#watchFile = false;	// バッチ処理自身が発端を再度引き起こすので
		path = v2fp(path);
		const isBase = this.#isBaseUrl(path);
		if (! isBase) {		// 変換後ファイルを消したら退避ファイルも削除
			const path2 = path.replace(this.PATH_PRJ, this.PATH_PRJ_BASE);
			for await (const ext of ['jpeg','jpg','png']) {
				remove(path2.replace(/webp$/, ext));
			}
			this.#watchFile = true;
			return;
		}

		// 退避ファイルを消したら変換後ファイルも削除
		await remove(
			path.replace(this.PATH_PRJ_BASE, this.PATH_PRJ)
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
		this.#watchFile = true;
	}
		readonly	#REG_EXT_PIC_REST	= /\.(m4a|aac|ogg)$/;
		readonly	#REG_EXT_PIC_CNV	= /\.(mp3|wav)$/;
		// prj（変換後フォルダ）下の削除か prj_base（退避素材ファイル）か判定
		#isBaseUrl(url :string) {return url.slice(0, this.LEN_PATH_PRJ_BASE) === this.PATH_PRJ_BASE;}

	//MARK: 音声情報表示更新
	dispOptPic() {
		this.cmd2Vue(<T_E2V_OPTPIC>{
			cmd: 'update.optPic',
			oOptPic: <T_OPTPIC>{...this.#oOptPic, sum: {
				...this.#oOptPic.sum,
				pathPicOpt	: this.wvuWs +'/doc/prj/',
				pathPicBase	: this.wvuWs +`/${this.FLD_SRC}/${FLD_PRJ_BASE}/`,
			}},
		});
	}
	//MARK: 音声情報出力・表示更新
	async updOptPic() {
		this.#oOptPic = await readJson(this.#PATH_OPT_PIC, {encoding: 'utf8'});
		this.dispOptPic();
	}
	async optPic(uri: Uri, sEvt: 'CRE'|'CHG'|'DEL') {
		this.chkWVFolder(uri);
		if (sEvt === 'DEL') await this.#onDelOptPic(uri);
		else 				await this.#onCreChgOptPic(uri);
		this.updPathJson();
	}

	//MARK: 
	async chgWebp_q_def(m: any) {
		// 変化のたびに動作するので 'update.oWss' と統合してはいけない
		if (! this.oWss()[PROC_ID]) return;

		this.#watchFile = false;	// バッチ処理自身が発端を再度引き起こすので

		const e: T_E2V_CHG_RANGE_WEBP_Q_DEF = m;
		await this.wss.update('cnv.mat.webp_quality', this.oWss()['cnv.mat.webp_quality'] = e.webp_q);

		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		this.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		await this.onSettingEvt('cnv.mat.webp_quality', '');	// 疑似イベント発生
		this.#oOptPic = await readJson(this.#PATH_OPT_PIC, {encoding: 'utf8'});
		this.dispOptPic();

		o.mode = 'comp';
		this.cmd2Vue(o);
		this.#watchFile = true;
	}

	//MARK: ……ファイル単体
	async chgWebp_q(m: any) {
		if (! this.oWss()[PROC_ID]) return;

		this.#watchFile = false;
		const o: T_E2V_CHG_RANGE_WEBP_Q = m;
		const fi = this.#oOptPic.hSize[o.nm]!;
		if (o.no_def) fi.webp_q = o.webp_q;
		else delete fi.webp_q;
		await writeJson(this.#PATH_OPT_PIC, this.#oOptPic);

		// Baseフォルダを渡す事で再変換
		await this.#onCreChgOptPic(Uri.file(this.PATH_PRJ_BASE + fi.fld_nm +'.'+ fi.ext));
		// this.dispOptPic();	// 中でやる
		// this.#watchFile = true;	// 中でやる
	}


	//MARK: 変換有効化
	async enable() {
		await this.#cnv_mat_pic('enable');
		this.updPathJson();
	}

	//MARK: 変換無効化
	async disable() {
		await this.#cnv_mat_pic('disable');
		this.updPathJson();
	}

	//MARK: 再変換
	async reconv() {
		if (! this.oWss()[PROC_ID]) return;

		await this.#cnv_mat_pic('reconv');
		// this.updPathJson();	// 現状、別拡張子に変わらないので不要
	}
		readonly	#cnv_mat_pic = (modeInp: string)=> this.exeTask(
			'cnv_mat_pic',
			`${modeInp} ${this.oWss()['cnv.mat.webp_quality']
			} "${this.PATH_PRJ}" "${this.PATH_PRJ_BASE}"`,
		);

}
