/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_CMD, T_E2V_SELECT_ICON_INFO, T_V2E_SELECT_ICON_FILE} from '../views/types';
import {type T_H_ADIAG_L2S, chkUpdate, getFn, v2fp} from './CmnLib';
import {SEARCH_PATH_ARG_EXT} from './ConfigBase';
import type {Config} from './Config';
import type {HDiff} from './HDiff';
import {PRE_TASK_TYPE} from './WorkSpaces';
import {FLD_PRJ_BASE} from './Project';
import type {PrjSetting} from './PrjSetting';
import {PrjBtnName, statBreak, TASK_TYPE} from './PrjTreeItem';

import type {ExtensionContext, FileRenameEvent, Memento, TaskExecution, TaskProcessEndEvent, WorkspaceFolder} from 'vscode';
import {FileType, ProgressLocation, RelativePattern, Uri, workspace, window, tasks, Task, ShellExecution} from 'vscode';
import {copy, existsSync, readJson, remove, statSync} from 'fs-extra';
import {minimatch} from 'minimatch';


type T_WATCHRP2CREDELPROC = {
	pat		: string,
	crechg?	: (uri: Uri, cre: boolean)=> Promise<void>,
	del?	: (uri: Uri)=> Promise<boolean>,
};


export class WatchFile2Batch {
	protected static	ctx		: ExtensionContext;
	protected static	wsFld	: WorkspaceFolder;
			static		#diff	: HDiff;
			static		fp2pp(fp: string) {return this.#diff.fp2pp(fp)}
	protected static	encIfNeeded	: (uri: Uri)=> Promise<void>;
	protected static	FLD_SRC	: string;
	protected static	hTaskExe	: Map<PrjBtnName, TaskExecution>;
	protected static	hOnEndTask	: Map<TASK_TYPE, (e: TaskProcessEndEvent)=> void>;
	protected static	is_new_tmp	: boolean;
			static	#isCryptoMode	: ()=> boolean;

	static	#basePathJson	: ()=> Promise<void>;

	protected static	wss		: Memento;
	protected static	PATH_WS			: string;
	protected static	PATH_WS_LEN		: number;
	protected static	PATH_PRJ		: string;
	protected static	PATH_PRJ_BASE	: string;

	static	#watchFile = false;
	protected static set watchFile(v: boolean) {this.#watchFile = v}

	//MARK: 初期化
	static init(
		ctx		: ExtensionContext,
		wsFld	: WorkspaceFolder, 
		cfg		: Config,
		diff	: HDiff,
		encFile		: (uri: Uri)=> Promise<void>,
		encIfNeeded	: (uri: Uri)=> Promise<void>,
		FLD_SRC		: string,
		hTaskExe	: Map<PrjBtnName, TaskExecution>,
		hOnEndTask	: Map<TASK_TYPE, (e: TaskProcessEndEvent)=> void>,
		is_new_tmp	: boolean,
		isCryptoMode	: ()=> boolean,
	) {
		this.ctx = ctx;
		this.wsFld = wsFld;
		this.#basePathJson = async ()=> {
			// path.json 更新（暗号化もここ「のみ」で）
// console.log(`fn:WatchFile2Batch.ts #basePathJson`);
			this.#haDiagFn = {};
			await cfg.loadEx(uri=> encFile(uri), this.#haDiagFn);

			// ドロップ時コピー先候補
			for (const [spae, aFld] of this.#mExt2aFld) this.#mExt2ToPath.set(
				spae,
				aFld.filter(fld_nm=> existsSync(this.PATH_WS +`/doc/prj/${fld_nm}/`)),
			);
		};
		this.#diff = diff;
		this.encIfNeeded = encIfNeeded;
		this.FLD_SRC = FLD_SRC;
		this.hTaskExe = hTaskExe;
		this.hOnEndTask = hOnEndTask;
		this.is_new_tmp = is_new_tmp;
		this.#isCryptoMode = isCryptoMode;

		this.wss = ctx.workspaceState;
		this.PATH_WS = v2fp(wsFld.uri.path);
		this.PATH_WS_LEN = this.PATH_WS.length;
		this.PATH_PRJ = this.PATH_WS +'/doc/prj/';
		this.PATH_PRJ_BASE = this.PATH_WS +`/${FLD_SRC}/${FLD_PRJ_BASE}/`;

		this.#hTask2Inf = {
			cnv_mat_pic: {
				title		: '画像ファイル最適化',
				pathCpyTo	: `${FLD_SRC}/batch`,
				aNeedLib	: ['fs-extra','sharp','p-queue'],
			},
			cnv_mat_snd: {
				title		: '音声ファイル最適化',
				pathCpyTo	: `${FLD_SRC}/batch`,
				aNeedLib	: ['fs-extra','@ffmpeg-installer/ffmpeg','fluent-ffmpeg','p-queue'],
					// p-queue は v6 まで CJS だった。それが v7 で ESM に変わった
					// https://aminevsky.github.io/blog/posts/pqueue-sample/
			},
			cnv_psd_face: {
				title		: 'PSDファイル変換',
				pathCpyTo	: `${FLD_SRC}/batch`,
				aNeedLib	: ['fs-extra','psd.js','sharp'],
			},
			cut_round: {
				title		: 'アイコン生成・加工中',
				pathCpyTo	: `${FLD_SRC}/batch`,
				aNeedLib	: ['fs-extra','sharp', 'png2icons'],
			},
			subset_font: {
				title		: 'フォントサイズ最適化',
				pathCpyTo	: `${FLD_SRC}/font`,
				aNeedLib	: ['fs-extra'],
			},
		};

		// ファイル名変更イベントを処理
		workspace.onDidRenameFiles(e=> this.#onDidRenameFiles(e));

		// フォルダ追加・削除イベント検知
		const fwFld = workspace.createFileSystemWatcher(new RelativePattern(wsFld, 'doc/prj/*'));
		fwFld.onDidCreate(newUri=> this.#addSeq(()=> this.#seqDidCreate(newUri)));
		fwFld.onDidDelete(oldUri=> this.#addSeq(()=> this.#seqDidDelete(oldUri)));
	}
	static #onDidRenameFiles({files}: FileRenameEvent) {
// console.log(`fn:WatchFile2Batch.ts onDidRenameFiles files:%o`, files);
		for (const {oldUri, newUri} of files) {
			const ppOld = oldUri.path.slice(this.PATH_WS_LEN +1);
			const isOldRnInPrj = ppOld.startsWith('doc/');
			const ppNew = newUri.path.slice(this.PATH_WS_LEN +1);
			const isNewRnInPrj = ppNew.startsWith('doc/');
// console.log(`  newPath:${ppNew} isOldRnInPrj:${isOldRnInPrj} isNewRnInPrj:${isNewRnInPrj}`);
			for (const w of this.#aWatchRp2CreDelProc) {
				const {pat} = w;
// if (minimatch(ppOld, pattern)) console.log(`  minimatch del:${!!w.del} crechg:${!!w.crechg} -- ptn:${pattern}`);
				if (isOldRnInPrj && w.del && minimatch(ppOld, pat)) w.del(oldUri);
				if (isNewRnInPrj && w.crechg && minimatch(ppNew, pat)) w.crechg(newUri, true);
			}
		}
	}
	static async #seqDidCreate(newUri: Uri) {
// console.log(`fn:WatchFile2Batch.ts FLD/Create uri:${newUri.path}`);
		if (! statSync(newUri.path).isDirectory()) return;

		this.ps.onCreDir(newUri);	//NOTE: PrjJs の暗号化はどうなってる？

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
// console.log(`fn:WatchFile2Batch.ts ++ match:${match} pattern:${pattern} pp2:${pp2}`);
				if (match) w.crechg(Uri.file(this.PATH_WS +'/'+ pp2), true);
			}
		}
	}
	static async #seqDidDelete(oldUri: Uri) {
// console.log(`fn:WatchFile2Batch.ts FLD/Delete uri:${oldUri.path}`);
		// if (! statSync(uri.path).isDirectory()) return;	// 無いのでエラーになる

		this.ps.onDelDir(oldUri);	//NOTE: PrjJs の暗号化はどうなってる？

		// パターンマッチを考慮しつつ、擬似的に削除イベントを発生させる
		const nm = getFn(oldUri.path) +'/';
		const aPp2 = this.#diff.keys
		.filter(pp=> pp.startsWith(nm))
		.map(pp=> 'doc/prj/'+ pp);
		for (const w of this.#aWatchRp2CreDelProc) {
			const {pat} = w;
			if (! w.del || ! pat.startsWith('doc/prj/')) continue;

			for (const pp2 of aPp2) {
				const match = minimatch(pp2, pat);
// console.log(`fn:WatchFile2Batch.ts -- match:${match} pattern:${pattern} pp2:${pp2}`);
				if (match) w.del(Uri.file(this.PATH_WS +'/'+ pp2));
			}
		}
	}

	// prj（変換後フォルダ）下の変化か prj_base（退避素材ファイル）か判定
	protected isBaseUrl(url :string) {return url.startsWith(WatchFile2Batch.PATH_PRJ_BASE)}

	static	async init2th(ps: PrjSetting, fnc: ()=> void) {
	// static	async init2th(ps: PrjSetting, fnc: ()=> void) {
		this.ps = ps;
		this.sendNeedGo = fnc;
		await this.#basePathJson();

		this.#watchFile = true;
	}
	protected static	ps	: PrjSetting;
	protected static	sendNeedGo = ()=> {};


	static	#haDiagFn	: T_H_ADIAG_L2S	= {};
	static get haDiagFn() {return this.#haDiagFn}
	static	readonly	#mExt2aFld = new Map<SEARCH_PATH_ARG_EXT, string[]>([
		[SEARCH_PATH_ARG_EXT.SP_GSM,	['bg','image']],
		[SEARCH_PATH_ARG_EXT.SOUND,		['music','sound']],
		[SEARCH_PATH_ARG_EXT.FONT,		['script']],
		[SEARCH_PATH_ARG_EXT.SCRIPT,	['script']],
	]);
	static	#mExt2ToPath	= new Map<SEARCH_PATH_ARG_EXT, string[]>;

	protected static	updPathJson() {
		if (this.#tiDelayPathJson) clearTimeout(this.#tiDelayPathJson);	// 遅延
		this.#tiDelayPathJson = setTimeout(()=> this.#basePathJson(), 500);
	}
	static	#tiDelayPathJson: NodeJS.Timeout | undefined = undefined;


	//MARK: タスク実行
	static #hTask2Inf	: {[nm: string]: {
		title		: string,
		pathCpyTo	: string,
		aNeedLib	: string[],
	}};
	protected static	exeTask(nm: T_CMD, arg: string): Promise<number> {
		const inf = this.#hTask2Inf[nm]!;
		return new Promise(fin=> window.withProgress({
			location	: ProgressLocation.Notification,
			title		: inf.title,
			cancellable	: false,
		}, prg=> new Promise<void>(async donePrg=> {
			const pathJs = this.PATH_WS +`/${inf.pathCpyTo}/${nm}.js`;
			let init = '';
		//	if (! existsSync(pathJs)) {		// 後から fs-extra を追加したので互換性のため
				const oPkg = await readJson(this.PATH_WS +'/package.json', {encoding: 'utf8'});
				const sNeedInst = inf.aNeedLib
				.filter(nm=> ! oPkg.devDependencies[nm])
				.join(' ');
				init = `npm i -D ${sNeedInst} ${statBreak} `;
		//	}
			await copy(this.ctx.extensionPath +`/dist/${nm}.js`, pathJs);

			try {
				const r = await tasks.executeTask(new Task(
					{type: PRE_TASK_TYPE +'Sys'},	// タスクの一意性
					this.wsFld,
					inf.title,		// UIに表示
					'SKYNovel',		// source
					new ShellExecution(
						`cd "${this.PATH_WS}" ${statBreak} ${init} node ./${inf.pathCpyTo}/${nm}.js ${arg}`
					),
				));
				this.hTaskExe.set(<any>nm, r);
			} catch (e) {console.error('Project exeTask() e:%o', e)}

			this.hOnEndTask.set('Sys', e=> {
				fin(e.exitCode ?? 0);

				prg.report({message: '完了', increment: 100});
				setTimeout(()=> donePrg(), 4000);
			});
		})));
	}


	//MARK: アイコン加工
	async cnvIconShape({title, openlabel, path}: T_V2E_SELECT_ICON_FILE, pathIcon: string) {
		//if (id !== 'icon') return;
		const fileUri = await window.showOpenDialog({
			title	: `${title}を選択して下さい`,
			openLabel		: openlabel ?? 'ファイルを選択',
			canSelectMany	: false,
			canSelectFiles	: false,
			canSelectFolders: false,
		});
		const src = fileUri?.[0]?.fsPath;
		if (! src) return;	// キャンセル

		const exit_code = await WatchFile2Batch.exeTask(
			'cut_round',
			`"${src}" ${WatchFile2Batch.ps.oWss['cnv.icon.shape']} "${path}" ${WatchFile2Batch.is_new_tmp}`,
		);
		WatchFile2Batch.ps.cmd2Vue(<T_E2V_SELECT_ICON_INFO>{
			cmd		: 'updpic',
			pathIcon,
			err_mes	: exit_code === 0
				? ''
				: (await readJson(WatchFile2Batch.PATH_WS +'/build/cut_round.json', {encoding: 'utf8'})).err
		});
	}


	//MARK: フォルダ監視
	protected static async watchFld(
		pat		: string,	// 生成物入力パス Grb パターン
		pathDest: string,	// 生成物出力パス Grb パターン
		init?	: (uri: Uri)=> Promise<void>,
		crechg?	: (uri: Uri, cre: boolean)=> Promise<void>,
		del?	: (uri: Uri)=> Promise<boolean>,
	) {
		this.#aWatchRp2CreDelProc.push({pat, crechg, del});

		const encIfNeeded = pat.startsWith('doc/prj/*/')
			? async (uri: Uri)=> {
				// 最適化などで拡張子変更の場合あり、ファイル存在確認必須
				if (existsSync(uri.path)) this.encIfNeeded(uri)
			}
			: async ()=> {};
		if (init) await Promise.allSettled((await workspace.findFiles(pat))
			.map(async uri=> {
				await init(uri);	// バッチ処理等なので並列処理しない
				return encIfNeeded(uri);
			})
		);
		const fw = workspace.createFileSystemWatcher(
			new RelativePattern(this.wsFld, pat),
			! crechg,	// ignore なので無効にするときに true
			! crechg,
			! del,
		);
		if (crechg) this.ctx.subscriptions.push(
			fw.onDidCreate(uri=> {
// console.log(`fn:WatchFile2Batch.ts watchFld CRE pat【${pat}】 uri:${uri.path}`);
				this.#addSeq(async ()=> {
// console.log(`fn:WatchFile2Batch.ts watchFld CRE - START`);
					await crechg(uri, true);
					await encIfNeeded(uri);
					this.ps.pnlWVFolder.updateDelay(uri);
// console.log(`fn:WatchFile2Batch.ts watchFld CRE - END`);
				});
			}),
			fw.onDidChange(uri=> {
// console.log(`fn:WatchFile2Batch.ts watchFld CHG uri:${uri.path}`);
				this.#addSeq(async ()=> {
// console.log(`fn:WatchFile2Batch.ts watchFld CHG = START`);
					await this.#delDest(pathDest, uri);
					await crechg(uri, false);
					await encIfNeeded(uri);
					this.ps.pnlWVFolder.updateDelay(uri);
// console.log(`fn:WatchFile2Batch.ts watchFld CHG = END`);
				});
			}),
		);
		if (del) this.ctx.subscriptions.push(fw.onDidDelete(uri=> {
// console.log(`fn:WatchFile2Batch.ts watchFld DEL pat【${pat}】 uri:${uri.path}`);
			this.#addSeq(async ()=> {
// console.log(`fn:WatchFile2Batch.ts watchFld DEL --- START`);
				await this.#delDest(pathDest, uri);
				if (await del(uri)) {
					const {pathCn, pp} = this.#diff.path2cn(uri.path);
					if (pathCn) await remove(pathCn);

					this.#diff.del(pp);
					await this.#diff.save();
				}
				this.ps.pnlWVFolder.updateDelay(uri);
// console.log(`fn:WatchFile2Batch.ts watchFld DEL --- END`);
			});
		}));
	}
	static #aWatchRp2CreDelProc: T_WATCHRP2CREDELPROC[]	= [];

	//MARK: 暗号化対応ファイル新旧チェック
	static chkUpdate(pathSrc: string, pathDest: string) {
		if (this.#isCryptoMode()) {
			const {pathCn} = this.#diff.path2cn(pathDest);
			if (! pathCn) return true;
			return chkUpdate(pathSrc, pathCn);
		}

		return chkUpdate(pathSrc, pathDest);
	}

	//MARK: パターンマッチファイル削除・暗号化ファイルも削除
	static async #delDest(ptDest: string, {path}: Uri) {
		if (ptDest === '') return;

		const hn = getFn(path);
		const aUri = await workspace.findFiles(ptDest.replaceAll('[FN]', hn));
		await Promise.allSettled(aUri.map(async ({path})=> {
			// パターンにマッチするファイルを削除
			await remove(path);

			// 暗号化ファイルも削除
			const {pathCn, pp} = this.#diff.path2cn(path);
			if (pathCn) await remove(pathCn);
			this.#diff.del(pp);
		}));
		await this.#diff.save();
	}

	//MARK: 直列実行キュー追加
	static #addSeq(fnc: ()=> Promise<void>) {	// 追加は必ず同期で
// console.log(`fn:WatchFile2Batch.ts addSeq watchFile:${this.#watchFile}`);
		if (! this.#watchFile) {
			this.updPathJson();
			return;
		}

		// 末尾に追加 - push
		if (this.#aQSeq.push(fnc) !== 1) return;
			// 空じゃなかったならすでに動いてる
			// const isEmpty = this.#aQ.length === 0;
			// this.#aQSeq.push(fnc);	// 末尾に追加 - push
			// if (! isEmpty) return;
		if (this.#tiDelay) clearTimeout(this.#tiDelay);	// 遅延
		this.#tiDelay = setTimeout(()=> this.#doSeq(), 100);
			// 実行する段でキューが空でも構わない
			// 遅延するのは、ファイル置き換えのときに onDidDelete -> onDidCreate イベントが発生するが、それより後に処理を開始したいので
	}
	static	readonly	#aQSeq: (()=> Promise<void>)[] = [];
	static	#tiDelay: NodeJS.Timeout | undefined = undefined;

	//MARK: 直列実行キュー実行
	static async #doSeq() {
		this.#watchFile = false;
		let fncDo;
		while (fncDo = this.#aQSeq.at(0)) {
			await fncDo();
			this.#aQSeq.shift();	// 先頭を削除 - shift
		}
			// キュー追加とのアトミックな兼ね合いから、すぐに削除しない
			// while (fncDo = this.#aQSeq.shift()) await fncDo();

		this.updPathJson();
		this.#watchFile = true;
	}


	protected static async delOldDiff(reg: RegExp) {
		if (! this.#isCryptoMode) return;

		await this.#diff.filter(reg);
	}

}
