/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

// 公開前チェック（bun run release）
//	1. ソース走査 …… 無断でパッケージマネージャを叩く箇所が増えていないか
//	2. ビルド …… vsce package（prepublish で tsc の型検査 → esbuild）
//	3. vsix 検査 …… 想定外のファイルが入っていないか・必要なファイルがあるか
//	4. dist 検査 …… 巨大な依存の混入・資格情報ファイル読み取りコードの混入
//	5. SHA256 …… リリースノート用に出力
//
// 公開（vsce publish）はしない。PAT を CI に置きたくないので手動のまま。
//	詳細は TODO.md「公開前チェックの自動化」を参照

import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readdirSync, readFileSync, statSync} from 'node:fs';

const aErr: string[] = [];
const aInfo: string[] = [];
const err = (mes: string)=> {aErr.push(mes); console.error(`  ✗ ${mes}`)};
const ok = (mes: string)=> console.log(`  ✓ ${mes}`);


//MARK: 1. ソース走査
// 拡張機能から直接プロセスを起こす箇所。ここに無いものが増えたら落とす。
//	（ユーザーに見えるタスク実行 = ShellExecution は対象外。それは別途 README に明記）
const H_ALLOW_EXEC: {[fp: string]: {cmd: string, why: string}[]} = {
	'src/ActivityBar.ts': [
		{cmd: 'pip list',			why: '検出のみ。導入はしない'},
		{cmd: 'pip install',		why: 'モーダルで同意を得た後だけ実行（#prepPyFontTools）'},
		{cmd: 'python -m site',		why: 'pyftsubset の場所を得る（読み取りのみ）'},
		{cmd: 'node -v',			why: 'バージョン検出'},
		{cmd: 'npm -v',				why: 'バージョン検出'},
	],
	'src/CmnLib.ts': [
		{cmd: 'bun -v',				why: 'バージョン検出（タスクを bun にするか）。chkBun() で結果を共有する'},
	],
	'src/Project.ts': [
		{cmd: 'powershell',			why: 'Get-ExecutionPolicy の読み取りのみ。シェルを介さない'},
	],
	'src/batch/WfbOptFont.ts': [
		{cmd: 'pyftsubset',			why: 'フォント最適化の実処理。導入済みの確認後に実行'},
	],
};
const REG_EXEC = /\b(?:exec|execSync|execFile|execFileSync|spawn|spawnSync)\s*\(\s*[`'"]([^`'"]*)/g;
const REG_PM = /\b(?:pip|pip3|npm|npx|bun|bunx|yarn|pnpm|brew|apt|apt-get|curl|wget|powershell|python|python3|node|pyftsubset)\b/i;

const aFpSrc: string[] = [];
const walk = (dir: string)=> {
	for (const d of readdirSync(dir, {withFileTypes: true})) {
		const fp = `${dir}/${d.name}`;
		if (d.isDirectory()) {walk(fp); continue}
		if (d.name.endsWith('.ts')) aFpSrc.push(fp);
	}
};
walk('src'); walk('server/src');

console.log('1. ソース走査（プロセス起動箇所）');
for (const fp of aFpSrc.sort()) {
	const src = readFileSync(fp, {encoding: 'utf8'});
	for (const m of src.matchAll(REG_EXEC)) {
		const cmd = m[1] ?? '';
		if (! REG_PM.test(cmd)) continue;

		const a = H_ALLOW_EXEC[fp] ?? [];
		if (a.some(({cmd: allow})=> cmd.startsWith(allow))) continue;

		err(`許可リストに無いコマンド実行： ${fp} 【${cmd.slice(0, 60)}】
    意図した追加なら release_chk.ts の H_ALLOW_EXEC に理由付きで追加すること`);
	}
}
if (aErr.length === 0) ok(`${String(aFpSrc.length)} ファイル、許可リスト内のみ`);

// dependencies に入れてはいけないもの（本体バンドルに混入するため）
console.log('2. dependencies 検査');
const REJECT_DEPS = ['npm-check-updates'];
	// ncu は ~/.npmrc 読み取り・process.env 走査を含み、Marketplace で
	// 資格情報窃取の典型シグネチャに見える。タスクで npx 実行すること
const oPkg = <{dependencies: {[nm: string]: string}, version: string, name: string}>
	JSON.parse(readFileSync('package.json', {encoding: 'utf8'}));
for (const nm of REJECT_DEPS) {
	if (nm in oPkg.dependencies) err(`dependencies に ${nm} が入っている（バンドルに混入する）`);
}
if (! REJECT_DEPS.some(nm=> nm in oPkg.dependencies)) ok('禁止依存なし');


//MARK: 3. ビルド＆パッケージ
console.log('3. ビルド＆パッケージ（vscode:prepublish で型検査 → esbuild）');
const fnVsix = `${oPkg.name}-${oPkg.version}.vsix`;
try {
	execFileSync('vsce', ['package', '--no-dependencies', '--out', fnVsix], {stdio: 'inherit'});
	ok(fnVsix);
} catch {
	err('vsce package が失敗しました（型検査エラーの可能性。上の出力を確認）');
}


//MARK: 4. vsix 同梱物検査
console.log('4. vsix 同梱物検査');
// どこにあっても入ってはいけないもの（秘密・巨大・無意味）
const A_REJECT_FILE = [
	/(?:^|\/)\.claude\//,		/(?:^|\/)\.env/,
	/\.(?:pem|key|p12|pfx)$/,	/settings\.local\.json$/,
	/\.vsix$/,					/(?:^|\/)\.DS_Store$/,
];
// 自前のファイルとして入ってはいけないもの（依存パッケージの中身は対象外。
// 依存が同種のファイルを同梱してくるのは向こうの都合で、更新ごとに増減する）
const A_REJECT_OWN = [
	/(?:^|\/)\.git/,			/(?:^|\/)bun\.lock$/,
	/\.tsbuildinfo$/,			/(?:^|\/)eslint\.config\./,
	/(?:^|\/)tsconfig[^/]*\.json$/,
	/(?:^|\/)TODO\.md$/,		/(?:^|\/)CLAUDE\.md$/,
	/(?:^|\/)release_chk\.ts$/,	/(?:^|\/)build\.ts$/,
	/(?:^|\/)\.vscode-test/,
		// 統合テスト（bun run test:int）が作る VSCode のユーザーデータ。
		// 一度これを 140 ファイルまるごと vsix に混入させたので検査に加えた
];
const A_NEED_FILE = [
	'package.json', 'README.md', 'CHANGELOG.md', 'LICENSE',
	'dist/extension.js', 'dist/LangSrv.js', 'dist/md.json', 'dist/setting.html',
	// views/*.ts から生成する webview スクリプト（ビルド忘れの検出）
	'views/folder.js', 'views/tmpwiz.js', 'views/toolbox.js', 'views/score.js',
];
const aFpVsix = execFileSync('vsce', ['ls', '--no-dependencies'], {encoding: 'utf8'})
	.split('\n').map(v=> v.trim()).filter(v=> v !== '');
for (const fp of aFpVsix) {
	const reg = A_REJECT_FILE.find(r=> r.test(fp))
		?? (fp.includes('node_modules/') ?undefined :A_REJECT_OWN.find(r=> r.test(fp)));
	if (reg) err(`vsix に入ってはいけないファイル： ${fp}（${String(reg)}）
    .vscodeignore に追加すること`);
}
for (const fp of A_NEED_FILE) {
	if (! aFpVsix.includes(fp)) err(`vsix に必要なファイルが無い： ${fp}`);
}
ok(`${String(aFpVsix.length)} ファイル`);


//MARK: 5. dist 検査（巨大バンドル・サプライチェーン攻撃指標）
console.log('5. dist 検査');
const MAX_CHUNK = 2_000_000;
	// extension.js は esbuild の単一バンドルで約1.6MB。ncu を混ぜていた頃は
	// これに 1.1MB 上乗せされていたので、2MB を超えたら重い依存の混入を疑う

// 既知のサプライチェーン攻撃・資格情報窃取の指標。
//	公開済み vsix を手作業で走査していたもの（TODO.md §6）をここに取り込んだ。
//	シグネチャベースの簡易チェックなので、無汚染の証明にはならない
const A_IOC: {reg: RegExp, why: string}[] = [
	{reg: /webhook\.site|requestbin|pipedream\.net|ngrok\.io/i,
		why: '外部への持ち出し先として悪用される中継サービス'},
	{reg: /eval\s*\(\s*atob\s*\(|Function\s*\(\s*atob\s*\(/,
		why: 'Base64 を復号して実行（難読化された悪性コードの典型）'},
	{reg: /_0x[0-9a-f]{4,}\s*\(/,
		why: '難読化ツールの生成物と同じ命名（javascript-obfuscator 等）'},
	{reg: /\.npmrc|\.netrc|id_rsa|\.aws\/credentials|\.ssh\/config/,
		why: '資格情報ファイルの読み取り'},
	{reg: /process\.env\s*\)\s*\)|Object\.entries\s*\(\s*process\.env/,
		why: '環境変数の総なめ（トークン収集の典型）'},
	{reg: /trufflehog|shai-?hulud/i,
		why: '既知のワームが使うツール名'},
];
for (const fn of readdirSync('dist')) {
	if (! fn.endsWith('.js')) continue;

	const fp = `dist/${fn}`;
	const {size} = statSync(fp);
	if (size > MAX_CHUNK) err(`巨大なバンドル： ${fp} ${String(Math.round(size /1024))}KB > ${String(MAX_CHUNK /1024)}KB
    重い依存を混ぜていないか確認すること`);

	const src = readFileSync(fp, {encoding: 'utf8'});
	for (const {reg, why} of A_IOC) {
		const m = reg.exec(src);
		if (! m) continue;

		err(`サプライチェーン攻撃指標に一致： ${fp} 【${m[0].slice(0, 40)}】
    ${why}
    自分のコードか依存のどちらかを特定し、正当だと確認できたら A_IOC を調整すること`);
	}
}
ok(`巨大バンドルなし・攻撃指標${String(A_IOC.length)}種すべて不検出`);


//MARK: 6. SHA256
// ⚠️ ここまでで失敗していたら vsix が無い。読みに行くと ENOENT で落ち、
// **本当の失敗理由（型検査・lint の失敗など）が画面から流れてしまう**
if (aErr.length > 0) {
	console.error(`\n✗ ${String(aErr.length)} 件の問題があります。公開しないこと`);
	process.exit(1);
}
console.log('6. SHA256（リリースノート用）');
const bin = readFileSync(fnVsix);
const hash = createHash('sha256').update(bin).digest('hex');
aInfo.push(`${fnVsix}  ${String(Math.round(bin.length /1024))}KB`, `SHA256: ${hash}`);
for (const v of aInfo) console.log(`  ${v}`);


console.log('');
if (aErr.length > 0) {
	console.error(`✗ ${String(aErr.length)} 件の問題があります。公開しないこと`);
	process.exit(1);
}
console.log('✓ 公開前チェックはすべて通りました（公開は手動で）');
