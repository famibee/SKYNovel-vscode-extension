/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2024-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , src='', path_prj] = process.argv;

import * as T_PSD from 'psd';	// type
import PSD from 'psd.js';	// lib
import sharp from 'sharp';
sharp.cache(false);

import {mkdtempSync} from 'node:fs';
import {ensureFileSync, remove, outputFile} from 'fs-extra/esm';
import {basename, extname} from 'node:path';
import {styleText} from 'node:util';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = import.meta.dirname;
const fn_scr = __filename.slice(__dirname.length +1, -3);
const pathTmp = mkdtempSync(`/tmp/${fn_scr}-`);

function getFn(path: string) {return basename(path, extname(path))};

function genPsd2Layer(fld: string, {name, left, top, width, height, layer}: T_PSD.Node.Layer, is_canvas_size: boolean, aP: Promise<void>[], cvsW: number, cvsH: number) {
	const fn = fld +'_'+ name.replaceAll(REG_NG_PSD_LAYNM, '#');	// ファイル名的にアカン文字を置換
	const path_out = `${path_prj}face/${fn}.png`;
	const bm = layer.blendingMode();
	const ret = `${
		is_canvas_size ?';' :''
	}\t[add_face name=${fn} dx=${left} dy=${top}${
		bm === 'normal' ?'' :` blendmode=${bm}`
	}]\n`;
//console.log(`fn:cnv_psd_face.ts lay ${name} (${left}, ${top}, ${width}, ${height}) is_canvas_size:${is_canvas_size} .. ${ret}`);

	if (! is_canvas_size) {
		const sap = async ()=> {
			console.log(styleText(['blueBright'], `fn:cnv_psd_face.ts f canvas(${cvsW},${cvsH}) layer(${String(left).padStart(4)}, ${String(top).padStart(4)}, ${String(width).padStart(4)}, ${String(height).padStart(4)}) name:${fn}:`));

			await layer.image.saveAsPng(path_out);
		};
		aP.push(sap());
		// aP.push(layer.image.saveAsPng(path_out));
		return ret;
	}

	// tmp に出力 -> キャンバス拡大してprj下へ
	const fnTmp = `${pathTmp}/${fn}.png`
	const sap = async ()=> {
		console.log(styleText(['blueBright'], `fn:cnv_psd_face.ts b canvas(${cvsW},${cvsH}) layer(${String(left).padStart(4)}, ${String(top).padStart(4)}, ${String(width).padStart(4)}, ${String(height).padStart(4)}) name:${fn}:`));
// console.log(`fn:cnv_psd_face.ts  == L:${left} R:${cvsW -left -width} T:${top} B:${cvsH -top -height}`);
		try {
			await layer.image.saveAsPng(fnTmp);

			await sharp(fnTmp)	// sharp が fnTmp を掴むため temp を使う
			.extend({
				left,
				right	: cvsW -left -width,
				top,
				bottom	: cvsH -top -height,
				background	: {r: 0, g: 0, b: 0, alpha: 0},
			})
			.toFile(path_out);
		} catch (e) {
			console.log(styleText(['bgRed', 'white'], `  [ERR] %o`), e);
		}
	};
	aP.push(sap());

	return ret;
}
	const REG_NG_PSD_LAYNM	= /[\\\/:*?"<>|\.\s]/g;


const aP: Promise<void>[] = [];
//for (const uri of aUri) this.#genPsd2Face(uri, aP);
PSD.open(src).then((psd: T_PSD)=> {
	const t = psd.tree();
	const {document: {width, height}} = t.export();
	const hn = getFn(src);
	let out = `;#ED FACE
; *******************************************************
;#ED {"width":${width}, "height":${height}}
`;
	const a = t.descendants(); // =lay+grp に注意
	const len = a.length;
	let idxLast = len;
	// 末尾のフォルダかレイヤ群を「is_canvas_size」とする
	while (0 <= --idxLast) {
		const {type, parent} = a[idxLast]!;
		if (type === 'group' || parent.isRoot()) break;
	}

	let nm = '';
	for (let i=0; i<len; ++i) {
		const nc = a[i]!;
		const {type, name, parent} = nc;
		if (type === 'group') {
			out += `;#ED FACE_FOLDER ${name}\n`;
			nm = '_'+ name;
			continue;
		}

		if (parent.isRoot()) {
			if (nm !== '') out += `;#ED FACE_FOLDER /\n`;
			nm = '';
		}
		out += genPsd2Layer(hn + nm, nc, idxLast <= i, aP, width, height);
	}

	out += `
; *******************************************************

[return]\n`;

	const fnOut = path_prj +`face/face${hn}.sn`;
	ensureFileSync(fnOut);	// 作業フォルダ作りも兼ねる
	aP.push(outputFile(fnOut, out, 'utf8'))
	Promise.allSettled(aP).then(async ()=> {
		await remove(pathTmp);
		console.log(styleText(['bgGreen', 'black'], `fn:cnv_psd_face.ts ok.`));
		process.exit(0);
	});
});
