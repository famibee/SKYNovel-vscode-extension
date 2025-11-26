/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {FULL_PATH, PROJECT_PATH, WORKSPACE_PATH} from './CmnLib';

//MARK: 設定パネル
export type T_WSS = {
	'cnv.font.subset'		: boolean;
//	'cnv.icon.cut_round'	: boolean;		// 使用廃止、cnv.icon.shape に切り替え
	'cnv.icon.shape'		: number;
	'cnv.mat.pic'			: boolean;
	'cnv.mat.webp_quality'	: number;
	'cnv.mat.snd'			: boolean;
	'cnv.mat.snd.codec'		: string;
}
export type TK_WSS = keyof T_WSS;

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const DEF_WSS: T_WSS = {
	'cnv.font.subset'		: false,
	'cnv.icon.shape'		: 0,
	'cnv.mat.pic'			: false,
	'cnv.mat.webp_quality'	: 90,
	'cnv.mat.snd'			: false,
	'cnv.mat.snd.codec'		: 'opus',
} as const;


// --------------------------------------------------------------------
//MARK: prj.json
export type T_CFG = {
	book?	: {
		title?		: string;	// 作品タイトル
		creator?	: string;	// 著作者
		cre_url?	: string;	// 連絡先URL
		publisher?	: string;	// 出版者
		pub_url?	: string;	// 出版社URL
		detail?		: string;	// 内容紹介
		version?	: string;	// version
	};
	save_ns?		: string;
	window?	: {		// アプリケーションウインドウサイズ
		width	: number;
		height	: number;
	};
	log?	: {max_len: number};	// プレイヤーが読んだ文章を読み返せる履歴の長さ
	init?	: {
		bg_color			: string;	// 背景色
		tagch_msecwait		: number;	// 通常文字表示待ち時間（未読／既読）
		auto_msecpagewait	: number;	// 自動文字表示、行待ち時間（未読／既読）
		escape				: string;	// エスケープ文字
	};
	debug?	: {	// デバッグ情報
		devtool		: boolean;
		dumpHtm		: boolean;
		token		: boolean;
		tag			: boolean;
		putCh		: boolean;
		debugLog	: boolean;
		baseTx		: boolean;
		masume		: boolean;	// テキストレイヤ：ガイドマス目を表示するか
		variable	: boolean;
	},
	code?	: {[fold_nm: string]: boolean};	// 暗号化しないフォルダ
	debuger_token?	: string;	// デバッガとの接続トークン
}

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
		dumpHtm		: false,
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
} as const;

// vueテスト用
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
		dumpHtm		: false,
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
} as const;


// --------------------------------------------------------------------
//MARK: cut_round
export type T_BJ_cut_round = {
	order: {
		wp_src		: WORKSPACE_PATH;
		is_src_pp	: boolean;
		shape		: number;
		wp_dest		: WORKSPACE_PATH;
		is_new_tmp	: boolean;
	};

	err: string;
}


// --------------------------------------------------------------------
//MARK: cnv_psd_face
export type T_BJ_Psd2Layer = {
	aOrder: {
		fp_tmp	: FULL_PATH;
		extend: {
			left		: number;
			right		: number;
			top			: number;
			bottom		: number;
			background	: {r: number; g: number; b: number; alpha: number};
		};
		pp_out	: PROJECT_PATH;
	}[];

	err: string;
}


// --------------------------------------------------------------------
// core/font/font.json
//	フォントごとに用意すべき文字集合
export type T_FONTJSON = {
	inp		: string;	// フォントファイルへのパス
	txt		: string;	// （全スクリプトにおいて）使用されている文字集合
}
export type T_H_FONTJSON = {[font_nm: string]: T_FONTJSON};

export const H_FONTJSON_nm_DEF_FONT = ':DEF_FONT:';


// フォントと使用文字情報
export type T_H_FONT2STR = {
	[font_nm: string]: string;
}

// 診断情報生成用
export type T_INF_INTFONT = {
	defaultFontName	: string;
	hSn2Font2Str	: {[pp: PROJECT_PATH]: T_H_FONT2STR};
	hFp2FontErr		: {[fp: FULL_PATH]: {
						err	: string;
						nm	: string;
						sl	: number;
						sc	: number;
						el	: number;
						ec	: number;
					}[]};
}

//MARK: subset_font
export type T_BJ_subset_font = {	// core/font/subset_font.json
	inp		: string;
	out		: string;
	iSize	: number;
	oSize	: number;
	err		: string;
}
export type T_H_BJ_subset_font = {[nm: string]: T_BJ_subset_font};

// 2Vue
export type T_A_CNVFONT = {
	nm		: string;
	mes		: string;
	iSize	: number;
	oSize	: number;
	err		: string;
}[]


// --------------------------------------------------------------------
//MARK: cnv_mat_pic
export type T_OPTPIC_FILE = {
	baseSize	: number;
	webpSize	: number;
	fld_nm		: string;
	ext			: ''|'jpg'|'jpeg'|'png';
	webp_q?		: number;
}
export type T_OPTPIC_FILE_AND_KEY = {
	key		: number;
	nm		: string;
	id		: string;
} & T_OPTPIC_FILE;
export type T_BJ_OPTPIC = {
	order: {
		quality			: number;
		FLD_PRJ_BASE	: string;
	},
	aOrder: {
		pathPrj	: PROJECT_PATH;
		pathBase: WORKSPACE_PATH;
	}[];

	sum: {
		baseSize		: number;
		webpSize		: number;
		pathPicCmpWebP	: string;
		pathPicCmpBase	: string;
	};
	hSize: {[fn: string]: T_OPTPIC_FILE};
}

export function creBJ_OPTPIC(): T_BJ_OPTPIC {return {
	order: {
		quality	: 0,
		FLD_PRJ_BASE	: '',
	},
	aOrder: [],
	sum: {
		baseSize		: 0,
		webpSize		: 0,
		pathPicCmpWebP	: '',
		pathPicCmpBase	: '',
	},
	hSize	: {},
}}
export function creBJ_OPTPIC4TST(): T_BJ_OPTPIC {return {
	order: {
		quality	: 0,
		FLD_PRJ_BASE	: '',
	},
	aOrder: [],
	sum: {
		baseSize		: 4510000,
		webpSize		: 1550000,
		pathPicCmpWebP	: '../',
		pathPicCmpBase	: '../',
	},
	hSize: {	// ソートテストのため、わざとソートを乱す
		'title_base'	: {baseSize: 6000, webpSize: 1000, fld_nm: 'test/title_base', ext: 'jpg'},
		'breakpage_b'	: {baseSize: 6002, webpSize: 3000, fld_nm: 'test/breakpage_b', ext: 'png', webp_q: 45,},
		'breakline.5x20': {baseSize: 6001, webpSize: 2000, fld_nm: 'test/breakline.5x20', ext: 'png'},
	},
}}


// --------------------------------------------------------------------
//MARK: cnv_mat_snd
export type T_OPTSND_FILE = {
	baseSize	: number;
	optSize		: number;
	fld_nm		: string;
	ext			: ''|'mp4'|'wav';	// mp3|opus|m4a|ogg|aac|flac|wav
//	webp_q?		: number;
}
export type T_OPTSND_FILE_AND_KEY = {
	key		: number;
	nm		: string;
	id		: string;
} & T_OPTSND_FILE;
export type T_OPTSND = {
	sum: {
		baseSize	: number;
		optSize		: number;
		pathSndOpt	: string;
		pathSndBase	: string;
	};
	hSize: {[fn: string]: T_OPTSND_FILE};
}
export function creOPTSND(): T_OPTSND {return {
	sum: {
		baseSize	: 0,
		optSize		: 0,
		pathSndOpt	: '',
		pathSndBase	: '',
	},
	hSize	: {},
}}
export function creOPTSND4TST(): T_OPTSND {return {
	sum: {
		baseSize	: 4510001,
		optSize		: 1550001,
		pathSndOpt	: '../',
		pathSndBase	: '../',
	},
	hSize: {	// ソートテストのため、わざとソートを乱す
		'free0509'	: {baseSize: 4000, optSize: 1010, fld_nm: 'test/free0509', ext: 'wav'},
		'bow'	: {baseSize: 4002, optSize: 3010, fld_nm: 'test/bow', ext: 'mp4',},
		'wood04': {baseSize: 4001, optSize: 2010, fld_nm: 'test/wood04', ext: 'wav'},
	},
}}


// --------------------------------------------------------------------
//MARK: テンプレート
export const REG_SN2TEMP = /;[^\n]*|(?:&(\S+)|\[let\s+name\s*=\s*(\S+)\s+text)\s*=\s*((["'#]).+?\4|[^;\s]+)(?:[^;\n]*;(.*))?/g;	// https://regex101.com/r/FpmGwf/1

export type T_TEMP = {
	id		: string;
	nm		: string;
	lbl		: string;
	type	: 'txt'|'num'|'rng'|'chk'|'fn'|'fn_grp'|'fn_snd';
						// TODO: type別の選択処理か
	val		: string;
	bol?	: boolean;
	num?	: number;
	max?	: number;
	min?	: number;
	step?	: number;
}
export const DEF_TEMP: T_TEMP[] = []
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
] as const;


// --------------------------------------------------------------------
//MARK: Ex2Vue
export type T_E2V_INIT = {
	cmd		: '!';
	oCfg	: T_CFG;
	oWss	: T_WSS;
	pathIcon: string;
	fld_src	: string;
	oTemp	: T_E2V_TEMP_SUB;
}

export type T_E2V_CFG = {
	cmd		: 'update.oCfg';
	oCfg	: T_CFG;
}

type T_E2V_INITVUE = {	// stVSCode.ts -> 他の Vue へ
	cmd		: 'init.Vue';
}

export type T_E2V_CNVFONT = {
	cmd			: 'update.cnvFont';
	aCnvFont	: T_A_CNVFONT;
}
export type T_E2V_OPTPIC = {
	cmd			: 'update.optPic';
	oOptPic		: T_BJ_OPTPIC;
}
export type T_E2V_OPTSND = {
	cmd			: 'update.optSnd';
	oOptSnd		: T_OPTSND;
}

export type T_E2V_NOTICE_COMPONENT = {
	cmd		: 'notice.Component';
	id		: 'cnv.font.subset'|'cnv.mat.pic'
			|'cnv.mat.snd'|'cnv.mat.snd.codec';
	mode	: 'wait'|'comp'|'cancel';
}

export type T_E2V_TEMP = T_E2V_TEMP_SUB & {
	cmd		: 'update.aTemp';
}
	export type T_E2V_TEMP_SUB = {
		aTemp	: T_TEMP[];
		err		: string;
	};

export type T_E2V_SELECT_ICON_INFO = {
	cmd			: 'updpic';
	pathIcon	: string;
	err_mes		: string;
}

export type T_E2V
	= T_E2V_INIT
	| T_E2V_CFG
	| T_E2V_INITVUE
	| T_E2V_CNVFONT
	| T_E2V_OPTPIC
	| T_E2V_OPTSND
	| T_E2V_NOTICE_COMPONENT
	| T_E2V_TEMP
	| T_E2V_SELECT_ICON_INFO
;
export type T_Ex2Vue_cmd = T_E2V['cmd'];


// --------------------------------------------------------------------
//MARK: Vue2Ex
export type T_V2E_Q = {
	cmd		: '?';
}

export type T_V2E_CFG = {
	cmd		: 'update.oCfg';
	oCfg	: T_CFG;
}

export type T_V2E_CHG_RANGE_WEBP_Q_DEF = {
	cmd		: 'change.range.webp_q_def';
	webp_q	: number;
}

export type T_V2E_CHG_RANGE_WEBP_Q = {
	cmd		: 'change.range.webp_q';
	nm		: string;
	no_def	: boolean;
	webp_q	: number;
}

export type T_V2E_oWss = {
	cmd		: 'update.oWss';
	oWss	: T_WSS;
}

export type T_V2E_aTemp = {
	cmd		: 'update.aTemp';
	aRes	: {
		nm		: string;
		val		: string;
	}[]
}

type T_V2E_info = {
	cmd		: 'info';
	mes		: string;
}

type T_V2E_warn = {
	cmd		: 'warn';
	mes		: string;
}

type T_V2E_openURL = {
	cmd		: 'openURL';
	url		: string;
}

type T_V2E_copyTxt = {
	cmd		: 'copyTxt';
	id		: string;
}

export type T_V2E_selectFile = {
	cmd			: 'selectFile';
	title		: string;
	openlabel	: string;
	path		: string;
}

export type T_V2E
	= T_V2E_Q
	| T_V2E_CFG
	| T_V2E_CHG_RANGE_WEBP_Q_DEF
	| T_V2E_CHG_RANGE_WEBP_Q
	| T_V2E_oWss
	| T_V2E_aTemp
	| T_V2E_info
	| T_V2E_warn
	| T_V2E_openURL
	| T_V2E_copyTxt
	| T_V2E_selectFile

export type T_Vue2Ex_cmd = T_V2E['cmd'];

// --------------------------------------------------------------------
//MARK: テンプレ選択パネル
export type T_TMPWIZ = {
	cmd		: 'get'|'info'|'input'|'tmp_cjs_hatsune'|'tmp_cjs_uc'|'tmp_cjs_sample'|'tmp_esm_uc';
	id		: string;
	text	: string;
	val		: string;
}
