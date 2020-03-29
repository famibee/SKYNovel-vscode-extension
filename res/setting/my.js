// NOTE: 別のタブにフォーカスして戻るたびに発生（丸ごと再生成？）するので、このような
// リクエストして最新情報をホストにもらう、サーバー・クライアント方式になっている。
// この事実を、createWebviewPanel()したホストは知りもしないので。
// オブジェクト指向、メッセージドリブンと云えばそうなもかもしれんけど、さ。
const vscode = acquireVsCodeApi();
window.addEventListener('message', e=> {
	if (! e.isTrusted) {
		vscode.postMessage({cmd: 'warn', text: `(my.js) isTrusted = false`});
		return;
	}
	if (e.data.cmd != 'res') return;

	const o = e.data.o;
	for (const k in o.book) {	// prj.json の値を設定
		const elm = document.getElementById(`book.${k}`);
		elm.value = o.book[k];
		elm.focus();
	}
	for (const k in o.window) {
		const elm = document.getElementById(`window.${k}`);
		elm.value = o.window[k];
		elm.focus();
	}
	for (const k in o.init) {
		const elm = document.getElementById(`init.${k}`);
		elm.value = o.init[k];
		elm.focus();
	}
	for (const k in o.debug) {
		document.getElementById(`debug.${k}`).checked = o.debug[k];
	}
	for (const k in o.code) {
		document.getElementById(`code.${k}`).checked = o.code[k];
	}
	const elm = document.getElementById('save_ns');
	elm.value = o.save_ns;
	elm.focus();

	let is_warn = false;
	const hTemp = [{
		"save_ns"		: "hatsune",
		"book.title"	: "初音館にて",
		"book.creator"	: "夕街昇雪",
		"book.cre_url"	: "https://twitter.com/#!/ugainovel",
		"book.publisher": "活動漫画屋",
		"book.pub_url"	: "http://ugainovel.blog112.fc2.com/",
		"book.detail"	: "江戸川乱歩「孤島の鬼」二次創作ノベルゲームサンプルです。",
	}, {
		"save_ns"		: "uc",
		"book.title"	: "桜の樹の下には",
		"book.creator"	: "夕街昇雪",
		"book.cre_url"	: "https://twitter.com/#!/ugainovel",
		"book.publisher": "活動漫画屋",
		"book.pub_url"	: "http://ugainovel.blog112.fc2.com/",
		"book.detail"	: "梶井基次郎「桜の樹の下には」をノベルゲーム化したものです。",
	}];
	const chkEqTemp = i=> {
		const len = hTemp.length;
		const cl = i.classList;
		for (let j=0; j<len; ++j) {
			if (hTemp[j][i.id] == i.value) {	// テンプレと同じ値は警告
				is_warn = true;
				cl.add('red');
				cl.add('lighten-4');
				break;
			}

			cl.remove('red');
			cl.remove('lighten-4');
		}
	};
	Array.prototype.slice.call(document.getElementsByClassName('validate'))
	.forEach(i=> {
		chkEqTemp(i);
		i.addEventListener('input', ()=> {
			chkEqTemp(i);
			vscode.postMessage({cmd: 'input', id: i.id, val: i.value});
		}, false);
	});
	if (is_warn) vscode.postMessage({cmd: 'warn', text: `テンプレのままの設定があります。他の作品とかぶりますので、変更してください`});

	Array.prototype.slice.call(document.getElementsByClassName('filled-in'))
	.forEach(c=> c.addEventListener('input', ()=> {
		vscode.postMessage({cmd: 'input', id: c.id, val: c.checked});
	}, false));

	['cre_url', 'pub_url'].forEach(id=> {
		document.getElementById(`open.${id}`).addEventListener('click', e=> {
			vscode.postMessage({
				cmd: 'openURL',
				url: document.getElementById(`book.${id}`).value,
			});
		}, false);
	});
});
vscode.postMessage({cmd: 'get'});
