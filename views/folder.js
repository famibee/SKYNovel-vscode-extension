const vscode = ('acquireVsCodeApi' in window) ?acquireVsCodeApi() :null;

function refresh() {
	// ドラッグ時にマウスカーソルの左上に
	Array.from(document.querySelectorAll('.col > img'))
	.forEach(v=> v.addEventListener('dragstart', e=> {
		e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
	}));
}

document.addEventListener('DOMContentLoaded', ()=> {
	const th_row = document.getElementById('th_row');
	document.getElementById('rd1').onclick = ()=> th_row.classList.value = 'row row-cols-1';
	document.getElementById('rd2').onclick = ()=> th_row.classList.value = 'row row-cols-2';
	document.getElementById('rd3').onclick = ()=> th_row.classList.value = 'row row-cols-3';

	refresh();
});

window.addEventListener('message', e=> {
	if (! e.isTrusted) {
		vscode.postMessage({cmd: 'warn', text: `(tmpwiz.js) isTrusted=false`});
		return;
	}

	const o = e.data.o;
	switch (e.data.cmd) {
		case 'refresh':	refresh();	break;
	}
});
