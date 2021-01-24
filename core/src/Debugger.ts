/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {PrjSetting} from './PrjSetting';

import {DebugConfiguration, WorkspaceFolder} from 'vscode';
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
		if (wsFld) this.pathWs = wsFld.uri.path;
	}

	attach(args: DebugConfiguration) {	// セッションごとに呼ばれる
		this.aSkBuf = [];
		this.send2SN = (type, o = {})=> this.aSkBuf.push({type: type, o: o});
		this.send2SN('auth', {t: PrjSetting.getDebugertoken(this.wsFld)});
		this.send2SN('launch');

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
			};
			this.aSkBuf.forEach(v=> this.send2SN(v.type, v.o));
			this.aSkBuf = [];
		});
	}

	private	aSkBuf	: {type: string, o: any}[]	= [];
	private	send2SN(type: string, o: object = {}) {
		this.aSkBuf.push({type: type, o: o});
	}

	end() {}

	private	readonly	hProcSnRes
	: {[nm: string]: (type: string, o: any)=> boolean}	= {
		stopOnStep: type=> {this.sendEvent2Adpt(type);	return false;},
		stopOnBreakpoint: type=> {this.sendEvent2Adpt(type);	return false;},
		stopOnDataBreakpoint: type=> {this.sendEvent2Adpt(type);return false;},
//		DesignMode: (_, o)=> {Debugger.procFn4Sn2Dbg(o);	return false;},
	};

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
