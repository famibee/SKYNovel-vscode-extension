"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const vscode_1 = require("vscode");
const fs = require('fs-extra');
class PrjSetting {
    constructor(context, dir, chgTitle) {
        this.context = context;
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
                await CmnLib_1.replaceFile(this.fnPkgJs, /("name"\s*:\s*")(.+)(")/, `$1${val}$3`);
                await CmnLib_1.replaceFile(this.fnPkgJs, /("(?:appBundleId|appId)"\s*:\s*")(.+)(")/g, `$1com.fc2.blog.famibee.skynovel.${val}$3`);
            },
            'book.version': val => CmnLib_1.replaceFile(this.fnPkgJs, /("version"\s*:\s*")(.+)(")/, `$1${val}$3`),
            'book.title': val => {
                this.chgTitle(val);
                CmnLib_1.replaceFile(this.fnPkgJs, /("productName"\s*:\s*")(.+)(")/, `$1${val}$3`);
            },
            "book.creator": async (val) => {
                await CmnLib_1.replaceFile(this.fnPkgJs, /("author"\s*:\s*")(.+)(")/, `$1${val}$3`);
                await CmnLib_1.replaceFile(this.fnPkgJs, /("appCopyright"\s*:\s*")(.+)(")/, `$1(c)${val}$3`);
            },
            'book.pub_url': val => CmnLib_1.replaceFile(this.fnPkgJs, /("homepage"\s*:\s*")(.+)(")/, `$1${val}$3`),
            'book.detail': val => CmnLib_1.replaceFile(this.fnPkgJs, /("description"\s*:\s*")(.+)(")/, `$1${val}$3`),
        };
        const path_doc = context.extensionPath + `/res/setting/`;
        this.fnPrjJs = dir + '/prj/prj.json';
        this.fnPkgJs = dir + '/package.json';
        this.localResourceRoots = vscode_1.Uri.file(path_doc);
        fs.readFile(path_doc + `index.htm`, { encoding: 'utf8' }, (err, data) => {
            if (err)
                console.error(`PrjSetting constructor ${err}`);
            this.buf_doc = data
                .replace(/(href|src)="\.\//g, `$1="vscode-resource:${path_doc}/`);
            this.oCfg = Object.assign(this.oCfg, fs.readJsonSync(this.fnPrjJs, { encoding: 'utf8' }));
            chgTitle(this.oCfg.book.title);
            if (this.oCfg.save_ns != 'hatsune' &&
                this.oCfg.save_ns != 'uc')
                return;
            this.open();
        });
        vscode_1.commands.registerCommand('skynovel.edPrjJson', () => this.open());
    }
    open() {
        let src = this.buf_doc
            .replace(`%save_ns%`, this.oCfg.save_ns);
        for (const k in this.oCfg.book) {
            src = src.replace(`%book.${k}%`, this.oCfg.book[k]);
        }
        for (const k in this.oCfg.window) {
            src = src.replace(`%window.${k}%`, this.oCfg.window[k]);
        }
        for (const k in this.oCfg.init) {
            src = src.replace(`%init.${k}%`, this.oCfg.init[k]);
        }
        for (const k in this.oCfg.debug)
            src = src.replace(`c="%debug.${k}%"`, Boolean(this.oCfg.debug[k]) ? 'checked' : '');
        const column = vscode_1.window.activeTextEditor ? vscode_1.window.activeTextEditor.viewColumn : undefined;
        if (this.pnlWV) {
            this.pnlWV.reveal(column);
            this.pnlWV.webview.html = src;
            return;
        }
        this.pnlWV = vscode_1.window.createWebviewPanel('SKYNovel-prj_setting', 'プロジェクト設定', column || vscode_1.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [this.localResourceRoots],
        });
        this.pnlWV.onDidDispose(() => this.pnlWV = null);
        this.pnlWV.webview.onDidReceiveMessage(m => {
            switch (m.cmd) {
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
        this.pnlWV.webview.html = src;
    }
    inputProc(id, val) {
        const v = (/^[-]?([1-9]\d*|0)$/).test(val) ? Number(val) : val;
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
            r(val);
    }
}
exports.PrjSetting = PrjSetting;
//# sourceMappingURL=PrjSetting.js.map