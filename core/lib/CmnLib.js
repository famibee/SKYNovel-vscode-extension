"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmnLib = exports.replaceFile = exports.foldProc = exports.treeProc = exports.regNoUseSysPath = exports.statBreak = exports.is_mac = exports.is_win = exports.oIcon = exports.uint = void 0;
const vscode_1 = require("vscode");
function uint(o) {
    const v = parseInt(String(o), 10);
    return v < 0 ? -v : v;
}
exports.uint = uint;
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
const m_fs = require('fs-extra');
const m_path = require('path');
const regNoUseSysFile = /^(\..+|.+.db|.+.ini|_notes|Icon\r)$/;
exports.regNoUseSysPath = /\/(\..+|.+.db|.+.ini|_notes|Icon\r)$/;
function treeProc(wd, fnc) {
    m_fs.readdirSync(wd, { withFileTypes: true }).forEach((d) => {
        regNoUseSysFile.lastIndex = 0;
        const nm = String(d.name).normalize('NFC');
        if (regNoUseSysFile.test(nm))
            return;
        const url = m_path.resolve(wd, nm);
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
        const url = m_path.resolve(wd, nm);
        fnc(url, nm);
    });
}
exports.foldProc = foldProc;
async function replaceFile(src, r, rep, dest = src) {
    try {
        if (!m_fs.existsSync(src))
            return;
        const txt = await m_fs.readFile(src, { encoding: 'utf8' });
        const ret = String(txt.replace(r, rep));
        if (txt != ret)
            await m_fs.outputFile(dest, ret);
    }
    catch (err) {
        console.error(`replaceFile src:${src} ${err}`);
    }
}
exports.replaceFile = replaceFile;
let CmnLib = (() => {
    class CmnLib {
    }
    CmnLib.getFn = (path) => m_path.basename(path, m_path.extname(path));
    return CmnLib;
})();
exports.CmnLib = CmnLib;
//# sourceMappingURL=CmnLib.js.map