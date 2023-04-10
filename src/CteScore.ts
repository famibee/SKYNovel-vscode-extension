/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2020-2023 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {chkBoolean} from './CmnLib';
import {AnalyzeTagArg, HPRM} from './AnalyzeTagArg';
import {IFn2Path} from './ConfigBase';
import {getNonce} from './ActivityBar';

import {TextDocument, WebviewPanel, CancellationToken, Uri, ExtensionContext, window, Webview, Range, WorkspaceEdit, workspace, Position} from 'vscode';
import {readFileSync} from 'fs-extra';

interface HTDS {
	col?		: string,
	td_style?	: string,
	btn_style?	: string,
	icon		: string,
	btn_face	: string,
	tooltip?	: string,
	args?		: {
		name	: string;
		type	: 'bool'|'str'|'num'|'textarea'|'select'|'range';
		val?	: string;
		hint?	: string;
		key?	: string;
		exts?	: string;
		filter?	: string;
		min?	: string;
		max?	: string;
		step?	: string;
	}[],
	detail?		: string,
}

export class CteScore {
	static	#localExtensionResRoots: Uri;
	static	#htmBaseSrc	= '';
	static	init(ctx: ExtensionContext): void {
		window.registerCustomEditorProvider('SKYNovel.score', {
			async resolveCustomTextEditor(doc: TextDocument, webviewPanel: WebviewPanel, _token: CancellationToken): Promise<void> {
				const path = doc.fileName;
				for (const [cur, v] of Object.entries(CteScore.#hCur2Me)) {
					if (cur !== path.slice(0, cur.length)) continue;

					v.#resolveCustomTextEditor(doc, webviewPanel);
					break;
				}
			}
/*
		},{	// TODO: 要検討
			webviewOptions: {
				enableFindWidget: false,
				retainContextWhenHidden: false,
			},
			supportsMultipleEditorsPerDocument: true,
*/

/*
	https://code.visualstudio.com/updates/v1_44
	> カスタムエディターの場合
"workbench.editorAssociations": [
	{
		"viewType": "catCustoms.catScratch",
		"filenamePattern": "*.catScratch"
	}
]
*/


		});

		const path_ext_htm = ctx.extensionPath +`/views/`;
		CteScore.#localExtensionResRoots = Uri.file(path_ext_htm);
		CteScore.#htmBaseSrc =
		readFileSync(path_ext_htm +'score.htm', {encoding: 'utf8'})
		.replace('<meta_autooff ', '<meta ')	// ローカルデバッグしたいので
		.replace(/\$\{nonce}/g, getNonce())
		.replace(/<tbody>[\s\S]+<\/tbody>/, '<tbody/>')
		.replace(/(<div class="card-group">)[\s\S]+(<\/div><!-- card-group  -->)/, '$1 $2');
	}

	static	#hCur2Me		: {[path: string]: CteScore}	= {};
	constructor(readonly curPrj: string) {CteScore.#hCur2Me[curPrj] = this;}

	#hPath2Tokens	: {[path: string]: {
		uriPrj	: Uri;
		htm		: string;
		skipupd	: boolean;
	}}	= {};
	updScore(path: string, curPrj: string, aToken: string[]) {
		const s = {line: 1};
		this.#hPath2Tokens[path] = {
			uriPrj	: Uri.parse(curPrj),
			htm		: CteScore.#htmBaseSrc.replace('<tbody/>', `<tbody>${
				aToken.map((token, i)=> this.#token2html(s, token, i)).join('')
			}</tbody>`),
			skipupd	: false,
		};

		const wv = this.#hPath2Wv[path];
		if (wv) wv.html = this.#repWvUri(this.#hPath2Tokens[path].htm, wv);
	}
	#repWvUri(inp: string, wv: Webview): string {
		return inp
		.replaceAll('${webview.cspSource}', wv.cspSource)
		.replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(CteScore.#localExtensionResRoots)}/`);	// ファイルごとだけでなく分割ごとにも値が変わる
	}

	add_lay(_o: any) {
//console.log(`fn:CteScore.ts line:91 [add_lay] layer:${_o.layer} class:${_o.class}`);
	}

	isSkipUpd(path: string): boolean {
		const t = this.#hPath2Tokens[path];
		if (t?.skipupd) {t.skipupd = false; return true;}
		return false;
	}


	separation(path: string) {	// 分離
		this.#hPath2Wv[path]?.postMessage({cmd: 'separation'});
	}
	combining(path: string) {	// 結合
		this.#hPath2Wv[path]?.postMessage({cmd: 'combining'});
	}
	updLine(doc: TextDocument, rng: Range, txt: string, aToken: string[]): boolean {	// 分離状態でコールすること
		const wv = this.#hPath2Wv[doc.fileName];
		if (! wv) return false;

		const sl = rng.start.line;
		const el = rng.end.line;
		if ((rng.start.character > 0 ||
			rng.end.character > 0) && sl !== el) return true;
			// 全スキャン。せっかくScoreなので差分更新はオーバースペック

		if (txt === '') {wv.postMessage({cmd: 'del', ln: sl}); return false;}

		wv.postMessage({
			cmd	: (sl === el && txt.at(-1) === '\n') ?'ins' :'rep',
			ln	: sl,
			htm	: (txt === '\n'
				? this.#token2html({line: sl +1}, '\n\n', -1)
				: this.#repWvUri(aToken.map(t=> (t.charCodeAt(0) < 11)
					? ''	// \t(9) タブ、\n(10) 改行
					: this.#token2html({line: sl +1}, t, 0)
				).join(''), wv))
				.replace(/<tr .+>|<\/tr>/g, ''),
		});
		return false;
	}


	#hPath2Wv	: {[path: string]: Webview}	= {};
	static	readonly	analyzTagArg = (token: string)=> CteScore.REG_TAG.exec(token);
	// 47 match 959 step (1ms) https://regex101.com/r/TKk1Iz/4
	static	readonly	REG_TAG	= /\[(?<name>[^\s;\]]+)\s*(?<args>(?:[^"'#\]]+|(["'#]).*?\3)*?)]/;
	#resolveCustomTextEditor(doc: TextDocument, webviewPanel: WebviewPanel) {
		const path = doc.fileName;
		const t = this.#hPath2Tokens[path];
		const wv = this.#hPath2Wv[path] = webviewPanel.webview;
		wv.options = {
			enableScripts: true,
			localResourceRoots: [CteScore.#localExtensionResRoots, t.uriPrj],
		};
		wv.onDidReceiveMessage(o=> {
			switch (o.cmd) {
			case 'info':	window.showInformationMessage(o.text); break;
			case 'warn':	window.showWarningMessage(o.text); break;
			case 'err':		window.showErrorMessage(o.text); break;

			case 'loaded':	this.#updWv_db(path); this.combining(path);	break;
			case 'save_tbody':
				this.#hPath2Tokens[path].htm = wv.html
				.replace(/<tbody>[\s\S]+<\/tbody>/,`<tbody>${o.tbody}</tbody>`);
				break;

			case 'move':{
				const from = o.from, to = o.to;
				if (from === to) break;

				t.skipupd = true;
				const ed = new WorkspaceEdit();
				const rng_from = new Range(from, 0, from +1, 0);
				const ins = doc.getText(rng_from);
				if (from > to) {
					ed.delete(doc.uri, rng_from);
					ed.insert(doc.uri, new Position(to, 0), ins);
				}
				else {
					ed.insert(doc.uri, new Position(to +1, 0), ins);
					ed.delete(doc.uri, rng_from);
				}
				workspace.applyEdit(ed);
			}
				break;

			case 'tool_put':{
				const scr = String(o.scr)
				.replace(/\$\{(.+)\}/g, (_, p1)=> {
					let ret = '';
					for (const i of this.#hBufWords[p1]) {ret = `#${i}#`; break;}
					return ret;
				});
/**/console.log(`fn:CteScore.ts line:176 tool_put row:${o.row} to:${o.to} scr=${scr}=`);
				wv.postMessage({
					cmd	: 'tool_res',
					row	: o.row,
					htm	: this.#repWvUri(this.#token2html({line: o.row}, scr, o.row), wv),
				});

				t.skipupd = true;
				const ed = new WorkspaceEdit();
				ed.insert(doc.uri, new Position(o.to, 0), (scr === '\n\n') ?'\n' :(scr +'\n'));
				workspace.applyEdit(ed);
			}	break;

			case 'del':{
				t.skipupd = true;
				const ed = new WorkspaceEdit();
				ed.delete(doc.uri, new Range(o.lnum, 0, o.lnum +1, 0));
				workspace.applyEdit(ed);
			}
				break;

			case 'input':{
/**/console.log(`fn:CteScore.ts line:184 input ln:${o.ln} nm=${o.nm}= val=${o.val}=`);
				t.skipupd = true;
				const ed = new WorkspaceEdit();
				const rng = new Range(o.ln, 0, o.ln +1, 0);
				/*
					case 38:	// & 変数操作・変数表示
					case 42:	// * ラベル
					case 59:	// ; コメント
					case 91:	// [ タグ開始
				*/
				const base = (o.nm.charCodeAt(0) < 60)
					? o.nm + o.val +'\n'
					: doc.getText(rng);
				let txt = base.replace(
					new RegExp(`(${o.nm}=)([#"']).*\\2`),
					`$1$2${o.val}$2`
				).replace(
					new RegExp(`(${o.nm}=)[^\\] #"']+`),
					`$1${o.val}`
				);
				if (base === txt) txt = txt.replace(/(])/, ` ${o.nm}=#${o.val}#$1`);	// 属性追加
				ed.replace(doc.uri, rng, txt);
				workspace.applyEdit(ed);

				const a_tag = CteScore.analyzTagArg(txt);
				const g = a_tag?.groups;
				if (! g) break;
				const t2t = this.#hTag2Tds[g.name];
				if (! t2t) break;
				CteScore.#alzTagArg.parse(g.args);
				const oTds = t2t(CteScore.#alzTagArg.hPrm);
				wv.postMessage({cmd: 'upd_btn_face', ln: o.ln, htm: `
<i class="fas ${oTds.icon}" aria-hidden="true"></i>
${oTds.btn_face}`, td: `<td class="p-0 ${oTds.td_style}">`, nm: o.nm, val: o.val});
			}	break;

			case 'req_wds':
				wv.postMessage({cmd: 'res_wds', key: o.key, aWd: [...this.#hBufWords[o.key].values()]});
				break;
			}
		}, false);

		wv.html = this.#repWvUri(this.#hPath2Tokens[doc.uri.path].htm, wv);

		// 空ファイルなら適当なテンプレを挿入
		if (doc.getText(new Range(0, 0, 1, 1)) === '') {
			const ed = new WorkspaceEdit();
			ed.insert(doc.uri, new Position(0, 0), '\n\n\n[return]\n');
			workspace.applyEdit(ed);
		}
		// NOTE: sn→ssnらしきものに強制改行を入れるのならここでか
	}
	static	#regFld	= /\w+/;
	#updWv_db(path: string) {
		const hFld2: {[fld: string]: {
			ext		: string;
			path	: string;
			fn		: string;
		}[]} =	{};
		const t = this.#hPath2Tokens[path];
		const hPath = this.#hPrj2hPath;
		for (const [fn, p] of Object.entries(hPath)) {
			for (const [ext, v] of Object.entries(p)) {
				if (ext === ':cnt') continue;

				const path = String(v);
				const fld = String(path.match(CteScore.#regFld));
				hFld2[fld] ??= [];
				hFld2[fld].push({ext, path, fn});
			}
		}

		const wv = this.#hPath2Wv[path];
		wv.postMessage({
			cmd			: 'upd_db',
			pathPrj		: String(wv.asWebviewUri(t.uriPrj)),	// 最後に「/」必要
			hFld2url	: hFld2,
			hPath		: hPath,
		});
	}

	#hBufWords	: {[key: string]: Set<string>}	= {};
	updWords(key: string, Words: Set<string>) {
		this.#hBufWords[key] = Words;
		for (const v of Object.values(this.#hPath2Wv)) {
			v.postMessage({cmd: 'del_wds', key: key});
		}
	}

	#hPrj2hPath	: IFn2Path	= {};
	updPath(hPath: IFn2Path) {
		this.#hPrj2hPath = hPath;
		for (const path_doc of Object.keys(this.#hPath2Tokens)) {
			if (path_doc in this.#hPath2Wv) this.#updWv_db(path_doc);
		}
	}


	#token2html(stt: {line: number}, token: string, idx: number): string {
		let tds = '';
		switch (token.charCodeAt(0)) {	// TokenTopUnicode
			case 9: return '';	// \t タブ
			case 10:	// \n 改行
				const dl = ((idx === 0 && stt.line === 1) ?1 :0);
				const len = token.length +dl;
				stt.line += len -dl;
				if (len === 1) return '';
				let str_r = '';
				for (let i=stt.line -len +1; i<stt.line; ++i) {
					str_r += this.#make_tr(i, this.#make_tds(0, i, 'btn-rounded', 'fa-expand', '（空行）'));
				}
				return str_r;

			case 38:	// & 変数操作・変数表示
				// NOTE: [let]があるので不要かも
				const is_dsp = (token.at(-1) === '&');
				tds = this.#make_tds(
					0, stt.line, 'btn-secondary dropdown-toggle" data-face="true" data-mdb-toggle="dropdown" aria-expanded="false',
					'fa-calculator',
					is_dsp
						? '変数表示'
						: `変数操作 ${
							token.slice(1, token.indexOf('=') +2)
						}…`,
					is_dsp ?token.slice(1, -1) :token.slice(1), `
	<div class="form-outline col-12">
		<input type="text" data-nm="&" id="${idx}txf" class="form-control" value="${token.slice(1)}"/>
		<label class="form-label" for="${idx}txf">${
			is_dsp ?'変数表示' :'変数操作'
		}</label>
	</div>`		);
				break;

			case 59:	// ; コメント
				tds = this.#make_tds(
					0, stt.line, 'btn-outline-light btn-rounded dropdown-toggle" data-face="true" data-mdb-toggle="dropdown" aria-expanded="false',
					'fa-comment-dots', token.slice(1, 11)+'…', token.slice(1), `
	<div class="form-outline col-12">
		<input type="text" data-nm=";" id="${idx}txf" class="form-control" value="${token.slice(1)}"/>
		<label class="form-label" for="${idx}txf">コメント</label>
	</div>`		);
				break;

			case 42:	// * ラベル
				tds = this.#make_tds(
					0, stt.line, 'btn-outline-light dropdown-toggle" data-mdb-toggle="dropdown" aria-expanded="false" data-face="true',
					'fa-tag', token.slice(1), token.slice(1), `
	<div class="form-outline col-12">
		<input type="text" data-nm="*" id="${idx}txf" class="form-control" value="${token.slice(1)}"/>
		<label class="form-label" for="${idx}txf">ラベル</label>
	</div>`		);
				break;

			case 91:	// [ タグ開始
				let lineTkn = 0;	// 複数行タグでの行カウント補正
				let j = -1;
				while ((j = token.indexOf('\n', j +1)) >= 0) ++lineTkn;
				if (lineTkn > 0) stt.line += lineTkn;

				if (tds = this.#make_tds_tag(token, stt.line, idx)) break;
				return '';

			default:	// 文字表示
				tds = this.#make_tds(
					5, stt.line, 'btn-outline-primary text-white dropdown-toggle sn-ext_txt" data-face="true" data-mdb-toggle="dropdown" aria-expanded="false',
					'fa-align-left', '', '', `
	<div class="form-outline col-12">
		<textarea class="form-control" placeholder="本文テキストを入力" cols="40" rows="2" data-nm="text" id="${idx}ta">${token}</textarea>
		<label class="form-label" for="${idx}ta">本文テキスト</label>
	</div>`		);
		}

		return this.#make_tr(stt.line, tds);
	}
	#make_tr(line: number, tds: string): string {
		return `
<tr data-row="${line}">
	${tds}
	<td class="p-0"><div class="d-flex justify-content-center">
		<button type="button" class="btn btn-danger btn-sm btn-floating tglEdit d-none">
			<i class="fas fa-times"></i>
		</button>
	</div></td>
</tr>`;
	}

	#make_tds_tag(token: string, line: number, row: number): string {
		const a_tag = CteScore.analyzTagArg(token);
		const g = a_tag?.groups;
		if (! g) return '';

		const t2t = this.#hTag2Tds[g.name];
		if (! t2t) return this.#make_tds(
			0, line, 'btn-light',
			'fa-code', g.name, g.args,
		);

		CteScore.#alzTagArg.parse(g.args);
		const oTds = t2t(CteScore.#alzTagArg.hPrm);
		const len = oTds.args ?oTds.args.length : 0;
		const frm_style =
			len === 1 ?'col-12 col-sm-3 col-md-2'
		:	len === 2 ?'col-2'
		:	'';
		return this.#make_tds(
			oTds.col ?this.#hCn2Col[oTds.col] :0, line,
			(oTds.btn_style ?? 'btn-secondary')
			+ (oTds.args ?` dropdown-toggle" data-mdb-toggle="dropdown" aria-expanded="false` :''),
			oTds.icon, oTds.btn_face,
			oTds.tooltip ?? g.args,
			oTds.args ?oTds.args.map((v, i)=> {
				let ret = '';
				let fo = 'form-outline px-2';
				const id = `sn-${row}:${i}`;
				switch (v.type) {
					case 'bool':
						fo = 'p-0';	// form-outlineを使うとエラー
						ret = `
<div class="form-control ${frm_style}">
<div class="form-check">
	<input type="checkbox" id="${id}chk" class="form-check-input" data-nm="${v.name}" value="${v.val}"${chkBoolean(v.val) ?' checked' :''}/>
	<label class="form-check-label" for="${id}chk">${v.hint ?? v.name}</label>
</div>
</div>`;				break;

					case 'textarea':
						ret = `
<textarea id="${id}ta" class="form-control" placeholder="${v.hint ?? v.name}を入力" cols="40" rows="2" data-nm="${v.name}">${v.val}</textarea>
<label class="form-label" for="${id}ta">${v.hint ?? v.name}</label>`;
						break;

					case 'select':
						fo = 'p-0';	// form-outlineを使うとエラー
						ret = `
<div class="form-control">
<label class="form-label select-label" for="${id}sel">${v.hint ?? v.name}</label>
<select class="select" id="${id}sel" data-nm="${v.name}" data-key="${v.key}"${
	v.exts ?`data-exts="${v.exts}"` :''
}${
	v.filter ?`data-filter="${v.filter}"` :''
}>
	<option selected>${v.val}</option>
	<option>...</option>
	<option>...</option>
</select>
</div>`;				break;

					case 'range':
						fo = 'p-0';	// form-outlineを使うとエラー
						ret = `
<div class="range form-control">
	<label class="form-label" for="${id}rng">${v.hint ?? v.name}（${v.min} - ${v.max}）</label>
	<input type="range" id="${id}rng" data-nm="${v.name}" class="form-range" min=${v.min} max=${v.max} step=${v.step} value="${v.val}"/>
</div>`;				break;

					default:	ret = `
<input type="${
v.type === 'num' ?'number' :'text'
}" id="${id}txf" class="form-control ${frm_style}" data-nm="${v.name}" value="${v.val}"/>
<label class="form-label" for="${id}txf">${v.hint ?? v.name}</label>`;
				}
				return `
<div class="${fo} col-12 ${
len === 1	? ''
: len === 2	? 'col-md-6'
: 'col-md-6 col-lg-4'
} my-1${
v.type === 'bool' ?' pt-2' :''
}">${ret}</div>`;
			}).join('') :'',
			oTds.td_style ?? '',
			oTds.detail ?? '',
		);
	}


	undefMacro(def_nm: string) {delete this.#hTag2Tds[def_nm];}
	defMacro(def_nm: string, hPrm: any) {
		this.#hTag2Tds[def_nm] = ()=> ({...{
			icon		: 'icon未指定',
			btn_face	: 'btn_face未指定',
		}, ...hPrm});
	}
	static	readonly	#alzTagArg	= new AnalyzeTagArg;
	static	readonly	#EXTS_PIC	= 'jpg|jpeg|png';
	#hTag2Tds	: {[tag_nm: string]: (hPrm: HPRM)=> HTDS}	= {
		ch			: hPrm=> ({
			col			: 'mes',
			btn_style	: 'btn-outline-primary text-white dropdown-toggle sn-ext_txt" data-face="true" data-mdb-toggle="dropdown" aria-expanded="false',
			icon		: 'fa-align-left',
			btn_face	: '',
			tooltip		: '',
			args		: [
				{name: 'text', type: 'textarea', val: hPrm.text?.val ?? '', hint: '本文テキスト'},
			],
			detail		: `<form><textarea class="form-control bg-light" placeholder="本文テキストを入力" data-nm="text">${hPrm.text?.val ?? ''}</textarea></form>`,
		}),

		jump		: hPrm=> ({
			icon		: 'fa-external-link-alt',
			btn_face	: 'ジャンプ'
				+ (hPrm.fn?.val ?` ${hPrm.fn?.val}` :'')
				+ (hPrm.label?.val ?` ${hPrm.label?.val}` :''),
		}),
		call		: hPrm=> ({
			icon		: 'fa-exchange-alt',
			btn_face	: 'コール'
				+ (hPrm.fn?.val ?` ${hPrm.fn?.val}` :'')
				+ (hPrm.label?.val ?` ${hPrm.label?.val}` :''),
		}),
		return		: _=> ({
			icon		: 'fa-long-arrow-alt-left',
			btn_face	: '戻る',
		}),
		add_lay		: hPrm=> {
			const is_grp = (hPrm.class?.val === 'grp');
			return {
				col			: hPrm.layer?.val ?? 'base',
				btn_style	: `btn-${
					is_grp ?'success' :'primary text-white'
				}`,
				icon	: is_grp ?'fa-image' :'fa-align-left',
				btn_face	: (is_grp ?'画像' :'文字') +'レイヤ追加 '
					+ hPrm.layer?.val,
			};
		},
		clear_lay	: hPrm=> ({
			col			: hPrm.layer?.val ?? 'base',
			btn_style	: `btn-outline-primary text-white`,
			icon		: 'fa-ban',
			btn_face	: 'レイヤ設定消去',
		}),
		lay			: hPrm=> ({
			col			: hPrm.layer?.val ?? 'base',
			btn_style	: `btn-outline-primary text-white`,
			icon		: 'fa-cog',
			btn_face	: 'レイヤ設定',
		}),

		img			: hPrm=> {
			const layer = hPrm.layer?.val ?? 'base';
			return {
				col			: layer,
				btn_style	: `btn${
					hPrm.fn?.val ?'' :'-outline'
				}-${
					layer !== 'mes'	// TODO: 雑。文字レイヤかどうかで
						? 'success'
						: 'secondary text-white'
				}`,
				icon		: (layer === 'base') ?'fa-image' :'fa-user',
				btn_face	: hPrm.fn?.val ?? ((layer === 'base') ?'(消去)' :'(退場)'),
				args		: [
					{name: 'fn', type: 'select', val: hPrm.fn?.val ?? '(消去)', hint: '画像名', key: '画像ファイル名'},
				]
			};
		},
		scene_change	: hPrm=> ({
			col			: 'base',
			td_style	: 'sn-cmb-'
				+ (hPrm.bg?.val ?`start" data-fn="${hPrm.bg?.val}` :'end'),
			btn_style	: 'btn-success text-black',
			icon		: 'fa-door-open',
			btn_face	: '場面転換'
				+ (hPrm.rule?.val ?` ${hPrm.rule?.val}ルールで` :'')
				+ (hPrm.time?.val ?` ${hPrm.time.val}msで` :'')
				+ (` ${hPrm.bg?.val}へ変更` ?? '(消去)'),
			args		: [
				{name: 'bg', type: 'select', val: hPrm.bg?.val ?? '(消去)', hint: '背景の画像名', key: '画像ファイル名', exts: CteScore.#EXTS_PIC, filter: 'bg\/'},
				{name: 'time', type: 'num', val: hPrm.time?.val ?? '1000', hint: 'かける時間'},
				{name: 'rule', type: 'select', val: hPrm.rule?.val ?? '', hint: 'ルール画像名', key: '画像ファイル名', exts: CteScore.#EXTS_PIC, filter: 'rule\/'},
			],
		}),
		scene_reserve	: hPrm=> ({
			col			: hPrm.layer?.val ?? '0',
			td_style	: 'sn-cmb-'
				+ (hPrm.fn?.val ?`start" data-fn="${hPrm.fn?.val}` :'end'),
			btn_style	: 'btn-success btn-rounded text-black',
			icon		: 'fa-user-ninja',
			btn_face	: `場面準備 ${hPrm.fn?.val}`,
			args		: [
				{name: 'layer', type: 'select', val: hPrm.layer?.val ?? '0', hint: '画像レイヤ', key: '画像レイヤ名'},
				{name: 'fn', type: 'select', val: hPrm.fn?.val ?? '(消去)', hint: '画像名', key: '画像ファイル名'},
				{name: 'face', type: 'str', val: hPrm.face?.val ?? '', hint: '差分'},
				{name: 'pos', type: 'str', val: hPrm.pos?.val ?? '', hint: '表示位置'},
				{name: 'alpha', type: 'range', val: hPrm.alpha?.val ?? '', hint: '不透明度',  min: '0.0', max: '1.0', step: '0.1'},
			],
		}),

		grp			: hPrm=> {
			return {
				col			: 'base',
				td_style	: 'sn-cmb-'
					+ (hPrm.bg?.val ?`start" data-fn="${hPrm.bg?.val}` :'end'),
				btn_style	: 'btn-success',
				icon		: 'fa-images',
				btn_face	: (hPrm.bg?.val ?? '(消去)')
					+ (hPrm.rule?.val ?` ${hPrm.rule?.val}ルールで` :'')
					+ (hPrm.time?.val ?` へ変更 ${hPrm.time.val}msで` :''),
				args		: [
					{name: 'bg', type: 'select', val: hPrm.bg?.val ?? '(消去)', hint: '背景の画像名', key: '画像ファイル名', exts: CteScore.#EXTS_PIC, filter: 'bg\/'},
					{name: 'time', type: 'num', val: hPrm.time?.val ?? '1000', hint: 'かける時間'},
					{name: 'rule', type: 'select', val: hPrm.rule?.val ?? '', hint: 'ルール画像名', key: '画像ファイル名', exts: CteScore.#EXTS_PIC, filter: 'rule\/'},

					{name: 'l0', type: 'select', val: hPrm.l0?.val ?? '(消去)', hint: 'レイヤ0の画像名', key: '画像ファイル名'},
					{name: 'f0', type: 'str', val: hPrm.f0?.val ?? '', hint: 'レイヤ0のface属性'},
					{name: 'pos0', type: 'str', val: hPrm.pos0?.val ?? '', hint: 'レイヤ0のpos位置'},
					{name: 'o0', type: 'num', val: hPrm.o0?.val ?? '', hint: 'レイヤ0の不透明度'},

					{name: 'l1', type: 'select', val: hPrm.l1?.val ?? '(消去)', hint: 'レイヤ1の画像名', key: '画像ファイル名'},
					{name: 'f1', type: 'str', val: hPrm.f1?.val ?? '', hint: 'レイヤ1のface属性'},
					{name: 'pos1', type: 'str', val: hPrm.pos1?.val ?? '', hint: 'レイヤ1のpos位置'},
					{name: 'o1', type: 'num', val: hPrm.o1?.val ?? '', hint: 'レイヤ1の不透明度'},

					{name: 'l2', type: 'select', val: hPrm.l2?.val ?? '(消去)', hint: 'レイヤ2の画像名', key: '画像ファイル名'},
					{name: 'f2', type: 'str', val: hPrm.f2?.val ?? '', hint: 'レイヤ2のface属性'},
					{name: 'pos2', type: 'str', val: hPrm.pos2?.val ?? '', hint: 'レイヤ2のpos位置'},
					{name: 'o2', type: 'num', val: hPrm.o2?.val ?? '', hint: 'レイヤ2の不透明度'},

					{name: 'se', type: 'str', val: hPrm.se?.val ?? '', hint: '効果音名'},
				],
			};
		},
		fg			: hPrm=> ({
			col			: hPrm.layer?.val ?? '命令',
			btn_style	: `btn-success`,
			icon		: 'fa-image',
			btn_face	: hPrm.fn?.val ?? '',
		}),

		button		: hPrm=> ({
			col			: 'mes',
			btn_style	: 'btn-primary',
			icon		: 'fa-sign-out-alt',
			btn_face	: (hPrm.text?.val ?`文字ボタン「${hPrm.text?.val}」` :'')
						+ (hPrm.pic?.val ?`画像ボタン ${hPrm.pic?.val}` :''),
		}),
		enable_event: hPrm=> ({
			col			: 'mes',
			btn_style	: 'btn-primary',
			icon		: 'fa-check-square',
			btn_face	: `イベント発生 ${(hPrm.enabled?.val === 'true')
				?'させる' :'させない'}`,
		}),
		event		: hPrm=> ({
			col			: 'mes',
			btn_style	: 'btn-primary',
			icon		: 'fa-bolt',
			btn_face	: 'イベント予約'
				+ (hPrm.global?.val === 'true' ?'（毎回）' :'（一回だけ）')
				+ (hPrm.del?.val === 'true' ?'の削除 ' :'')
				+ hPrm.key?.val,
		}),

		waitclick	: _=> ({
			col			: 'mes',
			btn_style	: 'btn-primary',
			icon		: 'fa-hourglass-start',
			btn_face	: 'クリック待ち',
		}),
		r			: _=> ({
			col			: 'mes',
			btn_style	: 'btn-primary',
			icon		: 'fa-align-left',
			btn_face	: '文字改行',
		}),
		l			: _=> ({
			col			: 'mes',
			btn_style	: 'btn-primary',
			icon		: 'fa-leaf',
			btn_face	: '改行待ち',
		}),
		plc			: hPrm=> ({
			col			: 'mes',
			btn_style	: 'btn-primary',
			icon		: 'fa-book-open',
			btn_face	: '改ページ待ち'
				+ (hPrm.visible?.val === 'false' ?'（マーク非表示）' :''),
			args		: [
				{name: 'visible', type: 'bool', val: hPrm.visible?.val ?? 'true', hint: 'マーク表示する'},
				{name: 'time', type: 'num', val: hPrm.time?.val ?? '500', hint: '再開時の効果音FO時間'},
				{name: 'buf', type: 'str', val: hPrm.buf?.val ?? '音声', hint: '再開時の再生停止'},
			],
		}),

		let			: hPrm=> ({
			btn_style	: 'btn-secondary',
			icon		: 'fa-calculator',
			btn_face	: `変数操作 ${hPrm.name?.val}=…`,
		}),

		bgm			: hPrm=> ({
			col			: 'BGM',
			td_style	: 'sn-cmb-'
				+ (hPrm.fn?.val ?`start" data-fn="${hPrm.fn?.val}` :'end'),
			btn_style	: 'btn-info',
			icon		: 'fa-play',
			btn_face	: hPrm.fn?.val ?? '',
			tooltip		: `fn=${hPrm.fn?.val}`,
		}),
		stopbgm		: _=> ({
			col			: 'BGM',
			td_style	: 'sn-cmb-end',
			btn_style	: 'btn-outline-info',
			icon		: 'fa-stop',
			btn_face	: '再生停止',
		}),
		fadeoutbgm	: hPrm=> ({
			col			: 'BGM',
			td_style	: 'sn-cmb-end',
			btn_style	: 'btn-outline-info',
			icon		: 'fa-volume-down',
			btn_face	: `フェードアウト ${hPrm.time?.val}ms かけて`,
		}),

		wait		: hPrm=> ({
			col			: 'mes',
			btn_style	: 'btn-primary',
			icon		: 'fa-hourglass-start',
			btn_face	: `${hPrm.time?.val ?? 0}ms`,
			tooltip		: '待機'
				+ (hPrm.time?.val ?` time=${hPrm.time?.val}ms` :'')
				+ (hPrm.canskip?.val ?` スキップできるか=${hPrm.canskip?.val}` :''),
		}),
		s			: _=> ({
			col			: 'mes',
			btn_style	: 'btn-primary',
			icon		: 'fa-stop',
			btn_face	: '停止する',
		}),
		close		: _=> ({
			icon		: 'fa-window-close',
			btn_face	: 'アプリの終了',
		}),

		macro	: hPrm=> {
			this.#macro_nm = hPrm.name?.val ?? '';
			return {
				btn_style	: 'btn-outline-secondary text-white',
				icon		: 'fa-box-open',
				btn_face	: `マクロ定義の開始 ${this.#macro_nm}`,
				args		: [
					{name: 'name', type: 'str', val: hPrm.name.val ?? '', hint: 'マクロ名'},
				],
			}
		},
		endmacro		: _=> {
			const nm = this.#macro_nm;
			this.#macro_nm = '';
			return {
				btn_style	: 'btn-outline-secondary text-white',
				icon		: 'fa-box',
				btn_face	: `マクロ定義の終了 ${nm}`,
			}
		},

		アルバム解放	: hPrm=> ({
			icon		: 'fa-th',
			btn_face	: 'アルバム解放 '+ hPrm.name?.val,
			args		: [
				{name: 'name', type: 'str', val: hPrm.name.val ?? '', hint: '素材識別名'},
			],
		}),
	};
	#macro_nm	= '';
	#MAX_COL		= 7;
	#hCn2Col	: {[nm: string]: number}	= {
		'命令'	: 0,
		'base'	: 1,
		'0'		: 2,
		'1'		: 3,
		'2'		: 4,
		'mes'	: 5,
		'BGM'	: 6,
		'SE'	: 7,
		'詳細'	: 8,
	
	};
	#make_tds(col: number, line: number, btn_style: string, icon: string, btn_face: string, tooltip = '', aft = '', td_style = '', detail = ''): string {
		return '<td></td>'.repeat(col) +`
	<td class="p-0 ${td_style}">
		<button type="button" class="btn btn-block btn-sm ${btn_style}" data-faceicon="${icon}" data-ripple-color="dark" id="${line}btn" draggable="true"${
			tooltip
			?` data-mdb-toggle="tooltip" data-placement="right" title="${tooltip}"`
			:''
		}>
			<i class="fas ${icon}" aria-hidden="true"></i>
		</button>
		${aft ?`<div class="dropdown-menu col-xxl-4 col-sm-6 col-12"><form class="p-1 d-flex flex-wrap">${aft}</form></div>` :''}
	</td>`.replace(' dropdown-toggle', '')+
	'<td></td>'.repeat(this.#MAX_COL -col) +`
	<td class="p-0">${
		detail || `
		<button type="button" class="btn btn-block btn-sm px-2 text-start text-lowercase ${btn_style}" data-faceicon="${icon}" data-ripple-color="dark" id="${line}detail" draggable="true"${
			tooltip
			?` data-mdb-toggle="tooltip" data-placement="right" title="${tooltip}"`
			:''
		}>
			<i class="fas ${icon}" aria-hidden="true"></i>
			${btn_face}
		</button>`
	}	${aft ?`<div class="dropdown-menu col-xxl-4 col-sm-6 col-12"><form class="p-1 d-flex flex-wrap">${aft}</form></div>` :''}
	</td>`;
	}

}
