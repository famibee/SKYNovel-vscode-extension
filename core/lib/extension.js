"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const ActivityBar_1 = require("./ActivityBar");
function activate(ctx) { ActivityBar_1.ActivityBar.start(ctx); }
exports.activate = activate;
function deactivate() { ActivityBar_1.ActivityBar.stop(); }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map