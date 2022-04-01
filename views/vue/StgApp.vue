<template>
<div class="row">

<div class="col-6 col-md-3 px-1 py-2" :class="{'was-validated': mv_width.valid}">
    <label for="book.width" class="form-label">アプリの横幅</label>
    <input type="number" id="book.width" v-model="v_width" class="form-control form-control-sm" :class="{'is-invalid': !mv_width.valid}" @input="subscribe" placeholder="横幅ドット数" aria-label="アプリの横幅" aria-describedby="Width of application display area"/>
	<div class="invalid-feedback" v-text="em_width"></div>
</div>
<div class="col-6 col-md-3 px-1 py-2" :class="{'was-validated': mv_height.valid}">
    <label for="book.height" class="form-label">アプリの縦幅</label>
    <input type="number" id="book.height" v-model="v_height" class="form-control form-control-sm" :class="{'is-invalid': !mv_height.valid}" @input="subscribe" placeholder="縦幅ドット数" aria-label="アプリの縦幅" aria-describedby="Weight of application display area"/>
	<div class="invalid-feedback" v-text="em_height"></div>
</div>

<div class="col-6 col-md-3 px-1 py-2" :class="{'was-validated': mv_version.valid}">
    <label for="book.version" class="form-label">バージョン</label>
    <input type="text" id="book.version" v-model="v_version" class="form-control form-control-sm" :class="{'is-invalid': !mv_version.valid}" @input="subscribe" placeholder="1.0.0 など" aria-label="バージョン" aria-describedby="version"/>
	<div class="invalid-feedback" v-text="em_version"></div>
</div>

<div class="col-6 col-md-3 px-1 py-2" :class="{'was-validated': mv_max_len.valid}">
    <label for="book.max_len" class="form-label">ログ保存長</label>
    <input type="number" id="book.max_len" v-model="v_max_len" class="form-control form-control-sm" :class="{'is-invalid': !mv_max_len.valid}" @input="subscribe" placeholder="何ページ分保存するか" aria-label="ログ保存長" aria-describedby="Log retention length"/>
	<div class="invalid-feedback" v-text="em_max_len"></div>
</div>

<div class="col-12 px-1 pt-3"><h5>初期値</h5></div>
<div class="col-6 col-md-3 px-1 py-2" :class="{'was-validated': mv_tagch_msecwait.valid}">
    <label for="book.tagch_msecwait" class="form-label">文字表示待ち時間(ms)</label>
    <input type="number" id="book.tagch_msecwait" v-model="v_tagch_msecwait" class="form-control form-control-sm" :class="{'is-invalid': !mv_tagch_msecwait.valid}" @input="subscribe" placeholder="ミリ秒単位で指定" aria-label="文字表示待ち時間(ms)" aria-describedby="Character display waiting time"/>
	<div class="invalid-feedback" v-text="em_tagch_msecwait"></div>
</div>
<div class="col-6 col-md-3 px-1 py-2" :class="{'was-validated': mv_auto_msecpagewait.valid}">
    <label for="book.auto_msecpagewait" class="form-label">自動読み時文字表示待ち(ms)</label>
    <input type="number" id="book.auto_msecpagewait" v-model="v_auto_msecpagewait" class="form-control form-control-sm" :class="{'is-invalid': !mv_auto_msecpagewait.valid}" @input="subscribe" placeholder="ミリ秒単位で指定" aria-label="自動読み時文字表示待ち時間(ms)" aria-describedby="Waiting time for character display during automatic reading"/>
	<div class="invalid-feedback" v-text="em_auto_msecpagewait"></div>
</div>

<div class="col-6 col-md-3 px-1 py-2" :class="{'was-validated': mv_escape.valid}">
    <label for="book.escape" class="form-label">エスケープ文字</label>
    <input type="text" id="book.escape" v-model="v_escape" class="form-control form-control-sm" :class="{'is-invalid': !mv_escape.valid}" @input="subscribe" placeholder="半角記号推奨" aria-label="エスケープ文字" aria-describedby="Escape character"/>
	<div class="invalid-feedback" v-text="em_escape"></div>
</div>

<div class="col-6 col-md-3 px-1 py-2">
    <label for="book.bg_color" class="form-label">背景色</label>
    <input type="color" id="book.bg_color" v-model="v_bg_color" class="form-control form-control-sm form-control-color" @input="subscribe" aria-label="背景色" aria-describedby="Background color"/>
</div>

</div>
</template>


<script setup lang="ts">
import {useCfg} from '../store/stCfg';
import {storeToRefs} from 'pinia';
import {useField} from 'vee-validate';
import * as yup from 'yup';
import {on} from '../store/stVSCode';
import {T_CFG} from '../types';
import {toRaw} from 'vue';

const stCfg = useCfg();
const {oCfg} = storeToRefs(stCfg);	// 分割代入

const {value: v_width, errorMessage: em_width, meta: mv_width} = useField<string>(
	'oCfg.window.width',
	yup.number().required('必須の項目です').integer('整数にして下さい')
	.min(300, '最小値 300 以上にして下さい'),
	{initialValue: String(oCfg.value.window.width)},	// ブラウザテスト用、VSCodeで上書き
);
const {value: v_height, errorMessage: em_height, meta: mv_height} = useField<string>(
	'oCfg.window.height',
	yup.number().required('必須の項目です').integer('整数にして下さい')
	.min(300, '最小値 300 以上にして下さい'),
	{initialValue: String(oCfg.value.window.height)},	// ブラウザテスト用、VSCodeで上書き
);

const {value: v_version, errorMessage: em_version, meta: mv_version} = useField<string>(
	'oCfg.version',
	yup.string().required('必須の項目です')
	.matches(/^[\w\.\-]+$/, '英数字か[_-.]のみです'),
	{initialValue: oCfg.value.book.version},	// ブラウザテスト用、VSCodeで上書き
);

const {value: v_max_len, errorMessage: em_max_len, meta: mv_max_len} = useField<string>(
	'oCfg.window.max_len',
	yup.number().required('必須の項目です').integer('整数にして下さい')
	.min(10, '最小値 10 以上にして下さい'),
	{initialValue: String(oCfg.value.log.max_len)},	// ブラウザテスト用、VSCodeで上書き
);

const {value: v_tagch_msecwait, errorMessage: em_tagch_msecwait, meta: mv_tagch_msecwait} = useField<string>(
	'oCfg.window.tagch_msecwait',
	yup.number().required('必須の項目です').integer('整数にして下さい')
	.min(1, '最小値 1 以上にして下さい'),
	{initialValue: String(oCfg.value.init.tagch_msecwait)},	// ブラウザテスト用、VSCodeで上書き
);
const {value: v_auto_msecpagewait, errorMessage: em_auto_msecpagewait, meta: mv_auto_msecpagewait} = useField<string>(
	'oCfg.window.auto_msecpagewait',
	yup.number().required('必須の項目です').integer('整数にして下さい')
	.min(1, '最小値 1 以上にして下さい'),
	{initialValue: String(oCfg.value.init.auto_msecpagewait)},	// ブラウザテスト用、VSCodeで上書き
);

const {value: v_escape, errorMessage: em_escape, meta: mv_escape} = useField<string>(
	'oCfg.escape',
	yup.string().matches(/^[^ &()*;[\]]*$/, '推奨されない文字です'),
	{initialValue: oCfg.value.init.escape},	// ブラウザテスト用、VSCodeで上書き
);

const {value: v_bg_color} = useField<string>(
	'oCfg.window.bg_color',
	yup.number().required('必須の項目です'),
	{initialValue: String(oCfg.value.init.bg_color)},	// ブラウザテスト用、VSCodeで上書き
);


on('init', ()=> {	// useField()の後に初期値を更新したいので
	const o: T_CFG = oCfg.value;
	v_width.value = String(o.window.width);
	v_height.value = String(o.window.height);
	v_version.value = String(o.book.version);
	v_max_len.value = String(o.log.max_len);
	v_tagch_msecwait.value = String(o.init.tagch_msecwait);
	v_auto_msecpagewait.value = String(o.init.auto_msecpagewait);
	v_escape.value = String(o.init.escape);
	v_bg_color.value = String(o.init.bg_color);
});

// useField を使うと $subscribe が効かないので
const subscribe = ()=> {
	// 変更後の $state が取れないので手動作成
	const o: T_CFG = toRaw(oCfg.value);
	stCfg.subscribe(<T_CFG>{	// 二段階目も個別にコピー
		...o,
		book	: {...o.book, version: v_version.value,},
		window	: {
			width	: Number(v_width.value),
			height	: Number(v_height.value),
		},
		log		: {max_len: Number(v_max_len.value)},
		init	: {
			tagch_msecwait		: Number(v_tagch_msecwait.value),
			auto_msecpagewait	: Number(v_auto_msecpagewait.value),
			escape		: v_escape.value.replaceAll(/[ &()*;[\]]/g, ''),
							// 本体の正規表現に都合悪い（グループに誤解釈など）文字削除
			bg_color	: v_bg_color.value,
		},
	});
};

</script>