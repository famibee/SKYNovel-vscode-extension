<template>
<div class="row">

<div class="col-6 col-sm-6 px-1 pb-2" :class="{'was-validated': mv_title.valid}">
	<label for="book.title" class="form-label">作品タイトル名</label>
	<input type="text" id="book.title" v-model="v_title" class="form-control form-control-sm" :class="{'is-invalid': !mv_title.valid}" @input="subscribe" placeholder="（日本語名でＯＫ）" aria-label="作品タイトル名" aria-describedby="Title"/>
	<div class="invalid-feedback" v-text="em_title"></div>
</div>
<div class="col-6 col-sm-6 px-1 pb-2" :class="{'was-validated': mv_save_ns.valid}">
	<label for="save_ns" class="form-label">プロジェクト名</label>
	<input type="text" id="save_ns" v-model="v_save_ns" class="form-control form-control-sm" :class="{'is-invalid': !mv_save_ns.valid}" @input="subscribe" placeholder="com.fc2.blog.famibee 的な出版者ＵＲＬの逆順ドメイン推奨" aria-label="プロジェクト名" aria-describedby="Project name"/>
	<div class="invalid-feedback" v-text="em_save_ns"></div>
</div>

<div class="col-6 col-sm-6 px-1 py-2" :class="{'was-validated': mv_creator.valid}">
	<label for="book.creator" class="form-label">著作者</label>
	<input type="text" id="book.creator" v-model="v_creator" class="form-control form-control-sm" :class="{'is-invalid': !mv_creator.valid}" @input="subscribe" placeholder="ペンネーム、ハンドル名など" aria-label="著作者" aria-describedby="Contact"/>
	<div class="invalid-feedback" v-text="em_creator"></div>
</div>
<div class="col-6 col-sm-6 px-1 py-2" :class="{'was-validated': mv_cre_url.valid}">
	<label for="book.cre_url" class="form-label">連絡先URL・mail</label>
	<div class="input-group input-group-sm has-validation">
		<input type="text" id="book.cre_url" v-model="v_cre_url" class="form-control form-control-sm" :class="{'is-invalid': !mv_cre_url.valid}" @input="subscribe" placeholder="メアド、SNSなど" aria-label="連絡先ＵＲＬ" aria-describedby="Contact URL">
		<button type="button" class="btn btn-info" @click="openURL(v_cre_url)" :disabled="!mv_cre_url.valid">Open</button>
		<div class="invalid-feedback" v-text="em_cre_url"></div>
	</div>
</div>

<div class="col-6 col-sm-6 px-1 py-2" :class="{'was-validated': mv_publisher.valid}">
    <label for="book.publisher" class="form-label">出版者</label>
    <input type="text" id="book.publisher" v-model="v_publisher" class="form-control form-control-sm" :class="{'is-invalid': !mv_publisher.valid}" @input="subscribe" placeholder="サークル名、団体名など" aria-label="出版者" aria-describedby="Publisher"/>
	<div class="invalid-feedback" v-text="em_publisher"></div>
</div>
<div class="col-6 col-sm-6 px-1 py-2" :class="{'was-validated': mv_pub_url.valid}">
	<label for="book.pub_url" class="form-label">出版者URL</label>
	<div class="input-group input-group-sm has-validation">
		<input type="url" id="book.pub_url" v-model="v_pub_url" class="form-control form-control-sm" :class="{'is-invalid': !mv_pub_url.valid}" @input="subscribe" placeholder="ご自身の公式サイトなど" aria-label="出版者ＵＲＬ" aria-describedby="Publisher URL"/>
		<button type="button" class="btn btn-info" @click="openURL(v_pub_url)" :disabled="!mv_pub_url.valid">Open</button>
		<div class="invalid-feedback" v-text="em_pub_url"></div>
	</div>
</div>

<div class="col-12 px-1 py-3" :class="{'was-validated': mv_detail.valid}">
	<label for="book.detail" class="form-label">内容：プロジェクトの説明</label>
	<textarea id="book.detail" class="form-control form-control-sm" :class="{'is-invalid': !mv_detail.valid}" v-model="v_detail" @input="subscribe" placeholder="インストーラーに表示する内容説明" aria-label="プロジェクトの説明" aria-describedby="Project description"></textarea>
	<div class="invalid-feedback" v-text="em_detail"></div>
</div>

</div>
</template>


<script setup lang="ts">
import {useCfg} from '../store/stCfg';
import {storeToRefs} from 'pinia';
import {useField} from 'vee-validate';
import * as yup from 'yup';
import {openURL, on} from '../store/stVSCode';
import {T_CFG} from '../types';
import {toRaw} from 'vue';

const stCfg = useCfg();
const {oCfg} = storeToRefs(stCfg);	// 分割代入

yup.setLocale({
	mixed: {
		required	: '必須入力項目です',
		notOneOf	: 'あなたの作品情報に変更してください',
	},
	string: {
		url		: 'URL形式ではありません',
	}
});


const {value: v_save_ns, errorMessage: em_save_ns, meta: mv_save_ns} = useField<string>(
	'oCfg.save_ns',
	yup.string().required()
	.matches(/^[\w\.]+$/, '英数字か[_.]のみです')
	.notOneOf(['hatsune', 'uc']),
	{initialValue: oCfg.value.save_ns},	// ブラウザテスト用、VSCodeで上書き
);
const {value: v_title, errorMessage: em_title, meta: mv_title} = useField<string>(
	'oCfg.book.title',
	yup.string().required()
	.notOneOf(['初音館にて', '桜の樹の下には']),
	{initialValue: oCfg.value.book.title},	// ブラウザテスト用、VSCodeで上書き
);

const {value: v_creator, errorMessage: em_creator, meta: mv_creator} = useField<string>(
	'oCfg.book.creator',
	yup.string().required()
	.notOneOf(['ふぁみべぇ']),
	{initialValue: oCfg.value.book.creator},	// ブラウザテスト用、VSCodeで上書き
);
const {value: v_cre_url, errorMessage: em_cre_url, meta: mv_cre_url} = useField<string>(
	'oCfg.book.cre_url',
	yup.string().required()
	.notOneOf(['https://twitter.com/famibee','https://twitter.com/ugainovel'])
	.test(
		'is-url_or_mail',
		()=> 'URL（https:〜）かメールアドレスを指定してください',
		(v = '')=> /https?:\/\//.test(v)
			? yup.string().url().isValid(v)
			: yup.string().email().isValid(v)
	),
	{initialValue: oCfg.value.book.cre_url},	// ブラウザテスト用、VSCodeで上書き
);

const {value: v_publisher, errorMessage: em_publisher, meta: mv_publisher} = useField<string>(
	'oCfg.book.publisher',
	yup.string().required()
	.notOneOf(['電子演劇部']),
	{initialValue: oCfg.value.book.publisher},	// ブラウザテスト用、VSCodeで上書き
);
const {value: v_pub_url, errorMessage: em_pub_url, meta: mv_pub_url} = useField<string>(
	'oCfg.book.pub_url',
	yup.string().required().url()
	.notOneOf(['https://famibee.blog.fc2.com/','https://ugainovel.blog.fc2.com/']),
	{initialValue: oCfg.value.book.pub_url},	// ブラウザテスト用、VSCodeで上書き
);

const {value: v_detail, errorMessage: em_detail, meta: mv_detail} = useField<string>(
	'oCfg.book.detail',
	yup.string().required()
	.notOneOf([
		'江戸川乱歩「孤島の鬼」二次創作ノベルゲームサンプルです。',
		'梶井基次郎「桜の樹の下には」をノベルゲーム化したものです。'
	]),
	{initialValue: oCfg.value.book.detail},	// ブラウザテスト用、VSCodeで上書き
);

on('init', ()=> {	// useField()の後に初期値を更新したいので
	const o: T_CFG = oCfg.value;
	v_save_ns.value = o.save_ns;
	v_title.value = o.book.title;
	v_creator.value = o.book.creator;
	v_cre_url.value = o.book.cre_url;
	v_publisher.value = o.book.publisher;
	v_pub_url.value = o.book.pub_url;
	v_detail.value = o.book.detail;
});

// useField を使うと $subscribe が効かないので
const subscribe = ()=> {
	// 変更後の $state が取れないので手動作成
	const o: T_CFG = toRaw(oCfg.value);
	const o2: T_CFG = {
		...o, save_ns: v_save_ns.value,
		book: {
			...o.book,
			title		: v_title.value,
			creator		: v_creator.value,
			cre_url		: v_cre_url.value,
			publisher	: v_publisher.value,
			pub_url		: v_pub_url.value,
			detail		: v_detail.value,
		}
	};
	stCfg.subscribe(o2);
};

</script>