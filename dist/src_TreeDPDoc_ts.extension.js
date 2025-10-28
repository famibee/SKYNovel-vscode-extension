"use strict";
exports.id = "src_TreeDPDoc_ts";
exports.ids = ["src_TreeDPDoc_ts"];
exports.modules = {

/***/ "./src/TreeDPDoc.ts":
/*!**************************!*\
  !*** ./src/TreeDPDoc.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TreeDPDoc: () => (/* binding */ TreeDPDoc)
/* harmony export */ });
/* harmony import */ var _ActivityBar__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ActivityBar */ "./src/ActivityBar.ts");
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! vscode */ "vscode");
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_1__);


class TreeDPDoc {
    ctx;
    #aTreeTmp = [
        { label: '開発者向け情報', icon: 'document',
            url: 'https://famibee.github.io/SKYNovel/dev.html' },
        { label: 'タグリファレンス', icon: 'document',
            url: 'https://famibee.github.io/SKYNovel/tag.html' },
        { label: 'マクロ・プラグインリファレンス', icon: 'document',
            url: 'https://famibee.github.io/SKYNovel/macro_plg.html' },
        { label: '機能ギャラリー', icon: 'document',
            url: 'https://famibee.github.io/SKYNovel_gallery/' },
        { label: 'famibee  連絡先', children: [
                { label: 'famibee blog', icon: 'document', url: 'https://famibee.blog.fc2.com/' },
                { label: 'famibee Mail', icon: 'mail', url: 'mailto:famibee@gmail.com' },
                { label: 'famibee Twitter', icon: 'twitter', url: 'https://twitter.com/famibee' },
            ] },
        { label: 'オススメVSCode拡張機能', children: [
                { label: '日本語化', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja' },
                { label: 'Material Icon Theme', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme' },
                { label: 'Bookmarks', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=alefragnani.Bookmarks' },
                { label: 'HTML Preview', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=tht13.html-preview-vscode' },
                { label: 'HTMLHint', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=mkaufman.HTMLHint' },
                { label: 'Live Server', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer' },
                { label: 'glTF Tools', icon: 'gear', url: 'https://marketplace.visualstudio.com/items?itemName=cesium.gltf-vscode' },
            ] },
    ];
    #aTiRoot;
    constructor(ctx) {
        this.ctx = ctx;
        this.#aTiRoot = this.#generate('doc', this.#aTreeTmp);
    }
    #generate(parent, aTi) {
        return aTi.map((o, idx) => {
            const id = (parent === 'doc' ? 'skynovel.' : '') + `${parent}/${idx}`;
            const t = new vscode__WEBPACK_IMPORTED_MODULE_1__.TreeItem(o.label);
            t.contextValue = id;
            if (o.children) {
                t.iconPath = vscode__WEBPACK_IMPORTED_MODULE_1__.ThemeIcon.Folder;
                t.collapsibleState = vscode__WEBPACK_IMPORTED_MODULE_1__.TreeItemCollapsibleState.Collapsed;
            }
            else
                t.iconPath = o.icon ? (0,_ActivityBar__WEBPACK_IMPORTED_MODULE_0__.oIcon)(o.icon) : vscode__WEBPACK_IMPORTED_MODULE_1__.ThemeIcon.File;
            if (o.url)
                this.ctx.subscriptions.push(vscode__WEBPACK_IMPORTED_MODULE_1__.commands.registerCommand(id, () => vscode__WEBPACK_IMPORTED_MODULE_1__.env.openExternal(vscode__WEBPACK_IMPORTED_MODULE_1__.Uri.parse(o.url))));
            return t;
        });
    }
    getTreeItem = (t) => t;
    getChildren(t) {
        if (!t)
            return this.#aTiRoot;
        const aTi = this.#aTreeTmp.find(v => v.label === t.label);
        return aTi?.children ? this.#generate(t.contextValue, aTi.children) : [];
    }
}


/***/ })

};
;