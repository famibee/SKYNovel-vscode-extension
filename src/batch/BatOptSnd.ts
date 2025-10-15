/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_E2V_NOTICE_COMPONENT, T_E2V_OPTSND, T_OPTSND, T_OPTSND_FILE} from '../types';
import {DEF_OPTSND} from '../types';
import {chkUpdate, foldProc, getFn} from '../CmnLib';
import {type PrjCmn, FLD_PRJ_BASE} from '../PrjCmn';

import ffmpeg from 'fluent-ffmpeg';

import {resolve, parse, basename} from 'node:path';
import {existsSync, statSync} from 'node:fs';
import {mkdirsSync, move, moveSync, readJson, remove, writeJson} from 'fs-extra/esm';
import {window, ProgressLocation, type Progress, type CancellationToken} from 'vscode';


export const PROC_ID_SND = 'cnv.mat.snd';

type T_modeInp
	= 'enable'
	| 'disable'
	| 'reconv'
	| 'prj_scan'
	| 'base_scan';


const REG_EXT_ORG	= /\.(mp3|wav)$/;	// (mp3|opus|m4a|ogg|aac|flac|wav)


export class BatOptSnd {
				#oBJ	: T_OPTSND;
	readonly	#PATH_BJ;

	constructor(private readonly pc: PrjCmn) {
		this.#PATH_BJ = this.pc.PATH_WS +`/${this.pc.FLD_SRC}/batch/cnv_mat_snd.json`;

		(async ()=> {
			if (existsSync(this.#PATH_BJ)) this.#oBJ = <T_OPTSND>await readJson(this.#PATH_BJ, {encoding: 'utf8'});
			else await writeJson(this.#PATH_BJ, this.#oBJ = DEF_OPTSND);
		})();
	}

	//MARK: バッチ処理
	async go(modeInp: T_modeInp) {
		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID_SND, mode: 'wait'};
		await this.pc.ps.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		const oWp = {
			location	: ProgressLocation.Notification,
			title		: '画像最適化処理',
			cancellable	: true,
		};
		switch (modeInp) {
			case 'enable':		oWp.title = '変換有効化';	break;
			case 'disable':		oWp.title = '変換無効化';	break;
			case 'reconv':		oWp.title = '再変換';	break;
			case 'prj_scan':	oWp.title = 'prjフォルダ走査';	break;
			case 'base_scan':	oWp.title = 'baseフォルダ走査';	break;
		}
		await window.withProgress(oWp, (prg, tknCancel)=> this.#proc(modeInp, prg, tknCancel));

		o.mode = 'comp';
		await this.pc.ps.cmd2Vue(o);
	}

	//MARK: 情報出力・表示更新
	disp() {
		return this.pc.ps.cmd2Vue(<T_E2V_OPTSND>{
			cmd: 'update.optSnd',
			oOptSnd: {...this.#oBJ, sum: {
				...this.#oBJ.sum,
				pathSndOpt	: this.pc.ps.wvuWs +'/doc/prj/',
				pathSndBase	: this.pc.ps.wvuWs +`/${this.pc.FLD_SRC}/${FLD_PRJ_BASE}/`,
			}},
		});
	}

	//MARK: ログ更新
	async #chgBJ(fnc = async ()=> { /* empty */ }) {
		await fnc();
		await writeJson(this.#PATH_BJ, this.#oBJ);
		await this.disp();
	}


	//MARK: 実処理
	async #proc(modeInp: T_modeInp, prg: Progress<{
		message?: string;
		increment?: number;
	}>, tknCancel: CancellationToken) {
		const codec = this.pc.ps.oWss['cnv.mat.snd.codec'];
// console.log(`** start ** #cnv_mat_snd modeInp:${modeInp}`);
// console.log(`--  codec     =${codec}`);
// console.log(`--  curPrj    =${this.#PATH_PRJ}`);
// console.log(`--  curPrjBase=${this.#PATH_PRJ_BASE}`);

		const extCnv = '.'+ codec;
		const extOut = '.'+ (codec === 'opus' ?'m4a' :codec);

		this.#oBJ = {
			sum		: {
				baseSize	: 0,
				optSize		: 0,
				pathSndOpt	: '',
				pathSndBase	: '',
			},
			hSize	: {},
		};


		// 実処理
		prg.report({message: '処理ファイル調査中'});
		const aP: (()=> Promise<void>)[] = [];
		switch (modeInp) {
			case 'enable':		// 変換有効化
				mkdirsSync(this.pc.PATH_PRJ_BASE);
				foldProc(this.pc.PATH_PRJ, ()=> { /* empty */ }, dir=> {
					const wdBase = resolve(this.pc.PATH_PRJ_BASE, dir);
					mkdirsSync(wdBase);
					foldProc(resolve(this.pc.PATH_PRJ, dir), (url, nm)=> {
						// 退避素材フォルダに元素材を移動
						if (! REG_EXT_ORG.test(nm)) return;

						aP.push(()=> this.#cnv(extCnv, extOut, url, resolve(wdBase, nm)));
					}, ()=> { /* empty */ });
				});
				break;

			case 'disable':		// 変換無効化
				foldProc(this.pc.PATH_PRJ_BASE, ()=> { /* empty */ }, dir=> {
					foldProc(resolve(this.pc.PATH_PRJ_BASE, dir), (url, nm)=> {
						if (! REG_EXT_ORG.test(nm)) return;

						// 対応する素材ファイルが無い場合、削除しないように
						const urlPrj = resolve(this.pc.PATH_PRJ, dir, nm);
						aP.push(async ()=> move(url, urlPrj, {overwrite: true}));
						const delDest = urlPrj.slice(0, -3);
						for (const ext of ['m4a','aac','ogg']) aP.push(()=> remove(delDest + ext));
					}, ()=> { /* empty */ });
				});
				break;

			case 'reconv':		// 再変換
				// 現状、UI的に「常にエンコーダー同一・パラメータ変更」なので、上書き全変換でよい
				this.#log_enter(this.pc.PATH_PRJ, this.pc.PATH_PRJ_BASE);
				this.#oBJ.sum.baseSize = 
				this.#oBJ.sum.optSize = 0;

				for (const {ext, fld_nm} of Object.values(this.#oBJ.hSize)) {
					aP.push(()=> this.#cnv(
				 		extCnv, extOut,
						resolve(this.pc.PATH_PRJ, fld_nm + '.'+ ext),
						resolve(this.pc.PATH_PRJ_BASE, fld_nm + '.'+ ext),
						false,
					));
				}
				break;

			case 'prj_scan':	// prjフォルダ走査
				this.#log_enter(this.pc.PATH_PRJ, this.pc.PATH_PRJ_BASE);

				mkdirsSync(this.pc.PATH_PRJ_BASE);
				foldProc(this.pc.PATH_PRJ, ()=> { /* empty */ }, dir=> {
					const wdBase = resolve(this.pc.PATH_PRJ_BASE, dir);
					mkdirsSync(wdBase);
					foldProc(resolve(this.pc.PATH_PRJ, dir), (url, nm)=> {
						// 退避素材フォルダに元素材を移動
						if (REG_EXT_ORG.test(nm)) {
							// ログにあるならいったん合計値から過去サイズを差し引く（log_enter() とセット）
							const {name} = parse(nm);
							const size = this.#oBJ.hSize[name];
							if (size) {
								const {baseSize=0, optSize=0} = size;
								this.#oBJ.sum.baseSize -= baseSize;
								this.#oBJ.sum.optSize -= optSize;
							}

							// 変換
							aP.push(()=> this.#cnv(extCnv, extOut, url, resolve(wdBase, nm)));
						}
					}, ()=> { /* empty */ });
				});
				break;

			case 'base_scan':	// baseフォルダ走査
				this.#log_enter(this.pc.PATH_PRJ, this.pc.PATH_PRJ_BASE);

				foldProc(this.pc.PATH_PRJ_BASE, ()=> { /* empty */ }, dir=> {
					const wdBase = resolve(this.pc.PATH_PRJ_BASE, dir);
					mkdirsSync(wdBase);
					const wdPrj = resolve(this.pc.PATH_PRJ, dir);
					foldProc(wdBase, (url, nm)=> {
						if (! REG_EXT_ORG.test(url)) return;

						const toPath = resolve(wdPrj, nm.replace(REG_EXT_ORG, '.webp'));
						if (! chkUpdate(url, toPath)) return;

						// ログにあるならいったん合計値から過去サイズを差し引く（log_enter() とセット）
						const {name} = parse(nm);
						const size = this.#oBJ.hSize[name];
						if (size) {
							const {baseSize=0, optSize=0} = size;
							this.#oBJ.sum.baseSize -= baseSize;
							this.#oBJ.sum.optSize -= optSize;
						}

						aP.push(()=> this.#cnv(extCnv, extOut, toPath, url, false));
					}, ()=> { /* empty */ });
				});
				break;

			default:	console.error('fn:BatOptSnd.ts line:216 ');
		}


		let start_cnt = 0;
		const cnt = ()=> prg.report({
			increment: ++start_cnt /aP.length *100,
			message: `処理中 ${String(start_cnt)}/${String(aP.length)} tasks`,
		});

		await Promise.allSettled(aP.map(v=> (async ()=> {
			if (tknCancel.isCancellationRequested) return;
			await v();
			cnt();
		})()))
		.catch((e: unknown)=> console.log(`fn:BatOptSnd.ts ${String(e)}`));


		// finish
		// eslint-disable-next-line @typescript-eslint/require-await
		await this.#chgBJ(async ()=> {
			const a = Object.entries(this.#oBJ.hSize)
			.sort(([k1], [k2])=> {
				const n1 = k1.toUpperCase();
				const n2 = k2.toUpperCase();
				if (n1 < n2) return -1;
				if (n1 > n2) return 1;
				return 0;
			});
			this.#oBJ.hSize = Object.fromEntries(a);
		});

		switch (modeInp) {
			case 'enable':		// 変換有効化
			case 'disable':		// 変換無効化
			case 'reconv':		// 再変換
			void this.pc.updPathJson();	break;
		}

		prg.report({message: '完了'});
	}


	//MARK: 
	#log_enter(curPrj: string, curPrjBase: string) {
		const o = this.#oBJ;
		for (const [fn, of] of Object.entries(this.#oBJ.hSize)) {
			const {fld_nm, ext, baseSize, optSize} = of;
			const pp = fld_nm + '.'+ ext;
			if (existsSync(resolve(curPrj, pp))
			|| existsSync(resolve(curPrjBase, pp))) o.hSize[fn] = of;
			else {
				o.sum.baseSize -= baseSize;
				o.sum.optSize -= optSize;
			}
		}
		this.#oBJ = o;
	}


	/**
	 * 
	 * @param {string} pathPrj	退避元パス (jpe?g|png)
	 * @param {string} pathBase	退避先パス (jpe?g|png)
	 * @param {boolean} do_move	退避moveするか
	 * @returns {void} 返り値
	 */
	//MARK: コア変換処理
	async #cnv(extCnv: string, extOut: string, pathInp: string, pathBase: string, do_move = true): Promise<void> {
		const {dir, name} = parse(pathInp);
		if (do_move) await move(pathInp, pathBase, {overwrite: true});
		else await Promise.allSettled(
			['m4a','aac','ogg']
			.map(ext=> remove(dir +'/'+ name +'.'+ ext))
		);

		// 退避素材フォルダから元々フォルダに最適化中間ファイル生成
		const {dir: dirBase, ext} = parse(pathBase);
		const pathWk = dirBase +'/'+ name + extCnv;
		const fi = this.#oBJ.hSize[name] ??= {fld_nm: basename(dir) +'/'+ name, baseSize: 0, optSize: 0, ext: '',};

		await new Promise<void>(re=> ffmpeg(pathBase)
		.save(pathWk)	// 一度作業中ファイルは退避先に作る
	//	.on('start', (cl: any)=> console.log(`@@ ${cl} @@`))
		.on('error', (e: unknown)=> console.error(e))
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		.on('end', (_stdout: any, _stderr: any)=> {
			const baseSize = statSync(pathBase).size;
			const optSize = statSync(pathWk).size;
			this.#oBJ.hSize[name] = {...fi, baseSize, optSize, ext: <T_OPTSND_FILE['ext']>ext.slice(1),};
			// this.#oBJ.hSize[name] = {...fi, baseSize, optSize, ext: <any>ext.slice(1),};
			this.#oBJ.sum.baseSize += baseSize;
			this.#oBJ.sum.optSize += optSize;

			moveSync(pathWk, dir +'/'+ name + extOut, {overwrite: true});
			re();
		}));
	}


	//MARK: リソース削除
	async delRes(path: string) {
		const fn = getFn(path);
		if (! (fn in this.#oBJ.hSize)) return;

		const s = this.#oBJ.hSize[fn];
		if (! s) return;

		const {baseSize, optSize} = s;
		this.#oBJ.sum.baseSize -= baseSize;
		this.#oBJ.sum.optSize -= optSize;
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete this.#oBJ.hSize[fn];

		await this.#chgBJ();
	}

}
