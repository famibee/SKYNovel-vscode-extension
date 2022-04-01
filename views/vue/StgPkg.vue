<template>
<div class="row">

<div class="col-6 col-sm-6 px-1 py-2">
	<label for="open.readme.txt" class="form-label">readme.txtを開く</label>
	<div class="input-group input-group-sm">
		<span class="input-group-text">【build/include/readme.txt】</span>
		<button type="button" id="open.readme.txt" class="btn btn-info btn-lg" @click="openURL('ws-file:///build/include/readme.txt')">Open</button>
	</div>
</div>
<div class="col-6 col-sm-6 px-1 py-2">
	<label class="form-label">フォントサイズ最適化</label>
	<div class="form-check form-switch mb-1">
		<input type="checkbox" id="/workspaceState:cnv.font.subset" v-model="oWss['cnv.font.subset']" :disabled="disabled" class="form-check-input sn_checkbox sn-chk"/>
		<label for="/workspaceState:cnv.font.subset" class="form-check-label">必要最小限にする</label>
	</div>
</div>

<div class="col-12 px-1 py-3">
	<label class="form-label">フォント情報</label>
<table class="table table-dark table-striped">
<thead><tr>
	<th scope="col">#</th>
	<th scope="col">Filename</th>
	<th scope="col">元ファイルの場所</th>
	<th scope="col" style="text-align: right;">Size（元ファイル）</th>
	<th scope="col" style="text-align: right;">Size（出力結果）</th>
	<th scope="col">削減率</th>
</tr></thead><tbody id="font.info">
<tr v-for="(e, i) in aFontInfo">
	<th scope="row" v-text="i +1"></th>
	<td v-text="e.nm"></td>
	<td v-text="e.mes"></td>
	<td style="text-align: right;" v-text="e.iSize.toLocaleString('ja-JP') +' byte'"></td>
	<td style="text-align: right;" v-text="e.oSize.toLocaleString('ja-JP') +' byte'"></td>
	<td v-text="(e.oSize / e.iSize).toLocaleString('ja-JP')"></td>
</tr>
</tbody></table></div>

<!--
<div class="col-12 px-1 pt-3"><h5>素材ファイル最適化</h5></div>

<div class="col-6 col-sm-6 px-1 py-2"><form class="form-check form-switch py-2">
	<input class="form-check-input sn_checkbox sn-chk" type="checkbox" id="/workspaceState:cnv.mat.pic"/><! -- checkedは外す -- >
	<label class="form-check-label" for="/workspaceState:cnv.mat.pic">jpg/png ファイルを WebP に変換するか</label>
</form></div>

<div class="col-6 col-sm-6 px-1 pb-2"><form class="form-check range-wrap">
	<div class="range-badge range-badge-down"></div>
	<label for="/workspaceState:cnv.mat.webp_quality" class="form-label">WebP 変換時の画質・クオリティ</label>
	<input class="form-range my-1 sn-vld" type="range" id="/workspaceState:cnv.mat.webp_quality" value="90" max="100" min="10" step="10"/>
</form></div>
-->
</div>


<div class="col-12 px-1 pt-3"><h5>アプリアイコン</h5></div>

<div class="container"><div class="row">
	<div class="col-8 col-lg-2 col-xxl-1">
		<img :src="srcIcon" @click="selectIcon" class="img-fluid sn-dragdrop"/>
	</div>

	<div class="col-4 col-lg-2 col-xxl-1"><div class="row">
		<div class="col-12 px-1 pt-3"><h6>画像を差し替え</h6></div>
<!--
		<div class="col-12 px-1 pt-3"><h6>画像から自動作成</h6></div>
-->

	</div><div class="row">
		<div class="col"><form class="form-check mb-3">
			<div class="input-group input-group-sm">
				<button type="button" @click="selectIcon" class="btn btn-info btn-lg">ファイルを選択</button>
			</div>
		</form></div>

	</div><div class="row">
<!--
		<div class="col"><form class="form-check">
			<div class="input-group input-group-sm">
				<input id="/workspaceState:cnv.icon.cut_round" class="form-check-input mb-3 sn_checkbox sn-chk" type="checkbox" value="">
				<label class="form-check-label" for="ext.icon_round">丸く切り抜くか</label>
			</div>
		</form></div>
-->

	</div></div>
</div></div>

</template>


<script setup lang="ts">
import {openURL, on, cmd2Ex} from '../store/stVSCode';

import {disabled, useWss} from "../store/stWSS";
import {storeToRefs} from 'pinia';
import {useFontInfo} from '../store/stFontInfo';
import {ref} from 'vue';
import {T_V2E_SELECT_FILE} from '../types';

const stFontInfo = useFontInfo();
const {aFontInfo} = storeToRefs(stFontInfo);	// 分割代入

const stWss = useWss();
const {oWss} = storeToRefs(stWss);	// 分割代入
on('cnv.font.subset', data=> {switch (data.val) {
	case 'wait':	disabled.value = true;	break;

	case 'cancel':
		oWss.value['cnv.font.subset'] = ! oWss.value['cnv.font.subset'];
		disabled.value = false;
		break;

	case 'comp':	disabled.value = false;	break;
}});

const selectIcon = ()=> cmd2Ex(<T_V2E_SELECT_FILE>{
	cmd		: 'selectFile',
	title		: 'アプリアイコン',
	openlabel	: '素材画像を選択',
	id		: 'icon',
	path	: 'build/icon.png',
});

const srcIcon = ref('data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjY0MCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCIgdmlld0JveD0iMCAwIDY0MCA2NDAiIHdpZHRoPSI2NDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxwYXRoIGlkPSJhIiBkPSJtMCAzMjBjMCAxNzYuNzIgMTQzLjI4IDMyMCAzMjAgMzIwczMyMC0xNDMuMjggMzIwLTMyMC0xNDMuMjgtMzIwLTMyMC0zMjAtMzIwIDE0My4yOC0zMjAgMzIwem0yMDAgMTAwdi0yMDBoODB2MjAwem0xNjAgMHYtMjAwaDgwdjIwMHoiLz48L2RlZnM+PHBhdGggZD0ibTE0Ny40OSAxODAuNDFoMzUyLjR2MjgyLjY5aC0zNTIuNHoiIGZpbGw9IiNmZmYiLz48dXNlIGZpbGw9IiMyZTJlMmUiIHhsaW5rOmhyZWY9IiNhIi8+PHVzZSBmaWxsPSJub25lIiB4bGluazpocmVmPSIjYSIvPjwvc3ZnPg==');
const updImg = (src: string)=> srcIcon.value = src +'?'+ (new Date()).getTime();
on('!', data=> updImg(data.pathIcon));
on('updimg', data=> {
	if (data.id !== 'img.icon') return;
	updImg(data.src);
});

</script>