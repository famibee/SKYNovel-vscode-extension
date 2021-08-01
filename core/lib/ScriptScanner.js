"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScriptScanner = void 0;
const CmnLib_1 = require("./CmnLib");
const AnalyzeTagArg_1 = require("./AnalyzeTagArg");
const Debugger_1 = require("./Debugger");
const CteScore_1 = require("./CteScore");
const vscode_1 = require("vscode");
const fs = require("fs-extra");
;
class ScriptScanner {
    constructor(curPrj, clDiag, hTag) {
        this.curPrj = curPrj;
        this.clDiag = clDiag;
        this.hTag = hTag;
        this.hPlugin = {};
        this.hMacro = {};
        this.hMacroUse = {};
        this.hMacroUse4NoWarm = {};
        this.hTagMacroUse = {};
        this.hSetWords = {
            '代入変数名': new Set,
            'ジャンプ先': new Set,
            'レイヤ名': new Set,
            '文字レイヤ名': new Set,
            '画像レイヤ名': new Set,
            'マクロ名': new Set,
            'スクリプトファイル名': new Set,
            '画像ファイル名': new Set,
            '音声ファイル名': new Set,
            'HTMLファイル名': new Set,
            '差分名称': new Set,
            'フレーム名': new Set,
            'サウンドバッファ': new Set,
            '文字出現演出名': new Set,
            '文字消去演出名': new Set,
        };
        this.cnvSnippet = (s, _cur_fn) => s;
        this.hPreWords = {
            'イベント名': `|Click,RightClick,MiddleClick,UpWheel,DownWheel,Control,Alt,Meta,Backspace,Enter,=,A,alt+A,ctrl+A,shift+A,alt+ctrl+A,ctrl+shift+A,alt+shift+A,alt+ctrl+shift+A,' ',ArrowLeft,ArrowRight,ArrowUp,ArrowDown,Tab,Delete,Home,End,PageUp,PageDown|`,
            'animation-timing-function': '|ease,ease-in,ease-out,ease-in-out,linear,step-start,step-end,cubic-bezier(...)|',
            'イージング名': '|Back.In,Back.InOut,Back.Out,Bounce.In,Bounce.InOut,Bounce.Out,Circular.In,Circular.InOut,Circular.Out,Cubic.In,Cubic.InOut,Cubic.Out,Elastic.In,Elastic.InOut,Elastic.Out,Exponential.In,Exponential.InOut,Exponential.Out,Linear.None,Quadratic.In,Quadratic.InOut,Quadratic.Out,Quartic.In,Quartic.InOut,Quartic.Out,Quintic.In,Quintic.InOut,Quintic.Out,Sinusoidal.In,Sinusoidal.InOut,Sinusoidal.Out|',
            'ブレンドモード名': '|normal,add,multiply,screen|',
        };
        this.hFn2JumpSnippet = {};
        this.nm2Diag = {};
        this.isDuplicateMacroDef = false;
        this.wasDuplicateMacroDef = false;
        this.hSn2aDsOutline = {};
        this.hScr2KeyWord = {};
        this.hMacroOld = {};
        this.aMacroAdd = [];
        this.alzTagArg = new AnalyzeTagArg_1.AnalyzeTagArg;
        this.fncToken = this.procToken;
        this.hTagProc = {
            'let_ml': (setKw) => {
                this.fncToken = (p, token) => {
                    const len2 = token.length;
                    let lineTkn = 0;
                    let j = -1;
                    while ((j = token.indexOf('\n', j + 1)) >= 0)
                        ++lineTkn;
                    if (lineTkn === 0)
                        p.col += len2;
                    else {
                        p.line += lineTkn;
                        p.col = len2 - token.lastIndexOf('\n') - 1;
                    }
                    this.fncToken = this.procToken;
                };
                const v = this.alzTagArg.hPrm.name?.val;
                if (v && v.charAt(0) !== '&') {
                    setKw.add(`代入変数名\t${v}`);
                    this.hSetWords['代入変数名'].add(v);
                }
            },
            'macro': (_setKw, uri, token, rngp1, diags, p, lineTkn, rng_nm) => {
                const hPrm = this.alzTagArg.hPrm;
                const def_nm = hPrm.name?.val;
                if (!def_nm) {
                    diags.push(new vscode_1.Diagnostic(rngp1, `マクロ定義[${def_nm}]の属性が異常です`, vscode_1.DiagnosticSeverity.Error));
                    return;
                }
                if (this.hTag[def_nm]) {
                    diags.push(new vscode_1.Diagnostic(rngp1, `定義済みのタグ[${def_nm}]と同名のマクロは定義できません`, vscode_1.DiagnosticSeverity.Error));
                    return;
                }
                if (this.hPlugin[def_nm]) {
                    diags.push(new vscode_1.Diagnostic(rngp1, `プラグイン定義済みのタグ[${def_nm}]と同名のマクロは定義できません`, vscode_1.DiagnosticSeverity.Error));
                    return;
                }
                const m = this.hMacro[def_nm];
                if (!m) {
                    const m2 = token.match(ScriptScanner.regValName);
                    if (!m2) {
                        diags.push(new vscode_1.Diagnostic(rngp1, `マクロ定義（[${def_nm}]）が異常です`, vscode_1.DiagnosticSeverity.Error));
                        return;
                    }
                    const idx_name_v = (m2.index ?? 0) + (m2[3] ? 1 : 0);
                    let lineNmVal = 0;
                    let j = idx_name_v;
                    while ((j = token.lastIndexOf('\n', j - 1)) >= 0)
                        ++lineNmVal;
                    const line2 = p.line - lineTkn + lineNmVal;
                    const col2 = ((lineNmVal === 0) ? p.col - token.length : 0)
                        + idx_name_v - token.lastIndexOf('\n', idx_name_v) - 1;
                    const rng2 = new vscode_1.Range(line2, col2, line2, col2 + def_nm.length);
                    this.hMacro[def_nm] = {
                        loc: new vscode_1.Location(uri, rng2),
                        hPrm: hPrm,
                    };
                    this.aMacroAdd.push(def_nm);
                    const ds = new vscode_1.DocumentSymbol(def_nm, 'マクロ定義', vscode_1.SymbolKind.Class, rng2, rng2);
                    this.aDsOutline.push(ds);
                    this.aDsOutlineStack.push(this.aDsOutline);
                    this.aDsOutline = ds.children;
                    if ('nowarn_unused' in hPrm) {
                        if (CmnLib_1.chkBoolean(hPrm.nowarn_unused.val))
                            this.hMacroUse4NoWarm[def_nm] = [new vscode_1.Location(uri, rng2)];
                        else
                            delete this.hMacroUse4NoWarm[def_nm];
                    }
                    if (uri.path.slice(-4) === '.ssn') {
                        const o = {};
                        for (const k in hPrm)
                            o[k] = String(hPrm[k].val);
                        this.cteScore.defMacro(def_nm, o);
                    }
                    return;
                }
                this.isDuplicateMacroDef = true;
                if (!diags.find(d => d.range === m.loc.range)) {
                    const dia = new vscode_1.Diagnostic(m.loc.range, `マクロ定義（[${def_nm}]）が重複`, vscode_1.DiagnosticSeverity.Error);
                    if (m.loc.uri === uri)
                        diags.push(dia);
                    else
                        this.clDiag.set(m.loc.uri, [dia]);
                }
                diags.push(new vscode_1.Diagnostic(rng_nm.with({ end: new vscode_1.Position(p.line, p.col + def_nm.length) }), `マクロ定義（[${def_nm}]）が重複`, vscode_1.DiagnosticSeverity.Error));
            },
            'endmacro': () => this.aDsOutline = this.aDsOutlineStack.pop() ?? [],
            'if': (_setKw, _uri, token, rng) => {
                const ds = new vscode_1.DocumentSymbol(token, '', vscode_1.SymbolKind.Function, rng, rng);
                this.aDsOutline.push(ds);
                this.aDsOutlineStack.push(this.aDsOutline);
                this.aDsOutline = ds.children;
            },
            'elsif': (setKw, uri, token, rng, diags, p, lineTkn, rng_nm) => {
                this.hTagProc['if'](setKw, uri, token, rng, diags, p, lineTkn, rng_nm);
                this.aDsOutline = this.aDsOutlineStack.pop() ?? [];
            },
            'endif': () => this.aDsOutline = this.aDsOutlineStack.pop() ?? [],
            's': (_setKw, _uri, token, rng) => {
                this.aDsOutline.push(new vscode_1.DocumentSymbol(token, '', vscode_1.SymbolKind.Function, rng, rng));
            },
            'let': (setKw) => {
                const v = this.alzTagArg.hPrm.name?.val;
                if (v && v.charAt(0) !== '&') {
                    this.hSetWords['代入変数名'].add(v);
                    setKw.add(`代入変数名\t${v}`);
                }
            },
            'add_frame': (setKw) => {
                const v = this.alzTagArg.hPrm.id?.val;
                if (v && v.charAt(0) !== '&') {
                    this.hSetWords['フレーム名'].add(v);
                    setKw.add(`フレーム名\t${v}`);
                }
            },
            'playbgm': (setKw) => {
                this.hSetWords['サウンドバッファ'].add('BGM');
                setKw.add(`サウンドバッファ\tBGM`);
            },
            'playse': (setKw) => {
                const v = this.alzTagArg.hPrm.buf?.val ?? 'SE';
                if (v && v.charAt(0) !== '&') {
                    this.hSetWords['サウンドバッファ'].add(v);
                }
                ;
                setKw.add(`サウンドバッファ\t${v}`);
            },
            'button': (setKw) => {
                const c = this.alzTagArg.hPrm.clicksebuf?.val ?? 'SYS';
                if (c && c.charAt(0) !== '&') {
                    this.hSetWords['サウンドバッファ'].add(c);
                }
                ;
                setKw.add(`サウンドバッファ\t${c}`);
                const e = this.alzTagArg.hPrm.entersebuf?.val ?? 'SYS';
                if (e && e.charAt(0) !== '&') {
                    this.hSetWords['サウンドバッファ'].add(e);
                }
                ;
                setKw.add(`サウンドバッファ\t${e}`);
                const l = this.alzTagArg.hPrm.leavesebuf?.val ?? 'SYS';
                if (l && l.charAt(0) !== '&') {
                    this.hSetWords['サウンドバッファ'].add(l);
                }
                ;
                setKw.add(`サウンドバッファ\t${l}`);
            },
            'link': (setKw) => {
                const c = this.alzTagArg.hPrm.clicksebuf?.val ?? 'SYS';
                if (c && c.charAt(0) !== '&') {
                    this.hSetWords['サウンドバッファ'].add(c);
                }
                ;
                setKw.add(`サウンドバッファ\t${c}`);
                const e = this.alzTagArg.hPrm.entersebuf?.val ?? 'SYS';
                if (e && e.charAt(0) !== '&') {
                    this.hSetWords['サウンドバッファ'].add(e);
                }
                ;
                setKw.add(`サウンドバッファ\t${e}`);
                const l = this.alzTagArg.hPrm.leavesebuf?.val ?? 'SYS';
                if (l && l.charAt(0) !== '&') {
                    this.hSetWords['サウンドバッファ'].add(l);
                }
                ;
                setKw.add(`サウンドバッファ\t${l}`);
            },
            'ch_in_style': (setKw) => {
                const v = this.alzTagArg.hPrm.name?.val;
                if (v && v.charAt(0) !== '&') {
                    this.hSetWords['文字出現演出名'].add(v);
                    setKw.add(`文字出現演出名\t${v}`);
                }
            },
            'ch_out_style': (setKw) => {
                const v = this.alzTagArg.hPrm.name?.val;
                if (v && v.charAt(0) !== '&') {
                    this.hSetWords['文字消去演出名'].add(v);
                    setKw.add(`文字消去演出名\t${v}`);
                }
            },
            'add_lay': (setKw) => {
                const v = this.alzTagArg.hPrm.layer?.val;
                if (!v)
                    return;
                this.hSetWords['レイヤ名'].add(v);
                setKw.add(`レイヤ名\t${v}`);
                const cls = this.alzTagArg.hPrm.class?.val;
                const kwn = `${cls === 'grp' ? '画像' : '文字'}レイヤ名`;
                this.hSetWords[kwn].add(v);
                setKw.add(`${kwn}\t${v}`);
            },
            'add_face': (setKw) => {
                const v = this.alzTagArg.hPrm.name?.val;
                if (v && v.charAt(0) !== '&') {
                    this.hSetWords['差分名称'].add(v);
                    setKw.add(`差分名称\t${v}`);
                }
            },
        };
        this.aDsOutlineStack = [];
        this.hTagProc['let_abs'] =
            this.hTagProc['let_char_at'] =
                this.hTagProc['let_index_of'] =
                    this.hTagProc['let_length'] =
                        this.hTagProc['let_replace'] =
                            this.hTagProc['let_round'] =
                                this.hTagProc['let_search'] =
                                    this.hTagProc['let_substr'] = this.hTagProc['let'];
        this.hTagProc['set_frame'] = this.hTagProc['let_frame'];
        this.hTagProc['jump'] =
            this.hTagProc['call'] =
                this.hTagProc['event'] =
                    this.hTagProc['button'] =
                        this.hTagProc['link'] =
                            this.hTagProc['return'] = this.hTagProc['s'];
        this.hTagProc['else'] = this.hTagProc['elsif'];
        this.cteScore = new CteScore_1.CteScore(curPrj);
    }
    bldCnvSnippet() {
        let eq = true;
        const mn = this.hSetWords['マクロ名'];
        mn.clear();
        for (const mm in this.hMacro)
            mn.add(mm);
        this.hSetWords['代入変数名'].add(ScriptScanner.sPredefWrtVar);
        this.hSetWords['文字出現演出名'].add('default');
        this.hSetWords['文字消去演出名'].add('default');
        for (const key in this.hSetWords) {
            const set = this.hSetWords[key];
            const str = `|${[...set.values()].sort().join(',')}|`;
            if (this.hPreWords[key] !== str) {
                eq = false;
                this.cteScore.updWords(key, set);
            }
            this.hPreWords[key] = (str === '||') ? `:${key}` : str;
        }
        if (eq)
            return;
        this.hFn2JumpSnippet = {};
        this.cnvSnippet = (s, cur_fn) => {
            const bk = this.hPreWords['ジャンプ先'];
            const jsn = this.hFn2JumpSnippet[cur_fn];
            this.hPreWords['ジャンプ先'] = jsn ?? (() => {
                if (typeof bk !== 'string')
                    return 'ジャンプ先';
                let cur_sn = '';
                const sn = (bk.slice(1, -1) + ',').replace(new RegExp(`fn=${cur_fn},(?:fn=${cur_fn} [^,|]+,)*`), m => { cur_sn = m; return ''; });
                return this.hFn2JumpSnippet[cur_fn]
                    = `|${(cur_sn + sn).slice(0, -1)}|`;
            })();
            const ret = s.replace(/{{([^\}]+)}}/g, (_, p) => this.hPreWords[p]);
            this.hPreWords['ジャンプ先'] = bk;
            return ret;
        };
    }
    goAll() {
        this.isDuplicateMacroDef = false;
        this.hMacro = {};
        this.hMacroUse = {};
        this.hMacroUse4NoWarm = {};
        this.hTagMacroUse = {};
        for (const key in this.hSetWords)
            this.hSetWords[key] = new Set;
        this.clDiag.clear();
        this.nm2Diag = {};
        this.hScr2KeyWord = {};
        this.hSn2aDsOutline = {};
        CmnLib_1.treeProc(this.curPrj, url => this.scanFile(vscode_1.Uri.file(url)));
        const mu = { ...this.hMacroUse, ...this.hMacroUse4NoWarm };
        for (const def_nm in this.hMacro) {
            if (def_nm in mu)
                continue;
            const m = this.hMacro[def_nm];
            this.nm2Diag[m.loc.uri.path].push(new vscode_1.Diagnostic(m.loc.range, `未使用のマクロ[${def_nm}]があります`, vscode_1.DiagnosticSeverity.Information));
        }
        for (const use_nm in this.hMacroUse) {
            if (use_nm in this.hMacro)
                continue;
            if (use_nm in this.hPlugin)
                continue;
            const aLoc = this.hMacroUse[use_nm];
            aLoc.forEach(loc => this.nm2Diag[loc.uri.path].push(new vscode_1.Diagnostic(loc.range, `未定義マクロ[${use_nm}]を使用、あるいはスペルミスです`, vscode_1.DiagnosticSeverity.Warning)));
        }
        for (const path in this.nm2Diag) {
            this.clDiag.set(vscode_1.Uri.file(path), this.nm2Diag[path]);
        }
        if (this.isDuplicateMacroDef && !this.wasDuplicateMacroDef)
            vscode_1.window.showErrorMessage(`[SKYNovel] プロジェクト内でマクロ定義が重複しています。どちらか削除して下さい`, { modal: true });
        this.wasDuplicateMacroDef = this.isDuplicateMacroDef;
        this.bldCnvSnippet();
    }
    goFile(uri) {
        this.goInitFile(uri);
        this.scanFile(uri);
        this.goFinishFile(uri);
    }
    goScriptSrc(aChgTxt) {
        const hDoc = {};
        const hUpdScore = {};
        aChgTxt.forEach(e => {
            const doc = e.document;
            const path = doc.fileName;
            const isSn = path.slice(-3) === '.sn';
            const isSsn = path.slice(-4) === '.ssn';
            if (!isSn && !isSsn)
                return;
            hDoc[path] = doc;
            if (isSn) {
                Debugger_1.Debugger.noticeChgDoc(this.curPrj, e);
                return;
            }
            if (!isSsn)
                return;
            this.cteScore.separation(path);
            e.contentChanges.forEach(c => {
                const sl = c.range.start.line;
                const el = c.range.end.line;
                const text = (sl === el && c.text.slice(-1) !== '\n')
                    ? doc.lineAt(sl).text
                    : c.text;
                hUpdScore[path] || (hUpdScore[path] = this.cteScore.updLine(doc, c.range, text, this.resolveScript(text).aToken));
            });
            this.cteScore.combining(path);
        });
        for (const path in hDoc) {
            const doc = hDoc[path];
            const uri = doc.uri;
            this.goInitFile(uri);
            const old = this.hScr2KeyWord[path];
            this.hScr2KeyWord[path] = new Set;
            this.scanScriptSrc(uri, doc.getText(), hUpdScore[path]);
            this.goFinishFile(uri);
            const now = this.hScr2KeyWord[path];
            for (const s of old) {
                if (now.has(s))
                    continue;
                let findOther = false;
                for (const path_other in this.hScr2KeyWord) {
                    if (path_other === path)
                        continue;
                    if (findOther = this.hScr2KeyWord[path_other].has(s))
                        break;
                }
                if (findOther)
                    continue;
                const a = s.split('\t');
                this.hSetWords[a[0]].delete(a[1]);
            }
        }
    }
    goInitFile(uri) {
        this.isDuplicateMacroDef = false;
        const path = uri.path;
        const hMD = {};
        const hMacroOld = {};
        for (const nm in this.hMacro) {
            const m = this.hMacro[nm];
            if (m.loc.uri.path !== path)
                hMD[nm] = m;
            else {
                hMacroOld[nm] = m;
                this.cteScore.undefMacro(nm);
            }
        }
        this.hMacro = hMD;
        this.hMacroOld = hMacroOld;
        this.aMacroAdd = [];
        const hMU = {};
        for (const nm in this.hMacroUse)
            this.hMacroUse[nm].forEach(loc => {
                if (loc.uri.path !== path)
                    (hMU[nm] ?? (hMU[nm] = [])).push(loc);
            });
        this.hMacroUse = hMU;
        const hMU4NW = {};
        for (const nm in this.hMacroUse4NoWarm)
            this.hMacroUse4NoWarm[nm]
                .forEach(loc => {
                if (loc.uri.path !== path)
                    (hMU4NW[nm] ?? (hMU4NW[nm] = [])).push(loc);
            });
        this.hMacroUse4NoWarm = hMU4NW;
        this.hTagMacroUse[path] = [];
        this.clDiag.delete(uri);
        this.nm2Diag[path] = [];
    }
    goFinishFile(uri) {
        const path = uri.path;
        const mu = { ...this.hMacroUse, ...this.hMacroUse4NoWarm };
        for (const def_nm in this.hMacro) {
            if (def_nm in mu)
                continue;
            const m = this.hMacro[def_nm];
            if (m.loc.uri.path !== path)
                continue;
            this.nm2Diag[path].push(new vscode_1.Diagnostic(m.loc.range, `未使用のマクロ[${def_nm}]があります`, vscode_1.DiagnosticSeverity.Information));
        }
        for (const use_nm in this.hMacroUse) {
            if (use_nm in this.hMacro)
                continue;
            if (use_nm in this.hPlugin)
                continue;
            const aLoc = this.hMacroUse[use_nm];
            aLoc.forEach(loc => {
                if (loc.uri.path !== path)
                    return;
                this.nm2Diag[path].push(new vscode_1.Diagnostic(loc.range, `未定義マクロ[${use_nm}]を使用、あるいはスペルミスです`, vscode_1.DiagnosticSeverity.Warning));
            });
        }
        if (path.slice(-4) === '.ssn') {
            const doc = vscode_1.workspace.textDocuments.find(td => td.fileName === uri.fsPath);
            if (doc) {
                const hMacroOld = this.hMacroOld;
                for (const nm in hMacroOld) {
                    if (!(nm in this.hMacro)
                        || Object.entries(this.hMacro[nm].hPrm).sort().join()
                            !== Object.entries(hMacroOld[nm].hPrm).sort().join())
                        this.hMacroUse[nm]?.forEach(loc => {
                            const txt = doc.lineAt(loc.range.start.line).text.trim();
                            this.cteScore.updLine(doc, loc.range, txt, this.resolveScript(txt).aToken);
                        });
                }
                this.aMacroAdd.forEach(nm => this.hMacroUse[nm]?.forEach(loc => {
                    const txt = doc.lineAt(loc.range.start.line).text.trim();
                    this.cteScore.updLine(doc, loc.range, txt, this.resolveScript(txt).aToken);
                }));
            }
        }
        this.clDiag.set(uri, this.nm2Diag[path]);
        if (this.isDuplicateMacroDef && !this.wasDuplicateMacroDef)
            vscode_1.window.showErrorMessage(`[SKYNovel] プロジェクト内でマクロ定義が重複しています。どちらか削除して下さい`, { modal: true });
        this.wasDuplicateMacroDef = this.isDuplicateMacroDef;
        this.bldCnvSnippet();
    }
    isSkipUpd(path) {
        if (path.slice(-4) !== '.ssn')
            return false;
        return this.cteScore.isSkipUpd(path);
    }
    scanFile(uri) {
        var _a, _b, _c;
        const path = uri.path;
        const fn = CmnLib_1.getFn(path);
        if (!CmnLib_1.REG_SCRIPT.test(path)) {
            if (ScriptScanner.REG_SPRITE.test(path)) {
                if (ScriptScanner.REG_NOSPR.test(path))
                    return;
                this.hSetWords['画像ファイル名'].add(fn);
            }
            else if (ScriptScanner.REG_SOUND.test(path)) {
                this.hSetWords['音声ファイル名'].add(fn);
            }
            else if (ScriptScanner.REG_HTML.test(path)) {
                this.hSetWords['HTMLファイル名'].add(fn);
            }
            return;
        }
        this.hSetWords['スクリプトファイル名'].add(fn);
        (_a = this.nm2Diag)[path] ?? (_a[path] = []);
        this.hSetWords['ジャンプ先'].add(`fn=${fn}`);
        (_b = this.hTagMacroUse)[path] ?? (_b[path] = []);
        (_c = this.hScr2KeyWord)[path] ?? (_c[path] = new Set());
        const td = vscode_1.workspace.textDocuments.find(td => td.fileName === uri.fsPath);
        this.scanScriptSrc(uri, td?.getText() ?? fs.readFileSync(uri.fsPath, { encoding: 'utf8' }), true);
    }
    updPath(hPath) { this.cteScore.updPath(hPath); }
    scanScriptSrc(uri, src, isUpdScore) {
        const path = uri.path;
        const diags = this.nm2Diag[path];
        const hLabel = {};
        const setKw = this.hScr2KeyWord[path];
        this.aDsOutline = this.hSn2aDsOutline[path] = [];
        this.fncToken = this.procToken = (p, token) => {
            const uc = token.charCodeAt(0);
            const len = token.length;
            if (uc === 9) {
                p.col += len;
                return;
            }
            if (uc === 10) {
                p.line += len;
                p.col = 0;
                return;
            }
            if (uc === 38) {
                p.col += len;
                if (token.substr(-1) === '&')
                    return;
                try {
                    const o = ScriptScanner.splitAmpersand(token.slice(1));
                    if (o.name.charAt(0) !== '&') {
                        const kw = o.name.trimEnd();
                        this.hSetWords['代入変数名'].add(kw);
                        setKw.add(`代入変数名\t${kw}`);
                    }
                }
                catch { }
                return;
            }
            if (uc === 59) {
                p.col += len;
                return;
            }
            const rng = new vscode_1.Range(p.line, p.col, p.line, p.col + len);
            if ((uc === 42) && (token.length > 1)) {
                p.col += len;
                const kw = `fn=${CmnLib_1.getFn(path)} label=${token}`;
                this.hSetWords['ジャンプ先'].add(kw);
                setKw.add(`ジャンプ先\t${kw}`);
                this.aDsOutline.push(new vscode_1.DocumentSymbol(token, '', vscode_1.SymbolKind.Key, rng, rng));
                if (token.charAt(1) === '*')
                    return;
                if (token in hLabel) {
                    const rng0 = hLabel[token];
                    if (rng0) {
                        diags.push(new vscode_1.Diagnostic(rng0, `同一スクリプトにラベル【${token}】が重複しています`, vscode_1.DiagnosticSeverity.Error));
                        hLabel[token] = null;
                    }
                    diags.push(new vscode_1.Diagnostic(rng, `同一スクリプトにラベル【${token}】が重複しています`, vscode_1.DiagnosticSeverity.Error));
                }
                else
                    hLabel[token] = rng;
                return;
            }
            if (uc !== 91) {
                p.col += len;
                this.aDsOutline.push(new vscode_1.DocumentSymbol(token, '', vscode_1.SymbolKind.String, rng, rng));
                return;
            }
            const a_tag = ScriptScanner.REG_TAG.exec(token);
            if (!a_tag) {
                diags.push(new vscode_1.Diagnostic(rng, `タグ記述【${token}】異常です`, vscode_1.DiagnosticSeverity.Error));
                p.col += len;
                return;
            }
            let lineTkn = 0;
            let j = -1;
            while ((j = token.indexOf('\n', j + 1)) >= 0)
                ++lineTkn;
            if (lineTkn <= 0)
                p.col += len;
            else {
                p.line += lineTkn;
                p.col = len - token.lastIndexOf('\n') - 1;
                if (lineTkn > 10)
                    diags.push(new vscode_1.Diagnostic(new vscode_1.Range(rng.start.line, rng.start.character - 1, p.line, 0), `改行タグが10行を超えています`, vscode_1.DiagnosticSeverity.Warning));
            }
            const use_nm = a_tag.groups?.name ?? '';
            this.hTagMacroUse[path].push({ nm: use_nm, rng: rng.with(undefined, new vscode_1.Position(p.line, p.col))
            });
            if (use_nm in this.hPlugin)
                return;
            const rng_nm = new vscode_1.Range(rng.start, rng.end.translate(0, use_nm.length - len));
            const rngp1 = new vscode_1.Range(rng_nm.start.translate(0, 1), rng_nm.end.translate(0, 1));
            if (!(use_nm in this.hTag)) {
                const mu = this.hMacroUse[use_nm] ?? [];
                mu.push(new vscode_1.Location(uri, rngp1));
                this.hMacroUse[use_nm] = mu;
                return;
            }
            const fnc = this.hTagProc[use_nm];
            if (fnc) {
                this.alzTagArg.go(a_tag.groups?.args ?? '');
                fnc(setKw, uri, token, rngp1, diags, p, lineTkn, rng_nm);
            }
        };
        const p = { line: 0, col: 0 };
        const a = this.resolveScript(src.trim()).aToken;
        a.forEach(token => { if (token)
            this.fncToken(p, token); });
        if (isUpdScore && path.slice(-4) === '.ssn')
            this.cteScore.updScore(path, this.curPrj, a);
    }
    procToken(_p, _token) { }
    static splitAmpersand(token) {
        const equa = token.replace(/==/g, '＝').replace(/!=/g, '≠').split('=');
        const cnt_equa = equa.length;
        if (cnt_equa < 2 || cnt_equa > 3)
            throw '「&計算」書式では「=」指定が一つか二つ必要です';
        if (equa[1].charAt(0) === '&')
            throw '「&計算」書式では「&」指定が不要です';
        return {
            name: equa[0].replace(/＝/g, '==').replace(/≠/g, '!='),
            text: equa[1].replace(/＝/g, '==').replace(/≠/g, '!='),
            cast: ((cnt_equa === 3) ? equa[2].trim() : null)
        };
    }
    resolveScript(txt) {
        const a = txt
            .replace(/(\r\n|\r)/g, '\n')
            .match(this.REG_TOKEN) ?? [];
        for (let i = a.length - 1; i >= 0; --i) {
            const t = a[i];
            if (ScriptScanner.REG_TAG_LET_ML.test(t)) {
                const idx = t.indexOf(']') + 1;
                if (idx === 0)
                    throw '[let_ml]で閉じる【]】がありません';
                const s = t.slice(0, idx);
                const e = t.slice(idx);
                a.splice(i, 1, s, e);
            }
        }
        const scr = { aToken: a, len: a.length, aLNum: [] };
        this.replaceScript_let_ml(scr);
        return scr;
    }
    replaceScript_let_ml(scr, start_idx = 0) {
        for (let i = scr.len - 1; i >= start_idx; --i) {
            const token = scr.aToken[i];
            if (ScriptScanner.REG_TAG_LET_ML.test(token)) {
                const idxSpl = token.indexOf(']') + 1;
                const ml = token.slice(idxSpl);
                const cnt = (ml.match(/\n/g) ?? []).length;
                scr.aToken.splice(i, 1, token.slice(0, idxSpl), ml);
                scr.aLNum.splice(i, 0, scr.aLNum[i]);
                const len = scr.aToken.length;
                for (let j = i + 2; j < len; ++j)
                    scr.aLNum[j] += cnt;
            }
        }
        scr.len = scr.aToken.length;
    }
    analyzToken(token) {
        this.REG_TOKEN.lastIndex = 0;
        return this.REG_TOKEN.exec(token);
    }
    setEscape(ce) {
        this.REG_TOKEN = new RegExp((ce ? `\\${ce}\\S|` : '') +
            '\\n+' +
            '|\\t+' +
            `|\\[let_ml\\s+[^\\]]+\\]` +
            `.+?` +
            `(?=\\[endlet_ml[\\]\\s])` +
            `|\\[(?:[^"'#;\\]]+|(["'#]).*?\\1|;[^\\n]*)*?]` +
            '|;[^\\n]*' +
            '|&[^&\\n]+&' +
            '|&&?[^;\\n\\t&]+' +
            '|^\\*\\w+' +
            `|[^\\n\\t\\[;${ce ? `\\${ce}` : ''}]+`, 'gs');
        this.goAll();
    }
}
exports.ScriptScanner = ScriptScanner;
ScriptScanner.sPredefWrtVar = `const.Date.getDateStr
const.Date.getTime
const.sn.bookmark.json
const.sn.config.（略）
const.sn.displayState
const.sn.frm.（フレーム名）
const.sn.frm.（フレーム名）.alpha
const.sn.frm.（フレーム名）.height
const.sn.frm.（フレーム名）.rotate
const.sn.frm.（フレーム名）.scale_x
const.sn.frm.（フレーム名）.scale_y
const.sn.frm.（フレーム名）.visible
const.sn.frm.（フレーム名）.width
const.sn.frm.（フレーム名）.x
const.sn.frm.（フレーム名）.y
const.sn.isApp
const.sn.isDarkMode
const.sn.isDbg
const.sn.isDebugger
const.sn.isFirstBoot
const.sn.isKidoku
const.sn.isPackaged
const.sn.key.alternate
const.sn.key.back
const.sn.key.command
const.sn.key.control
const.sn.key.end
const.sn.key.escape
const.sn.last_page_text
const.sn.lay.（レイヤ名）
const.sn.lay.（レイヤ名）.（foreかback）.alpha
const.sn.lay.（レイヤ名）.（foreかback）.height
const.sn.lay.（レイヤ名）.（foreかback）.visible
const.sn.lay.（レイヤ名）.（foreかback）.width
const.sn.lay.（レイヤ名）.（foreかback）.x
const.sn.lay.（レイヤ名）.（foreかback）.y
const.sn.log.json
const.sn.Math.PI
const.sn.needClick2Play
const.sn.platform
const.sn.sound.codecs
const.sn.vctCallStk.length
save:const.sn.autowc.enabled
save:const.sn.autowc.text
save:const.sn.autowc.time
save:const.sn.layer.（文字レイヤ名）.enabled
save:const.sn.loopPlaying
save:const.sn.mesLayer
save:const.sn.scriptFn
save:const.sn.scriptIdx
save:const.sn.sLog
save:sn.doRecLog
sn.auto.enabled
sn.button.fontFamily
sn.event.domdata.（任意）
sn.eventArg
sn.eventLabel
sn.skip.all
sn.skip.enabled
sn.tagL.enabled
sys:const.sn.nativeWindow.x
sys:const.sn.nativeWindow.y
sys:const.sn.save.place
sys:const.sn.sound.BGM.volume
sys:const.sn.sound.SE.volume
sys:const.sn.sound.SYS.volume
sys:const.sn.sound.【buf】.volume
sys:sn.auto.msecLineWait
sys:sn.auto.msecLineWait_Kidoku
sys:sn.auto.msecPageWait
sys:sn.auto.msecPageWait_Kidoku
sys:sn.skip.mode
sys:sn.sound.global_volume
sys:sn.sound.movie_volume
sys:sn.tagCh.canskip
sys:sn.tagCh.doWait
sys:sn.tagCh.doWait_Kidoku
sys:sn.tagCh.msecWait
sys:sn.tagCh.msecWait_Kidoku
sys:TextLayer.Back.Alpha`.replace(/\n/g, ',');
ScriptScanner.REG_SPRITE = /\.(png|jpg|jpeg|json|svg|webp|mp4|webm)$/;
ScriptScanner.REG_NOSPR = /\/(path|prj)\.json$/;
ScriptScanner.REG_SOUND = /\.(mp3|m4a|ogg|aac|flac|wav)$/;
ScriptScanner.REG_HTML = /\.(htm|html)$/;
ScriptScanner.regValName = /(?<=name\s*=\s*)([^"'#;\]]+|(["'#])(.*?)\2)/m;
ScriptScanner.REG_TAG_LET_ML = /^\[let_ml\s/g;
ScriptScanner.REG_TAG = /\[(?<name>[^\s;\]]+)\s*(?<args>(?:[^"'#\]]+|(["'#]).*?\3)*?)]/;
ScriptScanner.analyzTagArg = (token) => ScriptScanner.REG_TAG.exec(token);
//# sourceMappingURL=ScriptScanner.js.map