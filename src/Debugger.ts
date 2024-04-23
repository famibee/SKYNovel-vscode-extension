/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2024 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {uint} from './CmnLib';
import {PrjSetting} from './PrjSetting';

import {DebugConfiguration, WorkspaceFolder, WorkspaceEdit, Range, Uri, workspace, TextDocumentChangeEvent, window, Position, debug, RelativePattern} from 'vscode';
import {DebugProtocol} from '@vscode/debugprotocol';
import {readFileSync, writeFileSync} from 'fs-extra';
import {EventEmitter} from 'events';
import {Server, Socket} from 'socket.io';
const {promisify} = require('util');
const img_size = promisify(require('image-size'));
const path = require('path');

export interface InfoBreakpoint {
	id		: number;
	ln		: number;
	col		: number;
	verified: boolean;
	condition?		: string;
	hitCondition?	: number;
}

export class Debugger extends EventEmitter {
	#pathWs	= '';
	constructor(private readonly wsFld: WorkspaceFolder, private readonly hookTag: (o: any)=> void) {	// インスタンスはひとつのみ、別セッションでも再利用
		super();
		if (wsFld) {
			this.#pathWs = wsFld.uri.path;
			Debugger.#hcurPrj2Dbg[this.#pathWs +'/doc/prj/'] = this;
		}
	}
	static	#hcurPrj2Dbg: {[curPrj: string]: Debugger}	= {};
	static	send2SN(type: string, o: object = {}) {
		const pathWs = debug.activeDebugSession?.workspaceFolder?.uri.fsPath;
		if (! pathWs) return;

		const dbg = Debugger.#hcurPrj2Dbg[pathWs +'/doc/prj/'];
		dbg.send2SN(type, o);
	}

	attach(args: DebugConfiguration) {	// セッションごとに呼ばれる
		this.#hProcSnRes.hi = ()=> {	// res/UML/DebuggerSD.pu
			this.send2SN('auth', {
				t			: PrjSetting.getDebugertoken(this.wsFld),
				hBreakpoint	: {
					hFn2hLineBP	: this.#hFn2hLineBP,	// 行ブレークポイント
													// 条件式ブレークポイント
													// ヒットカウントブレークポイント
					aData		: this.#aDataBreak,	// データブレークポイント
					aFunc		: this.#aFuncBreak,	// 関数ブレークポイント
				},
				...args,
			});
			this.hookTag({タグ名: ':connect'});
			return false;
		};

		new Server(args.port, {cors: {origin: args.weburi}})
		.on('connection', (sk: Socket)=> {
			sk.on('data', (type: string, o: any)=> {
//console.log(`fn:Debugger.ts 新RSV sn -> dbgs id:${sk.id} id:${id} id2:${id2} type:${type} o:${JSON.stringify(o)}`);
				if (! this.#hProcSnRes[type](type, o)) return;
				this.#hProcSnRes[type] = ()=> false;
			});

			this.send2SN = (type: string, o: any = {})=> {
//console.log(`fn:Debugger.ts 新SND dbg -> sns id:${sk.id} id:${id} id2:${id2} type:${type} o:${JSON.stringify(o)}`);
				sk.emit('data', type, o);
			};
			const fncEnd = this.end;
			this.end = ()=> {
				this.end = fncEnd;
				this.end();
				this.send2SN('disconnect', {});
				this.send2SN = ()=> {};
				sk.disconnect();
			};
		});
	}

	private	send2SN(_type: string, _o: object = {}) {}

	end() {
		delete Debugger.#hcurPrj2Dbg[this.#pathWs];
		this.hookTag({タグ名: ':disconnect'});
	}

	readonly	#hProcSnRes
	: {[type: string]: (type: string, o: any)=> boolean}	= {
		stopOnEntry: type=> {this.#sendEvent2Adpt(type);	return false;},
		stopOnStep: type=> {this.#sendEvent2Adpt(type);	return false;},
		stopOnBreakpoint: type=> {this.#sendEvent2Adpt(type);	return false;},
		stopOnDataBreakpoint: type=> {this.#sendEvent2Adpt(type);return false;},

		_recodeDesign: (_, o)=> {
			const ln = uint(o[':ln']) -1;
			const col_s = uint(o[':col_s']);
			const col_e = uint(o[':col_e']);
			this.#hDCId2DI[o[':id_tag']] = {
				...o,
				uri: Uri.file(o[':path'].replace('${pathbase}', this.#pathWs +'/doc')),
				rng: new Range(ln, col_s, ln, col_e),
			};
				// TODO: スクリプト編集とこの辞書の更新は？　:lnとか変わる

			this.hookTag(o);

			return false;
		},
		_enterDesign: _=> {
//			o[':path'] = o[':path'].replace('${pathbase}', this.pathWs +'/doc');
//console.log(`fn:Debugger.ts line:96 _enterDesign o:${JSON.stringify(o)}`);

// 'mes/ボタン'

			return false;
		},
		_changeCast: (_, o)=> {
			const {':id_tag': id_tag, ri, ...o2} = o;
			const di = this.#hDCId2DI[id_tag];
			if (! di) return false;

			let token = String(di[':token']);
			for (const [k, v] of Object.entries(o2)) token = token.replace(
				new RegExp(`(\\s${k}=)(['"#]*)(?:\\S+)\\2([\\s\\]])`),
				`$1${v}$3`
			)
			di[':token'] = token;

			// upd text
			const ed = new WorkspaceEdit;
			ed.replace(di.uri, di.rng, token);
			workspace.applyEdit(ed);

			return false;
		},
		_focusScript: (_, o)=> {
			o[':path'] = o[':path'].replace('${pathbase}', this.#pathWs +'/doc');
			const ln = o[':ln'] -1;
			window.showTextDocument(Uri.file(o[':path']), {
				selection: new Range(
					new Position(ln, o[':col_s']),
					new Position(ln, o[':col_e'])
				),
			});
			return false;
		},
		_dropFile: (_, o)=> {
			const {':id_tag': id_tag, fn, ext, url, buf, old_fn, old_url} = o;
			const di = this.#hDCId2DI[id_tag];
			if (! di) return false;

//console.log(`fn:Debugger.ts line:139 id_tag:(${id_tag}) fn:${fn} ext:${ext} url:${url.slice(0, 32)} old_fn:${old_fn}`);
			let urlWrite = '';
			if (url) {	// プロジェクトに既存のファイル名
				urlWrite = url.replace('${pathbase}', this.#pathWs +'/doc');
				// 同一ファイルでなければ上書き
				if (fn === old_fn) {
					let eq = true;
					const bufFromPrj = readFileSync(urlWrite);
					const len = bufFromPrj.length;
					if (len !== buf.length) eq = false;
					else for (let i=0; i<len; ++i) {
						if (bufFromPrj[i] !== buf[i]) {eq = false; break;}
					}
					if (eq) return false;	// まったく同じなのでスクリプトもそのまま
					// 違うなら上書きコピー
				}
			}
			else {	// プロジェクトに存在しないファイルなのでコピー
				// web old_url:prj/other/MnuUp_btnPage1.png
				// app old_url:（略）sn_uc_score/doc/prj/other/MnuUp_btnPage1.png
				const parent = path.basename(path.dirname(old_url));
					// 変更前画像のフォルダ
				urlWrite = this.#pathWs +`/doc/prj/${parent}/${fn}.${ext}`;

				const oAP: {[nm: string]: string | number} = {':cnt': 1};
				oAP[ext] = `${parent}/${fn}.${ext}`;
				this.send2SN('_addPath', {fn: fn, o: oAP});
			}

			// ファイル生成、を検知しての prj.json 更新を待って次へ
			const fwPathJs = workspace.createFileSystemWatcher(
				new RelativePattern(this.wsFld, `doc/prj/path.json`)
			);
			fwPathJs.onDidChange(()=> {
				fwPathJs.dispose();

				// スクリプト更新
				let token = String(di[':token']);
				const o2: {[nm: string]: string} = {fn, b_pic: fn, pic: fn};
				const fnc = ()=> {
					for (const [k, v] of Object.entries(o2)) token = token.replace(
						new RegExp(`(\\s${k}=)(['"#]*)(?:\\S+)\\2([\\s\\]])`),
						`$1${v}$3`
					)
					di[':token'] = token;

					const ed = new WorkspaceEdit;
					ed.replace(di.uri, di.rng, token);
					workspace.applyEdit(ed);
				};
				img_size(urlWrite)
				.then((s: any)=> {
					o2.width = s.width;
					o2.height = s.height;
					fnc();
				})
				.catch(()=> fnc());	// サイズが取れない場合
			});
			writeFileSync(urlWrite, buf);

			return false;
		},
	};
	#hDCId2DI: {[id_tag: string]: {
		uri		: Uri,
		rng		: Range,
		':col_e'	: number,
		':idx_tkn'	: number,
		':token'	: string,
	}}	= {};

	static	noticeChgDoc(curPrj: string, e: TextDocumentChangeEvent) {
		const dbg = Debugger.#hcurPrj2Dbg[curPrj];
		if (! dbg) return;

		const hRepTkn: {[id_tag: string]: any} = {};
		for (const c of e.contentChanges) {
			const sa = c.text.length -c.rangeLength;
			for (const [id_tag, di] of Object.entries(dbg.#hDCId2DI)) {
				if (! di.rng.contains(c.range)) continue;

				di[':col_e'] += sa;
				di.rng = di.rng.with(di.rng.start, di.rng.end.translate(0, sa))
				const n = e.document.getText(di.rng);
				di[':token'] = n;

				if (n.at(0) !== '[' || n.at(-1) !== ']') continue;
				hRepTkn[id_tag] = {...di, ':id_tag': id_tag,};
			}
		}
		for (const v of Object.values(hRepTkn)) dbg.send2SN('_replaceToken', v);
	}


	restart = (ri: number)=> new Promise<void>(res=> {
		this.send2SN('restart', {ri: ri});					// request
		this.#hProcSnRes[ri] = ()=> {res(); return true;}	// response
	});

	continue = (reverse = false)=> this.send2SN('continue', {reverse});
		// 次のブレークポイントまでプログラムを続行。ブレークポイントがなければ最後まで実行。
	step = (reverse = false)=> this.send2SN('stepover', {reverse});
	stepin = ()=> this.send2SN('stepin');
	stepout = ()=> this.send2SN('stepout');
	pause = ()=> this.send2SN('pause');

	var = (ri: number, scope: string)=> new Promise<{[nm: string]: any}>(res=> {
		this.send2SN('var', {ri, scope});						// request
		this.#hProcSnRes[ri] = (_, o)=> {res(o.v); return true;}	// response
	});
	stack = (ri: number, start: number, end: number)=> new Promise<{
		nm	: string,
		fn	: string,
		ln	: number,
		col	: number,
		ma	: string,
	}[]>(res=> {
		this.send2SN('stack', {ri});		// request
		this.#hProcSnRes[ri] = (_, o)=> {	// response
			if (! Array.isArray(o.a)) {res([]); return true;}	// once

			res((<any[]>o.a).slice(start, end)
			.filter(v=> v.ma
				? (JSON.parse(v.ma ?? '{}').stepin ?? 'true') === 'true'
				: true
			)
			.map(v=> {
				v.fn = v.fn.replace('${pathbase}', this.#pathWs +'/doc');
				return v;
			}));

			return true;	// once
		};
	});
	eval = (ri: number, txt: string)=> new Promise<string>(res=> {
		this.send2SN('eval', {ri, txt});						// request
		this.#hProcSnRes[ri] = (_, o)=> {res(o.v); return true;}	// response
	});


	#idBP = 0;	// フロントエンドが管理するためのID
	#hFn2hLineBP: {[fn: string]: {[ln: number]: InfoBreakpoint}}	= {};
	setBreakPoints(fn: string, a: DebugProtocol.SourceBreakpoint[]): InfoBreakpoint[] {
		const aBp = a.map(o=> <InfoBreakpoint>{
			id		: ++this.#idBP,
			ln		: o.line,
			col		: o.column,
			verified	: true,
			condition	: o.condition,
			hitCondition: o.hitCondition,
		});

		const o: {[ln: number]: InfoBreakpoint} = {};
		this.#loadSource(fn);
		const sl = this.#hScriptLines[fn];
		const len_sl = sl.length;
		for (const v of aBp) {
			while (sl[v.ln -1].replace(/;.*$/, '').trim() === '') {
				if (v.ln++ === len_sl) {v.verified = false; break;}
			}
			o[v.ln] = v;
			this.#sendEvent2Adpt('breakpointValidated', v);
		}
		this.send2SN('add_break', {fn: fn, o: o});
		this.#hFn2hLineBP[fn] = o;

		return aBp;
	}
	#hScriptLines: {[fn: string]: string[]}	= {};
	#loadSource(fn: string) {
		if (fn in this.#hScriptLines) return;

		this.#hScriptLines[fn] = readFileSync(fn).toString().split('\n');
	}


	#aDataBreak: any[] = [];
	setDataBreakpoint = (ri: number, a: any[])=> new Promise<void>(res=> {
		this.#aDataBreak = a;
		this.send2SN('set_data_break', {ri: ri, a: a});			// request
		this.#hProcSnRes[ri] = (_, o)=> {res(o.v); return true;}	// response
	});

	#aFuncBreak: any[] = [];
	setFuncBreakpoint = (ri: number, a: any[])=> new Promise<void>(res=> {
		this.#aFuncBreak = a;
		this.send2SN('set_func_break', {ri: ri, a: a});			// request
		this.#hProcSnRes[ri] = (_, o)=> {res(o.v); return true;}	// response
	});

	setVariable = (ri: number, nm: string, val: string)=> new Promise<void>(res=> {
		this.send2SN('set_var', {ri: ri, nm: nm, val: val});	// request
		this.#hProcSnRes[ri] = (_, o)=> {res(o.v); return true;}	// response
	});


	// vscodeへ通知
	#sendEvent2Adpt(type: string, ... args: any[]) {
		setImmediate(()=> this.emit(type, ...args));
	}
}
