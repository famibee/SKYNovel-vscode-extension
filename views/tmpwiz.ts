/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

// テンプレートウィザードの webview スクリプト。
//	build.ts が views/tmpwiz.js に出力する（html はそちらを読む）
//
// 別のタブにフォーカスして戻るたびに発生（丸ごと再生成？）するので、このような
// リクエストして最新情報をホストにもらう、サーバー・クライアント方式になっている。
// この事実を、createWebviewPanel()したホストは知りもしないので。

import type {T_TMPWIZ} from '../src/types';

// 拡張機能へ送るメッセージ（受け side は src/ActivityBar.ts #openTempWizard()）
type T_V2E_TMPWIZ =
	| {cmd: 'warn' | 'info', text: string}
	| {cmd: 'input', id: string, val: string}
	| {cmd: Exclude<T_TMPWIZ['cmd'], 'input' | 'info'>};	// 'get' とテンプレ選択ボタン

// 拡張機能から来るメッセージ（送り side は src/ActivityBar.ts #openTempWizard()）
type T_E2V_TMPWIZ = {
	cmd	: 'res';
	o	: object;
} | {
	cmd	: 'vld';
	o	: {id: string, valid: boolean};
};

const vscode = 'acquireVsCodeApi' in window
	? acquireVsCodeApi<undefined>() : undefined;
const cmd2Ex = (o: T_V2E_TMPWIZ)=> vscode?.postMessage(o);

window.addEventListener('message', e=> {
	if (! e.isTrusted) {
		cmd2Ex({cmd: 'warn', text: '(tmpwiz.js) isTrusted=false'});
		return;
	}

	const d = <T_E2V_TMPWIZ>e.data;
	switch (d.cmd) {
		case 'res':
			for (const c of document.getElementsByClassName('sn-vld')) {
				const inp = <HTMLInputElement>c;
				inp.addEventListener('input', ()=> {
					cmd2Ex({cmd: 'input', id: inp.id, val: inp.value});
				}, {passive: true});
			}

			for (const b of document.getElementsByClassName('btn_tmp')) {
				b.addEventListener('click', ()=> {
					cmd2Ex({cmd: <Exclude<T_TMPWIZ['cmd'], 'input' | 'info'>>b.id});
				}, {passive: true});
			}
			break;

		case 'vld':{
			const cl = document.getElementById(d.o.id)?.classList;
			if (! cl?.contains('sn-vld')) break;

			if (d.o.valid) {
				cl.add('is-valid');
				cl.remove('is-invalid');
			}
			else {
				cl.add('is-invalid');
				cl.remove('is-valid');
			}
		}	break;
	}
}, {passive: true});
cmd2Ex({cmd: 'get'});
