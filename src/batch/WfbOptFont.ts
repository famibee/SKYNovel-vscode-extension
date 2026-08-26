/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_H_ADIAG, T_H_ADIAG_L2S} from '../../server/src/LspWs';
import {type T_H_FONTJSON, type T_H_BJ_subset_font, type T_E2V_CNVFONT, type T_E2V_NOTICE_COMPONENT, type T_BJ_subset_font, type T_INF_INTFONT, H_FONTJSON_nm_DEF_FONT} from '../types';
import type {FULL_PATH} from '../CmnLib';
import {foldProc, fp2osp, getFn, is_win} from '../CmnLib';
import type {PrjCmn} from '../PrjCmn';
import {ActivityBar} from '../ActivityBar';
import {WatchFile} from './WatchFile';

import {basename, extname} from 'node:path';
import {userInfo} from 'node:os';
import {stat} from 'node:fs/promises';
import {exec} from 'node:child_process';
import {copy, existsSync, outputFile, outputFileSync, outputJson, readFileSync, readJson, removeSync} from 'fs-extra';
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
			// この glob が広いのは**暗号化の網**だから（フォント最適化のためではない）。
			// watchFld は `doc/prj/*/` 始まりのパターンに暗号化を仕込むので、
			// 拡張子を削ると**その拡張子の暗号化が黙って漏れる**。狭めないこと
			'doc/prj/*/*.{sn,json,woff2,woff,otf,ttf,htm,html,css,js}', '',
			async ()=> { /* empty */ },
				// 中身は空。**findFiles(pat) 全件への初回の暗号化を走らせるため**に
				// 渡している（watchFld 内で init の有無が分岐条件になっている）
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

	// 成否を返す。false ならフォント変換は行っていないので、呼び出し元は設定を戻すこと
	async	#procOnOff(minify: boolean): Promise<boolean> {
		// pyftsubset を使うのは minify 時のみ。未導入なら同意を得て導入する。
		// 旧フォントを削除する前に確認する（断られてもフォントは消えない）
		if (minify && ! await ActivityBar.prepPyFontTools()) return false;

		this.pc.watchFile = false;

		const o: T_E2V_NOTICE_COMPONENT = {cmd: 'notice.Component', id: PROC_ID, mode: 'wait'};
		await this.pc.ps.cmd2Vue(o);	// 処理中はトグルスイッチを無効にする

		const fin = async (ret: boolean)=> {
			o.mode = 'comp';
			await this.pc.ps.cmd2Vue(o);

			this.pc.watchFile = true;
			return ret;
		};

		if (! minify) {
			const oFont = existsSync(this.#PATH_FONT_JSON)
				? <T_H_FONTJSON>await readJson(this.#PATH_FONT_JSON, {encoding: 'utf8'})
				: {};
			await this.#proc(false, oFont);	// 実処理
			return fin(true);
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
		const aNm = this.#getDefFontNms();
		const aDefFontNm = aNm.filter(nm=> this.#getFontNm2path(nm));
			// serif など総称フォント名（ファイルが無いもの）は最適化しようがないので除く
		if (aDefFontNm.length === 0) {	// フォント情報が未取得のまま進むと、名前なしの
			// 変換（.woff2 という出力）に失敗した上でフォントを失うので、ここで中断
			void window.showErrorMessage('フォント最適化を有効にできません', {modal: true, detail: `${
				aNm.length === 0
				? 'デフォルトフォントを特定できませんでした。setting.sn の &def_fonts を確認して下さい。'
				: `デフォルトフォント【${aNm.join(', ')}】のフォントファイルが見つかりませんでした。`
			}
（フォントファイルは削除していません）`});
			return fin(false);
		}
		for (const nm of aDefFontNm) {
			this.#ensureFont2Str(nm, hFont);
				// デフォルトフォントと同じ値を直接値指定する[span]がない場合
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			hFont[nm]!.txt += hFont[H_FONTJSON_nm_DEF_FONT].txt;
				// ensureFont2Str により !
		}	// &def_fonts の二つめ以降は実行時のフォールバック（一つめに無い字を
			// 二つめで表示する、など）なので、同じ本文で全部サブセット化する
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

		await this.#proc(true, hFont);	// 実処理（旧ファイルの削除は変換成功後）
		return fin(true);
	}
	/**
	 * デフォルトフォント名（&def_fonts に並べた全部）。
	 * LSP のスクリプト走査結果（#InfFont）が持つのは一つめだけで、走査タイミングに
	 * よっては空のこともあるので、doc/prj/ * /setting.sn の &def_fonts も直接読む
	 */
	#getDefFontNms(): string[] {
		const aNm: string[] = [];
		const add = (nm: string)=> {if (nm && ! aNm.includes(nm)) aNm.push(nm)};

		add(this.#InfFont.defaultFontName);	// setting.sn 以外での指定にも対応

		foldProc(this.pc.PATH_PRJ, ()=> { /* empty */ }, dir=> {
			const fp = `${this.pc.PATH_PRJ}${dir}/setting.sn`;
			if (! existsSync(fp)) return;

			// &def_fonts = 'ipamjm, "Source Han Sans CN"'	; デフォルトフォント
			const m = /(?<!;.*)&def_fonts\s*=\s*((["'#])(.+?)\2|[^;\s]+)/.exec(
				readFileSync(fp, {encoding: 'utf8'})
			);
			if (! m) return;

			for (const s of (m[3] ?? m[1] ?? '').split(',')) {
				add(/^["'\s]*([^,;"']+)/.exec(s)?.[1]?.trim() ?? '');
					// 引用符と前後の空白を落とす。LspWs #getFonts2ANm と同じ扱い
			}
		});
		return aNm;
	}

	/**
	 * 変換に成功したフォントについてだけ、拡張子違いの旧ファイルを削除する。
	 * - 変換対象でないフォント（&def_fonts の二つめ以降など、実行時に
	 *   フォールバックとして使われるもの）は作り直せないので消さない
	 * - 変換に失敗したフォントも、消すと元に戻せないので残す
	 */
	#delOldFont(oBJ: T_H_BJ_subset_font) {foldProc(
		this.pc.PATH_PRJ +'script/',
		(fp, nm)=> {
			if (! this.#REG_EXT_FONT.test(nm)) return;

			const ssf = oBJ[getFn(nm)];
			if (! ssf || ssf.err) return;
			if (nm === basename(ssf.out)) return;	// 今回作ったファイル

			removeSync(fp);
		},
		()=> { /* empty */ },
	)}
	readonly	#REG_EXT_FONT	= /\.(woff2?|otf|ttf)$/i;
				#InfFont	: T_INF_INTFONT	= {	// フォントと使用文字情報
		defaultFontName	: '',
		hSn2Font2Str	: {},
		hFp2FontErr		: {},
	};
	readonly	#ensureFont2Str = (font_nm: string, hFont: T_H_FONTJSON)=> {hFont[font_nm] ??= {
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
	}};

	//MARK: 実処理
	async #proc(minify: boolean, hFont?: T_H_FONTJSON) {
		const oFont = hFont ?? <T_H_FONTJSON>await readJson(this.#PATH_FONT_JSON, {encoding: 'utf8'});

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

			await new Promise<void>((re, rj)=> exec(`${ActivityBar.cmdPyftsubset} "${fp2osp(ssf.inp)}" --text-file="${fp2osp(fnTmp)}" --layout-features="*" --flavor=woff2 --output-file="${fp2osp(ssf.out)}" --verbose`, (e, _stdout, stderr)=> {
				// --layout-features は "*" と二重引用符で囲む。'*' だと Windows の
				// cmd.exe は引用符を外さず、pyftsubset に 【'*'】 が渡ってエラーになる
				// （パスも fp2osp() でドライブ名を補完してから渡す）
				if (e) {
					const m = `${nm} 出力エラー：`+ e.message.replace(/--text-file=[^\n]+/, '...')
					+ (e.code === 127 || e.code === 9009
						? '\npyftsubset が見つかりません。Python の Scripts フォルダに PATH が通っているか確認して下さい'
						: '');
					console.error(m);
					rj(new Error(m));	// 必須。ないとログエラーが出ない
						// ssf.err への追加は catch 側で行う（二重に出さない）
					return;
				}

				const err = stderr.replaceAll(this.pc.PATH_WS, '::PATH_WS::');
				outputFileSync(fnTmp, err, {encoding: 'utf8'});

				prg.report({
					increment: ++start_cnt /aP.length *100,
					message: `処理中 ${String(start_cnt)}/${String(aP.length)} tasks`,
				});

				const a = /Missing glyphs for requested Unicodes: (\[[^\]]+])/.exec(err);	// 1 match (45 steps, 100us) PCRE2 https://regex101.com/r/q0SRoe/1
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
			for (const [nm, {inp, txt}] of Object.entries(oFont)) {
				let inp2 = inp;
				for (const fnc of this.#A_REP_MASKP2FP) inp2 = fnc(inp2);
				const ssf = oBJ[nm] = {
					inp: inp2,
					out: `${this.pc.PATH_WS}/doc/prj/script/${nm}${minify ?'.woff2' :extname(inp)}`,
					iSize: 1, oSize: 1, err: '',
				};
				if (! inp2 || ! existsSync(inp2)) {
					ssf.err = `変換失敗です。フォント【${nm}】の入力ファイル ${
						inp ?getFn(inp) + extname(inp) :'（未検出）'
					} が存在するか確認してください`;
					continue;
				}

				aP.push(cnv(ssf, nm, txt, prg, tknCancel));
			}
			await Promise.allSettled(aP);
		});

		for (const [nm, ssf] of Object.entries(oBJ)) {
			if (ssf.err) continue;	// 既に失敗しているので二重にメッセージを出さない
			if (! existsSync(ssf.out)) {
				ssf.err += `変換失敗です。出力ファイル ${ssf.out} が存在しません`;
				continue;
			}
			ssf.iSize = (await stat(ssf.inp)).size;
			ssf.oSize = (await stat(ssf.out)).size;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			ssf.inp = oFont[nm]!.inp;	// プライベートな環境値を塗りつぶす
		}

		// 成功したものだけ、拡張子違いの旧ファイルを削除する（disp() が
		// ssf.out を書き換えるので、その前に）
		this.#delOldFont(oBJ);

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
				await this.pc.ps.cmd2Vue({cmd: 'update.cnvFont', aCnvFont: []});
				return;
			}

			// eslint-disable-next-line no-param-reassign
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
