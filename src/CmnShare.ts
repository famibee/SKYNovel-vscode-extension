/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

/**
 * 拡張機能本体と LSP（server/src）が共有する、**入出力を持たない**部分。
 *
 * ⚠️ このファイルに `fs` / `fs-extra` / `node:path` / `child_process` / `vscode` を
 * import してはいけない。
 *
 * 理由：LSP は解析専用で I/O を持たない方針だが、以前は LSP が `CmnLib.ts` を
 * import していたため、**一度も呼ばない fs-extra 一式が LSP のモジュールグラフに
 * 入っていた**（入力 114 → 78 ファイル）。出力バイト数は esbuild が
 * tree-shaking で既に 0 にしていたので変わらないが、境界が甘いと I/O が紛れ込む。
 * 実際に web.ts を読む判定処理が LSP に入りかけた（v4.31.2 で差し戻し）。
 *
 * 本体側だけで使う I/O 付きのものは CmnLib.ts に置くこと。
 * CmnLib.ts はここを再 export するので、本体側の import は従来どおり書ける
 */

export function int(o: unknown): number {return parseInt(String(o), 10)}
export function uint(o: unknown): number {
	const v = parseInt(String(o), 10);
	return v < 0 ? -v : v;
}

export	const	REG_SCRIPT	= /\.ss?n$/;

export const is_win = process.platform === 'win32';
export const is_mac = process.platform === 'darwin';
//const is_linux = process.platform === 'linux';


// =============== LSP
export const REQ_ID = ':SKYNovel:';	// これは server/src/LangSrv.ts に置くの禁止


// =============== パス
export type WORKSPACE_PATH	= string;	// doc/prj/script/main.sn
export type PROJECT_PATH	= string;	// script/main.sn
export type FULL_PATH		= string;	// /[user]/.../[prj]/doc/prj/script/main.sn
export type FULL_SCH_PATH	= string;	// file://c:\[user]\...\[prj]/doc/prj/

export function fullSchPath2fp(fsp: FULL_SCH_PATH): FULL_PATH {
	return decodeURIComponent(fsp.replace(/file:\/\/(\/\w%3A)?/, ''));
}	// 似たような名前のメソッドになるので目立たせる
	// 逆方向は難しそう、変換前の値は保存必要か

export const fp2fullSchPath: (fp: FULL_PATH)=> FULL_SCH_PATH = is_win
	? fp=> 'file://c:'+ encodeURI(fp)
	: fp=> 'file://'+ encodeURI(fp);

export function uri2path(p: string): string {return p.slice(7)}
	// 'file://' を取る

/**
 * 拡張子を除いたファイル名。`basename(path, extname(path))` と同じ結果を返すが、
 * `node:path` を使わない（このファイルの方針。上のコメント参照）。
 * Windows の区切り「\」も見る（node の win32 版と同じ扱い）
 */
export	function getFn(path: string) {
	const p = path.replace(/[/\\]+$/, '');	// 末尾の区切りを落とす
	const fn = p.slice(Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')) +1);
	const i = fn.lastIndexOf('.');
	return i > 0 ?fn.slice(0, i) :fn;	// 先頭の「.」は拡張子とみなさない
}
