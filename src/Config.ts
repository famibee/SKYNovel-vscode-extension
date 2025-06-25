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

import {imageSizeFromFile} from 'image-size/fromFile';
import {readJson, existsSync, outputJson, readFileSync, writeJsonSync} from 'fs-extra';
import {parse, resolve} from 'path';
import {Diagnostic, Uri, DiagnosticSeverity, window, DiagnosticCollection, Range} from 'vscode';


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

	async loadEx(encFile: (uri: Uri)=> Promise<void>, clDiag: DiagnosticCollection) {
		const fpPrj = this.sys.arg.cur +'prj.json';
		const fpPath= this.sys.arg.cur +'path.json';
		try {
			let o = await readJson(fpPrj, {encoding: 'utf8'});
			o = {
				...DEF_CFG,
				...o,
				book	: {...DEF_CFG.book, ...o.book},
				window	: {...DEF_CFG.window, ...o.window},
				log		: {...DEF_CFG.log, ...o.log},
				init	: {...DEF_CFG.init, ...o.init},
				debug	: {...DEF_CFG.debug, ...o.debug},
				code	: {...DEF_CFG.code, ...o.code},
			};
			await super.load(o);

			this.hPathFn2Exts = this.#get_hPathFn2Exts(this.sys.arg.cur, clDiag);
			await outputJson(fpPath, this.hPathFn2Exts);

			if (this.sys.crypto) encFile(Uri.file(fpPath));

//			this.#codSpt.updPath(this.#hPathFn2Exts);	// NOTE: Score
		}
		catch (err) {console.error(`Project loadPrjJs ${err} fpPrj=${fpPrj}= fpPath=${fpPath}=`);}
	}

	readonly	#REG_NEEDHASH	= /\.(js|css)$/;	// 改竄チェック処理対象
		// js,css：暗号化HTMLから読み込む非暗号化ファイルにつき
	readonly #REG_SPRSHEETIMG	= /^(.+)\.(\d+)x(\d+)\.(png|jpe?g)$/;
	#get_hPathFn2Exts($cur: string, clDiag: DiagnosticCollection): IFn2Path {
		const hFn2Path: IFn2Path = {};

	//	const REG_FN_RATE_SPRIT	= /(.+?)(?:%40(\d)x)?(\.\w+)/;
		// ｛ファイル名：｛拡張子：パス｝｝形式で格納。
		//		検索が高速なハッシュ形式。
		//		ここでの「ファイル名」と「拡張子」はスクリプト経由なので
		//		URLエンコードされていない物を想定。
		//		パスのみURLエンコード済みの、File.urlと同様の物を。
		//		あとで実際にロード関数に渡すので。
		const aD: Diagnostic[] = [];
		foldProc($cur, ()=> {}, dir=> {
			const wd = resolve($cur, dir);
			foldProc(wd, async (fp, nm)=> {
				this.#addPath(hFn2Path, dir, nm, aD);

				// スプライトシート用json自動生成機能
				// breakline.5x20.png などから breakline.json を（無ければ）生成
				const a2 = nm.match(this.#REG_NEEDHASH);
				if (a2) {
					const s = readFileSync(fp, {encoding: 'utf8'});
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
				writeJsonSync(fnJs, oJs);
				window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${a[1]}.json を自動生成しました`);

				this.#addPath(hFn2Path, dir, `${a[1]}.json`, aD);
			}, ()=> {});
		});
		if (clDiag) {
			clDiag.delete(this.#URI_DUMMY_MAT);
			if (aD.length > 0) clDiag.set(this.#URI_DUMMY_MAT, aD);
		}

		return hFn2Path;
	}
	readonly #URI_DUMMY_MAT		= Uri.file('素材ファイル');
	#addPath(hFn2Path: IFn2Path, dir: string, nm: string, aD: Diagnostic[]) {
		const {name: fn, base, ext} = parse(nm);
		const ext2 = ext.slice(1);
		let hExts = hFn2Path[fn];
		if (! hExts) hExts = hFn2Path[fn] = {':cnt': <any>1};
		else if (ext2 in hExts) {
			aD.push(new Diagnostic(new Range(0, 0, 0, 0), `プロジェクト内でファイル【${base}】が重複しています。フォルダを縦断検索するため許されません`, DiagnosticSeverity.Error));
			return;
		}
		else {
			hExts[':cnt'] = <any>(uint(hExts[':cnt']) +1);
		}
		hExts[ext2] = dir +'/'+ nm;
	}

}
