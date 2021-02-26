/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {statBreak, uint, treeProc, foldProc, replaceFile, regNoUseSysPath, IFn2Path, REG_SCRIPT} from './CmnLib';
import {CodingSupporter} from './CodingSupporter';
import {PrjSetting} from './PrjSetting';

import {ExtensionContext, workspace, Disposable, tasks, Task, ShellExecution, window, Uri, Location, Range, WorkspaceFolder} from 'vscode';
import fs = require('fs-extra');
import path = require('path');
const img_size = require('image-size');
import crypto = require('crypto-js');
import {v4 as uuidv4, v5 as uuidv5} from 'uuid';
import crc32 = require('crc-32');
import {Transform} from 'stream';

export class Project {
	private	readonly	codSpt		: CodingSupporter;

	private	readonly	curPlg		: string;
	private	readonly	curPrj		: string;
	private	readonly	lenCurPrj	: number;
	private	readonly	curCrypto	: string;
	private	static readonly	fld_crypto_prj	= 'crypto_prj';
	static get fldnm_crypto_prj() {return Project.fld_crypto_prj}
	private		$isCryptoMode	= true;
	get isCryptoMode() {return this.$isCryptoMode;}
	private readonly	regNeedCrypto	= /\.(sn|ssn|json|html?|jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv|html?)$/;
	private readonly	regFullCrypto	= /\.(sn|ssn|json|html?)$/;
	private readonly	regRepPathJson	= /\.(jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)/g;
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
	private	readonly	regNeedHash	= /\.(js|css)$/;	// 改竄チェック処理対象
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
	private				hDiff	: {[fn: string]: {
		hash: number,	// ファイル変更検知ハッシュ
		cn	: string,	// ファイル名匿名化辞書
	}}	= Object.create(null);

	private readonly pathWs: string;
	constructor(private readonly ctx: ExtensionContext, private readonly wsFld: WorkspaceFolder, readonly chgTitle: (title: string)=> void) {
		this.pathWs = wsFld.uri.fsPath;
		this.curPrj = this.pathWs +'/doc/prj/';
		this.codSpt = new CodingSupporter(ctx, this.pathWs, this.curPrj);

		this.curPlg = this.pathWs +'/core/plugin/';
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
		// prjルートフォルダ監視
		const fwFld = workspace.createFileSystemWatcher(this.curPrj +'*');
		this.aFSW = [
			fwPlg.onDidCreate(()=> this.updPlugin()),
			fwPlg.onDidChange(()=> this.updPlugin()),
			fwPlg.onDidDelete(()=> this.updPlugin()),

			fwPrj.onDidCreate(uri=> {
				regNoUseSysPath.lastIndex = 0;
				if (regNoUseSysPath.test(uri.path)) return;
				this.crePrj(uri);
				if (REG_SCRIPT.test(uri.path)) this.codSpt.crePrj(uri);
			}),
			fwPrj.onDidChange(uri=> {
				// エディタで開いたファイルは更新監視をしない。文字変更イベントで処理する
				if (workspace.textDocuments.find(td=> td.uri.path === uri.path)) return;

				regNoUseSysPath.lastIndex = 0;
				if (regNoUseSysPath.test(uri.path)) return;
				this.chgPrj(uri);
				if (REG_SCRIPT.test(uri.path)) this.codSpt.chgPrj(uri);
			}),
			fwPrj.onDidDelete(uri=> {
				regNoUseSysPath.lastIndex = 0;
				if (regNoUseSysPath.test(uri.path)) return;
				this.delPrj(uri);
				if (REG_SCRIPT.test(uri.path)) this.codSpt.delPrj(uri);
			}),
			fwPrjJs.onDidChange(e=> this.chgPrj(e)),

			fwFld.onDidCreate(uri=> this.ps.noticeCreDir(uri.path)),
			/*fwFld.onDidChange(uri=> {	// フォルダ名ではこれが発生せず、Cre & Del
				if (uri.path.slice(-5) === '.json') return;
console.log(`fn:Project.ts line:128 Cha path:${uri.path}`);
			}),*/
			fwFld.onDidDelete(uri=> this.ps.noticeDelDir(uri.path)),
		];

		this.curCrypto = this.pathWs +`/doc/${Project.fld_crypto_prj}/`;
		this.$isCryptoMode = fs.existsSync(this.curCrypto);
		const fnPass = this.curPlg +'pass.json';
		const exists_pass = fs.existsSync(fnPass);
		this.hPass = exists_pass
			? fs.readJsonSync(fnPass, {throws: false})
			: {
				pass: uuidv4(),
				salt: String(crypto.lib.WordArray.random(128 / 8)),
				iv	: String(crypto.lib.WordArray.random(128 / 8)),
				ite	: 500 + Math.floor(new Date().getTime() %300),
				stk	: String(crypto.lib.WordArray.random(128 / 8)),
			};
		if (! exists_pass) fs.outputJsonSync(fnPass, this.hPass);

		this.iv = crypto.enc.Hex.parse(this.hPass.iv);
		this.pbkdf2 = crypto.PBKDF2(
			crypto.enc.Utf8.parse(this.hPass.pass),
			crypto.enc.Hex.parse(this.hPass.salt),
			{
				keySize: parseInt(this.hPass.keySize),
				iterations: parseInt(this.hPass.ite),
			},
		);

		this.fnDiff = this.pathWs +'/core/diff.json';
		if (fs.existsSync(this.fnDiff)) this.hDiff = fs.readJsonSync(this.fnDiff);
		this.ps = new PrjSetting(ctx, wsFld, chgTitle, this.codSpt);
		this.initCrypto();
	}

	private	readonly	ps: PrjSetting;
	openPrjSetting() {this.ps.open();}
	get title() {return this.ps.cfg.book.title}
	get version() {return this.ps.cfg.book.version}

	dispose() {this.aFSW.forEach(f=> f.dispose());}


	private	crePrj(e: Uri) {this.encIfNeeded(e.path); this.updPathJson();}
	private	chgPrj(e: Uri) {this.encIfNeeded(e.path);}
	private	delPrj(e: Uri) {
		const short_path = e.path.slice(this.lenCurPrj);
		this.regNeedCrypto.lastIndex = 0;
		fs.removeSync(
			this.curCrypto + short_path
			.replace(this.regRepPathJson, '.bin')
			.replace(/"/, '')
		);
		this.updPathJson();

		delete this.hDiff[short_path];
		this.updDiffJson();
	}

	// プロジェクトフォルダ以下全走査で暗号化
	private initCrypto() {
		const fnc: (url: string)=> void = this.$isCryptoMode
			? url=> {if (this.isDiff(url)) this.encrypter(url)}
			: url=> this.isDiff(url);
		treeProc(this.curPrj, fnc);
		this.updDiffJson();
	}
	private	encIfNeeded(url: string) {
		if (this.$isCryptoMode && this.isDiff(url)) this.encrypter(url);
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
		if (this.hDiff[short_path]?.hash === hash) return false;

		this.hDiff[short_path] = {
			hash: hash,
			cn:	this.regNeedCrypto.test(short_path)
				? short_path.replace(
					this.REG_SPATH2HFN,
					`$1/${uuidv5(short_path, this.hPass.pass)}$2`
				)
				.replace(this.regRepPathJson, '.bin')
				: short_path,
		};
		return true;
	}
	private	readonly	REG_SPATH2HFN	= /([^\/]+)\/[^\/]+(\.\w+)/;


	private	readonly	aRepl = [
		'core/app4webpack.js',
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
				new RegExp(`"${Project.fld_crypto_prj}\\/",`),
				`"prj/",`,
			);

			return;
		}

		fs.ensureDir(this.curCrypto);

		// SKYNovelが見に行くプロジェクトフォルダ名変更
		this.aRepl.forEach(url=> replaceFile(
			this.pathWs +'/'+ url,
			/\(hPlg\);/,
			`(hPlg, {cur: '${Project.fld_crypto_prj}/', crypto: true});`,
		));

		// ビルド情報：パッケージするフォルダ名変更
		replaceFile(
			this.pathWs +'/package.json',
			/"prj\/",/,
			`"${Project.fld_crypto_prj}/",`,
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
	private	static	readonly LEN_ENC	= 1024 *10;
	private			readonly regDir = /(^.+)\//;
	private	async encrypter(url: string) {
		try {
			const short_path = url.slice(this.lenCurPrj);
			const url_out = this.curCrypto + this.hDiff[short_path].cn;
			if (! this.regNeedCrypto.test(url)) {
				fs.ensureLink(url, url_out)
				.catch((e: any)=> console.error(`encrypter cp1 ${e}`));
				return;
			}

			if (this.regFullCrypto.test(short_path)) {
				let s = await fs.readFile(url, {encoding: 'utf8'});
				if (short_path === 'path.json') {	// 内容も変更
					// ファイル名匿名化
					const hPath: IFn2Path = JSON.parse(s);
					for (const fn in hPath) {
						const hExt2N = hPath[fn];
						for (const ext in hExt2N) {
							if (ext === ':cnt') continue;
							if (ext.slice(-10) === ':RIPEMD160') continue;
							const path = String(hExt2N[ext]);
							const dir = this.regDir.exec(path);
							if (dir && this.ps.cfg.code[dir[1]]) continue;

							hExt2N[ext] = this.hDiff[path].cn;
						}
					}
					s = JSON.stringify(hPath);
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

			let nokori = Project.LEN_ENC;
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
					crypto.lib.WordArray.create(Array.from(bh)),
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
					crypto.lib.WordArray.create(Array.from(bh.slice(0, i))),
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


	private	readonly	regPlgAddTag = /(?<=\.\s*addTag\s*\(\s*)(["'])(.+?)\1/g;
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
			while ((a = this.regPlgAddTag.exec(txt))) {
				const nm = a[2];
				const len_nm = nm.length;
				const idx_nm = this.regPlgAddTag.lastIndex -len_nm -1;

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
		.then(()=> this.rebuildTask())	// NOTE: 起動時にビルドが走るのはこれ
		.catch((err: any)=> console.error(`Project updPlugin ${err}`));
	}
	private rebuildTask() {
		let cmd = `cd "${this.pathWs}" ${statBreak()} `;
		if (! fs.existsSync(this.pathWs +'/node_modules')) cmd += `npm i ${statBreak()} `;		// 自動で「npm i」
		cmd += 'npm run webpack:dev';
		const t = new Task(
			{type: 'SKYNovel auto'},	// definition（タスクの一意性）
			this.wsFld!,
			'webpack:dev',				// name、UIに表示
			'SKYNovel',					// source
			new ShellExecution(cmd),
		);
		tasks.executeTask(t)
		.then(undefined, rj=> console.error(`TreeDPDev rebuildTask() rj:${rj.message}`));
	}


	private	hPathFn2Exts	: IFn2Path		= {};
	private	async updPathJson() {
		try {
			this.hPathFn2Exts = this.get_hPathFn2Exts(this.curPrj);
			await fs.outputJson(this.curPrj +'path.json', this.hPathFn2Exts);
			this.codSpt.updPath(this.hPathFn2Exts);
			if (this.$isCryptoMode) this.encrypter(this.curPrj +'path.json');
		}
		catch (err) {console.error(`Project updPathJson ${err}`);}
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
/*
	private	userFnTail	= '';
	private	readonly	regPath = /([^\/\s]+)\.([^\d]\w+)/;
			// 4 match 498 step(~1ms)  https://regex101.com/r/tpVgmI/1
	private searchPath(path: string, extptn = ''): string {
		if (! path) throw '[searchPath] fnが空です';

		const a = path.match(this.regPath);
		let fn = a ?a[1] :path;
		const ext = a ?a[2] :'';
		if (this.userFnTail) {
			const utn = fn +'@@'+ this.userFnTail;
			if (utn in this.hPathFn2Exts) {
				if (extptn === '') fn = utn;
				else for (let e3 in this.hPathFn2Exts[utn]) {
					if (`|${extptn}|`.indexOf(`|${e3}|`) === -1) continue;

					fn = utn;
					break;
				}
			}
		}
		const h_exts = this.hPathFn2Exts[fn];
		if (! h_exts) throw `サーチパスに存在しないファイル【${path}】です`;

		let ret = '';
		if (! ext) {	// fnに拡張子が含まれていない
			//	extのどれかでサーチ（ファイル名サーチ→拡張子群にextが含まれるか）
			const hcnt = int(h_exts[':cnt']);
			if (extptn === '') {
				if (hcnt > 1) throw `指定ファイル【${path}】が複数マッチします。サーチ対象拡張子群【${extptn}】で絞り込むか、ファイル名を個別にして下さい。`;

				return path;
			}

			const search_exts = `|${extptn}|`;
			if (hcnt > 1) {
				let cnt = 0;
				for (const e2 in h_exts) {
					if (search_exts.indexOf(`|${e2}|`) === -1) continue;
					if (++cnt > 1) throw `指定ファイル【${path}】が複数マッチします。サーチ対象拡張子群【${extptn}】で絞り込むか、ファイル名を個別にして下さい。`;
				}
			}
			for (let e in h_exts) {
				if (search_exts.indexOf(`|${e}|`) === -1) continue;

				return h_exts[e];
			}
			throw `サーチ対象拡張子群【${extptn}】にマッチするファイルがサーチパスに存在しません。探索ファイル名=【${path}】`;
		}

		// fnに拡張子xが含まれている
		//	ファイル名サーチ→拡張子群にxが含まれるか
		if (extptn !== '') {
			const search_exts2 = `|${extptn}|`;
			if (search_exts2.indexOf(`|${ext}|`) === -1) {
				throw `指定ファイルの拡張子【${ext}】は、サーチ対象拡張子群【${extptn}】にマッチしません。探索ファイル名=【${path}】`;
			}
		}

		ret = h_exts[ext];
		if (! ret) throw `サーチパスに存在しない拡張子【${ext}】です。探索ファイル名=【${path}】、サーチ対象拡張子群【${extptn}】`;

		return ret;
	}
*/
}
