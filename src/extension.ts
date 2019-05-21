/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {ReferenceProvider} from './ReferenceProvider';
import {ActivityBar} from './ActivityBar';

import * as vscode from 'vscode';

let edActive: vscode.TextEditor | undefined;

// ロード時に一度だけ呼ばれる
export function activate(context: vscode.ExtensionContext) {
	// アクティビティバー
	ActivityBar.start(context);	// このタイミングで環境チェック
	// リファレンス
	new ReferenceProvider(context);

	// fn属性やlabel属性の値に下線を引くように
	edActive = vscode.window.activeTextEditor;
	if (edActive) trgUpdDeco();

	vscode.window.onDidChangeActiveTextEditor(ed=> {
		edActive = ed;
		if (ed) trgUpdDeco();
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event=> {
		if (edActive && event.document === edActive.document) trgUpdDeco();
	}, null, context.subscriptions);
}

// 拡張機能が非アクティブ化されたときに、実行
export function deactivate() {ActivityBar.stopActBar();}


	// fn属性やlabel属性の値に下線を引くように
	let timeout: NodeJS.Timer | null = null;
	function trgUpdDeco() {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(updDeco, 500);
	}

	interface DecChars {
		aRange		: vscode.Range[];
		decorator	: vscode.TextEditorDecorationType;
	}
	let decChars: DecChars = {
		aRange: [],
		decorator: vscode.window.createTextEditorDecorationType({})
	};
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
