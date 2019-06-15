"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const fs = require('fs');
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
//# sourceMappingURL=CmnLib.js.map