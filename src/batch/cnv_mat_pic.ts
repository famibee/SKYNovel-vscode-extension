/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_BJ_OPTPIC, T_OPTPIC_FILE} from '../types';

import sharp from 'sharp';
sharp.cache(false);

import {fileURLToPath} from 'node:url';
import {parse, basename} from 'node:path';
import {styleText} from 'node:util';
import {statSync} from 'node:fs';
import {move, readJson, writeJsonSync} from 'fs-extra/esm';

const __filename = fileURLToPath(import.meta.url);
const fnBJ = __filename +'on';
const PATH_PRJ = process.cwd();

function exit(mes: string, exit_code = 0) {
	if (exit_code === 0)
	   console.log(styleText(['bgGreen', 'black'], '  [OK] %o'), mes);
	else console.log(styleText(['bgRed', 'white'], '  [ERR] %o'), mes);

	process.exit(exit_code);
}


readJson(fnBJ, {encoding: 'utf8'})
.then(async (oBJ: T_BJ_OPTPIC)=> {try {
	function log_exit(mes: string, exit_code = 0) {
		writeJsonSync(fnBJ, oBJ, {encoding: 'utf8'});
		exit(mes, exit_code);
	}

	const {quality, FLD_PRJ_BASE} = oBJ.order;
	await Promise.allSettled(oBJ.aOrder.map(async ({
		pathPrj,
		pathBase,
	})=> {
		const src = PATH_PRJ +'/doc/prj/'+ pathPrj;
		const dest = PATH_PRJ +'/'+ FLD_PRJ_BASE + pathBase;

		// 退避素材フォルダから元々フォルダに最適化中間ファイル生成
		const {dir, name} = parse(src);
		const {dir: dirBase, ext} = parse(dest);
		const pathWk = dirBase +'/'+ name +'.webp';
		const fi = oBJ.hSize[name] ??= {fld_nm: basename(dir) +'/'+ name, baseSize: 0, webpSize: 0, ext: ''};

		const info = await sharp(dest)
		//.grayscale()	// TEST
		.webp({quality: fi.webp_q ?? quality})
		.toFile(pathWk);	// 一度作業中ファイルは退避先に作る

		const baseSize = statSync(dest).size;
		const webpSize = info.size;
		oBJ.hSize[name] = {...fi, baseSize, webpSize, ext: <T_OPTPIC_FILE['ext']>ext.slice(1),};
		oBJ.sum.baseSize += baseSize;
		oBJ.sum.webpSize += webpSize;

		await move(pathWk, dir +'/'+ name +'.webp', {overwrite: true});
	}));

	log_exit('終了しました');

} catch (e) {exit(String(e), 20)}})
.catch((e: unknown)=> {exit(String(e), 10)});
