/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {getFn, IFn2Path, docsel} from './CmnLib';
import {ScriptScanner, TINF_FONT2STR} from './ScriptScanner';
import {MD_PARAM_DETAILS, MD_STRUCT} from './md2json';
import {
	QuickPickItem,		// クイックピック
	HoverProvider,		// 識別子の上にマウスカーソルを載せたとき
	DefinitionProvider,	// 「定義へ移動」「定義をここに表示」
	ReferenceProvider,	// 「参照へ移動」「参照をここに表示」
	ReferenceContext,
	RenameProvider,		// 「シンボルの名前変更」
	CompletionItemProvider,	// コード補完機能
	DiagnosticCollection, ExtensionContext, commands, workspace, window, Uri, languages, Location, Position, Range, Hover, TextDocument, CancellationToken, WorkspaceEdit, ProviderResult, Definition, DefinitionLink, CompletionContext, CompletionItem, CompletionList, CompletionItemKind, MarkdownString, SnippetString,
	SignatureHelpProvider,	// 引数の説明
	SignatureHelpContext, SignatureHelp, SignatureInformation, ParameterInformation,
	DocumentSymbolProvider,	// アウトライン
	SymbolInformation, DocumentSymbol,
	EvaluatableExpression,	// デバッグホバー
	TextDocumentChangeEvent,
} from 'vscode';

const hMd: {[tag_nm: string]: MD_STRUCT} = require('./md.json');


export class CodingSupporter implements
	HoverProvider,			// 識別子の上にマウスカーソルを載せたとき
	DefinitionProvider,		// 「定義へ移動」「定義をここに表示」
	ReferenceProvider,		// 「参照へ移動」「参照をここに表示」
	RenameProvider,			// 「シンボルの名前変更」
	CompletionItemProvider,	// コード補完機能
	SignatureHelpProvider,	// 引数の説明
	DocumentSymbolProvider	// アウトライン
	{
			readonly	#lenRootPath	: number;

	static	readonly	#pickItems	: QuickPickItem[] = [];
	static				#hTag		: {[tag_nm: string]: boolean}	= {};
	static				#hSnippet	: {[tag_nm: string]: string}	= {};

			readonly	#clDiag		: DiagnosticCollection;

			readonly	#scrScn		: ScriptScanner;
			readonly	#hArgDesc	: {[name: string]: {
		label	: string;
		doc		: string;
	}}	= {};

	static	readonly #CMD_SCANSCR_TRGPARAMHINTS = 'extension.skynovel.scanScr_trgParamHints';
	constructor(ctx: ExtensionContext, readonly pathWs: string, curPrj: string, cmd: (nm: string, val: string)=> Promise<boolean>) {
		this.#lenRootPath = pathWs.length +1;
		CodingSupporter.initClass(ctx);
		CodingSupporter.#pickItems.forEach(q=> this.#hArgDesc[q.label] = {
			label	: `[${q.label} ...]`,
			doc		: q.description ?? 'タグの説明',
		});

		// コード補完機能から「スクリプト再捜査」「引数の説明」を呼ぶ、内部コマンド
		commands.registerCommand(CodingSupporter.#CMD_SCANSCR_TRGPARAMHINTS, ()=> commands.executeCommand('editor.action.triggerParameterHints'));

		// コード補完機能
		this.#aCITagMacro = [];
		const cmdScanScr_trgPrm = {title: '「スクリプト再捜査」「引数の説明」', command: CodingSupporter.#CMD_SCANSCR_TRGPARAMHINTS};
		for (const tag_nm in hMd) {
			const md = hMd[tag_nm];
			const docu: string | MarkdownString = md.comment
				? new MarkdownString(
`$(book)[タグリファレンス](https://famibee.github.io/SKYNovel/tag.htm#${tag_nm
})

---
${md.comment}`, true)
				:'';
		//	-	ci.documentation.isTrusted = true;

		//	-	ci.additionalTextEdits? = TextEdit[]
				// 実行するTextEdit処理を複数指定
		//	-	ci.command? = Command
		//	-	ci.commitCharacters? = string[]
			// 以下は未検討
		//	ci.filterText? = string
		//	ci.keepWhitespace? = boolean
		//	ci.preselect? = boolean
		//	ci.range? = Range | {inserting: Range, replacing: Range}
		//	ci.sortText? = string
		//	ci.tags? = ReadonlyArray<CompletionItemTag>
		//	ci.textEdit? = TextEdit

			md.snippet.forEach(v=> {
				const ci2 = new CompletionItem(v.nm,CompletionItemKind.Snippet);
				ci2.detail = md.detail;
				ci2.command = cmdScanScr_trgPrm;
				ci2.documentation = docu;
				this.#aCITagMacro.push(ci2);	// 最低ひとつはある
			});
		}

		this.#loadCfg();
		ctx.subscriptions.push(workspace.onDidChangeConfiguration(()=> this.#loadCfg()));

		// 識別子の上にマウスカーソルを載せたとき
		ctx.subscriptions.push(languages.registerHoverProvider(docsel, this));
		// 「定義へ移動」「定義をここに表示」
		ctx.subscriptions.push(languages.registerDefinitionProvider(docsel, this));
		// 「参照へ移動」「参照をここに表示」
		ctx.subscriptions.push(languages.registerReferenceProvider(docsel, this));
		// 「シンボルの名前変更」
		ctx.subscriptions.push(languages.registerRenameProvider(docsel, this));
		// 診断機能
		this.#clDiag = languages.createDiagnosticCollection(docsel.language);
		ctx.subscriptions.push(this.#clDiag);
		// コード補完機能
		ctx.subscriptions.push(languages.registerCompletionItemProvider(docsel, this, '[', ' ', '='));
		// 引数の説明
		ctx.subscriptions.push(languages.registerSignatureHelpProvider(docsel, this, ' '));
		// アウトライン
		ctx.subscriptions.push(languages.registerDocumentSymbolProvider(docsel, this));

		// デバッグ中のみ有効なホバー
		languages.registerEvaluatableExpressionProvider(docsel, {
			provideEvaluatableExpression(doc: TextDocument, pos: Position): ProviderResult<EvaluatableExpression> {
				const r = doc.getWordRangeAtPosition(pos, CodingSupporter.#REG_VAR);
				if (! r) return Promise.reject('No word here.');

				const txt = doc.getText(r);
				const hc = txt.charAt(0);
				if (hc === '[' || hc === '*' || hc === ';'
				|| txt.slice(-1)=== '=') return Promise.reject('No word here.');
				return new EvaluatableExpression(r, txt);
			}
		});


		// TODO: ラベルジャンプ
		//	https://code.visualstudio.com/api/language-extensions/programmatic-language-features
		// languages.registerHoverProvider
		// languages.registerDocumentLinkProvider

		// コードアクション（電球マーク）
		// languages.registerCodeActionsProvider

		// テキストエディタ変化イベント
		workspace.onDidChangeTextDocument(e=> {
			const doc = e.document;
			if (e.contentChanges.length === 0
			||	doc.languageId !== 'skynovel'
			||	doc.fileName.slice(0, this.#lenRootPath -1) !== pathWs) return;

			if (this.#scrScn.isSkipUpd(doc.fileName)) return;

			this.#aChgTxt.push(e);
			if (this.#tid) return;
			this.#tid = setTimeout(()=> {
				this.#tid = undefined; this.#delayedUpdate();
			}, 1000 /60 *10);
		}, null, ctx.subscriptions);

		this.#scrScn = new ScriptScanner(pathWs, curPrj, this.#clDiag, CodingSupporter.#hTag, cmd);
	}
	// https://regex101.com/r/G77XB6/3 20 match, 188 step(~1ms)
	static	readonly	#REG_VAR	= /;.+|[\[*]?[\d\w\.]+=?/;

	goAll() {this.#scrScn.goAll();}
	getInfFont2Str(): TINF_FONT2STR {return this.#scrScn.getInfFont2Str();}

	// テキストエディタ変化イベント・遅延で遊びを作る
	#tid	:  NodeJS.Timer | undefined	= undefined;
	#aChgTxt		: TextDocumentChangeEvent[]		= [];
	#hRsvNm2Then	: {[rsv_nm: string]: ()=> void}	= {};
	#delayedUpdate() {
		const a = this.#aChgTxt;	// Atomicにするため
		this.#aChgTxt = [];
		this.#scrScn.chgTxtDoc(a);

		// アウトライン
		for (const rsv_nm in this.#hRsvNm2Then) this.#hRsvNm2Then[rsv_nm]();
		this.#hRsvNm2Then = {};
	}


	private	static	initClass(ctx: ExtensionContext) {
		CodingSupporter.initClass = ()=> {};

		for (const tag_nm in hMd) {
			const md = hMd[tag_nm];
			CodingSupporter.#pickItems.push({
				label: tag_nm,
				description: md.detail
			});
			CodingSupporter.#hTag[tag_nm] = true;
			md.snippet.forEach(sn=> CodingSupporter.#hSnippet[sn.nm] = sn.txt);
		}

		ctx.subscriptions.push(commands.registerCommand(
			'skynovel.openReferencePallet', ()=>
			window.showQuickPick<QuickPickItem>(CodingSupporter.#pickItems, {
				'placeHolder': 'Which reference will you open?',
				'matchOnDescription': true,
			}).then(q=> {if (q) CodingSupporter.#openTagRef(q)}
		)));
	}

	// クイックピック
	static #openTagRef(v: QuickPickItem) {
		commands.executeCommand('open', Uri.parse('https://famibee.github.io/SKYNovel/tag.htm#'+ v.label));
	}

	// 識別子の上にマウスカーソルを載せたとき
	static	readonly #regTagName	= /[^\s\[\]="'#;]+/;
	provideHover(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Hover> {
		const r = doc.getWordRangeAtPosition(pos, CodingSupporter.#regTagName);
		if (! r) return Promise.reject('No word here.');

		// 「定義へ移動」があるので、下手にリンクを張らない方がいい
		const nm = doc.getText(doc.getWordRangeAtPosition(pos));
		const m = this.#scrScn.hMacro[nm];
		if (m) {
			const fn = m.loc.uri.fsPath;
			return new Hover(new MarkdownString(
`~~~skynovel
(マクロ) [${nm}]
~~~
定義ファイル：${fn.slice(this.#lenRootPath)}`
			));
		}
//		if (loc) return new Hover(`[${nm}] マクロです 定義ファイル：${loc.uri.fsPath.slice(this.lenRootPath)}`);

		const locPlg = this.#scrScn.hPlugin[nm];
		if (locPlg) {
			const fn = locPlg.uri.fsPath;
			return new Hover(new MarkdownString(
`~~~skynovel
(プラグイン定義タグ) [${nm}]
~~~
---
定義ファイル：${fn.slice(this.#lenRootPath)}`
			));
		}

		let label = `[${nm}`;
		const md = hMd[nm];
		if (! md) return Promise.reject('Nothing md file.');	// 前に警告出してる
		(md.param as MD_PARAM_DETAILS[]).forEach(prm=> label += ` ${prm.name}=${
			prm.default ?`%${prm.name}|${prm.default}` :'【必須】'
		}`);
		return new Hover(new MarkdownString(
`~~~skynovel
(タグ) ${label}]
~~~
---
${md.detail}`
		));
	}

	// 「定義へ移動」「定義をここに表示」
	provideDefinition(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Definition | DefinitionLink[]> {
		const r = doc.getWordRangeAtPosition(pos, CodingSupporter.#regTagName);
		if (! r) return Promise.reject('No word here.');

		return new Promise((re, rj)=> {
			const nm = doc.getText(doc.getWordRangeAtPosition(pos));
			const loc = this.#scrScn.hMacro[nm]?.loc ?? this.#scrScn.hPlugin[nm];
			if (loc) return re(loc);
			const q = CodingSupporter.#pickItems.find(q=> q.label === nm);
			if (q) {CodingSupporter.#openTagRef(q); return re(null);}

			return rj('No definition found');
		});
	}

	// 「参照へ移動」「参照をここに表示」
	provideReferences(doc: TextDocument, pos: Position, _ctx: ReferenceContext, _token: CancellationToken): ProviderResult<Location[]> {
		const r = doc.getWordRangeAtPosition(pos, CodingSupporter.#regTagName);
		if (! r) return Promise.reject('No word here.');

		return new Promise((re, rj)=> {
			const nm = doc.getText(doc.getWordRangeAtPosition(pos));
			const loc = this.#scrScn.hMacroUse[nm];
			if (loc) return re(loc);

			return rj('No references found');
		});
	}

	// 「シンボルの名前変更」
	prepareRename(doc: TextDocument, pos: Position, _token: CancellationToken): ProviderResult<Range | {placeholder: string, range: Range}> {
		const r = doc.getWordRangeAtPosition(pos, CodingSupporter.#regTagName);
		if (! r) return Promise.reject('No word here.');

		return new Promise((re, rj)=> {
			const nm = doc.getText(doc.getWordRangeAtPosition(pos));
			if (nm in CodingSupporter.#hTag) return rj('タグは変名できません');
			const m = this.#scrScn.hPlugin[nm] ?? this.#scrScn.hMacro[nm];
			if (! m) return rj('未定義マクロ・タグです');

			this.#nm4rename = nm;
			return re((doc.uri === m.uri && m.range.contains(pos)) ?m.range :r);
		});
	}
	#nm4rename = '';
	provideRenameEdits(_doc: TextDocument, _pos: Position, newName: string, _token: CancellationToken): ProviderResult<WorkspaceEdit> {
		return new Promise((re, rj)=> {
			// tokenに空白が含まれないこと
			if (/(\s|　)/.test(newName)) return rj('空白を含む変名はできません');
			if (newName in CodingSupporter.#hTag) return rj('既にあるタグ名です');
			if (newName in this.#scrScn.hMacro) return rj('既にあるマクロ名です');
			if (newName in this.#scrScn.hPlugin) return rj('既にあるプラグイン定義タグ名です');

			// 使用箇所
			const we = new WorkspaceEdit();
			const mu = this.#scrScn.hMacroUse[this.#nm4rename];
			if (mu) {
				this.#scrScn.hMacroUse[newName] = mu;
				delete this.#scrScn.hMacroUse[this.#nm4rename];

				mu.forEach(p=> we.replace(p.uri, p.range, newName));
			}

			// プラグイン定義タグ定義
			const mp = this.#scrScn.hPlugin[this.#nm4rename];
			if (mp) {
				this.#scrScn.hPlugin[newName] = mp;
				delete this.#scrScn.hPlugin[this.#nm4rename];
				this.#scrScn.goAll();

				we.replace(mp.uri, mp.range, newName);
				return re(we);
			}

			// マクロ定義
			const m = this.#scrScn.hMacro[this.#nm4rename];
			this.#scrScn.hMacro[newName] = m;
			delete this.#scrScn.hMacro[this.#nm4rename];

			we.replace(m.loc.uri, m.loc.range, newName);
			return re(we);
		});
	}

	// コード補完機能
	#aCITagMacro	: CompletionItem[]	= [];
	provideCompletionItems(doc: TextDocument, pos: Position, _token: CancellationToken, cc: CompletionContext): ProviderResult<CompletionItem[] | CompletionList> {
		const line = doc.lineAt(pos.line);
		const trgChr = cc.triggerCharacter;
		if (trgChr === '[') {	// タグやマクロ候補を表示
			const t = line.text.slice(pos.character -1, pos.character +1);
			// res/language-configuration.json の autoClosingPairs で自動に閉じる、
			// またはそのような状況で発火させる
			return (t === '[]') ?this.#aCITagMacro :[];
		}

		const aUse = this.#scrScn.hTagMacroUse[doc.uri.path];
		if (! aUse) return [];
		const use = aUse.find(o=> o.rng.contains(pos));
		if (! use) return [];
		const md = hMd[use.nm];
		if (! md) return [];	// 前に警告出してる
		// 属性候補を表示
		if (trgChr === ' ') return md.param.map(p=> {
			const ci = new CompletionItem(p.name, CompletionItemKind.Field);
			ci.detail = p.comment;	// 属性候補選択時のコメント
			return ci;
		});

		// 属性値候補を表示
		// if (trgChr === '=')
		const r = doc.getWordRangeAtPosition(pos, CodingSupporter.#REG_FIELD);
		if (! r) return [];
		const idxParam = this.#searchArgName(doc.getText(r), md);
		if (idxParam === -1) return [];
		const prm_details = md.param[idxParam];
		let rangetype = prm_details?.rangetype;
		if (! rangetype) return [];
		switch (rangetype) {
			case 'Boolean':	rangetype = 'true、false'; break;
		}
		if (rangetype.includes('、')) return rangetype.split('、').map(v=> new CompletionItem(v, CompletionItemKind.Keyword));

		let kind = CompletionItemKind.Value;
		const words = this.#scrScn.hPreWords[rangetype];
		if (! words) return prm_details?.default ?[new CompletionItem(prm_details.default, kind)] :[];
		switch (rangetype) {
			case 'イベント名':	kind = CompletionItemKind.Event;	break;
			case '代入変数名':	kind = CompletionItemKind.Variable;	break;
			case 'ジャンプ先':	kind = CompletionItemKind.Reference;	break;
			case 'スクリプトファイル名':
			case '画像ファイル名':
			case '音声ファイル名':
			case 'HTMLファイル名':	kind = CompletionItemKind.File;	break;
			default:	kind = CompletionItemKind.EnumMember;	break;
		}
		return words.slice(1, -1).split(',').map(v=> new CompletionItem(
			v, (v.slice(0, 6) === 'const.') ?CompletionItemKind.Constant :kind
		));
	}
	// 遅延でコード補完処理
	resolveCompletionItem(ci: CompletionItem, _token: CancellationToken): ProviderResult<CompletionItem> {
		// 遅延で各要素の詳細な情報(detail, documentationプロパティ)を
		if (ci.kind === CompletionItemKind.Snippet) {
			const sn = CodingSupporter.#hSnippet[String(ci.label)];
			if (sn) ci.insertText = new SnippetString(this.#scrScn.cnvSnippet(
				sn,
				getFn(window.activeTextEditor?.document.fileName ?? '')
			));
		}

		return ci;
	}

	// 引数の説明
	#preSigHelp	= new SignatureHelp();
	#rngPreTag	: Range;
	provideSignatureHelp(doc: TextDocument, pos: Position, _token: CancellationToken, shc: SignatureHelpContext): ProviderResult<SignatureHelp> {
		//const r = doc.getWordRangeAtPosition(pos, ScriptScanner.REG_TAG);
		// 複数行検索ができない
		// https://code.visualstudio.com/api/references/vscode-api#TextDocument

		const path = doc.uri.path;
		let token = '';
		const aUse = this.#scrScn.hTagMacroUse[path];
		if (! aUse) return Promise.reject('Nothing tag file.');
		if (shc.isRetrigger) {	// すでに開いてる
			// Helpオープン中再訪時は、始点（変化しない）からタグ正規表現かけ終点を探す
			let r = this.#rngPreTag;
			r = r.with(undefined, r.end.translate(2, 0));
				// 二行分捕捉すれば、改行発生後どんな行長になっても対応できるはず
			const a = this.#scrScn.analyzToken(doc.getText(r));
			if (! a) return Promise.reject('No tag here.');
			token = a[0];
			r = r.with(undefined, doc.positionAt(
				doc.offsetAt(r.start) +token.length
			));
			if (! new Range(r.start.translate(0, 1), r.end.translate(0, -1)).contains(pos)) return Promise.reject('Out of tag.');
			this.#rngPreTag = r;
		}
		else {
			const r = aUse.find(o=> o.rng.contains(pos))?.rng;
			if (! r) return Promise.reject('No args here.');
			this.#rngPreTag = r.with(undefined, r.end.translate(0, 1));
				// 1は起動spaceキー文字分
			token = doc.getText(this.#rngPreTag);
		}

		const a_tag = ScriptScanner.analyzTagArg(token);
		const g = a_tag?.groups;
		if (! g) return Promise.reject('No args here.');

		const nm = g.name;
		const m = this.#scrScn.hMacro[nm];
		if (m) {	// TODO: マクロも「引数の説明」サポート。doc/md/*.md を解析（複数行データ対応するため）
			return Promise.reject(`[${nm}] マクロです 定義ファイル：${m.loc.uri.path.slice(this.#lenRootPath)}`);
		}

		const md = hMd[nm];
		if (! md) return Promise.reject('Nothing md file.');	// 前に警告出してる
		if (! shc.isRetrigger) {
			const sh = new SignatureHelp();
			const ad = this.#hArgDesc[nm];	// NOTE: マクロ定義で増減
			let label = `[${nm}`;
			const aSiP: ParameterInformation[] = [];
			if (md.param.length > 0 && md.param[0].name !== '') md.param
			.forEach(prm=> {
				const p = `${prm.name}=${
					prm.required ?'【必須】' :`%${prm.name}|${prm.default}`
				}`;
				label += ' '+ p;
				// 検索文字列、属性概要
				aSiP.push(new ParameterInformation(p, new MarkdownString(prm.comment)));
			});

			// 全体、タグ説明
			const si = new SignatureInformation(label +']', ad.doc);
			si.parameters = aSiP;
			sh.signatures = [si];
			this.#preSigHelp = sh;
		}
		const r = doc.getWordRangeAtPosition(pos, CodingSupporter.#REG_FIELD);
		this.#preSigHelp.activeParameter = (r)
			? this.#searchArgName(doc.getText(r), md)
			: -1;

		return this.#preSigHelp;
	}
	static	readonly	#REG_FIELD	= /(?<=\s)[^\s=[\]]+(?:=(?:[^"'#\s;\]]+|(["'#]).*?\1)?)?/;
	#searchArgName(inp: string, md: MD_STRUCT): number {
		const includesEq = inp.search(/(?<=[^=]+)=/);
		// = 打鍵済みなら属性名確定で、同一を探す
		//（配列で前の方のyoyoにマッチしyにマッチしない、という事があるので）
		if (includesEq === -1) {
			const reg = new RegExp(`^${inp.replace(/=.*$/,'')}`);
			return md.param.findIndex(p=> reg.test(p.name));
		}

		const arg_nm = inp.slice(0, includesEq);
		return md.param.findIndex(p=> p.name === arg_nm);
	}

	// アウトライン
	#hScr2Pro: {[scr_path: string] :1}	= {};
	provideDocumentSymbols(doc: TextDocument, _token: CancellationToken): ProviderResult<SymbolInformation[] | DocumentSymbol[]> {
		const path = doc.uri.path;
		if (doc.isDirty && (path in this.#hScr2Pro)) return new Promise(
			rs=> this.#hRsvNm2Then['アウトライン'] = ()=> {
				rs(this.#scrScn.hSn2aDsOutline[path] ?? []);
			}
		);

		this.#hScr2Pro[path] = 1;
		return new Promise(rs=> rs(this.#scrScn.hSn2aDsOutline[path] ?? []));
	}


	setHDefPlg(hDefPlg: {[def_nm: string]: Location}) {
		this.#scrScn.hPlugin = hDefPlg;
		this.#scrScn.goAll();
	}

	setEscape(ce: string) {this.#scrScn.setEscape(ce);}

	readonly	crePrj = (_: Uri)=> this.#scrScn.goAll();		// ファイル増加
	readonly	chgPrj = (uri: Uri)=> this.#scrScn.goFile(uri);	// ファイル変更
	readonly	delPrj = (_: Uri)=> this.#scrScn.goAll();		// ファイル削除

	#loadCfg = ()=> CodingSupporter.#pickItems.sort(this.#compare).forEach(q=> q.description += '（SKYNovel）');
	#compare(a: QuickPickItem, b: QuickPickItem): number {
		const aStr = a.label + a.description;
		const bStr = b.label + b.description;
		return aStr > bStr ? 1 : aStr === bStr ? 0 : -1;
	}

	updPath(hPath: IFn2Path): void {this.#scrScn.updPath(hPath);}
}
