"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityBar = void 0;
const CmnLib_1 = require("./CmnLib");
const WorkSpaces_1 = require("./WorkSpaces");
const ToolBox_1 = require("./ToolBox");
const TreeDPDoc_1 = require("./TreeDPDoc");
const vscode_1 = require("vscode");
const { exec } = require('child_process');
const fs = require("fs-extra");
const os = require("os");
const https = require("https");
var eTree;
(function (eTree) {
    eTree[eTree["NODE"] = 0] = "NODE";
    eTree[eTree["NPM"] = 1] = "NPM";
    eTree[eTree["WINDOWS_BUILD_TOOLS"] = 2] = "WINDOWS_BUILD_TOOLS";
    eTree[eTree["SKYNOVEL_VER"] = 3] = "SKYNOVEL_VER";
})(eTree || (eTree = {}));
;
class ActivityBar {
    constructor(ctx) {
        this.ctx = ctx;
        this.aDevEnv = [
            { label: 'Node.js', icon: 'node-js-brands' },
            { label: 'npm', icon: 'npm-brands' },
            { label: CmnLib_1.is_win ? 'windows-build-tools' : '', icon: 'windows' },
            { label: 'SKYNovel（最新）', icon: 'skynovel' },
        ];
        this.aTiRoot = [];
        this.aReady = [undefined, undefined, undefined, undefined];
        this.verNode = 'v14.17.0';
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.getTreeItem = (t) => t;
        this.cntErr = 0;
        this.pnlWV = null;
        this.aTiRoot = this.aDevEnv.map(v => {
            const ti = new vscode_1.TreeItem(v.label);
            if (v.label)
                ti.iconPath = CmnLib_1.oIcon(v.icon);
            ti.contextValue = v.label;
            return ti;
        });
        this.refreshWork();
        ActivityBar.workSps = new WorkSpaces_1.WorkSpaces(ctx, () => this.chkLastSNVer());
        ctx.subscriptions.push(vscode_1.window.registerTreeDataProvider('sn-ws', ActivityBar.workSps));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.refreshSetting', () => this.refresh()));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.dlNode', () => vscode_1.env.openExternal(vscode_1.Uri.parse(`https://nodejs.org/dist/${this.verNode}/node-${this.verNode}` + (CmnLib_1.is_mac
            ? '.pkg'
            : `${os.arch().slice(-2) === '64' ? '-x64' : '-x86'}.msi`)))));
        ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.opNodeSite', () => vscode_1.env.openExternal(vscode_1.Uri.parse('https://nodejs.org/ja/'))));
    }
    static start(ctx) {
        CmnLib_1.setCtx4(ctx);
        ActivityBar.actBar = new ActivityBar(ctx);
        ctx.subscriptions.push(vscode_1.window.registerTreeDataProvider('sn-setting', ActivityBar.actBar));
        ActivityBar.tlBox = new ToolBox_1.ToolBox(ctx);
        ctx.subscriptions.push(vscode_1.window.registerWebviewViewProvider('sn-tb', ActivityBar.tlBox));
        ctx.subscriptions.push(vscode_1.window.registerTreeDataProvider('sn-doc', new TreeDPDoc_1.TreeDPDoc(ctx)));
    }
    static stop() {
        ActivityBar.actBar.dispose();
        ActivityBar.workSps.dispose();
        ActivityBar.tlBox.dispose();
    }
    dispose() { if (this.pnlWV)
        this.pnlWV.dispose(); }
    refresh() {
        this.refreshWork();
        this._onDidChangeTreeData.fire(undefined);
    }
    getChildren(t) {
        if (!t)
            return Promise.resolve(this.aTiRoot);
        const ret = [];
        if (t.label === 'Node.js')
            this.aTiRoot[eTree.NODE].iconPath = CmnLib_1.oIcon((this.aReady[eTree.NODE]) ? 'node-js-brands' : 'error');
        return Promise.resolve(ret);
    }
    refreshWork() {
        this.cntErr = 0;
        if (!this.aReady[eTree.NODE])
            exec('node -v', (err, stdout) => {
                const node = this.aTiRoot[eTree.NODE];
                if (err) {
                    this.aReady[eTree.NODE] = false;
                    node.description = `-- 見つかりません`;
                    node.iconPath = CmnLib_1.oIcon('error');
                    this._onDidChangeTreeData.fire(node);
                    this.activityBarBadge();
                    return;
                }
                this.aReady[eTree.NODE] = true;
                node.description = `-- ${stdout}`;
                node.iconPath = CmnLib_1.oIcon('node-js-brands');
                node.contextValue = '';
                this._onDidChangeTreeData.fire(node);
            });
        const wbt = this.aTiRoot[eTree.WINDOWS_BUILD_TOOLS];
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
                    this.activityBarBadge();
                    return;
                }
                this.aReady[eTree.WINDOWS_BUILD_TOOLS] = true;
                wbt.description = `-- ${a[2]}`;
                wbt.iconPath = CmnLib_1.oIcon('windows');
                this._onDidChangeTreeData.fire(wbt);
            });
        };
        if (this.aReady[eTree.NPM])
            chkWbt();
        else
            exec('npm -v', (err, stdout) => {
                const npm = this.aTiRoot[eTree.NPM];
                if (err) {
                    this.aReady[eTree.NPM] = false;
                    npm.description = `-- 見つかりません`;
                    npm.iconPath = CmnLib_1.oIcon('error');
                    this._onDidChangeTreeData.fire(npm);
                    this.activityBarBadge();
                    return;
                }
                this.aReady[eTree.NPM] = true;
                npm.description = `-- ${stdout}`;
                npm.iconPath = CmnLib_1.oIcon('npm-brands');
                this._onDidChangeTreeData.fire(npm);
                chkWbt();
            });
        this.chkLastSNVer();
    }
    chkLastSNVer() {
        const aFld = vscode_1.workspace.workspaceFolders;
        if (!aFld)
            return;
        https.get('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json', res => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                const newVer = JSON.parse(body).version;
                const node = this.aTiRoot[eTree.SKYNOVEL_VER];
                node.description = '-- ' + newVer;
                ActivityBar.actBar._onDidChangeTreeData.fire(node);
                if (aFld.find(fld => {
                    const fnLocal = fld.uri.fsPath + '/package.json';
                    if (!fs.existsSync(fnLocal))
                        return false;
                    const localVer = fs.readJsonSync(fnLocal).dependencies['@famibee/skynovel']?.slice(1);
                    if (localVer.slice(0, 4) === 'ile:')
                        return false;
                    return (newVer != localVer);
                }))
                    vscode_1.window.showInformationMessage(`SKYNovelに更新（${newVer}）があります。【開発ツール】-【SKYNovel更新】のボタンを押してください`);
            });
        }).on('error', (e) => console.error(e.message));
    }
    activityBarBadge() {
        ++this.cntErr;
        const column = vscode_1.window.activeTextEditor?.viewColumn;
        if (this.pnlWV) {
            this.pnlWV.reveal(column);
            return;
        }
        const path_doc = this.ctx.extensionPath + '/res/preenv';
        this.pnlWV = vscode_1.window.createWebviewPanel('SKYNovel-envinfo', '開発環境準備', column || vscode_1.ViewColumn.One, {
            enableScripts: false,
            localResourceRoots: [vscode_1.Uri.file(path_doc)],
        });
        this.pnlWV.onDidDispose(() => this.pnlWV = null);
        fs.readFile(path_doc + `/index.htm`, 'utf-8', (err, data) => {
            if (err)
                throw err;
            this.pnlWV.webview.html = data
                .replace('${エラー数}', String(this.cntErr))
                .replace(/(<img src=")img\//g, `$1vscode-resource:${path_doc}/img/`)
                .replace('type="text/css" href="', `$0vscode-resource:${path_doc}/`);
        });
    }
}
exports.ActivityBar = ActivityBar;
//# sourceMappingURL=ActivityBar.js.map