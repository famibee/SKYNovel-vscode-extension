/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon, is_win} from './CmnLib';

import {TreeItem, TreeItemCollapsibleState, commands, ExtensionContext, ThemeIcon} from 'vscode';

export interface TREEITEM_CFG {
	cmd		: string,
	icon	: string,
	label	: string,
	desc?	: string,
	npm?	: string,
	children?	: TREEITEM_CFG[],
	forMac?		: boolean,
}

export class MyTreeItem extends TreeItem {
	private		_children	: TreeItem[]	= [];

	constructor(cfg: TREEITEM_CFG, dir: string, ctx: ExtensionContext, onClickTreeItemBtn: (ti: TreeItem, cfg: TREEITEM_CFG)=> void) {
		super(is_win && cfg.forMac ?'' :cfg.label);

		this.tooltip = dir;	// 親プロジェクト特定用、まぁ見えても変でない情報
		if (is_win && cfg.forMac) this.description = '（Windowsでは使えません）';
		else {
			this.description = cfg.desc ?? '';
			if (cfg.cmd) {
				this.contextValue = 'skynovel.dev'+ cfg.cmd;
				ctx.subscriptions.push(commands.registerCommand(this.contextValue, ti=> onClickTreeItemBtn(ti, cfg)));
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
