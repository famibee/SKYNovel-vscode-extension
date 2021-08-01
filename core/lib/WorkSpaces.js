"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkSpaces = void 0;
const CmnLib_1 = require("./CmnLib");
const Project_1 = require("./Project");
const DebugAdapter_1 = require("./DebugAdapter");
const CteScore_1 = require("./CteScore");
const MyTreeItem_1 = require("./MyTreeItem");
const vscode_1 = require("vscode");
const fs_extra_1 = require("fs-extra");
const archiver = require("archiver");
const path_1 = require("path");
const png2icons = require("png2icons");
const { execSync } = require('child_process');
class WorkSpaces {
    constructor(ctx, chkLastSNVer) {
        this.ctx = ctx;
        this.chkLastSNVer = chkLastSNVer;
        this.aTiRoot = [];
        this.oTiPrj = {};
        this.aTreeTmp = [
            { cmd: 'SnUpd', icon: 'skynovel', label: 'SKYNovel更新',
                npm: `npm un -S skynovel ${CmnLib_1.statBreak()} npm i @famibee/skynovel@latest ${CmnLib_1.statBreak()} npm run webpack:dev` },
            { cmd: 'LibUpd', icon: 'plugin', label: '全ライブラリ更新',
                npm: `ncu -u --target minor ${CmnLib_1.statBreak()} npm i ${CmnLib_1.statBreak()} npm run webpack:dev` },
            { cmd: 'ReBuild', icon: 'gear', label: 'リビルド',
                npm: 'npm run rebuild' },
            { cmd: 'PrjSet', icon: 'gear', label: '設定' },
            { cmd: 'Crypto', icon: 'gear', label: '暗号化' },
            { cmd: 'TaskWeb', icon: 'browser', label: '起動：ブラウザ版',
                npm: 'npm run web', dbg: true, },
            { cmd: 'TaskApp', icon: 'electron', label: '起動：アプリ版',
                npm: 'npm run start', dbg: true, },
            { cmd: '', icon: '', label: '生成', children: [
                    { cmd: 'PackWin', icon: 'windows', label: 'Windows exe x64',
                        npm: `npm run webpack:pro ${CmnLib_1.statBreak()} ./node_modules/.bin/electron-builder -w --x64 -c.artifactName="\${prj.title}-\${prj.version}-x64.exe"` },
                    { cmd: 'PackWin32', icon: 'windows', label: 'Windows exe ia32',
                        npm: `npm run webpack:pro ${CmnLib_1.statBreak()} ./node_modules/.bin/electron-builder -w --ia32 -c.artifactName="\${prj.title}-\${prj.version}-ia32.exe"` },
                    { cmd: 'PackMac', icon: 'macosx', label: 'macOS dmg x64',
                        npm: `npm run webpack:pro ${CmnLib_1.statBreak()} ./node_modules/.bin/electron-builder -m dmg:x64 -c.artifactName="\${prj.title}-\${prj.version}-x64.dmg"`,
                        forMac: true, },
                    { cmd: 'PackMacArm64', icon: 'macosx', label: 'macOS dmg arm64',
                        npm: `npm run webpack:pro ${CmnLib_1.statBreak()} ./node_modules/.bin/electron-builder -m dmg:arm64 -c.artifactName="\${prj.title}-\${prj.version}-arm64.dmg"`,
                        forMac: true, },
                    { cmd: 'PackLinux', icon: 'linux', label: 'Linux AppImage',
                        npm: `npm run webpack:pro ${CmnLib_1.statBreak()} ./node_modules/.bin/electron-builder -l` },
                    { cmd: 'PackFreem', icon: 'freem', label: 'ふりーむ！形式 zip',
                        npm: 'npm run webpack:pro' },
                ] },
        ];
        this.idxDevSnUpd = 0;
        this.idxDevCrypto = 4;
        this.hPrj = {};
        this.tiLayers = [];
        this.tidDelay = null;
        this.decChars = {
            aRange: [],
            decorator: vscode_1.window.createTextEditorDecorationType({})
        };
        this.emPrjTD = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this.emPrjTD.event;
        this.hOnEndTask = {
            'テンプレ初期化': e => {
                const wsFld = e.execution.task.scope;
                const dir = wsFld.uri.fsPath;
                this.hPrj[dir].finInitTask();
            },
        };
        this.getTreeItem = (t) => t;
        this.getChildren = (t) => t ? t?.children ?? [] : this.aTiRoot;
        this.refresh();
        vscode_1.workspace.onDidChangeWorkspaceFolders(e => this.refresh(e));
        vscode_1.tasks.onDidEndTaskProcess(e => this.hOnEndTask?.[e.execution.task.name](e));
        this.onUpdDoc(vscode_1.window.activeTextEditor);
        vscode_1.window.onDidChangeActiveTextEditor(te => this.onUpdDoc(te), null, ctx.subscriptions);
        vscode_1.workspace.onDidCloseTextDocument(td => {
            if (this.teActive?.document === td)
                this.teActive = undefined;
        });
        vscode_1.workspace.onDidChangeTextDocument(e => {
            if (e.document === this.teActive?.document)
                this.onUpdDoc(this.teActive);
        }, null, ctx.subscriptions);
        const emDbgLayTd = new vscode_1.EventEmitter();
        DebugAdapter_1.initDebug(ctx, o => {
            switch (o.タグ名) {
                case ':connect':
                    this.tiLayers = [];
                    break;
                case ':disconnect':
                    this.tiLayers = [];
                    emDbgLayTd.fire(undefined);
                    break;
                case 'add_lay':
                    {
                        const t = new vscode_1.TreeItem(o.layer);
                        if (o.class === 'txt') {
                            t.iconPath = CmnLib_1.oIcon('comment');
                            t.tooltip = `文字レイヤ layer=${o.layer}`;
                            t.collapsibleState = vscode_1.TreeItemCollapsibleState.Expanded;
                        }
                        else {
                            t.iconPath = CmnLib_1.oIcon(o.layer === 'base' ? 'image' : 'user');
                            t.tooltip = `画像レイヤ layer=${o.layer}`;
                        }
                        t.command = {
                            command: 'skynovel.tiLayers.selectNode',
                            title: 'Select Node',
                            arguments: [o.layer],
                        };
                        this.tiLayers.push(t);
                        emDbgLayTd.fire(undefined);
                    }
                    break;
            }
        });
        ctx.subscriptions.push(vscode_1.window.registerTreeDataProvider('sn-layers', {
            getChildren: (t) => {
                if (!t)
                    return this.tiLayers;
                const icon = t.iconPath;
                const a = icon.dark.slice(-11) === 'comment.svg'
                    ? [
                        { label: 'ボタン', icon: 'hand-point-down' },
                    ]
                    : [];
                return a.map(v => Object.assign(new vscode_1.TreeItem(v.label), {
                    iconPath: CmnLib_1.oIcon(v.icon),
                    command: {
                        command: 'skynovel.tiLayers.selectNode',
                        title: 'Select Node',
                        arguments: [t.label + '/' + v.label],
                    },
                }));
            },
            getTreeItem: t => t,
            onDidChangeTreeData: emDbgLayTd.event,
        }));
        CteScore_1.CteScore.init(ctx);
    }
    onUpdDoc(te) {
        if (!te)
            return;
        if (te.document.languageId !== 'skynovel')
            return;
        this.teActive = te;
        if (this.tidDelay)
            clearTimeout(this.tidDelay);
        this.tidDelay = setTimeout(() => this.updDeco(), 500);
    }
    updDeco() {
        if (!this.teActive)
            return;
        const doc = this.teActive.document;
        const src = doc.getText();
        vscode_1.window.setStatusBarMessage('');
        this.decChars.decorator.dispose();
        this.decChars = {
            aRange: [],
            decorator: vscode_1.window.createTextEditorDecorationType({
                'light': { 'textDecoration': 'underline', },
                'dark': { 'textDecoration': 'underline', }
            })
        };
        let m;
        while (m = WorkSpaces.REG_FN_OR_LABEL.exec(src)) {
            this.decChars.aRange.push(new vscode_1.Range(doc.positionAt(m.index + m[0].length - m[1].length), doc.positionAt(m.index + m[0].length)));
        }
        this.teActive.setDecorations(this.decChars.decorator, this.decChars.aRange);
    }
    refresh(e) {
        const aFld = vscode_1.workspace.workspaceFolders;
        if (!aFld)
            return;
        if (!e) {
            aFld.forEach(fld => this.makePrj(fld));
            this.aTiRoot[0].collapsibleState = vscode_1.TreeItemCollapsibleState.Expanded;
            this.emPrjTD.fire(undefined);
            return;
        }
        if (e.added.length > 0)
            this.makePrj(aFld.slice(-1)[0]);
        else {
            const nm = e.removed[0].name;
            const del = this.aTiRoot.findIndex(v => v.label === nm);
            this.aTiRoot.splice(del, 1);
            const dir = e.removed[0].uri.fsPath;
            delete this.oTiPrj[dir];
            this.hPrj[dir].dispose();
        }
        this.emPrjTD.fire(undefined);
    }
    makePrj(wsFld) {
        const dir = wsFld.uri.fsPath;
        const existPkgJS = fs_extra_1.existsSync(dir + '/package.json');
        const isPrjValid = existPkgJS && fs_extra_1.existsSync(dir + '/doc/prj/prj.json');
        const t = new MyTreeItem_1.MyTreeItem({
            cmd: '',
            icon: '',
            label: '',
            desc: wsFld.name,
            children: isPrjValid ? this.aTreeTmp : [{
                    cmd: '',
                    icon: 'warn',
                    label: `${existPkgJS ? 'prj' : 'package'}.json がありません`,
                }],
        }, dir, this.ctx, (ti, btn_nm, cfg) => this.onClickTreeItemBtn(wsFld, ti, btn_nm, cfg));
        t.collapsibleState = vscode_1.TreeItemCollapsibleState.Collapsed;
        this.aTiRoot.push(t);
        this.oTiPrj[dir] = t.children;
        if (!isPrjValid)
            return;
        this.updLocalSNVer(dir);
        this.hPrj[dir] = new Project_1.Project(this.ctx, wsFld, title => {
            t.label = title;
            this.emPrjTD.fire(t);
        });
        this.dspCryptoMode(dir);
    }
    updLocalSNVer(dir) {
        const o = fs_extra_1.readJsonSync(dir + '/package.json');
        const localVer = o?.dependencies['@famibee/skynovel']?.slice(1);
        this.oTiPrj[dir][this.idxDevSnUpd].description = localVer ? `-- ${localVer}` : '取得できません';
    }
    dspCryptoMode(dir) {
        const tc = this.oTiPrj[dir];
        const fpf = this.hPrj[dir];
        tc[this.idxDevCrypto].description = `-- ${fpf.isCryptoMode ? 'する' : 'しない'}`;
    }
    onClickTreeItemBtn(wsFld, ti, btn_nm, cfg) {
        const pathWs = wsFld.uri.fsPath;
        let cmd = `cd "${pathWs}" ${CmnLib_1.statBreak()} `;
        if (!fs_extra_1.existsSync(pathWs + '/node_modules'))
            cmd += `npm i ${CmnLib_1.statBreak()} `;
        const prj = this.hPrj[pathWs];
        if (cfg.npm)
            cmd += cfg.npm
                .replace(/\${prj.title}/g, prj.title)
                .replace(/\${prj.version}/g, prj.version);
        switch (btn_nm) {
            case 'SnUpd':
                this.chkLastSNVer();
                break;
            case 'PrjSet':
                prj.openPrjSetting();
                return;
            case 'Crypto':
                vscode_1.window.showInformationMessage('暗号化（する / しない）を切り替えますか？', { modal: true }, 'はい')
                    .then(a => {
                    if (a != 'はい')
                        return;
                    prj.tglCryptoMode();
                    this.dspCryptoMode(pathWs);
                    this.emPrjTD.fire(ti);
                });
                return;
            case 'TaskWebDbg':
                vscode_1.debug.startDebugging(wsFld, 'webデバッグ');
                return;
            case 'TaskAppDbg':
                vscode_1.debug.startDebugging(wsFld, 'appデバッグ');
                return;
            case 'PackFreem':
                let find_ng = false;
                CmnLib_1.treeProc(pathWs + '/doc/prj', url => {
                    if (find_ng || url.slice(-4) !== '.svg')
                        return;
                    find_ng = true;
                    vscode_1.window.showErrorMessage(`ふりーむ！では svg ファイル使用禁止です。png などに置き換えて下さい`, 'フォルダを開く', 'Online Converter')
                        .then(a => {
                        switch (a) {
                            case 'フォルダを開く':
                                vscode_1.env.openExternal(vscode_1.Uri.file(path_1.dirname(url)));
                                break;
                            case 'Online Converter':
                                vscode_1.env.openExternal(vscode_1.Uri.parse('https://cancerberosgx.github.io/demos/svg-png-converter/playground/'));
                                break;
                        }
                    });
                });
                if (find_ng)
                    return;
                break;
        }
        switch (btn_nm) {
            case 'TaskWeb':
            case 'TaskApp':
            case 'PackWin':
            case 'PackWin32':
            case 'PackMac':
            case 'PackLinux':
                const fnIcon = pathWs + '/build/icon.png';
                if (!fs_extra_1.existsSync(fnIcon))
                    break;
                const mtPng = fs_extra_1.statSync(fnIcon).mtimeMs;
                const bIconPng = fs_extra_1.readFileSync(fnIcon);
                fs_extra_1.ensureDirSync(pathWs + '/build/icon/');
                {
                    const fn = pathWs + '/build/icon/icon.icns';
                    const mt = fs_extra_1.existsSync(fn) ? fs_extra_1.statSync(fn).mtimeMs : 0;
                    if (mtPng > mt) {
                        const b = png2icons.createICNS(bIconPng, png2icons.BILINEAR, 0);
                        if (b)
                            fs_extra_1.writeFileSync(fn, b);
                    }
                }
                {
                    const fn = pathWs + '/build/icon/icon.ico';
                    const mt = fs_extra_1.existsSync(fn) ? fs_extra_1.statSync(fn).mtimeMs : 0;
                    if (mtPng > mt) {
                        const b = png2icons.createICO(bIconPng, png2icons.BICUBIC2, 0, false, true);
                        if (b)
                            fs_extra_1.writeFileSync(fn, b);
                    }
                }
                break;
        }
        switch (btn_nm) {
            case 'PackWin':
            case 'PackWin32':
                if (!CmnLib_1.is_win)
                    break;
                if (!/(Restricted|AllSigned)/.test(execSync('PowerShell Get-ExecutionPolicy')))
                    break;
                vscode_1.window.showErrorMessage(`管理者権限つきのPowerShell で実行ポリシーを RemoteSigned などに変更して下さい。\n例、管理者コマンドプロンプトで）PowerShell Set-ExecutionPolicy RemoteSigned`, { modal: true }, '参考サイトを開く')
                    .then(a => { if (a)
                    vscode_1.env.openExternal(vscode_1.Uri.parse('https://qiita.com/Targityen/items/3d2e0b5b0b7b04963750')); });
                return;
        }
        const t = new vscode_1.Task({ type: 'SKYNovel ' + btn_nm }, wsFld, cfg.label, 'SKYNovel', new vscode_1.ShellExecution(cmd));
        switch (btn_nm) {
            case 'SnUpd':
            case 'LibUpd':
                this.hOnEndTask[cfg.label] = e => {
                    if (e.execution.task.definition.type !== t.definition.type)
                        return;
                    if (e.execution.task.source !== t.source)
                        return;
                    this.updLocalSNVer(pathWs);
                    this.emPrjTD.fire(undefined);
                };
                break;
            case 'PackWin':
            case 'PackWin32':
            case 'PackMac':
            case 'PackLinux':
                this.hOnEndTask[cfg.label] = () => vscode_1.window.showInformationMessage(`${cfg.label} パッケージを生成しました`, '出力フォルダを開く').then(a => { if (a)
                    vscode_1.env.openExternal(vscode_1.Uri.file(pathWs + '/build/package/')); });
                break;
            case 'PackFreem':
                this.hOnEndTask[cfg.label] = () => {
                    const arc = archiver.create('zip', { zlib: { level: 9 }, })
                        .append(fs_extra_1.createReadStream(pathWs + '/doc/web.htm'), { name: 'index.html' })
                        .append(fs_extra_1.createReadStream(pathWs + '/build/include/readme.txt'), { name: 'readme.txt' })
                        .glob('web.js', { cwd: pathWs + '/doc/' })
                        .glob('web.*.js', { cwd: pathWs + '/doc/' })
                        .glob(`${prj.isCryptoMode ? Project_1.Project.fldnm_crypto_prj : 'prj'}/**/*`, { cwd: pathWs + '/doc/' })
                        .glob('favicon.ico', { cwd: pathWs + '/doc/' });
                    const fn_out = `${path_1.basename(pathWs)}_1.0freem.zip`;
                    const ws = fs_extra_1.createWriteStream(pathWs + `/build/package/${fn_out}`)
                        .on('close', () => vscode_1.window.showInformationMessage(`ふりーむ！形式で出力（${fn_out}）しました`, '出力フォルダを開く').then(a => { if (a)
                        vscode_1.env.openExternal(vscode_1.Uri.file(pathWs + '/build/package/')); }));
                    arc.pipe(ws);
                    arc.finalize();
                };
                break;
        }
        vscode_1.tasks.executeTask(t)
            .then(undefined, rj => console.error(`fn:WorkSpaces onClickTreeItemBtn() rj:${rj.message}`));
    }
    dispose() {
        for (const dir in this.hPrj)
            this.hPrj[dir].dispose();
        this.hPrj = {};
    }
}
exports.WorkSpaces = WorkSpaces;
WorkSpaces.REG_FN_OR_LABEL = /(?<=\s)(?:fn|label)\s*=\s*([^\]\s]+)/g;
//# sourceMappingURL=WorkSpaces.js.map