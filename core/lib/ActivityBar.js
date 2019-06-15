"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const https = require('https');
const TreeDPDev_1 = require("./TreeDPDev");
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
            new vscode.TreeItem('Node.js'),
            new vscode.TreeItem('npm'),
            new vscode.TreeItem(TreeDPDev_1.is_win ? 'windows-build-tools' : ''),
            new vscode.TreeItem('SKYNovel（最新）'),
        ];
        this.aReady = [undefined, undefined, undefined, undefined];
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.getTreeItem = (elm) => elm;
        this.pnlWV = null;
        this.aTree.forEach(v => v.contextValue = v.label);
        this.refreshWork();
        vscode.commands.registerCommand('sn.refreshSetting', () => this.refresh());
        vscode.commands.registerCommand('sn.dlNode', () => vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/dist/v10.15.3/node-v10.15.3'
            + (TreeDPDev_1.is_mac
                ? '.pkg'
                : ((os.arch().slice(-2) == '64' ? '-x64' : '-x32') + '.msi')))));
        vscode.commands.registerCommand('sn.opNodeSite', () => vscode.env.openExternal(vscode.Uri.parse('https://nodejs.org/ja/')));
        const aFld = vscode.workspace.workspaceFolders;
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
                        const localVer = JSON.parse(fs.readFileSync(fnLocal)).dependencies.skynovel.slice(1);
                        return (newVer != localVer);
                    }))
                        vscode.window.showInformationMessage(`SKYNovelに更新（${newVer}）があります。【開発ツール】-【SKYNovel更新】のボタンを押してください`);
                });
            }).on('error', (e) => console.error(e.message));
    }
    static start(context) {
        ActivityBar.trDPEnv = new ActivityBar(context);
        vscode.window.registerTreeDataProvider('sn-setting', ActivityBar.trDPEnv);
        ActivityBar.trDPDev = new TreeDPDev_1.TreeDPDev(context);
        vscode.window.registerTreeDataProvider('sn-dev', ActivityBar.trDPDev);
        vscode.window.registerTreeDataProvider('sn-doc', new TreeDPDoc);
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
            this.aTree[eTree.NODE].iconPath = (this.aReady[eTree.NODE]) ? '' : TreeDPDev_1.oIcon('error');
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
                    node.iconPath = TreeDPDev_1.oIcon('error');
                    this._onDidChangeTreeData.fire();
                    this.activityBarBadge(++error);
                    return;
                }
                this.aReady[eTree.NODE] = true;
                node.description = `-- ${stdout}`;
                node.iconPath = '';
                node.contextValue = '';
                this._onDidChangeTreeData.fire();
            });
        const wbt = this.aTree[eTree.WINDOWS_BUILD_TOOLS];
        const chkWbt = () => {
            if (!TreeDPDev_1.is_win)
                return;
            exec('npm ls -g windows-build-tools', (err, stdout) => {
                const a = String(stdout).split(/@|\n/);
                if (err || a.length < 3) {
                    this.aReady[eTree.WINDOWS_BUILD_TOOLS] = false;
                    wbt.description = `-- 見つかりません`;
                    wbt.iconPath = TreeDPDev_1.oIcon('error');
                    this._onDidChangeTreeData.fire();
                    this.activityBarBadge(++error);
                    return;
                }
                this.aReady[eTree.WINDOWS_BUILD_TOOLS] = true;
                wbt.description = `-- ${a[2]}`;
                wbt.iconPath = '';
                this._onDidChangeTreeData.fire();
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
                    npm.iconPath = TreeDPDev_1.oIcon('error');
                    this._onDidChangeTreeData.fire();
                    this.activityBarBadge(++error);
                    return;
                }
                this.aReady[eTree.NPM] = true;
                npm.description = `-- ${stdout}`;
                npm.iconPath = '';
                this._onDidChangeTreeData.fire();
                chkWbt();
            });
    }
    async activityBarBadge(num = 0) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (this.pnlWV) {
            this.pnlWV.reveal(column);
            return;
        }
        const path_doc = this.context.extensionPath + '/doc';
        this.pnlWV = vscode.window.createWebviewPanel('SKYNovel-envinfo', 'SKYNovel情報', column || vscode.ViewColumn.One, {
            enableScripts: false,
            localResourceRoots: [vscode.Uri.file(path_doc)],
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
            new vscode.TreeItem('開発者向け情報'),
            new vscode.TreeItem('タグリファレンス'),
            new vscode.TreeItem('マクロ・プラグインリファレンス'),
            new vscode.TreeItem('機能ギャラリー'),
            new vscode.TreeItem('テンプレート プロジェクト', vscode.TreeItemCollapsibleState.Collapsed),
            new vscode.TreeItem('famibee 連絡先', vscode.TreeItemCollapsibleState.Collapsed),
            new vscode.TreeItem('オススメVSCode拡張機能', vscode.TreeItemCollapsibleState.Collapsed),
        ];
        this.aTreeTemp = [
            new vscode.TreeItem('横書き「初音館にて」'),
            new vscode.TreeItem('縦書き「桜の樹の下には」'),
        ];
        this.aTreeFamibee = [
            new vscode.TreeItem('famibee blog'),
            new vscode.TreeItem('famibee Mail'),
            new vscode.TreeItem('famibee Twitter'),
        ];
        this.aTreeVSCodeEx = [
            new vscode.TreeItem('日本語化'),
            new vscode.TreeItem('Material Icon Theme'),
            new vscode.TreeItem('Bookmarks'),
            new vscode.TreeItem('HTML Preview'),
            new vscode.TreeItem('HTMLHint'),
            new vscode.TreeItem('Cordova Tools'),
            new vscode.TreeItem('Debugger for Chrome'),
            new vscode.TreeItem('glTF Tools'),
        ];
        this.getTreeItem = (elm) => elm;
        this.aTree.forEach(v => {
            v.iconPath =
                (v.collapsibleState == vscode.TreeItemCollapsibleState.None)
                    ? TreeDPDev_1.oIcon('document')
                    : vscode.ThemeIcon.Folder;
            v.contextValue = v.label;
        });
        this.aTreeTemp.forEach(v => {
            v.iconPath = TreeDPDev_1.oIcon('baggage');
            v.contextValue = v.label;
        });
        this.aTreeFamibee.forEach(v => {
            v.iconPath = TreeDPDev_1.oIcon('document');
            v.contextValue = v.label;
        });
        this.aTreeFamibee[1].iconPath = TreeDPDev_1.oIcon('mail');
        this.aTreeFamibee[2].iconPath = TreeDPDev_1.oIcon('twitter');
        this.aTreeVSCodeEx.forEach(v => {
            v.iconPath = TreeDPDev_1.oIcon('gear');
            v.contextValue = v.label;
        });
        vscode.commands.registerCommand('sn.opDev', () => vscode.env.openExternal(vscode.Uri.parse('https://famibee.github.io/SKYNovel/dev.htm')));
        vscode.commands.registerCommand('sn.opTag', () => vscode.env.openExternal(vscode.Uri.parse('https://famibee.github.io/SKYNovel/tag.htm')));
        vscode.commands.registerCommand('sn.opMacroPlg', () => vscode.env.openExternal(vscode.Uri.parse('https://famibee.github.io/SKYNovel/macro_plg.htm')));
        vscode.commands.registerCommand('sn.opGallery', () => vscode.env.openExternal(vscode.Uri.parse('https://famibee.github.io/SKYNovel_gallery/')));
        vscode.commands.registerCommand('sn.dlTmpYoko', () => vscode.env.openExternal(vscode.Uri.parse('https://github.com/famibee/SKYNovel_hatsune/archive/master.zip')));
        vscode.commands.registerCommand('sn.dlTmpTate', () => vscode.env.openExternal(vscode.Uri.parse('https://github.com/famibee/SKYNovel_uc/archive/master.zip')));
        vscode.commands.registerCommand('sn.opFamibeeBlog', () => vscode.env.openExternal(vscode.Uri.parse('https://famibee.blog.fc2.com/')));
        vscode.commands.registerCommand('sn.mail2famibee', () => vscode.env.openExternal(vscode.Uri.parse('mailto:famibee@gmail.com')));
        vscode.commands.registerCommand('sn.tw2famibee', () => vscode.env.openExternal(vscode.Uri.parse('https://twitter.com/famibee')));
        vscode.commands.registerCommand('sn.opVSCodeExJa', () => vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja')));
        vscode.commands.registerCommand('sn.opVSCodeExIcon', () => vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme')));
        vscode.commands.registerCommand('sn.opVSCodeExBookmarks', () => vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=alefragnani.Bookmarks')));
        vscode.commands.registerCommand('sn.opVSCodeExLiveHTMLPrev', () => vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=tht13.html-preview-vscode')));
        vscode.commands.registerCommand('sn.opVSCodeExHTMLHint', () => vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=mkaufman.HTMLHint')));
        vscode.commands.registerCommand('sn.opVSCodeExCordovaTools', () => vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.cordova-tools')));
        vscode.commands.registerCommand('sn.opVSCodeExDbg4Chrome', () => vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome')));
        vscode.commands.registerCommand('sn.opVSCodeExglTFTools', () => vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=cesium.gltf-vscode')));
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