/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {statBreak, uint, treeProc, foldProc, replaceFile, REG_IGNORE_SYS_PATH, IFn2Path, is_win} from './CmnLib';
import {CodingSupporter} from './CodingSupporter';
import {PrjSetting} from './PrjSetting';
import {Encryptor} from './Encryptor';
import {ActivityBar, eTreeEnv} from './ActivityBar';
import {EncryptorTransform} from './EncryptorTransform';
import {PrjTreeItem, TREEITEM_CFG, PrjBtnName} from './PrjTreeItem';
import {ScriptScanner} from './ScriptScanner';

import {ExtensionContext, workspace, Disposable, tasks, Task, ShellExecution, window, Uri, Location, Range, WorkspaceFolder, TaskProcessEndEvent, ProgressLocation, TreeItem, EventEmitter, ThemeIcon, debug, DebugSession, env, TaskExecution} from 'vscode';
import {closeSync, createReadStream, createWriteStream, ensureDir, ensureDirSync, ensureLink, ensureFileSync, existsSync, openSync, outputFile, outputFileSync, outputJson, outputJsonSync, readFile, readFileSync, readJsonSync, readSync, removeSync, writeJsonSync, copy, readJson} from 'fs-extra';
import {resolve, extname, parse} from 'path';
import img_size from 'image-size';
import {lib, enc, RIPEMD160} from 'crypto-js';
import {v4 as uuidv4} from 'uuid';
import * as crc32 from 'crc-32';
import * as archiver from 'archiver';
import {basename, dirname} from 'path';
import {execSync} from 'child_process';
import * as ncu from 'npm-check-updates';

type BtnEnable = '_off'|'Stop'|'';

export class Project {
	readonly	#codSpt;

	readonly	#curPlg;
	readonly	#curPrj;
	readonly	#lenCurPrj;

	readonly	#curPrjBase;

	readonly	#curCrypto;
	static readonly	#fld_crypto_prj		= 'crypto_prj';
	static get fldnm_crypto_prj() {return Project.#fld_crypto_prj}
	#isCryptoMode	= false;
	readonly	#REG_NEEDCRYPTO		= /\.(ss?n|json|html?|jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv|html?)$/;
	readonly	#REG_FULLCRYPTO		= /\.(sn|ssn|json|html?)$/;
	readonly	#REG_REPPATHJSON	= /\.(jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)/g;
	readonly	#hExt2N: {[ext: string]: number} = {
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
	readonly	#REG_NEEDHASH	= /\.(js|css)$/;	// 改竄チェック処理対象
		// js,css：暗号化HTMLから読み込む非暗号化ファイルにつき

	readonly	#encry;

	readonly	#aFSW	: Disposable[];

	readonly	#fnDiff	: string;
				#hDiff	: {[fn: string]: {
		hash: number,	// ファイル変更検知ハッシュ
		cn	: string,	// ファイル名匿名化辞書
	}}	= Object.create(null);


	static	readonly #idxDevSnUpd	= 0;
	static	readonly #idxDevCrypto	= 3;
	private	dspCryptoMode() {}		// 暗号化状態

	readonly	#aTiFlat: TreeItem[]	= [];
	enableBtn(enabled: boolean): void {
		if (enabled) this.#aTiFlat.forEach(ti=> {
			ti.contextValue = ti.contextValue?.trimEnd();
			this.emPrjTD.fire(ti);
		});	// 値を戻してボタン表示
		else this.#aTiFlat.forEach(ti=> {
			ti.contextValue += ' ';
			this.emPrjTD.fire(ti);
		});	// 値を壊してボタン消去
	}


	readonly	#pathWs;
	readonly	#fwPrjMatCnv;
	constructor(private readonly ctx: ExtensionContext, private readonly actBar: ActivityBar, private readonly wsFld: WorkspaceFolder, readonly aTiRoot: TreeItem[], private readonly emPrjTD: EventEmitter<TreeItem | undefined>, private readonly hOnEndTask: Map<PrjBtnName, (e: TaskProcessEndEvent)=> void>) {
		this.#pathWs = wsFld.uri.fsPath;
		this.#curPrj = this.#pathWs +'/doc/prj/';
		this.#curPrjBase = this.#pathWs +`/doc/${PrjSetting.fld_prj_base}/`;
		this.#codSpt = new CodingSupporter(ctx, this.#pathWs, this.#curPrj, (nm, val)=> this.#cmd(nm, val));

		const pti = PrjTreeItem.create(ctx, wsFld, (ti, btn_nm, cfg)=> this.#onBtn(ti, btn_nm, cfg));
		aTiRoot.push(pti);

		// ファイル増減を監視し、path.json を自動更新
		const fwPrj = workspace.createFileSystemWatcher(this.#curPrj +'*/*');
		const fwPrjSn = workspace.createFileSystemWatcher(this.#curPrj +'*/*.{sn,ssn}');
		const fwPrjJs = workspace.createFileSystemWatcher(this.#curPrj +'prj.json');
		// prjルートフォルダ監視
		const fwFld = workspace.createFileSystemWatcher(this.#curPrj +'*');
		const fwStgSn = workspace.createFileSystemWatcher(this.#curPrj +'**/setting.sn');
		this.#fwPrjMatCnv = workspace.createFileSystemWatcher(
			this.#pathWs +`/doc/{prj,${PrjSetting.fld_prj_base}}/**/*.{jpg,jpeg,png}`
		);
		this.#aFSW = [
			fwPrj.onDidCreate(uri=> {
				if (REG_IGNORE_SYS_PATH.test(uri.path)) return;
				this.#crePrj(uri);
			}),
			fwPrj.onDidChange(uri=> {
				if (REG_IGNORE_SYS_PATH.test(uri.path)) return;
				this.#chgPrj(uri);
			}),
			fwPrj.onDidDelete(uri=> {
				if (REG_IGNORE_SYS_PATH.test(uri.path)) return;
				this.#delPrj(uri);
			}),
			
			fwPrjSn.onDidCreate(uri=> this.#codSpt.crePrj(uri)),
			fwPrjSn.onDidChange(uri=> this.#codSpt.chgPrj(uri)),
			fwPrjSn.onDidDelete(uri=> this.#codSpt.delPrj(uri)),

			fwPrjJs.onDidChange(e=> this.#chgPrj(e)),

			fwFld.onDidCreate(uri=> this.#ps.onCreDir(uri.path)),
			/*fwFld.onDidChange(uri=> {	// フォルダ名ではこれが発生せず、Cre & Del
				if (uri.path.slice(-5) === '.json') return;
console.log(`fn:Project.ts Cha path:${uri.path}`);
			}),*/
			fwFld.onDidDelete(uri=> this.#ps.onDelDir(uri.path)),

			fwStgSn.onDidCreate(uri=> this.#ps.onCreSettingSn(uri.path)),
			fwStgSn.onDidDelete(uri=> this.#ps.onDelSettingSn(uri.path)),

			this.#fwPrjMatCnv.onDidCreate(uri=> this.#ps.onCreChgMatCnv(uri.path)),
			this.#fwPrjMatCnv.onDidChange(uri=> this.#ps.onCreChgMatCnv(uri.path)),
			this.#fwPrjMatCnv.onDidDelete(uri=> this.#ps.onDelMatCnv(uri.path)),
		];

		this.#curCrypto = this.#pathWs +`/doc/${Project.#fld_crypto_prj}/`;
		this.#isCryptoMode = existsSync(this.#curCrypto);
		const fnPass = this.#pathWs +'/pass.json';
		const exists_pass = existsSync(fnPass);
		this.#encry = new Encryptor(exists_pass
			? readJsonSync(fnPass, {throws: false})
			: {
				pass	: uuidv4(),
				salt	: String(lib.WordArray.random(128 / 8)),
				iv		: String(lib.WordArray.random(128 / 8)),
				keySize	: String(512 / 32),
				ite		: 500 + Math.floor(new Date().getTime() %300),
				stk		: String(lib.WordArray.random(128 / 8)),
			});
		if (! exists_pass) outputFileSync(fnPass, this.#encry.strHPass);

		try {
			this.#fnDiff = this.#pathWs +'/core/diff.json';
			if (existsSync(this.#fnDiff)) this.#hDiff = readJsonSync(this.#fnDiff);
		} catch (e) {
			// diff破損対策
			this.#hDiff = Object.create(null);
		}
		this.#ps = new PrjSetting(
			ctx,
			wsFld,
			title=> {
				pti.label = title;
				this.emPrjTD.fire(pti);
			},
			this.#codSpt,
			(nm, val)=> this.#cmd(nm, val),
			(nm, arg)=> this.#exeTask(nm, arg),
			this.#curPrjBase,
		);
		this.#initCrypto();

		this.#curPlg = this.#pathWs +'/core/plugin/';
		ensureDirSync(this.#curPlg);	// 無ければ作る
		// updPlugin で goAll() が走る
		if (existsSync(this.#pathWs +'/node_modules')) this.#updPlugin(false);
		else {
			this.build();
			if (ActivityBar.aReady[eTreeEnv.NPM]) window.showInformationMessage('初期化中です。ターミナルの処理が終わって止まるまでしばらくお待ち下さい。', {modal: true});
		}

		const aTi = pti.children;
		const aC = (aTi[aTi.length -1] as PrjTreeItem).children;
		this.#aTiFlat = [...aTi.slice(0, -1), ...aC];
		const tiDevSnUpd = aTi[Project.#idxDevSnUpd];
		this.getLocalSNVer = ()=> {
			const o = this.#ps.getLocalSNVer();
			tiDevSnUpd.description = o.verSN
			? `-- ${o.verSN}`+ (o.verTemp ?` - ${o.verTemp}` :'')
			: '取得できません';
			this.emPrjTD.fire(tiDevSnUpd);
			return o;
		};
		this.actBar.chkLastSNVer([this.getLocalSNVer()]);

		const tiDevCrypto = aTi[Project.#idxDevCrypto];
		this.dspCryptoMode = ()=> {
			tiDevCrypto.description = `-- ${this.#isCryptoMode ?'する' :'しない'}`
			this.emPrjTD.fire(tiDevCrypto);
		};
		this.dspCryptoMode();

		this.#lenCurPrj = this.#curPrj.length;
		this.#updPathJson();

		debug.onDidTerminateDebugSession(_=> this.onDidTermDbgSS());
		debug.onDidStartDebugSession(ds=> this.#aDbgSS.push(ds));
	}
	readonly	getLocalSNVer: ()=> {verSN: string, verTemp: string};
	#aDbgSS	: DebugSession[]	= [];
	private	onDidTermDbgSS() {}
	#termDbgSS(): Promise<PromiseSettledResult<void>[]> {
		this.#hTaskExe.get('TaskWeb')?.terminate();
		this.#hTaskExe.delete('TaskWeb');
		this.#hTaskExe.get('TaskApp')?.terminate();
		this.#hTaskExe.delete('TaskApp');

		const a = this.#aDbgSS.map(ds=> debug.stopDebugging(ds));
		this.#aDbgSS = [];
		return Promise.allSettled(a);
	}


	// 主に設定画面からのアクション。falseを返すとスイッチなどコンポーネントを戻せる
	async #cmd(nm: string, val: string): Promise<boolean> {
//console.log(`fn:Project.ts #cmd nm:${nm} val:${val}`);
// await (new Promise((re: any)=> setTimeout(re, 2000)));
		// 最新は val。this.ctx.workspaceState.get(（など）) は前回値
		switch (nm) {
		case 'cnv.font.subset':
			if (await window.showInformationMessage('フォントサイズ最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			await this.#subsetFont(Boolean(val));
			break;

		case 'cnv.mat.pic':
			if (await window.showInformationMessage('画像ファイル最適化（する / しない）を切り替えますか？', {modal: true}, 'はい') !== 'はい') return false;

			await this.#exeTask(
				'cnv_mat_pic',
				`${Boolean(val) ?'all' :'restore'
				} ${this.#ps.oWss['cnv.mat.webp_quality']
				} "${this.#curPrj}" "${this.#curPrjBase}"`,
			);
			this.#ps.updCnvMatInfo();
			break;
		}

		return true;
	}

	readonly	#hTask2Inf = {
		'cut_round': {
			title		: 'アイコン生成・丸く切り抜く',
			pathCpyTo	: 'build',
			aNeedLib	: ['sharp', 'png2icons'],
		},
		'subsetFont': {
			title		: 'フォントサイズ最適化',
			pathCpyTo	: 'core/font',
			aNeedLib	: ['subset-font'],
		},
		'cnv_mat_pic': {
			title		: '画像ファイル最適化',
			pathCpyTo	: 'build',
			aNeedLib	: ['sharp'],
		},
	};
	#exeTask(nm: 'subsetFont'|'cut_round'|'cnv_mat_pic', arg: string): Promise<number> {
		const inf = this.#hTask2Inf[nm];

		return new Promise(fin=> window.withProgress({
			location	: ProgressLocation.Notification,
			title		: inf.title,
			cancellable	: false,
		}, prg=> new Promise<void>(async donePrg=> {
			const pathJs = this.#pathWs +`/${inf.pathCpyTo}/${nm}.js`;
			await copy(this.ctx.extensionPath +`/dist/${nm}.js`, pathJs);

			const oPkg = await readJson(this.#pathWs +'/package.json', {encoding: 'utf8'});
			const sNeedInst = inf.aNeedLib
			.filter(nm=> ! oPkg.devDependencies[nm])
			.join(' ');

			tasks.executeTask(new Task(
				{type: 'SKYNovel '+ nm},	// definition（タスクの一意性）
				this.wsFld,
				inf.title,		// name、UIに表示
				'SKYNovel',		// source
				new ShellExecution(
					`cd "${this.#pathWs}" ${statBreak()} ${
						sNeedInst ?`npm i -D ${sNeedInst} ${statBreak()} ` :''
					}node ./${inf.pathCpyTo}/${nm}.js ${arg}`
				),
			))
			.then(
				re=> this.#hTaskExe.set(<any>nm, re),
				rj=> console.error(`fn:Project #exeTask() rj:${rj.message}`)
			);
			this.hOnEndTask.set(<any>nm, e=> {
				fin(e.exitCode ?? 0);
				prg.report({message: '完了', increment: 100});
				setTimeout(()=> donePrg(), 4000);
			});
		})));
	}
	readonly	#REG_FONT	= /\.(woff2|otf|ttf)$/;
	async	#subsetFont(minify: boolean) {
		// フォント出現箇所から生成すべき最小限のフォント情報についてまとめる
		const oFont: {[font_nm: string]: {
			inp	: string;
			txt	: string;
		}} = {};
		oFont[ScriptScanner.DEF_FONT] = {inp: '', txt: ''};

		const o = this.#codSpt.getInfFont2Str();
		const ensureFont2Str = (font_nm: string)=> oFont[font_nm] ??= {
			inp: o.hFontNm2Path[font_nm],
			txt: '',
		};
		for (const sn in o.hSn2Font2Str) {
			const f2s = o.hSn2Font2Str[sn];
			for (const font_nm in f2s) {
				ensureFont2Str(font_nm);
				oFont[font_nm].txt += f2s[font_nm];
			}
		}
		ensureFont2Str(o.defaultFontName);
			// デフォルトフォントと同じ値を直接値指定する[span]がない場合
		oFont[o.defaultFontName].txt += oFont[ScriptScanner.DEF_FONT].txt;
		delete oFont[ScriptScanner.DEF_FONT];
		await outputJson(this.#pathWs +'/core/font/font.json', oFont);

		// 旧フォントファイルはすべて一度削除
		foldProc(
			this.#pathWs +'/doc/prj/script/',
			(url, nm)=> {if (this.#REG_FONT.test(nm)) removeSync(url)},
			_=> {},
		);

		// 【node subset_font.js】を実行。終了を待ったり待たなかったり
		await this.#exeTask('subsetFont', (minify ?'--minify' :''),);

		// フォント情報更新
		this.#ps.updFontInfo();
	}


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
	#onBtn(ti: TreeItem, btn_nm: PrjBtnName, cfg: TREEITEM_CFG) {
		if (! ActivityBar.aReady[eTreeEnv.NPM]) return;

		// 値を壊してボタン消去など
		const aBtnEnable = this.#hPush2BtnEnable.get(btn_nm)
		?? ['_off', '_off', '_off', '_off', '_off', '_off',
			'_off', '_off', '_off', '_off', '_off', '_off'];
		this.#aTiFlat.forEach((ti, i)=> {
			ti.contextValue += aBtnEnable[i];
			this.emPrjTD.fire(ti);
		});

		if (btn_nm === 'TaskWebStop' || btn_nm === 'TaskAppStop') {
			this.#onBtn_sub(ti, btn_nm, cfg, ()=> {});
			return;
		}
		window.withProgress({
			location	: ProgressLocation.Notification,
			title		: String(ti.label) ?? '',
			cancellable	: false,
		}, prg=> new Promise(done=> {
			const iconPath = ti.iconPath;
			ti.iconPath = new ThemeIcon('sync~spin');

			this.#onBtn_sub(ti, btn_nm, cfg, (timeout = 4000)=> {
				ti.iconPath = iconPath;

				this.#aTiFlat.forEach(ti=> {
					switch (ti.contextValue?.slice(-4)) {
						case '_off':
						case 'Stop':
							ti.contextValue = ti.contextValue?.slice(0, -4);
							break;
					}
					this.emPrjTD.fire(ti);
				});	// 値を戻してボタン表示

				prg.report({message: '完了', increment: 100});
				setTimeout(()=> done(0), timeout);
			})
		}));
	}
	#onBtn_sub(ti: TreeItem, btn_nm: PrjBtnName, cfg: TREEITEM_CFG, done: (timeout?: number)=> void) {
		const pathWs = this.wsFld.uri.fsPath;
		let cmd = `cd "${pathWs}" ${statBreak()} `;
		if (! existsSync(pathWs +'/node_modules')) {
			cmd += `npm i ${statBreak()} `;	// 自動で「npm i」
			removeSync(pathWs +'/package-lock.json');
		}

		// メイン処理
		if (cfg.npm) cmd += cfg.npm;
		switch (btn_nm) {	// タスク前処理
			case 'SnUpd':
				this.#termDbgSS()
				.then(()=> this.actBar.updPrjFromTmp(pathWs))
				.then(()=> ncu.run({	// ncu -u --target minor
					packageFile: pathWs +'/package.json',
					// Defaults:
					// jsonUpgraded: true,
					// silent: true,
					upgrade: true,
					target: 'minor',
				})
				.then(()=> {
					this.getLocalSNVer();
					this.#onBtn_sub(ti, 'SnUpd_waited', cfg, done);
				}))
				.catch(()=> done(0));
				return;

			case 'SnUpd_waited':	break;	// Promise待ち後

			case 'PrjSet':	this.#ps.open();	done(0);	return;

			case 'Crypto':
				window.showInformationMessage('暗号化（する / しない）を切り替えますか？', {modal: true}, 'はい')
				.then(a=> {
					if (a !== 'はい') {done(0); return;}

					this.#termDbgSS().then(()=> {
						this.#tglCryptoMode();
						this.#onBtn_sub(ti, 'Crypto_waited', cfg, done);
					})
					.catch(err=> console.error(err));
				});
				return;
			case 'Crypto_waited':	break;	// Promise待ち後

			case 'TaskWebDbg':
			case 'TaskAppDbg':
				this.#termDbgSS().then(()=> {
					this.onDidTermDbgSS = ()=> {
						this.onDidTermDbgSS = ()=> {};
						done(0);
					};
					debug.startDebugging(
						this.wsFld,
						btn_nm === 'TaskWebDbg' ?'webデバッグ' :'appデバッグ',
					);
				});
				return;

			case 'TaskWebStop':
			case 'TaskAppStop':	this.#termDbgSS();	done(0);	return;

			case 'PackWin':
			case 'PackWin32':
			case 'PackMac':
			case 'PackMacArm64':
			case 'PackLinux':	this.#termDbgSS();	break;

			case 'PackFreem':
				this.#termDbgSS();

				let find_ng = false;
				treeProc(pathWs +'/doc/prj', url=> {
					if (find_ng || url.slice(-4) !== '.svg') return;

					find_ng = true;
					window.showErrorMessage(
						`ふりーむ！では svg ファイル使用禁止です。png などに置き換えて下さい`, 'フォルダを開く', 'Online Converter',
					)
					.then(a=> {switch (a) {
						case 'フォルダを開く':
							env.openExternal(Uri.file(dirname(url)));	break;
						case 'Online Converter':
							env.openExternal(Uri.parse('https://cancerberosgx.github.io/demos/svg-png-converter/playground/'));
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
				window.showErrorMessage(`管理者として開いたPowerShell で実行ポリシーを RemoteSigned などに変更して下さい。\n例）Set-ExecutionPolicy RemoteSigned`, {modal: true}, '参考サイトを開く')
				.then(a=> {if (a) env.openExternal(Uri.parse('https://qiita.com/Targityen/items/3d2e0b5b0b7b04963750'));});
				return;
		}

		const t = new Task(
			{type: 'SKYNovel '+ btn_nm},	// definition（タスクの一意性）
			this.wsFld,
			cfg.label,					// name、UIに表示
			'SKYNovel',					// source
			new ShellExecution(cmd),
		);
		this.hOnEndTask.set(btn_nm, ()=> done());
		switch (btn_nm) {	// タスク後処理
			//case 'SnUpd':	// ここには来ない
			case 'SnUpd_waited':	// Promise待ち後
				this.hOnEndTask.set(btn_nm, ()=> {this.getLocalSNVer(); done();});
				break;

			case 'Crypto_waited':
				this.hOnEndTask.set(btn_nm, ()=> {this.dspCryptoMode(); done();});
				break;

			case 'PackWin':
			case 'PackWin32':
			case 'PackMac':
			case 'PackMacArm64':
			case 'PackLinux':	this.hOnEndTask.set(btn_nm, ()=> {
				// アップデート用ファイル作成
				const oPkg = readJsonSync(pathWs +'/package.json', {encoding: 'utf8'});

				const pathPkg = pathWs +'/build/package';
				const pathUpd = pathPkg +'/update';
				const fnUcJs = pathUpd +'/_index.json';
				let oUc = existsSync(fnUcJs)
					? readJsonSync(fnUcJs, {encoding: 'utf8'})
					: {};

//console.log(`fn:Project.ts line:492 pkg ver:${oPkg.version}: @${btn_nm.slice(4, 7)}@`);
				const isMacBld = btn_nm.slice(4, 7) === 'Mac';
				const isLinBld = btn_nm.slice(4, 7) === 'Lin';
				const fnYml = pathPkg +`/latest${
					isMacBld ?'-mac' :isLinBld ?'-linux' :''
				}.yml`;
				const sYml = readFileSync(fnYml, {encoding: 'utf8'});
				const mv = /version: (.+)/.exec(sYml);
				if (! mv) throw `[Pack...] .yml に version が見つかりません`;
				const ver = mv[1];
//console.log(`fn:Project.ts line:499 ver=${ver}= eq=${oPkg.version == ver}`);
				if (oUc.version != ver || oUc.name != oPkg.name) {
					oUc = {};
					removeSync(pathUpd);
					ensureDirSync(pathUpd);
				}
				oUc.version = oPkg.version;
				oUc.name = oPkg.name;

				const mp = /path: (.+)/.exec(sYml);
				if (! mp) throw `[Pack...] .yml に path が見つかりません`;
				const path = mp[1];

				const ms = /size: (.+)/.exec(sYml);
				if (! ms) throw `[Pack...] .yml に size が見つかりません`;
				const size = Number(ms[1] ?? NaN);

				const mc = /sha512: (.+)/.exec(sYml);
				if (! mc) throw `[Pack...] .yml に sha512 が見つかりません`;
				const sha512 = mc[1] ?? '';
				const cn = this.#encry.uuidv5(sha512);

				const ma = /-(\w+)\.\D/.exec(path);
					// https://regex101.com/r/yH7nLk/1	13 steps, 0.0ms
				if (! ma) throw `path に arch が見つかりません`;
				const arch = ma[1];

				const key = (isMacBld ?'darwin' :isLinBld ?'linux' :'win32') +'_'+ arch;
				oUc[key] = {path, size, sha512, cn,};
				outputJsonSync(fnUcJs, oUc, {spaces: '\t'});

				// 古い（暗号化ファイル名）更新ファイルを削除
				const REG_OLD_SAMEKEY = new RegExp('^'+ key +'-');
				foldProc(pathUpd, (url, nm)=> {
					if (REG_OLD_SAMEKEY.test(nm)) removeSync(url);
				}, ()=> {});

				// （暗号化ファイル名）更新ファイルをコピー
				ensureLink(pathPkg +'/'+ path, pathUpd +'/'+ key +'-'+ cn);
					// ランダムなファイル名にしたいがkeyは人に分かるようにして欲しい、
					// という相反する要望を充たすような
					// 既存ファイル削除にも便利

				done();
				window.showInformationMessage(
					`${cfg.label} パッケージを生成しました`,
					'出力フォルダを開く',
				).then(a=> {if (a) env.openExternal(Uri.file(pathPkg))});
			});
				break;

			case 'PackFreem':	this.hOnEndTask.set(btn_nm, ()=> {
				const arc = archiver.create('zip', {zlib: {level: 9},})
				.append(createReadStream(pathWs +'/doc/web.htm'), {name: 'index.html'})
				.append(createReadStream(pathWs +'/build/include/readme.txt'), {name: 'readme.txt'})
				.glob('web.js', {cwd: pathWs +'/doc/'})
				.glob('web.*.js', {cwd: pathWs +'/doc/'})
				.glob(`${
					this.#isCryptoMode ?Project.fldnm_crypto_prj :'prj'
				}/**/*`, {cwd: pathWs +'/doc/'})
				.glob('favicon.ico', {cwd: pathWs +'/doc/'});

				const fn_out = `${basename(pathWs)}_1.0freem.zip`;
				const ws = createWriteStream(pathWs +`/build/package/${fn_out}`)
				.on('close', ()=> {
					done();
					window.showInformationMessage(
						`ふりーむ！形式で出力（${fn_out}）しました`,
						'出力フォルダを開く',
					).then(a=> {if (a) env.openExternal(Uri.file(pathWs +'/build/package/'))})
				});
				arc.pipe(ws);
				arc.finalize();	// zip圧縮実行
			});
				break;
		}
		tasks.executeTask(t)
		.then(
			re=> this.#hTaskExe.set(btn_nm, re),
			rj=> console.error(`fn:Project onBtn_sub() rj:${rj.message}`)
		);
	}
	readonly	#hTaskExe	= new Map<PrjBtnName, TaskExecution>();


	readonly	#ps;
	get title() {return this.#ps.cfg.book.title}
	get version() {return this.#ps.cfg.book.version}

	dispose() {this.#aFSW.forEach(f=> f.dispose());}


	#crePrj(e: Uri) {this.#encIfNeeded(e.path); this.#updPathJson();}
	#chgPrj(e: Uri) {this.#encIfNeeded(e.path);}
	#delPrj(e: Uri) {
		const short_path = e.path.slice(this.#lenCurPrj);
		removeSync(
			this.#curCrypto + short_path
			.replace(this.#REG_REPPATHJSON, '.bin')
			.replace(/"/, '')
		);
		this.#updPathJson();

		delete this.#hDiff[short_path];
		this.#updDiffJson();
	}

	// プロジェクトフォルダ以下全走査で暗号化
	#initCrypto() {
		const fnc: (url: string)=> void = this.#isCryptoMode
			? url=> {if (this.#isDiff(url)) this.#encFile(url);}
			: url=> this.#isDiff(url)
		treeProc(this.#curPrj, fnc);
		this.#updDiffJson();
	}
	#encIfNeeded(url: string) {
		if (this.#isCryptoMode && this.#isDiff(url)) this.#encFile(url);
		this.#updDiffJson();
	}
	#updDiffJson() {writeJsonSync(this.#fnDiff, this.#hDiff);}
	readonly	#LEN_CHKDIFF	= 1024;
	#isDiff(url: string): boolean {
		const short_path = url.slice(this.#lenCurPrj);
		const diff = this.#hDiff[short_path];
		if (diff) {
			const url_c = url
			.replace(/\/prj\/.+$/, `/${Project.#fld_crypto_prj}/${diff.cn}`);
			if (! existsSync(url_c)) return true;
		}

		let hash = 0;
		if (this.#REG_FULLCRYPTO.test(url)) {
			hash = crc32.str(readFileSync(url, {encoding: 'utf8'}));
		}
		else {
			const b = new Uint8Array(this.#LEN_CHKDIFF);
			const fd = openSync(url, 'r');
			readSync(fd, b, 0, this.#LEN_CHKDIFF, 0);
			closeSync(fd);
			hash = crc32.buf(b);
		}
		if (diff?.hash === hash) return false;

		this.#hDiff[short_path] = {
			hash,
			cn: this.#REG_NEEDCRYPTO.test(short_path)
				? short_path.replace(
					this.#REG_SPATH2HFN,
					`$1/${this.#encry.uuidv5(short_path)}$2`
				)
				.replace(this.#REG_REPPATHJSON, '.bin')
				: short_path,
		};
		return true;
	}
	readonly	#REG_SPATH2HFN	= /([^\/]+)\/[^\/]+(\.\w+)/;


	readonly	#aRepl = [
		'core/app4webpack.js',
		'core/web4webpack.js',
	];
	#tglCryptoMode() {
		const pathPre = this.#curPlg +'snsys_pre';
		this.#isCryptoMode = ! this.#isCryptoMode;
		if (! this.#isCryptoMode) {
			removeSync(this.#curCrypto);

			removeSync(pathPre);

			// ビルド関連：SKYNovelが見に行くプロジェクトフォルダ名変更
			this.#aRepl.forEach(url=> replaceFile(
				this.#pathWs +'/'+ url,
				/\(hPlg, {.+?}\);/,
				`(hPlg);`,
			));
			// ビルド関連：パッケージするフォルダ名変更
			replaceFile(
				this.#pathWs +'/package.json',
				new RegExp(`"doc/${Project.#fld_crypto_prj}\\/",`),
				`"doc/prj/",`,
			);
			this.#updPlugin();	// doc/prj/prj.json 更新＆ビルド

			return;
		}

		ensureDir(this.#curCrypto);

		// ビルド関連：SKYNovelが見に行くプロジェクトフォルダ名変更
		this.#aRepl.forEach(url=> replaceFile(
			this.#pathWs +'/'+ url,
			/\(hPlg\);/,
			`(hPlg, {cur: '${Project.#fld_crypto_prj}/', crypto: true});`,
		));
		// ビルド関連：パッケージするフォルダ名変更
		replaceFile(
			this.#pathWs +'/package.json',
			/"doc\/prj\/",/,
			`"doc/${Project.#fld_crypto_prj}/",`,
		);
		// ビルド関連：プラグインソースに埋め込む
		replaceFile(
			this.ctx.extensionPath +`/dist/snsys_pre.js`,
			/pia\.tstDecryptInfo\(\)/,
			this.#encry.strHPass,
			pathPre +'/index.js',
		);
		this.#updPlugin();	// doc/prj/prj.json 更新＆ビルド

		this.#hDiff = Object.create(null);
		this.#initCrypto();
	}

	static	readonly #LEN_ENC	= 1024 *10;
			readonly #REG_DIR	= /(^.+)\//;
	async #encFile(path_src: string) {
		try {
			const short_path = path_src.slice(this.#lenCurPrj);
			const path_enc = this.#curCrypto + this.#hDiff[short_path].cn;
			if (! this.#REG_NEEDCRYPTO.test(path_src)) {
				removeSync(path_enc);	// これがないとエラーが出るみたい
				ensureLink(path_src, path_enc);
				//.catch((e: any)=> console.error(`encrypter cp1 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラー
					// となるだけなので
				return;
			}

			if (this.#REG_FULLCRYPTO.test(short_path)) {
				let s = await readFile(path_src, {encoding: 'utf8'});
				if (short_path === 'path.json') {	// 内容も変更
					// ファイル名匿名化
					const hPath: IFn2Path = JSON.parse(s);
					for (const fn in hPath) {
						const hExt2N = hPath[fn];
						for (const ext in hExt2N) {
							if (ext === ':cnt') continue;
							if (ext.slice(-10) === ':RIPEMD160') continue;
							const path = String(hExt2N[ext]);
							const dir = this.#REG_DIR.exec(path);
							if (dir && this.#ps.cfg.code[dir[1]]) continue;

							hExt2N[ext] = this.#hDiff[path].cn;
						}
					}
					s = JSON.stringify(hPath);
				}
				await outputFile(path_enc, this.#encry.enc(s));
				return;
			}

			const dir = this.#REG_DIR.exec(short_path);
			if (dir && this.#ps.cfg.code[dir[1]]) {
				removeSync(path_enc);	// これがないとエラーが出るみたい
				ensureLink(path_src, path_enc);
				//.catch((e: any)=> console.error(`encrypter cp2 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラー
					// となるだけなので
				return;
			}

			let cnt_code = Project.#LEN_ENC;
			let ite_buf = 2;
			const bh = new Uint8Array(ite_buf + cnt_code);
			bh[0] = 0;	// bin ver
			bh[1] = this.#hExt2N[extname(short_path).slice(1)] ?? 0;

			const u2 = path_enc.replace(/\.[^.]+$/, '.bin');
			ensureFileSync(u2);	// touch
			const ws = createWriteStream(u2)
			.on('error', e=> {
				ws.destroy();
				console.error(`encrypter ws=%o`, e);
			});

			const rs = createReadStream(path_src)
			.on('error', e=> console.error(`encrypter rs=%o`, e));

			const tr = new EncryptorTransform(this.#encry, path_src);
			rs.pipe(tr).pipe(ws);
		}
		catch (e) {console.error(`encrypter other ${e.message}`);}
	}


	readonly	#REG_PLGADDTAG	= /(?<=\.\s*addTag\s*\(\s*)(["'])(.+?)\1/g;
	#updPlugin(build = true) {
		if (! existsSync(this.#curPlg)) return;

		const h4json	: {[def_nm: string]: number}	= {};
		const hDefPlg	: {[def_nm: string]: Location}	= {};
		foldProc(this.#curPlg, ()=> {}, nm=> {
			h4json[nm] = 0;

			const path = `${this.#curPlg}${nm}/index.js`;
			if (! existsSync(path)) return;

			const txt = readFileSync(path, 'utf8');
			let a;
			// 全ループリセットかかるので不要	.lastIndex = 0;	// /gなので必要
			while ((a = this.#REG_PLGADDTAG.exec(txt))) {
				const nm = a[2];
				const len_nm = nm.length;
				const idx_nm = this.#REG_PLGADDTAG.lastIndex -len_nm -1;

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
		this.#codSpt.setHDefPlg(hDefPlg);

		outputFile(this.#curPlg.slice(0, -1) +'.js', `export default ${JSON.stringify(h4json)};`)
		.then(build ?()=> this.build() :()=> {})
		.catch((err: any)=> console.error(`Project updPlugin ${err}`));
	}
	private	build() {
		if (! ActivityBar.aReady[eTreeEnv.NPM]) return;

		this.build = ()=> {};	// onceにする
		// 起動時にビルドが走るのはこれ
		// 終了イベントは Project.ts の tasks.onDidEndTaskProcess で
		let cmd = `cd "${this.#pathWs}" ${statBreak()} `;
		if (! existsSync(this.#pathWs +'/node_modules')) {
			cmd += `npm i ${statBreak()} `;		// 自動で「npm i」
			removeSync(this.#pathWs +'/package-lock.json');
		}
		cmd += 'npm run webpack:dev';
		const type = 'SKYNovel auto';
		const name = '自動ビルド';
		const t = new Task(
			{type},			// definition（タスクの一意性）
			this.wsFld!,
			name,			// name、UIに表示
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
				fnc = ()=> {};
				this.enableBtn(true);
				this.#updPlugin();
				done();
			};
			tasks.onDidEndTaskProcess(fnc);

			tasks.executeTask(t)
			.then(undefined, rj=> console.error(`Project build() rj:${rj.message}`));
				// この resolve は「executeTask()できたかどうか」だけで、
				// Task終了を待って呼んでくれるわけではない
		}));
	}


	#hPathFn2Exts	: IFn2Path	= {};
	async #updPathJson() {
		try {
			this.#hPathFn2Exts = this.#get_hPathFn2Exts(this.#curPrj);
			await outputJson(this.#curPrj +'path.json', this.#hPathFn2Exts);
			this.#codSpt.updPath(this.#hPathFn2Exts);
			if (this.#isCryptoMode) this.#encFile(this.#curPrj +'path.json');
		}
		catch (err) {console.error(`Project updPathJson ${err}`);}
	}
	readonly #REG_SPRSHEETIMG	= /^(.+)\.(\d+)x(\d+)\.(png|jpe?g)$/;
	#get_hPathFn2Exts($cur: string): IFn2Path {
		const hFn2Path: IFn2Path = {};

	//	const REG_FN_RATE_SPRIT	= /(.+?)(?:%40(\d)x)?(\.\w+)/;
		// ｛ファイル名：｛拡張子：パス｝｝形式で格納。
		//		検索が高速なハッシュ形式。
		//		ここでの「ファイル名」と「拡張子」はスクリプト経由なので
		//		URLエンコードされていない物を想定。
		//		パスのみURLエンコード済みの、File.urlと同様の物を。
		//		あとで実際にロード関数に渡すので。
		foldProc($cur, ()=> {}, dir=> {
			const wd = resolve($cur, dir);
			foldProc(wd, (url, nm)=> {
				this.#addPath(hFn2Path, dir, nm);

				// スプライトシート用json自動生成機能
				// breakline.5x20.png などから breakline.json を（無ければ）生成
				const a2 = nm.match(this.#REG_NEEDHASH);
				if (a2) {
					const s = readFileSync(url, {encoding: 'utf8'});
					const h = RIPEMD160(s).toString(enc.Hex);
					const snm = nm.slice(0, -a2[0].length);
					hFn2Path[snm][a2[1] +':RIPEMD160'] = h;
				}
				const a = nm.match(this.#REG_SPRSHEETIMG);
				if (! a) return;

				const fnJs = resolve(wd, a[1] +'.json');
				if (existsSync(fnJs)) return;

				const {width = 0, height = 0} = img_size(url);
				const xLen = uint(a[2]);
				const yLen = uint(a[3]);
				const w = width /xLen;
				const h = height /yLen;
				const basename = a[1];
				const ext = a[4];

				const oJs :any = {
					frames: {},
					meta: {
						app: 'skynovel',
						version: '1.0',
						image: a[0],
						format: 'RGBA8888',
						size: {w: width, h :height},
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
								: {x: 0, y: 0, w: width, h :height},
							sourceSize	: {w: w, h :h},
							pivot		: {x: 0.5, y: 0.5},
						};
					}
				}
				writeJsonSync(fnJs, oJs);
				window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${a[1]}.json を自動生成しました`);

				this.#addPath(hFn2Path, dir, `${a[1]}.json`);
			}, ()=> {});
		});

		return hFn2Path;
	}
	#addPath(hFn2Path: IFn2Path, dir: string, nm: string) {
		const p = parse(nm);
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
				const fn = this.#curPrj + (id === 1 ?hExts[ext] :dir +'/'+ nm);
				window.showInformationMessage(`${fn} を削除しますか？`, {modal: true}, 'はい')
				.then(a=> {if (a === 'はい') removeSync(fn);});
			});
			return;
		}
		else {
			hExts[':cnt'] = uint(hExts[':cnt']) +1;
		}
		hExts[ext] = dir +'/'+ nm;
	}

/*
	#userFnTail	= '';
	readonly	#REG_PATH	= /([^\/\s]+)\.([^\d]\w+)/;
		// 4 match 498 step(~1ms)  https://regex101.com/r/tpVgmI/1
	#searchPath(path: string, extptn = ''): string {
		if (! path) throw '[searchPath] fnが空です';

		const a = path.match(this.#REG_PATH);
		let fn = a ?a[1] :path;
		const ext = a ?a[2] :'';
		if (this.#userFnTail) {
			const utn = fn +'@@'+ this.#userFnTail;
			if (utn in this.#hPathFn2Exts) {
				if (extptn === '') fn = utn;
				else for (let e3 in this.#hPathFn2Exts[utn]) {
					if (`|${extptn}|`.indexOf(`|${e3}|`) === -1) continue;

					fn = utn;
					break;
				}
			}
		}
		const h_exts = this.#hPathFn2Exts[fn];
		if (! h_exts) throw `サーチパスに存在しないファイル【${path}】です`;

		let ret = '';
		if (! ext) {	// fnに拡張子が含まれていない
			//	extのどれかでサーチ（ファイル名サーチ→拡張子群にextが含まれるか）
			const hcnt = h_exts[':cnt'];
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

				return String(h_exts[e]);
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

		ret = String(h_exts[ext]);
		if (! ret) throw `サーチパスに存在しない拡張子【${ext}】です。探索ファイル名=【${path}】、サーチ対象拡張子群【${extptn}】`;

		return ret;
	}
*/

}
