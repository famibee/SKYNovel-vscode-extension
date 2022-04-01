/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {defineStore} from 'pinia';
import {toRaw} from 'vue';
import {DEF_CFG, T_CFG, T_E2V_CFG as T_E2V2_CFG} from "../types";
import {cmd2Ex, on} from './stVSCode';

export const useCfg = defineStore('doc/prj/prj.json', {
	state	: ()=> ({oCfg: DEF_CFG}),	// 初期値を返す関数
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
			on('update.oCfg', (data: T_E2V2_CFG)=> this.oCfg = data.oCfg);

		},
		// useField を使うと $subscribe が効かない
		subscribe(oCfg: T_CFG) {cmd2Ex(<T_E2V2_CFG>{cmd:'update.oCfg', oCfg})},
	},
});