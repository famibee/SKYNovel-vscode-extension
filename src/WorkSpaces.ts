/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, docsel} from './CmnLib';
import {ActivityBar} from './ActivityBar';
import {Project} from './Project';
import {initDebug} from './DebugAdapter';
import {Debugger} from './Debugger';
import {CteScore} from './CteScore';
import {PrjTreeItem, TASK_TYPE} from './PrjTreeItem';

import {commands, EventEmitter, ExtensionContext, Range, TaskProcessEndEvent, tasks, TextEditor, TextEditorDecorationType, TreeDataProvider, TreeItem, TreeItemCollapsibleState, window, workspace, WorkspaceFolder, WorkspaceFoldersChangeEvent, languages, LanguageStatusItem} from 'vscode';

import {existsSync} from 'fs-extra';

interface DecChars {
	aRange		: Range[];
	decorator	: TextEditorDecorationType;
}

export class WorkSpaces implements TreeDataProvider<TreeItem> {
	readonly	#aTiRoot		: TreeItem[] = [];

	#hPrj	: {[pathWs: string]: Project}	= {};

	constructor(private readonly ctx: ExtensionContext, private readonly actBar: ActivityBar) {
		const itmStt = this.#addStatusItem('init');
		itmStt.text = '初期化中...';	// $(icon-name)使用可能
		itmStt.busy = true;	// ピン留めしてなくてもアイコン回転で表示してくれる
		itmStt.detail = 'refresh';	// text - detail と表示される

		this.#refresh();
		workspace.onDidChangeWorkspaceFolders(e=> this.#refresh(e));

		// "type": "SKYNovel TaskSys",
		tasks.onDidEndTaskProcess(e=> this.#hOnEndTask.get(
			<TASK_TYPE>(e.execution.task.definition.type.slice(13))
		)?.(e));

		itmStt.detail = 'onUpdDoc';	// text - detail と表示される
		this.#onUpdDoc(window.activeTextEditor);
		window.onDidChangeActiveTextEditor(te=> this.#onUpdDoc(te), null, ctx.subscriptions);
		workspace.onDidCloseTextDocument(td=> {
			if (this.#teActive?.document === td) this.#teActive = undefined;
		});
		workspace.onDidChangeTextDocument(e=> {
			if (e.document === this.#teActive?.document) this.#onUpdDoc(this.#teActive);
		}, null, ctx.subscriptions);

		// デバッガ
		itmStt.detail = 'initDebug';	// text - detail と表示される
		const emDbgLayTd = new EventEmitter<TreeItem | undefined>();
//		const hLay2TI: {[layer: string]: TreeItem} = {};
		initDebug(ctx, o=> {
			switch (o.タグ名) {
				case ':connect':
					this.#tiLayers = [];
					break;
				case ':disconnect':
					this.#tiLayers = [];
					emDbgLayTd.fire(undefined);
					break;

				case 'add_lay':{
					const t = new TreeItem(o.layer);
//					hLay2TI[o.layer] = t;
					if (o.class === 'txt') {
						t.iconPath = oIcon('comment');
						t.tooltip = `文字レイヤ layer=${o.layer}`;
//						t.tooltip = new MarkdownString(`文字レイヤ layer=${o.layer}`);
						t.collapsibleState = TreeItemCollapsibleState.Expanded;
					}
					else {
						t.iconPath = oIcon(o.layer === 'base' ?'image' :'user');
						t.tooltip = `画像レイヤ layer=${o.layer}`;
//						t.tooltip = new MarkdownString(`画像レイヤ layer=${o.layer}`);
					}
	//				t.collapsibleState = TreeItemCollapsibleState.Expanded;
					t.command = {
						command		: 'skynovel.tiLayers.selectNode',
						title		: 'Select Node',
						arguments	: [o.layer],
					};
					this.#tiLayers.push(t);
					emDbgLayTd.fire(undefined);
				}	break;

/*
				default:
					if ('layer' in o && 'fn' in o) {
						const t = hLay2TI[o.layer];
						t.tooltip = new MarkdownString(
`画像レイヤ layer=${o.layer}
***
| 属性名 | 属性説明 | 属性値 |
|--|--|--|
| layer | レイヤ名 | ${o.layer} |
| fn | 画像ファイル名 | ${o.fn} $(pencil) |`,
							true,
						);


	/* === OK、美しい or 役立つ
- 列挙
~~取り消し文字列~~
$(info)	$(warning)	$(symbol-event) $(globe)	https://microsoft.github.io/vscode-codicons/dist/codicon.html

> 引用文章
> > 引用文章
					}
					break;
*/
			}
		});

		commands.registerCommand('skynovel.tiLayers.selectNode', node=> Debugger.send2SN('_selectNode', {node}));

		itmStt.detail = 'layers';	// text - detail と表示される
		ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-layers', {
			getChildren: t=> {
				if (! t) return this.#tiLayers;

				const icon: any = t.iconPath;
				const a: {label: string, icon: string}[]
				= icon.dark.slice(-11) === 'comment.svg'
				? [
					{label: 'ボタン',		icon: 'hand-point-down'},
//					{label: 'トゥイーン',	icon: 'object-group'},
				]
				: [
//					{label: '差分画像',		icon: 'images'},
//					{label: 'トゥイーン',	icon: 'object-group'},
				];
				return a.map(v=> Object.assign(new TreeItem(v.label), {
					iconPath: oIcon(v.icon),
					command	: {
						command		: 'skynovel.tiLayers.selectNode',
						title		: 'Select Node',
						arguments	: [t.label +'/'+ v.label],
					},
				}));
			},
			/*getTreeItem: t=> {
				if (t.label === 'mes') treeView.reveal(t, {focus: true, select: true});
				return t;
			},*/
			getTreeItem: t=> t,
			onDidChangeTreeData: emDbgLayTd.event,
		}));

		CteScore.init(ctx);

		this.#removeStatusItem('init');
	}
	#tiLayers	: TreeItem[]	= [];

	refreshEnv() {
		this.actBar.chkLastSNVer(Object.entries(this.#hPrj).map(([,v])=> v.getLocalSNVer()));
	}

/*
		itm.accessibilityInformation = {
			label: 'label',
			role: 'checkbox',	// https://w3c.github.io/aria/#widget_roles
		};
		// itm.name = 'name';	// どこにも表示されない、なにに使う？？
		itmStt.severity = LanguageStatusSeverity.Error;
			// Information, Error, Warning
		itmStt.text = '初期化中...$(loading~spin)';	// $(icon-name)使用可能
		itmStt.detail = 'detail';	// text - detail と表示される
		itmStt.busy = true;	// ピン留めしてなくてもアイコン回転で表示してくれる
	//	itm.command: Command | undefined
*/
	readonly	#hItmLangStt	: {[id: string]: LanguageStatusItem} = {};
	#addStatusItem(id: string): LanguageStatusItem {
		return this.#hItmLangStt[id] = languages.createLanguageStatusItem(id, docsel);
	}
	#removeStatusItem(id: string) {
		this.#hItmLangStt[id]?.dispose();
		delete this.#hItmLangStt[id];
	}

	#tidDelay: NodeJS.Timer | null = null;
	#onUpdDoc(te: TextEditor | undefined) {
		if (! te) return;
		if (te.document.languageId !== 'skynovel') return;

		this.#teActive = te;

		// 遅延
		if (this.#tidDelay) clearTimeout(this.#tidDelay);
		this.#tidDelay = setTimeout(()=> this.#updDeco(), 500);
	}

	#teActive: TextEditor | undefined;
	#decChars: DecChars = {
		aRange: [],
		decorator: window.createTextEditorDecorationType({})
	};
	static	readonly #REG_FN_OR_LABEL = /(?<=\s)(?:fn|label)\s*=\s*([^\]\s]+)/g;
	#updDeco() {
		if (! this.#teActive) return;

		const doc = this.#teActive.document;
		const src = doc.getText();

		window.setStatusBarMessage('');
		this.#decChars.decorator.dispose();
		this.#decChars = {
			aRange: [],
			decorator: window.createTextEditorDecorationType({
				'light': {'textDecoration': 'underline',},
				'dark': {'textDecoration': 'underline',}
			})
		}

		// fn属性やlabel属性の値に下線を引くように
		let m;
		// 全ループリセットかかるので不要	.lastIndex = 0;	// /gなので必要
		while (m = WorkSpaces.#REG_FN_OR_LABEL.exec(src)) {
			this.#decChars.aRange.push(new Range(
				doc.positionAt(m.index +m[0].length -m[1].length),
				doc.positionAt(m.index +m[0].length)
			));
		}
		this.#teActive.setDecorations(this.#decChars.decorator, this.#decChars.aRange);
	}

	#refresh(e?: WorkspaceFoldersChangeEvent): void {
		const aWsFld = workspace.workspaceFolders;
		if (! aWsFld) return;	// undefinedだった場合はファイルを開いている

		// フォルダーを開いている（len>1 ならワークスペース）
		if (! e)  {		// 起動時
			aWsFld.forEach(wsFld=> this.#makePrj(wsFld));
			if (this.#aTiRoot.length === 0) return;
			this.#aTiRoot[0].collapsibleState = TreeItemCollapsibleState.Expanded;	// 利便性的に先頭は開く
			this.#emPrjTD.fire(undefined);
			return;
		}

		// フォルダ増減時
		if (e.added.length > 0) this.#makePrj(aWsFld.slice(-1)[0]);
			// 最後の一つと思われる
		else {
			const nm = e.removed[0].name;	// 一つだけ対応
			const del = this.#aTiRoot.findIndex(v=> v.label === nm);
			this.#aTiRoot.splice(del, 1);

			const pathWs = e.removed[0].uri.fsPath;

			this.#hPrj[pathWs].dispose();
		}
		this.#emPrjTD.fire(undefined);
	}
	readonly #emPrjTD = new EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData = this.#emPrjTD.event;


	enableBtn(enable: boolean): void {
		for (const pathWs in this.#hPrj) this.#hPrj[pathWs].enableBtn(enable);
	}


	// WorkspaceFolder を TreeItem に反映
	#makePrj(wsFld: WorkspaceFolder) {
		const pathWs = wsFld.uri.fsPath;
		const existPkgJS = existsSync(pathWs +'/package.json');
		const isPrjValid = existPkgJS && existsSync(pathWs +'/doc/prj/prj.json');
		if (! isPrjValid) return;

		this.#hPrj[pathWs] = new Project(this.ctx, this.actBar, wsFld, this.#aTiRoot, this.#emPrjTD, this.#hOnEndTask);
	}

	#hOnEndTask = new Map<TASK_TYPE, (e: TaskProcessEndEvent)=> void>([]);

	getTreeItem = (t: TreeItem)=> t;
	getChildren = (t?: TreeItem)=> t ?(t as PrjTreeItem)?.children ?? [] :this.#aTiRoot;

	dispose() {
		for (const pathWs in this.#hPrj) this.#hPrj[pathWs].dispose();
		this.#hPrj = {};
		for (const itm in this.#hItmLangStt) {
			if (Object.prototype.hasOwnProperty.call(this.#hItmLangStt, itm)) {
				this.#hItmLangStt[itm].dispose();
			}
		}
	}

}
