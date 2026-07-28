/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

/**
 * 統合テスト用の SKYNovel プロジェクトを一時フォルダに作る。
 *
 * ⚠️ **無害であること（＝ターミナルでビルドが走らないこと）が最重要。**
 * src/Project.ts を読んで確認した条件は次の2つで、どちらも欠かすと
 * 【自動ビルド】タスクが起動して `npm i` が走る：
 *
 * - `node_modules/` が存在すること
 *   … `firstInit = ! existsSync(PATH_WS +'/node_modules')` が false になり、
 *     `#updPlugin(false)` となって `if (build) this.#build()` を通らない
 * - `<FLD_SRC>/plugin/` が存在すること
 *   … 無いと `#updPlugin()` 冒頭で mkdirs して `#build()` を直接呼ぶ
 *
 * 中身は空でよい（`existsSync` しか見ていない）。
 * git 管理下には置かない（一時フォルダに毎回作る）
 */

import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';

export type T_FIXTURE = {
	/** ワークスペースフォルダ */
	ws		: string;
	/** doc/prj/（画像を置く先などの基点） */
	prj		: string;
};

/**
 * @param nm      フォルダ名（テストごとに変える）
 * @param blues   BlueSNovel のプロジェクトとして作る（src/web.ts の import 先）
 */
export function mkFixture(nm: string, blues = false): T_FIXTURE {
	const ws = `${tmpdir()}/sn_ext_test/${nm}`;
	rmSync(ws, {recursive: true, force: true});

	for (const d of [
		'node_modules',			// ← これが無いと npm i が走る
		'src/plugin',			// ← これが無いと #build() が呼ばれる
		'src/batch',			// ← これが無いと cnv_mat_{pic,snd}.json の
								//    writeJson が ENOENT（writeJson は親を作らない）
		'src/font',
		'doc/prj/script',
		'doc/prj/pic',
		'doc/prj/sound',
		'.vscode',
	]) mkdirSync(`${ws}/${d}`, {recursive: true});

	writeFileSync(`${ws}/package.json`, JSON.stringify({
		name: 'sn_ext_test', version: '0.0.0', private: true,
		dependencies: {}, devDependencies: {}, scripts: {},
	}, null, '\t'));

	// 拡張機能の activationEvents（workspaceContains:doc/prj/prj.json）
	writeFileSync(`${ws}/doc/prj/prj.json`, JSON.stringify({
		book: {title: 'テスト', creator: '', cre_url: '', publisher: '',
			pub_url: '', detail: '', version: '0.0.0'},
		save_ns: 'sn_ext_test',
	}, null, '\t'));

	// 無いと起動時に loadPrjJs が ENOENT を吐く（拡張機能が後で作り直す）
	writeFileSync(`${ws}/doc/prj/path.json`, '{}');

	writeFileSync(`${ws}/doc/prj/script/main.sn`, [
		'*start',
		'[frame id=f]',
		'テスト本文です[l][r]',
		'[s]',
		'',
	].join('\n'));

	writeFileSync(`${ws}/doc/prj/script/setting.sn`, [
		'[title text="テスト"]',
		'',
	].join('\n'));

	// isBluesPrj() が見るのはこの import 先だけ
	writeFileSync(`${ws}/src/web.ts`, [
		'const hPlg = {};',
		`const {SysWeb} = await import('${
			blues ?'@famibee/bluesnovel/web' :'@famibee/skynovel_esm/web'}');`,
		'new SysWeb(hPlg);',
		'',
	].join('\n'));

	return {ws, prj: `${ws}/doc/prj`};
}

/**
 * **マルチルート**のフィクスチャ（§3.8 (A) の再現用）。
 *
 * `Project` はワークスペースフォルダごとに作られるが、
 * `WatchFile.#updPathJson` / `encIfNeeded` が **static** なので後勝ちになる。
 * それを実地で示すため、プロジェクトを2つ持つ `.code-workspace` を作る。
 *
 * @vscode/test-cli の `workspaceFolder` はフォルダでもワークスペースファイルでもよい
 */
export function mkMultiFixture(): {file: string, a: T_FIXTURE, b: T_FIXTURE} {
	const a = mkFixture('multi/A');
	const b = mkFixture('multi/B');
	const file = `${tmpdir()}/sn_ext_test/multi/two.code-workspace`;
	writeFileSync(file, JSON.stringify({
		folders	: [{path: a.ws}, {path: b.ws}],
		settings: {'skynovel.chkExtUpdate': false},
	}, null, '\t'));
	return {file, a, b};
}
