/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {statBreak, uint, treeProc, foldProc, replaceFile} from './CmnLib';
import {ReferenceProvider} from './ReferenceProvider';
import {PrjSetting} from './PrjSetting';

import {ExtensionContext, workspace, Disposable, tasks, Task, ShellExecution, window, TreeItem} from 'vscode';
const fs = require('fs-extra');
const path = require('path');
const img_size = require('image-size');
const crypt = require('crypto-js');
const uuidv4 = require('uuid/v4');

interface IExts { [ext: string]: string; };
interface IFn2Path { [fn: string]: IExts; };

export class PrjFileProc {
	private	readonly	rp		: ReferenceProvider;	// リファレンス

	private	readonly	curPlg	: string;
	private	readonly	curPrj	: string;
	private	readonly	fnPrjJs	: string;
	private	readonly	curCrypt: string;
	private readonly	fld_crypt_prj	= 'crypt_prj';
//	private readonly	fld_crypt_prj	= '.prj';

	private	readonly	aFSW	: Disposable[];
	private		need_upd_title	= true;

	constructor(private readonly context: ExtensionContext, private readonly dir: string, private readonly ti: TreeItem) {
		this.curPlg = dir +'/core/plugin';
		fs.ensureDirSync(this.curPlg);	// 無ければ作る
		this.updPlugin();

		this.curPrj = dir +'/prj/';
		this.fnPrjJs = this.curPrj +'prj.json';
		this.updPathJson();
		this.rp = new ReferenceProvider(context, this.curPrj);

		// プラグインフォルダ増減でビルドフレームワークに反映する機能
		// というか core/plugin/plugin.js自動更新機能
		const fwPlg = workspace.createFileSystemWatcher(this.curPlg +'/?*/');
		// ファイル増減を監視し、path.json を自動更新
		const fwPrj = workspace.createFileSystemWatcher(this.curPrj +'*/*');
		this.aFSW = [
			fwPlg.onDidCreate(()=> this.updPlugin()),
			fwPlg.onDidDelete(()=> this.updPlugin()),

			fwPrj.onDidCreate(e=> {this.rp.crePrj(e); this.updPathJson();}),
			fwPrj.onDidChange(e=> {this.rp.chgPrj(e)}),
			fwPrj.onDidDelete(e=> {this.rp.delPrj(e); this.updPathJson();}),
		];	// NOTE: ワークスペースだと、削除イベントしか発生しない？？

		this.curCrypt = dir +`/${this.fld_crypt_prj}/`;
		this.lenCurPrj = this.curPrj.length;
		const fnPass = this.curPlg +'/pass.json';
		const exists_pass = fs.existsSync(fnPass);
		this.hPass = exists_pass
			? fs.readJsonSync(fnPass, {throws: false})
			: {
				pass	: uuidv4(),
				salt	: String(crypt.enc.Hex.parse(crypt.lib.WordArray.random(128 / 8))),
				iv		: String(crypt.lib.WordArray.random(128 / 8)),
				ite		: 500 + Math.floor(new Date().getTime() %300),
			};
		if (! exists_pass) fs.outputJsonSync(fnPass, this.hPass);

		this.iv = crypt.enc.Hex.parse(this.hPass.iv);
		this.pbkdf2 = crypt.PBKDF2(
			crypt.enc.Utf8.parse(this.hPass.pass),
			crypt.enc.Hex.parse(this.hPass.salt),
			{keySize: this.hPass.keySize, iterations: this.hPass.ite},
		);
		if (this.isCryptMode) this.initCrypt();

		new PrjSetting(context, dir);
	}
	private	lenCurPrj: number;
	private	hPass: {
		pass	: string,
		salt	: string,
		iv		: string,
		keySize	: string,
		ite		: string,
	};

	dispose() {this.aFSW.forEach(f=> f.dispose());}


	get isCryptMode(): boolean {return fs.existsSync(this.curCrypt);}
	private	readonly	aRepl = [
		'core/app4webpack.js',
		'core/mob4webpack.js',
		'core/web4webpack.js',
	];
	tglCryptMode() {
		const pathPre = this.curPlg +'/snsys_pre';
		if (this.isCryptMode) {
			fs.removeSync(this.curCrypt);

			fs.removeSync(pathPre);

			// SKYNovelが見に行くプロジェクトフォルダ名変更
			this.aRepl.forEach(url=> replaceFile(
				this.dir +'/'+ url,
				new RegExp(`\\(hPlg, {cur: '${this.fld_crypt_prj}\\/'}\\);`),
				`(hPlg);`,
			));

			// ビルド情報：パッケージするフォルダ名変更
			replaceFile(
				this.dir +'/package.json',
				new RegExp(`"${this.fld_crypt_prj}\\/",`),
				`"prj/",`,
			);
			return;
		}
		fs.ensureDir(this.curCrypt);

		// SKYNovelが見に行くプロジェクトフォルダ名変更
		this.aRepl.forEach(url=> replaceFile(
			this.dir +'/'+ url,
			/\(hPlg\);/,
			`(hPlg, {cur: '${this.fld_crypt_prj}/'});`,
		));

		// ビルド情報：パッケージするフォルダ名変更
		replaceFile(
			this.dir +'/package.json',
			/"prj\/",/,
			`"${this.fld_crypt_prj}/",`,
		);

		// プラグインソースに埋め込む
		replaceFile(
			this.context.extensionPath +`/res/snsys_pre/index.js`,
			/{p:0}/,
			JSON.stringify(this.hPass),
			pathPre +'/index.js',
		);

		this.initCrypt();
	}
	// プロジェクトフォルダ以下全走査
	private initCrypt() {treeProc(this.curPrj, url=> this.encrypter(url));}

	private	pbkdf2	: any;
	private	iv		: any;
	async encrypter(url: string) {
		const short_path = url.slice(this.lenCurPrj);
		if (short_path == 'path.json') {
			replaceFile(url, /(\.|")sn"/g, `$1sn_"`, this.curCrypt + short_path);
			return;
		}
		if (url.slice(-3) != '.sn') {
	//		fs.ensureLink(url, this.curCrypt + short_path)
			fs.ensureSymlink(url, this.curCrypt + short_path)
			.catch((err: any)=> console.error(`PrjFileProc Symlink ${err}`));
			return;
		}

		// TODO: ハッシュ辞書作って更新チェック、同じなら更新しない
		try {
			const src = await fs.readFile(url, {encoding: 'utf8'});
			const encrypted = crypt.AES.encrypt(
				src,
				this.pbkdf2,
				{iv: this.iv},
			);

			const fn = this.curCrypt + short_path +'_';
			await fs.outputFile(fn, String(encrypted));
		} catch (err) {console.error(`PrjFileProc encrypter ${err}`);}
	}


	private	updPlugin() {
		if (! fs.existsSync(this.curPlg)) return;

		const h: any = {};
		foldProc(this.curPlg, ()=> {}, nm=> h[nm] = 0);
		fs.outputFile(this.curPlg +'.js', `export default ${JSON.stringify(h)};`)
		.then(()=> this.rebuildTask())
		.catch((err: any)=> console.error(`PrjFileProc updPlugin ${err}`));
	}
	private rebuildTask() {
		let cmd = `cd "${this.dir}" ${statBreak()} `;
		if (! fs.existsSync(this.dir +'/node_modules')) cmd += `npm i ${statBreak()} `;		// 自動で「npm i」
		if (! fs.existsSync(this.dir +'/node_modules/crypto-js')) cmd += `npm i -S crypto-js ${statBreak()} npm i -D @types/crypt-js ${statBreak()} `;		// 自動で……処理、2020/6/17頃前には消してもいい
		cmd += 'npm run webpack:dev';
		const t = new Task(
			{type: 'SKYNovel auto'},	// definition（タスクの一意性）
			'webpack:dev',				// name、UIに表示
			'SKYNovel',					// source
			new ShellExecution(cmd),
		);
		tasks.executeTask(t);
	}


	private	async updPathJson() {
		if (! fs.existsSync(this.fnPrjJs)) {
			this.ti.label = 'prj/prj.json がありません';
			this.need_upd_title = true;
			return;
		}

		try {
			const oPpj = await fs.readJson(this.fnPrjJs);
			if (this.need_upd_title) {
				this.need_upd_title = false;
				if (oPpj.book) this.ti.label = oPpj.book.title || '';
				return;
			}

			const hPath = this.get_hPathFn2Exts(this.curPrj);
			fs.outputJson(this.curPrj +'path.json', hPath);
		}
		catch (err) {
			console.error(`PrjFileProc updPathJson ${err}`);
		}
	}
	private	readonly regSprSheetImg = /^(.+)\.(\d+)x(\d+)\.(png|jpg|jpeg)$/;
	private get_hPathFn2Exts($cur: string): IFn2Path {
		const hFn2Path: IFn2Path = {};

	//	const REG_FN_RATE_SPRIT	= /(.+?)(?:%40(\d)x)?(\.\w+)/;
		// ｛ファイル名：｛拡張子：パス｝｝形式で格納。
		//		検索が高速なハッシュ形式。
		//		ここでの「ファイル名」と「拡張子」はスクリプト経由なので
		//		URLエンコードされていない物を想定。
		//		パスのみURLエンコード済みの、File.urlと同様の物を。
		//		あとで実際にロード関数に渡すので。
		foldProc($cur, ()=> {}, (dir: string)=> {
			const wd = path.resolve($cur, dir);
			foldProc(wd, (url, nm)=> {
				// スプライトシート用json自動生成機能
				// breakline.5x20.png などから breakline.json を（無ければ）生成
				const m = nm.match(this.regSprSheetImg);
				if (! m) {this.addPath(hFn2Path, dir, nm); return;}

				const fnJs = path.resolve(wd, m[1] +'.json');
				if (fs.existsSync(fnJs)) return;

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
						oJs.frames[basename + String(++cnt).padStart(4, '0') +'.'+ ext] = {
							frame	: {x: ix *w, y: iy*h, w: w, h :h},
							rotated	: false,
							trimmed	: false,
							spriteSourceSize
									: {x: 0, y: 0, w: size.width, h :size.height},
							sourceSize	: {w: w, h :h},
							pivot		: {x: 0.5, y: 0.5},
						};
					}
				}
				fs.writeFileSync(fnJs, JSON.stringify(oJs));
				window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${m[1]}.json を自動生成しました`);

				this.addPath(hFn2Path, dir, `${m[1]}.json`);
			}, ()=> {});
		});

		return hFn2Path;
	}
	private addPath(hFn2Path: IFn2Path, dir: string, nm: string) {
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

}
