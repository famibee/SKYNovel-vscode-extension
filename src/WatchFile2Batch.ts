/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_CMD} from '../views/types';
import {getFn, v2fp} from './CmnLib';
import type {T_DIFF, T_CN, H_T_DIFF} from './Project';
import {FLD_PRJ_BASE} from './Project';
import {PrjSetting} from './PrjSetting';

import type {ExtensionContext, Memento, WorkspaceFolder} from 'vscode';
import {Disposable, FileType, RelativePattern, Uri, workspace} from 'vscode';
import {remove, statSync} from 'fs-extra';
import {minimatch} from 'minimatch';


type T_WATCHRP2CREDELPROC = {
	pattern	: string,
	crechg?	: (uri: Uri, cre: boolean)=> Promise<void>,
	del?	: (uri: Uri)=> Promise<boolean>,
};


export class WatchFile2Batch {
	protected static	ctx		: ExtensionContext;
	protected static	wsFld	: WorkspaceFolder;
	protected static	exeTask	: (nm: T_CMD, arg: string)=> Promise<number>;
	protected static	updPathJson	: ()=> void;
	private static		updDiffJson	: ()=> void;
	private static		hDiff	: H_T_DIFF;
	private static		encIfNeeded	: (uri: Uri)=> Promise<void>;
	private static		path2cn	: (fp: string)=> T_CN;
	protected static	fp2pp	: (fp: string)=> string;
	protected static	FLD_SRC	: string;
	protected static	onSettingEvt: (nm: string, val: string)=> Promise<boolean>;

	protected static	wss		: Memento;
	protected static	PATH_WS			: string;
	protected static	PATH_WS_LEN		: number;
	protected static	PATH_PRJ		: string;
	protected static	PATH_PRJ_BASE	: string;

	private static	readonly	ds	: Disposable[]	= [];

	static	#watchFile = false;
	static set watchFile(v: boolean) {this.#watchFile = v}

	//MARK: 初期化
	static init(
		ctx		: ExtensionContext,
		wsFld	: WorkspaceFolder, 
		exeTask	: (nm: T_CMD, arg: string)=> Promise<number>,
		updPathJson	: ()=> void,
		updDiffJson	: ()=> void,
		hDiff	: {[fn: string]: T_DIFF},
		encIfNeeded	: (uri: Uri)=> Promise<void>,
		path2cn	: (fp: string)=> T_CN,
		fp2pp	: (fp: string)=> string,
		FLD_SRC	: string,
		onSettingEvt: (nm: string, val: string)=> Promise<boolean>,
	) {
		this.ctx = ctx;
		this.wsFld = wsFld;
		this.exeTask = exeTask;
		this.updPathJson = updPathJson;
		this.updDiffJson = updDiffJson;
		this.hDiff = hDiff;
		this.encIfNeeded = encIfNeeded;
		this.path2cn = path2cn;
		this.fp2pp = fp2pp;
		this.FLD_SRC = FLD_SRC;
		this.onSettingEvt = onSettingEvt;

		this.wss = ctx.workspaceState;
		this.PATH_WS = v2fp(wsFld.uri.path);
		this.PATH_WS_LEN = this.PATH_WS.length;
		this.PATH_PRJ = this.PATH_WS +'/doc/prj/';
		this.PATH_PRJ_BASE = this.PATH_WS +`/${FLD_SRC}/${FLD_PRJ_BASE}/`;

		// ファイル名変更イベントを処理
		workspace.onDidRenameFiles(({files})=> {
// console.log(`fn:WatchFile2Batch.ts onDidRenameFiles files:%o`, files);
			for (const {oldUri, newUri} of files) {
				const ppOld = oldUri.path.slice(this.PATH_WS_LEN +1);
				const isOldRnInPrj = ppOld.startsWith('doc/');
				const ppNew = newUri.path.slice(this.PATH_WS_LEN +1);
				const isNewRnInPrj = ppNew.startsWith('doc/');
// console.log(`  newPath:${ppNew} isOldRnInPrj:${isOldRnInPrj} isNewRnInPrj:${isNewRnInPrj}`);
				for (const w of this.#aWatchRp2CreDelProc) {
					const {pattern} = w;
// if (minimatch(ppOld, pattern)) console.log(`  minimatch del:${!!w.del} crechg:${!!w.crechg} -- ptn:${pattern}`);
					if (isOldRnInPrj && w.del && minimatch(ppOld, pattern)) w.del(oldUri);
					if (isNewRnInPrj && w.crechg && minimatch(ppNew, pattern)) w.crechg(newUri, true);
				}
			}
		});

		// フォルダ追加・削除イベント検知
		const fwFld = workspace.createFileSystemWatcher(new RelativePattern(wsFld, 'doc/prj/*'));
		fwFld.onDidCreate(async newUri=> {
// console.log(`fn:WatchFile2Batch.ts FLD/Create uri:${newUri.path}`);
			if (! statSync(newUri.path).isDirectory()) return;

			this.ps.onCreDir(newUri);	//NOTE: PrjJs の暗号化はどうなってる？

			// パターンマッチを考慮しつつ、擬似的に削除イベントを発生させる
			const nm = getFn(newUri.path) +'/';
			const aPp2 = (await workspace.fs.readDirectory(newUri))
			.filter(([, ty])=> ty === FileType.File)
			.map(([fp2pp, ])=> 'doc/prj/'+ nm + fp2pp);
			for (const w of this.#aWatchRp2CreDelProc) {
				const {pattern} = w;
				if (! w.crechg || ! pattern.startsWith('doc/prj/')) continue;

				for (const pp2 of aPp2) {
					const match = minimatch(pp2, pattern);
// console.log(`fn:WatchFile2Batch.ts ++ match:${match} pattern:${pattern} pp2:${pp2}`);
					if (match) w.crechg(Uri.file(this.PATH_WS +'/'+ pp2), true);
				}
			}
			this.updPathJson();	// 必須
		});
		fwFld.onDidDelete(async oldUri=> {
// console.log(`fn:WatchFile2Batch.ts FLD/Delete uri:${oldUri.path}`);
			// if (! statSync(uri.path).isDirectory()) return;	// 無いのでエラーになる

			this.ps.onDelDir(oldUri);	//NOTE: PrjJs の暗号化はどうなってる？

			// パターンマッチを考慮しつつ、擬似的に削除イベントを発生させる
			const nm = getFn(oldUri.path) +'/';
			const aPp2 = Object.keys(this.hDiff)
			.filter(pp=> pp.startsWith(nm))
			.map(pp=> 'doc/prj/'+ pp);
			for (const w of this.#aWatchRp2CreDelProc) {
				const {pattern} = w;
				if (! w.del || ! pattern.startsWith('doc/prj/')) continue;

				for (const pp2 of aPp2) {
					const match = minimatch(pp2, pattern);
// console.log(`fn:WatchFile2Batch.ts -- match:${match} pattern:${pattern} pp2:${pp2}`);
					if (match) w.del(Uri.file(this.PATH_WS +'/'+ pp2));
				}
			}
			this.updPathJson();	// 必須
		});
	}
		// prj（変換後フォルダ）下の変化か prj_base（退避素材ファイル）か判定
		protected isBaseUrl(url :string) {return url.startsWith(WatchFile2Batch.PATH_PRJ_BASE)}

	static	setStg(ps: PrjSetting) {this.ps = ps}
	protected static	ps	: PrjSetting;

	//MARK: デストラクタ
	static	dispose() {for (const d of this.ds) d.dispose()}


	//MARK: #フォルダ監視
	static async watchFld(
		pattern	: string,	// 生成物入力パス Grb パターン
		pathDest: string,	// 生成物出力パス Grb パターン
		init?	: (uri: Uri)=> Promise<void>,
		crechg?	: (uri: Uri, cre: boolean)=> Promise<void>,
		del?	: (uri: Uri)=> Promise<boolean>,
	) {
		this.#aWatchRp2CreDelProc.push({pattern, crechg, del});

		const rpInp = new RelativePattern(this.wsFld, pattern);
		const encIfNeeded = pattern.startsWith('doc/prj/*/')
			? (uri: Uri)=> this.encIfNeeded(uri)
			: async ()=> {};
		if (init) {
			const aUri = await workspace.findFiles(rpInp);
			// バッチ処理等なので並列処理しない、直列処理
			for (const uri of aUri) {
				await init(uri);
				await encIfNeeded(uri);
			}
			// this.updPathJson();	// よそでやると思うので
		}
		const fw = workspace.createFileSystemWatcher(rpInp, !crechg, !crechg, !del);	// ignore なので無効にするときに true
		if (crechg) this.ds.push(
			fw.onDidCreate(async uri=> {
// console.log(`fn:WatchFile2Batch.ts watchFld CRE watchFile:${this.#watchFile} pat【${rpInp.pattern}】 uri:${uri.path}`);

				if (this.#watchFile) await crechg(uri, true);
				await encIfNeeded(uri);
				this.updPathJson();
			}),
			fw.onDidChange(async uri=> {
// console.log(`fn:WatchFile2Batch.ts watchFld CHG watchFile:${this.#watchFile} pat【${rpInp.pattern}】 uri:${uri.path}`);
				await this.#delDest(pathDest, uri);
				if (this.#watchFile) await crechg(uri, false);
				await encIfNeeded(uri);
				// this.updPathJson();	// 不要（必要なら crechg で）
			}),
		);
		if (del) this.ds.push(fw.onDidDelete(async uri=> {
// console.log(`fn:WatchFile2Batch.ts watchFld DEL watchFile:${this.#watchFile} pat【${rpInp.pattern}】 uri:${uri.path}`);
			if (this.#watchFile) {
				await this.#delDest(pathDest, uri);
				if (await del(uri)) {
					const {pathCn, pp} = this.path2cn(uri.path);
					if (pathCn) await remove(pathCn);

					delete this.hDiff[pp];
					this.updDiffJson();
				}
			}
			this.updPathJson();
		}));
	}
	static #aWatchRp2CreDelProc: T_WATCHRP2CREDELPROC[]	= [];
	static async	#delDest(ptDest: string, {path}: Uri) {
		if (ptDest === '') return;

		const hn = getFn(path);
		const aUri = await workspace.findFiles(ptDest.replace('[FN]', hn));
		await Promise.allSettled(aUri.map(({path})=> remove(path)));
	}

}
