/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {foldProc, uint} from './CmnLib';
import {ConfigBase} from './ConfigBase';
import type {HSysBaseArg, IConfig, IFn2Path, ISysRoots} from './ConfigBase';
import {DEF_CFG} from '../views/types';
import {Encryptor} from './Encryptor';
import type {T_DIAG, T_H_ADIAG} from './Project';

import {Uri, window} from 'vscode';
import {parse, resolve} from 'node:path';
import {imageSizeFromFile} from 'image-size/fromFile';
import {readJson, existsSync, outputJson, writeJson} from 'fs-extra';
import {readFile} from 'node:fs/promises';


export class SysExtension implements ISysRoots {
	constructor(readonly arg: HSysBaseArg) {}
	async loadPath(hPathFn2Exts: IFn2Path, _cfg: IConfig) {
		const fn = this.arg.cur +'path.json';
		const oJs = await readJson(fn, {encoding: 'utf8'});
		for (const [nm, v] of Object.entries(oJs)) {
			const h = hPathFn2Exts[nm] = <any>v;
			for (const [ext, w] of Object.entries(h)) {
				if (ext !== ':cnt') h[ext] = this.arg.cur + w;
			}
		}
	};
	readonly	dec	= (_ext: string, d: string)=> Promise.resolve(d);
	readonly	decAB = (ab: ArrayBuffer)=> Promise.resolve(ab);

	set crypto(v: boolean) {this.arg.crypto = v;}
	readonly	fetch = async (url: string)=> new Response(await readJson(url, {encoding: 'utf8'}));
	readonly	hash: (_data: string)=> '';

	protected $path_downloads	= '';
	get path_downloads() {return this.$path_downloads}
	protected $path_userdata	= '';
	get path_userdata() {return this.$path_userdata}
}


export class Config extends ConfigBase {
	constructor(override readonly sys: SysExtension, private encry: Encryptor) {super(sys)}
	setCryptoMode(v: boolean) {this.sys.crypto = v;}

	async loadEx(encFile: (uri: Uri)=> Promise<void>, haDiagFn: T_H_ADIAG) {
		const fpPrj = this.sys.arg.cur +'prj.json';
		const fpPath= this.sys.arg.cur +'path.json';
		try {
			const o = await readJson(fpPrj, {encoding: 'utf8'});
			await super.load({
				...DEF_CFG,
				...o,
				book	: {...DEF_CFG.book, ...o.book},
				window	: {...DEF_CFG.window, ...o.window},
				log		: {...DEF_CFG.log, ...o.log},
				init	: {...DEF_CFG.init, ...o.init},
				debug	: {...DEF_CFG.debug, ...o.debug},
				code	: {...DEF_CFG.code, ...o.code},
			});

			this.hPathFn2Exts = await this.#get_hPathFn2Exts(this.sys.arg.cur, haDiagFn);
			await outputJson(fpPath, this.hPathFn2Exts);

			if (this.sys.crypto) encFile(Uri.file(fpPath));

//			this.#codSpt.updPath(this.#hPathFn2Exts);	// NOTE: Score
		}
		catch (e) {console.error(`Project loadPrjJs ${e} fpPrj=${fpPrj}= fpPath=${fpPath}=`);}
	}

	readonly	#REG_NEEDHASH	= /\.(js|css)$/;	// 改竄チェック処理対象
		// js,css：暗号化HTMLから読み込む非暗号化ファイルにつき
	readonly #REG_SPRSHEETIMG	= /^(.+)\.(\d+)x(\d+)\.(png|jpe?g)$/;
	async #get_hPathFn2Exts($cur: string, haDiagFn: T_H_ADIAG): Promise<IFn2Path> {
		const hFn2Path: IFn2Path = {};

	//	const REG_FN_RATE_SPRIT	= /(.+?)(?:%40(\d)x)?(\.\w+)/;
		// ｛ファイル名：｛拡張子：パス｝｝形式で格納。
		//		検索が高速なハッシュ形式。
		//		ここでの「ファイル名」と「拡張子」はスクリプト経由なので
		//		URLエンコードされていない物を想定。
		//		パスのみURLエンコード済みの、File.urlと同様の物を。
		//		あとで実際にロード関数に渡すので。
		foldProc($cur, ()=> {}, dir=> {
			const wd = resolve($cur, dir);
			foldProc(wd, async (fp, nm)=> {
				const aD: T_DIAG[] = [];
				this.#addPath(hFn2Path, dir, nm, aD);

				// 合成文字が含まれてたら警告を出す
				if (nm.normalize('NFC').length !== nm.normalize('NFD').length) aD.push({mes:`ファイル名は濁点(゛)・半濁点(゜)など合成文字を避けて下さい。トラブルの元です`, sev: 'W'});
				if (aD.length > 0) haDiagFn[fp] = aD;

				// スプライトシート用json自動生成機能
				// breakline.5x20.png などから breakline.json を（無ければ）生成
				const a2 = nm.match(this.#REG_NEEDHASH);
				if (a2) {
					const s = await readFile(fp, {encoding: 'utf8'});
					const snm = nm.slice(0, -a2[0].length);	// 拡張子を外したもの
					const p = hFn2Path[snm];
					if (p) p[a2[1] +':id'] = 'u5:'+ this.encry.uuidv5(s);
				}
				const a = nm.match(this.#REG_SPRSHEETIMG);
				if (! a) return;

				const fnJs = resolve(wd, a[1] +'.json');
				if (existsSync(fnJs)) return;

				const {width = 0, height = 0} = await imageSizeFromFile(fp);
				const xLen = uint(a[2]);
				const yLen = uint(a[3]);
				const w = width /xLen;
				const h = height /yLen;
				const basename = a[1];
				const ext = a[4];

				const oJs :any = {
					frames: {},
					meta: {
						app: 'skynovel',
						version: '1.0',
						image: a[0],
						format: 'RGBA8888',
						size: {w: width, h :height},
						scale: 1,
						animationSpeed: 1,	// 0.01~1.00
					},
				};
				let cnt = 0;
				for (let ix=0; ix<xLen; ++ix) {
					for (let iy=0; iy<yLen; ++iy) {
						oJs.frames[basename + String(++cnt).padStart(4, '0') +'.'+ ext] = {
							frame	: {x: ix *w, y: iy*h, w: w, h :h},
							rotated	: false,
							trimmed	: false,
							spriteSourceSize
								: {x: 0, y: 0, w: width, h :height},
							sourceSize	: {w: w, h :h},
							pivot		: {x: 0.5, y: 0.5},
						};
					}
				}
				await writeJson(fnJs, oJs);
				window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${a[1]}.json を自動生成しました`);

				this.#addPath(hFn2Path, dir, `${a[1]}.json`, aD);
				if (aD.length > 0) haDiagFn[fp] = aD;
			}, ()=> {});
		});

		return hFn2Path;
	}
	#addPath(hFn2Path: IFn2Path, dir: string, nm: string, aD: T_DIAG[]) {
		const {name: fn, base, ext} = parse(nm);
		const ext2 = ext.slice(1);
		let hExts = hFn2Path[fn];
		if (! hExts) hExts = hFn2Path[fn] = {':cnt': <any>0};
		else if (ext2 in hExts) {
			aD.push({mes: `プロジェクト内でファイル【${base}】が重複しています。フォルダを縦断検索するため許されません`, sev: 'W'});
			return;
		}

		hExts[':cnt'] = <any>(uint(hExts[':cnt']) +1);
		hExts[ext2] = dir +'/'+ nm;
	}

}
