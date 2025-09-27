/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {is_win, replaceRegsFile} from './CmnLib';
import type {WorkSpaces} from './WorkSpaces';
const AdmZip = require('adm-zip');

import type {TreeDataProvider, ExtensionContext, WebviewPanel} from 'vscode';
import {TreeItem, window, commands, Uri, EventEmitter, ViewColumn, ProgressLocation} from 'vscode';
import {exec} from 'child_process';
import {tmpdir} from 'os';
import {copyFile, mkdirs, existsSync, move, outputJson, readFile, readJson, remove, writeFile} from 'fs-extra';

const nNodeReqVer = 22_020_000;


export const enum eTreeEnv {
	NODE = 0,
	NPM,
	SKYNOVEL_VER,
	TEMP_VER,
	PY_FONTTOOLS,
};

export function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i=0; i<32; ++i) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

let extPath = '';
export function oIcon(name: string) {return {
	light	: Uri.file(extPath +`/res/light/${name}.svg`),
	dark	: Uri.file(extPath +`/res/dark/${name}.svg`),
}};


export class ActivityBar implements TreeDataProvider<TreeItem> {
	//MARK: 処理冒頭
	static start(ctx: ExtensionContext) {
		extPath = ctx.extensionPath;

		ActivityBar.#actBar = new ActivityBar(ctx);
	}
	static #actBar: ActivityBar;
	static stop() {ActivityBar.#actBar.#dispose()}


	#workSps: WorkSpaces;


	//MARK: コンストラクタ
	private constructor(private readonly ctx: ExtensionContext) {
		Promise.all([
			import('./WorkSpaces'),
		]).then(async ([{WorkSpaces}])=> {
			ctx.subscriptions.push(this.#workSps = new WorkSpaces(ctx, this));
			this.#canTempWizard = true;
			await this.#workSps.start();

			// other
			await Promise.allSettled([
				this.#chkEnv(()=> ctx.subscriptions.push(
					window.registerTreeDataProvider('skynovel-dev', this),
					commands.registerCommand('skynovel.TempWizard', ()=> this.#openTempWizard()),
					commands.registerCommand('skynovel.refreshEnv', ()=> this.#refreshEnv()),	// refreshボタン
					commands.registerCommand('skynovel.dlNode', ()=> this.#openEnvInfo()),
				)),
				import('./TreeDPDoc')
				.then(({TreeDPDoc})=> ctx.subscriptions.push(
					window.registerTreeDataProvider('skynovel-doc', new TreeDPDoc(ctx)),
				)),
				import('./ToolBox')
				.then(({ToolBox})=> ctx.subscriptions.push(ToolBox.init(ctx))),
			]);
		});
	}

	#dispose() {
		if (this.#pnlWV) this.#pnlWV.dispose();
	}

	//MARK: 環境確認
	async #chkEnv(finish: (ok: boolean)=> void) {
		this.#aTiEnv = this.#aEnv.map(v=> {
			const ti = new TreeItem(v.label);
			if (v.label) ti.iconPath = oIcon(v.icon);
			ti.contextValue = v.label;
			return ti;
		});

		const tiNode = this.#aTiEnv[eTreeEnv.NODE]!;
		const tiNpm = this.#aTiEnv[eTreeEnv.NPM]!;
		const tiPFT = this.#aTiEnv[eTreeEnv.PY_FONTTOOLS]!;
		ActivityBar.aReady[eTreeEnv.NODE] = false;
		ActivityBar.aReady[eTreeEnv.NPM] = false;
		ActivityBar.aReady[eTreeEnv.PY_FONTTOOLS] = false;

		await Promise.allSettled([
			exec('pip list', async (e, stdout)=> {
				if (e) {
					tiPFT.description = `-- pip error`;
					tiPFT.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiPFT);
					finish(false);
					return;
				}
				if (! /^fonttools\s/gm.test(stdout)
				|| ! /^brotli\s/gm.test(stdout)) await new Promise<void>(re=> exec(`pip install ${is_win ?'--user ' :''}fonttools brotli`, e=> {
					if (e) {
						tiPFT.description = `-- install失敗`;
						tiPFT.iconPath = oIcon('error');
						this.#onDidChangeTreeData.fire(tiPFT);
						finish(false);
						return;
					}
					re();
				}));
				ActivityBar.aReady[eTreeEnv.PY_FONTTOOLS] = true;
				tiPFT.description = `-- ready`;
				tiPFT.iconPath = oIcon('python-brands');
				this.#onDidChangeTreeData.fire(tiPFT);

				// fonttools用、環境変数PATHに pyftsubset.exe があるパスを追加
				if (is_win) {
					exec('python -m site --user-site', async (e, stdout)=> {
						if (e) {finish(false); return;}		// ありえないが
						const path = stdout.slice(0, -15) +'Scripts\\;';
						const col = this.ctx.environmentVariableCollection;
						col.prepend('PATH', path);
					});
				}
			}),
			new Promise<void>(re=> exec('node -v', (e, stdout)=> {
				if (e) {
					tiNode.description = `-- 見つかりません`;
					tiNode.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiNode);

					tiNpm.description = `-- （割愛）`;
					tiNpm.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiNpm);
					finish(false);
					return;
				}

				const vNode = String(stdout).slice(1, -1);
				const splVNode = vNode.split('.');
				const nVNode = Number(splVNode[0]) *1_000_000
					+Number(splVNode[1]) *1_000 +Number(splVNode[2]);
					// compare-versions だと windows10 で不具合になるので手作りに
				if (nVNode < nNodeReqVer) {
					tiNode.description = `-- ${vNode} (${(nNodeReqVer / 1_000_000).toFixed(3)}.0 以上必須)`;
					tiNode.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiNode);

					tiNpm.description = `-- （割愛）`;
					tiNpm.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiNpm);
					finish(false);
					return;
				}
				ActivityBar.aReady[eTreeEnv.NODE] = true;
				tiNode.description = `-- ${vNode}`;
				tiNode.iconPath = oIcon('node-js-brands');
				this.#onDidChangeTreeData.fire(tiNode);
				re();
			})),
			new Promise<void>(re=> exec('npm -v', (e, stdout)=> {
				if (e) {
					tiNpm.description = `-- 見つかりません`;
					tiNpm.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiNpm);
					finish(false);
					return;
				}
				ActivityBar.aReady[eTreeEnv.NPM] = true;
				tiNpm.description = `-- ${stdout.trimEnd()}`;
				tiNpm.iconPath = oIcon('npm-brands');
				this.#onDidChangeTreeData.fire(tiNpm);
				re();
			})),
		]).then(()=> finish(true));
	}
	readonly #aEnv: {label: string, icon: string}[]	= [
		{icon: 'node-js-brands',label: 'Node.js',},
		{icon: 'npm-brands',	label: 'npm',},
		{icon: 'skynovel',		label: 'SKYNovel（最新）',},
		{icon: 'skynovel',		label: 'テンプレ（最新）',},
		{icon: 'python-brands',	label: 'fonttools',},
	];
	#aTiEnv: TreeItem[] = [];
	static aReady	= [false, false, false, false, false];


	// refreshEnvボタン
	async #refreshEnv() {
		this.#workSps.enableBtn(false);
		await this.#chkEnv(async ok=> {
			this.#workSps.enableBtn(ok);
			if (ok) await this.chkLastSNVer(this.#workSps.aLocalSNVer);
			else this.#openEnvInfo();
		});
	}
	readonly #onDidChangeTreeData = new EventEmitter<TreeItem | undefined>;
	readonly onDidChangeTreeData = this.#onDidChangeTreeData.event;

	readonly getTreeItem = (t: TreeItem)=> t;

	// 起動時？　と refreshボタンで呼ばれる
	getChildren(t?: TreeItem): Thenable<TreeItem[]> {
		if (! t) return Promise.resolve(this.#aTiEnv);

		const ret: TreeItem[] = [];
		if (t.label === 'Node.js') this.#aTiEnv[eTreeEnv.NODE]!.iconPath = oIcon((ActivityBar.aReady[eTreeEnv.NODE]) ?'node-js-brands' :'error');
		return Promise.resolve(ret);
	}

	//MARK: ネットの更新確認
	async chkLastSNVer(aLocalSNVer: {verSN: string, verTemp: string}[]) {
		let newVerSN = '';
		let newVerTemp = '';
		await Promise.allSettled([
			fetch('https://raw.githubusercontent.com/famibee/skynovel_esm/main/package.json')
			.then(async res=> {
				const json = await res.json();
				newVerSN = json.version;
				const tiSV = this.#aTiEnv[eTreeEnv.SKYNOVEL_VER]!;
				tiSV.description = '-- ' + newVerSN;
				ActivityBar.#actBar.#onDidChangeTreeData.fire(tiSV);
			}),
			fetch('https://raw.githubusercontent.com/famibee/tmp_esm_uc/main/CHANGELOG.md')
			.then(async res=> {
				const txt = await res.text();
				newVerTemp = txt.match(/## v(.+)\s/)?.[1] ?? '';
				const tiSV = this.#aTiEnv[eTreeEnv.TEMP_VER]!;
				tiSV.description = '-- ' + newVerTemp;
				ActivityBar.#actBar.#onDidChangeTreeData.fire(tiSV);
			}),
		]);
		aLocalSNVer.forEach(async o=> {
			if (o.verTemp && newVerTemp !== o.verTemp) {
				window.showInformationMessage(`更新があります。【ベース更新】ボタンを押してください（テンプレ ${o.verTemp}->${newVerTemp}）`);
				return;
			}

			if (o.verSN === '' || o.verSN.startsWith('ile:') || o.verSN.startsWith('./')) return;
			if (newVerSN !== o.verSN) window.showInformationMessage(`更新があります。【ベース更新】ボタンを押してください（エンジン ${o.verSN}->${newVerSN}）`);
		});
	}

	//MARK: 環境確認パネル
	#pnlWV: WebviewPanel | null = null;
	#openEnvInfo() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.#pnlWV) {this.#pnlWV.reveal(column); return;}

		const pathDoc = this.ctx.extensionPath +'/views';
		const uriDoc = Uri.file(pathDoc);
		this.#pnlWV = window.createWebviewPanel('SKYNovel-envinfo', '開発環境準備', column || ViewColumn.One, {
			enableScripts: false,
			localResourceRoots: [uriDoc],
		});
		this.#pnlWV.onDidDispose(()=> this.#pnlWV = null);	// 閉じられたとき

		readFile(pathDoc +'/envinfo.htm', 'utf-8', (e, data)=> {
			if (e) throw e;

			const wv = this.#pnlWV!.webview;
			this.#pnlWV!.webview.html = data
			.replaceAll('${webview.cspSource}', wv.cspSource)
			.replaceAll(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(uriDoc)}/`);
		});
	}

	//MARK: テンプレ選択パネル
	#openTempWizard() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.#pnlWV) {this.#pnlWV.reveal(column); return;}

		const path_doc = this.ctx.extensionPath +'/views';
		const uf_path_doc = Uri.file(path_doc);
		const wp = this.#pnlWV = window.createWebviewPanel('SKYNovel-tmpwiz', 'テンプレートから始める', column || ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [uf_path_doc],
		});
		wp.onDidDispose(()=> this.#pnlWV = null);	// 閉じられたとき

		wp.webview.onDidReceiveMessage(async m=> {
//console.log(`fn:ActivityBar.ts line:198 common m:%o`, m);
			switch (m.cmd) {
			case 'get':		wp.webview.postMessage({cmd: 'res', o: {}});	break;
			case 'info':	window.showInformationMessage(m.text); break;

			case 'input':
				if (m.id !== 'save_ns') break;

				// プロジェクトフォルダ名（半角英数記号）を指定
				this.#save_ns = m.val;
//console.log(`fn:ActivityBar.ts #openTempWizard id:${m.id} v:${m.val} chk:${this.#chkSave_ns()}`);
				wp.webview.postMessage({cmd: 'vld', o: {
					id		: 'save_ns',
					valid	: this.#chkSave_ns(),
				}});
				break;

			case 'tmp_cjs_hatsune':
			case 'tmp_cjs_uc':
			case 'tmp_cjs_sample':
			case 'tmp_esm_uc':
				if (! this.#chkSave_ns()) break;
				if (! this.#canTempWizard) {
					window.showInformationMessage('拡張機能の起動中です。しばしお待ち下さい');
					break;
				}

				// プロジェクトフォルダを置くパスを選んでもらう
				const fileUri = await window.showOpenDialog({
					title	: 'プロジェクトフォルダを置く場所を指定して下さい',
					canSelectMany	: false,
					openLabel		: 'フォルダを選択',
					canSelectFiles	: false,
					canSelectFolders: true,
				});
				const path_dl = fileUri?.[0]?.fsPath;
				if (! path_dl) break;	// キャンセル

				// 既存のフォルダがある際はエラー中断で検討させる
				const fnTo = path_dl +'/'+ this.#save_ns;
				if (existsSync(fnTo)) {
					window.showErrorMessage(`既存のフォルダ ${this.#save_ns} があります`, {detail: 'フォルダ名を変えるか、既存のフォルダを削除して下さい', modal: true});
					break;
				}

				// テンプレートからプロジェクト作成
				this.#crePrjFromTmp(m.cmd, fnTo);
				break;
			}
		}, false);

		readFile(path_doc +'/tmpwiz.htm', 'utf-8', (e, data)=> {
			if (e) throw e;

			const wv = this.#pnlWV!.webview;
			this.#pnlWV!.webview.html = data
			.replaceAll('${webview.cspSource}', wv.cspSource)
			.replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(uf_path_doc)}/`);
		});
	}
		#canTempWizard	= false;
	//MARK: テンプレから作成
	readonly	#crePrjFromTmp = (nm: string, fnTo: string)=> window.withProgress({
		location	: ProgressLocation.Notification,
		title		: 'テンプレートからプロジェクト作成',
		cancellable	: true,
	}, async (prg, tknCancel)=> {
		const td = tmpdir() +`/${nm}/`;
		await remove(td);
		await mkdirs(td);
		const pathZip = td +`${nm}.zip`;
		await remove(pathZip);
		const ac = new AbortController;
		let fncAbort = ()=> ac.abort();
		tknCancel.onCancellationRequested(()=> {fncAbort(); return remove(td)});

		return new Promise<void>((re, rj)=> {
			// == zipダウンロード＆解凍
			prg.report({increment: 10, message: 'ダウンロード中',});
			const {signal} = ac;
			fetch(`https://github.com/famibee/${nm}/archive/main.zip`, {signal})
			.then(async res=> {
				fncAbort = ()=> {};
				prg.report({increment: 40, message: 'ZIP生成中',});
				if (tknCancel.isCancellationRequested || ! res.ok) {rj(); return;}

				const ab = await res.arrayBuffer();
				await writeFile(pathZip, Buffer.from(ab));
				prg.report({increment: 10, message: 'ZIP解凍中',});
				new AdmZip(pathZip).extractAllTo(td, true);	// overwrite
				if (tknCancel.isCancellationRequested) {rj(); return;}

				// == ファイル調整
				prg.report({increment: 10, message: 'ファイル調整',});

				// prj.json の置換
				const pathUnZip = td +`${nm}-main/`;
				const fnPrjJs = pathUnZip +'doc/prj/prj.json';
				const oPrj = await readJson(fnPrjJs, {encoding: 'utf8'});
				oPrj.save_ns = this.#save_ns;
				oPrj.debuger_token = '';
				await outputJson(fnPrjJs, oPrj, {spaces: '\t'});

				// package.json の置換
				const fnPkgJs = pathUnZip +'package.json';
				replaceRegsFile(fnPkgJs, [
					[
						/("name"\s*:\s*").*(")/,
						`$1${this.#save_ns}$2`,
					],
					[
						/("(?:appBundleId|appId)"\s*:\s*").*(")/g,
						`$1com.fc2.blog.famibee.skynovel.${this.#save_ns}$2`,
					],
					[
						/("artifactName"\s*:\s*").*(")/,
						`$1\${name}-\${version}-\${arch}.\${ext}$2`,
					],
				], false);

				// フォルダ名変更と移動
				await move(pathUnZip, fnTo);

				prg.report({increment: 30, message: '完了。フォルダを開きます',});
				setTimeout(()=> {
					if (tknCancel.isCancellationRequested) {rj(); return;}

					// フォルダをワークスペースで開く
					commands.executeCommand('vscode.openFolder', Uri.file(fnTo), false);
					re();
				}, 4000);
			})
			.catch(reason=> window.showErrorMessage(`エラーです:${reason}`));
		});
	});
	#save_ns	= '';
	#chkSave_ns = ()=> /^([a-zA-Z0-9!-/:-@¥[-`{-~]{1,})$/.test(this.#save_ns);	// https://regex101.com/r/JGxtnR/1
		// 正規表現を可視化してまとめたチートシート - Qiita https://qiita.com/grrrr/items/0b35b5c1c98eebfa5128


	//MARK: テンプレから更新
	readonly updPrjFromTmp = (fnTo: string)=> window.withProgress({
		location	: ProgressLocation.Notification,
		title		: 'テンプレートからプロジェクト更新',
		cancellable	: true,
	}, async (prg, tknCancel)=> {
		if (! existsSync(fnTo + '/CHANGELOG.md')) return Promise.reject();

		const oOldPkgJS = await readJson(fnTo +'/package.json', {encoding: 'utf8'});
		const nm = oOldPkgJS.repository.url.match(/git@github\.com:famibee\/(\w+)\./)?.[1] ?? '';

		const td = tmpdir() +'/SKYNovel/';
		await remove(td);
		await mkdirs(td);
		const pathZip = td +`${nm}.zip`;
		const ac = new AbortController;
		let fncAbort = ()=> ac.abort();
		tknCancel.onCancellationRequested(()=> {fncAbort(); return remove(td)});

		return new Promise<void>((re, rj)=> {
			// == zipダウンロード＆解凍
			prg.report({increment: 10, message: 'ダウンロード中',});
			const {signal} = ac;
			fetch(`https://github.com/famibee/${nm}/archive/main.zip`, {signal})
			.then(async res=> {
				fncAbort = ()=> {};
				prg.report({increment: 40, message: 'ZIP生成中',});
				if (tknCancel.isCancellationRequested || ! res.ok) {rj(); return;}

				const ab = await res.arrayBuffer();
				await writeFile(pathZip, Buffer.from(ab));
				prg.report({increment: 10, message: 'ZIP解凍中',});
				new AdmZip(pathZip).extractAllTo(td, true);	// overwrite
				if (tknCancel.isCancellationRequested) {rj(); return;}

				// == ファイル調整
				prg.report({increment: 10, message: 'ファイル調整',});

				const pathUnZip = td +`${nm}-main/`;
				const copy = (fn: string, chkExists = false)=> {
					if (chkExists && ! existsSync(fnTo +'/'+ fn)) return;
					return copyFile(pathUnZip + fn, fnTo +'/'+ fn)
				};
				// build/		// しばしノータッチ

				const is_new_tmp = existsSync(pathUnZip +'src/plugin/');
				const fld_src = is_new_tmp ?'src' :'core';
				copy(`${fld_src}/plugin/humane/index.js`, true);
				// src/app4webpack.js	やや難
				copy(`${fld_src}/wds.config.js`);
				// src/web4webpack.js	やや難
				copy(`${fld_src}/webpack.config.js`);

				// doc/prj/		// しばしノータッチ

				copy('CHANGELOG.md');

				// package.json
				const oNewPkgJS = await readJson(pathUnZip +'package.json', {encoding: 'utf8'});
				const lib_name = `@famibee/skynovel${is_new_tmp ?'_esm': ''}`
				const v = oOldPkgJS.dependencies[lib_name];
				if (v.startsWith('ile:') || v.startsWith('./')) {
					oNewPkgJS.dependencies[lib_name] = v;
				}
				await outputJson(fnTo +'/package.json', {
					...oOldPkgJS,
					dependencies	: oNewPkgJS.dependencies,
					devDependencies	: oNewPkgJS.devDependencies,
					scripts			: oNewPkgJS.scripts,
				}, {spaces: '\t'});
					// TODO: プラグインはまた別個にライブラリを考慮し更新

				prg.report({increment: 30, message: 'ファイル準備完了',});
				setTimeout(re, 4000);
			})
			.catch(reason=> window.showErrorMessage(`エラーです:${reason}`));
		});
	});

}
