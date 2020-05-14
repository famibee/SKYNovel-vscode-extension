"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodingSupporter = void 0;
const CmnLib_1 = require("./CmnLib");
const ScriptScanner_1 = require("./ScriptScanner");
const hMd = require('../md.json');
const vscode_1 = require("vscode");
let CodingSupporter = (() => {
    class CodingSupporter {
        constructor(ctx, curPrj) {
            var _a;
            this.hArgDesc = {};
            this.tidDelay = null;
            this.hChgTxt = {};
            this.hRsvNm2Then = {};
            this.nm4rename = '';
            this.aCITagMacro = [];
            this.preSigHelp = new vscode_1.SignatureHelp();
            this.hScr2Pro = {};
            this.crePrj = (_) => this.scrScn.goAll();
            this.chgPrj = (uri) => this.scrScn.goFile(uri);
            this.delPrj = (_) => this.scrScn.goAll();
            this.loadCfg = () => CodingSupporter.pickItems.sort(this.compare).forEach(q => q.description += '（SKYNovel）');
            this.lenRootPath = ((_a = vscode_1.workspace.rootPath) !== null && _a !== void 0 ? _a : '').length + 1;
            CodingSupporter.initClass(ctx);
            CodingSupporter.pickItems.map(q => {
                var _a;
                return this.hArgDesc[q.label] = {
                    label: `[${q.label} ...]`,
                    doc: (_a = q.description) !== null && _a !== void 0 ? _a : 'タグの説明',
                };
            });
            vscode_1.commands.registerCommand(CodingSupporter.CMD_SCANSCR_TRGPARAMHINTS, () => vscode_1.commands.executeCommand('editor.action.triggerParameterHints'));
            this.aCITagMacro = [];
            const cmdScanScr_trgPrm = { title: '「スクリプト再捜査」「引数の説明」', command: CodingSupporter.CMD_SCANSCR_TRGPARAMHINTS };
            for (const tag_nm in hMd) {
                const md = hMd[tag_nm];
                const ci = new vscode_1.CompletionItem(tag_nm, vscode_1.CompletionItemKind.Snippet);
                ci.detail = md.detail;
                ci.command = cmdScanScr_trgPrm;
                if (md.comment)
                    ci.documentation = new vscode_1.MarkdownString(`$(book)[タグリファレンス](https://famibee.github.io/SKYNovel/tag.htm#${tag_nm})

---
${md.comment}`, true);
                this.aCITagMacro.push(ci);
                const len = md.snippet.length;
                for (let i = 1; i < len; ++i) {
                    const ci2 = new vscode_1.CompletionItem(md.snippet[i].nm, vscode_1.CompletionItemKind.Snippet);
                    ci2.detail = md.detail;
                    ci2.command = cmdScanScr_trgPrm;
                    ci2.documentation = ci.documentation;
                    this.aCITagMacro.push(ci2);
                }
            }
            this.loadCfg();
            ctx.subscriptions.push(vscode_1.workspace.onDidChangeConfiguration(() => this.loadCfg()));
            const doc_sel = { scheme: 'file', language: 'skynovel' };
            ctx.subscriptions.push(vscode_1.languages.registerHoverProvider(doc_sel, this));
            ctx.subscriptions.push(vscode_1.languages.registerDefinitionProvider(doc_sel, this));
            ctx.subscriptions.push(vscode_1.languages.registerReferenceProvider(doc_sel, this));
            ctx.subscriptions.push(vscode_1.languages.registerRenameProvider(doc_sel, this));
            this.clDiag = vscode_1.languages.createDiagnosticCollection(doc_sel.language);
            ctx.subscriptions.push(this.clDiag);
            ctx.subscriptions.push(vscode_1.languages.registerCompletionItemProvider(doc_sel, this, '[', ' ', '='));
            ctx.subscriptions.push(vscode_1.languages.registerSignatureHelpProvider(doc_sel, this, ' '));
            ctx.subscriptions.push(vscode_1.languages.registerDocumentSymbolProvider(doc_sel, this));
            vscode_1.workspace.onDidChangeTextDocument(e => {
                const doc = e.document;
                if (e.contentChanges.length == 0
                    || doc.languageId != 'skynovel'
                    || doc.fileName.slice(0, this.lenRootPath - 1) != vscode_1.workspace.rootPath)
                    return;
                this.hChgTxt[doc.fileName] = doc;
                if (this.tidDelay)
                    clearTimeout(this.tidDelay);
                this.tidDelay = setTimeout(() => this.delayedUpdate(), 500);
            }, null, ctx.subscriptions);
            this.scrScn = new ScriptScanner_1.ScriptScanner(curPrj, this.clDiag, CodingSupporter.hTag);
        }
        delayedUpdate() {
            const o = this.hChgTxt;
            this.hChgTxt = {};
            for (const fn in o) {
                const doc = o[fn];
                this.scrScn.goScriptSrc(doc.uri, doc.getText());
            }
            for (const rsv_nm in this.hRsvNm2Then)
                this.hRsvNm2Then[rsv_nm]();
            this.hRsvNm2Then = {};
        }
        static initClass(ctx) {
            CodingSupporter.initClass = () => { };
            for (const tag_nm in hMd) {
                const md = hMd[tag_nm];
                CodingSupporter.pickItems.push({
                    label: tag_nm,
                    description: md.detail
                });
                CodingSupporter.hTag[tag_nm] = true;
                md.snippet.forEach(sn => CodingSupporter.hSnippet[sn.nm] = sn.txt);
            }
            ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.openReferencePallet', () => {
                const op = {
                    'placeHolder': 'Which reference will you open?',
                    'matchOnDescription': true,
                };
                vscode_1.window.showQuickPick(CodingSupporter.pickItems, op).then(q => { if (q)
                    CodingSupporter.openTagRef(q); });
            }));
        }
        static openTagRef(v) {
            vscode_1.commands.executeCommand('vscode.open', vscode_1.Uri.parse('https://famibee.github.io/SKYNovel/tag.htm#' + v.label));
        }
        provideHover(doc, pos, _token) {
            const r = doc.getWordRangeAtPosition(pos, CodingSupporter.regTagName);
            if (!r)
                return Promise.reject('No word here.');
            const nm = doc.getText(doc.getWordRangeAtPosition(pos));
            const locMac = this.scrScn.hMacro[nm];
            if (locMac) {
                const fn = locMac.uri.fsPath;
                return new vscode_1.Hover(new vscode_1.MarkdownString(`~~~skynovel
(マクロ) [${nm}]
~~~
定義ファイル：${fn.slice(this.lenRootPath)}`));
            }
            const locPlg = this.scrScn.hPlugin[nm];
            if (locPlg) {
                const fn = locPlg.uri.fsPath;
                return new vscode_1.Hover(new vscode_1.MarkdownString(`~~~skynovel
(プラグイン定義タグ) [${nm}]
~~~
---
定義ファイル：${fn.slice(this.lenRootPath)}`));
            }
            let label = `[${nm}`;
            const md = hMd[nm];
            if (!md)
                return Promise.reject('Nothing md file.');
            md.param.forEach(prm => {
                const p = `${prm.name}=${prm.default ? `%${prm.name}|${prm.default}` : '【必須】'}`;
                label += ' ' + p;
            });
            return new vscode_1.Hover(new vscode_1.MarkdownString(`~~~skynovel
(タグ) ${label}]
~~~
---
${md.detail}`));
        }
        provideDefinition(doc, pos, _token) {
            const r = doc.getWordRangeAtPosition(pos, CodingSupporter.regTagName);
            if (!r)
                return Promise.reject('No word here.');
            return new Promise((re, rj) => {
                var _a;
                const nm = doc.getText(doc.getWordRangeAtPosition(pos));
                const loc = (_a = this.scrScn.hMacro[nm]) !== null && _a !== void 0 ? _a : this.scrScn.hPlugin[nm];
                if (loc)
                    return re(loc);
                const q = CodingSupporter.pickItems.find(q => q.label == nm);
                if (q) {
                    CodingSupporter.openTagRef(q);
                    return re();
                }
                return rj('No definition found');
            });
        }
        provideReferences(doc, pos, _ctx, _token) {
            const r = doc.getWordRangeAtPosition(pos, CodingSupporter.regTagName);
            if (!r)
                return Promise.reject('No word here.');
            return new Promise((re, rj) => {
                const nm = doc.getText(doc.getWordRangeAtPosition(pos));
                const loc = this.scrScn.hMacroUse[nm];
                if (loc)
                    return re(loc);
                return rj('No references found');
            });
        }
        prepareRename(doc, pos, _token) {
            const r = doc.getWordRangeAtPosition(pos, CodingSupporter.regTagName);
            if (!r)
                return Promise.reject('No word here.');
            return new Promise((re, rj) => {
                var _a;
                const nm = doc.getText(doc.getWordRangeAtPosition(pos));
                if (nm in CodingSupporter.hTag)
                    return rj('タグは変名できません');
                const m = (_a = this.scrScn.hPlugin[nm]) !== null && _a !== void 0 ? _a : this.scrScn.hMacro[nm];
                if (!m)
                    return rj('未定義マクロ・タグです');
                this.nm4rename = nm;
                return re((doc.uri == m.uri && m.range.contains(pos)) ? m.range : r);
            });
        }
        provideRenameEdits(_doc, _pos, newName, _token) {
            return new Promise((re, rj) => {
                if (/(\s|　)/.test(newName))
                    return rj('空白を含む変名はできません');
                if (newName in CodingSupporter.hTag)
                    return rj('既にあるタグ名です');
                if (newName in this.scrScn.hMacro)
                    return rj('既にあるマクロ名です');
                if (newName in this.scrScn.hPlugin)
                    return rj('既にあるプラグイン定義タグ名です');
                const we = new vscode_1.WorkspaceEdit();
                const mu = this.scrScn.hMacroUse[this.nm4rename];
                if (mu) {
                    this.scrScn.hMacroUse[newName] = mu;
                    delete this.scrScn.hMacroUse[this.nm4rename];
                    mu.forEach(p => we.replace(p.uri, p.range, newName));
                }
                const mp = this.scrScn.hPlugin[this.nm4rename];
                if (mp) {
                    this.scrScn.hPlugin[newName] = mp;
                    delete this.scrScn.hPlugin[this.nm4rename];
                    we.replace(mp.uri, mp.range, newName);
                    return re(we);
                }
                const m = this.scrScn.hMacro[this.nm4rename];
                this.scrScn.hMacro[newName] = m;
                delete this.scrScn.hMacro[this.nm4rename];
                we.replace(m.uri, m.range, newName);
                return re(we);
            });
        }
        provideCompletionItems(doc, pos, _token, cc) {
            const line = doc.lineAt(pos.line);
            const trgChr = cc.triggerCharacter;
            if (trgChr == '[') {
                const t = line.text.slice(pos.character - 1, pos.character + 1);
                return (t == '[]') ? this.aCITagMacro : [];
            }
            const aUse = this.scrScn.hTagMacroUse[doc.uri.path];
            if (!aUse)
                return [];
            const use = aUse.find(o => o.rng.contains(pos));
            if (!use)
                return [];
            const md = hMd[use.nm];
            if (!md)
                return [];
            if (trgChr == ' ')
                return md.param.map(p => new vscode_1.CompletionItem(p.name, vscode_1.CompletionItemKind.Field));
            const r = doc.getWordRangeAtPosition(pos, CodingSupporter.REG_FIELD);
            if (!r)
                return [];
            const idxParam = this.searchArgName(doc.getText(r), md);
            if (idxParam == -1)
                return [];
            const prm_details = md.param[idxParam];
            let rangetype = prm_details === null || prm_details === void 0 ? void 0 : prm_details.rangetype;
            if (!rangetype)
                return [];
            switch (rangetype) {
                case 'Boolean':
                    rangetype = 'true、false';
                    break;
            }
            if (rangetype.includes('、'))
                return rangetype.split('、').map(v => new vscode_1.CompletionItem(v, vscode_1.CompletionItemKind.Keyword));
            let kind = vscode_1.CompletionItemKind.Value;
            const words = this.scrScn.hPreWords[rangetype];
            if (!words)
                return (prm_details === null || prm_details === void 0 ? void 0 : prm_details.default) ? [new vscode_1.CompletionItem(prm_details.default, kind)] : [];
            switch (rangetype) {
                case 'イベント名':
                    kind = vscode_1.CompletionItemKind.Event;
                    break;
                case '代入変数名':
                    kind = vscode_1.CompletionItemKind.Variable;
                    break;
                case 'ジャンプ先':
                    kind = vscode_1.CompletionItemKind.Reference;
                    break;
                case 'スクリプトファイル名':
                case '画像ファイル名':
                case '音声ファイル名':
                case 'HTMLファイル名':
                    kind = vscode_1.CompletionItemKind.File;
                    break;
                default:
                    kind = vscode_1.CompletionItemKind.EnumMember;
                    break;
            }
            return words.slice(1, -1).split(',').map(v => new vscode_1.CompletionItem(v, (v.slice(0, 6) == 'const.') ? vscode_1.CompletionItemKind.Constant : kind));
        }
        resolveCompletionItem(ci, _token) {
            var _a, _b;
            if (ci.kind == vscode_1.CompletionItemKind.Snippet) {
                const sn = CodingSupporter.hSnippet[ci.label];
                if (sn)
                    ci.insertText = new vscode_1.SnippetString(this.scrScn.cnvSnippet(sn, CmnLib_1.CmnLib.getFn((_b = (_a = vscode_1.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.fileName) !== null && _b !== void 0 ? _b : '')));
            }
            return ci;
        }
        provideSignatureHelp(doc, pos, _token, shc) {
            var _a;
            const path = doc.uri.path;
            let token = '';
            const aUse = this.scrScn.hTagMacroUse[path];
            if (!aUse)
                return Promise.reject('Nothing tag file.');
            if (shc.isRetrigger) {
                let r = this.rngPreTag;
                r = r.with(undefined, r.end.translate(2, 0));
                const a = this.scrScn.analyzToken(doc.getText(r));
                if (!a)
                    return Promise.reject('No tag here.');
                token = a[0];
                r = r.with(undefined, doc.positionAt(doc.offsetAt(r.start) + token.length));
                if (!new vscode_1.Range(r.start.translate(0, 1), r.end.translate(0, -1)).contains(pos))
                    return Promise.reject('Out of tag.');
                this.rngPreTag = r;
            }
            else {
                const r = (_a = aUse.find(o => o.rng.contains(pos))) === null || _a === void 0 ? void 0 : _a.rng;
                if (!r)
                    return Promise.reject('No args here.');
                this.rngPreTag = r.with(undefined, r.end.translate(0, 1));
                token = doc.getText(this.rngPreTag);
            }
            const a_tag = ScriptScanner_1.ScriptScanner.analyzTagArg(token);
            const g = a_tag === null || a_tag === void 0 ? void 0 : a_tag.groups;
            if (!g)
                return Promise.reject('No args here.');
            const nm = g.name;
            const loc = this.scrScn.hMacro[nm];
            if (loc) {
                return Promise.reject(`[${nm}] マクロです 定義ファイル：${loc.uri.path.slice(this.lenRootPath)}`);
            }
            const md = hMd[nm];
            if (!md)
                return Promise.reject('Nothing md file.');
            if (!shc.isRetrigger) {
                const sh = new vscode_1.SignatureHelp();
                const ad = this.hArgDesc[nm];
                let label = `[${nm}`;
                const aSiP = [];
                if (md.param.length > 0 && md.param[0].name != '')
                    md.param
                        .forEach(prm => {
                        const p = `${prm.name}=${prm.required ? '【必須】' : `%${prm.name}|${prm.default}`}`;
                        label += ' ' + p;
                        aSiP.push(new vscode_1.ParameterInformation(p, new vscode_1.MarkdownString(prm.comment)));
                    });
                const si = new vscode_1.SignatureInformation(label + ']', ad.doc);
                si.parameters = aSiP;
                sh.signatures = [si];
                this.preSigHelp = sh;
            }
            const r = doc.getWordRangeAtPosition(pos, CodingSupporter.REG_FIELD);
            this.preSigHelp.activeParameter = (r)
                ? this.searchArgName(doc.getText(r), md)
                : -1;
            return this.preSigHelp;
        }
        searchArgName(inp, md) {
            const includesEq = inp.search(/(?<=[^=]+)=/);
            if (includesEq == -1) {
                const reg = new RegExp(`^${inp.replace(/=.*$/, '')}`);
                return md.param.findIndex(p => reg.test(p.name));
            }
            const arg_nm = inp.slice(0, includesEq);
            return md.param.findIndex(p => p.name == arg_nm);
        }
        provideDocumentSymbols(doc, _token) {
            const path = doc.uri.path;
            if (doc.isDirty && (path in this.hScr2Pro))
                return new Promise(rs => this.hRsvNm2Then['アウトライン'] = () => {
                    var _a;
                    rs((_a = this.scrScn.hSn2aDsOutline[path]) !== null && _a !== void 0 ? _a : []);
                });
            this.hScr2Pro[path] = 1;
            return new Promise(rs => { var _a; return rs((_a = this.scrScn.hSn2aDsOutline[path]) !== null && _a !== void 0 ? _a : []); });
        }
        setHDefPlg(hDefPlg) { this.scrScn.hPlugin = hDefPlg; }
        setEscape(ce) { this.scrScn.setEscape(ce); }
        compare(a, b) {
            const aStr = a.label + a.description;
            const bStr = b.label + b.description;
            return aStr > bStr ? 1 : aStr === bStr ? 0 : -1;
        }
    }
    CodingSupporter.pickItems = [];
    CodingSupporter.hTag = {};
    CodingSupporter.hSnippet = {};
    CodingSupporter.CMD_SCANSCR_TRGPARAMHINTS = 'extension.skynovel.scanScr_trgParamHints';
    CodingSupporter.regTagName = /[^\s\[\]="'#;]+/;
    CodingSupporter.REG_FIELD = /(?<=\s)[^\s=[\]]+(?:=(?:[^"'#\s;\]]+|(["'#]).*?\1)?)?/;
    return CodingSupporter;
})();
exports.CodingSupporter = CodingSupporter;
//# sourceMappingURL=CodingSupporter.js.map