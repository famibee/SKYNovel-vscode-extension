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
		<input type="checkbox" id="cnv.font.subset" v-model="oWss['cnv.font.subset']" :disabled="hDisabled['cnv.font.subset']" class="form-check-input sn_checkbox sn-chk"/>
		<label for="cnv.font.subset" class="form-check-label">必要最小限にする</label>
	</div>
</div>


<div class="col-12 px-1 py-3">
	<label class="form-label">フォント情報</label>
<table class="table table-striped"><thead><tr>
	<th>Filename</th>
	<th>元ファイルの場所</th>
	<th style="text-align: right;">Size（元ファイル）</th>
	<th style="text-align: right;">Size（出力結果）</th>
	<th>削減率</th>
	<th>ログ</th>
</tr></thead><tbody>
<template v-for="e in aCnvFont" :key="e.nm">
	<tr :style="{borderBottom: (e.err) ?'hidden' :'inherit'}">
		<td v-text="e.nm"/>
		<td v-text="e.mes"/>
		<td style="text-align: right;" v-text="e.iSize.toLocaleString('ja-JP') +' byte'"/>
		<td style="text-align: right;" v-text="e.oSize.toLocaleString('ja-JP') +' byte'"/>
		<td v-text="(e.oSize / e.iSize).toLocaleString('ja-JP')"/>
		<td>
			<button type="button" id="open.readme.txt" class="btn btn-info btn-sm" @click="openURL(`ws-file:///${fld_src}/font/subset_font_${e.nm}.txt`)">Open</button>
		</td>
	</tr>
	<tr v-if="e.err">
		<td/>
		<td v-text="e.err" colspan="5" style="color: red"/>
	</tr>
</template>
</tbody></table>
</div>


<div class="col-12 px-1 pt-3"><h5>アプリアイコン</h5></div>

<div class="container"><div class="row">
	<div class="col-6 col-lg-2 col-xxl-1">
		<img loading="lazy" :src="srcIcon" @click="selectIcon" class="img-fluid sn-dragdrop"/>
	</div>

	<div class="col-6 col-lg-2 col-xxl-1"><div class="row">
		<div class="col-12 px-1 pt-3"><h6>画像から自動作成</h6></div>

	</div><div class="row">
		<div class="col form-check mb-3">
			<ul class="list-group">
				<li class="list-group-item">
					<input type="radio" class="form-check-input" name="rgCnvIconShape" value="0" v-model="oWss['cnv.icon.shape']" id="rgCnvIconShape0" checked>
					<label class="form-check-label stretched-link" for="rgCnvIconShape0">加工しない</label>
				</li>
				<li class="list-group-item">
					<input type="radio" class="form-check-input" name="rgCnvIconShape" value="1" v-model="oWss['cnv.icon.shape']" id="rgCnvIconShape1">
					<label class="form-check-label stretched-link" for="rgCnvIconShape1">丸に</label>
				</li>
				<li class="list-group-item">
					<input type="radio" class="form-check-input" name="rgCnvIconShape" value="2" v-model="oWss['cnv.icon.shape']" id="rgCnvIconShape2">
					<label class="form-check-label stretched-link" for="rgCnvIconShape2">角丸に</label>
				</li>
			</ul>
		</div>

	</div><div class="row">
		<div class="col form-check mb-3">
			<div class="input-group input-group-sm">
				<button type="button" @click="selectIcon" class="btn btn-info">ファイルを選択</button>
				<span class="alert alert-danger" role="alert" v-text="select_icon_err" v-show="select_icon_err !== ''"></span>
			</div>
		</div>

	</div></div>
</div></div>
</div>

</template>


<script setup lang="ts">
import {openURL, on, cmd2Ex} from '../store/stVSCode';
import {useWss, hDisabled} from '../store/stWSS';
import {storeToRefs} from 'pinia';
import {useOInfo} from '../store/stOInfo';
import {ref} from 'vue';
import type {T_E2V_INIT, T_E2V_SELECT_ICON_INFO, T_V2E_SELECT_ICON_FILE} from '../types';


const stOInfo = useOInfo();
const {aCnvFont} = storeToRefs(stOInfo);

const stWss = useWss();
const {oWss} = storeToRefs(stWss);


const qselectIcon: T_V2E_SELECT_ICON_FILE = {
	cmd			: 'selectFile',
	title		: 'アプリアイコン',
	openlabel	: '素材画像を選択',
	path		: 'build/icon.png',
};
const selectIcon = ()=> cmd2Ex(qselectIcon);

const srcIcon = ref('data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjY0MCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCIgdmlld0JveD0iMCAwIDY0MCA2NDAiIHdpZHRoPSI2NDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxwYXRoIGlkPSJhIiBkPSJtMCAzMjBjMCAxNzYuNzIgMTQzLjI4IDMyMCAzMjAgMzIwczMyMC0xNDMuMjggMzIwLTMyMC0xNDMuMjgtMzIwLTMyMC0zMjAtMzIwIDE0My4yOC0zMjAgMzIwem0yMDAgMTAwdi0yMDBoODB2MjAwem0xNjAgMHYtMjAwaDgwdjIwMHoiLz48L2RlZnM+PHBhdGggZD0ibTE0Ny40OSAxODAuNDFoMzUyLjR2MjgyLjY5aC0zNTIuNHoiIGZpbGw9IiNmZmYiLz48dXNlIGZpbGw9IiMyZTJlMmUiIHhsaW5rOmhyZWY9IiNhIi8+PHVzZSBmaWxsPSJub25lIiB4bGluazpocmVmPSIjYSIvPjwvc3ZnPg==');
const updIconPic = (src: string)=> srcIcon.value = src +'?'+ new Date().getTime();
const fld_src = ref('');
on('!', (d: T_E2V_INIT)=> {
	updIconPic(d.pathIcon);
	fld_src.value = d.fld_src;
});


const select_icon_err = ref('');
on('updpic', (d: T_E2V_SELECT_ICON_INFO)=> {
	updIconPic(d.pathIcon);
	select_icon_err.value = d.err_mes;
});

</script>