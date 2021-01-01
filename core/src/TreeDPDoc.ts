/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {oIcon} from './CmnLib';

import {TreeDataProvider, TreeItem, ExtensionContext, commands, env, Uri, TreeItemCollapsibleState, ThemeIcon} from 'vscode';

interface	TTmpTI {
	label		: string;
	icon?		: string;
	cmd?		: string;
	url?		: string;
	children?	: TTmpTI[];
}

export class TreeDPDoc implements TreeDataProvider<TreeItem> {
	private	readonly	aTreeTmp: TTmpTI[]	= [
		{label: '開発者向け情報', icon: 'document',
			url: 'https://famibee.github.io/SKYNovel/dev.htm'},
		{label: 'タグリファレンス', icon: 'document',
			url: 'https://famibee.github.io/SKYNovel/tag.htm'},
		{label: 'マクロ・プラグインリファレンス', icon: 'document',
			cmd: 'opMacroPlg',
			url: 'https://famibee.github.io/SKYNovel/macro_plg.htm'},
		{label: '機能ギャラリー', icon: 'document',
			url: 'https://famibee.github.io/SKYNovel_gallery/'},
		{label: 'テンプレート プロジェクト', children: [
			{label: '横書き「初音館にて」', icon: 'baggage', url: 'https://github.com/famibee/SKYNovel_hatsune/archive/master.zip'},
			{label: '縦書き「桜の樹の下には」', icon: 'baggage', url: 'https://github.com/famibee/SKYNovel_uc/archive/master.zip'},
		]},
		{label: 'famibee  連絡先', children: [
			{label: 'famibee blog', icon: 'document', url: 'https://famibee.blog.fc2.com/'},
			{label: 'famibee Mail', icon: 'mail', url: 'mailto:famibee@gmail.com'},
			{label: 'famibee Twitter', icon: 'twitter', url: 'https://twitter.com/famibee'},
		]},
		{label: 'オススメVSCode拡張機能', children: [
			{label: '日本語化', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja'},
			{label: 'Material Icon Theme', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme'},
			{label: 'Bookmarks', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=alefragnani.Bookmarks'},
			{label: 'HTML Preview', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=tht13.html-preview-vscode'},
			{label: 'HTMLHint', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=mkaufman.HTMLHint'},
			{label: 'Live Server', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer'},
			{label: 'glTF Tools', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=cesium.gltf-vscode'},
		]},
	];
	private readonly	aTiRoot	= this.generate('doc', this.aTreeTmp);

	constructor(private readonly ctx: ExtensionContext) {}

	private	generate(parent: string, aTi: TTmpTI[]): TreeItem[] {
		return aTi.map((o, idx)=> {
			const id = (parent === 'doc' ?`skynovel.` :'') +`${parent}/${idx}`;
			const t = new TreeItem(o.label);
			t.contextValue = id;
			if (o.children) {
				t.iconPath = ThemeIcon.Folder;
				t.collapsibleState = TreeItemCollapsibleState.Collapsed;
			}
			else t.iconPath = o.icon ?oIcon(o.icon) :ThemeIcon.File;

			if (o.url) this.ctx.subscriptions.push(commands.registerCommand(
				id, ()=> env.openExternal(Uri.parse(o.url!))
			));

			return t;
		});
	}

	readonly getTreeItem = (t: TreeItem)=> t;
	getChildren(t?: TreeItem): TreeItem[] {	// 下に子が居ると何度も呼ばれる
		if (! t) return this.aTiRoot;
		const aTi = this.aTreeTmp.find(v=> v.label === t.label);
		return aTi?.children ?this.generate(t.contextValue!, aTi.children) :[];
	}
}
