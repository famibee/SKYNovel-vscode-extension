/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {is_win} from './CmnLib';
import {oIcon} from './ActivityBar';

import type {ExtensionContext, WorkspaceFolder} from 'vscode';
import {TreeItem, TreeItemCollapsibleState, commands, ThemeIcon} from 'vscode';


export type PrjBtnName = 
	'Batch'|
	'SnUpd'|
	'SnUpd_waited'|
	'ReBuild'|
	'PrjSet'|
	'Crypto'|
	'Crypto_waited'|
	'TaskWeb'|
	'TaskWebDbg'|
	'TaskWebStop'|
	'TaskApp'|
	'TaskAppStop'|
	'TaskAppDbg'|
	'TaskAppDbgStop'|
	'PackWin'|
	'PackWin32'|
	'PackMac'|
	'PackMacArm64'|
	'PackLinux'|
	'PackFreem';

export type TASK_TYPE = 'Sys'|'Web'|'App'|'Pkg';

export type TREEITEM_CFG = {
	cmd		: PrjBtnName | '',
	exe?	: boolean,
	icon	: string,
	label	: string,
	task_type?	: TASK_TYPE,
	desc?	: string,
	npm?	: string,
	children?	: TREEITEM_CFG[],
	forMac?		: boolean,
}

type ON_BTN = (ti: TreeItem, btn_nm: PrjBtnName, cfg: TREEITEM_CFG)=> void;


export let statBreak = ';';		// これは依存が少ないここで
export function updStatBreak(s: string) {statBreak = s}

export const enum eDevTreeView {
	SnUpd = 0,
	ReBuild,
	PrjSet,
	Crypto,
	TaskWeb,
	TaskApp,
	Pack,
}


export class PrjTreeItem extends TreeItem {
	static	create(
		ctx			: ExtensionContext,
		wsFld		: WorkspaceFolder,
		onBtn		: ON_BTN,
		is_new_tmp	: boolean,
	): PrjTreeItem {
		const cfg: TREEITEM_CFG = {
			cmd		: '',
			icon	: '',
			label	: '',
			desc	: wsFld.name,
			children: [
				{cmd: 'SnUpd',		icon: 'skynovel',	label: 'ベース更新',
					task_type: 'Sys',
					npm: `npm update${
						is_new_tmp
						? ''
						: ` ${statBreak} npm run webpack:dev`
					}`,
				},
				{cmd: 'ReBuild',	icon: 'refresh',	label: 'リビルド',
					task_type: 'Sys', npm: 'npm run rebuild'},
				{cmd: 'PrjSet',		icon: 'gear',	label: '設定',	task_type: 'Sys',},
				{cmd: 'Crypto',		icon: 'gear',	label: '暗号化',task_type: 'Sys', npm: is_new_tmp
					? 'echo "Crypto"'
					: 'npm run webpack:dev'},
				{cmd: 'TaskWeb',	icon: 'browser',	label: '起動：ブラウザ版',
					task_type: 'Web',npm: 'npm run web',	exe: true,},
				{cmd: 'TaskApp',	icon: 'electron',	label: '起動：アプリ版',
					task_type: 'App',
					npm: `npm run ${is_new_tmp ?'app' :'start'}`,
					exe: true,},
				{cmd: '', icon: '',label: '生成', children: [
					{cmd: 'PackWin',	icon: 'windows',	label: 'Windows exe x64',
						npm: `npm run webpack:pro ${statBreak
						} electron-builder -w --x64`},
					//	} electron-builder -w --x64 --ia32`},
							// 一パッケージに統合型、ファイルサイズ二倍になる
					{cmd: 'PackWin32',	icon: 'windows',	label: 'Windows exe ia32',
						npm: `npm run webpack:pro ${statBreak
						} electron-builder -w --ia32`},
					{cmd: 'PackMac',	icon: 'macosx',		label: 'macOS dmg x64',
						npm: `npm run webpack:pro ${statBreak
						} electron-builder -m --x64`,
						forMac: true,},
					{cmd: 'PackMacArm64',	icon: 'macosx',	label: 'macOS dmg arm64',
						npm: `npm run webpack:pro ${statBreak
						} electron-builder -m --arm64`,
						forMac: true,},
						// Appleシリコンサポート| Electronブログ https://www.electronjs.org/blog/apple-silicon
							// 将来的にはarm64、x64アプリを1つのユニバーサルバイナリに「マージ」できるパッケージをリリースする予定ですが、このバイナリは巨大であり、ユーザーへの出荷にはおそらく理想的ではないことに注意してください。
					{cmd: 'PackLinux',	icon: 'linux',		label: 'Linux AppImage',
						npm: `npm run webpack:pro ${statBreak
						} electron-builder -l`},
						// Command Line Interface (CLI) - electron-builder https://www.electron.build/cli
					{cmd: 'PackFreem',	icon: 'freem',		label: 'ふりーむ！形式 zip',
						npm: 'npm run webpack:pro'},
				]},
			],
		};
		if (is_new_tmp) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const ePack = cfg.children![eDevTreeView.Pack]!;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			ePack.children = ePack.children!.map(e=> ({...e, npm: e.npm?.replace('webpack:pro', 'app_bld')}));
		}

		const pathWs = wsFld.uri.fsPath;
		const pti = new PrjTreeItem(ctx, pathWs, cfg);
		pti.collapsibleState = TreeItemCollapsibleState.Collapsed;

		// registerCommand()の登録が複数プロジェクトで重複しないよう
		PrjTreeItem.regCmds = ()=> { /* empty */ };
		PrjTreeItem.#hPathWs2onBtn[pathWs] = onBtn;

		return pti;
	}
	static	#hPathWs2onBtn	: {[pathWs: string]: ON_BTN}	= {};


	#children	: TreeItem[]	= [];
	private	constructor(readonly ctx: ExtensionContext, private	readonly pathWs: string, readonly cfg: TREEITEM_CFG) {
		super(is_win && cfg.forMac ?'' :cfg.label);

		if (is_win && cfg.forMac) this.description = '（Windowsでは使えません）';
		else {
			this.description = cfg.desc ?? '';
			
			if (cfg.cmd) {
				const cntVal = this.contextValue = 'skynovel.dev'+ <string>cfg.cmd;
				PrjTreeItem.regCmds(ctx, cntVal, cfg);
			}
		}

		if (cfg.children) {
			this.iconPath = ThemeIcon.Folder;
			this.collapsibleState = TreeItemCollapsibleState.Collapsed;
			this.#children = cfg.children.map(c=> new PrjTreeItem(ctx, pathWs, c));
		}
		else {
			this.iconPath = oIcon(cfg.icon);
			this.collapsibleState = TreeItemCollapsibleState.None;
		}
	}
	private	static	regCmds(ctx: ExtensionContext, cntVal: string, cfg: TREEITEM_CFG) {
		if (cfg.cmd === '') return;

		PrjTreeItem.#regCmd(ctx, cntVal, cfg.cmd, cfg);
		if (cfg.exe) {
			PrjTreeItem.#regCmd(ctx, cntVal +'Dbg', <PrjBtnName>(<string>cfg.cmd +'Dbg'), cfg);
			PrjTreeItem.#regCmd(ctx, cntVal +'Stop',<PrjBtnName>(<string>cfg.cmd +'Stop'),cfg);
		}
	}
	static	#regCmd(ctx: ExtensionContext, cntVal: string, btn_nm2: PrjBtnName, cfg: TREEITEM_CFG) {
		ctx.subscriptions.push(commands.registerCommand(
			cntVal,
			(ti: PrjTreeItem)=> PrjTreeItem.#hPathWs2onBtn[ti.pathWs]?.(ti, btn_nm2, cfg),
		));
	}

	get children() {return this.#children}
}
