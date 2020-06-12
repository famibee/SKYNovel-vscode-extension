/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {statBreak, uint, treeProc, foldProc, replaceFile, regNoUseSysPath} from './CmnLib';
import {CodingSupporter} from './CodingSupporter';
import {PnlPrjSetting} from './PnlPrjSetting';

import {ExtensionContext, workspace, Disposable, tasks, Task, ShellExecution, window, Uri, Location, Range} from 'vscode';
import fs = require('fs-extra');
const path = require('path');
const img_size = require('image-size');
const crypto = require('crypto-js');
const {v4: uuidv4} = require('uuid');
const crc32 = require('crc-32');
import {Transform} from 'stream';

interface IExts { [ext: string]: string | number; };
interface IFn2Path { [fn: string]: IExts; };

export class Project {
	private	readonly	codSpt		: CodingSupporter;

	private	readonly	curPlg		: string;
	private	readonly	curPrj		: string;
	private	readonly	lenCurPrj	: number;
	private	readonly	curCrypto	: string;
	private readonly	fld_crypto_prj	= 'crypto_prj';
//	private readonly	fld_crypto_prj	= '.prj';
	private		$isCryptoMode	= true;
	get isCryptoMode() {return this.$isCryptoMode;}
	private	regNeedCrypto	= /\.(sn|json|html?|jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv|html?)$/;
	private	regFullCrypto	= /\.(sn|json|html?)$/;
	private	regRepPathJson	= /\.(jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)"/g;
		// この末端の「"」は必須。変更時は delPrj_sub() 内も
	private readonly	hExt2N: {[name: string]: number} = {
		'jpg'	: 1,
		'jpeg'	: 1,
		'png'	: 2,
		'svg'	: 3,
		'webp'	: 4,
		'mp3'	: 10,
		'm4a'	: 11,
		'ogg'	: 12,
		'aac'	: 13,
		'flac'	: 14,
		'wav'	: 15,
		'mp4'	: 20,
		'webm'	: 21,
		'ogv'	: 22,
	};
	private	regNeedHash	= /\.(js|css)$/;	// 改竄チェック処理対象
		// js,css：暗号化HTMLから読み込む非暗号化ファイルにつき

	private	readonly	hPass: {
		pass	: string,
		salt	: string,
		iv		: string,
		keySize	: string,
		ite		: string,
		stk		: string,
	};

	private	readonly	aFSW	: Disposable[];

	private	readonly	fnDiff	: string;
	private				hDiff	= Object.create(null);

	constructor(private readonly ctx: ExtensionContext, private readonly pathWs: string, readonly chgTitle: (title: string)=> void) {
		this.curPrj = pathWs +'/doc/prj/';
		this.codSpt = new CodingSupporter(ctx, pathWs, this.curPrj);

		this.curPlg = pathWs +'/core/plugin/';
		fs.ensureDirSync(this.curPlg);	// 無ければ作る
		if (fs.existsSync(this.pathWs +'/node_modules')) this.updPlugin();
		else {
			this.rebuildTask();
			window.showInformationMessage('初期化中です。ターミナルの処理が終わって止まるまでしばらくお待ち下さい。', {modal: true});
		}

		this.lenCurPrj = this.curPrj.length;
		this.updPathJson();

		// プラグインフォルダ増減でビルドフレームワークに反映する機能
		// というか core/plugin/plugin.js自動更新機能
		const fwPlg = workspace.createFileSystemWatcher(this.curPlg +'**/*');
		// ファイル増減を監視し、path.json を自動更新
		const fwPrj = workspace.createFileSystemWatcher(this.curPrj +'*/*');
		const fwPrjJs = workspace.createFileSystemWatcher(this.curPrj +'prj.json');
		this.aFSW = [
			fwPlg.onDidCreate(()=> this.updPlugin()),
			fwPlg.onDidChange(()=> this.updPlugin()),
			fwPlg.onDidDelete(()=> this.updPlugin()),

			fwPrj.onDidCreate(e=> {
				regNoUseSysPath.lastIndex = 0;
				if (regNoUseSysPath.test(e.path)) return;
				this.crePrj(e);
				this.codSpt.crePrj(e);
			}),
			fwPrj.onDidChange(e=> {
				regNoUseSysPath.lastIndex = 0;
				if (regNoUseSysPath.test(e.path)) return;
				this.chgPrj(e);
				this.codSpt.chgPrj(e);
			}),
			fwPrj.onDidDelete(e=> {
				regNoUseSysPath.lastIndex = 0;
				if (regNoUseSysPath.test(e.path)) return;
				this.delPrj(e);
				this.codSpt.delPrj(e);
			}),
			fwPrjJs.onDidChange(e=> this.chgPrj(e)),
		];	// NOTE: ワークスペースだと、削除イベントしか発生しない？？

		this.curCrypto = pathWs +`/doc/${this.fld_crypto_prj}/`;
		this.$isCryptoMode = fs.existsSync(this.curCrypto);
		const fnPass = this.curPlg +'pass.json';
		const exists_pass = fs.existsSync(fnPass);
		this.hPass = exists_pass
			? fs.readJsonSync(fnPass, {throws: false})
			: {
				pass	: uuidv4(),
				salt	: String(crypto.lib.WordArray.random(128 / 8)),
				iv		: String(crypto.lib.WordArray.random(128 / 8)),
				ite		: 500 + Math.floor(new Date().getTime() %300),
				stk		: String(crypto.lib.WordArray.random(128 / 8)),
			};
		if (! exists_pass) fs.outputJsonSync(fnPass, this.hPass);

		this.iv = crypto.enc.Hex.parse(this.hPass.iv);
		this.pbkdf2 = crypto.PBKDF2(
			crypto.enc.Utf8.parse(this.hPass.pass),
			crypto.enc.Hex.parse(this.hPass.salt),
			{keySize: this.hPass.keySize, iterations: this.hPass.ite},
		);

		this.fnDiff = pathWs +'/core/diff.json';
		if (fs.existsSync(this.fnDiff)) {
			this.hDiff = fs.readJsonSync(this.fnDiff);
		}
		this.ps = new PnlPrjSetting(ctx, pathWs, chgTitle, this.codSpt);
		this.initCrypto();
	}

	private	ps: PnlPrjSetting;
	openPrjSetting() {this.ps.open();}

	dispose() {this.aFSW.forEach(f=> f.dispose());}


	private	crePrj(e: Uri) {this.encIfNeeded(e.path); this.updPathJson();}
	private	chgPrj(e: Uri) {this.encIfNeeded(e.path);}
	private	delPrj(e: Uri) {
		const short_path = e.path.slice(this.lenCurPrj);
		this.regNeedCrypto.lastIndex = 0;
		fs.removeSync(
			this.curCrypto + (short_path +'"')
			.replace(this.regRepPathJson, '.bin')
			.replace(/"/, '')
		);
		this.updPathJson();

		delete this.hDiff[short_path];
		this.updDiffJson();
	}

	// プロジェクトフォルダ以下全走査で暗号化
	private initCrypto() {
		treeProc(
			this.curPrj,
			this.$isCryptoMode
				? url=> {if (this.isDiff(url)) this.encrypter(url)}
				: url=> this.isDiff(url)
		);
		this.updDiffJson();
	}
	private	encIfNeeded(url: string) {
		if (this.isDiff(url) && this.$isCryptoMode) this.encrypter(url);
		this.updDiffJson();
	}
	private	updDiffJson() {fs.writeJsonSync(this.fnDiff, this.hDiff);}
	private	readonly	LEN_CHKDIFF		= 1024;
	private	isDiff(url: string): boolean {
		const short_path = url.slice(this.lenCurPrj);
		let hash = 0;
		if (this.regFullCrypto.test(url)) {
			hash = crc32.str(fs.readFileSync(url, {encoding: 'utf8'}));
		}
		else {
			const b = new Uint8Array(this.LEN_CHKDIFF);
			const fd = fs.openSync(url, 'r');
			fs.readSync(fd, b, 0, this.LEN_CHKDIFF, 0);
			fs.closeSync(fd);
			hash = crc32.buf(b);
		}
		if (this.hDiff[short_path] === hash) return false;

		this.hDiff[short_path] = hash;
		return true;
	}


	private	readonly	aRepl = [
		'core/app4webpack.js',
		'core/mob4webpack.js',
		'core/web4webpack.js',
	];
	tglCryptoMode() {
		const pathPre = this.curPlg +'snsys_pre';
		this.$isCryptoMode = ! this.$isCryptoMode;
		if (! this.$isCryptoMode) {
			fs.removeSync(this.curCrypto);

			fs.removeSync(pathPre);

			// SKYNovelが見に行くプロジェクトフォルダ名変更
			this.aRepl.forEach(url=> replaceFile(
				this.pathWs +'/'+ url,
				new RegExp(`\\(hPlg, {.+?}\\);`),
				`(hPlg);`,
			));

			// ビルド情報：パッケージするフォルダ名変更
			replaceFile(
				this.pathWs +'/package.json',
				new RegExp(`"${this.fld_crypto_prj}\\/",`),
				`"prj/",`,
			);

			return;
		}

		fs.ensureDir(this.curCrypto);

		// SKYNovelが見に行くプロジェクトフォルダ名変更
		this.aRepl.forEach(url=> replaceFile(
			this.pathWs +'/'+ url,
			/\(hPlg\);/,
			`(hPlg, {cur: '${this.fld_crypto_prj}/', crypto: true});`,
		));

		// ビルド情報：パッケージするフォルダ名変更
		replaceFile(
			this.pathWs +'/package.json',
			/"prj\/",/,
			`"${this.fld_crypto_prj}/",`,
		);

		// プラグインソースに埋め込む
		replaceFile(
			this.ctx.extensionPath +`/res/snsys_pre/index.js`,
			/{p:0}/,
			JSON.stringify(this.hPass),
			pathPre +'/index.js',
		);

		this.hDiff = Object.create(null);
		this.initCrypto();
	}

	private	pbkdf2	: any;
	private	iv		: any;
	private	readonly LEN_ENC	= 1024 *10;
	private	readonly regDir = /(^.+)\//;
//	private	readonly regFFn = /[^\/\s\.]+\.(.+)/g
	private	async encrypter(url: string) {
		try {
			const short_path = url.slice(this.lenCurPrj);
			const url_out = this.curCrypto + short_path;
			if (! this.regNeedCrypto.test(url)) {
				fs.ensureLink(url, url_out)
				.catch((e: any)=> console.error(`encrypter cp1 ${e}`));
				return;
			}

			if (this.regFullCrypto.test(short_path)) {
				let s = await fs.readFile(url, {encoding: 'utf8'});
				if (short_path === 'path.json') {	// 内容も変更
					s = s.replace(this.regRepPathJson, '.bin"');
/* // TODO: ファイル名匿名化・作成中
					const hPath: IFn2Path = JSON.parse(s);
					for (const fn in hPath) {
						const hExt2N = hPath[fn];
						for (const ext in hExt2N) {
							if (ext === ':cnt') continue;
							if (ext.slice(-10) === ':RIPEMD160') continue;
							const path = String(hExt2N[ext]);
							this.mkCryptoIfNeeded(ext, path);

							// 置換するのはファイル名だが、乱数名が同じなので拡張子も
							hExt2N[ext] = path.replace(this.regFn, (_m, m1)=> crypto.RIPEMD160(m1) +'.'+ m1);
						}
					}

	console.log(`fn:PrjFileProc.ts line:299 hPath:%o`, hPath);
*/
				}
				const e = crypto.AES.encrypt(s, this.pbkdf2, {iv: this.iv});
				await fs.outputFile(url_out, e.toString());
				return;
			}

			const dir = this.regDir.exec(short_path);
			if (dir && this.ps.cfg.code[dir[1]]) {
				fs.ensureLink(url, url_out)
				.catch((e: any)=> console.error(`encrypter cp2 ${e}`));
				return;
			}

			let nokori = this.LEN_ENC;
			let i = 2;
			const bh = new Uint8Array(i + nokori);
			bh[0] = 0;	// bin ver
			bh[1] = this.hExt2N[path.extname(short_path).slice(1)] ?? 0;

			const rs = fs.createReadStream(url)
			.on('error', (e :any)=> console.error(`encrypter rs=%o`, e));

			const u2 = url_out.replace(/\.[^.]+$/, '.bin');
			fs.ensureFileSync(u2);	// touch
			const ws = fs.createWriteStream(u2)
			.on('error', (e :any)=> console.error(`encrypter ws=%o`, e));

			const tr = new Transform({transform: (chunk, _enc, cb)=> {
				if (nokori === 0) {cb(null, chunk); return;}

				const len = chunk.length;
				if (nokori > len) {
					bh.set(chunk, i);
					i += len;
					nokori -= len;
					cb(null);
					return;
				}

				bh.set(chunk.slice(0, nokori), i);
				const e6 = crypto.AES.encrypt(
					crypto.lib.WordArray.create(bh),
					this.pbkdf2,
					{iv: this.iv},
				);
				const e = Buffer.from(e6.toString(), 'base64'); // atob(e6)

				const bl = Buffer.alloc(4);
				bl.writeUInt32LE(e.length, 0);	// cripted len
				tr.push(bl);

				tr.push(e);

				cb(null, (nokori === len) ?null :chunk.slice(nokori));
				nokori = 0;
			}})
			.on('end', ()=> {
				if (nokori === 0) return;

				const e6 = crypto.AES.encrypt(
					crypto.lib.WordArray.create(bh.slice(0, i)),
					this.pbkdf2,
					{iv: this.iv},
				);
				const e = Buffer.from(e6.toString(), 'base64'); // atob(e6)

				const bl = Buffer.alloc(4);
				bl.writeUInt32LE(e.length, 0);	// cripted len
				ws.write(bl);

				ws.write(e);
			});

			rs.pipe(tr).pipe(ws);
		}
		catch (e) {console.error(`encrypter other ${e.message}`);}
	}
	// 対応する暗号化ファイルが無い場合、再生成
/*	private	mkCryptoIfNeeded = (ext: string, path: string)=> {
		this.mkCryptoIfNeeded = ()=> {};
		if (fs.existsSync(this.curCrypto + path)) return;

		const base_sp = path.slice(0, path.lastIndexOf('.')+ 1) + ext;
		this.encrypter(this.curPrj + base_sp);
	}*/


	private	static	readonly	regPlgAddTag
		= /(?<=\.\s*addTag\s*\(\s*)(["'])(.+?)\1/g;
	private	updPlugin() {
		if (! fs.existsSync(this.curPlg)) return;

		const h4json: {[def_nm: string]: number} = {};
		const hDefPlg: {[def_nm: string]: Location} = {};
		foldProc(this.curPlg, ()=> {}, nm=> {
			h4json[nm] = 0;

			const path = `${this.curPlg}${nm}/index.js`;
			if (! fs.existsSync(path)) return;

			const txt = fs.readFileSync(path, 'utf8');
			let a;
			// 全ループリセットかかるので不要	.lastIndex = 0;	// /gなので必要
			while ((a = Project.regPlgAddTag.exec(txt))) {
				const nm = a[2];
				const len_nm = nm.length;
				const idx_nm = Project.regPlgAddTag.lastIndex -len_nm -1;

				let line = 0;
				let j = idx_nm;
				while ((j = txt.lastIndexOf('\n', j -1)) >= 0) ++line;

				const col = idx_nm -txt.lastIndexOf('\n', idx_nm) -1;
				hDefPlg[nm] = new Location(
					Uri.file(path),
					new Range(line, col, line, col +len_nm),
				);
			}
		});
		this.codSpt.setHDefPlg(hDefPlg);

		fs.outputFile(this.curPlg.slice(0, -1) +'.js', `export default ${JSON.stringify(h4json)};`)
		.then(()=> this.rebuildTask())
		.catch((err: any)=> console.error(`PrjFileProc updPlugin ${err}`));
	}
	private rebuildTask() {
		let cmd = `cd "${this.pathWs}" ${statBreak()} `;
		if (! fs.existsSync(this.pathWs +'/node_modules')) cmd += `npm i ${statBreak()} `;		// 自動で「npm i」
		cmd += 'npm run webpack:dev';
		const t = new Task(
			{type: 'SKYNovel auto'},	// definition（タスクの一意性）
			'webpack:dev',				// name、UIに表示
			'SKYNovel',					// source
			new ShellExecution(cmd),
		);
		tasks.executeTask(t)
		.then(undefined, rj=> console.error(`TreeDPDev rebuildTask() rj:${rj.message}`));
	}


	private	async updPathJson() {
		try {
			const hPath = this.get_hPathFn2Exts(this.curPrj);
			await fs.outputJson(this.curPrj +'path.json', hPath);
			if (this.$isCryptoMode) this.encrypter(this.curPrj +'path.json');
		}
		catch (err) {console.error(`PrjFileProc updPathJson ${err}`);}
	}
	private	readonly regSprSheetImg = /^(.+)\.(\d+)x(\d+)\.(png|jpe?g)$/;
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
				this.addPath(hFn2Path, dir, nm);

				const a2 = nm.match(this.regNeedHash);
				if (a2) {
					const s = fs.readFileSync(url, {encoding: 'utf8'});
					const h = crypto.RIPEMD160(s).toString(crypto.enc.Hex);
					const snm = nm.slice(0, -a2[0].length);
					hFn2Path[snm][a2[1] +':RIPEMD160'] = h;
				}
				const a = nm.match(this.regSprSheetImg);
				if (! a) return;

				const fnJs = path.resolve(wd, a[1] +'.json');
				if (fs.existsSync(fnJs)) return;

				const size = img_size(url);
				const xLen = uint(a[2]);
				const yLen = uint(a[3]);
				const w = size.width /xLen;
				const h = size.height /yLen;
				const basename = a[1];
				const ext = a[4];

				const oJs :any = {
					frames: {},
					meta: {
						app: 'skynovel',
						version: '1.0',
						image: a[0],
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
				window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${a[1]}.json を自動生成しました`);

				this.addPath(hFn2Path, dir, `${a[1]}.json`);
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
			hExts = hFn2Path[fn] = {':cnt': 1};
		}
		else if (ext in hExts) {
			window.showErrorMessage(`[SKYNovel] プロジェクト内でファイル【${p.base}】が重複しています。フォルダを縦断検索するため許されません`, {modal: true})
			.then(()=> window.showQuickPick([
				{label: `1) ${hExts[ext]}`, description:`クリックで削除対象`},
				{label: `2) ${dir +'/'+ nm}`, description:`クリックで削除対象`},
			]))
			.then(selected=> {
				if (! selected) return;

				const id = Number(selected.label.slice(0, 1));
				const fn = this.curPrj + (id === 1 ?hExts[ext] :dir +'/'+ nm);
				window.showInformationMessage(`${fn} を削除しますか？`, {modal: true}, 'はい')
				.then(a=> {if (a === 'はい') fs.removeSync(fn);});
			});
			return;
		}
		else {
			hExts[':cnt'] = uint(hExts[':cnt']) +1;
		}
		hExts[ext] = dir +'/'+ nm;
	}

}
