/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {chkUpdate, getFn} from '../CmnLib';
import type {PrjCmn} from '../PrjCmn';

import {minimatch} from 'minimatch';
import {trace} from '../Trace';

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

		// フォルダ追加・削除イベント検知。
		// ⚠️ `doc/prj/*` と、watchFld の `doc/prj/*/…` が **1階層だけ**なのは意図的。
		// frame など多段フォルダになるものもあるが、そこまで複雑な構造を一つの開発で
		// 同時には扱わない（htm をブラウザで開いて直している間、エンジン側は放置する）
		// という判断。その他のフォルダはエンジン自身の素材変更なので鋭敏に反応させる。
		// 「入れ子が拾えていない＝バグ」と誤認して直さないこと
		const ptnFld = 'doc/prj/*';
		const fwFld = workspace.createFileSystemWatcher(new RelativePattern(this.pc.wsFld, ptnFld));
		fwFld.onDidCreate(newUri=> this.pc.addSeq(()=> this.#seqDidCreate(newUri), `CRE ${ptnFld}`));
		fwFld.onDidDelete(oldUri=> this.pc.addSeq(()=> this.#seqDidDelete(oldUri), `DEL ${ptnFld}`));
	}
	/**
	 * ⚠️ **この2つが static なのはマルチルートで壊れる。**
	 *
	 * `Project` はワークスペースフォルダごとに生成され（src/WorkSpaces.ts）、
	 * 各 Project が `#optPic.initOnce(updPathJson, encIfNeeded)`（src/Project.ts）で
	 * **ここを上書きする**。プロジェクトを2つ開くと後から開いた方が全体に使われ、
	 * - 片方のファイル変更が**他方の** path.json を作り直す
	 * - `encIfNeeded` も後勝ち＝**別プロジェクトの暗号化設定で暗号化しかねない**
	 *
	 * package.json の keywords に `multi-root ready` と書いてあるので看板と実装が
	 * 合っていない。直すならインスタンスフィールドにする（TODO.md「ファイル監視の設計」(A)）
	 */
				static	#updPathJson	: ()=> Promise<void>;
	protected	static	encIfNeeded		: (uri: Uri)=> Promise<void>;

	/**
	 * 変名は **del + cre に分解**して購読者へ流す。判定を「対（旧,新）」ではなく
	 * **辺ごと**に独立させているので、4通り（内→内／内→外／外→内／外→外）が
	 * 2つの if で尽きる。組み合わせが増えない
	 *
	 * ⚠️ **ただしエディタ主導の変名では二重に呼ばれる**（統合テストで実測）：
	 * - `workspace.fs.rename` … `watch.rename` 0 / 監視の cre・del が各1
	 * - `WorkspaceEdit.renameFile` … `watch.rename` 1 **かつ** 監視の cre・del も各1
	 *
	 * なお外部操作（fs / fs-extra）と VSCode API 操作は追加・変更・変名・削除の
	 * どれも**同一のイベント**になる（実測表は TODO.md §3.8）。
	 * **差が出るのはこの「エディタ主導の変名」だけ**
	 *
	 * つまり後者では、ここと FS 監視の両方が `w.crechg` / `w.del` を呼び、
	 * **画像最適化と暗号化が2回走る**（need_go はデバウンスで1回に見えるので
	 * 外からは気づけない）。macOS / VSCode 1.130 での実測。
	 * FS 監視だけで足りるなら不要になるが、**Windows で同じ挙動か未確認**なので
	 * 消す前に確認すること（TODO.md「ファイル監視の設計」(H)）
	 */
	async #onDidRenameFiles({files}: FileRenameEvent) {
// console.log(`fn:WatchFile.ts onDidRenameFiles files:%o`, files);
		const PATH_WS_LEN = this.pc.PATH_WS.length;
		for (const {oldUri, newUri} of files) {
			trace('watch.rename');
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
	/**
	 * path.json 再生成をまとめて呼ぶ（500ms）。
	 *
	 * ⚠️ `#tiLasyPathJson` は**インスタンス**フィールドで、
	 * WfbOptPic / WfbOptSnd / WfbOptFont は別インスタンス。つまり
	 * **画像と音声を同時に置くと `#updPathJson()` が2回走る**（統合テストで実測）。
	 * `updPathJson()` は `#cfg.loadEx()`（全走査＋暗号化）を含むので重い処理の二重実行。
	 * 後段の全走査は Project の `#sendNeedGo()`（300ms）がまとめるが、
	 * `loadEx` の二重実行は残っている（TODO.md「ファイル監視の設計」(B)）
	 */
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

		// ⚠️ **`doc/prj/*/` で始まるパターンには暗号化が自動で付く。**
		// さらに `init` を渡すと findFiles(pat) 全件に初回の暗号化を回す。
		// そのため監視パターンを「狭めて発火を減らす」最適化は
		// **該当拡張子の暗号化を黙って漏らす**。狭めないこと
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
				if (updPathJson) this.lasyPathJson();
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
