"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ActivityBar_1 = require("./ActivityBar");
function activate(ctx) { ActivityBar_1.ActivityBar.start(ctx); }
exports.activate = activate;
function deactivate() { ActivityBar_1.ActivityBar.stopActBar(); }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map