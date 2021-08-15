/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, setCtx4} from './CmnLib';
import {WorkSpaces} from './WorkSpaces';
import {ToolBox} from './ToolBox';
import {TreeDPDoc} from './TreeDPDoc';

import {TreeDataProvider, TreeItem, ExtensionContext, window, commands, Uri, workspace, EventEmitter, Event, WebviewPanel, ViewColumn} from 'vscode';
const {exec} = require('child_process');
import fs = require('fs-extra');
import https = require('https');

export enum eTree {
	NODE = 0,
	NPM,
	SKYNOVEL_VER,
};

export class ActivityBar implements TreeDataProvider<TreeItem> {
	static start(ctx: ExtensionContext) {
		setCtx4(ctx);

		ActivityBar.actBar = new ActivityBar(ctx);
		ctx.subscriptions.push(window.registerTreeDataProvider('sn-setting', ActivityBar.actBar));

		ActivityBar.tlBox = new ToolBox(ctx);
		ctx.subscriptions.push(window.registerWebviewViewProvider('sn-tb', ActivityBar.tlBox));

		ctx.subscriptions.push(window.registerTreeDataProvider('sn-doc', new TreeDPDoc(ctx)));
	}
	private static actBar: ActivityBar;
	private static workSps: WorkSpaces;
	private static tlBox: ToolBox;
	static stop() {
		ActivityBar.actBar.dispose();
		ActivityBar.workSps.dispose();
		ActivityBar.tlBox.dispose();
	}


	private readonly aDevEnv: {label: string, icon: string}[]
	= [
		{label: 'Node.js',	icon: 'node-js-brands'},
		{label: 'npm',		icon: 'npm-brands'},
		{label: 'SKYNovel（最新）',		icon: 'skynovel'},
	];
	private readonly aTiRoot: TreeItem[] = [];
	static aReady	= [false, false, false, false];


	private constructor(private readonly ctx: ExtensionContext) {
		this.aTiRoot = this.aDevEnv.map(v=> {
			const ti = new TreeItem(v.label);
			if (v.label) ti.iconPath = oIcon(v.icon);
			ti.contextValue = v.label;
			return ti;
		});
		this.chkLastSNVer();

		ActivityBar.workSps = new WorkSpaces(ctx, ()=> this.chkLastSNVer());
		ctx.subscriptions.push(window.registerTreeDataProvider('sn-ws', ActivityBar.workSps));

		ctx.subscriptions.push(commands.registerCommand('skynovel.refreshSetting', ()=> this.refresh()));	// refreshボタン
		ctx.subscriptions.push(commands.registerCommand('skynovel.dlNode', ()=> this.openEnvInfo()));

		this.refreshWork();
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
		if (! t) return Promise.resolve(this.aTiRoot);

		const ret: TreeItem[] = [];
		if (t.label === 'Node.js') this.aTiRoot[eTree.NODE].iconPath = oIcon((ActivityBar.aReady[eTree.NODE]) ?'node-js-brands' :'error');
		return Promise.resolve(ret);
	}

	// 環境チェック
	private refreshWork(): void {
		ActivityBar.aReady[eTree.NODE] = false;
		ActivityBar.aReady[eTree.NPM] = false;
		ActivityBar.workSps.enableButton(false);
		exec('node -v', (err: Error, stdout: string|Buffer)=> {
			const tiNode = this.aTiRoot[eTree.NODE];
			const tiNpm = this.aTiRoot[eTree.NPM];
			if (err) {
				tiNode.description = `-- 見つかりません`;
				tiNode.iconPath = oIcon('error');
				this._onDidChangeTreeData.fire(tiNode);

				tiNpm.description = `-- （割愛）`;
				tiNpm.iconPath = oIcon('error');
				this._onDidChangeTreeData.fire(tiNpm);
				this.openEnvInfo();
				return;
			}
			ActivityBar.aReady[eTree.NODE] = true;
			tiNode.description = `-- ${stdout}`;
			tiNode.iconPath = oIcon('node-js-brands');
			this._onDidChangeTreeData.fire(tiNode);

			exec('npm -v', (err: Error, stdout: string|Buffer)=> {
				if (err) {
					tiNpm.description = `-- 見つかりません`;
					tiNpm.iconPath = oIcon('error');
					this._onDidChangeTreeData.fire(tiNpm);
					this.openEnvInfo();
					return;
				}
				ActivityBar.aReady[eTree.NPM] = true;
				tiNpm.description = `-- ${stdout}`;
				tiNpm.iconPath = oIcon('npm-brands');
				this._onDidChangeTreeData.fire(tiNpm);
				ActivityBar.workSps.enableButton(true);
			});
		});
	}
	private chkLastSNVer() {
		const aFld = workspace.workspaceFolders;
		if (! aFld) return;

		https.get('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json', res=> {
			let body = '';
			res.setEncoding('utf8');
			res.on('data', (chunk: string)=> body += chunk);
			res.on('end', ()=> {
				const newVer = JSON.parse(body).version;
				const node = this.aTiRoot[eTree.SKYNOVEL_VER];
				node.description = '-- ' + newVer;
				ActivityBar.actBar._onDidChangeTreeData.fire(node);
				if (aFld.find(fld=> {
					const fnLocal = fld.uri.fsPath + '/package.json';
					if (! fs.existsSync(fnLocal)) return false;

					const localVer = fs.readJsonSync(fnLocal).dependencies['@famibee/skynovel']?.slice(1);
					if (localVer.slice(0, 4) === 'ile:') return false;
					return (newVer != localVer);
				})) window.showInformationMessage(`SKYNovelに更新（${newVer}）があります。【開発ツール】-【SKYNovel更新】のボタンを押してください`);
			});
		}).on('error', (e: Error)=> console.error(e.message));
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

		fs.readFile(path_doc +`/envinfo.htm`, 'utf-8', (err, data)=> {
			if (err) throw err;

			const wv = this.pnlWV!.webview;
			this.pnlWV!.webview.html = data
			.replace(/\$\{webview.cspSource}/g, wv.cspSource)
			.replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(uf_path_doc)}/`)
		});
	}

}
