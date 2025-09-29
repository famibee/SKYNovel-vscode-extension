/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_A_CNVFONT, T_E2V_CNVFONT, T_E2V_NOTICE_COMPONENT} from '../views/types';
import type {T_DIAG_L2S, T_H_ADIAG_L2S} from './CmnLib';
import {foldProc, is_win} from './CmnLib';
import {WatchFile2Batch} from './WatchFile2Batch';

import {existsSync, outputJson, readJson, remove} from 'fs-extra';
import {userInfo} from 'node:os';

const PROC_ID = 'cnv.font.subset';


// フォントと使用文字情報
export type TFONT2STR = {
	[font_nm: string]: string;
};
type TFONT_ERR = {
	err	: string;
	nm	: string;
	sl	: number;
	sc	: number;
	el	: number;
	ec	: number;
};
export type TINF_INTFONT = {
	defaultFontName	: string;
	hSn2Font2Str	: {[sn: string]: TFONT2STR};
	hFp2FontErr		: {[fp: string]: TFONT_ERR[]}
};


export class WfbOptFont extends WatchFile2Batch {
	//MARK: コンストラクタ
	constructor() {
		super();

		const {username} = userInfo();
		this.#aPlaceFont	= [
			`${WatchFile2Batch.PATH_WS}/${WatchFile2Batch.FLD_SRC}/font`,
			is_win
				? `C:/Users/${username}/AppData/Local/Microsoft/Windows/Fonts`
				: `/Users/${username}/Library/Fonts`,
			is_win
				? 'C:/Windows/Fonts'
				: '/Library/Fonts',
		];

		this.#hHead2Mes = {
			'::PATH_PRJ_F'	: `${WatchFile2Batch.FLD_SRC}/font/ 下）`,
			'::PATH_USER_'	: 'OS（ユーザー別）へのインストール済みフォント',
			'::PATH_OS_FO'	: 'OS（ユーザー共通）へのインストール済みフォント',
		};
	}

	//MARK: 初期化
	async init(noticeChgTxt: (fp: string)=> void, noticeDelTxt :(fp: string)=> boolean) {
		// フォントファイルやテキスト系ファイルの監視
		await WatchFile2Batch.watchFld(
			'doc/prj/*/*.{sn,json,woff2,woff,otf,ttf,htm,html,css,js}', '',
			async ()=> {},	// 処理はないが処理を動かしたい
			async ({path}, cre)=> {
				if (cre && /\.ss?n$/.test(path)) WatchFile2Batch.sendNeedGo();
				return noticeChgTxt(path);
			},
			async ({path})=> {
				if (/\.ss?n$/.test(path)) WatchFile2Batch.sendNeedGo();
				return noticeDelTxt(path);
			},
			true,
		);
	}

	//MARK: 変換有効化
	async enable() {
		await this.#subsetFont(true);
		WatchFile2Batch.lasyPathJson();
	}

	//MARK: 変換無効化
	async disable() {
		await this.#subsetFont(false);
		WatchFile2Batch.lasyPathJson();
	}
	//MARK: フォント最適化
	async	#subsetFont(minify: boolean) {
		WatchFile2Batch.watchFile = false;
		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		WatchFile2Batch.ps.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		// 旧フォントファイルはすべて一度削除
		foldProc(
			WatchFile2Batch.PATH_PRJ +'script/',
			async (fp, nm)=> {if (this.#REG_FONT.test(nm)) await remove(fp)},
			()=> {},
		);

		if (! minify) {
			// 【node subset_font.js】を実行。終了を待ったり待たなかったり
			await WatchFile2Batch.exeTask('subset_font', `"${WatchFile2Batch.FLD_SRC}"`);
			this.disp();	// フォント情報更新

			o.mode = 'comp';
			WatchFile2Batch.ps.cmd2Vue(o);
			WatchFile2Batch.watchFile = true;
			return;
		}

		// フォント出現箇所から生成すべき最小限のフォント情報についてまとめる
		const oFont: {[font_nm: string]: {
			inp	: string;
			txt	: string;
		}} = {};
		oFont[this.#DEF_FONT] = {inp: '', txt: ''};

		const ensureFont2Str = (font_nm: string)=> oFont[font_nm] ??= {
			inp	: this.#getFontNm2path(font_nm)
				.replace(new RegExp(`^.+/${WatchFile2Batch.FLD_SRC}/font`), '::PATH_PRJ_FONTS::')
				.replace(
					is_win
					? /C:\/Users\/[^\/]+\/AppData\/Local\/Microsoft\/Windows\/Fonts/
					: /\/Users\/[^\/]+\/Library\/Fonts/,
					'::PATH_USER_FONTS::'
				)
				.replace(is_win ?`C:/Windows/Fonts` :`/Library/Fonts`, '::PATH_OS_FONTS::'),
			txt	: '',
		};
		const o2 = this.#InfFont;
		for (const f2s of Object.values(o2.hSn2Font2Str)) {
			for (const [font_nm, v] of Object.entries(f2s)) {
				ensureFont2Str(font_nm);
				oFont[font_nm]!.txt += v;
			}
		}
		ensureFont2Str(o2.defaultFontName);
			// デフォルトフォントと同じ値を直接値指定する[span]がない場合
		oFont[o2.defaultFontName]!.txt += oFont[this.#DEF_FONT]!.txt;
		delete oFont[this.#DEF_FONT];

		for (const v of Object.values(oFont)) {	// 文字重複しない最小限とするように
			const s = new Set<string>(Array.from(v.txt));	// 一意化
				// txt.split('')や [...txt] はサロゲートペアで問題
			v.txt = [...s].sort().join('');	// sort()は不要だが綺麗
		//	v.txt = [...s].join('');
		}
		const pathFont = `${WatchFile2Batch.PATH_WS}/${WatchFile2Batch.FLD_SRC}/font/`;
		await outputJson(`${pathFont}font.json`, oFont);

		// 【node subset_font.js】を実行。終了を待ったり待たなかったり
		await WatchFile2Batch.exeTask('subset_font', `"${WatchFile2Batch.FLD_SRC}" --minify`);
		this.disp();	// フォント情報更新

		o.mode = 'comp';
		WatchFile2Batch.ps.cmd2Vue(o);
		WatchFile2Batch.watchFile = true;
	}
	readonly	#REG_FONT	= /\.(woff2?|otf|ttf)$/i;
	readonly	#DEF_FONT = ':DEF_FONT:';
	#InfFont	: TINF_INTFONT	= {	// フォントと使用文字情報
		defaultFontName	: '',
		hSn2Font2Str	: {},
		hFp2FontErr		: {},
	};


	updDiag(InfFont: TINF_INTFONT): T_H_ADIAG_L2S {
		this.#InfFont = InfFont;

		const haDiag: T_H_ADIAG_L2S = {};
		for (const [fp, a] of Object.entries(this.#InfFont.hFp2FontErr)) {
			const aD: T_DIAG_L2S[] = [];
			for (const {err, nm} of a) {
				if (this.#getFontNm2path(nm)) continue;

				aD.push({mes: err, sev: 'E'});
			}
			if (aD.length > 0) haDiag[fp] = aD;
		}
		return haDiag;
	}
		#getFontNm2path(font_nm: string): string {
			for (const base of this.#aPlaceFont) {
				for (const ext of ['woff2','otf','ttf','WOFF2','OTF','TTF']) {
					const path = `${base}/${font_nm}.${ext}`;
					if (existsSync(path)) return path;
				}
			}
			return '';
		};
		readonly	#aPlaceFont;

	readonly	#hHead2Mes: {[head: string]: string};
	async disp() {
		if (! WatchFile2Batch.ps.isOpenPnlWV) return;

		const fn = `${WatchFile2Batch.PATH_WS}/${WatchFile2Batch.FLD_SRC}/font/subset_font.json`;
		if (! existsSync(fn)) {
			WatchFile2Batch.ps.cmd2Vue(<T_E2V_CNVFONT>{cmd: 'update.cnvFont', aCnvFont: []});
			return;
		}

		const o = await readJson(fn);
		const aFontInfo: T_A_CNVFONT = Object.entries(o).map(([nm, v])=> ({
			nm,
			mes		: this.#hHead2Mes[(<any>v).inp.slice(0, 12)]!,
			iSize	: (<any>v).iSize,
			oSize	: (<any>v).oSize,
			err		: (<any>v).err,
		}));
		aFontInfo.sort();
		WatchFile2Batch.ps.cmd2Vue(<T_E2V_CNVFONT>{cmd: 'update.cnvFont', aCnvFont: aFontInfo});
	}

}
