"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyzeTagArg = void 0;
;
;
class AnalyzeTagArg {
    constructor() {
        this.REG_TAGARG = /;[^\n]*|(?<key>\w+)(?:\s|;[^\n]*\n)*=(?:\s|;[^\n]*\n)*(?:(?<val>[^\s"'#|;]+)|(["'#])(?<val2>.*?)\3)(?:\|(?:(?<def>[^\s"'#;]+)|(["'#])(?<def2>.*?)\6))?|(?<literal>[^\s;]+)/g;
        this.$hPrm = {};
        this.$isKomeParam = false;
    }
    go(args) {
        this.$hPrm = {};
        this.$isKomeParam = false;
        if (!args)
            return;
        let e = null;
        while (e = this.REG_TAGARG.exec(args)) {
            const g = e?.groups;
            if (!g)
                continue;
            if (g.key)
                this.$hPrm[g.key] = {
                    val: g.val ?? g.val2,
                    def: g.def ?? g.def2
                };
            else if (g.literal) {
                if (g.literal === '*')
                    this.$isKomeParam = true;
                else
                    this.$hPrm[g.literal] = { val: '1' };
            }
        }
    }
    get hPrm() { return this.$hPrm; }
    get isKomeParam() { return this.$isKomeParam; }
}
exports.AnalyzeTagArg = AnalyzeTagArg;
//# sourceMappingURL=AnalyzeTagArg.js.map