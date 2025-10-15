/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {FULL_PATH, PROJECT_PATH, WORKSPACE_PATH} from './CmnLib';
import {vsc2fp} from './CmnLib';
import {PRE_TASK_TYPE} from './WorkSpaces';
import type {HDiff} from './HDiff';
import type {PrjSetting} from './PrjSetting';
import {PrjBtnName, statBreak, type TASK_TYPE} from './PrjTreeItem';

import type {ExtensionContext, Memento, TaskExecution, TaskProcessEndEvent, Uri, WorkspaceFolder} from 'vscode';
import {ProgressLocation, window, tasks, Task, ShellExecution} from 'vscode';
import {copySync, existsSync, readJsonSync} from 'fs-extra';


export	const	FLD_PRJ_BASE	= 'prj_base';


//MARK: バッチ処理情報
const hTask2Inf = {
	cnv_mat_pic: {
		title		: '画像ファイル最適化',
		aNeedLib	: ['fs-extra','sharp'],
	},
	cnv_mat_snd: {
		title		: '音声ファイル最適化',
		aNeedLib	: [],	// 非バッチ・内蔵化につき
	},
	cnv_psd_face: {
		title		: 'PSDファイル変換',
		aNeedLib	: ['fs-extra','sharp'],
	},
	cut_round: {
		title		: 'アイコン生成・加工中',
		aNeedLib	: ['fs-extra','sharp', 'png2icons'],
	},
	subset_font: {
		title		: 'フォントサイズ最適化',
		aNeedLib	: [],	// 非バッチ・内蔵化につき
	},
};
type T_CMD = keyof typeof hTask2Inf;

type T_QSeq = {
	uniq	: string;
	fnc		: ()=> Promise<void>;
};


//MARK: プロジェクトごとの共通情報委譲クラス
// 関数ではなく状態やプロパティが必要なメソッドごと保持
export class PrjCmn {
	readonly	URI_WS;

	readonly	PATH_WS;
	readonly	LEN_PATH_WS;
	readonly	PATH_PRJ;
	readonly	LEN_PATH_PRJ;

	readonly	IS_NEW_TMP;
	readonly	FLD_SRC;
	readonly	PATH_PLG_PRE;

	readonly	PATH_PRJ_BASE;
	readonly	LEN_PATH_PRJ_BASE;

	readonly	wss			: Memento;

	readonly	hTaskExe	= new Map<PrjBtnName, TaskExecution>;


	//MARK: コンストラクタ
	constructor(
		readonly ctx		: ExtensionContext,
		readonly wsFld		: WorkspaceFolder,
		readonly hOnEndTask	: Map<TASK_TYPE, (e: TaskProcessEndEvent)=> void>,
	) {
		this.URI_WS = wsFld.uri.toString();

		this.PATH_WS = vsc2fp(wsFld.uri.path);
		this.LEN_PATH_WS = this.PATH_WS.length;

		this.PATH_PRJ = `${this.PATH_WS}/doc/prj/`;
		this.LEN_PATH_PRJ = this.PATH_PRJ.length;

		this.IS_NEW_TMP = existsSync(`${this.PATH_WS}/src/plugin/`);
		this.FLD_SRC = this.IS_NEW_TMP ?'src' :'core';	// src なら 2025 新テンプレ
		this.PATH_PLG_PRE = `${this.PATH_WS}/${this.FLD_SRC}/plugin/snsys_pre/`;

		this.PATH_PRJ_BASE = `${this.PATH_WS}/${this.FLD_SRC}/${FLD_PRJ_BASE}/`;
		this.LEN_PATH_PRJ_BASE = this.PATH_PRJ_BASE.length;

		this.wss = ctx.workspaceState;
	}
	fp2pp(fp: FULL_PATH): PROJECT_PATH {return fp.slice(this.LEN_PATH_PRJ)}
	fp2wp(fp: FULL_PATH): WORKSPACE_PATH {return fp.slice(this.LEN_PATH_WS)}

	src2pp(fp: FULL_PATH): PROJECT_PATH {return fp.slice(this.LEN_PATH_PRJ_BASE)}

	//MARK: prj（変換後フォルダ）下の変化か prj_base（退避素材ファイル）か判定
	isBaseUrl(fp :FULL_PATH) {return fp.startsWith(this.PATH_PRJ_BASE)}


	//MARK: 初期化
	init(
		updPathJson	: ()=> Promise<void>,
		encIfNeeded	: (uri: Uri)=> Promise<void>,
		diff		: HDiff,
		isCryptoMode: ()=> boolean,
		ps			: PrjSetting,
	) {
		this.updPathJson = updPathJson;
		this.encIfNeeded = encIfNeeded;
		this.#diff = diff;
		this.isCryptoMode = isCryptoMode;
		this.ps = ps;
	}
	updPathJson	: ()=> Promise<void>;

	encIfNeeded	: (uri: Uri)=> Promise<void>;

	#diff	: HDiff;
	get diff() {return this.#diff}

	ps: PrjSetting

	isCryptoMode: ()=> boolean;


	//MARK: タスク実行
	async	exeBatch(nm: T_CMD, arg: string, fisish = (_exit_code: number)=> { /* empty */ }): Promise<void> {
		const inf = hTask2Inf[nm];
		return window.withProgress({
			location	: ProgressLocation.Notification,
			title		: inf.title,
			cancellable	: false,
		}, prg=> new Promise(donePrg=> {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const oPkg = readJsonSync(this.PATH_WS +'/package.json', {encoding: 'utf8'});
			const sNeedInst = inf.aNeedLib
			// .filter(nm=> ! oPkg.devDependencies[nm])
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			.filter(nm=> ! (oPkg.devDependencies ??= {})[nm]).join(' ');

			const pathJs = this.PATH_WS +`/${this.FLD_SRC}/batch/${nm}.js`;
			copySync(this.ctx.extensionPath +`/dist/${nm}.js`, pathJs);

			try {
				tasks.executeTask(new Task(
					{type: PRE_TASK_TYPE +'Sys'},	// タスクの一意性
					this.wsFld,
					inf.title,		// UIに表示
					'SKYNovel',		// source
					new ShellExecution(
						`cd "${this.PATH_WS}" ${statBreak} ${
							sNeedInst
							? `npm i -D ${sNeedInst} ${statBreak}`
							: ''
						} node ./${this.FLD_SRC}/batch/${nm}.js ${arg}`
					),
				))
				.then(r=> this.hTaskExe.set('Batch', r));
			} catch (e) {console.error('Project exeTask() e:%o', e)}

			this.hOnEndTask.set('Sys', e=> {
				prg.report({message: '完了', increment: 100});
				fisish(e.exitCode ?? 0);
				setTimeout(donePrg, 4000);
			});
		}));
	}


	//MARK: 直列実行キュー追加
	addSeq(fnc: ()=> Promise<void>, uniq: string) {	// 追加は必ず同期で
// console.log(`fn:WatchFile2Batch.ts addSeq watchFile:${String(this.watchFile)}`);
		if (! this.watchFile) return;

		// 末尾に追加 - push
		if (this.#aQSeq.push({uniq, fnc}) !== 1) return;
			// 空じゃなかったならすでに動いてる
			// const isEmpty = this.#aQ.length === 0;
			// this.#aQSeq.push(fnc);	// 末尾に追加 - push
			// if (! isEmpty) return;
		if (this.#tiLasyQ) clearTimeout(this.#tiLasyQ);	// 遅延
		this.#tiLasyQ = setTimeout(()=> {void this.doSeq()}, 100);
			// 実行する段でキューが空でも構わない
			// 遅延するのは、ファイル置き換えのときに onDidDelete -> onDidCreate イベントが発生するが、それより後に処理を開始したいので
	}
	#aQSeq: T_QSeq[] = [];
	#tiLasyQ: NodeJS.Timeout | undefined = undefined;

	watchFile	= true;

	//MARK: 直列実行キュー実行
	async doSeq() {
		this.watchFile = false;

		let q: T_QSeq | undefined;
		// eslint-disable-next-line no-cond-assign
		while (q = this.#aQSeq.shift()) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			this.#aQSeq = this.#aQSeq.filter(v=> v.uniq !== q!.uniq)
			await q.fnc();
		}

		this.watchFile = true;
	}

}
