/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, statBreak, is_mac, is_win} from './CmnLib';
import {Project} from './Project';

import {TreeDataProvider, ExtensionContext, TreeItem, commands, tasks, TreeItemCollapsibleState, workspace, TaskProcessEndEvent, WorkspaceFoldersChangeEvent, EventEmitter, Event, WorkspaceFolder, ThemeIcon, window, Task, ShellExecution, Range, TextEditorDecorationType, TextEditor} from 'vscode';

import fs = require('fs-extra');

interface DecChars {
	aRange		: Range[];
	decorator	: TextEditorDecorationType;
}

export class WorkSpaces implements TreeDataProvider<TreeItem> {
	private readonly	aTiRoot		: TreeItem[] = [];
	private readonly	oTiPrj		: {[name: string]: TreeItem[]} = {};

	private	readonly TreeChild	: {
		icon	: string,
		label	: string,
		cmd		: string,
		desc?	: string,
	}[] = [
		{icon: 'gear',	label: 'プロジェクト設定', cmd: 'skynovel.devPrjSet'},
		{icon: 'skynovel',	label: 'SKYNovel更新', cmd: 'skynovel.devSnUpd'},
		{icon: 'plugin',	label: '全ライブラリ更新', cmd: 'skynovel.devLibUpd'},
		{icon: 'browser',	label: 'ブラウザ版を起動', cmd: 'skynovel.devTaskWeb'},
		{icon: 'electron',	label: 'アプリ版を起動', cmd: 'skynovel.devTaskStart'},
		{icon: 'windows',	label: 'exe生成', cmd: 'skynovel.devTaskPackWin'},
		{icon: 'macosx',	label: 'app生成', cmd: 'skynovel.devTaskPackMac', desc: is_mac ?'' :'OS X 上のみ'},
		{icon: 'gear',		label: '暗号化', cmd: 'skynovel.devCrypto'},
		{icon: 'gear',		label: 'リビルド', cmd: 'skynovel.devReBuild'},
	];
	private	readonly idxDevPrjSet		= 1;
	private	readonly idxDevTaskPackMac	= 6;
	private	readonly idxDevCrypto		= 7;

	private hPrj	: {[dir: string]: Project}	= {};

	constructor(private readonly ctx: ExtensionContext, private readonly chkLastVerSKYNovel: ()=> void) {
		if (is_win) {
			const tc = this.TreeChild[this.idxDevTaskPackMac];
			tc.label = '';
			tc.cmd = '';
			tc.desc = '（Windowsでは使えません）';
		}

		this.refresh();
		workspace.onDidChangeWorkspaceFolders(e=> this.refresh(e));

		this.TreeChild.forEach(v=> {if (v.cmd) ctx.subscriptions.push(commands.registerCommand(v.cmd, ti=> this.onClickTreeItemBtn(ti)))});

		tasks.onDidEndTaskProcess(e=> this.fnc_onDidEndTaskProcess(e));

		this.onUpdDoc(window.activeTextEditor);
		window.onDidChangeActiveTextEditor(te=> this.onUpdDoc(te), null, ctx.subscriptions);
		workspace.onDidCloseTextDocument(td=> {
			if (this.teActive?.document === td) this.teActive = undefined;
		});
		workspace.onDidChangeTextDocument(e=> {
			if (e.document === this.teActive?.document) this.onUpdDoc(this.teActive);
		}, null, ctx.subscriptions);
	}

	private tidDelay: NodeJS.Timer | null = null;
	private onUpdDoc(te: TextEditor | undefined) {
		if (! te) return;
		if (te.document.languageId != 'skynovel') return;

		this.teActive = te;

		// 遅延
		if (this.tidDelay) clearTimeout(this.tidDelay);
		this.tidDelay = setTimeout(()=> this.updDeco(), 500);
	}

	private teActive: TextEditor | undefined;
	private decChars: DecChars = {
		aRange: [],
		decorator: window.createTextEditorDecorationType({})
	};
	private	static	readonly REG_FN_OR_LABEL = /(?<=\s)(?:fn|label)\s*=\s*([^\]\s]+)/g;
	private	updDeco() {
		if (! this.teActive) return;

		const doc = this.teActive.document;
		const src = doc.getText();

		window.setStatusBarMessage('');
		this.decChars.decorator.dispose();
		this.decChars = {
			aRange: [],
			decorator: window.createTextEditorDecorationType({
				'light': {'textDecoration': 'underline',},
				'dark': {'textDecoration': 'underline',}
			})
		}

		// fn属性やlabel属性の値に下線を引くように
		let m;
		// 全ループリセットかかるので不要	.lastIndex = 0;	// /gなので必要
		while (m = WorkSpaces.REG_FN_OR_LABEL.exec(src)) {
			this.decChars.aRange.push(new Range(
				doc.positionAt(m.index +m[0].length -m[1].length),
				doc.positionAt(m.index +m[0].length)
			));
		}
		this.teActive.setDecorations(this.decChars.decorator, this.decChars.aRange);
	}

	private	fnc_onDidEndTaskProcess = (_e: TaskProcessEndEvent)=> {};

	private refresh(e?: WorkspaceFoldersChangeEvent): void {
		const aFld = workspace.workspaceFolders;
		if (! aFld) return;	// undefinedだった場合はファイルを開いている

		// フォルダーを開いている（len>1 ならワークスペース）
		if (! e)  {
			// 起動時
			aFld.forEach(fld=> this.makePrj(fld));	// 生成
			this.aTiRoot[0].collapsibleState = TreeItemCollapsibleState.Expanded;	// 利便性的に先頭は開く
			this._onDidChangeTreeData.fire(undefined);
			return;
		}

		// フォルダ増減時
		if (e.added.length > 0) this.makePrj(aFld.slice(-1)[0]);
			// 最後の一つと思われる
		else {
			const nm = e.removed[0].name;	// 一つだけ対応
			const del = this.aTiRoot.findIndex(v=> v.label === nm);
			this.aTiRoot.splice(del, 1);

			const dir = e.removed[0].uri.fsPath;
			delete this.oTiPrj[dir];

			this.hPrj[dir].dispose();
		}
		this._onDidChangeTreeData.fire(undefined);
	}
	private readonly _onDidChangeTreeData: EventEmitter<TreeItem | undefined> = new EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

	// WorkspaceFolder を TreeItem に反映
	private makePrj(fld: WorkspaceFolder) {
		const t = new TreeItem('', TreeItemCollapsibleState.Collapsed);
		const dir = fld.uri.fsPath;
		t.iconPath = ThemeIcon.Folder;
		t.tooltip = dir;	// 他のキーになっているので変更不可
		t.description = fld.name;
		this.aTiRoot.push(t);

		const existPkgJS = fs.existsSync(dir +'/package.json');
		const existPrjJS = fs.existsSync(dir +'/doc/prj/prj.json');
		if (! existPkgJS || ! existPrjJS) {
			const ti = new TreeItem(`${existPkgJS ?'prj' :'package'}.json がありません`);
			ti.iconPath = oIcon('warn');
			this.oTiPrj[dir] = [ti];
			return;
		}

		// プロジェクト追加
		this.oTiPrj[dir] = this.TreeChild.map(v=> {
			const t2 = new TreeItem(v.label);
			t2.iconPath = oIcon(v.icon);
			t2.contextValue = t2.label;
			t2.description = v.desc ?? '';
			t2.tooltip = dir;	// 親プロジェクト特定用、まぁ見えても変でない情報
			return t2;
		});

		this.updLocalSNVer(dir);

		this.hPrj[dir] = new Project(this.ctx, dir, title=> {
			t.label = title;
			this._onDidChangeTreeData.fire(t);
		});
		this.dspCryptoMode(dir);
	}
	// ローカル SKYNovel バージョン調査
	private updLocalSNVer(dir: string) {
		const o = fs.readJsonSync(dir +'/package.json');
		const localVer = o?.dependencies?.skynovel?.slice(1);
		this.oTiPrj[dir][this.idxDevPrjSet].description = localVer ?`-- ${localVer}` :'取得できません';
	}
	private dspCryptoMode(dir: string) {
		const tc = this.oTiPrj[dir];
		const fpf = this.hPrj[dir];
		tc[this.idxDevCrypto].description = `-- ${fpf.isCryptoMode ?'する' :'しない'}`;
	}

	private onClickTreeItemBtn(ti: TreeItem) {
		if (! ti) console.log(`fn:TreeDPDev.ts line:133 onClickTreeItemBtn undefined...`);
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
		if (i === -1) return;

		const tc = this.TreeChild[i];
		switch (tc.cmd) {
			case 'skynovel.devPrjSet':	this.hPrj[dir].openPrjSetting();
				return;
			case 'skynovel.devSnUpd':	cmd += `npm i skynovel@latest ${
				statBreak()} npm run webpack:dev`;
				this.chkLastVerSKYNovel();
				break;
			case 'skynovel.devLibUpd':	cmd += `npm update ${
				statBreak()} npm update --dev ${
				statBreak()} npm run webpack:dev`;	break;
			case 'skynovel.devTaskWeb':		cmd += 'npm run web';		break;
			case 'skynovel.devTaskStart':	cmd += 'npm run start';		break;
			case 'skynovel.devTaskPackWin':	cmd += 'npm run pack:win';	break;
			case 'skynovel.devTaskPackMac':	cmd += 'npm run pack:mac';	break;
			case 'skynovel.devCrypto':
				window.showInformationMessage('暗号化（する / しない）を切り替えますか？', {modal: true}, 'はい')
				.then(a=> {
					if (a != 'はい') return;

					this.hPrj[dir].tglCryptoMode();
					this.dspCryptoMode(dir);
					this._onDidChangeTreeData.fire(ti);
				});
				return;
			case 'skynovel.devReBuild':	cmd += 'npm run rebuild';	break;
			default:	return;
		}
		const t = new Task(
			{type: 'SKYNovel ' +i},	// definition（タスクの一意性）
			tc.label,					// name、UIに表示
			'SKYNovel',					// source
			new ShellExecution(cmd),
		);
		this.fnc_onDidEndTaskProcess
		= (tc.cmd === 'skynovel.devSnUpd'
		|| tc.cmd === 'skynovel.devLibUpd')
			? e=> {
				if (e.execution.task.definition.type != t.definition.type) return;
				if (e.execution.task.source != t.source) return;

				this.updLocalSNVer(dir);
				this._onDidChangeTreeData.fire(undefined);
			}
			: ()=> {};
		tasks.executeTask(t)
		.then(undefined, rj=> console.error(`fn:TreeDPDev onClickTreeItemBtn() rj:${rj.message}`));
	}

	getTreeItem = (t: TreeItem)=> t;
	getChildren(t?: TreeItem): Thenable<TreeItem[]> {
		return Promise.resolve(t ?this.oTiPrj[t.tooltip!] :this.aTiRoot);
	}

	dispose() {
		for (const dir in this.hPrj) this.hPrj[dir].dispose();
		this.hPrj = {};
	}

}
