/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {defineStore} from 'pinia';
import {DEF_CNVMATINFO, DEF_CNVMATINFO4TST, DEF_FONTINF, T_A_FONTINF, T_CNVMATINFO, T_E2V_AFONTINFO, T_E2V_CNVMATINFO} from '../types';
import {isVSCode, on} from './stVSCode';

let init = false;

export const useOInfo = ()=> {
	// 本来の store生成
	const st = defineStore('OInfo', {
		state	: ()=> ({
			aFontInfo	: DEF_FONTINF,
			oCnvMatInfo	: isVSCode ?DEF_CNVMATINFO :DEF_CNVMATINFO4TST,
		}),	// 初期値を返す関数
	//	getters	: {},	// state 及び他の getter へのアクセスが可能
		actions	: {	// State の更新
			setAFontInfo(aFontInfo: T_A_FONTINF) {this.aFontInfo = aFontInfo;},
			setCnvMatInfo(oCnvMatInfo: T_CNVMATINFO) {this.oCnvMatInfo = oCnvMatInfo;},
		},
	})();

	if (! init) {
		init = true;
		// 拡張機能メインから値取得
		on('update.aFontInfo', (data: T_E2V_AFONTINFO)=> st.setAFontInfo(data.aFontInfo));
		on('update.cnvMatInfo', (data: T_E2V_CNVMATINFO)=> st.setCnvMatInfo(data.oCnvMatInfo));
	}

	return st;
};