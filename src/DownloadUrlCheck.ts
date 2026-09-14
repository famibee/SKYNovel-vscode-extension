/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

// downloadUrl が「インストーラそのものを指す直リンク」であることの検証。
// src/docs/legacy-app-patch.md 詰められていない仕様#3 参照。
//
// 配布パッチアプリ本体（Rust・利用者の手元）は curl で downloadUrl を直接取得するだけの
// 単純な実装（詰められていない仕様に記載の設計判断）。紹介ページ（Webページ）を渡された
// 場合はHTMLを取得するだけでインストーラは手に入らないので、生成時（開発者マシン上・
// 拡張機能TS側）に実際にHTTPリクエストして検証する。方針は2026-09-13決定済み。
//
// 検証粒度：先頭数KBだけ Range リクエストで取得し、マジックバイトで判定する
// （フルダウンロードは重い・HEADのみはサーバーによって Content-Type が信頼できない
// ことがあるための折衷案）。
// - zip: 先頭が "PK\x03\x04"
// - exe (Windows PE / NSIS自己展開): 先頭が "MZ"
// - dmg (Apple UDIF): ヘッダーではなく末尾にトレーラーを持つ形式のため、
//   先頭バイトでは判別できない。拡張子とContent-Typeのみで判定する


const LEN_RANGE = 4096;	// 先頭何バイトを取得するか

const MAGIC_ZIP = Buffer.from([0x50, 0x4B, 0x03, 0x04]);	// "PK\x03\x04"
const MAGIC_EXE = Buffer.from([0x4D, 0x5A]);				// "MZ"

const REG_HTML_CONTENT_TYPE = /^text\/html/i;

export type T_DOWNLOAD_URL_CHECK_RESULT = {
	ok			: boolean;
	reason?		: string;
	contentType?: string;
}

// downloadUrl の末尾拡張子から期待されるファイル種別を推測する
function guessExtKind(url: string): 'zip' | 'exe' | 'dmg' | undefined {
	const lower = url.toLowerCase().split(/[?#]/)[0] ?? '';
	if (lower.endsWith('.zip')) return 'zip';
	if (lower.endsWith('.exe')) return 'exe';
	if (lower.endsWith('.dmg')) return 'dmg';
	return undefined;
}

export async function checkDownloadUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<T_DOWNLOAD_URL_CHECK_RESULT> {
	if (! /^https?:\/\//.test(url)) return {ok: false, reason: 'http(s):// で始まらない'};

	let res: Response;
	try {
		// Accept-Encoding: identity で圧縮なしを要求する。Range指定と組み合わせて
		// gzip等で圧縮されたレスポンスを部分取得すると、ストリームが途中で切れて
		// 解凍に失敗する（実機確認・2026-09-14。GitHub Releasesページで再現）
		res = await fetchImpl(url, {headers: {Range: `bytes=0-${String(LEN_RANGE - 1)}`, 'Accept-Encoding': 'identity'}});
	}
	catch (e) {
		return {ok: false, reason: `リクエストに失敗: ${(<Error>e).message}`};
	}
	if (! res.ok && res.status !== 206) return {ok: false, reason: `HTTPステータス異常: ${String(res.status)}`, contentType: res.headers.get('content-type') ?? undefined};

	const contentType = res.headers.get('content-type') ?? undefined;
	if (contentType && REG_HTML_CONTENT_TYPE.test(contentType)) {
		return {ok: false, reason: `HTML（紹介ページの可能性）を返している: ${contentType}`, contentType};
	}

	const buf = Buffer.from(await res.arrayBuffer());
	const kind = guessExtKind(url);

	if (kind === 'zip' && ! buf.subarray(0, MAGIC_ZIP.length).equals(MAGIC_ZIP)) {
		return {ok: false, reason: '.zip の拡張子だがマジックバイトがzip形式でない（PK\\x03\\x04が無い）', contentType};
	}
	if (kind === 'exe' && ! buf.subarray(0, MAGIC_EXE.length).equals(MAGIC_EXE)) {
		return {ok: false, reason: '.exe の拡張子だがマジックバイトがexe形式でない（MZが無い）', contentType};
	}
	// dmg はヘッダーに固有のマジックバイトが無い形式のため、拡張子とHTML判定のみで許容する

	return {ok: true, contentType};
}
