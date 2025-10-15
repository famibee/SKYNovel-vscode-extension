/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {defineStore} from 'pinia';
import {toRaw} from 'vue';
import {DEF_CFG, DEF_CFG4TST} from '../../src/types';
import type {T_CFG, T_E2V_CFG, T_V2E_CFG} from '../../src/types';
import {cmd2Ex, isVSCode, on} from './stVSCode';

export const useCfg = defineStore('doc/prj/prj.json', {
	state	: ()=> ({oCfg: isVSCode ?DEF_CFG :DEF_CFG4TST}),// 初期値を返す関数
	getters	: {	// state 及び他の getter へのアクセスが可能
	//	getTitle(s) {return s.title;},
		// getter は全て computed 扱いになるため、引数に応じて結果を替える場合に
	},
	actions	: {	// State の更新
		init(oCfg: T_CFG) {
			this.oCfg = oCfg;

			// 状態が変化するたびに	// 主にDebugチェックボックス用
			this.$subscribe(()=> this.subscribe(toRaw(this.oCfg)));
			// 拡張機能メインから値取得	// 必ず this.$subscribe()以後に
			on('update.oCfg', (d: T_E2V_CFG)=> this.oCfg = d.oCfg);
		},
		// useField を使うと $subscribe が効かない
		subscribe(oCfg: T_CFG) {cmd2Ex(<T_V2E_CFG>{cmd: 'update.oCfg', oCfg})},
	},
});
