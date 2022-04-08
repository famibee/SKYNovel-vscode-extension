/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , urlInp, quality, curPrj, curPrjBase=''] = process.argv;

const sharp = require('sharp');
import {resolve, parse, basename} from 'path';
import {ensureDir, existsSync, move, readdirSync, readFileSync, readJsonSync, remove, removeSync, statSync, writeFileSync, writeJsonSync} from 'fs-extra';

//import {foldProc, replaceFile} from '../CmnLib';
const REG_IGNORE_SYS_PATH = /^.+\/(_notes|Icon\r|\.[^\/]+|[^\/]+\.(db|ini|git))$/;
function foldProc(wd: string, fnc: (url: string, nm: string)=> void, fncFld: (nm: string)=> void) {
	readdirSync(wd, {withFileTypes: true}).forEach((d: any)=> {
		const nm = String(d.name).normalize('NFC');
		if (REG_IGNORE_SYS_PATH.test(nm)) return;
		if (d.isDirectory()) {fncFld(nm); return;}

		const url = resolve(wd, nm);
		fnc(url, nm);
	});
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
const REG_OPTITMD	= /\.webp$/;	// 最適化ファイル
const REG_CNV_HTML	= /\.(htm|html)$/;
const REG_REP_WEBPFLAG	= /\w+\/\*WEBP\*\//g;
const REG_CNV_JSON	= /\.json$/;
const REG_REP_JSON	= /("image"\s*:\s*")(.+)\.(jpe?g|png)"/;
const REG_REP_JSON2	= /webp","image_bkup":".+(jpe?g|png)"/;


type T_CNVMATINFO = {
	sum: {
		baseSize	: number;
		webpSize	: number;
		pathImgCmpWebP	: string;
		pathImgCmpBase	: string;
	},
	hSize: {[fn: string]: {
		baseSize	: number;
		webpSize	: number;
		fld_nm		: string;
		ext			: string;
	}},
};
const fnLog = __filename +'on';
const DEF_CNVMATINFO: T_CNVMATINFO = {
	sum: {
		baseSize		: 0,
		webpSize		: 0,
		pathImgCmpWebP	: '',
		pathImgCmpBase	: '',
	},
	hSize	: {},
};
let oLog = DEF_CNVMATINFO;
const log_exit = (exit_code = -1)=> {
	writeJsonSync(fnLog, oLog, {encoding: 'utf8'});
	if (exit_code > -1) process.exit(exit_code);
}


const a: (()=> Promise<void>)[] = [];

const argWebp = {quality: Number(quality),}
/**
 * 
 * @param {string} urlInp	退避元パス (jpe?g|png)
 * @param {string} urlBase	退避先パス (jpe?g|png)
 * @param {string} no_move	moveする/しない
 * @returns {void} 返り値
 */
function cnv(urlInp: string, urlBase: string, no_move: string = ''): void {
	a.push(
		async ()=> {
			if (no_move !== 'no_move') await move(urlInp, urlBase, {overwrite: true});

			// 退避素材フォルダから元々フォルダに最適化中間ファイル生成
			const {dir, name, ext} = parse(urlInp);
			const {dir: dirBase} = parse(urlBase);
			const pathWork = dirBase +'/'+ name +'.webp';

			const info = await sharp(urlBase)
			//.greyscale()	// TEST
			.webp(argWebp)
			.toFile(pathWork);	// 一度作業中ファイルは退避先に作る

			await move(pathWork, dir +'/'+ name +'.webp', {overwrite: true})

			const baseSize = statSync(urlBase).size;
			const webpSize = info.size;
			oLog.hSize[name] = {baseSize, webpSize, fld_nm: basename(dir) +'/'+ name, ext: ext.slice(1),};
			oLog.sum.baseSize += baseSize;
			oLog.sum.webpSize += webpSize;
		},
	);
}

switch (urlInp) {
	case 'restore':
		// ファイル最適化 解除
		foldProc(curPrj, ()=> {}, dir=> {
			foldProc(resolve(curPrj, dir), (url, nm)=> {
				// 最適化ファイルの削除
				if (REG_OPTITMD.test(nm)) {
					const base = resolve(curPrjBase, dir, nm).slice(0, -4);
					['jpg','jpeg','png'].forEach(ext=> {
						// 対応する素材ファイルが無い場合、削除しないように
						if (existsSync(base + ext)) a.push(()=> remove(url));
					});
					return;
				}

				// htm置換・(true/*WEBP*/)
				if (REG_CNV_HTML.test(nm)) {
					REG_REP_WEBPFLAG.lastIndex = 0;	// /gなので必要
					a.push(async ()=> replaceFile(
						url,
						REG_REP_WEBPFLAG,
						'false/*WEBP*/',
					));
				}

				// json置換（アニメpng）
				if (REG_CNV_JSON.test(nm)) a.push(async ()=> replaceFile(
					url,
					REG_REP_JSON2,
					'$1"',
				));
			}, ()=> {});
		});

		// 退避素材戻し
		foldProc(curPrjBase, ()=> {}, dir=> {
			const urlCurPrj = resolve(curPrj, dir);
			foldProc(resolve(curPrjBase, dir), (url, nm)=> {
				a.push(()=> move(url, resolve(urlCurPrj, nm), {overwrite: true}));
			}, ()=> {});
		});

		Promise.allSettled(a.map(t=> t()))
		.then(()=> removeSync(curPrjBase))	// 退避素材フォルダ削除
		.then(()=> log_exit(0));
		break;

	case 'all_no_move':
		if (! existsSync(fnLog)) break;
		oLog = readJsonSync(fnLog, {encoding: 'utf8'});
		oLog.sum.baseSize =
		oLog.sum.webpSize = 0;
		for (const nm in oLog.hSize) {
			const e = oLog.hSize[nm];
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

	case 'all':{
		// ファイル最適化
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
		const {dir, name, ext} = parse(urlInp);
		const o = {
			...oLog.hSize[name],
			fld_nm	: basename(dir) +'/'+ name,
			ext		: ext.slice(1),
		};
		oLog.sum.baseSize -= o.baseSize;
		oLog.sum.webpSize -= o.webpSize;

		// 引数は全ファイル走査とは別の意味を持つ
			// 第一引数（退避元パス）
			// 第三引数（退避先パス）
			// 第四引数（moveする/しない）
		cnv(urlInp, curPrj, curPrjBase);

		Promise.allSettled(a.map(t=> t()))
		.then(()=> log_exit(0));
	}	break;
}
