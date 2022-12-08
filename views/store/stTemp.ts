/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {defineStore} from 'pinia';
import {toRaw} from 'vue';
import {DEF_TEMP4TST, DEF_TEMP, T_E2V_TEMP, T_V2E_TEMP} from '../types';
import {cmd2Ex, isVSCode, on} from './stVSCode';

let init = false;

export const useTemp = ()=> {
	// 本来の store生成
	const st = defineStore('doc/prj/**/setting.sn', {
		state	: ()=> ({	// 初期値を返す関数
			aTemp	: isVSCode ?DEF_TEMP :DEF_TEMP4TST,
			err		: '',
		}),
		getters	: {	// state 及び他の getter へのアクセスが可能
		//	getTitle(s) {return s.title;},
			// getter は全て computed 扱いになるため、引数に応じて結果を替える場合に
		},
		actions	: {},	// State の更新
	})();

	if (! init) {
		init = true;
		// 状態が変化するたびに
		// useField を使うと $subscribe が効かない
		st.$subscribe(()=> cmd2Ex(<T_V2E_TEMP>{
			cmd	: 'update.aTemp',
			aRes: st.aTemp.map(({type, nm, val, num, bol})=> {switch (type) {
				case 'txt':	return {nm, val: toRaw(val)};
				case 'rng':	return {nm, val: String(num)};
				case 'chk':	return {nm, val: String(bol)};
				default:	return {nm, val: toRaw(val)};
			}}),
		}));
		// 拡張機能メインから値取得	// 必ず st.$subscribe()以後に
		on('update.aTemp', ({aTemp, err}: T_E2V_TEMP)=> {
			st.aTemp = aTemp.map(v=> {switch (v.type) {
				case 'txt':	return v;
				case 'rng':	return {...v, num: Number(v.val)};
				case 'chk':	return {...v, bol: Boolean('false')};
				default:	return v;
			}});
			st.err = err;
		});
	}

	return st;
};