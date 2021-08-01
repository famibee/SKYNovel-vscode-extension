"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeDPDoc = void 0;
const CmnLib_1 = require("./CmnLib");
const vscode_1 = require("vscode");
class TreeDPDoc {
    constructor(ctx) {
        this.ctx = ctx;
        this.aTreeTmp = [
            { label: '開発者向け情報', icon: 'document',
                url: 'https://famibee.github.io/SKYNovel/dev.htm' },
            { label: 'タグリファレンス', icon: 'document',
                url: 'https://famibee.github.io/SKYNovel/tag.htm' },
            { label: 'マクロ・プラグインリファレンス', icon: 'document',
                cmd: 'opMacroPlg',
                url: 'https://famibee.github.io/SKYNovel/macro_plg.htm' },
            { label: '機能ギャラリー', icon: 'document',
                url: 'https://famibee.github.io/SKYNovel_gallery/' },
            { label: 'テンプレート プロジェクト', children: [
                    { label: '横書き「初音館にて」', icon: 'baggage', url: 'https://github.com/famibee/SKYNovel_hatsune/archive/master.zip' },
                    { label: '縦書き「桜の樹の下には」', icon: 'baggage', url: 'https://github.com/famibee/SKYNovel_uc/archive/master.zip' },
                ] },
            { label: 'famibee  連絡先', children: [
                    { label: 'famibee blog', icon: 'document', url: 'https://famibee.blog.fc2.com/' },
                    { label: 'famibee Mail', icon: 'mail', url: 'mailto:famibee@gmail.com' },
                    { label: 'famibee Twitter', icon: 'twitter', url: 'https://twitter.com/famibee' },
                ] },
            { label: 'オススメVSCode拡張機能', children: [
                    { label: '日本語化', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja' },
                    { label: 'Material Icon Theme', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme' },
                    { label: 'Bookmarks', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=alefragnani.Bookmarks' },
                    { label: 'HTML Preview', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=tht13.html-preview-vscode' },
                    { label: 'HTMLHint', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=mkaufman.HTMLHint' },
                    { label: 'Live Server', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer' },
                    { label: 'glTF Tools', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=cesium.gltf-vscode' },
                ] },
        ];
        this.aTiRoot = this.generate('doc', this.aTreeTmp);
        this.getTreeItem = (t) => t;
    }
    generate(parent, aTi) {
        return aTi.map((o, idx) => {
            const id = (parent === 'doc' ? `skynovel.` : '') + `${parent}/${idx}`;
            const t = new vscode_1.TreeItem(o.label);
            t.contextValue = id;
            if (o.children) {
                t.iconPath = vscode_1.ThemeIcon.Folder;
                t.collapsibleState = vscode_1.TreeItemCollapsibleState.Collapsed;
            }
            else
                t.iconPath = o.icon ? CmnLib_1.oIcon(o.icon) : vscode_1.ThemeIcon.File;
            if (o.url)
                this.ctx.subscriptions.push(vscode_1.commands.registerCommand(id, () => vscode_1.env.openExternal(vscode_1.Uri.parse(o.url))));
            return t;
        });
    }
    getChildren(t) {
        if (!t)
            return this.aTiRoot;
        const aTi = this.aTreeTmp.find(v => v.label === t.label);
        return aTi?.children ? this.generate(t.contextValue, aTi.children) : [];
    }
}
exports.TreeDPDoc = TreeDPDoc;
//# sourceMappingURL=TreeDPDoc.js.map