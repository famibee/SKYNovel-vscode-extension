/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_BJ_Psd2Layer} from '../types';
import {getFn} from '../CmnLib';
import type {PrjCmn} from '../PrjCmn';

import * as T_PSD from 'psd';
import PSD from 'psd.js';

import {mkdtempSync} from 'node:fs';
import {remove, outputFile, ensureFile, writeJson} from 'fs-extra/esm';


export class BatPsdFace {
	readonly	#PATH_BJ;

	readonly	#PATH_TMP = mkdtempSync('/tmp/SKYNovel_PsdFace-');


	constructor(private readonly pc: PrjCmn) {
		this.#PATH_BJ = `${this.pc.PATH_WS}/${this.pc.FLD_SRC}/batch/cnv_psd_face.json`;
	}

	//MARK: バッチ処理
	async go(src: string) {
		const oBJ: T_BJ_Psd2Layer = {
			aOrder: [],
			err: '',
		};
		const aP: Promise<void>[] = [];


		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		const psd = <T_PSD>await PSD.open(src);

		const t = psd.tree();
		const {document: {width, height}} = t.export();
		let out = `;#ED FACE
; *******************************************************
;#ED {"width":${String(width)}, "height":${String(height)}}
`;

		const a = t.descendants(); // =lay+grp に注意
		const len = a.length;
		let idxLast = len;
		// 末尾のフォルダかレイヤ群を「is_canvas_size」とする
		while (0 <= --idxLast) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const {type, parent} = a[idxLast]!;
			if (type === 'group' || parent.isRoot()) break;
		}

		let nm = '';
		const hn = getFn(src);
		a.forEach((nc, i)=> {
			const {type, name, parent} = nc;
			if (type === 'group') {
				out += `;#ED FACE_FOLDER ${name}\n`;
				nm = '_'+ name;
				return;
			}

			if (parent.isRoot()) {
				if (nm !== '') out += ';#ED FACE_FOLDER /\n';
				nm = '';
			}
			out += this.#genPsd2Layer(hn + nm, nc, idxLast <= i, width, height, aP, oBJ);
		});

		out += `
; *******************************************************

[return]\n`;

		const fnOut = this.pc.PATH_PRJ +`face/face${hn}.sn`;
		await ensureFile(fnOut);	// 作業フォルダ作りも兼ねる
		aP.push(outputFile(fnOut, out, 'utf8'));
		await Promise.allSettled(aP);


		await writeJson(this.#PATH_BJ, oBJ, {encoding: 'utf8'});
		await this.pc.exeBatch('cnv_psd_face', '');


		await remove(this.#PATH_TMP);
	}
	#genPsd2Layer(fld: string, {name, left, top, width, height, layer}: T_PSD.Node.Layer, is_canvas_size: boolean, cvsW: number, cvsH: number, aP: Promise<void>[], oLog: T_BJ_Psd2Layer) {
		const fn = fld +'_'+ name.replaceAll(this.#REG_NG_PSD_LAYNM, '#');	// ファイル名的にアカン文字を置換
		const pp_out = `face/${fn}.png`;
		const path_out = this.pc.PATH_PRJ + pp_out;
		const bm = layer.blendingMode();
		const ret = `${
			is_canvas_size ?';' :''
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		}\t[add_face name=${fn} dx=${left} dy=${top}${
			bm === 'normal' ?'' :` blendmode=${bm}`
		}]\n`;

		if (! is_canvas_size) {
			aP.push((async ()=> {
				// console.log(`fn:cnv_psd_face.ts f canvas(${cvsW},${cvsH}) layer(${String(left).padStart(4)}, ${String(top).padStart(4)}, ${String(width).padStart(4)}, ${String(height).padStart(4)}) name:${fn}:`);

				await layer.image.saveAsPng(path_out);
			})());
			// aP.push(layer.image.saveAsPng(path_out));
			return ret;
		}

		// tmp に出力 -> キャンバス拡大してprj下へ
		const fp_tmp = `${this.#PATH_TMP}/${fn}.png`;
		aP.push((async ()=> {
			try {
				// console.log(`fn:cnv_psd_face.ts b canvas(${cvsW},${cvsH}) layer(${String(left).padStart(4)}, ${String(top).padStart(4)}, ${String(width).padStart(4)}, ${String(height).padStart(4)}) name:${fn}:`);
				await layer.image.saveAsPng(fp_tmp);

				oLog.aOrder.push({
					fp_tmp,	// sharp が fnTmp を掴むため temp を使う
					extend: {
						left,
						right	: cvsW -left -width,
						top,
						bottom	: cvsH -top -height,
						background	: {r: 0, g: 0, b: 0, alpha: 0},
					},
					pp_out,
				})
			}
			catch (e) {
				// console.log(`  extend(left:${left}, right:${cvsW -left -width}, top:${top}, bottom:${cvsH -top -height})`);
				console.error('  PSD が異常です'+ String(
					left < 0 || cvsW -left -width < 0 ||
					top < 0 || cvsH -top -height < 0
				) ?'。レイヤがキャンバスからはみ出ています。レイヤを動かすかトリミングしてください' :'');
				console.error(`  [ERR] ${String(e)}`);
			}
		})());

		return ret;
	}
		readonly #REG_NG_PSD_LAYNM	= /[\\/:*?"<>|.\s]/g;

}
