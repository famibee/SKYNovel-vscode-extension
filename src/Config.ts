/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {foldProc, hDiagL2s, uint} from './CmnLib';
import {ConfigBase} from './ConfigBase';
import type {HSysBaseArg, IConfig, IFn2Path, ISysRoots, T_CFG} from './ConfigBase';
import {DEF_CFG} from './types';
import type {Encryptor} from './Encryptor';
import type {T_H_ADIAG, T_H_ADIAG_L2S} from '../server/src/LspWs';

import {imageSizeFromFile} from 'image-size/fromFile';

import {Uri, window} from 'vscode';
import {parse, resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {readJson, existsSync, outputJson, writeJson} from 'fs-extra';


export class SysExtension implements ISysRoots {
	constructor(readonly arg: HSysBaseArg) {}
	async loadPath(hPathFn2Exts: IFn2Path, _cfg: IConfig) {
		const fn = this.arg.cur +'path.json';
		const oJs = <IFn2Path>await readJson(fn, {encoding: 'utf8'});
		for (const [nm, v] of Object.entries(oJs)) {
			const h = hPathFn2Exts[nm] = v;
			for (const [ext, w] of Object.entries(h)) {
				if (ext !== ':cnt') h[ext] = this.arg.cur + <string>w;
			}
		}
	}
	readonly	dec	= (_ext: string, d: string)=> Promise.resolve(d);
	readonly	decAB = (ab: ArrayBuffer)=> Promise.resolve(ab);

	set crypto(v: boolean) {this.arg.crypto = v;}
	readonly	fetch = async (url: string)=> new Response(
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		await readJson(url, {encoding: 'utf8'})
	);
	readonly	hash: (_data: string)=> '';

	protected $path_downloads	= '';
	get path_downloads() {return this.$path_downloads}
	protected $path_userdata	= '';
	get path_userdata() {return this.$path_userdata}
}


export class Config extends ConfigBase {
	constructor(override readonly sys: SysExtension, private encry: Encryptor) {super(sys)}
	setCryptoMode(v: boolean) {this.sys.crypto = v;}

	async loadEx(encFile: (uri: Uri)=> Promise<void>, haDiagFn: T_H_ADIAG_L2S) {
		const fpPrj = this.sys.arg.cur +'prj.json';
		const fpPath= this.sys.arg.cur +'path.json';
		try {
			const o = <T_CFG>await readJson(fpPrj, {encoding: 'utf8'});
			const d = structuredClone(DEF_CFG);
			await super.load(<T_CFG>{
				...d,
				...o,
				book	: {...d.book, ...o.book},
				window	: {...d.window, ...o.window},
				log		: {...d.log, ...o.log},
				init	: {...d.init, ...o.init},
				debug	: {...d.debug, ...o.debug},
				code	: {...d.code, ...o.code},
			});

			this.hPathFn2Exts = await this.#get_hPathFn2Exts(this.sys.arg.cur, haDiagFn);
			await outputJson(fpPath, this.hPathFn2Exts);

			if (this.sys.crypto) await encFile(Uri.file(fpPath));

//			this.#codSpt.updPath(this.#hPathFn2Exts);	// NOTE: Score
		}
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		catch (e) {console.error(`Project loadPrjJs ${e} fpPrj=${fpPrj}= fpPath=${fpPath}=`);}
	}

	readonly	#REG_NEEDHASH	= /\.(js|css)$/;	// 改竄チェック処理対象
		// js,css：暗号化HTMLから読み込む非暗号化ファイルにつき
	readonly #REG_SPRSHEETIMG	= /^(.+)\.(\d+)x(\d+)\.(png|jpe?g)$/;
	async #get_hPathFn2Exts($cur: string, haDiagFn: T_H_ADIAG_L2S): Promise<IFn2Path> {
		const hFn2Path: IFn2Path = {};
		const aDo: Promise<void>[] = [];

	//	const REG_FN_RATE_SPRIT	= /(.+?)(?:%40(\d)x)?(\.\w+)/;
		// ｛ファイル名：｛拡張子：パス｝｝形式で格納。
		//		検索が高速なハッシュ形式。
		//		ここでの「ファイル名」と「拡張子」はスクリプト経由なので
		//		URLエンコードされていない物を想定。
		//		パスのみURLエンコード済みの、File.urlと同様の物を。
		//		あとで実際にロード関数に渡すので。
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const {mes, sev} = hDiagL2s.ファイル名合成文字!;
		foldProc($cur, ()=> { /* empty */ }, dir=> {
			const wd = resolve($cur, dir);
			foldProc(wd, (fp, nm)=> {
				const aD: T_H_ADIAG[] = [];
				this.#addPath(hFn2Path, dir, nm, aD);

				// 合成文字が含まれてたら警告を出す
				if (nm.normalize('NFC').length !== nm.normalize('NFD').length) aD.push({mes, sev});
				if (aD.length > 0) haDiagFn[fp] = aD;

				// スプライトシート用json自動生成機能
				// breakline.5x20.png などから breakline.json を（無ければ）生成
				const a2 = nm.match(this.#REG_NEEDHASH);
				if (a2) {
					const snm = nm.slice(0, -a2[0].length);	// 拡張子を外したもの
					const p = hFn2Path[snm];
					if (p) {
						aDo.push((async ()=> {
							const s = await readFile(fp, {encoding: 'utf8'});
							// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
							p[a2[1] +':id'] = 'u5:'+ this.encry.uuidv5(s);
						})());
					}
				}
				const a = nm.match(this.#REG_SPRSHEETIMG);
				if (! a) return;

				const [, basename='', axLen='', ayLen='', ] = a;
				const fnJs = resolve(wd, basename +'.json');
				if (existsSync(fnJs)) return;

				aDo.push((async ()=> {
					const {width, height} = await imageSizeFromFile(fp);
					const xLen = uint(axLen);
					const yLen = uint(ayLen);
					const w = width /xLen;
					const h = height /yLen;
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const ext = a[4]!;

					const oJs = {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
						frames: <any>{},
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
					window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${basename}.json を自動生成しました`);

					this.#addPath(hFn2Path, dir, `${basename}.json`, aD);
					if (aD.length > 0) haDiagFn[fp] = aD;
				})());
			}, ()=> { /* empty */ });
		});

		await Promise.allSettled(aDo);

		return hFn2Path;
	}
	#addPath(hFn2Path: IFn2Path, dir: string, nm: string, aD: T_H_ADIAG[]) {
		const {name: fn, base, ext} = parse(nm);
		const ext2 = ext.slice(1);
		let hExts = hFn2Path[fn];
		if (! hExts) hExts = hFn2Path[fn] = {':cnt': <never>0};
		else if (ext2 in hExts) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const {mes, sev} = hDiagL2s.ファイル重複!;
			aD.push({mes: mes.replace('$', base), sev});
			return;
		}

		hExts[':cnt'] = <never>(uint(hExts[':cnt']) +1);
		hExts[ext2] = dir +'/'+ nm;
	}

}
