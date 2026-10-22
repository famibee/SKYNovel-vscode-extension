'use strict';

// カードUI本体。実データ配線（実装順序3〜6）。
// 状態遷移の表は src/docs/legacy-app-patch.md 「カードの状態遷移」参照。

const {invoke} = window.__TAURI__.core;
const {listen} = window.__TAURI__.event;

// 本来は埋め込み設定（footer.rs の AppConfig）の manifestUrl フィールドから取得する想定だが、
// そのフィールド自体の追加（footer.rs・genLegacyPatch.ts側の変更）は実装順序7（未着手）で行う。
// それまでの準備として、ここでは仮のURLを置く（R2側の実体はまだ無い。見た目通りプレースホルダ）
const MANIFEST_URL = 'https://pub-placeholder.r2.dev/patch/manifest.json';

const STATUS_LABEL = {
	checking: '確認中…',
	upToDate: '✓ 最新です',
	updateAvailable: '更新あり',
	archMigration: '更新あり',
	needsConfirm: '確認が必要',
	manifestError: '確認できません',
};

const ACTION_LABEL = {
	updateAvailable: '更新をダウンロード',
	archMigration: '更新をダウンロード',
	needsConfirm: '当時のインストーラーを選ぶ',
	manifestError: '再試行',
};

const cardNodes = new Map();	// appName -> カードのDOMノード

function applyState(node, dto) {
	node.dataset.state = dto.state;
	node.querySelector('.app-card-name').textContent = dto.appName;
	node.querySelector('.app-card-version').textContent = dto.latestVersion ? `最新: ${dto.latestVersion}` : '';

	node.querySelector('.spinner').hidden = true;
	const badge = node.querySelector('.statusBadge');
	badge.hidden = false;
	badge.textContent = STATUS_LABEL[dto.state] ?? '';
	badge.classList.toggle('badge-ok', dto.state === 'upToDate');
	badge.classList.toggle('badge-warn', dto.state === 'updateAvailable' || dto.state === 'archMigration');
	badge.classList.toggle('badge-error', dto.state === 'manifestError' || dto.state === 'needsConfirm');

	const btn = node.querySelector('.btnAction');
	const label = ACTION_LABEL[dto.state];
	btn.hidden = !label;
	if (label) {
		btn.textContent = label;
		btn.disabled = false;
	}
}

async function onActionClick(dto, btn) {
	btn.disabled = true;
	const originalLabel = btn.textContent;
	btn.textContent = '処理中…';
	try {
		await invoke('trigger_update', {appName: dto.appName, manifestUrl: MANIFEST_URL});
		// ダウンロード取得・自動オープンが完了した。インストール終了（＝再検査で「最新です」に
		// なるまで）をバックグラウンドで見張り、変化のたびにapp-status-changedイベントで
		// このカードが更新される
		invoke('watch_install', {appName: dto.appName, manifestUrl: MANIFEST_URL});
	}
	catch (e) {
		// シンプルな通知に留める（カード内にエラー表示欄を設けるのは次段階の課題）
		alert(`処理に失敗しました：${e}`);
		btn.disabled = false;
		btn.textContent = originalLabel;
	}
}

function renderCard(dto) {
	const tmpl = document.getElementById('tmplCard');
	const node = tmpl.content.firstElementChild.cloneNode(true);
	applyState(node, dto);

	const btn = node.querySelector('.btnAction');
	btn.addEventListener('click', () => onActionClick(dto, btn));

	return node;
}

async function loadApps() {
	const container = document.getElementById('cards');
	const emptyNotice = document.getElementById('emptyNotice');

	container.textContent = '';
	cardNodes.clear();

	let apps;
	try {
		apps = await invoke('list_apps', {manifestUrl: MANIFEST_URL});
	}
	catch (e) {
		emptyNotice.hidden = false;
		emptyNotice.textContent = `確認に失敗しました：${e}`;
		return;
	}

	if (apps.length === 0) {
		emptyNotice.hidden = false;
		emptyNotice.textContent = 'インストール済みのアプリが見つかりませんでした。';
		return;
	}

	emptyNotice.hidden = true;
	for (const dto of apps) {
		const node = renderCard(dto);
		cardNodes.set(dto.appName, node);
		container.appendChild(node);
	}
}

listen('app-status-changed', (event) => {
	const dto = event.payload;
	const node = cardNodes.get(dto.appName);
	if (node) {
		applyState(node, dto);
	}
});

loadApps();
