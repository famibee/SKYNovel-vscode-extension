/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {uint} from './CmnLib';
import {PrjSetting} from './PrjSetting';

import {DebugConfiguration, WorkspaceFolder, WorkspaceEdit, Range, Uri, workspace, TextDocumentChangeEvent} from 'vscode';
import {DebugProtocol} from 'vscode-debugprotocol';
import {readFileSync} from 'fs';
import {EventEmitter} from 'events';
import {Server, Socket} from 'socket.io';

export interface InfoBreakpoint {
	id		: number;
	ln		: number;
	col		: number;
	verified: boolean;
}

export class Debugger extends EventEmitter {
	private	pathWs	= '';
	constructor(readonly wsFld: WorkspaceFolder | undefined) {	// 一度だけ
		super();
		if (wsFld) {
			this.pathWs = wsFld.uri.path;
			Debugger.hcurPrj2Dbg[this.pathWs +'/doc/prj/'] = this;
		}
	}
	private	static	hcurPrj2Dbg: {[pathWs: string]: Debugger}	= {};

	attach(args: DebugConfiguration) {	// セッションごとに呼ばれる
		// デバッグ接続 シーケンス図
		// https://www.websequencediagrams.com/files/render?link=3RmdEHPw6hsJH5dwB9dQZhaGRbsqYSwCzn6Q7dwWfUa0ZxMZPJvaYowSMpVutAV5
		// シーケンス図(Sequence Diagram) - UML入門 - IT専科 https://www.itsenka.com/contents/development/uml/sequence.html
		// 象と散歩: Markdown（Typora）でシーケンス図を描く！ https://walking-elephant.blogspot.com/2019/08/markdowntypora.html
		this.hProcSnRes.hi = ()=> {
			this.send2SN('auth', {t: PrjSetting.getDebugertoken(this.wsFld), ...args});
			return false;
		};

		const srv = new Server(args.port, {cors: {origin: args.weburi}})
		.on('connection', (sk: Socket)=> {
			sk.on('data', (type: string, o: any)=> {
//console.log(`fn:Debugger.ts 新RSV sn -> dbgs id:${sk.id} id:${id} id2:${id2} type:${type} o:${JSON.stringify(o)}`);
				if (! this.hProcSnRes[type](type, o)) return;
				this.hProcSnRes[type] = ()=> false;
			});

			this.send2SN = (type: string, o: any = {})=> {
//console.log(`fn:Debugger.ts 新SND dbg -> sns id:${sk.id} id:${id} id2:${id2} type:${type} o:${JSON.stringify(o)}`);
				sk.emit('data', type, o);
			};
			this.end = ()=> {
				this.end = ()=> {};
				this.send2SN('disconnect', {});
				this.send2SN = ()=> {};
				sk.disconnect();
				srv.close();
				this.destroy();
			};
		});
	}

	private	send2SN(_type: string, _o: object = {}) {}

	end() {this.destroy()}
	private	destroy() {delete Debugger.hcurPrj2Dbg[this.pathWs];}

	private	readonly	hProcSnRes
	: {[type: string]: (type: string, o: any)=> boolean}	= {
		stopOnEntry: type=> {this.sendEvent2Adpt(type);	return false;},
		stopOnStep: type=> {this.sendEvent2Adpt(type);	return false;},
		stopOnBreakpoint: type=> {this.sendEvent2Adpt(type);	return false;},
		stopOnDataBreakpoint: type=> {this.sendEvent2Adpt(type);return false;},
		_recodeDesign: (_, o)=> {
//console.log(`fn:Debugger.ts line:80 _recodeDesign o:${JSON.stringify(o)}`);
			const ln = uint(o[':ln']) -1;
			const col_s = uint(o[':col_s']);
			const col_e = uint(o[':col_e']);
			this.hDCId2DI[o[':id']] = {
				...o,
				uri: Uri.file(o[':path'].replace('${pathbase}', this.pathWs +'/doc')),
				rng: new Range(ln, col_s, ln, col_e),
			};
				// TODO: スクリプト編集とこの辞書の更新は？　:lnとか変わる
				// 行挿入・削除イベントを取る？　ゲームリロードなら話が早いが。
				// 行の長さもけっこう変わる
			return false;
		},
		_enterDesign: _=> {
//			o[':path'] = o[':path'].replace('${pathbase}', this.pathWs +'/doc');
//console.log(`fn:Debugger.ts line:96 _enterDesign o:${JSON.stringify(o)}`);
			return false;
		},
		_changeCast: (_, o)=> {
//console.log(`fn:Debugger.ts line:100 _changeCast o:${JSON.stringify(o)}`);
			const {':id': id, ri, ...o2} = o;
			const di = this.hDCId2DI[id];
			if (! di) return false;

			let token = String(di[':token']);
//console.log(`fn:Debugger.ts line:106 id:(${id}) old token:(${token})`);
			for (const key in o2) token = token.replace(new RegExp(`(\\s${key}=)(['"#]*)(\\S+)\\2`), `$1${o2[key]}`);
//console.log(`fn:Debugger.ts line:108   new token:(${token})`);

			// upd text
			const ed = new WorkspaceEdit();
			ed.replace(di.uri, di.rng, token);
			workspace.applyEdit(ed);

			return false;
		},
	};
	private	hDCId2DI: {[id: string]: {
		uri		: Uri,
		rng		: Range,
		':col_e'	: number,
		':idx_tkn'	: number,
		':token'	: string,
	}}	= {};

	static	noticeChgDoc(curPrj: string, e: TextDocumentChangeEvent) {
		const dbg = Debugger.hcurPrj2Dbg[curPrj];
		if (! dbg) return;

//console.log(`fn:Debugger.ts line:130 noticeChgDoc path:${e.document.fileName}`);
		e.contentChanges.forEach(c=> {
			for (const id in dbg.hDCId2DI) {
				const di = dbg.hDCId2DI[id];
				if (! di.rng.contains(c.range)) continue;
				const q = di[':token'];
				const n = e.document.getText(di.rng);
				if (q === n) continue;

				// upd sn inside
//				const col_e = di[':col_e'];
//console.log(`fn:Debugger.ts line:141  Q =(${q})= col_e:${col_e}`);
				di[':col_e'] -= q.length -n.length;
//console.log(`fn:Debugger.ts line:143  N =(${n})= ce:${di[':col_e']}`);
				di[':token'] = n;
				dbg.send2SN('_replaceToken', {
					':idx_tkn': di[':idx_tkn'],
					':token': n,
					':id': id,
				});
				break;
			}
		});
	}


	restart = (ri: number)=> new Promise<void>(res=> {
		this.send2SN('restart', {ri: ri});					// request
		this.hProcSnRes[ri] = ()=> {res(); return true;}	// response
	});

	continue = (rev = false)=> this.send2SN('continue', {reverse: rev});
		// 次のブレークポイントまでプログラムを続行。ブレークポイントがなければ最後まで実行。
	step = (rev = false)=> this.send2SN('stepover', {reverse: rev});
	stepin = ()=> this.send2SN('stepin');
	stepout = ()=> this.send2SN('stepout');
	pause = ()=> this.send2SN('pause');

	var = (ri: number, scope: string)=> new Promise<any[]>(res=> {
		this.send2SN('var', {ri: ri, scope: scope});			// request
		this.hProcSnRes[ri] = (_, o)=> {res(o.v); return true;}	// response
	});
	stack = (ri: number, start: number, end: number)=> new Promise<{
		nm	: string,
		fn	: string,
		ln	: number,
		col	: number,
	}[]>(res=> {
		this.send2SN('stack', {ri: ri});	// request
		this.hProcSnRes[ri] = (_, o)=> {	// response
			const a: any[] = Array.isArray(o.a) ?o.a.slice(start, end) :[];
			res(a.map(v=> {
				v.fn = v.fn.replace('${pathbase}', this.pathWs +'/doc');
				return v;
			}));
			return true;	// once
		};
	});
	eval = (ri: number, txt: string)=> new Promise<any>(res=> {
		this.send2SN('eval', {ri: ri, txt: txt});				// request
		this.hProcSnRes[ri] = (_, o)=> {res(o.v); return true;}	// response
	});


	private idBP = 0;	// フロントエンドが管理するためのID
	private	fn2ABP: {[fn: string]: InfoBreakpoint[]}	= {};
	setBreakPoints(fn: string, a: DebugProtocol.SourceBreakpoint[]): InfoBreakpoint[] {
		const aBp = a.map(o=> <InfoBreakpoint>{
			id		: ++this.idBP,
			ln		: o.line,
			col		: o.column,
			verified: true,
		});

		const o: {[ln: number]: object} = {};
		this.loadSource(fn);
		const sl = this.hScriptLines[fn];
		const len_sl = sl.length;
		aBp.forEach(v=> {
			while (sl[v.ln -1].replace(/;.*$/, '').trim() === '') {
				if (v.ln++ === len_sl) {v.verified = false; break;}
			}
			o[v.ln] = v;
			this.sendEvent2Adpt('breakpointValidated', v);
		});
		this.send2SN('add_break', {fn: fn, o: o});

		return this.fn2ABP[fn] = aBp;
	}
	private hScriptLines: {[fn: string]: string[]}	= {};
	private loadSource(fn: string) {
		if (fn in this.hScriptLines) return;

		this.hScriptLines[fn] = readFileSync(fn).toString().split('\n');
	}


	setDataBreakpoint = (ri: number, a: any[])=> new Promise<void>(res=> {
		this.send2SN('set_data_break', {ri: ri, a: a});			// request
		this.hProcSnRes[ri] = (_, o)=> {res(o.v); return true;}	// response
	});

	setFuncBreakpoint = (ri: number, a: any[])=> new Promise<void>(res=> {
		this.send2SN('set_func_break', {ri: ri, a: a});			// request
		this.hProcSnRes[ri] = (_, o)=> {res(o.v); return true;}	// response
	});

	setVariable = (ri: number, nm: string, val: string)=> new Promise<void>(res=> {
		this.send2SN('set_var', {ri: ri, nm: nm, val: val});	// request
		this.hProcSnRes[ri] = (_, o)=> {res(o.v); return true;}	// response
	});


	// vscodeへ通知
	private sendEvent2Adpt(type: string, ... args: any[]) {
		setImmediate(_=> this.emit(type, ...args));
	}
}
