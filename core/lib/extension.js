"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ActivityBar_1 = require("./ActivityBar");
const vscode_1 = require("vscode");
let edActive;
function activate(context) {
    ActivityBar_1.ActivityBar.start(context);
    edActive = vscode_1.window.activeTextEditor;
    if (edActive)
        trgUpdDeco();
    vscode_1.window.onDidChangeActiveTextEditor(ed => {
        edActive = ed;
        if (ed)
            trgUpdDeco();
    }, null, context.subscriptions);
    vscode_1.workspace.onDidChangeTextDocument(event => {
        if (edActive && event.document === edActive.document)
            trgUpdDeco();
    }, null, context.subscriptions);
}
exports.activate = activate;
function deactivate() { ActivityBar_1.ActivityBar.stopActBar(); }
exports.deactivate = deactivate;
let timeout = null;
function trgUpdDeco() {
    if (timeout)
        clearTimeout(timeout);
    timeout = setTimeout(updDeco, 500);
}
let decChars = {
    aRange: [],
    decorator: vscode_1.window.createTextEditorDecorationType({})
};
function updDeco() {
    if (!edActive)
        return;
    const src = edActive.document.getText();
    vscode_1.window.setStatusBarMessage('');
    decChars.decorator.dispose();
    decChars = {
        aRange: [],
        decorator: vscode_1.window.createTextEditorDecorationType({
            'light': {
                'textDecoration': 'underline',
            },
            'dark': {
                'textDecoration': 'underline',
            }
        })
    };
    const regex = new RegExp('\\s(fn|label)\\=([^\\]\\s]+)', 'g');
    let m;
    while (m = regex.exec(src)) {
        const lenVar = m[1].length;
        decChars.aRange.push(new vscode_1.Range(edActive.document.positionAt(m.index + lenVar + 2), edActive.document.positionAt(m.index + lenVar + 2 + m[2].length)));
    }
    edActive.setDecorations(decChars.decorator, decChars.aRange);
}
//# sourceMappingURL=extension.js.map