/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {defineStore} from 'pinia';
import {ref, toRaw} from 'vue';
import {DEF_WSS, T_V2E_WSS, T_WSS} from '../types';
import {cmd2Ex} from './stVSCode';

export const hDisabled = ref({
	'cnv.font.subset'	: false,
	'cnv.mat.pic'		: false,
});

export const useWss = defineStore('workspaceState', {
	state	: ()=> ({oWss: DEF_WSS}),	// 初期値を返す関数
	getters	: {},	// state 及び他の getter へのアクセスが可能
	actions	: {	// State の更新
		init(oWss: T_WSS) {
			this.oWss = oWss;

			this.$subscribe(()=> {	// 状態が変化するたびに
				if (hDisabled.value['cnv.font.subset']) return;
				if (hDisabled.value['cnv.mat.pic']) return;
				cmd2Ex(<T_V2E_WSS>{cmd: 'update.oWss', oWss: toRaw(this.oWss)})
			});
		},
	},
});