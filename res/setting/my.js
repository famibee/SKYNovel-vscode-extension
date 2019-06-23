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

(function() {
	const vscode = acquireVsCodeApi();
	['cre_url', 'pub_url'].forEach(id=> {
		document.getElementById(`open.${id}`).addEventListener('click', e=> {
			vscode.postMessage({
				cmd: 'openURL',
				url: document.getElementById(`book.${id}`).value,
			});
		}, false);
	});

	let is_warn = false;
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

}());
