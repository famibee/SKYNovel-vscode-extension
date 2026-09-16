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
		scheduleSaveState();
	});
	card.querySelector('.scanInstalled').addEventListener('change', scheduleSaveState);

	// このカード内の全ドロップゾーン（プロジェクトフォルダ・最新版インストーラー win/mac・
	// 過去版インストーラー win/mac）はクリックでもOSファイル選択ダイアログを開く
	// （ドラッグ&ドロップは別途ウィンドウ全体で処理）
	for (const dz of card.querySelectorAll('.dropzone')) {
		dz.addEventListener('click', async ()=> {
			if (dz.dataset.target === 'project') {
				const path = await invoke('select_folder');
				if (path) void applyProjectFolder(card, path);
				return;
			}
			if (dz.dataset.target === 'latest-win' || dz.dataset.target === 'latest-mac') {
				// win欄は.exeのみ、mac欄は.dmgのみを選ばせる（2026-09-15・ユーザー指摘）
				const osKind = dz.dataset.target === 'latest-win' ? 'win' : 'mac';
				const path = await invoke('select_single_file_with_ext', {ext: osKind === 'win' ? 'exe' : 'dmg'});
				if (path) setLatestInstallerPath(card, osKind, path);
				return;
			}
			// 過去版インストーラーもwin欄は.exeのみ、mac欄は.dmgのみに絞る
			// （最新版インストーラーと同じ絞り込みが効いていなかった。2026-09-17・ユーザー指摘）
			const paths = await invoke('select_installer_files', {ext: dz.dataset.target === 'mac' ? 'dmg' : 'exe'});
			addInstallerPaths(card, dz.dataset.target, paths);
		});
	}

	// win/macそれぞれの「アップロード」ボタン。同じslug配下でもOS別のプレフィックスに
	// アップロードするため、win版のアップロードでmac版のファイルが誤って削除されない
	// （2026-09-15・ユーザー指摘：最新版インストーラーはwin/mac両方必要）
	for (const btn of card.querySelectorAll('.btnUploadLatest')) {
		const osKind = btn.dataset.os;
		btn.addEventListener('click', async ()=> {
			const elStatus = card.querySelector(`.latest-upload-status[data-os="${osKind}"]`);
			const localPath = card.querySelector(`.latest-dropzone[data-target="latest-${osKind}"]`).dataset.path ?? '';
			if (! localPath) { flashStatus(elStatus, '✗ ファイルを選択してください'); return; }

			// R2のURLパスに使う識別子はASCII安全な文字に限定する（2026-09-15・実機確認）。
			// appNameは日本語のproductNameになりうり、配布パッチアプリ本体（patch_app）が
			// curlサブプロセスの引数としてdownloadUrlをそのまま渡すため、Windows環境の
			// curl.exeで文字コード起因の失敗リスクがある。package.jsonのnameはエンジン側の
			// セーブデータ識別等にも使う必須フィールドで、正常なプロジェクトなら必ず存在する
			// （手入力の代用フォールバックは無し。2026-09-15・ユーザー指摘）
			const slug = card.dataset.uploadSlug ?? '';
			if (! slug) {
				flashStatus(elStatus, '✗ アップロード先IDが未取得です（プロジェクトフォルダを選択してください）', 0);
				return;
			}

			const basename = localPath.split(/[\\/]/).pop();
			elStatus.textContent = 'チェックサム計算中…';
			const config = r2CollectConfig();
			// アップロード先フォルダ名は内容ベースのチェックサムにする（2026-09-17・
			// ユーザー指摘：乱数UUIDだと同じファイルを再アップロードするたびdownloadUrlが
			// 変わり、テストのたびに再アップロードが要る状態だった）。同じ内容なら同じ
			// キー＝同じURLになるため、ファイルが変わっていなければアップロード自体を
			// スキップできる。osKindを挟むのは、旧版自動削除（下記）がwin/mac互いの
			// ファイルを消さないようにするため
			let checksum;
			try {
				checksum = await invoke('file_checksum', {path: localPath});
			}
			catch (e) {
				flashStatus(elStatus, `✗ チェックサム計算に失敗: ${String(e)}`, 0);
				return;
			}
			const prefix = `patch/${slug}/${osKind}/`;
			const key = `${prefix}${checksum}/${basename}`;

			try {
				const alreadyUploaded = await invoke('r2_object_exists', {config, key});
				if (alreadyUploaded) {
					const url = await invoke('r2_public_url', {config, key});
					setValueDisplay(card, `.downloadUrl[data-os="${osKind}"]`, url);
					card.querySelector(`.downloadUrl[data-os="${osKind}"]`).closest('.latest-url-row').hidden = false;
					flashStatus(elStatus, '✓ スキップ（内容不変）・DL URLへ反映しました', 0);
					scheduleSaveState();
					return;
				}

				elStatus.textContent = 'アップロード中…';
				const url = await invoke('r2_upload_file', {config, localPath, key});
				setValueDisplay(card, `.downloadUrl[data-os="${osKind}"]`, url);
				card.querySelector(`.downloadUrl[data-os="${osKind}"]`).closest('.latest-url-row').hidden = false;

				// 同じOS・同じslug配下に残っている旧バージョン（チェックサムが異なるフォルダ）を
				// 掃除する（アップロード成功「後」に消す。先に消すとアップロード失敗時に
				// ファイルが消えてしまうため。2026-09-15・ユーザー要望）
				let deletedNote = '';
				try {
					const deleted = await invoke('r2_delete_others_with_prefix', {config, prefix, keepKey: key});
					if (deleted > 0) deletedNote = `（旧版${deleted}件を削除）`;
				}
				catch (e) {
					deletedNote = `（旧版の削除に失敗: ${String(e)}）`;
				}

				flashStatus(elStatus, `✓ 完了・DL URLへ反映しました${deletedNote}`, 0);
				scheduleSaveState();
			}
			catch (e) {
				flashStatus(elStatus, `✗ アップロードに失敗: ${String(e)}`, 0);
			}
		});
	}
}

// downloadUrlは自動入力のみで手入力させない（2026-09-15・ユーザー指摘：手で入れると
// 間違えるので入力欄自体を用意しない）ため、表示専用の要素（.value-display）を使う。
// 表示テキストとバリデーション用の値（dataset.value）を分けて持つ。selectorは
// querySelectorにそのまま渡せる文字列（例: '.downloadUrl[data-os="win"]'）
function setValueDisplay(card, selector, value, displayText = value) {
	const el = card.querySelector(selector);
	el.textContent = displayText;
	el.dataset.value = value;
}

// 選択済みになったら✅付きでファイル名を表示する（フルパスは dataset.path に保持）。
// 別のファイルに選び直した場合、前回アップロード分のdownloadUrl表示は当てはまらなく
// なるためクリアする（2026-09-15・ユーザー指摘：再アップロードするまで古いURLを
// 見せない）
function setLatestInstallerPath(card, osKind, path) {
	const dz = card.querySelector(`.latest-dropzone[data-target="latest-${osKind}"]`);
	dz.dataset.path = path;
	const elSub = dz.querySelector('.dz-sub');
	elSub.textContent = `✅ ${path.split(/[\\/]/).pop()}`;
	elSub.title = path;

	const urlEl = card.querySelector(`.downloadUrl[data-os="${osKind}"]`);
	urlEl.textContent = '';
	urlEl.dataset.value = '';
	urlEl.closest('.latest-url-row').hidden = true;
	scheduleSaveState();
}

// プロジェクトフォルダを読み、appName・pass.json・relPath・crypto・アップロード先IDを
// 自動取得する（src-tauri/src/lib.rs の scan_project_folder が Project.ts の判定基準を
// 簡易再現）。これらは開発者が見る／編集する必要がない内部値のため画面には出さず、
// card.dataset に保持するだけにする（2026-09-15・ユーザー指摘）。
// pass.json以降の詳細欄はプロジェクトフォルダを選ぶまで非表示にしておく
// （2026-09-15・ユーザー指摘：手動入力は間違えるので導線自体を用意しない）
async function applyProjectFolder(card, folderPath) {
	const dz = card.querySelector('.project-dropzone');
	const elStatus = card.querySelector('.project-scan-status');
	dz.dataset.path = folderPath;
	dz.querySelector('.dz-sub').textContent = `✅ ${folderPath.split(/[\\/]/).pop()}`;
	dz.querySelector('.dz-sub').title = folderPath;
	// appName・pass等はscan_project_folderで再取得できる値なので保存対象は
	// フォルダパスのみでよい（再起動時はこのパスから再スキャンして復元する）
	scheduleSaveState();

	try {
		const result = await invoke('scan_project_folder', {path: folderPath});
		card.querySelector('.app-card-details').hidden = false;
		card.querySelector('.btn-remove-app').hidden = false;
		if (result.appName) {
			const elAppName = card.querySelector('.appName');
			elAppName.hidden = false;
			setValueDisplay(card, '.appName', result.appName);
		}
		card.dataset.uploadSlug = result.appSlug ?? '';
		card.dataset.pass = result.pass ?? '';
		card.dataset.relPath = result.relPath ?? '';
		card.dataset.crypto = String(result.crypto);

		// 選択後はプロジェクトフォルダ欄自体の役目が終わるので消す。選び直す場合は
		// カードを✕で削除して追加し直す運用に一本化する（2026-09-15・ユーザー指摘）。
		// 警告があっても各値が未取得のまま app-card-details 側に反映されており、
		// 生成時のバリデーションで気づける
		if (result.warnings.length === 0) {
			card.querySelector('.project-picker-field').hidden = true;
			return;
		}

		flashStatus(elStatus, `⚠️ ${result.warnings.join(' / ')}`, 6000);
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
		// フルパスだと長い場合に末尾（ファイル名）がellipsisで隠れるため、
		// 他の選択済み表示（最新版インストーラー等）と同様にbasenameだけ表示する
		// （フルパスはtitleでhoverすれば見える。2026-09-17・ユーザー指摘）
		spanPath.textContent = p.split(/[\\/]/).pop();
		spanPath.title = p;
		const btnDel = document.createElement('button');
		btnDel.type = 'button';
		btnDel.textContent = '削除';
		btnDel.addEventListener('click', ()=> { li.remove(); scheduleSaveState(); });
		li.append(spanPath, btnDel);
		ul.appendChild(li);
	}
	scheduleSaveState();
}

function installerPathsOfOs(card, osKind) {
	return [...card.querySelectorAll(`.installer-list[data-os="${osKind}"] li`)].map(li=> li.dataset.path);
}

// 過去版インストーラーはwin/mac問わず1つの配列としてgenLegacyPatch.tsに渡す
// （チェックサム抽出はOS非依存で、同一ビルドのwin/macから同一チェックサムが得られる
// ことを実機確認済み。legacy-app-patch.md「詰められていない仕様#1」参照）
function installerPathsOf(card) {
	return [...installerPathsOfOs(card, 'win'), ...installerPathsOfOs(card, 'mac')];
}


//MARK: 画面入力の永続化（テストのたびに毎回入力させられるのを防ぐ。2026-09-17・ユーザー指摘）
//
// pass.json の中身（鍵）は保存しない。プロジェクトフォルダのパスだけを保存し、
// 起動時に scan_project_folder で読み直すことでappName等を復元する。

function collectPersistState() {
	const apps = [];
	for (const card of elApps.querySelectorAll('.app-card')) {
		const projectFolderPath = card.querySelector('.project-dropzone').dataset.path || null;
		const scanInstalled = card.querySelector('.scanInstalled').checked;
		const installers = {
			win: installerPathsOfOs(card, 'win'),
			mac: installerPathsOfOs(card, 'mac'),
		};
		const latest = {};
		for (const osKind of ['win', 'mac']) {
			const dz = card.querySelector(`.latest-dropzone[data-target="latest-${osKind}"]`);
			const urlEl = card.querySelector(`.downloadUrl[data-os="${osKind}"]`);
			latest[osKind] = {path: dz.dataset.path || null, downloadUrl: urlEl.dataset.value || null};
		}
		apps.push({projectFolderPath, scanInstalled, installers, latest});
	}
	return {apps};
}

let saveStateTimer;
function scheduleSaveState() {
	clearTimeout(saveStateTimer);
	saveStateTimer = setTimeout(()=> {
		void invoke('save_patch_state', {state: collectPersistState()}).catch(()=> {});
	}, 300);
}

async function restoreAppCard(saved) {
	addAppCard();
	const card = elApps.lastElementChild;
	if (saved.projectFolderPath) await applyProjectFolder(card, saved.projectFolderPath);
	card.querySelector('.scanInstalled').checked = !! saved.scanInstalled;
	if (saved.installers) {
		addInstallerPaths(card, 'win', saved.installers.win || []);
		addInstallerPaths(card, 'mac', saved.installers.mac || []);
	}
	if (saved.latest) {
		for (const osKind of ['win', 'mac']) {
			const l = saved.latest[osKind];
			if (! l || ! l.path) continue;
			setLatestInstallerPath(card, osKind, l.path);
			if (l.downloadUrl) {
				setValueDisplay(card, `.downloadUrl[data-os="${osKind}"]`, l.downloadUrl);
				card.querySelector(`.downloadUrl[data-os="${osKind}"]`).closest('.latest-url-row').hidden = false;
			}
		}
	}
}

async function initApps() {
	let saved;
	try { saved = await invoke('load_patch_state'); }
	catch { saved = null; }

	if (saved && Array.isArray(saved.apps) && saved.apps.length > 0) {
		for (const appState of saved.apps) await restoreAppCard(appState);
	}
	else {
		addAppCard();
	}
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

	if (target === 'latest-win' || target === 'latest-mac') {
		// win欄は.exeのみ、mac欄は.dmgのみを許可する（2026-09-15・ユーザー指摘）
		const osKind = target === 'latest-win' ? 'win' : 'mac';
		const ext = osKind === 'win' ? '.exe' : '.dmg';
		const [path] = e.payload.paths || [];
		if (! path || ! path.toLowerCase().endsWith(ext)) {
			alert(`${ext} ファイルをドロップしてください`);
			return;
		}
		setLatestInstallerPath(card, osKind, path);
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


//MARK: グローバル設定（stub・出力先。win/mac別。patch_appはOS別バイナリで
// 配布物1本につきdownloadUrlも1つしか持てないため）
//
// stubはpatch_appのビルド済みバイナリを指すだけの値で開発者が選ぶ意味が無く、
// 出力先も配布物を都度置く場所を選ばせるほどの用途が無いため、どちらも
// GUI側で自動的に決める（2026-09-17・ユーザー指摘：「パッチ生成ツールが
// 知ってるのだから指定させないで」「出力先はdownloads固定で良い」）。

let stubPaths = {win: null, mac: null};
let downloadsDir = null;

// stubはGUIを開くたび・生成するたびに毎回 cargo build --release し直してから
// パスを確定する（patch_appのソースを直してもstubの再ビルドを忘れると、配布物に
// 埋め込むJSON設定のスキーマがstub内蔵の古いパーサーとずれて解析エラーになる不具合が
// 実際に起きたため。「うっかり忘れる」余地自体を仕組みで無くす。
// 2026-09-17・ユーザー指摘：「更新忘れが起こりえないように仕組みで排除」）
async function resolveGlobalPaths() {
	document.getElementById('stubStatusWin').textContent = 'ビルド中…';
	document.getElementById('stubStatusMac').textContent = 'ビルド中…';
	try {
		[stubPaths, downloadsDir] = await Promise.all([
			invoke('rebuild_and_resolve_stubs'),
			invoke('downloads_dir'),
		]);
	}
	catch (e) {
		document.getElementById('stubStatusWin').textContent = `✗ 検出に失敗: ${String(e)}`;
		document.getElementById('stubStatusMac').textContent = `✗ 検出に失敗: ${String(e)}`;
		return;
	}
	document.getElementById('stubStatusWin').textContent = stubPaths.win
		? `✅ ${stubPaths.win}`
		: stubPaths.winBuildError
			? `✗ ビルドに失敗: ${stubPaths.winBuildError}`
			: '未検出（patch_app のwin向けビルドが無い。README参照）';
	document.getElementById('stubStatusMac').textContent = stubPaths.mac
		? `✅ ${stubPaths.mac}`
		: `✗ ビルドに失敗: ${stubPaths.macBuildError ?? '不明なエラー'}`;
}
void resolveGlobalPaths();


//MARK: 生成実行

// osKind: 'win' | 'mac'。downloadUrlだけOS別で、他（pass・relPath・crypto・
// legacyInstallers・scanInstalled）はアプリ単位の共通値
function collectConfig(osKind) {
	const apps = [];
	for (const card of elApps.querySelectorAll('.app-card')) {
		const appName = card.querySelector('.appName').dataset.value ?? '';
		const pass = card.dataset.pass ?? '';
		const relPath = card.dataset.relPath ?? '';
		const cryptoEnabled = card.dataset.crypto === 'true';
		const scanInstalled = card.querySelector('.scanInstalled').checked;
		const downloadUrl = card.querySelector(`.downloadUrl[data-os="${osKind}"]`).dataset.value ?? '';
		const legacyInstallers = installerPathsOf(card);

		if (! appName) throw new Error('appName が未取得のアプリがあります（プロジェクトフォルダを選択してください）');
		if (! pass) throw new Error(`${appName}: pass.json が未取得です（プロジェクトフォルダを選択してください）`);
		if (! downloadUrl) throw new Error(`${appName}: downloadUrl（${osKind}）が未設定です（最新版インストーラーをアップロードしてください）`);
		if (legacyInstallers.length === 0 && ! scanInstalled) {
			throw new Error(`${appName}: 過去版インストーラーを1つ以上追加するか、実機スキャンを有効にしてください`);
		}

		apps.push({
			appName,
			pass,
			relPath: relPath || 'theme/setting.sn',
			crypto: cryptoEnabled,
			downloadUrl,
			legacyInstallers,
			scanInstalled,
		});
	}
	if (apps.length === 0) throw new Error('アプリを1つ以上追加してください');
	return apps;
}

// 「配布パッチアプリを生成」ボタンは1つだが、内部的にはwin向け・mac向けで
// genLegacyPatch.tsを2回呼ぶ（patch_appがOS別バイナリのため。2026-09-15・ユーザー確認：
// GUI側で2回実行する方式を採用）。
// ⚠️ win/mac両方必須にはしない（2026-09-15・ユーザー指摘）：electron-builderの制約で
// win環境の開発者はそもそもmac版のゲームビルド自体ができず、mac版インストーラーを
// 持っていない場合がある（legacy-app-patch.md 詰められていない仕様#7）。stub・出力先が
// 入力された方だけを生成対象とし、片方が空でもエラーにしない
// 出力ファイル名は各アプリの「アップロード先ID」（ASCII安全なslug）から組み立てる。
// 同じ組み合わせで再生成すると同名で上書きされる（都度名前を変えたい場合は
// Downloadsフォルダ側でリネームする運用。2026-09-17・ユーザー指摘に伴う変更）
function buildOutPath(osKind) {
	const slugs = [...elApps.querySelectorAll('.app-card')]
		.map(card=> card.dataset.uploadSlug)
		.filter(Boolean);
	const base = slugs.length > 0 ? slugs.join('_') : 'patch';
	const fileName = osKind === 'win' ? `${base}_patch.exe` : `${base}_patch`;
	return `${downloadsDir}/${fileName}`;
}

document.getElementById('btnRun').addEventListener('click', async ()=> {
	const elLog = document.getElementById('resultLog');

	// GUIを開いてからpatch_appのソースを直した場合でも必ず最新のstubを使うよう、
	// 生成の直前に毎回ビルドし直す（起動時のビルドだけでは間に合わないケースがある）
	elLog.textContent = 'stubをビルド中…';
	await resolveGlobalPaths();

	const stubWin = stubPaths.win;
	const stubMac = stubPaths.mac;

	const doWin = !! stubWin;
	const doMac = !! stubMac;

	let appsWin, appsMac, outWin, outMac;
	try {
		if (! doWin && ! doMac) throw new Error('win・macどちらのstubも検出できませんでした（patch_app をビルドすること）');
		if (! downloadsDir) throw new Error('ダウンロードフォルダを取得できませんでした');
		if (doWin) { appsWin = collectConfig('win'); outWin = buildOutPath('win'); }
		if (doMac) { appsMac = collectConfig('mac'); outMac = buildOutPath('mac'); }
	}
	catch (e) {
		elLog.textContent = `✗ ${e.message}`;
		return;
	}

	const logs = [];

	if (doWin) {
		elLog.textContent = [...logs, '生成中…（win）'].join('\n\n');
		try {
			const logWin = await invoke('run_gen_legacy_patch', {apps: appsWin, stubPath: stubWin, outPath: outWin});
			logs.push(`[win] → ${outWin}\n${logWin}`);
		}
		catch (e) {
			logs.push(`✗ win向け生成に失敗しました：\n${String(e)}`);
			elLog.textContent = logs.join('\n\n');
			return;
		}
	}

	if (doMac) {
		elLog.textContent = [...logs, '生成中…（mac）'].join('\n\n');
		try {
			const logMac = await invoke('run_gen_legacy_patch', {apps: appsMac, stubPath: stubMac, outPath: outMac});
			logs.push(`[mac] → ${outMac}\n${logMac}`);
		}
		catch (e) {
			logs.push(`✗ mac向け生成に失敗しました：\n${String(e)}`);
			elLog.textContent = logs.join('\n\n');
			return;
		}
	}

	elLog.textContent = logs.join('\n\n');
});


// 前回保存分があれば復元し、無ければ最低1枚は最初から出しておく
void initApps();


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

// 同じ文言のまま連打されても「消えて出る」を繰り返させ、反応を分かりやすくする。
// ms に 0 を渡すと消さない（アップロードのように結果を見逃すと困る処理向け。
// 2026-09-15・実機確認：231MBのアップロード中に目を離すと2.5秒で消える完了表示を
// 見逃す、というフィードバックを受けて追加）
function flashStatus(el, text, ms = 2500) {
	el.textContent = '';
	// 直前と同文言でも再度アニメーションさせるため、次フレームで設定する
	requestAnimationFrame(()=> { el.textContent = text; });
	clearTimeout(el._flashTimer);
	if (ms > 0) el._flashTimer = setTimeout(()=> { el.textContent = ''; }, ms);
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
	// 「アップロード済み一覧」は patch/ 配下のみ表示するため、ここでアップロードした
	// ものも見失わないようデフォルトで patch/ 配下に置く（手動で変更すれば別の場所にも置ける）
	if (! elKey.value.trim()) elKey.value = `patch/${path.split(/[\\/]/).pop()}`;
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
