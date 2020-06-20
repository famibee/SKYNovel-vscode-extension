/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, statBreak, is_win, treeProc} from './CmnLib';
import {Project} from './Project';

import {TreeDataProvider, ExtensionContext, TreeItem, commands, tasks, TreeItemCollapsibleState, workspace, TaskProcessEndEvent, WorkspaceFoldersChangeEvent, EventEmitter, Event, WorkspaceFolder, ThemeIcon, window, Task, ShellExecution, Range, TextEditorDecorationType, TextEditor, env, Uri} from 'vscode';

import fs = require('fs-extra');
import archiver = require('archiver');
import {basename, dirname} from 'path';

interface DecChars {
	aRange		: Range[];
	decorator	: TextEditorDecorationType;
}

export class WorkSpaces implements TreeDataProvider<TreeItem> {
	private readonly	aTiRoot		: TreeItem[] = [];
	private readonly	oTiPrj		: {[name: string]: TreeItem[]} = {};

	private	readonly aTreeTmp	: {
		cmd		: string,
		icon	: string,
		label	: string,
		desc?	: string,
		npm?	: string,
	}[] = [
		{cmd: 'PrjSet',		icon: 'gear',		label: 'プロジェクト設定'},
		{cmd: 'SnUpd',		icon: 'skynovel',	label: 'SKYNovel更新',
			npm: `npm un -S skynovel ${statBreak()
			} npm i @famibee/skynovel@latest ${statBreak()
			} npm run webpack:dev`},
		{cmd: 'LibUpd',		icon: 'plugin',		label: '全ライブラリ更新',
			npm: `npm update ${statBreak()
			} npm update --dev ${statBreak()
			} npm run webpack:dev`},
		{cmd: 'Crypto',		icon: 'gear',		label: '暗号化'},
		{cmd: 'ReBuild',	icon: 'gear',		label: 'リビルド',
			npm: 'npm run rebuild'},
		{cmd: 'TaskWeb',	icon: 'browser',	label: '起動：ブラウザ版',
			npm: 'npm run web'},
		{cmd: 'TaskApp',	icon: 'electron',	label: '起動：アプリ版',
			npm: 'npm run start'},
		{cmd: 'PackWin',	icon: 'windows',	label: '生成：Windows用 exe',
			npm: 'npm run pack:win'},
		{cmd: 'PackMac',	icon: 'macosx',		label: '生成：macOS用 app,dmg',
			npm: 'npm run pack:mac'},
//		{cmd: 'PackFreem',	icon: 'freem',		label: '生成：ふりーむ！形式 zip',
//			npm: 'npm run webpack:pro'},
	];
	private	readonly idxDevPrjSet	= 1;
	private	readonly idxDevCrypto	= 3;
	private	readonly idxDevPackMac	= 8;

	private hPrj	: {[dir: string]: Project}	= {};

	constructor(private readonly ctx: ExtensionContext, private readonly chkLastVerSKYNovel: ()=> void) {
		if (is_win) {
			const tc = this.aTreeTmp[this.idxDevPackMac];
			tc.label = '';
			tc.cmd = '';
			tc.desc = '（Windowsでは使えません）';
		}

		this.refresh();
		workspace.onDidChangeWorkspaceFolders(e=> this.refresh(e));

		this.aTreeTmp.forEach(v=> {if (v.cmd) ctx.subscriptions.push(commands.registerCommand('skynovel.dev'+ v.cmd, ti=> this.onClickTreeItemBtn(ti)))});

		tasks.onDidEndTaskProcess(e=> this.hOnEndTask?.[e.execution.task.name](e));

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
		this.oTiPrj[dir] = this.aTreeTmp.map(v=> {
			const t2 = new TreeItem(v.label);
			t2.iconPath = oIcon(v.icon);
			t2.contextValue = 'skynovel.dev'+ v.cmd;
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
		const localVer = o?.dependencies['@famibee/skynovel']?.slice(1);
		this.oTiPrj[dir][this.idxDevPrjSet].description = localVer ?`-- ${localVer}` :'取得できません';
	}
	private dspCryptoMode(dir: string) {
		const tc = this.oTiPrj[dir];
		const fpf = this.hPrj[dir];
		tc[this.idxDevCrypto].description = `-- ${fpf.isCryptoMode ?'する' :'しない'}`;
	}

	private	hOnEndTask: {[nm: string]: (e: TaskProcessEndEvent)=> void}	= {};
	private onClickTreeItemBtn(ti: TreeItem) {
		if (! ti) return;	// ここには来ないはず
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
		const i = this.aTreeTmp.findIndex(v=> v.label === ti.label);
		if (i === -1) return;

		const tc = this.aTreeTmp[i];	// タスク作成
		if (tc.npm) cmd += tc.npm;
		switch (tc.cmd) {	// タスク前処理
			case 'PrjSet':	this.hPrj[dir].openPrjSetting();	return;
			case 'SnUpd':	this.chkLastVerSKYNovel();	break;
			case 'Crypto':
				window.showInformationMessage('暗号化（する / しない）を切り替えますか？', {modal: true}, 'はい')
				.then(a=> {
					if (a != 'はい') return;

					this.hPrj[dir].tglCryptoMode();
					this.dspCryptoMode(dir);
					this._onDidChangeTreeData.fire(ti);
				});
				return;

			case 'PackFreem':
				let find_ng = false;
				treeProc(dir +'/doc/prj', url=> {
					if (find_ng || url.slice(-4) !== '.svg') return;

					find_ng = true;
					window.showErrorMessage(
						`ふりーむ！では svg ファイル使用禁止です。png などに置き換えて下さい`, 'フォルダを開く', 'Online Converter',
					)
					.then(a=> {switch (a) {
						case 'フォルダを開く':
							env.openExternal(Uri.file(dirname(url)));	break;
						case 'Online Converter':
							env.openExternal(Uri.parse('https://cancerberosgx.github.io/demos/svg-png-converter/playground/'));
							break;
					}});
				});
				if (find_ng) return;
				break;
		}

		const t = new Task(
			{type: 'SKYNovel ' +i},	// definition（タスクの一意性）
			tc.label,					// name、UIに表示
			'SKYNovel',					// source
			new ShellExecution(cmd),
		);
		switch (tc.cmd) {	// タスク後処理
			case 'SnUpd':
			case 'LibUpd':
				this.hOnEndTask[tc.label] = e=> {
					if (e.execution.task.definition.type != t.definition.type) return;
					if (e.execution.task.source != t.source) return;

					this.updLocalSNVer(dir);
					this._onDidChangeTreeData.fire(undefined);
				};
				break;

			case 'PackWin':
			case 'PackMac':
				this.hOnEndTask[tc.label] = ()=> window.showInformationMessage(
					`${tc.label} パッケージを生成しました`,
					'出力フォルダを開く'
				).then(()=> env.openExternal(Uri.file(dir +'/build/')));
				break;

			case 'PackFreem':	this.hOnEndTask[tc.label] = ()=> {
				const arc = archiver.create('zip', {zlib: {level: 9},})
				.append(fs.createReadStream(dir +'/doc/web.htm'), {name: 'index.html'})
				.append(fs.createReadStream(dir +'/build/include/readme.txt'), {name: 'readme.txt'})
				.glob('web.js', {cwd: dir +'/doc/'})
				.glob('prj/**/*', {cwd: dir +'/doc/'});

				const fn_out = `${basename(dir)}_1.0freem.zip`;
				const ws = fs.createWriteStream(dir +`/build/${fn_out}`)
				.on('close', ()=> window.showInformationMessage(
					`ふりーむ！形式で出力（${fn_out}）しました`, 'フォルダを開く',
				).then(()=> env.openExternal(Uri.file(dir +'/build/'))));
				arc.pipe(ws);
				arc.finalize();	// zip圧縮実行
				};
				break;
		}
		tasks.executeTask(t)
		.then(undefined, rj=> console.error(`fn:TreeDPDev onClickTreeItemBtn() rj:${rj.message}`));
	}

	getTreeItem = (t: TreeItem)=> t;
	getChildren(t?: TreeItem): TreeItem[] {
		return t ?this.oTiPrj[t.tooltip!] :this.aTiRoot;
	}

	dispose() {
		for (const dir in this.hPrj) this.hPrj[dir].dispose();
		this.hPrj = {};
	}

}
