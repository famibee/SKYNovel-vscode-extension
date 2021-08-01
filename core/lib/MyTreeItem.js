"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyTreeItem = void 0;
const CmnLib_1 = require("./CmnLib");
const vscode_1 = require("vscode");
class MyTreeItem extends vscode_1.TreeItem {
    constructor(cfg, dir, ctx, onClickTreeItemBtn) {
        super(CmnLib_1.is_win && cfg.forMac ? '' : cfg.label);
        this.cfg = cfg;
        this.dir = dir;
        this.ctx = ctx;
        this.onClickTreeItemBtn = onClickTreeItemBtn;
        this._children = [];
        if (CmnLib_1.is_win && cfg.forMac)
            this.description = '（Windowsでは使えません）';
        else {
            this.description = cfg.desc ?? '';
            if (cfg.cmd) {
                const btn_nm = this.contextValue = 'skynovel.dev' + cfg.cmd;
                ctx.subscriptions.push(vscode_1.commands.registerCommand(btn_nm, ti => onClickTreeItemBtn(ti, cfg.cmd, cfg)));
                if (cfg.dbg) {
                    const btn_nm2 = btn_nm + 'Dbg';
                    ctx.subscriptions.push(vscode_1.commands.registerCommand(btn_nm2, ti => onClickTreeItemBtn(ti, cfg.cmd + 'Dbg', cfg)));
                }
            }
        }
        if (cfg.children) {
            this.iconPath = vscode_1.ThemeIcon.Folder;
            this.collapsibleState = vscode_1.TreeItemCollapsibleState.Collapsed;
            this._children = cfg.children.map(cCfg => new MyTreeItem(cCfg, dir, ctx, onClickTreeItemBtn));
        }
        else {
            this.iconPath = CmnLib_1.oIcon(cfg.icon);
            this.collapsibleState = vscode_1.TreeItemCollapsibleState.None;
        }
    }
    get children() { return this._children; }
}
exports.MyTreeItem = MyTreeItem;
//# sourceMappingURL=MyTreeItem.js.map