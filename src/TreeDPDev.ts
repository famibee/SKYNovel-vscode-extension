/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import * as vscode from 'vscode';
const fs = require('fs');

export function oIcon(name: string) {return {
	light: `${__filename}/../../res/light/${name}.svg`,
	dark: `${__filename}/../../res/dark/${name}.svg`
}};

export const is_win = process.platform === 'win32';
export const is_mac = process.platform === 'darwin';
//const is_linux = process.platform === 'linux';

export class TreeDPDev implements vscode.TreeDataProvider<vscode.TreeItem> {
	private readonly	aTree: vscode.TreeItem[] = [];
	private 			oTreePrj: {[name: string]: vscode.TreeItem[]} = {};

	constructor() {
		[
			'sn.devSnUpd',
			'sn.devTaskWeb',
			'sn.devTaskStart',
			'sn.devTaskPackWin',
			'sn.devTaskPackMac',
		].map(v=> vscode.commands.registerCommand(v, ti=> this.fncDev(ti)));

		vscode.tasks.onDidEndTaskProcess(e=> this.fnc_onDidEndTaskProcess(e));

		// コンストラクタは「フォルダを開く」で発動、
		// その後「ワークスペースにフォルダーを追加」で再度発動する。
		// staticに物を置かないのが吉。
		this.refresh();
		if (this.aTree.length > 0) this.aTree[0].collapsibleState = vscode.TreeItemCollapsibleState.Expanded;	// 利便性的に先頭は開く
		vscode.workspace.onDidChangeWorkspaceFolders(e=> this.refresh(e));
	}
	private	fnc_onDidEndTaskProcess = (_e: vscode.TaskProcessEndEvent)=> {};

	private refresh(e?: vscode.WorkspaceFoldersChangeEvent): void {
		const aFld = vscode.workspace.workspaceFolders;
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
				d.delPrj.dispose();
				d.crePlg.dispose();
				d.delPlg.dispose();
			}
		}
		else {
			this.oTreePrj = {};
			aFld.map(fld=> this.wsf2tree(fld));	// 再生成
		}
		this._onDidChangeTreeData.fire();
	}
	private readonly _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

	private	readonly TreeChild = [
		{icon: 'skynovel',	label: 'SKYNovel更新'},
		{icon: 'browser',	label: 'ブラウザ版を起動'},
		{icon: 'electron',	label: 'アプリ版を起動'},
		{icon: 'windows',	label: 'exe生成'},
		{icon: 'macosx',	label: 'app生成（macOS上のみ）'},
	];
	private wsf2tree(fld: vscode.WorkspaceFolder) {
		const t = new vscode.TreeItem(fld.name, vscode.TreeItemCollapsibleState.Collapsed);
		const dir = fld.uri.fsPath;
		t.iconPath = vscode.ThemeIcon.Folder;
		t.tooltip = dir;
		t.description = '';
		this.aTree.push(t);

		const pathPkg = dir +'/package.json';
		if (! fs.existsSync(pathPkg)) {
			t.tooltip = t.description = 'package.json がありません';
			return;
		}

		this.oTreePrj[t.tooltip] = this.TreeChild.map(v=> {
			const ti = new vscode.TreeItem(v.label);
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
		const fwPrj = vscode.workspace.createFileSystemWatcher(cur +'?*/*');

		// プラグインフォルダ増減でビルドフレームワークに反映する機能
		// というか core/plugin/plugin.js自動更新機能
		const curPlg = dir +'/core/plugin';
		if (! fs.existsSync(dir +'/core')) {	// エラーではなく自動生成する方向で
			fs.mkdirSync(dir +'/core');
			if (! fs.existsSync(curPlg)) fs.mkdirSync(curPlg);
		}
		const fwPlg = vscode.workspace.createFileSystemWatcher(curPlg+'/?*/');

		this.oDisposeFSW[dir] = {
			crePrj: fwPrj.onDidCreate(()=> this.updPathJson(cur)),
			delPrj: fwPrj.onDidDelete(()=> this.updPathJson(cur)),
			crePlg: fwPlg.onDidCreate(()=> this.updPlugin(curPlg)),
			delPlg: fwPlg.onDidDelete(()=> this.updPlugin(curPlg)),
		};	// NOTE: ワークスペースだと、削除イベントしか発生しない？？
		this.updPathJson(cur);
		this.updPlugin(curPlg);
	}
	private oDisposeFSW: {[name: string]: {
		crePrj: vscode.Disposable,
		delPrj: vscode.Disposable,
		crePlg: vscode.Disposable,
		delPlg: vscode.Disposable,
	}} = {};
	private updLocalSNVer(dir: string) {
		const tc = this.oTreePrj[dir];
		const localVer = JSON.parse(fs.readFileSync(dir +'/package.json')).dependencies.skynovel.slice(1);
		tc[0].description = `-- ${localVer}`;
	}

	private updPathJson(cur: string) {
		if (! fs.existsSync(cur +'prj.json')) {
			vscode.window.showErrorMessage(`prj/prj.json がありません path=${cur +'prj.json'}`);
			return;
		}

		const jsonPrj = fs.readFileSync(cur +'prj.json');
		const hPath = get_hPathFn2Exts(cur, JSON.parse(jsonPrj));
		fs.writeFileSync(cur +'path.json', JSON.stringify(hPath));
	}
	private updPlugin(cur: string) {
		const h: any = {};
		for (const nm of fs.readdirSync(cur)) {
			if (regNoUseSysFile.test(nm)) continue;

			const url = path.resolve(cur, nm);
			if (fs.lstatSync(url).isDirectory()) h[nm] = 0;
		}
		fs.writeFileSync(cur +'.js', `export default ${JSON.stringify(h)};`);
	}

	private fncDev(ti: vscode.TreeItem) {
		const aFld = vscode.workspace.workspaceFolders;
		if (! aFld) {	// undefinedだった場合はファイルを開いている
			vscode.window.showWarningMessage(`[SKYNovel] フォルダを開いているときのみ使用できます`);
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
			case 0:	cmd += 'npm i skynovel';	break;
			case 1:	cmd += 'npm run web';		break;
			case 2:	cmd += 'npm run start';		break;
			case 3:	cmd += 'npm run pack:win';	break;
			case 4:	cmd += 'npm run pack:mac';	break;
			default:	return;
		}
		const t = new vscode.Task(
			{type: 'SKYNovelEx Task'},	// definition
			this.TreeChild[i].label,	// name、UIに表示
			'SKYNovel',					// source
			new vscode.ShellExecution(cmd),
		);

		this.fnc_onDidEndTaskProcess = (i == 0)
			? e=> {
				if (e.execution.task.definition.type != t.definition.type) return;
				if (e.execution.task.source != t.source) return;

				this.updLocalSNVer(dir);
				this._onDidChangeTreeData.fire();
			}
			: ()=> {};
		vscode.tasks.executeTask(t);
	}
	private	readonly statBreak: {(): string} =
		is_mac ?()=> '&&'
		: (! is_win) ?()=> ';'
		: ()=> {
			const isPS = String(vscode.workspace.getConfiguration('terminal.integrated.shell').get('windows')).slice(-14);
			return (isPS === 'powershell.exe') ?';' :'&';
		};

	getTreeItem = (elm: vscode.TreeItem)=> elm;
	getChildren(elm?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		return Promise.resolve((elm)?this.oTreePrj[elm.tooltip!] :this.aTree);
	}

	dispose() {
		for (const dir in this.oDisposeFSW) {
			const d = this.oDisposeFSW[dir];
			d.crePrj.dispose();
			d.delPrj.dispose();
			d.crePlg.dispose();
			d.delPlg.dispose();
		}
		this.oDisposeFSW = {};
	}

}

const path = require('path');
const img_size = require('image-size');
interface IExts { [ext: string]: string; };
interface IFn2Path { [fn: string]: IExts; };

const regNoUseSysFile = /^(\..+|.+.db|.+.ini|_notes|Icon\r)$/;
const regSprSheetImg = /^(.+)\.(\d+)x(\d+)\.(png|jpg|jpeg)$/;
function get_hPathFn2Exts($cur: string, oCfg: any): IFn2Path {
	const hFn2Path: IFn2Path = {};

//	const REG_FN_RATE_SPRIT	= /(.+?)(?:%40(\d)x)?(\.\w+)/;
	// ｛ファイル名：｛拡張子：パス｝｝形式で格納。
	//		検索が高速なハッシュ形式。
	//		ここでの「ファイル名」と「拡張子」はスクリプト経由なので
	//		URLエンコードされていない物を想定。
	//		パスのみURLエンコード済みの、File.urlと同様の物を。
	//		あとで実際にロード関数に渡すので。
	if (oCfg.search) for (const dir of oCfg.search) {
		const wd = path.resolve($cur, dir);
		if (! fs.existsSync(wd)) continue;

		for (const nm_base of fs.readdirSync(wd)) {
			const nm = nm_base.normalize('NFC');
			if (regNoUseSysFile.test(nm)) continue;
			const url = path.resolve(wd, nm);
			if (fs.lstatSync(url).isDirectory()) continue;

			// スプライトシート用json自動生成機能
			// breakline.5x20.png などから breakline.json を（無ければ）生成
			const m = nm.match(regSprSheetImg);
			if (! m) {addPath(hFn2Path, dir, nm); continue;}
			const fnJs = path.resolve(wd, m[1] +'.json');
			if (! fs.existsSync(fnJs)) {
				const size = img_size(url);
				const xLen = uint(m[2]);
				const yLen = uint(m[3]);
				const w = size.width /xLen;
				const h = size.height /yLen;
				const basename = m[1];
				const ext = m[4];

				const oJs :any = {
					frames: {},
					meta: {
						app: 'skynovel',
						version: '1.0',
						image: m[0],
						format: 'RGBA8888',
						size: {w: size.width, h :size.height},
						scale: 1,
						animationSpeed: 1,	// 0.01~1.00
					},
				};
				let cnt = 0;
				for (let ix=0; ix<xLen; ++ix) {
					for (let iy=0; iy<yLen; ++iy) {
						++cnt;
						oJs.frames[basename + String(cnt).padStart(4, '0') +'.'+ ext] = {
							frame: {x: ix *w, y: iy*h, w: w, h :h},
							rotated: false,
							trimmed: false,
							spriteSourceSize: {x: 0, y: 0, w: size.width, h :size.height},
							sourceSize: {w: w, h :h},
							pivot: {x: 0.5, y: 0.5},
						};
					}
				}
				fs.writeFileSync(fnJs, JSON.stringify(oJs));
				vscode.window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${m[1]}.json を自動生成しました`);

				addPath(hFn2Path, dir, `${m[1]}.json`);
			}
		}
	}

	return hFn2Path;
}

function addPath(hFn2Path: IFn2Path, dir: string, nm: string) {
	const p = path.parse(nm);
	const ext = p.ext.slice(1);
	const fn = p.name;
	let hExts = hFn2Path[fn];
	if (! hExts) {
		hExts = hFn2Path[fn] = {':cnt': '1'};
	}
	else if (ext in hExts) {
		vscode.window.showErrorMessage(`[SKYNovel] サーチパスにおいてファイル名＋拡張子【${fn}】が重複しています。フォルダを縦断検索するため許されません`);
	}
	else {
		hExts[':cnt'] = String(uint(hExts[':cnt']) +1);
	}
	hExts[ext] = dir +'/'+ nm;
}
function uint(o: any): number {
	const v = parseInt(String(o), 10);
	return v < 0 ? -v : v;
}
