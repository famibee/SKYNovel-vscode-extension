/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

// ファイル一覧（SKYNovel GUI で開く）の webview スクリプト。
//	build.ts が views/folder.js に出力する（html はそちらを読む）

// 拡張機能へ送るメッセージ（受け side は src/WPFolder.ts）
type T_V2E_FOLDER = {
	cmd		: 'info' | 'warn';
	text	: string;
};
// 拡張機能から来るメッセージ（送り side は src/WPFolder.ts #update()）。
//	cmd は今のところ 'refresh' だけだが、増えたときに誤動作しないよう
//	ランタイムで判定したいので string 型にしている
type T_E2V_FOLDER = {
	cmd	: string;
	o	: {htm: string};
};

const vscode = 'acquireVsCodeApi' in window
	? acquireVsCodeApi<undefined>() : undefined;
const cmd2Ex = (o: T_V2E_FOLDER)=> vscode?.postMessage(o);

document.addEventListener('DOMContentLoaded', ()=> {
	const th_row = document.getElementById('th_row');
	if (! th_row) return;

	const setRd = (id: string, cls: string)=> {
		const rd = document.getElementById(id);
		if (rd) rd.onclick = ()=> {th_row.classList.value = cls};
	};
	setRd('rd1', 'row row-cols-1');
	setRd('rd2', 'row row-cols-2');
	setRd('rd3', 'row row-cols-3');
});

window.addEventListener('message', e=> {
	if (! e.isTrusted) {
		cmd2Ex({cmd: 'warn', text: '(folder.js) isTrusted=false'});
		return;
	}

	const {cmd, o} = <T_E2V_FOLDER>e.data;
	if (cmd !== 'refresh') return;

	const th_row = document.getElementById('th_row');
	if (! th_row) return;

	th_row.innerHTML = o.htm || '<h5>（表示できるファイルはありません）</h5>';

	// ドラッグ時にマウスカーソルの左上に
	for (const v of document.querySelectorAll('.col > img')) {
		v.addEventListener('dragstart', ev=> {
			(<DragEvent>ev).dataTransfer?.setDragImage(v, 0, 0);
		});
	}
});

export {};	// TS にモジュールと認識させる（素のスクリプトだとグローバル衝突する）
