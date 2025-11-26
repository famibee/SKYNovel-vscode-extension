/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {FULL_PATH, FULL_SCH_PATH, IDecryptInfo, T_PKG_JSON} from './CmnLib';
import {treeProc, foldProc, replaceFile, is_win, docsel, getFn, vsc2fp, REG_SCRIPT, hDiagL2s, uri2path} from './CmnLib';
import {PrjSetting} from './PrjSetting';
import {Encryptor, ab2hexStr, encStrBase64} from './Encryptor';
import {ActivityBar} from './ActivityBar';
import {EncryptorTransform} from './EncryptorTransform';
import type {TREEITEM_CFG, PrjBtnName, TASK_TYPE} from './PrjTreeItem';
import {PrjTreeItem, statBreak, eDevTreeView} from './PrjTreeItem';
import type {QuickPickItemEx} from './WorkSpaces';
import {aPickItems, openURL, PRE_TASK_TYPE} from './WorkSpaces';
import {Config, SysExtension} from './Config';
import {SEARCH_PATH_ARG_EXT, type T_Fn2Path} from './ConfigBase';
import type {T_PP2SNSTR, T_ALL_L2S, T_H_PLGDEF, T_H_ADIAG_L2S, T_S2L_hover_res, T_ALL_S2L} from '../server/src/LspWs';
import {FLD_PRJ_BASE, PrjCmn} from './PrjCmn';
import {WfbOptPic} from './batch/WfbOptPic';
import {WfbOptSnd} from './batch/WfbOptSnd';
import {WfbOptFont} from './batch/WfbOptFont';
import {HDiff} from './HDiff';

import {imageSizeFromFile} from 'image-size/fromFile';
import {webcrypto, randomUUID, getRandomValues} from 'crypto';	// 後ろ二つはここでないとerr
const {subtle} = webcrypto;	// https://github.com/nodejs/node/blob/dae283d96fd31ad0f30840a7e55ac97294f505ac/doc/api/webcrypto.md
import * as archiver from 'archiver';
import {execSync} from 'child_process';
import ncu from 'npm-check-updates'
import AsyncReplace from 'str-async-replace';
import Encoding from 'encoding-japanese';

import type {DebugSession, Disposable, DocumentDropEdit, EventEmitter, ExtensionContext, Position, ProviderResult, TaskProcessEndEvent,  TextDocument, TreeItem, WorkspaceFolder} from 'vscode';
import {commands, debug, env, EvaluatableExpression, Hover, languages, MarkdownString, ProgressLocation, QuickPickItemKind, Range, RelativePattern, ShellExecution, SnippetString, Task, tasks, ThemeIcon, Uri, window, workspace, WorkspaceEdit} from 'vscode';
import {basename, dirname, extname} from 'node:path';
import {glob, readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createReadStream, createWriteStream, existsSync, outputFile, outputJson, readJsonSync, remove, removeSync, copy, readJson, ensureFile, copyFile, statSync, writeFile, unlink, move, mkdirs, moveSync} from 'fs-extra';


type BtnEnable = '_off'|'Stop'|'';

export	const	FLD_CRYPT_DOC	= 'doc_crypto';

export	const	REG_NEEDCRYPTO		= /\.(ss?n|json|html?|jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv|html?)$/;
export	const	REG_FULLCRYPTO		= /\.(ss?n|json|html?)$/;


export type T_reqPrj2LSP = (o: T_ALL_L2S)=> Promise<void>;

const	mExt2aFld = new Map<SEARCH_PATH_ARG_EXT, string[]>([
	[SEARCH_PATH_ARG_EXT.SP_GSM,	['bg','image']],
	[SEARCH_PATH_ARG_EXT.SOUND,		['music','sound']],
	[SEARCH_PATH_ARG_EXT.FONT,		['script']],
	[SEARCH_PATH_ARG_EXT.SCRIPT,	['script']],
]);


export type T_LocalSNVer = {
	ver_sn		: string;
	is_new_tmp	: boolean;
	ver_temp	: string;
}


export class Project {
	readonly	#pc;

	readonly	#PATH_CRYPT;
	#isCryptoMode	= false;

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
			// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
			ti.contextValue += ' ';
			this.emPrjTD.fire(ti);
		}	// 値を壊してボタン消去
	}

	#haDiagFont		: T_H_ADIAG_L2S	= {};
	#haDiagChrCd	: T_H_ADIAG_L2S	= {};

	readonly	#cfg;
				#haDiagFn	: T_H_ADIAG_L2S	= {};

	readonly	#optPic;
	readonly	#optSnd;
	readonly	#optFont;


	//MARK: コンストラクタ
	constructor(
		private readonly ctx	: ExtensionContext,
		private readonly actBar	: ActivityBar,
		private readonly wsFld	: WorkspaceFolder,
				readonly aTiRoot: TreeItem[],
		private readonly emPrjTD: EventEmitter<TreeItem | undefined>,
		private readonly hOnEndTask	: Map<TASK_TYPE, (e: TaskProcessEndEvent)=> void>,
		private	readonly reqPrj2LSP	: T_reqPrj2LSP,
	) {
// console.log(`020 fn:Project.ts construct #PATH_WS=${this.#pc.PATH_WS}=`);
		this.#pc = new PrjCmn(
			ctx,
			wsFld,
			this.hOnEndTask,
		);

		// 暗号化処理
		this.#PATH_CRYPT = `${this.#pc.PATH_WS}/${FLD_CRYPT_DOC}/prj/`;
		{	// v4.25.2 暗号化フォルダ移動
			const OLD_FLD_DOC_CRYPTO = `${this.#pc.PATH_WS}/doc/crypto_prj/`;
			if (existsSync(OLD_FLD_DOC_CRYPTO)) {
				moveSync(OLD_FLD_DOC_CRYPTO, this.#PATH_CRYPT);
			}
			const gi = `${this.#pc.PATH_WS}/.gitignore`;
			if (existsSync(gi)) replaceFile(
				gi,
				/\/doc\/crypto_prj\n/,
				`/${FLD_CRYPT_DOC}\n`,
				false,
			);
			replaceFile(
				this.#pc.PATH_WS +'/package.json',
				/"doc\/crypto_prj\/",/,
				`"${FLD_CRYPT_DOC}/prj/",`,
				false,
			);
		}
		this.#isCryptoMode = existsSync(this.#PATH_CRYPT);
		const fnPass = this.#pc.PATH_WS +'/pass.json';
		const exists_pass = existsSync(fnPass);
		this.#encry = new Encryptor(exists_pass
			? <IDecryptInfo>readJsonSync(fnPass, {throws: false})
			: {
				pass	: randomUUID(),
				salt	: ab2hexStr(getRandomValues(new Uint32Array(128 / 8)).buffer),
				iv		: ab2hexStr(getRandomValues(new Uint32Array(128 / 8)).buffer),
				keySize	: 512 / 32,
				ite		: 500 + Math.floor((new Date).getTime() % 300),
				stk		: ab2hexStr(getRandomValues(new Uint32Array(128 / 8)).buffer),
			}, subtle);
		const is_new_tmp = this.#pc.IS_NEW_TMP;
		if (! exists_pass) void outputFile(fnPass, this.#encry.strHPass);
		this.#aRepl = is_new_tmp
		? [
			`${this.#pc.FLD_SRC}/web.ts`,
			`${this.#pc.FLD_SRC}/renderer/renderer.ts`,
		]
		: [
			`${this.#pc.FLD_SRC}/app4webpack.js`,
			`${this.#pc.FLD_SRC}/web4webpack.js`,
		];

		// プロジェクト管理系
		const sr = new SysExtension({cur: this.#pc.PATH_PRJ, crypto: this.#isCryptoMode, dip: ''});
		this.#cfg = new Config(sr, this.#encry);

		const pti = PrjTreeItem.create(
			ctx,
			wsFld,
			(ti, btn_nm, cfg)=> {void this.#onBtn(ti, btn_nm, cfg)},
			is_new_tmp,
		);
		aTiRoot.push(pti);

		this.#ds.push(this.#ps = new PrjSetting(
			this.#pc,
			this.#cfg,
			title=> {
				pti.label = title;
				emPrjTD.fire(pti);
			},
			this.reqPrj2LSP,
			this.#optPic	= new WfbOptPic(this.#pc),
			this.#optSnd	= new WfbOptSnd(this.#pc),
			this.#optFont	= new WfbOptFont(this.#pc),
		));

		// ファイル変更チェック・暗号化ファイル名辞書
		this.#diff = new HDiff(
			`${this.#pc.PATH_WS}/${this.#pc.FLD_SRC}/diff.json`,
			this.#pc.FLD_SRC,
			this.#PATH_CRYPT,
			this.#encry,
		);

		const updPathJson = async ()=> {
			// path.json 更新（暗号化もここ「のみ」で）
// console.log(`fn:Project.ts #basePathJson`);
			this.#haDiagFn = {};
			await this.#cfg.loadEx(uri=> this.#encFile(uri), this.#haDiagFn);

			// ドロップ時コピー先候補
			for (const [spae, aFld] of mExt2aFld) this.#mExt2ToPath.set(
				spae,
				aFld.filter(fld_nm=> existsSync(this.#pc.PATH_WS +`/doc/prj/${fld_nm}/`)),
			);

			// スクリプト判定起動
			await this.reqPrj2LSP({cmd: 'need_go'});
		};
		this.#pc.init(
			updPathJson,
			uri=> this.#encIfNeeded(uri),
			this.#diff,
			()=> this.#isCryptoMode,
			this.#ps,
		);
		this.#optPic.initOnce(
			updPathJson,
			uri=> this.#encIfNeeded(uri),
		);

		const aTi = pti.children;
		const aC = (<PrjTreeItem>aTi.at(-1)).children;
		this.#aTiFlat = [...aTi.slice(0, -1), ...aC];
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const tiSnUpd = aTi[eDevTreeView.SnUpd]!;
		this.getLocalSNVer = ()=> {
			const o = this.#ps.getLocalSNVer();
			tiSnUpd.description = o.ver_sn
				? o.ver_sn.startsWith('ile:') || o.ver_sn.startsWith('./')
				? '（相対パス参照中）'
				: `-- ${o.ver_sn}${o.ver_temp ?` - ${o.ver_temp}` :''}`
				: '取得できません';
			emPrjTD.fire(tiSnUpd);
			return o;
		};
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const tiCrypto = aTi[eDevTreeView.Crypto]!;
		this.#dspCryptoMode = ()=> {
			tiCrypto.description = `-- ${this.#isCryptoMode ?'する' :'しない'}`;
			emPrjTD.fire(tiCrypto);
		};

		void this.#encry.init()
		.then(()=> Promise.allSettled([
			async ()=> {
				await this.#initCrypto();
				this.#dspCryptoMode();

				// prj.json に既にないディレクトリのcodeがあれば削除
				foldProc(this.#pc.PATH_PRJ, ()=> { /* empty */ }, nm=> {
					if (nm in this.#cfg.oCfg.code) return;
					this.#cfg.oCfg.code[nm] = false;
				});
			},

			async ()=> {
				// 旧テンプレ置換
				if (! is_new_tmp) {
					// == 以下は updPrjFromTmp() で全置き換えされるのでそのままとする
					// core/webpack.config.js
					// 旧ビルドによる中間ファイルを削除
					for await (const fn of glob(this.#pc.PATH_WS +'/doc/{app/app,web}.vendors-node_modules_*.js')) await unlink(fn);

					// == 以下は 置き換えない系（せいぜい値持ち越し）
					// package.json
					replaceFile(	// テンプレ更新のために必ず更新
						this.#pc.PATH_WS +'/package.json',
						/github.com:famibee\/SKYNovel_/,
						'github.com:famibee/tmp_cjs_',
						false,
					);

					replaceFile(	// テンプレ更新しなくても最低限動作するように
						this.#pc.PATH_WS +'/package.json',
						/ && npm i && npm run webpack:dev/,
						' && npm i",\n\t\t"postinstall": "npm run webpack:dev',
						false,
					);
				}
				// v4.21.4 バッチファイル位置移動
				for await (const fn of glob(this.#pc.PATH_WS +'/build/{cnv_*,cut_round,subset_font}.{js,json}')) {
					const dest = fn.replace('/build/', `/${this.#pc.FLD_SRC}/batch/`);
					await move(fn, dest);
				}
				// v4.21.4 画像・音声最適化処理の元ファイル退避先フォルダ移動
				const OLD_FLD_PRJ_BASE = `${this.#pc.PATH_WS}/doc/${FLD_PRJ_BASE}/`;
				if (existsSync(OLD_FLD_PRJ_BASE)) await move(OLD_FLD_PRJ_BASE, this.#pc.PATH_PRJ_BASE);

				// v4.21.2 パス通し設定を settings.json に追記
				const pathStgJS = this.#pc.PATH_WS +'/.vscode/settings.json';
				if (existsSync(pathStgJS)) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const o = await readJson(pathStgJS, {encoding: 'utf8'});
					if (! ('terminal.integrated.env.windows' in o)) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						o['terminal.integrated.env.windows'] = {
							'PATH': '${workspaceRoot}\\node_modules\\.bin;${env:PATH}'
						};
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						o['terminal.integrated.env.osx'] = {
							'PATH': '${workspaceRoot}/node_modules/.bin:${env:PATH}'
						};
						await writeFile(pathStgJS, JSON.stringify(o, null, '\t'));
					}
				}
				else await copyFile(ctx.extensionPath +'/res/settings.json', pathStgJS);
			},

			async ()=> {
				const firstInit = ! existsSync(this.#pc.PATH_WS +'/node_modules');
				await this.#updPlugin(firstInit);	// updPlugin で goAll() が走る
				if (firstInit) {
					 if (ActivityBar.getReady('NPM')) window.showInformationMessage('初期化中です。ターミナルの処理が終わって止まるまでしばらくお待ち下さい。', {modal: true});
					//  if (ActivityBar.aReady[eTreeEnv.NPM]) window.showInformationMessage('初期化中です。ターミナルの処理が終わって止まるまでしばらくお待ち下さい。', {modal: true});
				}
				else await actBar.chkLastSNVer([this.getLocalSNVer()]);
			},

			// {jpg,jpeg,png} -> webp
			()=> this.#optPic.init(),

			// {mp3,wav} -> {m4a,aac,ogg}
			()=> this.#optSnd.init(),

			// {sn, htm ...} -> {woff2,woff,otf,ttf}
			()=> this.#optFont.init(
				async fp=> {
					if (! /\.(ss?n|json)$/.test(fp)) return;

					// sn,json は ASCII と UTF8 以外の文字コードをエラーに
					this.#chkChrCd(fp);
					await this.reqPrj2LSP({cmd: 'upd_diag', haDiag: this.#haDiag});
				},
				async fp=> {
					if (! /\.(ss?n|json)$/.test(fp)) return false;

					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete this.#haDiagChrCd[fp];
					await this.reqPrj2LSP({cmd: 'upd_diag', haDiag: this.#haDiag});

					return true;
				},
				()=> this.reqPrj2LSP({cmd: 'need_go'}),
			),

			()=> this.#diff.init(),

			()=> Promise.try(()=> this.#ds.push(
				// prj.json 変更時に暗号化処理起動
				workspace.createFileSystemWatcher(
					new RelativePattern(wsFld, 'doc/prj/prj.json')
				).onDidChange(uri=> this.#encIfNeeded(uri)),

				debug.onDidTerminateDebugSession(_=> this.#onDidTermDbgSS()),
				debug.onDidStartDebugSession(ds=> this.#aDbgSS.push(ds)),

				// デバッグ中のみ有効なホバー
				languages.registerEvaluatableExpressionProvider(docsel, {provideEvaluatableExpression(doc, pos): ProviderResult<EvaluatableExpression> {
					const r = doc.getWordRangeAtPosition(pos, /;.+|[[*]?[\d\w.]+=?/);	// https://regex101.com/r/G77XB6/3 20 match, 188 step(~1ms)
					if (! r) throw new Error('No word here.');

					const txt = doc.getText(r);
					const hc = txt.at(0);
					if (hc === '[' || hc === '*' || hc === ';'
					|| txt.endsWith('=')) throw new Error('No word here.');
					return new EvaluatableExpression(r, txt);
				}}),
			)),
		].map(p=> p()))).then(async ()=> {
			await this.#optPic.init2th();

// console.log('Seq_ 3 fn:Project.ts constructor.ready');
			await this.reqPrj2LSP({cmd: 'ready'});	// src/Project.ts 準備完了
		});
	}

	readonly	getLocalSNVer	: ()=> T_LocalSNVer;
				#aDbgSS			: DebugSession[]	= [];
	#onDidTermDbgSS = ()=> { /* empty */ }

	//MARK: デストラクタ
	// DisposableStack is not implemented
//	[Symbol.dispose]() {this.#ds.dispose()}
	dispose() {
		for (const d of this.#ds) d.dispose();
		void this.#termDbgSS();
		this.#pc.hTaskExe.forEach(v=> v.terminate());
		this.#pc.hTaskExe.clear();
	}


	#termDbgSS() {
		this.#pc.hTaskExe.get('TaskWeb')?.terminate();
		this.#pc.hTaskExe.delete('TaskWeb');
		this.#pc.hTaskExe.get('TaskApp')?.terminate();
		this.#pc.hTaskExe.delete('TaskApp');

		const a = this.#aDbgSS.map(ds=> debug.stopDebugging(ds));
		this.#aDbgSS = [];
		return Promise.allSettled(a);
	}


	//MARK: LSPから受信
	onRequest(o: T_ALL_S2L) {
// console.log(`Seq_21 ⬇受 cmd:${o.cmd} fn:Project.ts onRequest o:%o`, o);	//NOTE: S2L通信要点
		switch (o.cmd) {
			case 'go':{	// #noticeGo() から。何度も来る
				//NOTE: #haDiagFont はここで毎回更新すべきか、フォント最適化スイッチをさわったときか、本文にフォントファイルに含まれない文字が増えたときか、減ったときは、など議論がある
				// ひとまず処理がさほど重くなさそうなので毎回やる
				this.#haDiagFont = this.#optFont.updDiag(o.InfFont);

				// sn,json は ASCII と UTF8 以外の文字コードをエラーに
				const pp2s: T_PP2SNSTR = {};
				this.#haDiagChrCd = {};
				treeProc(this.#pc.PATH_PRJ, fp=> {
					if (/\.(ss?n|json)$/.test(fp)) this.#chkChrCd(fp, pp2s);
				});

				void this.reqPrj2LSP({cmd: 'go.res',
					pp2s,
					hDefPlg	: this.#hDefPlg,
					haDiag	: this.#haDiag,
				});
			}	break;

			case 'analyze_inf':{	// #scanEnd() から
				this.#aPickItems = [
					...aPickItems,

					{kind: QuickPickItemKind.Separator, label: ''},

					...o.aQuickPickMac
					.map(({label, description, uri})=> ({
						label, description, uri: Uri.parse(uri),
					})),

					{kind: QuickPickItemKind.Separator, label: ''},

					...o.aQuickPickPlg
					.map(({label, description, uri})=> ({
						label, description, uri: Uri.parse(uri),
					})),
				];

				this.#mExt2Snip = new Map(o.aExt2Snip);

				this.#haDiagFont = this.#optFont.updDiag(o.InfFont);
			}	break;

			case 'hover.res':
				this.#hFp2AHoverProc[o.fp]?.shift()?.(o);	break;
		}
	}
	//MARK: 文字コードチェック（オマケでLSPに渡すファイルデータを連想配列に）
	#chkChrCd(fp: FULL_SCH_PATH, pp2s?: T_PP2SNSTR) {
		const td = workspace.textDocuments.find(v=> vsc2fp(v.uri.path) === fp);
		const pp = this.#pc.fp2pp(fp);
		const str = REG_SCRIPT.test(fp) ?td?.getText() :undefined;
		let cc: string;
		if (str) {		// 「開いた sn」のみが来る？
			if (pp2s) pp2s[pp] = str;
			cc = td?.encoding ?? '';	// Encoding で UNICODE でも詳細が取れる
		}
		else {
			const buf = readFileSync(fp);
			if (pp2s) pp2s[pp] = buf.toString('utf-8');
			cc = <string>Encoding.detect(buf);
		}
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		if (/(UTF8|ASCII)$/i.test(cc)) {delete this.#haDiagChrCd[fp]; return}
			// td?.encoding が小文字「utf8」なので

		// 同じ警告は削除
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const {mes, sev} = hDiagL2s.文字コード異常!;
		this.#haDiagChrCd[fp] = [{mes: mes.replace('$', cc), sev}];
	}
		get #haDiag() {return {
			...this.#haDiagFn,
			...this.#haDiagFont,
			...this.#haDiagChrCd,
		}}

	//MARK: ホバーイベント始動
	//	この後 cmd:hover -> LSP -> cmd:hover.res）
	#hFp2AHoverProc: {[fp: FULL_PATH]: ((o: T_S2L_hover_res)=> void)[]} = {};
	provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
		const fp = vsc2fp(doc.uri.path);
		const {promise, resolve, reject} = Promise.withResolvers<Hover>();
		(this.#hFp2AHoverProc[fp] ??= []).push(({value})=> {
			const a = value.split(/(?=\n---\n)/);
// console.log(`fn:Project.ts hover.res 受信 len:${String(a.length)} o:${value}:`);
			if (a.length !== 3) {
				const ms = new MarkdownString(value);
				ms.isTrusted = true;
			//	ms.supportHtml = true;
				resolve(new Hover(ms));
				return;
			}

			// 中央部分のみ置換。SQLジャンクション的なものの対策
			const [args='', ...detail] = a;
			new AsyncReplace(detail.join('')).replaceAll(
				/<!-- ({.+?}) -->/g,
				async (e1: string)=> {
const {name, val} = <{name: string, val: string}>JSON.parse(e1.slice(5, -4));
const ppImg = this.#cfg.searchPath(val, SEARCH_PATH_ARG_EXT.SP_GSM);
const vfpImg = `${this.#pc.URI_WS}/doc/prj/${ppImg}`;
// console.log(`fn:Project.ts   vfpImg=${vfpImg}`);

const srcEx = `${vfpImg}|width=${String(this.#whThumbnail)}|height=${String(this.#whThumbnail)}`;
// console.log(`fn:Project.ts   srcEx =${srcEx}`);

const {width, height} = await imageSizeFromFile(uri2path(vfpImg));
// console.log(`fn:Project.ts   w:${String(width)} h:${String(height)}`);

const exImg = encodeURIComponent(JSON.stringify([Uri.file(vfpImg)]));
	// これが file で下が parse なのは動作と以下資料から
	// visual studio code - How to open a file externally using built-in commands? - Stack Overflow https://stackoverflow.com/questions/72194573/how-to-open-a-file-externally-using-built-in-commands
	// Opening folders in Visual Studio Code from an extension | Elio Struyf https://www.eliostruyf.com/opening-folders-visual-studio-code-extension/

return `- ${name} = ${val} (${String(width)}x${String(height)}) [ファイルを見る](${vfpImg} "ファイルを見る") [サイドバーに表示](${
	String(Uri.parse(`command:revealInExplorer?${exImg}`))
} "サイドバーに表示")
[フォルダを開く](${
	String(Uri.parse(`command:revealFileInOS?${exImg}`))
} "フォルダを開く")  \n`
//	+ `<img src="${vfpImg}?t=${timestamp}" title="${val}" width="${this.#whThumbnail}" height="${this.#whThumbnail *height /width}">`;
	// TODO: 画像ファイルを更新してもサムネイルが更新されない
//	+ `![${val}](${srcEx}?t=${timestamp} "${val}")`;
+ `![${val}](${srcEx} "${val}")`;

				}
			)
			.then(ar=> {
				const ms = new MarkdownString(args + ar.toString());
				ms.isTrusted = true;
			//	ms.supportHtml = true;
// console.log(`fn:Project.ts Hover 最終文字列=${ms.value}`);
				resolve(new Hover(ms));
			})
			.catch((e: unknown)=> {console.error(e); reject()});
		});

		void this.reqPrj2LSP({cmd: 'hover', fp, pos});
			// 【file:///Users/...】 LSPの doc 特定で使う

		return promise;
	}
		readonly	#whThumbnail = 200;


	#aPickItems	: QuickPickItemEx[] = [];
	openReferencePallet() {
		window.showQuickPick<QuickPickItemEx>(this.#aPickItems, {
			placeHolder			: 'どのリファレンスを開きますか?',
			matchOnDescription	: true,
		})
		.then(q=> {if (q?.uri) openURL(q.uri, this.#pc.PATH_WS);});
	}


	//MARK: ビューオープン
	opView(uri: Uri) {this.#ps.pnlWVFolder.open(uri)}


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
		if (! ActivityBar.getReady('NPM')) return;

		// 値を壊してボタン消去など
		const aBtnEnable = this.#hPush2BtnEnable.get(btn_nm)
		?? ['_off', '_off', '_off', '_off', '_off', '_off',
			'_off', '_off', '_off', '_off', '_off', '_off'];
		this.#aTiFlat.forEach((ti, i)=> {
			// eslint-disable-next-line @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-non-null-assertion
			ti.contextValue += aBtnEnable[i]!;
			this.emPrjTD.fire(ti);
		});

		if (btn_nm === 'TaskWebStop' || btn_nm === 'TaskAppStop') {
			await this.#onBtn_sub(ti, btn_nm, cfg, ()=> { /* empty */ });
			return;
		}
		await window.withProgress({
			location	: ProgressLocation.Notification,
			title		: typeof ti.label === 'string'
						? ti.label :ti.label?.label,
			cancellable	: false,
		}, prg=> new Promise(done=> {
			const iconPath = ti.iconPath;
			ti.iconPath = new ThemeIcon('sync~spin');

			void this.#onBtn_sub(ti, btn_nm, cfg, (timeout = 4000)=> {
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
		let cmd = `cd "${this.#pc.PATH_WS}" ${statBreak} `;
		if (! existsSync(this.#pc.PATH_WS +'/node_modules')) {
			cmd += `npm i ${statBreak} `;	// 自動で「npm i」
			await remove(this.#pc.PATH_WS +'/package-lock.json');
		}

		// メイン処理
		if (cfg.npm) cmd += cfg.npm;
		switch (btn_nm) {	// タスク前処理
			case 'SnUpd':
				try {
					await this.#termDbgSS();
					await this.actBar.updPrjFromTmp(this.#pc.PATH_WS);
					await ncu({	// ncu -u --target minor
						packageFile: this.#pc.PATH_WS +'/package.json',
						// Defaults:
						// jsonUpgraded: true,
						// silent: true,
						upgrade: true,
						target: 'minor',
					});
					this.getLocalSNVer();
					await this.#onBtn_sub(ti, 'SnUpd_waited', cfg, done);
				} catch (e) {
					console.error('fn:Project.ts onBtn_sub SnUpd e:%o', e);
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
					console.error('fn:Project.ts onBtn_sub Crypto e:%o', e);
				}
				return;
			case 'Crypto_waited':	break;	// Promise待ち後

			case 'TaskWebDbg':
			case 'TaskAppDbg':
				await this.#termDbgSS();
				this.#onDidTermDbgSS = ()=> {
					this.#onDidTermDbgSS = ()=> { /* empty */ };
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

			case 'PackFreem':{
				await this.#termDbgSS();

				let find_ng = false;
				treeProc(this.#pc.PATH_PRJ, fp=> {
					if (find_ng || ! fp.endsWith('.svg')) return;

					find_ng = true;
					window.showErrorMessage(
						'ふりーむ！では svg ファイル使用禁止です。png などに置き換えて下さい', 'フォルダを開く', 'Online Converter',
					)
					.then(async ans=> {switch (ans) {
						case 'フォルダを開く':
							await env.openExternal(Uri.file(dirname(fp)));	break;
						case 'Online Converter':
							await env.openExternal(Uri.parse('https://cancerberosgx.github.io/demos/svg-png-converter/playground/'));
							break;
					}});
				});
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (find_ng) {done(); return}
			}	break;
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
				await window.showErrorMessage('管理者として開いたPowerShell で実行ポリシーを RemoteSigned などに変更して下さい。\n例）Set-ExecutionPolicy RemoteSigned', {modal: true}, '参考サイトを開く')
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
			case 'PackLinux':
				this.hOnEndTask.set(task_type, ()=> void (async ()=> {
	try {
		// アップデート用ファイル作成
		const oPkg = <T_PKG_JSON>await readJson(this.#pc.PATH_WS +'/package.json', {encoding: 'utf8'});

		const pathPkg = this.#pc.PATH_WS +'/build/package';
		const pathUpd = pathPkg +'/update';
		const fnUcJs = pathUpd +'/_index.json';
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
		if (! mv) throw '[Pack...] .yml に version が見つかりません';
		const ver = mv[1];
//console.log(`fn:Project.ts line:499 ver=${ver}= eq=${oPkg.version == ver}`);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (oUc.version !== ver || oUc.name !== oPkg.name) {
			oUc = {};
			await remove(pathUpd);
			await mkdirs(pathUpd);
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		oUc.version = oPkg.version;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		oUc.name = oPkg.name;

		const mp = /path: (.+)/.exec(sYml);
		if (! mp) throw '[Pack...] .yml に path が見つかりません';
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const path = mp[1]!;

		const ms = /size: (.+)/.exec(sYml);
		if (! ms) throw '[Pack...] .yml に size が見つかりません';
		const size = Number(ms[1] ?? NaN);

		const mc = /sha512: (.+)/.exec(sYml);
		if (! mc) throw '[Pack...] .yml に sha512 が見つかりません';
		const sha512 = mc[1] ?? '';
		const cn = encStrBase64(this.#encry.uuidv5(sha512));

		const ma = /-(\w+)\.\D/.exec(path);
			// https://regex101.com/r/yH7nLk/1	13 steps, 0.0ms
		if (! ma) throw 'path に arch が見つかりません';
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const arch = ma[1]!;

		const key = (isMacBld ?'darwin' :isLinBld ?'linux' :'win32') +'_'+ arch;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		oUc[key] = {path, size, sha512, cn,};
		await outputJson(fnUcJs, oUc, {spaces: '\t'});

		// 古い（暗号化ファイル名）更新ファイルを削除
		const REG_OLD_SAMEKEY = new RegExp('^'+ key +'-');
		foldProc(pathUpd, (fp, nm)=> {
			if (REG_OLD_SAMEKEY.test(nm)) void remove(fp);
		}, ()=> { /* empty */ });

		// （暗号化ファイル名）更新ファイルをコピー
		await copy(pathPkg +'/'+ path, pathUpd +'/'+ key +'-'+ cn);
			// ランダムなファイル名にしたいがkeyは人に分かるようにして欲しい、
			// という相反する要望を充たすような
			// 既存ファイル削除にも便利

		const a = await window.showInformationMessage(
			`${cfg.label} パッケージを生成しました`,
			'出力フォルダを開く',
		);
		if (a) await env.openExternal(Uri.file(pathPkg));
	} catch (e: unknown) {
		console.error(e);
		void window.showErrorMessage(`${cfg.label} パッケージ生成に失敗しました…${String(e)}`);
	}
	done();
				})());
				break;

			case 'PackFreem':	this.hOnEndTask.set(task_type, ()=> {
				const cwd = `${this.#pc.PATH_WS}/${
					this.#isCryptoMode ?FLD_CRYPT_DOC :'doc'
				}/`;
				const arc = archiver.create('zip', {zlib: {level: 9},})
				.append(createReadStream(cwd +'web.htm'), {name: 'index.html'})
				.append(createReadStream(this.#pc.PATH_WS +'/build/include/readme.txt'), {name: 'readme.txt'})
				.glob('web.js', {cwd})
				.glob('web.*.js', {cwd})
				.glob('prj/**/*', {cwd})
				.glob('favicon.ico', {cwd});

				const fn_out = `${basename(this.#pc.PATH_WS)}_1.0freem.zip`;
				const ws = createWriteStream(`${this.#pc.PATH_WS}/build/package/${fn_out}`)
				.on('close', ()=> {
					done();
					window.showInformationMessage(
						`ふりーむ！形式で出力（${fn_out}）しました`,
						'出力フォルダを開く',
					).then(a=> {if (a) env.openExternal(Uri.file(this.#pc.PATH_WS +'/build/package/'))})
				});
				arc.pipe(ws);
				void arc.finalize();	// zip圧縮実行
			});
				break;
		}
		await tasks.executeTask(t)
		.then(
			re=> this.#pc.hTaskExe.set(btn_nm, re),
			(e: unknown)=> console.error(`fn:Project onBtn_sub() rj:${String(e)}`)
		);
	}


	//MARK: 暗号化
	async #initCrypto() {
		const fnc: (fp: string)=> void = this.#isCryptoMode
			? fp=> {
				const uri = Uri.file(fp);
				if (this.#diff.isDiff(uri)) void this.#encFile(uri);
			}
			: fp=> {
				const uri = Uri.file(fp);
				this.#diff.isDiff(uri);
			};
		treeProc(this.#pc.PATH_PRJ, fnc);
		await this.#diff.save();
	}
	//MARK: （必要なら）ファイルを暗号化する
	async #encIfNeeded(uri: Uri) {
		// isDiff() を必ず処理したいので先に
		if (this.#diff.isDiff(uri) && this.#isCryptoMode) await this.#encFile(uri);
		await this.#diff.save();
	}


	readonly	#aRepl;
	async #tglCryptoMode() {
		this.#isCryptoMode = ! this.#isCryptoMode;
		this.#cfg.setCryptoMode(this.#isCryptoMode);
		if (! this.#isCryptoMode) {
			// to 暗号化解除
			await remove(`${this.#pc.PATH_WS}/${FLD_CRYPT_DOC}/`);

			await remove(this.#pc.PATH_PLG_PRE);

			// ビルド関連：SKYNovelが見に行くプロジェクトフォルダ名変更
			for (const url of this.#aRepl) replaceFile(
				this.#pc.PATH_WS +'/'+ url,
				/\(hPlg, {.+?}\);/,
				'(hPlg);',
			);
			// ビルド関連：パッケージするフォルダ名変更
			if (this.#pc.IS_NEW_TMP) {
				replaceFile(
					this.#pc.PATH_WS +'/electron.vite.config.ts',
					new RegExp(`publicDir: '../../${FLD_CRYPT_DOC}/'`),
					'publicDir: \'../../doc/\'',
				);
				replaceFile(
					this.#pc.PATH_WS +'/vite.config.ts',
					new RegExp(`publicDir: '${FLD_CRYPT_DOC}'`),
					'publicDir: \'doc\'',
				);
			}
			else {
				replaceFile(
					this.#pc.PATH_WS +'/package.json',
					new RegExp(`${FLD_CRYPT_DOC}\\/`, 'g'),
						// (new RegExp('\')) の場合は、バックスラッシュは２つ必要
					'doc/',
				);
				replaceFile(
					this.#pc.PATH_WS +'/core/wds.config.js',
					new RegExp(`\\/${FLD_CRYPT_DOC}'`, 'g'),
						// (new RegExp('\')) の場合は、バックスラッシュは２つ必要
					'/doc\'',
				);
				replaceFile(
					this.#pc.PATH_WS +'/core/webpack.config.js',
					new RegExp(`'\\/${FLD_CRYPT_DOC}`, 'g'),
						// (new RegExp('\')) の場合は、バックスラッシュは２つ必要
					'\'/doc',
				);
			}
			await this.#updPlugin();

			return;
		}

		// to 暗号化
		await mkdirs(this.#PATH_CRYPT);

		// ビルド関連：SKYNovelが見に行くプロジェクトフォルダ名変更
		for (const url of this.#aRepl) replaceFile(
			this.#pc.PATH_WS +'/'+ url,
			/\(hPlg\);/,
			'(hPlg, {cur: \'prj/\', crypto: true});',
		);
		// ビルド関連：パッケージするフォルダ名変更
		if (this.#pc.IS_NEW_TMP) {
			replaceFile(
				this.#pc.PATH_WS +'/electron.vite.config.ts',
				/publicDir: '..\/..\/doc\/'/,
				`publicDir: '../../${FLD_CRYPT_DOC}/'`,
			);
			replaceFile(
				this.#pc.PATH_WS +'/vite.config.ts',
				/publicDir: 'doc'/,
				`publicDir: '${FLD_CRYPT_DOC}'`,
			);
			await copy(
				this.#pc.PATH_WS +'/doc/icon.png',
				this.#pc.PATH_WS +`/${FLD_CRYPT_DOC}/icon.png`
			);
		}
		else {
			replaceFile(
				this.#pc.PATH_WS +'/package.json',
				/doc\//g,
				`${FLD_CRYPT_DOC}/`,
			);
			replaceFile(
				this.#pc.PATH_WS +'/core/wds.config.js',
				/\/doc'/g,
				`/${FLD_CRYPT_DOC}'`,
			);
			replaceFile(
				this.#pc.PATH_WS +'/core/webpack.config.js',
				/'\/doc/g,
				`'/${FLD_CRYPT_DOC}`,
			);
			await Promise.allSettled([
				copy(
					this.#pc.PATH_WS +'/doc/web.htm',
					this.#pc.PATH_WS +`/${FLD_CRYPT_DOC}/web.htm`
				),
				copy(
					this.#pc.PATH_WS +'/doc/app.js',
					this.#pc.PATH_WS +`/${FLD_CRYPT_DOC}/app.js`
				),
				copy(
					this.#pc.PATH_WS +'/doc/app/icon.png',
					this.#pc.PATH_WS +`/${FLD_CRYPT_DOC}/app/icon.png`
				),
				copy(
					this.#pc.PATH_WS +'/doc/app/index.htm',
					this.#pc.PATH_WS +`/${FLD_CRYPT_DOC}/app/index.htm`
				),
			]);
		}
		// ビルド関連：プラグインソースに埋め込む
		replaceFile(
			this.ctx.extensionPath +'/dist/snsys_pre.js',
			/[^\s=]+\.tstDecryptInfo\(\)/,
			this.#encry.strHPass,
			true,
			this.#pc.PATH_PLG_PRE +`index.${this.#pc.IS_NEW_TMP ?'ts' :'js'}`,
		);
		await this.#updPlugin();

		this.#diff.clear();
		await this.#initCrypto();
	}

	async #encFile({path}: Uri) {
		const fsp = vsc2fp(path);
		const pp = this.#diff.fp2pp(fsp);
// console.log(`fn:Project.ts #encFile pp=${pp}= =${this.#diff.get(pp)!.cn}`);
		try {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const fsp_enc = this.#PATH_CRYPT + this.#diff.get(pp)!.cn;
			if (! REG_NEEDCRYPTO.test(pp)) {
				await copy(fsp, fsp_enc, {overwrite: true});
				//.catch((e: any)=> console.error(`enc cp1 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラーとなるだけなので
				return;
			}

			if (REG_FULLCRYPTO.test(pp)) {	// この中はSync
				if (pp === 'path.json') {
					await this.#encFile_pathjson(fsp, fsp_enc);
					return;
				}

				const s = await readFile(fsp, {encoding: 'utf8'});
				await outputFile(fsp_enc, await this.#encry.enc(s));
				return;
			}

			const dir = this.#REG_DIR.exec(pp);
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			if (dir && this.#cfg.oCfg.code[dir[1]!]) {
				await copy(fsp, fsp_enc, {overwrite: true});
				//.catch((e: any)=> console.error(`enc cp2 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラーとなるだけなので
				return;
			}

			const u2 = fsp_enc.replace(/\.[^.]+$/, '.bin');
			await ensureFile(u2);	// touch
			const ws = createWriteStream(u2)
			.on('error', e=> {ws.destroy(); console.error('enc ws=%o', e);});

			const rs = createReadStream(fsp)
			.on('error', e=> console.error('enc rs=%o', e));

			const tr = new EncryptorTransform(this.#encry, fsp);
			rs.pipe(tr).pipe(ws);
		}
		catch (e) {
			console.error(`enc other ${
				e instanceof Error ?e.message :''
			} src:${fsp}`);
		}
	}
		async #encFile_pathjson(fsp: FULL_SCH_PATH, fsp_enc: FULL_SCH_PATH) {
			const hPath = <T_Fn2Path>await readJson(fsp, {encoding: 'utf8'});
			for (const hExt2N of Object.values(hPath)) {
				for (const [ext, pp] of Object.entries(hExt2N)) {
					if (ext === ':cnt') continue;
					if (ext.endsWith(':id')) continue;

					const dir = this.#REG_DIR.exec(<string>pp);
					const d = this.#diff.get(<string>pp);
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					if (dir && this.#cfg.oCfg.code[dir[1]!] || ! d) continue;

					hExt2N[ext] = d.cn;
				}
			}
			const s = JSON.stringify(hPath);
			await outputFile(fsp_enc, await this.#encry.enc(s));
		}
		readonly #REG_DIR	= /(^.+)\//;


	readonly	#REG_PLGADDTAG	= /(?<=\.\s*addTag\s*\(\s*)(["'])(.+?)\1/g;
	#hDefPlg	: T_H_PLGDEF	= {};
	async #updPlugin(build = true) {
		const pathPlg = `${this.#pc.PATH_WS}/${this.#pc.FLD_SRC}/plugin/`;
		if (! existsSync(pathPlg)) {
			await mkdirs(pathPlg);
			this.#build();
			return;
		}

		const h4json	: {[def_nm: string]: number}	= {};
		this.#hDefPlg = {};
		const aP: Promise<void>[] = [];
		foldProc(pathPlg, ()=> { /* empty */ }, nm=> {
			h4json[nm] = 0;

			let path = `${pathPlg}${nm}/index.`;
			if (existsSync(path +'js')) path += 'js'; else
			if (existsSync(path +'ts')) path += 'ts'; else return;

			aP.push((async ()=> {
				const txt = await readFile(path, 'utf8');
				let a;
				// 全ループリセットかかるので不要	.lastIndex = 0;	// /gなので必要
				// eslint-disable-next-line no-cond-assign
				while (a = this.#REG_PLGADDTAG.exec(txt)) {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
			})());
		});
		await Promise.allSettled(aP);
		await this.reqPrj2LSP({cmd: 'def_plg.upd', hDefPlugin: this.#hDefPlg});

		const sPlgIdx = pathPlg.slice(0, -1);
		await outputJson(sPlgIdx +'.json', h4json);
		if (build) try {
			this.#build();
		} catch (e: unknown) {console.error(`Project updPlugin ${String(e)}`)}

		// 旧式プラグインインデックスを更新
		if (existsSync(sPlgIdx +'.js')) {
			await remove(sPlgIdx +'.js');

			for (const url of this.#aRepl) replaceFile(
				this.#pc.PATH_WS +'/'+ url,
				/'\.\/plugin\.js';/,
				'\'./plugin.json\';',
			);
		}
	}
	#build = ()=> {
		if (! ActivityBar.getReady('NPM')) return;

		this.#build = ()=> { /* empty */ };	// onceにする
		// 起動時にビルドが走るのはこれ
		// 終了イベントは Project.ts の tasks.onDidEndTaskProcess で
		let cmd = `cd "${this.#pc.PATH_WS}"`;
		if (! existsSync(this.#pc.PATH_WS +'/node_modules')) {
			cmd += ` ${statBreak} npm i`;		// 自動で「npm i」
			removeSync(this.#pc.PATH_WS +'/package-lock.json');
		}
		const type = PRE_TASK_TYPE +'Sys';
		const name = '自動ビルド';
		const t = new Task(
			{type},			// タスクの一意性
			this.wsFld,
			name,			// UIに表示
			'SKYNovel',		// source
			new ShellExecution(cmd),
		);

		this.enableBtn(false);
		window.withProgress({
			location	: ProgressLocation.Notification,
			title		: name,
			cancellable	: false
		}, _prg=> new Promise<void>(done=> {
			let fnc = (e: TaskProcessEndEvent)=> {
				if (e.execution.task.definition.type !== type) return;
				fnc = ()=> { /* empty */ };
				this.enableBtn(true);
				done();
			};
			tasks.onDidEndTaskProcess(e=> fnc(e));

			try {
				void tasks.executeTask(t);
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
			const fp = vsc2fp(path);
//console.log(`fn:Project.ts drop scheme:${scheme} fp:${fp}: uri:${uri.toString()}: path=${path}= fsPath-${uri.fsPath}-`);

			let fpNew = fp;
			const fn_ext = '/'+ basename(fp);
			const aコピー先候補 = this.#getコピー先候補(ext);
			switch (scheme) {
			case 'file':
				if (statSync(path).isDirectory()) {	// フォルダドロップ
					if (! fp.startsWith(this.#pc.PATH_PRJ)) return null;	// プロジェクト外なら鼻も引っ掛けない

					if (fp === this.#pc.PATH_PRJ +'prj.json') this.#ps.open()
					else this.#ps.pnlWVFolder.open(uri);
				}
				if (! ext) continue;	// 拡張子なしは無視（.gitignore 系も）

				if (fp.startsWith(this.#pc.PATH_PRJ)) break;	// プロジェクト内からのドラッグ

				// プロジェクト外からのドラッグ
				// ファイルコピー
				switch (aコピー先候補.length) {
					case 0:	{	// 候補もなし、スクリプトと同じフォルダにコピー
						const tp = td.uri.path;
						fpNew = vsc2fp(
							tp.slice(0, -basename(tp).length) + basename(fp)
						);
					}	break;

					case 1:		// 選ぶまでもなく確定
						// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
						fpNew = this.#pc.PATH_PRJ + aコピー先候補[0] + fn_ext;
						break;

					default:{
						aコピー先候補.push('キャンセル');
						const ans = await window.showInformationMessage(
							basename(fp) +' のコピー先を選んでください',
							...aコピー先候補,
						);
						if (! ans || ans === 'キャンセル') return null;

						fpNew = this.#pc.PATH_PRJ + ans + fn_ext;
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
						// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
						ppNew = aコピー先候補[0] + fn_ext;
						break;
				}
				fpNew = this.#pc.PATH_PRJ + ppNew;
				await writeFile(fpNew, new Uint8Array(await res.arrayBuffer()));

				window.showInformationMessage(`素材をダウンロードしました。 path=${ppNew}`);
				// サイドバーに表示
				await commands.executeCommand('revealInExplorer', Uri.parse(`${this.#pc.URI_WS}/doc/prj/${ppNew}`));

			}	break;

			default:	return null;
			}

			aFpNew.push(fpNew);
		}

		// スニペット挿入・値部を書き換え
		if (aFpNew.length === 0) return null;
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const fp = aFpNew[0]!;
		const ext = extname(fp).slice(1);
		const fn = getFn(fp);
		for (const [spae, snip] of this.#mExt2Snip.entries()) {
			if (! new RegExp(spae).test(ext)) continue;

			// 属性値にドロップした場合は、値部を書き換える
			const {range, nm} = this.#getWordRangeAtPosition(td, pos, this.#REG_FIELD);
			if (nm) return {insertText: '', additionalEdit: this.#createWsEd_repVal(td.uri, range, nm, fn)};

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
				? /['#]/.test(val) ? `"${val}"` : `'${val}'`
				: val;
			we.replace(uri, range, nm + '=' + v2);
			return we;
		}

		#getWordRangeAtPosition(td: TextDocument, {line, character}: Position, reg: RegExp): {hit: string, range: Range, nm: string, val: string} {
//			if (reg.flags.indexOf('g') === -1) console.log(`fn:LspWs.ts #getWordRangeAtPosition gフラグが必要です`);// TO DO: あとでコメントアウト

			const s = td.getText(new Range(line, 0, line, 9999));
			let e;
			reg.lastIndex = 0;	// /gなので必要
			// eslint-disable-next-line no-cond-assign
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
