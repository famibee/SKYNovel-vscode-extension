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
	updATr();
	next_id = lenTr;
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
function updATr() {
	aTr = Array.from(document.querySelectorAll('tr')).slice(1);
	lenTr = aTr.length;
}

let trHd;
let aTr = [];
let lenTr = 0;
let next_id = 0;
let pathPrj = './score_mat/';
let hFld2url = {};
let hPath = {};
let hWords = {};

function show_modal(title, key) {
	document.getElementById('sn-grpModalLabel').textContent = title;
	document.getElementById('sn-grpModalBody')
	.innerHTML = `
<div class="card-group">`+ hFld2url[key].map((v, i)=> `
<div class="card">
	<img src="${pathPrj}${v.path}" class="card-img-top"/>
	<div class="card-body"><div class="form-check">
		<input class="form-check-input" type="radio" name="sn-grpModal_img" id="sn-grpModal_img${i}"/>
		<label class="form-check-label" for="sn-grpModal_img${i}">${v.fn}</label>
	</div></div>
</div>
`) +`</div>`;
}

window.addEventListener('message', e=> {
	if (! e.isTrusted) {
		vscode.postMessage({cmd: 'warn', text: `(score.js) isTrusted = false`});
		return;
	}

	const o = e.data;
/*
		const oaa = {...o};
		delete oaa.cmd;
		delete oaa.pathPrj;
		delete oaa.hFld2url;
		delete oaa.hPath;
		delete oaa.htm;
	console.log(`fn:score.js line:65 cmd:${o.cmd} o:${JSON.stringify(oaa)}`);
*/
	switch (o.cmd) {
		case 'upd_db':
			pathPrj = o.pathPrj;
			hFld2url = o.hFld2url;
			hPath = o.hPath;
			break;

		case 'upd_btn_face':{
			tglEditOff();	// 削除ボタン非表示
			if (o.ln >= lenTr) break;

			const btn = aTr[o.ln].getElementsByTagName('button');
			btn[1].innerHTML = o.htm;

			const tbl = document.createElement('tr');
			tbl.innerHTML = o.td;
			const vtd = tbl.children[0];
			if (vtd.classList.contains('sn-cmb-start')) {
				const td = findTd(btn[0]);
				td.classList.add('sn-cmb-start');
				td.dataset.fn = vtd.dataset.fn;

				const tr2tds = aTr[o.ln +1].querySelectorAll('td[rowspan]');
				if (tr2tds.length > 0) {
					const td2 = tr2tds[0];
					td2.title = `${o.nm}=${o.val}`;
					td2.style.backgroundImage = td2.style.backgroundImage
					.replace(
						/(doc\/prj\/).+"\)$/,
						`$1${searchPath(o.val, EXT_SPRITE)}`
					);
				}
			}
		}	break;

		case 'del_wds':	delete hWords[o.key];	break;
		case 'res_wds':
			const a = hWords[o.key] = o.aWd;
			hKey2AWdsReq[o.key].forEach(f=> f(a));
			delete hKey2AWdsReq[o.key];
			break;

		case 'tool_res':{
			const tr = document.querySelector(`tr[data-row="${o.row}"]`);
			tr.innerHTML = o.htm;
			rsv_ev_one(tr);	// renew()代わりのイベント張り直し
			save_tbody();	// 結合前に
			combining();	// 結合
		}
			break;

		case 'separation':	separation();	break;	// 分離
		case 'combining':	save_tbody();	combining();	break;	// 結合
		case 'ins':{
			tglEditOff();	// 削除ボタン非表示
			const new_tr = document.createElement('tr');
			new_tr.dataset.row = next_id++;
			new_tr.innerHTML = o.htm;
			if (o.ln >= lenTr) {
				const tr_to = aTr[0];
				tr_to.parentElement.appendChild(new_tr);
				aTr.push(new_tr);
			}
			else {
				const tr_to = aTr[o.ln];
				tr_to.parentElement.insertBefore(new_tr, tr_to);
				aTr.splice(o.ln, 0, new_tr);
			}
			++lenTr;
			rsv_ev_one(new_tr);	// renew()代わりのイベント張り直し
		}	break;
		case 'del':
			if (o.ln < lenTr) aTr[o.ln].remove();
			aTr.splice(o.ln, 1);
			--lenTr;
			break;
		case 'rep':
			tglEditOff();	// 削除ボタン非表示
			if (o.ln >= lenTr) break;

			aTr[o.ln].innerHTML = o.htm;
			rsv_ev_one(aTr[o.ln]);	// renew()代わりのイベント張り直し
			updATr();	// なにを何行追加されるか不明なので
			break;
	}
}, {passive: true});

function save_tbody() {
	vscode.postMessage({cmd: 'save_tbody', tbody: document.getElementsByTagName('tbody')[0].innerHTML});
}

const	regPath = /([^\/\s]+)\.([^\d]\w+)/;
	// 4 match 498 step(~1ms)  https://regex101.com/r/tpVgmI/1
function searchPath(path, extptn = '') {
	const a = path.match(regPath);
	let fn = a ?a[1] :path;
	const ext = a ?a[2] :'';
	const h_exts = hPath[fn];
	if (! h_exts) {
		const m = `サーチパスに存在しないファイル【${path}】です`;
		console.error(m);
		vscode?.postMessage({cmd: 'err', text: m});
		throw m;
	}

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
function findTd(nd) {
	while (nd.nodeName !== 'TD') {
		if (nd.nodeName === 'BODY') return null;
		nd = nd.parentElement;
	}
	return nd;
}

function tr2lnum(nd) {return aTr.findIndex(tr=> tr === nd);}

// イベント張り
function rsv_ev_one(pa) {
	// 削除ボタン
	for (const btn of pa.querySelectorAll('button.btn-danger')) btn.addEventListener('click', e=> {
		const nd = findTr(e.target);
		const lnum = tr2lnum(nd);
		separation();	// 分離
		nd.remove();
		save_tbody();	// 結合前に
		combining();	// 結合
		aTr.splice(lnum, 1);
		--lenTr;
		vscode?.postMessage({cmd: 'del', lnum: lnum});
	}, {passive: true});

	// 本文
	for (const btn of pa.querySelectorAll('button.sn-ext_txt')) new mdb.Dropdown(btn);

	// テキストエリア
	for (const ta of pa.querySelectorAll('input,textarea')) ta=> {
		new mdb.Input(ta.parentElement).init();
		ta.addEventListener('input', e=> {
			if (e.target.nodeName === 'TEXTAREA') {
				// 高さを自動変更
				ta.style.height = '10px';
				let sclH = parseInt(ta.scrollHeight);
				const lineH = parseInt(window.getComputedStyle(ta).lineHeight);
				if (sclH < lineH *2) sclH = lineH *2;	// 最低2行
				ta.style.height = sclH +'px';
			}

			chgOtherTrBrother(ta);	// <TR>内の他の兄弟要素を更新

			vscode.postMessage({cmd: 'input', ln: tr2lnum(findTr(ta)), nm: ta.dataset.nm, val: ta.value});
		}, {passive: true});
	}

	// ドラッグ出来るアイテムの設定
	for (const btn of pa.querySelectorAll('button[draggable="true"]')) btn.addEventListener('dragstart', e=> {
		e.dataTransfer.setData('from', 'score');
		e.dataTransfer.setData('id', e.target.id);
	}, {passive: true});

	// select系
	for (const s of pa.getElementsByTagName('select')) {
		for (const btn of findTd(s).getElementsByClassName('dropdown-toggle')) {
			btn.addEventListener('show.bs.dropdown', ()=> {
				const fnc = a=> {
					const f = s.dataset.filter;
					if (f) {
						const exp = new RegExp(f);
						a = a.filter(fn=> {try {
							return exp.test(searchPath(fn, s.dataset.exts));
						} catch (e) {
							return false;
						}});
					}
					s.innerHTML =`
	<option selected>${s.value}</option>
	<option value="null">（指定なし）</option><option>${
		a.sort().join('</option><option>')
	}</option>`;
				};
				const key = s.dataset.key;
				const a = hWords[key];
				if (a) fnc(a); else {
					const aw = hKey2AWdsReq[key];
					if (aw) {aw.push(fnc); return;}
					hKey2AWdsReq[key] = [fnc];
					vscode?.postMessage({cmd: 'req_wds', key: key});
				}
			});
		}

		s.addEventListener('change', ()=> {
			chgOtherTrBrother(s);	// <TR>内の他の兄弟要素を更新

			vscode.postMessage({cmd: 'input', ln: tr2lnum(findTr(s)), nm: s.dataset.nm, val: s.value});
		}, {passive: true});

		// dropdownが閉じてしまう対策
		s.addEventListener('click', e=> e.stopPropagation());
	}
	// range系
	for (const r of pa.querySelectorAll('input[type="range"]')) {
		r.addEventListener('change', ()=> {
			chgOtherTrBrother(r);	// <TR>内の他の兄弟要素を更新

			vscode?.postMessage({cmd: 'input', ln: tr2lnum(findTr(r)), nm: r.dataset.nm, val: r.value});
		}, {passive: true});
	}
	// checkbox系
	let skipDummyChkEv = false;
	for (const r of pa.querySelectorAll('input[type="checkbox"]')) {
		r.addEventListener('change', e=> {
			if (skipDummyChkEv) {skipDummyChkEv = false; return;}

			chgOtherTrBrother(r);	// <TR>内の他の兄弟要素を更新

			vscode?.postMessage({cmd: 'input', ln: tr2lnum(findTr(r)), nm: r.dataset.nm, val: r.checked});
		}, {passive: true});

		// dropdownが閉じてしまう対策2(vscodeではこれもいる)
		r.addEventListener('click', e=> e.stopPropagation());
		// dropdownが閉じてしまう対策
		r.nextElementSibling.addEventListener('click', e=> {
			e.stopPropagation();
			skipDummyChkEv = true;	// 以下によるイベント重複対策
			r.click();		// チェックが入らないので手動
		});
	}
}
let hKey2AWdsReq = {};
function chgOtherTrBrother(cmp) {	// <TR>内の他の兄弟要素を更新
	Array.from(findTr(cmp).querySelectorAll(`[data-nm=${cmp.dataset.nm}]`)).forEach(c=> {
		if (c === cmp) return;
		c.value = cmp.value;
	});
}
function rsv_ev() {
	rsv_ev_one(document);	// イベント張り

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

		const to = tr2lnum(tr_to);	// 見出し含まず、<tr>一行目を0とする
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
			vscode?.postMessage({cmd: 'tool_put', id: id, row: next_id++, scr: scr, to: to});
			return;
		}

		if (from === 'score') {
			const tr_from = findTr(document.getElementById(id));
			const fr = tr2lnum(tr_from);
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
			save_tbody();	// 結合前に
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
						inf.style = `background: url(${pathPrj + searchPath(td.dataset.fn, EXT_SPRITE)}) repeat-y 50% 0%; background-size: 100% auto;`;
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
		aInf[i] = {rowSpan: 0,};
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
				delete td.rowSpan;
				td.title = '';
			}
		}
	});
}
