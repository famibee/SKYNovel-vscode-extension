document.addEventListener('DOMContentLoaded', ()=> {
	// ドラッグ出来るアイテムの設定
	Array.from(document.querySelectorAll('button[draggable="true"]'))
	.forEach(elm=> {
		elm.addEventListener('dragstart', e=> {
			e.dataTransfer.setData('from', 'toolbox');
			e.dataTransfer.setData('id', e.target.id);
			e.dataTransfer.setData('scr', decodeURIComponent(e.target.dataset.scr));
		});
	});
});
