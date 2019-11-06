"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
function int(o) { return parseInt(String(o), 10); }
exports.int = int;
function uint(o) {
    const v = parseInt(String(o), 10);
    return v < 0 ? -v : v;
}
exports.uint = uint;
function trim(s) { return s.replace(/^\s+|\s+$/g, ''); }
exports.trim = trim;
if (!('toInt' in String.prototype)) {
    String.prototype['toInt'] = function () { return int(this); };
}
if (!('toUint' in String.prototype)) {
    String.prototype['toUint'] = function () {
        const v = int(this);
        return v < 0 ? -v : v;
    };
}
if (!String.prototype.trim) {
    String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g, ''); };
}
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
exports.statBreak = exports.is_mac ? () => '&&'
    : exports.is_win ? () => {
        const isPS = String(vscode_1.workspace.getConfiguration('terminal.integrated.shell').get('windows')).slice(7);
        return (isPS === 'cmd.exe') ? '&' : ';';
    }
        : () => ';';
const fs = require('fs-extra');
const path = require('path');
const regNoUseSysFile = /^(\..+|.+.db|.+.ini|_notes|Icon\r)$/;
exports.regNoUseSysPath = /\/(\..+|.+.db|.+.ini|_notes|Icon\r)$/;
function treeProc(wd, fnc) {
    fs.readdirSync(wd, { withFileTypes: true }).forEach((d) => {
        regNoUseSysFile.lastIndex = 0;
        const nm = String(d.name).normalize('NFC');
        if (regNoUseSysFile.test(nm))
            return;
        const url = path.resolve(wd, nm);
        if (d.isDirectory()) {
            treeProc(url, fnc);
            return;
        }
        fnc(url);
    });
}
exports.treeProc = treeProc;
function foldProc(wd, fnc, fncFld) {
    fs.readdirSync(wd, { withFileTypes: true }).forEach((d) => {
        regNoUseSysFile.lastIndex = 0;
        const nm = String(d.name).normalize('NFC');
        if (regNoUseSysFile.test(nm))
            return;
        if (d.isDirectory()) {
            fncFld(nm);
            return;
        }
        const url = path.resolve(wd, nm);
        fnc(url, nm);
    });
}
exports.foldProc = foldProc;
async function replaceFile(src, r, rep, dest = src) {
    try {
        if (!fs.existsSync(src))
            return;
        const txt = await fs.readFile(src, { encoding: 'utf8' });
        const ret = String(txt.replace(r, rep));
        if (txt != ret)
            await fs.outputFile(dest, ret);
    }
    catch (err) {
        console.error(`replaceFile src:${src} ${err}`);
    }
}
exports.replaceFile = replaceFile;
//# sourceMappingURL=CmnLib.js.map