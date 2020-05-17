"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityBar = void 0;
const CmnLib_1 = require("./CmnLib");
const WorkSpaces_1 = require("./WorkSpaces");
const TreeDPDoc_1 = require("./TreeDPDoc");
const vscode_1 = require("vscode");
const { exec } = require('child_process');
const fs = require("fs-extra");
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
let ActivityBar = (() => {
    class ActivityBar {
        constructor(ctx) {
            this.ctx = ctx;
            this.aReady = [undefined, undefined, undefined, undefined];
            this._onDidChangeTreeData = new vscode_1.EventEmitter();
            this.onDidChangeTreeData = this._onDidChangeTreeData.event;
            this.getTreeItem = (t) => t;
            this.pnlWV = null;
            ActivityBar.aTiRoot.forEach(v => v.contextValue = v.label);
            this.refreshWork();
            ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.refreshSetting', () => this.refresh()));
            ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.dlNode', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://nodejs.org/dist/v12.16.3/node-v12.16.3' + (CmnLib_1.is_mac
                ? '.pkg'
                : ((os.arch().slice(-2) == '64' ? '-x64' : '-x86') + '.msi'))))));
            ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opNodeSite', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://nodejs.org/ja/'))));
        }
        static start(ctx) {
            CmnLib_1.ctx4Icon(ctx);
            ActivityBar.actBar = new ActivityBar(ctx);
            ctx.subscriptions.push(vscode_1.window.registerTreeDataProvider('sn-setting', ActivityBar.actBar));
            ActivityBar.trDPWss = new WorkSpaces_1.WorkSpaces(ctx, ActivityBar.chkLastVerSKYNovel);
            ctx.subscriptions.push(vscode_1.window.registerTreeDataProvider('sn-dev', ActivityBar.trDPWss));
            ctx.subscriptions.push(vscode_1.window.registerTreeDataProvider('sn-doc', new TreeDPDoc_1.TreeDPDoc(ctx)));
        }
        static stopActBar() {
            ActivityBar.actBar.dispose();
            ActivityBar.trDPWss.dispose();
        }
        dispose() { if (this.pnlWV)
            this.pnlWV.dispose(); }
        refresh() {
            this.refreshWork();
            this._onDidChangeTreeData.fire(undefined);
        }
        getChildren(t) {
            if (!t)
                return Promise.resolve(ActivityBar.aTiRoot);
            const ret = [];
            if (t.label == 'Node.js')
                ActivityBar.aTiRoot[eTree.NODE].iconPath = (this.aReady[eTree.NODE]) ? '' : CmnLib_1.oIcon('error');
            return Promise.resolve(ret);
        }
        refreshWork() {
            let error = 0;
            if (!this.aReady[eTree.NODE])
                exec('node -v', (err, stdout) => {
                    const node = ActivityBar.aTiRoot[eTree.NODE];
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
            const wbt = ActivityBar.aTiRoot[eTree.WINDOWS_BUILD_TOOLS];
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
                    const npm = ActivityBar.aTiRoot[eTree.NPM];
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
            ActivityBar.chkLastVerSKYNovel();
        }
        static chkLastVerSKYNovel() {
            const aFld = vscode_1.workspace.workspaceFolders;
            if (!aFld)
                return;
            https.get('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json', (res) => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    const newVer = JSON.parse(body).version;
                    const node = ActivityBar.aTiRoot[eTree.SKYNOVEL_VER];
                    node.description = '-- ' + newVer;
                    ActivityBar.actBar._onDidChangeTreeData.fire(node);
                    if (aFld.find(fld => {
                        const fnLocal = fld.uri.fsPath + '/package.json';
                        if (!fs.existsSync(fnLocal))
                            return false;
                        const localVer = fs.readJsonSync(fnLocal).dependencies.skynovel.slice(1);
                        if (localVer.slice(0, 4) == 'ile:')
                            return false;
                        return (newVer != localVer);
                    }))
                        vscode_1.window.showInformationMessage(`SKYNovelに更新（${newVer}）があります。【開発ツール】-【SKYNovel更新】のボタンを押してください`);
                });
            }).on('error', (e) => console.error(e.message));
        }
        async activityBarBadge(num = 0) {
            var _a;
            const column = (_a = vscode_1.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.viewColumn;
            if (this.pnlWV) {
                this.pnlWV.reveal(column);
                return;
            }
            const path_doc = this.ctx.extensionPath + '/doc';
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
    ActivityBar.aTiRoot = [
        new vscode_1.TreeItem('Node.js'),
        new vscode_1.TreeItem('npm'),
        new vscode_1.TreeItem(CmnLib_1.is_win ? 'windows-build-tools' : ''),
        new vscode_1.TreeItem('SKYNovel（最新）'),
    ];
    return ActivityBar;
})();
exports.ActivityBar = ActivityBar;
//# sourceMappingURL=ActivityBar.js.map