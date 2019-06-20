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
        const isPS = String(vscode_1.workspace.getConfiguration('terminal.integrated.shell').get('windows')).slice(-14);
        return (isPS === 'powershell.exe') ? ';' : '&';
    }
        : () => ';';
const fs = require('fs-extra');
const path = require('path');
const regNoUseSysFile = /^(\..+|.+.db|.+.ini|_notes|Icon\r)$/;
function treeProc(wd, fnc) {
    for (const nm of fs.readdirSync(wd)) {
        if (regNoUseSysFile.test(nm))
            continue;
        const url = path.resolve(wd, nm.normalize('NFC'));
        if (fs.lstatSync(url).isDirectory()) {
            treeProc(url, fnc);
            continue;
        }
        fnc(url);
    }
}
exports.treeProc = treeProc;
function foldProc(wd, fnc, fncFld) {
    for (const nm of fs.readdirSync(wd)) {
        if (regNoUseSysFile.test(nm))
            continue;
        const url = path.resolve(wd, nm.normalize('NFC'));
        if (fs.lstatSync(url).isDirectory()) {
            fncFld(nm);
            continue;
        }
        fnc(url, nm);
    }
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