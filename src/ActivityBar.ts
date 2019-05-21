/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import * as vscode from 'vscode';
const {exec} = require('child_process');
const fs = require('fs');
const os = require('os');
const https = require('https');
import {TreeDPDev, oIcon, is_win, is_mac} from './TreeDPDev';

enum eTree {
	NODE = 0,
	NPM,
	WINDOWS_BUILD_TOOLS,
	SKYNOVEL_VER,
};

export class ActivityBar implements vscode.TreeDataProvider<vscode.TreeItem> {
	static start(context: vscode.ExtensionContext) {
		ActivityBar.trDPEnv = new ActivityBar(context);
		vscode.window.registerTreeDataProvider('sn-setting', ActivityBar.trDPEnv);
		ActivityBar.trDPDev = new TreeDPDev;
		vscode.window.registerTreeDataProvider('sn-dev', ActivityBar.trDPDev);
		vscode.window.registerTreeDataProvider('sn-doc', new TreeDPDoc);
	}
	static trDPEnv: ActivityBar;
	static trDPDev: TreeDPDev;
	static stopActBar() {
		ActivityBar.trDPEnv.dispose();
		ActivityBar.trDPDev.dispose();
	}


	private readonly aTree: vscode.TreeItem[] = [
		new vscode.TreeItem('Node.js'),
		new vscode.TreeItem('npm'),
		new vscode.TreeItem(is_win ?'windows-build-tools' :''),
		new vscode.TreeItem('SKYNovel（最新）'),
	];
	private aReady: (boolean | undefined)[] = [undefined, undefined, undefined, undefined];

	private constructor(private context: vscode.ExtensionContext) {
		this.aTree.map(v=> v.contextValue = v.label);
		this.refreshWork();

		vscode.commands.registerCommand('sn.refreshSetting', ()=> this.refresh());	// refreshボタン
		vscode.commands.registerCommand('sn.dlNode', ()=> vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/dist/v10.15.3/node-v10.15.3'
			+ (is_mac
				? '.pkg'
				: ((os.arch().slice(-2)=='64' ?'-x64' :'-x32') +'.msi'))
		)));
		vscode.commands.registerCommand('sn.opNodeSite', ()=> vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/ja/')));

		const aFld = vscode.workspace.workspaceFolders;
		// ライブラリ更新チェック
		if (aFld) https.get('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json', (res: any)=> {
			let body = '';
			res.setEncoding('utf8');
			res.on('data', (chunk: string)=> {body += chunk;});
			res.on('end', ()=> {
				const newVer = JSON.parse(body).version;
				this.aTree[eTree.SKYNOVEL_VER].description = '-- '+ newVer;
				if (aFld.find(fld =>{
					const fnLocal = fld.uri.fsPath +'/package.json';
					if (! fs.existsSync(fnLocal)) return false;

					const localVer = JSON.parse(fs.readFileSync(fnLocal)).dependencies.skynovel.slice(1);
					return (newVer != localVer);
				})) vscode.window.showInformationMessage(`SKYNovelに更新（${newVer}）があります。【開発ツール】-【SKYNovel更新】のボタンを押してください`);
			});
		}).on('error', (e: Error)=> console.error(e.message));
	}
	private dispose() {if (this.pnlWV) this.pnlWV.dispose();}

	// refreshボタン
	private refresh(): void {
		this.refreshWork();
		this._onDidChangeTreeData.fire();
	}
	private readonly _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

	readonly getTreeItem = (elm: vscode.TreeItem)=> elm;

	// 起動時？　と refreshボタンで呼ばれる
	getChildren(elm?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		if (! elm) return Promise.resolve(this.aTree);

		const ret: vscode.TreeItem[] = [];
		if (elm.label == 'Node.js') this.aTree[eTree.NODE].iconPath = (this.aReady[eTree.NODE]) ?'' :oIcon('error');
		return Promise.resolve(ret);
	}

	// 環境チェック
	private refreshWork(): void {
		let error = 0;
		if (! this.aReady[eTree.NODE]) exec('node -v', (err: Error, stdout: string|Buffer)=> {
			const node = this.aTree[eTree.NODE];
			if (err) {
				this.aReady[eTree.NODE] = false;
				node.description = `-- 見つかりません`;
				node.iconPath = oIcon('error');
				this._onDidChangeTreeData.fire();
				this.activityBarBadge(++error);
				return;
			}
			this.aReady[eTree.NODE] = true;
			node.description = `-- ${stdout}`;
			node.iconPath = '';
			node.contextValue = '';
			this._onDidChangeTreeData.fire();
		});

		const wbt = this.aTree[eTree.WINDOWS_BUILD_TOOLS];
		const chkWbt = ()=> {
			// （windowsのみ）管理者権限で PowerShell を起動し、【npm i -g windows-build-tools】を実行。「All done!」まで待つ。
			if (! is_win) return;
			exec('npm ls -g windows-build-tools', (err: Error, stdout: string|Buffer)=> {
				const a = String(stdout).split(/@|\n/);
				if (err || a.length < 3) {
					this.aReady[eTree.WINDOWS_BUILD_TOOLS] = false;
					wbt.description = `-- 見つかりません`;
					wbt.iconPath = oIcon('error');
					this._onDidChangeTreeData.fire();
					this.activityBarBadge(++error);
					return;
				}
				this.aReady[eTree.WINDOWS_BUILD_TOOLS] = true;
				wbt.description = `-- ${a[2]}`;
				wbt.iconPath = '';
				this._onDidChangeTreeData.fire();
			});
		};
		if (this.aReady[eTree.NPM]) chkWbt();
		else exec('npm -v', (err: Error, stdout: string|Buffer)=> {
			const npm = this.aTree[eTree.NPM];
			if (err) {
				this.aReady[eTree.NPM] = false;
				npm.description = `-- 見つかりません`;
				npm.iconPath = oIcon('error');
				this._onDidChangeTreeData.fire();
				this.activityBarBadge(++error);
				return;
			}
			this.aReady[eTree.NPM] = true;
			npm.description = `-- ${stdout}`;
			npm.iconPath = '';
			this._onDidChangeTreeData.fire();

			chkWbt();
		});
	}

	private pnlWV: vscode.WebviewPanel | null = null;
	private async activityBarBadge(num = 0) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
		if (this.pnlWV) {this.pnlWV.reveal(column); return;}

		const path_doc = this.context.extensionPath +'/doc';
		this.pnlWV = vscode.window.createWebviewPanel('SKYNovel-envinfo', 'SKYNovel情報', column || vscode.ViewColumn.One, {
			enableScripts: false,
			localResourceRoots: [vscode.Uri.file(path_doc)],
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


class TreeDPDoc implements vscode.TreeDataProvider<vscode.TreeItem> {
	private readonly	aTree: vscode.TreeItem[] = [
		new vscode.TreeItem('開発者向け情報'),
		new vscode.TreeItem('タグリファレンス'),
		new vscode.TreeItem('マクロ・プラグインリファレンス'),
		new vscode.TreeItem('機能ギャラリー'),
		new vscode.TreeItem('テンプレート プロジェクト', vscode.TreeItemCollapsibleState.Collapsed),
		new vscode.TreeItem('famibee 連絡先', vscode.TreeItemCollapsibleState.Collapsed),
		new vscode.TreeItem('オススメVSCode拡張機能', vscode.TreeItemCollapsibleState.Collapsed),
	];
	private readonly	aTreeTemp: vscode.TreeItem[] = [
		new vscode.TreeItem('横書き「初音館にて」'),
		new vscode.TreeItem('縦書き「桜の樹の下には」'),
	];
	private readonly	aTreeFamibee: vscode.TreeItem[] = [
		new vscode.TreeItem('famibee blog'),
		new vscode.TreeItem('famibee Mail'),
		new vscode.TreeItem('famibee Twitter'),
	];
	private readonly	aTreeVSCodeEx: vscode.TreeItem[] = [
		new vscode.TreeItem('日本語化'),
		new vscode.TreeItem('Material Icon Theme'),
		new vscode.TreeItem('Bookmarks'),
		new vscode.TreeItem('HTML Preview'),
		new vscode.TreeItem('HTMLHint'),
		new vscode.TreeItem('Cordova Tools'),
		new vscode.TreeItem('Debugger for Chrome'),
		new vscode.TreeItem('glTF Tools'),
	];

	constructor() {
		this.aTree.map(v=> {
			v.iconPath =
				(v.collapsibleState == vscode.TreeItemCollapsibleState.None)
				? oIcon('document')
				: vscode.ThemeIcon.Folder;
			v.contextValue = v.label;
		});

		this.aTreeTemp.map(v=> {
			v.iconPath = oIcon('baggage');
			v.contextValue = v.label;
		});

		this.aTreeFamibee.map(v=> {
			v.iconPath = oIcon('document');
			v.contextValue = v.label;
		});
		this.aTreeFamibee[1].iconPath = oIcon('mail');
		this.aTreeFamibee[2].iconPath = oIcon('twitter');

		this.aTreeVSCodeEx.map(v=> {
			v.iconPath = oIcon('gear');
			v.contextValue = v.label;
		});

		vscode.commands.registerCommand('sn.opDev', ()=> vscode.env.openExternal(vscode.Uri.parse('https://famibee.github.io/SKYNovel/dev.htm')));
		vscode.commands.registerCommand('sn.opTag', ()=> vscode.env.openExternal(vscode.Uri.parse('https://famibee.github.io/SKYNovel/tag.htm')));
		vscode.commands.registerCommand('sn.opMacroPlg', ()=> vscode.env.openExternal(vscode.Uri.parse('https://famibee.github.io/SKYNovel/macro_plg.htm')));
		vscode.commands.registerCommand('sn.opGallery', ()=> vscode.env.openExternal(vscode.Uri.parse('https://famibee.github.io/SKYNovel_gallery/')));

		vscode.commands.registerCommand('sn.dlTmpYoko', ()=> vscode.env.openExternal(vscode.Uri.parse('https://github.com/famibee/SKYNovel_hatsune/archive/master.zip')));
		vscode.commands.registerCommand('sn.dlTmpTate', ()=> vscode.env.openExternal(vscode.Uri.parse('https://github.com/famibee/SKYNovel_uc/archive/master.zip')));

		vscode.commands.registerCommand('sn.opFamibeeBlog', ()=> vscode.env.openExternal(vscode.Uri.parse('https://famibee.blog.fc2.com/')));
		vscode.commands.registerCommand('sn.mail2famibee', ()=> vscode.env.openExternal(vscode.Uri.parse('mailto:famibee@gmail.com')));
		vscode.commands.registerCommand('sn.tw2famibee', ()=> vscode.env.openExternal(vscode.Uri.parse('https://twitter.com/famibee')));

		vscode.commands.registerCommand('sn.opVSCodeExJa', ()=> vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja')));
		vscode.commands.registerCommand('sn.opVSCodeExIcon', ()=> vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme')));
		vscode.commands.registerCommand('sn.opVSCodeExBookmarks', ()=> vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=alefragnani.Bookmarks')));
		vscode.commands.registerCommand('sn.opVSCodeExLiveHTMLPrev', ()=> vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=tht13.html-preview-vscode')));
		vscode.commands.registerCommand('sn.opVSCodeExHTMLHint', ()=> vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=mkaufman.HTMLHint')));
		vscode.commands.registerCommand('sn.opVSCodeExCordovaTools', ()=> vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.cordova-tools')));
		vscode.commands.registerCommand('sn.opVSCodeExDbg4Chrome', ()=> vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome')));
		vscode.commands.registerCommand('sn.opVSCodeExglTFTools', ()=> vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=cesium.gltf-vscode')));
	}

	getTreeItem = (elm: vscode.TreeItem)=> elm;
	getChildren(elm?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		if (! elm) return Promise.resolve(this.aTree);

		switch (elm.label) {
		case 'テンプレート プロジェクト':	return Promise.resolve(this.aTreeTemp);
		case 'famibee 連絡先':	return Promise.resolve(this.aTreeFamibee);
		case 'オススメVSCode拡張機能':	return Promise.resolve(this.aTreeVSCodeEx);
		}
		return Promise.resolve([]);
	}
}
