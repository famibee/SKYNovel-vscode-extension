"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const vscode_1 = require("vscode");
const fs = require('fs');
const path = require('path');
const img_size = require('image-size');
;
;
const regSprSheetImg = /^(.+)\.(\d+)x(\d+)\.(png|jpg|jpeg)$/;
function updPathJson(cur) {
    if (!fs.existsSync(cur + 'prj.json'))
        return;
    const jsonPrj = fs.readFileSync(cur + 'prj.json');
    const hPath = get_hPathFn2Exts(cur, JSON.parse(jsonPrj));
    fs.writeFileSync(cur + 'path.json', JSON.stringify(hPath));
}
exports.updPathJson = updPathJson;
;
function updPlugin(curPlg) {
    if (!fs.existsSync(curPlg))
        return;
    const h = {};
    CmnLib_1.foldProc(curPlg, () => { }, nm => h[nm] = 0);
    fs.writeFileSync(curPlg + '.js', `export default ${JSON.stringify(h)};`);
}
exports.updPlugin = updPlugin;
;
function get_hPathFn2Exts($cur, oCfg) {
    const hFn2Path = {};
    if (!oCfg.search)
        return hFn2Path;
    for (const dir of oCfg.search) {
        const wd = path.resolve($cur, dir);
        CmnLib_1.foldProc(wd, (url, nm) => {
            const m = nm.match(regSprSheetImg);
            if (!m) {
                addPath(hFn2Path, dir, nm);
                return;
            }
            const fnJs = path.resolve(wd, m[1] + '.json');
            if (fs.existsSync(fnJs))
                return;
            const size = img_size(url);
            const xLen = CmnLib_1.uint(m[2]);
            const yLen = CmnLib_1.uint(m[3]);
            const w = size.width / xLen;
            const h = size.height / yLen;
            const basename = m[1];
            const ext = m[4];
            const oJs = {
                frames: {},
                meta: {
                    app: 'skynovel',
                    version: '1.0',
                    image: m[0],
                    format: 'RGBA8888',
                    size: { w: size.width, h: size.height },
                    scale: 1,
                    animationSpeed: 1,
                },
            };
            let cnt = 0;
            for (let ix = 0; ix < xLen; ++ix) {
                for (let iy = 0; iy < yLen; ++iy) {
                    oJs.frames[basename + String(++cnt).padStart(4, '0') + '.' + ext] = {
                        frame: { x: ix * w, y: iy * h, w: w, h: h },
                        rotated: false,
                        trimmed: false,
                        spriteSourceSize: { x: 0, y: 0, w: size.width, h: size.height },
                        sourceSize: { w: w, h: h },
                        pivot: { x: 0.5, y: 0.5 },
                    };
                }
            }
            fs.writeFileSync(fnJs, JSON.stringify(oJs));
            vscode_1.window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${m[1]}.json を自動生成しました`);
            addPath(hFn2Path, dir, `${m[1]}.json`);
        }, () => { });
    }
    return hFn2Path;
}
function addPath(hFn2Path, dir, nm) {
    const p = path.parse(nm);
    const ext = p.ext.slice(1);
    const fn = p.name;
    let hExts = hFn2Path[fn];
    if (!hExts) {
        hExts = hFn2Path[fn] = { ':cnt': '1' };
    }
    else if (ext in hExts) {
        vscode_1.window.showErrorMessage(`[SKYNovel] サーチパスにおいてファイル名＋拡張子【${fn}】が重複しています。フォルダを縦断検索するため許されません`);
    }
    else {
        hExts[':cnt'] = String(CmnLib_1.uint(hExts[':cnt']) + 1);
    }
    hExts[ext] = dir + '/' + nm;
}
//# sourceMappingURL=UpdFileWork.js.map