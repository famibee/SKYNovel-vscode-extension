/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, is_win} from './CmnLib';

import {TreeItem, TreeItemCollapsibleState, commands, ExtensionContext, ThemeIcon} from 'vscode';

export interface TREEITEM_CFG {
	cmd		: string,
	dbg?	: boolean,
	icon	: string,
	label	: string,
	desc?	: string,
	npm?	: string,
	children?	: TREEITEM_CFG[],
	forMac?		: boolean,
}

export class MyTreeItem extends TreeItem {
	private		_children	: TreeItem[]	= [];

	constructor(readonly cfg: TREEITEM_CFG, readonly dir: string, readonly ctx: ExtensionContext, readonly onClickTreeItemBtn: (ti: TreeItem, btn_nm: string, cfg: TREEITEM_CFG)=> void) {
		super(is_win && cfg.forMac ?'' :cfg.label);

		if (is_win && cfg.forMac) this.description = '（Windowsでは使えません）';
		else {
			this.description = cfg.desc ?? '';
			if (cfg.cmd) {
				const btn_nm = this.contextValue = 'skynovel.dev'+ cfg.cmd;
				ctx.subscriptions.push(commands.registerCommand(btn_nm, ti=> onClickTreeItemBtn(ti, cfg.cmd, cfg)));
				if (cfg.dbg) {
					const btn_nm2 = btn_nm +'Dbg';
					ctx.subscriptions.push(commands.registerCommand(btn_nm2, ti=> onClickTreeItemBtn(ti, cfg.cmd +'Dbg', cfg)));
				}
			}
		}

		if (cfg.children) {
			this.iconPath = ThemeIcon.Folder;
			this.collapsibleState = TreeItemCollapsibleState.Collapsed;
			this._children = cfg.children.map(cCfg=> new MyTreeItem(cCfg, dir, ctx, onClickTreeItemBtn));
		}
		else {
			this.iconPath = oIcon(cfg.icon);
			this.collapsibleState = TreeItemCollapsibleState.None;
		}

	}

	get children() {return this._children;}
}
