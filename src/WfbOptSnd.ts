/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {getFn, v2fp} from './CmnLib';
import {FLD_PRJ_BASE, type T_CN} from './Project';
import {WatchFile2Batch} from './WatchFile2Batch';
import type {T_CMD, T_E2V, T_E2V_NOTICE_COMPONENT, T_E2V_OPTSND, T_OPTSND, T_WSS} from '../views/types';
import {DEF_OPTSND} from '../views/types';

import {type ExtensionContext, RelativePattern, Uri, type WorkspaceFolder} from 'vscode';
import {existsSync, readJson, remove, writeJson} from 'fs-extra';

const PROC_ID = 'cnv.mat.snd';


export class WfbOptSnd extends WatchFile2Batch {
	readonly	#PATH_OPT_SND;

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
		this.#PATH_OPT_SND = this.PATH_WS +`/${FLD_SRC}/batch/cnv_mat_snd.json`;
	}

	//MARK: 初期化
	async init() {
		const onCreChgOptSnd = async (uri: Uri, _cre=false)=> {
			if (! this.#watchFile) return;

// console.log(`fn:OptSnd.ts crechg uri:${uri.path} cre:${_cre}`);
			this.chkWVFolder(uri);
			await this.#onCreChgOptSnd(uri);		// 更新音声の自動変換
			this.updPathJson();
		};
		await this.watchFld(
			new RelativePattern(this.wsFld, `doc/prj/*/*.{mp3,wav}`),
			`doc/prj/*/[FN].{m4a,aac,ogg}`, async uri=> {
				if (! this.oWss()[PROC_ID]) return;

// console.log(`fn:OptSnd.ts [prj {mp3,wav}] init cnvSnd uri:${uri.path}`);
				this.encIfNeeded(uri);
			}, onCreChgOptSnd, async uri=> {
// console.log(`fn:OptSnd.ts [prj {mp3,wav}] del cnvSnd:${this.oWss()[PROC_ID]} watchFile:${this.#watchFile} uri:${uri.path}`);
					if (! this.oWss()[PROC_ID]) {
					const {pathCn} = this.path2cn(uri.path);
					if (pathCn) await remove(pathCn);
				}
				if (! this.#watchFile) return;

				this.chkWVFolder(uri);
				await this.#onDelOptSnd(uri);
				this.updPathJson();
			}
		);
		await this.watchFld(
			new RelativePattern(this.wsFld, `${this.FLD_SRC}/${FLD_PRJ_BASE}}/*/*.{mp3,wav}`),
			`doc/prj/*/[FN].{m4a,aac,ogg}`, undefined, onCreChgOptSnd, undefined
		);

		if (existsSync(this.#PATH_OPT_SND)) this.#oOptSnd = await readJson(this.#PATH_OPT_SND, {encoding: 'utf8'});
		else await writeJson(this.#PATH_OPT_SND, this.#oOptSnd = DEF_OPTSND);

		this.#watchFile = true;
	}
		#watchFile = false;
		set watchFile(v: boolean) {this.#watchFile = v}

	//MARK: #on音声追加・更新
	#oOptSnd	: T_OPTSND;
	async #onCreChgOptSnd({path}: Uri) {
		path = v2fp(path);
		if (this.#REG_EXT_SND_REST.test(path)) return;

		// this.#watchFile = false;	// cnv_mat_snd() exeTask() でやる
		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		this.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		// mp3・wavファイルを追加・更新時、退避に上書き移動して aac化
		const isBase = this.#isBaseUrl(path);
		await this.#cnv_mat_snd(isBase ?'base_scan' :'prj_scan');

		this.#oOptSnd = await readJson(this.#PATH_OPT_SND, {encoding: 'utf8'});
		this.dispOptSnd();

		o.mode = 'comp';
		this.cmd2Vue(o);
		// this.#watchFile = true;	// cnv_mat_snd() exeTask() でやる
	}
	//MARK: #on音声削除
	async #onDelOptSnd({path}: Uri) {
		if (! this.oWss()[PROC_ID]) return;

		this.#watchFile = false;	// バッチ処理自身が発端を再度引き起こすので
		path = v2fp(path);
		const isBase = this.#isBaseUrl(path);
		if (! isBase) {		// 変換後ファイルを消したら退避ファイルも削除
			const path2 = path.replace(this.PATH_PRJ, this.PATH_PRJ_BASE);
			for await (const ext of ['mp3','wav']) {
				remove(path2.replace(/(m4a|aac|ogg)$/, ext));
			}
			this.#watchFile = true;
			return;
		}

		// 退避ファイルを消したら変換後  aac... も削除
		for await (const ext of ['m4a','aac','ogg']) remove(
			path.replace(this.PATH_PRJ_BASE, this.PATH_PRJ)
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
		this.#watchFile = true;
	}
		readonly	#REG_EXT_SND_REST	= /\.(m4a|aac|ogg)$/;
		readonly	#REG_EXT_SND_CNV	= /\.(mp3|wav)$/;
		// prj（変換後フォルダ）下の削除か prj_base（退避素材ファイル）か判定
		#isBaseUrl(url :string) {return url.slice(0, this.LEN_PATH_PRJ_BASE) === this.PATH_PRJ_BASE;}

	//MARK: 音声情報表示更新
	dispOptSnd() {
		this.cmd2Vue(<T_E2V_OPTSND>{
			cmd: 'update.optSnd',
			oOptSnd: <T_OPTSND>{...this.#oOptSnd, sum: {
				...this.#oOptSnd.sum,
				pathSndOpt	: this.wvuWs +'/doc/prj/',
				pathSndBase	: this.wvuWs +`/${this.FLD_SRC}/${FLD_PRJ_BASE}/`,
			}},
		});
	}
	//MARK: 音声情報出力・表示更新
	async updOptSnd() {
		this.#oOptSnd = await readJson(this.#PATH_OPT_SND, {encoding: 'utf8'});
		this.dispOptSnd();
	}


	//MARK: 変換有効化
	async enable() {
		await this.#cnv_mat_snd('enable');
		this.updPathJson();
	}

	//MARK: 変換無効化
	async disable() {
		await this.#cnv_mat_snd('disable');
		this.updPathJson();
	}

	//MARK: 再変換
	async reconv() {
		if (! this.oWss()[PROC_ID]) return;

		await this.#cnv_mat_snd('reconv');
		this.updPathJson();
	}
		readonly	#cnv_mat_snd = (modeInp: string)=> this.exeTask(
			'cnv_mat_snd',
			`${modeInp} '{"codec":"${this.oWss()['cnv.mat.snd.codec']
			}"}' "${this.PATH_PRJ}" "${this.PATH_PRJ_BASE}"`,
		);

}
