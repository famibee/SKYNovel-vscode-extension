/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , modeInp='', quality, curPrj='', curPrjBase=''] = process.argv;

import sharp from 'sharp';
sharp.cache(false);

import {resolve, parse, basename} from 'node:path';
import {styleText} from 'node:util';
import {ensureDir, existsSync, move, readdirSync, readFileSync, readJsonSync, remove, statSync, writeFileSync, writeJsonSync} from 'fs-extra';
import {T_OPTIMG, T_OPTIMG_FILE} from '../../views/types';

const REG_SYS_FN = /^.+\/(_notes|Icon\r|\.[^\/]+|[^\/]+\.(db|ini|git))$/;
function foldProc(wd: string, fnc: (url: string, nm: string)=> void, fncFld: (nm: string)=> void) {
	for (const d of readdirSync(wd, {withFileTypes: true})) {
		const nm = String(d.name).normalize('NFC');
		if (REG_SYS_FN.test(nm)) continue;
		if (d.isDirectory()) {fncFld(nm); continue;}

		const fp = resolve(wd, nm);
		fnc(fp, nm);
	}
}
function replaceFile(src: string, r: RegExp, rep: string, verbose = true, dest = src) {
	try {
		if (! existsSync(src)) {
			console.error(`No change, No replace src:${src}`);
			return;
		}

		const txt = readFileSync(src, {encoding: 'utf8'});
		const ret = String(txt.replace(r, rep));
		if (txt !== ret) writeFileSync(dest, ret);
		else if (verbose) console.log(styleText('magentaBright', `replaceFile fail by same:${src}`));
	}
	catch (err) {
		console.error(`replaceFile src:${src} ${err}`);
	}
}

export function chkUpdate(path1: string, path2: string, doesnt_exist = true): boolean {
	// Node jsで始めるfilesystem3 | https://kawano-shuji.com/justdiary/2020/08/09/node-js%E3%81%A7%E5%A7%8B%E3%82%81%E3%82%8Bfilesystem3/
	if (! existsSync(path1)) console.error(`chkUpdate err path1=${path1}=`);
	if (! existsSync(path2)) return doesnt_exist;

	const s1 = statSync(path1, {bigint: true});
	const s2 = statSync(path2, {bigint: true});
	return s1.mtimeMs > s2.mtimeMs;
}


const REG_EXT_ORG	= /\.(jpe?g|png)$/;
// (jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)
const REG_EXT_HTML	= /\.(htm|html)$/;
const REG_REP_WEBPFLAG	= /\w+\/\*WEBP\*\//g;
const REG_EXT_JSON	= /\.json$/;

const REG_REP_JSON_CNV	= /("image"\s*:\s*")([^.]+(?:\.\d+x\d+)?).*\.(jpe?g|png)"/;
const DEST_REP_JSON_CNV	= '$1$2.webp","image_bkup":"$2.$3"';
	// https://regex101.com/r/Vd8HQp/1	テスト用に /g をつけている

const REG_REP_JSON_RESTORE	= /webp","image_bkup":".+(jpe?g|png)"/;
const DEST_REP_JSON_RESTORE	= '$1"';
	// https://regex101.com/r/7dqoPZ/1	テスト用に /g をつけている


const fnLog = __filename +'on';
let oLog: T_OPTIMG = {
	sum: {
		baseSize		: 0,
		webpSize		: 0,
		pathImgCmpWebP	: '',
		pathImgCmpBase	: '',
	},
	hSize	: {},
};
const log_enter = ()=> {
	if (! existsSync(fnLog)) return;

	// 元素材がなければログ削除
	const o = {...oLog};
	oLog = readJsonSync(fnLog, {encoding: 'utf8'});
	o.sum = {...oLog.sum};
	for (const name in oLog.hSize) {
		const {fld_nm, ext, baseSize, webpSize} = oLog.hSize[name]!;
		const pp = fld_nm + '.'+ ext;
		if (existsSync(resolve(curPrj, pp))
		|| existsSync(resolve(curPrjBase, pp))) o.hSize[name] = oLog.hSize[name]!;
		else {
			o.sum.baseSize -= baseSize;
			o.sum.webpSize -= webpSize;
		}
	}
	oLog = o;
};
const log_exit = (exit_code = -1)=> {
	const a = Object.entries(oLog.hSize);
	a.sort((p1, p2)=> {
		const k1 = p1[0], k2 = p2[0];
		if (k1 < k2) return -1;
		if (k1 > k2) return 1;
		return 0;
	})
	oLog.hSize = Object.fromEntries(a);

	writeJsonSync(fnLog, oLog, {encoding: 'utf8'});
	if (exit_code > -1) process.exit(exit_code);
}


import PQueue from 'p-queue';
const queue = new PQueue({concurrency: 50, autoStart: false});
let start_cnt = 0;
const go = async ()=> {
	start_cnt = queue.size;
	console.log(styleText(['bgGreen', 'black'], `fn:cnv_mat_pic.ts start: ${start_cnt} tasks`));

	queue.start();
	await queue.onIdle();
	log_exit(0);
};
let cnt = ()=> {
	const s = queue.size;
	if (s % 50 > 0) return;
	if (s === 0) {cnt = ()=> {}; return;}

	console.log(styleText(['bgGreen', 'black'], `fn:cnv_mat_pic.ts ${s}/${start_cnt} tasks`));
};


/**
 * 
 * @param {string} pathPrj	退避元パス (jpe?g|png)
 * @param {string} pathBase	退避先パス (jpe?g|png)
 * @param {boolean} do_move	退避moveするか
 * @returns {void} 返り値
 */
function cnv(pathPrj: string, pathBase: string, do_move: boolean = true): void {
	queue.add(async ()=> {
		if (do_move) await move(pathPrj, pathBase, {overwrite: true});

		// 退避素材フォルダから元々フォルダに最適化中間ファイル生成
		const {dir, name} = parse(pathPrj);
		const {dir: dirBase, ext} = parse(pathBase);
		const pathWk = dirBase +'/'+ name +'.webp';
		const fi = oLog.hSize[name] ??= {fld_nm: basename(dir) +'/'+ name, baseSize: 0, webpSize: 0, ext: <any>'',};

		const info = await sharp(pathBase)
		//.grayscale()	// TEST
		.webp({quality: Number(fi.webp_q ?? quality)})
		.toFile(pathWk);	// 一度作業中ファイルは退避先に作る

		await move(pathWk, dir +'/'+ name +'.webp', {overwrite: true});

		const baseSize = statSync(pathBase).size;
		const webpSize = info.size;
		oLog.hSize[name] = {...fi, baseSize, webpSize, ext: <any>ext.slice(1),};
		oLog.sum.baseSize += baseSize;
		oLog.sum.webpSize += webpSize;
		cnt();
	});
}

switch (modeInp) {
	case 'enable':		// 変換有効化
		ensureDir(curPrjBase);
		foldProc(curPrj, ()=> {}, dir=> {
			const wdBase = resolve(curPrjBase, dir);
			ensureDir(wdBase);
			foldProc(resolve(curPrj, dir), (url, name)=> {
				// 退避素材フォルダに元素材を移動
				if (REG_EXT_ORG.test(name)) {cnv(url, resolve(wdBase, name)); return;}

				// htm置換（true/*WEBP*/）
				if (REG_EXT_HTML.test(name)) {
					queue.add(()=> {replaceFile(
						url,
						REG_REP_WEBPFLAG,
						'true/*WEBP*/',
						false,
					); cnt();});
					return;
				}

				// json置換（アニメpng）
				if (REG_EXT_JSON.test(name)) queue.add(()=> {replaceFile(
					url,
					REG_REP_JSON_CNV,
					DEST_REP_JSON_CNV,
				); cnt();});
			}, ()=> {});
		});

		go();
		break;

	case 'disable':		// 変換無効化
		foldProc(curPrjBase, ()=> {}, dir=> {
			foldProc(resolve(curPrjBase, dir), (url, nm)=> {
				if (! REG_EXT_ORG.test(nm)) return;

				// 対応する素材ファイルが無い場合、削除しないように
				const urlPrj = resolve(curPrj, dir, nm);
				queue.add(async ()=> {await move(url, urlPrj, {overwrite: true}); cnt();});
				const {name} = parse(nm);
				const urlOut = resolve(curPrj, dir, name +'.webp');
				queue.add(async ()=> {await remove(urlOut); cnt();});
			}, ()=> {});
		});

		foldProc(curPrj, ()=> {}, dir=> {
			foldProc(resolve(curPrj, dir), (url, nm)=> {
				// htm置換・(true/*WEBP*/)
				if (REG_EXT_HTML.test(nm)) {
					REG_REP_WEBPFLAG.lastIndex = 0;	// /gなので必要
					queue.add(()=> {replaceFile(
						url,
						REG_REP_WEBPFLAG,
						'false/*WEBP*/',
						false,
					); cnt();});
					return;
				}

				// json置換（アニメpng）
				if (REG_EXT_JSON.test(nm)) queue.add(()=> {replaceFile(
					url,
					REG_REP_JSON_RESTORE,
					DEST_REP_JSON_RESTORE,
				); cnt();});
			}, ()=> {});
		});

		go();
		break;

	case 'reconv':		// 再変換
		// 現状、UI的に「常にエンコーダー同一・パラメータ変更」なので、上書き全変換でよい
		log_enter();
		oLog.sum.baseSize = 
		oLog.sum.webpSize = 0;

		for (const {ext, fld_nm} of Object.values(oLog.hSize)) {
			cnv(
				resolve(curPrj, fld_nm + '.'+ ext),
				resolve(curPrjBase, fld_nm + '.'+ ext),
				false,
			);
		}

		go();
		break;

	case 'prj_scan':	// prjフォルダ走査
		log_enter();

		ensureDir(curPrjBase);
		foldProc(curPrj, ()=> {}, dir=> {
			const wdBase = resolve(curPrjBase, dir);
			ensureDir(wdBase);
			foldProc(resolve(curPrj, dir), (url, name)=> {
				// 退避素材フォルダに元素材を移動
				if (REG_EXT_ORG.test(name)) {
					// ログにあるならいったん合計値から過去サイズを差し引く（log_enter() とセット）
					const nm = parse(name).name;
					if (nm in oLog.hSize) {
						const {baseSize=0, webpSize=0} = oLog.hSize[nm]!;
						oLog.sum.baseSize -= baseSize;
						oLog.sum.webpSize -= webpSize;
					}

					// 最適化処理する
					cnv(url, resolve(wdBase, name));
					return;
				}

				// htm置換（true/*WEBP*/）
				if (REG_EXT_HTML.test(name)) {
					queue.add(()=> {replaceFile(
						url,
						REG_REP_WEBPFLAG,
						'true/*WEBP*/',
						false,
					); cnt();});
					return;
				}

				// json置換（アニメpng）
				if (REG_EXT_JSON.test(name)) queue.add(()=> {replaceFile(
					url,
					REG_REP_JSON_CNV,
					DEST_REP_JSON_CNV,
				); cnt();});
			}, ()=> {});
		});

		go();
		break;

	case 'base_scan':	// baseフォルダ走査
		log_enter();

		foldProc(curPrjBase, ()=> {}, dir=> {
			const wdBase = resolve(curPrjBase, dir);
			ensureDir(wdBase);
			const wdPrj = resolve(curPrj, dir);
			foldProc(wdBase, (url, name)=> {
				if (! REG_EXT_ORG.test(url)) return;

				const toPath = resolve(wdPrj, name.replace(REG_EXT_ORG, '.webp'));
				if (! chkUpdate(url, toPath)) return;

				// ログにあるならいったん合計値から過去サイズを差し引く（log_enter() とセット）
				const nm = parse(name).name;
				if (nm in oLog.hSize) {
					const {baseSize=0, webpSize=0} = oLog.hSize[nm]!;
					oLog.sum.baseSize -= baseSize;
					oLog.sum.webpSize -= webpSize;
				}

				cnv(toPath, url, false);
			}, ()=> {});
		});

		go();
		break;

	default:		// 現状未使用
		log_enter();

		const {dir, name, ext} = parse(modeInp);
		const o: T_OPTIMG_FILE = {
			...oLog.hSize[name]!,
			fld_nm	: basename(dir) +'/'+ name,
			ext		: <any>ext.slice(1),
		};
		oLog.sum.baseSize -= o.baseSize;
		oLog.sum.webpSize -= o.webpSize;

		// 引数は全ファイル走査とは別の意味を持つ
			// 第一引数（退避元パス）
			// 第三引数（退避先パス）
			// 第四引数（moveする/しない）
		cnv(modeInp, curPrj, Boolean(curPrjBase));

		go();
		break;
}
