/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , src, shape, path, is_new_tmp] = process.argv;

import sharp from 'sharp';
sharp.cache(false);

import {styleText} from 'node:util';
import {existsSync} from 'node:fs';
import {readFile, stat, writeFile} from 'node:fs/promises';
import {copy, ensureDir, writeJsonSync} from 'fs-extra/esm';
import {BICUBIC2, BILINEAR, createICNS, createICO} from 'png2icons';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);

sharp(src).metadata().then(async (info: any)=> {
	const oLog: any = {...info, err: '', exif: '', icc: '', iptc: '', xmp: ''};
	const log_exit = (exit_code = -1)=> {
		writeJsonSync(__filename +'on', oLog, {encoding: 'utf8'});
		if (exit_code > -1) process.exit(exit_code);
	}
	log_exit();

	const wh = 1024;
	if (info.width < wh || info.height < wh) {
		oLog.err = `元画像のサイズは ${wh} x ${wh} 以上にして下さい。（width:${info.width} height:${info.height}）`;
		log_exit(10);
	}

	const pathWs = process.cwd() +'/';
	const s = sharp(src).png().resize({
		width	: wh,
		height	: wh,
		fit		: 'cover',
		background	: {r: 0, g: 0, b: 0, alpha: 0},
	});

	switch (parseInt(shape!)) {
		case 1:		// 丸
			s.composite([{
				input	: Buffer.from(`<svg><circle cx="${wh /2}" cy="${wh /2}" r="${wh /2}"/></svg>`),
				blend	: 'dest-in',
			}]);
			break;

		case 2:		// 角丸
			s.composite([{
				input	: Buffer.from(`<svg><rect width="${wh}" height="${wh}" rx="${wh/4.5}" ry="${wh/4.5}"/></svg>`),
				blend	: 'dest-in',
			}]);
			break;

	//	default:
	}

	try {
		await s.toFile(pathWs + path);

		const fnIcon = pathWs +'build/icon.png';
		if (! existsSync(fnIcon)) return;

		// サムネイル更新
		const mtPng = (await stat(fnIcon)).mtimeMs;
		const bIconPng = await readFile(fnIcon);
		await ensureDir(pathWs +'build/icon/');

		await Promise.allSettled([
			async ()=> {
				const fn = pathWs +'build/icon/icon.icns';
				const mt = existsSync(fn) ?(await stat(fn)).mtimeMs :0;
				if (mtPng > mt) {
					const b = createICNS(bIconPng, BILINEAR, 0);
					if (b) await writeFile(fn, b);
				}
			},
			async ()=> {
				const fn = pathWs +'build/icon/icon.ico';
				const mt = existsSync(fn) ?(await stat(fn)).mtimeMs :0;
				if (mtPng > mt) {
					const b = createICO(bIconPng, BICUBIC2, 0, false, true);
					if (b) await writeFile(fn, b);
				}
			},
			// 「このアプリについて」用
			()=> copy(fnIcon, pathWs +is_new_tmp ?'doc/icon.png' :'doc/app/icon.png'),
		].map(v=> v()));

		console.log(styleText(['bgGreen', 'black'], `fn:cut_round.ts ok.`));
		process.exit(0);
	} catch (e) {
		console.log(styleText(['bgRed', 'white'], `  [ERR] %o`), e);
		oLog.err = (<Error>e)?.message ?? String(e);
		log_exit(20);
	}

});
