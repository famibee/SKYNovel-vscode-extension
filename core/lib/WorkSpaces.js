"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const Project_1 = require("./Project");
const vscode_1 = require("vscode");
const fs = require("fs-extra");
class WorkSpaces {
    constructor(ctx, chkLastVerSKYNovel) {
        this.ctx = ctx;
        this.chkLastVerSKYNovel = chkLastVerSKYNovel;
        this.aTiRoot = [];
        this.oTiPrj = {};
        this.TreeChild = [
            { icon: 'gear', label: 'プロジェクト設定', cmd: 'skynovel.devPrjSet' },
            { icon: 'skynovel', label: 'SKYNovel更新', cmd: 'skynovel.devSnUpd' },
            { icon: 'plugin', label: '全ライブラリ更新', cmd: 'skynovel.devLibUpd' },
            { icon: 'browser', label: 'ブラウザ版を起動', cmd: 'skynovel.devTaskWeb' },
            { icon: 'electron', label: 'アプリ版を起動', cmd: 'skynovel.devTaskStart' },
            { icon: 'windows', label: 'exe生成', cmd: 'skynovel.devTaskPackWin' },
            { icon: 'macosx', label: 'app生成', cmd: 'skynovel.devTaskPackMac', desc: CmnLib_1.is_mac ? '' : 'OS X 上のみ' },
            { icon: 'gear', label: '暗号化', cmd: 'skynovel.devCrypto' },
            { icon: 'gear', label: 'リビルド', cmd: 'skynovel.devReBuild' },
        ];
        this.idxDevPrjSet = 1;
        this.idxDevTaskPackMac = 6;
        this.idxDevCrypto = 7;
        this.oPfp = {};
        this.tidDelay = null;
        this.decChars = {
            aRange: [],
            decorator: vscode_1.window.createTextEditorDecorationType({})
        };
        this.fnc_onDidEndTaskProcess = (_e) => { };
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.getTreeItem = (t) => t;
        if (CmnLib_1.is_win) {
            const tc = this.TreeChild[this.idxDevTaskPackMac];
            tc.label = '';
            tc.cmd = '';
            tc.desc = '（Windowsでは使えません）';
        }
        this.refresh();
        vscode_1.workspace.onDidChangeWorkspaceFolders(e => this.refresh(e));
        this.TreeChild.forEach(v => { if (v.cmd)
            ctx.subscriptions.push(vscode_1.commands.registerCommand(v.cmd, ti => this.onClickTreeItemBtn(ti))); });
        vscode_1.tasks.onDidEndTaskProcess(e => this.fnc_onDidEndTaskProcess(e));
        this.onUpdDoc(vscode_1.window.activeTextEditor);
        vscode_1.window.onDidChangeActiveTextEditor(te => this.onUpdDoc(te), null, ctx.subscriptions);
        vscode_1.workspace.onDidCloseTextDocument(td => {
            var _a;
            if (((_a = this.teActive) === null || _a === void 0 ? void 0 : _a.document) == td)
                this.teActive = undefined;
        });
        vscode_1.workspace.onDidChangeTextDocument(e => {
            var _a;
            if (e.document === ((_a = this.teActive) === null || _a === void 0 ? void 0 : _a.document))
                this.onUpdDoc(this.teActive);
        }, null, ctx.subscriptions);
    }
    onUpdDoc(te) {
        if (!te)
            return;
        if (te.document.languageId != 'skynovel')
            return;
        this.teActive = te;
        if (this.tidDelay)
            clearTimeout(this.tidDelay);
        this.tidDelay = setTimeout(() => this.updDeco(), 500);
    }
    updDeco() {
        if (!this.teActive)
            return;
        const doc = this.teActive.document;
        const src = doc.getText();
        vscode_1.window.setStatusBarMessage('');
        this.decChars.decorator.dispose();
        this.decChars = {
            aRange: [],
            decorator: vscode_1.window.createTextEditorDecorationType({
                'light': { 'textDecoration': 'underline', },
                'dark': { 'textDecoration': 'underline', }
            })
        };
        let m;
        while (m = WorkSpaces.REG_FN_OR_LABEL.exec(src)) {
            this.decChars.aRange.push(new vscode_1.Range(doc.positionAt(m.index + m[0].length - m[1].length), doc.positionAt(m.index + m[0].length)));
        }
        this.teActive.setDecorations(this.decChars.decorator, this.decChars.aRange);
    }
    refresh(e) {
        const aFld = vscode_1.workspace.workspaceFolders;
        if (!aFld)
            return;
        if (!e) {
            aFld.forEach(fld => this.makePrj(fld));
            this.aTiRoot[0].collapsibleState = vscode_1.TreeItemCollapsibleState.Expanded;
            this._onDidChangeTreeData.fire(undefined);
            return;
        }
        if (e.added.length > 0)
            this.makePrj(aFld.slice(-1)[0]);
        else {
            const nm = e.removed[0].name;
            const del = this.aTiRoot.findIndex(v => v.label === nm);
            this.aTiRoot.splice(del, 1);
            const dir = e.removed[0].uri.fsPath;
            delete this.oTiPrj[dir];
            this.oPfp[dir].dispose();
        }
        this._onDidChangeTreeData.fire(undefined);
    }
    makePrj(fld) {
        const t = new vscode_1.TreeItem('', vscode_1.TreeItemCollapsibleState.Collapsed);
        const dir = fld.uri.fsPath;
        t.iconPath = vscode_1.ThemeIcon.Folder;
        t.tooltip = dir;
        t.description = fld.name;
        this.aTiRoot.push(t);
        const existPkgJS = fs.existsSync(dir + '/package.json');
        const existPrjJS = fs.existsSync(dir + '/prj/prj.json');
        if (!existPkgJS || !existPrjJS) {
            const ti = new vscode_1.TreeItem(`${existPkgJS ? 'prj' : 'package'}.json がありません`);
            ti.iconPath = CmnLib_1.oIcon('warn');
            this.oTiPrj[dir] = [ti];
            return;
        }
        this.oTiPrj[dir] = this.TreeChild.map(v => {
            var _a;
            const t2 = new vscode_1.TreeItem(v.label);
            t2.iconPath = CmnLib_1.oIcon(v.icon);
            t2.contextValue = t2.label;
            t2.description = (_a = v.desc) !== null && _a !== void 0 ? _a : '';
            t2.tooltip = dir;
            return t2;
        });
        this.updLocalSNVer(dir);
        this.oPfp[dir] = new Project_1.Project(this.ctx, dir, title => {
            t.label = title;
            this._onDidChangeTreeData.fire(t);
        });
        this.dspCryptoMode(dir);
    }
    updLocalSNVer(dir) {
        var _a, _b;
        const o = fs.readJsonSync(dir + '/package.json');
        const localVer = (_b = (_a = o === null || o === void 0 ? void 0 : o.dependencies) === null || _a === void 0 ? void 0 : _a.skynovel) === null || _b === void 0 ? void 0 : _b.slice(1);
        this.oTiPrj[dir][this.idxDevPrjSet].description = localVer ? `-- ${localVer}` : '取得できません';
    }
    dspCryptoMode(dir) {
        const tc = this.oTiPrj[dir];
        const fpf = this.oPfp[dir];
        tc[this.idxDevCrypto].description = `-- ${fpf.isCryptoMode ? 'する' : 'しない'}`;
    }
    onClickTreeItemBtn(ti) {
        var _a;
        if (!ti)
            console.log(`fn:TreeDPDev.ts line:133 onClickTreeItemBtn undefined...`);
        const aFld = vscode_1.workspace.workspaceFolders;
        if (!aFld) {
            vscode_1.window.showWarningMessage(`[SKYNovel] フォルダを開いているときのみ使用できます`);
            return;
        }
        let cmd = (aFld.length > 1) ? `cd "${ti.tooltip}" ${CmnLib_1.statBreak()} ` : '';
        const dir = (_a = ti.tooltip) !== null && _a !== void 0 ? _a : '';
        if (!fs.existsSync(dir + '/node_modules'))
            cmd += `npm i ${CmnLib_1.statBreak()} `;
        const i = this.TreeChild.findIndex(v => v.label === ti.label);
        if (i == -1)
            return;
        const tc = this.TreeChild[i];
        switch (tc.cmd) {
            case 'skynovel.devPrjSet':
                this.oPfp[dir].openPrjSetting();
                return;
            case 'skynovel.devSnUpd':
                cmd += `npm i skynovel@latest ${CmnLib_1.statBreak()} npm run webpack:dev`;
                this.chkLastVerSKYNovel();
                break;
            case 'skynovel.devLibUpd':
                cmd += `npm update ${CmnLib_1.statBreak()} npm update --dev ${CmnLib_1.statBreak()} npm run webpack:dev`;
                break;
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
            case 'skynovel.devCrypto':
                vscode_1.window.showInformationMessage('暗号化（する / しない）を切り替えますか？', { modal: true }, 'はい')
                    .then(a => {
                    if (a != 'はい')
                        return;
                    this.oPfp[dir].tglCryptoMode();
                    this.dspCryptoMode(dir);
                    this._onDidChangeTreeData.fire(ti);
                });
                return;
            case 'skynovel.devReBuild':
                cmd += 'npm run rebuild';
                break;
            default: return;
        }
        const t = new vscode_1.Task({ type: 'SKYNovel ' + i }, tc.label, 'SKYNovel', new vscode_1.ShellExecution(cmd));
        this.fnc_onDidEndTaskProcess
            = (tc.cmd == 'skynovel.devSnUpd'
                || tc.cmd == 'skynovel.devLibUpd')
                ? e => {
                    if (e.execution.task.definition.type != t.definition.type)
                        return;
                    if (e.execution.task.source != t.source)
                        return;
                    this.updLocalSNVer(dir);
                    this._onDidChangeTreeData.fire(undefined);
                }
                : () => { };
        vscode_1.tasks.executeTask(t)
            .then(undefined, rj => console.error(`fn:TreeDPDev onClickTreeItemBtn() rj:${rj.message}`));
    }
    getChildren(t) {
        return Promise.resolve(t ? this.oTiPrj[t.tooltip] : this.aTiRoot);
    }
    dispose() {
        for (const dir in this.oPfp)
            this.oPfp[dir].dispose();
        this.oPfp = {};
    }
}
exports.WorkSpaces = WorkSpaces;
WorkSpaces.REG_FN_OR_LABEL = /(?<=\s)(?:fn|label)\s*=\s*([^\]\s]+)/g;
//# sourceMappingURL=WorkSpaces.js.map