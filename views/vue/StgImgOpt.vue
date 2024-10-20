<style>
img-comparison-slider {
	--divider-width: 4px;
	--divider-color: #ffa658;

	/* 背景をPhotoshop風タイルに */
	background: rgb(204, 204, 204);
	background-image:
		linear-gradient(45deg, rgb(255, 255, 255) 25%, transparent 0),
		linear-gradient(45deg, transparent 75%, rgb(255, 255, 255) 0),
		linear-gradient(45deg, rgb(255, 255, 255) 25%, transparent 0),
		linear-gradient(45deg, transparent 75%, rgb(255, 255, 255) 0);
	background-size: 16px 16px;
	background-position: 0 0, 8px 8px, 8px 8px, 16px 16px;
}
img-comparison-slider > img {
	width: 100%;			/* 横幅一敗に */
	object-fit: none;		/* はみ出してもいいからリサイズさせない */
}
img-comparison-slider > svg {
	transition: transform 0.2s;
}
img-comparison-slider:hover > svg {
	transform: scale(1.2);
}

.tbody_scroll {
	max-height: clamp(5em, 90vh, 50em);
	overflow: auto;
}

table .btn:disabled {
	background-color: white;
}
</style>


<template>
<div class="col-6 col-sm-4 px-2">
	<div class="form-check form-switch py-2">
		<input type="checkbox" id="cnv.mat.pic" v-model="oWss['cnv.mat.pic']"
			:disabled="hDisabled['cnv.mat.pic']" class="form-check-input sn_checkbox sn-chk"/>
		<label for="cnv.mat.pic" class="form-check-label">jpg・png を WebP に変換</label>
	</div>
</div>

<div class="col-6 col-sm-3 px-1">
	<div class="range-wrap">
		<div class="range-badge range-badge-down" :style="{left: getLeftRangeBadge(oWss['cnv.mat.webp_quality'], 100, 5)}">
			<span v-text="oWss['cnv.mat.webp_quality']"></span>
		</div>
		<label for="cnv.mat.webp_quality" class="form-label">基本の変換画質</label>
		<input type="range" id="cnv.mat.webp_quality"
			v-model="oWss['cnv.mat.webp_quality']" max="100" min="5" step="5"
			:disabled="hDisabled['cnv.mat.pic']" @change="chgRangeWebpQDef($event)"
			class="form-range my-1 sn-vld"/>
	</div>
</div>


<div v-if="oOptImg.sum.baseSize > 0" class="col-6 col-sm-5 px-1">
<table class="table table-striped">
<thead><tr>
	<th>元画像サイズ合計</th>
	<th>webp変換後</th>
	<th>削減率</th>
</tr></thead><tbody>
<tr>
	<td style="text-align: right;"
		v-text="oOptImg.sum.baseSize.toLocaleString('ja-JP') +' byte'"/>
	<td style="text-align: right;"
		v-text="oOptImg.sum.webpSize.toLocaleString('ja-JP') +' byte'"/>
	<td v-text="(oOptImg.sum.webpSize / oOptImg.sum.baseSize).toLocaleString('ja-JP')"></td>
</tr>
</tbody></table>
</div>


<div v-if="oOptImg.sum.baseSize > 0" class="col-12 px-1"><div>
<div id="clpMatCnv" class="accordion-collapse"><div class="accordion-body p-0 tbody_scroll">

	<table id="tblMatCnv" class="table table-striped table-hover accordion bg-secondary"><thead class="sticky-top"><tr>
		<th>ファイル名</th>
		<th>変換画質</th>
		<th style="text-align: right;">元画像サイズ</th>
		<th style="text-align: right;">webp変換後</th>
		<th>削減率</th>
	</tr></thead><tbody>
<template v-for="e in sortHSize()" class="accordion-item" :key="e.key">
	<tr :href="'#'+ e.id" class="accordion-header" data-bs-toggle="collapse" :data-bs-target="'#'+ e.id" aria-expanded="true" :aria-controls="e.id">
		<td v-text="e.nm"/>
		<td v-text="e.webp_q ?? `${oWss['cnv.mat.webp_quality']} (基本の値)`"/>
		<td style="text-align: right;"
			v-text="e.baseSize.toLocaleString('ja-JP') +' byte'"/>
		<td style="text-align: right;"
			v-text="e.webpSize.toLocaleString('ja-JP') +' byte'"/>
		<td v-text="(e.webpSize / e.baseSize).toLocaleString('ja-JP')"/>
	</tr>
	<tr :id="e.id" data-bs-parent="#tblMatCnv" :aria-labelledby="e.id" class="accordion-collapse collapse">
	<td colspan="4" class="accordion-body"><div class="row">

<div class="col-6 col-sm-4 px-2">
	<div class="form-check form-switch py-2">
		<input type="checkbox" :id="'cnv.mat.pic.'+ e.id"
			:checked="e.webp_q !== undefined"
			@change="chkChg($event, e)"
			:disabled="hDisabled['cnv.mat.pic']"
			class="form-check-input sn_checkbox sn-chk"/>
		<label :for="'cnv.mat.pic.'+ e.id" class="form-check-label text-white">画質を個別設定</label>
	</div>
</div>
<div class="col-6 col-sm-3 px-1">
	<div class="range-wrap">
		<div class="range-badge" :style="{left: getLeftRangeBadge(e.webp_q, 100, 5)}">
			<span v-text="e.webp_q" v-show="e.webp_q !== undefined"></span>
		</div>
		<input type="range" v-model="oOptImg.hSize[e.nm].webp_q"
			max="100" min="5" step="5"
			:disabled="e.webp_q === undefined || hDisabled['cnv.mat.pic']"
			@change="chgRangeWebpQ($event, e)" class="form-range my-1 sn-vld"/>
	</div>
</div>

<div class="col-12 px-1">
	<div class="position-relative d-flex justify-content-evenly">
	<ImgComparisonSlider>
		<img loading="lazy" slot="first" :src="updImg(oOptImg.sum.pathImgCmpWebP + e.fld_nm +'.webp')"/>
		<img loading="lazy" slot="second" :src="updImg(oOptImg.sum.pathImgCmpBase + e.fld_nm +'.'+ e.ext)"/>
		<svg slot="handle" width="100" xmlns="http://www.w3.org/2000/svg" viewBox="-8 -3 16 6">
			<path stroke="#fff" d="M -5 -2 L -7 0 L -5 2 M -5 -2 L -5 2 M 5 -2 L 7 0 L 5 2 M 5 -2 L 5 2" stroke-width="2" fill="#ffa658" vector-effect="non-scaling-stroke"></path>
		</svg>
	</ImgComparisonSlider>

	<button type="button" class="btn btn-light position-absolute top-50 start-0" disabled>WebP</button>
	<button type="button" class="btn btn-light position-absolute bottom-50 end-0" v-text="e.ext" disabled></button>
	</div>
</div>

	</div></td>
	</tr>
</template>
	</tbody></table>

</div></div>
</div></div>
</template>


<script setup lang="ts">
import {cmd2Ex, getLeftRangeBadge} from '../store/stVSCode';
import {useWss, hDisabled} from '../store/stWSS';
import {storeToRefs} from 'pinia';
import {useOInfo} from '../store/stOInfo';
import {T_OPTIMG_FILE_AND_KEY, T_E2V_CHG_RANGE_WEBP_Q_DEF, T_E2V_CHG_RANGE_WEBP_Q} from '../types';
import {ImgComparisonSlider} from '@img-comparison-slider/vue';


const stOInfo = useOInfo();
const {oOptImg} = storeToRefs(stOInfo);

const sortHSize: ()=> T_OPTIMG_FILE_AND_KEY[] = ()=> Object.entries(oOptImg.value.hSize)
	.map(([nm, v], i)=> ({key: i, nm, id: 'acdMC'+ nm.replaceAll('.', '_'), ...v}))
	.sort((a, b)=> (a.nm < b.nm) ?-1 :1);	// 昇順ソート

const chgRangeWebpQDef = (el: any)=> {
	const webp_q = Number(el.target.value);
	oWss.value['cnv.mat.webp_quality'] = webp_q;
	const q: T_E2V_CHG_RANGE_WEBP_Q_DEF = {cmd: 'change.range.webp_q_def', webp_q};
	cmd2Ex(q);
}


const stWss = useWss();
const {oWss} = storeToRefs(stWss);

const chkChg = (el: any, e :T_OPTIMG_FILE_AND_KEY)=> {
	const no_def = Boolean(el.target.checked);
	const webp_q = oWss.value['cnv.mat.webp_quality'];
	if (no_def) oOptImg.value.hSize[e.nm].webp_q = webp_q;
	else delete oOptImg.value.hSize[e.nm].webp_q;

	const q: T_E2V_CHG_RANGE_WEBP_Q = {cmd: 'change.range.webp_q', nm: e.nm, no_def, webp_q};
	cmd2Ex(q);

};
const chgRangeWebpQ = (el: any, e :T_OPTIMG_FILE_AND_KEY)=> {
	const q: T_E2V_CHG_RANGE_WEBP_Q = {cmd: 'change.range.webp_q', nm: e.nm, no_def: true, webp_q: Number(el.target.value)};
	cmd2Ex(q);
}

const updImg = (src: string)=> src +'?'+ new Date().getTime();

</script>