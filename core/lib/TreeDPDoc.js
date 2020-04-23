"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const vscode_1 = require("vscode");
class TreeDPDoc {
    constructor(ctx) {
        this.ctx = ctx;
        this.aTiRoot = [
            new vscode_1.TreeItem('開発者向け情報'),
            new vscode_1.TreeItem('タグリファレンス'),
            new vscode_1.TreeItem('マクロ・プラグインリファレンス'),
            new vscode_1.TreeItem('機能ギャラリー'),
            new vscode_1.TreeItem('テンプレート プロジェクト', vscode_1.TreeItemCollapsibleState.Collapsed),
            new vscode_1.TreeItem('famibee 連絡先', vscode_1.TreeItemCollapsibleState.Collapsed),
            new vscode_1.TreeItem('オススメVSCode拡張機能', vscode_1.TreeItemCollapsibleState.Collapsed),
        ];
        this.aTiTemp = [
            new vscode_1.TreeItem('横書き「初音館にて」'),
            new vscode_1.TreeItem('縦書き「桜の樹の下には」'),
        ];
        this.aTiFamibee = [
            new vscode_1.TreeItem('famibee blog'),
            new vscode_1.TreeItem('famibee Mail'),
            new vscode_1.TreeItem('famibee Twitter'),
        ];
        this.aTiVSCodeEx = [
            new vscode_1.TreeItem('日本語化'),
            new vscode_1.TreeItem('Material Icon Theme'),
            new vscode_1.TreeItem('Bookmarks'),
            new vscode_1.TreeItem('HTML Preview'),
            new vscode_1.TreeItem('HTMLHint'),
            new vscode_1.TreeItem('Cordova Tools'),
            new vscode_1.TreeItem('Debugger for Chrome'),
            new vscode_1.TreeItem('glTF Tools'),
        ];
        this.getTreeItem = (t) => t;
        this.aTiRoot.forEach(t => {
            t.iconPath =
                (t.collapsibleState == vscode_1.TreeItemCollapsibleState.None)
                    ? CmnLib_1.oIcon('document')
                    : vscode_1.ThemeIcon.Folder;
            t.contextValue = t.label;
        });
        this.aTiTemp.forEach(t => {
            t.iconPath = CmnLib_1.oIcon('baggage');
            t.contextValue = t.label;
        });
        this.aTiFamibee.forEach(t => {
            t.iconPath = CmnLib_1.oIcon('document');
            t.contextValue = t.label;
        });
        this.aTiFamibee[1].iconPath = CmnLib_1.oIcon('mail');
        this.aTiFamibee[2].iconPath = CmnLib_1.oIcon('twitter');
        this.aTiVSCodeEx.forEach(t => {
            t.iconPath = CmnLib_1.oIcon('gear');
            t.contextValue = t.label;
        });
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opDev', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://famibee.github.io/SKYNovel/dev.htm'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opTag', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://famibee.github.io/SKYNovel/tag.htm'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opMacroPlg', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://famibee.github.io/SKYNovel/macro_plg.htm'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opGallery', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://famibee.github.io/SKYNovel_gallery/'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.dlTmpYoko', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://github.com/famibee/SKYNovel_hatsune/archive/master.zip'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.dlTmpTate', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://github.com/famibee/SKYNovel_uc/archive/master.zip'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opFamibeeBlog', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://famibee.blog.fc2.com/'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.mail2famibee', () => vscode_1.env.openExternal(vscode_1.Uri.parse('mailto:famibee@gmail.com'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.tw2famibee', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://twitter.com/famibee'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opVSCodeExJa', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opVSCodeExIcon', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opVSCodeExBookmarks', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=alefragnani.Bookmarks'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opVSCodeExLiveHTMLPrev', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=tht13.html-preview-vscode'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opVSCodeExHTMLHint', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=mkaufman.HTMLHint'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opVSCodeExCordovaTools', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.cordova-tools'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opVSCodeExDbg4Chrome', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome'))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opVSCodeExglTFTools', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=cesium.gltf-vscode'))));
    }
    getChildren(t) {
        if (!t)
            return Promise.resolve(this.aTiRoot);
        switch (t.label) {
            case 'テンプレート プロジェクト': return Promise.resolve(this.aTiTemp);
            case 'famibee 連絡先': return Promise.resolve(this.aTiFamibee);
            case 'オススメVSCode拡張機能': return Promise.resolve(this.aTiVSCodeEx);
        }
        return Promise.resolve([]);
    }
}
exports.TreeDPDoc = TreeDPDoc;
//# sourceMappingURL=TreeDPDoc.js.map