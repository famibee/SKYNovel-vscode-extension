import * as vscode from 'vscode';

interface Reference extends vscode.QuickPickItem {
	url: string;
}

export class ReferenceProvider {
	private readonly pickItems: Reference[] = [
		// プラグイン
		{label: 'notice', description: 'humane.js 通知パネル', url: ''},

		// 変数操作
		{label: 'clearsysvar', description: 'システム変数の全消去', url: ''},
		{label: 'clearvar', description: 'ゲーム変数の全消去', url: ''},
		{label: 'let', description: '変数代入・演算', url: ''},
		{label: 'let_abs', description: '絶対値', url: ''},
		{label: 'let_char_at', description: '文字列から一字取りだし', url: ''},
		{label: 'let_index_of', description: '文字列で検索', url: ''},
		{label: 'let_length', description: '文字列の長さ', url: ''},
		{label: 'let_ml', description: 'インラインテキスト代入', url: ''},
		{label: 'let_replace', description: '正規表現で置換', url: ''},
		{label: 'let_round', description: '四捨五入', url: ''},
		{label: 'let_search', description: '正規表現で検索', url: ''},
		{label: 'let_substr', description: '文字列から抜きだし', url: ''},

		// レイヤ共通
		{label: 'add_lay', description: 'レイヤを追加する', url: ''},
		{label: 'clear_lay', description: 'レイヤ設定の消去', url: ''},
		{label: 'finish_trans', description: 'トランス強制終了', url: ''},
		{label: 'lay', description: 'レイヤ設定', url: ''},
		{label: 'trans', description: 'ページ裏表を交換', url: ''},
		{label: 'wt', description: 'トランス終了待ち', url: ''},

		// レイヤトゥイーン
		{label: 'pause_tsy', description: '一時停止', url: ''},
		{label: 'resume_tsy', description: '一時停止再開', url: ''},
		{label: 'stop_tsy', description: 'トゥイーン中断', url: ''},
		{label: 'tsy', description: 'トゥイーン開始', url: ''},
		{label: 'wait_tsy', description: 'トゥイーン終了待ち', url: ''},

		// 文字・文字レイヤ
		{label: 'autowc', description: '文字ごとのウェイト', url: ''},
		{label: 'ch', description: '文字を追加する', url: ''},
		{label: 'clear_text', description: '文字消去', url: ''},
		{label: 'current', description: 'デフォルト文字レイヤ設定', url: ''},
		{label: 'endlink', description: 'ハイパーリンクの終了', url: ''},
		{label: 'er', description: 'ページ両面の文字消去', url: ''},
		{label: 'graph', description: 'インライン画像表示', url: ''},
		{label: 'link', description: 'ハイパーリンク', url: ''},
		{label: 'r', description: '改行', url: ''},
		{label: 'rec_ch', description: '履歴書き込み', url: ''},
		{label: 'rec_r', description: '履歴改行', url: ''},
		{label: 'reset_rec', description: '履歴リセット', url: ''},
		{label: 'ruby2', description: '文字列と複数ルビの追加', url: ''},
		{label: 'set_focus', description: '未作成：フォーカス移動', url: ''},
		{label: 'span', description: 'インラインスタイル設定', url: ''},
		{label: 'tcy', description: '縦中横を表示する', url: ''},

		// 画像・画像レイヤ
		{label: 'add_face', description: '差分画像の追加', url: ''},

		// HTMLフレーム
		{label: 'add_frame', description: 'フレーム', url: ''},
		{label: 'let_frame', description: 'フレーム', url: ''},
		{label: 'set_frame', description: 'フレーム', url: ''},
		{label: 'frame', description: 'フレーム', url: ''},
		{label: 'tsy_frame', description: 'フレーム', url: ''},

		// イベント
		{label: 'clear_event', description: 'イベントを全消去', url: ''},
		{label: 'enable_event', description: 'イベント有無の切替', url: ''},
		{label: 'event', description: 'イベントを予約', url: ''},
		{label: 'l', description: '行末クリック待ち', url: ''},
		{label: 'p', description: '改ページクリック待ち', url: ''},
		{label: 's', description: '停止する', url: ''},
		{label: 'set_cancel_skip', description: 'スキップ中断予約', url: ''},
		{label: 'wait', description: 'ウェイトを入れる', url: ''},
		{label: 'waitclick', description: 'クリックを待つ', url: ''},

		// ＢＧＭ・効果音
		{label: 'fadebgm', description: 'BGMのフェード', url: ''},
		{label: 'fadeoutbgm', description: 'BGMのフェードアウト', url: ''},
		{label: 'fadeoutse', description: '効果音のフェードアウト', url: ''},
		{label: 'fadese', description: '効果音のフェード', url: ''},
		{label: 'playbgm', description: 'BGM の演奏', url: ''},
		{label: 'playse', description: '効果音の再生', url: ''},
		{label: 'stop_allse', description: '全効果音再生の停止', url: ''},
		{label: 'stopbgm', description: 'BGM 演奏の停止', url: ''},
		{label: 'stopfadese', description: '音声フェードの停止', url: ''},
		{label: 'stopse', description: '効果音再生の停止', url: ''},
		{label: 'volume', description: '音量設定', url: ''},
		{label: 'wb', description: 'BGM フェードの終了待ち', url: ''},
		{label: 'wf', description: '効果音フェードの終了待ち', url: ''},
		{label: 'wl', description: 'BGM 再生の終了待ち', url: ''},
		{label: 'ws', description: '効果音再生の終了待ち', url: ''},
		{label: 'xchgbuf', description: '再生トラックの交換', url: ''},

		// 条件分岐
		{label: 'else', description: 'その他ifブロック開始', url: ''},
		{label: 'elsif', description: '別条件のifブロック開始', url: ''},
		{label: 'endif', description: 'ifブロックの終端', url: ''},
		{label: 'if', description: 'ifブロックの開始', url: ''},

		// ラベル・ジャンプ
		{label: 'button', description: 'ボタンを表示', url: ''},
		{label: 'call', description: 'サブルーチンコール', url: ''},
		{label: 'jump', description: 'シナリオジャンプ', url: ''},
		{label: 'pop_stack', description: 'コールスタック破棄', url: ''},
		{label: 'return', description: 'サブルーチンから戻る', url: ''},

		// マクロ
		{label: 'bracket2macro', description: '括弧マクロの定義', url: ''},
		{label: 'break_macro', description: 'マクロから脱出', url: ''},
		{label: 'char2macro', description: '一文字マクロの定義', url: ''},
		{label: 'endmacro', description: 'マクロ定義の終了', url: ''},
		{label: 'macro', description: 'マクロ定義の開始', url: ''},

		// しおり
		{label: 'copybookmark', description: 'しおりの複写', url: ''},
		{label: 'erasebookmark', description: 'しおりの消去', url: ''},
		{label: 'load', description: 'しおりの読込', url: ''},
		{label: 'record_place', description: 'セーブポイント指定', url: ''},
		{label: 'reload_script', description: 'スクリプト再読込', url: ''},
		{label: 'save', description: 'しおりの保存', url: ''},

		// 画面揺らし
		{label: 'quake', description: '画面を揺らす', url: ''},
		{label: 'stop_quake', description: '画面揺らし中断', url: ''},
		{label: 'wq', description: '画面揺らし終了待ち', url: ''},

		// システム
		{label: 'close', description: 'アプリの終了', url: ''},
		{label: 'loadplugin', description: 'プラグインの読み込み', url: ''},
		{label: 'navigate_to', description: 'ＵＲＬを開く', url: ''},
		{label: 'snapshot', description: 'スナップショット', url: ''},
		{label: 'title', description: 'タイトル指定', url: ''},
		{label: 'toggle_full_screen', description: '全画面状態切替', url: ''},
		{label: 'window', description: 'アプリウインドウ設定', url: ''},

		// デバッグ・その他
		{label: 'dump_val', description: '変数のダンプ', url: ''},
		{label: 'dump_script', description: 'スクリプトのダンプ', url: ''},
		{label: 'dump_stack', description: 'スタックのダンプ', url: ''},
		{label: 'log', description: 'ログ出力', url: ''},
		{label: 'dump_lay', description: 'レイヤのダンプ', url: ''},
		{label: 'stats', description: 'パフォーマンス表示', url: ''},
		{label: 'trace', description: 'デバッグ表示へ出力', url: ''},
	];

	constructor(context: vscode.ExtensionContext) {
		this.loadCfg();

		context.subscriptions.push(vscode.commands.registerCommand("skynovel.openReferencePallet", ()=> this.openPallet()));
		context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(()=> this.loadCfg()));
	}
	private loadCfg = ()=> this.pickItems.sort(this.compare).map(v=> {
		v.url = 'https://famibee.github.io/SKYNovel/tag.htm#'+ v.label;
		v.description += '(SKYNovel)';
	});
	private compare(a: vscode.QuickPickItem, b: vscode.QuickPickItem): number {
		const aStr = a.label + a.description;
		const bStr = b.label + b.description;
		return aStr > bStr ? 1 : aStr === bStr ? 0 : -1;
	}

	private openPallet() {
		const options: vscode.QuickPickOptions = {
			'placeHolder': 'Which reference will you open?',
			'matchOnDescription': true
		};

		vscode.window.showQuickPick<Reference>(this.pickItems, options).then(item=> {
			if (item) vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(item.url));
		});
	}
}
