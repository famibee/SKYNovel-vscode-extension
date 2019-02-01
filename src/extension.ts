import * as vscode from 'vscode';

// ロード時に一度だけ呼ばれる
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
//console.log('Congratulations, your extension "skynovel" is now active!');

	let disposable = vscode.commands.registerCommand('extension.SKYNovel', ()=> {
		// コマンドが実行されるたびに、extension.SKYNovelが呼ばれ、この関数のみ実行される
		vscode.window.showInformationMessage('Hello SKYNovel World!');
	});

	context.subscriptions.push(disposable);
}

// 拡張機能が非アクティブ化されたときに、実行
export function deactivate() {}
