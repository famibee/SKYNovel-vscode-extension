/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon} from './CmnLib';

import {TreeDataProvider, TreeItem, ExtensionContext, commands, env, Uri, TreeItemCollapsibleState, ThemeIcon} from 'vscode';

export class TreeDPDoc implements TreeDataProvider<TreeItem> {
	private readonly	aTiRoot		: TreeItem[] = [
		new TreeItem('開発者向け情報'),
		new TreeItem('タグリファレンス'),
		new TreeItem('マクロ・プラグインリファレンス'),
		new TreeItem('機能ギャラリー'),
		new TreeItem('テンプレート プロジェクト', TreeItemCollapsibleState.Collapsed),
		new TreeItem('famibee 連絡先', TreeItemCollapsibleState.Collapsed),
		new TreeItem('オススメVSCode拡張機能', TreeItemCollapsibleState.Collapsed),
	];
	private readonly	aTiTemp		: TreeItem[] = [
		new TreeItem('横書き「初音館にて」'),
		new TreeItem('縦書き「桜の樹の下には」'),
	];
	private readonly	aTiFamibee	: TreeItem[] = [
		new TreeItem('famibee blog'),
		new TreeItem('famibee Mail'),
		new TreeItem('famibee Twitter'),
	];
	private readonly	aTiVSCodeEx	: TreeItem[] = [
		new TreeItem('日本語化'),
		new TreeItem('Material Icon Theme'),
		new TreeItem('Bookmarks'),
		new TreeItem('HTML Preview'),
		new TreeItem('HTMLHint'),
		new TreeItem('Cordova Tools'),
		new TreeItem('Debugger for Chrome'),
		new TreeItem('glTF Tools'),
	];

	constructor(readonly ctx: ExtensionContext) {
		this.aTiRoot.forEach(t=> {
			t.iconPath =
				(t.collapsibleState === TreeItemCollapsibleState.None)
				? oIcon('document')
				: ThemeIcon.Folder;
			t.contextValue = t.label;
		});

		this.aTiTemp.forEach(t=> {
			t.iconPath = oIcon('baggage');
			t.contextValue = t.label;
		});

		this.aTiFamibee.forEach(t=> {
			t.iconPath = oIcon('document');
			t.contextValue = t.label;
		});
		this.aTiFamibee[1].iconPath = oIcon('mail');
		this.aTiFamibee[2].iconPath = oIcon('twitter');

		this.aTiVSCodeEx.forEach(t=> {
			t.iconPath = oIcon('gear');
			t.contextValue = t.label;
		});

		ctx.subscriptions.push(commands.registerCommand('skynovel.opDev', ()=> env.openExternal(Uri.parse('https://famibee.github.io/SKYNovel/dev.htm'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opTag', ()=> env.openExternal(Uri.parse('https://famibee.github.io/SKYNovel/tag.htm'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opMacroPlg', ()=> env.openExternal(Uri.parse('https://famibee.github.io/SKYNovel/macro_plg.htm'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opGallery', ()=> env.openExternal(Uri.parse('https://famibee.github.io/SKYNovel_gallery/'))));

		ctx.subscriptions.push(commands.registerCommand('skynovel.dlTmpYoko', ()=> env.openExternal(Uri.parse('https://github.com/famibee/SKYNovel_hatsune/archive/master.zip'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.dlTmpTate', ()=> env.openExternal(Uri.parse('https://github.com/famibee/SKYNovel_uc/archive/master.zip'))));

		ctx.subscriptions.push(commands.registerCommand('skynovel.opFamibeeBlog', ()=> env.openExternal(Uri.parse('https://famibee.blog.fc2.com/'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.mail2famibee', ()=> env.openExternal(Uri.parse('mailto:famibee@gmail.com'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.tw2famibee', ()=> env.openExternal(Uri.parse('https://twitter.com/famibee'))));

		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExJa', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExIcon', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExBookmarks', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=alefragnani.Bookmarks'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExLiveHTMLPrev', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=tht13.html-preview-vscode'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExHTMLHint', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=mkaufman.HTMLHint'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExCordovaTools', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.cordova-tools'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExDbg4Chrome', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome'))));
		ctx.subscriptions.push(commands.registerCommand('skynovel.opVSCodeExglTFTools', ()=> env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=cesium.gltf-vscode'))));
	}

	getTreeItem = (t: TreeItem)=> t;
	getChildren(t?: TreeItem): Thenable<TreeItem[]> {
		if (! t) return Promise.resolve(this.aTiRoot);

		switch (t.label) {
		case 'テンプレート プロジェクト':	return Promise.resolve(this.aTiTemp);
		case 'famibee 連絡先':	return Promise.resolve(this.aTiFamibee);
		case 'オススメVSCode拡張機能':	return Promise.resolve(this.aTiVSCodeEx);
		}
		return Promise.resolve([]);
	}
}
