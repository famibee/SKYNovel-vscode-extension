/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_H_ADIAG, T_H_ADIAG_L2S} from '../../server/src/LspWs';
import {type T_H_FONTJSON, type T_H_BJ_subset_font, type T_E2V_CNVFONT, type T_E2V_NOTICE_COMPONENT, type T_BJ_subset_font, type T_INF_INTFONT, H_FONTJSON_nm_DEF_FONT} from '../types';
import type {FULL_PATH} from '../CmnLib';
import {foldProc, getFn, is_win} from '../CmnLib';
import type {PrjCmn} from '../PrjCmn';
import {WatchFile} from './WatchFile';

import {extname} from 'node:path';
import {userInfo} from 'node:os';
import {stat} from 'node:fs/promises';
import {exec} from 'node:child_process';
import {copy, existsSync, outputFile, outputFileSync, outputJson, readJson, removeSync} from 'fs-extra';
import {window, ProgressLocation, type Progress, CancellationToken} from 'vscode';

const PROC_ID = 'cnv.font.subset';


export class WfbOptFont extends WatchFile {
	readonly	#PATH_FONT_JSON	: FULL_PATH;
	readonly	#A_DIR_FONT		: FULL_PATH[]	= [];
	readonly	#A_REP_MASKP2FP	: ((path: FULL_PATH)=> string)[]	= [];
	readonly	#A_REP_FP2MASKP	: ((path: string)=> string)[]	= [];
	readonly	#PATH_BATOUT_JSON	: FULL_PATH;

	readonly	#getHead2Mes	: (inp: string)=> string;


	//MARK: コンストラクタ
	constructor(pc: PrjCmn) {
		super(pc);

		const PATH_FONT = `${pc.PATH_WS}/${pc.FLD_SRC}/font`;
		this.#PATH_FONT_JSON = `${PATH_FONT}/font.json`;
		this.#PATH_BATOUT_JSON = `${PATH_FONT}/subset_font.json`;

		const {username} = userInfo();
		const aMat: {mask_path: FULL_PATH, fp: FULL_PATH}[] = [
			{mask_path: '::PATH_PRJ_FONTS::', fp: PATH_FONT},
			{mask_path: '::PATH_USER_FONTS::', fp: is_win
				? `C:/Users/${username}/AppData/Local/Microsoft/Windows/Fonts`
				: `/Users/${username}/Library/Fonts`},
			{mask_path: '::PATH_OS_FONTS::', fp: is_win
				? 'C:/Windows/Fonts'
				: '/Library/Fonts'},
			{mask_path: '::PATH_WS::', fp: pc.PATH_WS},
		];
		for (const o of aMat) {
			this.#A_DIR_FONT.push(o.fp);
			this.#A_REP_MASKP2FP.push(p=> p.replace(o.mask_path, o.fp));
			this.#A_REP_FP2MASKP.push(p=> p.replace(o.fp, o.mask_path));
		}

		// 匿名フォントディレクトリ名（前端）とその説明
		const H_HEAD2MES: {[head: string]: string} = {
			'::PATH_PRJ_'	: `${pc.FLD_SRC}/font/ 下`,
			'::PATH_USER'	: 'OS（ユーザー別）へのインストール済みフォント',
			'::PATH_OS_F'	: 'OS（ユーザー共通）へのインストール済みフォント',
		};
		this.#getHead2Mes = inp=> H_HEAD2MES[inp.slice(0, 11)] ?? inp;
	}

	//MARK: 初期化
	async init(
		noticeChgTxt	: (fp: string)=> Promise<void>,
		noticeDelTxt	: (fp: string)=> Promise<boolean>,
		sendNeedGo		: ()=> Promise<void>,
	) {
		// フォントファイルやテキスト系ファイルの監視
		return this.watchFld(
			'doc/prj/*/*.{sn,json,woff2,woff,otf,ttf,htm,html,css,js}', '',
			async ()=> { /* empty */ },	// 処理はないが処理を動かしたい
			async ({path}, cre)=> {
				if (cre && /\.ss?n$/.test(path)) await sendNeedGo();
				return noticeChgTxt(path);
			},
			async ({path})=> {
				if (/\.ss?n$/.test(path)) await sendNeedGo();
				return noticeDelTxt(path);
			},
			true,
		);
	}

	//MARK: 変換有効化
	enable() {return this.#procOnOff(true)}

	//MARK: 変換無効化
	disable() {return this.#procOnOff(false)}

	async	#procOnOff(minify: boolean) {
		this.pc.watchFile = false;

		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		await this.pc.ps.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		// 旧フォントファイルはすべて一度削除
		foldProc(
			this.pc.PATH_PRJ +'script/',
			(fp, nm)=> {if (this.#REG_EXT_FONT.test(nm)) removeSync(fp)},
			()=> { /* empty */ },
		);

		if (! minify) {
			// 実処理
			await this.#proc(false);

			o.mode = 'comp';
			await this.pc.ps.cmd2Vue(o);

			this.pc.watchFile = true;
			return;
		}

		// フォント出現箇所から生成すべき最小限のフォント情報についてまとめる
		const hFont: T_H_FONTJSON = {};
		hFont[H_FONTJSON_nm_DEF_FONT] = {inp: '', txt: ''};
// console.log(`fn:WfbOptFont.ts procOnOff this.#InfFont:${JSON.stringify(this.#InfFont, undefined, 4)}`);

		for (const f2s of Object.values(this.#InfFont.hSn2Font2Str)) {
			for (const [font_nm, str] of Object.entries(f2s)) {
				this.#ensureFont2Str(font_nm, hFont);
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				hFont[font_nm]!.txt += str;	// ensureFont2Str により !
			}
		}
		this.#ensureFont2Str(this.#InfFont.defaultFontName, hFont);
			// デフォルトフォントと同じ値を直接値指定する[span]がない場合
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		hFont[this.#InfFont.defaultFontName]!.txt += hFont[H_FONTJSON_nm_DEF_FONT].txt;
			// ensureFont2Str により !
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete hFont[H_FONTJSON_nm_DEF_FONT];

		// 文字の重複をなくし最小限とする
		for (const fj of Object.values(hFont)) {
			const s = new Set<string>(Array.from(fj.txt));	// 一意化
				// txt.split('')や [...txt] はサロゲートペアで問題
			fj.txt = [...s].sort().join('');
				// sort()は不要だが中を目視したとき綺麗、github的にも差分が見やすい
		}
		await outputJson(this.#PATH_FONT_JSON, hFont);
			// 非バッチ・内蔵化で不要になったが、処理ログとoff時に元通りにするため

		// 実処理
		await this.#proc(true, hFont);

		o.mode = 'comp';
		await this.pc.ps.cmd2Vue(o);

		this.pc.watchFile = true;
	}
	readonly	#REG_EXT_FONT	= /\.(woff2?|otf|ttf)$/i;
				#InfFont	: T_INF_INTFONT	= {	// フォントと使用文字情報
		defaultFontName	: '',
		hSn2Font2Str	: {},
		hFp2FontErr		: {},
	};
	readonly	#ensureFont2Str = (font_nm: string, hFont: T_H_FONTJSON)=> hFont[font_nm] ??= {
		inp	: this.#getFontNm2path(font_nm)
			.replace(new RegExp(`^.+/${this.pc.FLD_SRC}/font`), '::PATH_PRJ_FONTS::')
				// (new RegExp('\')) の場合は、バックスラッシュは２つ必要
			.replace(
				is_win
				? /C:\/Users\/[^/]+\/AppData\/Local\/Microsoft\/Windows\/Fonts/
				: /\/Users\/[^/]+\/Library\/Fonts/,
				'::PATH_USER_FONTS::'
			)
			.replace(is_win ?'C:/Windows/Fonts' :'/Library/Fonts', '::PATH_OS_FONTS::'),
		txt	: '',
	};

	//MARK: 実処理
	async #proc(minify: boolean, hFont?: T_H_FONTJSON) {
		hFont ??= <T_H_FONTJSON>await readJson(this.#PATH_FONT_JSON, {encoding: 'utf8'});

		const aP: Promise<void>[] = [];
		let start_cnt = 0;

const cnv: (ssf: T_BJ_subset_font, nm: string, str: string, prg: Progress<{
	message?: string;
	increment?: number;
}>, tknCancel: CancellationToken)=> Promise<void> = minify
	? async (ssf, nm, str, prg, tknCancel)=> {
		try {
			if (tknCancel.isCancellationRequested) return;

			const fnTmp = this.#PATH_BATOUT_JSON.slice(0, -5) +`_${nm}.txt`;
			await outputFile(fnTmp, str, {encoding: 'utf8'});
				// views/vue/StgPkg.vue のボタンから開けるログ

			await new Promise<void>((re, rj)=> exec(`pyftsubset "${ssf.inp}" --text-file="${fnTmp}" --layout-features='*' --flavor=woff2 --output-file="${ssf.out}" --verbose`, (e, _stdout, stderr)=> {
				if (e) {
					const m = `${nm} 出力エラー：`+ e.message.replace(/--text-file=[^\n]+/, '...');
					console.error(m);
					ssf.err += m +'\n';
					rj(new Error(m));	// 必須。ないとログエラーが出ない
					return;
				}

				stderr = stderr.replaceAll(this.pc.PATH_WS, '::PATH_WS::')
				outputFileSync(fnTmp, stderr, {encoding: 'utf8'});

				prg.report({
					increment: ++start_cnt /aP.length *100,
					message: `処理中 ${String(start_cnt)}/${String(aP.length)} tasks`,
				});

				const a = /Missing glyphs for requested Unicodes: (\[[^\]]+])/.exec(stderr);	// 1 match (45 steps, 100us) PCRE2 https://regex101.com/r/q0SRoe/1
				if (a) {
					const aCode = <string[]>JSON.parse(a[1]?.replaceAll('\'', '"') ?? '[]');
					rj(new Error(`${nm} 出力警告：フォントファイルに含まれない文字【${
						aCode.map(c=> String.fromCharCode(
							parseInt(c.slice(2), 16)
						)).join()
					}】がありました。[Open]ボタンからログを確認（Missing glyphs ...）できます。`));
					return;
				}

				re();
			}));
		} catch (e) {
			if (e instanceof Error) ssf.err += e.message.replace(/--text-file=[^\n]+/, '...') +'\n';
			else ssf.err += `err pyftsubset "${ssf.inp}"`;
		}
	}
	: ssf=> copy(ssf.inp, ssf.out);


		const oBJ: T_H_BJ_subset_font = {};
		await window.withProgress({
			location	: ProgressLocation.Notification,
			title		: 'フォント最適化処理',
			cancellable	: true,
		}, async (prg: Progress<{
			message?: string;
			increment?: number;
		}>, tknCancel: CancellationToken)=> {
			for (const [nm, {inp, txt}] of Object.entries(hFont)) {
				let inp2 = inp;
				for (const fnc of this.#A_REP_MASKP2FP) inp2 = fnc(inp2);
				const ssf = oBJ[nm] = {
					inp: inp2,
					out: `${this.pc.PATH_WS}/doc/prj/script/${nm}${minify ?'.woff2' :extname(inp)}`,
					iSize: 1, oSize: 1, err: '',
				};
				if (! existsSync(inp2)) {
					ssf.err = `変換失敗です。入力ファイル ${getFn(inp) + extname(inp)} が存在するか確認してください`;
					continue;
				}

				aP.push(cnv(ssf, nm, txt, prg, tknCancel));
			}
			await Promise.allSettled(aP);
		});

		for (const [nm, ssf] of Object.entries(oBJ)) {
			if (! existsSync(ssf.out)) {
				ssf.err += `変換失敗です。出力ファイル ${ssf.out} が存在しません`;
				continue;
			}
			ssf.iSize = (await stat(ssf.inp)).size;
			ssf.oSize = (await stat(ssf.out)).size;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			ssf.inp = hFont[nm]!.inp;	// プライベートな環境値を塗りつぶす
		}

		// フォント情報更新
		await this.disp(oBJ);
	}


	updDiag(InfFont: T_INF_INTFONT): T_H_ADIAG_L2S {
		this.#InfFont = InfFont;

		const haDiag: T_H_ADIAG_L2S = {};
		for (const [fp, a] of Object.entries(InfFont.hFp2FontErr)) {
			const aD: T_H_ADIAG[] = [];
			for (const {err, nm} of a) {
				if (this.#getFontNm2path(nm)) continue;

				aD.push({mes: err, sev: 'E'});
			}
			if (aD.length > 0) haDiag[fp] = aD;
		}
		return haDiag;
	}
		#getFontNm2path(font_nm: string): FULL_PATH {
			for (const base of this.#A_DIR_FONT) {
				for (const ext of ['woff2','otf','ttf','WOFF2','OTF','TTF']) {
					const path = `${base}/${font_nm}.${ext}`;
					if (existsSync(path)) return path;
				}
			}
			return '';
		}

	async disp(oBJ?: T_H_BJ_subset_font) {
		if (oBJ) {
			for (const ssf of Object.values(oBJ)) {
				let i = ssf.out;
				for (const fnc of this.#A_REP_FP2MASKP) i = fnc(i);
				ssf.out = i;
			}
			await outputJson(this.#PATH_BATOUT_JSON, oBJ);
		}
		else {
			if (! existsSync(this.#PATH_BATOUT_JSON)) {
				await this.pc.ps.cmd2Vue(<T_E2V_CNVFONT>{cmd: 'update.cnvFont', aCnvFont: []});
				return;
			}

			oBJ = <T_H_BJ_subset_font>await readJson(this.#PATH_BATOUT_JSON);
		}

		const o: T_E2V_CNVFONT = {
			cmd		: 'update.cnvFont',
			aCnvFont: Object.entries(oBJ).map(([nm, ssf])=> ({
				nm,
				mes		: this.#getHead2Mes(ssf.inp),
				iSize	: ssf.iSize,
				oSize	: ssf.oSize,
				err		: ssf.err,
			})).sort(),
		};
		await this.pc.ps.cmd2Vue(o);
	}

}
