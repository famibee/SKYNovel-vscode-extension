/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , urlInp, quality, curPrj, curPrjBase] = process.argv;

const sharp = require('sharp');
import {resolve, parse} from 'path';
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
const REG_OPTITMD	= /\.webp$/;	// 最適化中間ファイル
const REG_CNV_HTML	= /\.(htm|html)$/;
const REG_REP_WEBPFLAG	= /\w+\/\*WEBP\*\//g;
const REG_CNV_JSON	= /\.json$/;
const REG_REP_JSON	= /("image"\s*:\s*")(.+)\.(jpe?g|png)"/;
const REG_REP_JSON2	= /webp","image_bkup":".+(jpe?g|png)"/;


type T_CNVMATINFO = {
	sum: {
		baseSize	: number;
		webpSize	: number;
	},
	hSize: {[fn: string]: {
		baseSize	: number;
		webpSize	: number;
	}},
};
let oLog: T_CNVMATINFO = {
	sum		: {baseSize: 0, webpSize: 0},
	hSize	: {},
};
const log_exit = (exit_code = -1)=> {
	writeJsonSync(__filename +'on', oLog, {encoding: 'utf8'});
	if (exit_code > -1) process.exit(exit_code);
}


const a: (()=> Promise<void>)[] = [];

/**
 * 
 * @param {string} urlRead	退避先パス
 * @param {string} url		退避元パス
 * @returns {void} 返り値
 */
function cnv(urlRead: string, url: string): void {
	a.push(
		()=> move(url, urlRead, {overwrite: true})
		.then(async ()=> {
			// 退避素材フォルダから元々フォルダに最適化中間ファイル生成
			const {dir, name} = parse(url);
			const {dir: dirBase} = parse(urlRead);
			const pathBase = dirBase +'/'+ name +'.webp';

			const info = await sharp(urlRead)
			.webp({quality: Number(quality),})
			.toFile(pathBase);	// 一度作業中ファイルは退避先に作る

			await move(pathBase, dir +'/'+ name +'.webp', {overwrite: true})

			const baseSize = statSync(urlRead).size;
			const webpSize = info.size;
			oLog.hSize[name] = {baseSize, webpSize,};
			oLog.sum.baseSize += baseSize;
			oLog.sum.webpSize += webpSize;
		}),
	);
}

//console.log(`fn:cnv_mat_pic.ts urlInp:${urlInp} quality:${quality} curPrj:${curPrj} curPrjBase:${curPrjBase}`);
switch (urlInp) {
	case 'restore':
		// ファイル最適化 解除
		foldProc(curPrj, ()=> {}, dir=> {
			foldProc(resolve(curPrj, dir), (url, nm)=> {
				// 最適化中間ファイルの削除
				if (REG_OPTITMD.test(nm)) {a.push(()=> remove(url)); return;}

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

	case 'all':
		// ファイル最適化
		ensureDir(curPrjBase);
		foldProc(curPrj, ()=> {}, dir=> {
			const wdWrt = resolve(curPrjBase, dir);
			ensureDir(wdWrt);
			foldProc(resolve(curPrj, dir), (url, name)=> {
				// 退避素材フォルダに元素材を移動
				if (REG_CNV_WEBP.test(name)) {cnv(resolve(wdWrt, name), url); return;}

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
		break;

	default:
		const fn = __filename +'on';
		if (existsSync(fn)) oLog = readJsonSync(fn, {encoding: 'utf8'});

		// 引数は全ファイル走査とは別の意味を持つ
		const url = urlInp;		// 第一引数（退避元パス）
		const urlRead = curPrj;	// 第三引数（退避先パス）

		const {name} = parse(url);
		const o = oLog.hSize[name] ?? {baseSize: 0, webpSize: 0,}
		oLog.sum.baseSize -= o.baseSize;
		oLog.sum.webpSize -= o.webpSize;

		cnv(urlRead, url);

		Promise.allSettled(a.map(t=> t()))
		.then(()=> log_exit(0));
		break;
}
