"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CmnLib_1 = require("./CmnLib");
const AnalyzeTagArg_1 = require("./AnalyzeTagArg");
const vscode_1 = require("vscode");
const m_xregexp = require("xregexp");
const fs = require('fs');
;
;
class ReferenceProvider {
    constructor(context) {
        this.context = context;
        this.alzTagArg = new AnalyzeTagArg_1.AnalyzeTagArg;
        this.loadCfg = () => ReferenceProvider.pickItems.sort(this.compare).forEach(v => {
            v.url = 'https://famibee.github.io/SKYNovel/tag.htm#' + v.label;
            v.description += '(SKYNovel)';
        });
        this.hScript = Object.create(null);
        this.REG_TAG_LET_ML = m_xregexp(`^\\[let_ml\\s`, 'g');
        this.REG_TOKEN = m_xregexp(`(?: \\[let_ml \\s+ [^\\[\\]]+ \\])` +
            `(?: . | \\s)+?` +
            `(?=\\[endlet_ml \\s* \\])` +
            `| \\[ (?: ([\\"\\'\\#]) .*? \\1 | . ) *? \\]` +
            '| \\n+' +
            '| \\t+' +
            '| &[^&\\n]+&' +
            '| &&?[^;\\n\\t&]+' +
            '| ;[^\\n]+' +
            '| ^\\*\\w+' +
            '| [^\\n\\t\\[;]+', 'gx');
        this.REG_MULTILINE_TAG = m_xregexp(`\\[
		([^\\n\\]]+ \\n
			(?:
				(["'#]) .*? \\2
			|	[^\\[\\]]
			)*
		)
	\\]
|	;[^\\n]+`, 'gx');
        this.REG_TAG = m_xregexp(`^\\[ (?<name>\\S*) (\\s+ (?<args>.+) )? ]$`, 'x');
        this.loadCfg();
        const doc_sel = { scheme: 'file', language: 'skynovel' };
        context.subscriptions.push(vscode_1.commands.registerCommand('skynovel.openReferencePallet', () => this.openPallet()));
        context.subscriptions.push(vscode_1.workspace.onDidChangeConfiguration(() => this.loadCfg()));
        vscode_1.languages.registerHoverProvider(doc_sel, { provideHover(doc, pos) {
                const rng_tag = doc.getWordRangeAtPosition(pos, /\[[a-zA-Z0-9_]+/);
                if (rng_tag) {
                    const w = doc.lineAt(pos.line).text.slice(rng_tag.start.character + 1, rng_tag.end.character);
                    const loc = ReferenceProvider.hMacro[w];
                    if (loc)
                        return new vscode_1.Hover(`[${w}] マクロです 定義ファイル：${loc.uri.fsPath}`);
                    const len = ReferenceProvider.pickItems.length;
                    for (let i = 0; i < len; ++i) {
                        const r = ReferenceProvider.pickItems[i];
                        if (r.label != w)
                            continue;
                        return new vscode_1.Hover(`[${w}] タグです 機能：${r.description}`);
                    }
                }
                return Promise.reject('No word here.');
            } });
        this.context.subscriptions.push(vscode_1.languages.registerDefinitionProvider(doc_sel, { provideDefinition(doc, pos) {
                const rng_tag = doc.getWordRangeAtPosition(pos, /\[[a-zA-Z0-9_]+/);
                if (!rng_tag)
                    return Promise.reject('No word here.');
                const w = doc.lineAt(pos.line).text.slice(rng_tag.start.character + 1, rng_tag.end.character);
                const loc = ReferenceProvider.hMacro[w];
                if (loc)
                    return Promise.resolve(loc);
                const len = ReferenceProvider.pickItems.length;
                for (let i = 0; i < len; ++i) {
                    const r = ReferenceProvider.pickItems[i];
                    if (r.label != w)
                        continue;
                    vscode_1.commands.executeCommand('vscode.open', vscode_1.Uri.parse(r.url));
                    break;
                }
                return Promise.reject('No definition found');
            }
        }));
        const opTxt = (doc) => {
            if (doc.fileName in this.hScript)
                return;
        };
        vscode_1.workspace.textDocuments.forEach(doc => opTxt(doc));
        vscode_1.workspace.onDidOpenTextDocument(doc => opTxt(doc));
    }
    updPrj(wd) { CmnLib_1.treeProc(wd, url => this.updPrj_file(url)); }
    updPrj_file(url) {
        if (url.slice(-3) != '.sn')
            return;
        const txt = fs.readFileSync(url, { encoding: 'utf8' });
        const script = this.hScript[url] = this.resolveScript(txt);
        const len = script.len;
        let line = 0;
        let col = 0;
        for (let i = 0; i < len; ++i) {
            const token = script.aToken[i];
            const uc = token.charCodeAt(0);
            if (uc == 10) {
                line += token.length;
                col = 0;
                continue;
            }
            col += token.length;
            if (uc != 91)
                continue;
            const a_tag = m_xregexp.exec(token, this.REG_TAG);
            if (a_tag == null)
                continue;
            const tag_name = a_tag['name'];
            if (tag_name != 'macro')
                continue;
            if (!this.alzTagArg.go(a_tag['args']))
                throw '属性「' + this.alzTagArg.literal + '」は異常です';
            const macro_name = this.alzTagArg.hPrm['name'].val;
            if (!macro_name)
                continue;
            const idx = token.indexOf(macro_name, 12);
            const my_col = col - token.length + idx;
            ReferenceProvider.hMacro[macro_name] = new vscode_1.Location(vscode_1.Uri.file(url), new vscode_1.Range(new vscode_1.Position(line, my_col), new vscode_1.Position(line, my_col + macro_name.length)));
        }
    }
    chgPrj(e) {
        const path = e.path;
        if (fs.existsSync(path)) {
            this.updPrj_file(path);
            return;
        }
        this.delPrj(path);
    }
    repPrj(e) {
        this.delPrj(e.path);
        this.updPrj_file(e.path);
    }
    delPrj(path) {
        for (const macnm in ReferenceProvider.hMacro) {
            if (ReferenceProvider.hMacro[macnm].uri.path != path)
                continue;
            delete ReferenceProvider.hMacro[macnm];
        }
    }
    compare(a, b) {
        const aStr = a.label + a.description;
        const bStr = b.label + b.description;
        return aStr > bStr ? 1 : aStr === bStr ? 0 : -1;
    }
    resolveScript(txt) {
        txt = txt.replace(/(\r\n|\r)/g, '\n');
        const v = this.cnvMultilineTag(txt).match(this.REG_TOKEN);
        if (!v)
            throw 'this.cnvMultilineTag fail';
        for (let i = v.length - 1; i >= 0; --i) {
            const e = v[i];
            this.REG_TAG_LET_ML.lastIndex = 0;
            if (this.REG_TAG_LET_ML.test(e)) {
                const idx = e.indexOf(']') + 1;
                if (idx == 0)
                    throw '[let_ml]で閉じる【]】がありません';
                const a = e.slice(0, idx);
                const b = e.slice(idx);
                v.splice(i, 1, a, b);
            }
        }
        const scr = { aToken: v, len: v.length, aLNum: [] };
        this.replaceScript_let_ml(scr);
        return scr;
    }
    replaceScript_let_ml(scr, start_idx = 0) {
        for (let i = scr.len - 1; i >= start_idx; --i) {
            const token = scr.aToken[i];
            this.REG_TAG_LET_ML.lastIndex = 0;
            if (this.REG_TAG_LET_ML.test(token)) {
                const idxSpl = token.indexOf(']') + 1;
                const ml = token.slice(idxSpl);
                const cnt = (ml.match(/\n/g) || []).length;
                scr.aToken.splice(i, 1, token.slice(0, idxSpl), ml);
                scr.aLNum.splice(i, 0, scr.aLNum[i]);
                const len = scr.aToken.length;
                for (let j = i + 2; j < len; ++j)
                    scr.aLNum[j] += cnt;
            }
        }
        scr.len = scr.aToken.length;
    }
    openPallet() {
        const options = {
            'placeHolder': 'Which reference will you open?',
            'matchOnDescription': true,
        };
        vscode_1.window.showQuickPick(ReferenceProvider.pickItems, options).then(item => {
            if (item)
                vscode_1.commands.executeCommand('vscode.open', vscode_1.Uri.parse(item.url));
        });
    }
    cnvMultilineTag(txt) {
        return txt.replace(this.REG_MULTILINE_TAG, function () {
            if (arguments[0].charAt(0) == ';')
                return arguments[0];
            let fore = '';
            let back = '';
            for (const v of arguments[1].match(ReferenceProvider.REG_MULTILINE_TAG_SPLIT)) {
                switch (v.substr(-1)) {
                    case '\n':
                        back += v;
                        break;
                    case `"`:
                    case `'`:
                    case `#`:
                        fore += v;
                        break;
                    default:
                        fore += ' ' + CmnLib_1.trim(v);
                        break;
                }
            }
            return '[' + CmnLib_1.trim(fore.slice(1)) + ']' + back;
        });
    }
}
ReferenceProvider.pickItems = [
    { label: 'clearsysvar', description: 'システム変数の全消去', url: '' },
    { label: 'clearvar', description: 'ゲーム変数の全消去', url: '' },
    { label: 'let', description: '変数代入・演算', url: '' },
    { label: 'let_abs', description: '絶対値', url: '' },
    { label: 'let_char_at', description: '文字列から一字取りだし', url: '' },
    { label: 'let_index_of', description: '文字列で検索', url: '' },
    { label: 'let_length', description: '文字列の長さ', url: '' },
    { label: 'let_ml', description: 'インラインテキスト代入', url: '' },
    { label: 'let_replace', description: '正規表現で置換', url: '' },
    { label: 'let_round', description: '四捨五入', url: '' },
    { label: 'let_search', description: '正規表現で検索', url: '' },
    { label: 'let_substr', description: '文字列から抜きだし', url: '' },
    { label: 'add_lay', description: 'レイヤを追加する', url: '' },
    { label: 'clear_lay', description: 'レイヤ設定の消去', url: '' },
    { label: 'finish_trans', description: 'トランス強制終了', url: '' },
    { label: 'lay', description: 'レイヤ設定', url: '' },
    { label: 'trans', description: 'ページ裏表を交換', url: '' },
    { label: 'wt', description: 'トランス終了待ち', url: '' },
    { label: 'pause_tsy', description: '一時停止', url: '' },
    { label: 'resume_tsy', description: '一時停止再開', url: '' },
    { label: 'stop_tsy', description: 'トゥイーン中断', url: '' },
    { label: 'tsy', description: 'トゥイーン開始', url: '' },
    { label: 'wait_tsy', description: 'トゥイーン終了待ち', url: '' },
    { label: 'autowc', description: '文字ごとのウェイト', url: '' },
    { label: 'ch', description: '文字を追加する', url: '' },
    { label: 'clear_text', description: '文字消去', url: '' },
    { label: 'current', description: 'デフォルト文字レイヤ設定', url: '' },
    { label: 'endlink', description: 'ハイパーリンクの終了', url: '' },
    { label: 'er', description: 'ページ両面の文字消去', url: '' },
    { label: 'graph', description: 'インライン画像表示', url: '' },
    { label: 'link', description: 'ハイパーリンク', url: '' },
    { label: 'r', description: '改行', url: '' },
    { label: 'rec_ch', description: '履歴書き込み', url: '' },
    { label: 'rec_r', description: '履歴改行', url: '' },
    { label: 'reset_rec', description: '履歴リセット', url: '' },
    { label: 'ruby2', description: '文字列と複数ルビの追加', url: '' },
    { label: 'set_focus', description: '未作成：フォーカス移動', url: '' },
    { label: 'span', description: 'インラインスタイル設定', url: '' },
    { label: 'tcy', description: '縦中横を表示する', url: '' },
    { label: 'add_face', description: '差分画像の追加', url: '' },
    { label: 'add_frame', description: 'フレーム', url: '' },
    { label: 'let_frame', description: 'フレーム', url: '' },
    { label: 'set_frame', description: 'フレーム', url: '' },
    { label: 'frame', description: 'フレーム', url: '' },
    { label: 'tsy_frame', description: 'フレーム', url: '' },
    { label: 'clear_event', description: 'イベントを全消去', url: '' },
    { label: 'enable_event', description: 'イベント有無の切替', url: '' },
    { label: 'event', description: 'イベントを予約', url: '' },
    { label: 'l', description: '行末クリック待ち', url: '' },
    { label: 'p', description: '改ページクリック待ち', url: '' },
    { label: 's', description: '停止する', url: '' },
    { label: 'set_cancel_skip', description: 'スキップ中断予約', url: '' },
    { label: 'wait', description: 'ウェイトを入れる', url: '' },
    { label: 'waitclick', description: 'クリックを待つ', url: '' },
    { label: 'fadebgm', description: 'BGMのフェード', url: '' },
    { label: 'fadeoutbgm', description: 'BGMのフェードアウト', url: '' },
    { label: 'fadeoutse', description: '効果音のフェードアウト', url: '' },
    { label: 'fadese', description: '効果音のフェード', url: '' },
    { label: 'playbgm', description: 'BGM の演奏', url: '' },
    { label: 'playse', description: '効果音の再生', url: '' },
    { label: 'stop_allse', description: '全効果音再生の停止', url: '' },
    { label: 'stopbgm', description: 'BGM 演奏の停止', url: '' },
    { label: 'stopfadese', description: '音声フェードの停止', url: '' },
    { label: 'stopse', description: '効果音再生の停止', url: '' },
    { label: 'volume', description: '音量設定', url: '' },
    { label: 'wb', description: 'BGM フェードの終了待ち', url: '' },
    { label: 'wf', description: '効果音フェードの終了待ち', url: '' },
    { label: 'wl', description: 'BGM 再生の終了待ち', url: '' },
    { label: 'ws', description: '効果音再生の終了待ち', url: '' },
    { label: 'xchgbuf', description: '再生トラックの交換', url: '' },
    { label: 'else', description: 'その他ifブロック開始', url: '' },
    { label: 'elsif', description: '別条件のifブロック開始', url: '' },
    { label: 'endif', description: 'ifブロックの終端', url: '' },
    { label: 'if', description: 'ifブロックの開始', url: '' },
    { label: 'button', description: 'ボタンを表示', url: '' },
    { label: 'call', description: 'サブルーチンコール', url: '' },
    { label: 'jump', description: 'シナリオジャンプ', url: '' },
    { label: 'pop_stack', description: 'コールスタック破棄', url: '' },
    { label: 'return', description: 'サブルーチンから戻る', url: '' },
    { label: 'bracket2macro', description: '括弧マクロの定義', url: '' },
    { label: 'break_macro', description: 'マクロから脱出', url: '' },
    { label: 'char2macro', description: '一文字マクロの定義', url: '' },
    { label: 'endmacro', description: 'マクロ定義の終了', url: '' },
    { label: 'macro', description: 'マクロ定義の開始', url: '' },
    { label: 'copybookmark', description: 'しおりの複写', url: '' },
    { label: 'erasebookmark', description: 'しおりの消去', url: '' },
    { label: 'load', description: 'しおりの読込', url: '' },
    { label: 'record_place', description: 'セーブポイント指定', url: '' },
    { label: 'reload_script', description: 'スクリプト再読込', url: '' },
    { label: 'save', description: 'しおりの保存', url: '' },
    { label: 'quake', description: '画面を揺らす', url: '' },
    { label: 'stop_quake', description: '画面揺らし中断', url: '' },
    { label: 'wq', description: '画面揺らし終了待ち', url: '' },
    { label: 'close', description: 'アプリの終了', url: '' },
    { label: 'loadplugin', description: 'プラグインの読み込み', url: '' },
    { label: 'navigate_to', description: 'ＵＲＬを開く', url: '' },
    { label: 'snapshot', description: 'スナップショット', url: '' },
    { label: 'title', description: 'タイトル指定', url: '' },
    { label: 'toggle_full_screen', description: '全画面状態切替', url: '' },
    { label: 'window', description: 'アプリウインドウ設定', url: '' },
    { label: 'dump_val', description: '変数のダンプ', url: '' },
    { label: 'dump_script', description: 'スクリプトのダンプ', url: '' },
    { label: 'dump_stack', description: 'スタックのダンプ', url: '' },
    { label: 'log', description: 'ログ出力', url: '' },
    { label: 'dump_lay', description: 'レイヤのダンプ', url: '' },
    { label: 'stats', description: 'パフォーマンス表示', url: '' },
    { label: 'trace', description: 'デバッグ表示へ出力', url: '' },
];
ReferenceProvider.hMacro = {};
ReferenceProvider.REG_MULTILINE_TAG_SPLIT = m_xregexp(`((["'#]).*?\\2|;.*\\n|\\n+|[^\\n"'#;]+)`, 'g');
exports.ReferenceProvider = ReferenceProvider;
//# sourceMappingURL=ReferenceProvider.js.map