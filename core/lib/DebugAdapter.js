"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDebug = void 0;
const vscode_1 = require("vscode");
const vscode_debugadapter_1 = require("vscode-debugadapter");
const path_1 = require("path");
const Debugger_1 = require("./Debugger");
const { Subject } = require('await-notify');
const CmnLib_1 = require("./CmnLib");
let daii = null;
function initDebug(ctx, hookTag) {
    const lng = CmnLib_1.docsel.language ?? '';
    vscode_1.debug.registerDebugConfigurationProvider(lng, {
        provideDebugConfigurations(_folder) {
            return [
                {
                    name: '10.ブラウザ版',
                    request: 'launch',
                    type: 'pwa-node',
                    runtimeExecutable: 'npm',
                    runtimeArgs: [
                        'run-script',
                        'watch:wdsdbg'
                    ],
                    skipFiles: [
                        '<node_internals>/**'
                    ],
                    console: 'internalConsole',
                    internalConsoleOptions: 'openOnSessionStart'
                },
                {
                    name: '1.アプリ版',
                    request: 'launch',
                    type: 'node',
                    port: 3776,
                    console: 'internalConsole',
                    internalConsoleOptions: 'openOnSessionStart',
                },
                {
                    name: '2.デバッガ',
                    request: 'attach',
                    type: 'skynovel',
                    port: 3776,
                    weburi: 'http://localhost:8080',
                    stopOnEntry: false,
                },
            ];
        }
    });
    ctx.subscriptions.push(vscode_1.debug.registerDebugConfigurationProvider('node', {
        resolveDebugConfiguration(_folder, cfg) {
            const ex = '${workspaceFolder}/node_modules/.bin/electron';
            return {
                program: '${workspaceFolder}/doc/app.js',
                runtimeExecutable: ex,
                windows: { runtimeExecutable: ex + '.cmd' },
                console: 'integratedTerminal',
                autoAttachChildProcesses: true,
                skipFiles: [
                    '<node_internals>/**/*.js'
                ],
                ...cfg,
                env: { SKYNOVEL_DBG: 'on', SKYNOVEL_PORT: cfg.port ?? 3776, ...cfg.env, },
            };
        }
    }));
    ctx.subscriptions.push(vscode_1.debug.registerDebugConfigurationProvider(lng, {
        resolveDebugConfiguration(_folder, cfg) {
            return { cwd: '${workspaceFolder}', port: 3776, weburi: 'http://localhost:8080', ...cfg, };
        }
    }));
    const dadf = {
        createDebugAdapterDescriptor(ss) {
            return daii ?? (daii = new vscode_1.DebugAdapterInlineImplementation(new DebugAdapter(ss.workspaceFolder, hookTag)));
        },
    };
    ctx.subscriptions.push(vscode_1.debug.registerDebugAdapterDescriptorFactory(lng, dadf));
}
exports.initDebug = initDebug;
function timeout(ms) { return new Promise(re => setTimeout(re, ms)); }
class DebugAdapter extends vscode_debugadapter_1.LoggingDebugSession {
    constructor(wsFld, hookTag) {
        super('sn_debug.txt');
        this.wsFld = wsFld;
        this.cfgDone = new Subject();
        this.hdlsVar = new vscode_debugadapter_1.Handles();
        this.hNm2HdlNm = {};
        this.mapCancelationTokens = new Map();
        this.mapIsLongrunning = new Map();
        this.hScope = {
            'tmp': {},
            'sys': {},
            'save': {},
            'mp': {},
        };
        this.setDebuggerLinesStartAt1(true);
        this.setDebuggerColumnsStartAt1(true);
        this.dbg = new Debugger_1.Debugger(wsFld, hookTag);
        this.dbg.on('stopOnEntry', () => {
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent('entry', DebugAdapter.THREAD_ID));
        });
        this.dbg.on('stopOnStep', () => {
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent('step', DebugAdapter.THREAD_ID));
        });
        this.dbg.on('stopOnBreakpoint', () => {
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent('breakpoint', DebugAdapter.THREAD_ID));
        });
        this.dbg.on('stopOnDataBreakpoint', () => {
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent('data breakpoint', DebugAdapter.THREAD_ID));
        });
        this.dbg.on('stopOnException', () => {
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent('exception', DebugAdapter.THREAD_ID));
        });
        this.dbg.on('breakpointValidated', (bp) => {
            this.sendEvent(new vscode_debugadapter_1.BreakpointEvent('changed', bp));
        });
        this.dbg.on('output', (text, filePath, line, column) => {
            const e = new vscode_debugadapter_1.OutputEvent(`${text}\n`);
            if (text === 'start' || text === 'startCollapsed' || text === 'end') {
                e.body.group = text;
                e.body.output = `group-${text}\n`;
            }
            e.body.source = this.createSource(filePath);
            e.body.line = this.convertDebuggerLineToClient(line);
            e.body.column = this.convertDebuggerColumnToClient(column);
            this.sendEvent(e);
        });
        this.dbg.on('end', () => this.sendEvent(new vscode_debugadapter_1.TerminatedEvent()));
    }
    initializeRequest(res, _args) {
        res.body ?? (res.body = {});
        res.body.supportsConfigurationDoneRequest = true;
        res.body.supportsFunctionBreakpoints = true;
        res.body.supportsConditionalBreakpoints = true;
        res.body.supportsHitConditionalBreakpoints = true;
        res.body.supportsEvaluateForHovers = true;
        res.body.supportsStepBack = false;
        res.body.supportsSetVariable = true;
        res.body.supportsCompletionsRequest = true;
        res.body.supportsRestartRequest = true;
        res.body.supportsDataBreakpoints = true;
        res.body.supportsCancelRequest = false;
        this.sendResponse(res);
        this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
    }
    disconnectRequest(_res, _args, _req) { this.dbg.end(); }
    configurationDoneRequest(_res, _args) { this.cfgDone.notify(); }
    attachRequest(res, args) {
        vscode_debugadapter_1.logger.setup(vscode_debugadapter_1.Logger.LogLevel.Stop, false);
        this.dbg.attach(args);
        this.sendResponse(res);
    }
    async restartRequest(res, _args) {
        await this.dbg.restart(res.request_seq);
        this.sendResponse(res);
    }
    setBreakPointsRequest(res, args) {
        const a = args.breakpoints ?? [];
        res.body = {
            breakpoints: this.dbg.setBreakPoints(args.source.path, a.map(o => ({
                ...o,
                line: this.convertClientLineToDebugger(o.line),
            })))
                .map((o, i) => new vscode_debugadapter_1.Breakpoint(o.verified, a[i].line, o.col))
        };
        this.sendResponse(res);
    }
    async setFunctionBreakPointsRequest(res, args, _req) {
        const a = [];
        res.body = { breakpoints: [] };
        args.breakpoints.forEach(dbp => {
            a.push(dbp);
            res.body.breakpoints.push({ verified: true, });
        });
        await this.dbg.setFuncBreakpoint(res.request_seq, a);
        this.sendResponse(res);
    }
    restartFrameRequest(res, args, req) {
        console.log(`fn:DebugAdapter.ts line:386 restartFrameRequest(res:${JSON.stringify(res)} args:${JSON.stringify(args)} req:${JSON.stringify(req)})`);
    }
    pauseRequest(_res, _args) { this.dbg.pause(); }
    threadsRequest(res) {
        res.body = { threads: [new vscode_debugadapter_1.Thread(DebugAdapter.THREAD_ID, 'thread 1')] };
        this.sendResponse(res);
    }
    async stackTraceRequest(res, args) {
        const start = typeof args.startFrame === 'number' ? args.startFrame : 0;
        const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
        const end = start + maxLevels;
        const stk = await this.dbg.stack(res.request_seq, start, end);
        res.body = {
            stackFrames: stk.map((f, i) => new vscode_debugadapter_1.StackFrame(i, f.nm, this.createSource(f.fn), this.convertDebuggerLineToClient(f.ln), this.convertDebuggerColumnToClient(f.col))),
            totalFrames: stk.length,
        };
        this.sendResponse(res);
    }
    scopesRequest(res, _args) {
        this.hScope = {
            'tmp': {},
            'sys': {},
            'save': {},
            'mp': {},
        };
        res.body = {
            scopes: [
                new vscode_debugadapter_1.Scope('雑用変数 tmp:', this.hdlsVar.create('tmp'), false),
                new vscode_debugadapter_1.Scope('雑用変数 tmp:（SKYNovel組み込み）', this.hdlsVar.create('tmp:sn'), false),
                new vscode_debugadapter_1.Scope('マクロ変数 mp:', this.hdlsVar.create('mp'), false),
                new vscode_debugadapter_1.Scope('マクロ変数 mp:（SKYNovel組み込み）', this.hdlsVar.create('mp:sn'), false),
                new vscode_debugadapter_1.Scope('システム変数 sys:', this.hdlsVar.create('sys'), false),
                new vscode_debugadapter_1.Scope('システム変数 sys:（SKYNovel組み込み）', this.hdlsVar.create('sys:sn'), false),
                new vscode_debugadapter_1.Scope('セーブ変数 save:', this.hdlsVar.create('save'), false),
                new vscode_debugadapter_1.Scope('セーブ変数 save:（SKYNovel組み込み）', this.hdlsVar.create('save:sn'), false),
            ]
        };
        this.sendResponse(res);
    }
    async variablesRequest(res, args, request) {
        const aVar = [];
        if (this.mapIsLongrunning.get(args.variablesReference)) {
            if (request)
                this.mapCancelationTokens.set(request.seq, false);
            for (let i = 0; i < 100; ++i) {
                await timeout(1000);
                aVar.push({
                    name: `i_${i}`,
                    type: 'integer',
                    value: `${i}`,
                    variablesReference: 0
                });
                if (request && this.mapCancelationTokens.get(request.seq)) {
                    break;
                }
            }
            if (request)
                this.mapCancelationTokens.delete(request.seq);
        }
        else {
            let id = this.hdlsVar.get(args.variablesReference);
            if (id) {
                let tst_sn = true;
                if (id.slice(-3) === ':sn') {
                    tst_sn = false;
                    id = id.slice(0, -3);
                }
                let h = {};
                if (id in this.hScope) {
                    this.hScope[id] = h
                        = await this.dbg.var(res.request_seq, id);
                }
                else {
                    const a = `${id}:`.split(':', 2);
                    const h2 = this.hScope[a[0]];
                    if (h2) {
                        const v2 = h2[a[1]];
                        if (v2)
                            h = JSON.parse(String(v2));
                    }
                }
                for (const key in h) {
                    if (DebugAdapter.REG_SN_VAR.test(key) === tst_sn)
                        continue;
                    const v = String(h[key]);
                    const o = {
                        name: key,
                        type: this.getType(v),
                        value: v,
                        presentationHint: {
                            kind: 'property',
                            visibility: 'public',
                        },
                        variablesReference: 0,
                    };
                    if (key.slice(0, 6) === 'const.')
                        o.presentationHint.attributes = ['readOnly'];
                    if (v === '[object Object]')
                        o.value = JSON.stringify(h[key]);
                    else if (o.type === 'object' || o.type === 'array')
                        this.hNm2HdlNm[`${id}:${key}`] = o.variablesReference
                            = this.hdlsVar.create(`${id}:${key}`);
                    aVar.push(o);
                }
            }
        }
        res.body = { variables: aVar.sort((a, b) => {
                if (a.name < b.name)
                    return -1;
                if (a.name > b.name)
                    return 1;
                return 0;
            }) };
        this.sendResponse(res);
    }
    getType(v) {
        let type = 'string';
        if (v === 'true' || v === 'false')
            type = 'boolean';
        else if (v === '[object Object]')
            type = 'object';
        else if (/^[+-]?[0-9]+([0-9]*)?$/.test(v))
            type = 'integer';
        else if (/^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?$/.test(v))
            type = 'float';
        else if (v) {
            const bc = v.charAt(0);
            if (bc === '{' || bc === '[')
                type = bc === '{' ? 'object' : 'array';
        }
        return type;
    }
    async setVariableRequest(res, args, _req) {
        await this.dbg.setVariable(res.request_seq, args.name, args.value);
        res.body = { value: args.value, };
        this.sendResponse(res);
    }
    continueRequest(res, _args) {
        this.dbg.continue();
        this.sendResponse(res);
    }
    reverseContinueRequest(res, _args) {
        this.dbg.continue(true);
        this.sendResponse(res);
    }
    nextRequest(res, _args) {
        this.dbg.step();
        this.sendResponse(res);
    }
    stepInRequest(res, _args, _req) {
        this.dbg.stepin();
        this.sendResponse(res);
    }
    stepOutRequest(res, _args, _req) {
        this.dbg.stepout();
        this.sendResponse(res);
    }
    stepBackRequest(res, _args) {
        this.dbg.step(true);
        this.sendResponse(res);
    }
    async evaluateRequest(res, args) {
        switch (args.context) {
            case 'hover':
                const v = this.getVar(args.expression);
                if (!v.exist) {
                    res.body = {
                        result: `変数 ${v.fullnm} はありません`,
                        variablesReference: 0,
                    };
                    break;
                }
                const hdlnm = this.hNm2HdlNm[v.fullnm ?? ''];
                res.body = {
                    result: `変数（${v.fullnm}）の値${hdlnm ? '' : `【${v.ret}】`}`,
                    presentationHint: {
                        kind: 'property', visibility: 'public',
                        attributes: v.const ? ['readOnly'] : undefined,
                    },
                    variablesReference: hdlnm ?? 0,
                };
                break;
            case 'watch':
                {
                    const v = await this.dbg.eval(res.request_seq, args.expression);
                    if (v)
                        res.body = {
                            result: v,
                            presentationHint: { kind: 'formula', visibility: 'public', },
                            variablesReference: 0,
                        };
                    else
                        res.body = { result: `【null】`, variablesReference: 0, };
                }
                break;
            case 'repl':
                {
                    const v = await this.dbg.eval(res.request_seq, args.expression);
                    res.body = {
                        result: v ? `=${v}` : `【null】`,
                        variablesReference: 0,
                    };
                }
                break;
        }
        this.sendResponse(res);
    }
    getVar(txt) {
        const a = `${txt}:`.split(':', 2);
        const scope = (a[1] === '') ? 'tmp' : a[0];
        const nm = (a[1] === '') ? a[0] : a[1];
        switch (scope) {
            case 'tmp':
            case 'sys':
            case 'save':
            case 'mp': break;
            default: return { exist: false };
        }
        const ro = nm.slice(0, 6) === 'const.';
        const h = this.hScope[scope];
        return (nm in h)
            ? { exist: true, fullnm: `${scope}:${nm}`, ret: h[nm], const: ro }
            : { exist: false, fullnm: `${scope}:${nm}` };
    }
    dataBreakpointInfoRequest(res, args) {
        if (args.variablesReference && args.name) {
            const v = this.getVar(args.name);
            if (v.exist)
                res.body = {
                    dataId: v.fullnm,
                    description: `変数値変更：${v.fullnm}`,
                    accessTypes: ['write'],
                    canPersist: true,
                };
        }
        else
            res.body = {
                dataId: null,
                description: 'cannot break on data access',
            };
        this.sendResponse(res);
    }
    async setDataBreakpointsRequest(res, args) {
        const a = [];
        res.body = { breakpoints: [] };
        args.breakpoints.forEach(dbp => {
            a.push(dbp);
            res.body.breakpoints.push({ verified: true, });
        });
        await this.dbg.setDataBreakpoint(res.request_seq, a);
        this.sendResponse(res);
    }
    completionsRequest(res, _args) {
        res.body = {
            targets: [
                {
                    label: 'item 10',
                    sortText: '10'
                },
                {
                    label: 'item 1',
                    sortText: '01'
                },
                {
                    label: 'item 2',
                    sortText: '02'
                },
                {
                    label: 'array[]',
                    selectionStart: 6,
                    sortText: '03'
                },
                {
                    label: 'func(arg)',
                    selectionStart: 5,
                    selectionLength: 3,
                    sortText: '04'
                }
            ]
        };
        this.sendResponse(res);
    }
    loadedSourcesRequest(res, args, req) {
        console.log(`fn:DebugAdapter.ts line:741 loadedSourcesRequest() res:${JSON.stringify(res)} args:${JSON.stringify(args)} req:${JSON.stringify(req)}`);
        res.body.sources = [
            {
                name: 'main.sn とか?',
                path: 'doc/prj/script/main.sn',
                sourceReference: 0,
            }
        ];
        this.sendResponse(res);
    }
    cancelRequest(_res, args) {
        if (args.requestId)
            this.mapCancelationTokens.set(args.requestId, true);
    }
    createSource(filePath) {
        return new vscode_debugadapter_1.Source(path_1.basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'mock-adapter-data');
    }
}
DebugAdapter.THREAD_ID = 1;
DebugAdapter.REG_SN_VAR = /^(?:const\.)?sn\./;
//# sourceMappingURL=DebugAdapter.js.map