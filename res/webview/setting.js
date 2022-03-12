/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const vscode = ('acquireVsCodeApi' in window) ?acquireVsCodeApi() :undefined;

// 永続性回復
const stt = vscode.getState() ?? {
	active_tab: 'nav-basic',
};
/**/console.log(`fn:setting.js line:14 stt:%o`, stt);

// タブ選択
const th = document.getElementById(`${stt.active_tab}-tab`);
th.classList.add('active');
th.setAttribute('aria-selected', true);
document.getElementById(stt.active_tab).classList.add('show', 'active');

document.querySelectorAll('#nav-tab a').forEach(m=> {
	const nm = m.getAttribute('aria-controls');
	m.addEventListener('show.bs.tab', e=> {
//console.log(`fn:setting.js line:22 === A:${nm} <= B:${e.relatedTarget.getAttribute('aria-controls')}`);
		//	e.target //新しくアクティブ化されたタブ
		//	e.relatedTarget //前のアクティブなタブ

		stt.active_tab = nm;
		vscode.setState(stt);
	});
});

/*
import('doc/prj/script/setting.sn').then(sn=> {
console.log(`fn:setting.js setting.sn ${sn}`);

});

async function loadFile(file) {
	const text = await file.text();
console.log(`fn:setting.js setting.sn ${text}`);
}
loadFile('doc/prj/script/setting.sn');
*/

const file = new FileReader();
file.onload = ()=> {
console.log(`fn:setting.js setting.sn ${file.result}`);
}
file.readAsText('doc/prj/script/setting.sn');


//globalThis.onload = ()=> {};



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
const chkVld = m=> {
	if (! m.classList.contains('sn-vld')) return;

	m.setCustomValidity('');
	hTemp.forEach(v=> {if (v[m.id] === m.value) m.setCustomValidity('x');});
	m.closest('form')?.checkValidity();
};

window.addEventListener('message', e=> {
	if (! e.isTrusted) {
		vscode.postMessage({cmd: 'warn', text:'(setting.js) isTrusted=false'});
		return;
	}

	switch (e.data.cmd) {
		case '!'		:	break;
		case 'updFontInfo'	:{
			document.getElementById('font.info').innerHTML = e.data.htm;
		}	return;

		case 'updimg'	:{
			const m = document.getElementById(e.data.id);
			m.src = m.src.replace(/(\.png).*$/, '$1?'+ (new Date()).getTime());
		}	return;

		case 'disable'	:{
			const m = document.getElementById(e.data.id);
			m.disabled = ! m.disabled;
		}	return;

		case 'cancel'	:{
			const m = document.getElementById(e.data.id);
			m.checked = ! m.checked;
		}	return;

		case 'updValid'	:{
			const m = document.getElementById(e.data.id);
			m.parentElement.querySelector('div.invalid-feedback').textContent = e.data.mes;
			m.setCustomValidity(e.data.mes);
		}	return;

		case 'visible'	:{
console.log(`fn:setting.js line:79 v:${e.data.v}`);
//console.log(`fn:setting.js line:79 v:${e.data.v} stt:%o`, vscode.getState());

		}	return;

		default:	return;
	}

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

	document.querySelectorAll('.sn-vld, .sn-gray').forEach(c=> {
		chkVld(c);
		c.addEventListener('input', ()=> {
			chkVld(c);
			vscode.postMessage({cmd: 'input', id: c.id, val: c.value});
		}, {passive: true});
	});

	document.querySelectorAll('.sn-chk')
	.forEach(c=> c.addEventListener('input', ()=> vscode.postMessage({
		cmd		: 'input',
		id		: c.id,
		val		: c.checked,
	}), {passive: true}));

	['cre_url', 'pub_url'].forEach(id=> document.getElementById(`open.${id}`)
	.addEventListener('click', ()=> vscode.postMessage({
		cmd		: 'openURL',
		dataset	: {url: document.getElementById(`book.${id}`).value,},
	}), {passive: true}));

	document.querySelectorAll('.form-range').forEach(c=> {
		const rngV = c.closest('.range-wrap').querySelector('.range-badge');
		const setValue = ()=> {
			const	val = Number( (c.value - c.min) *100 /(c.max - c.min) ),
					pos = 10 -(val *0.2);
			rngV.innerHTML = `<span>${c.value}</span>`;
			rngV.style.left = `calc(${val}% + (${pos}px))`;
		};
		setValue();
		c.addEventListener('input', setValue, {passive: true});
	});

	document.querySelectorAll('[data-cmd]')
	.forEach(c=> {
		c.addEventListener('click', ()=> vscode.postMessage({
			cmd		: c.dataset.cmd,
			id		: c.id,
			dataset	: {...c.dataset},
		}), {passive: true});
/*
		if (c.dataset.cmd !== 'selectFile') return;

		// ファイルパスや内容を取得できないため、凍結

		// ドロップゾーンの設定
		c.addEventListener('dragenter', e=> {	// 入った
			e.dataTransfer.dropEffect = 'copy';
		//-	e.dataTransfer.effectAllowed = 'copy';
			if (e.dataTransfer.types[0] !== 'Files') e.preventDefault();
		});
		c.addEventListener('dragover', e=> e.preventDefault());	// 領域上空
		c.addEventListener('dragleave', e=> e.preventDefault());// 出た
		c.addEventListener('drop', e=> {	//ドロップされた
			Array.from(e.dataTransfer.files).forEach(f=> {
console.log(`fn:setting.js drop   name:${f.name}`);
//f.text().then(buf=> {
//f.arrayBuffer().then(buf=> {

				vscode.postMessage({
					cmd		: c.dataset.cmd,
					id		: c.id,
					dataset	: {...c.dataset},
//x					stream	: URL.createObjectURL(f),	// undefined
//x					stream	: buf,	// f.arrayBuffer().then(buf=>	undefined
//x					stream	: buf,	// f.text().then(buf=>	undefined
//-					stream	: f.arrayBuffer(),			// undefined
//x					stream	: f.stream(),				// error
				});
//});
			});
		}, {passive: true});
*/
	});

}, {passive: true});
vscode?.postMessage({cmd: '?'});
