/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {DebugConfiguration} from 'vscode';
import {DebugProtocol} from 'vscode-debugprotocol';
import {unlinkSync, readFileSync} from 'fs';
import {EventEmitter} from 'events';
import {createConnection, Socket, createServer} from 'net';

export interface InfoBreakpoint {
	id		: number;
	ln		: number;
	col		: number;
	verified: boolean;
}

export class Debugger extends EventEmitter {
	// 与えられたプログラムの実行を開始します
	private	readonly	hProcSnRes: {[nm: string]: (o: any)=> boolean}	= {
		stopOnStep: o=> {this.sendEvent2Adpt(o.type);	return false;},
		stopOnBreakpoint: o=> {this.sendEvent2Adpt(o.type);	return false;},
		stopOnDataBreakpoint: o=> {this.sendEvent2Adpt(o.type);	return false;},
	};
	launch(args: DebugConfiguration) {
		const US_LAUNCH = `${args.cwd}/.vscode/sn_launch.sock`;
		try {unlinkSync(US_LAUNCH);} catch {}
		createServer(()=> this.attach(args, 'launch')).listen(US_LAUNCH);
	}
	attach(args: DebugConfiguration, runtype = 'attach') {
		this.sktDbg = createConnection(`${args.cwd}/.vscode/skynovel.sock`)
		.on('data', b=> {
			const s = b.toString();
			if (s.charAt(0) != '\x1f') return;

			s.slice(1).split('\x1f').forEach(f=> {
				const o = JSON.parse(f);
//console.log(`fn:Debugger.ts sn -> dbg type:${o.type} o:${f.slice(0, 150)}`);
				if (! this.hProcSnRes[o.type](o)) return;
				this.hProcSnRes[o.type] = ()=> false;
			});
		})
		// endイベントは接続がきれいにクローズされないと発火しないらしい
		.on('close', ()=> {this.send2SN = ()=> {}; this.sktDbg = null;})
		.on('error', e=> console.error(e.message));

		this.sktDbg.write(this.sktBuf);
		this.sktBuf = '';
		this.send2SN = o=> this.sktDbg?.write('\x1f'+ JSON.stringify(o));

		this.send2SN({type: runtype});
	}
	private	sktDbg: Socket | null	= null;
	private	sktBuf = '';
	private	send2SN(o: object) {
		this.sktBuf = this.sktBuf +'\x1f'+ JSON.stringify(o);
	}
	end() {this.send2SN({type: 'disconnect'}); this.sktDbg?.end();}

	readonly	restart = (ri: number)=> new Promise<void>(res=> {
		this.send2SN({type: 'restart', ri: ri});			// request
		this.hProcSnRes[ri] = ()=> {res(); return true;}	// response
	});

	continue(rev = false) {this.send2SN({type: 'continue', reverse: rev});}
		// 次のブレークポイントまでプログラムを続行。ブレークポイントがなければ最後まで実行。
	step(rev = false) {this.send2SN({type: 'stepover', reverse: rev});}
	stepin() {this.send2SN({type: 'stepin'});}
	stepout() {this.send2SN({type: 'stepout'});}
	pause() {this.send2SN({type: 'pause'});}

	var(ri: number, scope: string): Promise<{[nm: string]: any}> {
		return new Promise<any[]>(res=> {
			this.send2SN({type: 'var', ri: ri, scope: scope});	// request
			this.hProcSnRes[ri] = o=> {res(o.v); return true;}	// response
		});
	}
	stack(ri: number, start: number, end: number): Promise<any[]> {
		return new Promise<any[]>(res=> {
			this.send2SN({type: 'stack', ri: ri});	// request
			this.hProcSnRes[ri] = o=> {				// response
				res(Array.isArray(o.a) ?o.a.slice(start, end) :[]);
				return true;	// once
			}
		});
	}
	eval(ri: number, txt: string): Promise<any> {
		return new Promise<any[]>(res=> {
			this.send2SN({type: 'eval', ri: ri, txt: txt});		// request
			this.hProcSnRes[ri] = o=> {res(o.v); return true;}	// response
		});
	}


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
		this.send2SN({type: 'add_break', fn: fn, o: o});

		return this.fn2ABP[fn] = aBp;
	}
	private hScriptLines: {[fn: string]: string[]}	= {};
	private loadSource(fn: string) {
		if (fn in this.hScriptLines) return;

		this.hScriptLines[fn] = readFileSync(fn).toString().split('\n');
	}


	setDataBreakpoint = (ri: number, a: any[])=> new Promise<void>(res=> {
		this.send2SN({type: 'set_data_break', ri: ri, a: a});	// request
		this.hProcSnRes[ri] = o=> {res(o.v); return true;}		// response
	});

	setFuncBreakpoint = (ri: number, a: any[])=> new Promise<void>(res=> {
		this.send2SN({type: 'set_func_break', ri: ri, a: a});	// request
		this.hProcSnRes[ri] = o=> {res(o.v); return true;}		// response
	});

	setVariable = (ri: number, nm: string, val: string)=> new Promise<void>(res=> {
		this.send2SN({type: 'set_var', ri: ri, nm: nm, val: val});	// request
		this.hProcSnRes[ri] = o=> {res(o.v); return true;}			// response
	});


	private sendEvent2Adpt(event: string, ... args: any[]) {
		setImmediate(_=> this.emit(event, ...args));
	}
}
