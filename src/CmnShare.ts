/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2026 Famibee (famibee.blog38.fc2.com)

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
// win: c:/[user]/.../[prj]/doc/prj/script/main.sn （ドライブ付き・'/'区切りが正）
// mac: /[user]/.../[prj]/doc/prj/script/main.sn
// ⚠️ 生の string を渡すと型エラーになる。必ず normFp() を通すこと
export type FULL_PATH		= string & {readonly __brand: 'FULL_PATH'};

/**
 * `Uri.fsPath` / `URI.fsPath`（vscode-uri）から FULL_PATH を作る、唯一の入口。
 * Windows の `fsPath` はバックスラッシュ区切り（例 `c:\Users\x\ws`）なので
 * `/` 区切りに正規化する。**`.path` ではなく `.fsPath` を渡すこと**
 * （`.fsPath` はドライブ文字が小文字に統一されるが `.path` は揺れる）
 */
export const normFp = is_win
	? (fsPath: string): FULL_PATH=> <FULL_PATH>fsPath.replaceAll('\\', '/')
	: (fsPath: string): FULL_PATH=> <FULL_PATH>fsPath;

/** fp が dir 配下か（区切りを見た判定。前方一致だけの判定はしないこと） */
export function isUnderPath(fp: FULL_PATH, dir: FULL_PATH): boolean {
	const d = <FULL_PATH>(dir.endsWith('/') ? dir : dir +'/');
	return fp === d.slice(0, -1) || fp.startsWith(d);
}

/**
 * fp 配下とみなせる候補（entries の key）のうち、最も深い（文字列長が最長の）
 * ものを1つ返す。入れ子のワークスペース（`/work` と `/work/sub` の両方を開く）
 * では複数の key が isUnderPath を満たすため、`find()` の早い者勝ちだと
 * 外側が先に当たって内側の結果を返せない（src/docs/multiroot.md 不具合6）
 */
export function longestUnderPath<T>(fp: FULL_PATH, entries: Iterable<readonly [FULL_PATH, T]>): T | undefined {
	let best: readonly [FULL_PATH, T] | undefined;
	for (const e of entries) {
		if (! isUnderPath(fp, e[0])) continue;
		if (! best || e[0].length > best[0].length) best = e;
	}
	return best?.[1];
}

// ⚠️ 以下3つは server/src がまだ使用中（vscode-uri 移行は§3.10 Stage1 B-2）。
// 拡張機能側（src/）はこの3つを使わず normFp() に統一済み
export type FULL_SCH_PATH	= string;	// file://c:\[user]\...\[prj]/doc/prj/

export function fullSchPath2fp(fsp: FULL_SCH_PATH): FULL_PATH {
	return <FULL_PATH>decodeURIComponent(fsp.replace(/file:\/\/(\/\w%3A)?/, ''));
}	// 似たような名前のメソッドになるので目立たせる
	// 逆方向は難しそう、変換前の値は保存必要か

export const fp2fullSchPath: (fp: FULL_PATH)=> FULL_SCH_PATH = is_win
	? fp=> 'file://c:'+ encodeURI(fp)
	: fp=> 'file://'+ encodeURI(fp);

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
