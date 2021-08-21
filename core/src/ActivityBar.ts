/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, setCtx4} from './CmnLib';
import {WorkSpaces} from './WorkSpaces';
import {ToolBox} from './ToolBox';
import {TreeDPDoc} from './TreeDPDoc';
import fetch from 'node-fetch';
import AdmZip = require('adm-zip');

import {TreeDataProvider, TreeItem, ExtensionContext, window, commands, Uri, workspace, EventEmitter, Event, WebviewPanel, ViewColumn, ProgressLocation} from 'vscode';
const {exec} = require('child_process');
import {existsSync, readJsonSync, readFile, moveSync, remove, outputJsonSync, removeSync} from 'fs-extra';

export enum eTreeEnv {
	NODE = 0,
	NPM,
	SKYNOVEL_VER,
};

export class ActivityBar implements TreeDataProvider<TreeItem> {
	static start(ctx: ExtensionContext) {
		setCtx4(ctx);

		ActivityBar.actBar = new ActivityBar(ctx);
	}
	private static actBar: ActivityBar;
	static stop() {ActivityBar.actBar.dispose();}


	private readonly aEnv: {label: string, icon: string}[]
	= [
		{label: 'Node.js',	icon: 'node-js-brands'},
		{label: 'npm',		icon: 'npm-brands'},
		{label: 'SKYNovel（最新）',		icon: 'skynovel'},
	];
	private readonly aTiEnv: TreeItem[] = [];
	static aReady	= [false, false, false, false];

	private workSps	: WorkSpaces;
	private tlBox	: ToolBox;


	private constructor(private readonly ctx: ExtensionContext) {
		this.aTiEnv = this.aEnv.map(v=> {
			const ti = new TreeItem(v.label);
			if (v.label) ti.iconPath = oIcon(v.icon);
			ti.contextValue = v.label;
			return ti;
		});
		ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-dev', this));
		this.chkLastSNVer();

		this.chkEnv(()=> {
			ctx.subscriptions.push(commands.registerCommand('skynovel.refreshSetting', ()=> this.refresh()));	// refreshボタン
			ctx.subscriptions.push(commands.registerCommand('skynovel.dlNode', ()=> this.openEnvInfo()));
			ctx.subscriptions.push(commands.registerCommand('skynovel.TempWizard', ()=> this.openTempWizard()));

			this.workSps = new WorkSpaces(ctx, ()=> this.chkLastSNVer());
			ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-ws', this.workSps));

			this.tlBox = new ToolBox(ctx);
			ctx.subscriptions.push(window.registerWebviewViewProvider('skynovel-tb', this.tlBox));

			ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-doc', new TreeDPDoc(ctx)));
		});
	}

	private dispose() {
		if (this.pnlWV) this.pnlWV.dispose();
		this.workSps.dispose();
		this.tlBox.dispose();
	}

	// refreshボタン
	private refresh(): void {
		ActivityBar.aReady[eTreeEnv.NODE] = false;
		ActivityBar.aReady[eTreeEnv.NPM] = false;
		this.workSps.enableButton(false);
		this.chkEnv(ok=> {
			this.workSps.enableButton(ok);
			if (! ok) this.openEnvInfo();
		});
	}
	private readonly _onDidChangeTreeData: EventEmitter<TreeItem | undefined> = new EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

	readonly getTreeItem = (t: TreeItem)=> t;

	// 起動時？　と refreshボタンで呼ばれる
	getChildren(t?: TreeItem): Thenable<TreeItem[]> {
		if (! t) return Promise.resolve(this.aTiEnv);

		const ret: TreeItem[] = [];
		if (t.label === 'Node.js') this.aTiEnv[eTreeEnv.NODE].iconPath = oIcon((ActivityBar.aReady[eTreeEnv.NODE]) ?'node-js-brands' :'error');
		return Promise.resolve(ret);
	}

	// 環境チェック
	private chkEnv(finish: (ok: boolean)=> void): void {
		exec('node -v', (err: Error, stdout: string|Buffer)=> {
			const tiNode = this.aTiEnv[eTreeEnv.NODE];
			const tiNpm = this.aTiEnv[eTreeEnv.NPM];
			if (err) {
				tiNode.description = `-- 見つかりません`;
				tiNode.iconPath = oIcon('error');
				this._onDidChangeTreeData.fire(tiNode);

				tiNpm.description = `-- （割愛）`;
				tiNpm.iconPath = oIcon('error');
				this._onDidChangeTreeData.fire(tiNpm);
				finish(false);
				return;
			}
			ActivityBar.aReady[eTreeEnv.NODE] = true;
			tiNode.description = `-- ${stdout}`;
			tiNode.iconPath = oIcon('node-js-brands');
			this._onDidChangeTreeData.fire(tiNode);

			exec('npm -v', (err: Error, stdout: string|Buffer)=> {
				if (err) {
					tiNpm.description = `-- 見つかりません`;
					tiNpm.iconPath = oIcon('error');
					this._onDidChangeTreeData.fire(tiNpm);
					finish(false);
					return;
				}
				ActivityBar.aReady[eTreeEnv.NPM] = true;
				tiNpm.description = `-- ${stdout}`;
				tiNpm.iconPath = oIcon('npm-brands');
				this._onDidChangeTreeData.fire(tiNpm);
				finish(true);
			});
		});
	}
	private chkLastSNVer() {
		fetch('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json')
		.then(res=> res.json())
		.then(json=> {
			const newVer = json.version;
			const tiSV = this.aTiEnv[eTreeEnv.SKYNOVEL_VER];
			tiSV.description = '-- ' + newVer;
			ActivityBar.actBar._onDidChangeTreeData.fire(tiSV);

			if (workspace.workspaceFolders?.find(fld=> {
				const fnLocal = fld.uri.fsPath + '/package.json';
				if (! existsSync(fnLocal)) return false;

				const localVer = readJsonSync(fnLocal).dependencies['@famibee/skynovel']?.slice(1);
				if (localVer.slice(0, 4) === 'ile:') return false;
				return (newVer != localVer);
			})) window.showInformationMessage(`SKYNovelに更新（${newVer}）があります。【開発ツール】-【SKYNovel更新】のボタンを押してください`);
		});
	}

	private pnlWV: WebviewPanel | null = null;
	private openEnvInfo() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.pnlWV) {this.pnlWV.reveal(column); return;}

		const path_doc = this.ctx.extensionPath +'/res/webview';
		const uf_path_doc = Uri.file(path_doc);
		this.pnlWV = window.createWebviewPanel('SKYNovel-envinfo', '開発環境準備', column || ViewColumn.One, {
			enableScripts: false,
			localResourceRoots: [uf_path_doc],
		});
		this.pnlWV.onDidDispose(()=> this.pnlWV = null);	// 閉じられたとき

		readFile(path_doc +`/envinfo.htm`, 'utf-8', (err, data)=> {
			if (err) throw err;

			const wv = this.pnlWV!.webview;
			this.pnlWV!.webview.html = data
			.replace(/\$\{webview.cspSource}/g, wv.cspSource)
			.replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(uf_path_doc)}/`);
		});
	}

	private openTempWizard() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.pnlWV) {this.pnlWV.reveal(column); return;}

		const path_doc = this.ctx.extensionPath +'/res/webview';
		const uf_path_doc = Uri.file(path_doc);
		const wv = this.pnlWV = window.createWebviewPanel('SKYNovel-tmpwiz', 'テンプレートから始める', column || ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [uf_path_doc],
		});
		wv.onDidDispose(()=> this.pnlWV = null);	// 閉じられたとき

		wv.webview.onDidReceiveMessage(m=> {
//console.log(`fn:ActivityBar.ts line:198 common m:%o`, m);
			switch (m.cmd) {
			case 'get':	wv.webview.postMessage({cmd: 'res', o: {}});	break;
			case 'info':	window.showInformationMessage(m.text); break;

			case 'input':
				if (m.id !== 'save_ns') break;

				// プロジェクトフォルダ名（半角英数記号）を指定
				this.save_ns = m.val;
//console.log(`fn:ActivityBar.ts line:201 id:${m.id} v:${m.val}`);
				wv.webview.postMessage({cmd: 'vld', o: {
					id		: 'save_ns',
					valid	: this.chkSave_ns(),
				}});
				break;

			case 'tmp_hatsune':
			case 'tmp_uc':
			case 'tmp_sample':
				if (! this.chkSave_ns()) break;

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
					const fnTo = path_dl +'/'+ this.save_ns;
					if (existsSync(fnTo)) {
						window.showErrorMessage(`既存のフォルダ ${this.save_ns} があります`, {detail: 'フォルダ名を変えるか、既存のフォルダを削除して下さい', modal: true});
						return;
					}

					window.withProgress({
						location	: ProgressLocation.Notification,
						title		: 'テンプレートからプロジェクト作成',
						cancellable	: true
					}, (progress, tknCancel)=> {
						//	tknCancel.onCancellationRequested(()=> {});
						progress.report({
							message		: 'ダウンロード中',
							increment	: 10,
						});

						const nm = m.cmd.slice(4);
						return new Promise(re=> {
							// zipダウンロード＆解凍
							fetch(`https://github.com/famibee/SKYNovel_${nm}/archive/master.zip`)
							.then(res=> res.buffer())
							.then(buf=> {
								if (tknCancel.isCancellationRequested) return;

								progress.report({
									message		: 'ZIP解凍中',
									increment	: 50,
								});

								new AdmZip(buf).extractAllTo(path_dl, true);
									// overwrite
							})
							.then(()=> {
								const fnFrom = path_dl +`/SKYNovel_${nm}-master`;
								if (tknCancel.isCancellationRequested) {
									remove(fnFrom);
									return;
								}

								// フォルダ名変更
								moveSync(fnFrom, fnTo);

								// prj.json の置換
								const fnPrj = fnTo +'/doc/prj/prj.json';
								const oPrj = readJsonSync(fnPrj, {encoding: 'utf8'});
								oPrj.save_ns = this.save_ns;
								outputJsonSync(fnPrj, oPrj);

								// package-lock.json 削除
								// 対策【'webpack' は、内部コマンドまたは外部コマンド、 操作可能なプログラムまたはバッチ ファイルとして認識されていません。】
								removeSync(fnTo +'/package-lock.json');

								progress.report({
									message		: '完了。フォルダを開きます',
									increment	: 40,
								});
								setTimeout(()=> {
									re(0);
									if (tknCancel.isCancellationRequested) {
										remove(fnTo);
										return;
									}

									// フォルダをワークスペースで開く
									commands.executeCommand(
										'vscode.openFolder',
										Uri.file(fnTo),
										false,
									);
								}, 4000);
							});
						});
					});
				})
				break;
			}
		}, false);

		readFile(path_doc +`/tmpwiz.htm`, 'utf-8', (err, data)=> {
			if (err) throw err;

			const wv = this.pnlWV!.webview;
			this.pnlWV!.webview.html = data
			.replace(/\$\{webview.cspSource}/g, wv.cspSource)
			.replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(uf_path_doc)}/`);
		});
	}
	private	save_ns	= '';
	private	chkSave_ns = ()=> /^([a-zA-Z0-9!-/:-@¥[-`{-~]{1,})$/.test(this.save_ns);	// https://regex101.com/r/JGxtnR/1
		// 正規表現を可視化してまとめたチートシート - Qiita https://qiita.com/grrrr/items/0b35b5c1c98eebfa5128

}
