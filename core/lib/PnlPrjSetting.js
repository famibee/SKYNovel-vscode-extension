"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const vscode_1 = require("vscode");
const fs = require('fs-extra');
class PnlPrjSetting {
    constructor(ctx, dir, chgTitle, rp) {
        var _a;
        this.ctx = ctx;
        this.dir = dir;
        this.chgTitle = chgTitle;
        this.rp = rp;
        this.oCfg = {
            book: {
                title: '',
                creator: '',
                cre_url: '',
                publisher: '',
                pub_url: '',
                detail: '',
                version: '1.0',
            },
            save_ns: '',
            window: {
                width: 300,
                height: 300,
            },
            log: { max_len: 1024 },
            init: {
                bg_color: 0x000000,
                tagch_msecwait: 10,
                auto_msecpagewait: 3500,
                escape: '',
            },
            debug: {
                devtool: false,
                token: false,
                tag: false,
                putCh: false,
                debugLog: false,
                baseTx: false,
                masume: false,
                variable: false,
            },
            code: {},
        };
        this.pnlWV = null;
        this.hRep = {
            "save_ns": async (val) => {
                await CmnLib_1.replaceFile(this.fnPkgJs, /("name"\s*:\s*").*(")/, `$1${val}$2`);
                await CmnLib_1.replaceFile(this.fnPkgJs, /("(?:appBundleId|appId)"\s*:\s*").*(")/g, `$1com.fc2.blog.famibee.skynovel.${val}$2`);
            },
            'window.width': val => CmnLib_1.replaceFile(this.fnAppJs, /(width\s*: ).*(,)/, `$1${val}$2`),
            'window.height': val => CmnLib_1.replaceFile(this.fnAppJs, /(height\s*: ).*(,)/, `$1${val}$2`),
            'book.version': val => CmnLib_1.replaceFile(this.fnPkgJs, /("version"\s*:\s*").*(")/, `$1${val}$2`),
            'book.title': val => {
                this.chgTitle(val);
                CmnLib_1.replaceFile(this.fnPkgJs, /("productName"\s*:\s*").*(")/, `$1${val}$2`);
            },
            "book.creator": async (val) => {
                await CmnLib_1.replaceFile(this.fnPkgJs, /("author"\s*:\s*").*(")/, `$1${val}$2`);
                await CmnLib_1.replaceFile(this.fnPkgJs, /("appCopyright"\s*:\s*").*(")/, `$1(c)${val}$2`);
                await CmnLib_1.replaceFile(this.fnAppJs, /(companyName\s*:\s*)(['"]).*\2/, `$1"${val}"`);
            },
            'book.pub_url': async (val) => {
                await CmnLib_1.replaceFile(this.fnPkgJs, /("homepage"\s*:\s*").*(")/, `$1${val}$2`);
                await CmnLib_1.replaceFile(this.fnAppJs, /((?:submitURL|homepage)\s*:\s*)(['"]).*\2/g, `$1"${val}"`);
                await CmnLib_1.replaceFile(this.fnAppJs, /(npm_package_appCopyright \+' )\d+/, `$1${(new Date()).getFullYear()}`);
            },
            'book.detail': val => CmnLib_1.replaceFile(this.fnPkgJs, /("description"\s*:\s*").*(")/, `$1${val}$2`),
        };
        this.fnPrj = dir + '/prj/';
        this.fnPrjJs = dir + '/prj/prj.json';
        this.fnPkgJs = dir + '/package.json';
        this.fnAppJs = dir + '/app.js';
        if (PnlPrjSetting.htmSrc) {
            if (this.oCfg.save_ns == 'hatsune' ||
                this.oCfg.save_ns == 'uc')
                this.open();
            return;
        }
        this.oCfg = Object.assign(Object.assign({}, this.oCfg), fs.readJsonSync(this.fnPrjJs, { encoding: 'utf8' }));
        if ('slideBaseSpan' in this.oCfg.debug) {
            delete this.oCfg.debug['slideBaseSpan'];
            this.oCfg.debug['debugLog'] = false;
        }
        chgTitle(this.oCfg.book.title);
        this.rp.setEscape((_a = this.oCfg.init.escape) !== null && _a !== void 0 ? _a : '');
        const path_doc = ctx.extensionPath + `/res/setting/`;
        this.localResourceRoots = vscode_1.Uri.file(path_doc);
        fs.readFile(path_doc + `index.htm`, { encoding: 'utf8' }, (err, data) => {
            if (err)
                console.error(`PrjSetting constructor ${err}`);
            PnlPrjSetting.htmSrc = String(data);
            if (this.oCfg.save_ns == 'hatsune' ||
                this.oCfg.save_ns == 'uc')
                this.open();
        });
    }
    get cfg() { return this.oCfg; }
    open() {
        const column = vscode_1.window.activeTextEditor ? vscode_1.window.activeTextEditor.viewColumn : undefined;
        if (this.pnlWV) {
            this.pnlWV.reveal(column);
            this.openSub();
            return;
        }
        const wv = this.pnlWV = vscode_1.window.createWebviewPanel('SKYNovel-prj_setting', 'プロジェクト設定', column || vscode_1.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [this.localResourceRoots],
        });
        wv.onDidDispose(() => this.pnlWV = null);
        wv.webview.onDidReceiveMessage(m => {
            switch (m.cmd) {
                case 'get':
                    wv.webview.postMessage({ cmd: 'res', o: this.oCfg });
                    break;
                case 'info':
                    vscode_1.window.showInformationMessage(m.text);
                    break;
                case 'warn':
                    vscode_1.window.showWarningMessage(m.text);
                    break;
                case 'openURL':
                    vscode_1.env.openExternal(vscode_1.Uri.parse(m.url));
                    break;
                case 'input':
                    this.inputProc(m.id, m.val);
                    break;
            }
        }, false);
        this.openSub();
    }
    openSub() {
        const a = [];
        CmnLib_1.foldProc(this.fnPrj, () => { }, nm => { a.push(nm); this.oCfg.code[nm]; });
        this.pnlWV.webview.html = PnlPrjSetting.htmSrc
            .replace(/(href|src)="\.\//g, `$1="${this.pnlWV.webview.asWebviewUri(this.localResourceRoots)}/`)
            .replace(/(.+)"code.\w+"(.+)<span>\w+(.+)\n/, a.map(fld => `$1"code.${fld}"$2<span>${fld}$3\n`).join(''));
    }
    inputProc(id, val) {
        const v = /^[-]?([1-9]\d*|0)$/.test(val)
            ? Number(val)
            : /^(true|false)$/.test(val) ? val : String(val).replace(/"/g, '%22');
        const iP = id.indexOf('.');
        if (iP >= 0) {
            const nm = id.slice(iP + 1);
            const id2 = id.slice(0, iP);
            this.oCfg[id2][nm] = v;
            if (id2 == 'init' && nm == 'escape')
                this.rp.setEscape(v);
        }
        else {
            this.oCfg[id] = v;
        }
        fs.outputJson(this.fnPrjJs, this.oCfg);
        const r = this.hRep[id];
        if (r)
            r(v);
    }
}
exports.PnlPrjSetting = PnlPrjSetting;
PnlPrjSetting.htmSrc = '';
//# sourceMappingURL=PnlPrjSetting.js.map