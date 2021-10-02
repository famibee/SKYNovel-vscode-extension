/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, is_win, statBreak} from './CmnLib';

import {TreeItem, TreeItemCollapsibleState, commands, ExtensionContext, ThemeIcon, WorkspaceFolder} from 'vscode';
import {existsSync} from 'fs-extra';

export interface TREEITEM_CFG {
	cmd		: string,
	exe?	: boolean,
	icon	: string,
	label	: string,
	desc?	: string,
	npm?	: string,
	children?	: TREEITEM_CFG[],
	forMac?		: boolean,
}

type ON_BTN = (ti: TreeItem, btn_nm: string, cfg: TREEITEM_CFG)=> void;

export class PrjTreeItem extends TreeItem {
	static	readonly #aTreeTmp	: TREEITEM_CFG[] = [
		{cmd: 'SnUpd',		icon: 'skynovel',	label: 'ベース更新',
			npm: `npm update ${statBreak()} npm run webpack:dev`},
		{cmd: 'ReBuild',	icon: 'refresh',	label: 'リビルド',
			npm: 'npm run rebuild'},
		{cmd: 'PrjSet',		icon: 'gear',		label: '設定'},
		{cmd: 'Crypto',		icon: 'gear',		label: '暗号化',
			npm: 'npm run webpack:dev'},
		{cmd: 'TaskWeb',	icon: 'browser',	label: '起動：ブラウザ版',
			npm: 'npm run web',		exe: true,},
		{cmd: 'TaskApp',	icon: 'electron',	label: '起動：アプリ版',
			npm: 'npm run start',	exe: true,},
		{cmd: '', icon: '',label: '生成', children: [
			{cmd: 'PackWin',	icon: 'windows',	label: 'Windows exe x64',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -w --x64 -c.artifactName="\${prj.title}-\${prj.version}-x64.exe"`},
			//	} ./node_modules/.bin/electron-builder -w --x64 --ia32`},
					// 一パッケージに統合型、ファイルサイズ二倍になる
			{cmd: 'PackWin32',	icon: 'windows',	label: 'Windows exe ia32',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -w --ia32 -c.artifactName="\${prj.title}-\${prj.version}-ia32.exe"`},
			{cmd: 'PackMac',	icon: 'macosx',		label: 'macOS dmg x64',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -m dmg:x64 -c.artifactName="\${prj.title}-\${prj.version}-x64.dmg"`,
				forMac: true,},
			{cmd: 'PackMacArm64',	icon: 'macosx',	label: 'macOS dmg arm64',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -m dmg:arm64 -c.artifactName="\${prj.title}-\${prj.version}-arm64.dmg"`,
				forMac: true,},
				// Appleシリコンサポート| Electronブログ https://www.electronjs.org/blog/apple-silicon
					// 将来的にはarm64、x64アプリを1つのユニバーサルバイナリに「マージ」できるパッケージをリリースする予定ですが、このバイナリは巨大であり、ユーザーへの出荷にはおそらく理想的ではないことに注意してください。
			{cmd: 'PackLinux',	icon: 'linux',		label: 'Linux AppImage',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -l`},
				// Command Line Interface (CLI) - electron-builder https://www.electron.build/cli
			{cmd: 'PackFreem',	icon: 'freem',		label: 'ふりーむ！形式 zip',
				npm: 'npm run webpack:pro'},
		]},
	];

	static	create(ctx: ExtensionContext, wsFld: WorkspaceFolder, onBtn: ON_BTN): PrjTreeItem {
		const pathWs = wsFld.uri.fsPath;
		const existPkgJS = existsSync(pathWs +'/package.json');
		const isPrjValid = existPkgJS && existsSync(pathWs+'/doc/prj/prj.json');
		const pti = new PrjTreeItem({
			cmd		: '',
			icon	: '',
			label	: '',
			desc	: wsFld.name,
			children: isPrjValid ?PrjTreeItem.#aTreeTmp :[{
				cmd		: '',
				icon	: 'warn',
				label	: `${existPkgJS ?'prj' :'package'}.json がありません`,
			}],
		}, pathWs, ctx);
		pti.collapsibleState = TreeItemCollapsibleState.Collapsed;

		// registerCommand()の登録が複数プロジェクトで重複しないよう
		PrjTreeItem.regCmds = ()=> {};
		PrjTreeItem.#hPathWs2onBtn[pathWs] = onBtn;

		return pti;
	}
	static	#hPathWs2onBtn	: {[pathWs: string]: ON_BTN}	= {};

	#children	: TreeItem[]	= [];
	private	constructor(readonly cfg: TREEITEM_CFG, private	readonly pathWs: string, readonly ctx: ExtensionContext) {
		super(is_win && cfg.forMac ?'' :cfg.label);

		if (is_win && cfg.forMac) this.description = '（Windowsでは使えません）';
		else {
			this.description = cfg.desc ?? '';
			if (cfg.cmd) {
				const btn_nm = this.contextValue = 'skynovel.dev'+ cfg.cmd;
				PrjTreeItem.regCmds(ctx, btn_nm, cfg);
			}
		}

		if (cfg.children) {
			this.iconPath = ThemeIcon.Folder;
			this.collapsibleState = TreeItemCollapsibleState.Collapsed;
			this.#children = cfg.children.map(c=> new PrjTreeItem(c, pathWs, ctx));
		}
		else {
			this.iconPath = oIcon(cfg.icon);
			this.collapsibleState = TreeItemCollapsibleState.None;
		}
	}
	private	static	regCmds(ctx: ExtensionContext, btn_nm: string, cfg: TREEITEM_CFG) {
		PrjTreeItem.#regCmd(ctx, btn_nm, cfg.cmd, cfg);
		if (cfg.exe) {
			PrjTreeItem.#regCmd(ctx, btn_nm +'Dbg', cfg.cmd +'Dbg', cfg);
			PrjTreeItem.#regCmd(ctx, btn_nm +'Stop',cfg.cmd +'Stop',cfg);
		}
	}
	static	#regCmd(ctx: ExtensionContext, btn_nm: string, btn_nm2: string, cfg: TREEITEM_CFG) {
		ctx.subscriptions.push(commands.registerCommand(
			btn_nm,
			(ti: PrjTreeItem)=> PrjTreeItem.#hPathWs2onBtn[ti.pathWs]?.(ti, btn_nm2, cfg),
		));
	}

	get children() {return this.#children;}
}
