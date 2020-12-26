/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2020-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {IFn2Path, getNonce} from './CmnLib';
import {ScriptScanner} from './ScriptScanner';
import {AnalyzeTagArg, HPRM} from './AnalyzeTagArg';

import {CustomTextEditorProvider, TextDocument, WebviewPanel, CancellationToken, Uri, ExtensionContext, window, Webview, Range, WorkspaceEdit, workspace, Position, TextDocumentContentChangeEvent} from 'vscode';
import fs = require('fs-extra');

export class CteScore implements CustomTextEditorProvider {
	private	static	htmBaseSrc	= '';
	private	static	localExtensionResRoots: Uri;
	static	init(ctx: ExtensionContext): void {
		const cteScr = new CteScore;
		window.registerCustomEditorProvider('SKYNovel.score', cteScr);

		const path_ext_res = ctx.extensionPath +`/res/webview/`;
		CteScore.localExtensionResRoots = Uri.file(path_ext_res);
		const nonce = getNonce();
		CteScore.htmBaseSrc =
		fs.readFileSync(path_ext_res +`score.htm`, {encoding: 'utf8'})
		.replace('<meta_autooff ', '<meta ')	// ローカルデバッグしたいので
		.replace(/\$\{nonce}/g, nonce);
	}

	private	static	hPath2Tokens	: {[path: string]: {
		uriCurPrj	: Uri;
		aToken		: string[];
		skipupd		: boolean;
	}}	= {};
	isSkipUpd(path: string): boolean {
		const t = CteScore.hPath2Tokens[path];
//console.log(`fn:CteScore.ts line:38 isSkip path_doc=${path_doc} skip:${t?.skipupd}`);
		if (t?.skipupd) {t.skipupd = false; return true;}
		return false;
	}
	setAToken(path: string, curPrj: string, aToken: string[]) {
//console.log(`fn:CteScore.ts line:43 setAToken path=${path}`);
		CteScore.hPath2Tokens[path] = {
			uriCurPrj	: Uri.parse(curPrj),
			aToken		: aToken,
			skipupd		: false,
		};
		this.upd_webview(path);
	}

	separation(path: string) {	// 分離
		CteScore.hPath2Wb[path]?.postMessage({cmd: 'separation'});
	}
	combining(path: string) {	// 結合
		CteScore.hPath2Wb[path]?.postMessage({cmd: 'combining'});
	}
	updDiffLine(path: string, c: TextDocumentContentChangeEvent, aToken: string[]) {
		const sta = c.range.start;
		const end = c.range.end;
		if (sta.character > 0 || end.character > 0) return;
		const wb = CteScore.hPath2Wb[path];
		if (c.text === '') wb.postMessage({cmd: 'del', sl: sta.line,});
		else wb.postMessage({
			cmd	: (sta.line === end.line) ?'ins' :'rep',
			sl	: sta.line,
			htm	: c.text === '\n'
				? this.token2html({line: sta.line +1}, '\n\n', -1)
				: aToken.map(t=> this.token2html({line: sta.line +1}, t, 0)).join('')
			.replace(/\$\{webview.cspSource}/g, wb.cspSource)
			.replace(/(href|src)="\.\//g, `$1="${wb.asWebviewUri(CteScore.localExtensionResRoots)}/`),	// ファイルごとだけでなく分割ごとにも値が変わる
		});
	}


	private	static	hPath2Wb	: {[path: string]: Webview}	= {};
	async resolveCustomTextEditor(doc: TextDocument, webviewPanel: WebviewPanel, _token: CancellationToken): Promise<void> {
		const t = CteScore.hPath2Tokens[doc.fileName];
		const wb = webviewPanel.webview;
		CteScore.hPath2Wb[doc.fileName] = wb;
		wb.options = {
			enableScripts: true,
			localResourceRoots: [CteScore.localExtensionResRoots, t.uriCurPrj,],
		};
		wb.onDidReceiveMessage(o=> {
			switch (o.cmd) {
			case 'info':	window.showInformationMessage(o.text); break;
			case 'warn':	window.showWarningMessage(o.text); break;

			case 'loaded':	this.upd_webview_db(doc.fileName);	break;
			case 'savehtm':	wb.html = wb.html
				.replace(/<tbody>[\s\S]+<\/tbody>/, `<tbody>${o.tbody}</tbody>`);	break;

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

			case 'add_req':{
				wb.postMessage({
					cmd	: 'add_res',
					row	: o.row,
					htm	: this.token2html({line: o.row}, o.scr, o.row)
					.replace(/\$\{webview.cspSource}/g, wb.cspSource)
					.replace(/(href|src)="\.\//g, `$1="${wb.asWebviewUri(CteScore.localExtensionResRoots)}/`),	// ファイルごとだけでなく分割ごとにも値が変わる
				});

				t.skipupd = true;
				const ed = new WorkspaceEdit();
				ed.insert(doc.uri, new Position(o.to, 0), (o.scr === '\n\n') ?'\n' :(o.scr +'\n'));
				workspace.applyEdit(ed);
			}
				break;

			case 'del':{
				t.skipupd = true;
				const ed = new WorkspaceEdit();
				ed.delete(doc.uri, new Range(o.lnum, 0, o.lnum +1, 0));
				workspace.applyEdit(ed);
			}
				break;

			case 'input':{
//console.log(`fn:CteScore.ts line:143 input lnum:${o.lnum} nm:${o.nm} val:${o.val}`);
				t.skipupd = true;
				const ed = new WorkspaceEdit();
				const rng = new Range(o.lnum, 0, o.lnum +1, 0);
				const txt = doc.getText(rng);
				ed.replace(
					doc.uri,
					new Range(o.lnum, 0, o.lnum +1, 0),
					txt.replace(
						new RegExp(`${o.nm}=#.*#`, 'g'),
						`${o.nm}=#${o.val}#`
					)
				);
				workspace.applyEdit(ed);
			}
				break;
			}
		}, false);

		this.upd_webview(doc.uri.path);

		// 空ファイルなら適当なテンプレを挿入
		if (doc.getText(new Range(0, 0, 1, 1)) === '') {
			const ed = new WorkspaceEdit();
			ed.insert(doc.uri, new Position(0, 0), '\n\n\n[return]\n');
			workspace.applyEdit(ed);
		}
		// TODO: sn→ssnらしきものに強制改行を入れるのならここでか
	}
	private	static	regFld	= /\w+/;
	private	upd_webview_db(path: string) {
		const hFld2: {[fld: string]: {
			ext		: string;
			path	: string;
			fn		: string;
		}[]} =	{};
		const t = CteScore.hPath2Tokens[path];
		const hPath = CteScore.hPrj2hPath[t.uriCurPrj.path];
		for (const fn in hPath) {
			const p = hPath[fn];
			for (const ext in p) {
				if (ext === ':cnt') continue;

				const path = String(p[ext]);
				const fld = String(path.match(CteScore.regFld));
				hFld2[fld] ??= [];
				hFld2[fld].push({
					ext		: ext,
					path	: path,
					fn		: fn,
				});
			}
		}

		const wb = CteScore.hPath2Wb[path];
		wb.postMessage({
			cmd			: 'upd_db',
			path_prj	: String(wb.asWebviewUri(t.uriCurPrj)),	// 最後に「/」必要
			hFld2url	: hFld2,
			hPath		: hPath,
		});
	}

	private	static	hPrj2hPath	: {[prj: string]: IFn2Path}	= {};
	updPath(curPrj: string, hPath: IFn2Path) {
		CteScore.hPrj2hPath[curPrj] = hPath;
		for (const path_doc in CteScore.hPath2Tokens) {
			if (path_doc in CteScore.hPath2Wb
			&&	CteScore.hPath2Tokens[path_doc].uriCurPrj.path === curPrj) this.upd_webview_db(path_doc);
		}
	}

	private upd_webview(path: string) {
		let stt = {line: 1};
		const wb = CteScore.hPath2Wb[path];
		if (! wb) return;
		wb.html = CteScore.htmBaseSrc
		.replace(/<tbody>[\s\S]+<\/tbody>/, `<tbody>${
			CteScore.hPath2Tokens[path].aToken
			.map((token, idx)=> this.token2html(stt, token, idx)).join('')
		}</tbody>`)
		.replace(/\$\{webview.cspSource}/g, wb.cspSource)
		.replace(/(href|src)="\.\//g, `$1="${wb.asWebviewUri(CteScore.localExtensionResRoots)}/`);	// ファイルごとだけでなく分割ごとにも値が変わる
	}

	private	token2html(stt: {line: number}, token: string, idx: number): string {
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
					str_r += this.make_tr_td0(i, this.make_tds(0, i, 'btn-rounded', '', '（空行）'));
				}
				return str_r;

			case 38:	// & 変数操作・変数表示
				const is_dsp = (token.slice(-1) === '&');
				tds = this.make_tds(
					0, stt.line, 'btn-secondary btn-block" data-face="true',
					'fa-calculator',
					is_dsp
						? '変数表示'
						: `変数操作 ${
							token.slice(1, token.indexOf('=') +2)
						}…`,
					is_dsp ?token.slice(1, -1) :token.slice(1),
				);
				break;

			case 59:	// ; コメント
				tds = this.make_tds(
					0, stt.line, 'btn-outline-light btn-rounded" data-face="true',
					'fa-comment-dots',
					token.slice(1, 11) +'…',
					token.slice(1),
				);
				break;

			case 42:	// * ラベル
				tds = this.make_tds(
					0, stt.line, 'btn-outline-light" data-face="true',
					'fa-tag', token.slice(1),
				);
				break;

			case 91:	// [ タグ開始
//console.log(`fn:CteScore.ts line:191 line:${line} token:${token}`);
				let lineTkn = 0;	// 複数行タグでの行カウント補正
				let j = -1;
				while ((j = token.indexOf('\n', j +1)) >= 0) ++lineTkn;
				if (lineTkn > 0) stt.line += lineTkn;

				if (tds = this.make_tds_tag(token, stt.line, idx)) break;
				return '';

			default:	// 文字表示
				tds = this.make_tds(
					5, stt.line, 'btn-outline-primary btn-block text-white dropdown-toggle sn-ext_txt" data-face="true" data-mdb-toggle="dropdown" aria-expanded="false',
					'', '', '', `
	<div class="form-outline col-12">
		<textarea class="form-control" placeholder="本文テキストを入力" cols="40" rows="2" data-nm="text" id="sn-ta${idx}">${token}</textarea>
		<label class="form-label" for="sn-ta${idx}">本文テキスト</label>
	</div>`		);
		}

		return this.make_tr_td0(stt.line, tds);
	}
	private	make_tr_td0(line: number, tds: string): string {
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

	private	make_tds_tag(token: string, line: number, row: number): string {
		const a_tag: any = ScriptScanner.analyzTagArg(token);
		const g = a_tag?.groups;
		if (! g) return '';

		const t2t = CteScore.hTag2Tds[g.name];
		if (t2t) {
			CteScore.alzTagArg.go(g.args);
			const oTds = t2t(CteScore.alzTagArg.hPrm);
			const len = oTds.args ?oTds.args.length : 0;
			return this.make_tds(
				oTds.col ?? 0, line,
				(oTds.btn_style ?? 'btn-secondary')
				+ (oTds.args ?` dropdown-toggle" data-mdb-toggle="dropdown" aria-expanded="false` :''),
				oTds.icon, oTds.btn_face,
				oTds.tooltip ?? g.args,
				oTds.args ?oTds.args.map(v=> {
					let ret = '';
					let fo = 'form-outline';
					switch (v.type) {
						case 'bool':	ret = `
<div class="form-check ml-3 py-2 ${
	len === 1 ?'col-12 col-sm-3 col-md-2'
	:len === 2 ?'col-2'
	:''
}">
	<input type="checkbox" value="${v.val}" class="form-check-input px-0" id="sn-chk${row}" checked/>
	<label class="form-check-label" for="sn-chk${row}">${v.hint ?? v.name}</label>
</div>`;					break;

						case 'rule':	ret = `
<div class="input-group mb-3 ${
	len === 1 ?'col-12 col-sm-3 col-md-2'
	:len === 2 ?'col-2'
	:''
}">
	<button type="button" class="btn btn-success btn-block btn-sm px-2 text-start text-lowercase sn-fld" id="sn-btn${row}" data-ripple-color="dark" data-mdb-toggle="modal" data-target="#sn-grpModal" data-title="背景選択" data-fld="rule">
		<i class="fas fa-image"></i>
		${v.hint ?? v.name}
	</button>
	<input type="text" value="${v.val}" class="form-control" placeholder="${v.hint ?? v.name}" aria-label="${v.hint ?? v.name}" aria-describedby="sn-btn${row}" readonly/>
</div>`;
							fo = '';
							// form-outlineを使うとエラー
							// しかもhtm出力して動かさないとわからない
							break;

						case 'textarea':
							ret = `
<textarea class="form-control" placeholder="${v.hint ?? v.name}を入力" cols="40" rows="2" data-nm="${v.name}" id="sn-ta${row}">${v.val}</textarea>
<label class="form-label" for="sn-ta${row}">${v.hint ?? v.name}</label>`;
							break;

						default:	ret = `
<input type="${
	v.type === 'num' ?'number' :'text'
}" value="${v.val}" id="sn-txf${row}" class="form-control ${
	len === 1	? 'col-12 col-sm-3 col-md-2'
	: len === 2	? 'col-2'
	: ''
}"/>
<label class="form-label" for="sn-txf${row}">${v.hint ?? v.name}</label>`;
					}
					return `
<div class="${fo} col-12 ${
	len === 1	? ''
	: len === 2	? 'col-md-6'
	: 'col-md-6 col-lg-4'
} mt-3 ${
	v.type === 'bool' ?'pt-2' :''
}">${ret}</div>`;
				}).join('') :'',
				oTds.td_style ?? '',
			);
		}

		return this.make_tds(
			0, line, 'btn-light btn-block',
			'fa-code', g.name, g.args,
		);
	}

	private	static	readonly	alzTagArg	= new AnalyzeTagArg;
	private	static	hTag2Tds	: {[tag_name: string]: (hPrm: HPRM)=> {
		col?		: number,
		td_style?	: string,
		btn_style?	: string,
		icon		: string,
		btn_face	: string,
		tooltip?	: string,
		args?		: {
			name	: string;
			type	: 'bool'|'str'|'num'|'rule'|'textarea';
			val?	: string;
			hint?	: string;
		}[],
	}}	= {
		ch			: hPrm=> {return {
			col			: 5,
			btn_style	: 'btn-outline-primary btn-block text-white dropdown-toggle sn-ext_txt" data-face="true" data-mdb-toggle="dropdown" aria-expanded="false',
			icon		: '',
			btn_face	: '',
			tooltip		: '',
			args		: [
				{name: 'text', type: 'textarea', val: hPrm.text?.val ?? '', hint: '本文テキスト'},
			],
		}},

		jump		: hPrm=> {return {
			icon		: 'fa-external-link-alt',
			btn_face	: 'ジャンプ'
				+ (hPrm.fn?.val ?` ${hPrm.fn?.val}` :'')
				+ (hPrm.label?.val ?` ${hPrm.label?.val}` :''),
		}},
		call		: hPrm=> {return {
			icon		: 'fa-exchange-alt',
			btn_face	: 'コール'
				+ (hPrm.fn?.val ?` ${hPrm.fn?.val}` :'')
				+ (hPrm.label?.val ?` ${hPrm.label?.val}` :''),
		}},
		return		: _=> {return {
			icon		: 'fa-long-arrow-alt-left',
			btn_face	: '戻る',
		}},
		add_lay		: hPrm=> {
			let col = 0;
			switch (hPrm.layer?.val) {
				case 'base': col = 1; break;
				case '0': col = 2; break;
				case '1': col = 3; break;
				case '2': col = 4; break;
				case 'mes': col = 5; break;
				case 'mes_c2p': col = 6; break;
			}
			const is_grp = (hPrm.class?.val === 'grp');
			return {
				col			: col,
				btn_style	: `btn-${
					is_grp ?'success text-black' :'primary text-white'
				} btn-block`,
				icon	: is_grp ?'fa-image' :'fa-align-left',
				btn_face	: (is_grp ?'画像' :'文字') +'レイヤ追加 '
					+ hPrm.layer?.val,
			};
		},
		clear_lay	: hPrm=> {
			let col = 0;
			switch (hPrm.layer?.val) {
				case 'base': col = 1; break;
				case '0': col = 2; break;
				case '1': col = 3; break;
				case '2': col = 4; break;
				case 'mes': col = 5; break;
				case 'mes_c2p': col = 6; break;
			}
			return {
				col			: col,
				btn_style	: `btn-outline-primary btn-block text-white`,
				icon		: 'fa-ban',
				btn_face	: 'レイヤ設定消去',
			};
		},
		lay			: hPrm=> {
			let col = 0;
			switch (hPrm.layer?.val) {
				case 'base': col = 1; break;
				case '0': col = 2; break;
				case '1': col = 3; break;
				case '2': col = 4; break;
				case 'mes': col = 5; break;
				case 'mes_c2p': col = 6; break;
			}
			return {
				col			: col,
				btn_style	: `btn-outline-primary btn-block text-white`,
				icon		: 'fa-cog',
				btn_face	: 'レイヤ設定',
			};
		},

		img			: hPrm=> {
			let col = 0;
			switch (hPrm.layer?.val) {
				case 'base': col = 1; break;
				case '0': col = 2; break;
				case '1': col = 3; break;
				case '2': col = 4; break;
				case 'mes': col = 5; break;
				case 'mes_c2p': col = 6; break;
			}
			return {
				col			: col,
				btn_style	: `btn${
					hPrm.fn?.val ?'' :'-outline'
				}-${
					col < 5
						? 'success'+ (hPrm.fn?.val ?' text-black' :'')
						: 'secondary text-white'
				} btn-block`,
				icon		: (col === 1) ?'fa-image' :'fa-user',
				btn_face	: hPrm.fn?.val ?? ((col === 1) ?'(消去)' :'(退場)'),
			};
		},
		grp			: hPrm=> {
			return {
				col			: 1,
				td_style	: 'sn-cmb-'
					+ (hPrm.bg?.val ?`start" data-fn="${hPrm.bg?.val}` :'end'),
				btn_style	: 'btn-success btn-block text-black',
				icon		: 'fa-images',
				btn_face	: (hPrm.bg?.val ?? '(消去)')
					+ (hPrm.rule?.val ?` ${hPrm.rule?.val}ルールで` :'')
					+ (hPrm.time?.val ?` へ変更 ${hPrm.time.val}msで` :''),
				args		: [
					{name: 'bg', type: 'str', val: hPrm.bg?.val ?? '(消去)', hint: '背景の画像名'},
					{name: 'time', type: 'num', val: hPrm.time?.val ?? '1000', hint: 'かける時間'},
					{name: 'rule', type: 'rule', val: hPrm.rule?.val ?? '', hint: 'ルール画像名'},

					{name: 'l0', type: 'str', val: hPrm.l0?.val ?? '(消去)', hint: 'レイヤ0の画像名'},
					{name: 'f0', type: 'str', val: hPrm.f0?.val ?? '', hint: 'レイヤ0のface属性'},
					{name: 'pos0', type: 'str', val: hPrm.pos0?.val ?? '', hint: 'レイヤ0のpos位置'},
					{name: 'o0', type: 'num', val: hPrm.o0?.val ?? '', hint: 'レイヤ0の不透明度'},

					{name: 'l1', type: 'str', val: hPrm.l1?.val ?? '(消去)', hint: 'レイヤ1の画像名'},
					{name: 'f1', type: 'str', val: hPrm.f1?.val ?? '', hint: 'レイヤ1のface属性'},
					{name: 'pos1', type: 'str', val: hPrm.pos1?.val ?? '', hint: 'レイヤ1のpos位置'},
					{name: 'o1', type: 'num', val: hPrm.o1?.val ?? '', hint: 'レイヤ1の不透明度'},

					{name: 'l2', type: 'str', val: hPrm.l2?.val ?? '(消去)', hint: 'レイヤ2の画像名'},
					{name: 'f2', type: 'str', val: hPrm.f2?.val ?? '', hint: 'レイヤ2のface属性'},
					{name: 'pos2', type: 'str', val: hPrm.pos2?.val ?? '', hint: 'レイヤ2のpos位置'},
					{name: 'o2', type: 'num', val: hPrm.o2?.val ?? '', hint: 'レイヤ2の不透明度'},

					{name: 'se', type: 'str', val: hPrm.se?.val ?? '', hint: '効果音名'},
				],
			};
		},
		fg			: hPrm=> {
			let col = 0;
			switch (hPrm.layer?.val) {
				case 'base': col = 1; break;
				case '0': col = 2; break;
				case '1': col = 3; break;
				case '2': col = 4; break;
				case 'mes': col = 5; break;
				case 'mes_c2p': col = 6; break;
			}
			return {
				col			: col,
				btn_style	: `btn-success btn-block text-black`,
				icon		: 'fa-image',
				btn_face	: hPrm.fn?.val ?? '',
			};
		},

		button		: hPrm=> {return {
			col			: 5,
			btn_style	: 'btn-primary btn-block',
			icon		: 'fa-sign-out-alt',
			btn_face	: (hPrm.text?.val ?`文字ボタン「${hPrm.text?.val}」` :'')
						+ (hPrm.pic?.val ?`画像ボタン ${hPrm.pic?.val}` :''),
		}},
		enable_event: hPrm=> {return {
			col			: 5,
			btn_style	: 'btn-primary btn-block',
			icon		: 'fa-check-square',
			btn_face	: `イベント発生 ${(hPrm.enabled?.val === 'true')
				?'させる' :'させない'}`,
		}},
		event		: hPrm=> {return {
			col			: 5,
			btn_style	: 'btn-primary btn-block',
			icon		: 'fa-bolt',
			btn_face	: 'イベント予約'
				+ (hPrm.global?.val === 'true' ?'（毎回）' :'（一回だけ）')
				+ (hPrm.del?.val === 'true' ?'の削除 ' :'')
				+ hPrm.key?.val,
		}},
		typography		: _=> {return {
			col			: 5,
			btn_style	: 'btn-primary btn-block',
			icon		: 'fa-ruler-combined',
			btn_face	: '文字表現デザイン',
		}},

		waitclick	: _=> {return {
			col			: 5,
			btn_style	: 'btn-primary',
			icon		: 'fa-hourglass-start',
			btn_face	: 'クリック待ち',
		}},
		r			: _=> {return {
			col			: 5,
			btn_style	: 'btn-primary',
			icon		: 'fa-align-left',
			btn_face	: '文字改行',
		}},
		l			: _=> {return {
			col			: 5,
			btn_style	: 'btn-primary',
			icon		: 'fa-caret-square-right',
			btn_face	: '改行待ち',
		}},
		plc			: hPrm=> {return {
			col			: 5,
			btn_style	: 'btn-primary',
			icon		: 'fa-book-open',
			btn_face	: '改ページ待ち'
				+ (hPrm.visible?.val === 'false' ?'（マーク非表示）' :''),
			args		: [
				{name: 'visible', type: 'bool', val: hPrm.visible?.val ?? 'true', hint: 'マーク表示するか'},
				{name: 'time', type: 'num', val: hPrm.time?.val ?? '500', hint: '再開時の効果音FO時間'},
				{name: 'buf', type: 'str', val: hPrm.buf?.val ?? '音声', hint: '再開時の再生停止'},
			],
		}},

		let			: hPrm=> {return {
			btn_style	: 'btn-secondary btn-block',
			icon		: 'fa-calculator',
			btn_face	: `変数操作 ${hPrm.name?.val}=…`,
		}},

		bgm			: hPrm=> {return {
			col			: 7,
			td_style	: 'sn-cmb-'
				+ (hPrm.fn?.val ?`start" data-fn="${hPrm.fn?.val}` :'end'),
			btn_style	: 'btn-info btn-block text-black',
			icon		: 'fa-play',
			btn_face	: hPrm.fn?.val ?? '',
		}},
		stopbgm		: _=> {return {
			col			: 7,
			td_style	: 'sn-cmb-end',
			btn_style	: 'btn-outline-info btn-block',
			icon		: 'fa-stop',
			btn_face	: '再生停止',
		}},
		fadeoutbgm	: hPrm=> {return {
			col			: 7,
			td_style	: 'sn-cmb-end',
			btn_style	: 'btn-outline-info btn-block',
			icon		: 'fa-volume-down',
			btn_face	: `フェードアウト ${hPrm.time?.val}ms かけて`,
		}},

		wait		: hPrm=> {return {
			col			: 5,
			btn_style	: 'btn-primary btn-block',
			icon		: 'fa-hourglass-start',
			btn_face	: `${hPrm.time?.val ?? 0}ms`,
			tooltip		: '待機'
				+ (hPrm.time?.val ?` time=${hPrm.time?.val}ms` :'')
				+ (hPrm.canskip?.val ?` スキップできるか=${hPrm.canskip?.val}` :''),
		}},
		s			: _=> {return {
			col			: 5,
			btn_style	: 'btn-primary',
			icon		: 'fa-stop',
			btn_face	: '停止する',
		}},
		close		: _=> {return {
			icon		: 'fa-window-close',
			btn_face	: 'アプリの終了',
		}},

		macro	: hPrm=> {
			CteScore.macro_nm = hPrm.name?.val ?? '';
			return {
				btn_style	: 'btn-outline-secondary btn-block text-white',
				icon		: 'fa-box-open',
				btn_face	: `マクロ定義の開始 ${CteScore.macro_nm}`,
				args		: [
					{name: 'name', type: 'str', val: hPrm.name.val ?? '', hint: 'マクロ名'},
				],
			}
		},
		endmacro		: _=> {
			const nm = CteScore.macro_nm;
			CteScore.macro_nm = '';
			return {
				btn_style	: 'btn-outline-secondary btn-block text-white',
				icon		: 'fa-box',
				btn_face	: `マクロ定義の終了 ${nm}`,
			}
		},

		アルバム解放	: hPrm=> {return {
			icon		: 'fa-th',
			btn_face	: 'アルバム解放 '+ hPrm.name?.val,
			args		: [
				{name: 'name', type: 'str', val: hPrm.name.val ?? '', hint: '素材識別名'},
			],
		}},
	};
	private	static	macro_nm	= '';
	private	make_tds(col: number, line: number, btn_style: string, icon: string, btn_face: string, tooltip = '', aft = '', td_style = ''): string {
		return '<td></td>'.repeat(col) +`
	<td class="p-0 ${td_style}">
		<button type="button" class="btn btn-sm px-2 text-start text-lowercase ${btn_style}" data-faceicon="${icon}" data-ripple-color="dark" id="sn-btn${line}" draggable="true"${
			tooltip
			?` data-mdb-toggle="tooltip" data-placement="right" title="${tooltip}"`
			:''
		}>
			<i class="fas ${icon}" aria-hidden="true"></i>
			${btn_face}
		</button>
		${aft ?`<div class="dropdown-menu col-xxl-4 col-sm-6 col-12"><form class="p-1 d-flex flex-wrap">${aft}</form></div>` :''}
	</td>`+ '<td></td>'.repeat(8 -col);
	}

}
