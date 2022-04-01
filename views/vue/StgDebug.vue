<template>
<div class="row">
<div class="col-12 px-1 pt-3"><h5>暗号化しないフォルダ</h5></div>

<div v-for="(_v, nm) in oCfg.code" class="col-4 col-sm-3 col-lg-2 col-xxl-1"><div class="form-check">
	<input :id="'code.'+ nm" class="form-check-input mb-3 sn_checkbox" type="checkbox" v-model="oCfg.code[nm]">
	<label class="form-check-label" v-text="nm"></label>
</div></div>


<div class="col-12 px-1 pt-3"><h5>デバッグスイッチ</h5></div>

<div v-for="(_v, nm) in oCfg.debug" class="col-4 col-sm-3 col-lg-2 col-xxl-1"><div class="form-check">
	<input :id="'debug.'+ nm" class="form-check-input mb-3 sn_checkbox" type="checkbox" v-model="oCfg.debug[nm]">
	<label class="form-check-label" :for="'debug.'+ nm" v-text="nm"></label>
</div></div>


<div class="col-12 px-1 pt-3"><h5>セーブデータ保存先を開く</h5></div>

<div class="col-6 col-sm-6 px-1 py-2"><form class="form-check">
	<label class="form-label" for="open.dev.save_path">参考資料：開発者向け情報</label>
	<div class="input-group input-group-sm">
		<span class="input-group-text">【セーブデータの保存場所】</span>
		<button class="btn btn-info btn-lg" type="button" id="open.dev.save_path" @click="openURL('https://famibee.github.io/SKYNovel/dev.html#save_path')">Open</button>
	</div>
</form></div>

<div class="col-6 col-sm-6 px-1 py-2"><form class="form-check">
	<label class="form-label">ブラウザ版</label>
	<div class="input-group input-group-sm">
		<span class="input-group-text">ブラウザのローカルストレージに保存されます</span>
	</div>
</form></div>

<div class="col-6 col-sm-6 px-1 py-2"><form class="form-check">
	<label class="form-label" for="copy.folder_save_app">アプリ版（通常実行）</label>
	<div class="input-group input-group-sm">
		<span class="input-group-text">手動で開いて下さい</span>
		<button class="btn btn-info" type="button" id="copy.folder_save_app" @click="copyTxt('copy.folder_save_app')">Copy Path</button>
	</div>
</form></div>

<div class="col-6 col-sm-6 px-1 py-2"><form class="form-check">
	<label class="form-label" for="open.folder_save_dbg">アプリ版（デバッグ実行）</label>
	<div class="input-group input-group-sm">
		<span class="input-group-text">.vscode/storage/</span>
		<button class="btn btn-info" type="button" id="open.folder_save_dbg" @click="openURL('ws-folder:///.vscode/storage/')">Open</button>
	</div>
</form></div>

</div>
</template>


<script setup lang="ts">
import {useCfg} from '../store/stCfg';
import {storeToRefs} from 'pinia';
import {openURL, copyTxt} from '../store/stVSCode';

const stCfg = useCfg();
const {oCfg} = storeToRefs(stCfg);	// 分割代入

</script>