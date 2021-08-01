"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const CmnLib_1 = require("./CmnLib");
const CodingSupporter_1 = require("./CodingSupporter");
const PrjSetting_1 = require("./PrjSetting");
const vscode_1 = require("vscode");
const fs = require("fs-extra");
const path = require("path");
const img_size = require('image-size');
const crypto_js_1 = require("crypto-js");
const uuid_1 = require("uuid");
const crc32 = require("crc-32");
const stream_1 = require("stream");
class Project {
    constructor(ctx, wsFld, chgTitle) {
        this.ctx = ctx;
        this.wsFld = wsFld;
        this.chgTitle = chgTitle;
        this.$isCryptoMode = true;
        this.regNeedCrypto = /\.(sn|ssn|json|html?|jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv|html?)$/;
        this.regFullCrypto = /\.(sn|ssn|json|html?)$/;
        this.regRepPathJson = /\.(jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)/g;
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
            'webm': 21,
            'ogv': 22,
        };
        this.regNeedHash = /\.(js|css)$/;
        this.hDiff = Object.create(null);
        this.LEN_CHKDIFF = 1024;
        this.REG_SPATH2HFN = /([^\/]+)\/[^\/]+(\.\w+)/;
        this.aRepl = [
            'core/app4webpack.js',
            'core/web4webpack.js',
        ];
        this.regDir = /(^.+)\//;
        this.regPlgAddTag = /(?<=\.\s*addTag\s*\(\s*)(["'])(.+?)\1/g;
        this.hPathFn2Exts = {};
        this.regSprSheetImg = /^(.+)\.(\d+)x(\d+)\.(png|jpe?g)$/;
        this.userFnTail = '';
        this.regPath = /([^\/\s]+)\.([^\d]\w+)/;
        this.pathWs = wsFld.uri.fsPath;
        this.curPrj = this.pathWs + '/doc/prj/';
        this.codSpt = new CodingSupporter_1.CodingSupporter(ctx, this.pathWs, this.curPrj);
        this.curPlg = this.pathWs + '/core/plugin/';
        fs.ensureDirSync(this.curPlg);
        if (fs.existsSync(this.pathWs + '/node_modules'))
            this.updPlugin();
        else {
            this.initTask();
            vscode_1.window.showInformationMessage('初期化中です。ターミナルの処理が終わって止まるまでしばらくお待ち下さい。', { modal: true });
        }
        this.lenCurPrj = this.curPrj.length;
        this.updPathJson();
        const fwPlg = vscode_1.workspace.createFileSystemWatcher(this.curPlg + '**/*');
        const fwPrj = vscode_1.workspace.createFileSystemWatcher(this.curPrj + '*/*');
        const fwPrjJs = vscode_1.workspace.createFileSystemWatcher(this.curPrj + 'prj.json');
        const fwFld = vscode_1.workspace.createFileSystemWatcher(this.curPrj + '*');
        this.aFSW = [
            fwPlg.onDidCreate(uri => {
                if (uri.path.slice(-4) !== '.git')
                    this.updPlugin();
            }),
            fwPlg.onDidChange(uri => {
                if (uri.path.slice(-4) !== '.git')
                    this.updPlugin();
            }),
            fwPlg.onDidDelete(uri => {
                if (uri.path.slice(-4) !== '.git')
                    this.updPlugin();
            }),
            fwPrj.onDidCreate(uri => {
                CmnLib_1.regNoUseSysPath.lastIndex = 0;
                if (CmnLib_1.regNoUseSysPath.test(uri.path))
                    return;
                this.crePrj(uri);
                if (CmnLib_1.REG_SCRIPT.test(uri.path))
                    this.codSpt.crePrj(uri);
            }),
            fwPrj.onDidChange(uri => {
                if (vscode_1.workspace.textDocuments.find(td => td.uri.path === uri.path))
                    return;
                CmnLib_1.regNoUseSysPath.lastIndex = 0;
                if (CmnLib_1.regNoUseSysPath.test(uri.path))
                    return;
                this.chgPrj(uri);
                if (CmnLib_1.REG_SCRIPT.test(uri.path))
                    this.codSpt.chgPrj(uri);
            }),
            fwPrj.onDidDelete(uri => {
                CmnLib_1.regNoUseSysPath.lastIndex = 0;
                if (CmnLib_1.regNoUseSysPath.test(uri.path))
                    return;
                this.delPrj(uri);
                if (CmnLib_1.REG_SCRIPT.test(uri.path))
                    this.codSpt.delPrj(uri);
            }),
            fwPrjJs.onDidChange(e => this.chgPrj(e)),
            fwFld.onDidCreate(uri => this.ps.noticeCreDir(uri.path)),
            fwFld.onDidDelete(uri => this.ps.noticeDelDir(uri.path)),
        ];
        this.curCrypto = this.pathWs + `/doc/${Project.fld_crypto_prj}/`;
        this.$isCryptoMode = fs.existsSync(this.curCrypto);
        const fnPass = this.curPlg + 'pass.json';
        const exists_pass = fs.existsSync(fnPass);
        this.hPass = exists_pass
            ? fs.readJsonSync(fnPass, { throws: false })
            : {
                pass: uuid_1.v4(),
                salt: String(crypto_js_1.lib.WordArray.random(128 / 8)),
                iv: String(crypto_js_1.lib.WordArray.random(128 / 8)),
                ite: 500 + Math.floor(new Date().getTime() % 300),
                stk: String(crypto_js_1.lib.WordArray.random(128 / 8)),
            };
        if (!exists_pass)
            fs.outputJsonSync(fnPass, this.hPass);
        this.iv = crypto_js_1.enc.Hex.parse(this.hPass.iv);
        this.pbkdf2 = crypto_js_1.PBKDF2(crypto_js_1.enc.Utf8.parse(this.hPass.pass), crypto_js_1.enc.Hex.parse(this.hPass.salt), {
            keySize: parseInt(this.hPass.keySize),
            iterations: parseInt(this.hPass.ite),
        });
        try {
            this.fnDiff = this.pathWs + '/core/diff.json';
            if (fs.existsSync(this.fnDiff))
                this.hDiff = fs.readJsonSync(this.fnDiff);
        }
        catch (e) {
            this.hDiff = Object.create(null);
        }
        this.ps = new PrjSetting_1.PrjSetting(ctx, wsFld, chgTitle, this.codSpt, (path, extptn = '') => this.searchPath(path, extptn));
        this.initCrypto();
    }
    static get fldnm_crypto_prj() { return Project.fld_crypto_prj; }
    get isCryptoMode() { return this.$isCryptoMode; }
    openPrjSetting() { this.ps.open(); }
    get title() { return this.ps.cfg.book.title; }
    get version() { return this.ps.cfg.book.version; }
    dispose() { this.aFSW.forEach(f => f.dispose()); }
    crePrj(e) { this.encIfNeeded(e.path); this.updPathJson(); }
    chgPrj(e) { this.encIfNeeded(e.path); }
    delPrj(e) {
        const short_path = e.path.slice(this.lenCurPrj);
        this.regNeedCrypto.lastIndex = 0;
        fs.removeSync(this.curCrypto + short_path
            .replace(this.regRepPathJson, '.bin')
            .replace(/"/, ''));
        this.updPathJson();
        delete this.hDiff[short_path];
        this.updDiffJson();
    }
    initCrypto() {
        const fnc = this.$isCryptoMode
            ? url => { if (this.isDiff(url))
                this.encrypter(url); }
            : url => this.isDiff(url);
        CmnLib_1.treeProc(this.curPrj, fnc);
        this.updDiffJson();
    }
    encIfNeeded(url) {
        if (this.$isCryptoMode && this.isDiff(url))
            this.encrypter(url);
        this.updDiffJson();
    }
    updDiffJson() { fs.writeJsonSync(this.fnDiff, this.hDiff); }
    isDiff(url) {
        const short_path = url.slice(this.lenCurPrj);
        let hash = 0;
        if (this.regFullCrypto.test(url)) {
            hash = crc32.str(fs.readFileSync(url, { encoding: 'utf8' }));
        }
        else {
            const b = new Uint8Array(this.LEN_CHKDIFF);
            const fd = fs.openSync(url, 'r');
            fs.readSync(fd, b, 0, this.LEN_CHKDIFF, 0);
            fs.closeSync(fd);
            hash = crc32.buf(b);
        }
        if (this.hDiff[short_path]?.hash === hash)
            return false;
        this.hDiff[short_path] = {
            hash: hash,
            cn: this.regNeedCrypto.test(short_path)
                ? short_path.replace(this.REG_SPATH2HFN, `$1/${uuid_1.v5(short_path, this.hPass.pass)}$2`)
                    .replace(this.regRepPathJson, '.bin')
                : short_path,
        };
        return true;
    }
    tglCryptoMode() {
        const pathPre = this.curPlg + 'snsys_pre';
        this.$isCryptoMode = !this.$isCryptoMode;
        if (!this.$isCryptoMode) {
            fs.removeSync(this.curCrypto);
            fs.removeSync(pathPre);
            this.aRepl.forEach(url => CmnLib_1.replaceFile(this.pathWs + '/' + url, new RegExp(`\\(hPlg, {.+?}\\);`), `(hPlg);`));
            CmnLib_1.replaceFile(this.pathWs + '/package.json', new RegExp(`"${Project.fld_crypto_prj}\\/",`), `"prj/",`);
            return;
        }
        fs.ensureDir(this.curCrypto);
        this.aRepl.forEach(url => CmnLib_1.replaceFile(this.pathWs + '/' + url, /\(hPlg\);/, `(hPlg, {cur: '${Project.fld_crypto_prj}/', crypto: true});`));
        CmnLib_1.replaceFile(this.pathWs + '/package.json', /"prj\/",/, `"${Project.fld_crypto_prj}/",`);
        CmnLib_1.replaceFile(this.ctx.extensionPath + `/res/snsys_pre/index.js`, /{p:0}/, JSON.stringify(this.hPass), pathPre + '/index.js');
        this.hDiff = Object.create(null);
        this.initCrypto();
    }
    async encrypter(url) {
        try {
            const short_path = url.slice(this.lenCurPrj);
            const url_out = this.curCrypto + this.hDiff[short_path].cn;
            if (!this.regNeedCrypto.test(url)) {
                fs.ensureLink(url, url_out)
                    .catch((e) => console.error(`encrypter cp1 ${e}`));
                return;
            }
            if (this.regFullCrypto.test(short_path)) {
                let s = await fs.readFile(url, { encoding: 'utf8' });
                if (short_path === 'path.json') {
                    const hPath = JSON.parse(s);
                    for (const fn in hPath) {
                        const hExt2N = hPath[fn];
                        for (const ext in hExt2N) {
                            if (ext === ':cnt')
                                continue;
                            if (ext.slice(-10) === ':RIPEMD160')
                                continue;
                            const path = String(hExt2N[ext]);
                            const dir = this.regDir.exec(path);
                            if (dir && this.ps.cfg.code[dir[1]])
                                continue;
                            hExt2N[ext] = this.hDiff[path].cn;
                        }
                    }
                    s = JSON.stringify(hPath);
                }
                const e = crypto_js_1.AES.encrypt(s, this.pbkdf2, { iv: this.iv });
                await fs.outputFile(url_out, e.toString());
                return;
            }
            const dir = this.regDir.exec(short_path);
            if (dir && this.ps.cfg.code[dir[1]]) {
                fs.ensureLink(url, url_out)
                    .catch((e) => console.error(`encrypter cp2 ${e}`));
                return;
            }
            let cnt_code = Project.LEN_ENC;
            let ite_buf = 2;
            const bh = new Uint8Array(ite_buf + cnt_code);
            bh[0] = 0;
            bh[1] = this.hExt2N[path.extname(short_path).slice(1)] ?? 0;
            const rs = fs.createReadStream(url)
                .on('error', (e) => console.error(`encrypter rs=%o`, e));
            const u2 = url_out.replace(/\.[^.]+$/, '.bin');
            fs.ensureFileSync(u2);
            const ws = fs.createWriteStream(u2)
                .on('error', (e) => console.error(`encrypter ws=%o`, e));
            const tr = new stream_1.Transform({ transform: (chunk, _enc, cb) => {
                    if (cnt_code === 0) {
                        cb(null, chunk);
                        return;
                    }
                    const len = chunk.length;
                    if (cnt_code > len) {
                        bh.set(chunk, ite_buf);
                        ite_buf += len;
                        cnt_code -= len;
                        cb(null);
                        return;
                    }
                    bh.set(chunk.slice(0, cnt_code), ite_buf);
                    const e6 = crypto_js_1.AES.encrypt(crypto_js_1.lib.WordArray.create(Array.from(bh)), this.pbkdf2, { iv: this.iv });
                    const e = Buffer.from(e6.toString(), 'base64');
                    const bl = Buffer.alloc(4);
                    bl.writeUInt32LE(e.length, 0);
                    tr.push(bl);
                    tr.push(e);
                    cb(null, (cnt_code === len) ? null : chunk.slice(cnt_code));
                    cnt_code = 0;
                } })
                .on('end', () => {
                if (cnt_code === 0)
                    return;
                const e6 = crypto_js_1.AES.encrypt(crypto_js_1.lib.WordArray.create(Array.from(bh.slice(0, ite_buf))), this.pbkdf2, { iv: this.iv });
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
        const h4json = {};
        const hDefPlg = {};
        CmnLib_1.foldProc(this.curPlg, () => { }, nm => {
            h4json[nm] = 0;
            const path = `${this.curPlg}${nm}/index.js`;
            if (!fs.existsSync(path))
                return;
            const txt = fs.readFileSync(path, 'utf8');
            let a;
            while ((a = this.regPlgAddTag.exec(txt))) {
                const nm = a[2];
                const len_nm = nm.length;
                const idx_nm = this.regPlgAddTag.lastIndex - len_nm - 1;
                let line = 0;
                let j = idx_nm;
                while ((j = txt.lastIndexOf('\n', j - 1)) >= 0)
                    ++line;
                const col = idx_nm - txt.lastIndexOf('\n', idx_nm) - 1;
                hDefPlg[nm] = new vscode_1.Location(vscode_1.Uri.file(path), new vscode_1.Range(line, col, line, col + len_nm));
            }
        });
        this.codSpt.setHDefPlg(hDefPlg);
        fs.outputFile(this.curPlg.slice(0, -1) + '.js', `export default ${JSON.stringify(h4json)};`)
            .then(() => this.initTask())
            .catch((err) => console.error(`Project updPlugin ${err}`));
    }
    initTask() {
        this.initTask = () => { };
        let cmd = `cd "${this.pathWs}" ${CmnLib_1.statBreak()} `;
        if (!fs.existsSync(this.pathWs + '/node_modules'))
            cmd += `npm i ${CmnLib_1.statBreak()} `;
        cmd += 'npm run webpack:dev';
        const t = new vscode_1.Task({ type: 'SKYNovel auto' }, this.wsFld, 'テンプレ初期化', 'SKYNovel', new vscode_1.ShellExecution(cmd));
        vscode_1.tasks.executeTask(t)
            .then(undefined, rj => console.error(`Project rebuildTask() rj:${rj.message}`));
    }
    finInitTask() {
        this.updPlugin();
        this.codSpt.finInitTask();
    }
    async updPathJson() {
        try {
            this.hPathFn2Exts = this.get_hPathFn2Exts(this.curPrj);
            await fs.outputJson(this.curPrj + 'path.json', this.hPathFn2Exts);
            this.codSpt.updPath(this.hPathFn2Exts);
            if (this.$isCryptoMode)
                this.encrypter(this.curPrj + 'path.json');
        }
        catch (err) {
            console.error(`Project updPathJson ${err}`);
        }
    }
    get_hPathFn2Exts($cur) {
        const hFn2Path = {};
        CmnLib_1.foldProc($cur, () => { }, (dir) => {
            const wd = path.resolve($cur, dir);
            CmnLib_1.foldProc(wd, (url, nm) => {
                this.addPath(hFn2Path, dir, nm);
                const a2 = nm.match(this.regNeedHash);
                if (a2) {
                    const s = fs.readFileSync(url, { encoding: 'utf8' });
                    const h = crypto_js_1.RIPEMD160(s).toString(crypto_js_1.enc.Hex);
                    const snm = nm.slice(0, -a2[0].length);
                    hFn2Path[snm][a2[1] + ':RIPEMD160'] = h;
                }
                const a = nm.match(this.regSprSheetImg);
                if (!a)
                    return;
                const fnJs = path.resolve(wd, a[1] + '.json');
                if (fs.existsSync(fnJs))
                    return;
                const size = img_size(url);
                const xLen = CmnLib_1.uint(a[2]);
                const yLen = CmnLib_1.uint(a[3]);
                const w = size.width / xLen;
                const h = size.height / yLen;
                const basename = a[1];
                const ext = a[4];
                const oJs = {
                    frames: {},
                    meta: {
                        app: 'skynovel',
                        version: '1.0',
                        image: a[0],
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
                vscode_1.window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${a[1]}.json を自動生成しました`);
                this.addPath(hFn2Path, dir, `${a[1]}.json`);
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
                const fn = this.curPrj + (id === 1 ? hExts[ext] : dir + '/' + nm);
                vscode_1.window.showInformationMessage(`${fn} を削除しますか？`, { modal: true }, 'はい')
                    .then(a => { if (a === 'はい')
                    fs.removeSync(fn); });
            });
            return;
        }
        else {
            hExts[':cnt'] = CmnLib_1.uint(hExts[':cnt']) + 1;
        }
        hExts[ext] = dir + '/' + nm;
    }
    searchPath(path, extptn = '') {
        if (!path)
            throw '[searchPath] fnが空です';
        const a = path.match(this.regPath);
        let fn = a ? a[1] : path;
        const ext = a ? a[2] : '';
        if (this.userFnTail) {
            const utn = fn + '@@' + this.userFnTail;
            if (utn in this.hPathFn2Exts) {
                if (extptn === '')
                    fn = utn;
                else
                    for (let e3 in this.hPathFn2Exts[utn]) {
                        if (`|${extptn}|`.indexOf(`|${e3}|`) === -1)
                            continue;
                        fn = utn;
                        break;
                    }
            }
        }
        const h_exts = this.hPathFn2Exts[fn];
        if (!h_exts)
            throw `サーチパスに存在しないファイル【${path}】です`;
        let ret = '';
        if (!ext) {
            const hcnt = CmnLib_1.int(h_exts[':cnt']);
            if (extptn === '') {
                if (hcnt > 1)
                    throw `指定ファイル【${path}】が複数マッチします。サーチ対象拡張子群【${extptn}】で絞り込むか、ファイル名を個別にして下さい。`;
                return path;
            }
            const search_exts = `|${extptn}|`;
            if (hcnt > 1) {
                let cnt = 0;
                for (const e2 in h_exts) {
                    if (search_exts.indexOf(`|${e2}|`) === -1)
                        continue;
                    if (++cnt > 1)
                        throw `指定ファイル【${path}】が複数マッチします。サーチ対象拡張子群【${extptn}】で絞り込むか、ファイル名を個別にして下さい。`;
                }
            }
            for (let e in h_exts) {
                if (search_exts.indexOf(`|${e}|`) === -1)
                    continue;
                return String(h_exts[e]);
            }
            throw `サーチ対象拡張子群【${extptn}】にマッチするファイルがサーチパスに存在しません。探索ファイル名=【${path}】`;
        }
        if (extptn !== '') {
            const search_exts2 = `|${extptn}|`;
            if (search_exts2.indexOf(`|${ext}|`) === -1) {
                throw `指定ファイルの拡張子【${ext}】は、サーチ対象拡張子群【${extptn}】にマッチしません。探索ファイル名=【${path}】`;
            }
        }
        ret = String(h_exts[ext]);
        if (!ret)
            throw `サーチパスに存在しない拡張子【${ext}】です。探索ファイル名=【${path}】、サーチ対象拡張子群【${extptn}】`;
        return ret;
    }
}
exports.Project = Project;
Project.fld_crypto_prj = 'crypto_prj';
Project.LEN_ENC = 1024 * 10;
//# sourceMappingURL=Project.js.map