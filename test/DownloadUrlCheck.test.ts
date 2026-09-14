/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {checkDownloadUrl} from '../src/DownloadUrlCheck';

import {expect, afterEach, it} from 'bun:test';


let server: ReturnType<typeof Bun.serve> | undefined;

afterEach(()=> {
	void server?.stop(true);
	server = undefined;
});

function serve(handler: (req: Request)=> Response): string {
	server = Bun.serve({port: 0, fetch: handler});
	return `http://localhost:${String(server.port)}`;
}


it('checkDownloadUrl: http(s)で始まらないURLはリクエストせずNG', async ()=> {
	const r = await checkDownloadUrl('ftp://example.com/a.exe');
	expect(r.ok).toBe(false);
});


it('checkDownloadUrl: zipの拡張子＋正しいマジックバイトはOK', async ()=> {
	const base = serve(()=> new Response(Buffer.from([0x50, 0x4B, 0x03, 0x04, 1, 2, 3]), {
		headers: {'content-type': 'application/zip'},
	}));
	const r = await checkDownloadUrl(`${base}/patch.zip`);
	expect(r.ok).toBe(true);
});


it('checkDownloadUrl: exeの拡張子＋正しいマジックバイトはOK', async ()=> {
	const base = serve(()=> new Response(Buffer.from([0x4D, 0x5A, 0x90, 0x00]), {
		headers: {'content-type': 'application/octet-stream'},
	}));
	const r = await checkDownloadUrl(`${base}/patch.exe`);
	expect(r.ok).toBe(true);
});


it('checkDownloadUrl: exeの拡張子だがマジックバイトが違えばNG', async ()=> {
	const base = serve(()=> new Response(Buffer.from([0x00, 0x00, 0x00, 0x00]), {
		headers: {'content-type': 'application/octet-stream'},
	}));
	const r = await checkDownloadUrl(`${base}/patch.exe`);
	expect(r.ok).toBe(false);
	expect(r.reason).toContain('マジックバイト');
});


it('checkDownloadUrl: dmgはマジックバイト判定をせずContent-Typeのみで許容', async ()=> {
	const base = serve(()=> new Response(Buffer.from([0x00, 0x01, 0x02, 0x03]), {
		headers: {'content-type': 'application/x-apple-diskimage'},
	}));
	const r = await checkDownloadUrl(`${base}/patch.dmg`);
	expect(r.ok).toBe(true);
});


it('checkDownloadUrl: HTMLを返す（紹介ページの可能性）はNG', async ()=> {
	const base = serve(()=> new Response('<html><body>ダウンロードページ</body></html>', {
		headers: {'content-type': 'text/html; charset=utf-8'},
	}));
	const r = await checkDownloadUrl(`${base}/download.exe`);
	expect(r.ok).toBe(false);
	expect(r.reason).toContain('HTML');
});


it('checkDownloadUrl: HTTPエラーステータスはNG', async ()=> {
	const base = serve(()=> new Response('not found', {status: 404}));
	const r = await checkDownloadUrl(`${base}/patch.exe`);
	expect(r.ok).toBe(false);
});


it('checkDownloadUrl: 拡張子が無い/不明な場合はマジックバイト判定をスキップして許容', async ()=> {
	const base = serve(()=> new Response(Buffer.from([0x4D, 0x5A]), {
		headers: {'content-type': 'application/octet-stream'},
	}));
	const r = await checkDownloadUrl(`${base}/download?id=123`);
	expect(r.ok).toBe(true);
});
