// 別のタブにフォーカスして戻るたびに発生（丸ごと再生成？）するので、このような
// リクエストして最新情報をホストにもらう、サーバー・クライアント方式になっている。
// この事実を、createWebviewPanel()したホストは知りもしないので。
// オブジェクト指向、メッセージドリブンと云えばそうなもかもしれんけど、さ。
const vscode = ('acquireVsCodeApi' in window) ?acquireVsCodeApi() :null;
window.addEventListener('message', e=> {
//vscode.postMessage({cmd: 'info', text: 'setting.js'});	// デバッグ時はこう
	if (! e.isTrusted) {
		vscode.postMessage({cmd: 'warn', text: `(setting.js) isTrusted = false`});
		return;
	}
	if (e.data.cmd != 'res') return;

	const o = e.data.o;

	for (const n in o) {
		if (n === 'save_ns' || n === 'debuger_token') continue;
		const en = o[n];
		if (n === 'debug' || n === 'code') for (const k in en) {
			document.getElementById(`${n}.${k}`).checked = en[k];
		}
		else for (const k in en) {
			const elm = document.getElementById(`${n}.${k}`);
			elm.value = en[k];
			elm.focus();	// input表示の癖に対応
		}
	}
	const elm = document.getElementById('save_ns');
	elm.value = o.save_ns;
	elm.focus();

	const hTemp = [{
		'save_ns'		: 'hatsune',
		'book.title'	: '初音館にて',
		'book.creator'	: 'ふぁみべぇ',
		'book.cre_url'	: 'https://twitter.com/famibee',
		'book.publisher': '電子演劇部',
		'book.pub_url'	: 'https://famibee.blog.fc2.com/',
		'book.detail'	: '江戸川乱歩「孤島の鬼」二次創作ノベルゲームサンプルです。',
	}, {
		'save_ns'		: 'uc',
		'book.title'	: '桜の樹の下には',
		'book.creator'	: 'ふぁみべぇ',
		'book.cre_url'	: 'https://twitter.com/famibee',
		'book.publisher': '電子演劇部',
		'book.pub_url'	: 'https://famibee.blog.fc2.com/',
		'book.detail'	: '梶井基次郎「桜の樹の下には」をノベルゲーム化したものです。',
	}];
	const chkEqTemp = i=> {
		const cl = i.classList;
		if (! cl.contains('sn-vld')) return;

		const len = hTemp.length;
		for (let j=0; j<len; ++j) {
			if (hTemp[j][i.id] == i.value) {	// テンプレと同じ値は警告
				cl.add('is-invalid');
				cl.remove('is-valid');
				break;
			}

			cl.add('is-valid');
			cl.remove('is-invalid');
		}
	};
	document.querySelectorAll('.sn-vld, .sn-gray').forEach(c=> {
		chkEqTemp(c);
		c.addEventListener('input', ()=> {
			chkEqTemp(c);
			vscode.postMessage({cmd: 'input', id: c.id, val: c.value});
		}, {passive: true});
	});

	document.querySelectorAll('.sn-chk').forEach(c=> c.addEventListener('input', ()=> {
		vscode.postMessage({cmd: 'input', id: c.id, val: c.checked});
	}, {passive: true}));

	['cre_url', 'pub_url'].forEach(id=> {
		document.getElementById(`open.${id}`).addEventListener('click', ()=> {
			vscode.postMessage({
				cmd: 'openURL',
				url: document.getElementById(`book.${id}`).value,
			});
		}, {passive: true});
	});
}, {passive: true});
vscode?.postMessage({cmd: 'get'});
