"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const TreeDPDev_1 = require("./TreeDPDev");
const vscode_1 = require("vscode");
const { exec } = require('child_process');
const fs = require('fs-extra');
const os = require('os');
const https = require('https');
var eTree;
(function (eTree) {
    eTree[eTree["NODE"] = 0] = "NODE";
    eTree[eTree["NPM"] = 1] = "NPM";
    eTree[eTree["WINDOWS_BUILD_TOOLS"] = 2] = "WINDOWS_BUILD_TOOLS";
    eTree[eTree["SKYNOVEL_VER"] = 3] = "SKYNOVEL_VER";
})(eTree || (eTree = {}));
;
class ActivityBar {
    constructor(context) {
        this.context = context;
        this.aTree = [
            new vscode_1.TreeItem('Node.js'),
            new vscode_1.TreeItem('npm'),
            new vscode_1.TreeItem(CmnLib_1.is_win ? 'windows-build-tools' : ''),
            new vscode_1.TreeItem('SKYNovel（最新）'),
        ];
        this.aReady = [undefined, undefined, undefined, undefined];
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.getTreeItem = (elm) => elm;
        this.pnlWV = null;
        this.aTree.forEach(v => v.contextValue = v.label);
        this.refreshWork();
        vscode_1.commands.registerCommand('skynovel.refreshSetting', () => this.refresh());
        vscode_1.commands.registerCommand('skynovel.dlNode', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://nodejs.org/dist/v10.15.3/node-v10.15.3'
            + (CmnLib_1.is_mac
                ? '.pkg'
                : ((os.arch().slice(-2) == '64' ? '-x64' : '-x32') + '.msi')))));
        vscode_1.commands.registerCommand('skynovel.opNodeSite', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://nodejs.org/ja/')));
        const aFld = vscode_1.workspace.workspaceFolders;
        if (aFld)
            https.get('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json', (res) => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    const newVer = JSON.parse(body).version;
                    this.aTree[eTree.SKYNOVEL_VER].description = '-- ' + newVer;
                    if (aFld.find(fld => {
                        const fnLocal = fld.uri.fsPath + '/package.json';
                        if (!fs.existsSync(fnLocal))
                            return false;
                        const localVer = fs.readJsonSync(fnLocal).dependencies.skynovel.slice(1);
                        return (newVer != localVer);
                    }))
                        vscode_1.window.showInformationMessage(`SKYNovelに更新（${newVer}）があります。【開発ツール】-【SKYNovel更新】のボタンを押してください`);
                });
            }).on('error', (e) => console.error(e.message));
    }
    static start(context) {
        ActivityBar.trDPEnv = new ActivityBar(context);
        vscode_1.window.registerTreeDataProvider('sn-setting', ActivityBar.trDPEnv);
        ActivityBar.trDPDev = new TreeDPDev_1.TreeDPDev(context);
        vscode_1.window.registerTreeDataProvider('sn-dev', ActivityBar.trDPDev);
        vscode_1.window.registerTreeDataProvider('sn-doc', new TreeDPDoc);
    }
    static stopActBar() {
        ActivityBar.trDPEnv.dispose();
        ActivityBar.trDPDev.dispose();
    }
    dispose() { if (this.pnlWV)
        this.pnlWV.dispose(); }
    refresh() {
        this.refreshWork();
        this._onDidChangeTreeData.fire();
    }
    getChildren(elm) {
        if (!elm)
            return Promise.resolve(this.aTree);
        const ret = [];
        if (elm.label == 'Node.js')
            this.aTree[eTree.NODE].iconPath = (this.aReady[eTree.NODE]) ? '' : CmnLib_1.oIcon('error');
        return Promise.resolve(ret);
    }
    refreshWork() {
        let error = 0;
        if (!this.aReady[eTree.NODE])
            exec('node -v', (err, stdout) => {
                const node = this.aTree[eTree.NODE];
                if (err) {
                    this.aReady[eTree.NODE] = false;
                    node.description = `-- 見つかりません`;
                    node.iconPath = CmnLib_1.oIcon('error');
                    this._onDidChangeTreeData.fire(node);
                    this.activityBarBadge(++error);
                    return;
                }
                this.aReady[eTree.NODE] = true;
                node.description = `-- ${stdout}`;
                node.iconPath = '';
                node.contextValue = '';
                this._onDidChangeTreeData.fire(node);
            });
        const wbt = this.aTree[eTree.WINDOWS_BUILD_TOOLS];
        const chkWbt = () => {
            if (!CmnLib_1.is_win)
                return;
            exec('npm ls -g windows-build-tools', (err, stdout) => {
                const a = String(stdout).split(/@|\n/);
                if (err || a.length < 3) {
                    this.aReady[eTree.WINDOWS_BUILD_TOOLS] = false;
                    wbt.description = `-- 見つかりません`;
                    wbt.iconPath = CmnLib_1.oIcon('error');
                    this._onDidChangeTreeData.fire(wbt);
                    this.activityBarBadge(++error);
                    return;
                }
                this.aReady[eTree.WINDOWS_BUILD_TOOLS] = true;
                wbt.description = `-- ${a[2]}`;
                wbt.iconPath = '';
                this._onDidChangeTreeData.fire(wbt);
            });
        };
        if (this.aReady[eTree.NPM])
            chkWbt();
        else
            exec('npm -v', (err, stdout) => {
                const npm = this.aTree[eTree.NPM];
                if (err) {
                    this.aReady[eTree.NPM] = false;
                    npm.description = `-- 見つかりません`;
                    npm.iconPath = CmnLib_1.oIcon('error');
                    this._onDidChangeTreeData.fire(npm);
                    this.activityBarBadge(++error);
                    return;
                }
                this.aReady[eTree.NPM] = true;
                npm.description = `-- ${stdout}`;
                npm.iconPath = '';
                this._onDidChangeTreeData.fire(npm);
                chkWbt();
            });
    }
    async activityBarBadge(num = 0) {
        const column = vscode_1.window.activeTextEditor ? vscode_1.window.activeTextEditor.viewColumn : undefined;
        if (this.pnlWV) {
            this.pnlWV.reveal(column);
            return;
        }
        const path_doc = this.context.extensionPath + '/doc';
        this.pnlWV = vscode_1.window.createWebviewPanel('SKYNovel-envinfo', 'SKYNovel情報', column || vscode_1.ViewColumn.One, {
            enableScripts: false,
            localResourceRoots: [vscode_1.Uri.file(path_doc)],
        });
        this.pnlWV.onDidDispose(() => this.pnlWV = null);
        fs.readFile(path_doc + `/index.htm`, 'utf-8', (err, data) => {
            if (err)
                throw err;
            this.pnlWV.webview.html = data
                .replace('${エラー数}', String(num))
                .replace(/<img src="img\//g, `<img src="vscode-resource:${path_doc}/img/`)
                .replace('type="text/css" href="', `type="text/css" href="vscode-resource:${path_doc}/`);
        });
    }
}
exports.ActivityBar = ActivityBar;
class TreeDPDoc {
    constructor() {
        this.aTree = [
            new vscode_1.TreeItem('開発者向け情報'),
            new vscode_1.TreeItem('タグリファレンス'),
            new vscode_1.TreeItem('マクロ・プラグインリファレンス'),
            new vscode_1.TreeItem('機能ギャラリー'),
            new vscode_1.TreeItem('テンプレート プロジェクト', vscode_1.TreeItemCollapsibleState.Collapsed),
            new vscode_1.TreeItem('famibee 連絡先', vscode_1.TreeItemCollapsibleState.Collapsed),
            new vscode_1.TreeItem('オススメVSCode拡張機能', vscode_1.TreeItemCollapsibleState.Collapsed),
        ];
        this.aTreeTemp = [
            new vscode_1.TreeItem('横書き「初音館にて」'),
            new vscode_1.TreeItem('縦書き「桜の樹の下には」'),
        ];
        this.aTreeFamibee = [
            new vscode_1.TreeItem('famibee blog'),
            new vscode_1.TreeItem('famibee Mail'),
            new vscode_1.TreeItem('famibee Twitter'),
        ];
        this.aTreeVSCodeEx = [
            new vscode_1.TreeItem('日本語化'),
            new vscode_1.TreeItem('Material Icon Theme'),
            new vscode_1.TreeItem('Bookmarks'),
            new vscode_1.TreeItem('HTML Preview'),
            new vscode_1.TreeItem('HTMLHint'),
            new vscode_1.TreeItem('Cordova Tools'),
            new vscode_1.TreeItem('Debugger for Chrome'),
            new vscode_1.TreeItem('glTF Tools'),
        ];
        this.getTreeItem = (elm) => elm;
        this.aTree.forEach(v => {
            v.iconPath =
                (v.collapsibleState == vscode_1.TreeItemCollapsibleState.None)
                    ? CmnLib_1.oIcon('document')
                    : vscode_1.ThemeIcon.Folder;
            v.contextValue = v.label;
        });
        this.aTreeTemp.forEach(v => {
            v.iconPath = CmnLib_1.oIcon('baggage');
            v.contextValue = v.label;
        });
        this.aTreeFamibee.forEach(v => {
            v.iconPath = CmnLib_1.oIcon('document');
            v.contextValue = v.label;
        });
        this.aTreeFamibee[1].iconPath = CmnLib_1.oIcon('mail');
        this.aTreeFamibee[2].iconPath = CmnLib_1.oIcon('twitter');
        this.aTreeVSCodeEx.forEach(v => {
            v.iconPath = CmnLib_1.oIcon('gear');
            v.contextValue = v.label;
        });
        vscode_1.commands.registerCommand('skynovel.opDev', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://famibee.github.io/SKYNovel/dev.htm')));
        vscode_1.commands.registerCommand('skynovel.opTag', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://famibee.github.io/SKYNovel/tag.htm')));
        vscode_1.commands.registerCommand('skynovel.opMacroPlg', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://famibee.github.io/SKYNovel/macro_plg.htm')));
        vscode_1.commands.registerCommand('skynovel.opGallery', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://famibee.github.io/SKYNovel_gallery/')));
        vscode_1.commands.registerCommand('skynovel.dlTmpYoko', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://github.com/famibee/SKYNovel_hatsune/archive/master.zip')));
        vscode_1.commands.registerCommand('skynovel.dlTmpTate', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://github.com/famibee/SKYNovel_uc/archive/master.zip')));
        vscode_1.commands.registerCommand('skynovel.opFamibeeBlog', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://famibee.blog.fc2.com/')));
        vscode_1.commands.registerCommand('skynovel.mail2famibee', () => vscode_1.env.openExternal(vscode_1.Uri.parse('mailto:famibee@gmail.com')));
        vscode_1.commands.registerCommand('skynovel.tw2famibee', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://twitter.com/famibee')));
        vscode_1.commands.registerCommand('skynovel.opVSCodeExJa', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja')));
        vscode_1.commands.registerCommand('skynovel.opVSCodeExIcon', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme')));
        vscode_1.commands.registerCommand('skynovel.opVSCodeExBookmarks', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=alefragnani.Bookmarks')));
        vscode_1.commands.registerCommand('skynovel.opVSCodeExLiveHTMLPrev', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=tht13.html-preview-vscode')));
        vscode_1.commands.registerCommand('skynovel.opVSCodeExHTMLHint', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=mkaufman.HTMLHint')));
        vscode_1.commands.registerCommand('skynovel.opVSCodeExCordovaTools', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.cordova-tools')));
        vscode_1.commands.registerCommand('skynovel.opVSCodeExDbg4Chrome', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome')));
        vscode_1.commands.registerCommand('skynovel.opVSCodeExglTFTools', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://marketplace.visualstudio.com/items?itemName=cesium.gltf-vscode')));
    }
    getChildren(elm) {
        if (!elm)
            return Promise.resolve(this.aTree);
        switch (elm.label) {
            case 'テンプレート プロジェクト': return Promise.resolve(this.aTreeTemp);
            case 'famibee 連絡先': return Promise.resolve(this.aTreeFamibee);
            case 'オススメVSCode拡張機能': return Promise.resolve(this.aTreeVSCodeEx);
        }
        return Promise.resolve([]);
    }
}
//# sourceMappingURL=ActivityBar.js.map