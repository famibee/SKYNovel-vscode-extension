/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {chkUpdate, getFn} from '../CmnLib';
import type {PrjCmn} from '../PrjCmn';

import {minimatch} from 'minimatch';

import type {FileRenameEvent} from 'vscode';
import {FileType, RelativePattern, Uri, workspace} from 'vscode';
import {existsSync, remove, statSync} from 'fs-extra';


type T_WATCHRP2CREDELPROC = {
	pat		: string,
	crechg?	: (uri: Uri, cre: boolean)=> Promise<void>,
	del?	: (uri: Uri)=> Promise<boolean>,
}


export class WatchFile {
	//MARK: コンストラクタ
	constructor(protected readonly pc: PrjCmn) {}

	//MARK: 初期化
	initOnce(
		updPathJson	: ()=> Promise<void>,
		encIfNeeded	: (uri: Uri)=> Promise<void>,
	) {
		WatchFile.#updPathJson = updPathJson;
		WatchFile.encIfNeeded = encIfNeeded;

		// ファイル名変更イベントを処理
		workspace.onDidRenameFiles(e=> this.#onDidRenameFiles(e));

		// フォルダ追加・削除イベント検知
		const ptnFld = 'doc/prj/*';
		const fwFld = workspace.createFileSystemWatcher(new RelativePattern(this.pc.wsFld, ptnFld));
		fwFld.onDidCreate(newUri=> this.pc.addSeq(()=> this.#seqDidCreate(newUri), `CRE ${ptnFld}`));
		fwFld.onDidDelete(oldUri=> this.pc.addSeq(()=> this.#seqDidDelete(oldUri), `DEL ${ptnFld}`));
	}
				static	#updPathJson	: ()=> Promise<void>;
	protected	static	encIfNeeded		: (uri: Uri)=> Promise<void>;

	async #onDidRenameFiles({files}: FileRenameEvent) {
// console.log(`fn:WatchFile.ts onDidRenameFiles files:%o`, files);
		const PATH_WS_LEN = this.pc.PATH_WS.length;
		for (const {oldUri, newUri} of files) {
			const ppOld = oldUri.path.slice(PATH_WS_LEN +1);
			const isOldRnInPrj = ppOld.startsWith('doc/');
			const ppNew = newUri.path.slice(PATH_WS_LEN +1);
			const isNewRnInPrj = ppNew.startsWith('doc/');
// console.log(`  newPath:${ppNew} isOldRnInPrj:${isOldRnInPrj} isNewRnInPrj:${isNewRnInPrj}`);
			for (const w of this.#aWatchRp2CreDelProc) {
				const {pat} = w;
// if (minimatch(ppOld, pattern)) console.log(`  minimatch del:${!!w.del} crechg:${!!w.crechg} -- ptn:${pattern}`);
				if (isOldRnInPrj && w.del && minimatch(ppOld, pat)) await w.del(oldUri);
				if (isNewRnInPrj && w.crechg && minimatch(ppNew, pat)) await w.crechg(newUri, true);
			}
		}
	}
	#aWatchRp2CreDelProc: T_WATCHRP2CREDELPROC[]	= [];

	async #seqDidCreate(newUri: Uri) {
// console.log(`fn:WatchFile.ts FLD/Create uri:${newUri.path}`);
		if (! statSync(newUri.path).isDirectory()) return;

		await this.pc.ps.onCreDir(newUri);	//NOTE: PrjJs の暗号化はどうなってる？

		// パターンマッチを考慮しつつ、擬似的に削除イベントを発生させる
		const nm = getFn(newUri.path) +'/';
		const aPp2 = (await workspace.fs.readDirectory(newUri))
		.filter(([, ty])=> ty === FileType.File)
		.map(([fp2pp, ])=> 'doc/prj/'+ nm + fp2pp);
		for (const w of this.#aWatchRp2CreDelProc) {
			const {pat} = w;
			if (! w.crechg || ! pat.startsWith('doc/prj/')) continue;

			for (const pp2 of aPp2) {
				const match = minimatch(pp2, pat);
// console.log(`fn:WatchFile.ts ++ match:${match} pattern:${pattern} pp2:${pp2}`);
				if (match) await w.crechg(Uri.file(this.pc.PATH_WS +'/'+ pp2), true);
			}
		}
	}
	async #seqDidDelete(oldUri: Uri) {
// console.log(`fn:WatchFile.ts FLD/Delete uri:${oldUri.path}`);
		// if (! statSync(uri.path).isDirectory()) return;	// 無いのでエラーになる

		await this.pc.ps.onDelDir(oldUri);	//NOTE: PrjJs の暗号化はどうなってる？

		// パターンマッチを考慮しつつ、擬似的に削除イベントを発生させる
		const nm = getFn(oldUri.path) +'/';
		const aPP2 = this.pc.diff.keysPP
		.filter(pp=> pp.startsWith(nm))
		.map(pp=> 'doc/prj/'+ pp);
		for (const w of this.#aWatchRp2CreDelProc) {
			const {pat} = w;
			if (! w.del || ! pat.startsWith('doc/prj/')) continue;

			for (const pp2 of aPP2) {
				const match = minimatch(pp2, pat);
// console.log(`fn:WatchFile.ts -- match:${match} pattern:${pattern} pp2:${pp2}`);
				if (match) await w.del(Uri.file(this.pc.PATH_WS +'/'+ pp2));
			}
		}
	}

	async init2th() {await WatchFile.#updPathJson()}


	//MARK: 遅延 PathJson 更新
	protected	lasyPathJson() {
		if (this.#tiLasyPathJson) clearTimeout(this.#tiLasyPathJson);
		this.#tiLasyPathJson = setTimeout(()=> {void WatchFile.#updPathJson()}, 500);
	}
	#tiLasyPathJson: NodeJS.Timeout | undefined = undefined;


	//MARK: フォルダ監視
	protected async watchFld(
		pat		: string,	// 生成物入力パス Grb パターン
		pathDest: string,	// 生成物出力パス Grb パターン
		init?	: (uri: Uri)=> Promise<void>,
		crechg?	: (uri: Uri, cre: boolean)=> Promise<void>,
		del?	: (uri: Uri)=> Promise<boolean>,
		updPathJson	= false,
	) {
		this.#aWatchRp2CreDelProc.push({pat, crechg, del});

		const encIfNeeded = pat.startsWith('doc/prj/*/')
			? async (uri: Uri)=> {
				// 最適化などで拡張子変更の場合あり、ファイル存在確認必須
				if (existsSync(uri.path)) await WatchFile.encIfNeeded(uri)
			}
			: async ()=> { /* empty */ };
		if (init) await Promise.allSettled((await workspace.findFiles(pat))
			.map(async uri=> {
				await init(uri);	// バッチ処理等なので並列処理しない
				return encIfNeeded(uri);
			})
		);
		const fw = workspace.createFileSystemWatcher(
			new RelativePattern(this.pc.wsFld, pat),
			! crechg,	// ignore なので無効にするときに true
			! crechg,
			! del,
		);
		if (crechg) this.pc.ctx.subscriptions.push(
			fw.onDidCreate(uri=> {
// console.log(`fn:WatchFile.ts watchFld CRE pat【${pat}】 uri:${uri.path}`);
				this.pc.addSeq(async ()=> {
// console.log('fn:WatchFile.ts watchFld CRE - START');
					await crechg(uri, true);
					await encIfNeeded(uri);
					this.pc.ps.pnlWVFolder.updateDelay(uri);
					if (updPathJson) this.lasyPathJson();
// console.log('fn:WatchFile.ts watchFld CRE - END');
				}, `CRE ${pat}`);
			}),
			fw.onDidChange(uri=> {
// console.log(`fn:WatchFile.ts watchFld CHG uri:${uri.path}`);
				this.pc.addSeq(async ()=> {
// console.log('fn:WatchFile.ts watchFld CHG = START');
					await this.#delDest(pathDest, uri);
					await crechg(uri, false);
					await encIfNeeded(uri);
					this.pc.ps.pnlWVFolder.updateDelay(uri);
// console.log('fn:WatchFile.ts watchFld CHG = END');
				}, `CHG ${pat}`);
			}),
		);
		if (del) this.pc.ctx.subscriptions.push(fw.onDidDelete(uri=> {
// console.log(`fn:WatchFile.ts watchFld DEL pat【${pat}】 uri:${uri.path}`);
			this.pc.addSeq(async ()=> {
// console.log('fn:WatchFile.ts watchFld DEL --- START');
				await this.#delDest(pathDest, uri);
				if (await del(uri)) {
					const {pathCn, pp} = this.pc.diff.path2cn(uri.path);
					if (pathCn) await remove(pathCn);

					this.pc.diff.del(pp);
					await this.pc.diff.save();
				}
				this.pc.ps.pnlWVFolder.updateDelay(uri);
				if (updPathJson) this.lasyPathJson();
// console.log('fn:WatchFile.ts watchFld DEL --- END');
			}, `DEL ${pat}`);
		}));
	}

	//MARK: 暗号化対応ファイル新旧チェック
	protected chkUpdateByDiff(pathSrc: string, pathDest: string) {
		if (this.pc.isCryptoMode()) {
			const {pathCn} = this.pc.diff.path2cn(pathDest);
			if (! pathCn) return true;
			return chkUpdate(pathSrc, pathCn);
		}

		return chkUpdate(pathSrc, pathDest);
	}

	//MARK: パターンマッチファイル削除・暗号化ファイルも削除
	async #delDest(ptDest: string, {path}: Uri) {
		if (ptDest === '') return;

		const hn = getFn(path);
		const aUri = await workspace.findFiles(ptDest.replaceAll('[FN]', hn));
		await Promise.allSettled(aUri.map(async ({path})=> {
			// パターンにマッチするファイルを削除
			await remove(path);

			// 暗号化ファイルも削除
			const {pathCn, pp} = this.pc.diff.path2cn(path);
			if (pathCn) await remove(pathCn);
			this.pc.diff.del(pp);
		}));
		await this.pc.diff.save();
	}


	protected async delOldDiff(reg: RegExp) {
		if (! this.pc.isCryptoMode()) return;

		await this.pc.diff.filter(reg);
	}

}
