/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {ActivityBar} from './ActivityBar';

import {TextEditor, ExtensionContext, window, workspace, Range, TextEditorDecorationType} from 'vscode';

let edActive: TextEditor | undefined;

// ロード時に一度だけ呼ばれる
export function activate(context: ExtensionContext) {
	// アクティビティバー
	ActivityBar.start(context);	// このタイミングで環境チェック

	// fn属性やlabel属性の値に下線を引くように
	edActive = window.activeTextEditor;
	if (edActive) trgUpdDeco();

	window.onDidChangeActiveTextEditor(ed=> {
		edActive = ed;
		if (ed) trgUpdDeco();
	}, null, context.subscriptions);

	workspace.onDidChangeTextDocument(event=> {
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
		aRange		: Range[];
		decorator	: TextEditorDecorationType;
	}
	let decChars: DecChars = {
		aRange: [],
		decorator: window.createTextEditorDecorationType({})
	};
	function updDeco() {
		if (! edActive) return;
		const src = edActive.document.getText();

		window.setStatusBarMessage('');
		decChars.decorator.dispose();
		decChars = {
			aRange: [],
			decorator: window.createTextEditorDecorationType({
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
			decChars.aRange.push(new Range(
				edActive.document.positionAt(m.index +lenVar+2),
				edActive.document.positionAt(m.index +lenVar+2 + m[2].length)
			));
		}
		edActive.setDecorations(decChars.decorator, decChars.aRange);
	}
