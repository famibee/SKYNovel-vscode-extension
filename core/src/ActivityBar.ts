/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, is_win, is_mac} from './CmnLib';
import {WorkSpaces} from './WorkSpaces';
import {TreeDPDoc} from './TreeDPDoc';

import {TreeDataProvider, TreeItem, ExtensionContext, window, commands, env, Uri, workspace, EventEmitter, Event, WebviewPanel, ViewColumn} from 'vscode';
const {exec} = require('child_process');
import fs = require('fs-extra');
const os = require('os');
const https = require('https');

enum eTree {
	NODE = 0,
	NPM,
	WINDOWS_BUILD_TOOLS,
	SKYNOVEL_VER,
};

export class ActivityBar implements TreeDataProvider<TreeItem> {
	static start(ctx: ExtensionContext) {
		ActivityBar.actBar = new ActivityBar(ctx);
		ctx.subscriptions.push(window.registerTreeDataProvider('sn-setting', ActivityBar.actBar));
		ActivityBar.trDPWss = new WorkSpaces(ctx, ActivityBar.chkLastVerSKYNovel);
		ctx.subscriptions.push(window.registerTreeDataProvider('sn-dev', ActivityBar.trDPWss));
		ctx.subscriptions.push(window.registerTreeDataProvider('sn-doc', new TreeDPDoc(ctx)));
	}
	private static actBar: ActivityBar;
	private static trDPWss: WorkSpaces;
	static stopActBar() {
		ActivityBar.actBar.dispose();
		ActivityBar.trDPWss.dispose();
	}


	private static readonly aTiRoot: TreeItem[] = [
		new TreeItem('Node.js'),
		new TreeItem('npm'),
		new TreeItem(is_win ?'windows-build-tools' :''),
		new TreeItem('SKYNovel（最新）'),
	];
	private aReady: (boolean | undefined)[] = [undefined, undefined, undefined, undefined];


	private constructor(private readonly ctx: ExtensionContext) {
		ActivityBar.aTiRoot.forEach(v=> v.contextValue = v.label);
		this.refreshWork();

		ctx.subscriptions.push(commands.registerCommand('skynovel.refreshSetting', ()=> this.refresh()));	// refreshボタン
		ctx.subscriptions.push(commands.registerCommand('skynovel.dlNode', ()=> env.openExternal(
			Uri.parse('https://nodejs.org/dist/v12.16.3/node-v12.16.3'+ (
				is_mac
				? '.pkg'
				: ((os.arch().slice(-2)=='64' ?'-x64' :'-x86') +'.msi')
			))
		)));	// NOTE: URLを更新したら以降にある「node -v」を壊しDLボタンの動作確認
		ctx.subscriptions.push(commands.registerCommand('skynovel.opNodeSite', ()=> env.openExternal(Uri.parse('https://nodejs.org/ja/'))));
	}

	private dispose() {if (this.pnlWV) this.pnlWV.dispose();}

	// refreshボタン
	private refresh(): void {
		this.refreshWork();
		this._onDidChangeTreeData.fire(undefined);
	}
	private readonly _onDidChangeTreeData: EventEmitter<TreeItem | undefined> = new EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

	readonly getTreeItem = (t: TreeItem)=> t;

	// 起動時？　と refreshボタンで呼ばれる
	getChildren(t?: TreeItem): Thenable<TreeItem[]> {
		if (! t) return Promise.resolve(ActivityBar.aTiRoot);

		const ret: TreeItem[] = [];
		if (t.label == 'Node.js') ActivityBar.aTiRoot[eTree.NODE].iconPath = (this.aReady[eTree.NODE]) ?'' :oIcon('error');
		return Promise.resolve(ret);
	}

	// 環境チェック
	private refreshWork(): void {
		let error = 0;
		if (! this.aReady[eTree.NODE]) exec('node -v', (err: Error, stdout: string|Buffer)=> {
			const node = ActivityBar.aTiRoot[eTree.NODE];
			if (err) {
				this.aReady[eTree.NODE] = false;
				node.description = `-- 見つかりません`;
				node.iconPath = oIcon('error');
				this._onDidChangeTreeData.fire(node);
				this.activityBarBadge(++error);
				return;
			}
			this.aReady[eTree.NODE] = true;
			node.description = `-- ${stdout}`;
			node.iconPath = '';
			node.contextValue = '';
			this._onDidChangeTreeData.fire(node);
		});

		const wbt = ActivityBar.aTiRoot[eTree.WINDOWS_BUILD_TOOLS];
		const chkWbt = ()=> {
			// （windowsのみ）管理者権限で PowerShell を起動し、【npm i -g windows-build-tools】を実行。「All done!」まで待つ。
			if (! is_win) return;
			exec('npm ls -g windows-build-tools', (err: Error, stdout: string|Buffer)=> {
				const a = String(stdout).split(/@|\n/);
				if (err || a.length < 3) {
					this.aReady[eTree.WINDOWS_BUILD_TOOLS] = false;
					wbt.description = `-- 見つかりません`;
					wbt.iconPath = oIcon('error');
					this._onDidChangeTreeData.fire(wbt);
					this.activityBarBadge(++error);
					return;
				}
				this.aReady[eTree.WINDOWS_BUILD_TOOLS] = true;
				wbt.description = `-- ${a[2]}`;
				wbt.iconPath = '';
				this._onDidChangeTreeData.fire(wbt);
			});
		};
		if (this.aReady[eTree.NPM]) chkWbt();
		else exec('npm -v', (err: Error, stdout: string|Buffer)=> {
			const npm = ActivityBar.aTiRoot[eTree.NPM];
			if (err) {
				this.aReady[eTree.NPM] = false;
				npm.description = `-- 見つかりません`;
				npm.iconPath = oIcon('error');
				this._onDidChangeTreeData.fire(npm);
				this.activityBarBadge(++error);
				return;
			}
			this.aReady[eTree.NPM] = true;
			npm.description = `-- ${stdout}`;
			npm.iconPath = '';
			this._onDidChangeTreeData.fire(npm);

			chkWbt();
		});

		ActivityBar.chkLastVerSKYNovel();
	}
	private	static chkLastVerSKYNovel() {
		const aFld = workspace.workspaceFolders;
		if (! aFld) return;

		https.get('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json', (res: any)=> {
			let body = '';
			res.setEncoding('utf8');
			res.on('data', (chunk: string)=> {body += chunk;});
			res.on('end', ()=> {
				const newVer = JSON.parse(body).version;
				const node = ActivityBar.aTiRoot[eTree.SKYNOVEL_VER];
				node.description = '-- ' + newVer;
				ActivityBar.actBar._onDidChangeTreeData.fire(node);
				if (aFld.find(fld => {
					const fnLocal = fld.uri.fsPath + '/package.json';
					if (! fs.existsSync(fnLocal)) return false;

					const localVer = fs.readJsonSync(fnLocal).dependencies.skynovel.slice(1);
					if (localVer.slice(0, 4) == 'ile:') return false;
					return (newVer != localVer);
				})) window.showInformationMessage(`SKYNovelに更新（${newVer}）があります。【開発ツール】-【SKYNovel更新】のボタンを押してください`);
			});
		}).on('error', (e: Error) => console.error(e.message));
	}

	private pnlWV: WebviewPanel | null = null;
	private async activityBarBadge(num = 0) {
		const column = window.activeTextEditor?.viewColumn;
		if (this.pnlWV) {this.pnlWV.reveal(column); return;}

		const path_doc = this.ctx.extensionPath +'/doc';
		this.pnlWV = window.createWebviewPanel('SKYNovel-envinfo', 'SKYNovel情報', column || ViewColumn.One, {
			enableScripts: false,
			localResourceRoots: [Uri.file(path_doc)],
		});
		this.pnlWV.onDidDispose(()=> this.pnlWV = null);	// 閉じられたとき

		fs.readFile(path_doc +`/index.htm`, 'utf-8', (err: Error, data: string)=> {
			if (err) throw err;

			this.pnlWV!.webview.html = data
				.replace('${エラー数}', String(num))
				.replace(/<img src="img\//g, `<img src="vscode-resource:${path_doc}/img/`)
				.replace('type="text/css" href="', `type="text/css" href="vscode-resource:${path_doc}/`);
		});
	}

}
