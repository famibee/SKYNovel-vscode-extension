/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , src, isCut, path] = process.argv;

const sharp = require('sharp');
import {copy, ensureDir, existsSync, readFile, stat, writeFile, writeJsonSync} from 'fs-extra';
const {BICUBIC2, BILINEAR, createICNS, createICO} = require('png2icons');

sharp(src).metadata().then((info: any)=> {
	const o: any = {...info, err: '', exif: '', icc: '', iptc: '', xmp: ''};
	const log_exit = (exit_code = -1)=> {
		writeJsonSync(__filename +'on', o, {encoding: 'utf8'});
		if (exit_code > -1) process.exit(exit_code);
	}
	log_exit();

	if (info.width < 1024 || info.height < 1024) {
		o.err = `元画像のサイズは 1024 x 1024 以上にして下さい。（width:${info.width} height:${info.height}）`;
		log_exit(10);
	}

	const pathWs = process.cwd() +'/';
	const s = sharp(src).png().resize({
		width	: 1024,
		height	: 1024,
		fit		: 'cover',
		background	: {r: 0, g: 0, b: 0, alpha: 0},
	});
	if (isCut == 'true') {
		const r = 1024 /2;
		s.composite([{
			input	: Buffer.from(`<svg><circle cx="${r}" cy="${r}" r="${r}"/></svg>`),
			blend	: 'dest-in',
		}]);
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
		.then(()=> process.exit(0));
	}) // サムネイル更新
	.catch((err: Error)=> {o.err = err.message; log_exit(20)});
});
