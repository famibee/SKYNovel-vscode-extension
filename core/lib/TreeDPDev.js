"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const UpdFileWork_1 = require("./UpdFileWork");
const ReferenceProvider_1 = require("./ReferenceProvider");
const fs = require('fs');
function oIcon(name) {
    return {
        light: `${__filename}/../../../res/light/${name}.svg`,
        dark: `${__filename}/../../../res/dark/${name}.svg`
    };
}
exports.oIcon = oIcon;
;
exports.is_win = process.platform === 'win32';
exports.is_mac = process.platform === 'darwin';
class TreeDPDev {
    constructor(context) {
        this.aTree = [];
        this.oTreePrj = {};
        this.fnc_onDidEndTaskProcess = (_e) => { };
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.TreeChild = [
            { icon: 'skynovel', label: 'SKYNovel更新' },
            { icon: 'browser', label: 'ブラウザ版を起動' },
            { icon: 'electron', label: 'アプリ版を起動' },
            { icon: 'windows', label: 'exe生成' },
            { icon: 'macosx', label: 'app生成（macOS上のみ）' },
        ];
        this.oDisposeFSW = {};
        this.statBreak = exports.is_mac ? () => '&&'
            : exports.is_win ? () => {
                const isPS = String(vscode_1.workspace.getConfiguration('terminal.integrated.shell').get('windows')).slice(-14);
                return (isPS === 'powershell.exe') ? ';' : '&';
            }
                : () => ';';
        this.getTreeItem = (elm) => elm;
        this.rp = new ReferenceProvider_1.ReferenceProvider(context);
        [
            'sn.devSnUpd',
            'sn.devTaskWeb',
            'sn.devTaskStart',
            'sn.devTaskPackWin',
            'sn.devTaskPackMac',
        ].forEach(v => vscode_1.commands.registerCommand(v, ti => this.fncDev(ti)));
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
                let del = this.aTree.findIndex(v => v.label === nm);
                this.aTree.splice(del, 1);
                const dir = e.removed[0].uri.fsPath;
                delete this.oTreePrj[dir];
                const d = this.oDisposeFSW[dir];
                d.crePrj.dispose();
                d.chgPrj.dispose();
                d.delPrj.dispose();
                d.crePlg.dispose();
                d.delPlg.dispose();
            }
        }
        else {
            this.oTreePrj = {};
            aFld.forEach(fld => this.wsf2tree(fld));
        }
        this._onDidChangeTreeData.fire();
    }
    wsf2tree(fld) {
        const t = new vscode_1.TreeItem(fld.name, vscode_1.TreeItemCollapsibleState.Collapsed);
        const dir = fld.uri.fsPath;
        t.iconPath = vscode_1.ThemeIcon.Folder;
        t.tooltip = dir;
        t.description = '';
        this.aTree.push(t);
        const pathPkg = dir + '/package.json';
        if (!fs.existsSync(pathPkg)) {
            t.tooltip = t.description = 'package.json がありません';
            return;
        }
        this.oTreePrj[t.tooltip] = this.TreeChild.map(v => {
            const ti = new vscode_1.TreeItem(v.label);
            ti.iconPath = oIcon(v.icon);
            ti.contextValue = ti.label;
            ti.tooltip = dir;
            return ti;
        });
        this.updLocalSNVer(dir);
        const cur = dir + '/prj/';
        if (!fs.existsSync(cur + 'prj.json')) {
            t.tooltip = t.description = 'prj/prj.json がありません';
            return;
        }
        const oPpj = JSON.parse(fs.readFileSync(cur + 'prj.json'));
        if (oPpj.book)
            t.description = oPpj.book.title || '';
        const fwPrj = vscode_1.workspace.createFileSystemWatcher(cur + '?*/*');
        const curPlg = dir + '/core/plugin';
        if (!fs.existsSync(dir + '/core'))
            fs.mkdirSync(dir + '/core');
        if (!fs.existsSync(curPlg))
            fs.mkdirSync(curPlg);
        const fwPlg = vscode_1.workspace.createFileSystemWatcher(curPlg + '/?*/');
        this.oDisposeFSW[dir] = {
            crePrj: fwPrj.onDidCreate(e => { this.rp.chgPrj(e); UpdFileWork_1.updPathJson(cur); }),
            chgPrj: fwPrj.onDidChange(e => { this.rp.repPrj(e); }),
            delPrj: fwPrj.onDidDelete(e => { this.rp.chgPrj(e); UpdFileWork_1.updPathJson(cur); }),
            crePlg: fwPlg.onDidCreate(() => UpdFileWork_1.updPlugin(curPlg)),
            delPlg: fwPlg.onDidDelete(() => UpdFileWork_1.updPlugin(curPlg)),
        };
        UpdFileWork_1.updPathJson(cur);
        this.rp.updPrj(cur);
        UpdFileWork_1.updPlugin(curPlg);
    }
    updLocalSNVer(dir) {
        const tc = this.oTreePrj[dir];
        const localVer = JSON.parse(fs.readFileSync(dir + '/package.json')).dependencies.skynovel.slice(1);
        tc[0].description = `-- ${localVer}`;
    }
    fncDev(ti) {
        const aFld = vscode_1.workspace.workspaceFolders;
        if (!aFld) {
            vscode_1.window.showWarningMessage(`[SKYNovel] フォルダを開いているときのみ使用できます`);
            return;
        }
        let cmd = (aFld.length > 1)
            ? `cd "${ti.tooltip}" ${this.statBreak()} `
            : '';
        const dir = ti.tooltip || '';
        if (!fs.existsSync(dir + '/node_modules'))
            cmd += `npm i ${this.statBreak()} `;
        const i = this.TreeChild.findIndex(v => v.label === ti.label);
        switch (i) {
            case 0:
                cmd += `npm i skynovel@latest ${this.statBreak()} npm run webpack:dev`;
                break;
            case 1:
                cmd += 'npm run web';
                break;
            case 2:
                cmd += 'npm run start';
                break;
            case 3:
                cmd += 'npm run pack:win';
                break;
            case 4:
                cmd += 'npm run pack:mac';
                break;
            default: return;
        }
        const t = new vscode_1.Task({ type: 'SKYNovelEx Task ' + i }, this.TreeChild[i].label, 'SKYNovel', new vscode_1.ShellExecution(cmd));
        this.fnc_onDidEndTaskProcess = (i == 0)
            ? e => {
                if (e.execution.task.definition.type != t.definition.type)
                    return;
                if (e.execution.task.source != t.source)
                    return;
                this.updLocalSNVer(dir);
                this._onDidChangeTreeData.fire();
            }
            : () => { };
        vscode_1.tasks.executeTask(t);
    }
    getChildren(elm) {
        return Promise.resolve((elm) ? this.oTreePrj[elm.tooltip] : this.aTree);
    }
    dispose() {
        for (const dir in this.oDisposeFSW) {
            const d = this.oDisposeFSW[dir];
            d.crePrj.dispose();
            d.chgPrj.dispose();
            d.delPrj.dispose();
            d.crePlg.dispose();
            d.delPlg.dispose();
        }
        this.oDisposeFSW = {};
    }
}
exports.TreeDPDev = TreeDPDev;
//# sourceMappingURL=TreeDPDev.js.map