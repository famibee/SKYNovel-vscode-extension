/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {
	debug, WorkspaceFolder, DebugConfiguration,
	DebugAdapterDescriptorFactory, DebugAdapterDescriptor,
	DebugSession, ProviderResult, ExtensionContext, DocumentFilter,
	DebugAdapterInlineImplementation,	// インライン型アダプタ
} from 'vscode';
import {
	Logger, logger,
	LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent,
//	ProgressStartEvent, ProgressUpdateEvent, ProgressEndEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from 'vscode-debugadapter';
import {DebugProtocol} from 'vscode-debugprotocol';
import {basename} from 'path';
import {Debugger, InfoBreakpoint} from './Debugger';
const {Subject} = require('await-notify');


export function initDebug(ctx: ExtensionContext, docsel: DocumentFilter): void {
	// デバッグ構成解決
	// .vscode/launch.json がない場合のデバッグ構成作成初期値
	const lng = docsel.language ?? '';
	debug.registerDebugConfigurationProvider(lng, {
		provideDebugConfigurations(_folder: WorkspaceFolder | undefined): ProviderResult<DebugConfiguration[]> {return [
			{
				name: "1.アプリを起動",
				type: "node",
				request: "launch",
			},
			{
				name: "2.アプリに接続",
				type: "skynovel",
				request: "attach",
			},

			{
				name: "2b.デバッガ",
				type: "skynovel",
				request: "launch",
			},
		];}
	});

	ctx.subscriptions.push(debug.registerDebugConfigurationProvider('node', {
		resolveDebugConfiguration(_folder: WorkspaceFolder | undefined, cfg: DebugConfiguration): ProviderResult<DebugConfiguration> {
			// デバッグセッション開始をインターセプト、launch.jsonの一つの{}を受け取る
			return {
				program: '${workspaceFolder}/doc/app.js',
				runtimeExecutable: '${workspaceFolder}/node_modules/.bin/electron',
				windows: {
					runtimeExecutable: '${workspaceFolder}/node_modules/.bin/electron.cmd'
				},
				console: 'integratedTerminal',
				autoAttachChildProcesses: true,
				skipFiles: [
					'<node_internals>/**/*.js'
				],
				...cfg,
				env: {SKYNOVEL_DBG: 'on', ...cfg.env,},
			};
		}
	}));
	ctx.subscriptions.push(debug.registerDebugConfigurationProvider(lng, {
		resolveDebugConfiguration(_folder: WorkspaceFolder | undefined, cfg: DebugConfiguration): ProviderResult<DebugConfiguration> {
			// デバッグセッション開始をインターセプト、launch.jsonの一つの{}を受け取る
			return {
				cwd: '${workspaceFolder}',
//				userDataDir: '${workspaceFolder}/.vscode/chrome',
				...cfg,
			};
		}
	}));


	// デバッグアダプタ工場（request は attach/launch どちらも）
	const dadf: DebugAdapterDescriptorFactory = {
		createDebugAdapterDescriptor(_ss: DebugSession): ProviderResult<DebugAdapterDescriptor> {
			return new DebugAdapterInlineImplementation(new DebugAdapter());
		},
	};

	ctx.subscriptions.push(debug.registerDebugAdapterDescriptorFactory(lng, dadf));
	if ('dispose' in dadf) ctx.subscriptions.push(dadf);
}


function timeout(ms: number) {return new Promise(re=> setTimeout(re, ms));}

class DebugAdapter extends LoggingDebugSession {
	// 複数のスレッドをサポートしないので、デフォルトのスレッドにハードコードされたID
	private static	readonly THREAD_ID = 1;

	private	readonly	dbg	= new Debugger();	// runtime (or debugger)

	// セッションごと【▶（デバッグの開始）や⟲（再起動ボタン）】に生成する
	constructor() {
		super('sn_debug.txt');

		this.setDebuggerLinesStartAt1(true);
		this.setDebuggerColumnsStartAt1(true);

		// setup event handlers
		this.dbg.on('stopOnEntry', ()=> {
			this.sendEvent(new StoppedEvent('entry', DebugAdapter.THREAD_ID));
		});
		this.dbg.on('stopOnStep', ()=> {		// F10
			this.sendEvent(new StoppedEvent('step', DebugAdapter.THREAD_ID));
		});
		this.dbg.on('stopOnBreakpoint', ()=> {
			this.sendEvent(new StoppedEvent('breakpoint', DebugAdapter.THREAD_ID));
		});
		this.dbg.on('stopOnDataBreakpoint', ()=> {
			this.sendEvent(new StoppedEvent('data breakpoint', DebugAdapter.THREAD_ID));
		});
		this.dbg.on('stopOnException', ()=> {
//console.log(`fn:DebugAdapter.ts line:100 dbg -> exception`);
			this.sendEvent(new StoppedEvent('exception', DebugAdapter.THREAD_ID));
		});
		this.dbg.on('breakpointValidated', (bp: InfoBreakpoint)=> {
			this.sendEvent(new BreakpointEvent('changed', <DebugProtocol.Breakpoint>{verified: bp.verified, id: bp.id}));
		});
		this.dbg.on('output', (text, filePath, line, column)=> {
//console.log(`fn:DebugAdapter.ts line:107 dbg -> output`);
			const e: DebugProtocol.OutputEvent = new OutputEvent(`${text}\n`);

			if (text === 'start' || text === 'startCollapsed' || text === 'end') {
				e.body.group = text;
				e.body.output = `group-${text}\n`;
			}

			e.body.source = this.createSource(filePath);
			e.body.line = this.convertDebuggerLineToClient(line);
			e.body.column = this.convertDebuggerColumnToClient(column);
			this.sendEvent(e);
		});
		this.dbg.on('end', ()=> this.sendEvent(new TerminatedEvent()));
	}

	// initialize ... デバッグアダプタが提供する機能を調べるためにフロントエンドから呼び出される最初のリクエスト
	protected initializeRequest(res: DebugProtocol.InitializeResponse, _args: DebugProtocol.InitializeRequestArguments): void {
		// https://microsoft.github.io/debug-adapter-protocol/overview
		// Specification https://microsoft.github.io/debug-adapter-protocol/specification#Types_InitializeRequestArguments
//console.log(`"res":${JSON.stringify(res)}, "args":${JSON.stringify(args, null, 2)}`);
/*{
	"args": {
		"clientID": "vscode",
		"clientName": "Visual Studio Code",
		"adapterID": "skynovel",
		"pathFormat": "path",
		"linesStartAt1": true,
		"columnsStartAt1": true,
		"supportsVariableType": true,
		"supportsVariablePaging": true,
		"supportsRunInTerminalRequest": true,
		"locale": "ja",
		"supportsProgressReporting": true
	}
}*/

//		if (args.supportsProgressReporting) this._reportProgress = true;

		// build and return the capabilities of this debug adapter:
		res.body = res.body ?? {};

		// the adapter implements the configurationDoneRequest.
		res.body.supportsConfigurationDoneRequest = true;

		// 関数ブレークポイント
		res.body.supportsFunctionBreakpoints = true;

		// 式評価ブレークポイントをサポート
		res.body.supportsConditionalBreakpoints = true;

		// ヒットカウントブレークポイントをサポート
		res.body.supportsHitConditionalBreakpoints = true;

		// ソースにカーソルを置いたときに VS コードが 'evaluate' を使うように
		res.body.supportsEvaluateForHovers = true;

	// Available filters or options for the setExceptionBreakpoints request.
//		res.body.exceptionBreakpointFilters?: ExceptionBreakpointsFilter[];

		// '戻る' ボタンを表示する
	// The debug adapter supports stepping back via the 'stepBack' and 'reverseContinue' requests.
		res.body.supportsStepBack = false;
//		res.body.supportsStepBack = true;

	// The debug adapter supports setting a variable to a value.
		res.body.supportsSetVariable = true;

	// The debug adapter supports restarting a frame.
//		res.body.supportsRestartFrame?: boolean;

	// The debug adapter supports the 'gotoTargets' request.
//		res.body.supportsGotoTargetsRequest?: boolean;

	// The debug adapter supports the 'stepInTargets' request.
//		res.body.supportsStepInTargetsRequest?: boolean;

		// REPLでの補完をサポートする
		res.body.supportsCompletionsRequest = true;

	// The set of characters that should trigger completion in a REPL. If not specified, the UI should assume the '.' character.
	// REPL で完了をトリガすべき文字のセット。指定されていない場合、UI は '.' 文字を想定する必要があります。
//		res.body.completionTriggerCharacters?: string[];
//		res.body.completionTriggerCharacters = ['.', '['];

	// The debug adapter supports the 'modules' request.
//		res.body.supportsModulesRequest?: boolean;

	// The set of additional module information exposed by the debug adapter.
//		res.body.additionalModuleColumns?: ColumnDescriptor[];

	// Checksum algorithms supported by the debug adapter.
//		res.body.supportedChecksumAlgorithms?: ChecksumAlgorithm[];

		// 再起動（falseなら停止→開始でエミュレート）
		res.body.supportsRestartRequest = true;

	// The debug adapter supports 'exceptionOptions' on the setExceptionBreakpoints request.
//		res.body.supportsExceptionOptions?: boolean;

	// The debug adapter supports a 'format' attribute on the stackTraceRequest, variablesRequest, and evaluateRequest.
//		res.body.supportsValueFormattingOptions?: boolean;

	// The debug adapter supports the 'exceptionInfo' request.
//		res.body.supportsExceptionInfoRequest?: boolean;

	// The debug adapter supports the 'terminateDebuggee' attribute on the 'disconnect' request.
//		res.body.supportTerminateDebuggee?: boolean;

	// The debug adapter supports the delayed loading of parts of the stack, which requires that both the 'startFrame' and 'levels' arguments and the 'totalFrames' result of the 'StackTrace' request are supported.
//		res.body.supportsDelayedStackTraceLoading?: boolean;

	// The debug adapter supports the 'loadedSources' request.
//		res.body.supportsLoadedSourcesRequest?: boolean;

	// ログポイント：ブレークせずに、コンソールにメッセージを記録
//		res.body.supportsLogPoints = true;

	// The debug adapter supports the 'terminateThreads' request.
//		res.body.supportsTerminateThreadsRequest?: boolean;

	// The debug adapter supports the 'setExpression' request.
//		res.body.supportsSetExpression?: boolean;

	// The debug adapter supports the 'terminate' request.
//		res.body.supportsTerminateRequest?: boolean;
		// res.body.supportsTerminateRequest = true;

		// データブレークポイントをサポート
		res.body.supportsDataBreakpoints = true;

	// The debug adapter supports the 'readMemory' request.
//		res.body.supportsReadMemoryRequest?: boolean;

	// The debug adapter supports the 'disassemble' request.
//		res.body.supportsDisassembleRequest?: boolean;

		// make VS Code to send cancelRequests
		// cancelRequestsを送信する
	// The debug adapter supports the 'cancel' request.
		res.body.supportsCancelRequest = false;
//		res.body.supportsCancelRequest = true;

		// breakpointLocationsリクエストを送信する
	// The debug adapter supports the 'breakpointLocations' request.
		res.body.supportsBreakpointLocationsRequest = false;
//		res.body.supportsBreakpointLocationsRequest = true;

	// The debug adapter supports the 'clipboard' context value in the 'evaluate' request.
//		res.body.supportsClipboardContext?: boolean;

	// The debug adapter supports stepping granularities (argument 'granularity') for the stepping requests.
//		res.body.supportsSteppingGranularity?: boolean;

	// The debug adapter supports adding breakpoints based on instruction references.
//		res.body.supportsInstructionBreakpoints?: boolean;

		this.sendResponse(res);

		this.sendEvent(new InitializedEvent());
	}

	// 停止ボタンなど
	//	ただしVSCode終了・フォルダを閉じるなどではコールされない場合あり
	//	子プロセスなどは終了してくれるらしい
	protected disconnectRequest(_res: DebugProtocol.DisconnectResponse, _args: DebugProtocol.DisconnectArguments, _req?: DebugProtocol.Request): void {this.dbg.end();}

	// コンフィギュレーションシーケンスの最後にコールされる
	// すべてのブレークポイントなどがDAに送信され、「起動」を開始できることを示す
	protected configurationDoneRequest(_res: DebugProtocol.ConfigurationDoneResponse, _args: DebugProtocol.ConfigurationDoneArguments): void {this.cfgDone.notify();}	// 設定が完了したことを VSCode に通知
	private	readonly	cfgDone = new Subject();	// 設定完了


//	protected sendErrorResponse(response: DebugProtocol.Response, codeOrMessage: number | DebugProtocol.Message, format?: string, variables?: any, dest?: ErrorDestination): void;

//	protected runInTerminalRequest(args: DebugProtocol.RunInTerminalRequestArguments, timeout: number, cb: (response: DebugProtocol.RunInTerminalResponse) => void): void;


	protected launchRequest(_res: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments) {
		logger.setup(Logger.LogLevel.Stop, false);
		this.dbg.launch(args as DebugConfiguration);
	}
	protected attachRequest(_res: DebugProtocol.AttachResponse, args: DebugProtocol.AttachRequestArguments): void {
		logger.setup(Logger.LogLevel.Stop, false);
		this.dbg.attach(args as DebugConfiguration);
	}

	/**
	 * 「終了」要求は、デバッグ対象が自分自身を終了する機会を与えるために、クライアントからデバッグアダプターに送信されます。
	 * クライアントは、機能 'supportsTerminateRequest'がtrueの場合にのみこのリクエストを呼び出す必要があります。
	 */
	// A value of true indicates that this 'terminate' request is part of a restart sequence.
	//	_args.restart		restart?: boolean;
/*	protected terminateRequest(res: DebugProtocol.TerminateResponse, args: DebugProtocol.TerminateArguments, req?: DebugProtocol.Request): void {
console.log(`fn:DebugAdapter.ts line:227 terminateRequest(res:${JSON.stringify(res)}) args:${JSON.stringify(args)} req:${JSON.stringify(req)}`);

	}
*/

	// （エミュレートではない）再起動
	protected async restartRequest(res: DebugProtocol.RestartResponse, _args: DebugProtocol.RestartArguments): Promise<void> {
		await this.dbg.restart(res.request_seq);
//		res.body = {};
		this.sendResponse(res);	// この変更はウォッチ式にも反映される
	}

	protected setBreakPointsRequest(res: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		// スクリプト別に呼ばれる。後の追加・削除でもそのスクリプトだけ呼ばれる
//console.log(`fn:DebugAdapter.ts setBreakPointsRequest() "res":${JSON.stringify(res)}, "args":${JSON.stringify(args, null, 2)}`);
/*{
	"args":{
		"source": {
			"name": "main.sn",
			"path": "/Users/==/==/doc/prj/script/main.sn"	// 絶対パス
		},
		"lines": [50, 53],	// ブレイクポイント行番号（表示と同じ）
		"breakpoints": [
			{"line": 50, "condition": "a>2"},
			{"line": 53,}
		],
		"sourceModified": false		// trueは、基礎となるソースが変更され、新しいブレークポイントの位置が変更されたことを示します。
	}
}*/
		const path = args.source.path!;
		this.dbg.clearBreakpoints(path);

		res.body = {breakpoints: (args.breakpoints ?? []).map(o=> {
			const {verified, ln, id} = this.dbg.setBreakPoint(path, this.convertClientLineToDebugger(o.line), o);
			const bp = <DebugProtocol.Breakpoint> new Breakpoint(verified, this.convertDebuggerLineToClient(ln));
			bp.id = id;
			return bp;
		})};
		this.sendResponse(res);
	}

	// 関数ブレークポイント
	protected async setFunctionBreakPointsRequest(res: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments, _req?: DebugProtocol.Request): Promise<void> {
		const a: any[] = [];
		res.body = {breakpoints: []};
		args.breakpoints.forEach(dbp=> {
			if ((dbp as any).enabled) a.push({name: dbp.name});

			res.body.breakpoints.push({verified: Boolean(dbp.name),});
		});
		await this.dbg.setFuncBreakpoint(res.request_seq, a);

		this.sendResponse(res);
	}

//	protected setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments, request?: DebugProtocol.Request): void {}


//	protected restartFrameRequest(response: DebugProtocol.RestartFrameResponse, args: DebugProtocol.RestartFrameArguments, request?: DebugProtocol.Request): void {}
//	protected gotoRequest(response: DebugProtocol.GotoResponse, args: DebugProtocol.GotoArguments, request?: DebugProtocol.Request): void {}
	protected pauseRequest(_res: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments): void {
console.log(`fn:DebugAdapter.ts line:288 pauseRequest args:${JSON.stringify(args)}`);
	}
/*
	protected sourceRequest(res: DebugProtocol.SourceResponse, _args: DebugProtocol.SourceArguments, req?: DebugProtocol.Request): void {
console.log(`fn:DebugAdapter.ts line:271 loadedSourcesRequest() res:${JSON.stringify(res)} _args:${JSON.stringify(_args)} req:${JSON.stringify(req)}`);
	}
*/

	protected threadsRequest(res: DebugProtocol.ThreadsResponse): void {
		// ランタイムはスレッドをサポートしていないので、デフォルトのスレッドを返すだけ
		res.body = {threads: [new Thread(DebugAdapter.THREAD_ID, 'thread 1')]};
		this.sendResponse(res);
	}
//	protected terminateThreadsRequest(response: DebugProtocol.TerminateThreadsResponse, args: DebugProtocol.TerminateThreadsArguments, request?: DebugProtocol.Request): void;


	// スタックトレースビュー
	protected async stackTraceRequest(res: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): Promise<void> {
		const start = typeof args.startFrame === 'number' ?args.startFrame :0;
		const maxLevels = typeof args.levels === 'number' ?args.levels :1000;
		const end = start + maxLevels;
		const stk = await this.dbg.stack(res.request_seq, start, end);
		res.body = {	// これによりVSCodeは現在地を知る
			stackFrames: stk.map((f: any, i)=> new StackFrame(
				i,
				f.nm,
				this.createSource(f.fn),
				this.convertDebuggerLineToClient(f.ln),
				this.convertDebuggerColumnToClient(f.col),
			)),
			totalFrames: stk.length,
		};
		this.sendResponse(res);
	}


	// 変数ビュー
	private	readonly	hdlsVar = new Handles<string>();
	private	readonly	hNm2HdlNm: {[nm: string]: number}	= {};
	protected scopesRequest(res: DebugProtocol.ScopesResponse, _args: DebugProtocol.ScopesArguments): void {
		// fn:DebugAdapter.ts line:88 dbg -> stopOnStep のたびに呼ばれる
		this.hScope = {
			'tmp'	: {},
			'sys'	: {},
			'save'	: {},
			'mp'	: {},
		};
		res.body = {
			scopes: [
				new Scope('雑用変数 tmp:', this.hdlsVar.create('tmp'), false),
				new Scope('雑用変数 tmp:（SKYNovel組み込み）', this.hdlsVar.create('tmp:sn'), false),
				new Scope('マクロ変数 mp:', this.hdlsVar.create('mp'), false),
				new Scope('システム変数 sys:', this.hdlsVar.create('sys'), false),
				new Scope('システム変数 sys:（SKYNovel組み込み）', this.hdlsVar.create('sys:sn'), false),
				new Scope('セーブ変数 save:', this.hdlsVar.create('save'), false),
				new Scope('セーブ変数 save:（SKYNovel組み込み）', this.hdlsVar.create('save:sn'), false),
			]
		};
		this.sendResponse(res);
	}
	private	readonly	mapCancelationTokens = new Map<number, boolean>();
	private	readonly	mapIsLongrunning	= new Map<number, boolean>();
	private	static	readonly	REG_SN_VAR	= /^(?:const\.)?sn\./;
	private	hScope	: {[scope: string]: {[nm: string]: any}}	= {
		'tmp'	: {},
		'sys'	: {},
		'save'	: {},
		'mp'	: {},
	};
	protected async variablesRequest(res: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request): Promise<void> {
		const aVar: DebugProtocol.Variable[] = [];
//console.log(`fn:DebugAdapter.ts line:325 variablesRequest(res=${JSON.stringify(res, null, 2)}= args=${JSON.stringify(args, null, 2)}= request:${JSON.stringify(request, null, 2)})`);
		if (this.mapIsLongrunning.get(args.variablesReference)) {
			// long running
console.log(`fn:DebugAdapter.ts line:329 `);
			if (request) this.mapCancelationTokens.set(request.seq, false);

			for (let i = 0; i < 100; i++) {
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

			if (request) this.mapCancelationTokens.delete(request.seq);
		}
		else {
			let id = this.hdlsVar.get(args.variablesReference);
			// 一度の stopOnStep 中には同じ ID が二度と呼ばれない。VSCodeがキャッシュか
			if (id) {
				let tst_sn = true;
				if (id.slice(-3) === ':sn') {
					tst_sn = false;
					id = id.slice(0, -3);
				}

				let h: {[nm: string]: any} = {};
				if (id in this.hScope) {
					this.hScope[id] = h
					= await this.dbg.var(res.request_seq, id);
				}
				else {	// 構造化された変数（子要素）
					const a = `${id}:`.split(':', 2);
					const h2 = this.hScope[a[0]];
					if (h2) {
						const v2 = h2[a[1]];
						if (v2) h = JSON.parse(String(v2));
					}
				}
				for (const key in h) {
					if (DebugAdapter.REG_SN_VAR.test(key) === tst_sn) continue;

					const v = String(h[key]);
					const o: DebugProtocol.Variable = {
						name: key,
						type: this.getType(v),
						value: v as any,
						presentationHint: {
							kind: 'property',
							visibility: 'public',
						},
						variablesReference: 0,	// > 0の場合、変数は構造化されている
					};
					if (key.slice(0, 6) === 'const.') o.presentationHint!.attributes = ['readOnly'];
					if (v === '[object Object]') o.value = JSON.stringify(h[key]);
					else if (o.type === 'object' || o.type === 'array')
					this.hNm2HdlNm[`${id}:${key}`] = o.variablesReference
					= this.hdlsVar.create(`${id}:${key}`);

					aVar.push(o);
				}
/*
				// cancelation support for long running requests
				const nm = id + '_long_running';
				const ref = this.hdlsVar.create(id + '_lr');
				aVar.push({
					name: nm,
					type: 'object',
					value: 'Object',
					variablesReference: ref
				});
				this.mapIsLongrunning.set(ref, true);
*/
	/** Optional evaluatable name of this variable which can be passed to the 'EvaluateRequest' to fetch the variable's value. */
	// 変数の値を取得するために'EvaluateRequest'に渡すことができる、この変数の評価可能な名前。
//	evaluateName?: string;

	/** The number of named child variables.
		The client can use this optional information to present the children in a paged UI and fetch them in chunks.
	*/
	// 名前付き子変数の数。
	//	クライアントはこのオプションの情報を使用して、ページ化された UI で子を表示したり、チャンクで取得したりすることができます。
//	namedVariables?: number;

	/** The number of indexed child variables.
		The client can use this optional information to present the children in a paged UI and fetch them in chunks.
	*/
	// インデックス化された子変数の数。
	//	クライアントはこのオプションの情報を使用して、ページ化された UI で子変数を表示したり、チャンクで取得したりすることができます。
//	indexedVariables?: number;

	/** Optional memory reference for the variable if the variable represents executable code, such as a function pointer.
		This attribute is only required if the client has passed the value true for the 'supportsMemoryReferences' capability of the 'initialize' request.
	*/
	// 変数が関数ポインタのような実行可能なコードを表す場合、変数のためのオプションのメモリ参照。
	//	この属性は、クライアントが 'initialize' リクエストの 'supportsMemoryReferences' 能力に対して値 true を渡した場合にのみ必要となります。
//	memoryReference?: string;

			}
		}

		res.body = {variables: aVar.sort((a, b)=> {
			if (a.name < b.name) return -1;
			if (a.name > b.name) return 1;
			return 0;
		})};
		this.sendResponse(res);
	}
	private	getType(v: string): string {
		let type = 'string';
		if (v === 'true' || v === 'false') type = 'boolean';
		else if (v === '[object Object]') type = 'object';
		else if (/^[+-]?[0-9]+([0-9]*)?$/.test(v)) type = 'integer';
		else if (/^[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?$/.test(v)) type = 'float';
		else if (v) {
			const bc = v.charAt(0);
			if (bc === '{' || bc === '[') type = bc === '{' ?'object' :'array';
		}
		return type;
	}

	protected async setVariableRequest(res: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments, _req?: DebugProtocol.Request): Promise<void> {
		await this.dbg.setVariable(res.request_seq, args.name, args.value);
		res.body = {value: args.value,};
		this.sendResponse(res);	// この変更はウォッチ式にも反映される
	}

//	protected setExpressionRequest(response: DebugProtocol.SetExpressionResponse, args: DebugProtocol.SetExpressionArguments, request?: DebugProtocol.Request): void;

	// 続行
	protected continueRequest(res: DebugProtocol.ContinueResponse, _args: DebugProtocol.ContinueArguments): void {
		this.dbg.continue();
		this.sendResponse(res);
	}
	// 戻る
	protected reverseContinueRequest(res: DebugProtocol.ReverseContinueResponse, _args: DebugProtocol.ReverseContinueArguments) : void {
		this.dbg.continue(true);
		this.sendResponse(res);
	}
	// ステップオーバー
	protected nextRequest(res: DebugProtocol.NextResponse, _args: DebugProtocol.NextArguments): void {
		this.dbg.step();
		this.sendResponse(res);
	}
	// ステップイン
	stepInRequest(res: DebugProtocol.StepInResponse, _args: DebugProtocol.StepInArguments, _req?: DebugProtocol.Request): void {
		this.dbg.stepin();
		this.sendResponse(res);
	}
	// ステップアウト
	stepOutRequest(res: DebugProtocol.StepOutResponse, _args: DebugProtocol.StepOutArguments, _req?: DebugProtocol.Request): void {
		this.dbg.stepout();
		this.sendResponse(res);
	}
	// ステップバック
	protected stepBackRequest(res: DebugProtocol.StepBackResponse, _args: DebugProtocol.StepBackArguments): void {
		this.dbg.step(true);
		this.sendResponse(res);
	}

	protected async evaluateRequest(res: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): Promise<void> {
		switch (args.context) {
			case 'hover':
				// 変数の値を表示
				const v = this.getVar(args.expression);	// 評価する式
				if (! v.exist) {
					res.body = {
						result: `変数 ${v.fullnm} はありません`,
						variablesReference: 0,
					};
					break;
				}

				const hdlnm = this.hNm2HdlNm[v.fullnm ?? ''];
				res.body = {
					result: `変数（${v.fullnm}）の値${
						hdlnm ?'' :`【${ v.ret }】`
					}`,
					presentationHint: {
						kind: 'property', visibility: 'public',
						attributes: v.const ?['readOnly'] :undefined,
					},
					variablesReference: hdlnm ?? 0,	// > 0の場合、評価結果は構造化
				};
				break;

			case 'watch':{
				const v = await this.dbg.eval(res.request_seq, args.expression);
				if (v) res.body = {
					result: v,
					presentationHint: {kind: 'formula', visibility: 'public',},
					variablesReference: 0,
				};
				else res.body = {result: `【null】`, variablesReference: 0,};
			}	break;

			case 'repl':{
				const v = await this.dbg.eval(res.request_seq, args.expression);
				res.body = {
					result: v ?`=${v}` :`【null】`,
					variablesReference: 0,
			};
//console.log(`fn:DebugAdapter.ts line:622 exp:${args.expression} v:${v} type:${res.body.type}`);
			}	break;
/*
				let reply: string | undefined = undefined;
				// 'evaluate' は 'repl' からのブレークポイントの作成と削除をサポート
				const matches = /new +([0-9]+)/.exec(args.expression);
				if (matches && matches.length === 2) {
					const mbp = this.dbg.setBreakPoint(this.dbg.scriptFn, this.convertClientLineToDebugger(parseInt(matches[1])));
					const bp = <DebugProtocol.Breakpoint> new Breakpoint(mbp.verified, this.convertDebuggerLineToClient(mbp.ln), undefined, this.createSource(this.dbg.scriptFn));
					bp.id = mbp.id;
					this.sendEvent(new BreakpointEvent('new', bp));
					reply = 'breakpoint created';
				}
				else {
					const matches = /del +([0-9]+)/.exec(args.expression);
					if (matches && matches.length === 2) {
						const mbp = this.dbg.delBreakPoint(this.dbg.scriptFn, this.convertClientLineToDebugger(parseInt(matches[1])));
						if (mbp) {
							const bp = <DebugProtocol.Breakpoint> new Breakpoint(false);
							bp.id = mbp.id;
							this.sendEvent(new BreakpointEvent('removed', bp));
							reply = 'breakpoint deleted';
						}
					}
					else {
						const matches = /progress/.exec(args.expression);
						if (matches && matches.length === 1) {
							if (this._reportProgress) {
								reply = 'progress started';
								this.progressSequence();
							} else {
								reply = `frontend doesn't support progress (capability 'supportsProgressReporting' not set)`;
							}
						}
					}
				}
				res.body = {
					result: reply ?reply :`evaluate(context: '${args.context}', '${args.expression}')`,
					variablesReference: 0,
				};
*/
		/**
		 * 'clipboard': evaluate is run to generate the value that will be stored in the clipboard.
		 * The attribute is only honored by a debug adapter if the capability 'supportsClipboardContext' is true.
		 * etc.
			* 'clipboard'：クリップボードに格納される値を生成するために評価が実行されます。
			*この属性は、機能 'supportsClipboardContext'がtrueの場合にのみ、デバッグアダプターで使用されます。
			*など
		 */
		}

		this.sendResponse(res);
	}
	private getVar(txt: string): {exist: boolean, ret?: any, fullnm?: string, const?: boolean,} {
		const a = `${txt}:`.split(':', 2);
		const scope = (a[1] === '') ?'tmp' :a[0];
		const nm = (a[1] === '') ?a[0] :a[1];
		switch (scope) {
			case 'tmp':
			case 'sys':
			case 'save':
			case 'mp':	break;
			default: return {exist: false};
		}

		const ro = nm.slice(0, 6) === 'const.';
		const h = this.hScope[scope];
		return (nm in h)
			? {exist: true, fullnm: `${scope}:${nm}`, ret: h[nm], const: ro}
			: {exist: false,fullnm: `${scope}:${nm}`};
	}

//	protected stepInTargetsRequest(response: DebugProtocol.StepInTargetsResponse, args: DebugProtocol.StepInTargetsArguments, request?: DebugProtocol.Request): void;
//	protected gotoTargetsRequest(response: DebugProtocol.GotoTargetsResponse, args: DebugProtocol.GotoTargetsArguments, request?: DebugProtocol.Request): void;

/*
	private	isProgressCancellable	= true;
	private async progressSequence() {
		const ID = '' + this._progressId++;

		await timeout(100);

		const title = this.isProgressCancellable ? 'Cancellable operation' : 'Long running operation';
		const startEvent: DebugProtocol.ProgressStartEvent = new ProgressStartEvent(ID, title);
		startEvent.body.cancellable = this.isProgressCancellable;
		this.isProgressCancellable = !this.isProgressCancellable;
		this.sendEvent(startEvent);
		this.sendEvent(new OutputEvent(`start progress: ${ID}\n`));

		let endMessage = 'progress ended';
		for (let i = 0; i < 100; ++i) {
			await timeout(500);
			this.sendEvent(new ProgressUpdateEvent(ID, `progress: ${i}`));
			if (this._cancelledProgressId === ID) {
				endMessage = 'progress cancelled';
				this._cancelledProgressId = undefined;
				this.sendEvent(new OutputEvent(`cancel progress: ${ID}\n`));
				break;
			}
		}
		this.sendEvent(new ProgressEndEvent(ID, endMessage));
		this.sendEvent(new OutputEvent(`end progress: ${ID}\n`));

		this._cancelledProgressId = undefined;
	}
*/

	protected breakpointLocationsRequest(res: DebugProtocol.BreakpointLocationsResponse, args: DebugProtocol.BreakpointLocationsArguments, _request?: DebugProtocol.Request): void {
console.log(`fn:DebugAdapter.ts line:644 breakpointLocationsRequest() args.source.path:${args.source.path}`);
		if (args.source.path) {
			const bps = this.dbg.getBreakpoints(args.source.path, this.convertClientLineToDebugger(args.line));
			res.body = {
				breakpoints: bps.map(col=> {return {
					line: args.line,
					column: this.convertDebuggerColumnToClient(col)
				}})
			};
		}
		else res.body = {breakpoints: []};
		this.sendResponse(res);
	}

	// （変数を右クリックで）データブレークポイント設定ＵＩ
	protected dataBreakpointInfoRequest(res: DebugProtocol.DataBreakpointInfoResponse, args: DebugProtocol.DataBreakpointInfoArguments): void {
//console.log(`fn:DebugAdapter.ts line:659 dataBreakpointInfoRequest() res:${JSON.stringify(res)} args:${JSON.stringify(args, null, 2)}`);
		if (args.variablesReference && args.name) {
			const v = this.getVar(args.name);
			if (v.exist) res.body = {
				dataId: v.fullnm!,
				description: `変数値変更：${v.fullnm}`,
				accessTypes: ['write'],	// 'read'|'write'|'readWrite';
				canPersist: true,	// 潜在的なデータブレークポイントをセッション間保持
			};
		}
		else res.body = {
			dataId: null,
			description: 'cannot break on data access',
		};

		this.sendResponse(res);
	}

	// データブレークポイントをデバッガーへ
	protected async setDataBreakpointsRequest(res: DebugProtocol.SetDataBreakpointsResponse, args: DebugProtocol.SetDataBreakpointsArguments): Promise<void> {
//console.log(`fn:DebugAdapter.ts line:681 setDataBreakpointsRequest() res:${JSON.stringify(res)} args:${JSON.stringify(args, null, 2)}`);
/* res:{"seq":0,"type":"response","request_seq":26,"command":"setDataBreakpoints","success":true}
args:{
	"breakpoints": [
		{
			"enabled": true,
			"id": "81635417-3c8c-4d1b-906b-c929a6f0e38c",
			"sessionData": {},
			"description": "変数値変更：tmp:a",
			"dataId": "tmp:a",
			"canPersist": true,
			"accessTypes": ["readWrite"],
			"data": {
				"supportsConditionalBreakpoints": true,
				"supportsHitConditionalBreakpoints": true,
				"supportsLogPoints": false,
				"supportsFunctionBreakpoints": false,
				"supportsDataBreakpoints": true,
				"verified": true,
				"sessionId": "a2cb5f19-544a-4cd1-a1c6-69beb8fd4a4a"
			}
		},
		{
			"enabled": true,
			"id": "788f486d-5cf8-4aea-8071-c4b505516291",
			"sessionData": {},
			"description": "変数値変更：tmp:h",
			"dataId": "tmp:h",
			"canPersist": true,
			"accessTypes": ["readWrite"]
		}
	]
}*/
		const a: any[] = [];
		res.body = {breakpoints: []};
		args.breakpoints.forEach(dbp=> {
			if ((dbp as any).enabled) a.push({dataId: dbp.dataId});

			res.body.breakpoints.push({verified: Boolean(dbp.dataId),});
		});
		await this.dbg.setDataBreakpoint(res.request_seq, a);

		this.sendResponse(res);
	}

	protected completionsRequest(res: DebugProtocol.CompletionsResponse, _args: DebugProtocol.CompletionsArguments): void {
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

//	protected exceptionInfoRequest(response: DebugProtocol.ExceptionInfoResponse, args: DebugProtocol.ExceptionInfoArguments, request?: DebugProtocol.Request): void;
/*
	protected loadedSourcesRequest(res: DebugProtocol.LoadedSourcesResponse, _args: DebugProtocol.LoadedSourcesArguments, req?: DebugProtocol.Request): void {
console.log(`fn:DebugAdapter.ts line:741 loadedSourcesRequest() res:${JSON.stringify(res)} _args:${JSON.stringify(_args)} req:${JSON.stringify(req)}`);
	}
*/
//	protected readMemoryRequest(response: DebugProtocol.ReadMemoryResponse, args: DebugProtocol.ReadMemoryArguments, request?: DebugProtocol.Request): void;
//	protected disassembleRequest(response: DebugProtocol.DisassembleResponse, args: DebugProtocol.DisassembleArguments, request?: DebugProtocol.Request): void;


	protected cancelRequest(_res: DebugProtocol.CancelResponse, args: DebugProtocol.CancelArguments) {
		if (args.requestId) this.mapCancelationTokens.set(args.requestId, true);
//		if (args.progressId) this._cancelledProgressId= args.progressId;
	}

/*
	// Override this hook to implement custom requests.

	protected customRequest(command: string, response: DebugProtocol.Response, args: any, request?: DebugProtocol.Request): void;
	protected convertClientLineToDebugger(line: number): number;
	protected convertDebuggerLineToClient(line: number): number;
	protected convertClientColumnToDebugger(column: number): number;
	protected convertDebuggerColumnToClient(column: number): number;
	protected convertClientPathToDebugger(clientPath: string): string;
	protected convertDebuggerPathToClient(debuggerPath: string): string;
*/


	//---- helpers

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'mock-adapter-data');
	}
}
