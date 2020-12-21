const vscode = ('acquireVsCodeApi' in window) ?acquireVsCodeApi() :null;
document.addEventListener('DOMContentLoaded', ()=> {
	document.getElementById('tglEdit')
	.addEventListener('click', ()=> {
		Array.from(document.getElementsByClassName('tglEdit'))
		.forEach(e=> e.classList.toggle('d-none'));
	}, {passive: true});

	if (vscode) document.getElementById('sn-grpModal')
	.addEventListener('show.bs.modal', e=> {
		const ds = e.relatedTarget.dataset;
		show_modal(ds.title, ds.fld);
	});

	rsv_ev();
	vscode?.postMessage({cmd: 'loaded'});

	if (! vscode) {
		combining();	// 結合
	//	separation();	// 分離（テスト）
	}
});

let next_id = 0;
let path_prj = './score_mat/';
let hFld2url = {};
let hPath = {};

function show_modal(title, key) {
	document.getElementById('sn-grpModalLabel').textContent = title;
	document.getElementById('sn-grpModalBody')
	.innerHTML = `
<div class="card-group">`+ hFld2url[key].map((v, i)=> {return `
	<div class="card">
		<img src="${path_prj}${v.path}" class="card-img-top"/>
		<div class="card-body"><div class="form-check">
			<input class="form-check-input" type="radio" name="sn-grpModal_img" id="sn-grpModal_img${i}"/>
			<label class="form-check-label" for="sn-grpModal_img${i}">${v.fn}</label>
		</div></div>
	</div>
`}) +`</div>`;
}

window.addEventListener('message', e=> {
//vscode.postMessage({cmd: 'info', text: `score.js`});
	if (! e.isTrusted) {
		vscode.postMessage({cmd: 'warn', text: `(score.js) isTrusted = false`});
		return;
	}

	const o = e.data;
	switch (o.cmd) {
		case 'update':
			path_prj = o.path_prj;
			hFld2url = o.hFld2url;
			hPath = o.hPath;
			combining();	// 結合
			break;

		case 'add_res':
			const new_tr = document.querySelector(`tr[data-row="${o.row}"]`);
			new_tr.innerHTML = o.htm;
			combining();	// 結合
			break;

		case 'separation':	separation();	break;	// 分離
		case 'combining':	combining();	break;	// 結合
		case 'del':
			document.getElementsByClassName('sn-row')[o.sl].remove();	break;
		case 'ins':{
			const new_tr = document.createElement('tr');
			new_tr.dataset.row = next_id++;
			new_tr.classList.add('sn-row');
			new_tr.innerHTML = o.htm.replace(/<tr .+>|<\/tr>/g, '');
				// <tr data-row="${line}" class="sn-row">
			const rows = document.getElementsByClassName('sn-row');
			if (o.sl >= rows.length) {
				const tr_to = rows[0];
				tr_to.parentElement.appendChild(new_tr);
			}
			else {
				const tr_to = rows[o.sl];
				tr_to.parentElement.insertBefore(new_tr, tr_to);
			}
			rsv_ev_one(new_tr);	// renew()代わりのイベント張り直し
		}
			break;
	}
});

const	regPath = /([^\/\s]+)\.([^\d]\w+)/;
	// 4 match 498 step(~1ms)  https://regex101.com/r/tpVgmI/1
function searchPath(path, extptn = '') {
	const a = path.match(regPath);
	let fn = a ?a[1] :path;
	const ext = a ?a[2] :'';
	const h_exts = hPath[fn];
	if (! h_exts) throw `サーチパスに存在しないファイル【${path}】です`;

	let ret = '';
	if (! ext) {	// fnに拡張子が含まれていない
		//	extのどれかでサーチ（ファイル名サーチ→拡張子群にextが含まれるか）
		const hcnt = Number(h_exts[':cnt']);
		if (extptn === '') {
			if (hcnt > 1) throw `指定ファイル【${path}】が複数マッチします。サーチ対象拡張子群【${extptn}】で絞り込むか、ファイル名を個別にして下さい。`;

			return path;
		}

		const search_exts = `|${extptn}|`;
		if (hcnt > 1) {
			let cnt = 0;
			for (const e2 in h_exts) {
				if (search_exts.indexOf(`|${e2}|`) === -1) continue;
				if (++cnt > 1) throw `指定ファイル【${path}】が複数マッチします。サーチ対象拡張子群【${extptn}】で絞り込むか、ファイル名を個別にして下さい。`;
			}
		}
		for (let e in h_exts) {
			if (search_exts.indexOf(`|${e}|`) === -1) continue;

			return h_exts[e];
		}
		throw `サーチ対象拡張子群【${extptn}】にマッチするファイルがサーチパスに存在しません。探索ファイル名=【${path}】`;
	}

	// fnに拡張子xが含まれている
	//	ファイル名サーチ→拡張子群にxが含まれるか
	if (extptn !== '') {
		const search_exts2 = `|${extptn}|`;
		if (search_exts2.indexOf(`|${ext}|`) === -1) {
			throw `指定ファイルの拡張子【${ext}】は、サーチ対象拡張子群【${extptn}】にマッチしません。探索ファイル名=【${path}】`;
		}
	}

	ret = h_exts[ext];
	if (! ret) throw `サーチパスに存在しない拡張子【${ext}】です。探索ファイル名=【${path}】、サーチ対象拡張子群【${extptn}】`;

	return ret;
}


// イベント張り
function rsv_ev_one(pa) {
	// 本文
	Array.from(pa.querySelectorAll('button.sn-ext_txt'))
	.forEach(btn=> new mdb.Popover(btn, {
		container: 'body',
		content: btn.nextElementSibling.children[0],
		trigger: 'click hover',
		html: true,
		placement: 'bottom',
	}));

	// テキストエリアの高さを自動変更
	Array.from(pa.querySelectorAll('textarea'))
	.forEach(e=> e.addEventListener('input', ()=> {
		e.style.height = '10px';
		const sclH = parseInt(e.scrollHeight);
		const lineH = parseInt(window.getComputedStyle(e).lineHeight);
		if (sclH < lineH *2) sclH = lineH *2;	// 最低2行
		e.style.height = sclH +'px';
	}));

	// ドラッグ出来るアイテムの設定
	Array.from(pa.querySelectorAll('button[draggable="true"]'))
	.forEach(btn=> btn.addEventListener('dragstart', e=> {
		e.dataTransfer.setData('from', 'score');
		e.dataTransfer.setData('id', e.target.id);
	}));
}
function rsv_ev() {
//vscode.postMessage({cmd: 'info', text: `renew`});
	next_id = Array.from(document.querySelectorAll('tr')).length;

	// イベント張り
	rsv_ev_one(document);

	// ドラッグ＆ドロップ関連
	const tb = document.getElementsByTagName('tbody')[0];
	// ドロップゾーンの設定
	tb.addEventListener('dragenter', e=> {
		e.preventDefault();

		let nd = e.target;
		while (nd.nodeName !== 'TR') {
			if (nd.nodeName === 'BODY') return;
			nd = nd.parentElement;
		}
		nd.classList.add('table-danger');
	});
	tb.addEventListener('dragover', e=> {
		e.preventDefault();
	});
	tb.addEventListener('dragleave', e=> {
		e.preventDefault();

		let nd = e.target;
		while (nd.nodeName !== 'TR') {
			if (nd.nodeName === 'BODY') return;
			nd = nd.parentElement;
		}
		nd.classList.remove('table-danger');
	});

	//ドロップされたときの処理
	tb.addEventListener('drop', e=> {
		let nd = e.target;
		while (nd.nodeName !== 'TD') {
			if (nd.nodeName === 'BODY') return;
			nd = nd.parentElement;
		}
		nd.parentElement.classList.remove('table-danger');

		const from = e.dataTransfer.getData('from');
		const id = e.dataTransfer.getData('id');

		const rows = document.getElementsByClassName('sn-row');
		const len = rows.length;
		const tr_to = nd.parentElement;
		let to = 0;
		for (; to<len; ++to) if (rows[to] === tr_to) break;
//console.log(`fn:score.js line:179 from:${from} id:${id} to:%o`, tr_to);
		if (from === 'toolbox') {
			const new_tr = document.createElement('tr');
			new_tr.dataset.row = next_id;
			new_tr.classList.add('sn-row');
				// <tr data-row="${line}" class="sn-row">
			separation();	// 分離
			tr_to.parentElement.insertBefore(new_tr, tr_to);
			// 後で	combining();	// 結合

			const scr = e.dataTransfer.getData('scr');
			vscode?.postMessage({cmd: 'add_req', id: id, row: next_id++, scr: scr, to: to});
			return;
		}

		if (from === 'score') {
			const tr_from = document.getElementById(id).parentElement.parentElement;
			let fr = 0;
			for (; fr<len; ++fr) if (rows[fr] === tr_from) break;

			separation();	// 分離
			if (fr +1 === to)
				tr_to.parentElement.insertBefore(tr_to, tr_from);
			else tr_to.parentElement.insertBefore(
				tr_from,
				(fr > to) ?tr_to :tr_to.nextSibling
			);
			combining();	// 結合

			vscode?.postMessage({cmd: 'move', from: fr, to: to});
		}
	});
}

const EXT_SPRITE	= 'png|jpg|jpeg|json|svg|webp|mp4|webm';
const EXT_SCRIPT	= 'ssn|sn';
const EXT_SOUND		= 'mp3|m4a|ogg|aac|flac|wav';

function combining() {	// 結合
	const aTr = Array.from(document.querySelectorAll('tr'));

	const trHd = aTr.shift();
	const hCmbCol = {};
	const lenCols = trHd.children.length;
	let aInf = Array(lenCols);
	for (let i=0; i<lenCols; ++i) {
		aInf[i] = {
			in_area		: false,
			before_chg	: false,
			elm_start	: null,
			style		: '',
		};
		const cmb = trHd.children[i].dataset.cmb;
		if (cmb) hCmbCol[i] = cmb;
	}

	aTr.forEach(tr=> {
		for (let c=lenCols -1; c>=0; --c) {
			const cmb = hCmbCol[c];
			if (! cmb) continue;

			const td = tr.children[c];
			const inf = aInf[c];
			let is_chg = false;
			const cl = td.classList;
			if (cl.contains('sn-cmb-start')) {
				inf.in_area = true;
				is_chg = true;
				switch (cmb) {
					case 'bg':
					case 'fg':
						inf.style = `background: url(${path_prj + searchPath(td.dataset.fn, EXT_SPRITE)}) repeat-y 50% 0%; background-size: 100% auto;`;
						break;
					case 'bgm':
						inf.style = 'background: linear-gradient(-135deg, #39C0ED, #1E00FF);';
						break;
					default:	inf.style = '';
				}
			}
			else if (inf.in_area) {
				if (inf.before_chg) {
					inf.elm_start = td;
					td.rowSpan = 1;
					td.setAttribute('style', inf.style);
				}
				else if (cl.contains('sn-cmb-end')) inf.in_area = false;
				else {
					td.parentElement.removeChild(td);
					++inf.elm_start.rowSpan;
				}
			}
			inf.before_chg = is_chg;	// 一つ前の is_chg
		};
	});
}

function separation() {	// 分離
	const aTr = Array.from(document.querySelectorAll('tr'));

	const trHd = aTr.shift();
	const hCmbCol = {};
	const lenCols = trHd.children.length;
	let aInf = Array(lenCols);
	for (let i=0; i<lenCols; ++i) {
		aInf[i] = {
			rowSpan	: 0,
		};
		const cmb = trHd.children[i].dataset.cmb;
		if (cmb) hCmbCol[i] = cmb;
	}

	aTr.forEach(tr=> {
		for (let c=0; c<lenCols; ++c) {
			const inf = aInf[c];
			if (inf.rowSpan > 0) {
				--inf.rowSpan;
				tr.children[c -1].after(document.createElement('td'));
				continue;
			}

			const td = tr.children[c];
			if (td.rowSpan > 1) {
				td.removeAttribute('style');
				inf.rowSpan = td.rowSpan -1;
				td.rowSpan = 1;
			}
		}
	});
}
