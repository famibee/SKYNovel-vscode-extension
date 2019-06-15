/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {TreeDataProvider, ExtensionContext, TreeItem, commands, tasks, TreeItemCollapsibleState, workspace, TaskProcessEndEvent, WorkspaceFoldersChangeEvent, EventEmitter, Event, WorkspaceFolder, ThemeIcon, Disposable, window, Task, ShellExecution} from 'vscode';
import {updPathJson, updPlugin} from './UpdFileWork';
import {ReferenceProvider} from './ReferenceProvider';
const fs = require('fs');

export function oIcon(name: string) {return {
	light: `${__filename}/../../../res/light/${name}.svg`,
	dark: `${__filename}/../../../res/dark/${name}.svg`
}};

export const is_win = process.platform === 'win32';
export const is_mac = process.platform === 'darwin';
//const is_linux = process.platform === 'linux';

export class TreeDPDev implements TreeDataProvider<TreeItem> {
	private readonly	aTree: TreeItem[] = [];
	private 			oTreePrj: {[name: string]: TreeItem[]} = {};

	private	readonly	rp	: ReferenceProvider;	// リファレンス

	constructor(context: ExtensionContext) {
		this.rp = new ReferenceProvider(context);

		[
			'sn.devSnUpd',
			'sn.devTaskWeb',
			'sn.devTaskStart',
			'sn.devTaskPackWin',
			'sn.devTaskPackMac',
		].forEach(v=> commands.registerCommand(v, ti=> this.fncDev(ti)));

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
				let del = this.aTree.findIndex(v=> v.label === nm);
				this.aTree.splice(del, 1);

				const dir = e.removed[0].uri.fsPath;
				delete this.oTreePrj[dir];

				const d = this.oDisposeFSW[dir];
				d.crePrj.dispose();
				d.chgPrj.dispose();
				d.delPrj.dispose();
				d.crePlg.dispose();
				d.delPlg.dispose();
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

	private	readonly TreeChild = [
		{icon: 'skynovel',	label: 'SKYNovel更新'},
		{icon: 'browser',	label: 'ブラウザ版を起動'},
		{icon: 'electron',	label: 'アプリ版を起動'},
		{icon: 'windows',	label: 'exe生成'},
		{icon: 'macosx',	label: 'app生成（macOS上のみ）'},
	];
	private wsf2tree(fld: WorkspaceFolder) {
		const t = new TreeItem(fld.name, TreeItemCollapsibleState.Collapsed);
		const dir = fld.uri.fsPath;
		t.iconPath = ThemeIcon.Folder;
		t.tooltip = dir;
		t.description = '';
		this.aTree.push(t);

		const pathPkg = dir +'/package.json';
		if (! fs.existsSync(pathPkg)) {
			t.tooltip = t.description = 'package.json がありません';
			return;
		}

		this.oTreePrj[t.tooltip] = this.TreeChild.map(v=> {
			const ti = new TreeItem(v.label);
			ti.iconPath = oIcon(v.icon);
			ti.contextValue = ti.label;
			ti.tooltip = dir;	// 親プロジェクト特定用、まぁ見えても変でない情報
			return ti;
		});

		// ローカル SKYNovel バージョン調査
		this.updLocalSNVer(dir);

		// ファイル増減を監視し、path.json を自動更新
		const cur = dir +'/prj/';
		if (! fs.existsSync(cur +'prj.json')) {
			t.tooltip = t.description = 'prj/prj.json がありません';
			return;
		}
		const oPpj = JSON.parse(fs.readFileSync(cur +'prj.json'));
		if (oPpj.book) t.description = oPpj.book.title || '';
		const fwPrj = workspace.createFileSystemWatcher(cur +'?*/*');

		// プラグインフォルダ増減でビルドフレームワークに反映する機能
		// というか core/plugin/plugin.js自動更新機能
		const curPlg = dir +'/core/plugin';	// エラーではなく自動生成する方向で
		if (! fs.existsSync(dir +'/core')) fs.mkdirSync(dir +'/core');
		if (! fs.existsSync(curPlg)) fs.mkdirSync(curPlg);
		const fwPlg = workspace.createFileSystemWatcher(curPlg +'/?*/');

		this.oDisposeFSW[dir] = {
			crePrj: fwPrj.onDidCreate(e=> {this.rp.chgPrj(e); updPathJson(cur);}),
			chgPrj: fwPrj.onDidChange(e=> {this.rp.repPrj(e)}),
			delPrj: fwPrj.onDidDelete(e=> {this.rp.chgPrj(e); updPathJson(cur);}),
			crePlg: fwPlg.onDidCreate(()=> updPlugin(curPlg)),
			delPlg: fwPlg.onDidDelete(()=> updPlugin(curPlg)),
		};	// NOTE: ワークスペースだと、削除イベントしか発生しない？？
		updPathJson(cur);
		this.rp.updPrj(cur);
		updPlugin(curPlg);
	}
	private oDisposeFSW: {[name: string]: {
		crePrj: Disposable,
		chgPrj: Disposable,
		delPrj: Disposable,
		crePlg: Disposable,
		delPlg: Disposable,
	}} = {};
	private updLocalSNVer(dir: string) {
		const tc = this.oTreePrj[dir];
		const localVer = JSON.parse(fs.readFileSync(dir +'/package.json')).dependencies.skynovel.slice(1);
		tc[0].description = `-- ${localVer}`;
	}

	private fncDev(ti: TreeItem) {
		const aFld = workspace.workspaceFolders;
		if (! aFld) {	// undefinedだった場合はファイルを開いている
			window.showWarningMessage(`[SKYNovel] フォルダを開いているときのみ使用できます`);
			return;	// 一応どうやってもここには来れないようではある
		}

		// カレントディレクトリ設定（必要なら）
		let cmd = (aFld.length > 1)
			? `cd "${ti.tooltip}" ${this.statBreak()} `
			: '';
		// 自動で「npm i」
		const dir = ti.tooltip || '';
		if (! fs.existsSync(dir +'/node_modules')) cmd += `npm i ${this.statBreak()} `;

		// メイン処理
		const i = this.TreeChild.findIndex(v=> v.label === ti.label);
		switch (i) {
			case 0:	cmd += `npm i skynovel@latest ${
				this.statBreak()} npm run webpack:dev`;	break;
				// NOTE: 全ライブラリ更新は npm update。ただし @latest 動作がない
			case 1:	cmd += 'npm run web';		break;
			case 2:	cmd += 'npm run start';		break;
			case 3:	cmd += 'npm run pack:win';	break;
			case 4:	cmd += 'npm run pack:mac';	break;
			default:	return;
		}
		const t = new Task(
			{type: 'SKYNovelEx Task ' +i},	// definition（タスクの一意性）
			this.TreeChild[i].label,	// name、UIに表示
			'SKYNovel',					// source
			new ShellExecution(cmd),
		);

		this.fnc_onDidEndTaskProcess = (i == 0)
			? e=> {
				if (e.execution.task.definition.type != t.definition.type) return;
				if (e.execution.task.source != t.source) return;

				this.updLocalSNVer(dir);
				this._onDidChangeTreeData.fire();
			}
			: ()=> {};
		tasks.executeTask(t);
	}
	private	readonly statBreak: {(): string} =
		is_mac ? ()=> '&&'
		: is_win ? ()=> {
			const isPS = String(workspace.getConfiguration('terminal.integrated.shell').get('windows')).slice(-14);
			return (isPS === 'powershell.exe') ?';' :'&';
		}
		: ()=> ';';

	getTreeItem = (elm: TreeItem)=> elm;
	getChildren(elm?: TreeItem): Thenable<TreeItem[]> {
		return Promise.resolve((elm)?this.oTreePrj[elm.tooltip!] :this.aTree);
	}

	dispose() {
		for (const dir in this.oDisposeFSW) {
			const d = this.oDisposeFSW[dir];
			d.crePrj.dispose();
			d.chgPrj.dispose();
			d.delPrj.dispose();
			d.crePlg.dispose();
			d.delPlg.dispose();
		}
		this.oDisposeFSW = {};
	}

}
