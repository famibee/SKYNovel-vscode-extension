/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, is_win} from './CmnLib';

import {TreeItem, TreeItemCollapsibleState, commands, ExtensionContext, ThemeIcon} from 'vscode';

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

export class PrjTreeItem extends TreeItem {
	private		_children	: TreeItem[]	= [];

	// TODO: registerCommand(の登録が複数プロジェクトで重複する

	readonly	exe: boolean;
	constructor(readonly cfg: TREEITEM_CFG, readonly dir: string, readonly ctx: ExtensionContext, readonly onClickTreeItemBtn: (ti: TreeItem, btn_nm: string, cfg: TREEITEM_CFG)=> void) {
		super(is_win && cfg.forMac ?'' :cfg.label);

		this.exe = Boolean(cfg.exe);
		if (is_win && cfg.forMac) this.description = '（Windowsでは使えません）';
		else {
			this.description = cfg.desc ?? '';
			if (cfg.cmd) {
				const btn_nm = this.contextValue = 'skynovel.dev'+ cfg.cmd;
				ctx.subscriptions.push(commands.registerCommand(btn_nm, ti=> onClickTreeItemBtn(ti, cfg.cmd, cfg)));
				if (cfg.exe) {
					ctx.subscriptions.push(commands.registerCommand(btn_nm +'Dbg', ti=> onClickTreeItemBtn(ti, cfg.cmd +'Dbg', cfg)));

					ctx.subscriptions.push(commands.registerCommand(btn_nm +'Stop', ti=> onClickTreeItemBtn(ti, cfg.cmd +'Stop', cfg)));
				}
			}
		}

		if (cfg.children) {
			this.iconPath = ThemeIcon.Folder;
			this.collapsibleState = TreeItemCollapsibleState.Collapsed;
			this._children = cfg.children.map(cCfg=> new PrjTreeItem(cCfg, dir, ctx, onClickTreeItemBtn));
		}
		else {
			this.iconPath = oIcon(cfg.icon);
			this.collapsibleState = TreeItemCollapsibleState.None;
		}

	}

	get children() {return this._children;}
}
