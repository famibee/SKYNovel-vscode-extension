"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const ReferenceProvider_1 = require("./ReferenceProvider");
const PnlPrjSetting_1 = require("./PnlPrjSetting");
const vscode_1 = require("vscode");
const fs = require('fs-extra');
const path = require('path');
const img_size = require('image-size');
const crypt = require('crypto-js');
const uuidv4 = require('uuid/v4');
const crc32 = require('crc-32');
const stream_1 = require("stream");
;
;
class PrjFileProc {
    constructor(ctx, dir, chgTitle) {
        this.ctx = ctx;
        this.dir = dir;
        this.chgTitle = chgTitle;
        this.fld_crypt_prj = 'crypt_prj';
        this.$isCryptMode = true;
        this.regNeedCrypt = /\.(sn|json|jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)$/;
        this.regFullCrypt = /\.(sn|json)$/;
        this.regRepJson = /\.(jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)"/g;
        this.regForceCrypt = /\.(sn)$/;
        this.hExt2N = {
            'jpg': 1,
            'jpeg': 1,
            'png': 2,
            'svg': 3,
            'webp': 4,
            'mp3': 10,
            'm4a': 11,
            'ogg': 12,
            'aac': 13,
            'flac': 14,
            'wav': 15,
            'mp4': 20,
            'ogv': 21,
            'webm': 22,
        };
        this.hDiff = Object.create(null);
        this.LEN_CHKDIFF = 1024;
        this.aRepl = [
            'core/app4webpack.js',
            'core/mob4webpack.js',
            'core/web4webpack.js',
        ];
        this.LEN_ENC = 1024 * 10;
        this.regDir = /(^.+)\//;
        this.regSprSheetImg = /^(.+)\.(\d+)x(\d+)\.(png|jpe?g)$/;
        this.curPlg = dir + '/core/plugin';
        fs.ensureDirSync(this.curPlg);
        if (fs.existsSync(this.dir + '/node_modules'))
            this.updPlugin();
        else {
            this.rebuildTask();
            vscode_1.window.showInformationMessage('初期化中です。ターミナルの処理が終わって止まるまでしばらくお待ち下さい。', { modal: true });
        }
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
            fwPrjJs.onDidChange(e => this.chgPrj(e)),
        ];
        this.curCrypt = dir + `/${this.fld_crypt_prj}/`;
        this.$isCryptMode = fs.existsSync(this.curCrypt);
        const fnPass = this.curPlg + '/pass.json';
        const exists_pass = fs.existsSync(fnPass);
        this.hPass = exists_pass
            ? fs.readJsonSync(fnPass, { throws: false })
            : {
                pass: uuidv4(),
                salt: String(crypt.lib.WordArray.random(128 / 8)),
                iv: String(crypt.lib.WordArray.random(128 / 8)),
                ite: 500 + Math.floor(new Date().getTime() % 300),
                stk: String(crypt.lib.WordArray.random(128 / 8)),
            };
        if (!exists_pass)
            fs.outputJsonSync(fnPass, this.hPass);
        this.iv = crypt.enc.Hex.parse(this.hPass.iv);
        this.pbkdf2 = crypt.PBKDF2(crypt.enc.Utf8.parse(this.hPass.pass), crypt.enc.Hex.parse(this.hPass.salt), { keySize: this.hPass.keySize, iterations: this.hPass.ite });
        this.fnDiff = dir + '/core/diff.json';
        if (fs.existsSync(this.fnDiff)) {
            this.hDiff = fs.readJsonSync(this.fnDiff);
        }
        this.ps = new PnlPrjSetting_1.PnlPrjSetting(ctx, dir, chgTitle);
        this.initCrypt();
    }
    get isCryptMode() { return this.$isCryptMode; }
    openPrjSetting() { this.ps.open(); }
    dispose() { this.aFSW.forEach(f => f.dispose()); }
    crePrj(e) { this.encIfNeeded(e.path); this.updPathJson(); }
    chgPrj(e) { this.encIfNeeded(e.path); }
    delPrj(e) {
        const short_path = e.path.slice(this.lenCurPrj);
        this.regNeedCrypt.lastIndex = 0;
        fs.removeSync(this.curCrypt + (short_path + '"')
            .replace(this.regRepJson, '.bin')
            .replace(/"/, ''));
        this.updPathJson();
        delete this.hDiff[short_path];
        this.updDiffJson();
    }
    initCrypt() {
        CmnLib_1.treeProc(this.curPrj, this.$isCryptMode
            ? url => { if (this.isDiff(url))
                this.encrypter(url); }
            : url => this.isDiff(url));
        this.updDiffJson();
    }
    encIfNeeded(url) {
        if (this.isDiff(url) && this.$isCryptMode)
            this.encrypter(url);
        this.updDiffJson();
    }
    updDiffJson() { fs.writeJsonSync(this.fnDiff, this.hDiff); }
    isDiff(url) {
        const short_path = url.slice(this.lenCurPrj);
        let hash = 0;
        if (this.regFullCrypt.test(url)) {
            hash = crc32.str(fs.readFileSync(url, { encoding: 'utf8' }));
        }
        else {
            const b = new Uint8Array(this.LEN_CHKDIFF);
            const fd = fs.openSync(url, 'r');
            fs.readSync(fd, b, 0, this.LEN_CHKDIFF, 0);
            fs.closeSync(fd);
            hash = crc32.buf(b);
        }
        if (this.hDiff[short_path] == hash)
            return false;
        this.hDiff[short_path] = hash;
        return true;
    }
    tglCryptMode() {
        const pathPre = this.curPlg + '/snsys_pre';
        this.$isCryptMode = !this.$isCryptMode;
        if (!this.$isCryptMode) {
            fs.removeSync(this.curCrypt);
            fs.removeSync(pathPre);
            this.aRepl.forEach(url => CmnLib_1.replaceFile(this.dir + '/' + url, new RegExp(`\\(hPlg, {.+?}\\);`), `(hPlg);`));
            CmnLib_1.replaceFile(this.dir + '/package.json', new RegExp(`"${this.fld_crypt_prj}\\/",`), `"prj/",`);
            fs.removeSync(this.fnDiff);
            return;
        }
        fs.ensureDir(this.curCrypt);
        this.aRepl.forEach(url => CmnLib_1.replaceFile(this.dir + '/' + url, /\(hPlg\);/, `(hPlg, {cur: '${this.fld_crypt_prj}/', crypt: true});`));
        CmnLib_1.replaceFile(this.dir + '/package.json', /"prj\/",/, `"${this.fld_crypt_prj}/",`);
        CmnLib_1.replaceFile(this.ctx.extensionPath + `/res/snsys_pre/index.js`, /{p:0}/, JSON.stringify(this.hPass), pathPre + '/index.js');
        this.initCrypt();
    }
    async encrypter(url) {
        var _a;
        try {
            const short_path = url.slice(this.lenCurPrj);
            const url_out = this.curCrypt + short_path;
            if (!this.regNeedCrypt.test(url)) {
                fs.ensureLink(url, url_out)
                    .catch((e) => console.error(`encrypter cp1 ${e}`));
                return;
            }
            if (!this.regForceCrypt.test(url)) {
                const dir = this.regDir.exec(short_path);
                if (dir && this.ps.cfg.code[dir[1]]) {
                    fs.ensureLink(url, url_out)
                        .catch((e) => console.error(`encrypter cp2 ${e}`));
                    return;
                }
            }
            if (this.regFullCrypt.test(short_path)) {
                let s = await fs.readFile(url, { encoding: 'utf8' });
                if (short_path == 'path.json') {
                    s = s.replace(this.regRepJson, '.bin"');
                }
                const e = crypt.AES.encrypt(s, this.pbkdf2, { iv: this.iv });
                await fs.outputFile(url_out, e.toString());
                return;
            }
            let nokori = this.LEN_ENC;
            let i = 2;
            const bh = new Uint8Array(i + nokori);
            bh[0] = 0;
            bh[1] = (_a = this.hExt2N[path.extname(short_path).slice(1)]) !== null && _a !== void 0 ? _a : 0;
            const rs = fs.createReadStream(url)
                .on('error', (e) => console.error(`encrypter rs=%o`, e));
            const u2 = url_out.replace(/\..+$/, '\.bin');
            fs.ensureFileSync(u2);
            const ws = fs.createWriteStream(u2)
                .on('error', (e) => console.error(`encrypter ws=%o`, e));
            const tr = new stream_1.Transform({ transform: (chunk, _enc, cb) => {
                    if (nokori == 0) {
                        cb(null, chunk);
                        return;
                    }
                    const len = chunk.length;
                    if (nokori > len) {
                        bh.set(chunk, i);
                        i += len;
                        nokori -= len;
                        cb(null);
                        return;
                    }
                    bh.set(chunk.slice(0, nokori), i);
                    const e6 = crypt.AES.encrypt(crypt.lib.WordArray.create(bh), this.pbkdf2, { iv: this.iv });
                    const e = Buffer.from(e6.toString(), 'base64');
                    const bl = Buffer.alloc(4);
                    bl.writeUInt32LE(e.length, 0);
                    tr.push(bl);
                    tr.push(e);
                    cb(null, (nokori == len) ? null : chunk.slice(nokori));
                    nokori = 0;
                } })
                .on('end', () => {
                if (nokori == 0)
                    return;
                const e6 = crypt.AES.encrypt(crypt.lib.WordArray.create(bh.slice(0, i)), this.pbkdf2, { iv: this.iv });
                const e = Buffer.from(e6.toString(), 'base64');
                const bl = Buffer.alloc(4);
                bl.writeUInt32LE(e.length, 0);
                ws.write(bl);
                ws.write(e);
            });
            rs.pipe(tr).pipe(ws);
        }
        catch (e) {
            console.error(`encrypter other ${e.message}`);
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