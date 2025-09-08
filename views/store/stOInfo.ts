/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {defineStore} from 'pinia';
import {DEF_OPTPIC, DEF_OPTPIC4TST, DEF_CNVFONT, DEF_OPTSND, DEF_OPTSND4TST} from '../types';
import type {T_A_CNVFONT, T_OPTPIC, T_E2V_CNVFONT, T_E2V_OPTPIC, T_OPTSND, T_E2V_OPTSND} from '../types';
import {isVSCode, on} from './stVSCode';

let init = false;

export const useOInfo = ()=> {
	// 本来の store生成
	const st = defineStore('OInfo', {
		state	: ()=> ({
			aCnvFont	: DEF_CNVFONT,
			oOptPic		: isVSCode ?DEF_OPTPIC :DEF_OPTPIC4TST,
			oOptSnd		: isVSCode ?DEF_OPTSND :DEF_OPTSND4TST,
		}),	// 初期値を返す関数
	//	getters	: {},	// state 及び他の getter へのアクセスが可能
		actions	: {	// State の更新
			setACnvFont(aCnvFont: T_A_CNVFONT) {this.aCnvFont = aCnvFont;},
			setOptPic(oOptPic: T_OPTPIC) {this.oOptPic = oOptPic;},
			setOptSnd(oOptSnd: T_OPTSND) {this.oOptSnd = oOptSnd;},
		},
	})();

	if (! init) {
		init = true;
		// 拡張機能メインから値取得
		on('update.cnvFont', ({aCnvFont}: T_E2V_CNVFONT)=> st.setACnvFont(aCnvFont));
		on('update.optPic', ({oOptPic}: T_E2V_OPTPIC)=> st.setOptPic(oOptPic));
		on('update.optSnd', ({oOptSnd}: T_E2V_OPTSND)=> st.setOptSnd(oOptSnd));
	}

	return st;
};