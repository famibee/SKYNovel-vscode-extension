/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_E2V_NOTICE_COMPONENT, T_E2V_OPTPIC, T_BJ_OPTPIC} from '../types';
import {DEF_BJ_OPTPIC} from '../types';
import {chkUpdate, foldProc, getFn, replaceFile} from '../CmnLib';
import {FLD_PRJ_BASE} from '../PrjCmn';
import type {PrjCmn} from '../PrjCmn';

import {resolve, parse} from 'node:path';
import {window, ProgressLocation, type Progress, type CancellationToken} from 'vscode';
import {existsSync} from 'node:fs';
import {mkdirsSync, move, readJson, readJsonSync, remove, writeJson} from 'fs-extra/esm';


export const PROC_ID_PIC = 'cnv.mat.pic';

type T_modeInp
	= 'enable'
	| 'disable'
	| 'reconv'
	| 'prj_scan'
	| 'base_scan';


const REG_EXT_ORG	= /\.(jpe?g|png)$/;
// (jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)
const REG_EXT_HTML	= /\.(htm|html)$/;
const REG_REP_WEBPFLAG	= /\w+\/\*WEBP\*\//g;

const REG_REP_JSON_CNV	= /("image"\s*:\s*")([^.]+(?:\.\d+x\d+)?).*\.(jpe?g|png)"/;
const DEST_REP_JSON_CNV	= '$1$2.webp","image_bkup":"$2.$3"';
	// https://regex101.com/r/Vd8HQp/1	テスト用に /g をつけている

const REG_REP_JSON_RESTORE	= /webp","image_bkup":".+(jpe?g|png)"/;
const DEST_REP_JSON_RESTORE	= '$1"';
	// https://regex101.com/r/7dqoPZ/1	テスト用に /g をつけている


export class BatOptPic {
				oBJ	: T_BJ_OPTPIC;
	readonly	#PATH_BJ;

	constructor(private readonly pc: PrjCmn) {
		this.#PATH_BJ	= this.pc.PATH_WS +`/${this.pc.FLD_SRC}/batch/cnv_mat_pic.json`;

		(async ()=> {
			if (existsSync(this.#PATH_BJ)) {
				this.oBJ = <T_BJ_OPTPIC>await readJson(this.#PATH_BJ, {encoding: 'utf8'});
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (this.oBJ.order) return;	// v4.26.0 以前への対応
			}
			await writeJson(this.#PATH_BJ, this.oBJ = structuredClone(DEF_BJ_OPTPIC));
		})();
	}

	//MARK: バッチ処理
	async go(modeInp: T_modeInp) {
		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID_PIC, mode: 'wait'};
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
		return this.pc.ps.cmd2Vue(<T_E2V_OPTPIC>{
			cmd: 'update.optPic',
			oOptPic: <T_BJ_OPTPIC>{...this.oBJ, sum: {
				...this.oBJ.sum,
				pathPicOpt	: this.pc.ps.wvuWs +'/doc/prj/',
				pathPicBase	: this.pc.ps.wvuWs +`/${this.pc.FLD_SRC}/${FLD_PRJ_BASE}/`,
			}},
		});
	}

	//MARK: バッチログ更新
	async chgBJ(fnc = async ()=> { /* empty */ }) {
	// async chgBJ(fnc: (oBJ: T_BJ_OPTPIC)=> Promise<void>) {	// 不具合の元
		await fnc();
		await writeJson(this.#PATH_BJ, this.oBJ);
		await this.disp();
	}


	//MARK: 実処理
	async #proc(modeInp: T_modeInp, prg: Progress<{
		message?: string;
		increment?: number;
	}>, tknCancel: CancellationToken) {
		this.oBJ = {
			...structuredClone(DEF_BJ_OPTPIC),	// 必ずこれで
			// ...{...DEF_BJ_OPTPIC},			// x
			// ...DEF_BJ_OPTPIC,	// DEF_BJ_OPTPIC そのものがマージされる！？
			order: {
				quality		: this.pc.ps.oWss['cnv.mat.webp_quality'],
				FLD_PRJ_BASE: `${this.pc.FLD_SRC}/${FLD_PRJ_BASE}/`,
			},
		};

// console.log(`** start ** #cnv_mat_pic modeInp:${modeInp}`);
// console.log(`--  quality   =${String(this.oBJ.order.quality)}`);
// console.log(`--  curPrj    =${this.pc.PATH_PRJ}`);
// console.log(`--  curPrjBase=${this.pc.PATH_PRJ_BASE}`);


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
						if (REG_EXT_ORG.test(nm)) {
							aP.push(()=> this.#cnv(url, resolve(wdBase, nm)));
							return;
						}

						// htm置換（true/*WEBP*/）
						if (REG_EXT_HTML.test(nm)) {
							aP.push(()=> Promise.try(()=> {replaceFile(
								url,
								REG_REP_WEBPFLAG,
								'true/*WEBP*/',
								false,
							)}));
							return;
						}

						// json置換（アニメpng）
						if (nm.endsWith('.json')) aP.push(()=> Promise.try(()=> {replaceFile(
							url,
							REG_REP_JSON_CNV,
							DEST_REP_JSON_CNV,
						)}));
					}, ()=> { /* empty */ });
				});
				break;

			case 'disable':		// 変換無効化
				foldProc(this.pc.PATH_PRJ_BASE, ()=> { /* empty */ }, dir=> {
					foldProc(resolve(this.pc.PATH_PRJ_BASE, dir), (url, nm)=> {
						if (! REG_EXT_ORG.test(nm)) return;

						// 対応する素材ファイルが無い場合、削除しないように
						const urlPrj = resolve(this.pc.PATH_PRJ, dir, nm);
						aP.push(()=> move(url, urlPrj, {overwrite: true}));
						const {name} = parse(nm);
						const delDest = resolve(this.pc.PATH_PRJ, dir, name +'.webp');
						aP.push(()=> remove(delDest));
					}, ()=> { /* empty */ });
				});

				foldProc(this.pc.PATH_PRJ, ()=> { /* empty */ }, dir=> {
					foldProc(resolve(this.pc.PATH_PRJ, dir), (url, nm)=> {
						// htm置換・(true/*WEBP*/)
						if (REG_EXT_HTML.test(nm)) {
							REG_REP_WEBPFLAG.lastIndex = 0;	// /gなので必要
							aP.push(()=> Promise.try(()=> {replaceFile(
								url,
								REG_REP_WEBPFLAG,
								'false/*WEBP*/',
								false,
							)}));
							return;
						}

						// json置換（アニメpng）
						if (nm.endsWith('.json')) aP.push(()=> Promise.try(()=> {replaceFile(
							url,
							REG_REP_JSON_RESTORE,
							DEST_REP_JSON_RESTORE,
						)}));
					}, ()=> { /* empty */ });
				});
				break;

			case 'reconv':		// 再変換
				// 現状、UI的に「常にエンコーダー同一・パラメータ変更」なので、上書き全変換でよい
				this.#log_enter(this.pc.PATH_PRJ, this.pc.PATH_PRJ_BASE);
				this.oBJ.sum.baseSize = 
				this.oBJ.sum.webpSize = 0;

				for (const {ext, fld_nm} of Object.values(this.oBJ.hSize)) {
					aP.push(()=> this.#cnv(
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
							const size = this.oBJ.hSize[name];
							if (size) {
								const {baseSize=0, webpSize=0} = size;
								this.oBJ.sum.baseSize -= baseSize;
								this.oBJ.sum.webpSize -= webpSize;
							}

							// 変換
							aP.push(()=> this.#cnv(url, resolve(wdBase, nm)));
							return;
						}

						// htm置換（true/*WEBP*/）
						if (REG_EXT_HTML.test(nm)) {
							aP.push(async ()=> Promise.try(()=> {replaceFile(
								url,
								REG_REP_WEBPFLAG,
								'true/*WEBP*/',
								false,
							)}));
							return;
						}

						// json置換（アニメpng）
						if (nm.endsWith('.json')) aP.push(()=> Promise.try(()=> {replaceFile(
							url,
							REG_REP_JSON_CNV,
							DEST_REP_JSON_CNV,
						)}));
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
						const size = this.oBJ.hSize[name];
						if (size) {
							const {baseSize=0, webpSize=0} = size;
							this.oBJ.sum.baseSize -= baseSize;
							this.oBJ.sum.webpSize -= webpSize;
						}

						aP.push(()=> this.#cnv(toPath, url, false));
					}, ()=> { /* empty */ });
				});
				break;

			default:	console.error('fn:BatOptPic.ts line:288 ERR');
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
		.catch((e: unknown)=> console.log(`fn:BatOptPic.ts ${String(e)}`));


		// finish
		// eslint-disable-next-line @typescript-eslint/require-await
		await this.chgBJ(async ()=> {
		// await this.chgLog(async oBJ=> {	// 不具合の元
			const oBJ = this.oBJ;
			oBJ.aOrder
			.sort((k1, k2)=> {
				const n1 = k1.pathBase.toUpperCase();
				const n2 = k2.pathBase.toUpperCase();
				if (n1 < n2) return -1;
				if (n1 > n2) return 1;
				return 0;
			});

			const a = Object.entries(oBJ.hSize)
			.sort(([k1], [k2])=> {
				const n1 = k1.toUpperCase();
				const n2 = k2.toUpperCase();
				if (n1 < n2) return -1;
				if (n1 > n2) return 1;
				return 0;
			});
			oBJ.hSize = Object.fromEntries(a);
		});

		if (this.oBJ.aOrder.length > 0) await this.pc.exeBatch(
			'cnv_mat_pic', '', exit_code=> {
			if (exit_code) return;

			this.oBJ = <T_BJ_OPTPIC>readJsonSync(this.#PATH_BJ, {encoding: 'utf8'});
			void this.disp();

			switch (modeInp) {
				case 'enable':		// 変換有効化
				case 'disable':		// 変換無効化
				case 'reconv':		// 再変換
				void this.pc.updPathJson();	break;
			}
		});

		prg.report({message: '完了'});
	}
	//MARK: コア変換処理
	async #cnv(pathPrj: string, pathBase: string, do_move = true) {
		if (do_move) await move(pathPrj, pathBase, {overwrite: true});

		this.oBJ.aOrder.push({
			pathPrj	: this.pc.fp2pp(pathPrj),
			pathBase: this.pc.src2pp(pathBase),
		})
	}


	//MARK: 
	#log_enter(curPrj: string, curPrjBase: string) {
		const o = this.oBJ;
		for (const [fn, of] of Object.entries(this.oBJ.hSize)) {
			const {fld_nm, ext, baseSize, webpSize} = of;
			const pp = fld_nm + '.'+ ext;
			if (existsSync(resolve(curPrj, pp))
			|| existsSync(resolve(curPrjBase, pp))) o.hSize[fn] = of;
			else {
				o.sum.baseSize -= baseSize;
				o.sum.webpSize -= webpSize;
			}
		}
		this.oBJ = o;
	}


	//MARK: リソース削除
	async delRes(path: string) {
		const fn = getFn(path);
		if (! (fn in this.oBJ.hSize)) return;

		const s = this.oBJ.hSize[fn];
		if (! s) return;

		const {baseSize, webpSize} = s;
		this.oBJ.sum.baseSize -= baseSize;
		this.oBJ.sum.webpSize -= webpSize;
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete this.oBJ.hSize[fn];

		await this.disp();

		await writeJson(this.#PATH_BJ, this.oBJ, {encoding: 'utf8'});
	}

}
