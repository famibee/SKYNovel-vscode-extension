"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFn = exports.chkBoolean = exports.replaceFile = exports.foldProc = exports.treeProc = exports.regNoUseSysPath = exports.statBreak = exports.is_mac = exports.is_win = exports.oIcon = exports.setCtx4 = exports.getNonce = exports.docsel = exports.REG_SCRIPT = exports.uint = exports.int = void 0;
const vscode_1 = require("vscode");
function int(o) { return parseInt(String(o), 10); }
exports.int = int;
function uint(o) {
    const v = parseInt(String(o), 10);
    return v < 0 ? -v : v;
}
exports.uint = uint;
exports.REG_SCRIPT = /\.(sn|ssn)$/;
exports.docsel = { scheme: 'file', language: 'skynovel' };
;
;
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
exports.getNonce = getNonce;
function setCtx4(ctx0) { extPath = ctx0.extensionPath; }
exports.setCtx4 = setCtx4;
let extPath = '';
function oIcon(name) {
    return {
        light: `${extPath}/res/light/${name}.svg`,
        dark: `${extPath}/res/dark/${name}.svg`,
    };
}
exports.oIcon = oIcon;
;
exports.is_win = process.platform === 'win32';
exports.is_mac = process.platform === 'darwin';
exports.statBreak = exports.is_mac ? () => '&&'
    : exports.is_win ? () => {
        const chkShell = String(vscode_1.workspace.getConfiguration('terminal.integrated.shell').get('windows')).slice(-7);
        return (chkShell === 'cmd.exe') ? '&' : ';';
    }
        : () => ';';
const m_fs = require("fs-extra");
const path_1 = require("path");
const regNoUseSysFile = /^(\..+|.+\.(db|ini|git)|_notes|Icon\r)$/;
exports.regNoUseSysPath = /\/(\..+|.+\.(db|ini|git)|_notes|Icon\r)$/;
function treeProc(wd, fnc) {
    m_fs.readdirSync(wd, { withFileTypes: true }).forEach((d) => {
        regNoUseSysFile.lastIndex = 0;
        const nm = String(d.name).normalize('NFC');
        if (regNoUseSysFile.test(nm))
            return;
        const url = path_1.resolve(wd, nm);
        if (d.isDirectory()) {
            treeProc(url, fnc);
            return;
        }
        fnc(url);
    });
}
exports.treeProc = treeProc;
function foldProc(wd, fnc, fncFld) {
    m_fs.readdirSync(wd, { withFileTypes: true }).forEach((d) => {
        regNoUseSysFile.lastIndex = 0;
        const nm = String(d.name).normalize('NFC');
        if (regNoUseSysFile.test(nm))
            return;
        if (d.isDirectory()) {
            fncFld(nm);
            return;
        }
        const url = path_1.resolve(wd, nm);
        fnc(url, nm);
    });
}
exports.foldProc = foldProc;
function replaceFile(src, r, rep, dest = src) {
    try {
        if (!m_fs.existsSync(src))
            return;
        const txt = m_fs.readFileSync(src, { encoding: 'utf8' });
        const ret = String(txt.replace(r, rep));
        m_fs.ensureFileSync(dest);
        if (txt !== ret)
            m_fs.writeFileSync(dest, ret);
    }
    catch (err) {
        console.error(`replaceFile src:${src} ${err}`);
    }
}
exports.replaceFile = replaceFile;
function chkBoolean(v) {
    if (v === null)
        return false;
    const v2 = String(v);
    return (v2 === 'false') ? false : Boolean(v2);
}
exports.chkBoolean = chkBoolean;
function getFn(path) { return path_1.basename(path, path_1.extname(path)); }
exports.getFn = getFn;
;
//# sourceMappingURL=CmnLib.js.map