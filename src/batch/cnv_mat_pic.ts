/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , pathInp, quality, curPrj, curPrjBase=''] = process.argv;

const sharp = require('sharp');
import {resolve, parse, basename} from 'path';
import {ensureDir, existsSync, move, readdirSync, readFileSync, readJsonSync, remove, statSync, writeFileSync, writeJsonSync} from 'fs-extra';
import {T_OPTIMG, T_OPTIMG_FILE} from '../../views/types';

const REG_IGNORE_SYS_PATH = /^.+\/(_notes|Icon\r|\.[^\/]+|[^\/]+\.(db|ini|git))$/;
function foldProc(wd: string, fnc: (url: string, nm: string)=> void, fncFld: (nm: string)=> void) {
	for (const d of readdirSync(wd, {withFileTypes: true})) {
		const nm = String(d.name).normalize('NFC');
		if (REG_IGNORE_SYS_PATH.test(nm)) continue;
		if (d.isDirectory()) {fncFld(nm); continue;}

		const url = resolve(wd, nm);
		fnc(url, nm);
	}
}
function replaceFile(src: string, r: RegExp, rep: string, dest = src) {
	try {
		if (! existsSync(src)) {
			console.error(`replaceFile no exists src:${src}`);
			return;
		}

		const txt = readFileSync(src, {encoding: 'utf8'});
		const ret = String(txt.replace(r, rep));
		if (txt !== ret) writeFileSync(dest, ret);
	}
	catch (err) {
		console.error(`replaceFile src:${src} ${err}`);
	}
}


const REG_CNV_WEBP	= /\.(jpe?g|png)$/;
// (jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)
const REG_CNV_HTML	= /\.(htm|html)$/;
const REG_REP_WEBPFLAG	= /\w+\/\*WEBP\*\//g;
const REG_CNV_JSON	= /\.json$/;
const REG_REP_JSON	= /("image"\s*:\s*")(.+)\.(jpe?g|png)"/;
const REG_REP_JSON2	= /webp","image_bkup":".+(jpe?g|png)"/;


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
const log_exit = (exit_code = -1)=> {
	writeJsonSync(fnLog, oLog, {encoding: 'utf8'});
	if (exit_code > -1) process.exit(exit_code);
}


const a: (()=> Promise<void>)[] = [];

/**
 * 
 * @param {string} pathInp	退避元パス (jpe?g|png)
 * @param {string} pathBase	退避先パス (jpe?g|png)
 * @param {string} no_move	退避moveする/しない
 * @returns {void} 返り値
 */
function cnv(pathInp: string, pathBase: string, no_move: string = ''): void {
	a.push(
		async ()=> {
			if (no_move !== 'no_move') await move(pathInp, pathBase, {overwrite: true});

			// 退避素材フォルダから元々フォルダに最適化中間ファイル生成
			const {dir, name, ext} = parse(pathInp);
			const {dir: dirBase} = parse(pathBase);
			const pathWk = dirBase +'/'+ name +'.webp';
			const fi = oLog.hSize[name] ??= {fld_nm: basename(dir) +'/'+ name, baseSize: 0, webpSize: 0, ext: <any>'',};

			const info = await sharp(pathBase)
			//.greyscale()	// TEST
			.webp({quality: Number(fi.webp_q ?? quality)})
			.toFile(pathWk);	// 一度作業中ファイルは退避先に作る

			await move(pathWk, dir +'/'+ name +'.webp', {overwrite: true});

			const baseSize = statSync(pathBase).size;
			const webpSize = info.size;
			oLog.hSize[name] = {...fi, baseSize, webpSize, ext: <any>ext.slice(1),};
			oLog.sum.baseSize += baseSize;
			oLog.sum.webpSize += webpSize;
		},
	);
}

switch (pathInp) {
	case 'restore':	// ファイル最適化 解除
		foldProc(curPrjBase, ()=> {}, dir=> {
			foldProc(resolve(curPrjBase, dir), (url, nm)=> {
				if (REG_CNV_WEBP.test(nm)) {
					// 対応する素材ファイルが無い場合、削除しないように
					const urlPrj = resolve(curPrj, dir, nm);
					a.push(()=> move(url, urlPrj, {overwrite: true}));
					const {name} = parse(nm);
					const urlOut = resolve(curPrj, dir, name +'.webp');
					a.push(()=> remove(urlOut));
					return;
				}
			}, ()=> {});
		});

		foldProc(curPrj, ()=> {}, dir=> {
			foldProc(resolve(curPrj, dir), (url, nm)=> {
				// htm置換・(true/*WEBP*/)
				if (REG_CNV_HTML.test(nm)) {
					REG_REP_WEBPFLAG.lastIndex = 0;	// /gなので必要
					a.push(async ()=> replaceFile(
						url,
						REG_REP_WEBPFLAG,
						'false/*WEBP*/',
					));
					return;
				}

				// json置換（アニメpng）
				if (REG_CNV_JSON.test(nm)) a.push(async ()=> replaceFile(
					url,
					REG_REP_JSON2,
					'$1"',
				));
			}, ()=> {});
		});

		Promise.allSettled(a.map(t=> t()))
		.then(()=> log_exit(0));
		break;

	case 'all_no_move':
		if (existsSync(fnLog)) {
			oLog = readJsonSync(fnLog, {encoding: 'utf8'});
			oLog.sum.baseSize = 
			oLog.sum.webpSize = 0;
		}

		for (const e of Object.values(oLog.hSize)) {
			const ext = '.'+ e.ext;
			if (! REG_CNV_WEBP.test(ext)) continue;

			cnv(
				resolve(curPrj, e.fld_nm + ext),
				resolve(curPrjBase, e.fld_nm + ext),
				'no_move',
			);
		}

		Promise.allSettled(a.map(t=> t()))
		.then(()=> log_exit(0));
		break;

	case 'all':{	// ファイル最適化
		ensureDir(curPrjBase);
		foldProc(curPrj, ()=> {}, dir=> {
			const wdBase = resolve(curPrjBase, dir);
			ensureDir(wdBase);
			foldProc(resolve(curPrj, dir), (url, name)=> {
				// 退避素材フォルダに元素材を移動
				if (REG_CNV_WEBP.test(name)) {cnv(url, resolve(wdBase, name)); return;}

				// htm置換（true/*WEBP*/）
				if (REG_CNV_HTML.test(name)) a.push(async ()=> replaceFile(
					url,
					REG_REP_WEBPFLAG,
					'true/*WEBP*/',
				));

				// json置換（アニメpng）
				if (REG_CNV_JSON.test(name)) a.push(async ()=> replaceFile(
					url,
					REG_REP_JSON,
					'$1$2.webp","image_bkup":"$2.$3"',
				));
			}, ()=> {});
		});

		Promise.allSettled(a.map(t=> t()))
		.then(()=> log_exit(0));
	}	break;

	default:{
		if (existsSync(fnLog)) oLog = readJsonSync(fnLog, {encoding: 'utf8'});

		const {dir, name, ext} = parse(pathInp);
		const o: T_OPTIMG_FILE = {
			...oLog.hSize[name],
			fld_nm	: basename(dir) +'/'+ name,
			ext		: <any>ext.slice(1),
		};
		oLog.sum.baseSize -= o.baseSize;
		oLog.sum.webpSize -= o.webpSize;

		// 引数は全ファイル走査とは別の意味を持つ
			// 第一引数（退避元パス）
			// 第三引数（退避先パス）
			// 第四引数（moveする/しない）
		cnv(pathInp, curPrj, curPrjBase);

		Promise.allSettled(a.map(t=> t()))
		.then(()=> log_exit(0));
	}	break;
}
