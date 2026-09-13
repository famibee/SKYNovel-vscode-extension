/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {chkUpdate, getFn} from '../CmnLib';
import type {PrjCmn} from '../PrjCmn';

import {minimatch} from 'minimatch';
import {trace} from '../Trace';

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
	// ⚠️ updPathJson / encIfNeeded は引数で受けない。`this.pc`（PrjCmn、
	// ワークスペースフォルダ＝プロジェクトごとに1個）が既に持っているので、
	// それを使う（src/docs/file-watch.md(A)。旧実装は static で後勝ちだった）
	initOnce() {
		// フォルダ追加・削除イベント検知。
		// ⚠️ `doc/prj/*` と、watchFld の `doc/prj/*/…` が **1階層だけ**なのは意図的。
		// frame など多段フォルダになるものもあるが、そこまで複雑な構造を一つの開発で
		// 同時には扱わない（htm をブラウザで開いて直している間、エンジン側は放置する）
		// という判断。その他のフォルダはエンジン自身の素材変更なので鋭敏に反応させる。
		// 「入れ子が拾えていない＝バグ」と誤認して直さないこと
		const ptnFld = 'doc/prj/*';
		// TODO: [解放1] fwFld 自身を誰も dispose しない。購読を外しても OS の
		// ファイル監視は生き続ける（src/docs/multiroot.md リソースの解放1）
		const fwFld = workspace.createFileSystemWatcher(new RelativePattern(this.pc.wsFld, ptnFld));
		// TODO: [解放4] 登録の戻り値（Disposable）を捨てているので永久に外れない。
		// Project.#ds へ入れる（src/docs/multiroot.md リソースの解放4）
		fwFld.onDidCreate(newUri=> this.pc.addSeq(()=> this.#seqDidCreate(newUri), `CRE ${ptnFld}`));
		fwFld.onDidDelete(oldUri=> this.pc.addSeq(()=> this.#seqDidDelete(oldUri), `DEL ${ptnFld}`));
	}
	// 変名は VSCode API・外部操作を問わず FS 監視の del+cre だけで拾える
	// （src/docs/file-watch.md(D)。エディタ主導の変名だけ `onDidRenameFiles` が
	// 追加で発火し二重処理になっていたため、2026-09-13 に購読自体を削除した）
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

	async init2th() {await this.pc.updPathJson()}


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

		// ⚠️ **`doc/prj/*/` で始まるパターンには暗号化が自動で付く。**
		// さらに `init` を渡すと findFiles(pat) 全件に初回の暗号化を回す。
		// そのため監視パターンを「狭めて発火を減らす」最適化は
		// **該当拡張子の暗号化を黙って漏らす**。狭めないこと
		const encIfNeeded = pat.startsWith('doc/prj/*/')
			? async (uri: Uri)=> {
				// 最適化などで拡張子変更の場合あり、ファイル存在確認必須
				if (existsSync(uri.path)) await this.pc.encIfNeeded(uri)
			}
			: async ()=> { /* empty */ };
		if (init) await Promise.allSettled((await workspace.findFiles(pat))
			.map(async uri=> {
				await init(uri);	// バッチ処理等なので並列処理しない
				return encIfNeeded(uri);
			})
		);
		// TODO: [解放1] fw 自身を dispose していない（プロジェクトあたり9本）
		// TODO: [解放2] 以下 push 先の ctx.subscriptions は「拡張機能の寿命」。
		// プロジェクト単位のものは Project.#ds へ。いまはフォルダを開き直すと
		// 購読が二重になり、古い方も発火する（src/docs/multiroot.md リソースの解放1・2）
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
					if (updPathJson) this.pc.lasyPathJson();
					trace('watch.cre', pat);
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
					trace('watch.chg', pat);
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
				if (updPathJson) this.pc.lasyPathJson();
				trace('watch.del', pat);
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
