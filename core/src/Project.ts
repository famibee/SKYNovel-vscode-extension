/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {statBreak, uint, treeProc, foldProc, replaceFile, regNoUseSysPath, IFn2Path, REG_SCRIPT, is_win} from './CmnLib';
import {CodingSupporter} from './CodingSupporter';
import {PrjSetting} from './PrjSetting';
import {Encryptor} from './Encryptor';
import {ActivityBar, eTreeEnv} from './ActivityBar';
import {EncryptorTransform} from './EncryptorTransform';
import {PrjTreeItem, TREEITEM_CFG} from './PrjTreeItem';

import {ExtensionContext, workspace, Disposable, tasks, Task, ShellExecution, window, Uri, Location, Range, WorkspaceFolder, TaskProcessEndEvent, ProgressLocation, TreeItem, EventEmitter, TreeItemCollapsibleState, ThemeIcon, debug, DebugSession, env, TaskExecution} from 'vscode';
import {ensureDirSync, existsSync, readJsonSync, outputFileSync, removeSync, writeJsonSync, readFileSync, openSync, readSync, closeSync, ensureDir, ensureLink, readFile, outputFile, createReadStream, ensureFileSync, createWriteStream, outputJson, writeFileSync, statSync} from 'fs-extra';
import path = require('path');
const img_size = require('image-size');
import {lib, enc, RIPEMD160} from 'crypto-js';
import {v4 as uuidv4} from 'uuid';
import crc32 = require('crc-32');
import archiver = require('archiver');
import {basename, dirname} from 'path';
import png2icons = require('png2icons');
const {execSync} = require('child_process');
import ncu = require('npm-check-updates');

export class Project {
	private	readonly	codSpt		: CodingSupporter;

	private	readonly	curPlg		: string;
	private	readonly	curPrj		: string;
	private	readonly	lenCurPrj	: number;
	private	readonly	curCrypto	: string;
	private	static readonly	fld_crypto_prj	= 'crypto_prj';
	static get fldnm_crypto_prj() {return Project.fld_crypto_prj}
	private		isCryptoMode	= true;
	private readonly	regNeedCrypto	= /\.(sn|ssn|json|html?|jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv|html?)$/;
	private readonly	regFullCrypto	= /\.(sn|ssn|json|html?)$/;
	private readonly	regRepPathJson	= /\.(jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)/g;
		// この末端の「"」は必須。変更時は delPrj_sub() 内も
	private readonly	hExt2N: {[name: string]: number} = {
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
	private	readonly	regNeedHash	= /\.(js|css)$/;	// 改竄チェック処理対象
		// js,css：暗号化HTMLから読み込む非暗号化ファイルにつき

	private	readonly	encry	: Encryptor;

	private	readonly	aFSW	: Disposable[];

	private	readonly	fnDiff	: string;
	private				hDiff	: {[fn: string]: {
		hash: number,	// ファイル変更検知ハッシュ
		cn	: string,	// ファイル名匿名化辞書
	}}	= Object.create(null);


	private	readonly aTreeTmp	: TREEITEM_CFG[] = [
		{cmd: 'SnUpd',		icon: 'skynovel',	label: 'SKYNovel更新',
			npm: `npm un -S skynovel ${statBreak()
			} npm i @famibee/skynovel@latest ${statBreak()
			} npm run webpack:dev`},
		{cmd: 'LibUpd',		icon: 'plugin',		label: '全ライブラリ更新',
			npm: `npm update ${statBreak()
			} npm run webpack:dev`},
		{cmd: 'ReBuild',	icon: 'gear',		label: 'リビルド',
			npm: 'npm run rebuild'},
		{cmd: 'PrjSet',		icon: 'gear',		label: '設定'},
		{cmd: 'Crypto',		icon: 'gear',		label: '暗号化',
			npm: 'npm run webpack:dev'},
		{cmd: 'TaskWeb',	icon: 'browser',	label: '起動：ブラウザ版',
			npm: 'npm run web',		exe: true,},
		{cmd: 'TaskApp',	icon: 'electron',	label: '起動：アプリ版',
			npm: 'npm run start',	exe: true,},
		{cmd: '', icon: '',label: '生成', children: [
			{cmd: 'PackWin',	icon: 'windows',	label: 'Windows exe x64',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -w --x64 -c.artifactName="\${prj.title}-\${prj.version}-x64.exe"`},
			//	} ./node_modules/.bin/electron-builder -w --x64 --ia32`},
					// 一パッケージに統合型、ファイルサイズ二倍になる
			{cmd: 'PackWin32',	icon: 'windows',	label: 'Windows exe ia32',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -w --ia32 -c.artifactName="\${prj.title}-\${prj.version}-ia32.exe"`},
			{cmd: 'PackMac',	icon: 'macosx',		label: 'macOS dmg x64',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -m dmg:x64 -c.artifactName="\${prj.title}-\${prj.version}-x64.dmg"`,
				forMac: true,},
			{cmd: 'PackMacArm64',	icon: 'macosx',	label: 'macOS dmg arm64',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -m dmg:arm64 -c.artifactName="\${prj.title}-\${prj.version}-arm64.dmg"`,
				forMac: true,},
				// Appleシリコンサポート| Electronブログ https://www.electronjs.org/blog/apple-silicon
					// 将来的にはarm64、x64アプリを1つのユニバーサルバイナリに「マージ」できるパッケージをリリースする予定ですが、このバイナリは巨大であり、ユーザーへの出荷にはおそらく理想的ではないことに注意してください。
			{cmd: 'PackLinux',	icon: 'linux',		label: 'Linux AppImage',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -l`},
				// Command Line Interface (CLI) - electron-builder https://www.electron.build/cli
			{cmd: 'PackFreem',	icon: 'freem',		label: 'ふりーむ！形式 zip',
				npm: 'npm run webpack:pro'},
		]},
	];
	private	static	readonly idxDevSnUpd	= 0;
	private	updLocalSNVer() {}		// ローカル SKYNovel バージョン
	private	static	readonly idxDevCrypto	= 4;
	private	dspCryptoMode() {}		// 暗号化状態

	private aTiFlat: TreeItem[]	= [];
	enableButton(enable: boolean): void {
		if (enable) this.aTiFlat.forEach(ti=> {
			ti.contextValue = ti.contextValue?.trimEnd();
			this.emPrjTD.fire(ti);
		});	// 値を戻してボタン表示
		else this.aTiFlat.forEach(ti=> {
			ti.contextValue += ' ';
			this.emPrjTD.fire(ti);
		});	// 値を壊してボタン消去
	}


	private readonly pathWs: string;
	constructor(private readonly ctx: ExtensionContext, private readonly chkLastSNVer: ()=> void, private readonly wsFld: WorkspaceFolder, readonly aTiRoot: TreeItem[], private readonly emPrjTD: EventEmitter<TreeItem | undefined>, private readonly hOnEndTask: {[nm: string]: (e: TaskProcessEndEvent)=> void}) {
		this.pathWs = wsFld.uri.fsPath;
		this.curPrj = this.pathWs +'/doc/prj/';
		this.codSpt = new CodingSupporter(ctx, this.pathWs, this.curPrj);

		this.curPlg = this.pathWs +'/core/plugin/';
		ensureDirSync(this.curPlg);	// 無ければ作る
		if (existsSync(this.pathWs +'/node_modules')) this.updPlugin();
		else {
			this.initTask();
			if (ActivityBar.aReady[eTreeEnv.NPM]) window.showInformationMessage('初期化中です。ターミナルの処理が終わって止まるまでしばらくお待ち下さい。', {modal: true});
		}

		const existPkgJS = existsSync(this.pathWs +'/package.json');
		const isPrjValid = existPkgJS && existsSync(this.pathWs +'/doc/prj/prj.json');
		const pti = new PrjTreeItem({
			cmd		: '',
			icon	: '',
			label	: '',
			desc	: wsFld.name,
			children: isPrjValid ? this.aTreeTmp : [{
				cmd		: '',
				icon	: 'warn',
				label	: `${existPkgJS ?'prj' :'package'}.json がありません`,
			}],
		}, this.pathWs, this.ctx, (ti, btn_nm, cfg)=> this.onClickTreeItemBtn(wsFld, ti, btn_nm, cfg));
		pti.collapsibleState = TreeItemCollapsibleState.Collapsed;
		aTiRoot.push(pti);

		// プラグインフォルダ増減でビルドフレームワークに反映する機能
		// というか core/plugin/plugin.js自動更新機能
		const fwPlg = workspace.createFileSystemWatcher(this.curPlg +'**/*');
		// ファイル増減を監視し、path.json を自動更新
		const fwPrj = workspace.createFileSystemWatcher(this.curPrj +'*/*');
		const fwPrjJs = workspace.createFileSystemWatcher(this.curPrj +'prj.json');
		// prjルートフォルダ監視
		const fwFld = workspace.createFileSystemWatcher(this.curPrj +'*');
		this.aFSW = [
			fwPlg.onDidCreate(uri=> {
				if (uri.path.slice(-4) !== '.git') this.updPlugin()}),
			fwPlg.onDidChange(uri=> {
				if (uri.path.slice(-4) !== '.git') this.updPlugin()}),
			fwPlg.onDidDelete(uri=> {
				if (uri.path.slice(-4) !== '.git') this.updPlugin()}),

			fwPrj.onDidCreate(uri=> {
				regNoUseSysPath.lastIndex = 0;
				if (regNoUseSysPath.test(uri.path)) return;
				this.crePrj(uri);
				if (REG_SCRIPT.test(uri.path)) this.codSpt.crePrj(uri);
			}),
			fwPrj.onDidChange(uri=> {
				regNoUseSysPath.lastIndex = 0;
				if (regNoUseSysPath.test(uri.path)) return;
				this.chgPrj(uri);
				if (REG_SCRIPT.test(uri.path)) this.codSpt.chgPrj(uri);
			}),
			fwPrj.onDidDelete(uri=> {
				regNoUseSysPath.lastIndex = 0;
				if (regNoUseSysPath.test(uri.path)) return;
				this.delPrj(uri);
				if (REG_SCRIPT.test(uri.path)) this.codSpt.delPrj(uri);
			}),
			fwPrjJs.onDidChange(e=> this.chgPrj(e)),

			fwFld.onDidCreate(uri=> this.ps.noticeCreDir(uri.path)),
			/*fwFld.onDidChange(uri=> {	// フォルダ名ではこれが発生せず、Cre & Del
				if (uri.path.slice(-5) === '.json') return;
console.log(`fn:Project.ts line:128 Cha path:${uri.path}`);
			}),*/
			fwFld.onDidDelete(uri=> this.ps.noticeDelDir(uri.path)),
		];

		this.curCrypto = this.pathWs +`/doc/${Project.fld_crypto_prj}/`;
		this.isCryptoMode = existsSync(this.curCrypto);
		const fnPass = this.pathWs +'/pass.json';
		const exists_pass = existsSync(fnPass);
		this.encry = new Encryptor(exists_pass
			? readJsonSync(fnPass, {throws: false})
			: {
				pass	: uuidv4(),
				salt	: String(lib.WordArray.random(128 / 8)),
				iv		: String(lib.WordArray.random(128 / 8)),
				keySize	: String(512 / 32),
				ite		: 500 + Math.floor(new Date().getTime() %300),
				stk		: String(lib.WordArray.random(128 / 8)),
			});
		if (! exists_pass) outputFileSync(fnPass, this.encry.strHPass);

		try {
			this.fnDiff = this.pathWs +'/core/diff.json';
			if (existsSync(this.fnDiff)) this.hDiff = readJsonSync(this.fnDiff);
		} catch (e) {
			// diff破損対策
			this.hDiff = Object.create(null);
		}
		this.ps = new PrjSetting(ctx, wsFld, title=> {
			pti.label = title;
			this.emPrjTD.fire(pti);
		}, this.codSpt, (path: string, extptn = '')=> this.searchPath(path, extptn));
		this.initCrypto();

		const aTi = pti.children;
		const aC = (aTi[aTi.length -1] as PrjTreeItem).children;
		this.aTiFlat = [...aTi.slice(0, -1), ...aC];
		const tiDevSnUpd = aTi[Project.idxDevSnUpd];
		this.updLocalSNVer = ()=> {
			const o = readJsonSync(this.pathWs +'/package.json');
			const localVer = o?.dependencies['@famibee/skynovel']?.slice(1);
			tiDevSnUpd.description = localVer ?`-- ${localVer}` :'取得できません';
				this.emPrjTD.fire(tiDevSnUpd);
		};
		this.updLocalSNVer();

		const tiDevCrypto = aTi[Project.idxDevCrypto];
		this.dspCryptoMode = ()=> {
			tiDevCrypto.description = `-- ${this.isCryptoMode ?'する' :'しない'}`
			this.emPrjTD.fire(tiDevCrypto);
		};
		this.dspCryptoMode();

		this.lenCurPrj = this.curPrj.length;
		this.updPathJson();

		debug.onDidTerminateDebugSession(_=> this.onDidTerminateDebugSession());
		debug.onDidStartDebugSession(ds=> this.aDbgSS.push(ds));
	}
	private	aDbgSS	: DebugSession[]	= [];
	private	onDidTerminateDebugSession() {}
	private	terminateDbgSS(): Promise<void[]> {
		this.hTaskExecution['TaskWeb']?.terminate();
		delete this.hTaskExecution['TaskWeb'];
		this.hTaskExecution['TaskApp']?.terminate();
		delete this.hTaskExecution['TaskApp'];

		const a = this.aDbgSS.map(ds=> debug.stopDebugging(ds));
		this.aDbgSS = [];
		return Promise.all(a);
	}

	private	readonly	hPush2BtnEnable	: {[btn_nm: string]: string[]}	= {
	'TaskWeb'		: ['_off', '_off', '_off', '_off', '_off', 'Stop', '_off',
						'_off', '_off', '_off', '_off', '_off', '_off'],
	'TaskWebDbg'	: ['_off', '_off', '_off', '_off', '_off', 'Stop', '_off',
						'_off', '_off', '_off', '_off', '_off', '_off'],
	'TaskWebStop'	: ['', '', '', '', '', '', '',
						'', '', '', '', '', ''],
// 'TaskApp'		: ['_off', '_off', '_off', '_off', '_off', '_off', 'Stop',
// 					'_off', '_off', '_off', '_off', '_off', '_off'],
// 'TaskAppDbg'	: ['_off', '_off', '_off', '_off', '_off', '_off', 'Stop',
// 					'_off', '_off', '_off', '_off', '_off', '_off'],
		// NOTE: 無効化中
	'TaskAppDbgStop': ['', '', '', '', '', '', '',
						'', '', '', '', '', ''],
	};
	private onClickTreeItemBtn(wsFld: WorkspaceFolder, ti: TreeItem, btn_nm: string, cfg: TREEITEM_CFG) {
		if (! ActivityBar.aReady[eTreeEnv.NPM]) return;

		// 値を壊してボタン消去など
		const aBtnEnable = this.hPush2BtnEnable[btn_nm]
		?? ['_off', '_off', '_off', '_off', '_off', '_off', '_off',
			'_off', '_off', '_off', '_off', '_off', '_off'];
		this.aTiFlat.forEach((ti, i)=> {
			ti.contextValue += aBtnEnable[i];
			this.emPrjTD.fire(ti);
		});

		if (btn_nm.slice(-4) === 'Stop') {
			this.onClickTreeItemBtn_sub(wsFld, ti, btn_nm, cfg, ()=> {});
			return;
		}
		window.withProgress({
			location	: ProgressLocation.Notification,
			title		: String(ti.label) ?? '',
			cancellable	: false
		}, prg=> new Promise(async done=> {
			const iconPath = ti.iconPath;
			ti.iconPath = new ThemeIcon('sync~spin');

			this.onClickTreeItemBtn_sub(wsFld, ti, btn_nm, cfg, (timeout = 4000)=> {
				ti.iconPath = iconPath;

				this.aTiFlat.forEach(ti=> {
					ti.contextValue = ti.contextValue?.slice(0, -4);
					this.emPrjTD.fire(ti);
				});	// 値を戻してボタン表示

				prg.report({message: '完了', increment: 100});
				setTimeout(()=> done(0), timeout);
			})
		}));
	}
	private onClickTreeItemBtn_sub(wsFld: WorkspaceFolder, ti: TreeItem, btn_nm: string, cfg: TREEITEM_CFG, done: (timeout?: number)=> void) {
		const pathWs = wsFld.uri.fsPath;
		let cmd = `cd "${pathWs}" ${statBreak()} `;
		if (! existsSync(pathWs +'/node_modules')) cmd += `npm i ${statBreak()} `;	// 自動で「npm i」

		// メイン処理
		if (cfg.npm) cmd += cfg.npm
			.replaceAll('${prj.title}', this.title)
			.replaceAll('${prj.version}', this.version);
		switch (btn_nm) {	// タスク前処理
			case 'SnUpd': this.terminateDbgSS(); this.chkLastSNVer(); break;

			case 'LibUpd':
				this.terminateDbgSS();

				ncu.run({
					packageFile: pathWs +'/package.json',
					// Defaults:
					// jsonUpgraded: true,
					// silent: true,
					upgrade: true,
					target: 'minor',
				})		// ncu -u --target minor
				.then(()=> this.onClickTreeItemBtn_sub(wsFld, ti, 'LibUpd_waited', cfg, done));
				return;
			case 'LibUpd_waited':	break;	// Promise待ち後

			case 'PrjSet':	this.openPrjSetting();	done(0);	return;
			case 'Crypto':
				this.openPrjSetting();

				window.showInformationMessage('暗号化（する / しない）を切り替えますか？', {modal: true}, 'はい')
				.then(a=> {
					if (a !== 'はい') {done(0); return;}

					this.tglCryptoMode();
					this.onClickTreeItemBtn_sub(wsFld, ti, 'Crypto_waited', cfg, done);
				});
				return;
			case 'Crypto_waited':	break;	// Promise待ち後

			case 'TaskWebDbg':
			case 'TaskAppDbg':
				this.terminateDbgSS().then(()=> {
					this.onDidTerminateDebugSession = ()=> {
						this.onDidTerminateDebugSession = ()=> {};
						done(0);
					};
					debug.startDebugging(
						wsFld,
						btn_nm === 'TaskWebDbg' ?'webデバッグ' :'appデバッグ',
					);
				});
				return;

			case 'TaskWebStop':
			case 'TaskAppStop':
				this.terminateDbgSS();
				done(0);
				return;

			case 'PackWin':
			case 'PackWin32':
			case 'PackMac':
			case 'PackLinux':
				this.terminateDbgSS();
				break;

			case 'PackFreem':
				this.terminateDbgSS();

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

		// アイコン生成
		switch (btn_nm) {
			case 'TaskWeb':
			case 'TaskApp':
			case 'PackWin':
			case 'PackWin32':
			case 'PackMac':
			case 'PackLinux':
				const fnIcon = pathWs +'/build/icon.png';
				if (! existsSync(fnIcon)) break;

				const mtPng = statSync(fnIcon).mtimeMs;
				const bIconPng = readFileSync(fnIcon);
				ensureDirSync(pathWs +'/build/icon/');
				//png2icons.setLogger(console.log);
			{
				const fn = pathWs +'/build/icon/icon.icns';
				const mt = existsSync(fn) ?statSync(fn).mtimeMs :0;
				if (mtPng > mt) {
					const b = png2icons.createICNS(bIconPng, png2icons.BILINEAR, 0);
					if (b) writeFileSync(fn, b);
				}
			}
			{
				const fn = pathWs +'/build/icon/icon.ico';
				const mt = existsSync(fn) ?statSync(fn).mtimeMs :0;
				if (mtPng > mt) {
					const b = png2icons.createICO(bIconPng, png2icons.BICUBIC2, 0, false, true);
					if (b) writeFileSync(fn, b);
				}
			}
				break;
		}

		// Windowsでの PowerShell スクリプト実行ポリシーについて警告
		switch (btn_nm) {
			case 'PackWin':
			case 'PackWin32':
				if (! is_win) break;
				if (! /(Restricted|AllSigned)/.test(
					execSync('PowerShell Get-ExecutionPolicy'))) break;

				done();
				window.showErrorMessage(`管理者権限つきのPowerShell で実行ポリシーを RemoteSigned などに変更して下さい。\n例、管理者コマンドプロンプトで）PowerShell Set-ExecutionPolicy RemoteSigned`, {modal: true}, '参考サイトを開く')
				.then(a=> {if (a) env.openExternal(Uri.parse('https://qiita.com/Targityen/items/3d2e0b5b0b7b04963750'));});
				return;
		}

		const t = new Task(
			{type: 'SKYNovel '+ btn_nm},	// definition（タスクの一意性）
			wsFld,
			cfg.label,					// name、UIに表示
			'SKYNovel',					// source
			new ShellExecution(cmd),
		);
		this.hOnEndTask[btn_nm] = ()=> done();
		switch (btn_nm) {	// タスク後処理
			case 'SnUpd':
			//case 'LibUpd':	// ここには来ない
			case 'LibUpd_waited':	// Promise待ち後
				this.hOnEndTask[btn_nm] = ()=> {this.updLocalSNVer(); done();};
				break;

			case 'Crypto_waited':
				this.hOnEndTask[btn_nm] = ()=> {this.dspCryptoMode(); done();};
				break;

			case 'PackWin':
			case 'PackWin32':
			case 'PackMac':
			case 'PackLinux':	this.hOnEndTask[btn_nm] = ()=> {
				done();
				window.showInformationMessage(
					`${cfg.label} パッケージを生成しました`,
					'出力フォルダを開く',
				).then(a=> {if (a) env.openExternal(Uri.file(pathWs +'/build/package/'))});
			};
				break;

			case 'PackFreem':	this.hOnEndTask[btn_nm] = ()=> {
				const arc = archiver.create('zip', {zlib: {level: 9},})
				.append(createReadStream(pathWs +'/doc/web.htm'), {name: 'index.html'})
				.append(createReadStream(pathWs +'/build/include/readme.txt'), {name: 'readme.txt'})
				.glob('web.js', {cwd: pathWs +'/doc/'})
				.glob('web.*.js', {cwd: pathWs +'/doc/'})
				.glob(`${
					this.isCryptoMode ?Project.fldnm_crypto_prj :'prj'
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
			};
				break;
		}
		tasks.executeTask(t)
		.then(
			re=> this.hTaskExecution[btn_nm] = re,
			rj=> console.error(`fn:WorkSpaces onClickTreeItemBtn() rj:${rj.message}`)
		);
	}
	private	hTaskExecution: {[btn_nm: string]: TaskExecution}	= {};


	private	readonly	ps: PrjSetting;
	private	openPrjSetting() {this.ps.open();}
	get title() {return this.ps.cfg.book.title}
	get version() {return this.ps.cfg.book.version}

	dispose() {this.aFSW.forEach(f=> f.dispose());}


	private	crePrj(e: Uri) {this.encIfNeeded(e.path); this.updPathJson();}
	private	chgPrj(e: Uri) {this.encIfNeeded(e.path);}
	private	delPrj(e: Uri) {
		const short_path = e.path.slice(this.lenCurPrj);
		this.regNeedCrypto.lastIndex = 0;
		removeSync(
			this.curCrypto + short_path
			.replace(this.regRepPathJson, '.bin')
			.replace(/"/, '')
		);
		this.updPathJson();

		delete this.hDiff[short_path];
		this.updDiffJson();
	}

	// プロジェクトフォルダ以下全走査で暗号化
	private initCrypto() {
		const fnc: (url: string)=> void = this.isCryptoMode
			? url=> {if (this.isDiff(url)) this.encrypter(url)}
			: url=> this.isDiff(url);
		treeProc(this.curPrj, fnc);
		this.updDiffJson();
	}
	private	encIfNeeded(url: string) {
		if (this.isCryptoMode && this.isDiff(url)) this.encrypter(url);
		this.updDiffJson();
	}
	private	updDiffJson() {writeJsonSync(this.fnDiff, this.hDiff);}
	private	readonly	LEN_CHKDIFF		= 1024;
	private	isDiff(url: string): boolean {
		const short_path = url.slice(this.lenCurPrj);
		const diff = this.hDiff[short_path];
		if (diff) {
			const url_c = url
			.replace(/\/prj\/.+$/, `/${Project.fld_crypto_prj}/${diff.cn}`)
			if (! existsSync(url_c)) return true;
		}

		let hash = 0;
		if (this.regFullCrypto.test(url)) {
			hash = crc32.str(readFileSync(url, {encoding: 'utf8'}));
		}
		else {
			const b = new Uint8Array(this.LEN_CHKDIFF);
			const fd = openSync(url, 'r');
			readSync(fd, b, 0, this.LEN_CHKDIFF, 0);
			closeSync(fd);
			hash = crc32.buf(b);
		}
		if (diff?.hash === hash) return false;

		this.hDiff[short_path] = {
			hash: hash,
			cn:	this.regNeedCrypto.test(short_path)
				? short_path.replace(
					this.REG_SPATH2HFN,
					`$1/${this.encry.uuidv5(short_path)}$2`
				)
				.replace(this.regRepPathJson, '.bin')
				: short_path,
		};
		return true;
	}
	private	readonly	REG_SPATH2HFN	= /([^\/]+)\/[^\/]+(\.\w+)/;


	private	readonly	aRepl = [
		'core/app4webpack.js',
		'core/web4webpack.js',
	];
	private	tglCryptoMode() {
		const pathPre = this.curPlg +'snsys_pre';
		this.isCryptoMode = ! this.isCryptoMode;
		if (! this.isCryptoMode) {
			removeSync(this.curCrypto);

			removeSync(pathPre);

			// SKYNovelが見に行くプロジェクトフォルダ名変更
			this.aRepl.forEach(url=> replaceFile(
				this.pathWs +'/'+ url,
				/\(hPlg, {.+?}\);/,
				`(hPlg);`,
			));

			// ビルド情報：パッケージするフォルダ名変更
			replaceFile(
				this.pathWs +'/package.json',
				new RegExp(`"${Project.fld_crypto_prj}\\/",`),
				`"prj/",`,
			);

			return;
		}

		ensureDir(this.curCrypto);

		// SKYNovelが見に行くプロジェクトフォルダ名変更
		this.aRepl.forEach(url=> replaceFile(
			this.pathWs +'/'+ url,
			/\(hPlg\);/,
			`(hPlg, {cur: '${Project.fld_crypto_prj}/', crypto: true});`,
		));

		// ビルド情報：パッケージするフォルダ名変更
		replaceFile(
			this.pathWs +'/package.json',
			/"prj\/",/,
			`"${Project.fld_crypto_prj}/",`,
		);

		// プラグインソースに埋め込む
		replaceFile(
			this.ctx.extensionPath +`/core/lib/snsys_pre.js`,
			/pia\.tstDecryptInfo\(\)/,
			this.encry.strHPass,
			pathPre +'/index.js',
		);

		this.hDiff = Object.create(null);
		this.initCrypto();
	}

	private	static	readonly LEN_ENC	= 1024 *10;
	private			readonly regDir = /(^.+)\//;
	private	async encrypter(path_src: string) {
		try {
			const short_path = path_src.slice(this.lenCurPrj);
			const path_enc = this.curCrypto + this.hDiff[short_path].cn;
			if (! this.regNeedCrypto.test(path_src)) {
				ensureLink(path_src, path_enc);
				//.catch((e: any)=> console.error(`encrypter cp1 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラー
					// となるだけなので
				return;
			}

			if (this.regFullCrypto.test(short_path)) {
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
							const dir = this.regDir.exec(path);
							if (dir && this.ps.cfg.code[dir[1]]) continue;

							hExt2N[ext] = this.hDiff[path].cn;
						}
					}
					s = JSON.stringify(hPath);
				}
				await outputFile(path_enc, this.encry.enc(s));
				return;
			}

			const dir = this.regDir.exec(short_path);
			if (dir && this.ps.cfg.code[dir[1]]) {
				ensureLink(path_src, path_enc);
				//.catch((e: any)=> console.error(`encrypter cp2 ${e}`));
					// ファイル変更時に「Error: EEXIST: file already exists」エラー
					// となるだけなので
				return;
			}

			let cnt_code = Project.LEN_ENC;
			let ite_buf = 2;
			const bh = new Uint8Array(ite_buf + cnt_code);
			bh[0] = 0;	// bin ver
			bh[1] = this.hExt2N[path.extname(short_path).slice(1)] ?? 0;

			const rs = createReadStream(path_src)
			.on('error', (e :any)=> console.error(`encrypter rs=%o`, e));

			const u2 = path_enc.replace(/\.[^.]+$/, '.bin');
			ensureFileSync(u2);	// touch
			const ws = createWriteStream(u2)
			.on('error', (e :any)=> console.error(`encrypter ws=%o`, e));

			const tr = new EncryptorTransform(this.encry, path_src);
			rs.pipe(tr).pipe(ws);
		}
		catch (e) {console.error(`encrypter other ${e.message}`);}
	}


	private	readonly	regPlgAddTag = /(?<=\.\s*addTag\s*\(\s*)(["'])(.+?)\1/g;
	private	updPlugin() {
		if (! existsSync(this.curPlg)) return;

		const h4json: {[def_nm: string]: number} = {};
		const hDefPlg: {[def_nm: string]: Location} = {};
		foldProc(this.curPlg, ()=> {}, nm=> {
			h4json[nm] = 0;

			const path = `${this.curPlg}${nm}/index.js`;
			if (! existsSync(path)) return;

			const txt = readFileSync(path, 'utf8');
			let a;
			// 全ループリセットかかるので不要	.lastIndex = 0;	// /gなので必要
			while ((a = this.regPlgAddTag.exec(txt))) {
				const nm = a[2];
				const len_nm = nm.length;
				const idx_nm = this.regPlgAddTag.lastIndex -len_nm -1;

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
		this.codSpt.setHDefPlg(hDefPlg);

		outputFile(this.curPlg.slice(0, -1) +'.js', `export default ${JSON.stringify(h4json)};`)
		.then(()=> this.initTask())
		.catch((err: any)=> console.error(`Project updPlugin ${err}`));
	}
	private initTask() {
		if (! ActivityBar.aReady[eTreeEnv.NPM]) return;

		this.initTask = ()=> {};	// onceにする
		// 起動時にビルドが走るのはこれ
		// 終了イベントは WorkSpaces.ts の tasks.onDidEndTaskProcess で
		let cmd = `cd "${this.pathWs}" ${statBreak()} `;
		if (! existsSync(this.pathWs +'/node_modules')) cmd += `npm i ${statBreak()} `;		// 自動で「npm i」
		cmd += 'npm run webpack:dev';
		const type = 'SKYNovel auto';
		const name = '起動時自動ビルド';
		const t = new Task(
			{type},			// definition（タスクの一意性）
			this.wsFld!,
			name,			// name、UIに表示
			'SKYNovel',		// source
			new ShellExecution(cmd),
		);

		this.enableButton(false);
		window.withProgress({
			location	: ProgressLocation.Notification,
			title		: name,
			cancellable	: false
		}, _prg=> new Promise(async done=> {
			tasks.executeTask(t)
			.then(undefined, rj=> console.error(`Project rebuildTask() rj:${rj.message}`));

			let fnc = (e: TaskProcessEndEvent)=> {
				if (e.execution.task.definition.type !== type) return;
				fnc = ()=> {};
				this.enableButton(true);
				done(0);
			};
			tasks.onDidEndTaskProcess(e=> fnc(e));
		}));
	}
	finInitTask() {
		this.updPlugin();
		this.codSpt.finInitTask();
	}


	private	hPathFn2Exts	: IFn2Path		= {};
	private	async updPathJson() {
		try {
			this.hPathFn2Exts = this.get_hPathFn2Exts(this.curPrj);
			await outputJson(this.curPrj +'path.json', this.hPathFn2Exts);
			this.codSpt.updPath(this.hPathFn2Exts);
			if (this.isCryptoMode) this.encrypter(this.curPrj +'path.json');
		}
		catch (err) {console.error(`Project updPathJson ${err}`);}
	}
	private	readonly regSprSheetImg = /^(.+)\.(\d+)x(\d+)\.(png|jpe?g)$/;
	private get_hPathFn2Exts($cur: string): IFn2Path {
		const hFn2Path: IFn2Path = {};

	//	const REG_FN_RATE_SPRIT	= /(.+?)(?:%40(\d)x)?(\.\w+)/;
		// ｛ファイル名：｛拡張子：パス｝｝形式で格納。
		//		検索が高速なハッシュ形式。
		//		ここでの「ファイル名」と「拡張子」はスクリプト経由なので
		//		URLエンコードされていない物を想定。
		//		パスのみURLエンコード済みの、File.urlと同様の物を。
		//		あとで実際にロード関数に渡すので。
		foldProc($cur, ()=> {}, (dir: string)=> {
			const wd = path.resolve($cur, dir);
			foldProc(wd, (url, nm)=> {
				// スプライトシート用json自動生成機能
				// breakline.5x20.png などから breakline.json を（無ければ）生成
				this.addPath(hFn2Path, dir, nm);

				const a2 = nm.match(this.regNeedHash);
				if (a2) {
					const s = readFileSync(url, {encoding: 'utf8'});
					const h = RIPEMD160(s).toString(enc.Hex);
					const snm = nm.slice(0, -a2[0].length);
					hFn2Path[snm][a2[1] +':RIPEMD160'] = h;
				}
				const a = nm.match(this.regSprSheetImg);
				if (! a) return;

				const fnJs = path.resolve(wd, a[1] +'.json');
				if (existsSync(fnJs)) return;

				const size = img_size(url);
				const xLen = uint(a[2]);
				const yLen = uint(a[3]);
				const w = size.width /xLen;
				const h = size.height /yLen;
				const basename = a[1];
				const ext = a[4];

				const oJs :any = {
					frames: {},
					meta: {
						app: 'skynovel',
						version: '1.0',
						image: a[0],
						format: 'RGBA8888',
						size: {w: size.width, h :size.height},
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
								: {x: 0, y: 0, w: size.width, h :size.height},
							sourceSize	: {w: w, h :h},
							pivot		: {x: 0.5, y: 0.5},
						};
					}
				}
				writeFileSync(fnJs, JSON.stringify(oJs));
				window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${a[1]}.json を自動生成しました`);

				this.addPath(hFn2Path, dir, `${a[1]}.json`);
			}, ()=> {});
		});

		return hFn2Path;
	}
	private addPath(hFn2Path: IFn2Path, dir: string, nm: string) {
		const p = path.parse(nm);
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
				const fn = this.curPrj + (id === 1 ?hExts[ext] :dir +'/'+ nm);
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

	private	userFnTail	= '';
	private	readonly	regPath = /([^\/\s]+)\.([^\d]\w+)/;
			// 4 match 498 step(~1ms)  https://regex101.com/r/tpVgmI/1
	private searchPath(path: string, extptn = ''): string {
		if (! path) throw '[searchPath] fnが空です';

		const a = path.match(this.regPath);
		let fn = a ?a[1] :path;
		const ext = a ?a[2] :'';
		if (this.userFnTail) {
			const utn = fn +'@@'+ this.userFnTail;
			if (utn in this.hPathFn2Exts) {
				if (extptn === '') fn = utn;
				else for (let e3 in this.hPathFn2Exts[utn]) {
					if (`|${extptn}|`.indexOf(`|${e3}|`) === -1) continue;

					fn = utn;
					break;
				}
			}
		}
		const h_exts = this.hPathFn2Exts[fn];
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

}
