/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {docsel, v2fp, is_win, is_mac} from './CmnLib';
import {ActivityBar, oIcon} from './ActivityBar';
import {Project} from './Project';
import {initDebug} from './DebugAdapter';
import {Debugger} from './Debugger';
import {CteScore} from './CteScore';
import {PrjTreeItem, TASK_TYPE, updStatBreak} from './PrjTreeItem';
import {MD_STRUCT} from './md2json';

import {commands, EventEmitter, ExtensionContext, TaskProcessEndEvent, tasks, TreeDataProvider, TreeItem, TreeItemCollapsibleState, window, workspace, WorkspaceFolder, WorkspaceFoldersChangeEvent, languages, LanguageStatusItem, QuickPickItem, Uri, Hover, Position, ProviderResult, TextDocument, HoverProvider, DocumentDropEditProvider, CancellationToken, DataTransfer, DocumentDropEdit, env, window as vsc_win} from 'vscode';
import {existsSync} from 'fs-extra';


export type QuickPickItemEx = QuickPickItem & {
	uri?	: Uri;
}
export const	aPickItems	: QuickPickItemEx[] = [];


export	function openURL(url: Uri, pathWs: string) {
	switch (url.scheme) {
		case 'ws-file':
			workspace.openTextDocument(pathWs + url.path)
			.then(doc=> vsc_win.showTextDocument(doc));
			break;
	
		case 'ws-folder':
			env.openExternal(Uri.file(pathWs + url.path));
			break;

		default:	env.openExternal(url);
	}
}


export class WorkSpaces implements TreeDataProvider<TreeItem>, HoverProvider, DocumentDropEditProvider {
	readonly	#aTiRoot		: TreeItem[] = [];

	#mPrj	: Map<string, Project>	= new Map();

	constructor(private readonly ctx: ExtensionContext, private readonly actBar: ActivityBar) {
		const itmStt = this.#addStatusItem('init');
		itmStt.text = '初期化中...';	// $(icon-name)使用可能
		itmStt.busy = true;	// ピン留めしてなくてもアイコン回転で表示してくれる
		itmStt.detail = 'refresh';	// text - detail と表示される

		workspace.onDidChangeWorkspaceFolders(e=> this.#refresh(e));

		// "type": "SKYNovel TaskSys",
		tasks.onDidEndTaskProcess(e=> this.#hOnEndTask.get(
			<TASK_TYPE>(e.execution.task.definition.type.slice(13))
		)?.(e));

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

		ctx.subscriptions.push(languages.registerDocumentDropEditProvider(docsel, this));

		CteScore.init(ctx);

		this.#removeStatusItem('init');

		const hMd: {[tag_nm: string]: MD_STRUCT} = require('./md.json');
		for (const [tag_nm, {sum}] of Object.entries(hMd)) aPickItems.push({
			label		: tag_nm,
			description	: sum,
			//detail,	// 別の行になる
			uri			: Uri.parse('https://famibee.github.io/SKYNovel/tag.html#'+ tag_nm),
		});
	}
	#tiLayers	: TreeItem[]	= [];


	// ファイルドロップ（＋Shiftボタンを押す必要がある）
	async	provideDocumentDropEdits(td: TextDocument, pos: Position, dataTransfer: DataTransfer, tkn: CancellationToken): Promise<DocumentDropEdit | null | undefined> {
		// データ転送をチェックして、uris のリストを削除したかどうかを確認します
		const dti = dataTransfer.get('text/uri-list');
			// L3,5 というフラグメントをサポートするらしい（3 は行番号、5 は列番号）
		if (! dti) return undefined;

		// 'text/uri-list' には改行で区切られた URI のリストが含まれる
		const urlList = await dti.asString();
		if (tkn.isCancellationRequested) return undefined;
		const aUri: Uri[] = [];
		for (const res of urlList.split('\n')) {
			try { aUri.push(Uri.parse(res)); } catch {/* noop */}
		}
		if (aUri.length === 0) return undefined;

		for (const [vfpWs ,prj] of this.#mPrj.entries()) {
			const cp = vfpWs +'/doc/prj/';
			if (td.uri.path.slice(0, cp.length) !== cp) continue;

			return await prj.drop(td, pos, aUri) ?? {insertText: ''};
				// なにもさせない（undefined だと簡易な文字列が挿入される）
		}
		return undefined;
	}


	provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
		for (const [vfpWs, prj] of this.#mPrj.entries()) {
			const cp = vfpWs +'/doc/prj/';
			if (doc.uri.path.slice(0, cp.length) !== cp) continue;

			return prj.provideHover(doc, pos);
		}
		return null;
	}


	#sendRequest2LSP: (cmd: string, uriWs: Uri, o?: any)=> void	= ()=> {};
	start(sendRequest2LSP: (cmd: string, uriWs: Uri, o: any)=> void) {
		// これは #refresh() 直前のここで
		if (is_mac) updStatBreak('&&');
		else if (is_win) {
			const chkShell = String(workspace.getConfiguration('terminal.integrated.shell').get('windows')).slice(-7);
			updStatBreak((chkShell === 'cmd.exe') ?'&' :';');
		}
		this.#sendRequest2LSP = sendRequest2LSP;
		this.#refresh();

		this.ctx.subscriptions.push(commands.registerCommand('skynovel.openReferencePallet', ()=> this.#openReferencePallet()));

/*		// server/src/LspWs.ts constructor 冒頭を参照
		// コード補完機能から「スクリプト再捜査」「引数の説明」を呼ぶ、内部コマンド
		commands.registerCommand('extension.skynovel.scanScr_trgParamHints', ()=> {
console.error(`fn:WorkSpaces.ts scanScr_trgParamHints `);
			commands.executeCommand('editor.action.triggerParameterHints')});
*/
	}

	#openReferencePallet() {
		const aWsFld = workspace.workspaceFolders;
		const at = window.activeTextEditor;
		if (! aWsFld || ! at) {		// undefinedだった場合はファイルを開いている
			window.showQuickPick<QuickPickItemEx>(aPickItems, {
				placeHolder			: 'どのリファレンスを開きますか?',
				matchOnDescription	: true,
			})
			.then(q=> {if (q?.uri) openURL(q.uri, '');});
			return;
		}

		const pathDoc = at.document.uri.path;
		for (const [vfpWs, prj] of this.#mPrj.entries()) {
			if (pathDoc.slice(0, vfpWs.length) !== vfpWs) continue;
			prj.openReferencePallet();
		}
	}


	refreshEnv() {
		const a = [];
		for (const prj of this.#mPrj.values()) a.push(prj.getLocalSNVer());
		this.actBar.chkLastSNVer(a);
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


	#refresh(e?: WorkspaceFoldersChangeEvent): void {
		const aWsFld = workspace.workspaceFolders;
		if (! aWsFld) return;	// undefinedだった場合はファイルを開いている

		// フォルダーを開いている（len>1 ならワークスペース）
		if (! e)  {		// 起動時
			for (const wsFld of aWsFld) this.#makePrj(wsFld);
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

			this.#mPrj.get(e.removed[0].uri.path)?.dispose();
		}
		this.#emPrjTD.fire(undefined);
	}
	readonly #emPrjTD = new EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData = this.#emPrjTD.event;


	onRequest(hd: any): any | undefined {
//console.error(`070 fn:WorkSpaces.ts ⬇ onRequest hd.cmd:${hd.cmd} hd.pathWs=${hd.pathWs}=`);
		// TODO: 辱コード
		const prj = this.#mPrj.get((is_win ?'/c:' :'')+ hd.pathWs);
//		const prj = this.#mPrj.get(hd.pathWs);
		if (! prj) {
			console.error(`fn:WorkSpaces.ts onRequest 'project ${hd.pathWs} does not exist'`);	// 本番でも【出力】-【ログ（ウインドウ）】に出力される
			return undefined;
		}
		return prj.onRequest(hd);
	}


	enableBtn(enable: boolean): void {
		for (const prj of this.#mPrj.values()) prj.enableBtn(enable);
	}


	#makePrj(wsFld: WorkspaceFolder) {
		const vfpWs = wsFld.uri.path;
		const pathWs = v2fp(vfpWs);
//console.error(`010 fn:WorkSpaces.ts #makePrj vfpWs=${vfpWs}=`);
		if (! existsSync(pathWs +'/package.json')
		|| ! existsSync(pathWs +'/doc/prj/prj.json')) return;

		this.#mPrj.set(vfpWs, new Project(this.ctx, this.actBar, wsFld, this.#aTiRoot, this.#emPrjTD, this.#hOnEndTask, this.#sendRequest2LSP));
	}

	#hOnEndTask = new Map<TASK_TYPE, (e: TaskProcessEndEvent)=> void>([]);

	getTreeItem = (t: TreeItem)=> t;
	getChildren = (t?: TreeItem)=> t ?(t as PrjTreeItem)?.children ?? [] :this.#aTiRoot;

	dispose() {
		for (const prj of this.#mPrj.values()) prj.dispose();
		this.#mPrj.clear();
		for (const [itm, v] of Object.entries(this.#hItmLangStt)) {
			if (Object.prototype.hasOwnProperty.call(this.#hItmLangStt, itm)) {
				v.dispose();
			}
		}
	}

}
