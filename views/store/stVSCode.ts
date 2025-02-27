/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {defineStore} from 'pinia';
import {useCfg} from '../store/stCfg';
import {useWss} from '../store/stWSS';
import type {T_E2V_INIT} from '../types';
const vscode = ('acquireVsCodeApi' in window) ?acquireVsCodeApi() :undefined;
export const isVSCode = vscode !== undefined;

export const cmd2Ex: (o: any)=> void = vscode
	? o=> vscode.postMessage(o)
	: o=> console.log(`cmd2Ex:%o`, o);
export const info = (mes: string)=> cmd2Ex({cmd: 'info', mes});
export const warn = (mes: string)=> cmd2Ex({cmd: 'warn', mes});
export const openURL = (url: string)=> cmd2Ex({cmd: 'openURL', url});
export const copyTxt = (id: string)=> cmd2Ex({cmd: 'copyTxt', id});


const aHook: {nm: string; fnc: (m: any)=> void;}[] = [];
export const on = (nm: string, fnc: (data: any)=> void)=> aHook.push({nm, fnc});
window.addEventListener('message', e=> {
	if (! e.isTrusted) {warn('Setting.vue isTrusted=false'); return;}
	go(e.data.cmd, e.data);
});
function go(nm: string, data: any) {for (const v of aHook) {
	if (v.nm === nm) v.fnc(data);
}}
cmd2Ex({cmd: '?'});	// 拡張機能メインへ準備完了通知


type T_STATE = {
	active_tab	: string;
};
const oVSCode: T_STATE = vscode?.getState() as T_STATE ?? {	// 永続性回復
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
		on('!', ({oCfg, oWss}: T_E2V_INIT)=> {
			stCfg.init(oCfg);

			const stWss = useWss();
			stWss.init(oWss);

			go('init', {});
		});
	}

	return st;
};

export const getLeftRangeBadge = (value=0, max=0, min=0)=> {
	const val = Number( (value - min) *100 /(max - min) );
	const pos = 10 -(val *0.2);
	return `calc(${val}% + (${pos}px))`;
};