<template>
<div class="col-6 col-sm-4 px-2">
	<div class="form-check form-switch py-2">
		<input type="checkbox" id="cnv.mat.snd" v-model="oWss['cnv.mat.snd']"
			:disabled="hDisabled['cnv.mat.snd']" class="form-check-input sn_checkbox sn-chk"/>
		<label for="cnv.mat.snd" class="form-check-label">mp3・wav をコーデック変換</label>
	</div>
</div>

<div class="col-6 col-sm-3 px-1 sn_select">
	<label for="cnv.mat.snd.codec" class="form-label">音声コーデック</label>
	<i class="fas fa-angle-down sn_select_v"></i>
	<select id="cnv.mat.snd.codec" class="form-select form-select-sm mb-3" aria-label=".form-select-sm example" v-model="oWss['cnv.mat.snd.codec']">
		<option value="opus" selected>(.m4a) Opus</option>
		<option value="aac">(.aac) Advanced Audio Coding</option>
		<option value="ogg">(.ogg) Vorbis</option>
	</select>
</div>


<div v-if="oOptSnd.sum.baseSize > 0" class="col-6 col-sm-5 px-1">
<table class="table table-striped">
<thead><tr>
	<th>元音声サイズ合計</th>
	<th>変換後</th>
	<th>削減率</th>
</tr></thead><tbody>
<tr>
	<td style="text-align: right;"
		v-text="oOptSnd.sum.baseSize.toLocaleString('ja-JP') +' byte'"/>
	<td style="text-align: right;"
		v-text="oOptSnd.sum.optSize.toLocaleString('ja-JP') +' byte'"/>
	<td v-text="(oOptSnd.sum.optSize / oOptSnd.sum.baseSize).toLocaleString('ja-JP')"></td>
</tr>
</tbody></table>
</div>


<div v-if="oOptSnd.sum.baseSize > 0" class="col-12 px-1"><div>
<div><div class="p-0 tbody_scroll">

	<table class="table table-striped bg-secondary"><thead class="sticky-top"><tr>
		<th>ファイル名</th>
		<th style="text-align: right;">元音声サイズ</th>
		<th style="text-align: right;">変換後</th>
		<th>削減率</th>
	</tr></thead><tbody>
<template v-for="e in sortHSize()" :key="e.key">
	<tr :href="'#'+ e.id" data-bs-toggle="collapse" :data-bs-target="'#'+ e.id" aria-expanded="true" :aria-controls="e.id">
		<td v-text="e.nm"/>
		<td style="text-align: right;"
			v-text="e.baseSize.toLocaleString('ja-JP') +' byte'"/>
		<td style="text-align: right;"
			v-text="e.optSize.toLocaleString('ja-JP') +' byte'"/>
		<td v-text="(e.optSize / e.baseSize).toLocaleString('ja-JP')"/>
	</tr>
</template>
	</tbody></table>

</div></div>
</div></div>
</template>


<script setup lang="ts">
import {useWss, hDisabled} from '../store/stWSS';
import {storeToRefs} from 'pinia';
import {useOInfo} from '../store/stOInfo';
import {T_OPTSND_FILE_AND_KEY} from '../types';


const stOInfo = useOInfo();
const {oOptSnd} = storeToRefs(stOInfo);

const stWss = useWss();
const {oWss} = storeToRefs(stWss);

const sortHSize: ()=> T_OPTSND_FILE_AND_KEY[] = ()=> Object.entries(oOptSnd.value.hSize)
	.map(([nm, v], i)=> ({key: i, nm, id: 'acdMC'+ nm.replaceAll('.', '_'), ...v}))
	.sort((a, b)=> (a.nm < b.nm) ?-1 :1);	// 昇順ソート

</script>