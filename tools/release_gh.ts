/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

// GitHub Release 作成（bun run release）
//	version:patch 等で release_chk まで終え、コミット・push 済みの状態で実行する。
//	CHANGELOG.md の該当バージョンのセクションをそのままリリースノート本文にし、
//	vsix の SHA256 を添えて `gh release create` を呼ぶ。
//	タグは vX.Y.Z、pre-release は公式の慣習（奇数マイナー＝先行版）で自動判定。
//
//	コミット・push を飛ばして実行すると、作業ツリーの vsix と公開タグの中身が
//	ずれるため、未コミット・未 push なら止める

import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const oPkg = <{version: string, name: string, repository: {url: string}}>
	JSON.parse(readFileSync('package.json', {encoding: 'utf8'}));
const {version, name} = oPkg;
const tag = `v${version}`;
const fnVsix = `${name}-${version}.vsix`;

// このリポジトリには sync（blues-sync、Win↔mac用）など origin 以外の remote も
// 登録されているため、gh が「どれが対象か」を自分で決められない
// （"No default remote repository has been set"）。package.json の repository.url
// を正とし、毎回 --repo で明示する
const mRepo = /github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/.exec(oPkg.repository.url);
if (! mRepo) {
	console.error(`✗ package.json の repository.url から GitHub リポジトリ名を取り出せません： ${oPkg.repository.url}`);
	process.exit(1);
}
const repoSlug = mRepo[1] ?? '';

// 作業ツリーが汚れていないか（vsix は作業ツリーから作られるため、
// 未コミットの変更が残っていると、コミットに入っていない中身を公開してしまう）
const status = execFileSync('git', ['status', '--porcelain'], {encoding: 'utf8'});
if (status.trim() !== '') {
	console.error('✗ 作業ツリーに未コミットの変更があります。コミットしてから実行すること');
	process.exit(1);
}

// origin へ push 済みか（ahead が残っているとローカルだけの版を公開してしまう）
let ahead = '?';
try {
	ahead = execFileSync('git', ['rev-list', '--count', '@{upstream}..HEAD'], {encoding: 'utf8'}).trim();
} catch {
	console.error('✗ upstream（origin の追跡ブランチ）が見つかりません。push してから実行すること');
	process.exit(1);
}
if (ahead !== '0') {
	console.error(`✗ ローカルが origin より ${ahead} コミット進んでいます。push してから実行すること`);
	process.exit(1);
}

// CHANGELOG.md から該当バージョンのセクション（次の `## ` 見出し手前まで）を抽出。
// ⚠️ 正規表現の `(?=\n## |$)` は使わない。`m` フラグの `$` は「各行末」にマッチするため、
// 見出し直後の空行で非貪欲マッチが早期に止まり、本文が空になる不具合を一度踏んだ
const changelog = readFileSync('CHANGELOG.md', {encoding: 'utf8'});
const regHeading = new RegExp(`^## v${version.replace(/\./g, '\\.')}(?:（[^）]*）)?[ \\t]*$`, 'm');
const mHeading = regHeading.exec(changelog);
if (! mHeading) {
	console.error(`✗ CHANGELOG.md に "## v${version}" の見出しが見つかりません。先頭に追記してから実行すること`);
	process.exit(1);
}
const afterHeading = changelog.slice(mHeading.index + mHeading[0].length);
const idxNext = afterHeading.indexOf('\n## ');
const body = (idxNext === -1 ? afterHeading : afterHeading.slice(0, idxNext)).trim();

// タイトルはセクション内の最初の説明文（箇条書きの前にある概要の段落）。
// 無ければタグ名のみにする（release.md「リリースタイトルは要約文を付けること」の落とし穴対策）
const firstLine = body.split('\n').find(l=> l.trim() !== '' && ! l.trim().startsWith('-'));
const title = firstLine ? `${tag}：${firstLine.trim()}` : tag;

// SHA256（release_chk が作った vsix をそのまま使う。再計算して一致を保証する）
const bin = readFileSync(fnVsix);
const hash = createHash('sha256').update(bin).digest('hex');
const notes = `${body}\n\n**SHA256**: \`${hash}\``;

// 「奇数マイナー＝先行版」は release.md にある公式の慣習だが、実際には v4.33系・
// v4.35系とも正式版として運用されており、バージョン番号だけでは機械的に判定できない
// （v4.33.2 は元 alpha から方針転換で正式版扱いに切り替わった経緯がある）。
// 既定は正式版、先行版にしたいときだけ明示する： `bun run release -- --prerelease`
const isPrerelease = process.argv.includes('--prerelease');

// notes を --notes に直接渡すと、本文が `-` で始まる箇条書きの場合（CHANGELOG の
// 書式そのもの）、gh のフラグパーサーが次のオプションと誤認識して本文が消える。
// --notes-file 経由にして回避する
const fpNotes = join(tmpdir(), `release-notes-${tag}.md`);
writeFileSync(fpNotes, notes, {encoding: 'utf8'});

const args = ['release', 'create', tag, fnVsix, '--repo', repoSlug, '--title', title, '--notes-file', fpNotes];
if (isPrerelease) args.push('--prerelease');

console.log(`gh ${args.slice(0, 6).join(' ')} ...${isPrerelease ? ' --prerelease' : ''}`);
try {
	execFileSync('gh', args, {stdio: 'inherit'});
} finally {
	rmSync(fpNotes, {force: true});
}

// アップロードされた digest とローカル SHA256 の突き合わせ（release.md §SHA256 の確認手順）
const uploaded = <{assets?: {name: string, digest?: string}[]}>JSON.parse(
	execFileSync('gh', ['api', `repos/${repoSlug}/releases/tags/${tag}`], {encoding: 'utf8'}),
);
const asset = uploaded.assets?.find(a=> a.name === fnVsix);
if (asset?.digest !== `sha256:${hash}`) {
	console.error(`✗ アップロードされた digest がローカルの SHA256 と一致しません（${asset?.digest ?? '取得失敗'} vs sha256:${hash}）`);
	process.exit(1);
}
console.log(`\n✓ GitHub Release ${tag} を公開しました（digest 一致確認済み）`);
