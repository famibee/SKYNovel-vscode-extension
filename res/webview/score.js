const vscode = ('acquireVsCodeApi' in window) ?acquireVsCodeApi() :null;
document.addEventListener('DOMContentLoaded', ()=> {
	document.getElementById('tglEdit')
	.addEventListener('click', ()=> {
		Array.from(document.getElementsByClassName('tglEdit'))
		.forEach(e=> e.classList.toggle('d-none'));
	}, {passive: true});

	if (vscode) document.getElementById('sn-grpModal')
	.addEventListener('show.bs.modal', e=> {
console.log(`fn:score.js line:11 show.bs.modal`);
		const ds = e.relatedTarget.dataset;
		show_modal(ds.title, ds.fld);
	}, {passive: true});

	trHd = document.querySelector('tr');
	aTr = Array.from(document.querySelectorAll('tr')).slice(1);
	next_id = lenTr = aTr.length;
	rsv_ev();
	vscode?.postMessage({cmd: 'loaded'});

	if (! vscode) {
		searchPath = fn=> fn;
		combining();	// 結合
	//	separation();	// 分離（テスト）
	}
});
// 削除ボタン非表示
function tglEditOff() {
	Array.from(document.getElementsByClassName('tglEdit'))
	.forEach(e=> e.classList.add('d-none'));
}

let trHd;
let aTr = [];
let lenTr = 0;
let next_id = 0;
let path_prj = './score_mat/';
let hFld2url = {};
let hPath = {};

function show_modal(title, key) {
	document.getElementById('sn-grpModalLabel').textContent = title;
	document.getElementById('sn-grpModalBody')
	.innerHTML = `
<div class="card-group">`+ hFld2url[key].map((v, i)=> `
<div class="card">
	<img src="${path_prj}${v.path}" class="card-img-top"/>
	<div class="card-body"><div class="form-check">
		<input class="form-check-input" type="radio" name="sn-grpModal_img" id="sn-grpModal_img${i}"/>
		<label class="form-check-label" for="sn-grpModal_img${i}">${v.fn}</label>
	</div></div>
</div>
`) +`</div>`;
}

window.addEventListener('message', e=> {
//vscode.postMessage({cmd: 'info', text: `score.js`});
	if (! e.isTrusted) {
		vscode.postMessage({cmd: 'warn', text: `(score.js) isTrusted = false`});
		return;
	}

	const o = e.data;
	switch (o.cmd) {
		case 'upd_db':
			path_prj = o.path_prj;
			hFld2url = o.hFld2url;
			hPath = o.hPath;
			if (o.combining) combining();	// 結合
			break;

		case 'add_res':{
			const tr = document.querySelector(`tr[data-row="${o.row}"]`);
			tr.innerHTML = o.htm;
			rsv_ev_one(tr);	// renew()代わりのイベント張り直し
			savehtm();	// 結合前に
			combining();	// 結合
		}
			break;

		case 'separation':	separation();	break;	// 分離
		case 'combining':	savehtm();	combining();	break;	// 結合
		case 'ins':{
			tglEditOff();	// 削除ボタン非表示
			const new_tr = document.createElement('tr');
			new_tr.dataset.row = next_id++;
			new_tr.innerHTML = o.htm.replace(/<tr .+>|<\/tr>/g, '');
			if (o.sl >= lenTr) {
				const tr_to = aTr[0];
				tr_to.parentElement.appendChild(new_tr);
				aTr.push(new_tr);
			}
			else {
				const tr_to = aTr[o.sl];
				tr_to.parentElement.insertBefore(new_tr, tr_to);
				aTr.splice(o.sl, 0, new_tr);
			}
			++lenTr;
			rsv_ev_one(new_tr);	// renew()代わりのイベント張り直し
		}
			break;
		case 'rep':
			tglEditOff();	// 削除ボタン非表示
			if (o.sl < lenTr) {
				aTr[o.sl].innerHTML = o.htm.replace(/<tr .+>|<\/tr>/g, '');
				rsv_ev_one(aTr[o.sl]);	// renew()代わりのイベント張り直し
			}
			break;
		case 'del':
			if (o.sl < lenTr) aTr[o.sl].remove();
			aTr.splice(o.sl, 1);
			--lenTr;
			break;
	}
}, {passive: true});

function savehtm() {
	vscode.postMessage({cmd: 'savehtm', tbody: document.getElementsByTagName('tbody')[0].innerHTML});
}

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

function findTr(nd) {
	while (nd.nodeName !== 'TR') {
		if (nd.nodeName === 'BODY') return null;
		nd = nd.parentElement;
	}
	return nd;
}

function tr2lnum(nd) {return aTr.findIndex(tr=> tr === nd);}

// イベント張り
function rsv_ev_one(pa) {
	// 削除ボタン
	Array.from(pa.querySelectorAll('button.btn-danger'))
	.forEach(btn=> btn.addEventListener('click', e=> {
		const nd = findTr(e.target);
		const lnum = tr2lnum(nd);
		separation();	// 分離
		nd.remove();
		savehtm();	// 結合前に
		combining();	// 結合
		aTr.splice(lnum, 1);
		--lenTr;
		vscode?.postMessage({cmd: 'del', lnum: lnum});
	}, {passive: true}));

	// 本文
	Array.from(pa.querySelectorAll('button.sn-ext_txt'))
	.forEach(btn=> new mdb.Dropdown(btn));

	// テキストエリア
	Array.from(pa.querySelectorAll('textarea'))
	.forEach(ta=> {
		const lnum = tr2lnum(findTr(ta));
		new mdb.Input(ta.parentElement).init();
		ta.addEventListener('input', ()=> {
			// 高さを自動変更
			ta.style.height = '10px';
			let sclH = parseInt(ta.scrollHeight);
			const lineH = parseInt(window.getComputedStyle(ta).lineHeight);
			if (sclH < lineH *2) sclH = lineH *2;	// 最低2行
			ta.style.height = sclH +'px';

			vscode.postMessage({cmd: 'input', lnum: lnum, nm: ta.dataset.nm, val: ta.value});
		}, {passive: true})
	});

	// ドラッグ出来るアイテムの設定
	Array.from(pa.querySelectorAll('button[draggable="true"]'))
	.forEach(btn=> btn.addEventListener('dragstart', e=> {
		e.dataTransfer.setData('from', 'score');
		e.dataTransfer.setData('id', e.target.id);
	}, {passive: true}));

	// 
/*
	document.querySelectorAll('.sn-chk').forEach(c=> c.addEventListener('input', ()=> {
		vscode.postMessage({cmd: 'input', id: c.id, val: c.checked});
	}, {passive: true}));
*/
}
function rsv_ev() {
	// イベント張り
	rsv_ev_one(document);

	// ドラッグ＆ドロップ関連
	const tb = document.getElementsByTagName('tbody')[0];
	// ドロップゾーンの設定
	tb.addEventListener('dragenter', e=> {
		let nd = findTr(e.target);
		if (! nd) return;
		nd.classList.add('table-danger');

		e.preventDefault();
	});
	tb.addEventListener('dragover', e=> e.preventDefault());
	tb.addEventListener('dragleave', e=> {
		let nd = findTr(e.target);
		if (! nd) return;
		nd.classList.remove('table-danger');

		e.preventDefault();
	});

	//ドロップされたときの処理
	tb.addEventListener('drop', e=> {
		let tr_to = findTr(e.target);
		if (! tr_to) return;
		tr_to.classList.remove('table-danger');
		tglEditOff();	// 削除ボタン非表示

		const from = e.dataTransfer.getData('from');
		const id = e.dataTransfer.getData('id');

		let to = 0;	// 見出し含まず、<tr>一行目を0とする
		for (; to<lenTr; ++to) if (aTr[to] === tr_to) break;
//console.log(`fn:score.js line:247 from:${from} id:${id} to:${to} tr_to:%o`, tr_to);
		const pa = tr_to.parentElement;
		if (from === 'toolbox') {
			const new_tr = document.createElement('tr');
			new_tr.dataset.row = next_id;
			separation();	// 分離
			pa.insertBefore(new_tr, tr_to);
			aTr.splice(to, 0, new_tr);
			++lenTr;
			// 後で	combining();	// 結合

			const scr = e.dataTransfer.getData('scr');
			vscode?.postMessage({cmd: 'add_req', id: id, row: next_id++, scr: scr, to: to});
			return;
		}

		if (from === 'score') {
			const tr_from = findTr(document.getElementById(id));
			let fr = 0;
			for (; fr<lenTr; ++fr) if (aTr[fr] === tr_from) break;

			separation();	// 分離
			if (fr +1 === to) {
				pa.insertBefore(tr_to, tr_from);
				aTr.splice(to, 2, tr_to, tr_from);
			}
			else {
				pa.insertBefore(tr_from, (fr > to) ?tr_to :tr_to.nextSibling);
				if (fr > to) {
					aTr.splice(fr, 1);
					aTr.splice(to, 0, tr_from);
				}
				else {
					aTr.splice(to +1, 0, tr_from);
					aTr.splice(fr, 1);
				}
			}
//console.log(`fn:score.js line:278 aTr:${aTr.map(v=> v.dataset.row).join()}`);
			savehtm();	// 結合前に
			combining();	// 結合

			vscode?.postMessage({cmd: 'move', from: fr, to: to});
		}
	}, {passive: true});
}

const EXT_SPRITE	= 'png|jpg|jpeg|json|svg|webp|mp4|webm';
const EXT_SCRIPT	= 'ssn|sn';
const EXT_SOUND		= 'mp3|m4a|ogg|aac|flac|wav';

function combining() {	// 結合
	const hCmbCol = {};
	const lenCols = trHd.children.length;
	let aInf = Array(lenCols);
	for (let i=0; i<lenCols; ++i) {
		aInf[i] = {
			in_area		: false,
			before_chg	: false,
			elm_start	: null,
			style		: '',
			tooltip		: '',
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
						inf.tooltip = `fn=${td.dataset.fn}`;
						break;
					case 'bgm':
						inf.style = 'background: linear-gradient(-135deg, #39C0ED, #1E00FF);';
						inf.tooltip = `fn=${td.dataset.fn}`;
						break;
					default:	inf.style = '';
				}
			}
			else if (inf.in_area) {
				if (inf.before_chg) {
					inf.elm_start = td;
					td.rowSpan = 1;
					td.setAttribute('style', inf.style);
					if (inf.tooltip) td.title = inf.tooltip;
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
				td.title = '';
			}
		}
	});
}
