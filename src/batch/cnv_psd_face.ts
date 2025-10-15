/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2024-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_BJ_Psd2Layer} from '../types';

import sharp from 'sharp';
sharp.cache(false);

import {fileURLToPath} from 'node:url';
import {styleText} from 'node:util';
import {readJson, writeJsonSync} from 'fs-extra/esm';

const __filename = fileURLToPath(import.meta.url);
const fnBJ = __filename +'on';
const PATH_PRJ = process.cwd() +'/doc/prj/';

function exit(mes: string, exit_code = 0) {
	if (exit_code === 0)
		console.log(styleText(['bgGreen', 'black'], '  [OK] %o'), mes);
	else console.log(styleText(['bgRed', 'white'], '  [ERR] %o'), mes);

	process.exit(exit_code);
}


readJson(fnBJ, {encoding: 'utf8'})
.then(async (oBJ: T_BJ_Psd2Layer)=> {try {
	function log_exit(mes: string, exit_code = 0) {
		writeJsonSync(fnBJ, oBJ, {encoding: 'utf8'});
		exit(mes, exit_code);
	}

	await Promise.allSettled(oBJ.aOrder.map(({fp_tmp, extend, pp_out})=>
		sharp(fp_tmp)
		.extend(extend)
		.toFile(PATH_PRJ + pp_out)
	));

	log_exit('終了しました');

} catch (e) {exit(oBJ.err = String(e), 20)}})
.catch((e: unknown)=> {exit(String(e), 10)});
