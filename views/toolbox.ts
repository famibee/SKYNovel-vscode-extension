/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

// ツールボックス（アクティビティバー）の webview スクリプト。
//	build.ts が views/toolbox.js に出力する（html はそちらを読む）

document.addEventListener('DOMContentLoaded', ()=> {
	// ドラッグ出来るアイテムの設定
	for (const elm of document.querySelectorAll('button[draggable="true"]')) {
		elm.addEventListener('dragstart', ev=> {
			const {dataTransfer, target} = <DragEvent>ev;
			if (! dataTransfer || ! (target instanceof HTMLElement)) return;

			dataTransfer.setData('from', 'toolbox');
			dataTransfer.setData('id', target.id);
			dataTransfer.setData('scr', decodeURIComponent(target.dataset.scr ?? ''));
		});
	}
});

export {};	// TS にモジュールと認識させる（素のスクリプトだとグローバル衝突する）
