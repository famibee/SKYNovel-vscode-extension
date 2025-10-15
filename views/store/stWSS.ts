/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {defineStore} from 'pinia';
import {ref, toRaw} from 'vue';
import {DEF_WSS} from '../../src/types';
import type {T_E2V_NOTICE_COMPONENT, T_V2E_oWss, T_WSS} from '../../src/types';
import {cmd2Ex, on} from './stVSCode';

export const hDisabled = ref({
	'cnv.font.subset'	: false,
	'cnv.mat.pic'		: false,
	'cnv.mat.snd'		: false,
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
				if (hDisabled.value['cnv.mat.snd']) return;
				cmd2Ex(<T_V2E_oWss>{cmd: 'update.oWss', oWss: toRaw(this.oWss)});
			});

			on('notice.Component', ({id, mode}: T_E2V_NOTICE_COMPONENT)=> {
				if (id === 'cnv.mat.snd.codec') return;

				switch (mode) {
				case 'wait':	hDisabled.value[id] = true;	break;

				case 'cancel':
					this.oWss[id] = ! this.oWss[id];
					hDisabled.value[id] = false;
					break;

				case 'comp':	hDisabled.value[id] = false;	break;
			}});
		},
	},
});
