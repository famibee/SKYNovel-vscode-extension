/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2024 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , src, shape, path] = process.argv;

const sharp = require('sharp');
sharp.cache(false);

import {styleText} from 'node:util';
import {copy, ensureDir, existsSync, readFile, stat, writeFile, writeJsonSync} from 'fs-extra';
const {BICUBIC2, BILINEAR, createICNS, createICO} = require('png2icons');

sharp(src).metadata().then((info: any)=> {
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

	s.toFile(pathWs + path)
	.then(async ()=> {
		const fnIcon = pathWs +'build/icon.png';
		if (! existsSync(fnIcon)) return;

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
			()=> copy(fnIcon, pathWs +'doc/app/icon.png'),
		].map(v=> v()))
		.then(()=> {
			console.log(styleText(['bgGreen', 'black'], `fn:cut_round.ts ok.`));
			process.exit(0);
		});
	}) // サムネイル更新
	.catch((err: Error)=> {oLog.err = err.message; log_exit(20)});
});
