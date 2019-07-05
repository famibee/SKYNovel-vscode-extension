"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const ReferenceProvider_1 = require("./ReferenceProvider");
const PrjSetting_1 = require("./PrjSetting");
const vscode_1 = require("vscode");
const fs = require('fs-extra');
const path = require('path');
const img_size = require('image-size');
const crypt = require('crypto-js');
const uuidv4 = require('uuid/v4');
;
;
class PrjFileProc {
    constructor(ctx, dir, chgTitle) {
        this.ctx = ctx;
        this.dir = dir;
        this.chgTitle = chgTitle;
        this.fld_crypt_prj = 'crypt_prj';
        this.$isCryptMode = true;
        this.regNeedCrypt = /\.(sn|json)$/;
        this.regRepJson = /(\.|")(sn|json)"/g;
        this.aRepl = [
            'core/app4webpack.js',
            'core/mob4webpack.js',
            'core/web4webpack.js',
        ];
        this.regSprSheetImg = /^(.+)\.(\d+)x(\d+)\.(png|jpg|jpeg)$/;
        this.curPlg = dir + '/core/plugin';
        fs.ensureDirSync(this.curPlg);
        this.updPlugin();
        this.curPrj = dir + '/prj/';
        this.lenCurPrj = this.curPrj.length;
        this.updPathJson();
        this.rp = new ReferenceProvider_1.ReferenceProvider(ctx, this.curPrj);
        const fwPlg = vscode_1.workspace.createFileSystemWatcher(this.curPlg + '/?*/');
        const fwPrj = vscode_1.workspace.createFileSystemWatcher(this.curPrj + '*/*');
        const fwPrjJs = vscode_1.workspace.createFileSystemWatcher(this.curPrj + 'prj.json');
        this.aFSW = [
            fwPlg.onDidCreate(() => this.updPlugin()),
            fwPlg.onDidDelete(() => this.updPlugin()),
            fwPrj.onDidCreate(e => {
                CmnLib_1.regNoUseSysPath.lastIndex = 0;
                if (CmnLib_1.regNoUseSysPath.test(e.path))
                    return;
                this.crePrj(e);
                this.rp.crePrj(e);
            }),
            fwPrj.onDidChange(e => {
                CmnLib_1.regNoUseSysPath.lastIndex = 0;
                if (CmnLib_1.regNoUseSysPath.test(e.path))
                    return;
                this.chgPrj(e);
                this.rp.chgPrj(e);
            }),
            fwPrj.onDidDelete(e => {
                CmnLib_1.regNoUseSysPath.lastIndex = 0;
                if (CmnLib_1.regNoUseSysPath.test(e.path))
                    return;
                this.delPrj(e);
                this.rp.delPrj(e);
            }),
            fwPrjJs.onDidChange(e => this.encrypter(e.path)),
        ];
        this.curCrypt = dir + `/${this.fld_crypt_prj}/`;
        this.$isCryptMode = fs.existsSync(this.curCrypt);
        const fnPass = this.curPlg + '/pass.json';
        const exists_pass = fs.existsSync(fnPass);
        this.hPass = exists_pass
            ? fs.readJsonSync(fnPass, { throws: false })
            : {
                pass: uuidv4(),
                salt: String(crypt.enc.Hex.parse(crypt.lib.WordArray.random(128 / 8))),
                iv: String(crypt.lib.WordArray.random(128 / 8)),
                ite: 500 + Math.floor(new Date().getTime() % 300),
            };
        if (!exists_pass)
            fs.outputJsonSync(fnPass, this.hPass);
        this.iv = crypt.enc.Hex.parse(this.hPass.iv);
        this.pbkdf2 = crypt.PBKDF2(crypt.enc.Utf8.parse(this.hPass.pass), crypt.enc.Hex.parse(this.hPass.salt), { keySize: this.hPass.keySize, iterations: this.hPass.ite });
        if (this.$isCryptMode)
            this.initCrypt();
        new PrjSetting_1.PrjSetting(ctx, dir, chgTitle);
    }
    get isCryptMode() { return this.$isCryptMode; }
    dispose() { this.aFSW.forEach(f => f.dispose()); }
    crePrj(e) { this.encrypter(e.path); this.updPathJson(); }
    chgPrj(e) { this.encrypter(e.path); }
    delPrj(e) { this.delPrj_sub(e); this.updPathJson(); }
    delPrj_sub(e) {
        const short_path = e.path.slice(this.lenCurPrj);
        this.regNeedCrypt.lastIndex = 0;
        const fn = this.curCrypt + short_path
            + (this.regNeedCrypt.test(short_path) ? '_' : '');
        fs.removeSync(fn);
    }
    tglCryptMode() {
        const pathPre = this.curPlg + '/snsys_pre';
        if (this.$isCryptMode) {
            fs.removeSync(this.curCrypt);
            this.$isCryptMode = false;
            fs.removeSync(pathPre);
            this.aRepl.forEach(url => CmnLib_1.replaceFile(this.dir + '/' + url, new RegExp(`\\(hPlg, {.+?}\\);`), `(hPlg);`));
            CmnLib_1.replaceFile(this.dir + '/package.json', new RegExp(`"${this.fld_crypt_prj}\\/",`), `"prj/",`);
            return;
        }
        fs.ensureDir(this.curCrypt);
        this.$isCryptMode = true;
        this.aRepl.forEach(url => CmnLib_1.replaceFile(this.dir + '/' + url, /\(hPlg\);/, `(hPlg, {cur: '${this.fld_crypt_prj}/', crypt: true});`));
        CmnLib_1.replaceFile(this.dir + '/package.json', /"prj\/",/, `"${this.fld_crypt_prj}/",`);
        CmnLib_1.replaceFile(this.ctx.extensionPath + `/res/snsys_pre/index.js`, /{p:0}/, JSON.stringify(this.hPass), pathPre + '/index.js');
        this.initCrypt();
    }
    initCrypt() { CmnLib_1.treeProc(this.curPrj, url => this.encrypter(url)); }
    async encrypter(url) {
        const short_path = url.slice(this.lenCurPrj);
        this.regNeedCrypt.lastIndex = 0;
        if (!this.regNeedCrypt.test(url)) {
            fs.ensureLink(url, this.curCrypt + short_path)
                .catch((err) => console.error(`PrjFileProc Symlink ${err}`));
            return;
        }
        try {
            let src = await fs.readFile(url, { encoding: 'utf8' });
            if (short_path == 'path.json') {
                this.regRepJson.lastIndex = 0;
                src = src.replace(this.regRepJson, `$1$2_"`);
            }
            const encrypted = crypt.AES.encrypt(src, this.pbkdf2, { iv: this.iv });
            const fn = this.curCrypt + short_path + '_';
            await fs.outputFile(fn, String(encrypted));
        }
        catch (err) {
            console.error(`PrjFileProc encrypter ${err}`);
        }
    }
    updPlugin() {
        if (!fs.existsSync(this.curPlg))
            return;
        const h = {};
        CmnLib_1.foldProc(this.curPlg, () => { }, nm => h[nm] = 0);
        fs.outputFile(this.curPlg + '.js', `export default ${JSON.stringify(h)};`)
            .then(() => this.rebuildTask())
            .catch((err) => console.error(`PrjFileProc updPlugin ${err}`));
    }
    rebuildTask() {
        let cmd = `cd "${this.dir}" ${CmnLib_1.statBreak()} `;
        if (!fs.existsSync(this.dir + '/node_modules'))
            cmd += `npm i ${CmnLib_1.statBreak()} `;
        cmd += 'npm run webpack:dev';
        const t = new vscode_1.Task({ type: 'SKYNovel auto' }, 'webpack:dev', 'SKYNovel', new vscode_1.ShellExecution(cmd));
        vscode_1.tasks.executeTask(t);
    }
    async updPathJson() {
        try {
            const hPath = this.get_hPathFn2Exts(this.curPrj);
            await fs.outputJson(this.curPrj + 'path.json', hPath);
            if (this.$isCryptMode)
                this.encrypter(this.curPrj + 'path.json');
        }
        catch (err) {
            console.error(`PrjFileProc updPathJson ${err}`);
        }
    }
    get_hPathFn2Exts($cur) {
        const hFn2Path = {};
        CmnLib_1.foldProc($cur, () => { }, (dir) => {
            const wd = path.resolve($cur, dir);
            CmnLib_1.foldProc(wd, (url, nm) => {
                const m = nm.match(this.regSprSheetImg);
                if (!m) {
                    this.addPath(hFn2Path, dir, nm);
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
                this.addPath(hFn2Path, dir, `${m[1]}.json`);
            }, () => { });
        });
        return hFn2Path;
    }
    addPath(hFn2Path, dir, nm) {
        const p = path.parse(nm);
        const ext = p.ext.slice(1);
        const fn = p.name;
        let hExts = hFn2Path[fn];
        if (!hExts) {
            hExts = hFn2Path[fn] = { ':cnt': 1 };
        }
        else if (ext in hExts) {
            vscode_1.window.showErrorMessage(`[SKYNovel] プロジェクト内でファイル【${p.base}】が重複しています。フォルダを縦断検索するため許されません`, { modal: true })
                .then(() => vscode_1.window.showQuickPick([
                { label: `1) ${hExts[ext]}`, description: `クリックで削除対象` },
                { label: `2) ${dir + '/' + nm}`, description: `クリックで削除対象` },
            ]))
                .then(selected => {
                if (!selected)
                    return;
                const id = Number(selected.label.slice(0, 1));
                const fn = this.curPrj + (id == 1 ? hExts[ext] : dir + '/' + nm);
                vscode_1.window.showInformationMessage(`${fn} を削除しますか？`, { modal: true }, 'はい')
                    .then(a => { if (a == 'はい')
                    fs.removeSync(fn); });
            });
            return;
        }
        else {
            hExts[':cnt'] = CmnLib_1.uint(hExts[':cnt']) + 1;
        }
        hExts[ext] = dir + '/' + nm;
    }
}
exports.PrjFileProc = PrjFileProc;
//# sourceMappingURL=PrjFileProc.js.map