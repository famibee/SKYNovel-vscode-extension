/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import * as vscode from 'vscode';
const {exec} = require('child_process');
const https = require('https');
const fs = require('fs');
const os = require('os');

enum eReady {
	node = 0,
	npm,
	windows_build_tools,
	skynovel
};

function oIcon(name: string) {return {
	light: `${__filename}/../../res/light/${name}.svg`,
	dark: `${__filename}/../../res/dark/${name}.svg`
}};

const is_win = process.platform === 'win32';
const is_mac = process.platform === 'darwin';
//const is_linux = process.platform === 'linux';

export class ActivityBar implements vscode.TreeDataProvider<vscode.TreeItem> {
	static start(context: vscode.ExtensionContext) {
		ActivityBar.trDPEnv = new ActivityBar(context);
		vscode.window.registerTreeDataProvider('sn-setting', ActivityBar.trDPEnv);
		vscode.window.registerTreeDataProvider('sn-doc', new TreeDPDoc);
	}
	static trDPEnv: ActivityBar;
	static stopActBar() {
		ActivityBar.trDPEnv.dispose();
	}


	private readonly aTree: vscode.TreeItem[] = [
		new vscode.TreeItem('Node.js'),
		new vscode.TreeItem('npm'),
		new vscode.TreeItem(is_mac ?'' :'windows-build-tools'),
		new vscode.TreeItem('SKYNovel', vscode.TreeItemCollapsibleState.Expanded),
	];
	private aReady: (boolean | undefined)[] = [undefined, undefined, undefined];

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
	}
	private dispose() {if (this.pnlWV) this.pnlWV.dispose();}

	// refreshボタン
	private refresh(): void {
		this.refreshWork();
		this._onDidChangeTreeData.fire();
	}
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

	readonly getTreeItem = (elm: vscode.TreeItem)=> elm;

	// 起動時？　と refreshボタンで呼ばれる
	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		if (element == undefined) return Promise.resolve(this.aTree);

		const ret: vscode.TreeItem[] = [];
		switch (element.label) {
		case 'Node.js':
			this.aTree[eReady.node].iconPath = (this.aReady[eReady.node])
				? ''
				: oIcon('error');
			break;

		case 'SKYNovel':	return Promise.resolve(this.aTreeSnWs);
		}
		return Promise.resolve(ret);
	}

	// 環境チェック
	private refreshWork(): void {
		let error = 0;
		if (! this.aReady[eReady.node]) exec('node -v', (err: Error, stdout: string|Buffer)=> {
			const node = this.aTree[eReady.node];
			if (err) {
				this.aReady[eReady.node] = false;
				node.description = `-- 見つかりません`;
				node.iconPath = oIcon('error');
				this._onDidChangeTreeData.fire();
				this.activityBarBadge(++error);
				return;
			}
			this.aReady[eReady.node] = true;
			node.description = `-- ${stdout}`;
			node.iconPath = '';
			this._onDidChangeTreeData.fire();
		});

		const wbt = this.aTree[eReady.windows_build_tools];
		const chkWbt = ()=> {
			// （windowsのみ）管理者権限で PowerShell を起動し、【npm i -g windows-build-tools】を実行。「All done!」まで待つ。
			if (! is_win) return;
			exec('npm ls -g windows-build-tools', (err: Error, stdout: string|Buffer)=> {
				const a = String(stdout).split(/@|\n/);
				if (err || a.length < 3) {
					this.aReady[eReady.windows_build_tools] = false;
					wbt.description = `-- 見つかりません`;
					wbt.iconPath = oIcon('error');
					this._onDidChangeTreeData.fire();
					this.activityBarBadge(++error);
					return;
				}
				this.aReady[eReady.windows_build_tools] = true;
				wbt.description = `-- ${a[2]}`;
				wbt.iconPath = '';
				this._onDidChangeTreeData.fire();
			});
		};
		if (this.aReady[eReady.npm]) chkWbt();
		else exec('npm -v', (err: Error, stdout: string|Buffer)=> {
			const npm = this.aTree[eReady.npm];
			if (err) {
				this.aReady[eReady.npm] = false;
				npm.description = `-- 見つかりません`;
				npm.iconPath = oIcon('error');
				this._onDidChangeTreeData.fire();
				this.activityBarBadge(++error);

				if (is_win) wbt.description = `-- 見つかりません`;
				return;
			}
			this.aReady[eReady.npm] = true;
			npm.description = `-- ${stdout}`;
			npm.iconPath = '';
			this._onDidChangeTreeData.fire();

			chkWbt();
		});

		// workspace.onDidChangeWorkspaceFolders	WorkspaceFolderが追加されたり削除されたりした場合、イベントが実行される
		const aFld = vscode.workspace.workspaceFolders;
		// undefinedだった場合はファイルを開いている
		// フォルダーを開いている（len>1 ならワークスペース）
		// ファイル増減を監視し、path.json を自動更新する
		this.aTreeSnWs = [];
		if (aFld) https.get('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json', (res: any)=> {
			let body = '';
			res.setEncoding('utf8');
			res.on('data', (chunk: string)=> {body += chunk;});
			res.on('end', ()=> {
				const newVer = JSON.parse(body).version;
				this.aTree[eReady.skynovel].description = `-- ${newVer}`;
				aFld.map(fld=> {
					const w = new vscode.TreeItem(fld.name);
					w.tooltip = fld.uri.path;
					w.iconPath = oIcon('warn');
					this.aTreeSnWs.push(w);

					const fnLocal = fld.uri.fsPath + '/package.json';
						// 必ず fsPath で。「\c:\Users\〜」とかになる。
					if (! fs.existsSync(fnLocal)) {
						w.tooltip = w.description = `-- package.json がありません`;
						return;
					}

					const localVer = JSON.parse(fs.readFileSync(fnLocal)).dependencies.skynovel.slice(1);
					if (newVer != localVer) {
						w.tooltip = w.description = `-- ver ${localVer} は古いです。なるべく更新して下さい`;
						// TODO: ワンタッチ更新
	//					vscode.window.showInformationMessage(`SKYNovelに更新（${newVer}）があります。【タスクの実行...】から【npm: upd】を実行してください`);

						return;
					}

					w.tooltip = w.description = `-- 最新です`;
					w.iconPath = '';
				});
				this._onDidChangeTreeData.fire();
			});
		}).on('error', (e: Error)=> console.error(e.message));
	}
	private aTreeSnWs: vscode.TreeItem[] = [
	];


	private pnlWV: vscode.WebviewPanel | null = null;
	private async activityBarBadge(num = 0) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
		if (this.pnlWV) {this.pnlWV.reveal(column); return;}

		const path_doc = this.context.extensionPath +'/doc';
		this.pnlWV = vscode.window.createWebviewPanel('SKYNovel-envinfo', 'SKYNovel情報', column || vscode.ViewColumn.One, {
			enableScripts: false,
//			localResourceRoots: [vscode.Uri.file(path_doc)]
		});
		this.pnlWV.onDidDispose(()=> this.pnlWV = null);	// 閉じられたとき

		fs.readFile(path_doc +`/index.htm`, 'utf-8', (err: Error, content: string)=> {
			if (err) {console.error(err); throw err;}
			this.pnlWV!.webview.html = content.replace('${エラー数}', String(num));
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
			v.iconPath = oIcon((v.collapsibleState == vscode.TreeItemCollapsibleState.None)
				? 'document'
				: 'folder'
			);
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
		if (elm == undefined) return Promise.resolve(this.aTree);

		switch (elm.label) {
		case 'テンプレート プロジェクト':	return Promise.resolve(this.aTreeTemp);
		case 'famibee 連絡先':	return Promise.resolve(this.aTreeFamibee);
		case 'オススメVSCode拡張機能':	return Promise.resolve(this.aTreeVSCodeEx);
		}
		return Promise.resolve([]);
	}
}
