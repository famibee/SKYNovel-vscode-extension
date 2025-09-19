/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {replaceRegsFile} from './CmnLib';
import {WatchFile2Batch} from './WatchFile2Batch';
import type {T_E2V_TEMP, T_TEMP, T_V2E_TEMP} from '../views/types';
import {REG_SN2TEMP} from '../views/types';

import {workspace} from 'vscode';
import {readFileSync} from 'fs-extra';


export class WfbSettingSn extends WatchFile2Batch {
	//MARK: コンストラクタ
	constructor(private readonly sendRequest2LSP: (cmd: string, o?: any)=> void) {super()}

	//MARK: 初期化
	async init() {
		await WatchFile2Batch.watchFld(
			'doc/prj/*/setting.sn', '',
			async ({path})=> {
				this.#fnSetting = path;	// 存在しない場合も
				this.chkMultiMatch = this.#chkMultiMatch_proc;
				this.chkMultiMatch();
				this.update = this.#update_proc;
			},
			async (_uri, cre)=> {
				if (cre) this.chkMultiMatch();
				// else this.onChgSettingSn(uri);	// ここでやると変更が戻るループ
			}, async ()=> true,
		);

		workspace.onDidSaveTextDocument(e=> {
			if (e.fileName.endsWith('/setting.sn')) this.chkMultiMatch();
		}, null, WatchFile2Batch.ctx.subscriptions);
	}


	#preventUpdHowl = true;	// 更新ハウリングを防ぐ
		// ついでに初回の不要な 'update.aTemp' を止めるため true 始まりで

	//MARK: 重複チェック
	chkMultiMatch = ()=> {};
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
			if (lbl.at(0) === '{') o = {...o, ...JSON.parse(lbl)};
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
		WatchFile2Batch.ps.cmd2Vue(<T_E2V_TEMP>{
			cmd		: 'update.aTemp',
			err		: '',
			aTemp,
		});
	}
		#fnSetting	= '';

	//MARK: 更新
	update = async (e: T_V2E_TEMP)=> {};
	async #update_proc(e: T_V2E_TEMP) {
		if (this.#preventUpdHowl) {
			this.#preventUpdHowl = false;
			return;
		}

		if (this.#tiDelay) clearTimeout(this.#tiDelay);	// 遅延
		this.#tiDelay = setTimeout(()=> {
			const a: [r: RegExp, rep: string][] = [];
			for (const {nm, val} of e.aRes) a.push([
				new RegExp(`(&${nm}\\s*=\\s*)((["'#]).+?\\3|[^;\\s]+)`),
				`$1$3${val}$3`,		// https://regex101.com/r/jD2znK/1
			]);	// (new RegExp("~")) の場合は、バックスラッシュは２つ必要
			if (replaceRegsFile(this.#fnSetting, a, false)) {
				const fp = this.#fnSetting;
				const pp = WatchFile2Batch.fp2pp(fp);
				const pp2s: {[pp: string]: string} = {};
				pp2s[pp] = readFileSync(fp, {encoding: 'utf8'});
				this.sendRequest2LSP('onchg_scr', {pp2s});
			}
				// 【file:///Users/...】 LSPの doc 特定で使う
		}, 500);
	}
		#tiDelay: NodeJS.Timeout | undefined = undefined;

}
