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
		this.chkLastSNVer();

		this.chkEnv(()=> {
			ctx.subscriptions.push(commands.registerCommand('skynovel.refreshSetting', ()=> this.refresh()));	// refreshボタン
			ctx.subscriptions.push(commands.registerCommand('skynovel.dlNode', ()=> this.openEnvInfo()));

			this.workSps = new WorkSpaces(ctx, ()=> this.chkLastSNVer());
			ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-ws', this.workSps));

			this.tlBox = new ToolBox(ctx);
			ctx.subscriptions.push(window.registerWebviewViewProvider('skynovel-tb', this.tlBox));

			ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-doc', new TreeDPDoc(ctx)));
		});

		ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-dev', this));
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
		const aFld = workspace.workspaceFolders;
		if (! aFld) return;

		https.get('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json', res=> {
			let body = '';
			res.setEncoding('utf8');
			res.on('data', (chunk: string)=> body += chunk);
			res.on('end', ()=> {
				const newVer = JSON.parse(body).version;
				const node = this.aTiEnv[eTreeEnv.SKYNOVEL_VER];
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
