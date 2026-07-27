/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2020-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

// .ssn スコアエディタの webview スクリプト。
//	build.ts が views/score.js に出力する（html はそちらを読む）
//
// 別のタブにフォーカスして戻るたびに発生（丸ごと再生成？）するので、このような
// リクエストして最新情報をホストにもらう、サーバー・クライアント方式になっている。
// この事実を、createWebviewPanel()したホストは知りもしないので。

import type {T_V2EScore} from '../src/CteScore';

type T_HPATH	= {[fn: string]: {[ext: string]: string}};
type T_HFLD2URL	= {[fld: string]: {path: string, fn: string}[]};

// 拡張機能から来るメッセージ（送り side は src/CteScore.ts）
type T_E2V_SCORE =
	| {cmd: 'upd_db', pathPrj: string, hFld2url: T_HFLD2URL, hPath: T_HPATH}
	| {cmd: 'upd_btn_face', ln: number, htm: string, td: string, nm: string, val: string}
	| {cmd: 'del_wds', key: string}
	| {cmd: 'res_wds', key: string, aWd: string[]}
	| {cmd: 'tool_res', row: number, htm: string}
	| {cmd: 'separation'}
	| {cmd: 'combining'}
	| {cmd: 'ins', ln: number, htm: string}
	| {cmd: 'rep', ln: number, htm: string}
	| {cmd: 'del', ln: number};

// 拡張機能へ送るメッセージ。src/CteScore.ts の型と2箇所ずれているので、
//	挙動を変えないようこちら側で広げている（直すなら両方同時に）
//	- input …… checkbox は val に boolean を入れている（あちらは string）
//	- tool_put … id を足して送っている（あちらの型には無く、使ってもいない）
type T_V2E_SEND =
	| Exclude<T_V2EScore, {cmd: 'input'} | {cmd: 'tool_put'}>
	| {cmd: 'input', ln: number, nm: string, val: string | boolean}
	| {cmd: 'tool_put', id: string, row: number, scr: string, to: number};

// views/lib/mdb（Material Design for Bootstrap）のグローバル
declare const mdb: {
	Dropdown: new (elm: Element)=> unknown;
	Input	: new (elm: Element | null)=> {init(): void};
};

const vscode = 'acquireVsCodeApi' in window ?acquireVsCodeApi<undefined>() :null;
const cmd2Ex = (o: T_V2E_SEND)=> vscode?.postMessage(o);

document.addEventListener('DOMContentLoaded', ()=> {
	document.getElementById('tglEdit')
	?.addEventListener('click', ()=> {
		Array.from(document.getElementsByClassName('tglEdit'))
		.forEach(e=> e.classList.toggle('d-none'));
	}, {passive: true});

	if (vscode) document.getElementById('sn-grpModal')
	?.addEventListener('show.bs.modal', ev=> {
console.log('fn:score.ts show.bs.modal');
		// bootstrap 独自イベントなので DOM の型に relatedTarget が無い
		const {relatedTarget} = <{relatedTarget?: HTMLElement}><unknown>ev;
		const ds = relatedTarget?.dataset;
		if (ds) show_modal(ds.title ?? '', ds.fld ?? '');
	}, {passive: true});

	trHd = document.querySelector('tr');
	updATr();
	next_id = lenTr;
	rsv_ev();
	cmd2Ex({cmd: 'loaded'});

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

let trHd	: Element | null	= null;
let aTr		: HTMLTableRowElement[]	= [];
let lenTr = 0;
let next_id = 0;
let pathPrj = './score_mat/';
let hFld2url: T_HFLD2URL	= {};
let hPath	: T_HPATH		= {};
const hWords: {[key: string]: string[]}	= {};

function show_modal(title: string, key: string) {
	const lbl = document.getElementById('sn-grpModalLabel');
	if (lbl) lbl.textContent = title;

	const body = document.getElementById('sn-grpModalBody');
	if (! body) return;

	body.innerHTML = `
<div class="card-group">`+ (hFld2url[key] ?? []).map((v, i)=> `
<div class="card">
	<img src="${pathPrj}${v.path}" class="card-img-top"/>
	<div class="card-body"><div class="form-check">
		<input class="form-check-input" type="radio" name="sn-grpModal_img" id="sn-grpModal_img${String(i)}"/>
		<label class="form-check-label" for="sn-grpModal_img${String(i)}">${v.fn}</label>
	</div></div>
</div>
`).join(',') +'</div>';	// 元は配列を + でつないでいた（= ',' 区切り）
}

window.addEventListener('message', e=> {
	if (! e.isTrusted) {
		cmd2Ex({cmd: 'warn', text: '(score.js) isTrusted = false'});
		return;
	}

	const o = <T_E2V_SCORE>e.data;
	switch (o.cmd) {
		case 'upd_db':
			pathPrj = o.pathPrj;
			hFld2url = o.hFld2url;
			hPath = o.hPath;
			break;

		case 'upd_btn_face':{
			tglEditOff();	// 削除ボタン非表示
			if (o.ln >= lenTr) break;

			const tr = aTr[o.ln];
			if (! tr) break;

			const btn = tr.getElementsByTagName('button');
			const btn1 = btn[1];
			if (btn1) btn1.innerHTML = o.htm;

			const tbl = document.createElement('tr');
			tbl.innerHTML = o.td;
			const vtd = <HTMLElement | undefined>tbl.children[0];
			const btn0 = btn[0];
			if (vtd?.classList.contains('sn-cmb-start') && btn0) {
				const td = findTd(btn0);
				if (! td) break;

				td.classList.add('sn-cmb-start');
				td.dataset.fn = vtd.dataset.fn;

				const tr2tds = aTr[o.ln +1]
					?.querySelectorAll<HTMLTableCellElement>('td[rowspan]');
				const td2 = tr2tds?.[0];
				if (td2) {
					td2.title = `${o.nm}=${o.val}`;
					td2.style.backgroundImage = td2.style.backgroundImage
					.replace(
						/(doc\/prj\/).+"\)$/,
						`$1${searchPath(o.val, EXT_SPRITE)}`
					);
				}
			}
		}	break;

		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		case 'del_wds':	delete hWords[o.key];	break;
		case 'res_wds':{
			const a = hWords[o.key] = o.aWd;
			hKey2AWdsReq[o.key]?.forEach(f=> {f(a)});
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete hKey2AWdsReq[o.key];
		}	break;

		case 'tool_res':{
			const tr = document.querySelector(`tr[data-row="${String(o.row)}"]`);
			if (! tr) break;

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
			new_tr.dataset.row = String(next_id++);
			new_tr.innerHTML = o.htm;
			if (o.ln >= lenTr) {
				const tr_to = aTr[0];
				tr_to?.parentElement?.appendChild(new_tr);
				aTr.push(new_tr);
			}
			else {
				const tr_to = aTr[o.ln];
				tr_to?.parentElement?.insertBefore(new_tr, tr_to);
				aTr.splice(o.ln, 0, new_tr);
			}
			++lenTr;
			rsv_ev_one(new_tr);	// renew()代わりのイベント張り直し
		}	break;
		case 'del':
			if (o.ln < lenTr) aTr[o.ln]?.remove();
			aTr.splice(o.ln, 1);
			--lenTr;
			break;
		case 'rep':{
			tglEditOff();	// 削除ボタン非表示
			if (o.ln >= lenTr) break;

			const tr = aTr[o.ln];
			if (! tr) break;

			tr.innerHTML = o.htm;
			rsv_ev_one(tr);	// renew()代わりのイベント張り直し
			updATr();	// なにを何行追加されるか不明なので
		}	break;
	}
}, {passive: true});

function save_tbody() {
	const tbody = document.getElementsByTagName('tbody')[0];
	if (tbody) cmd2Ex({cmd: 'save_tbody', tbody: tbody.innerHTML});
}

const	regPath = /([^/\s]+)\.([^\d]\w+)/;
	// 4 match 498 step(~1ms)  https://regex101.com/r/tpVgmI/1
let searchPath = (path: string, extptn = '')=> {
	const a = regPath.exec(path);
	const fn = a?.[1] ?? path;
	const ext = a?.[2] ?? '';
	const h_exts = hPath[fn];
	if (! h_exts) {
		const m = `サーチパスに存在しないファイル【${path}】です`;
		console.error(m);
		cmd2Ex({cmd: 'err', text: m});
		throw m;
	}

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
				if (! search_exts.includes(`|${e2}|`)) continue;
				if (++cnt > 1) throw `指定ファイル【${path}】が複数マッチします。サーチ対象拡張子群【${extptn}】で絞り込むか、ファイル名を個別にして下さい。`;
			}
		}
		for (const e in h_exts) {
			if (! search_exts.includes(`|${e}|`)) continue;

			return h_exts[e] ?? '';
		}
		throw `サーチ対象拡張子群【${extptn}】にマッチするファイルがサーチパスに存在しません。探索ファイル名=【${path}】`;
	}

	// fnに拡張子xが含まれている
	//	ファイル名サーチ→拡張子群にxが含まれるか
	if (extptn !== '') {
		const search_exts2 = `|${extptn}|`;
		if (! search_exts2.includes(`|${ext}|`)) {
			throw `指定ファイルの拡張子【${ext}】は、サーチ対象拡張子群【${extptn}】にマッチしません。探索ファイル名=【${path}】`;
		}
	}

	const ret = h_exts[ext];
	if (! ret) throw `サーチパスに存在しない拡張子【${ext}】です。探索ファイル名=【${path}】、サーチ対象拡張子群【${extptn}】`;

	return ret;
};

// nd から親をたどって nodeName の要素を探す（BODY まで行ったら null）
function findUp(nd: EventTarget | null, nodeName: string): HTMLElement | null {
	let n = nd instanceof HTMLElement ?nd :null;
	while (n && n.nodeName !== nodeName) {
		if (n.nodeName === 'BODY') return null;
		n = n.parentElement;
	}
	return n;
}
const findTr = (nd: EventTarget | null)=> <HTMLTableRowElement | null>findUp(nd, 'TR');
const findTd = (nd: EventTarget | null)=> <HTMLTableCellElement | null>findUp(nd, 'TD');

function tr2lnum(nd: Element | null) {return aTr.findIndex(tr=> tr === nd);}

// イベント張り
function rsv_ev_one(pa: Document | Element) {
	// 削除ボタン
	for (const btn of pa.querySelectorAll('button.btn-danger')) btn.addEventListener('click', e=> {
		const nd = findTr(e.target);
		if (! nd) return;

		const lnum = tr2lnum(nd);
		separation();	// 分離
		nd.remove();
		save_tbody();	// 結合前に
		combining();	// 結合
		aTr.splice(lnum, 1);
		--lenTr;
		cmd2Ex({cmd: 'del', lnum});
	}, {passive: true});

	// 本文
	for (const btn of pa.querySelectorAll('button.sn-ext_txt')) new mdb.Dropdown(btn);

	// テキストエリア
	for (const el of pa.querySelectorAll('input,textarea')) {
		const ta = <HTMLInputElement | HTMLTextAreaElement>el;
		new mdb.Input(ta.parentElement).init();
		ta.addEventListener('input', e=> {
			if ((<HTMLElement | null>e.target)?.nodeName === 'TEXTAREA') {
				// 高さを自動変更
				ta.style.height = '10px';
				let sclH = ta.scrollHeight;	// 元は parseInt()。整数なのでそのまま
				const lineH = parseInt(window.getComputedStyle(ta).lineHeight);
				if (sclH < lineH *2) sclH = lineH *2;	// 最低2行
				ta.style.height = String(sclH) +'px';
			}

			chgOtherTrBrother(ta);	// <TR>内の他の兄弟要素を更新

			cmd2Ex({cmd: 'input', ln: tr2lnum(findTr(ta)), nm: ta.dataset.nm ?? '', val: ta.value});
		}, {passive: true});
	}

	// ドラッグ出来るアイテムの設定
	for (const btn of pa.querySelectorAll('button[draggable="true"]')) btn.addEventListener('dragstart', ev=> {
		const {dataTransfer, target} = <DragEvent>ev;
		if (! dataTransfer) return;

		dataTransfer.setData('from', 'score');
		dataTransfer.setData('id', (<HTMLElement | null>target)?.id ?? '');
	}, {passive: true});

	// select系
	for (const s of pa.getElementsByTagName('select')) {
		const td = findTd(s);
		if (td) for (const btn of td.getElementsByClassName('dropdown-toggle')) {
			btn.addEventListener('show.bs.dropdown', ()=> {
				const fnc = (aWd: string[])=> {
					const f = s.dataset.filter;
					const a = ! f ?aWd :aWd.filter(fn=> {try {
						return new RegExp(f).test(searchPath(fn, s.dataset.exts));
					} catch {
						return false;
					}});
					s.innerHTML =`
	<option selected>${s.value}</option>
	<option value="null">（指定なし）</option><option>${
		a.sort().join('</option><option>')
	}</option>`;
				};
				const key = s.dataset.key ?? '';
				const a = hWords[key];
				if (a) fnc(a); else {
					const aw = hKey2AWdsReq[key];
					if (aw) {aw.push(fnc); return;}
					hKey2AWdsReq[key] = [fnc];
					cmd2Ex({cmd: 'req_wds', key});
				}
			});
		}

		s.addEventListener('change', ()=> {
			chgOtherTrBrother(s);	// <TR>内の他の兄弟要素を更新

			cmd2Ex({cmd: 'input', ln: tr2lnum(findTr(s)), nm: s.dataset.nm ?? '', val: s.value});
		}, {passive: true});

		// dropdownが閉じてしまう対策
		s.addEventListener('click', e=> {e.stopPropagation()});
	}
	// range系
	for (const el of pa.querySelectorAll('input[type="range"]')) {
		const r = <HTMLInputElement>el;
		r.addEventListener('change', ()=> {
			chgOtherTrBrother(r);	// <TR>内の他の兄弟要素を更新

			cmd2Ex({cmd: 'input', ln: tr2lnum(findTr(r)), nm: r.dataset.nm ?? '', val: r.value});
		}, {passive: true});
	}
	// checkbox系
	let skipDummyChkEv = false;
	for (const el of pa.querySelectorAll('input[type="checkbox"]')) {
		const r = <HTMLInputElement>el;
		r.addEventListener('change', ()=> {
			if (skipDummyChkEv) {skipDummyChkEv = false; return;}

			chgOtherTrBrother(r);	// <TR>内の他の兄弟要素を更新

			cmd2Ex({cmd: 'input', ln: tr2lnum(findTr(r)), nm: r.dataset.nm ?? '', val: r.checked});
		}, {passive: true});

		// dropdownが閉じてしまう対策2(vscodeではこれもいる)
		r.addEventListener('click', e=> {e.stopPropagation()});
		// dropdownが閉じてしまう対策
		r.nextElementSibling?.addEventListener('click', e=> {
			e.stopPropagation();
			skipDummyChkEv = true;	// 以下によるイベント重複対策
			r.click();		// チェックが入らないので手動
		});
	}
}
const hKey2AWdsReq: {[key: string]: ((aWd: string[])=> void)[]} = {};
function chgOtherTrBrother(cmp: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
	// <TR>内の他の兄弟要素を更新
	const tr = findTr(cmp);
	if (! tr) return;

	for (const el of tr.querySelectorAll(`[data-nm=${cmp.dataset.nm ?? ''}]`)) {
		if (el === cmp) continue;

		(<HTMLInputElement>el).value = cmp.value;
	}
}
function rsv_ev() {
	rsv_ev_one(document);	// イベント張り

	// ドラッグ＆ドロップ関連
	const tb = document.getElementsByTagName('tbody')[0];
	if (! tb) return;

	// ドロップゾーンの設定
	tb.addEventListener('dragenter', e=> {
		const nd = findTr(e.target);
		if (! nd) return;
		nd.classList.add('table-danger');

		e.preventDefault();
	});
	tb.addEventListener('dragover', e=> {e.preventDefault()});
	tb.addEventListener('dragleave', e=> {
		const nd = findTr(e.target);
		if (! nd) return;
		nd.classList.remove('table-danger');

		e.preventDefault();
	});

	//ドロップされたときの処理
	tb.addEventListener('drop', e=> {
		const tr_to = findTr(e.target);
		if (! tr_to) return;
		tr_to.classList.remove('table-danger');
		tglEditOff();	// 削除ボタン非表示

		const {dataTransfer} = e;
		if (! dataTransfer) return;

		const from = dataTransfer.getData('from');
		const id = dataTransfer.getData('id');

		const to = tr2lnum(tr_to);	// 見出し含まず、<tr>一行目を0とする
		const pa = tr_to.parentElement;
		if (! pa) return;

		if (from === 'toolbox') {
			const new_tr = document.createElement('tr');
			new_tr.dataset.row = String(next_id);
			separation();	// 分離
			pa.insertBefore(new_tr, tr_to);
			aTr.splice(to, 0, new_tr);
			++lenTr;
			// 後で	combining();	// 結合

			const scr = dataTransfer.getData('scr');
			cmd2Ex({cmd: 'tool_put', id, row: next_id++, scr, to});
			return;
		}

		if (from === 'score') {
			const tr_from = findTr(document.getElementById(id));
			if (! tr_from) return;

			const fr = tr2lnum(tr_from);
			separation();	// 分離
			if (fr +1 === to) {
				pa.insertBefore(tr_to, tr_from);
				aTr.splice(to, 2, tr_to, tr_from);
			}
			else {
				pa.insertBefore(tr_from, fr > to ?tr_to :tr_to.nextSibling);
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

			cmd2Ex({cmd: 'move', from: fr, to});
		}
	}, {passive: true});
}

const EXT_SPRITE	= 'png|jpg|jpeg|json|svg|webp|mp4|webm';
//const EXT_SCRIPT	= 'ssn|sn';
//const EXT_SOUND	= 'mp3|m4a|ogg|aac|flac|wav';

// 見出し行から「結合する列」を集める（combining / separation 共通）
function getCmbCol() {
	const hCmbCol: {[col: number]: string} = {};
	const lenCols = trHd?.children.length ?? 0;
	for (let i=0; i<lenCols; ++i) {
		const cmb = (<HTMLElement | undefined>trHd?.children[i])?.dataset.cmb;
		if (cmb) hCmbCol[i] = cmb;
	}
	return {hCmbCol, lenCols};
}

function combining() {	// 結合
	type T_INF = {
		in_area		: boolean;
		before_chg	: boolean;
		elm_start	: HTMLTableCellElement | null;
		style		: string;
		tooltip		: string;
	};
	const {hCmbCol, lenCols} = getCmbCol();
	const aInf: T_INF[] = [];
	for (let i=0; i<lenCols; ++i) aInf[i] = {
		in_area		: false,
		before_chg	: false,
		elm_start	: null,
		style		: '',
		tooltip		: '',
	};

	aTr.forEach(tr=> {
		for (let c=lenCols -1; c>=0; --c) {
			const cmb = hCmbCol[c];
			if (! cmb) continue;

			const td = <HTMLTableCellElement | undefined>tr.children[c];
			const inf = aInf[c];
			if (! td || ! inf) continue;

			let is_chg = false;
			const cl = td.classList;
			if (cl.contains('sn-cmb-start')) {
				inf.in_area = true;
				is_chg = true;
				switch (cmb) {
					case 'bg':
					case 'fg':
						inf.style = `background: url(${pathPrj + searchPath(td.dataset.fn ?? '', EXT_SPRITE)}) repeat-y 50% 0%; background-size: 100% auto;`;
						inf.tooltip = `fn=${td.dataset.fn ?? ''}`;
						break;
					case 'bgm':
						inf.style = 'background: linear-gradient(-135deg, #39C0ED, #1E00FF);';
						inf.tooltip = `fn=${td.dataset.fn ?? ''}`;
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
					td.parentElement?.removeChild(td);
					if (inf.elm_start) ++inf.elm_start.rowSpan;
				}
			}
			inf.before_chg = is_chg;	// 一つ前の is_chg
		}
	});
}

function separation() {	// 分離
	const {lenCols} = getCmbCol();	// hCmbCol は元から使っていない
	const aInf: {rowSpan: number}[] = [];
	for (let i=0; i<lenCols; ++i) aInf[i] = {rowSpan: 0};

	aTr.forEach(tr=> {
		for (let c=0; c<lenCols; ++c) {
			const inf = aInf[c];
			if (! inf) continue;

			if (inf.rowSpan > 0) {
				--inf.rowSpan;
				tr.children[c -1]?.after(document.createElement('td'));
				continue;
			}

			const td = <HTMLTableCellElement | undefined>tr.children[c];
			if (td && td.rowSpan > 1) {
				td.removeAttribute('style');
				inf.rowSpan = td.rowSpan -1;
			//	delete td.rowSpan;	// 継承アクセサへの delete で元から no-op だった
				td.title = '';
			}
		}
	});
}
