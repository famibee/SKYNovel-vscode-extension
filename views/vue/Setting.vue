<template>
<nav><div class="nav nav-tabs" role="tablist">
	<a v-for="t in aTab" :id="`nav-${t.id}-tab`" :href="`#nav-${t.id}`"
		:aria-controls="`nav-${t.id}`"
		:class="{
			'nav-link'	: true,
			active		: t.id === active_tab,
		}" data-bs-toggle="tab" role="tab" aria-selected="false"
		:aria-selected="t.id === active_tab ?'true' :undefined"
		@click="active_tab = t.id" v-text="t.nm">
	</a>

</div></nav>
<div class="tab-content mt-2" id="nav-tabContent">
	<div v-for="t in aTab" :id="`nav-${t.id}`" :key="t.id"
		:class="{
			show	: t.id === active_tab,
			active	: t.id === active_tab,
		}"
		:aria-labelledby="`nav-${t.id}-tab`"
		class="tab-pane fade" role="tabpanel">
		<div class="container-fluid"><div class="row">

<component :is="t.cmp"></component>

		</div></div>
	</div>

</div>
</template>


<script setup lang="ts">
import StgBasic from './StgBasic.vue'
import StgApp from './StgApp.vue'
import StgTemp from './StgTemp.vue'
import StgDebug from './StgDebug.vue'
import StgImgOpt from './StgImgOpt.vue'
import StgSndOpt from './StgSndOpt.vue'
import StgPkg from './StgPkg.vue'

import {useVSCode} from '../store/stVSCode';
import {storeToRefs} from 'pinia';


const stVSCode = useVSCode();
const {active_tab} = storeToRefs(stVSCode);	// 分割代入

type T_TAB = {id: string, nm: string, cmp: any,}
const aTab: T_TAB[] = [
	{id: 'basic',	nm: '基本情報',		cmp: StgBasic},
	{id: 'app',		nm: 'アプリ',		cmp: StgApp},
	{id: 'temp',	nm: 'テンプレ',		cmp: StgTemp},
	{id: 'debug',	nm: 'デバッグ',		cmp: StgDebug},
	{id: 'imgopt',	nm: '画像最適化',	cmp: StgImgOpt},
	{id: 'sndopt',	nm: '音声最適化',	cmp: StgSndOpt},
	{id: 'pkg',		nm: 'パッケージ',	cmp: StgPkg},
];

</script>