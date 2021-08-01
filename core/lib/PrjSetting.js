"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrjSetting = void 0;
const CmnLib_1 = require("./CmnLib");
const vscode_1 = require("vscode");
const fs_extra_1 = require("fs-extra");
const m_path = require("path");
const uuid_1 = require("uuid");
class PrjSetting {
    constructor(ctx, wsFld, chgTitle, codSpt, searchPath) {
        this.ctx = ctx;
        this.wsFld = wsFld;
        this.chgTitle = chgTitle;
        this.codSpt = codSpt;
        this.searchPath = searchPath;
        this.htmSrc = '';
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
            debuger_token: '',
        };
        this.pnlWV = null;
        this.REG_SETTING = /;[^\n]*|(?:&(\S+)|\[let\s+name\s*=\s*(\S+)\s+text)\s*=\s*((["'#]).+?\4|[^;\s]+)(?:[^;]*;(.*))?/gm;
        this.hRep = {
            "save_ns": val => {
                CmnLib_1.replaceFile(this.fnPkgJs, /("name"\s*:\s*").*(")/, `$1${val}$2`);
                CmnLib_1.replaceFile(this.fnPkgJs, /("(?:appBundleId|appId)"\s*:\s*").*(")/g, `$1com.fc2.blog.famibee.skynovel.${val}$2`);
                if (!this.oCfg.debuger_token) {
                    this.oCfg.debuger_token = uuid_1.v4();
                    fs_extra_1.outputJson(this.fnPrjJs, this.oCfg);
                }
            },
            'window.width': val => CmnLib_1.replaceFile(this.fnAppJs, /(width\s*: ).*(,)/, `$1${val}$2`),
            'window.height': val => CmnLib_1.replaceFile(this.fnAppJs, /(height\s*: ).*(,)/, `$1${val}$2`),
            'book.version': val => {
                CmnLib_1.replaceFile(this.fnPkgJs, /("version"\s*:\s*").*(")/, `$1${val}$2`);
                CmnLib_1.replaceFile(this.fnReadme4Freem, /(【Version】)\S+/g, `$1${val}`);
            },
            'book.title': val => {
                this.chgTitle(val);
                CmnLib_1.replaceFile(this.fnPkgJs, /("productName"\s*:\s*").*(")/, `$1${val}$2`);
                CmnLib_1.replaceFile(this.fnReadme4Freem, /(【タイトル】)\S+/g, `$1${val}`);
            },
            "book.creator": val => {
                CmnLib_1.replaceFile(this.fnPkgJs, /("author"\s*:\s*").*(")/, `$1${val}$2`);
                CmnLib_1.replaceFile(this.fnPkgJs, /("appCopyright"\s*:\s*").*(")/, `$1(c)${val}$2`);
                CmnLib_1.replaceFile(this.fnReadme4Freem, /(【著 作 者】)\S+/g, `$1${val}`);
            },
            'book.cre_url': val => {
                CmnLib_1.replaceFile(this.fnReadme4Freem, /(【連 絡 先】メール： )\S+/, `$1${val}`);
            },
            'book.publisher': val => {
                CmnLib_1.replaceFile(this.fnAppJs, /(companyName\s*:\s*)(['"]).*\2/, `$1"${val}"`);
                CmnLib_1.replaceFile(this.fnInsNsh, /(!define PUBLISHER ").+"/, `$1${val}"`);
                CmnLib_1.replaceFile(this.fnReadme4Freem, /(Copyright \(C\) )\d+ "([^"]+)"/g, `$1${(new Date()).getFullYear()} "${val}"`);
            },
            'book.pub_url': val => {
                CmnLib_1.replaceFile(this.fnPkgJs, /("homepage"\s*:\s*").*(")/, `$1${val}$2`);
                CmnLib_1.replaceFile(this.fnReadme4Freem, /(　　　　　　ＷＥＢ： )\S+/g, `$1${val}`);
                CmnLib_1.replaceFile(this.fnAppJs, /(npm_package_appCopyright \+' )\d+/, `$1${(new Date()).getFullYear()}`);
            },
            'book.detail': val => CmnLib_1.replaceFile(this.fnPkgJs, /("description"\s*:\s*").*(")/, `$1${val}$2`),
        };
        const pathWs = wsFld.uri.fsPath;
        this.fnPrj = pathWs + '/doc/prj/';
        this.fnPrjJs = this.fnPrj + 'prj.json';
        this.fnAppJs = pathWs + '/doc/app.js';
        this.fnPkgJs = pathWs + '/package.json';
        this.fnReadme4Freem = pathWs + '/build/include/readme.txt';
        let init_freem = false;
        const path_ext = ctx.extensionPath;
        if (!fs_extra_1.existsSync(this.fnReadme4Freem)) {
            init_freem = true;
            fs_extra_1.ensureFileSync(this.fnReadme4Freem);
            fs_extra_1.copyFileSync(path_ext + '/res/readme.txt', this.fnReadme4Freem);
            vscode_1.workspace.openTextDocument(this.fnReadme4Freem)
                .then(doc => vscode_1.window.showTextDocument(doc));
        }
        this.fnInsNsh = pathWs + '/build/installer.nsh';
        if (!fs_extra_1.existsSync(this.fnInsNsh))
            fs_extra_1.copyFile(path_ext + '/res/installer.nsh', this.fnInsNsh);
        this.fnIcon = pathWs + '/build/icon.png';
        if (!fs_extra_1.existsSync(this.fnIcon))
            fs_extra_1.copyFile(path_ext + '/res/icon.png', this.fnIcon);
        const fnLaunchJs = pathWs + '/.vscode/launch.json';
        if (!fs_extra_1.existsSync(fnLaunchJs))
            fs_extra_1.copyFile(path_ext + '/res/launch.json', fnLaunchJs);
        this.oCfg = { ...this.oCfg, ...fs_extra_1.readJsonSync(this.fnPrjJs, { encoding: 'utf8' }) };
        chgTitle(this.oCfg.book.title);
        codSpt.setEscape(this.oCfg?.init?.escape ?? '');
        if (init_freem) {
            ['title', 'version', 'creator', 'cre_url', 'publisher', 'pub_url',]
                .forEach(nm => this.hRep['book.' + nm](this.oCfg.book[nm]));
        }
        const a = [];
        CmnLib_1.foldProc(this.fnPrj, () => { }, nm => a.push(nm));
        const oCode = {};
        for (const nm in this.oCfg.code)
            if (a.includes(nm))
                oCode[nm] = this.oCfg[nm];
        this.oCfg.code = oCode;
        fs_extra_1.outputJson(this.fnPrjJs, this.oCfg);
        const path_ext_htm = path_ext + `/res/webview/`;
        this.localExtensionResRoots = vscode_1.Uri.file(path_ext_htm);
        fs_extra_1.readFile(path_ext_htm + `setting.htm`, { encoding: 'utf8' })
            .then(htm => {
            this.htmSrc = htm
                .replace('<meta_autooff ', '<meta ')
                .replace(/\$\{nonce}/g, CmnLib_1.getNonce());
            if (this.oCfg.save_ns === 'hatsune'
                || this.oCfg.save_ns === 'uc')
                this.open();
        });
        PrjSetting.hWsFld2token[wsFld.uri.path] = () => this.oCfg.debuger_token;
    }
    static getDebugertoken(wsFld) {
        if (!wsFld)
            return '';
        return PrjSetting.hWsFld2token[wsFld.uri.path]() ?? '';
    }
    noticeCreDir(path) {
        if (!fs_extra_1.statSync(path).isDirectory())
            return;
        this.oCfg.code[m_path.basename(path)] = false;
        this.openSub();
    }
    noticeDelDir(path) {
        delete this.oCfg.code[m_path.basename(path)];
        fs_extra_1.outputJson(this.fnPrjJs, this.oCfg);
        this.openSub();
    }
    get cfg() { return this.oCfg; }
    open() {
        const column = vscode_1.window.activeTextEditor?.viewColumn;
        if (this.pnlWV) {
            this.pnlWV.reveal(column);
            this.openSub();
            return;
        }
        const wv = this.pnlWV = vscode_1.window.createWebviewPanel('SKYNovel-prj_setting', '設定・基本情報', column || vscode_1.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [this.localExtensionResRoots],
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
        CmnLib_1.foldProc(this.fnPrj, () => { }, nm => a.push(nm));
        const wv = this.pnlWV.webview;
        let h = this.htmSrc
            .replace(/\$\{webview.cspSource}/g, wv.cspSource)
            .replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(this.localExtensionResRoots)}/`)
            .replace(/(.+"code\.)\w+(.+span>)\w+(<.+\n)/, a.map(fld => `$1${fld}$2${fld}$3`).join(''));
        try {
            this.fnSetting = this.fnPrj + this.searchPath('setting', 'sn');
            if (!fs_extra_1.existsSync(this.fnSetting))
                throw '';
            let hs = '';
            const src = fs_extra_1.readFileSync(this.fnSetting, { encoding: 'utf8' });
            for (const m of src.matchAll(this.REG_SETTING)) {
                if (m[0].charAt(0) === ';')
                    continue;
                const nm = m[1] ?? m[2];
                const v = m[4] ? m[3].slice(1, -1) : m[3];
                const lbl = m[5].trim();
                if (v === 'true' || v === 'false')
                    hs += `
	<div class="col-auto pe-1 mt-2 form-outline"><div class="form-check">
		<input id="/setting.sn:${nm}" type="checkbox" class="form-check-input sn-chk" checked="${v}"/>
		<label class="form-label" for="/setting.sn:${nm}">${lbl}</label>
	</div></div>`;
                else
                    hs += `
	<div class="col-auto px-1 mt-2"><div class="form-outline">
		<input type="text" id="/setting.sn:${nm}" value="${v}" class="form-control sn-gray" placeholder="${lbl}"/>
		<label class="form-label" for="/setting.sn:${nm}">${lbl}</label>
	</div></div>`;
            }
            h = h.replace('<!-- 4replace_by_setting.sn -->', hs);
        }
        catch {
            h = h.replace('<!-- 4replace_by_setting.sn -->', '<div class="col-12 px-1 pt-3"><h5>setting.sn が見つかりません</h5></div>');
        }
        wv.html = h;
    }
    inputProc(id, val) {
        const v = /^[-]?([1-9]\d*|0)$/.test(val)
            ? val
            : /^(true|false)$/.test(val)
                ? val
                : String(val).replace(/"/g, '%22');
        if (id.charAt(0) === '/') {
            const nm = id.split(':')[1];
            CmnLib_1.replaceFile(this.fnSetting, new RegExp(`^(&${nm}\\s*=\\s*)((["'#]).+?\\3|[^;\\s]+)`, 'm'), `$1${(v === 'true' || v === 'false') ? v : `#${v}#`}`);
            return;
        }
        const iP = id.indexOf('.');
        if (iP >= 0) {
            const nm = id.slice(iP + 1);
            const id2 = id.slice(0, iP);
            this.oCfg[id2][nm] = v;
            if (id2 === 'init' && nm === 'escape')
                this.codSpt.setEscape(v);
        }
        else
            this.oCfg[id] = v;
        fs_extra_1.outputJson(this.fnPrjJs, this.oCfg);
        this.hRep[id]?.(v);
    }
}
exports.PrjSetting = PrjSetting;
PrjSetting.hWsFld2token = {};
//# sourceMappingURL=PrjSetting.js.map