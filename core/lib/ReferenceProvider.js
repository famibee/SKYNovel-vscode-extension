"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const AnalyzeTagArg_1 = require("./AnalyzeTagArg");
const vscode_1 = require("vscode");
const m_xregexp = require("xregexp");
const fs = require('fs-extra');
;
;
function openTagRef(v) {
    vscode_1.commands.executeCommand('vscode.open', vscode_1.Uri.parse('https://famibee.github.io/SKYNovel/tag.htm#' + v.label));
}
;
class ReferenceProvider {
    constructor(ctx, curPrj) {
        this.curPrj = curPrj;
        this.macro_name4rename = '';
        this.nm2Diag = {};
        this.$hDefPlg = {};
        this.hMacro = {};
        this.hMacroUse = {};
        this.alzTagArg = new AnalyzeTagArg_1.AnalyzeTagArg;
        this.loadCfg = () => ReferenceProvider.pickItems.sort(this.compare).forEach(q => q.description += '（SKYNovel）');
        this.hScript = Object.create(null);
        this.REG_TAG_LET_ML = m_xregexp(`^\\[let_ml\\s`, 'g');
        this.REG_TAG = m_xregexp(`\\[ (?<name>[^\\s;\\]]+) \\s*
	(?<args> (?: [^"'#\\]]+ | (["'#]) .*? \\3 )*?)
]`, 'x');
        if (!ReferenceProvider.inited) {
            ReferenceProvider.inited = true;
            const len = ReferenceProvider.pickItems.length;
            for (let i = 0; i < len; ++i) {
                const q = ReferenceProvider.pickItems[i];
                ReferenceProvider.hTag[q.label] = true;
            }
            ctx.subscriptions.push(vscode_1.commands.registerCommand('skynovel.openReferencePallet', () => {
                const options = {
                    'placeHolder': 'Which reference will you open?',
                    'matchOnDescription': true,
                };
                vscode_1.window.showQuickPick(ReferenceProvider.pickItems, options).then(q => { if (q)
                    openTagRef(q); });
            }));
        }
        this.loadCfg();
        ctx.subscriptions.push(vscode_1.workspace.onDidChangeConfiguration(() => this.loadCfg()));
        const doc_sel = { scheme: 'file', language: 'skynovel' };
        vscode_1.languages.registerHoverProvider(doc_sel, this);
        ctx.subscriptions.push(vscode_1.languages.registerDefinitionProvider(doc_sel, this));
        ctx.subscriptions.push(vscode_1.languages.registerRenameProvider(doc_sel, this));
        this.clDiag = vscode_1.languages.createDiagnosticCollection('skynovel');
    }
    prepareRename(doc, pos, _token) {
        doc.save();
        let is_mac_def = false;
        let rng = new vscode_1.Range(0, 0, 0, 0);
        for (const nm in this.hMacro) {
            const m = this.hMacro[nm];
            if (doc.uri.fsPath == m.uri.fsPath && m.range.contains(pos)) {
                is_mac_def = true;
                rng = m.range;
                break;
            }
        }
        if (!is_mac_def) {
            const r = doc.getWordRangeAtPosition(pos, /\[[a-zA-Z0-9_]+/);
            if (!r)
                return Promise.reject('No word here.');
            rng = new vscode_1.Range(r.start.translate(0, 1), r.end);
        }
        this.macro_name4rename = doc.getText(rng);
        const l = this.hMacro[this.macro_name4rename];
        if (!l)
            return Promise.reject('タグは変名できません');
        return Promise.resolve(rng);
    }
    provideRenameEdits(_doc, _pos, newName, _token) {
        var _a;
        if (/(\s|　)/.test(newName))
            return Promise.reject('空白を含む変名はできません');
        const we = new vscode_1.WorkspaceEdit();
        const m = this.hMacro[this.macro_name4rename];
        we.replace(m.uri, m.range, newName);
        ((_a = this.hMacroUse[this.macro_name4rename]) !== null && _a !== void 0 ? _a : [])
            .forEach(p => we.replace(p.uri, p.range, newName));
        return Promise.resolve(we);
    }
    provideHover(doc, pos, _token) {
        const r = doc.getWordRangeAtPosition(pos, /\[[a-zA-Z0-9_]+/);
        if (!r)
            return Promise.reject('No word here.');
        const tag_name = doc.lineAt(pos.line).text.slice(r.start.character + 1, r.end.character);
        const loc = this.hMacro[tag_name];
        if (loc)
            return new vscode_1.Hover(`[${tag_name}] マクロです 定義ファイル：${loc.uri.fsPath}`);
        const len = ReferenceProvider.pickItems.length;
        for (let i = 0; i < len; ++i) {
            const q = ReferenceProvider.pickItems[i];
            if (q.label == tag_name)
                return new vscode_1.Hover(`[${tag_name}] タグです 機能：${q.description}`);
        }
        return Promise.reject('No word here.');
    }
    provideDefinition(doc, pos, _token) {
        const r = doc.getWordRangeAtPosition(pos, /\[[a-zA-Z0-9_]+/);
        if (!r)
            return Promise.reject('No word here.');
        const tag_name = doc.lineAt(pos.line).text.slice(r.start.character + 1, r.end.character);
        const loc = this.hMacro[tag_name];
        if (loc)
            return Promise.resolve(loc);
        const len = ReferenceProvider.pickItems.length;
        for (let i = 0; i < len; ++i) {
            const q = ReferenceProvider.pickItems[i];
            if (q.label == tag_name) {
                openTagRef(q);
                break;
            }
        }
        return Promise.reject('No definition found');
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
            const aLoc = this.hMacroUse[use_nm];
            aLoc.map(loc => this.nm2Diag[loc.uri.path].push(new vscode_1.Diagnostic(loc.range, `未定義マクロ[${use_nm}]を使用、あるいはスペルミスです`, vscode_1.DiagnosticSeverity.Warning)));
        }
        for (const path in this.nm2Diag) {
            this.clDiag.set(vscode_1.Uri.file(path), this.nm2Diag[path]);
        }
    }
    set hDefPlg(hDefPlg) { this.$hDefPlg = hDefPlg; }
    crePrj(_e) { this.scanAllScript(); }
    chgPrj(_e) { this.scanAllScript(); }
    delPrj(_e) { this.scanAllScript(); }
    scanScript(url) {
        var _a, _b, _c;
        if (url.slice(-3) != '.sn')
            return;
        const txt = fs.readFileSync(url, { encoding: 'utf8' });
        const script = this.hScript[url] = this.resolveScript(txt);
        this.nm2Diag[url] = (_a = this.nm2Diag[url]) !== null && _a !== void 0 ? _a : [];
        const diags = this.nm2Diag[url];
        let show_mes = false;
        const lenToken = script.len;
        let line = 0, col = 0;
        const uri = vscode_1.Uri.file(url);
        for (let i = 0; i < lenToken; ++i) {
            const token = script.aToken[i];
            const uc = token.charCodeAt(0);
            const len = token.length;
            if (uc == 10) {
                line += len;
                col = 0;
                continue;
            }
            if (uc != 91) {
                col += len;
                continue;
            }
            const a_tag = m_xregexp.exec(token, this.REG_TAG);
            if (a_tag == null)
                continue;
            const rng_nm = new vscode_1.Range(line, col + 1, line, col + 1 + a_tag.name.length);
            let cntLines = 0;
            let j = -1;
            while ((j = token.indexOf('\n', j + 1)) >= 0)
                ++cntLines;
            if (cntLines <= 0)
                col += len;
            else {
                line += cntLines;
                col = len - token.lastIndexOf('\n');
                if (cntLines > 10) {
                    diags.push(new vscode_1.Diagnostic(new vscode_1.Range(rng_nm.start.line, rng_nm.start.character - 1, rng_nm.end.line + cntLines, 0), `改行タグが10行を超えています`, vscode_1.DiagnosticSeverity.Warning));
                }
            }
            const use_nm = a_tag.name;
            if (use_nm != 'macro') {
                if (use_nm in ReferenceProvider.hTag)
                    continue;
                if (use_nm in this.$hDefPlg)
                    continue;
                const a = (_b = this.hMacroUse[use_nm]) !== null && _b !== void 0 ? _b : [];
                a.push(new vscode_1.Location(uri, rng_nm));
                this.hMacroUse[use_nm] = a;
                continue;
            }
            this.alzTagArg.go(a_tag.args);
            const def_nm = (_c = this.alzTagArg.hPrm.name) === null || _c === void 0 ? void 0 : _c.val;
            if (!def_nm) {
                diags.push(new vscode_1.Diagnostic(rng_nm, `マクロ定義[${def_nm}]の引数が異常です`, vscode_1.DiagnosticSeverity.Error));
                continue;
            }
            if (ReferenceProvider.hTag[def_nm]) {
                diags.push(new vscode_1.Diagnostic(rng_nm, `定義済みのタグ[${def_nm}]と同名のマクロは定義できません`, vscode_1.DiagnosticSeverity.Error));
                continue;
            }
            const loc = this.hMacro[def_nm];
            if (!loc) {
                this.hMacro[def_nm] = new vscode_1.Location(vscode_1.Uri.file(url), rng_nm);
                continue;
            }
            const dia = new vscode_1.Diagnostic(loc.range, `マクロ定義（[${def_nm}]）が重複`, vscode_1.DiagnosticSeverity.Error);
            if (!diags.find(d => d.range == loc.range)) {
                if (loc.uri.fsPath == url)
                    diags.push(dia);
                else
                    this.clDiag.set(loc.uri, [dia]);
            }
            diags.push(new vscode_1.Diagnostic(new vscode_1.Range(rng_nm.start, new vscode_1.Position(rng_nm.start.line, rng_nm.start.character + def_nm.length)), `マクロ定義（[${def_nm}]）が重複`, vscode_1.DiagnosticSeverity.Error));
            if (show_mes)
                continue;
            show_mes = true;
            vscode_1.window.showErrorMessage(`[SKYNovel] プロジェクト内でマクロ定義【${def_nm}】が重複しています。どちらか削除して下さい`, { modal: true });
        }
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
            this.REG_TAG_LET_ML.lastIndex = 0;
            if (this.REG_TAG_LET_ML.test(t)) {
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
            this.REG_TAG_LET_ML.lastIndex = 0;
            if (this.REG_TAG_LET_ML.test(token)) {
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
exports.ReferenceProvider = ReferenceProvider;
ReferenceProvider.inited = false;
ReferenceProvider.pickItems = [
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
ReferenceProvider.hTag = {};
//# sourceMappingURL=ReferenceProvider.js.map