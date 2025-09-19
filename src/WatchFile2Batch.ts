/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_CMD, T_E2V_SELECT_ICON_INFO, T_V2E_SELECT_ICON_FILE} from '../views/types';
import {getFn, v2fp} from './CmnLib';
import {SEARCH_PATH_ARG_EXT} from './ConfigBase';
import type {Config} from './Config';
import type {HDiff} from './HDiff';
import {PRE_TASK_TYPE} from './WorkSpaces';
import {FLD_PRJ_BASE} from './Project';
import type {Project, T_H_ADIAG_L2S} from './Project';
import type {PrjSetting} from './PrjSetting';
import {PrjBtnName, statBreak, TASK_TYPE} from './PrjTreeItem';

import type {ExtensionContext, Memento, TaskExecution, TaskProcessEndEvent, WorkspaceFolder} from 'vscode';
import {Disposable, FileType, ProgressLocation, RelativePattern, Uri, workspace, window, tasks, Task, ShellExecution} from 'vscode';
import {copy, existsSync, readJson, remove, statSync} from 'fs-extra';
import {minimatch} from 'minimatch';


type T_WATCHRP2CREDELPROC = {
	pattern	: string,
	crechg?	: (uri: Uri, cre: boolean)=> Promise<void>,
	del?	: (uri: Uri)=> Promise<boolean>,
};


export class WatchFile2Batch {
	protected static	ctx		: ExtensionContext;
	protected static	wsFld	: WorkspaceFolder;
	protected static	prj		: Project;
			static		#diff	: HDiff;
			static		fp2pp(fp: string) {return this.#diff.fp2pp(fp)}
			static		#encIfNeeded	: (uri: Uri)=> Promise<void>;
	protected static	FLD_SRC	: string;
	protected static	onSettingEvt: (nm: string, val: string)=> Promise<boolean>;
	protected static	hTaskExe	: Map<PrjBtnName, TaskExecution>;
	protected static	hOnEndTask	: Map<TASK_TYPE, (e: TaskProcessEndEvent)=> void>;
	protected static	is_new_tmp	: boolean;

	static	#basePathJson	: ()=> Promise<void>;

	protected static	wss		: Memento;
	protected static	PATH_WS			: string;
	protected static	PATH_WS_LEN		: number;
	protected static	PATH_PRJ		: string;
	protected static	PATH_PRJ_BASE	: string;

	static	readonly	#ds	: Disposable[]	= [];

	static	#watchFile = false;
	protected static set watchFile(v: boolean) {this.#watchFile = v}

	//MARK: 初期化
	static init(
		ctx		: ExtensionContext,
		wsFld	: WorkspaceFolder, 
		cfg		: Config,
		prj		: Project,
		diff	: HDiff,
		encFile		: (uri: Uri)=> Promise<void>,
		encIfNeeded	: (uri: Uri)=> Promise<void>,
		FLD_SRC		: string,
		onSettingEvt: (nm: string, val: string)=> Promise<boolean>,
		hTaskExe	: Map<PrjBtnName, TaskExecution>,
		hOnEndTask	: Map<TASK_TYPE, (e: TaskProcessEndEvent)=> void>,
		is_new_tmp	: boolean,
	) {
		this.ctx = ctx;
		this.wsFld = wsFld;
		this.prj = prj;
		this.#basePathJson = async ()=> {
			// path.json 更新（暗号化もここ「のみ」で）
// console.log(`fn:WatchFile2Batch.ts basePathJson`);
			this.#haDiagFn = {};
			await cfg.loadEx(uri=> encFile(uri), this.#haDiagFn);

			// ドロップ時コピー先候補
			for (const [spae, aFld] of this.#mExt2aFld) {
				const aPath: string[] = [];
				for (const fld_nm of aFld) if (existsSync(this.PATH_WS +`/doc/prj/${fld_nm}/`)) aPath.push(fld_nm);
				this.#mExt2ToPath.set(spae, aPath);
			}

			this.#sendReqPathJson();
		};
		this.#diff = diff;
		this.#encIfNeeded = encIfNeeded;
		this.FLD_SRC = FLD_SRC;
		this.onSettingEvt = onSettingEvt;
		this.hTaskExe = hTaskExe;
		this.hOnEndTask = hOnEndTask;
		this.is_new_tmp = is_new_tmp;

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
			const aPp2 = Object.keys(this.#diff.hDiff)
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

	static	async init2th(ps: PrjSetting) {
		this.ps = ps;
		await this.#basePathJson();

		this.#watchFile = true;
	}
	protected static	ps	: PrjSetting;

	static	init3th(fnc: ()=> void) {this.#sendReqPathJson = fnc}
	static	#sendReqPathJson = ()=> {};

	//MARK: デストラクタ
	static	dispose() {for (const d of this.#ds) d.dispose()}


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
		// バッチ実行中のファイル変更検知を抑制
		WatchFile2Batch.#watchFile = false;

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

				// バッチ実行中のファイル変更検知を再開
				WatchFile2Batch.#watchFile = true;

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
			? (uri: Uri)=> this.#encIfNeeded(uri)
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
		if (crechg) this.#ds.push(
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
		if (del) this.#ds.push(fw.onDidDelete(async uri=> {
// console.log(`fn:WatchFile2Batch.ts watchFld DEL watchFile:${this.#watchFile} pat【${rpInp.pattern}】 uri:${uri.path}`);
			if (this.#watchFile) {
				await this.#delDest(pathDest, uri);
				if (await del(uri)) {
					const {pathCn, pp} = this.#diff.path2cn(uri.path);
					if (pathCn) await remove(pathCn);

					this.#diff.delhDiff(pp);
					await this.#diff.updDiffJson();
				}
			}
			this.updPathJson();
		}));
	}
	static #aWatchRp2CreDelProc: T_WATCHRP2CREDELPROC[]	= [];
	static async #delDest(ptDest: string, {path}: Uri) {
		if (ptDest === '') return;

		const hn = getFn(path);
		const aUri = await workspace.findFiles(ptDest.replace('[FN]', hn));
		await Promise.allSettled(aUri.map(({path})=> remove(path)));
	}

}
