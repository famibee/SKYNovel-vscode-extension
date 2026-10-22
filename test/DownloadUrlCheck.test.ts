/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {checkDownloadUrl} from '../src/DownloadUrlCheck';

import {expect, it} from 'bun:test';


// 本物のネットワーク・実サーバーを使わず、fetchImpl を差し替えてレスポンスだけ
// モックする。https:// を要求するようになった（CodeQL js/insecure-download 対応）ので、
// ダミーの https URL と組み合わせて使う
function mockFetch(handler: (req: Request)=> Response): typeof fetch {
	return <typeof fetch>((input: RequestInfo | URL, init?: RequestInit)=>
		Promise.resolve(handler(new Request(input, init)))
	);
}


it('checkDownloadUrl: http(s)で始まらないURLはリクエストせずNG', async ()=> {
	const r = await checkDownloadUrl('ftp://example.com/a.exe');
	expect(r.ok).toBe(false);
});


it('checkDownloadUrl: http:// はリクエストせずNG', async ()=> {
	const r = await checkDownloadUrl('http://example.com/a.exe');
	expect(r.ok).toBe(false);
	expect(r.reason).toContain('https');
});


it('checkDownloadUrl: zipの拡張子＋正しいマジックバイトはOK', async ()=> {
	const fi = mockFetch(()=> new Response(Buffer.from([0x50, 0x4B, 0x03, 0x04, 1, 2, 3]), {
		headers: {'content-type': 'application/zip'},
	}));
	const r = await checkDownloadUrl('https://example.com/patch.zip', fi);
	expect(r.ok).toBe(true);
});


it('checkDownloadUrl: exeの拡張子＋正しいマジックバイトはOK', async ()=> {
	const fi = mockFetch(()=> new Response(Buffer.from([0x4D, 0x5A, 0x90, 0x00]), {
		headers: {'content-type': 'application/octet-stream'},
	}));
	const r = await checkDownloadUrl('https://example.com/patch.exe', fi);
	expect(r.ok).toBe(true);
});


it('checkDownloadUrl: exeの拡張子だがマジックバイトが違えばNG', async ()=> {
	const fi = mockFetch(()=> new Response(Buffer.from([0x00, 0x00, 0x00, 0x00]), {
		headers: {'content-type': 'application/octet-stream'},
	}));
	const r = await checkDownloadUrl('https://example.com/patch.exe', fi);
	expect(r.ok).toBe(false);
	expect(r.reason).toContain('マジックバイト');
});


it('checkDownloadUrl: dmgはマジックバイト判定をせずContent-Typeのみで許容', async ()=> {
	const fi = mockFetch(()=> new Response(Buffer.from([0x00, 0x01, 0x02, 0x03]), {
		headers: {'content-type': 'application/x-apple-diskimage'},
	}));
	const r = await checkDownloadUrl('https://example.com/patch.dmg', fi);
	expect(r.ok).toBe(true);
});


it('checkDownloadUrl: HTMLを返す（紹介ページの可能性）はNG', async ()=> {
	const fi = mockFetch(()=> new Response('<html><body>ダウンロードページ</body></html>', {
		headers: {'content-type': 'text/html; charset=utf-8'},
	}));
	const r = await checkDownloadUrl('https://example.com/download.exe', fi);
	expect(r.ok).toBe(false);
	expect(r.reason).toContain('HTML');
});


it('checkDownloadUrl: HTTPエラーステータスはNG', async ()=> {
	const fi = mockFetch(()=> new Response('not found', {status: 404}));
	const r = await checkDownloadUrl('https://example.com/patch.exe', fi);
	expect(r.ok).toBe(false);
});


it('checkDownloadUrl: 拡張子が無い/不明な場合はマジックバイト判定をスキップして許容', async ()=> {
	const fi = mockFetch(()=> new Response(Buffer.from([0x4D, 0x5A]), {
		headers: {'content-type': 'application/octet-stream'},
	}));
	const r = await checkDownloadUrl('https://example.com/download?id=123', fi);
	expect(r.ok).toBe(true);
});
