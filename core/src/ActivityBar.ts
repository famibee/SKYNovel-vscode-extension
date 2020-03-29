/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, is_win, is_mac} from './CmnLib';
import {TreeDPDev} from './TreeDPDev';

import {TreeDataProvider, TreeItem, ExtensionContext, window, commands, env, Uri, workspace, EventEmitter, Event, WebviewPanel, ViewColumn, TreeItemCollapsibleState, ThemeIcon} from 'vscode';
const {exec} = require('child_process');
const fs = require('fs-extra');
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
		ActivityBar.trDPEnv = new ActivityBar(ctx);
		ctx.subscriptions.push(window.registerTreeDataProvider('sn-setting', ActivityBar.trDPEnv));
		ActivityBar.trDPDev = new TreeDPDev(ctx);
		ctx.subscriptions.push(window.registerTreeDataProvider('sn-dev', ActivityBar.trDPDev));
		ctx.subscriptions.push(window.registerTreeDataProvider('sn-doc', new TreeDPDoc(ctx)));
	}
	private static trDPEnv: ActivityBar;
	private static trDPDev: TreeDPDev;
	static stopActBar() {
		ActivityBar.trDPEnv.dispose();
		ActivityBar.trDPDev.dispose();
	}


	private readonly aTiRoot: TreeItem[] = [
		new TreeItem('Node.js'),
		new TreeItem('npm'),
		new TreeItem(is_win ?'windows-build-tools' :''),
		new TreeItem('SKYNovel（最新）'),
	];
	private aReady: (boolean | undefined)[] = [undefined, undefined, undefined, undefined];


	private constructor(private readonly ctx: ExtensionContext) {
		this.aTiRoot.forEach(v=> v.contextValue = v.label);
		this.refreshWork();

		ctx.subscriptions.push(commands.registerCommand('skynovel.refreshSetting', ()=> this.refresh()));	// refreshボタン
		ctx.subscriptions.push(commands.registerCommand('skynovel.dlNode', ()=> env.openExternal(Uri.parse('https://nodejs.org/dist/v12.16.1/node-v12.16.1'
			+ (is_mac
				? '.pkg'
				: ((os.arch().slice(-2)=='64' ?'-x64' :'-x86') +'.msi'))
		))));	// NOTE: ここを更新する場合は以降に出てくる「node -v」を変更して確認
		ctx.subscriptions.push(commands.registerCommand('skynovel.opNodeSite', ()=> env.openExternal(Uri.parse('https://nodejs.org/ja/'))));

		const aFld = workspace.workspaceFolders;
		// ライブラリ更新チェック
		if (aFld) https.get('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json', (res: any)=> {
			let body = '';
			res.setEncoding('utf8');
			res.on('data', (chunk: string)=> {body += chunk;});
			res.on('end', ()=> {
				const newVer = JSON.parse(body).version;
				const node = this.aTiRoot[eTree.SKYNOVEL_VER];
				node.description = '-- '+ newVer;
				this._onDidChangeTreeData.fire(node);
				if (aFld.find(fld=> {
					const fnLocal = fld.uri.fsPath +'/package.json';
					if (! fs.existsSync(fnLocal)) return false;

					const localVer = fs.readJsonSync(fnLocal).dependencies.skynovel.slice(1);
					if (localVer.slice(0, 4) == 'ile:') return false;
					return (newVer != localVer);
				})) window.showInformationMessage(`SKYNovelに更新（${newVer}）があります。【開発ツール】-【SKYNovel更新】のボタンを押してください`);
			});
		}).on('error', (e: Error)=> console.error(e.message));
	}
	private dispose() {if (this.pnlWV) this.pnlWV.dispose();}

	// refreshボタン
	private refresh(): void {
		this.refreshWork();
		this._onDidChangeTreeData.fire();
	}
	private readonly _onDidChangeTreeData: EventEmitter<TreeItem | undefined> = new EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

	readonly getTreeItem = (t: TreeItem)=> t;

	// 起動時？　と refreshボタンで呼ばれる
	getChildren(t?: TreeItem): Thenable<TreeItem[]> {
		if (! t) return Promise.resolve(this.aTiRoot);

		const ret: TreeItem[] = [];
		if (t.label == 'Node.js') this.aTiRoot[eTree.NODE].iconPath = (this.aReady[eTree.NODE]) ?'' :oIcon('error');
		return Promise.resolve(ret);
	}

	// 環境チェック
	private refreshWork(): void {
		let error = 0;
		if (! this.aReady[eTree.NODE]) exec('node -v', (err: Error, stdout: string|Buffer)=> {
			const node = this.aTiRoot[eTree.NODE];
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

		const wbt = this.aTiRoot[eTree.WINDOWS_BUILD_TOOLS];
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
			const npm = this.aTiRoot[eTree.NPM];
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
	}

	private pnlWV: WebviewPanel | null = null;
	private async activityBarBadge(num = 0) {
		const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;
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


class TreeDPDoc implements TreeDataProvider<TreeItem> {
	private readonly	aTiRoot		: TreeItem[] = [
		new TreeItem('開発者向け情報'),
		new TreeItem('タグリファレンス'),
		new TreeItem('マクロ・プラグインリファレンス'),
		new TreeItem('機能ギャラリー'),
		new TreeItem('テンプレート プロジェクト', TreeItemCollapsibleState.Collapsed),
		new TreeItem('famibee 連絡先', TreeItemCollapsibleState.Collapsed),
		new TreeItem('オススメVSCode拡張機能', TreeItemCollapsibleState.Collapsed),
	];
	private readonly	aTiTemp		: TreeItem[] = [
		new TreeItem('横書き「初音館にて」'),
		new TreeItem('縦書き「桜の樹の下には」'),
	];
	private readonly	aTiFamibee	: TreeItem[] = [
		new TreeItem('famibee blog'),
		new TreeItem('famibee Mail'),
		new TreeItem('famibee Twitter'),
	];
	private readonly	aTiVSCodeEx	: TreeItem[] = [
		new TreeItem('日本語化'),
		new TreeItem('Material Icon Theme'),
		new TreeItem('Bookmarks'),
		new TreeItem('HTML Preview'),
		new TreeItem('HTMLHint'),
		new TreeItem('Cordova Tools'),
		new TreeItem('Debugger for Chrome'),
		new TreeItem('glTF Tools'),
	];

	constructor(readonly ctx: ExtensionContext) {
		this.aTiRoot.forEach(t=> {
			t.iconPath =
				(t.collapsibleState == TreeItemCollapsibleState.None)
				? oIcon('document')
				: ThemeIcon.Folder;
			t.contextValue = t.label;
		});

		this.aTiTemp.forEach(t=> {
			t.iconPath = oIcon('baggage');
			t.contextValue = t.label;
		});

		this.aTiFamibee.forEach(t=> {
			t.iconPath = oIcon('document');
			t.contextValue = t.label;
		});
		this.aTiFamibee[1].iconPath = oIcon('mail');
		this.aTiFamibee[2].iconPath = oIcon('twitter');

		this.aTiVSCodeEx.forEach(t=> {
			t.iconPath = oIcon('gear');
			t.contextValue = t.label;
		});

		ctx.subscriptions.push(commands.registerCommand('skynovel.opDev', ()=> env.openExternal(Uri.parse('https://famibee.github.io/SKYNovel/dev.htm'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opTag', ()=> env.openExternal(Uri.parse('https://famibee.github.io/SKYNovel/tag.htm'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opMacroPlg', ()=> env.openExternal(Uri.parse('https://famibee.github.io/SKYNovel/macro_plg.htm'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opGallery', ()=> env.openExternal(Uri.parse('https://famibee.github.io/SKYNovel_gallery/'))));

		ctx.subscriptions.push(commands.registerCommand('skynovel.dlTmpYoko', ()=> env.openExternal(Uri.parse('https://github.com/famibee/SKYNovel_hatsune/archive/master.zip'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.dlTmpTate', ()=> env.openExternal(Uri.parse('https://github.com/famibee/SKYNovel_uc/archive/master.zip'))));

		ctx.subscriptions.push(commands.registerCommand('skynovel.opFamibeeBlog', ()=> env.openExternal(Uri.parse('https://famibee.blog.fc2.com/'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.mail2famibee', ()=> env.openExternal(Uri.parse('mailto:famibee@gmail.com'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.tw2famibee', ()=> env.openExternal(Uri.parse('https://twitter.com/famibee'))));

		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExJa', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExIcon', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExBookmarks', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=alefragnani.Bookmarks'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExLiveHTMLPrev', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=tht13.html-preview-vscode'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExHTMLHint', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=mkaufman.HTMLHint'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExCordovaTools', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.cordova-tools'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExDbg4Chrome', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExglTFTools', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=cesium.gltf-vscode'))));
	}

	getTreeItem = (t: TreeItem)=> t;
	getChildren(t?: TreeItem): Thenable<TreeItem[]> {
		if (! t) return Promise.resolve(this.aTiRoot);

		switch (t.label) {
		case 'テンプレート プロジェクト':	return Promise.resolve(this.aTiTemp);
		case 'famibee 連絡先':	return Promise.resolve(this.aTiFamibee);
		case 'オススメVSCode拡張機能':	return Promise.resolve(this.aTiVSCodeEx);
		}
		return Promise.resolve([]);
	}
}
