/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {uint} from './CmnLib';
import {window} from 'vscode';
const fs = require('fs');
const path = require('path');
const img_size = require('image-size');
interface IExts { [ext: string]: string; };
interface IFn2Path { [fn: string]: IExts; };

const regNoUseSysFile = /^(\..+|.+.db|.+.ini|_notes|Icon\r)$/;
const regSprSheetImg = /^(.+)\.(\d+)x(\d+)\.(png|jpg|jpeg)$/;

export	function	updPathJson(cur: string) {
	if (! fs.existsSync(cur +'prj.json')) {
		window.showErrorMessage(`prj/prj.json がありません path=${cur +'prj.json'}`);
		return;
	}

	const jsonPrj = fs.readFileSync(cur +'prj.json');
	const hPath = get_hPathFn2Exts(cur, JSON.parse(jsonPrj));
	fs.writeFileSync(cur +'path.json', JSON.stringify(hPath));
};
export	function	updPlugin(curPlg: string) {
	const h: any = {};
	for (const nm of fs.readdirSync(curPlg)) {
		if (regNoUseSysFile.test(nm)) continue;

		const url = path.resolve(curPlg, nm);
		if (fs.lstatSync(url).isDirectory()) h[nm] = 0;
	}
	fs.writeFileSync(curPlg +'.js', `export default ${JSON.stringify(h)};`);
};

function	get_hPathFn2Exts($cur: string, oCfg: any): IFn2Path {
	const hFn2Path: IFn2Path = {};

//	const REG_FN_RATE_SPRIT	= /(.+?)(?:%40(\d)x)?(\.\w+)/;
	// ｛ファイル名：｛拡張子：パス｝｝形式で格納。
	//		検索が高速なハッシュ形式。
	//		ここでの「ファイル名」と「拡張子」はスクリプト経由なので
	//		URLエンコードされていない物を想定。
	//		パスのみURLエンコード済みの、File.urlと同様の物を。
	//		あとで実際にロード関数に渡すので。
	if (oCfg.search) for (const dir of oCfg.search) {
		const wd = path.resolve($cur, dir);
		if (! fs.existsSync(wd)) continue;

		for (const nm_base of fs.readdirSync(wd)) {
			const nm = nm_base.normalize('NFC');
			if (regNoUseSysFile.test(nm)) continue;
			const url = path.resolve(wd, nm);
			if (fs.lstatSync(url).isDirectory()) continue;

			// スプライトシート用json自動生成機能
			// breakline.5x20.png などから breakline.json を（無ければ）生成
			const m = nm.match(regSprSheetImg);
			if (! m) {addPath(hFn2Path, dir, nm); continue;}
			const fnJs = path.resolve(wd, m[1] +'.json');
			if (! fs.existsSync(fnJs)) {
				const size = img_size(url);
				const xLen = uint(m[2]);
				const yLen = uint(m[3]);
				const w = size.width /xLen;
				const h = size.height /yLen;
				const basename = m[1];
				const ext = m[4];

				const oJs :any = {
					frames: {},
					meta: {
						app: 'skynovel',
						version: '1.0',
						image: m[0],
						format: 'RGBA8888',
						size: {w: size.width, h :size.height},
						scale: 1,
						animationSpeed: 1,	// 0.01~1.00
					},
				};
				let cnt = 0;
				for (let ix=0; ix<xLen; ++ix) {
					for (let iy=0; iy<yLen; ++iy) {
						++cnt;
						oJs.frames[basename + String(cnt).padStart(4, '0') +'.'+ ext] = {
							frame: {x: ix *w, y: iy*h, w: w, h :h},
							rotated: false,
							trimmed: false,
							spriteSourceSize: {x: 0, y: 0, w: size.width, h :size.height},
							sourceSize: {w: w, h :h},
							pivot: {x: 0.5, y: 0.5},
						};
					}
				}
				fs.writeFileSync(fnJs, JSON.stringify(oJs));
				window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${m[1]}.json を自動生成しました`);

				addPath(hFn2Path, dir, `${m[1]}.json`);
			}
		}
	}

	return hFn2Path;
}

function	addPath(hFn2Path: IFn2Path, dir: string, nm: string) {
	const p = path.parse(nm);
	const ext = p.ext.slice(1);
	const fn = p.name;
	let hExts = hFn2Path[fn];
	if (! hExts) {
		hExts = hFn2Path[fn] = {':cnt': '1'};
	}
	else if (ext in hExts) {
		window.showErrorMessage(`[SKYNovel] サーチパスにおいてファイル名＋拡張子【${fn}】が重複しています。フォルダを縦断検索するため許されません`);
	}
	else {
		hExts[':cnt'] = String(uint(hExts[':cnt']) +1);
	}
	hExts[ext] = dir +'/'+ nm;
}
