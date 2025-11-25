/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_E2V_TEMP, T_TEMP, T_V2E_aTemp} from '../types';
import {REG_SN2TEMP} from '../types';
import {replaceRegsFile} from '../CmnLib';
import type {T_reqPrj2LSP} from '../Project';
import type {PrjCmn} from '../PrjCmn';
import {WatchFile} from './WatchFile';
import type {T_PP2SNSTR} from '../../server/src/LspWs';
import type {Config} from '../Config';

import {workspace} from 'vscode';
import {readFileSync} from 'fs-extra';


export class WfbSettingSn extends WatchFile {
	//MARK: コンストラクタ
	constructor(
							pc			: PrjCmn,
		private readonly	reqPrj2LSP	: T_reqPrj2LSP,
		private readonly	cfg			: Config,
	) {super(pc)}

	//MARK: 初期化
	async init() {
		// 設定スクリプトの更新
		await this.watchFld(
			'doc/prj/*/setting.sn', '',
			async ({path})=> Promise.try(()=> {
				this.#fnSetting = path;	// 存在しない場合も
				this.chkMultiMatch = ()=> this.#chkMultiMatch_proc();
				this.chkMultiMatch();
				this.update = e=> this.#update_proc(e);
			}),
			async (_uri, cre)=> Promise.try(()=> {
				if (cre) this.chkMultiMatch();
				// else this.onChgSettingSn(uri);	// ここでやると変更が戻るループ
			}), async ()=> Promise.resolve(true),
		);

		workspace.onDidSaveTextDocument(e=> {
			if (e.fileName.endsWith('/setting.sn')) this.chkMultiMatch();
		}, null, this.pc.ctx.subscriptions);
	}


	#preventUpdHowl = true;	// 更新ハウリングを防ぐ
		// ついでに初回の不要な 'update.aTemp' を止めるため true 始まりで

	//MARK: 重複チェック
	chkMultiMatch = ()=> { /* empty */ };
	#chkMultiMatch_proc() {
		this.#preventUpdHowl = true;

		const aTemp	: T_TEMP[]	= [];

		const src = readFileSync(this.#fnSetting, {encoding: 'utf8'});
		for (const [full, nm1, nm2, val='', sep='', lbl_json=''] of src.matchAll(REG_SN2TEMP)) {
			if (full.at(0) === ';') continue;

			const lbl = lbl_json.trim();
			if (lbl === '' || lbl.startsWith('(HIDE GUI)')) continue;

			const nm = nm1 ?? nm2 ?? '';
			let o: T_TEMP = {
				id	: '/setting.sn:'+ nm,
				nm,
				lbl,
				type: 'txt',
				val	: sep ?val.slice(1, -1) :val,
			};
			if (lbl.at(0) === '{') o = {...o, ...<T_TEMP>JSON.parse(lbl)};
			switch (o.type) {	// 型チェック
				case 'rng':	break;
		/*
			document.querySelectorAll('.form-range').forEach(c=> {
				const rngV = c.closest('.range-wrap').querySelector('.range-badge');
				const setValue = ()=> {
					const	val = Number( (c.value - c.min) *100 /(c.max - c.min) ),
							pos = 10 -(val *0.2);
					rngV.innerHTML = `<span>${c.value}</span>`;
					rngV.style.left = `calc(${val}% + (${pos}px))`;
				};
				setValue();
				c.addEventListener('input', setValue, {passive: true});
			});
		*/

				default:
					if (val === 'true' || val === 'false') o.type = 'chk';
			}
			aTemp.push(o);
		}
		void this.pc.ps.cmd2Vue(<T_E2V_TEMP>{
			cmd		: 'update.aTemp',
			err		: '',
			aTemp,
		});
	}
		#fnSetting	= '';

	//MARK: 更新
	update = (_e: T_V2E_aTemp)=> { /* empty */ };
	#update_proc(e: T_V2E_aTemp) {
		if (this.#preventUpdHowl) {
			this.#preventUpdHowl = false;
			return;
		}

		if (this.#tiDelay) clearTimeout(this.#tiDelay);	// 遅延
		this.#tiDelay = setTimeout(()=> {
			const a: [r: RegExp, rep: string][] = [];
			for (const {nm, val} of e.aRes) {
				a.push([
					new RegExp(`(&${nm}\\s*=\\s*)((["'#]).+?\\3|[^;\\s]+)`),
					`$1$3${val}$3`,		// https://regex101.com/r/jD2znK/1
				]);	// (new RegExp('\')) の場合は、バックスラッシュは２つ必要

				// 値変化時に処理
				switch (nm) {
					case 'const.体験版':
						replaceRegsFile(
							this.pc.PATH_WS +'/package.json',
							[[
								/("productName": ").*"/,	// 最初のだけ
	// 二つ目（build内）のはインストール exe 名になり、
	// 製品版インストール時に別扱いになり、上書き置き換えできないので
								'$1'+ this.cfg.oCfg.book.title + (val === 'true' ?' 体験版' :'') +'"',
							], [
								/(\${arch})(_ex)?(\.\${ext})/,
								'$1'+ (val === 'true' ?'_ex' :'') +'$3',
							]],	// https://regex101.com/r/EClPCg/1
						);
						break;
				}
			}
			if (replaceRegsFile(this.#fnSetting, a, false)) {
				const fp = this.#fnSetting;
				const pp = this.pc.diff.fp2pp(fp);
				const pp2s: T_PP2SNSTR = {};
				pp2s[pp] = readFileSync(fp, {encoding: 'utf8'});
				void this.reqPrj2LSP({cmd: 'onchg_scr', pp2s});
			}
				// 【file:///Users/...】 LSPの doc 特定で使う
		}, 500);
	}
		#tiDelay: NodeJS.Timeout | undefined = undefined;

}
