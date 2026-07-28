/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {ActivityBar} from './ActivityBar';
import {clearTrace, getTraceCnt, getTraceMs, markTrace, updTrace} from './Trace';

import {commands, window, workspace, type ExtensionContext} from 'vscode';

const CFG_TRACE = 'skynovel.trace';

// ロード時に一度だけ呼ばれる
export function activate(ctx: ExtensionContext) {
	const upd = ()=> updTrace(
		workspace.getConfiguration().get<boolean>(CFG_TRACE, false)
	);
	upd();
	ctx.subscriptions.push(workspace.onDidChangeConfiguration(e=> {
		if (e.affectsConfiguration(CFG_TRACE)) upd();
	}));

	// 自動化できない操作（ドラッグ＆ドロップ等）を1件ずつ確かめる用
	ctx.subscriptions.push(commands.registerCommand('skynovel.traceMark', async ()=> {
		const mes = await window.showInputBox({
			prompt: 'この区切りの名前（例：Finder→VE 移動）', value: '',
		});
		markTrace(mes ?? '');
	}));

	ActivityBar.start(ctx);

	// 統合テスト（test/int/）から観測するための入口。
	// extensions.getExtension(id).exports で受け取れる
	return {getTraceCnt, getTraceMs, clearTrace};
}

// 拡張機能が非アクティブ化されたときに、実行
export function deactivate() {ActivityBar.stop();}
