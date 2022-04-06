<template>
<div class="row">
<div class="col-6 col-sm-8 px-1 py-2">
	<label for="open.readme.txt" class="form-label">readme.txtを開く</label>
	<div class="input-group input-group-sm">
		<span class="input-group-text">【build/include/readme.txt】</span>
		<button type="button" id="open.readme.txt" class="btn btn-info btn-lg" @click="openURL('ws-file:///build/include/readme.txt')">Open</button>
	</div>
</div>
<div class="col-6 col-sm-4 px-1 py-2">
	<label class="form-label">フォントサイズ最適化</label>
	<div class="form-check form-switch mb-1">
		<input type="checkbox" id="/workspaceState:cnv.font.subset" v-model="oWss['cnv.font.subset']" :disabled="hDisabled['cnv.font.subset']" class="form-check-input sn_checkbox sn-chk"/>
		<label for="/workspaceState:cnv.font.subset" class="form-check-label">必要最小限にする</label>
	</div>
</div>


<div class="col-12 px-1 py-3">
	<label class="form-label">フォント情報</label>
<table class="table table-striped"><thead><tr>
	<th scope="col">#</th>
	<th scope="col">Filename</th>
	<th scope="col">元ファイルの場所</th>
	<th scope="col" style="text-align: right;">Size（元ファイル）</th>
	<th scope="col" style="text-align: right;">Size（出力結果）</th>
	<th scope="col">削減率</th>
</tr></thead><tbody>
<tr v-for="(e, i) in aFontInfo">
	<th scope="row" v-text="i +1"></th>
	<td v-text="e.nm"></td>
	<td v-text="e.mes"></td>
	<td style="text-align: right;" v-text="e.iSize.toLocaleString('ja-JP') +' byte'"></td>
	<td style="text-align: right;" v-text="e.oSize.toLocaleString('ja-JP') +' byte'"></td>
	<td v-text="(e.oSize / e.iSize).toLocaleString('ja-JP')"></td>
</tr></tbody></table>
</div>


<div class="col-12 px-1 pt-3"><h5>素材ファイル最適化</h5></div>

<div class="col-6 col-sm-4 px-1 py-2">
	<div class="form-check form-switch py-2">
		<input type="checkbox" id="/workspaceState:cnv.mat.pic" v-model="oWss['cnv.mat.pic']" :disabled="hDisabled['cnv.mat.pic']" class="form-check-input sn_checkbox sn-chk"/>
		<label for="/workspaceState:cnv.mat.pic" class="form-check-label">jpg・png を WebP に変換</label>
	</div>
</div>

<div class="col-6 col-sm-3 px-1 pb-2">
	<div class="range-wrap">
		<div class="range-badge range-badge-down" :style="{left: getLeftRangeBadge(oWss['cnv.mat.webp_quality'], 100, 5)}">
			<span v-text="oWss['cnv.mat.webp_quality']"></span>
		</div>
		<label for="/workspaceState:cnv.mat.webp_quality" class="form-label">WebP 変換時の画質</label>
		<input type="range" id="/workspaceState:cnv.mat.webp_quality" v-model="oWss['cnv.mat.webp_quality']" max="100" min="5" step="5" :disabled="hDisabled['cnv.mat.pic']" class="form-range my-1 sn-vld"/>
	</div>
</div>


<div v-if="oCnvMatInfo.sum.baseSize > 0" class="col-6 col-sm-5 px-1 py-2">
<table class="table table-striped">
<thead><tr>
	<th scope="col">元画像サイズ合計</th>
	<th scope="col">webp変換後</th>
	<th scope="col">削減率</th>
</tr></thead><tbody>
<tr>
	<td style="text-align: right;" v-text="oCnvMatInfo.sum.baseSize.toLocaleString('ja-JP') +' byte'"></td>
	<td style="text-align: right;" v-text="oCnvMatInfo.sum.webpSize.toLocaleString('ja-JP') +' byte'"></td>
	<td v-text="(oCnvMatInfo.sum.webpSize / oCnvMatInfo.sum.baseSize).toLocaleString('ja-JP')"></td>
</tr>
</tbody></table>
</div>


<div v-if="oCnvMatInfo.sum.baseSize > 0" id="acdMatCnv" class="col-12 px-1 py-3 accordion"><div class="accordion-item" style="background-color: var(--vscode-list-dropBackground);">
<h2 id="logMatCnv" class="accordion-header">
	<button type="button" class="accordion-button text-white" style="background-color: var(--vscode-list-dropBackground);" data-bs-toggle="collapse" data-bs-target="#clpMatCnv" aria-expanded="true" aria-controls="collapseOne">
		変換レポート
	</button>
</h2>
<div id="clpMatCnv" class="accordion-collapse collapse" aria-labelledby="logMatCnv" data-bs-parent="#acdMatCnv"><div class="accordion-body">
	<table class="table table-striped"><thead><tr>
		<th scope="col">ファイル名</th>
		<th scope="col" style="text-align: right;">元画像サイズ</th>
		<th scope="col" style="text-align: right;">webp変換後</th>
		<th scope="col">削減率</th>
	</tr></thead><tbody>
	<tr v-for="e in sortHSize()">
		<td v-text="e.key"></td>
		<td style="text-align: right;" v-text="e.baseSize.toLocaleString('ja-JP') +' byte'"></td>
		<td style="text-align: right;" v-text="e.webpSize.toLocaleString('ja-JP') +' byte'"></td>
		<td v-text="(e.webpSize / e.baseSize).toLocaleString('ja-JP')"></td>
	</tr></tbody></table>
</div></div>
</div></div>


<div class="col-12 px-1 pt-3"><h5>アプリアイコン</h5></div>

<div class="container"><div class="row">
	<div class="col-6 col-lg-2 col-xxl-1">
		<img :src="srcIcon" @click="selectIcon" class="img-fluid sn-dragdrop"/>
	</div>

	<div class="col-6 col-lg-2 col-xxl-1"><div class="row">
		<div class="col-12 px-1 pt-3"><h6>画像から自動作成</h6></div>

	</div><div class="row">
		<div class="col form-check mb-3">
			<div class="input-group input-group-sm">
				<button type="button" @click="selectIcon" class="btn btn-info btn-lg">ファイルを選択</button>
				<span class="alert alert-danger" role="alert" v-text="select_icon_err" v-show="select_icon_err !== ''"></span>
			</div>
		</div>

	</div><div class="row">
		<div class="col form-check">
			<div class="input-group input-group-sm">
				<input type="checkbox" id="/workspaceState:cnv.icon.cut_round" v-model="oWss['cnv.icon.cut_round']" class="form-check-input mb-3 sn_checkbox sn-chk">
				<label for="/workspaceState:cnv.icon.cut_round" class="form-check-label">丸く切り抜くか</label>
			</div>
		</div>

	</div></div>
</div></div>
</div>

</template>


<script setup lang="ts">
import {openURL, on, cmd2Ex, getLeftRangeBadge} from '../store/stVSCode';
import {useWss, hDisabled} from '../store/stWSS';
import {storeToRefs} from 'pinia';
import {useOInfo} from '../store/stOInfo';
import {ref} from 'vue';
import {T_E2V_NOTICE_COMPONENT, T_E2V_SELECT_ICON_INFO, T_V2E_SELECT_ICON_FILE} from '../types';

const stOInfo = useOInfo();
const {aFontInfo, oCnvMatInfo} = storeToRefs(stOInfo);	// 分割代入

const stWss = useWss();
const {oWss} = storeToRefs(stWss);	// 分割代入
on('notice.Component', (data: T_E2V_NOTICE_COMPONENT)=> {switch (data.mode) {
	case 'wait':	hDisabled.value[data.id] = true;	break;

	case 'cancel':
		oWss.value[data.id] = ! oWss.value[data.id];
		hDisabled.value[data.id] = false;
		break;

	case 'comp':	hDisabled.value[data.id] = false;	break;
}});

const sortHSize = ()=> Object.entries(oCnvMatInfo.value.hSize)
	.map(([key, v])=> ({key, ...v}))
	.sort((a, b)=> (a.key < b.key) ?-1 :1);	// 昇順ソート


const selectIcon = ()=> cmd2Ex(<T_V2E_SELECT_ICON_FILE>{
	cmd			: 'selectFile',
	title		: 'アプリアイコン',
	openlabel	: '素材画像を選択',
	path		: 'build/icon.png',
});

const srcIcon = ref('data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjY0MCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCIgdmlld0JveD0iMCAwIDY0MCA2NDAiIHdpZHRoPSI2NDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxwYXRoIGlkPSJhIiBkPSJtMCAzMjBjMCAxNzYuNzIgMTQzLjI4IDMyMCAzMjAgMzIwczMyMC0xNDMuMjggMzIwLTMyMC0xNDMuMjgtMzIwLTMyMC0zMjAtMzIwIDE0My4yOC0zMjAgMzIwem0yMDAgMTAwdi0yMDBoODB2MjAwem0xNjAgMHYtMjAwaDgwdjIwMHoiLz48L2RlZnM+PHBhdGggZD0ibTE0Ny40OSAxODAuNDFoMzUyLjR2MjgyLjY5aC0zNTIuNHoiIGZpbGw9IiNmZmYiLz48dXNlIGZpbGw9IiMyZTJlMmUiIHhsaW5rOmhyZWY9IiNhIi8+PHVzZSBmaWxsPSJub25lIiB4bGluazpocmVmPSIjYSIvPjwvc3ZnPg==');
const updImg = (src: string)=> srcIcon.value = src +'?'+ (new Date()).getTime();
on('!', data=> updImg(data.pathIcon));


const select_icon_err = ref('');
on('updimg', (data: T_E2V_SELECT_ICON_INFO)=> {
	updImg(data.pathIcon);
	select_icon_err.value = data.err_mes;
});

</script>