/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {treeProc, foldProc, replaceFile, is_win, docsel, getFn, chkBoolean, v2fp, REG_SCRIPT, type IDecryptInfo} from './CmnLib';
import {PrjSetting} from './PrjSetting';
import {Encryptor, ab2hexStr, encStrBase64} from './Encryptor';
import {ActivityBar, eTreeEnv} from './ActivityBar';
import {EncryptorTransform} from './EncryptorTransform';
import type {TREEITEM_CFG, PrjBtnName, TASK_TYPE} from './PrjTreeItem';
import {PrjTreeItem, statBreak, eDevTreeView} from './PrjTreeItem';
import {aPickItems, type QuickPickItemEx, openURL, PRE_TASK_TYPE} from './WorkSpaces';
import {Config, SysExtension} from './Config';
import {SEARCH_PATH_ARG_EXT, type IFn2Path} from './ConfigBase';
import {WatchFile2Batch} from './WatchFile2Batch';
import {WfbOptPic} from './WfbOptPic';
import {WfbOptSnd} from './WfbOptSnd';
import {WfbOptFont} from './WfbOptFont';
import {HDiff} from './HDiff';

import {commands, debug, env, EvaluatableExpression, Hover, languages, MarkdownString, ProgressLocation, QuickPickItemKind, Range, RelativePattern, ShellExecution, SnippetString, Task, tasks, ThemeIcon, Uri, window, workspace, WorkspaceEdit} from 'vscode';
import type {DebugSession, Disposable, DocumentDropEdit, EventEmitter, ExtensionContext, Position, ProviderResult, TaskExecution, TaskProcessEndEvent,  TextDocument, TreeItem, WorkspaceFolder} from 'vscode';
import {glob, readFile} from 'node:fs/promises';
import {basename, dirname, extname} from 'node:path';
import {createReadStream, createWriteStream, existsSync, outputFile, outputJson, readFileSync, readJsonSync, remove, removeSync, copy, readJson, ensureFile, copyFile, statSync, writeFile, unlink, move, mkdirs} from 'fs-extra';
import {imageSizeFromFile} from 'image-size/fromFile';
import {webcrypto, randomUUID, getRandomValues} from 'crypto';	// 後ろ二つはここでないとerr
const {subtle} = webcrypto;	// https://github.com/nodejs/node/blob/dae283d96fd31ad0f30840a7e55ac97294f505ac/doc/api/webcrypto.md
import * as archiver from 'archiver';
import {execSync} from 'child_process';
import ncu from 'npm-check-updates'
import replaceAsync from 'string-replace-async';


type BtnEnable = '_off'|'Stop'|'';
type PluginDef = {
	uri: string, sl: number, sc: number, el: number, ec: number,
};

export	const	FLD_CRYPT_PRJ	= 'crypto_prj';
export	const	FLD_CRYPT_DOC	= 'doc_crypto';
export	const	FLD_PRJ_BASE	= 'prj_base';

export	const	REG_NEEDCRYPTO		= /\.(ss?n|json|html?|jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv|html?)$/;
export	const	REG_FULLCRYPTO		= /\.(ss?n|json|html?)$/;

export type T_QuickPickItemEx = {label: string, description: string, uri: string};

export type T_Ext2Snip = [SEARCH_PATH_ARG_EXT, string];
export type T_aExt2Snip = T_Ext2Snip[];

export type T_DIAG = {
	mes: string,
	sev: 'E'|'W'|'I'|'H',
};
export type T_H_ADIAG = {[fp: string]: T_DIAG[]};


export class Project {
	readonly	#PATH_WS;
	readonly	#PATH_PRJ;
	readonly	#LEN_PATH_PRJ;

	readonly	#FLD_SRC;

	readonly	#PATH_PRJ_BASE;

	readonly	#PATH_CRYPT;
	#isCryptoMode	= false;

	readonly	#IS_NEW_TMP;

	readonly	#encry;
	readonly	#diff;	// ファイル更新検知ハッシュ
	readonly	#ps;

//	readonly	#ds		= new DisposableStack;
	readonly	#ds		: Disposable[]	= [];

	#dspCryptoMode;		// 暗号化状態

	readonly	#aTiFlat: TreeItem[]	= [];
	enableBtn(enabled: boolean): void {
		if (enabled) for (const ti of this.#aTiFlat) {
			ti.contextValue = ti.contextValue?.trimEnd();
			this.emPrjTD.fire(ti);
		}	// 値を戻してボタン表示
		else for (const ti of this.#aTiFlat) {
			ti.contextValue += ' ';
			this.emPrjTD.fire(ti);
		}	// 値を壊してボタン消去
	}

	readonly	#sendRequest2LSP: (cmd: string, o?: any)=> void;

	#haDiagFn	: T_H_ADIAG	= {};
	#haDiagFont	: T_H_ADIAG	= {};

	readonly	#cfg;

	readonly	#optPic;
	readonly	#optSnd;
	readonly	#optFont;


	//MARK: コンストラクタ
	constructor(
		private readonly ctx: ExtensionContext,
		private readonly actBar: ActivityBar,
		private readonly wsFld: WorkspaceFolder,
		readonly aTiRoot: TreeItem[],
		private readonly emPrjTD: EventEmitter<TreeItem | undefined>,
		private readonly hOnEndTask: Map<TASK_TYPE, (e: TaskProcessEndEvent)=> void>,
		readonly sendRequest2LSP: (cmd: string, uriWs: Uri, o?: any)=> void,
	) {
		const vfp = wsFld.uri.path;
		this.#PATH_WS = v2fp(vfp);
		this.#PATH_PRJ = this.#PATH_WS +'/doc/prj/';
		this.#LEN_PATH_PRJ = this.#PATH_PRJ.length;
// console.log(`020 fn:Project.ts construct #PATH_WS=${this.#PATH_WS}=`);

		const is_new_tmp = this.#IS_NEW_TMP = existsSync(this.#PATH_WS +'/src/plugin/');
		this.#FLD_SRC = is_new_tmp ?'src' :'core';	// src なら 2025 新テンプレ
		this.#PATH_PRJ_BASE = this.#PATH_WS +`/${this.#FLD_SRC}/${FLD_PRJ_BASE}/`;

		// 暗号化処理
		this.#PATH_CRYPT = this.#PATH_WS +`/${
			is_new_tmp ?FLD_CRYPT_DOC :'doc'
		}/${FLD_CRYPT_PRJ}/`;
		this.#isCryptoMode = existsSync(this.#PATH_CRYPT);
		const fnPass = this.#PATH_WS +'/pass.json';
		const exists_pass = existsSync(fnPass);
		this.#encry = new Encryptor(exists_pass
			? readJsonSync(fnPass, {throws: false})
			: <IDecryptInfo>{
				pass	: randomUUID(),
				salt	: ab2hexStr(getRandomValues(new Uint32Array(128 / 8)).buffer),
				iv		: ab2hexStr(getRandomValues(new Uint32Array(128 / 8)).buffer),
				keySize	: 512 / 32,
				ite		: 500 + Math.floor((new Date).getTime() %300),
				stk		: ab2hexStr(getRandomValues(new Uint32Array(128 / 8)).buffer),
			}, subtle);
		if (! exists_pass) /*await*/ outputFile(fnPass, this.#encry.strHPass);
		this.#aRepl = is_new_tmp
		? [
			`${this.#FLD_SRC}/web.ts`,
			`${this.#FLD_SRC}/renderer/renderer.ts`,
		]
		: [
			`${this.#FLD_SRC}/app4webpack.js`,
			`${this.#FLD_SRC}/web4webpack.js`,
		];

		// プロジェクト管理系
		const sr = new SysExtension({cur: this.#PATH_PRJ, crypto: this.#isCryptoMode, dip: ''});
		this.#cfg = new Config(sr, this.#encry);

		this.#diff = new HDiff(
			`${this.#PATH_WS}/${this.#FLD_SRC}/diff.json`,
			this.#FLD_SRC,
			this.#PATH_CRYPT,
			this.#encry,
		);
		this.#sendRequest2LSP = (cmd, o = {})=> sendRequest2LSP(cmd, wsFld.uri, o);
		WatchFile2Batch.init(
			ctx,
			wsFld,
			this.#cfg,
			this.#diff,
			uri=> this.#encFile(uri),
			uri=> this.#encIfNeeded(uri),
			this.#FLD_SRC,
			(nm, val)=> this.#onSettingEvt(nm, val),
			this.#hTaskExe,
			this.hOnEndTask,
			is_new_tmp,
	);
		const pti = PrjTreeItem.create(
			ctx,
			wsFld,
			(ti, btn_nm, cfg)=> this.#onBtn(ti, btn_nm, cfg),
			is_new_tmp,
		);
		aTiRoot.push(pti);
		this.#ds.push(this.#ps = new PrjSetting(
			ctx,
			wsFld,
			this.#cfg,
			title=> {
				pti.label = title;
				emPrjTD.fire(pti);
			},
			this.#sendRequest2LSP,
			(nm, val)=> this.#onSettingEvt(nm, val),
			this.#diff,
			this.#optPic	= new WfbOptPic,
			this.#optSnd	= new WfbOptSnd,
			this.#optFont	= new WfbOptFont,
			this.#FLD_SRC,
			is_new_tmp,
		));

		const aTi = pti.children;
		const aC = (aTi.at(-1)! as PrjTreeItem).children;
		this.#aTiFlat = [...aTi.slice(0, -1), ...aC];
		const tiSnUpd = aTi[eDevTreeView.SnUpd]!;
		this.getLocalSNVer = ()=> {
			const o = this.#ps.getLocalSNVer();
			tiSnUpd.description = o.verSN
				? o.verSN.startsWith('ile:') || o.verSN.startsWith('./')
				? '（相対パス参照中）'
				: `-- ${o.verSN}${o.verTemp ?` - ${o.verTemp}` :''}`
				: '取得できません';
			emPrjTD.fire(tiSnUpd);
			return o;
		};
		const tiCrypto = aTi[eDevTreeView.Crypto]!;
		this.#dspCryptoMode = ()=> {
			tiCrypto.description = `-- ${this.#isCryptoMode ?'する' :'しない'}`;
			emPrjTD.fire(tiCrypto);
		};

		this.#encry.init()
		.then(()=> Promise.allSettled([
			async ()=> {
				await this.#initCrypto();
				this.#dspCryptoMode();
			},

			()=> this.#diff.init(),

			async ()=> {
				// 旧テンプレ置換
				if (! is_new_tmp) {
					// == 以下は updPrjFromTmp() で全置き換えされるのでそのままとする
					// core/webpack.config.js
					// 旧ビルドによる中間ファイルを削除
					for await (const fn of glob(this.#PATH_WS +'/doc/{app/app,web}.vendors-node_modules_*.js')) await unlink(fn);

					// == 以下は 置き換えない系（せいぜい値持ち越し）
					// package.json
					replaceFile(	// テンプレ更新のために必ず更新
						this.#PATH_WS +'/package.json',
						/github.com:famibee\/SKYNovel_/,
						`github.com:famibee\/tmp_cjs_`,
						false,
					);

					replaceFile(	// テンプレ更新しなくても最低限動作するように
						this.#PATH_WS +'/package.json',
						/ && npm i && npm run webpack:dev/,
						` && npm i",\n\t\t"postinstall": "npm run webpack:dev`,
						false,
					);
				}
				// v4.21.4 バッチファイル位置移動
				for await (const fn of glob(this.#PATH_WS +'/build/{cnv_*,cut_round,subset_font}.{js,json}')) {
					const dest = fn.replace('/build/', `/${this.#FLD_SRC}/batch/`);
					await move(fn, dest);
				}

				// v4.21.4 画像・音声最適化処理の元ファイル退避先フォルダ移動
				const OLD_FLD_PRJ_BASE = this.#PATH_WS +`/doc/${FLD_PRJ_BASE}/`;
				if (existsSync(OLD_FLD_PRJ_BASE)) await move(OLD_FLD_PRJ_BASE, this.#PATH_PRJ_BASE);

				// v4.21.2 パス通し設定を settings.json に追記
				const pathStgJS = this.#PATH_WS +'/.vscode/settings.json';
				if (existsSync(pathStgJS)) {
					const o = await readJson(pathStgJS, {encoding: 'utf8'});
					if ('terminal.integrated.env.windows' in o) return;

					o['terminal.integrated.env.windows'] = {
						"PATH": "${workspaceRoot}\\node_modules\\.bin;${env:PATH}"
					};
					o['terminal.integrated.env.osx'] = {
						"PATH": "${workspaceRoot}/node_modules/.bin:${env:PATH}"
					};
					await writeFile(pathStgJS, JSON.stringify(o, null, '\t'));
				}
				else await copyFile(ctx.extensionPath +'/res/settings.json', pathStgJS);
			},

			async ()=> {
				const firstInit = ! existsSync(this.#PATH_WS +'/node_modules');
				await this.#updPlugin(firstInit);	// updPlugin で goAll() が走る
				if (firstInit) {
					 if (ActivityBar.aReady[eTreeEnv.NPM]) window.showInformationMessage('初期化中です。ターミナルの処理が終わって止まるまでしばらくお待ち下さい。', {modal: true});
				}
				else await actBar.chkLastSNVer([this.getLocalSNVer()]);
			},

			// {jpg,jpeg,png} -> webp
			()=> this.#optPic.init(),

			// {mp3,wav} -> {m4a,aac,ogg}
			()=> this.#optSnd.init(),

			// {sn, htm ...} -> {woff2,woff,otf,ttf}
			()=> this.#optFont.init(),

			// path.json 変更時に暗号化処理起動
			async ()=> this.#ds.push(workspace.createFileSystemWatcher(
				new RelativePattern(wsFld, 'doc/prj/prj.json')
			).onDidChange(uri=> this.#encIfNeeded(uri))),

			async ()=> {
				debug.onDidTerminateDebugSession(_=> this.#onDidTermDbgSS());
				debug.onDidStartDebugSession(ds=> this.#aDbgSS.push(ds));

				// デバッグ中のみ有効なホバー
				ctx.subscriptions.push(languages.registerEvaluatableExpressionProvider(docsel, {
					provideEvaluatableExpression(doc, pos): ProviderResult<EvaluatableExpression> {
						const r = doc.getWordRangeAtPosition(pos, Project.#REG_VAR);
						if (! r) return Promise.reject('No word here.');

						const txt = doc.getText(r);
						const hc = txt.at(0);
						if (hc === '[' || hc === '*' || hc === ';'
						|| txt.at(-1)=== '=') return Promise.reject('No word here.');
						return new EvaluatableExpression(r, txt);
					},
				}));
			},
		].map(p=> p()))).then(()=> {
			WatchFile2Batch.init2th(this.#ps);

			this.#sendRequest2LSP('ready');
		});
	}

	static	readonly	#REG_VAR	= /;.+|[\[*]?[\d\w\.]+=?/;
	// https://regex101.com/r/G77XB6/3 20 match, 188 step(~1ms)

	readonly	getLocalSNVer	: ()=> {verSN: string, verTemp: string};
				#aDbgSS			: DebugSession[]	= [];
	#onDidTermDbgSS = ()=> {}

	//MARK: デストラクタ
	// DisposableStack is not implemented
//	[Symbol.dispose]() {this.#ds.dispose()}
	dispose() {
		WatchFile2Batch.dispose();
		for (const d of this.#ds) d.dispose();
	}


	#termDbgSS() {
		this.#hTaskExe.get('TaskWeb')?.terminate();
		this.#hTaskExe.delete('TaskWeb');
		this.#hTaskExe.get('TaskApp')?.terminate();
		this.#hTaskExe.delete('TaskApp');

		const a = this.#aDbgSS.map(ds=> debug.stopDebugging(ds));
		this.#aDbgSS = [];
		return Promise.allSettled(a);
	}


	//MARK: LSPから受信
	onRequest({cmd, o}: {cmd: string, o: any}) {
// console.log(`fn:Project.ts ⤵ onRequest cmd:${cmd} o:%o`, o);
		switch (cmd) {
			// #noticeGo() から。何度も来る
			case 'go':{
				const pp2s: {[pp: string]: string} = {};
				treeProc(this.#PATH_PRJ, fp=> {
					if (! /\.(ss?n|json)$/.test(fp)) return;

					fp = v2fp(Uri.file(fp).path);
					// まだセーブしてない Dirty状態の場合があるので doc優先
					const td = workspace.textDocuments.find(v=> v2fp(v.uri.path) === fp);
					const pp = fp.slice(this.#LEN_PATH_PRJ);
					pp2s[pp] = (REG_SCRIPT.test(fp) ?td?.getText() :undefined)
						?? readFileSync(fp, {encoding: 'utf8'});
				});

				//NOTE: #haDiagFont はここで毎回更新すべきか、フォント最適化スイッチをさわったときか、本文にフォントファイルに含まれない文字が増えたときか、減ったときは、など議論がある
				// ひとまず処理がさほど重くなさそうなので毎回やる
				this.#haDiagFont = this.#optFont.updDiag(o.InfFont);
				const haDiag = {...this.#haDiagFn, ...this.#haDiagFont};

				this.#sendRequest2LSP(cmd +'.res', {pp2s, hDefPlg: this.#hDefPlg, haDiag});
			}	break;

			// #scanEnd() から
			case 'analyze_inf':{
				this.#aPickItems = [
					...aPickItems,

					{kind: QuickPickItemKind.Separator, label: ''},

					...(<T_QuickPickItemEx[]>o.aQuickPickMac)
					.map(({label, description, uri})=> ({
						label, description, uri: Uri.parse(uri),
					})),

					{kind: QuickPickItemKind.Separator, label: ''},

					...(<T_QuickPickItemEx[]>o.aQuickPickPlg)
					.map(({label, description, uri})=> ({
						label, description, uri: Uri.parse(uri),
					})),
				];

				this.#mExt2Snip = new Map(<T_aExt2Snip>o.aExt2Snip);

				WatchFile2Batch.init3th(o=> this.#sendRequest2LSP('upd_pathjson', o));
			}	break;

			case 'hover.res':	{
				const {path} = Uri.parse(o?.uri);
//console.log(`fn:Project.ts hover.res path:${path}: o=${JSON.stringify(o)}`);
				this.#hPath2Proc[path]?.(o);
			}	break;
		}
	}

	//MARK: ホバーイベント
	#hPath2Proc: {[path: string]: (o: any)=> void}	= {};
	provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
		const vfp = doc.uri.path;
		return new Promise<Hover>((rs, rj)=> {
			// ホバーイベントを伝え、文字列加工だけ任せ文字列を返してもらい、ここで表示
			this.#hPath2Proc[vfp] = o=> {
//console.log(`fn:Project.ts Hover OK! o:${JSON.stringify(o)}:`);
				delete this.#hPath2Proc[vfp];

				let v = String(o.value);
				if (v === 'undefined') {rj(); return;}

				const a = v.split(/(?=\n---\n)/);
				if (a.length === 3) {
					// 中央部分のみ置換。SQLジャンクション的なものの対策
					const [args='', ...detail] = a;
					v = args + replaceAsync(
						detail.join(''),
						/<!-- ({.+?}) -->/g,
						async (_, e1)=> {
	const o = JSON.parse(e1);
	const {name, val} = o;
	const ppImg = this.#cfg.searchPath(val, SEARCH_PATH_ARG_EXT.SP_GSM);

	const vfpImg = this.#vpPrj + ppImg;
	const srcEx = `${vfpImg}|width=${this.#whThumbnail}|height=${this.#whThumbnail}`;
	const {width = 0, height = 0} = await imageSizeFromFile(this.#PATH_PRJ + ppImg);
	const exImg = encodeURIComponent(JSON.stringify([Uri.parse(vfpImg)]));
//	const timestamp = new Date.getTime();
//console.log(`fn:Project.ts line:531 timestamp:${timestamp}`);

	return `- ${name} = ${val} (${width}x${height}) ${
		`[ファイルを見る](${vfpImg} "ファイルを見る")`
	} [サイドバーに表示](${
		Uri.parse(`command:revealInExplorer?${exImg}`)
	} "サイドバーに表示")
	[フォルダを開く](${
		Uri.parse(`command:revealFileInOS?${exImg}`)
	} "フォルダを開く")  \n`
//	+ `<img src="${vfpImg}?t=${timestamp}" title="${val}" width="${this.#whThumbnail}" height="${this.#whThumbnail *height /width}">`;
		// TODO: 画像ファイルを更新してもサムネイルが更新されない
//	+ `![${val}](${srcEx}?t=${timestamp} "${val}")`;
	+ `![${val}](${srcEx} "${val}")`;
						}
					);
				}

				const ms = new MarkdownString(v);
				ms.isTrusted = true;
			//	ms.supportHtml = true;
				rs(new Hover(ms));
			};
			this.#sendRequest2LSP('hover', {uri: doc.uri.toString(), pos});
				// 【file:///Users/...】 LSPの doc 特定で使う
		});
	}
	get	#vpPrj(): string {return this.wsFld.uri.toString() +'/doc/prj/'}
		readonly	#whThumbnail = 200;


	#aPickItems	: QuickPickItemEx[] = [];
	openReferencePallet() {
		window.showQuickPick<QuickPickItemEx>(this.#aPickItems, {
			placeHolder			: 'どのリファレンスを開きますか?',
			matchOnDescription	: true,
		})
		.then(q=> {if (q?.uri) openURL(q.uri, this.#PATH_WS);});
	}


	//MARK: ビューオープン
	opView(uri: Uri) {this.#ps.pnlWVFolder.open(uri)}

	//MARK: 設定パネルイベント
	// 主に設定画面からのアクション。falseを返すとスイッチなどコンポーネントを戻せる
	async #onSettingEvt(nm: string, val: string): Promise<boolean> {
//console.log(`fn:Project.ts #cmd nm:${nm} val:${val}`);
		// 最新は val。this.ctx.workspaceState.get(（など）) は前回値
		switch (nm) {
		case 'cnv.font.subset':
			if (await window.showInformationMessage('フォントサイズ最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			if (! ActivityBar.aReady[eTreeEnv.PY_FONTTOOLS]) break;

			if (chkBoolean(val)) await this.#optFont.enable();
			else await this.#optFont.disable();
			break;

		case 'cnv.mat.pic':
			if (await window.showInformationMessage('画像ファイル最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			// 暗号化状態での最適化状態切り替えの場合、切り替え前の暗号化ファイルを削除
			await this.#delOldCrypto(this.#REG_DiffExtPic);

			if (chkBoolean(val)) await this.#optPic.enable();
			else await this.#optPic.disable();
			break;

		case 'cnv.mat.webp_quality':
			await this.#optPic.reconv();
			break;

		case 'cnv.mat.snd':
			if (await window.showInformationMessage('音声ファイル最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			// 暗号化状態での最適化状態切り替えの場合、切り替え前の暗号化ファイルを削除
			await this.#delOldCrypto(this.#REG_DiffExtSnd);

			if (chkBoolean(val)) await this.#optSnd.enable();
			else await this.#optSnd.disable();
			break;

		case 'cnv.mat.snd.codec':
			if (! this.#ps.oWss['cnv.mat.snd']) break;

			// 現状、UI的に「常にエンコーダー変更」なので、旧全生成物削除→全変換
			// 暗号化状態でのエンコーダー変更の場合、変更前の暗号化ファイルを削除
			await this.#delOldCrypto(this.#REG_DiffExtSnd);

			await this.#optSnd.reconv();
			break;
		}

		return true;
	}
		readonly	#REG_DiffExtPic	= /\.(jpe?g|png|svg|webp)$/;
		readonly	#REG_DiffExtSnd	= /\.(mp3|m4a|ogg|aac|flac|wav)$/;
		async #delOldCrypto(regDiff: RegExp) {
			if (! this.#isCryptoMode) return;

			await this.#diff.delOldCrypto(regDiff);
		}


	//MARK: ボタンの処理
	readonly	#hPush2BtnEnable = new Map<PrjBtnName, BtnEnable[]>([
		['Crypto',		['','','','','','','','','','','','']],
		['TaskWeb',		['_off', '_off', '', '_off', 'Stop', '_off',
						'_off', '_off', '_off', '_off', '_off', '_off']],
		['TaskWebDbg',	['_off', '_off', '', '_off', 'Stop', '_off',
						'_off', '_off', '_off', '_off', '_off', '_off']],
		['TaskWebStop',	['','','','','','','','','','','','']],
	//	['TaskApp',		['_off', '_off', '', '_off', '_off', 'Stop',
	//						'_off', '_off', '_off', '_off', '_off', '_off']],
	//	['TaskAppDbg',	['_off', '_off', '', '_off', '_off', 'Stop',
	//						'_off', '_off', '_off', '_off', '_off', '_off']],
			// NOTE: Stop 実装方法策定中につき無効化中
		['TaskAppDbgStop', ['','','','','','','','','','','','']],
	]);
	async #onBtn(ti: TreeItem, btn_nm: PrjBtnName, cfg: TREEITEM_CFG) {
		if (! ActivityBar.aReady[eTreeEnv.NPM]) return;

		// 値を壊してボタン消去など
		const aBtnEnable = this.#hPush2BtnEnable.get(btn_nm)
		?? ['_off', '_off', '_off', '_off', '_off', '_off',
			'_off', '_off', '_off', '_off', '_off', '_off'];
		this.#aTiFlat.forEach((ti, i)=> {
			ti.contextValue += aBtnEnable[i]!;
			this.emPrjTD.fire(ti);
		});

		if (btn_nm === 'TaskWebStop' || btn_nm === 'TaskAppStop') {
			await this.#onBtn_sub(ti, btn_nm, cfg, ()=> {});
			return;
		}
		window.withProgress({
			location	: ProgressLocation.Notification,
			title		: String(ti.label) ?? '',
			cancellable	: false,
		}, prg=> new Promise(async done=> {
			const iconPath = ti.iconPath;
			ti.iconPath = new ThemeIcon('sync~spin');

			await this.#onBtn_sub(ti, btn_nm, cfg, (timeout = 4000)=> {
				ti.iconPath = iconPath;

				for (const ti of this.#aTiFlat) {
					const tc = ti.contextValue;
					if (tc && (tc.endsWith('_off') || tc.endsWith('Stop'))) {
						ti.contextValue = tc.slice(0, -4);
					}
					this.emPrjTD.fire(ti);
				}	// 値を戻してボタン表示

				prg.report({message: '完了', increment: 100});
				setTimeout(()=> done(0), timeout);
			})
		}));
	}
	async #onBtn_sub(ti: TreeItem, btn_nm: PrjBtnName, cfg: TREEITEM_CFG, done: (timeout?: number)=> void) {
		let cmd = `cd "${this.#PATH_WS}" ${statBreak} `;
		if (! existsSync(this.#PATH_WS +'/node_modules')) {
			cmd += `npm i ${statBreak} `;	// 自動で「npm i」
			await remove(this.#PATH_WS +'/package-lock.json');
		}

		// メイン処理
		if (cfg.npm) cmd += cfg.npm;
		switch (btn_nm) {	// タスク前処理
			case 'SnUpd':
				try {
					await this.#termDbgSS();
					await this.actBar.updPrjFromTmp(this.#PATH_WS);
					await ncu({	// ncu -u --target minor
						packageFile: this.#PATH_WS +'/package.json',
						// Defaults:
						// jsonUpgraded: true,
						// silent: true,
						upgrade: true,
						target: 'minor',
					});
					this.getLocalSNVer();
					await this.#onBtn_sub(ti, 'SnUpd_waited', cfg, done);
				} catch (e) {
					console.error(`fn:Project.ts onBtn_sub SnUpd e:%o`, e);
					done(0);
				}
				return;

			case 'SnUpd_waited':	break;	// Promise待ち後

			case 'PrjSet':	this.#ps.open();	done(0);	return;

			case 'Crypto':
				try {
					const ans = await window.showInformationMessage('暗号化（する / しない）を切り替えますか？', {modal: true}, 'はい');
					if (ans !== 'はい') {done(0); return}

					await this.#termDbgSS();
					await this.#tglCryptoMode();
					await this.#onBtn_sub(ti, 'Crypto_waited', cfg, done);
				} catch (e) {
					console.error(`fn:Project.ts onBtn_sub Crypto e:%o`, e);
				}
				return;
			case 'Crypto_waited':	break;	// Promise待ち後

			case 'TaskWebDbg':
			case 'TaskAppDbg':
				await this.#termDbgSS();
				this.#onDidTermDbgSS = ()=> {
					this.#onDidTermDbgSS = ()=> {};
					done(0);
				};
				await debug.startDebugging(
					this.wsFld,
					`${btn_nm === 'TaskWebDbg' ?'web' :'app'}デバッグ`,
				);
				return;

			case 'TaskWebStop':
			case 'TaskAppStop':
				await this.#termDbgSS();	done(0);	return;

			case 'PackWin':
			case 'PackWin32':
			case 'PackMac':
			case 'PackMacArm64':
			case 'PackLinux':	await this.#termDbgSS();	break;

			case 'PackFreem':
				await this.#termDbgSS();

				let find_ng = false;
				treeProc(this.#PATH_PRJ, async fp=> {
					if (find_ng || ! fp.endsWith('.svg')) return;

					find_ng = true;
					await window.showErrorMessage(
						`ふりーむ！では svg ファイル使用禁止です。png などに置き換えて下さい`, 'フォルダを開く', 'Online Converter',
					)
					.then(async ans=> {switch (ans) {
						case 'フォルダを開く':
							await env.openExternal(Uri.file(dirname(fp)));	break;
						case 'Online Converter':
							await env.openExternal(Uri.parse('https://cancerberosgx.github.io/demos/svg-png-converter/playground/'));
							break;
					}});
				});
				if (find_ng) {done(); return;}
				break;
		}

		// Windowsでの PowerShell スクリプト実行ポリシーについて警告
		switch (btn_nm) {
			case 'PackWin':
			case 'PackWin32':
				if (! is_win) break;
				if (! /(Restricted|AllSigned)/.test(
					execSync('PowerShell Get-ExecutionPolicy').toString()
				)) break;

				done();
				await window.showErrorMessage(`管理者として開いたPowerShell で実行ポリシーを RemoteSigned などに変更して下さい。\n例）Set-ExecutionPolicy RemoteSigned`, {modal: true}, '参考サイトを開く')
				.then(async a=> {if (a) await env.openExternal(Uri.parse('https://qiita.com/Targityen/items/3d2e0b5b0b7b04963750'));});
				return;
		}

		const task_type = cfg.task_type ?? 'Pkg';
		const t = new Task(
			{type: PRE_TASK_TYPE + task_type},	// タスクの一意性
			this.wsFld,
			cfg.label,		// UIに表示
			'SKYNovel',		// source
			new ShellExecution(cmd),
		);
		this.hOnEndTask.set(task_type, ()=> done());
		switch (btn_nm) {	// タスク後処理
			//case 'SnUpd':	// ここには来ない
			case 'SnUpd_waited':	// Promise待ち後
				this.hOnEndTask.set(task_type, ()=> {this.getLocalSNVer(); done()});
				break;

			case 'Crypto_waited':
				this.hOnEndTask.set(task_type, ()=> {this.#dspCryptoMode(); done()});
				break;

			case 'PackWin':
			case 'PackWin32':
			case 'PackMac':
			case 'PackMacArm64':
			case 'PackLinux':	this.hOnEndTask.set(task_type, async ()=> {
			try {
				// アップデート用ファイル作成
				const oPkg = await readJson(this.#PATH_WS +'/package.json', {encoding: 'utf8'});

				const pathPkg = this.#PATH_WS +'/build/package';
				const pathUpd = pathPkg +'/update';
				const fnUcJs = pathUpd +'/_index.json';
				let oUc = existsSync(fnUcJs)
					? await readJson(fnUcJs, {encoding: 'utf8'})
					: {};

//console.log(`fn:Project.ts line:492 pkg ver:${oPkg.version}: @${btn_nm.slice(4, 7)}@`);
				const isMacBld = btn_nm.slice(4, 7) === 'Mac';
				const isLinBld = btn_nm.slice(4, 7) === 'Lin';
				const fnYml = pathPkg +`/latest${
					isMacBld ?'-mac' :isLinBld ?'-linux' :''
				}.yml`;
				if (! existsSync(fnYml)) throw '必要なファイルが生成されませんでした';
				const sYml = await readFile(fnYml, {encoding: 'utf8'});
				const mv = /version: (.+)/.exec(sYml);
				if (! mv) throw `[Pack...] .yml に version が見つかりません`;
				const ver = mv[1];
//console.log(`fn:Project.ts line:499 ver=${ver}= eq=${oPkg.version == ver}`);
				if (oUc.version != ver || oUc.name != oPkg.name) {
					oUc = {};
					await remove(pathUpd);
					await mkdirs(pathUpd);
				}
				oUc.version = oPkg.version;
				oUc.name = oPkg.name;

				const mp = /path: (.+)/.exec(sYml);
				if (! mp) throw `[Pack...] .yml に path が見つかりません`;
				const path = mp[1]!;

				const ms = /size: (.+)/.exec(sYml);
				if (! ms) throw `[Pack...] .yml に size が見つかりません`;
				const size = Number(ms[1] ?? NaN);

				const mc = /sha512: (.+)/.exec(sYml);
				if (! mc) throw `[Pack...] .yml に sha512 が見つかりません`;
				const sha512 = mc[1] ?? '';
				const cn = encStrBase64(this.#encry.uuidv5(sha512));

				const ma = /-(\w+)\.\D/.exec(path);
					// https://regex101.com/r/yH7nLk/1	13 steps, 0.0ms
				if (! ma) throw `path に arch が見つかりません`;
				const arch = ma[1];

				const key = (isMacBld ?'darwin' :isLinBld ?'linux' :'win32') +'_'+ arch;
				oUc[key] = {path, size, sha512, cn,};
				await outputJson(fnUcJs, oUc, {spaces: '\t'});

				// 古い（暗号化ファイル名）更新ファイルを削除
				const REG_OLD_SAMEKEY = new RegExp('^'+ key +'-');
				foldProc(pathUpd, async (fp, nm)=> {
					if (REG_OLD_SAMEKEY.test(nm)) await remove(fp);
				}, ()=> {});

				// （暗号化ファイル名）更新ファイルをコピー
				await copy(pathPkg +'/'+ path, pathUpd +'/'+ key +'-'+ cn);
					// ランダムなファイル名にしたいがkeyは人に分かるようにして欲しい、
					// という相反する要望を充たすような
					// 既存ファイル削除にも便利

				done();
				const a = await window.showInformationMessage(
					`${cfg.label} パッケージを生成しました`,
					'出力フォルダを開く',
				);
				if (a) await env.openExternal(Uri.file(pathPkg));
			} catch (e) {
				done();
				await window.showErrorMessage(`${cfg.label} パッケージ生成に失敗しました…${e}`);
			}});
				break;

			case 'PackFreem':	this.hOnEndTask.set(task_type, async ()=> {
				const cwd = this.#PATH_WS +`/${
					this.#IS_NEW_TMP && this.#isCryptoMode
					? FLD_CRYPT_DOC
					: 'doc'
				}/`;
				const arc = archiver.create('zip', {zlib: {level: 9},})
				.append(createReadStream(cwd +'web.htm'), {name: 'index.html'})
				.append(createReadStream(this.#PATH_WS +'/build/include/readme.txt'), {name: 'readme.txt'})
				.glob('web.js', {cwd})
				.glob('web.*.js', {cwd})
				.glob(`${
					this.#isCryptoMode ?FLD_CRYPT_PRJ :'prj'
				}/**/*`, {cwd})
				.glob('favicon.ico', {cwd});

				const fn_out = `${basename(this.#PATH_WS)}_1.0freem.zip`;
				const ws = createWriteStream(this.#PATH_WS +`/build/package/${fn_out}`)
				.on('close', ()=> {
					done();
					window.showInformationMessage(
						`ふりーむ！形式で出力（${fn_out}）しました`,
						'出力フォルダを開く',
					).then(a=> {if (a) env.openExternal(Uri.file(this.#PATH_WS +'/build/package/'))})
				});
				arc.pipe(ws);
				await arc.finalize();	// zip圧縮実行
			});
				break;
		}
		await tasks.executeTask(t)
		.then(
			re=> this.#hTaskExe.set(btn_nm, re),
			rj=> console.error(`fn:Project onBtn_sub() rj:${rj.message}`)
		);
	}
	readonly	#hTaskExe	= new Map<PrjBtnName, TaskExecution>;


	//MARK: 暗号化
	async #initCrypto() {
		const fnc: (fp: string)=> Promise<void> = this.#isCryptoMode
			? async fp=> {
				const uri = Uri.file(fp);
				if (this.#diff.isDiff(uri)) await this.#encFile(uri);
			}
			: async fp=> {
				const uri = Uri.file(fp);
				this.#diff.isDiff(uri);
			};
		treeProc(this.#PATH_PRJ, fnc);
		await this.#diff.updDiffJson();
	}
	//MARK: （必要なら）ファイルを暗号化する
	async #encIfNeeded(uri: Uri) {
		// isDiff() を必ず処理したいので先に
		if (this.#diff.isDiff(uri) && this.#isCryptoMode) await this.#encFile(uri);
		await this.#diff.updDiffJson();
	}


	readonly	#aRepl;
	async #tglCryptoMode() {
		const pathPre = `${this.#PATH_WS}/${this.#FLD_SRC}/plugin/snsys_pre/`;
		this.#isCryptoMode = ! this.#isCryptoMode;
		this.#cfg.setCryptoMode(this.#isCryptoMode);
		if (! this.#isCryptoMode) {
			// to 暗号化解除
			await remove(
				this.#IS_NEW_TMP
				? this.#PATH_WS + `/${FLD_CRYPT_DOC}/`
				: this.#PATH_CRYPT
			);

			await remove(pathPre);

			// ビルド関連：SKYNovelが見に行くプロジェクトフォルダ名変更
			for (const url of this.#aRepl) replaceFile(
				this.#PATH_WS +'/'+ url,
				/\(hPlg, {.+?}\);/,
				'(hPlg);',
			);
			// ビルド関連：パッケージするフォルダ名変更
			if (this.#IS_NEW_TMP) {
				replaceFile(
					this.#PATH_WS +'/electron.vite.config.ts',
					new RegExp(`publicDir: '../../${FLD_CRYPT_DOC}/'`),
					`publicDir: '../../doc/'`,
				);
				replaceFile(
					this.#PATH_WS +'/vite.config.ts',
					new RegExp(`publicDir: '${FLD_CRYPT_DOC}'`),
					`publicDir: 'doc'`,
				);
			}
			else replaceFile(
				this.#PATH_WS +'/package.json',
				new RegExp(`"doc\\/${FLD_CRYPT_PRJ}\\/",`),
					// (new RegExp("~")) の場合は、バックスラッシュは２つ必要
				'"doc/prj/",',
			);
			await this.#updPlugin();

			return;
		}

		// to 暗号化
		await mkdirs(this.#PATH_CRYPT);

		// ビルド関連：SKYNovelが見に行くプロジェクトフォルダ名変更
		for (const url of this.#aRepl) replaceFile(
			this.#PATH_WS +'/'+ url,
			/\(hPlg\);/,
			`(hPlg, {cur: '${FLD_CRYPT_PRJ}/', crypto: true});`,
		);
		// ビルド関連：パッケージするフォルダ名変更
		if (this.#IS_NEW_TMP) {
			replaceFile(
				this.#PATH_WS +'/electron.vite.config.ts',
				/publicDir: '..\/..\/doc\/'/,
				`publicDir: '../../${FLD_CRYPT_DOC}/'`,
			);
			replaceFile(
				this.#PATH_WS +'/vite.config.ts',
				/publicDir: 'doc'/,
				`publicDir: '${FLD_CRYPT_DOC}'`,
			);
		}
		else replaceFile(
			this.#PATH_WS +'/package.json',
			/"doc\/prj\/",/,
			`"doc/${FLD_CRYPT_PRJ}/",`,
		);
		// ビルド関連：プラグインソースに埋め込む
		replaceFile(
			this.ctx.extensionPath +`/dist/snsys_pre.js`,
			/[^\s=]+\.tstDecryptInfo\(\)/,
			this.#encry.strHPass,
			true,
			pathPre +`index.${this.#IS_NEW_TMP ?'ts' :'js'}`,
		);
		await this.#updPlugin();

		this.#diff.clear();
		await this.#initCrypto();
	}

	async #encFile({path}: Uri) {
		const fp = v2fp(path);
		const pp = this.#diff.fp2pp(fp);
// console.log(`fn:Project.ts #encFile pp=${pp}= =${this.#diff.hDiff[pp]!.cn}`);
		try {
			const path_enc = this.#PATH_CRYPT + this.#diff.hDiff[pp]!.cn;
			if (! REG_NEEDCRYPTO.test(fp)) {
				await copy(fp, path_enc, {overwrite: true});
				//.catch((e: any)=> console.error(`enc cp1 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラーとなるだけなので
				return;
			}

			if (REG_FULLCRYPTO.test(pp)) {	// この中はSync
				if (pp !== 'path.json') {	// 内容も変更
					const s = await readFile(fp, {encoding: 'utf8'});
					await outputFile(path_enc, await this.#encry.enc(s));
					return;
				}

				if (this.#tiDelayEnc) clearTimeout(this.#tiDelayEnc);// 遅延
				this.#tiDelayEnc = setTimeout(async ()=> {
					// ファイル名匿名化
					const hPath: IFn2Path = await readJson(fp, {encoding: 'utf8'});
					for (const hExt2N of Object.values(hPath)) {
						for (const [ext, pp2] of Object.entries(hExt2N)) {
							if (ext === ':cnt') continue;
							if (ext.endsWith(':id')) continue;
							const dir = this.#REG_DIR.exec(pp2);
							const d = this.#diff.hDiff[pp2];
							if (dir && this.#cfg.oCfg.code[dir[1]!] || ! d) continue;

							hExt2N[ext] = d.cn;
						}
					}
					const s2 = JSON.stringify(hPath);
					await outputFile(path_enc, await this.#encry.enc(s2));
				}, 500);
				return;
			}

			const dir = this.#REG_DIR.exec(pp);
			if (dir && this.#cfg.oCfg.code[dir[1]!]) {
				await copy(fp, path_enc, {overwrite: true});
				//.catch((e: any)=> console.error(`enc cp2 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラーとなるだけなので
				return;
			}

			const u2 = path_enc.replace(/\.[^.]+$/, '.bin');
			await ensureFile(u2);	// touch
			const ws = createWriteStream(u2)
			.on('error', e=> {ws.destroy(); console.error(`enc ws=%o`, e);});

			const rs = createReadStream(fp)
			.on('error', e=> console.error(`enc rs=%o`, e));

			const tr = new EncryptorTransform(this.#encry, fp);
			rs.pipe(tr).pipe(ws);
		}
		catch (e) {
			console.error(`enc other ${
				e instanceof Error ?e.message :''
			} src:${fp}`);
		}
	}
		#tiDelayEnc: NodeJS.Timeout | undefined = undefined;
		readonly #REG_DIR	= /(^.+)\//;


	readonly	#REG_PLGADDTAG	= /(?<=\.\s*addTag\s*\(\s*)(["'])(.+?)\1/g;
	#hDefPlg	: {[def_nm: string]: PluginDef}	= {};
	async #updPlugin(build = true) {
		const pathPlg = `${this.#PATH_WS}/${this.#FLD_SRC}/plugin/`;
		if (! existsSync(pathPlg)) {
			await mkdirs(pathPlg);
			this.#build();
			return;
		}

		const h4json	: {[def_nm: string]: number}	= {};
		this.#hDefPlg = {};
		foldProc(pathPlg, ()=> {}, async nm=> {
			h4json[nm] = 0;

			let path = `${pathPlg}${nm}/index.`;
			if (existsSync(path +'js')) path += 'js'; else
			if (existsSync(path +'ts')) path += 'ts'; else return;

			const txt = await readFile(path, 'utf8');
			let a;
			// 全ループリセットかかるので不要	.lastIndex = 0;	// /gなので必要
			while (a = this.#REG_PLGADDTAG.exec(txt)) {
				const nm = a[2]!;
				const len_nm = nm.length;
				const idx_nm = this.#REG_PLGADDTAG.lastIndex -len_nm -1;

				let line = 0;
				let j = idx_nm;
				while ((j = txt.lastIndexOf('\n', j -1)) >= 0) ++line;

				const col = idx_nm -txt.lastIndexOf('\n', idx_nm) -1;
				this.#hDefPlg[nm] = {
					uri	: path,
					sl	: line,
					sc	: col,
					el	: line,
					ec	: col +len_nm,
				};
			}
		});
		this.#sendRequest2LSP('def_plg.upd', this.#hDefPlg);

		const sPlgIdx = pathPlg.slice(0, -1);
		await outputJson(sPlgIdx +'.json', h4json);
		if (build) try {
			this.#build();
		} catch (e) {console.error(`Project updPlugin ${e}`)}

		// 旧式プラグインインデックスを更新
		if (existsSync(sPlgIdx +'.js')) {
			await remove(sPlgIdx +'.js');

			for (const url of this.#aRepl) replaceFile(
				this.#PATH_WS +'/'+ url,
				/'\.\/plugin\.js';/,
				`'./plugin.json';`,
			);
		}
	}
	#build = ()=> {
		if (! ActivityBar.aReady[eTreeEnv.NPM]) return;

		this.#build = ()=> {};	// onceにする
		// 起動時にビルドが走るのはこれ
		// 終了イベントは Project.ts の tasks.onDidEndTaskProcess で
		let cmd = `cd "${this.#PATH_WS}"`;
		if (! existsSync(this.#PATH_WS +'/node_modules')) {
			cmd += ` ${statBreak} npm i`;		// 自動で「npm i」
			removeSync(this.#PATH_WS +'/package-lock.json');
		}
		const type = PRE_TASK_TYPE +'Sys';
		const name = '自動ビルド';
		const t = new Task(
			{type},			// タスクの一意性
			this.wsFld!,
			name,			// UIに表示
			'SKYNovel',		// source
			new ShellExecution(cmd),
		);

		this.enableBtn(false);
		window.withProgress({
			location	: ProgressLocation.Notification,
			title		: name,
			cancellable	: false
		}, _prg=> new Promise<void>(async done=> {
			let fnc = (e: TaskProcessEndEvent)=> {
				if (e.execution.task.definition.type !== type) return;
				fnc = ()=> {};
				this.enableBtn(true);
				done();
			};
			tasks.onDidEndTaskProcess(fnc);

			try {
				await tasks.executeTask(t);
			} catch (e) {console.error('Project build() e:%o', e)}
				// この resolve は「executeTask()できたかどうか」だけで、
				// Task終了を待って呼んでくれるわけではない
		}));
	}


	#mExt2ToPath	= new Map<SEARCH_PATH_ARG_EXT, string[]>;
	#getコピー先候補(ext: string): string[] {
		let aコピー先候補: string[] = [];
		for (const [spae, a] of this.#mExt2ToPath.entries()) {
			if (! new RegExp(spae).test(ext)) continue;

			aコピー先候補 = a;
			break;
		}

		return aコピー先候補;
	}

	//MARK: ドロップ処理
	async	drop(td: TextDocument, pos: Position, aUri: Uri[]): Promise<DocumentDropEdit | null | undefined> {
		// td.fileName	=c:\Users\[略]]\doc\prj\mat\main.sn=
		// td.uri.path	=/c:/Users/[略]/doc/prj/mat/main.sn=
		const aFpNew: string[] = [];
		for (const uri of aUri) {
			const {path, scheme} = uri;
			const ext = extname(path).slice(1);
			const fp = v2fp(path);
//console.log(`fn:Project.ts drop scheme:${scheme} fp:${fp}: uri:${uri.toString()}: path=${path}= fsPath-${uri.fsPath}-`);

			let fpNew = fp;
			const fn_ext = '/'+ basename(fp);
			const aコピー先候補 = this.#getコピー先候補(ext);
			switch (scheme) {
			case 'file':
				if (statSync(path).isDirectory()) {	// フォルダドロップ
					if (! fp.startsWith(this.#PATH_PRJ)) return null;	// プロジェクト外なら鼻も引っ掛けない

					if (fp === this.#PATH_PRJ +'prj.json') this.#ps.open()
					else this.#ps.pnlWVFolder.open(uri);
				}
				if (! ext) continue;	// 拡張子なしは無視（.gitignore 系も）

				if (fp.startsWith(this.#PATH_PRJ)) break;	// プロジェクト内からのドラッグ

				// プロジェクト外からのドラッグ
				// ファイルコピー
				switch (aコピー先候補.length) {
					case 0:		// 候補もなし、スクリプトと同じフォルダにコピー
						const tp = td.uri.path;
						fpNew = v2fp(
							tp.slice(0, -basename(tp).length) + basename(fp)
						);
						break;

					case 1:		// 選ぶまでもなく確定
						fpNew = this.#PATH_PRJ + aコピー先候補[0] + fn_ext;
						break;

					default:{
						aコピー先候補.push('キャンセル');
						const ans = await window.showInformationMessage(
							basename(fp) +' のコピー先を選んでください',
							...aコピー先候補,
						);
						if (ans === 'キャンセル') return null;

						fpNew = this.#PATH_PRJ + ans + fn_ext;
					}	break;
				}
				await copyFile(fp, fpNew);
				break;

			case 'http':
			case 'https':{	// webブラウザ画像やURLリンクの場合はダウンロード
				if (! ext) continue;	// 拡張子なしは無視（.gitignore 系も）

				// webviewからのドラッグ
				if (this.#ps.pnlWVFolder.isOpend(path)) break;// from WV

				const uriDL = uri.toString();
//console.log(`fn:Project.ts urlDL=${uriDL}=`);
				const res = await fetch(uriDL);
				if (! res.ok) {
					window.showErrorMessage(`ダウンロードに失敗しました。手動でローカルにコピーして下さい uri=${uriDL}`);
					return null;
				}

				let ppNew = '';
				switch (aコピー先候補.length) {
					case 0:		// 候補もなし
						return null;	// サポートしないものとする

				//	case 1:		// 選ぶまでもなく確定
					default:	// 決め打ち
						ppNew = aコピー先候補[0] + fn_ext;
						break;
				}
				fpNew = this.#PATH_PRJ + ppNew;
				await writeFile(fpNew, new Uint8Array(await res.arrayBuffer()));

				window.showInformationMessage(`素材をダウンロードしました。 path=${ppNew}`);
				// サイドバーに表示
				await commands.executeCommand('revealInExplorer', Uri.parse(this.#vpPrj + ppNew));

			}	break;

			default:	return null;
			}

			aFpNew.push(fpNew);
		}

		// スニペット挿入・値部を書き換え
		if (aFpNew.length === 0) return null;
		const fp = aFpNew[0]!;
		const ext = extname(fp).slice(1);
		const fn = getFn(fp);
		for (const [spae, snip] of this.#mExt2Snip.entries()) {
			if (! new RegExp(spae).test(ext)) continue;

			// 属性値にドロップした場合は、値部を書き換える
			const gw = this.#getWordRangeAtPosition(td, pos, this.#REG_FIELD);
			if (gw) {
				const {range, nm} = gw;
				if (nm) return {insertText: '', additionalEdit: this.#createWsEd_repVal(td.uri, range, nm, fn)};
			}

			// スニペット挿入
			const sni = snip.replace('...', fn)
			.replaceAll(/\${\d\|([^,]+)\|}/g, '$1');
				// https://regex101.com/r/QAiATp/1
//console.log(`fn:Project.ts sni=${sni}=`);
			return {insertText: new SnippetString(sni)};
		}

		return null;
	}
		#mExt2Snip = new Map<SEARCH_PATH_ARG_EXT, string>;

		readonly	#REG_FIELD	= /(?<=\s)[^\s=[\]]+(?:=(?:[^"'#\s;\]]+|(["'#]).*?\1)?)?/g;	// https://regex101.com/r/1m4Hgp/1 7 matches 95 steps, 0.4ms
		#createWsEd_repVal(uri: Uri, range: Range, nm: string, val: string) {
			const we = new WorkspaceEdit;
			const v2 = /[\s=]/.test(val)
				? (/['#]/.test(val) ? `"${val}"` : `'${val}'`)
				: val;
			we.replace(uri, range, nm + '=' + v2);
			return we;
		}

		#getWordRangeAtPosition(td: TextDocument, {line, character}: Position, reg: RegExp): {hit: string, range: Range, nm: string, val: string} {
//			if (reg.flags.indexOf('g') === -1) console.log(`fn:LspWs.ts #getWordRangeAtPosition gフラグが必要です`);// TO DO: あとでコメントアウト

			const s = td.getText(new Range(line, 0, line, 9999));
			let e;
			reg.lastIndex = 0;	// /gなので必要
			while (e = reg.exec(s)) {
				const [hit] = e, b = reg.lastIndex -hit.length;

				const [nm='', ...v] = hit.split('=');
				const val = v.join('=');

				if (b <= character && character <= reg.lastIndex) return {
					hit,
					range: new Range(line, b, line, reg.lastIndex),
					nm, val,
				};
			}
			return {hit: '', range: new Range(0, 0, 0, 0), nm: '', val: ''};
		}

}
