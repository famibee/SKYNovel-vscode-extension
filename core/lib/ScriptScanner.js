"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const AnalyzeTagArg_1 = require("./AnalyzeTagArg");
const vscode_1 = require("vscode");
const m_xregexp = require("xregexp");
const fs = require('fs-extra');
;
function openTagRef(v) {
    vscode_1.commands.executeCommand('vscode.open', vscode_1.Uri.parse('https://famibee.github.io/SKYNovel/tag.htm#' + v.label));
}
;
class ScriptScanner {
    constructor(ctx, curPrj) {
        var _a;
        this.curPrj = curPrj;
        this.nm4rename = '';
        this.nm2Diag = {};
        this.hPlugin = {};
        this.hMacro = {};
        this.hMacroUse = {};
        this.alzTagArg = new AnalyzeTagArg_1.AnalyzeTagArg;
        this.loadCfg = () => ScriptScanner.pickItems.sort(this.compare).forEach(q => q.description += '（SKYNovel）');
        this.lenRootPath = ((_a = vscode_1.workspace.rootPath) !== null && _a !== void 0 ? _a : '').length + 1;
        if (!ScriptScanner.inited) {
            ScriptScanner.inited = true;
            ScriptScanner.pickItems.map(q => ScriptScanner.hTag[q.label] = true);
            ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.openReferencePallet', () => {
                const options = {
                    'placeHolder': 'Which reference will you open?',
                    'matchOnDescription': true,
                };
                vscode_1.window.showQuickPick(ScriptScanner.pickItems, options).then(q => { if (q)
                    openTagRef(q); });
            }));
        }
        this.loadCfg();
        ctx.subscriptions.push(vscode_1.workspace.onDidChangeConfiguration(() => this.loadCfg()));
        const doc_sel = { scheme: 'file', language: 'skynovel' };
        vscode_1.languages.registerHoverProvider(doc_sel, this);
        ctx.subscriptions.push(vscode_1.languages.registerDefinitionProvider(doc_sel, this));
        ctx.subscriptions.push(vscode_1.languages.registerReferenceProvider(doc_sel, this));
        ctx.subscriptions.push(vscode_1.languages.registerRenameProvider(doc_sel, this));
        this.clDiag = vscode_1.languages.createDiagnosticCollection('skynovel');
    }
    provideHover(doc, pos, _token) {
        const r = doc.getWordRangeAtPosition(pos, ScriptScanner.regTagName);
        if (!r)
            return Promise.reject('No word here.');
        const nm = doc.lineAt(pos.line).text.slice(r.start.character, r.end.character);
        const loc = this.hMacro[nm];
        if (loc)
            return new vscode_1.Hover(`[${nm}] マクロです 定義ファイル：${loc.uri.fsPath.slice(this.lenRootPath)}`);
        const locPlg = this.hPlugin[nm];
        if (locPlg)
            return new vscode_1.Hover(`[${nm}] プラグイン定義タグです 定義ファイル：${locPlg.uri.fsPath.slice(this.lenRootPath)}`);
        const q = ScriptScanner.pickItems.find(q => q.label == nm);
        if (q)
            return new vscode_1.Hover(`[${nm}] タグです 機能：${q.description}`);
        return Promise.reject('No word here.');
    }
    provideDefinition(doc, pos, _token) {
        const r = doc.getWordRangeAtPosition(pos, ScriptScanner.regTagName);
        if (!r)
            return Promise.reject('No word here.');
        const isDirty = doc.isDirty;
        return doc.save()
            .then(() => new Promise((re, rj) => {
            if (isDirty)
                this.scanAllScript();
            const nm = doc.lineAt(pos.line).text.slice(r.start.character, r.end.character);
            const loc = this.hMacro[nm];
            if (loc)
                return re(loc);
            const locPlg = this.hPlugin[nm];
            if (locPlg)
                return re(locPlg);
            const q = ScriptScanner.pickItems.find(q => q.label == nm);
            if (q) {
                openTagRef(q);
                return;
            }
            return rj('No definition found');
        }));
    }
    provideReferences(doc, pos, _ctx, _token) {
        const r = doc.getWordRangeAtPosition(pos, ScriptScanner.regTagName);
        if (!r)
            return Promise.reject('No word here.');
        const isDirty = doc.isDirty;
        return doc.save()
            .then(() => new Promise((re, rj) => {
            if (isDirty)
                this.scanAllScript();
            const nm = doc.lineAt(pos.line).text.slice(r.start.character, r.end.character);
            const loc = this.hMacroUse[nm];
            if (loc)
                return re(loc);
            return rj('No references found');
        }));
    }
    prepareRename(doc, pos, _token) {
        const r = doc.getWordRangeAtPosition(pos, ScriptScanner.regTagName);
        if (!r)
            return Promise.reject('No word here.');
        const isDirty = doc.isDirty;
        return doc.save()
            .then(() => new Promise((re, rj) => {
            if (isDirty)
                this.scanAllScript();
            const nm = doc.lineAt(pos.line).text.slice(r.start.character, r.end.character);
            if (nm in ScriptScanner.hTag)
                return rj('タグは変名できません');
            const mp = this.hPlugin[nm];
            if (mp) {
                this.nm4rename = nm;
                return re((doc.uri.path == mp.uri.path && mp.range.contains(pos))
                    ? mp.range
                    : r);
            }
            const m = this.hMacro[nm];
            if (!m)
                return rj('未定義マクロ・タグです');
            this.nm4rename = nm;
            return re((doc.uri.path == m.uri.path && m.range.contains(pos))
                ? m.range
                : r);
        }));
    }
    provideRenameEdits(_doc, _pos, newName, _token) {
        return new Promise((re, rj) => {
            if (/(\s|　)/.test(newName)) {
                rj('空白を含む変名はできません');
                return;
            }
            if (newName in ScriptScanner.hTag) {
                rj('既にあるタグ名です');
                return;
            }
            if (newName in this.hMacro) {
                rj('既にあるマクロ名です');
                return;
            }
            if (newName in this.hPlugin) {
                rj('既にあるプラグイン定義タグ名です');
                return;
            }
            const we = new vscode_1.WorkspaceEdit();
            const mu = this.hMacroUse[this.nm4rename];
            if (mu) {
                this.hMacroUse[newName] = mu;
                delete this.hMacroUse[this.nm4rename];
                mu.forEach(p => we.replace(p.uri, p.range, newName));
            }
            const mp = this.hPlugin[this.nm4rename];
            if (mp) {
                this.hPlugin[newName] = mp;
                delete this.hPlugin[this.nm4rename];
                we.replace(mp.uri, mp.range, newName);
                re(we);
                return;
            }
            const m = this.hMacro[this.nm4rename];
            this.hMacro[newName] = m;
            delete this.hMacro[this.nm4rename];
            we.replace(m.uri, m.range, newName);
            re(we);
        });
    }
    scanAllScript() {
        this.hMacro = {};
        this.hMacroUse = {};
        this.clDiag.clear();
        this.nm2Diag = {};
        CmnLib_1.treeProc(this.curPrj, url => this.scanScript(url));
        for (const def_nm in this.hMacro) {
            if (def_nm in this.hMacroUse)
                continue;
            const loc = this.hMacro[def_nm];
            this.nm2Diag[loc.uri.path].push(new vscode_1.Diagnostic(loc.range, `未使用のマクロ[${def_nm}]があります`, vscode_1.DiagnosticSeverity.Information));
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
    }
    setHDefPlg(hDefPlg) { this.hPlugin = hDefPlg; }
    crePrj(_e) { this.scanAllScript(); }
    chgPrj(_e) { this.scanAllScript(); }
    delPrj(_e) { this.scanAllScript(); }
    scanScript(url) {
        var _a;
        if (url.slice(-3) != '.sn')
            return;
        this.nm2Diag[url] = (_a = this.nm2Diag[url]) !== null && _a !== void 0 ? _a : [];
        const diags = this.nm2Diag[url];
        let show_mes = false;
        let line = 0, col = 0;
        const uri = vscode_1.Uri.file(url);
        let procToken = (token) => {
            var _a, _b, _c, _d;
            if (!token)
                return;
            const uc = token.charCodeAt(0);
            const len = token.length;
            if (uc == 10) {
                line += len;
                col = 0;
                return;
            }
            if (uc == 59) {
                const a = token.match(/#NO_WARM_UNUSED_MACRO\s+(\S+)/);
                if (a) {
                    const nm = a[1];
                    const mu = (_a = this.hMacroUse[nm]) !== null && _a !== void 0 ? _a : [];
                    const rng = new vscode_1.Range(line, col + 22, line, col + 22 + len);
                    mu.push(new vscode_1.Location(uri, rng));
                    this.hMacroUse[nm] = mu;
                }
                col += len;
                return;
            }
            if (uc != 91) {
                col += len;
                return;
            }
            const a_tag = m_xregexp.exec(token, ScriptScanner.REG_TAG);
            if (!a_tag) {
                const rng = new vscode_1.Range(line, col, line, col + len);
                diags.push(new vscode_1.Diagnostic(rng, `タグ記述【${token}】異常です`, vscode_1.DiagnosticSeverity.Error));
                col += len;
                return;
            }
            let lineTkn = 0;
            let j = -1;
            while ((j = token.indexOf('\n', j + 1)) >= 0)
                ++lineTkn;
            const rng_nm = new vscode_1.Range(line, col, line, col + a_tag.name.length);
            if (lineTkn <= 0)
                col += len;
            else {
                line += lineTkn;
                col = len - token.lastIndexOf('\n') - 1;
                if (lineTkn > 10)
                    diags.push(new vscode_1.Diagnostic(new vscode_1.Range(rng_nm.start.line, rng_nm.start.character - 1, line, 0), `改行タグが10行を超えています`, vscode_1.DiagnosticSeverity.Warning));
            }
            const rng = new vscode_1.Range(rng_nm.start.line, rng_nm.start.character + 1, rng_nm.end.line, rng_nm.end.character + 1);
            const use_nm = a_tag.name;
            if (use_nm != 'macro') {
                if (use_nm in ScriptScanner.hTag) {
                    if (use_nm == 'let_ml')
                        fncToken = tkn => {
                            if (!tkn)
                                return;
                            const lenTkn = tkn.length;
                            let lineTkn = 0;
                            let j = -1;
                            while ((j = tkn.indexOf('\n', j + 1)) >= 0)
                                ++lineTkn;
                            if (lineTkn == 0)
                                col += lenTkn;
                            else {
                                line += lineTkn;
                                col = lenTkn - tkn.lastIndexOf('\n') - 1;
                            }
                            fncToken = procToken;
                        };
                    return;
                }
                const mu = (_b = this.hMacroUse[use_nm]) !== null && _b !== void 0 ? _b : [];
                mu.push(new vscode_1.Location(uri, rng));
                this.hMacroUse[use_nm] = mu;
                return;
            }
            this.alzTagArg.go(a_tag.args);
            const def_nm = (_c = this.alzTagArg.hPrm.name) === null || _c === void 0 ? void 0 : _c.val;
            if (!def_nm) {
                diags.push(new vscode_1.Diagnostic(rng, `マクロ定義[${def_nm}]の引数が異常です`, vscode_1.DiagnosticSeverity.Error));
                return;
            }
            if (ScriptScanner.hTag[def_nm]) {
                diags.push(new vscode_1.Diagnostic(rng, `定義済みのタグ[${def_nm}]と同名のマクロは定義できません`, vscode_1.DiagnosticSeverity.Error));
                return;
            }
            if (this.hPlugin[def_nm]) {
                diags.push(new vscode_1.Diagnostic(rng, `プラグイン定義済みのタグ[${def_nm}]と同名のマクロは定義できません`, vscode_1.DiagnosticSeverity.Error));
                return;
            }
            const loc = this.hMacro[def_nm];
            if (!loc) {
                const m = token.match(ScriptScanner.regValName);
                if (!m) {
                    diags.push(new vscode_1.Diagnostic(rng, `マクロ定義（[${def_nm}]）が異常です`, vscode_1.DiagnosticSeverity.Error));
                    return;
                }
                const idx_name_v = ((_d = m.index) !== null && _d !== void 0 ? _d : 0) + (m[3] ? 1 : 0);
                let lineNmVal = 0;
                let j = idx_name_v;
                while ((j = token.lastIndexOf('\n', j - 1)) >= 0)
                    ++lineNmVal;
                const line2 = line - lineTkn + lineNmVal;
                const col2 = ((lineNmVal == 0) ? col - len : 0)
                    + idx_name_v - token.lastIndexOf('\n', idx_name_v) - 1;
                this.hMacro[def_nm] = new vscode_1.Location(vscode_1.Uri.file(url), new vscode_1.Range(line2, col2, line2, col2 + def_nm.length));
                return;
            }
            const dia = new vscode_1.Diagnostic(loc.range, `マクロ定義（[${def_nm}]）が重複`, vscode_1.DiagnosticSeverity.Error);
            if (!diags.find(d => d.range == loc.range)) {
                if (loc.uri.fsPath == url)
                    diags.push(dia);
                else
                    this.clDiag.set(loc.uri, [dia]);
            }
            diags.push(new vscode_1.Diagnostic(new vscode_1.Range(rng_nm.start, new vscode_1.Position(line, col)), `マクロ定義（[${def_nm}]）が重複`, vscode_1.DiagnosticSeverity.Error));
            if (show_mes)
                return;
            show_mes = true;
            vscode_1.window.showErrorMessage(`[SKYNovel] プロジェクト内でマクロ定義【${def_nm}】が重複しています。どちらか削除して下さい`, { modal: true });
        };
        let fncToken = procToken;
        this.resolveScript(fs.readFileSync(url, { encoding: 'utf8' })).aToken
            .forEach(token => fncToken(token));
    }
    compare(a, b) {
        const aStr = a.label + a.description;
        const bStr = b.label + b.description;
        return aStr > bStr ? 1 : aStr === bStr ? 0 : -1;
    }
    resolveScript(txt) {
        var _a;
        const a = (_a = txt
            .replace(/(\r\n|\r)/g, '\n')
            .match(this.REG_TOKEN)) !== null && _a !== void 0 ? _a : [];
        for (let i = a.length - 1; i >= 0; --i) {
            const t = a[i];
            ScriptScanner.REG_TAG_LET_ML.lastIndex = 0;
            if (ScriptScanner.REG_TAG_LET_ML.test(t)) {
                const idx = t.indexOf(']') + 1;
                if (idx == 0)
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
        var _a;
        for (let i = scr.len - 1; i >= start_idx; --i) {
            const token = scr.aToken[i];
            ScriptScanner.REG_TAG_LET_ML.lastIndex = 0;
            if (ScriptScanner.REG_TAG_LET_ML.test(token)) {
                const idxSpl = token.indexOf(']') + 1;
                const ml = token.slice(idxSpl);
                const cnt = ((_a = ml.match(/\n/g)) !== null && _a !== void 0 ? _a : []).length;
                scr.aToken.splice(i, 1, token.slice(0, idxSpl), ml);
                scr.aLNum.splice(i, 0, scr.aLNum[i]);
                const len = scr.aToken.length;
                for (let j = i + 2; j < len; ++j)
                    scr.aLNum[j] += cnt;
            }
        }
        scr.len = scr.aToken.length;
    }
    mkEscape(ce) {
        return m_xregexp((ce ? `\\${ce}\\S |` : '') +
            '	\\n+' +
            '|	\\t+' +
            `|	\\[let_ml \\s+ [^\\]]+ \\]` +
            `.+?` +
            `(?=\\[endlet_ml [\\]\\s])` +
            `|	\\[ (?: [^"'#;\\]]+ | (["'#]) .*? \\1 | ;[^\\n]* ) *? ]` +
            '|	;[^\\n]*' +
            '|	&[^&\\n]+&' +
            '|	&&?[^;\\n\\t&]+' +
            '|	^\\*\\w+' +
            `| [^\\n\\t\\[;${ce ? `\\${ce}` : ''}]+`, 'gxs');
    }
    setEscape(ce) {
        this.REG_TOKEN = this.mkEscape(ce);
        this.scanAllScript();
    }
}
exports.ScriptScanner = ScriptScanner;
ScriptScanner.inited = false;
ScriptScanner.pickItems = [
    { label: 'clearsysvar', description: 'システム変数の全消去' },
    { label: 'clearvar', description: 'ゲーム変数の全消去' },
    { label: 'endlet_ml', description: 'インラインテキスト代入' },
    { label: 'let_abs', description: '絶対値' },
    { label: 'let_char_at', description: '文字列から一字取りだし' },
    { label: 'let_index_of', description: '文字列で検索' },
    { label: 'let_length', description: '文字列の長さ' },
    { label: 'let_ml', description: 'インラインテキスト代入' },
    { label: 'let_replace', description: '正規表現で置換' },
    { label: 'let_round', description: '四捨五入' },
    { label: 'let_search', description: '正規表現で検索' },
    { label: 'let_substr', description: '文字列から抜きだし' },
    { label: 'let', description: '変数代入・演算' },
    { label: 'add_lay', description: 'レイヤを追加する' },
    { label: 'clear_lay', description: 'レイヤ設定の消去' },
    { label: 'finish_trans', description: 'トランス強制終了' },
    { label: 'lay', description: 'レイヤ設定' },
    { label: 'trans', description: 'ページ裏表を交換' },
    { label: 'wt', description: 'トランス終了待ち' },
    { label: 'pause_tsy', description: '一時停止' },
    { label: 'resume_tsy', description: '一時停止再開' },
    { label: 'stop_tsy', description: 'トゥイーン中断' },
    { label: 'tsy', description: 'トゥイーン開始' },
    { label: 'wait_tsy', description: 'トゥイーン終了待ち' },
    { label: 'autowc', description: '文字ごとのウェイト' },
    { label: 'ch_in_style', description: '文字出現演出定義' },
    { label: 'ch_out_style', description: '文字消去演出定義' },
    { label: 'ch', description: '文字を追加する' },
    { label: 'clear_text', description: '文字消去' },
    { label: 'current', description: 'デフォルト文字レイヤ設定' },
    { label: 'endlink', description: 'ハイパーリンクの終了' },
    { label: 'er', description: 'ページ両面の文字消去' },
    { label: 'graph', description: 'インライン画像表示' },
    { label: 'link', description: 'ハイパーリンク' },
    { label: 'r', description: '改行' },
    { label: 'rec_ch', description: '履歴書き込み' },
    { label: 'rec_r', description: '履歴改行' },
    { label: 'reset_rec', description: '履歴リセット' },
    { label: 'ruby2', description: '文字列と複数ルビの追加' },
    { label: 'set_focus', description: '未作成：フォーカス移動' },
    { label: 'span', description: 'インラインスタイル設定' },
    { label: 'tcy', description: '縦中横を表示する' },
    { label: 'add_face', description: '差分画像の追加' },
    { label: 'wv', description: '動画再生終了待ち' },
    { label: 'add_frame', description: 'フレーム追加' },
    { label: 'frame', description: 'フレームに設定' },
    { label: 'let_frame', description: 'フレーム変数を取得' },
    { label: 'set_frame', description: 'フレーム変数に設定' },
    { label: 'tsy_frame', description: 'フレームをトゥイーン開始' },
    { label: 'clear_event', description: 'イベントを全消去' },
    { label: 'enable_event', description: 'イベント有無の切替' },
    { label: 'event', description: 'イベントを予約' },
    { label: 'l', description: '行末クリック待ち' },
    { label: 'p', description: '改ページクリック待ち' },
    { label: 's', description: '停止する' },
    { label: 'set_cancel_skip', description: 'スキップ中断予約' },
    { label: 'wait', description: 'ウェイトを入れる' },
    { label: 'waitclick', description: 'クリックを待つ' },
    { label: 'fadebgm', description: 'BGMのフェード' },
    { label: 'fadeoutbgm', description: 'BGMのフェードアウト' },
    { label: 'fadeoutse', description: '効果音のフェードアウト' },
    { label: 'fadese', description: '効果音のフェード' },
    { label: 'playbgm', description: 'BGM の演奏' },
    { label: 'playse', description: '効果音の再生' },
    { label: 'stop_allse', description: '全効果音再生の停止' },
    { label: 'stopbgm', description: 'BGM 演奏の停止' },
    { label: 'stopfadese', description: '音声フェードの停止' },
    { label: 'stopse', description: '効果音再生の停止' },
    { label: 'volume', description: '音量設定' },
    { label: 'wb', description: 'BGM フェードの終了待ち' },
    { label: 'wf', description: '効果音フェードの終了待ち' },
    { label: 'wl', description: 'BGM 再生の終了待ち' },
    { label: 'ws', description: '効果音再生の終了待ち' },
    { label: 'xchgbuf', description: '再生トラックの交換' },
    { label: 'else', description: 'その他ifブロック開始' },
    { label: 'elsif', description: '別条件のifブロック開始' },
    { label: 'endif', description: 'ifブロックの終端' },
    { label: 'if', description: 'ifブロックの開始' },
    { label: 'button', description: 'ボタンを表示' },
    { label: 'call', description: 'サブルーチンコール' },
    { label: 'jump', description: 'シナリオジャンプ' },
    { label: 'pop_stack', description: 'コールスタック破棄' },
    { label: 'return', description: 'サブルーチンから戻る' },
    { label: 'bracket2macro', description: '括弧マクロの定義' },
    { label: 'break_macro', description: 'マクロから脱出' },
    { label: 'char2macro', description: '一文字マクロの定義' },
    { label: 'endmacro', description: 'マクロ定義の終了' },
    { label: 'macro', description: 'マクロ定義の開始' },
    { label: 'copybookmark', description: 'しおりの複写' },
    { label: 'erasebookmark', description: 'しおりの消去' },
    { label: 'load', description: 'しおりの読込' },
    { label: 'record_place', description: 'セーブポイント指定' },
    { label: 'reload_script', description: 'スクリプト再読込' },
    { label: 'save', description: 'しおりの保存' },
    { label: 'quake', description: '画面を揺らす' },
    { label: 'stop_quake', description: '画面揺らし中断' },
    { label: 'wq', description: '画面揺らし終了待ち' },
    { label: 'close', description: 'アプリの終了' },
    { label: 'export', description: 'プレイデータをエクスポート' },
    { label: 'import', description: 'プレイデータをインポート' },
    { label: 'loadplugin', description: 'cssの読み込み' },
    { label: 'navigate_to', description: 'ＵＲＬを開く' },
    { label: 'snapshot', description: 'スナップショット' },
    { label: 'title', description: 'タイトル指定' },
    { label: 'toggle_full_screen', description: '全画面状態切替' },
    { label: 'update_check', description: '更新チェック機能' },
    { label: 'window', description: 'アプリウインドウ設定' },
    { label: 'dump_lay', description: 'レイヤのダンプ' },
    { label: 'dump_script', description: 'スクリプトのダンプ' },
    { label: 'dump_stack', description: 'スタックのダンプ' },
    { label: 'dump_val', description: '変数のダンプ' },
    { label: 'log', description: 'ログ出力' },
    { label: 'stats', description: 'パフォーマンス表示' },
    { label: 'trace', description: 'デバッグ表示へ出力' },
];
ScriptScanner.hTag = {};
ScriptScanner.regTagName = /[^\s\[\]="'#;]+/;
ScriptScanner.regValName = /(?<=name\s*=\s*)([^"'#;\]]+|(["'#])(.*?)\2)/m;
ScriptScanner.REG_TAG_LET_ML = m_xregexp(`^\\[let_ml\\s`, 'g');
ScriptScanner.REG_TAG = m_xregexp(`\\[ (?<name>[^\\s;\\]]+) \\s*
	(?<args> (?: [^"'#\\]]+ | (["'#]) .*? \\3 )*?)
]`, 'x');
//# sourceMappingURL=ScriptScanner.js.map