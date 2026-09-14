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

	// このカード内の全ドロップゾーン（プロジェクトフォルダ・過去版インストーラー mac/win・
	// 最新版インストーラー）はクリックでもOSファイル選択ダイアログを開く
	// （ドラッグ&ドロップは別途ウィンドウ全体で処理）
	for (const dz of card.querySelectorAll('.dropzone')) {
		dz.addEventListener('click', async ()=> {
			if (dz.dataset.target === 'project') {
				const path = await invoke('select_folder');
				if (path) void applyProjectFolder(card, path);
				return;
			}
			if (dz.dataset.target === 'latest') {
				const path = await invoke('select_single_file');
				if (path) setLatestInstallerPath(card, path);
				return;
			}
			const paths = await invoke('select_installer_files');
			addInstallerPaths(card, dz.dataset.target, paths);
		});
	}

	card.querySelector('.btnUploadLatest').addEventListener('click', async ()=> {
		const elStatus = card.querySelector('.latest-upload-status');
		const localPath = card.querySelector('.latest-dropzone').dataset.path ?? '';
		if (! localPath) { flashStatus(elStatus, '✗ ファイルを選択してください'); return; }

		const appName = card.querySelector('.appName').value.trim() || 'app';
		const basename = localPath.split(/[\\/]/).pop();
		const key = `${appName}/${basename}`;

		elStatus.textContent = 'アップロード中…';
		try {
			const url = await invoke('r2_upload_file', {config: r2CollectConfig(), localPath, key});
			card.querySelector('.downloadUrl').value = url;
			flashStatus(elStatus, '✓ アップロード完了・downloadUrlへ反映しました');
		}
		catch (e) {
			flashStatus(elStatus, `✗ アップロードに失敗: ${String(e)}`, 5000);
		}
	});
}

// 選択済みになったら✅付きでファイル名を表示する（フルパスは dataset.path に保持）
function setLatestInstallerPath(card, path) {
	const dz = card.querySelector('.latest-dropzone');
	dz.dataset.path = path;
	const elSub = dz.querySelector('.dz-sub');
	elSub.textContent = `✅ ${path.split(/[\\/]/).pop()}`;
	elSub.title = path;
}

// プロジェクトフォルダを読み、appName・pass.json・relPath・crypto を自動入力する
// （src-tauri/src/lib.rs の scan_project_folder が Project.ts の判定基準を簡易再現）
async function applyProjectFolder(card, folderPath) {
	const dz = card.querySelector('.project-dropzone');
	const elStatus = card.querySelector('.project-scan-status');
	dz.dataset.path = folderPath;
	dz.querySelector('.dz-sub').textContent = `✅ ${folderPath.split(/[\\/]/).pop()}`;
	dz.querySelector('.dz-sub').title = folderPath;

	try {
		const result = await invoke('scan_project_folder', {path: folderPath});
		if (result.appName) card.querySelector('.appName').value = result.appName;
		if (result.pass) card.querySelector('.passPath').value = result.pass;
		if (result.relPath) card.querySelector('.relPath').value = result.relPath;
		card.querySelector('.crypto').checked = result.crypto;

		flashStatus(
			elStatus,
			result.warnings.length === 0 ? '✓ 自動入力しました' : `⚠️ ${result.warnings.join(' / ')}`,
			result.warnings.length === 0 ? 2500 : 6000,
		);
	}
	catch (e) {
		flashStatus(elStatus, `✗ 読み込みに失敗: ${String(e)}`, 5000);
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
	const target = dz.dataset.target;

	if (target === 'project') {
		const [path] = e.payload.paths || [];
		if (path) void applyProjectFolder(card, path);
		return;
	}

	if (target === 'latest') {
		const [path] = e.payload.paths || [];
		if (path) setLatestInstallerPath(card, path);
		return;
	}

	// .dmg/.exe 以外が混ざっていても genLegacyPatch.ts 側の拡張子判定に委ねる
	// （ここでは弾かない。ドロップ先の欄名で軽く絞るだけ）
	const paths = (e.payload.paths || []).filter((p)=> target === 'mac'
		? p.toLowerCase().endsWith('.dmg')
		: p.toLowerCase().endsWith('.exe'));
	if (paths.length === 0) {
		alert(`${target === 'mac' ? '.dmg' : '.exe'} ファイルをドロップしてください`);
		return;
	}
	addInstallerPaths(card, target, paths);
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
			throw new Error(`${appName}: 過去版インストーラーを1つ以上追加するか、実機スキャンを有効にしてください`);
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


//MARK: タブ切替

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

function selectTab(name) {
	tabs.forEach(t=> t.classList.toggle('active', t.dataset.tool === name));
	panels.forEach(p=> p.classList.toggle('active', p.id === `panel-${name}`));
}

tabs.forEach(t=> t.addEventListener('click', ()=> selectTab(t.dataset.tool)));


//MARK: ホスティング管理（Cloudflare R2）

function r2CollectConfig() {
	return {
		accountId: document.getElementById('r2AccountId').value.trim(),
		bucket: document.getElementById('r2Bucket').value.trim(),
		accessKeyId: document.getElementById('r2AccessKeyId').value.trim(),
		secretAccessKey: document.getElementById('r2SecretAccessKey').value.trim(),
		publicBaseUrl: document.getElementById('r2PublicBaseUrl').value.trim(),
	};
}

function r2ApplyConfig(config) {
	if (! config) return;
	document.getElementById('r2AccountId').value = config.accountId ?? '';
	document.getElementById('r2Bucket').value = config.bucket ?? '';
	document.getElementById('r2AccessKeyId').value = config.accessKeyId ?? '';
	document.getElementById('r2SecretAccessKey').value = config.secretAccessKey ?? '';
	document.getElementById('r2PublicBaseUrl').value = config.publicBaseUrl ?? '';
}

// アップロードに最低限必要な4項目が揃っていれば「設定済み」とみなす（公開ベースURLは任意）
function updateR2ConfiguredBadge() {
	const c = r2CollectConfig();
	const configured = !! (c.accountId && c.bucket && c.accessKeyId && c.secretAccessKey);
	document.getElementById('r2ConfiguredBadge').textContent = configured ? '✅' : '';
}

// 起動時に前回保存分を読み込む
void invoke('r2_load_config').then((config)=> {
	r2ApplyConfig(config);
	updateR2ConfiguredBadge();
});

// 同じ文言のまま連打されても「消えて出る」を繰り返させ、反応を分かりやすくする
function flashStatus(el, text, ms = 2500) {
	el.textContent = '';
	// 直前と同文言でも再度アニメーションさせるため、次フレームで設定する
	requestAnimationFrame(()=> { el.textContent = text; });
	clearTimeout(el._flashTimer);
	el._flashTimer = setTimeout(()=> { el.textContent = ''; }, ms);
}

document.getElementById('btnR2Save').addEventListener('click', async ()=> {
	const elStatus = document.getElementById('r2SaveStatus');
	try {
		await invoke('r2_save_config', {config: r2CollectConfig()});
		updateR2ConfiguredBadge();
		flashStatus(elStatus, '✓ 保存しました');
	}
	catch (e) {
		flashStatus(elStatus, `✗ 保存に失敗: ${String(e)}`, 5000);
	}
});

document.getElementById('btnR2PickUpload').addEventListener('click', async ()=> {
	const path = await invoke('select_single_file');
	if (! path) return;
	document.getElementById('r2UploadPath').value = path;
	const elKey = document.getElementById('r2UploadKey');
	if (! elKey.value.trim()) elKey.value = path.split(/[\\/]/).pop();
});

document.getElementById('btnR2Upload').addEventListener('click', async ()=> {
	const elLog = document.getElementById('r2UploadLog');
	const localPath = document.getElementById('r2UploadPath').value.trim();
	const key = document.getElementById('r2UploadKey').value.trim();
	if (! localPath) { elLog.textContent = '✗ アップロードするファイルを選択してください'; return; }
	if (! key) { elLog.textContent = '✗ 保存先キー名を入力してください'; return; }

	elLog.textContent = 'アップロード中…';
	try {
		const url = await invoke('r2_upload_file', {config: r2CollectConfig(), localPath, key});
		elLog.textContent = `✓ アップロード完了\n${url}`;
		void r2Refresh();
	}
	catch (e) {
		elLog.textContent = `✗ アップロードに失敗しました：\n${String(e)}`;
	}
});

async function r2Refresh() {
	const tbody = document.querySelector('#r2List tbody');
	tbody.innerHTML = '<tr><td colspan="4">読込中…</td></tr>';
	try {
		const objs = await invoke('r2_list_objects', {config: r2CollectConfig()});
		tbody.innerHTML = '';
		if (objs.length === 0) {
			tbody.innerHTML = '<tr><td colspan="4">（アップロード済みファイルなし）</td></tr>';
			return;
		}
		for (const o of objs) {
			const tr = document.createElement('tr');
			const tdKey = document.createElement('td');
			tdKey.textContent = o.key;
			const tdSize = document.createElement('td');
			tdSize.textContent = `${(o.size / 1024 / 1024).toFixed(2)} MB`;
			const tdDate = document.createElement('td');
			tdDate.textContent = o.lastModified;
			const tdDel = document.createElement('td');
			const btnDel = document.createElement('button');
			btnDel.type = 'button';
			btnDel.textContent = '削除';
			btnDel.addEventListener('click', async ()=> {
				if (! confirm(`削除しますか？\n${o.key}`)) return;
				try {
					await invoke('r2_delete_object', {config: r2CollectConfig(), key: o.key});
					void r2Refresh();
				}
				catch (e) {
					alert(`削除に失敗しました：${String(e)}`);
				}
			});
			tdDel.appendChild(btnDel);
			tr.append(tdKey, tdSize, tdDate, tdDel);
			tbody.appendChild(tr);
		}
	}
	catch (e) {
		tbody.innerHTML = `<tr><td colspan="4">✗ 一覧の取得に失敗しました：${String(e)}</td></tr>`;
	}
}

document.getElementById('btnR2Refresh').addEventListener('click', ()=> void r2Refresh());
