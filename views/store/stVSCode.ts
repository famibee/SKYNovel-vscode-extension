/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {defineStore} from 'pinia';
import {useCfg} from '../store/stCfg';
import {useWss} from '../store/stWSS';
import type {T_E2V_INIT, T_E2V, T_Ex2Vue_cmd, T_V2E_Q} from '../../src/types';
// eslint-disable-next-line no-undef
const vscode = ('acquireVsCodeApi' in window) ?acquireVsCodeApi() :undefined;
export const isVSCode = vscode !== undefined;

export const cmd2Ex: (o: unknown)=> void = vscode
	? o=> vscode.postMessage(o)
	: o=> console.log('cmd2Ex:%o', o);
export const info = (mes: string)=> cmd2Ex({cmd: 'info', mes});
export const warn = (mes: string)=> cmd2Ex({cmd: 'warn', mes});
export const openURL = (url: string)=> cmd2Ex({cmd: 'openURL', url});
export const copyTxt = (id: string)=> cmd2Ex({cmd: 'copyTxt', id});


const hHook: {[nm: string]: ((d: T_E2V)=> void)[]} = {};
export function on(nm: T_Ex2Vue_cmd, fnc: (d: any)=> void) {
	(hHook[nm] ??= []).push(fnc);
}
window.addEventListener('message', e=> {
	if (! e.isTrusted) {warn('Setting.vue isTrusted=false'); return}
	go(<T_E2V>e.data);
});
function go(d: T_E2V) { for (const f of hHook[d.cmd] ?? []) f(d); }
cmd2Ex(<T_V2E_Q>{cmd: '?'});	// 拡張機能メインへ準備完了通知


type T_STATE = {
	active_tab	: string;
};
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const oVSCode: T_STATE = <T_STATE>vscode?.getState() ?? {	// 永続性回復
	active_tab	: 'basic',
};

let init = false;

export const useVSCode = ()=> {
	// 本来の store生成
	const st = defineStore('vscode.getState', {
		state	: ()=> (oVSCode),	// 初期値を返す関数
	//	getters	: {},	// state 及び他の getter へのアクセスが可能
	//	actions	: {},	// State の更新
	})();

	if (! init) {
		init = true;
		// さっそくフック	// 状態が変化するたびに
		st.$subscribe(()=> vscode?.setState(oVSCode));
		const stCfg = useCfg();
		// 拡張機能メインから初期値取得	// 必ず st.$subscribe()以後に
		on('!', d=> {
			const {oCfg, oWss} = <T_E2V_INIT>d;
			stCfg.init(oCfg);

			const stWss = useWss();
			stWss.init(oWss);

			go({cmd: 'init.Vue'});
		});
	}

	return st;
};

export const getLeftRangeBadge = (value=0, max=0, min=0)=> {
	const val = (value - min) *100 /(max - min);
	const pos = 10 -(val *0.2);
	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	return `calc(${val}% + (${pos}px))`;
};
