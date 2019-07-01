"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const vscode_1 = require("vscode");
const fs = require('fs-extra');
class PrjSetting {
    constructor(ctx, dir, chgTitle) {
        this.ctx = ctx;
        this.dir = dir;
        this.chgTitle = chgTitle;
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
            },
            debug: {
                devtool: false,
                token: false,
                tag: false,
                putCh: false,
                slideBaseSpan: false,
                baseTx: false,
                masume: false,
                variable: false,
            },
        };
        this.pnlWV = null;
        this.hRep = {
            "save_ns": async (val) => {
                await CmnLib_1.replaceFile(this.fnPkgJs, /("name"\s*:\s*").+(")/, `$1${val}$2`);
                await CmnLib_1.replaceFile(this.fnPkgJs, /("(?:appBundleId|appId)"\s*:\s*").+(")/g, `$1com.fc2.blog.famibee.skynovel.${val}$2`);
            },
            'window.width': val => CmnLib_1.replaceFile(this.fnAppJs, /(width\s*:\s*)\d+/, `$1${val}`),
            'window.height': val => CmnLib_1.replaceFile(this.fnAppJs, /(height\s*:\s*)\d+/, `$1${val}`),
            'book.version': val => CmnLib_1.replaceFile(this.fnPkgJs, /("version"\s*:\s*").+(")/, `$1${val}$2`),
            'book.title': val => {
                this.chgTitle(val);
                CmnLib_1.replaceFile(this.fnPkgJs, /("productName"\s*:\s*").+"/, `$1${val}"`);
            },
            "book.creator": async (val) => {
                await CmnLib_1.replaceFile(this.fnPkgJs, /("author"\s*:\s*").+"/, `$1${val}"`);
                await CmnLib_1.replaceFile(this.fnPkgJs, /("appCopyright"\s*:\s*").+"/, `$1(c)${val}"`);
                await CmnLib_1.replaceFile(this.fnAppJs, /(companyName\s*:\s*)(['"]).+\2/, `$1"${val}"`);
            },
            'book.pub_url': async (val) => {
                await CmnLib_1.replaceFile(this.fnPkgJs, /("homepage"\s*:\s*").+"/, `$1${val}"`);
                await CmnLib_1.replaceFile(this.fnAppJs, /((?:submitURL|homepage)\s*:\s*)(['"]).+\2/g, `$1"${val}"`);
                await CmnLib_1.replaceFile(this.fnAppJs, /(npm_package_appCopyright \+' )\d+/, `$1${(new Date()).getFullYear()}`);
            },
            'book.detail': val => CmnLib_1.replaceFile(this.fnPkgJs, /("description"\s*:\s*").+"/, `$1${val}"`),
        };
        const path_doc = ctx.extensionPath + `/res/setting/`;
        this.fnPrjJs = dir + '/prj/prj.json';
        this.fnPkgJs = dir + '/package.json';
        this.fnAppJs = dir + '/app.js';
        let doc;
        this.localResourceRoots = vscode_1.Uri.file(path_doc);
        fs.readFile(path_doc + `index.htm`, { encoding: 'utf8' }, (err, data) => {
            if (err)
                console.error(`PrjSetting constructor ${err}`);
            doc = data
                .replace(/(href|src)="\.\//g, `$1="vscode-resource:${path_doc}/`);
            this.oCfg = Object.assign(this.oCfg, fs.readJsonSync(this.fnPrjJs, { encoding: 'utf8' }));
            chgTitle(this.oCfg.book.title);
            if (this.oCfg.save_ns != 'hatsune' &&
                this.oCfg.save_ns != 'uc')
                return;
            this.open(doc);
        });
        vscode_1.commands.registerCommand('skynovel.edPrjJson', () => this.open(doc));
    }
    open(src) {
        const column = vscode_1.window.activeTextEditor ? vscode_1.window.activeTextEditor.viewColumn : undefined;
        if (this.pnlWV) {
            this.pnlWV.reveal(column);
            this.pnlWV.webview.html = src;
            return;
        }
        const wv = vscode_1.window.createWebviewPanel('SKYNovel-prj_setting', 'プロジェクト設定', column || vscode_1.ViewColumn.One, {
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
        wv.webview.html = src;
        this.pnlWV = wv;
    }
    inputProc(id, val) {
        const v2 = val.replace(/"/g, '%22');
        const v = (/^[-]?([1-9]\d*|0)$/).test(val) ? Number(val) : v2;
        const iP = id.indexOf('.');
        if (iP >= 0) {
            const nm = id.slice(iP + 1);
            this.oCfg[id.slice(0, iP)][nm] = v;
        }
        else {
            this.oCfg[id] = v;
        }
        fs.outputJson(this.fnPrjJs, this.oCfg);
        const r = this.hRep[id];
        if (r)
            r(v2);
    }
}
exports.PrjSetting = PrjSetting;
//# sourceMappingURL=PrjSetting.js.map