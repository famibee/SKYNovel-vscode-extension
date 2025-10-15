/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_BJ_cut_round} from '../types';

import sharp from 'sharp';
sharp.cache(false);
import {BICUBIC2, BILINEAR, createICNS, createICO} from 'png2icons';

import {fileURLToPath} from 'node:url';
import {styleText} from 'node:util';
import {existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import {copy, mkdirs, readJson, writeJsonSync} from 'fs-extra/esm';

const __filename = fileURLToPath(import.meta.url);
const fnBJ = __filename +'on';
const PATH_WORKSPACE = process.cwd() +'/';

function exit(mes: string, exit_code = 0) {
	if (exit_code === 0)
	   console.log(styleText(['bgGreen', 'black'], '  [OK] %o'), mes);
	else console.log(styleText(['bgRed', 'white'], '  [ERR] %o'), mes);

	process.exit(exit_code);
}


readJson(fnBJ, {encoding: 'utf8'})
.then(async (oBJ: T_BJ_cut_round)=> {try {
	function log_exit(mes: string, exit_code = 0) {
		writeJsonSync(fnBJ, oBJ, {encoding: 'utf8'});
		exit(mes, exit_code);
	}

	const {order} = oBJ;
	const sh = sharp((order.is_src_pp ?PATH_WORKSPACE :'') + order.wp_src);
	const {width, height} = await sh.metadata();
	if (! width || ! height) throw '画像のサイズが不明です';

	const wh = 1024;
	if (width < wh || height < wh) {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		throw `元画像のサイズは ${wh} x ${wh} 以上にして下さい。（width:${width} height:${height}）`;
	}
	const s = sh.png().resize({
		width	: wh,
		height	: wh,
		fit		: 'cover',
		background	: {r: 0, g: 0, b: 0, alpha: 0},
	});
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
	switch (Number(order.shape)) {	// JSON がうまく number にできないので
		case 1:		// 丸
			s.composite([{
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				input	: Buffer.from(`<svg><circle cx="${wh /2}" cy="${wh /2}" r="${wh /2}"/></svg>`),
				blend	: 'dest-in',
			}]);
			break;

		case 2:		// 角丸
			s.composite([{
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				input	: Buffer.from(`<svg><rect width="${wh}" height="${wh}" rx="${wh/4.5}" ry="${wh/4.5}"/></svg>`),
				blend	: 'dest-in',
			}]);
			break;

	//	default:
	}

	await s.toFile(PATH_WORKSPACE + order.wp_dest);

	const fnIcon = PATH_WORKSPACE +'build/icon.png';
	if (! existsSync(fnIcon)) throw '生成に失敗しました';

	// サムネイル更新
	const bIconPng = await readFile(fnIcon);
	await mkdirs(PATH_WORKSPACE +'build/icon/');

	await Promise.allSettled([
		(async ()=> {
			const fn = PATH_WORKSPACE +'build/icon/icon.icns';
			const b = createICNS(bIconPng, BILINEAR, 0);
			if (b) await writeFile(fn, b);
		})(),
		(async ()=> {
			const fn = PATH_WORKSPACE +'build/icon/icon.ico';
			const b = createICO(bIconPng, BICUBIC2, 0, false, true);
			if (b) await writeFile(fn, b);
		})(),
		// 「このアプリについて」用
		copy(fnIcon, PATH_WORKSPACE +`doc/${ order.is_new_tmp ?'' :'app/' }icon.png`),
	]);

	log_exit('終了しました');

} catch (e) {exit(oBJ.err = String(e), 20)}})
.catch((e: unknown)=> {exit(String(e), 10)});
