/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, replaceFile, setCtx4} from './CmnLib';
import {WorkSpaces} from './WorkSpaces';
import {ToolBox} from './ToolBox';
import {TreeDPDoc} from './TreeDPDoc';
import fetch from 'node-fetch';
const AdmZip = require('adm-zip');

import {TreeDataProvider, TreeItem, ExtensionContext, window, commands, Uri, EventEmitter, Event, WebviewPanel, ViewColumn, ProgressLocation} from 'vscode';
import {exec} from 'child_process';
import {tmpdir} from 'os';
import {copyFileSync, existsSync, moveSync, outputJsonSync, readFile, readJsonSync, removeSync} from 'fs-extra';

export enum eTreeEnv {
	NODE = 0,
	NPM,
	SKYNOVEL_VER,
	TEMP_VER,
};

export class ActivityBar implements TreeDataProvider<TreeItem> {
	static start(ctx: ExtensionContext) {
		setCtx4(ctx);

		ActivityBar.#actBar = new ActivityBar(ctx);
	}
	static #actBar: ActivityBar;
	static stop() {ActivityBar.#actBar.#dispose();}


	readonly #aEnv: {label: string, icon: string}[]	= [
		{label: 'Node.js',	icon: 'node-js-brands'},
		{label: 'npm',		icon: 'npm-brands'},
		{label: 'SKYNovel（最新）',		icon: 'skynovel'},
		{label: 'テンプレ（最新）',		icon: 'skynovel'},
	];
	readonly #aTiEnv: TreeItem[] = [];
	static aReady	= [false, false, false, false];

	#workSps: WorkSpaces;
	#tlBox	: ToolBox;


	private constructor(private readonly ctx: ExtensionContext) {
		this.#aTiEnv = this.#aEnv.map(v=> {
			const ti = new TreeItem(v.label);
			if (v.label) ti.iconPath = oIcon(v.icon);
			ti.contextValue = v.label;
			return ti;
		});
		ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-dev', this));

		this.#chkEnv(()=> {
			ctx.subscriptions.push(commands.registerCommand('skynovel.refreshEnv', ()=> this.#refreshEnv()));	// refreshボタン
			ctx.subscriptions.push(commands.registerCommand('skynovel.dlNode', ()=> this.#openEnvInfo()));
			ctx.subscriptions.push(commands.registerCommand('skynovel.TempWizard', ()=> this.#openTempWizard()));

			this.#workSps = new WorkSpaces(ctx, this);
			ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-ws', this.#workSps));

			this.#tlBox = new ToolBox(ctx);
			ctx.subscriptions.push(window.registerWebviewViewProvider('skynovel-tb', this.#tlBox));

			ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-doc', new TreeDPDoc(ctx)));
		});
	}

	#dispose() {
		if (this.#pnlWV) this.#pnlWV.dispose();
		this.#workSps.dispose();
		this.#tlBox.dispose();
	}

	// 環境チェック
	async #chkEnv(finish: (ok: boolean)=> void) {
		const tiNode = this.#aTiEnv[eTreeEnv.NODE];
		const tiNpm = this.#aTiEnv[eTreeEnv.NPM];
		ActivityBar.aReady[eTreeEnv.NODE] = false;
		ActivityBar.aReady[eTreeEnv.NPM] = false;
		await new Promise<void>(re=> exec('node -v', (err, stdout)=> {
			if (err) {
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
			const nVNode = Number(splVNode[0]) *1000000
				+Number(splVNode[1]) *1000 +Number(splVNode[2]);
				// compare-versions だと windows10 で不具合になるので手作りに
			if (nVNode < 16009000) {
				tiNode.description = `-- ${vNode} (16.9.0 以上必須)`;
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
		}));
		await new Promise<void>(re=> exec('npm -v', (err, stdout)=> {
			if (err) {
				tiNpm.description = `-- 見つかりません`;
				tiNpm.iconPath = oIcon('error');
				this.#onDidChangeTreeData.fire(tiNpm);
				finish(false);
				return;
			}
			ActivityBar.aReady[eTreeEnv.NPM] = true;
			tiNpm.description = `-- ${stdout}`;
			tiNpm.iconPath = oIcon('npm-brands');
			this.#onDidChangeTreeData.fire(tiNpm);
			re();
		}));
		finish(true);
	}

	// refreshEnvボタン
	#refreshEnv() {
		this.#workSps.enableBtn(false);
		this.#chkEnv(ok=> {
			this.#workSps.enableBtn(ok);
			if (ok) this.#workSps.refreshEnv();
			else this.#openEnvInfo();
		});
	}
	readonly #onDidChangeTreeData: EventEmitter<TreeItem | undefined> = new EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: Event<TreeItem | undefined> = this.#onDidChangeTreeData.event;

	readonly getTreeItem = (t: TreeItem)=> t;

	// 起動時？　と refreshボタンで呼ばれる
	getChildren(t?: TreeItem): Thenable<TreeItem[]> {
		if (! t) return Promise.resolve(this.#aTiEnv);

		const ret: TreeItem[] = [];
		if (t.label === 'Node.js') this.#aTiEnv[eTreeEnv.NODE].iconPath = oIcon((ActivityBar.aReady[eTreeEnv.NODE]) ?'node-js-brands' :'error');
		return Promise.resolve(ret);
	}

	async chkLastSNVer(aLocalSNVer: {verSN: string, verTemp: string}[]) {
		let newVerSN = '';
		let newVerTemp = '';
		await Promise.allSettled([
			fetch('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json')
			.then(res=> res.json())
			.then(json=> {
				newVerSN = json.version;
				const tiSV = this.#aTiEnv[eTreeEnv.SKYNOVEL_VER];
				tiSV.description = '-- ' + newVerSN;
				ActivityBar.#actBar.#onDidChangeTreeData.fire(tiSV);
			}),
			fetch('https://raw.githubusercontent.com/famibee/SKYNovel_uc/master/CHANGELOG.md')
			.then(res=> res.text())
			.then(txt=> {
				newVerTemp = txt.match(/## v(.+)\s/)?.[1] ?? '';
				const tiSV = this.#aTiEnv[eTreeEnv.TEMP_VER];
				tiSV.description = '-- ' + newVerTemp;
				ActivityBar.#actBar.#onDidChangeTreeData.fire(tiSV);
			}),
		]);
		aLocalSNVer.forEach(async o=> {
			if (o.verTemp && newVerTemp !== o.verTemp) {
				window.showInformationMessage(`更新があります。【ベース更新】ボタンを押してください`);
				return;
			}

			if (o.verSN === '' || o.verSN.slice(0, 4) === 'ile:') return;
			if (newVerSN !== o.verSN) window.showInformationMessage(`更新があります。【ベース更新】ボタンを押してください`);
		});
	}

	#pnlWV: WebviewPanel | null = null;
	#openEnvInfo() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.#pnlWV) {this.#pnlWV.reveal(column); return;}

		const path_doc = this.ctx.extensionPath +'/views';
		const uf_path_doc = Uri.file(path_doc);
		this.#pnlWV = window.createWebviewPanel('SKYNovel-envinfo', '開発環境準備', column || ViewColumn.One, {
			enableScripts: false,
			localResourceRoots: [uf_path_doc],
		});
		this.#pnlWV.onDidDispose(()=> this.#pnlWV = null);	// 閉じられたとき

		readFile(path_doc +'/envinfo.htm', 'utf-8', (err, data)=> {
			if (err) throw err;

			const wv = this.#pnlWV!.webview;
			this.#pnlWV!.webview.html = data
			.replaceAll('${webview.cspSource}', wv.cspSource)
			.replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(uf_path_doc)}/`);
		});
	}

	#openTempWizard() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.#pnlWV) {this.#pnlWV.reveal(column); return;}

		const path_doc = this.ctx.extensionPath +'/views';
		const uf_path_doc = Uri.file(path_doc);
		const wv = this.#pnlWV = window.createWebviewPanel('SKYNovel-tmpwiz', 'テンプレートから始める', column || ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [uf_path_doc],
		});
		wv.onDidDispose(()=> this.#pnlWV = null);	// 閉じられたとき

		wv.webview.onDidReceiveMessage(m=> {
//console.log(`fn:ActivityBar.ts line:198 common m:%o`, m);
			switch (m.cmd) {
			case 'get':		wv.webview.postMessage({cmd: 'res', o: {}});	break;
			case 'info':	window.showInformationMessage(m.text); break;

			case 'input':
				if (m.id !== 'save_ns') break;

				// プロジェクトフォルダ名（半角英数記号）を指定
				this.#save_ns = m.val;
//console.log(`fn:ActivityBar.ts line:201 id:${m.id} v:${m.val}`);
				wv.webview.postMessage({cmd: 'vld', o: {
					id		: 'save_ns',
					valid	: this.#chkSave_ns(),
				}});
				break;

			case 'tmp_hatsune':
			case 'tmp_uc':
			case 'tmp_sample':
				if (! this.#chkSave_ns()) break;

				// プロジェクトフォルダを置くパスを選んでもらう
				window.showOpenDialog({
					title	: 'プロジェクトフォルダを置く場所を指定して下さい',
					canSelectMany	: false,
					openLabel		: 'フォルダを選択',
					canSelectFiles	: false,
					canSelectFolders: true,
				}).then(fileUri=> {
					const path_dl = fileUri?.[0]?.fsPath;
					if (! path_dl) return;	// キャンセル

					// 既存のフォルダがある際はエラー中断で検討させる
					const fnTo = path_dl +'/'+ this.#save_ns;
					if (existsSync(fnTo)) {
						window.showErrorMessage(`既存のフォルダ ${this.#save_ns} があります`, {detail: 'フォルダ名を変えるか、既存のフォルダを削除して下さい', modal: true});
						return;
					}

					// テンプレートからプロジェクト作成
					this.#crePrjFromTmp(m.cmd.slice(4), fnTo);
				})
				break;
			}
		}, false);

		readFile(path_doc +'/tmpwiz.htm', 'utf-8', (err, data)=> {
			if (err) throw err;

			const wv = this.#pnlWV!.webview;
			this.#pnlWV!.webview.html = data
			.replaceAll('${webview.cspSource}', wv.cspSource)
			.replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(uf_path_doc)}/`);
		});
	}
	readonly	#crePrjFromTmp = (nm: string, fnTo: string)=> window.withProgress({
		location	: ProgressLocation.Notification,
		title		: 'テンプレートからプロジェクト作成',
		cancellable	: true,
	}, (prg, tknCancel)=> {
		const td = tmpdir();
		removeSync(td +'.zip');
		const fnFrom = td +`/SKYNovel_${nm}-master`;
		removeSync(fnFrom);

		tknCancel.onCancellationRequested(()=> removeSync(fnFrom));

		return new Promise<void>((re, rj)=> {
			// zipダウンロード＆解凍
			prg.report({increment: 10, message: 'ダウンロード中',});
			fetch(`https://github.com/famibee/SKYNovel_${nm}/archive/master.zip`)
			.then(async res=> {
				const buf = await res.buffer();
				if (tknCancel.isCancellationRequested) {rj(); return;}

				prg.report({increment: 50, message: 'ZIP解凍中',});
				new AdmZip(buf).extractAllTo(td, true);	// overwrite
				if (tknCancel.isCancellationRequested) {rj(); return;}

				prg.report({increment: 10, message: 'ファイル調整',});

				// prj.json の置換
				const pathWs = fnFrom;
				const fnPrj = pathWs +'/doc/prj/';
				const fnPrjJs = fnPrj +'/prj.json';
				const oPrj = readJsonSync(fnPrjJs, {encoding: 'utf8'});
				oPrj.save_ns = this.#save_ns;
				oPrj.debuger_token = '';
				outputJsonSync(fnPrjJs, oPrj, {spaces: '\t'});

				// package.json の置換
				const fnPkgJs = pathWs +'/package.json';
				replaceFile(fnPkgJs, /("name"\s*:\s*").*(")/, `$1${this.#save_ns}$2`);
				replaceFile(fnPkgJs, /("(?:appBundleId|appId)"\s*:\s*").*(")/g, `$1com.fc2.blog.famibee.skynovel.${this.#save_ns}$2`);
				replaceFile(fnPkgJs, /("artifactName"\s*:\s*").*(")/, `$1${this.#save_ns}-\${version}-\${arch}.\${ext}$2`);

				// フォルダ名変更
				moveSync(fnFrom, fnTo);

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


	// テンプレートからプロジェクト更新
	readonly updPrjFromTmp = (fnTo: string)=> window.withProgress({
		location	: ProgressLocation.Notification,
		title		: 'テンプレートからプロジェクト更新',
		cancellable	: true,
	}, (prg, tknCancel)=> {
		if (! existsSync(fnTo + '/CHANGELOG.md')) return Promise.reject();

		const oOldPkgJS = readJsonSync(fnTo +'/package.json', {encoding: 'utf8'});
		const nm = oOldPkgJS.repository.url.match(/\/SKYNovel_(\w+)\./)?.[1] ?? '';

		const td = tmpdir();
		removeSync(td +'.zip');
		const fnFrom = td +`/SKYNovel_${nm}-master`;
		removeSync(fnFrom);

		tknCancel.onCancellationRequested(()=> removeSync(fnFrom));

		return new Promise<void>((re, rj)=> {
			// zipダウンロード＆解凍
			prg.report({increment: 10, message: 'ダウンロード中',});
			fetch(`https://github.com/famibee/SKYNovel_${nm}/archive/master.zip`)
			.then(async res=> {
				const buf = await res.buffer();
				if (tknCancel.isCancellationRequested) {rj(); return;}

				prg.report({increment: 50, message: 'ZIP解凍中',});
				new AdmZip(buf).extractAllTo(td, true);	// overwrite
				if (tknCancel.isCancellationRequested) {rj(); return;}

				prg.report({increment: 10, message: 'ファイル調整',});
				const copy = (fn: string, chkExists = false)=> {
					if (chkExists && ! existsSync(fnTo +'/'+ fn)) return;
					copyFileSync(fnFrom +'/'+ fn, fnTo +'/'+ fn)
				};
				// build/		// しばしノータッチ

				copy('core/plugin/humane/index.js', true);
				// core/app4webpack.js	やや難
				copy('core/wds.config.js');
				// core/web4webpack.js	やや難
				copy('core/webpack.config.js');

				// doc/prj/		// しばしノータッチ
				// doc/app.js
				// doc/favicon.ico
				// doc/web.htm

				copy('CHANGELOG.md');

				// package.json
				const oNewPkgJS = readJsonSync(fnFrom +'/package.json', {encoding: 'utf8'});
				outputJsonSync(fnTo +'/package.json', {
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