/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

export type T_WSS = {
	'cnv.font.subset'		: boolean,
	'cnv.icon.cut_round'	: boolean,
	'cnv.mat.pic'			: boolean,
	'cnv.mat.webp_quality'	: number,
};

export const DEF_WSS: T_WSS = {
	'cnv.font.subset'		: false,
	'cnv.icon.cut_round'	: false,
	'cnv.mat.pic'			: false,
	'cnv.mat.webp_quality'	: 90,
};


export type T_CFG = {
	book	: {
		title		: string,	// 作品タイトル
		creator		: string,	// 著作者
		cre_url		: string,	// 連絡先URL
		publisher	: string,	// 出版者
		pub_url		: string,	// 出版社URL
		detail		: string,	// 内容紹介
		version		: string,	// version
	},
	save_ns		: string,
	window	: {		// アプリケーションウインドウサイズ
		width	: number,
		height	: number,
	},
	log		: {max_len: number},	// プレイヤーが読んだ文章を読み返せる履歴の長さ
	init	: {
		bg_color			: string,	// 背景色
		tagch_msecwait		: number,	// 通常文字表示待ち時間（未読／既読）
		auto_msecpagewait	: number,	// 自動文字表示、行待ち時間（未読／既読）
		escape				: string,	// エスケープ文字
	},
	debug	: {	// デバッグ情報
		devtool		: boolean,
		token		: boolean,
		tag			: boolean,
		putCh		: boolean,
		debugLog	: boolean,
		baseTx		: boolean,
		masume		: boolean,	// テキストレイヤ：ガイドマス目を表示するか
		variable	: boolean,
	},
	code	: {[fold_nm: string]: boolean,},	// 暗号化しないフォルダ
	debuger_token	: string,	// デバッガとの接続トークン
};

export const DEF_CFG: T_CFG = {
	book	: {
		title		: '',
		creator		: '',
		cre_url		: '',
		publisher	: '',
		pub_url		: '',
		detail		: '',
		version		: '1.0',
	},
	save_ns		: '',
	window	: {
		width	: 300,
		height	: 300,
	},
	log		: {max_len: 1024},
	init	: {
		bg_color			: '#000000',
		tagch_msecwait		: 10,
		auto_msecpagewait	: 3500,
		escape				: '',
	},
	debug	: {
		devtool		: false,
		token		: false,
		tag			: false,
		putCh		: false,
		debugLog	: false,
		baseTx		: false,
		masume		: false,
		variable	: false,
	},
	code	: {},
	debuger_token	: '',
};

// vueテスト用
export const DEF_CFG4TST: T_CFG = {
	book	: {
		title		: '(作品タイトル)',
		creator		: '(著作者)',
//		cre_url		: 'https://twitter.com/',
		cre_url		: 'ugainovel@gmail.com',
		publisher	: '(出版者)',
		pub_url		: 'https://ugainovel.blog.fc2.com/',
		detail		: '(内容紹介)',
		version		: '1.2.3',
	},
	save_ns		: 'tst_save_ns',
	window	: {
		width	: 800,
		height	: 600,
	},
	log		: {max_len: 1024},
	init	: {
		bg_color			: '#008800',
		tagch_msecwait		: 10,
		auto_msecpagewait	: 3500,
		escape				: '\\',
	},
	debug	: {
		devtool		: false,
		token		: false,
		tag			: false,
		putCh		: false,
		debugLog	: false,
		baseTx		: false,
		masume		: false,
		variable	: false,
	},
	code	: {script: true, dummy: false},
	debuger_token	: '',
};


export type T_A_FONTINF = {
	nm		: string;
	mes		: string;
	iSize	: number;
	oSize	: number;
}[];

export const DEF_FONTINF: T_A_FONTINF = [
	{nm: 'KFhimajihoso', mes: 'PATH_USER_FONTS', iSize: 10000, oSize: 3000,},
	{nm: 'ipamjm', mes: 'PATH_PRJ_FONTS', iSize: 20000, oSize: 4000,},
];


export type T_CNVMAT_FILE = {
	baseSize	: number;
	webpSize	: number;
	fld_nm		: string,
	ext			: 'jpg'|'jpeg'|'png';
	webp_q?		: number;
};
export type T_CNVMAT_FILE_AND_KEY = {
	nm		: string,
	id		: string,
} & T_CNVMAT_FILE;
export type T_CNVMAT = {
	sum: {
		baseSize		: number;
		webpSize		: number;
		pathImgCmpWebP	: string,
		pathImgCmpBase	: string,
	},
	hSize: {[fn: string]: T_CNVMAT_FILE},
};

export const DEF_CNVMAT: T_CNVMAT = {
	sum: {
		baseSize		: 0,
		webpSize		: 0,
		pathImgCmpWebP	: '',
		pathImgCmpBase	: '',
	},
	hSize	: {},
};
export const DEF_CNVMAT4TST: T_CNVMAT = {
	sum: {
		baseSize		: 4510000,
		webpSize		: 1550000,
		pathImgCmpWebP	: '../',
		pathImgCmpBase	: '../',
	},
	hSize: {	// ソートテストのため、わざとソートを乱す
		'title_base'	: {baseSize: 6000, webpSize: 1000, fld_nm: 'test/title_base', ext: 'jpg'},
		'breakpage_b'	: {baseSize: 6002, webpSize: 3000, fld_nm: 'test/breakpage_b', ext: 'png', webp_q: 45,},
		'breakline.5x20': {baseSize: 6001, webpSize: 2000, fld_nm: 'test/breakline.5x20', ext: 'png'},
	},
};


export const REG_SN2TEMP = /;[^\n]*|(?:&(\S+)|\[let\s+name\s*=\s*(\S+)\s+text)\s*=\s*((["'#]).+?\4|[^;\s]+)(?:[^;\n]*;(.*))?/g;	// https://regex101.com/r/FpmGwf/1

export type T_TEMP = {
	id		: string;
	nm		: string;
	lbl		: string;
	type	: 'txt'|'num'|'rng'|'chk'|'fn'|'fn_grp'|'fn_snd',
						// TODO: type別の選択処理か
	val		: string,
	bol?	: boolean,
	num?	: number,
	max?	: number,
	min?	: number,
	step?	: number,
};
export const DEF_TEMP: T_TEMP[] = []
export const DEF_TEMP4TST: T_TEMP[] = [
	{id: '/setting.sn:sys:TextLayer.Back.Alpha', nm: 'sys:TextLayer.Back.Alpha', lbl: 'メッセージ背景不透明度', type: 'rng', val: '0.7', num: 0.7, max: 1, min: 0, step: 0.05,},
	{id: '/setting.sn:sysse_ok1', nm: 'sysse_ok1', lbl: '軽い決定音', type: 'txt', val: 'BurstB_11'},
	{id: '/setting.sn:sysse_ok2', nm: 'sysse_ok2', lbl: '重い決定音', type: 'txt', val: 'BellA_16'},
	{id: '/setting.sn:sysse_ok2_long', nm: 'sysse_ok2_long', lbl: 'もっと重い決定音', type: 'txt', val: 'BellB_11'},
	{id: '/setting.sn:sysse_cancel', nm: 'sysse_cancel', lbl: 'キャンセル音', type: 'txt', val: 'bell05'},
	{id: '/setting.sn:sysse_choice', nm: 'sysse_choice', lbl: 'マウスオーバー・選択音', type: 'txt', val: 'wood04'},
	{id: '/setting.sn:useSysMenu', nm: 'useSysMenu', lbl: 'メッセージにシステムボタンを配置するか', type: 'chk', val: 'false', bol: false},
	{id: '/setting.sn:def_fonts', nm: 'def_fonts', lbl: 'デフォルトフォント', type: 'txt', val: 'ipamjm, QuiMi_mincho'},
	{id: '/setting.sn:autoResume', nm: 'autoResume', lbl: '（開発用ブラウザ版で）自動レジュームするか', type: 'chk', val: 'true', bol: true},
];


// Ex2Vue
export type T_E2V_INIT = {
	cmd		: '!',
	oCfg	: T_CFG;
	oWss	: T_WSS;
	pathIcon: string;
	oTemp	: T_E2V_TEMP_SUB;
};

export type T_E2V_CFG = {
	cmd		: 'update.oCfg';
	oCfg	: T_CFG;
}

export type T_E2V_AFONTINFO = {
	cmd			: 'update.aFontInfo';
	aFontInfo	: T_A_FONTINF;
};

export type T_E2V_CNVMATINFO = {
	cmd			: 'update.cnvMatInfo';
	oCnvMatInfo	: T_CNVMAT;
};

export type T_E2V_NOTICE_COMPONENT = {
	cmd		: 'notice.Component',
	id		: 'cnv.font.subset'|'cnv.mat.pic',
	mode	: 'wait'|'comp'|'cancel';
};

export type T_E2V_TEMP = T_E2V_TEMP_SUB & {
	cmd		: 'update.aTemp';
};
export type T_E2V_TEMP_SUB = {
	aTemp	: T_TEMP[];
	err		: string;
};


// Vue2Ex
export type T_V2E_WSS = {
	cmd		: 'update.oWss';
	oWss	: T_WSS;
};

export type T_V2E_TEMP = {
	cmd		: 'update.aTemp';
	aRes	: {
		nm		: string;
		val		: string;
	}[]
};

export type T_V2E_SELECT_ICON_FILE = {
	cmd			: 'selectFile',
	title		: 'アプリアイコン',
	openlabel	: '素材画像を選択',
	path		: 'build/icon.png',
};

export type T_E2V_SELECT_ICON_INFO = {
	cmd			: 'updimg';
	pathIcon	: string;
	err_mes		: string;
};

export type T_E2V_CHG_RANGE_WEBP_Q_DEF = {
	cmd		: 'change.range.webp_q_def';
};

export type T_E2V_CHG_RANGE_WEBP_Q = {
	cmd		: 'change.range.webp_q';
	nm		: string;
	no_def	: boolean;
	webp_q	: number;
};
