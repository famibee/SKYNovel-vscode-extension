// 別のタブにフォーカスして戻るたびに発生（丸ごと再生成？）するので、このような
// リクエストして最新情報をホストにもらう、サーバー・クライアント方式になっている。
// この事実を、createWebviewPanel()したホストは知りもしないので。
// オブジェクト指向、メッセージドリブンと云えばそうなもかもしれんけど、さ。
const vscode = ('acquireVsCodeApi' in window) ?acquireVsCodeApi() :null;
window.addEventListener('message', e=> {
//vscode.postMessage({cmd: 'info', text: 'tmpwiz.js'});	// デバッグ時はこう
	if (! e.isTrusted) {
		vscode.postMessage({cmd: 'warn', text: `(tmpwiz.js) isTrusted=false`});
		return;
	}

	const o = e.data.o;
	switch (e.data.cmd) {
		case 'res':
			document.querySelectorAll('.sn-vld').forEach(c=> {
				c.addEventListener('input', ()=> {
					vscode.postMessage({cmd: 'input', id: c.id, val: c.value});
				}, {passive: true});
			});

			['hatsune','uc','sample'].forEach(id=> {
				document.getElementById(`btn.tmp_${id}`).addEventListener('click', ()=> {
					vscode.postMessage({cmd: `tmp_${id}`,});
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
