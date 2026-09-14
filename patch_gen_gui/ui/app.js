/* パッチ生成ツール（試作単体アプリ）のフロントエンド。フレームワークなし・プレーンJS。
 * 判定ロジックは一切持たない（Rust側 lib.rs が sn_extension/src/genLegacyPatch.ts を
 * サブプロセスで呼ぶだけ）。ここは入力を集めて config を組み立てるだけの薄いUI。
 * src/docs/legacy-app-patch.md「GUI設計案」参照。
 */
'use strict';

const {invoke} = window.__TAURI__.core;
const {listen} = window.__TAURI__.event;

const elApps = document.getElementById('apps');
const tmplApp = document.getElementById('tmplApp');

let appSeq = 0;


//MARK: アプリカードの追加・削除

function addAppCard() {
	const id = `app-${String(appSeq++)}`;
	const frag = tmplApp.content.cloneNode(true);
	const card = frag.querySelector('.app-card');
	card.dataset.id = id;
	wireCard(card);
	elApps.appendChild(frag);
}

function wireCard(card) {
	card.querySelector('.btn-remove-app').addEventListener('click', ()=> {
		card.remove();
	});

	card.querySelector('.btnPickPass').addEventListener('click', async ()=> {
		const path = await invoke('select_single_file');
		if (path) card.querySelector('.passPath').value = path;
	});

	for (const btn of card.querySelectorAll('.btn-pick-installer')) {
		btn.addEventListener('click', async ()=> {
			const paths = await invoke('select_installer_files');
			addInstallerPaths(card, btn.dataset.os, paths);
		});
	}
}

function addInstallerPaths(card, osKind, paths) {
	if (! paths || paths.length === 0) return;
	const ul = card.querySelector(`.installer-list[data-os="${osKind}"]`);
	for (const p of paths) {
		// 既に同じパスが入っていれば追加しない
		if ([...ul.children].some(li=> li.dataset.path === p)) continue;
		const li = document.createElement('li');
		li.dataset.path = p;
		const spanPath = document.createElement('span');
		spanPath.className = 'path';
		spanPath.textContent = p;
		spanPath.title = p;
		const btnDel = document.createElement('button');
		btnDel.type = 'button';
		btnDel.textContent = '削除';
		btnDel.addEventListener('click', ()=> li.remove());
		li.append(spanPath, btnDel);
		ul.appendChild(li);
	}
}

function installerPathsOf(card) {
	return [...card.querySelectorAll('.installer-list li')].map(li=> li.dataset.path);
}

document.getElementById('btnAddApp').addEventListener('click', addAppCard);


//MARK: ドラッグ&ドロップ（ウィンドウ全体で受け、座標からドロップ先を判定する）

function dropzoneAt(x, y) {
	for (const dz of document.querySelectorAll('.dropzone')) {
		const r = dz.getBoundingClientRect();
		if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return dz;
	}
	return undefined;
}

// Tauri v2 の drag-drop イベント座標は物理ピクセル。CSSピクセルに変換して判定する
function toCssPos(pos) {
	const scale = window.devicePixelRatio || 1;
	return {x: pos.x / scale, y: pos.y / scale};
}

void listen('tauri://drag-enter', (e)=> {
	const {x, y} = toCssPos(e.payload.position);
	const dz = dropzoneAt(x, y);
	if (dz) dz.classList.add('dragover');
});

void listen('tauri://drag-over', (e)=> {
	const {x, y} = toCssPos(e.payload.position);
	for (const dz of document.querySelectorAll('.dropzone')) dz.classList.remove('dragover');
	const dz = dropzoneAt(x, y);
	if (dz) dz.classList.add('dragover');
});

void listen('tauri://drag-leave', ()=> {
	for (const dz of document.querySelectorAll('.dropzone')) dz.classList.remove('dragover');
});

void listen('tauri://drag-drop', (e)=> {
	for (const dz of document.querySelectorAll('.dropzone')) dz.classList.remove('dragover');
	const {x, y} = toCssPos(e.payload.position);
	const dz = dropzoneAt(x, y);
	if (! dz) return;
	const card = dz.closest('.app-card');
	const osKind = dz.dataset.target;
	// .dmg/.exe 以外が混ざっていても genLegacyPatch.ts 側の拡張子判定に委ねる
	// （ここでは弾かない。ドロップ先の欄名で軽く絞るだけ）
	const paths = (e.payload.paths || []).filter((p)=> osKind === 'mac'
		? p.toLowerCase().endsWith('.dmg')
		: p.toLowerCase().endsWith('.exe'));
	if (paths.length === 0) {
		alert(`${osKind === 'mac' ? '.dmg' : '.exe'} ファイルをドロップしてください`);
		return;
	}
	addInstallerPaths(card, osKind, paths);
});


//MARK: グローバル設定（stub・出力先）

document.getElementById('btnPickStub').addEventListener('click', async ()=> {
	const path = await invoke('select_single_file');
	if (path) document.getElementById('stubPath').value = path;
});

document.getElementById('btnPickOut').addEventListener('click', async ()=> {
	const path = await invoke('select_output_path', {defaultName: 'patch'});
	if (path) document.getElementById('outPath').value = path;
});


//MARK: 生成実行

function collectConfig() {
	const apps = [];
	for (const card of elApps.querySelectorAll('.app-card')) {
		const appName = card.querySelector('.appName').value.trim();
		const pass = card.querySelector('.passPath').value.trim();
		const relPath = card.querySelector('.relPath').value.trim();
		const crypto = card.querySelector('.crypto').checked;
		const scanInstalled = card.querySelector('.scanInstalled').checked;
		const downloadUrl = card.querySelector('.downloadUrl').value.trim();
		const legacyInstallers = installerPathsOf(card);

		if (! appName) throw new Error('appName が未入力のアプリがあります');
		if (! pass) throw new Error(`${appName}: pass.json が未選択です`);
		if (! downloadUrl) throw new Error(`${appName}: downloadUrl が未入力です`);
		if (legacyInstallers.length === 0 && ! scanInstalled) {
			throw new Error(`${appName}: 過去インストーラーを1つ以上追加するか、実機スキャンを有効にしてください`);
		}

		apps.push({
			appName,
			pass,
			relPath: relPath || 'theme/setting.sn',
			crypto,
			downloadUrl,
			legacyInstallers,
			scanInstalled,
		});
	}
	if (apps.length === 0) throw new Error('アプリを1つ以上追加してください');
	return apps;
}

document.getElementById('btnRun').addEventListener('click', async ()=> {
	const elLog = document.getElementById('resultLog');
	const stubPath = document.getElementById('stubPath').value.trim();
	const outPath = document.getElementById('outPath').value.trim();

	let apps;
	try {
		if (! stubPath) throw new Error('stub を選択してください');
		if (! outPath) throw new Error('出力先を選択してください');
		apps = collectConfig();
	}
	catch (e) {
		elLog.textContent = `✗ ${e.message}`;
		return;
	}

	elLog.textContent = '生成中…';
	try {
		const log = await invoke('run_gen_legacy_patch', {apps, stubPath, outPath});
		elLog.textContent = log;
	}
	catch (e) {
		elLog.textContent = `✗ 生成に失敗しました：\n${String(e)}`;
	}
});


// 最低1枚は最初から出しておく
addAppCard();
