"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const PrjFileProc_1 = require("./PrjFileProc");
const vscode_1 = require("vscode");
const fs = require('fs-extra');
class TreeDPDev {
    constructor(ctx) {
        this.ctx = ctx;
        this.aTree = [];
        this.oTreePrj = {};
        this.TreeChild = [
            { icon: 'skynovel', label: 'SKYNovel更新', cmd: 'skynovel.devSnUpd' },
            { icon: 'browser', label: 'ブラウザ版を起動', cmd: 'skynovel.devTaskWeb' },
            { icon: 'electron', label: 'アプリ版を起動', cmd: 'skynovel.devTaskStart' },
            { icon: 'windows', label: 'exe生成', cmd: 'skynovel.devTaskPackWin' },
            { icon: 'macosx', label: 'app生成（macOS上のみ）',
                cmd: 'skynovel.devTaskPackMac' },
            { icon: 'gear', label: '暗号化', cmd: 'skynovel.devCrypt' },
        ];
        this.oPfp = {};
        this.fnc_onDidEndTaskProcess = (_e) => { };
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.getTreeItem = (elm) => elm;
        this.TreeChild.forEach(v => vscode_1.commands.registerCommand(v.cmd, ti => this.fncDev(ti)));
        vscode_1.tasks.onDidEndTaskProcess(e => this.fnc_onDidEndTaskProcess(e));
        this.refresh();
        if (this.aTree.length > 0)
            this.aTree[0].collapsibleState = vscode_1.TreeItemCollapsibleState.Expanded;
        vscode_1.workspace.onDidChangeWorkspaceFolders(e => this.refresh(e));
    }
    refresh(e) {
        const aFld = vscode_1.workspace.workspaceFolders;
        if (!aFld)
            return;
        if (e) {
            if (e.added.length > 0)
                this.wsf2tree(aFld.slice(-1)[0]);
            else {
                const nm = e.removed[0].name;
                const del = this.aTree.findIndex(v => v.label === nm);
                this.aTree.splice(del, 1);
                const dir = e.removed[0].uri.fsPath;
                delete this.oTreePrj[dir];
                this.oPfp[dir].dispose();
            }
        }
        else {
            this.oTreePrj = {};
            aFld.forEach(fld => this.wsf2tree(fld));
        }
        this._onDidChangeTreeData.fire();
    }
    wsf2tree(fld) {
        const t = new vscode_1.TreeItem('', vscode_1.TreeItemCollapsibleState.Collapsed);
        const dir = fld.uri.fsPath;
        t.iconPath = vscode_1.ThemeIcon.Folder;
        t.tooltip = dir;
        t.description = fld.name;
        this.aTree.push(t);
        const pathPkg = dir + '/package.json';
        if (!fs.existsSync(pathPkg)) {
            t.label = 'package.json がありません';
            return;
        }
        this.oTreePrj[t.tooltip] = this.TreeChild.map(v => {
            const ti = new vscode_1.TreeItem(v.label);
            ti.iconPath = CmnLib_1.oIcon(v.icon);
            ti.contextValue = ti.label;
            ti.tooltip = dir;
            return ti;
        });
        this.updLocalSNVer(dir);
        this.oPfp[dir] = new PrjFileProc_1.PrjFileProc(this.ctx, dir, title => {
            t.label = title;
            this._onDidChangeTreeData.fire(t);
        });
        this.dspCryptMode(dir);
    }
    updLocalSNVer(dir) {
        const tc = this.oTreePrj[dir];
        const localVer = fs.readJsonSync(dir + '/package.json').dependencies.skynovel.slice(1);
        tc[0].description = `-- ${localVer}`;
    }
    dspCryptMode(dir) {
        const tc = this.oTreePrj[dir];
        const fpf = this.oPfp[dir];
        tc[5].description = `-- ${fpf.isCryptMode ? 'する' : 'しない'}`;
    }
    fncDev(ti) {
        const aFld = vscode_1.workspace.workspaceFolders;
        if (!aFld) {
            vscode_1.window.showWarningMessage(`[SKYNovel] フォルダを開いているときのみ使用できます`);
            return;
        }
        let cmd = (aFld.length > 1) ? `cd "${ti.tooltip}" ${CmnLib_1.statBreak()} ` : '';
        const dir = ti.tooltip || '';
        if (!fs.existsSync(dir + '/node_modules'))
            cmd += `npm i ${CmnLib_1.statBreak()} `;
        const i = this.TreeChild.findIndex(v => v.label === ti.label);
        if (i == -1)
            return;
        const tc = this.TreeChild[i];
        switch (tc.cmd) {
            case 'skynovel.devSnUpd':
                cmd += `npm i skynovel@latest ${CmnLib_1.statBreak()} npm run webpack:dev`;
                break;
            case 'skynovel.devCrypt':
                vscode_1.window.showInformationMessage('暗号化（する / しない）を切り替えますか？', { modal: true }, 'はい')
                    .then(a => {
                    if (a != 'はい')
                        return;
                    this.oPfp[dir].tglCryptMode();
                    this.dspCryptMode(dir);
                    this._onDidChangeTreeData.fire(ti);
                });
                return;
            case 'skynovel.devTaskWeb':
                cmd += 'npm run web';
                break;
            case 'skynovel.devTaskStart':
                cmd += 'npm run start';
                break;
            case 'skynovel.devTaskPackWin':
                cmd += 'npm run pack:win';
                break;
            case 'skynovel.devTaskPackMac':
                cmd += 'npm run pack:mac';
                break;
            default: return;
        }
        const t = new vscode_1.Task({ type: 'SKYNovel ' + i }, tc.label, 'SKYNovel', new vscode_1.ShellExecution(cmd));
        this.fnc_onDidEndTaskProcess = (i == 0)
            ? e => {
                if (e.execution.task.definition.type != t.definition.type)
                    return;
                if (e.execution.task.source != t.source)
                    return;
                this.updLocalSNVer(dir);
                this._onDidChangeTreeData.fire(ti);
            }
            : () => { };
        vscode_1.tasks.executeTask(t);
    }
    getChildren(elm) {
        return Promise.resolve((elm) ? this.oTreePrj[elm.tooltip] : this.aTree);
    }
    dispose() {
        for (const dir in this.oPfp)
            this.oPfp[dir].dispose();
        this.oPfp = {};
    }
}
exports.TreeDPDev = TreeDPDev;
//# sourceMappingURL=TreeDPDev.js.map