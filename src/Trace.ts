/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

/**
 * 動作確認用の軽量トレース。
 *
 * 「画像を数枚まとめて追加したとき、全走査は1回にまとまっているか」のような
 * 確認のために、一時的な `console.error` を毎回書き足すのをやめるためのもの。
 *
 * - **計数は常に行う**（Map の加算だけ）。統合テストから assert するため
 * - **ログ出力は設定 `skynovel.trace` が true のときだけ**
 *   （`console.error` は本番でも【出力】-【ログ（ウインドウ）】に出てしまうので）
 */

import {writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';

const mCnt = new Map<string, number>();
let on = false;

/**
 * 計数の書き出し先。**UI テスト（Playwright）から読むため**。
 * UI テストは VSCode の外から画面を操作するので、`activate()` の戻り値
 * （統合テストが使う入口）には手が届かない。ファイル経由なら読める
 */
export const FP_TRACE = `${tmpdir()}/sn_ext_trace.json`;
let tm: ReturnType<typeof setTimeout> | undefined;
function dump() {		// 連続するので少しまとめる
	clearTimeout(tm);
	tm = setTimeout(()=> {
		try {writeFileSync(FP_TRACE, JSON.stringify(getTraceCnt()))}
		catch { /* 書けなくても本体の動作には関係ない */ }
	}, 300);
}

/** 設定 `skynovel.trace` の反映。src/extension.ts から呼ぶ */
export function updTrace(b: boolean) {on = b}

/**
 * 記録する。`key` は `need_go.req` のようにドット区切りで階層を表す
 * @param mes 補足（省略可）。ログにだけ出る
 */
export function trace(key: string, mes = '') {
	const n = (mCnt.get(key) ?? 0) +1;
	mCnt.set(key, n);
	if (! on) return;

	console.error(`[trace] ${key} #${String(n)}${mes ? ' '+ mes : ''}`);
	dump();
}

/** 統合テストから読む用。activate() の戻り値経由で公開している */
export function getTraceCnt(): {[key: string]: number} {
	return Object.fromEntries(mCnt);
}

/** 統合テストのケース間で 0 に戻す用 */
export function clearTrace() {mCnt.clear(); if (on) dump()}

/**
 * 手動確認用。ログに区切りを入れて計数を 0 に戻す。
 * ドラッグ＆ドロップのように**自動化できない操作**を1件ずつ確かめるときに使う
 * （コマンド「SKYNovel: トレースの区切り」）
 */
export function markTrace(mes = '') {
	const a = [...mCnt.entries()].map(([k, v])=> `${k}:${String(v)}`);
	console.error(`[trace] ───── 区切り ${mes}\n[trace] 直前までの計数: ${
		a.join(' ') || '(なし)'}`);
	mCnt.clear();
	dump();
}
