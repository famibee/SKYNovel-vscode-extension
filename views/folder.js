const vscode = ('acquireVsCodeApi' in window) ?acquireVsCodeApi() :null;

document.addEventListener('DOMContentLoaded', ()=> {
	const th_row = document.getElementById('th_row');
	document.getElementById('rd1').onclick = ()=> th_row.classList.value = 'row row-cols-1';
	document.getElementById('rd2').onclick = ()=> th_row.classList.value = 'row row-cols-2';
	document.getElementById('rd3').onclick = ()=> th_row.classList.value = 'row row-cols-3';
/*
	const root = document.getElementById('root');
	root.addEventListener('dragover', e=> {
console.log('dragover');
		e.preventDefault();
		e.dataTransfer.dropEffect = 'link';
	});
	root.addEventListener('drop', e=> {
console.log(`fn:folder.js line:18 `);
		e.preventDefault();
	});
*/
});

window.addEventListener('message', e=> {
	if (! e.isTrusted) {
		vscode.postMessage({cmd: 'warn', text: `(tmpwiz.js) isTrusted=false`});
		return;
	}

	const o = e.data.o;
	switch (e.data.cmd) {
		case 'refresh':{
			const th_row = document.getElementById('th_row');
			th_row.innerHTML = o.htm || '<h5>（表示できるファイルはありません）</h5>';

			// ドラッグ時にマウスカーソルの左上に
			Array.from(document.querySelectorAll('.col > img'))
			.forEach(v=> v.addEventListener('dragstart', e=> {
				e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
			}));
		}	break;
	}
});
