import * as vscode from 'vscode';

interface DecChars {
	aRange		: vscode.Range[];
	decorator	: vscode.TextEditorDecorationType;
}
let decChars: DecChars = {
	aRange: [],
	decorator: vscode.window.createTextEditorDecorationType({})
};
let timeout: NodeJS.Timer | null = null;

// ロード時に一度だけ呼ばれる
export function activate(context: vscode.ExtensionContext) {
	let edActive = vscode.window.activeTextEditor;
	if (edActive) trgUpdDeco();

	vscode.window.onDidChangeActiveTextEditor(ed=> {
		edActive = ed;
		if (ed) trgUpdDeco();
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event=> {
		if (edActive && event.document === edActive.document) trgUpdDeco();
	}, null, context.subscriptions);


	function trgUpdDeco() {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(updDeco, 500);
	}
	function updDeco() {
		if (! edActive) return;
		const src = edActive.document.getText();

		vscode.window.setStatusBarMessage('');
		decChars.decorator.dispose();
		decChars = {
			aRange: [],
			decorator: vscode.window.createTextEditorDecorationType({
				'light': {
					'textDecoration': 'underline',
				},
				'dark': {
					'textDecoration': 'underline',
				}
			})
		}

		const regex = new RegExp('\\s(fn|label)\\=([^\\]\\s]+)', 'g');
		let m;
		while (m = regex.exec(src)) {
			const lenVar = m[1].length;
			decChars.aRange.push(new vscode.Range(
				edActive.document.positionAt(m.index +lenVar+2),
				edActive.document.positionAt(m.index +lenVar+2 + m[2].length)
			));
		}
		edActive.setDecorations(decChars.decorator, decChars.aRange);
	}
}

// 拡張機能が非アクティブ化されたときに、実行
export function deactivate() {}
