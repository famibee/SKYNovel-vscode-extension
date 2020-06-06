/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {DebugConfiguration} from 'vscode';
import {readFileSync, unlinkSync} from 'fs';
import {EventEmitter} from 'events';
import {createConnection, Socket, createServer} from 'net';

export interface InfoBreakpoint {
	id		: number;
	ln		: number;
	verified: boolean;
}

export class Debugger extends EventEmitter {
	// 与えられたプログラムの実行を開始します
	private	readonly	hProcSnRes: {[nm: string]: (o: any)=> boolean}	= {
		stopOnStep	: o=> {this.sendEvent2Adpt(o.type);	return false;},
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

		this.loadSource(`${args.cwd}/doc/prj/script/main.sn`);
		this.verifyBreakpoints(this.scriptFn_);

		// attachでのみ行う
		this.send2SN({type: runtype});
	}
	private	sktDbg: Socket | null	= null;
	private	sktBuf = '';
	private	send2SN(o: object) {
		this.sktBuf = this.sktBuf +'\x1f'+ JSON.stringify(o);
	}
	end() {this.send2SN({type: 'disconnect'}); this.sktDbg?.end();}

	// 次のブレークポイントまでプログラムを続行。ブレークポイントがなければ最後まで実行。
	continue(rev = false) {this.send2SN({type: 'continue', reverse: rev});}
	step(rev = false) {this.send2SN({type: 'stepover', reverse: rev});}
	stepin() {this.send2SN({type: 'stepin'});}
	stepout() {this.send2SN({type: 'stepout'});}

	restart(ri: number): Promise<any> {return new Promise<any[]>(res=> {
		this.send2SN({type: 'restart', ri: ri});			// request
		this.hProcSnRes[ri] = ()=> {res(); return true;}	// response
	});}

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

	getBreakpoints(_fn: string, ln: number): number[] {
console.log(`fn:Debugger.ts line:78 getBreakpoints(fn:${_fn}, ln:${ln})`);
		let sawSpace = true;
		const bps: number[] = [];
		const l = this.aLinesScript[ln];
		const len = l.length;
		for (let i=0; i<len; ++i) {
			if (l[i] !== ' ') {
				if (sawSpace) {
					bps.push(i);
					sawSpace = false;
				}
			}
			else sawSpace = true;	// 戻すの？？？
		}

		return bps;
	}

	private idBreakpoint = 0;	// フロントエンドが管理するためのID
	private mapPath2InfBP = new Map<string, InfoBreakpoint[]>();
	setBreakPoint(fn: string, ln: number, o: any) : InfoBreakpoint {
		const bp = <InfoBreakpoint> {verified: false, ln: ln, id: ++this.idBreakpoint};
		const bps = this.mapPath2InfBP.get(fn);
		if (bps) bps.push(bp);
		else this.mapPath2InfBP.set(fn, [bp]);

		this.verifyBreakpoints(fn);

		this.send2SN({...o, type: 'add_break', fn: fn, ln: ln});

		return bp;
	}

	delBreakPoint(fn: string, ln: number): InfoBreakpoint | undefined {
		const bps = this.mapPath2InfBP.get(fn);
		if (! bps) return undefined;

		const idx = bps.findIndex(bp=> bp.ln === ln);
		if (idx == -1) return undefined;

		const bp = bps[idx];
		bps.splice(idx, 1);

		this.send2SN({type: 'del_break', fn: fn, ln: ln});

		return bp;
	}

	clearBreakpoints(fn: string): void {
		this.mapPath2InfBP.delete(fn);
		this.send2SN({type: 'clear_break', fn: fn});
	}

	private verifyBreakpoints(fn: string): void {
		const bps = this.mapPath2InfBP.get(fn);
		if (! bps) return;

		this.loadSource(fn);
		bps.forEach(bp=> {
			if (bp.verified || bp.ln >= this.aLinesScript.length) return;

			// 空行やコメントのみ行は、ブレークポイント禁止として下に移動
			const line = this.aLinesScript[bp.ln].trim();
			if (line.length === 0 || line.charAt(0) === ';') ++bp.ln;

			// if a line starts with '-' we don't allow to set a breakpoint but move the breakpoint up
			// 行が '-' で始まる場合、ブレークポイントを設定することはできませんが、ブレークポイントを上に移動させることができます。
//			if (line.indexOf('-') === 0) --bp.ln;

//			if (line.indexOf('lazy') >= 0) return;

			bp.verified = true;
			this.sendEvent2Adpt('breakpointValidated', bp);
		});
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


	private scriptFn_ = '';
	get scriptFn() {return this.scriptFn_;}
	private aLinesScript: string[];
	private loadSource(fn: string) {
		if (this.scriptFn_ === fn) return;

		this.scriptFn_ = fn;
		this.aLinesScript = readFileSync(this.scriptFn_).toString().split('\n');
	}


	private sendEvent2Adpt(event: string, ... args: any[]) {
		setImmediate(_=> this.emit(event, ...args));
	}
}
