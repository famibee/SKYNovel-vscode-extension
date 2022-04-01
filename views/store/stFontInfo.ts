/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {defineStore} from 'pinia';
import {DEF_FONTINF, T_A_FONTINF, T_E2V_AFONTINFO} from "../types";
import {on} from './stVSCode';

let init = false;

export const useFontInfo = ()=> {
	// 本来の store生成
	const st = defineStore('core/font/info.json', {
		state	: ()=> ({aFontInfo: DEF_FONTINF}),	// 初期値を返す関数
	//	getters	: {},	// state 及び他の getter へのアクセスが可能
		actions	: {	// State の更新
			setAFontInfo(aFontInfo: T_A_FONTINF) {this.aFontInfo = aFontInfo;}
		},
	})();

	if (! init) {
		init = true;
		// 拡張機能メインから値取得
		on('update.aFontInfo', (data: T_E2V_AFONTINFO)=> st.setAFontInfo(data.aFontInfo));
	}

	return st;
};