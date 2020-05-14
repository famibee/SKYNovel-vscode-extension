"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockRuntime = void 0;
const fs_1 = require("fs");
const events_1 = require("events");
class MockRuntime extends events_1.EventEmitter {
    constructor() {
        super();
        this._currentLine = 0;
        this._breakPoints = new Map();
        this._breakpointId = 1;
        this._breakAddresses = new Set();
    }
    get sourceFile() {
        return this._sourceFile;
    }
    start(program, stopOnEntry) {
        this.loadSource(program);
        this._currentLine = -1;
        this.verifyBreakpoints(this._sourceFile);
        if (stopOnEntry) {
            this.step(false, 'stopOnEntry');
        }
        else {
            this.continue();
        }
    }
    continue(reverse = false) {
        this.run(reverse, undefined);
    }
    step(reverse = false, event = 'stopOnStep') {
        this.run(reverse, event);
    }
    stack(startFrame, endFrame) {
        const words = this._sourceLines[this._currentLine].trim().split(/\s+/);
        const frames = new Array();
        for (let i = startFrame; i < Math.min(endFrame, words.length); i++) {
            const name = words[i];
            frames.push({
                index: i,
                name: `${name}(${i})`,
                file: this._sourceFile,
                line: this._currentLine
            });
        }
        return {
            frames: frames,
            count: words.length
        };
    }
    getBreakpoints(_path, line) {
        const l = this._sourceLines[line];
        let sawSpace = true;
        const bps = [];
        for (let i = 0; i < l.length; i++) {
            if (l[i] !== ' ') {
                if (sawSpace) {
                    bps.push(i);
                    sawSpace = false;
                }
            }
            else {
                sawSpace = true;
            }
        }
        return bps;
    }
    setBreakPoint(path, line) {
        const bp = { verified: false, line, id: this._breakpointId++ };
        let bps = this._breakPoints.get(path);
        if (!bps) {
            bps = new Array();
            this._breakPoints.set(path, bps);
        }
        bps.push(bp);
        this.verifyBreakpoints(path);
        return bp;
    }
    clearBreakPoint(path, line) {
        let bps = this._breakPoints.get(path);
        if (bps) {
            const index = bps.findIndex(bp => bp.line === line);
            if (index >= 0) {
                const bp = bps[index];
                bps.splice(index, 1);
                return bp;
            }
        }
        return undefined;
    }
    clearBreakpoints(path) {
        this._breakPoints.delete(path);
    }
    setDataBreakpoint(address) {
        if (address) {
            this._breakAddresses.add(address);
            return true;
        }
        return false;
    }
    clearAllDataBreakpoints() {
        this._breakAddresses.clear();
    }
    loadSource(file) {
        if (this._sourceFile !== file) {
            this._sourceFile = file;
            this._sourceLines = fs_1.readFileSync(this._sourceFile).toString().split('\n');
        }
    }
    run(reverse = false, stepEvent) {
        if (reverse) {
            for (let ln = this._currentLine - 1; ln >= 0; ln--) {
                if (this.fireEventsForLine(ln, stepEvent)) {
                    this._currentLine = ln;
                    return undefined;
                }
            }
            this._currentLine = 0;
            this.sendEvent('stopOnEntry');
        }
        else {
            for (let ln = this._currentLine + 1; ln < this._sourceLines.length; ln++) {
                if (this.fireEventsForLine(ln, stepEvent)) {
                    this._currentLine = ln;
                    return true;
                }
            }
            this.sendEvent('end');
        }
        return undefined;
    }
    verifyBreakpoints(path) {
        let bps = this._breakPoints.get(path);
        if (bps) {
            this.loadSource(path);
            bps.forEach(bp => {
                if (!bp.verified && bp.line < this._sourceLines.length) {
                    const srcLine = this._sourceLines[bp.line].trim();
                    if (srcLine.length === 0 || srcLine.indexOf('+') === 0) {
                        bp.line++;
                    }
                    if (srcLine.indexOf('-') === 0) {
                        bp.line--;
                    }
                    if (srcLine.indexOf('lazy') < 0) {
                        bp.verified = true;
                        this.sendEvent('breakpointValidated', bp);
                    }
                }
            });
        }
    }
    fireEventsForLine(ln, stepEvent) {
        const line = this._sourceLines[ln].trim();
        const matches = /log\((.*)\)/.exec(line);
        if (matches && matches.length === 2) {
            this.sendEvent('output', matches[1], this._sourceFile, ln, matches.index);
        }
        const words = line.split(" ");
        for (let word of words) {
            if (this._breakAddresses.has(word)) {
                this.sendEvent('stopOnDataBreakpoint');
                return true;
            }
        }
        if (line.indexOf('exception') >= 0) {
            this.sendEvent('stopOnException');
            return true;
        }
        const breakpoints = this._breakPoints.get(this._sourceFile);
        if (breakpoints) {
            const bps = breakpoints.filter(bp => bp.line === ln);
            if (bps.length > 0) {
                this.sendEvent('stopOnBreakpoint');
                if (!bps[0].verified) {
                    bps[0].verified = true;
                    this.sendEvent('breakpointValidated', bps[0]);
                }
                return true;
            }
        }
        if (stepEvent && line.length > 0) {
            this.sendEvent(stepEvent);
            return true;
        }
        return false;
    }
    sendEvent(event, ...args) {
        setImmediate(_ => {
            this.emit(event, ...args);
        });
    }
}
exports.MockRuntime = MockRuntime;
//# sourceMappingURL=mockRuntime.js.map