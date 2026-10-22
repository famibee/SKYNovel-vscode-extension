'use strict';

// カードUI雛形（ダミーデータ）。実データ配線（inspect_app等のinvoke呼び出し）は次段階で行う。
// 状態遷移の表は src/docs/legacy-app-patch.md 「カードの状態遷移」参照。

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

const DUMMY_APPS = [
	{name: 'MyGameA', version: '1.2.0', state: 'checking'},
	{name: 'MyGameB', version: '1.0.3', state: 'upToDate'},
	{name: 'MyGameC', version: '1.0.0', state: 'updateAvailable'},
	{name: 'MyGameD', version: '1.1.0', state: 'archMigration'},
	{name: 'MyGameE', version: '?', state: 'needsConfirm'},
	{name: 'MyGameF', version: '0.9.5', state: 'manifestError'},
];

function renderCard(app) {
	const tmpl = document.getElementById('tmplCard');
	const node = tmpl.content.firstElementChild.cloneNode(true);

	node.dataset.state = app.state;
	node.querySelector('.app-card-name').textContent = app.name;
	node.querySelector('.app-card-version').textContent = `現在: ${app.version}`;

	const spinner = node.querySelector('.spinner');
	const badge = node.querySelector('.statusBadge');
	spinner.hidden = app.state !== 'checking';
	badge.hidden = app.state === 'checking';
	badge.textContent = STATUS_LABEL[app.state] ?? '';
	badge.classList.toggle('badge-ok', app.state === 'upToDate');
	badge.classList.toggle('badge-warn', app.state === 'updateAvailable' || app.state === 'archMigration');
	badge.classList.toggle('badge-error', app.state === 'manifestError' || app.state === 'needsConfirm');

	const btn = node.querySelector('.btnAction');
	const label = ACTION_LABEL[app.state];
	if (label) {
		btn.hidden = false;
		btn.textContent = label;
		btn.addEventListener('click', () => {
			// ダミーデータのためクリックしても何も起きない（次段階でinvokeに接続）
		});
	}

	return node;
}

function render() {
	const container = document.getElementById('cards');
	const emptyNotice = document.getElementById('emptyNotice');

	container.textContent = '';
	if (DUMMY_APPS.length === 0) {
		emptyNotice.hidden = false;
		return;
	}
	emptyNotice.hidden = true;
	for (const app of DUMMY_APPS) {
		container.appendChild(renderCard(app));
	}
}

render();
