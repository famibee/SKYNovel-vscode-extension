// 別のタブにフォーカスして戻るたびに発生（丸ごと再生成？）するので、このような
// リクエストして最新情報をホストにもらう、サーバー・クライアント方式になっている。
// この事実を、createWebviewPanel()したホストは知りもしないので。
const vscode = ('acquireVsCodeApi' in window) ?acquireVsCodeApi() :null;
//vscode.postMessage({cmd: 'info', text: 'tmpwiz.js'});	// デバッグ時はこう

window.addEventListener('message', e=> {
	if (! e.isTrusted) {
		vscode.postMessage({cmd: 'warn', text: `(tmpwiz.js) isTrusted=false`});
		return;
	}

	const o = e.data.o;
	switch (e.data.cmd) {
		case 'res':
			Array.from(document.getElementsByClassName('sn-vld'))
			.forEach(c=> {
				c.addEventListener('input', ()=> {
					vscode.postMessage({cmd: 'input', id: c.id, val: c.value});
				}, {passive: true});
			});

			Array.from(document.getElementsByClassName('btn_tmp'))
			.forEach(e=> {
					e.addEventListener('click', ()=> {
					vscode.postMessage({cmd: e.id});
				}, {passive: true});
			});
			break;

		case 'vld':
			const cl = document.getElementById(o.id).classList;
			if (! cl.contains('sn-vld')) break;
			if (o.valid) {
				cl.add('is-valid');
				cl.remove('is-invalid');
			}
			else {
				cl.add('is-invalid');
				cl.remove('is-valid');
			}
			break;
	}
}, {passive: true});
vscode?.postMessage({cmd: 'get'});
