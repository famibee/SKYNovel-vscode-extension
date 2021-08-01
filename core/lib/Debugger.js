"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Debugger = void 0;
const CmnLib_1 = require("./CmnLib");
const PrjSetting_1 = require("./PrjSetting");
const vscode_1 = require("vscode");
const fs_extra_1 = require("fs-extra");
const events_1 = require("events");
const socket_io_1 = require("socket.io");
const { promisify } = require('util');
const img_size = promisify(require('image-size'));
const path = require('path');
class Debugger extends events_1.EventEmitter {
    constructor(wsFld, hookTag) {
        super();
        this.wsFld = wsFld;
        this.hookTag = hookTag;
        this.pathWs = '';
        this.hProcSnRes = {
            stopOnEntry: type => { this.sendEvent2Adpt(type); return false; },
            stopOnStep: type => { this.sendEvent2Adpt(type); return false; },
            stopOnBreakpoint: type => { this.sendEvent2Adpt(type); return false; },
            stopOnDataBreakpoint: type => { this.sendEvent2Adpt(type); return false; },
            _recodeDesign: (_, o) => {
                const ln = CmnLib_1.uint(o[':ln']) - 1;
                const col_s = CmnLib_1.uint(o[':col_s']);
                const col_e = CmnLib_1.uint(o[':col_e']);
                this.hDCId2DI[o[':id_tag']] = {
                    ...o,
                    uri: vscode_1.Uri.file(o[':path'].replace('${pathbase}', this.pathWs + '/doc')),
                    rng: new vscode_1.Range(ln, col_s, ln, col_e),
                };
                this.hookTag(o);
                return false;
            },
            _enterDesign: _ => {
                return false;
            },
            _changeCast: (_, o) => {
                const { ':id_tag': id_tag, ri, ...o2 } = o;
                const di = this.hDCId2DI[id_tag];
                if (!di)
                    return false;
                let token = String(di[':token']);
                for (const key in o2)
                    token = token.replace(new RegExp(`(\\s${key}=)(['"#]*)(?:\\S+)\\2([\\s\\]])`), `$1${o2[key]}$3`);
                di[':token'] = token;
                const ed = new vscode_1.WorkspaceEdit();
                ed.replace(di.uri, di.rng, token);
                vscode_1.workspace.applyEdit(ed);
                return false;
            },
            _focusScript: (_, o) => {
                o[':path'] = o[':path'].replace('${pathbase}', this.pathWs + '/doc');
                const ln = o[':ln'] - 1;
                vscode_1.window.showTextDocument(vscode_1.Uri.file(o[':path']), {
                    selection: new vscode_1.Range(new vscode_1.Position(ln, o[':col_s']), new vscode_1.Position(ln, o[':col_e'])),
                });
                return false;
            },
            _dropFile: (_, o) => {
                const { ':id_tag': id_tag, fn, ext, url, buf, old_fn, old_url } = o;
                const di = this.hDCId2DI[id_tag];
                if (!di)
                    return false;
                let urlWrite = '';
                if (url) {
                    urlWrite = url.replace('${pathbase}', this.pathWs + '/doc');
                    if (fn === old_fn) {
                        let eq = true;
                        const bufFromPrj = fs_extra_1.readFileSync(urlWrite);
                        const len = bufFromPrj.length;
                        if (len !== buf.length)
                            eq = false;
                        else
                            for (let i = 0; i < len; ++i) {
                                if (bufFromPrj[i] !== buf[i]) {
                                    eq = false;
                                    break;
                                }
                            }
                        if (eq)
                            return false;
                    }
                }
                else {
                    const parent = path.basename(path.dirname(old_url));
                    urlWrite = this.pathWs + `/doc/prj/${parent}/${fn}.${ext}`;
                    const oAP = { ':cnt': 1 };
                    oAP[ext] = `${parent}/${fn}.${ext}`;
                    this.send2SN('_addPath', { fn: fn, o: oAP });
                }
                const fwPathJs = vscode_1.workspace.createFileSystemWatcher(this.pathWs + `/doc/prj/path.json`);
                fwPathJs.onDidChange(() => {
                    fwPathJs.dispose();
                    let token = String(di[':token']);
                    const o2 = { fn, b_pic: fn, pic: fn };
                    const fnc = () => {
                        for (const key in o2)
                            token = token.replace(new RegExp(`(\\s${key}=)(['"#]*)(?:\\S+)\\2([\\s\\]])`), `$1${o2[key]}$3`);
                        di[':token'] = token;
                        const ed = new vscode_1.WorkspaceEdit();
                        ed.replace(di.uri, di.rng, token);
                        vscode_1.workspace.applyEdit(ed);
                    };
                    img_size(urlWrite)
                        .then((s) => {
                        o2.width = s.width;
                        o2.height = s.height;
                        fnc();
                    })
                        .catch(() => fnc());
                });
                fs_extra_1.writeFileSync(urlWrite, buf);
                return false;
            },
        };
        this.hDCId2DI = {};
        this.restart = (ri) => new Promise(res => {
            this.send2SN('restart', { ri: ri });
            this.hProcSnRes[ri] = () => { res(); return true; };
        });
        this.continue = (reverse = false) => this.send2SN('continue', { reverse });
        this.step = (reverse = false) => this.send2SN('stepover', { reverse });
        this.stepin = () => this.send2SN('stepin');
        this.stepout = () => this.send2SN('stepout');
        this.pause = () => this.send2SN('pause');
        this.var = (ri, scope) => new Promise(res => {
            this.send2SN('var', { ri, scope });
            this.hProcSnRes[ri] = (_, o) => { res(o.v); return true; };
        });
        this.stack = (ri, start, end) => new Promise(res => {
            this.send2SN('stack', { ri });
            this.hProcSnRes[ri] = (_, o) => {
                if (!Array.isArray(o.a)) {
                    res([]);
                    return true;
                }
                res(o.a.slice(start, end)
                    .filter(v => v.ma
                    ? (JSON.parse(v.ma ?? '{}').stepin ?? 'true') === 'true'
                    : true)
                    .map(v => {
                    v.fn = v.fn.replace('${pathbase}', this.pathWs + '/doc');
                    return v;
                }));
                return true;
            };
        });
        this.eval = (ri, txt) => new Promise(res => {
            this.send2SN('eval', { ri, txt });
            this.hProcSnRes[ri] = (_, o) => { res(o.v); return true; };
        });
        this.idBP = 0;
        this.hFn2hLineBP = {};
        this.hScriptLines = {};
        this.aDataBreak = [];
        this.setDataBreakpoint = (ri, a) => new Promise(res => {
            this.aDataBreak = a;
            this.send2SN('set_data_break', { ri: ri, a: a });
            this.hProcSnRes[ri] = (_, o) => { res(o.v); return true; };
        });
        this.aFuncBreak = [];
        this.setFuncBreakpoint = (ri, a) => new Promise(res => {
            this.aFuncBreak = a;
            this.send2SN('set_func_break', { ri: ri, a: a });
            this.hProcSnRes[ri] = (_, o) => { res(o.v); return true; };
        });
        this.setVariable = (ri, nm, val) => new Promise(res => {
            this.send2SN('set_var', { ri: ri, nm: nm, val: val });
            this.hProcSnRes[ri] = (_, o) => { res(o.v); return true; };
        });
        if (wsFld) {
            this.pathWs = wsFld.uri.path;
            Debugger.hcurPrj2Dbg[this.pathWs + '/doc/prj/'] = this;
        }
        vscode_1.commands.registerCommand('skynovel.tiLayers.selectNode', node => {
            this.send2SN('_selectNode', { node: node });
        });
    }
    attach(args) {
        this.hProcSnRes.hi = () => {
            this.send2SN('auth', {
                t: PrjSetting_1.PrjSetting.getDebugertoken(this.wsFld),
                hBreakpoint: {
                    hFn2hLineBP: this.hFn2hLineBP,
                    aData: this.aDataBreak,
                    aFunc: this.aFuncBreak,
                },
                ...args,
            });
            this.hookTag({ タグ名: ':connect' });
            return false;
        };
        new socket_io_1.Server(args.port, { cors: { origin: args.weburi } })
            .on('connection', (sk) => {
            sk.on('data', (type, o) => {
                if (!this.hProcSnRes[type](type, o))
                    return;
                this.hProcSnRes[type] = () => false;
            });
            this.send2SN = (type, o = {}) => {
                sk.emit('data', type, o);
            };
            const fncEnd = this.end;
            this.end = () => {
                this.end = fncEnd;
                this.end();
                this.send2SN('disconnect', {});
                this.send2SN = () => { };
                sk.disconnect();
            };
        });
    }
    send2SN(_type, _o = {}) { }
    end() {
        delete Debugger.hcurPrj2Dbg[this.pathWs];
        this.hookTag({ タグ名: ':disconnect' });
    }
    static noticeChgDoc(curPrj, e) {
        const dbg = Debugger.hcurPrj2Dbg[curPrj];
        if (!dbg)
            return;
        const hRepTkn = {};
        e.contentChanges.forEach(c => {
            const sa = c.text.length - c.rangeLength;
            for (const id_tag in dbg.hDCId2DI) {
                const di = dbg.hDCId2DI[id_tag];
                if (!di.rng.contains(c.range))
                    continue;
                di[':col_e'] += sa;
                di.rng = di.rng.with(di.rng.start, di.rng.end.translate(0, sa));
                const n = e.document.getText(di.rng);
                di[':token'] = n;
                if (n.charAt(0) !== '[' || n.slice(-1) !== ']')
                    continue;
                hRepTkn[id_tag] = { ...di, ':id_tag': id_tag, };
            }
        });
        for (const id in hRepTkn)
            dbg.send2SN('_replaceToken', hRepTkn[id]);
    }
    setBreakPoints(fn, a) {
        const aBp = a.map(o => ({
            id: ++this.idBP,
            ln: o.line,
            col: o.column,
            verified: true,
            condition: o.condition,
            hitCondition: o.hitCondition,
        }));
        const o = {};
        this.loadSource(fn);
        const sl = this.hScriptLines[fn];
        const len_sl = sl.length;
        aBp.forEach(v => {
            while (sl[v.ln - 1].replace(/;.*$/, '').trim() === '') {
                if (v.ln++ === len_sl) {
                    v.verified = false;
                    break;
                }
            }
            o[v.ln] = v;
            this.sendEvent2Adpt('breakpointValidated', v);
        });
        this.send2SN('add_break', { fn: fn, o: o });
        this.hFn2hLineBP[fn] = o;
        return aBp;
    }
    loadSource(fn) {
        if (fn in this.hScriptLines)
            return;
        this.hScriptLines[fn] = fs_extra_1.readFileSync(fn).toString().split('\n');
    }
    sendEvent2Adpt(type, ...args) {
        setImmediate(_ => this.emit(type, ...args));
    }
}
exports.Debugger = Debugger;
Debugger.hcurPrj2Dbg = {};
//# sourceMappingURL=Debugger.js.map