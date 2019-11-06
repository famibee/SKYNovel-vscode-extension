/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, statBreak} from './CmnLib';
import {PrjFileProc} from './PrjFileProc';

import {TreeDataProvider, ExtensionContext, TreeItem, commands, tasks, TreeItemCollapsibleState, workspace, TaskProcessEndEvent, WorkspaceFoldersChangeEvent, EventEmitter, Event, WorkspaceFolder, ThemeIcon, window, Task, ShellExecution} from 'vscode';

const fs = require('fs-extra');

export class TreeDPDev implements TreeDataProvider<TreeItem> {
	private readonly	aTree	: TreeItem[] = [];
	private 			oTreePrj: {[name: string]: TreeItem[]} = {};

	private	readonly TreeChild	: {
		icon	: string,
		label	: string,
		cmd		: string,
	}[] = [
		{icon: 'skynovel',	label: 'SKYNovel更新', cmd: 'skynovel.devSnUpd'},
		{icon: 'browser',	label: 'ブラウザ版を起動', cmd: 'skynovel.devTaskWeb'},
		{icon: 'electron',	label: 'アプリ版を起動', cmd: 'skynovel.devTaskStart'},
		{icon: 'windows',	label: 'exe生成', cmd: 'skynovel.devTaskPackWin'},
		{icon: 'macosx',	label: 'app生成（macOS上のみ）',
											cmd: 'skynovel.devTaskPackMac'},
		{icon: 'gear',		label: '暗号化', cmd: 'skynovel.devCrypt'},
	];

	private oPfp	: {[dir: string]: PrjFileProc}	= {};

	constructor(private readonly ctx: ExtensionContext) {
		this.TreeChild.forEach(v=> commands.registerCommand(v.cmd, ti=> this.fncDev(ti)));

		tasks.onDidEndTaskProcess(e=> this.fnc_onDidEndTaskProcess(e));

		// コンストラクタは「フォルダを開く」で発動、
		// その後「ワークスペースにフォルダーを追加」で再度発動する。
		// staticに物を置かないのが吉。
		this.refresh();
		if (this.aTree.length > 0) this.aTree[0].collapsibleState = TreeItemCollapsibleState.Expanded;	// 利便性的に先頭は開く
		workspace.onDidChangeWorkspaceFolders(e=> this.refresh(e));
	}
	private	fnc_onDidEndTaskProcess = (_e: TaskProcessEndEvent)=> {};

	private refresh(e?: WorkspaceFoldersChangeEvent): void {
		const aFld = workspace.workspaceFolders;
		if (! aFld) return;	// undefinedだった場合はファイルを開いている

		// フォルダーを開いている（len>1 ならワークスペース）
		if (e) {
			if (e.added.length > 0) this.wsf2tree(aFld.slice(-1)[0]);
				// 最後の一つと思われる
			else {
				const nm = e.removed[0].name;	// 一つだけ対応
				const del = this.aTree.findIndex(v=> v.label === nm);
				this.aTree.splice(del, 1);

				const dir = e.removed[0].uri.fsPath;
				delete this.oTreePrj[dir];

				this.oPfp[dir].dispose();
			}
		}
		else {
			this.oTreePrj = {};
			aFld.forEach(fld=> this.wsf2tree(fld));	// 再生成
		}
		this._onDidChangeTreeData.fire();
	}
	private readonly _onDidChangeTreeData: EventEmitter<TreeItem | undefined> = new EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

	private wsf2tree(fld: WorkspaceFolder) {
		const t = new TreeItem('', TreeItemCollapsibleState.Collapsed);
		const dir = fld.uri.fsPath;
		t.iconPath = ThemeIcon.Folder;
		t.tooltip = dir;	// 他のキーになっているので変更不可
		t.description = fld.name;
		this.aTree.push(t);

		const pathPkg = dir +'/package.json';
		if (! fs.existsSync(pathPkg)) {
			t.label = 'package.json がありません';
			return;
		}

		this.oTreePrj[t.tooltip] = this.TreeChild.map(v=> {
			const ti = new TreeItem(v.label);
			ti.iconPath = oIcon(v.icon);
			ti.contextValue = ti.label;
			ti.tooltip = dir;	// 親プロジェクト特定用、まぁ見えても変でない情報
			return ti;
		});

		this.updLocalSNVer(dir);

		this.oPfp[dir] = new PrjFileProc(this.ctx, dir, title=> {
			t.label = title;
			this._onDidChangeTreeData.fire(t);
		});
		this.dspCryptMode(dir);
	}
	// ローカル SKYNovel バージョン調査
	private updLocalSNVer(dir: string) {
		const tc = this.oTreePrj[dir];
		const localVer = fs.readJsonSync(dir +'/package.json').dependencies.skynovel.slice(1);
		tc[0].description = `-- ${localVer}`;
	}
	private dspCryptMode(dir: string) {
		const tc = this.oTreePrj[dir];
		const fpf = this.oPfp[dir];
		tc[5].description = `-- ${fpf.isCryptMode ?'する' :'しない'}`;
	}

	private fncDev(ti: TreeItem) {
		const aFld = workspace.workspaceFolders;
		if (! aFld) {	// undefinedだった場合はファイルを開いている
			window.showWarningMessage(`[SKYNovel] フォルダを開いているときのみ使用できます`);
			return;	// 一応どうやってもここには来れないようではある
		}

		// カレントディレクトリ設定（必要なら）
		let cmd = (aFld.length > 1) ?`cd "${ti.tooltip}" ${statBreak()} ` :'';
		const dir = ti.tooltip ?? '';
		if (! fs.existsSync(dir +'/node_modules')) cmd += `npm i ${statBreak()} `;		// 自動で「npm i」

		// メイン処理
		const i = this.TreeChild.findIndex(v=> v.label === ti.label);
		if (i == -1) return;

		const tc = this.TreeChild[i];
		switch (tc.cmd) {
			case 'skynovel.devSnUpd':	cmd += `npm i skynovel@latest ${
				statBreak()} npm run webpack:dev`;	break;
				// NOTE: 全ライブラリ更新は npm update。ただし @latest 動作がない

			case 'skynovel.devCrypt':
				window.showInformationMessage('暗号化（する / しない）を切り替えますか？', {modal: true}, 'はい')
				.then(a=> {
					if (a != 'はい') return;

					this.oPfp[dir].tglCryptMode();
					this.dspCryptMode(dir);
					this._onDidChangeTreeData.fire(ti);
				});
				return;

			case 'skynovel.devTaskWeb':		cmd += 'npm run web';		break;
			case 'skynovel.devTaskStart':	cmd += 'npm run start';		break;
			case 'skynovel.devTaskPackWin':	cmd += 'npm run pack:win';	break;
			case 'skynovel.devTaskPackMac':	cmd += 'npm run pack:mac';	break;
			default:	return;
		}
		const t = new Task(
			{type: 'SKYNovel ' +i},	// definition（タスクの一意性）
			tc.label,					// name、UIに表示
			'SKYNovel',					// source
			new ShellExecution(cmd),
		);
		this.fnc_onDidEndTaskProcess = (i == 0)
			? e=> {
				if (e.execution.task.definition.type != t.definition.type) return;
				if (e.execution.task.source != t.source) return;

				this.updLocalSNVer(dir);
				this._onDidChangeTreeData.fire(ti);
			}
			: ()=> {};
		tasks.executeTask(t);
	}

	getTreeItem = (elm: TreeItem)=> elm;
	getChildren(elm?: TreeItem): Thenable<TreeItem[]> {
		return Promise.resolve((elm)?this.oTreePrj[elm.tooltip!] :this.aTree);
	}

	dispose() {
		for (const dir in this.oPfp) this.oPfp[dir].dispose();
		this.oPfp = {};
	}

}
