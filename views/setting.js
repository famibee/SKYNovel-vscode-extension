/**
 * Make a map and return a function for checking if a key
 * is in that map.
 * IMPORTANT: all calls of this function must be prefixed with
 * \/\*#\_\_PURE\_\_\*\/
 * So that rollup can tree-shake them if necessary.
 */
function makeMap(str, expectsLowerCase) {
    const map = Object.create(null);
    const list = str.split(',');
    for (let i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val];
}

function normalizeStyle(value) {
    if (isArray(value)) {
        const res = {};
        for (let i = 0; i < value.length; i++) {
            const item = value[i];
            const normalized = isString(item)
                ? parseStringStyle(item)
                : normalizeStyle(item);
            if (normalized) {
                for (const key in normalized) {
                    res[key] = normalized[key];
                }
            }
        }
        return res;
    }
    else if (isString(value)) {
        return value;
    }
    else if (isObject$1(value)) {
        return value;
    }
}
const listDelimiterRE = /;(?![^(]*\))/g;
const propertyDelimiterRE = /:([^]+)/;
const styleCommentRE = /\/\*.*?\*\//gs;
function parseStringStyle(cssText) {
    const ret = {};
    cssText
        .replace(styleCommentRE, '')
        .split(listDelimiterRE)
        .forEach(item => {
        if (item) {
            const tmp = item.split(propertyDelimiterRE);
            tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim());
        }
    });
    return ret;
}
function normalizeClass(value) {
    let res = '';
    if (isString(value)) {
        res = value;
    }
    else if (isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const normalized = normalizeClass(value[i]);
            if (normalized) {
                res += normalized + ' ';
            }
        }
    }
    else if (isObject$1(value)) {
        for (const name in value) {
            if (value[name]) {
                res += name + ' ';
            }
        }
    }
    return res.trim();
}

/**
 * On the client we only need to offer special cases for boolean attributes that
 * have different names from their corresponding dom properties:
 * - itemscope -> N/A
 * - allowfullscreen -> allowFullscreen
 * - formnovalidate -> formNoValidate
 * - ismap -> isMap
 * - nomodule -> noModule
 * - novalidate -> noValidate
 * - readonly -> readOnly
 */
const specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`;
const isSpecialBooleanAttr = /*#__PURE__*/ makeMap(specialBooleanAttrs);
/**
 * Boolean attributes should be included if the value is truthy or ''.
 * e.g. `<select multiple>` compiles to `{ multiple: '' }`
 */
function includeBooleanAttr(value) {
    return !!value || value === '';
}

function looseCompareArrays(a, b) {
    if (a.length !== b.length)
        return false;
    let equal = true;
    for (let i = 0; equal && i < a.length; i++) {
        equal = looseEqual(a[i], b[i]);
    }
    return equal;
}
function looseEqual(a, b) {
    if (a === b)
        return true;
    let aValidType = isDate$1(a);
    let bValidType = isDate$1(b);
    if (aValidType || bValidType) {
        return aValidType && bValidType ? a.getTime() === b.getTime() : false;
    }
    aValidType = isSymbol(a);
    bValidType = isSymbol(b);
    if (aValidType || bValidType) {
        return a === b;
    }
    aValidType = isArray(a);
    bValidType = isArray(b);
    if (aValidType || bValidType) {
        return aValidType && bValidType ? looseCompareArrays(a, b) : false;
    }
    aValidType = isObject$1(a);
    bValidType = isObject$1(b);
    if (aValidType || bValidType) {
        /* istanbul ignore if: this if will probably never be called */
        if (!aValidType || !bValidType) {
            return false;
        }
        const aKeysCount = Object.keys(a).length;
        const bKeysCount = Object.keys(b).length;
        if (aKeysCount !== bKeysCount) {
            return false;
        }
        for (const key in a) {
            const aHasKey = a.hasOwnProperty(key);
            const bHasKey = b.hasOwnProperty(key);
            if ((aHasKey && !bHasKey) ||
                (!aHasKey && bHasKey) ||
                !looseEqual(a[key], b[key])) {
                return false;
            }
        }
    }
    return String(a) === String(b);
}
function looseIndexOf(arr, val) {
    return arr.findIndex(item => looseEqual(item, val));
}

/**
 * For converting {{ interpolation }} values to displayed strings.
 * @private
 */
const toDisplayString = (val) => {
    return isString(val)
        ? val
        : val == null
            ? ''
            : isArray(val) ||
                (isObject$1(val) &&
                    (val.toString === objectToString || !isFunction(val.toString)))
                ? JSON.stringify(val, replacer, 2)
                : String(val);
};
const replacer = (_key, val) => {
    // can't use isRef here since @vue/shared has no deps
    if (val && val.__v_isRef) {
        return replacer(_key, val.value);
    }
    else if (isMap(val)) {
        return {
            [`Map(${val.size})`]: [...val.entries()].reduce((entries, [key, val]) => {
                entries[`${key} =>`] = val;
                return entries;
            }, {})
        };
    }
    else if (isSet(val)) {
        return {
            [`Set(${val.size})`]: [...val.values()]
        };
    }
    else if (isObject$1(val) && !isArray(val) && !isPlainObject$1(val)) {
        return String(val);
    }
    return val;
};

const EMPTY_OBJ = {};
const EMPTY_ARR = [];
const NOOP = () => { };
/**
 * Always return false.
 */
const NO = () => false;
const onRE = /^on[^a-z]/;
const isOn = (key) => onRE.test(key);
const isModelListener = (key) => key.startsWith('onUpdate:');
const extend = Object.assign;
const remove = (arr, el) => {
    const i = arr.indexOf(el);
    if (i > -1) {
        arr.splice(i, 1);
    }
};
const hasOwnProperty$1 = Object.prototype.hasOwnProperty;
const hasOwn = (val, key) => hasOwnProperty$1.call(val, key);
const isArray = Array.isArray;
const isMap = (val) => toTypeString(val) === '[object Map]';
const isSet = (val) => toTypeString(val) === '[object Set]';
const isDate$1 = (val) => toTypeString(val) === '[object Date]';
const isFunction = (val) => typeof val === 'function';
const isString = (val) => typeof val === 'string';
const isSymbol = (val) => typeof val === 'symbol';
const isObject$1 = (val) => val !== null && typeof val === 'object';
const isPromise = (val) => {
    return isObject$1(val) && isFunction(val.then) && isFunction(val.catch);
};
const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);
const toRawType = (value) => {
    // extract "RawType" from strings like "[object RawType]"
    return toTypeString(value).slice(8, -1);
};
const isPlainObject$1 = (val) => toTypeString(val) === '[object Object]';
const isIntegerKey = (key) => isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key;
const isReservedProp = /*#__PURE__*/ makeMap(
// the leading comma is intentional so empty string "" is also included
',key,ref,ref_for,ref_key,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted');
const cacheStringFunction = (fn) => {
    const cache = Object.create(null);
    return ((str) => {
        const hit = cache[str];
        return hit || (cache[str] = fn(str));
    });
};
const camelizeRE = /-(\w)/g;
/**
 * @private
 */
const camelize = cacheStringFunction((str) => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
});
const hyphenateRE = /\B([A-Z])/g;
/**
 * @private
 */
const hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, '-$1').toLowerCase());
/**
 * @private
 */
const capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
/**
 * @private
 */
const toHandlerKey = cacheStringFunction((str) => str ? `on${capitalize(str)}` : ``);
// compare whether a value has changed, accounting for NaN.
const hasChanged = (value, oldValue) => !Object.is(value, oldValue);
const invokeArrayFns = (fns, arg) => {
    for (let i = 0; i < fns.length; i++) {
        fns[i](arg);
    }
};
const def = (obj, key, value) => {
    Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: false,
        value
    });
};
/**
 * "123-foo" will be parsed to 123
 * This is used for the .number modifier in v-model
 */
const looseToNumber = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? val : n;
};
let _globalThis;
const getGlobalThis = () => {
    return (_globalThis ||
        (_globalThis =
            typeof globalThis !== 'undefined'
                ? globalThis
                : typeof self !== 'undefined'
                    ? self
                    : typeof window !== 'undefined'
                        ? window
                        : typeof global !== 'undefined'
                            ? global
                            : {}));
};

let activeEffectScope;
class EffectScope {
    constructor(detached = false) {
        this.detached = detached;
        /**
         * @internal
         */
        this._active = true;
        /**
         * @internal
         */
        this.effects = [];
        /**
         * @internal
         */
        this.cleanups = [];
        this.parent = activeEffectScope;
        if (!detached && activeEffectScope) {
            this.index =
                (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(this) - 1;
        }
    }
    get active() {
        return this._active;
    }
    run(fn) {
        if (this._active) {
            const currentEffectScope = activeEffectScope;
            try {
                activeEffectScope = this;
                return fn();
            }
            finally {
                activeEffectScope = currentEffectScope;
            }
        }
    }
    /**
     * This should only be called on non-detached scopes
     * @internal
     */
    on() {
        activeEffectScope = this;
    }
    /**
     * This should only be called on non-detached scopes
     * @internal
     */
    off() {
        activeEffectScope = this.parent;
    }
    stop(fromParent) {
        if (this._active) {
            let i, l;
            for (i = 0, l = this.effects.length; i < l; i++) {
                this.effects[i].stop();
            }
            for (i = 0, l = this.cleanups.length; i < l; i++) {
                this.cleanups[i]();
            }
            if (this.scopes) {
                for (i = 0, l = this.scopes.length; i < l; i++) {
                    this.scopes[i].stop(true);
                }
            }
            // nested scope, dereference from parent to avoid memory leaks
            if (!this.detached && this.parent && !fromParent) {
                // optimized O(1) removal
                const last = this.parent.scopes.pop();
                if (last && last !== this) {
                    this.parent.scopes[this.index] = last;
                    last.index = this.index;
                }
            }
            this.parent = undefined;
            this._active = false;
        }
    }
}
function effectScope(detached) {
    return new EffectScope(detached);
}
function recordEffectScope(effect, scope = activeEffectScope) {
    if (scope && scope.active) {
        scope.effects.push(effect);
    }
}
function getCurrentScope() {
    return activeEffectScope;
}
function onScopeDispose(fn) {
    if (activeEffectScope) {
        activeEffectScope.cleanups.push(fn);
    }
}

const createDep = (effects) => {
    const dep = new Set(effects);
    dep.w = 0;
    dep.n = 0;
    return dep;
};
const wasTracked = (dep) => (dep.w & trackOpBit) > 0;
const newTracked = (dep) => (dep.n & trackOpBit) > 0;
const initDepMarkers = ({ deps }) => {
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].w |= trackOpBit; // set was tracked
        }
    }
};
const finalizeDepMarkers = (effect) => {
    const { deps } = effect;
    if (deps.length) {
        let ptr = 0;
        for (let i = 0; i < deps.length; i++) {
            const dep = deps[i];
            if (wasTracked(dep) && !newTracked(dep)) {
                dep.delete(effect);
            }
            else {
                deps[ptr++] = dep;
            }
            // clear bits
            dep.w &= ~trackOpBit;
            dep.n &= ~trackOpBit;
        }
        deps.length = ptr;
    }
};

const targetMap = new WeakMap();
// The number of effects currently being tracked recursively.
let effectTrackDepth = 0;
let trackOpBit = 1;
/**
 * The bitwise track markers support at most 30 levels of recursion.
 * This value is chosen to enable modern JS engines to use a SMI on all platforms.
 * When recursion depth is greater, fall back to using a full cleanup.
 */
const maxMarkerBits = 30;
let activeEffect;
const ITERATE_KEY = Symbol('');
const MAP_KEY_ITERATE_KEY = Symbol('');
class ReactiveEffect {
    constructor(fn, scheduler = null, scope) {
        this.fn = fn;
        this.scheduler = scheduler;
        this.active = true;
        this.deps = [];
        this.parent = undefined;
        recordEffectScope(this, scope);
    }
    run() {
        if (!this.active) {
            return this.fn();
        }
        let parent = activeEffect;
        let lastShouldTrack = shouldTrack;
        while (parent) {
            if (parent === this) {
                return;
            }
            parent = parent.parent;
        }
        try {
            this.parent = activeEffect;
            activeEffect = this;
            shouldTrack = true;
            trackOpBit = 1 << ++effectTrackDepth;
            if (effectTrackDepth <= maxMarkerBits) {
                initDepMarkers(this);
            }
            else {
                cleanupEffect(this);
            }
            return this.fn();
        }
        finally {
            if (effectTrackDepth <= maxMarkerBits) {
                finalizeDepMarkers(this);
            }
            trackOpBit = 1 << --effectTrackDepth;
            activeEffect = this.parent;
            shouldTrack = lastShouldTrack;
            this.parent = undefined;
            if (this.deferStop) {
                this.stop();
            }
        }
    }
    stop() {
        // stopped while running itself - defer the cleanup
        if (activeEffect === this) {
            this.deferStop = true;
        }
        else if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    const { deps } = effect;
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].delete(effect);
        }
        deps.length = 0;
    }
}
let shouldTrack = true;
const trackStack = [];
function pauseTracking() {
    trackStack.push(shouldTrack);
    shouldTrack = false;
}
function resetTracking() {
    const last = trackStack.pop();
    shouldTrack = last === undefined ? true : last;
}
function track(target, type, key) {
    if (shouldTrack && activeEffect) {
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }
        let dep = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, (dep = createDep()));
        }
        trackEffects(dep);
    }
}
function trackEffects(dep, debuggerEventExtraInfo) {
    let shouldTrack = false;
    if (effectTrackDepth <= maxMarkerBits) {
        if (!newTracked(dep)) {
            dep.n |= trackOpBit; // set newly tracked
            shouldTrack = !wasTracked(dep);
        }
    }
    else {
        // Full cleanup mode.
        shouldTrack = !dep.has(activeEffect);
    }
    if (shouldTrack) {
        dep.add(activeEffect);
        activeEffect.deps.push(dep);
    }
}
function trigger(target, type, key, newValue, oldValue, oldTarget) {
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        // never been tracked
        return;
    }
    let deps = [];
    if (type === "clear" /* TriggerOpTypes.CLEAR */) {
        // collection being cleared
        // trigger all effects for target
        deps = [...depsMap.values()];
    }
    else if (key === 'length' && isArray(target)) {
        const newLength = Number(newValue);
        depsMap.forEach((dep, key) => {
            if (key === 'length' || key >= newLength) {
                deps.push(dep);
            }
        });
    }
    else {
        // schedule runs for SET | ADD | DELETE
        if (key !== void 0) {
            deps.push(depsMap.get(key));
        }
        // also run for iteration key on ADD | DELETE | Map.SET
        switch (type) {
            case "add" /* TriggerOpTypes.ADD */:
                if (!isArray(target)) {
                    deps.push(depsMap.get(ITERATE_KEY));
                    if (isMap(target)) {
                        deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
                    }
                }
                else if (isIntegerKey(key)) {
                    // new index added to array -> length changes
                    deps.push(depsMap.get('length'));
                }
                break;
            case "delete" /* TriggerOpTypes.DELETE */:
                if (!isArray(target)) {
                    deps.push(depsMap.get(ITERATE_KEY));
                    if (isMap(target)) {
                        deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
                    }
                }
                break;
            case "set" /* TriggerOpTypes.SET */:
                if (isMap(target)) {
                    deps.push(depsMap.get(ITERATE_KEY));
                }
                break;
        }
    }
    if (deps.length === 1) {
        if (deps[0]) {
            {
                triggerEffects(deps[0]);
            }
        }
    }
    else {
        const effects = [];
        for (const dep of deps) {
            if (dep) {
                effects.push(...dep);
            }
        }
        {
            triggerEffects(createDep(effects));
        }
    }
}
function triggerEffects(dep, debuggerEventExtraInfo) {
    // spread into array for stabilization
    const effects = isArray(dep) ? dep : [...dep];
    for (const effect of effects) {
        if (effect.computed) {
            triggerEffect(effect);
        }
    }
    for (const effect of effects) {
        if (!effect.computed) {
            triggerEffect(effect);
        }
    }
}
function triggerEffect(effect, debuggerEventExtraInfo) {
    if (effect !== activeEffect || effect.allowRecurse) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function getDepFromReactive(object, key) {
    var _a;
    return (_a = targetMap.get(object)) === null || _a === void 0 ? void 0 : _a.get(key);
}

const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`);
const builtInSymbols = new Set(
/*#__PURE__*/
Object.getOwnPropertyNames(Symbol)
    // ios10.x Object.getOwnPropertyNames(Symbol) can enumerate 'arguments' and 'caller'
    // but accessing them on Symbol leads to TypeError because Symbol is a strict mode
    // function
    .filter(key => key !== 'arguments' && key !== 'caller')
    .map(key => Symbol[key])
    .filter(isSymbol));
const get$1 = /*#__PURE__*/ createGetter();
const shallowGet = /*#__PURE__*/ createGetter(false, true);
const readonlyGet = /*#__PURE__*/ createGetter(true);
const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations();
function createArrayInstrumentations() {
    const instrumentations = {};
    ['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
        instrumentations[key] = function (...args) {
            const arr = toRaw(this);
            for (let i = 0, l = this.length; i < l; i++) {
                track(arr, "get" /* TrackOpTypes.GET */, i + '');
            }
            // we run the method using the original args first (which may be reactive)
            const res = arr[key](...args);
            if (res === -1 || res === false) {
                // if that didn't work, run it again using raw values.
                return arr[key](...args.map(toRaw));
            }
            else {
                return res;
            }
        };
    });
    ['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
        instrumentations[key] = function (...args) {
            pauseTracking();
            const res = toRaw(this)[key].apply(this, args);
            resetTracking();
            return res;
        };
    });
    return instrumentations;
}
function hasOwnProperty(key) {
    const obj = toRaw(this);
    track(obj, "has" /* TrackOpTypes.HAS */, key);
    return obj.hasOwnProperty(key);
}
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        else if (key === "__v_isShallow" /* ReactiveFlags.IS_SHALLOW */) {
            return shallow;
        }
        else if (key === "__v_raw" /* ReactiveFlags.RAW */ &&
            receiver ===
                (isReadonly
                    ? shallow
                        ? shallowReadonlyMap
                        : readonlyMap
                    : shallow
                        ? shallowReactiveMap
                        : reactiveMap).get(target)) {
            return target;
        }
        const targetIsArray = isArray(target);
        if (!isReadonly) {
            if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
                return Reflect.get(arrayInstrumentations, key, receiver);
            }
            if (key === 'hasOwnProperty') {
                return hasOwnProperty;
            }
        }
        const res = Reflect.get(target, key, receiver);
        if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
            return res;
        }
        if (!isReadonly) {
            track(target, "get" /* TrackOpTypes.GET */, key);
        }
        if (shallow) {
            return res;
        }
        if (isRef(res)) {
            // ref unwrapping - skip unwrap for Array + integer key.
            return targetIsArray && isIntegerKey(key) ? res : res.value;
        }
        if (isObject$1(res)) {
            // Convert returned value into a proxy as well. we do the isObject check
            // here to avoid invalid value warning. Also need to lazy access readonly
            // and reactive here to avoid circular dependency.
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
const set$1 = /*#__PURE__*/ createSetter();
const shallowSet = /*#__PURE__*/ createSetter(true);
function createSetter(shallow = false) {
    return function set(target, key, value, receiver) {
        let oldValue = target[key];
        if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
            return false;
        }
        if (!shallow) {
            if (!isShallow(value) && !isReadonly(value)) {
                oldValue = toRaw(oldValue);
                value = toRaw(value);
            }
            if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
                oldValue.value = value;
                return true;
            }
        }
        const hadKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key);
        const result = Reflect.set(target, key, value, receiver);
        // don't trigger if target is something up in the prototype chain of original
        if (target === toRaw(receiver)) {
            if (!hadKey) {
                trigger(target, "add" /* TriggerOpTypes.ADD */, key, value);
            }
            else if (hasChanged(value, oldValue)) {
                trigger(target, "set" /* TriggerOpTypes.SET */, key, value);
            }
        }
        return result;
    };
}
function deleteProperty(target, key) {
    const hadKey = hasOwn(target, key);
    target[key];
    const result = Reflect.deleteProperty(target, key);
    if (result && hadKey) {
        trigger(target, "delete" /* TriggerOpTypes.DELETE */, key, undefined);
    }
    return result;
}
function has$1(target, key) {
    const result = Reflect.has(target, key);
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
        track(target, "has" /* TrackOpTypes.HAS */, key);
    }
    return result;
}
function ownKeys(target) {
    track(target, "iterate" /* TrackOpTypes.ITERATE */, isArray(target) ? 'length' : ITERATE_KEY);
    return Reflect.ownKeys(target);
}
const mutableHandlers = {
    get: get$1,
    set: set$1,
    deleteProperty,
    has: has$1,
    ownKeys
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
        return true;
    },
    deleteProperty(target, key) {
        return true;
    }
};
const shallowReactiveHandlers = /*#__PURE__*/ extend({}, mutableHandlers, {
    get: shallowGet,
    set: shallowSet
});

const toShallow = (value) => value;
const getProto = (v) => Reflect.getPrototypeOf(v);
function get(target, key, isReadonly = false, isShallow = false) {
    // #1772: readonly(reactive(Map)) should return readonly + reactive version
    // of the value
    target = target["__v_raw" /* ReactiveFlags.RAW */];
    const rawTarget = toRaw(target);
    const rawKey = toRaw(key);
    if (!isReadonly) {
        if (key !== rawKey) {
            track(rawTarget, "get" /* TrackOpTypes.GET */, key);
        }
        track(rawTarget, "get" /* TrackOpTypes.GET */, rawKey);
    }
    const { has } = getProto(rawTarget);
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    if (has.call(rawTarget, key)) {
        return wrap(target.get(key));
    }
    else if (has.call(rawTarget, rawKey)) {
        return wrap(target.get(rawKey));
    }
    else if (target !== rawTarget) {
        // #3602 readonly(reactive(Map))
        // ensure that the nested reactive `Map` can do tracking for itself
        target.get(key);
    }
}
function has(key, isReadonly = false) {
    const target = this["__v_raw" /* ReactiveFlags.RAW */];
    const rawTarget = toRaw(target);
    const rawKey = toRaw(key);
    if (!isReadonly) {
        if (key !== rawKey) {
            track(rawTarget, "has" /* TrackOpTypes.HAS */, key);
        }
        track(rawTarget, "has" /* TrackOpTypes.HAS */, rawKey);
    }
    return key === rawKey
        ? target.has(key)
        : target.has(key) || target.has(rawKey);
}
function size(target, isReadonly = false) {
    target = target["__v_raw" /* ReactiveFlags.RAW */];
    !isReadonly && track(toRaw(target), "iterate" /* TrackOpTypes.ITERATE */, ITERATE_KEY);
    return Reflect.get(target, 'size', target);
}
function add(value) {
    value = toRaw(value);
    const target = toRaw(this);
    const proto = getProto(target);
    const hadKey = proto.has.call(target, value);
    if (!hadKey) {
        target.add(value);
        trigger(target, "add" /* TriggerOpTypes.ADD */, value, value);
    }
    return this;
}
function set$2(key, value) {
    value = toRaw(value);
    const target = toRaw(this);
    const { has, get } = getProto(target);
    let hadKey = has.call(target, key);
    if (!hadKey) {
        key = toRaw(key);
        hadKey = has.call(target, key);
    }
    const oldValue = get.call(target, key);
    target.set(key, value);
    if (!hadKey) {
        trigger(target, "add" /* TriggerOpTypes.ADD */, key, value);
    }
    else if (hasChanged(value, oldValue)) {
        trigger(target, "set" /* TriggerOpTypes.SET */, key, value);
    }
    return this;
}
function deleteEntry(key) {
    const target = toRaw(this);
    const { has, get } = getProto(target);
    let hadKey = has.call(target, key);
    if (!hadKey) {
        key = toRaw(key);
        hadKey = has.call(target, key);
    }
    get ? get.call(target, key) : undefined;
    // forward the operation before queueing reactions
    const result = target.delete(key);
    if (hadKey) {
        trigger(target, "delete" /* TriggerOpTypes.DELETE */, key, undefined);
    }
    return result;
}
function clear() {
    const target = toRaw(this);
    const hadItems = target.size !== 0;
    // forward the operation before queueing reactions
    const result = target.clear();
    if (hadItems) {
        trigger(target, "clear" /* TriggerOpTypes.CLEAR */, undefined, undefined);
    }
    return result;
}
function createForEach(isReadonly, isShallow) {
    return function forEach(callback, thisArg) {
        const observed = this;
        const target = observed["__v_raw" /* ReactiveFlags.RAW */];
        const rawTarget = toRaw(target);
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
        !isReadonly && track(rawTarget, "iterate" /* TrackOpTypes.ITERATE */, ITERATE_KEY);
        return target.forEach((value, key) => {
            // important: make sure the callback is
            // 1. invoked with the reactive map as `this` and 3rd arg
            // 2. the value received should be a corresponding reactive/readonly.
            return callback.call(thisArg, wrap(value), wrap(key), observed);
        });
    };
}
function createIterableMethod(method, isReadonly, isShallow) {
    return function (...args) {
        const target = this["__v_raw" /* ReactiveFlags.RAW */];
        const rawTarget = toRaw(target);
        const targetIsMap = isMap(rawTarget);
        const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap);
        const isKeyOnly = method === 'keys' && targetIsMap;
        const innerIterator = target[method](...args);
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
        !isReadonly &&
            track(rawTarget, "iterate" /* TrackOpTypes.ITERATE */, isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
        // return a wrapped iterator which returns observed versions of the
        // values emitted from the real iterator
        return {
            // iterator protocol
            next() {
                const { value, done } = innerIterator.next();
                return done
                    ? { value, done }
                    : {
                        value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
                        done
                    };
            },
            // iterable protocol
            [Symbol.iterator]() {
                return this;
            }
        };
    };
}
function createReadonlyMethod(type) {
    return function (...args) {
        return type === "delete" /* TriggerOpTypes.DELETE */ ? false : this;
    };
}
function createInstrumentations() {
    const mutableInstrumentations = {
        get(key) {
            return get(this, key);
        },
        get size() {
            return size(this);
        },
        has,
        add,
        set: set$2,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, false)
    };
    const shallowInstrumentations = {
        get(key) {
            return get(this, key, false, true);
        },
        get size() {
            return size(this);
        },
        has,
        add,
        set: set$2,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, true)
    };
    const readonlyInstrumentations = {
        get(key) {
            return get(this, key, true);
        },
        get size() {
            return size(this, true);
        },
        has(key) {
            return has.call(this, key, true);
        },
        add: createReadonlyMethod("add" /* TriggerOpTypes.ADD */),
        set: createReadonlyMethod("set" /* TriggerOpTypes.SET */),
        delete: createReadonlyMethod("delete" /* TriggerOpTypes.DELETE */),
        clear: createReadonlyMethod("clear" /* TriggerOpTypes.CLEAR */),
        forEach: createForEach(true, false)
    };
    const shallowReadonlyInstrumentations = {
        get(key) {
            return get(this, key, true, true);
        },
        get size() {
            return size(this, true);
        },
        has(key) {
            return has.call(this, key, true);
        },
        add: createReadonlyMethod("add" /* TriggerOpTypes.ADD */),
        set: createReadonlyMethod("set" /* TriggerOpTypes.SET */),
        delete: createReadonlyMethod("delete" /* TriggerOpTypes.DELETE */),
        clear: createReadonlyMethod("clear" /* TriggerOpTypes.CLEAR */),
        forEach: createForEach(true, true)
    };
    const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator];
    iteratorMethods.forEach(method => {
        mutableInstrumentations[method] = createIterableMethod(method, false, false);
        readonlyInstrumentations[method] = createIterableMethod(method, true, false);
        shallowInstrumentations[method] = createIterableMethod(method, false, true);
        shallowReadonlyInstrumentations[method] = createIterableMethod(method, true, true);
    });
    return [
        mutableInstrumentations,
        readonlyInstrumentations,
        shallowInstrumentations,
        shallowReadonlyInstrumentations
    ];
}
const [mutableInstrumentations, readonlyInstrumentations, shallowInstrumentations, shallowReadonlyInstrumentations] = /* #__PURE__*/ createInstrumentations();
function createInstrumentationGetter(isReadonly, shallow) {
    const instrumentations = shallow
        ? isReadonly
            ? shallowReadonlyInstrumentations
            : shallowInstrumentations
        : isReadonly
            ? readonlyInstrumentations
            : mutableInstrumentations;
    return (target, key, receiver) => {
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        else if (key === "__v_raw" /* ReactiveFlags.RAW */) {
            return target;
        }
        return Reflect.get(hasOwn(instrumentations, key) && key in target
            ? instrumentations
            : target, key, receiver);
    };
}
const mutableCollectionHandlers = {
    get: /*#__PURE__*/ createInstrumentationGetter(false, false)
};
const shallowCollectionHandlers = {
    get: /*#__PURE__*/ createInstrumentationGetter(false, true)
};
const readonlyCollectionHandlers = {
    get: /*#__PURE__*/ createInstrumentationGetter(true, false)
};

const reactiveMap = new WeakMap();
const shallowReactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
const shallowReadonlyMap = new WeakMap();
function targetTypeMap(rawType) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return 1 /* TargetType.COMMON */;
        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
            return 2 /* TargetType.COLLECTION */;
        default:
            return 0 /* TargetType.INVALID */;
    }
}
function getTargetType(value) {
    return value["__v_skip" /* ReactiveFlags.SKIP */] || !Object.isExtensible(value)
        ? 0 /* TargetType.INVALID */
        : targetTypeMap(toRawType(value));
}
function reactive(target) {
    // if trying to observe a readonly proxy, return the readonly version.
    if (isReadonly(target)) {
        return target;
    }
    return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
}
/**
 * Return a shallowly-reactive copy of the original object, where only the root
 * level properties are reactive. It also does not auto-unwrap refs (even at the
 * root level).
 */
function shallowReactive(target) {
    return createReactiveObject(target, false, shallowReactiveHandlers, shallowCollectionHandlers, shallowReactiveMap);
}
/**
 * Creates a readonly copy of the original object. Note the returned copy is not
 * made reactive, but `readonly` can be called on an already reactive object.
 */
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
}
function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
    if (!isObject$1(target)) {
        return target;
    }
    // target is already a Proxy, return it.
    // exception: calling readonly() on a reactive object
    if (target["__v_raw" /* ReactiveFlags.RAW */] &&
        !(isReadonly && target["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */])) {
        return target;
    }
    // target already has corresponding Proxy
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
        return existingProxy;
    }
    // only specific value types can be observed.
    const targetType = getTargetType(target);
    if (targetType === 0 /* TargetType.INVALID */) {
        return target;
    }
    const proxy = new Proxy(target, targetType === 2 /* TargetType.COLLECTION */ ? collectionHandlers : baseHandlers);
    proxyMap.set(target, proxy);
    return proxy;
}
function isReactive(value) {
    if (isReadonly(value)) {
        return isReactive(value["__v_raw" /* ReactiveFlags.RAW */]);
    }
    return !!(value && value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */]);
}
function isReadonly(value) {
    return !!(value && value["__v_isReadonly" /* ReactiveFlags.IS_READONLY */]);
}
function isShallow(value) {
    return !!(value && value["__v_isShallow" /* ReactiveFlags.IS_SHALLOW */]);
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}
function toRaw(observed) {
    const raw = observed && observed["__v_raw" /* ReactiveFlags.RAW */];
    return raw ? toRaw(raw) : observed;
}
function markRaw(value) {
    def(value, "__v_skip" /* ReactiveFlags.SKIP */, true);
    return value;
}
const toReactive = (value) => isObject$1(value) ? reactive(value) : value;
const toReadonly = (value) => isObject$1(value) ? readonly(value) : value;

function trackRefValue(ref) {
    if (shouldTrack && activeEffect) {
        ref = toRaw(ref);
        {
            trackEffects(ref.dep || (ref.dep = createDep()));
        }
    }
}
function triggerRefValue(ref, newVal) {
    ref = toRaw(ref);
    const dep = ref.dep;
    if (dep) {
        {
            triggerEffects(dep);
        }
    }
}
function isRef(r) {
    return !!(r && r.__v_isRef === true);
}
function ref(value) {
    return createRef(value, false);
}
function createRef(rawValue, shallow) {
    if (isRef(rawValue)) {
        return rawValue;
    }
    return new RefImpl(rawValue, shallow);
}
class RefImpl {
    constructor(value, __v_isShallow) {
        this.__v_isShallow = __v_isShallow;
        this.dep = undefined;
        this.__v_isRef = true;
        this._rawValue = __v_isShallow ? value : toRaw(value);
        this._value = __v_isShallow ? value : toReactive(value);
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newVal) {
        const useDirectValue = this.__v_isShallow || isShallow(newVal) || isReadonly(newVal);
        newVal = useDirectValue ? newVal : toRaw(newVal);
        if (hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal;
            this._value = useDirectValue ? newVal : toReactive(newVal);
            triggerRefValue(this);
        }
    }
}
function unref(ref) {
    return isRef(ref) ? ref.value : ref;
}
const shallowUnwrapHandlers = {
    get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
    set: (target, key, value, receiver) => {
        const oldValue = target[key];
        if (isRef(oldValue) && !isRef(value)) {
            oldValue.value = value;
            return true;
        }
        else {
            return Reflect.set(target, key, value, receiver);
        }
    }
};
function proxyRefs(objectWithRefs) {
    return isReactive(objectWithRefs)
        ? objectWithRefs
        : new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
function toRefs(object) {
    const ret = isArray(object) ? new Array(object.length) : {};
    for (const key in object) {
        ret[key] = toRef(object, key);
    }
    return ret;
}
class ObjectRefImpl {
    constructor(_object, _key, _defaultValue) {
        this._object = _object;
        this._key = _key;
        this._defaultValue = _defaultValue;
        this.__v_isRef = true;
    }
    get value() {
        const val = this._object[this._key];
        return val === undefined ? this._defaultValue : val;
    }
    set value(newVal) {
        this._object[this._key] = newVal;
    }
    get dep() {
        return getDepFromReactive(toRaw(this._object), this._key);
    }
}
function toRef(object, key, defaultValue) {
    const val = object[key];
    return isRef(val)
        ? val
        : new ObjectRefImpl(object, key, defaultValue);
}

var _a$1;
class ComputedRefImpl {
    constructor(getter, _setter, isReadonly, isSSR) {
        this._setter = _setter;
        this.dep = undefined;
        this.__v_isRef = true;
        this[_a$1] = false;
        this._dirty = true;
        this.effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true;
                triggerRefValue(this);
            }
        });
        this.effect.computed = this;
        this.effect.active = this._cacheable = !isSSR;
        this["__v_isReadonly" /* ReactiveFlags.IS_READONLY */] = isReadonly;
    }
    get value() {
        // the computed ref may get wrapped by other proxies e.g. readonly() #3376
        const self = toRaw(this);
        trackRefValue(self);
        if (self._dirty || !self._cacheable) {
            self._dirty = false;
            self._value = self.effect.run();
        }
        return self._value;
    }
    set value(newValue) {
        this._setter(newValue);
    }
}
_a$1 = "__v_isReadonly" /* ReactiveFlags.IS_READONLY */;
function computed$1(getterOrOptions, debugOptions, isSSR = false) {
    let getter;
    let setter;
    const onlyGetter = isFunction(getterOrOptions);
    if (onlyGetter) {
        getter = getterOrOptions;
        setter = NOOP;
    }
    else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR);
    return cRef;
}

function warn$1(msg, ...args) {
    return;
}
function callWithErrorHandling(fn, instance, type, args) {
    let res;
    try {
        res = args ? fn(...args) : fn();
    }
    catch (err) {
        handleError(err, instance, type);
    }
    return res;
}
function callWithAsyncErrorHandling(fn, instance, type, args) {
    if (isFunction(fn)) {
        const res = callWithErrorHandling(fn, instance, type, args);
        if (res && isPromise(res)) {
            res.catch(err => {
                handleError(err, instance, type);
            });
        }
        return res;
    }
    const values = [];
    for (let i = 0; i < fn.length; i++) {
        values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
    }
    return values;
}
function handleError(err, instance, type, throwInDev = true) {
    const contextVNode = instance ? instance.vnode : null;
    if (instance) {
        let cur = instance.parent;
        // the exposed instance is the render proxy to keep it consistent with 2.x
        const exposedInstance = instance.proxy;
        // in production the hook receives only the error code
        const errorInfo = type;
        while (cur) {
            const errorCapturedHooks = cur.ec;
            if (errorCapturedHooks) {
                for (let i = 0; i < errorCapturedHooks.length; i++) {
                    if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
                        return;
                    }
                }
            }
            cur = cur.parent;
        }
        // app-level handling
        const appErrorHandler = instance.appContext.config.errorHandler;
        if (appErrorHandler) {
            callWithErrorHandling(appErrorHandler, null, 10 /* ErrorCodes.APP_ERROR_HANDLER */, [err, exposedInstance, errorInfo]);
            return;
        }
    }
    logError(err, type, contextVNode, throwInDev);
}
function logError(err, type, contextVNode, throwInDev = true) {
    {
        // recover in prod to reduce the impact on end-user
        console.error(err);
    }
}

let isFlushing = false;
let isFlushPending = false;
const queue = [];
let flushIndex = 0;
const pendingPostFlushCbs = [];
let activePostFlushCbs = null;
let postFlushIndex = 0;
const resolvedPromise = /*#__PURE__*/ Promise.resolve();
let currentFlushPromise = null;
function nextTick(fn) {
    const p = currentFlushPromise || resolvedPromise;
    return fn ? p.then(this ? fn.bind(this) : fn) : p;
}
// #2768
// Use binary-search to find a suitable position in the queue,
// so that the queue maintains the increasing order of job's id,
// which can prevent the job from being skipped and also can avoid repeated patching.
function findInsertionIndex(id) {
    // the start index should be `flushIndex + 1`
    let start = flushIndex + 1;
    let end = queue.length;
    while (start < end) {
        const middle = (start + end) >>> 1;
        const middleJobId = getId(queue[middle]);
        middleJobId < id ? (start = middle + 1) : (end = middle);
    }
    return start;
}
function queueJob(job) {
    // the dedupe search uses the startIndex argument of Array.includes()
    // by default the search index includes the current job that is being run
    // so it cannot recursively trigger itself again.
    // if the job is a watch() callback, the search will start with a +1 index to
    // allow it recursively trigger itself - it is the user's responsibility to
    // ensure it doesn't end up in an infinite loop.
    if (!queue.length ||
        !queue.includes(job, isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex)) {
        if (job.id == null) {
            queue.push(job);
        }
        else {
            queue.splice(findInsertionIndex(job.id), 0, job);
        }
        queueFlush();
    }
}
function queueFlush() {
    if (!isFlushing && !isFlushPending) {
        isFlushPending = true;
        currentFlushPromise = resolvedPromise.then(flushJobs);
    }
}
function invalidateJob(job) {
    const i = queue.indexOf(job);
    if (i > flushIndex) {
        queue.splice(i, 1);
    }
}
function queuePostFlushCb(cb) {
    if (!isArray(cb)) {
        if (!activePostFlushCbs ||
            !activePostFlushCbs.includes(cb, cb.allowRecurse ? postFlushIndex + 1 : postFlushIndex)) {
            pendingPostFlushCbs.push(cb);
        }
    }
    else {
        // if cb is an array, it is a component lifecycle hook which can only be
        // triggered by a job, which is already deduped in the main queue, so
        // we can skip duplicate check here to improve perf
        pendingPostFlushCbs.push(...cb);
    }
    queueFlush();
}
function flushPreFlushCbs(seen, 
// if currently flushing, skip the current job itself
i = isFlushing ? flushIndex + 1 : 0) {
    for (; i < queue.length; i++) {
        const cb = queue[i];
        if (cb && cb.pre) {
            queue.splice(i, 1);
            i--;
            cb();
        }
    }
}
function flushPostFlushCbs(seen) {
    if (pendingPostFlushCbs.length) {
        const deduped = [...new Set(pendingPostFlushCbs)];
        pendingPostFlushCbs.length = 0;
        // #1947 already has active queue, nested flushPostFlushCbs call
        if (activePostFlushCbs) {
            activePostFlushCbs.push(...deduped);
            return;
        }
        activePostFlushCbs = deduped;
        activePostFlushCbs.sort((a, b) => getId(a) - getId(b));
        for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
            activePostFlushCbs[postFlushIndex]();
        }
        activePostFlushCbs = null;
        postFlushIndex = 0;
    }
}
const getId = (job) => job.id == null ? Infinity : job.id;
const comparator = (a, b) => {
    const diff = getId(a) - getId(b);
    if (diff === 0) {
        if (a.pre && !b.pre)
            return -1;
        if (b.pre && !a.pre)
            return 1;
    }
    return diff;
};
function flushJobs(seen) {
    isFlushPending = false;
    isFlushing = true;
    // Sort queue before flush.
    // This ensures that:
    // 1. Components are updated from parent to child. (because parent is always
    //    created before the child so its render effect will have smaller
    //    priority number)
    // 2. If a component is unmounted during a parent component's update,
    //    its update can be skipped.
    queue.sort(comparator);
    // conditional usage of checkRecursiveUpdate must be determined out of
    // try ... catch block since Rollup by default de-optimizes treeshaking
    // inside try-catch. This can leave all warning code unshaked. Although
    // they would get eventually shaken by a minifier like terser, some minifiers
    // would fail to do that (e.g. https://github.com/evanw/esbuild/issues/1610)
    const check = NOOP;
    try {
        for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
            const job = queue[flushIndex];
            if (job && job.active !== false) {
                if (("production" !== 'production') && check(job)) ;
                // console.log(`running:`, job.id)
                callWithErrorHandling(job, null, 14 /* ErrorCodes.SCHEDULER */);
            }
        }
    }
    finally {
        flushIndex = 0;
        queue.length = 0;
        flushPostFlushCbs();
        isFlushing = false;
        currentFlushPromise = null;
        // some postFlushCb queued jobs!
        // keep flushing until it drains.
        if (queue.length || pendingPostFlushCbs.length) {
            flushJobs();
        }
    }
}

function emit(instance, event, ...rawArgs) {
    if (instance.isUnmounted)
        return;
    const props = instance.vnode.props || EMPTY_OBJ;
    let args = rawArgs;
    const isModelListener = event.startsWith('update:');
    // for v-model update:xxx events, apply modifiers on args
    const modelArg = isModelListener && event.slice(7);
    if (modelArg && modelArg in props) {
        const modifiersKey = `${modelArg === 'modelValue' ? 'model' : modelArg}Modifiers`;
        const { number, trim } = props[modifiersKey] || EMPTY_OBJ;
        if (trim) {
            args = rawArgs.map(a => (isString(a) ? a.trim() : a));
        }
        if (number) {
            args = rawArgs.map(looseToNumber);
        }
    }
    let handlerName;
    let handler = props[(handlerName = toHandlerKey(event))] ||
        // also try camelCase event handler (#2249)
        props[(handlerName = toHandlerKey(camelize(event)))];
    // for v-model update:xxx events, also trigger kebab-case equivalent
    // for props passed via kebab-case
    if (!handler && isModelListener) {
        handler = props[(handlerName = toHandlerKey(hyphenate(event)))];
    }
    if (handler) {
        callWithAsyncErrorHandling(handler, instance, 6 /* ErrorCodes.COMPONENT_EVENT_HANDLER */, args);
    }
    const onceHandler = props[handlerName + `Once`];
    if (onceHandler) {
        if (!instance.emitted) {
            instance.emitted = {};
        }
        else if (instance.emitted[handlerName]) {
            return;
        }
        instance.emitted[handlerName] = true;
        callWithAsyncErrorHandling(onceHandler, instance, 6 /* ErrorCodes.COMPONENT_EVENT_HANDLER */, args);
    }
}
function normalizeEmitsOptions(comp, appContext, asMixin = false) {
    const cache = appContext.emitsCache;
    const cached = cache.get(comp);
    if (cached !== undefined) {
        return cached;
    }
    const raw = comp.emits;
    let normalized = {};
    // apply mixin/extends props
    let hasExtends = false;
    if (!isFunction(comp)) {
        const extendEmits = (raw) => {
            const normalizedFromExtend = normalizeEmitsOptions(raw, appContext, true);
            if (normalizedFromExtend) {
                hasExtends = true;
                extend(normalized, normalizedFromExtend);
            }
        };
        if (!asMixin && appContext.mixins.length) {
            appContext.mixins.forEach(extendEmits);
        }
        if (comp.extends) {
            extendEmits(comp.extends);
        }
        if (comp.mixins) {
            comp.mixins.forEach(extendEmits);
        }
    }
    if (!raw && !hasExtends) {
        if (isObject$1(comp)) {
            cache.set(comp, null);
        }
        return null;
    }
    if (isArray(raw)) {
        raw.forEach(key => (normalized[key] = null));
    }
    else {
        extend(normalized, raw);
    }
    if (isObject$1(comp)) {
        cache.set(comp, normalized);
    }
    return normalized;
}
// Check if an incoming prop key is a declared emit event listener.
// e.g. With `emits: { click: null }`, props named `onClick` and `onclick` are
// both considered matched listeners.
function isEmitListener(options, key) {
    if (!options || !isOn(key)) {
        return false;
    }
    key = key.slice(2).replace(/Once$/, '');
    return (hasOwn(options, key[0].toLowerCase() + key.slice(1)) ||
        hasOwn(options, hyphenate(key)) ||
        hasOwn(options, key));
}

/**
 * mark the current rendering instance for asset resolution (e.g.
 * resolveComponent, resolveDirective) during render
 */
let currentRenderingInstance = null;
let currentScopeId = null;
/**
 * Note: rendering calls maybe nested. The function returns the parent rendering
 * instance if present, which should be restored after the render is done:
 *
 * ```js
 * const prev = setCurrentRenderingInstance(i)
 * // ...render
 * setCurrentRenderingInstance(prev)
 * ```
 */
function setCurrentRenderingInstance(instance) {
    const prev = currentRenderingInstance;
    currentRenderingInstance = instance;
    currentScopeId = (instance && instance.type.__scopeId) || null;
    return prev;
}
/**
 * Wrap a slot function to memoize current rendering instance
 * @private compiler helper
 */
function withCtx(fn, ctx = currentRenderingInstance, isNonScopedSlot // false only
) {
    if (!ctx)
        return fn;
    // already normalized
    if (fn._n) {
        return fn;
    }
    const renderFnWithContext = (...args) => {
        // If a user calls a compiled slot inside a template expression (#1745), it
        // can mess up block tracking, so by default we disable block tracking and
        // force bail out when invoking a compiled slot (indicated by the ._d flag).
        // This isn't necessary if rendering a compiled `<slot>`, so we flip the
        // ._d flag off when invoking the wrapped fn inside `renderSlot`.
        if (renderFnWithContext._d) {
            setBlockTracking(-1);
        }
        const prevInstance = setCurrentRenderingInstance(ctx);
        let res;
        try {
            res = fn(...args);
        }
        finally {
            setCurrentRenderingInstance(prevInstance);
            if (renderFnWithContext._d) {
                setBlockTracking(1);
            }
        }
        return res;
    };
    // mark normalized to avoid duplicated wrapping
    renderFnWithContext._n = true;
    // mark this as compiled by default
    // this is used in vnode.ts -> normalizeChildren() to set the slot
    // rendering flag.
    renderFnWithContext._c = true;
    // disable block tracking by default
    renderFnWithContext._d = true;
    return renderFnWithContext;
}
function markAttrsAccessed() {
}
function renderComponentRoot(instance) {
    const { type: Component, vnode, proxy, withProxy, props, propsOptions: [propsOptions], slots, attrs, emit, render, renderCache, data, setupState, ctx, inheritAttrs } = instance;
    let result;
    let fallthroughAttrs;
    const prev = setCurrentRenderingInstance(instance);
    try {
        if (vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
            // withProxy is a proxy with a different `has` trap only for
            // runtime-compiled render functions using `with` block.
            const proxyToUse = withProxy || proxy;
            result = normalizeVNode(render.call(proxyToUse, proxyToUse, renderCache, props, setupState, data, ctx));
            fallthroughAttrs = attrs;
        }
        else {
            // functional
            const render = Component;
            // in dev, mark attrs accessed if optional props (attrs === props)
            if (("production" !== 'production') && attrs === props) ;
            result = normalizeVNode(render.length > 1
                ? render(props, ("production" !== 'production')
                    ? {
                        get attrs() {
                            markAttrsAccessed();
                            return attrs;
                        },
                        slots,
                        emit
                    }
                    : { attrs, slots, emit })
                : render(props, null /* we know it doesn't need it */));
            fallthroughAttrs = Component.props
                ? attrs
                : getFunctionalFallthrough(attrs);
        }
    }
    catch (err) {
        blockStack.length = 0;
        handleError(err, instance, 1 /* ErrorCodes.RENDER_FUNCTION */);
        result = createVNode(Comment);
    }
    // attr merging
    // in dev mode, comments are preserved, and it's possible for a template
    // to have comments along side the root element which makes it a fragment
    let root = result;
    if (fallthroughAttrs && inheritAttrs !== false) {
        const keys = Object.keys(fallthroughAttrs);
        const { shapeFlag } = root;
        if (keys.length) {
            if (shapeFlag & (1 /* ShapeFlags.ELEMENT */ | 6 /* ShapeFlags.COMPONENT */)) {
                if (propsOptions && keys.some(isModelListener)) {
                    // If a v-model listener (onUpdate:xxx) has a corresponding declared
                    // prop, it indicates this component expects to handle v-model and
                    // it should not fallthrough.
                    // related: #1543, #1643, #1989
                    fallthroughAttrs = filterModelListeners(fallthroughAttrs, propsOptions);
                }
                root = cloneVNode(root, fallthroughAttrs);
            }
        }
    }
    // inherit directives
    if (vnode.dirs) {
        // clone before mutating since the root may be a hoisted vnode
        root = cloneVNode(root);
        root.dirs = root.dirs ? root.dirs.concat(vnode.dirs) : vnode.dirs;
    }
    // inherit transition data
    if (vnode.transition) {
        root.transition = vnode.transition;
    }
    {
        result = root;
    }
    setCurrentRenderingInstance(prev);
    return result;
}
const getFunctionalFallthrough = (attrs) => {
    let res;
    for (const key in attrs) {
        if (key === 'class' || key === 'style' || isOn(key)) {
            (res || (res = {}))[key] = attrs[key];
        }
    }
    return res;
};
const filterModelListeners = (attrs, props) => {
    const res = {};
    for (const key in attrs) {
        if (!isModelListener(key) || !(key.slice(9) in props)) {
            res[key] = attrs[key];
        }
    }
    return res;
};
function shouldUpdateComponent(prevVNode, nextVNode, optimized) {
    const { props: prevProps, children: prevChildren, component } = prevVNode;
    const { props: nextProps, children: nextChildren, patchFlag } = nextVNode;
    const emits = component.emitsOptions;
    // force child update for runtime directive or transition on component vnode.
    if (nextVNode.dirs || nextVNode.transition) {
        return true;
    }
    if (optimized && patchFlag >= 0) {
        if (patchFlag & 1024 /* PatchFlags.DYNAMIC_SLOTS */) {
            // slot content that references values that might have changed,
            // e.g. in a v-for
            return true;
        }
        if (patchFlag & 16 /* PatchFlags.FULL_PROPS */) {
            if (!prevProps) {
                return !!nextProps;
            }
            // presence of this flag indicates props are always non-null
            return hasPropsChanged(prevProps, nextProps, emits);
        }
        else if (patchFlag & 8 /* PatchFlags.PROPS */) {
            const dynamicProps = nextVNode.dynamicProps;
            for (let i = 0; i < dynamicProps.length; i++) {
                const key = dynamicProps[i];
                if (nextProps[key] !== prevProps[key] &&
                    !isEmitListener(emits, key)) {
                    return true;
                }
            }
        }
    }
    else {
        // this path is only taken by manually written render functions
        // so presence of any children leads to a forced update
        if (prevChildren || nextChildren) {
            if (!nextChildren || !nextChildren.$stable) {
                return true;
            }
        }
        if (prevProps === nextProps) {
            return false;
        }
        if (!prevProps) {
            return !!nextProps;
        }
        if (!nextProps) {
            return true;
        }
        return hasPropsChanged(prevProps, nextProps, emits);
    }
    return false;
}
function hasPropsChanged(prevProps, nextProps, emitsOptions) {
    const nextKeys = Object.keys(nextProps);
    if (nextKeys.length !== Object.keys(prevProps).length) {
        return true;
    }
    for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i];
        if (nextProps[key] !== prevProps[key] &&
            !isEmitListener(emitsOptions, key)) {
            return true;
        }
    }
    return false;
}
function updateHOCHostEl({ vnode, parent }, el // HostNode
) {
    while (parent && parent.subTree === vnode) {
        (vnode = parent.vnode).el = el;
        parent = parent.parent;
    }
}

const isSuspense = (type) => type.__isSuspense;
function queueEffectWithSuspense(fn, suspense) {
    if (suspense && suspense.pendingBranch) {
        if (isArray(fn)) {
            suspense.effects.push(...fn);
        }
        else {
            suspense.effects.push(fn);
        }
    }
    else {
        queuePostFlushCb(fn);
    }
}

function provide(key, value) {
    if (!currentInstance) ;
    else {
        let provides = currentInstance.provides;
        // by default an instance inherits its parent's provides object
        // but when it needs to provide values of its own, it creates its
        // own provides object using parent provides object as prototype.
        // this way in `inject` we can simply look up injections from direct
        // parent and let the prototype chain do the work.
        const parentProvides = currentInstance.parent && currentInstance.parent.provides;
        if (parentProvides === provides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        // TS doesn't allow symbol as index type
        provides[key] = value;
    }
}
function inject(key, defaultValue, treatDefaultAsFactory = false) {
    // fallback to `currentRenderingInstance` so that this can be called in
    // a functional component
    const instance = currentInstance || currentRenderingInstance;
    if (instance) {
        // #2400
        // to support `app.use` plugins,
        // fallback to appContext's `provides` if the instance is at root
        const provides = instance.parent == null
            ? instance.vnode.appContext && instance.vnode.appContext.provides
            : instance.parent.provides;
        if (provides && key in provides) {
            // TS doesn't allow symbol as index type
            return provides[key];
        }
        else if (arguments.length > 1) {
            return treatDefaultAsFactory && isFunction(defaultValue)
                ? defaultValue.call(instance.proxy)
                : defaultValue;
        }
        else ;
    }
}

// Simple effect.
function watchEffect(effect, options) {
    return doWatch(effect, null, options);
}
// initial value for watchers to trigger on undefined initial values
const INITIAL_WATCHER_VALUE = {};
// implementation
function watch(source, cb, options) {
    return doWatch(source, cb, options);
}
function doWatch(source, cb, { immediate, deep, flush, onTrack, onTrigger } = EMPTY_OBJ) {
    const instance = getCurrentScope() === (currentInstance === null || currentInstance === void 0 ? void 0 : currentInstance.scope) ? currentInstance : null;
    // const instance = currentInstance
    let getter;
    let forceTrigger = false;
    let isMultiSource = false;
    if (isRef(source)) {
        getter = () => source.value;
        forceTrigger = isShallow(source);
    }
    else if (isReactive(source)) {
        getter = () => source;
        deep = true;
    }
    else if (isArray(source)) {
        isMultiSource = true;
        forceTrigger = source.some(s => isReactive(s) || isShallow(s));
        getter = () => source.map(s => {
            if (isRef(s)) {
                return s.value;
            }
            else if (isReactive(s)) {
                return traverse(s);
            }
            else if (isFunction(s)) {
                return callWithErrorHandling(s, instance, 2 /* ErrorCodes.WATCH_GETTER */);
            }
            else ;
        });
    }
    else if (isFunction(source)) {
        if (cb) {
            // getter with cb
            getter = () => callWithErrorHandling(source, instance, 2 /* ErrorCodes.WATCH_GETTER */);
        }
        else {
            // no cb -> simple effect
            getter = () => {
                if (instance && instance.isUnmounted) {
                    return;
                }
                if (cleanup) {
                    cleanup();
                }
                return callWithAsyncErrorHandling(source, instance, 3 /* ErrorCodes.WATCH_CALLBACK */, [onCleanup]);
            };
        }
    }
    else {
        getter = NOOP;
    }
    if (cb && deep) {
        const baseGetter = getter;
        getter = () => traverse(baseGetter());
    }
    let cleanup;
    let onCleanup = (fn) => {
        cleanup = effect.onStop = () => {
            callWithErrorHandling(fn, instance, 4 /* ErrorCodes.WATCH_CLEANUP */);
        };
    };
    // in SSR there is no need to setup an actual effect, and it should be noop
    // unless it's eager or sync flush
    let ssrCleanup;
    if (isInSSRComponentSetup) {
        // we will also not call the invalidate callback (+ runner is not set up)
        onCleanup = NOOP;
        if (!cb) {
            getter();
        }
        else if (immediate) {
            callWithAsyncErrorHandling(cb, instance, 3 /* ErrorCodes.WATCH_CALLBACK */, [
                getter(),
                isMultiSource ? [] : undefined,
                onCleanup
            ]);
        }
        if (flush === 'sync') {
            const ctx = useSSRContext();
            ssrCleanup = ctx.__watcherHandles || (ctx.__watcherHandles = []);
        }
        else {
            return NOOP;
        }
    }
    let oldValue = isMultiSource
        ? new Array(source.length).fill(INITIAL_WATCHER_VALUE)
        : INITIAL_WATCHER_VALUE;
    const job = () => {
        if (!effect.active) {
            return;
        }
        if (cb) {
            // watch(source, cb)
            const newValue = effect.run();
            if (deep ||
                forceTrigger ||
                (isMultiSource
                    ? newValue.some((v, i) => hasChanged(v, oldValue[i]))
                    : hasChanged(newValue, oldValue)) ||
                (false  )) {
                // cleanup before running cb again
                if (cleanup) {
                    cleanup();
                }
                callWithAsyncErrorHandling(cb, instance, 3 /* ErrorCodes.WATCH_CALLBACK */, [
                    newValue,
                    // pass undefined as the old value when it's changed for the first time
                    oldValue === INITIAL_WATCHER_VALUE
                        ? undefined
                        : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE
                            ? []
                            : oldValue,
                    onCleanup
                ]);
                oldValue = newValue;
            }
        }
        else {
            // watchEffect
            effect.run();
        }
    };
    // important: mark the job as a watcher callback so that scheduler knows
    // it is allowed to self-trigger (#1727)
    job.allowRecurse = !!cb;
    let scheduler;
    if (flush === 'sync') {
        scheduler = job; // the scheduler function gets called directly
    }
    else if (flush === 'post') {
        scheduler = () => queuePostRenderEffect(job, instance && instance.suspense);
    }
    else {
        // default: 'pre'
        job.pre = true;
        if (instance)
            job.id = instance.uid;
        scheduler = () => queueJob(job);
    }
    const effect = new ReactiveEffect(getter, scheduler);
    // initial run
    if (cb) {
        if (immediate) {
            job();
        }
        else {
            oldValue = effect.run();
        }
    }
    else if (flush === 'post') {
        queuePostRenderEffect(effect.run.bind(effect), instance && instance.suspense);
    }
    else {
        effect.run();
    }
    const unwatch = () => {
        effect.stop();
        if (instance && instance.scope) {
            remove(instance.scope.effects, effect);
        }
    };
    if (ssrCleanup)
        ssrCleanup.push(unwatch);
    return unwatch;
}
// this.$watch
function instanceWatch(source, value, options) {
    const publicThis = this.proxy;
    const getter = isString(source)
        ? source.includes('.')
            ? createPathGetter(publicThis, source)
            : () => publicThis[source]
        : source.bind(publicThis, publicThis);
    let cb;
    if (isFunction(value)) {
        cb = value;
    }
    else {
        cb = value.handler;
        options = value;
    }
    const cur = currentInstance;
    setCurrentInstance(this);
    const res = doWatch(getter, cb.bind(publicThis), options);
    if (cur) {
        setCurrentInstance(cur);
    }
    else {
        unsetCurrentInstance();
    }
    return res;
}
function createPathGetter(ctx, path) {
    const segments = path.split('.');
    return () => {
        let cur = ctx;
        for (let i = 0; i < segments.length && cur; i++) {
            cur = cur[segments[i]];
        }
        return cur;
    };
}
function traverse(value, seen) {
    if (!isObject$1(value) || value["__v_skip" /* ReactiveFlags.SKIP */]) {
        return value;
    }
    seen = seen || new Set();
    if (seen.has(value)) {
        return value;
    }
    seen.add(value);
    if (isRef(value)) {
        traverse(value.value, seen);
    }
    else if (isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            traverse(value[i], seen);
        }
    }
    else if (isSet(value) || isMap(value)) {
        value.forEach((v) => {
            traverse(v, seen);
        });
    }
    else if (isPlainObject$1(value)) {
        for (const key in value) {
            traverse(value[key], seen);
        }
    }
    return value;
}

// implementation, close to no-op
function defineComponent(options) {
    return isFunction(options) ? { setup: options, name: options.name } : options;
}

const isAsyncWrapper = (i) => !!i.type.__asyncLoader;

const isKeepAlive = (vnode) => vnode.type.__isKeepAlive;
function onActivated(hook, target) {
    registerKeepAliveHook(hook, "a" /* LifecycleHooks.ACTIVATED */, target);
}
function onDeactivated(hook, target) {
    registerKeepAliveHook(hook, "da" /* LifecycleHooks.DEACTIVATED */, target);
}
function registerKeepAliveHook(hook, type, target = currentInstance) {
    // cache the deactivate branch check wrapper for injected hooks so the same
    // hook can be properly deduped by the scheduler. "__wdc" stands for "with
    // deactivation check".
    const wrappedHook = hook.__wdc ||
        (hook.__wdc = () => {
            // only fire the hook if the target instance is NOT in a deactivated branch.
            let current = target;
            while (current) {
                if (current.isDeactivated) {
                    return;
                }
                current = current.parent;
            }
            return hook();
        });
    injectHook(type, wrappedHook, target);
    // In addition to registering it on the target instance, we walk up the parent
    // chain and register it on all ancestor instances that are keep-alive roots.
    // This avoids the need to walk the entire component tree when invoking these
    // hooks, and more importantly, avoids the need to track child components in
    // arrays.
    if (target) {
        let current = target.parent;
        while (current && current.parent) {
            if (isKeepAlive(current.parent.vnode)) {
                injectToKeepAliveRoot(wrappedHook, type, target, current);
            }
            current = current.parent;
        }
    }
}
function injectToKeepAliveRoot(hook, type, target, keepAliveRoot) {
    // injectHook wraps the original for error handling, so make sure to remove
    // the wrapped version.
    const injected = injectHook(type, hook, keepAliveRoot, true /* prepend */);
    onUnmounted(() => {
        remove(keepAliveRoot[type], injected);
    }, target);
}

function injectHook(type, hook, target = currentInstance, prepend = false) {
    if (target) {
        const hooks = target[type] || (target[type] = []);
        // cache the error handling wrapper for injected hooks so the same hook
        // can be properly deduped by the scheduler. "__weh" stands for "with error
        // handling".
        const wrappedHook = hook.__weh ||
            (hook.__weh = (...args) => {
                if (target.isUnmounted) {
                    return;
                }
                // disable tracking inside all lifecycle hooks
                // since they can potentially be called inside effects.
                pauseTracking();
                // Set currentInstance during hook invocation.
                // This assumes the hook does not synchronously trigger other hooks, which
                // can only be false when the user does something really funky.
                setCurrentInstance(target);
                const res = callWithAsyncErrorHandling(hook, target, type, args);
                unsetCurrentInstance();
                resetTracking();
                return res;
            });
        if (prepend) {
            hooks.unshift(wrappedHook);
        }
        else {
            hooks.push(wrappedHook);
        }
        return wrappedHook;
    }
}
const createHook = (lifecycle) => (hook, target = currentInstance) => 
// post-create lifecycle registrations are noops during SSR (except for serverPrefetch)
(!isInSSRComponentSetup || lifecycle === "sp" /* LifecycleHooks.SERVER_PREFETCH */) &&
    injectHook(lifecycle, (...args) => hook(...args), target);
const onBeforeMount = createHook("bm" /* LifecycleHooks.BEFORE_MOUNT */);
const onMounted = createHook("m" /* LifecycleHooks.MOUNTED */);
const onBeforeUpdate = createHook("bu" /* LifecycleHooks.BEFORE_UPDATE */);
const onUpdated = createHook("u" /* LifecycleHooks.UPDATED */);
const onBeforeUnmount = createHook("bum" /* LifecycleHooks.BEFORE_UNMOUNT */);
const onUnmounted = createHook("um" /* LifecycleHooks.UNMOUNTED */);
const onServerPrefetch = createHook("sp" /* LifecycleHooks.SERVER_PREFETCH */);
const onRenderTriggered = createHook("rtg" /* LifecycleHooks.RENDER_TRIGGERED */);
const onRenderTracked = createHook("rtc" /* LifecycleHooks.RENDER_TRACKED */);
function onErrorCaptured(hook, target = currentInstance) {
    injectHook("ec" /* LifecycleHooks.ERROR_CAPTURED */, hook, target);
}
/**
 * Adds directives to a VNode.
 */
function withDirectives(vnode, directives) {
    const internalInstance = currentRenderingInstance;
    if (internalInstance === null) {
        return vnode;
    }
    const instance = getExposeProxy(internalInstance) ||
        internalInstance.proxy;
    const bindings = vnode.dirs || (vnode.dirs = []);
    for (let i = 0; i < directives.length; i++) {
        let [dir, value, arg, modifiers = EMPTY_OBJ] = directives[i];
        if (dir) {
            if (isFunction(dir)) {
                dir = {
                    mounted: dir,
                    updated: dir
                };
            }
            if (dir.deep) {
                traverse(value);
            }
            bindings.push({
                dir,
                instance,
                value,
                oldValue: void 0,
                arg,
                modifiers
            });
        }
    }
    return vnode;
}
function invokeDirectiveHook(vnode, prevVNode, instance, name) {
    const bindings = vnode.dirs;
    const oldBindings = prevVNode && prevVNode.dirs;
    for (let i = 0; i < bindings.length; i++) {
        const binding = bindings[i];
        if (oldBindings) {
            binding.oldValue = oldBindings[i].value;
        }
        let hook = binding.dir[name];
        if (hook) {
            // disable tracking inside all lifecycle hooks
            // since they can potentially be called inside effects.
            pauseTracking();
            callWithAsyncErrorHandling(hook, instance, 8 /* ErrorCodes.DIRECTIVE_HOOK */, [
                vnode.el,
                binding,
                vnode,
                prevVNode
            ]);
            resetTracking();
        }
    }
}

const COMPONENTS = 'components';
const NULL_DYNAMIC_COMPONENT = Symbol();
/**
 * @private
 */
function resolveDynamicComponent(component) {
    if (isString(component)) {
        return resolveAsset(COMPONENTS, component, false) || component;
    }
    else {
        // invalid types will fallthrough to createVNode and raise warning
        return (component || NULL_DYNAMIC_COMPONENT);
    }
}
// implementation
function resolveAsset(type, name, warnMissing = true, maybeSelfReference = false) {
    const instance = currentRenderingInstance || currentInstance;
    if (instance) {
        const Component = instance.type;
        // explicit self name has highest priority
        if (type === COMPONENTS) {
            const selfName = getComponentName(Component, false /* do not include inferred name to avoid breaking existing code */);
            if (selfName &&
                (selfName === name ||
                    selfName === camelize(name) ||
                    selfName === capitalize(camelize(name)))) {
                return Component;
            }
        }
        const res = 
        // local registration
        // check instance[type] first which is resolved for options API
        resolve(instance[type] || Component[type], name) ||
            // global registration
            resolve(instance.appContext[type], name);
        if (!res && maybeSelfReference) {
            // fallback to implicit self-reference
            return Component;
        }
        return res;
    }
}
function resolve(registry, name) {
    return (registry &&
        (registry[name] ||
            registry[camelize(name)] ||
            registry[capitalize(camelize(name))]));
}

/**
 * Actual implementation
 */
function renderList(source, renderItem, cache, index) {
    let ret;
    const cached = (cache && cache[index]);
    if (isArray(source) || isString(source)) {
        ret = new Array(source.length);
        for (let i = 0, l = source.length; i < l; i++) {
            ret[i] = renderItem(source[i], i, undefined, cached && cached[i]);
        }
    }
    else if (typeof source === 'number') {
        ret = new Array(source);
        for (let i = 0; i < source; i++) {
            ret[i] = renderItem(i + 1, i, undefined, cached && cached[i]);
        }
    }
    else if (isObject$1(source)) {
        if (source[Symbol.iterator]) {
            ret = Array.from(source, (item, i) => renderItem(item, i, undefined, cached && cached[i]));
        }
        else {
            const keys = Object.keys(source);
            ret = new Array(keys.length);
            for (let i = 0, l = keys.length; i < l; i++) {
                const key = keys[i];
                ret[i] = renderItem(source[key], key, i, cached && cached[i]);
            }
        }
    }
    else {
        ret = [];
    }
    if (cache) {
        cache[index] = ret;
    }
    return ret;
}

/**
 * #2437 In Vue 3, functional components do not have a public instance proxy but
 * they exist in the internal parent chain. For code that relies on traversing
 * public $parent chains, skip functional ones and go to the parent instead.
 */
const getPublicInstance = (i) => {
    if (!i)
        return null;
    if (isStatefulComponent(i))
        return getExposeProxy(i) || i.proxy;
    return getPublicInstance(i.parent);
};
const publicPropertiesMap = 
// Move PURE marker to new line to workaround compiler discarding it
// due to type annotation
/*#__PURE__*/ extend(Object.create(null), {
    $: i => i,
    $el: i => i.vnode.el,
    $data: i => i.data,
    $props: i => (i.props),
    $attrs: i => (i.attrs),
    $slots: i => (i.slots),
    $refs: i => (i.refs),
    $parent: i => getPublicInstance(i.parent),
    $root: i => getPublicInstance(i.root),
    $emit: i => i.emit,
    $options: i => (resolveMergedOptions(i) ),
    $forceUpdate: i => i.f || (i.f = () => queueJob(i.update)),
    $nextTick: i => i.n || (i.n = nextTick.bind(i.proxy)),
    $watch: i => (instanceWatch.bind(i) )
});
const hasSetupBinding = (state, key) => state !== EMPTY_OBJ && !state.__isScriptSetup && hasOwn(state, key);
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { ctx, setupState, data, props, accessCache, type, appContext } = instance;
        // data / props / ctx
        // This getter gets called for every property access on the render context
        // during render and is a major hotspot. The most expensive part of this
        // is the multiple hasOwn() calls. It's much faster to do a simple property
        // access on a plain object, so we use an accessCache object (with null
        // prototype) to memoize what access type a key corresponds to.
        let normalizedProps;
        if (key[0] !== '$') {
            const n = accessCache[key];
            if (n !== undefined) {
                switch (n) {
                    case 1 /* AccessTypes.SETUP */:
                        return setupState[key];
                    case 2 /* AccessTypes.DATA */:
                        return data[key];
                    case 4 /* AccessTypes.CONTEXT */:
                        return ctx[key];
                    case 3 /* AccessTypes.PROPS */:
                        return props[key];
                    // default: just fallthrough
                }
            }
            else if (hasSetupBinding(setupState, key)) {
                accessCache[key] = 1 /* AccessTypes.SETUP */;
                return setupState[key];
            }
            else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
                accessCache[key] = 2 /* AccessTypes.DATA */;
                return data[key];
            }
            else if (
            // only cache other properties when instance has declared (thus stable)
            // props
            (normalizedProps = instance.propsOptions[0]) &&
                hasOwn(normalizedProps, key)) {
                accessCache[key] = 3 /* AccessTypes.PROPS */;
                return props[key];
            }
            else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
                accessCache[key] = 4 /* AccessTypes.CONTEXT */;
                return ctx[key];
            }
            else if (shouldCacheAccess) {
                accessCache[key] = 0 /* AccessTypes.OTHER */;
            }
        }
        const publicGetter = publicPropertiesMap[key];
        let cssModule, globalProperties;
        // public $xxx properties
        if (publicGetter) {
            if (key === '$attrs') {
                track(instance, "get" /* TrackOpTypes.GET */, key);
            }
            return publicGetter(instance);
        }
        else if (
        // css module (injected by vue-loader)
        (cssModule = type.__cssModules) &&
            (cssModule = cssModule[key])) {
            return cssModule;
        }
        else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
            // user may set custom properties to `this` that start with `$`
            accessCache[key] = 4 /* AccessTypes.CONTEXT */;
            return ctx[key];
        }
        else if (
        // global properties
        ((globalProperties = appContext.config.globalProperties),
            hasOwn(globalProperties, key))) {
            {
                return globalProperties[key];
            }
        }
        else ;
    },
    set({ _: instance }, key, value) {
        const { data, setupState, ctx } = instance;
        if (hasSetupBinding(setupState, key)) {
            setupState[key] = value;
            return true;
        }
        else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
            data[key] = value;
            return true;
        }
        else if (hasOwn(instance.props, key)) {
            return false;
        }
        if (key[0] === '$' && key.slice(1) in instance) {
            return false;
        }
        else {
            {
                ctx[key] = value;
            }
        }
        return true;
    },
    has({ _: { data, setupState, accessCache, ctx, appContext, propsOptions } }, key) {
        let normalizedProps;
        return (!!accessCache[key] ||
            (data !== EMPTY_OBJ && hasOwn(data, key)) ||
            hasSetupBinding(setupState, key) ||
            ((normalizedProps = propsOptions[0]) && hasOwn(normalizedProps, key)) ||
            hasOwn(ctx, key) ||
            hasOwn(publicPropertiesMap, key) ||
            hasOwn(appContext.config.globalProperties, key));
    },
    defineProperty(target, key, descriptor) {
        if (descriptor.get != null) {
            // invalidate key cache of a getter based property #5417
            target._.accessCache[key] = 0;
        }
        else if (hasOwn(descriptor, 'value')) {
            this.set(target, key, descriptor.value, null);
        }
        return Reflect.defineProperty(target, key, descriptor);
    }
};
let shouldCacheAccess = true;
function applyOptions(instance) {
    const options = resolveMergedOptions(instance);
    const publicThis = instance.proxy;
    const ctx = instance.ctx;
    // do not cache property access on public proxy during state initialization
    shouldCacheAccess = false;
    // call beforeCreate first before accessing other options since
    // the hook may mutate resolved options (#2791)
    if (options.beforeCreate) {
        callHook(options.beforeCreate, instance, "bc" /* LifecycleHooks.BEFORE_CREATE */);
    }
    const { 
    // state
    data: dataOptions, computed: computedOptions, methods, watch: watchOptions, provide: provideOptions, inject: injectOptions, 
    // lifecycle
    created, beforeMount, mounted, beforeUpdate, updated, activated, deactivated, beforeDestroy, beforeUnmount, destroyed, unmounted, render, renderTracked, renderTriggered, errorCaptured, serverPrefetch, 
    // public API
    expose, inheritAttrs, 
    // assets
    components, directives, filters } = options;
    const checkDuplicateProperties = null;
    // options initialization order (to be consistent with Vue 2):
    // - props (already done outside of this function)
    // - inject
    // - methods
    // - data (deferred since it relies on `this` access)
    // - computed
    // - watch (deferred since it relies on `this` access)
    if (injectOptions) {
        resolveInjections(injectOptions, ctx, checkDuplicateProperties, instance.appContext.config.unwrapInjectedRef);
    }
    if (methods) {
        for (const key in methods) {
            const methodHandler = methods[key];
            if (isFunction(methodHandler)) {
                // In dev mode, we use the `createRenderContext` function to define
                // methods to the proxy target, and those are read-only but
                // reconfigurable, so it needs to be redefined here
                {
                    ctx[key] = methodHandler.bind(publicThis);
                }
            }
        }
    }
    if (dataOptions) {
        const data = dataOptions.call(publicThis, publicThis);
        if (!isObject$1(data)) ;
        else {
            instance.data = reactive(data);
        }
    }
    // state initialization complete at this point - start caching access
    shouldCacheAccess = true;
    if (computedOptions) {
        for (const key in computedOptions) {
            const opt = computedOptions[key];
            const get = isFunction(opt)
                ? opt.bind(publicThis, publicThis)
                : isFunction(opt.get)
                    ? opt.get.bind(publicThis, publicThis)
                    : NOOP;
            const set = !isFunction(opt) && isFunction(opt.set)
                ? opt.set.bind(publicThis)
                : NOOP;
            const c = computed({
                get,
                set
            });
            Object.defineProperty(ctx, key, {
                enumerable: true,
                configurable: true,
                get: () => c.value,
                set: v => (c.value = v)
            });
        }
    }
    if (watchOptions) {
        for (const key in watchOptions) {
            createWatcher(watchOptions[key], ctx, publicThis, key);
        }
    }
    if (provideOptions) {
        const provides = isFunction(provideOptions)
            ? provideOptions.call(publicThis)
            : provideOptions;
        Reflect.ownKeys(provides).forEach(key => {
            provide(key, provides[key]);
        });
    }
    if (created) {
        callHook(created, instance, "c" /* LifecycleHooks.CREATED */);
    }
    function registerLifecycleHook(register, hook) {
        if (isArray(hook)) {
            hook.forEach(_hook => register(_hook.bind(publicThis)));
        }
        else if (hook) {
            register(hook.bind(publicThis));
        }
    }
    registerLifecycleHook(onBeforeMount, beforeMount);
    registerLifecycleHook(onMounted, mounted);
    registerLifecycleHook(onBeforeUpdate, beforeUpdate);
    registerLifecycleHook(onUpdated, updated);
    registerLifecycleHook(onActivated, activated);
    registerLifecycleHook(onDeactivated, deactivated);
    registerLifecycleHook(onErrorCaptured, errorCaptured);
    registerLifecycleHook(onRenderTracked, renderTracked);
    registerLifecycleHook(onRenderTriggered, renderTriggered);
    registerLifecycleHook(onBeforeUnmount, beforeUnmount);
    registerLifecycleHook(onUnmounted, unmounted);
    registerLifecycleHook(onServerPrefetch, serverPrefetch);
    if (isArray(expose)) {
        if (expose.length) {
            const exposed = instance.exposed || (instance.exposed = {});
            expose.forEach(key => {
                Object.defineProperty(exposed, key, {
                    get: () => publicThis[key],
                    set: val => (publicThis[key] = val)
                });
            });
        }
        else if (!instance.exposed) {
            instance.exposed = {};
        }
    }
    // options that are handled when creating the instance but also need to be
    // applied from mixins
    if (render && instance.render === NOOP) {
        instance.render = render;
    }
    if (inheritAttrs != null) {
        instance.inheritAttrs = inheritAttrs;
    }
    // asset options.
    if (components)
        instance.components = components;
    if (directives)
        instance.directives = directives;
}
function resolveInjections(injectOptions, ctx, checkDuplicateProperties = NOOP, unwrapRef = false) {
    if (isArray(injectOptions)) {
        injectOptions = normalizeInject(injectOptions);
    }
    for (const key in injectOptions) {
        const opt = injectOptions[key];
        let injected;
        if (isObject$1(opt)) {
            if ('default' in opt) {
                injected = inject(opt.from || key, opt.default, true /* treat default function as factory */);
            }
            else {
                injected = inject(opt.from || key);
            }
        }
        else {
            injected = inject(opt);
        }
        if (isRef(injected)) {
            // TODO remove the check in 3.3
            if (unwrapRef) {
                Object.defineProperty(ctx, key, {
                    enumerable: true,
                    configurable: true,
                    get: () => injected.value,
                    set: v => (injected.value = v)
                });
            }
            else {
                ctx[key] = injected;
            }
        }
        else {
            ctx[key] = injected;
        }
    }
}
function callHook(hook, instance, type) {
    callWithAsyncErrorHandling(isArray(hook)
        ? hook.map(h => h.bind(instance.proxy))
        : hook.bind(instance.proxy), instance, type);
}
function createWatcher(raw, ctx, publicThis, key) {
    const getter = key.includes('.')
        ? createPathGetter(publicThis, key)
        : () => publicThis[key];
    if (isString(raw)) {
        const handler = ctx[raw];
        if (isFunction(handler)) {
            watch(getter, handler);
        }
    }
    else if (isFunction(raw)) {
        watch(getter, raw.bind(publicThis));
    }
    else if (isObject$1(raw)) {
        if (isArray(raw)) {
            raw.forEach(r => createWatcher(r, ctx, publicThis, key));
        }
        else {
            const handler = isFunction(raw.handler)
                ? raw.handler.bind(publicThis)
                : ctx[raw.handler];
            if (isFunction(handler)) {
                watch(getter, handler, raw);
            }
        }
    }
    else ;
}
/**
 * Resolve merged options and cache it on the component.
 * This is done only once per-component since the merging does not involve
 * instances.
 */
function resolveMergedOptions(instance) {
    const base = instance.type;
    const { mixins, extends: extendsOptions } = base;
    const { mixins: globalMixins, optionsCache: cache, config: { optionMergeStrategies } } = instance.appContext;
    const cached = cache.get(base);
    let resolved;
    if (cached) {
        resolved = cached;
    }
    else if (!globalMixins.length && !mixins && !extendsOptions) {
        {
            resolved = base;
        }
    }
    else {
        resolved = {};
        if (globalMixins.length) {
            globalMixins.forEach(m => mergeOptions(resolved, m, optionMergeStrategies, true));
        }
        mergeOptions(resolved, base, optionMergeStrategies);
    }
    if (isObject$1(base)) {
        cache.set(base, resolved);
    }
    return resolved;
}
function mergeOptions(to, from, strats, asMixin = false) {
    const { mixins, extends: extendsOptions } = from;
    if (extendsOptions) {
        mergeOptions(to, extendsOptions, strats, true);
    }
    if (mixins) {
        mixins.forEach((m) => mergeOptions(to, m, strats, true));
    }
    for (const key in from) {
        if (asMixin && key === 'expose') ;
        else {
            const strat = internalOptionMergeStrats[key] || (strats && strats[key]);
            to[key] = strat ? strat(to[key], from[key]) : from[key];
        }
    }
    return to;
}
const internalOptionMergeStrats = {
    data: mergeDataFn,
    props: mergeObjectOptions,
    emits: mergeObjectOptions,
    // objects
    methods: mergeObjectOptions,
    computed: mergeObjectOptions,
    // lifecycle
    beforeCreate: mergeAsArray,
    created: mergeAsArray,
    beforeMount: mergeAsArray,
    mounted: mergeAsArray,
    beforeUpdate: mergeAsArray,
    updated: mergeAsArray,
    beforeDestroy: mergeAsArray,
    beforeUnmount: mergeAsArray,
    destroyed: mergeAsArray,
    unmounted: mergeAsArray,
    activated: mergeAsArray,
    deactivated: mergeAsArray,
    errorCaptured: mergeAsArray,
    serverPrefetch: mergeAsArray,
    // assets
    components: mergeObjectOptions,
    directives: mergeObjectOptions,
    // watch
    watch: mergeWatchOptions,
    // provide / inject
    provide: mergeDataFn,
    inject: mergeInject
};
function mergeDataFn(to, from) {
    if (!from) {
        return to;
    }
    if (!to) {
        return from;
    }
    return function mergedDataFn() {
        return (extend)(isFunction(to) ? to.call(this, this) : to, isFunction(from) ? from.call(this, this) : from);
    };
}
function mergeInject(to, from) {
    return mergeObjectOptions(normalizeInject(to), normalizeInject(from));
}
function normalizeInject(raw) {
    if (isArray(raw)) {
        const res = {};
        for (let i = 0; i < raw.length; i++) {
            res[raw[i]] = raw[i];
        }
        return res;
    }
    return raw;
}
function mergeAsArray(to, from) {
    return to ? [...new Set([].concat(to, from))] : from;
}
function mergeObjectOptions(to, from) {
    return to ? extend(extend(Object.create(null), to), from) : from;
}
function mergeWatchOptions(to, from) {
    if (!to)
        return from;
    if (!from)
        return to;
    const merged = extend(Object.create(null), to);
    for (const key in from) {
        merged[key] = mergeAsArray(to[key], from[key]);
    }
    return merged;
}

function initProps(instance, rawProps, isStateful, // result of bitwise flag comparison
isSSR = false) {
    const props = {};
    const attrs = {};
    def(attrs, InternalObjectKey, 1);
    instance.propsDefaults = Object.create(null);
    setFullProps(instance, rawProps, props, attrs);
    // ensure all declared prop keys are present
    for (const key in instance.propsOptions[0]) {
        if (!(key in props)) {
            props[key] = undefined;
        }
    }
    if (isStateful) {
        // stateful
        instance.props = isSSR ? props : shallowReactive(props);
    }
    else {
        if (!instance.type.props) {
            // functional w/ optional props, props === attrs
            instance.props = attrs;
        }
        else {
            // functional w/ declared props
            instance.props = props;
        }
    }
    instance.attrs = attrs;
}
function updateProps(instance, rawProps, rawPrevProps, optimized) {
    const { props, attrs, vnode: { patchFlag } } = instance;
    const rawCurrentProps = toRaw(props);
    const [options] = instance.propsOptions;
    let hasAttrsChanged = false;
    if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    (optimized || patchFlag > 0) &&
        !(patchFlag & 16 /* PatchFlags.FULL_PROPS */)) {
        if (patchFlag & 8 /* PatchFlags.PROPS */) {
            // Compiler-generated props & no keys change, just set the updated
            // the props.
            const propsToUpdate = instance.vnode.dynamicProps;
            for (let i = 0; i < propsToUpdate.length; i++) {
                let key = propsToUpdate[i];
                // skip if the prop key is a declared emit event listener
                if (isEmitListener(instance.emitsOptions, key)) {
                    continue;
                }
                // PROPS flag guarantees rawProps to be non-null
                const value = rawProps[key];
                if (options) {
                    // attr / props separation was done on init and will be consistent
                    // in this code path, so just check if attrs have it.
                    if (hasOwn(attrs, key)) {
                        if (value !== attrs[key]) {
                            attrs[key] = value;
                            hasAttrsChanged = true;
                        }
                    }
                    else {
                        const camelizedKey = camelize(key);
                        props[camelizedKey] = resolvePropValue(options, rawCurrentProps, camelizedKey, value, instance, false /* isAbsent */);
                    }
                }
                else {
                    if (value !== attrs[key]) {
                        attrs[key] = value;
                        hasAttrsChanged = true;
                    }
                }
            }
        }
    }
    else {
        // full props update.
        if (setFullProps(instance, rawProps, props, attrs)) {
            hasAttrsChanged = true;
        }
        // in case of dynamic props, check if we need to delete keys from
        // the props object
        let kebabKey;
        for (const key in rawCurrentProps) {
            if (!rawProps ||
                // for camelCase
                (!hasOwn(rawProps, key) &&
                    // it's possible the original props was passed in as kebab-case
                    // and converted to camelCase (#955)
                    ((kebabKey = hyphenate(key)) === key || !hasOwn(rawProps, kebabKey)))) {
                if (options) {
                    if (rawPrevProps &&
                        // for camelCase
                        (rawPrevProps[key] !== undefined ||
                            // for kebab-case
                            rawPrevProps[kebabKey] !== undefined)) {
                        props[key] = resolvePropValue(options, rawCurrentProps, key, undefined, instance, true /* isAbsent */);
                    }
                }
                else {
                    delete props[key];
                }
            }
        }
        // in the case of functional component w/o props declaration, props and
        // attrs point to the same object so it should already have been updated.
        if (attrs !== rawCurrentProps) {
            for (const key in attrs) {
                if (!rawProps ||
                    (!hasOwn(rawProps, key) &&
                        (!false ))) {
                    delete attrs[key];
                    hasAttrsChanged = true;
                }
            }
        }
    }
    // trigger updates for $attrs in case it's used in component slots
    if (hasAttrsChanged) {
        trigger(instance, "set" /* TriggerOpTypes.SET */, '$attrs');
    }
}
function setFullProps(instance, rawProps, props, attrs) {
    const [options, needCastKeys] = instance.propsOptions;
    let hasAttrsChanged = false;
    let rawCastValues;
    if (rawProps) {
        for (let key in rawProps) {
            // key, ref are reserved and never passed down
            if (isReservedProp(key)) {
                continue;
            }
            const value = rawProps[key];
            // prop option names are camelized during normalization, so to support
            // kebab -> camel conversion here we need to camelize the key.
            let camelKey;
            if (options && hasOwn(options, (camelKey = camelize(key)))) {
                if (!needCastKeys || !needCastKeys.includes(camelKey)) {
                    props[camelKey] = value;
                }
                else {
                    (rawCastValues || (rawCastValues = {}))[camelKey] = value;
                }
            }
            else if (!isEmitListener(instance.emitsOptions, key)) {
                if (!(key in attrs) || value !== attrs[key]) {
                    attrs[key] = value;
                    hasAttrsChanged = true;
                }
            }
        }
    }
    if (needCastKeys) {
        const rawCurrentProps = toRaw(props);
        const castValues = rawCastValues || EMPTY_OBJ;
        for (let i = 0; i < needCastKeys.length; i++) {
            const key = needCastKeys[i];
            props[key] = resolvePropValue(options, rawCurrentProps, key, castValues[key], instance, !hasOwn(castValues, key));
        }
    }
    return hasAttrsChanged;
}
function resolvePropValue(options, props, key, value, instance, isAbsent) {
    const opt = options[key];
    if (opt != null) {
        const hasDefault = hasOwn(opt, 'default');
        // default values
        if (hasDefault && value === undefined) {
            const defaultValue = opt.default;
            if (opt.type !== Function && isFunction(defaultValue)) {
                const { propsDefaults } = instance;
                if (key in propsDefaults) {
                    value = propsDefaults[key];
                }
                else {
                    setCurrentInstance(instance);
                    value = propsDefaults[key] = defaultValue.call(null, props);
                    unsetCurrentInstance();
                }
            }
            else {
                value = defaultValue;
            }
        }
        // boolean casting
        if (opt[0 /* BooleanFlags.shouldCast */]) {
            if (isAbsent && !hasDefault) {
                value = false;
            }
            else if (opt[1 /* BooleanFlags.shouldCastTrue */] &&
                (value === '' || value === hyphenate(key))) {
                value = true;
            }
        }
    }
    return value;
}
function normalizePropsOptions(comp, appContext, asMixin = false) {
    const cache = appContext.propsCache;
    const cached = cache.get(comp);
    if (cached) {
        return cached;
    }
    const raw = comp.props;
    const normalized = {};
    const needCastKeys = [];
    // apply mixin/extends props
    let hasExtends = false;
    if (!isFunction(comp)) {
        const extendProps = (raw) => {
            hasExtends = true;
            const [props, keys] = normalizePropsOptions(raw, appContext, true);
            extend(normalized, props);
            if (keys)
                needCastKeys.push(...keys);
        };
        if (!asMixin && appContext.mixins.length) {
            appContext.mixins.forEach(extendProps);
        }
        if (comp.extends) {
            extendProps(comp.extends);
        }
        if (comp.mixins) {
            comp.mixins.forEach(extendProps);
        }
    }
    if (!raw && !hasExtends) {
        if (isObject$1(comp)) {
            cache.set(comp, EMPTY_ARR);
        }
        return EMPTY_ARR;
    }
    if (isArray(raw)) {
        for (let i = 0; i < raw.length; i++) {
            const normalizedKey = camelize(raw[i]);
            if (validatePropName(normalizedKey)) {
                normalized[normalizedKey] = EMPTY_OBJ;
            }
        }
    }
    else if (raw) {
        for (const key in raw) {
            const normalizedKey = camelize(key);
            if (validatePropName(normalizedKey)) {
                const opt = raw[key];
                const prop = (normalized[normalizedKey] =
                    isArray(opt) || isFunction(opt) ? { type: opt } : Object.assign({}, opt));
                if (prop) {
                    const booleanIndex = getTypeIndex(Boolean, prop.type);
                    const stringIndex = getTypeIndex(String, prop.type);
                    prop[0 /* BooleanFlags.shouldCast */] = booleanIndex > -1;
                    prop[1 /* BooleanFlags.shouldCastTrue */] =
                        stringIndex < 0 || booleanIndex < stringIndex;
                    // if the prop needs boolean casting or default value
                    if (booleanIndex > -1 || hasOwn(prop, 'default')) {
                        needCastKeys.push(normalizedKey);
                    }
                }
            }
        }
    }
    const res = [normalized, needCastKeys];
    if (isObject$1(comp)) {
        cache.set(comp, res);
    }
    return res;
}
function validatePropName(key) {
    if (key[0] !== '$') {
        return true;
    }
    return false;
}
// use function string name to check type constructors
// so that it works across vms / iframes.
function getType(ctor) {
    const match = ctor && ctor.toString().match(/^\s*(function|class) (\w+)/);
    return match ? match[2] : ctor === null ? 'null' : '';
}
function isSameType(a, b) {
    return getType(a) === getType(b);
}
function getTypeIndex(type, expectedTypes) {
    if (isArray(expectedTypes)) {
        return expectedTypes.findIndex(t => isSameType(t, type));
    }
    else if (isFunction(expectedTypes)) {
        return isSameType(expectedTypes, type) ? 0 : -1;
    }
    return -1;
}

const isInternalKey = (key) => key[0] === '_' || key === '$stable';
const normalizeSlotValue = (value) => isArray(value)
    ? value.map(normalizeVNode)
    : [normalizeVNode(value)];
const normalizeSlot = (key, rawSlot, ctx) => {
    if (rawSlot._n) {
        // already normalized - #5353
        return rawSlot;
    }
    const normalized = withCtx((...args) => {
        if (("production" !== 'production') && currentInstance) ;
        return normalizeSlotValue(rawSlot(...args));
    }, ctx);
    normalized._c = false;
    return normalized;
};
const normalizeObjectSlots = (rawSlots, slots, instance) => {
    const ctx = rawSlots._ctx;
    for (const key in rawSlots) {
        if (isInternalKey(key))
            continue;
        const value = rawSlots[key];
        if (isFunction(value)) {
            slots[key] = normalizeSlot(key, value, ctx);
        }
        else if (value != null) {
            const normalized = normalizeSlotValue(value);
            slots[key] = () => normalized;
        }
    }
};
const normalizeVNodeSlots = (instance, children) => {
    const normalized = normalizeSlotValue(children);
    instance.slots.default = () => normalized;
};
const initSlots = (instance, children) => {
    if (instance.vnode.shapeFlag & 32 /* ShapeFlags.SLOTS_CHILDREN */) {
        const type = children._;
        if (type) {
            // users can get the shallow readonly version of the slots object through `this.$slots`,
            // we should avoid the proxy object polluting the slots of the internal instance
            instance.slots = toRaw(children);
            // make compiler marker non-enumerable
            def(children, '_', type);
        }
        else {
            normalizeObjectSlots(children, (instance.slots = {}));
        }
    }
    else {
        instance.slots = {};
        if (children) {
            normalizeVNodeSlots(instance, children);
        }
    }
    def(instance.slots, InternalObjectKey, 1);
};
const updateSlots = (instance, children, optimized) => {
    const { vnode, slots } = instance;
    let needDeletionCheck = true;
    let deletionComparisonTarget = EMPTY_OBJ;
    if (vnode.shapeFlag & 32 /* ShapeFlags.SLOTS_CHILDREN */) {
        const type = children._;
        if (type) {
            // compiled slots.
            if (optimized && type === 1 /* SlotFlags.STABLE */) {
                // compiled AND stable.
                // no need to update, and skip stale slots removal.
                needDeletionCheck = false;
            }
            else {
                // compiled but dynamic (v-if/v-for on slots) - update slots, but skip
                // normalization.
                extend(slots, children);
                // #2893
                // when rendering the optimized slots by manually written render function,
                // we need to delete the `slots._` flag if necessary to make subsequent updates reliable,
                // i.e. let the `renderSlot` create the bailed Fragment
                if (!optimized && type === 1 /* SlotFlags.STABLE */) {
                    delete slots._;
                }
            }
        }
        else {
            needDeletionCheck = !children.$stable;
            normalizeObjectSlots(children, slots);
        }
        deletionComparisonTarget = children;
    }
    else if (children) {
        // non slot object children (direct value) passed to a component
        normalizeVNodeSlots(instance, children);
        deletionComparisonTarget = { default: 1 };
    }
    // delete stale slots
    if (needDeletionCheck) {
        for (const key in slots) {
            if (!isInternalKey(key) && !(key in deletionComparisonTarget)) {
                delete slots[key];
            }
        }
    }
};

function createAppContext() {
    return {
        app: null,
        config: {
            isNativeTag: NO,
            performance: false,
            globalProperties: {},
            optionMergeStrategies: {},
            errorHandler: undefined,
            warnHandler: undefined,
            compilerOptions: {}
        },
        mixins: [],
        components: {},
        directives: {},
        provides: Object.create(null),
        optionsCache: new WeakMap(),
        propsCache: new WeakMap(),
        emitsCache: new WeakMap()
    };
}
let uid$1 = 0;
function createAppAPI(render, hydrate) {
    return function createApp(rootComponent, rootProps = null) {
        if (!isFunction(rootComponent)) {
            rootComponent = Object.assign({}, rootComponent);
        }
        if (rootProps != null && !isObject$1(rootProps)) {
            rootProps = null;
        }
        const context = createAppContext();
        const installedPlugins = new Set();
        let isMounted = false;
        const app = (context.app = {
            _uid: uid$1++,
            _component: rootComponent,
            _props: rootProps,
            _container: null,
            _context: context,
            _instance: null,
            version,
            get config() {
                return context.config;
            },
            set config(v) {
            },
            use(plugin, ...options) {
                if (installedPlugins.has(plugin)) ;
                else if (plugin && isFunction(plugin.install)) {
                    installedPlugins.add(plugin);
                    plugin.install(app, ...options);
                }
                else if (isFunction(plugin)) {
                    installedPlugins.add(plugin);
                    plugin(app, ...options);
                }
                else ;
                return app;
            },
            mixin(mixin) {
                {
                    if (!context.mixins.includes(mixin)) {
                        context.mixins.push(mixin);
                    }
                }
                return app;
            },
            component(name, component) {
                if (!component) {
                    return context.components[name];
                }
                context.components[name] = component;
                return app;
            },
            directive(name, directive) {
                if (!directive) {
                    return context.directives[name];
                }
                context.directives[name] = directive;
                return app;
            },
            mount(rootContainer, isHydrate, isSVG) {
                if (!isMounted) {
                    const vnode = createVNode(rootComponent, rootProps);
                    // store app context on the root VNode.
                    // this will be set on the root instance on initial mount.
                    vnode.appContext = context;
                    if (isHydrate && hydrate) {
                        hydrate(vnode, rootContainer);
                    }
                    else {
                        render(vnode, rootContainer, isSVG);
                    }
                    isMounted = true;
                    app._container = rootContainer;
                    rootContainer.__vue_app__ = app;
                    return getExposeProxy(vnode.component) || vnode.component.proxy;
                }
            },
            unmount() {
                if (isMounted) {
                    render(null, app._container);
                    delete app._container.__vue_app__;
                }
            },
            provide(key, value) {
                context.provides[key] = value;
                return app;
            }
        });
        return app;
    };
}

/**
 * Function for handling a template ref
 */
function setRef(rawRef, oldRawRef, parentSuspense, vnode, isUnmount = false) {
    if (isArray(rawRef)) {
        rawRef.forEach((r, i) => setRef(r, oldRawRef && (isArray(oldRawRef) ? oldRawRef[i] : oldRawRef), parentSuspense, vnode, isUnmount));
        return;
    }
    if (isAsyncWrapper(vnode) && !isUnmount) {
        // when mounting async components, nothing needs to be done,
        // because the template ref is forwarded to inner component
        return;
    }
    const refValue = vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */
        ? getExposeProxy(vnode.component) || vnode.component.proxy
        : vnode.el;
    const value = isUnmount ? null : refValue;
    const { i: owner, r: ref } = rawRef;
    const oldRef = oldRawRef && oldRawRef.r;
    const refs = owner.refs === EMPTY_OBJ ? (owner.refs = {}) : owner.refs;
    const setupState = owner.setupState;
    // dynamic ref changed. unset old ref
    if (oldRef != null && oldRef !== ref) {
        if (isString(oldRef)) {
            refs[oldRef] = null;
            if (hasOwn(setupState, oldRef)) {
                setupState[oldRef] = null;
            }
        }
        else if (isRef(oldRef)) {
            oldRef.value = null;
        }
    }
    if (isFunction(ref)) {
        callWithErrorHandling(ref, owner, 12 /* ErrorCodes.FUNCTION_REF */, [value, refs]);
    }
    else {
        const _isString = isString(ref);
        const _isRef = isRef(ref);
        if (_isString || _isRef) {
            const doSet = () => {
                if (rawRef.f) {
                    const existing = _isString
                        ? hasOwn(setupState, ref)
                            ? setupState[ref]
                            : refs[ref]
                        : ref.value;
                    if (isUnmount) {
                        isArray(existing) && remove(existing, refValue);
                    }
                    else {
                        if (!isArray(existing)) {
                            if (_isString) {
                                refs[ref] = [refValue];
                                if (hasOwn(setupState, ref)) {
                                    setupState[ref] = refs[ref];
                                }
                            }
                            else {
                                ref.value = [refValue];
                                if (rawRef.k)
                                    refs[rawRef.k] = ref.value;
                            }
                        }
                        else if (!existing.includes(refValue)) {
                            existing.push(refValue);
                        }
                    }
                }
                else if (_isString) {
                    refs[ref] = value;
                    if (hasOwn(setupState, ref)) {
                        setupState[ref] = value;
                    }
                }
                else if (_isRef) {
                    ref.value = value;
                    if (rawRef.k)
                        refs[rawRef.k] = value;
                }
                else ;
            };
            if (value) {
                doSet.id = -1;
                queuePostRenderEffect(doSet, parentSuspense);
            }
            else {
                doSet();
            }
        }
    }
}

const queuePostRenderEffect = queueEffectWithSuspense
    ;
/**
 * The createRenderer function accepts two generic arguments:
 * HostNode and HostElement, corresponding to Node and Element types in the
 * host environment. For example, for runtime-dom, HostNode would be the DOM
 * `Node` interface and HostElement would be the DOM `Element` interface.
 *
 * Custom renderers can pass in the platform specific types like this:
 *
 * ``` js
 * const { render, createApp } = createRenderer<Node, Element>({
 *   patchProp,
 *   ...nodeOps
 * })
 * ```
 */
function createRenderer(options) {
    return baseCreateRenderer(options);
}
// implementation
function baseCreateRenderer(options, createHydrationFns) {
    const target = getGlobalThis();
    target.__VUE__ = true;
    const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, createElement: hostCreateElement, createText: hostCreateText, createComment: hostCreateComment, setText: hostSetText, setElementText: hostSetElementText, parentNode: hostParentNode, nextSibling: hostNextSibling, setScopeId: hostSetScopeId = NOOP, insertStaticContent: hostInsertStaticContent } = options;
    // Note: functions inside this closure should use `const xxx = () => {}`
    // style in order to prevent being inlined by minifiers.
    const patch = (n1, n2, container, anchor = null, parentComponent = null, parentSuspense = null, isSVG = false, slotScopeIds = null, optimized = !!n2.dynamicChildren) => {
        if (n1 === n2) {
            return;
        }
        // patching & not same type, unmount old tree
        if (n1 && !isSameVNodeType(n1, n2)) {
            anchor = getNextHostNode(n1);
            unmount(n1, parentComponent, parentSuspense, true);
            n1 = null;
        }
        if (n2.patchFlag === -2 /* PatchFlags.BAIL */) {
            optimized = false;
            n2.dynamicChildren = null;
        }
        const { type, ref, shapeFlag } = n2;
        switch (type) {
            case Text:
                processText(n1, n2, container, anchor);
                break;
            case Comment:
                processCommentNode(n1, n2, container, anchor);
                break;
            case Static:
                if (n1 == null) {
                    mountStaticNode(n2, container, anchor, isSVG);
                }
                break;
            case Fragment:
                processFragment(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                }
                else if (shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
                    processComponent(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                }
                else if (shapeFlag & 64 /* ShapeFlags.TELEPORT */) {
                    type.process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals);
                }
                else if (shapeFlag & 128 /* ShapeFlags.SUSPENSE */) {
                    type.process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals);
                }
                else ;
        }
        // set ref
        if (ref != null && parentComponent) {
            setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2);
        }
    };
    const processText = (n1, n2, container, anchor) => {
        if (n1 == null) {
            hostInsert((n2.el = hostCreateText(n2.children)), container, anchor);
        }
        else {
            const el = (n2.el = n1.el);
            if (n2.children !== n1.children) {
                hostSetText(el, n2.children);
            }
        }
    };
    const processCommentNode = (n1, n2, container, anchor) => {
        if (n1 == null) {
            hostInsert((n2.el = hostCreateComment(n2.children || '')), container, anchor);
        }
        else {
            // there's no support for dynamic comments
            n2.el = n1.el;
        }
    };
    const mountStaticNode = (n2, container, anchor, isSVG) => {
        [n2.el, n2.anchor] = hostInsertStaticContent(n2.children, container, anchor, isSVG, n2.el, n2.anchor);
    };
    const moveStaticNode = ({ el, anchor }, container, nextSibling) => {
        let next;
        while (el && el !== anchor) {
            next = hostNextSibling(el);
            hostInsert(el, container, nextSibling);
            el = next;
        }
        hostInsert(anchor, container, nextSibling);
    };
    const removeStaticNode = ({ el, anchor }) => {
        let next;
        while (el && el !== anchor) {
            next = hostNextSibling(el);
            hostRemove(el);
            el = next;
        }
        hostRemove(anchor);
    };
    const processElement = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
        isSVG = isSVG || n2.type === 'svg';
        if (n1 == null) {
            mountElement(n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
        }
        else {
            patchElement(n1, n2, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
        }
    };
    const mountElement = (vnode, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
        let el;
        let vnodeHook;
        const { type, props, shapeFlag, transition, dirs } = vnode;
        el = vnode.el = hostCreateElement(vnode.type, isSVG, props && props.is, props);
        // mount children first, since some props may rely on child content
        // being already rendered, e.g. `<select value>`
        if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
            hostSetElementText(el, vnode.children);
        }
        else if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, null, parentComponent, parentSuspense, isSVG && type !== 'foreignObject', slotScopeIds, optimized);
        }
        if (dirs) {
            invokeDirectiveHook(vnode, null, parentComponent, 'created');
        }
        // scopeId
        setScopeId(el, vnode, vnode.scopeId, slotScopeIds, parentComponent);
        // props
        if (props) {
            for (const key in props) {
                if (key !== 'value' && !isReservedProp(key)) {
                    hostPatchProp(el, key, null, props[key], isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                }
            }
            /**
             * Special case for setting value on DOM elements:
             * - it can be order-sensitive (e.g. should be set *after* min/max, #2325, #4024)
             * - it needs to be forced (#1471)
             * #2353 proposes adding another renderer option to configure this, but
             * the properties affects are so finite it is worth special casing it
             * here to reduce the complexity. (Special casing it also should not
             * affect non-DOM renderers)
             */
            if ('value' in props) {
                hostPatchProp(el, 'value', null, props.value);
            }
            if ((vnodeHook = props.onVnodeBeforeMount)) {
                invokeVNodeHook(vnodeHook, parentComponent, vnode);
            }
        }
        if (dirs) {
            invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount');
        }
        // #1583 For inside suspense + suspense not resolved case, enter hook should call when suspense resolved
        // #1689 For inside suspense + suspense resolved case, just call it
        const needCallTransitionHooks = (!parentSuspense || (parentSuspense && !parentSuspense.pendingBranch)) &&
            transition &&
            !transition.persisted;
        if (needCallTransitionHooks) {
            transition.beforeEnter(el);
        }
        hostInsert(el, container, anchor);
        if ((vnodeHook = props && props.onVnodeMounted) ||
            needCallTransitionHooks ||
            dirs) {
            queuePostRenderEffect(() => {
                vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
                needCallTransitionHooks && transition.enter(el);
                dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted');
            }, parentSuspense);
        }
    };
    const setScopeId = (el, vnode, scopeId, slotScopeIds, parentComponent) => {
        if (scopeId) {
            hostSetScopeId(el, scopeId);
        }
        if (slotScopeIds) {
            for (let i = 0; i < slotScopeIds.length; i++) {
                hostSetScopeId(el, slotScopeIds[i]);
            }
        }
        if (parentComponent) {
            let subTree = parentComponent.subTree;
            if (vnode === subTree) {
                const parentVNode = parentComponent.vnode;
                setScopeId(el, parentVNode, parentVNode.scopeId, parentVNode.slotScopeIds, parentComponent.parent);
            }
        }
    };
    const mountChildren = (children, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, start = 0) => {
        for (let i = start; i < children.length; i++) {
            const child = (children[i] = optimized
                ? cloneIfMounted(children[i])
                : normalizeVNode(children[i]));
            patch(null, child, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
        }
    };
    const patchElement = (n1, n2, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
        const el = (n2.el = n1.el);
        let { patchFlag, dynamicChildren, dirs } = n2;
        // #1426 take the old vnode's patch flag into account since user may clone a
        // compiler-generated vnode, which de-opts to FULL_PROPS
        patchFlag |= n1.patchFlag & 16 /* PatchFlags.FULL_PROPS */;
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        let vnodeHook;
        // disable recurse in beforeUpdate hooks
        parentComponent && toggleRecurse(parentComponent, false);
        if ((vnodeHook = newProps.onVnodeBeforeUpdate)) {
            invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
        }
        if (dirs) {
            invokeDirectiveHook(n2, n1, parentComponent, 'beforeUpdate');
        }
        parentComponent && toggleRecurse(parentComponent, true);
        const areChildrenSVG = isSVG && n2.type !== 'foreignObject';
        if (dynamicChildren) {
            patchBlockChildren(n1.dynamicChildren, dynamicChildren, el, parentComponent, parentSuspense, areChildrenSVG, slotScopeIds);
        }
        else if (!optimized) {
            // full diff
            patchChildren(n1, n2, el, null, parentComponent, parentSuspense, areChildrenSVG, slotScopeIds, false);
        }
        if (patchFlag > 0) {
            // the presence of a patchFlag means this element's render code was
            // generated by the compiler and can take the fast path.
            // in this path old node and new node are guaranteed to have the same shape
            // (i.e. at the exact same position in the source template)
            if (patchFlag & 16 /* PatchFlags.FULL_PROPS */) {
                // element props contain dynamic keys, full diff needed
                patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
            }
            else {
                // class
                // this flag is matched when the element has dynamic class bindings.
                if (patchFlag & 2 /* PatchFlags.CLASS */) {
                    if (oldProps.class !== newProps.class) {
                        hostPatchProp(el, 'class', null, newProps.class, isSVG);
                    }
                }
                // style
                // this flag is matched when the element has dynamic style bindings
                if (patchFlag & 4 /* PatchFlags.STYLE */) {
                    hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG);
                }
                // props
                // This flag is matched when the element has dynamic prop/attr bindings
                // other than class and style. The keys of dynamic prop/attrs are saved for
                // faster iteration.
                // Note dynamic keys like :[foo]="bar" will cause this optimization to
                // bail out and go through a full diff because we need to unset the old key
                if (patchFlag & 8 /* PatchFlags.PROPS */) {
                    // if the flag is present then dynamicProps must be non-null
                    const propsToUpdate = n2.dynamicProps;
                    for (let i = 0; i < propsToUpdate.length; i++) {
                        const key = propsToUpdate[i];
                        const prev = oldProps[key];
                        const next = newProps[key];
                        // #1471 force patch value
                        if (next !== prev || key === 'value') {
                            hostPatchProp(el, key, prev, next, isSVG, n1.children, parentComponent, parentSuspense, unmountChildren);
                        }
                    }
                }
            }
            // text
            // This flag is matched when the element has only dynamic text children.
            if (patchFlag & 1 /* PatchFlags.TEXT */) {
                if (n1.children !== n2.children) {
                    hostSetElementText(el, n2.children);
                }
            }
        }
        else if (!optimized && dynamicChildren == null) {
            // unoptimized, full diff
            patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
        }
        if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
            queuePostRenderEffect(() => {
                vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
                dirs && invokeDirectiveHook(n2, n1, parentComponent, 'updated');
            }, parentSuspense);
        }
    };
    // The fast path for blocks.
    const patchBlockChildren = (oldChildren, newChildren, fallbackContainer, parentComponent, parentSuspense, isSVG, slotScopeIds) => {
        for (let i = 0; i < newChildren.length; i++) {
            const oldVNode = oldChildren[i];
            const newVNode = newChildren[i];
            // Determine the container (parent element) for the patch.
            const container = 
            // oldVNode may be an errored async setup() component inside Suspense
            // which will not have a mounted element
            oldVNode.el &&
                // - In the case of a Fragment, we need to provide the actual parent
                // of the Fragment itself so it can move its children.
                (oldVNode.type === Fragment ||
                    // - In the case of different nodes, there is going to be a replacement
                    // which also requires the correct parent container
                    !isSameVNodeType(oldVNode, newVNode) ||
                    // - In the case of a component, it could contain anything.
                    oldVNode.shapeFlag & (6 /* ShapeFlags.COMPONENT */ | 64 /* ShapeFlags.TELEPORT */))
                ? hostParentNode(oldVNode.el)
                : // In other cases, the parent container is not actually used so we
                    // just pass the block element here to avoid a DOM parentNode call.
                    fallbackContainer;
            patch(oldVNode, newVNode, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, true);
        }
    };
    const patchProps = (el, vnode, oldProps, newProps, parentComponent, parentSuspense, isSVG) => {
        if (oldProps !== newProps) {
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    if (!isReservedProp(key) && !(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                    }
                }
            }
            for (const key in newProps) {
                // empty string is not valid prop
                if (isReservedProp(key))
                    continue;
                const next = newProps[key];
                const prev = oldProps[key];
                // defer patching value
                if (next !== prev && key !== 'value') {
                    hostPatchProp(el, key, prev, next, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                }
            }
            if ('value' in newProps) {
                hostPatchProp(el, 'value', oldProps.value, newProps.value);
            }
        }
    };
    const processFragment = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
        const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''));
        const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''));
        let { patchFlag, dynamicChildren, slotScopeIds: fragmentSlotScopeIds } = n2;
        // check if this is a slot fragment with :slotted scope ids
        if (fragmentSlotScopeIds) {
            slotScopeIds = slotScopeIds
                ? slotScopeIds.concat(fragmentSlotScopeIds)
                : fragmentSlotScopeIds;
        }
        if (n1 == null) {
            hostInsert(fragmentStartAnchor, container, anchor);
            hostInsert(fragmentEndAnchor, container, anchor);
            // a fragment can only have array children
            // since they are either generated by the compiler, or implicitly created
            // from arrays.
            mountChildren(n2.children, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
        }
        else {
            if (patchFlag > 0 &&
                patchFlag & 64 /* PatchFlags.STABLE_FRAGMENT */ &&
                dynamicChildren &&
                // #2715 the previous fragment could've been a BAILed one as a result
                // of renderSlot() with no valid children
                n1.dynamicChildren) {
                // a stable fragment (template root or <template v-for>) doesn't need to
                // patch children order, but it may contain dynamicChildren.
                patchBlockChildren(n1.dynamicChildren, dynamicChildren, container, parentComponent, parentSuspense, isSVG, slotScopeIds);
                if (
                // #2080 if the stable fragment has a key, it's a <template v-for> that may
                //  get moved around. Make sure all root level vnodes inherit el.
                // #2134 or if it's a component root, it may also get moved around
                // as the component is being moved.
                n2.key != null ||
                    (parentComponent && n2 === parentComponent.subTree)) {
                    traverseStaticChildren(n1, n2, true /* shallow */);
                }
            }
            else {
                // keyed / unkeyed, or manual fragments.
                // for keyed & unkeyed, since they are compiler generated from v-for,
                // each child is guaranteed to be a block so the fragment will never
                // have dynamicChildren.
                patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
            }
        }
    };
    const processComponent = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
        n2.slotScopeIds = slotScopeIds;
        if (n1 == null) {
            if (n2.shapeFlag & 512 /* ShapeFlags.COMPONENT_KEPT_ALIVE */) {
                parentComponent.ctx.activate(n2, container, anchor, isSVG, optimized);
            }
            else {
                mountComponent(n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
            }
        }
        else {
            updateComponent(n1, n2, optimized);
        }
    };
    const mountComponent = (initialVNode, container, anchor, parentComponent, parentSuspense, isSVG, optimized) => {
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent, parentSuspense));
        // inject renderer internals for keepAlive
        if (isKeepAlive(initialVNode)) {
            instance.ctx.renderer = internals;
        }
        // resolve props and slots for setup context
        {
            setupComponent(instance);
        }
        // setup() is async. This component relies on async logic to be resolved
        // before proceeding
        if (instance.asyncDep) {
            parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect);
            // Give it a placeholder if this is not hydration
            // TODO handle self-defined fallback
            if (!initialVNode.el) {
                const placeholder = (instance.subTree = createVNode(Comment));
                processCommentNode(null, placeholder, container, anchor);
            }
            return;
        }
        setupRenderEffect(instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized);
    };
    const updateComponent = (n1, n2, optimized) => {
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2, optimized)) {
            if (instance.asyncDep &&
                !instance.asyncResolved) {
                updateComponentPreRender(instance, n2, optimized);
                return;
            }
            else {
                // normal update
                instance.next = n2;
                // in case the child component is also queued, remove it to avoid
                // double updating the same child component in the same flush.
                invalidateJob(instance.update);
                // instance.update is the reactive effect.
                instance.update();
            }
        }
        else {
            // no update needed. just copy over properties
            n2.el = n1.el;
            instance.vnode = n2;
        }
    };
    const setupRenderEffect = (instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized) => {
        const componentUpdateFn = () => {
            if (!instance.isMounted) {
                let vnodeHook;
                const { el, props } = initialVNode;
                const { bm, m, parent } = instance;
                const isAsyncWrapperVNode = isAsyncWrapper(initialVNode);
                toggleRecurse(instance, false);
                // beforeMount hook
                if (bm) {
                    invokeArrayFns(bm);
                }
                // onVnodeBeforeMount
                if (!isAsyncWrapperVNode &&
                    (vnodeHook = props && props.onVnodeBeforeMount)) {
                    invokeVNodeHook(vnodeHook, parent, initialVNode);
                }
                toggleRecurse(instance, true);
                if (el && hydrateNode) {
                    // vnode has adopted host node - perform hydration instead of mount.
                    const hydrateSubTree = () => {
                        instance.subTree = renderComponentRoot(instance);
                        hydrateNode(el, instance.subTree, instance, parentSuspense, null);
                    };
                    if (isAsyncWrapperVNode) {
                        initialVNode.type.__asyncLoader().then(
                        // note: we are moving the render call into an async callback,
                        // which means it won't track dependencies - but it's ok because
                        // a server-rendered async wrapper is already in resolved state
                        // and it will never need to change.
                        () => !instance.isUnmounted && hydrateSubTree());
                    }
                    else {
                        hydrateSubTree();
                    }
                }
                else {
                    const subTree = (instance.subTree = renderComponentRoot(instance));
                    patch(null, subTree, container, anchor, instance, parentSuspense, isSVG);
                    initialVNode.el = subTree.el;
                }
                // mounted hook
                if (m) {
                    queuePostRenderEffect(m, parentSuspense);
                }
                // onVnodeMounted
                if (!isAsyncWrapperVNode &&
                    (vnodeHook = props && props.onVnodeMounted)) {
                    const scopedInitialVNode = initialVNode;
                    queuePostRenderEffect(() => invokeVNodeHook(vnodeHook, parent, scopedInitialVNode), parentSuspense);
                }
                // activated hook for keep-alive roots.
                // #1742 activated hook must be accessed after first render
                // since the hook may be injected by a child keep-alive
                if (initialVNode.shapeFlag & 256 /* ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE */ ||
                    (parent &&
                        isAsyncWrapper(parent.vnode) &&
                        parent.vnode.shapeFlag & 256 /* ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE */)) {
                    instance.a && queuePostRenderEffect(instance.a, parentSuspense);
                }
                instance.isMounted = true;
                // #2458: deference mount-only object parameters to prevent memleaks
                initialVNode = container = anchor = null;
            }
            else {
                // updateComponent
                // This is triggered by mutation of component's own state (next: null)
                // OR parent calling processComponent (next: VNode)
                let { next, bu, u, parent, vnode } = instance;
                let originNext = next;
                let vnodeHook;
                // Disallow component effect recursion during pre-lifecycle hooks.
                toggleRecurse(instance, false);
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next, optimized);
                }
                else {
                    next = vnode;
                }
                // beforeUpdate hook
                if (bu) {
                    invokeArrayFns(bu);
                }
                // onVnodeBeforeUpdate
                if ((vnodeHook = next.props && next.props.onVnodeBeforeUpdate)) {
                    invokeVNodeHook(vnodeHook, parent, next, vnode);
                }
                toggleRecurse(instance, true);
                const nextTree = renderComponentRoot(instance);
                const prevTree = instance.subTree;
                instance.subTree = nextTree;
                patch(prevTree, nextTree, 
                // parent may have changed if it's in a teleport
                hostParentNode(prevTree.el), 
                // anchor may have changed if it's in a fragment
                getNextHostNode(prevTree), instance, parentSuspense, isSVG);
                next.el = nextTree.el;
                if (originNext === null) {
                    // self-triggered update. In case of HOC, update parent component
                    // vnode el. HOC is indicated by parent instance's subTree pointing
                    // to child component's vnode
                    updateHOCHostEl(instance, nextTree.el);
                }
                // updated hook
                if (u) {
                    queuePostRenderEffect(u, parentSuspense);
                }
                // onVnodeUpdated
                if ((vnodeHook = next.props && next.props.onVnodeUpdated)) {
                    queuePostRenderEffect(() => invokeVNodeHook(vnodeHook, parent, next, vnode), parentSuspense);
                }
            }
        };
        // create reactive effect for rendering
        const effect = (instance.effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update), instance.scope // track it in component's effect scope
        ));
        const update = (instance.update = () => effect.run());
        update.id = instance.uid;
        // allowRecurse
        // #1801, #2043 component render effects should allow recursive updates
        toggleRecurse(instance, true);
        update();
    };
    const updateComponentPreRender = (instance, nextVNode, optimized) => {
        nextVNode.component = instance;
        const prevProps = instance.vnode.props;
        instance.vnode = nextVNode;
        instance.next = null;
        updateProps(instance, nextVNode.props, prevProps, optimized);
        updateSlots(instance, nextVNode.children, optimized);
        pauseTracking();
        // props update may have triggered pre-flush watchers.
        // flush them before the render update.
        flushPreFlushCbs();
        resetTracking();
    };
    const patchChildren = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized = false) => {
        const c1 = n1 && n1.children;
        const prevShapeFlag = n1 ? n1.shapeFlag : 0;
        const c2 = n2.children;
        const { patchFlag, shapeFlag } = n2;
        // fast path
        if (patchFlag > 0) {
            if (patchFlag & 128 /* PatchFlags.KEYED_FRAGMENT */) {
                // this could be either fully-keyed or mixed (some keyed some not)
                // presence of patchFlag means children are guaranteed to be arrays
                patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                return;
            }
            else if (patchFlag & 256 /* PatchFlags.UNKEYED_FRAGMENT */) {
                // unkeyed
                patchUnkeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                return;
            }
        }
        // children has 3 possibilities: text, array or no children.
        if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
            // text children fast path
            if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                unmountChildren(c1, parentComponent, parentSuspense);
            }
            if (c2 !== c1) {
                hostSetElementText(container, c2);
            }
        }
        else {
            if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                // prev children was array
                if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                    // two arrays, cannot assume anything, do full diff
                    patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                }
                else {
                    // no new children, just unmount old
                    unmountChildren(c1, parentComponent, parentSuspense, true);
                }
            }
            else {
                // prev children was text OR null
                // new children is array OR null
                if (prevShapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                    hostSetElementText(container, '');
                }
                // mount new if array
                if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                    mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                }
            }
        }
    };
    const patchUnkeyedChildren = (c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
        c1 = c1 || EMPTY_ARR;
        c2 = c2 || EMPTY_ARR;
        const oldLength = c1.length;
        const newLength = c2.length;
        const commonLength = Math.min(oldLength, newLength);
        let i;
        for (i = 0; i < commonLength; i++) {
            const nextChild = (c2[i] = optimized
                ? cloneIfMounted(c2[i])
                : normalizeVNode(c2[i]));
            patch(c1[i], nextChild, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
        }
        if (oldLength > newLength) {
            // remove old
            unmountChildren(c1, parentComponent, parentSuspense, true, false, commonLength);
        }
        else {
            // mount new
            mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, commonLength);
        }
    };
    // can be all-keyed or mixed
    const patchKeyedChildren = (c1, c2, container, parentAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
        let i = 0;
        const l2 = c2.length;
        let e1 = c1.length - 1; // prev ending index
        let e2 = l2 - 1; // next ending index
        // 1. sync from start
        // (a b) c
        // (a b) d e
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = (c2[i] = optimized
                ? cloneIfMounted(c2[i])
                : normalizeVNode(c2[i]));
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
            }
            else {
                break;
            }
            i++;
        }
        // 2. sync from end
        // a (b c)
        // d e (b c)
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = (c2[e2] = optimized
                ? cloneIfMounted(c2[e2])
                : normalizeVNode(c2[e2]));
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // 3. common sequence + mount
        // (a b)
        // (a b) c
        // i = 2, e1 = 1, e2 = 2
        // (a b)
        // c (a b)
        // i = 0, e1 = -1, e2 = 0
        if (i > e1) {
            if (i <= e2) {
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
                while (i <= e2) {
                    patch(null, (c2[i] = optimized
                        ? cloneIfMounted(c2[i])
                        : normalizeVNode(c2[i])), container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                    i++;
                }
            }
        }
        // 4. common sequence + unmount
        // (a b) c
        // (a b)
        // i = 2, e1 = 2, e2 = 1
        // a (b c)
        // (b c)
        // i = 0, e1 = 0, e2 = -1
        else if (i > e2) {
            while (i <= e1) {
                unmount(c1[i], parentComponent, parentSuspense, true);
                i++;
            }
        }
        // 5. unknown sequence
        // [i ... e1 + 1]: a b [c d e] f g
        // [i ... e2 + 1]: a b [e d c h] f g
        // i = 2, e1 = 4, e2 = 5
        else {
            const s1 = i; // prev starting index
            const s2 = i; // next starting index
            // 5.1 build key:index map for newChildren
            const keyToNewIndexMap = new Map();
            for (i = s2; i <= e2; i++) {
                const nextChild = (c2[i] = optimized
                    ? cloneIfMounted(c2[i])
                    : normalizeVNode(c2[i]));
                if (nextChild.key != null) {
                    keyToNewIndexMap.set(nextChild.key, i);
                }
            }
            // 5.2 loop through old children left to be patched and try to patch
            // matching nodes & remove nodes that are no longer present
            let j;
            let patched = 0;
            const toBePatched = e2 - s2 + 1;
            let moved = false;
            // used to track whether any node has moved
            let maxNewIndexSoFar = 0;
            // works as Map<newIndex, oldIndex>
            // Note that oldIndex is offset by +1
            // and oldIndex = 0 is a special value indicating the new node has
            // no corresponding old node.
            // used for determining longest stable subsequence
            const newIndexToOldIndexMap = new Array(toBePatched);
            for (i = 0; i < toBePatched; i++)
                newIndexToOldIndexMap[i] = 0;
            for (i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                if (patched >= toBePatched) {
                    // all new children have been patched so this can only be a removal
                    unmount(prevChild, parentComponent, parentSuspense, true);
                    continue;
                }
                let newIndex;
                if (prevChild.key != null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // key-less node, try to locate a key-less node of the same type
                    for (j = s2; j <= e2; j++) {
                        if (newIndexToOldIndexMap[j - s2] === 0 &&
                            isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (newIndex === undefined) {
                    unmount(prevChild, parentComponent, parentSuspense, true);
                }
                else {
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    patch(prevChild, c2[newIndex], container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                    patched++;
                }
            }
            // 5.3 move and mount
            // generate longest stable subsequence only when nodes have moved
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : EMPTY_ARR;
            j = increasingNewIndexSequence.length - 1;
            // looping backwards so that we can use last patched node as anchor
            for (i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = s2 + i;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;
                if (newIndexToOldIndexMap[i] === 0) {
                    // mount new
                    patch(null, nextChild, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                }
                else if (moved) {
                    // move if:
                    // There is no stable subsequence (e.g. a reverse)
                    // OR current node is not among the stable sequence
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        move(nextChild, container, anchor, 2 /* MoveType.REORDER */);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    };
    const move = (vnode, container, anchor, moveType, parentSuspense = null) => {
        const { el, type, transition, children, shapeFlag } = vnode;
        if (shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
            move(vnode.component.subTree, container, anchor, moveType);
            return;
        }
        if (shapeFlag & 128 /* ShapeFlags.SUSPENSE */) {
            vnode.suspense.move(container, anchor, moveType);
            return;
        }
        if (shapeFlag & 64 /* ShapeFlags.TELEPORT */) {
            type.move(vnode, container, anchor, internals);
            return;
        }
        if (type === Fragment) {
            hostInsert(el, container, anchor);
            for (let i = 0; i < children.length; i++) {
                move(children[i], container, anchor, moveType);
            }
            hostInsert(vnode.anchor, container, anchor);
            return;
        }
        if (type === Static) {
            moveStaticNode(vnode, container, anchor);
            return;
        }
        // single nodes
        const needTransition = moveType !== 2 /* MoveType.REORDER */ &&
            shapeFlag & 1 /* ShapeFlags.ELEMENT */ &&
            transition;
        if (needTransition) {
            if (moveType === 0 /* MoveType.ENTER */) {
                transition.beforeEnter(el);
                hostInsert(el, container, anchor);
                queuePostRenderEffect(() => transition.enter(el), parentSuspense);
            }
            else {
                const { leave, delayLeave, afterLeave } = transition;
                const remove = () => hostInsert(el, container, anchor);
                const performLeave = () => {
                    leave(el, () => {
                        remove();
                        afterLeave && afterLeave();
                    });
                };
                if (delayLeave) {
                    delayLeave(el, remove, performLeave);
                }
                else {
                    performLeave();
                }
            }
        }
        else {
            hostInsert(el, container, anchor);
        }
    };
    const unmount = (vnode, parentComponent, parentSuspense, doRemove = false, optimized = false) => {
        const { type, props, ref, children, dynamicChildren, shapeFlag, patchFlag, dirs } = vnode;
        // unset ref
        if (ref != null) {
            setRef(ref, null, parentSuspense, vnode, true);
        }
        if (shapeFlag & 256 /* ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE */) {
            parentComponent.ctx.deactivate(vnode);
            return;
        }
        const shouldInvokeDirs = shapeFlag & 1 /* ShapeFlags.ELEMENT */ && dirs;
        const shouldInvokeVnodeHook = !isAsyncWrapper(vnode);
        let vnodeHook;
        if (shouldInvokeVnodeHook &&
            (vnodeHook = props && props.onVnodeBeforeUnmount)) {
            invokeVNodeHook(vnodeHook, parentComponent, vnode);
        }
        if (shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
            unmountComponent(vnode.component, parentSuspense, doRemove);
        }
        else {
            if (shapeFlag & 128 /* ShapeFlags.SUSPENSE */) {
                vnode.suspense.unmount(parentSuspense, doRemove);
                return;
            }
            if (shouldInvokeDirs) {
                invokeDirectiveHook(vnode, null, parentComponent, 'beforeUnmount');
            }
            if (shapeFlag & 64 /* ShapeFlags.TELEPORT */) {
                vnode.type.remove(vnode, parentComponent, parentSuspense, optimized, internals, doRemove);
            }
            else if (dynamicChildren &&
                // #1153: fast path should not be taken for non-stable (v-for) fragments
                (type !== Fragment ||
                    (patchFlag > 0 && patchFlag & 64 /* PatchFlags.STABLE_FRAGMENT */))) {
                // fast path for block nodes: only need to unmount dynamic children.
                unmountChildren(dynamicChildren, parentComponent, parentSuspense, false, true);
            }
            else if ((type === Fragment &&
                patchFlag &
                    (128 /* PatchFlags.KEYED_FRAGMENT */ | 256 /* PatchFlags.UNKEYED_FRAGMENT */)) ||
                (!optimized && shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */)) {
                unmountChildren(children, parentComponent, parentSuspense);
            }
            if (doRemove) {
                remove(vnode);
            }
        }
        if ((shouldInvokeVnodeHook &&
            (vnodeHook = props && props.onVnodeUnmounted)) ||
            shouldInvokeDirs) {
            queuePostRenderEffect(() => {
                vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
                shouldInvokeDirs &&
                    invokeDirectiveHook(vnode, null, parentComponent, 'unmounted');
            }, parentSuspense);
        }
    };
    const remove = vnode => {
        const { type, el, anchor, transition } = vnode;
        if (type === Fragment) {
            {
                removeFragment(el, anchor);
            }
            return;
        }
        if (type === Static) {
            removeStaticNode(vnode);
            return;
        }
        const performRemove = () => {
            hostRemove(el);
            if (transition && !transition.persisted && transition.afterLeave) {
                transition.afterLeave();
            }
        };
        if (vnode.shapeFlag & 1 /* ShapeFlags.ELEMENT */ &&
            transition &&
            !transition.persisted) {
            const { leave, delayLeave } = transition;
            const performLeave = () => leave(el, performRemove);
            if (delayLeave) {
                delayLeave(vnode.el, performRemove, performLeave);
            }
            else {
                performLeave();
            }
        }
        else {
            performRemove();
        }
    };
    const removeFragment = (cur, end) => {
        // For fragments, directly remove all contained DOM nodes.
        // (fragment child nodes cannot have transition)
        let next;
        while (cur !== end) {
            next = hostNextSibling(cur);
            hostRemove(cur);
            cur = next;
        }
        hostRemove(end);
    };
    const unmountComponent = (instance, parentSuspense, doRemove) => {
        const { bum, scope, update, subTree, um } = instance;
        // beforeUnmount hook
        if (bum) {
            invokeArrayFns(bum);
        }
        // stop effects in component scope
        scope.stop();
        // update may be null if a component is unmounted before its async
        // setup has resolved.
        if (update) {
            // so that scheduler will no longer invoke it
            update.active = false;
            unmount(subTree, instance, parentSuspense, doRemove);
        }
        // unmounted hook
        if (um) {
            queuePostRenderEffect(um, parentSuspense);
        }
        queuePostRenderEffect(() => {
            instance.isUnmounted = true;
        }, parentSuspense);
        // A component with async dep inside a pending suspense is unmounted before
        // its async dep resolves. This should remove the dep from the suspense, and
        // cause the suspense to resolve immediately if that was the last dep.
        if (parentSuspense &&
            parentSuspense.pendingBranch &&
            !parentSuspense.isUnmounted &&
            instance.asyncDep &&
            !instance.asyncResolved &&
            instance.suspenseId === parentSuspense.pendingId) {
            parentSuspense.deps--;
            if (parentSuspense.deps === 0) {
                parentSuspense.resolve();
            }
        }
    };
    const unmountChildren = (children, parentComponent, parentSuspense, doRemove = false, optimized = false, start = 0) => {
        for (let i = start; i < children.length; i++) {
            unmount(children[i], parentComponent, parentSuspense, doRemove, optimized);
        }
    };
    const getNextHostNode = vnode => {
        if (vnode.shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
            return getNextHostNode(vnode.component.subTree);
        }
        if (vnode.shapeFlag & 128 /* ShapeFlags.SUSPENSE */) {
            return vnode.suspense.next();
        }
        return hostNextSibling((vnode.anchor || vnode.el));
    };
    const render = (vnode, container, isSVG) => {
        if (vnode == null) {
            if (container._vnode) {
                unmount(container._vnode, null, null, true);
            }
        }
        else {
            patch(container._vnode || null, vnode, container, null, null, null, isSVG);
        }
        flushPreFlushCbs();
        flushPostFlushCbs();
        container._vnode = vnode;
    };
    const internals = {
        p: patch,
        um: unmount,
        m: move,
        r: remove,
        mt: mountComponent,
        mc: mountChildren,
        pc: patchChildren,
        pbc: patchBlockChildren,
        n: getNextHostNode,
        o: options
    };
    let hydrate;
    let hydrateNode;
    if (createHydrationFns) {
        [hydrate, hydrateNode] = createHydrationFns(internals);
    }
    return {
        render,
        hydrate,
        createApp: createAppAPI(render, hydrate)
    };
}
function toggleRecurse({ effect, update }, allowed) {
    effect.allowRecurse = update.allowRecurse = allowed;
}
/**
 * #1156
 * When a component is HMR-enabled, we need to make sure that all static nodes
 * inside a block also inherit the DOM element from the previous tree so that
 * HMR updates (which are full updates) can retrieve the element for patching.
 *
 * #2080
 * Inside keyed `template` fragment static children, if a fragment is moved,
 * the children will always be moved. Therefore, in order to ensure correct move
 * position, el should be inherited from previous nodes.
 */
function traverseStaticChildren(n1, n2, shallow = false) {
    const ch1 = n1.children;
    const ch2 = n2.children;
    if (isArray(ch1) && isArray(ch2)) {
        for (let i = 0; i < ch1.length; i++) {
            // this is only called in the optimized path so array children are
            // guaranteed to be vnodes
            const c1 = ch1[i];
            let c2 = ch2[i];
            if (c2.shapeFlag & 1 /* ShapeFlags.ELEMENT */ && !c2.dynamicChildren) {
                if (c2.patchFlag <= 0 || c2.patchFlag === 32 /* PatchFlags.HYDRATE_EVENTS */) {
                    c2 = ch2[i] = cloneIfMounted(ch2[i]);
                    c2.el = c1.el;
                }
                if (!shallow)
                    traverseStaticChildren(c1, c2);
            }
            // #6852 also inherit for text nodes
            if (c2.type === Text) {
                c2.el = c1.el;
            }
        }
    }
}
// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

const isTeleport = (type) => type.__isTeleport;

const Fragment = Symbol(undefined);
const Text = Symbol(undefined);
const Comment = Symbol(undefined);
const Static = Symbol(undefined);
// Since v-if and v-for are the two possible ways node structure can dynamically
// change, once we consider v-if branches and each v-for fragment a block, we
// can divide a template into nested blocks, and within each block the node
// structure would be stable. This allows us to skip most children diffing
// and only worry about the dynamic nodes (indicated by patch flags).
const blockStack = [];
let currentBlock = null;
/**
 * Open a block.
 * This must be called before `createBlock`. It cannot be part of `createBlock`
 * because the children of the block are evaluated before `createBlock` itself
 * is called. The generated code typically looks like this:
 *
 * ```js
 * function render() {
 *   return (openBlock(),createBlock('div', null, [...]))
 * }
 * ```
 * disableTracking is true when creating a v-for fragment block, since a v-for
 * fragment always diffs its children.
 *
 * @private
 */
function openBlock(disableTracking = false) {
    blockStack.push((currentBlock = disableTracking ? null : []));
}
function closeBlock() {
    blockStack.pop();
    currentBlock = blockStack[blockStack.length - 1] || null;
}
// Whether we should be tracking dynamic child nodes inside a block.
// Only tracks when this value is > 0
// We are not using a simple boolean because this value may need to be
// incremented/decremented by nested usage of v-once (see below)
let isBlockTreeEnabled = 1;
/**
 * Block tracking sometimes needs to be disabled, for example during the
 * creation of a tree that needs to be cached by v-once. The compiler generates
 * code like this:
 *
 * ``` js
 * _cache[1] || (
 *   setBlockTracking(-1),
 *   _cache[1] = createVNode(...),
 *   setBlockTracking(1),
 *   _cache[1]
 * )
 * ```
 *
 * @private
 */
function setBlockTracking(value) {
    isBlockTreeEnabled += value;
}
function setupBlock(vnode) {
    // save current block children on the block vnode
    vnode.dynamicChildren =
        isBlockTreeEnabled > 0 ? currentBlock || EMPTY_ARR : null;
    // close block
    closeBlock();
    // a block is always going to be patched, so track it as a child of its
    // parent block
    if (isBlockTreeEnabled > 0 && currentBlock) {
        currentBlock.push(vnode);
    }
    return vnode;
}
/**
 * @private
 */
function createElementBlock(type, props, children, patchFlag, dynamicProps, shapeFlag) {
    return setupBlock(createBaseVNode(type, props, children, patchFlag, dynamicProps, shapeFlag, true /* isBlock */));
}
/**
 * Create a block root vnode. Takes the same exact arguments as `createVNode`.
 * A block root keeps track of dynamic nodes within the block in the
 * `dynamicChildren` array.
 *
 * @private
 */
function createBlock(type, props, children, patchFlag, dynamicProps) {
    return setupBlock(createVNode(type, props, children, patchFlag, dynamicProps, true /* isBlock: prevent a block from tracking itself */));
}
function isVNode(value) {
    return value ? value.__v_isVNode === true : false;
}
function isSameVNodeType(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key;
}
const InternalObjectKey = `__vInternal`;
const normalizeKey = ({ key }) => key != null ? key : null;
const normalizeRef = ({ ref, ref_key, ref_for }) => {
    return (ref != null
        ? isString(ref) || isRef(ref) || isFunction(ref)
            ? { i: currentRenderingInstance, r: ref, k: ref_key, f: !!ref_for }
            : ref
        : null);
};
function createBaseVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, shapeFlag = type === Fragment ? 0 : 1 /* ShapeFlags.ELEMENT */, isBlockNode = false, needFullChildrenNormalization = false) {
    const vnode = {
        __v_isVNode: true,
        __v_skip: true,
        type,
        props,
        key: props && normalizeKey(props),
        ref: props && normalizeRef(props),
        scopeId: currentScopeId,
        slotScopeIds: null,
        children,
        component: null,
        suspense: null,
        ssContent: null,
        ssFallback: null,
        dirs: null,
        transition: null,
        el: null,
        anchor: null,
        target: null,
        targetAnchor: null,
        staticCount: 0,
        shapeFlag,
        patchFlag,
        dynamicProps,
        dynamicChildren: null,
        appContext: null,
        ctx: currentRenderingInstance
    };
    if (needFullChildrenNormalization) {
        normalizeChildren$1(vnode, children);
        // normalize suspense children
        if (shapeFlag & 128 /* ShapeFlags.SUSPENSE */) {
            type.normalize(vnode);
        }
    }
    else if (children) {
        // compiled element vnode - if children is passed, only possible types are
        // string or Array.
        vnode.shapeFlag |= isString(children)
            ? 8 /* ShapeFlags.TEXT_CHILDREN */
            : 16 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // track vnode for block tree
    if (isBlockTreeEnabled > 0 &&
        // avoid a block node from tracking itself
        !isBlockNode &&
        // has current parent block
        currentBlock &&
        // presence of a patch flag indicates this node needs patching on updates.
        // component nodes also should always be patched, because even if the
        // component doesn't need to update, it needs to persist the instance on to
        // the next vnode so that it can be properly unmounted later.
        (vnode.patchFlag > 0 || shapeFlag & 6 /* ShapeFlags.COMPONENT */) &&
        // the EVENTS flag is only for hydration and if it is the only flag, the
        // vnode should not be considered dynamic due to handler caching.
        vnode.patchFlag !== 32 /* PatchFlags.HYDRATE_EVENTS */) {
        currentBlock.push(vnode);
    }
    return vnode;
}
const createVNode = (_createVNode);
function _createVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, isBlockNode = false) {
    if (!type || type === NULL_DYNAMIC_COMPONENT) {
        type = Comment;
    }
    if (isVNode(type)) {
        // createVNode receiving an existing vnode. This happens in cases like
        // <component :is="vnode"/>
        // #2078 make sure to merge refs during the clone instead of overwriting it
        const cloned = cloneVNode(type, props, true /* mergeRef: true */);
        if (children) {
            normalizeChildren$1(cloned, children);
        }
        if (isBlockTreeEnabled > 0 && !isBlockNode && currentBlock) {
            if (cloned.shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
                currentBlock[currentBlock.indexOf(type)] = cloned;
            }
            else {
                currentBlock.push(cloned);
            }
        }
        cloned.patchFlag |= -2 /* PatchFlags.BAIL */;
        return cloned;
    }
    // class component normalization.
    if (isClassComponent(type)) {
        type = type.__vccOpts;
    }
    // class & style normalization.
    if (props) {
        // for reactive or proxy objects, we need to clone it to enable mutation.
        props = guardReactiveProps(props);
        let { class: klass, style } = props;
        if (klass && !isString(klass)) {
            props.class = normalizeClass(klass);
        }
        if (isObject$1(style)) {
            // reactive state objects need to be cloned since they are likely to be
            // mutated
            if (isProxy(style) && !isArray(style)) {
                style = extend({}, style);
            }
            props.style = normalizeStyle(style);
        }
    }
    // encode the vnode type information into a bitmap
    const shapeFlag = isString(type)
        ? 1 /* ShapeFlags.ELEMENT */
        : isSuspense(type)
            ? 128 /* ShapeFlags.SUSPENSE */
            : isTeleport(type)
                ? 64 /* ShapeFlags.TELEPORT */
                : isObject$1(type)
                    ? 4 /* ShapeFlags.STATEFUL_COMPONENT */
                    : isFunction(type)
                        ? 2 /* ShapeFlags.FUNCTIONAL_COMPONENT */
                        : 0;
    return createBaseVNode(type, props, children, patchFlag, dynamicProps, shapeFlag, isBlockNode, true);
}
function guardReactiveProps(props) {
    if (!props)
        return null;
    return isProxy(props) || InternalObjectKey in props
        ? extend({}, props)
        : props;
}
function cloneVNode(vnode, extraProps, mergeRef = false) {
    // This is intentionally NOT using spread or extend to avoid the runtime
    // key enumeration cost.
    const { props, ref, patchFlag, children } = vnode;
    const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props;
    const cloned = {
        __v_isVNode: true,
        __v_skip: true,
        type: vnode.type,
        props: mergedProps,
        key: mergedProps && normalizeKey(mergedProps),
        ref: extraProps && extraProps.ref
            ? // #2078 in the case of <component :is="vnode" ref="extra"/>
                // if the vnode itself already has a ref, cloneVNode will need to merge
                // the refs so the single vnode can be set on multiple refs
                mergeRef && ref
                    ? isArray(ref)
                        ? ref.concat(normalizeRef(extraProps))
                        : [ref, normalizeRef(extraProps)]
                    : normalizeRef(extraProps)
            : ref,
        scopeId: vnode.scopeId,
        slotScopeIds: vnode.slotScopeIds,
        children: children,
        target: vnode.target,
        targetAnchor: vnode.targetAnchor,
        staticCount: vnode.staticCount,
        shapeFlag: vnode.shapeFlag,
        // if the vnode is cloned with extra props, we can no longer assume its
        // existing patch flag to be reliable and need to add the FULL_PROPS flag.
        // note: preserve flag for fragments since they use the flag for children
        // fast paths only.
        patchFlag: extraProps && vnode.type !== Fragment
            ? patchFlag === -1 // hoisted node
                ? 16 /* PatchFlags.FULL_PROPS */
                : patchFlag | 16 /* PatchFlags.FULL_PROPS */
            : patchFlag,
        dynamicProps: vnode.dynamicProps,
        dynamicChildren: vnode.dynamicChildren,
        appContext: vnode.appContext,
        dirs: vnode.dirs,
        transition: vnode.transition,
        // These should technically only be non-null on mounted VNodes. However,
        // they *should* be copied for kept-alive vnodes. So we just always copy
        // them since them being non-null during a mount doesn't affect the logic as
        // they will simply be overwritten.
        component: vnode.component,
        suspense: vnode.suspense,
        ssContent: vnode.ssContent && cloneVNode(vnode.ssContent),
        ssFallback: vnode.ssFallback && cloneVNode(vnode.ssFallback),
        el: vnode.el,
        anchor: vnode.anchor,
        ctx: vnode.ctx,
        ce: vnode.ce
    };
    return cloned;
}
/**
 * @private
 */
function createTextVNode(text = ' ', flag = 0) {
    return createVNode(Text, null, text, flag);
}
/**
 * @private
 */
function createStaticVNode(content, numberOfNodes) {
    // A static vnode can contain multiple stringified elements, and the number
    // of elements is necessary for hydration.
    const vnode = createVNode(Static, null, content);
    vnode.staticCount = numberOfNodes;
    return vnode;
}
/**
 * @private
 */
function createCommentVNode(text = '', 
// when used as the v-else branch, the comment node must be created as a
// block to ensure correct updates.
asBlock = false) {
    return asBlock
        ? (openBlock(), createBlock(Comment, null, text))
        : createVNode(Comment, null, text);
}
function normalizeVNode(child) {
    if (child == null || typeof child === 'boolean') {
        // empty placeholder
        return createVNode(Comment);
    }
    else if (isArray(child)) {
        // fragment
        return createVNode(Fragment, null, 
        // #3666, avoid reference pollution when reusing vnode
        child.slice());
    }
    else if (typeof child === 'object') {
        // already vnode, this should be the most common since compiled templates
        // always produce all-vnode children arrays
        return cloneIfMounted(child);
    }
    else {
        // strings and numbers
        return createVNode(Text, null, String(child));
    }
}
// optimized normalization for template-compiled render fns
function cloneIfMounted(child) {
    return (child.el === null && child.patchFlag !== -1 /* PatchFlags.HOISTED */) ||
        child.memo
        ? child
        : cloneVNode(child);
}
function normalizeChildren$1(vnode, children) {
    let type = 0;
    const { shapeFlag } = vnode;
    if (children == null) {
        children = null;
    }
    else if (isArray(children)) {
        type = 16 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    else if (typeof children === 'object') {
        if (shapeFlag & (1 /* ShapeFlags.ELEMENT */ | 64 /* ShapeFlags.TELEPORT */)) {
            // Normalize slot to plain children for plain element and Teleport
            const slot = children.default;
            if (slot) {
                // _c marker is added by withCtx() indicating this is a compiled slot
                slot._c && (slot._d = false);
                normalizeChildren$1(vnode, slot());
                slot._c && (slot._d = true);
            }
            return;
        }
        else {
            type = 32 /* ShapeFlags.SLOTS_CHILDREN */;
            const slotFlag = children._;
            if (!slotFlag && !(InternalObjectKey in children)) {
                children._ctx = currentRenderingInstance;
            }
            else if (slotFlag === 3 /* SlotFlags.FORWARDED */ && currentRenderingInstance) {
                // a child component receives forwarded slots from the parent.
                // its slot type is determined by its parent's slot type.
                if (currentRenderingInstance.slots._ === 1 /* SlotFlags.STABLE */) {
                    children._ = 1 /* SlotFlags.STABLE */;
                }
                else {
                    children._ = 2 /* SlotFlags.DYNAMIC */;
                    vnode.patchFlag |= 1024 /* PatchFlags.DYNAMIC_SLOTS */;
                }
            }
        }
    }
    else if (isFunction(children)) {
        children = { default: children, _ctx: currentRenderingInstance };
        type = 32 /* ShapeFlags.SLOTS_CHILDREN */;
    }
    else {
        children = String(children);
        // force teleport children to array so it can be moved around
        if (shapeFlag & 64 /* ShapeFlags.TELEPORT */) {
            type = 16 /* ShapeFlags.ARRAY_CHILDREN */;
            children = [createTextVNode(children)];
        }
        else {
            type = 8 /* ShapeFlags.TEXT_CHILDREN */;
        }
    }
    vnode.children = children;
    vnode.shapeFlag |= type;
}
function mergeProps(...args) {
    const ret = {};
    for (let i = 0; i < args.length; i++) {
        const toMerge = args[i];
        for (const key in toMerge) {
            if (key === 'class') {
                if (ret.class !== toMerge.class) {
                    ret.class = normalizeClass([ret.class, toMerge.class]);
                }
            }
            else if (key === 'style') {
                ret.style = normalizeStyle([ret.style, toMerge.style]);
            }
            else if (isOn(key)) {
                const existing = ret[key];
                const incoming = toMerge[key];
                if (incoming &&
                    existing !== incoming &&
                    !(isArray(existing) && existing.includes(incoming))) {
                    ret[key] = existing
                        ? [].concat(existing, incoming)
                        : incoming;
                }
            }
            else if (key !== '') {
                ret[key] = toMerge[key];
            }
        }
    }
    return ret;
}
function invokeVNodeHook(hook, instance, vnode, prevVNode = null) {
    callWithAsyncErrorHandling(hook, instance, 7 /* ErrorCodes.VNODE_HOOK */, [
        vnode,
        prevVNode
    ]);
}

const emptyAppContext = createAppContext();
let uid = 0;
function createComponentInstance(vnode, parent, suspense) {
    const type = vnode.type;
    // inherit parent app context - or - if root, adopt from root vnode
    const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext;
    const instance = {
        uid: uid++,
        vnode,
        type,
        parent,
        appContext,
        root: null,
        next: null,
        subTree: null,
        effect: null,
        update: null,
        scope: new EffectScope(true /* detached */),
        render: null,
        proxy: null,
        exposed: null,
        exposeProxy: null,
        withProxy: null,
        provides: parent ? parent.provides : Object.create(appContext.provides),
        accessCache: null,
        renderCache: [],
        // local resolved assets
        components: null,
        directives: null,
        // resolved props and emits options
        propsOptions: normalizePropsOptions(type, appContext),
        emitsOptions: normalizeEmitsOptions(type, appContext),
        // emit
        emit: null,
        emitted: null,
        // props default value
        propsDefaults: EMPTY_OBJ,
        // inheritAttrs
        inheritAttrs: type.inheritAttrs,
        // state
        ctx: EMPTY_OBJ,
        data: EMPTY_OBJ,
        props: EMPTY_OBJ,
        attrs: EMPTY_OBJ,
        slots: EMPTY_OBJ,
        refs: EMPTY_OBJ,
        setupState: EMPTY_OBJ,
        setupContext: null,
        // suspense related
        suspense,
        suspenseId: suspense ? suspense.pendingId : 0,
        asyncDep: null,
        asyncResolved: false,
        // lifecycle hooks
        // not using enums here because it results in computed properties
        isMounted: false,
        isUnmounted: false,
        isDeactivated: false,
        bc: null,
        c: null,
        bm: null,
        m: null,
        bu: null,
        u: null,
        um: null,
        bum: null,
        da: null,
        a: null,
        rtg: null,
        rtc: null,
        ec: null,
        sp: null
    };
    {
        instance.ctx = { _: instance };
    }
    instance.root = parent ? parent.root : instance;
    instance.emit = emit.bind(null, instance);
    // apply custom element special handling
    if (vnode.ce) {
        vnode.ce(instance);
    }
    return instance;
}
let currentInstance = null;
const getCurrentInstance = () => currentInstance || currentRenderingInstance;
const setCurrentInstance = (instance) => {
    currentInstance = instance;
    instance.scope.on();
};
const unsetCurrentInstance = () => {
    currentInstance && currentInstance.scope.off();
    currentInstance = null;
};
function isStatefulComponent(instance) {
    return instance.vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */;
}
let isInSSRComponentSetup = false;
function setupComponent(instance, isSSR = false) {
    isInSSRComponentSetup = isSSR;
    const { props, children } = instance.vnode;
    const isStateful = isStatefulComponent(instance);
    initProps(instance, props, isStateful, isSSR);
    initSlots(instance, children);
    const setupResult = isStateful
        ? setupStatefulComponent(instance, isSSR)
        : undefined;
    isInSSRComponentSetup = false;
    return setupResult;
}
function setupStatefulComponent(instance, isSSR) {
    const Component = instance.type;
    // 0. create render proxy property access cache
    instance.accessCache = Object.create(null);
    // 1. create public instance / render proxy
    // also mark it raw so it's never observed
    instance.proxy = markRaw(new Proxy(instance.ctx, PublicInstanceProxyHandlers));
    // 2. call setup()
    const { setup } = Component;
    if (setup) {
        const setupContext = (instance.setupContext =
            setup.length > 1 ? createSetupContext(instance) : null);
        setCurrentInstance(instance);
        pauseTracking();
        const setupResult = callWithErrorHandling(setup, instance, 0 /* ErrorCodes.SETUP_FUNCTION */, [instance.props, setupContext]);
        resetTracking();
        unsetCurrentInstance();
        if (isPromise(setupResult)) {
            setupResult.then(unsetCurrentInstance, unsetCurrentInstance);
            if (isSSR) {
                // return the promise so server-renderer can wait on it
                return setupResult
                    .then((resolvedResult) => {
                    handleSetupResult(instance, resolvedResult, isSSR);
                })
                    .catch(e => {
                    handleError(e, instance, 0 /* ErrorCodes.SETUP_FUNCTION */);
                });
            }
            else {
                // async setup returned Promise.
                // bail here and wait for re-entry.
                instance.asyncDep = setupResult;
            }
        }
        else {
            handleSetupResult(instance, setupResult, isSSR);
        }
    }
    else {
        finishComponentSetup(instance, isSSR);
    }
}
function handleSetupResult(instance, setupResult, isSSR) {
    if (isFunction(setupResult)) {
        // setup returned an inline render function
        if (instance.type.__ssrInlineRender) {
            // when the function's name is `ssrRender` (compiled by SFC inline mode),
            // set it as ssrRender instead.
            instance.ssrRender = setupResult;
        }
        else {
            instance.render = setupResult;
        }
    }
    else if (isObject$1(setupResult)) {
        instance.setupState = proxyRefs(setupResult);
    }
    else ;
    finishComponentSetup(instance, isSSR);
}
let compile;
function finishComponentSetup(instance, isSSR, skipOptions) {
    const Component = instance.type;
    // template / render function normalization
    // could be already set when returned from setup()
    if (!instance.render) {
        // only do on-the-fly compile if not in SSR - SSR on-the-fly compilation
        // is done by server-renderer
        if (!isSSR && compile && !Component.render) {
            const template = Component.template ||
                resolveMergedOptions(instance).template;
            if (template) {
                const { isCustomElement, compilerOptions } = instance.appContext.config;
                const { delimiters, compilerOptions: componentCompilerOptions } = Component;
                const finalCompilerOptions = extend(extend({
                    isCustomElement,
                    delimiters
                }, compilerOptions), componentCompilerOptions);
                Component.render = compile(template, finalCompilerOptions);
            }
        }
        instance.render = (Component.render || NOOP);
    }
    // support for 2.x options
    {
        setCurrentInstance(instance);
        pauseTracking();
        applyOptions(instance);
        resetTracking();
        unsetCurrentInstance();
    }
}
function createAttrsProxy(instance) {
    return new Proxy(instance.attrs, {
            get(target, key) {
                track(instance, "get" /* TrackOpTypes.GET */, '$attrs');
                return target[key];
            }
        });
}
function createSetupContext(instance) {
    const expose = exposed => {
        instance.exposed = exposed || {};
    };
    let attrs;
    {
        return {
            get attrs() {
                return attrs || (attrs = createAttrsProxy(instance));
            },
            slots: instance.slots,
            emit: instance.emit,
            expose
        };
    }
}
function getExposeProxy(instance) {
    if (instance.exposed) {
        return (instance.exposeProxy ||
            (instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
                get(target, key) {
                    if (key in target) {
                        return target[key];
                    }
                    else if (key in publicPropertiesMap) {
                        return publicPropertiesMap[key](instance);
                    }
                },
                has(target, key) {
                    return key in target || key in publicPropertiesMap;
                }
            })));
    }
}
function getComponentName(Component, includeInferred = true) {
    return isFunction(Component)
        ? Component.displayName || Component.name
        : Component.name || (includeInferred && Component.__name);
}
function isClassComponent(value) {
    return isFunction(value) && '__vccOpts' in value;
}

const computed = ((getterOrOptions, debugOptions) => {
    // @ts-ignore
    return computed$1(getterOrOptions, debugOptions, isInSSRComponentSetup);
});

// Actual implementation
function h(type, propsOrChildren, children) {
    const l = arguments.length;
    if (l === 2) {
        if (isObject$1(propsOrChildren) && !isArray(propsOrChildren)) {
            // single vnode without props
            if (isVNode(propsOrChildren)) {
                return createVNode(type, null, [propsOrChildren]);
            }
            // props without children
            return createVNode(type, propsOrChildren);
        }
        else {
            // omit props
            return createVNode(type, null, propsOrChildren);
        }
    }
    else {
        if (l > 3) {
            children = Array.prototype.slice.call(arguments, 2);
        }
        else if (l === 3 && isVNode(children)) {
            children = [children];
        }
        return createVNode(type, propsOrChildren, children);
    }
}

const ssrContextKey = Symbol(``);
const useSSRContext = () => {
    {
        const ctx = inject(ssrContextKey);
        return ctx;
    }
};

// Core API ------------------------------------------------------------------
const version = "3.2.47";

const svgNS = 'http://www.w3.org/2000/svg';
const doc = (typeof document !== 'undefined' ? document : null);
const templateContainer = doc && /*#__PURE__*/ doc.createElement('template');
const nodeOps = {
    insert: (child, parent, anchor) => {
        parent.insertBefore(child, anchor || null);
    },
    remove: child => {
        const parent = child.parentNode;
        if (parent) {
            parent.removeChild(child);
        }
    },
    createElement: (tag, isSVG, is, props) => {
        const el = isSVG
            ? doc.createElementNS(svgNS, tag)
            : doc.createElement(tag, is ? { is } : undefined);
        if (tag === 'select' && props && props.multiple != null) {
            el.setAttribute('multiple', props.multiple);
        }
        return el;
    },
    createText: text => doc.createTextNode(text),
    createComment: text => doc.createComment(text),
    setText: (node, text) => {
        node.nodeValue = text;
    },
    setElementText: (el, text) => {
        el.textContent = text;
    },
    parentNode: node => node.parentNode,
    nextSibling: node => node.nextSibling,
    querySelector: selector => doc.querySelector(selector),
    setScopeId(el, id) {
        el.setAttribute(id, '');
    },
    // __UNSAFE__
    // Reason: innerHTML.
    // Static content here can only come from compiled templates.
    // As long as the user only uses trusted templates, this is safe.
    insertStaticContent(content, parent, anchor, isSVG, start, end) {
        // <parent> before | first ... last | anchor </parent>
        const before = anchor ? anchor.previousSibling : parent.lastChild;
        // #5308 can only take cached path if:
        // - has a single root node
        // - nextSibling info is still available
        if (start && (start === end || start.nextSibling)) {
            // cached
            while (true) {
                parent.insertBefore(start.cloneNode(true), anchor);
                if (start === end || !(start = start.nextSibling))
                    break;
            }
        }
        else {
            // fresh insert
            templateContainer.innerHTML = isSVG ? `<svg>${content}</svg>` : content;
            const template = templateContainer.content;
            if (isSVG) {
                // remove outer svg wrapper
                const wrapper = template.firstChild;
                while (wrapper.firstChild) {
                    template.appendChild(wrapper.firstChild);
                }
                template.removeChild(wrapper);
            }
            parent.insertBefore(template, anchor);
        }
        return [
            // first
            before ? before.nextSibling : parent.firstChild,
            // last
            anchor ? anchor.previousSibling : parent.lastChild
        ];
    }
};

// compiler should normalize class + :class bindings on the same element
// into a single binding ['staticClass', dynamic]
function patchClass(el, value, isSVG) {
    // directly setting className should be faster than setAttribute in theory
    // if this is an element during a transition, take the temporary transition
    // classes into account.
    const transitionClasses = el._vtc;
    if (transitionClasses) {
        value = (value ? [value, ...transitionClasses] : [...transitionClasses]).join(' ');
    }
    if (value == null) {
        el.removeAttribute('class');
    }
    else if (isSVG) {
        el.setAttribute('class', value);
    }
    else {
        el.className = value;
    }
}

function patchStyle(el, prev, next) {
    const style = el.style;
    const isCssString = isString(next);
    if (next && !isCssString) {
        if (prev && !isString(prev)) {
            for (const key in prev) {
                if (next[key] == null) {
                    setStyle(style, key, '');
                }
            }
        }
        for (const key in next) {
            setStyle(style, key, next[key]);
        }
    }
    else {
        const currentDisplay = style.display;
        if (isCssString) {
            if (prev !== next) {
                style.cssText = next;
            }
        }
        else if (prev) {
            el.removeAttribute('style');
        }
        // indicates that the `display` of the element is controlled by `v-show`,
        // so we always keep the current `display` value regardless of the `style`
        // value, thus handing over control to `v-show`.
        if ('_vod' in el) {
            style.display = currentDisplay;
        }
    }
}
const importantRE = /\s*!important$/;
function setStyle(style, name, val) {
    if (isArray(val)) {
        val.forEach(v => setStyle(style, name, v));
    }
    else {
        if (val == null)
            val = '';
        if (name.startsWith('--')) {
            // custom property definition
            style.setProperty(name, val);
        }
        else {
            const prefixed = autoPrefix(style, name);
            if (importantRE.test(val)) {
                // !important
                style.setProperty(hyphenate(prefixed), val.replace(importantRE, ''), 'important');
            }
            else {
                style[prefixed] = val;
            }
        }
    }
}
const prefixes$1 = ['Webkit', 'Moz', 'ms'];
const prefixCache = {};
function autoPrefix(style, rawName) {
    const cached = prefixCache[rawName];
    if (cached) {
        return cached;
    }
    let name = camelize(rawName);
    if (name !== 'filter' && name in style) {
        return (prefixCache[rawName] = name);
    }
    name = capitalize(name);
    for (let i = 0; i < prefixes$1.length; i++) {
        const prefixed = prefixes$1[i] + name;
        if (prefixed in style) {
            return (prefixCache[rawName] = prefixed);
        }
    }
    return rawName;
}

const xlinkNS = 'http://www.w3.org/1999/xlink';
function patchAttr(el, key, value, isSVG, instance) {
    if (isSVG && key.startsWith('xlink:')) {
        if (value == null) {
            el.removeAttributeNS(xlinkNS, key.slice(6, key.length));
        }
        else {
            el.setAttributeNS(xlinkNS, key, value);
        }
    }
    else {
        // note we are only checking boolean attributes that don't have a
        // corresponding dom prop of the same name here.
        const isBoolean = isSpecialBooleanAttr(key);
        if (value == null || (isBoolean && !includeBooleanAttr(value))) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, isBoolean ? '' : value);
        }
    }
}

// __UNSAFE__
// functions. The user is responsible for using them with only trusted content.
function patchDOMProp(el, key, value, 
// the following args are passed only due to potential innerHTML/textContent
// overriding existing VNodes, in which case the old tree must be properly
// unmounted.
prevChildren, parentComponent, parentSuspense, unmountChildren) {
    if (key === 'innerHTML' || key === 'textContent') {
        if (prevChildren) {
            unmountChildren(prevChildren, parentComponent, parentSuspense);
        }
        el[key] = value == null ? '' : value;
        return;
    }
    if (key === 'value' &&
        el.tagName !== 'PROGRESS' &&
        // custom elements may use _value internally
        !el.tagName.includes('-')) {
        // store value as _value as well since
        // non-string values will be stringified.
        el._value = value;
        const newValue = value == null ? '' : value;
        if (el.value !== newValue ||
            // #4956: always set for OPTION elements because its value falls back to
            // textContent if no value attribute is present. And setting .value for
            // OPTION has no side effect
            el.tagName === 'OPTION') {
            el.value = newValue;
        }
        if (value == null) {
            el.removeAttribute(key);
        }
        return;
    }
    let needRemove = false;
    if (value === '' || value == null) {
        const type = typeof el[key];
        if (type === 'boolean') {
            // e.g. <select multiple> compiles to { multiple: '' }
            value = includeBooleanAttr(value);
        }
        else if (value == null && type === 'string') {
            // e.g. <div :id="null">
            value = '';
            needRemove = true;
        }
        else if (type === 'number') {
            // e.g. <img :width="null">
            value = 0;
            needRemove = true;
        }
    }
    // some properties perform value validation and throw,
    // some properties has getter, no setter, will error in 'use strict'
    // eg. <select :type="null"></select> <select :willValidate="null"></select>
    try {
        el[key] = value;
    }
    catch (e) {
    }
    needRemove && el.removeAttribute(key);
}

function addEventListener(el, event, handler, options) {
    el.addEventListener(event, handler, options);
}
function removeEventListener(el, event, handler, options) {
    el.removeEventListener(event, handler, options);
}
function patchEvent(el, rawName, prevValue, nextValue, instance = null) {
    // vei = vue event invokers
    const invokers = el._vei || (el._vei = {});
    const existingInvoker = invokers[rawName];
    if (nextValue && existingInvoker) {
        // patch
        existingInvoker.value = nextValue;
    }
    else {
        const [name, options] = parseName(rawName);
        if (nextValue) {
            // add
            const invoker = (invokers[rawName] = createInvoker(nextValue, instance));
            addEventListener(el, name, invoker, options);
        }
        else if (existingInvoker) {
            // remove
            removeEventListener(el, name, existingInvoker, options);
            invokers[rawName] = undefined;
        }
    }
}
const optionsModifierRE = /(?:Once|Passive|Capture)$/;
function parseName(name) {
    let options;
    if (optionsModifierRE.test(name)) {
        options = {};
        let m;
        while ((m = name.match(optionsModifierRE))) {
            name = name.slice(0, name.length - m[0].length);
            options[m[0].toLowerCase()] = true;
        }
    }
    const event = name[2] === ':' ? name.slice(3) : hyphenate(name.slice(2));
    return [event, options];
}
// To avoid the overhead of repeatedly calling Date.now(), we cache
// and use the same timestamp for all event listeners attached in the same tick.
let cachedNow = 0;
const p = /*#__PURE__*/ Promise.resolve();
const getNow = () => cachedNow || (p.then(() => (cachedNow = 0)), (cachedNow = Date.now()));
function createInvoker(initialValue, instance) {
    const invoker = (e) => {
        // async edge case vuejs/vue#6566
        // inner click event triggers patch, event handler
        // attached to outer element during patch, and triggered again. This
        // happens because browsers fire microtask ticks between event propagation.
        // this no longer happens for templates in Vue 3, but could still be
        // theoretically possible for hand-written render functions.
        // the solution: we save the timestamp when a handler is attached,
        // and also attach the timestamp to any event that was handled by vue
        // for the first time (to avoid inconsistent event timestamp implementations
        // or events fired from iframes, e.g. #2513)
        // The handler would only fire if the event passed to it was fired
        // AFTER it was attached.
        if (!e._vts) {
            e._vts = Date.now();
        }
        else if (e._vts <= invoker.attached) {
            return;
        }
        callWithAsyncErrorHandling(patchStopImmediatePropagation(e, invoker.value), instance, 5 /* ErrorCodes.NATIVE_EVENT_HANDLER */, [e]);
    };
    invoker.value = initialValue;
    invoker.attached = getNow();
    return invoker;
}
function patchStopImmediatePropagation(e, value) {
    if (isArray(value)) {
        const originalStop = e.stopImmediatePropagation;
        e.stopImmediatePropagation = () => {
            originalStop.call(e);
            e._stopped = true;
        };
        return value.map(fn => (e) => !e._stopped && fn && fn(e));
    }
    else {
        return value;
    }
}

const nativeOnRE = /^on[a-z]/;
const patchProp = (el, key, prevValue, nextValue, isSVG = false, prevChildren, parentComponent, parentSuspense, unmountChildren) => {
    if (key === 'class') {
        patchClass(el, nextValue, isSVG);
    }
    else if (key === 'style') {
        patchStyle(el, prevValue, nextValue);
    }
    else if (isOn(key)) {
        // ignore v-model listeners
        if (!isModelListener(key)) {
            patchEvent(el, key, prevValue, nextValue, parentComponent);
        }
    }
    else if (key[0] === '.'
        ? ((key = key.slice(1)), true)
        : key[0] === '^'
            ? ((key = key.slice(1)), false)
            : shouldSetAsProp(el, key, nextValue, isSVG)) {
        patchDOMProp(el, key, nextValue, prevChildren, parentComponent, parentSuspense, unmountChildren);
    }
    else {
        // special case for <input v-model type="checkbox"> with
        // :true-value & :false-value
        // store value as dom properties since non-string values will be
        // stringified.
        if (key === 'true-value') {
            el._trueValue = nextValue;
        }
        else if (key === 'false-value') {
            el._falseValue = nextValue;
        }
        patchAttr(el, key, nextValue, isSVG);
    }
};
function shouldSetAsProp(el, key, value, isSVG) {
    if (isSVG) {
        // most keys must be set as attribute on svg elements to work
        // ...except innerHTML & textContent
        if (key === 'innerHTML' || key === 'textContent') {
            return true;
        }
        // or native onclick with function values
        if (key in el && nativeOnRE.test(key) && isFunction(value)) {
            return true;
        }
        return false;
    }
    // these are enumerated attrs, however their corresponding DOM properties
    // are actually booleans - this leads to setting it with a string "false"
    // value leading it to be coerced to `true`, so we need to always treat
    // them as attributes.
    // Note that `contentEditable` doesn't have this problem: its DOM
    // property is also enumerated string values.
    if (key === 'spellcheck' || key === 'draggable' || key === 'translate') {
        return false;
    }
    // #1787, #2840 form property on form elements is readonly and must be set as
    // attribute.
    if (key === 'form') {
        return false;
    }
    // #1526 <input list> must be set as attribute
    if (key === 'list' && el.tagName === 'INPUT') {
        return false;
    }
    // #2766 <textarea type> must be set as attribute
    if (key === 'type' && el.tagName === 'TEXTAREA') {
        return false;
    }
    // native onclick with string value, must be set as attribute
    if (nativeOnRE.test(key) && isString(value)) {
        return false;
    }
    return key in el;
}

const getModelAssigner = (vnode) => {
    const fn = vnode.props['onUpdate:modelValue'] ||
        (false );
    return isArray(fn) ? value => invokeArrayFns(fn, value) : fn;
};
function onCompositionStart(e) {
    e.target.composing = true;
}
function onCompositionEnd(e) {
    const target = e.target;
    if (target.composing) {
        target.composing = false;
        target.dispatchEvent(new Event('input'));
    }
}
// We are exporting the v-model runtime directly as vnode hooks so that it can
// be tree-shaken in case v-model is never used.
const vModelText = {
    created(el, { modifiers: { lazy, trim, number } }, vnode) {
        el._assign = getModelAssigner(vnode);
        const castToNumber = number || (vnode.props && vnode.props.type === 'number');
        addEventListener(el, lazy ? 'change' : 'input', e => {
            if (e.target.composing)
                return;
            let domValue = el.value;
            if (trim) {
                domValue = domValue.trim();
            }
            if (castToNumber) {
                domValue = looseToNumber(domValue);
            }
            el._assign(domValue);
        });
        if (trim) {
            addEventListener(el, 'change', () => {
                el.value = el.value.trim();
            });
        }
        if (!lazy) {
            addEventListener(el, 'compositionstart', onCompositionStart);
            addEventListener(el, 'compositionend', onCompositionEnd);
            // Safari < 10.2 & UIWebView doesn't fire compositionend when
            // switching focus before confirming composition choice
            // this also fixes the issue where some browsers e.g. iOS Chrome
            // fires "change" instead of "input" on autocomplete.
            addEventListener(el, 'change', onCompositionEnd);
        }
    },
    // set value on mounted so it's after min/max for type="range"
    mounted(el, { value }) {
        el.value = value == null ? '' : value;
    },
    beforeUpdate(el, { value, modifiers: { lazy, trim, number } }, vnode) {
        el._assign = getModelAssigner(vnode);
        // avoid clearing unresolved text. #2302
        if (el.composing)
            return;
        if (document.activeElement === el && el.type !== 'range') {
            if (lazy) {
                return;
            }
            if (trim && el.value.trim() === value) {
                return;
            }
            if ((number || el.type === 'number') &&
                looseToNumber(el.value) === value) {
                return;
            }
        }
        const newValue = value == null ? '' : value;
        if (el.value !== newValue) {
            el.value = newValue;
        }
    }
};
const vModelCheckbox = {
    // #4096 array checkboxes need to be deep traversed
    deep: true,
    created(el, _, vnode) {
        el._assign = getModelAssigner(vnode);
        addEventListener(el, 'change', () => {
            const modelValue = el._modelValue;
            const elementValue = getValue(el);
            const checked = el.checked;
            const assign = el._assign;
            if (isArray(modelValue)) {
                const index = looseIndexOf(modelValue, elementValue);
                const found = index !== -1;
                if (checked && !found) {
                    assign(modelValue.concat(elementValue));
                }
                else if (!checked && found) {
                    const filtered = [...modelValue];
                    filtered.splice(index, 1);
                    assign(filtered);
                }
            }
            else if (isSet(modelValue)) {
                const cloned = new Set(modelValue);
                if (checked) {
                    cloned.add(elementValue);
                }
                else {
                    cloned.delete(elementValue);
                }
                assign(cloned);
            }
            else {
                assign(getCheckboxValue(el, checked));
            }
        });
    },
    // set initial checked on mount to wait for true-value/false-value
    mounted: setChecked,
    beforeUpdate(el, binding, vnode) {
        el._assign = getModelAssigner(vnode);
        setChecked(el, binding, vnode);
    }
};
function setChecked(el, { value, oldValue }, vnode) {
    el._modelValue = value;
    if (isArray(value)) {
        el.checked = looseIndexOf(value, vnode.props.value) > -1;
    }
    else if (isSet(value)) {
        el.checked = value.has(vnode.props.value);
    }
    else if (value !== oldValue) {
        el.checked = looseEqual(value, getCheckboxValue(el, true));
    }
}
const vModelRadio = {
    created(el, { value }, vnode) {
        el.checked = looseEqual(value, vnode.props.value);
        el._assign = getModelAssigner(vnode);
        addEventListener(el, 'change', () => {
            el._assign(getValue(el));
        });
    },
    beforeUpdate(el, { value, oldValue }, vnode) {
        el._assign = getModelAssigner(vnode);
        if (value !== oldValue) {
            el.checked = looseEqual(value, vnode.props.value);
        }
    }
};
const vModelSelect = {
    // <select multiple> value need to be deep traversed
    deep: true,
    created(el, { value, modifiers: { number } }, vnode) {
        const isSetModel = isSet(value);
        addEventListener(el, 'change', () => {
            const selectedVal = Array.prototype.filter
                .call(el.options, (o) => o.selected)
                .map((o) => number ? looseToNumber(getValue(o)) : getValue(o));
            el._assign(el.multiple
                ? isSetModel
                    ? new Set(selectedVal)
                    : selectedVal
                : selectedVal[0]);
        });
        el._assign = getModelAssigner(vnode);
    },
    // set value in mounted & updated because <select> relies on its children
    // <option>s.
    mounted(el, { value }) {
        setSelected(el, value);
    },
    beforeUpdate(el, _binding, vnode) {
        el._assign = getModelAssigner(vnode);
    },
    updated(el, { value }) {
        setSelected(el, value);
    }
};
function setSelected(el, value) {
    const isMultiple = el.multiple;
    if (isMultiple && !isArray(value) && !isSet(value)) {
        return;
    }
    for (let i = 0, l = el.options.length; i < l; i++) {
        const option = el.options[i];
        const optionValue = getValue(option);
        if (isMultiple) {
            if (isArray(value)) {
                option.selected = looseIndexOf(value, optionValue) > -1;
            }
            else {
                option.selected = value.has(optionValue);
            }
        }
        else {
            if (looseEqual(getValue(option), value)) {
                if (el.selectedIndex !== i)
                    el.selectedIndex = i;
                return;
            }
        }
    }
    if (!isMultiple && el.selectedIndex !== -1) {
        el.selectedIndex = -1;
    }
}
// retrieve raw value set via :value bindings
function getValue(el) {
    return '_value' in el ? el._value : el.value;
}
// retrieve raw value for true-value and false-value set via :true-value or :false-value bindings
function getCheckboxValue(el, checked) {
    const key = checked ? '_trueValue' : '_falseValue';
    return key in el ? el[key] : checked;
}

const vShow = {
    beforeMount(el, { value }, { transition }) {
        el._vod = el.style.display === 'none' ? '' : el.style.display;
        if (transition && value) {
            transition.beforeEnter(el);
        }
        else {
            setDisplay(el, value);
        }
    },
    mounted(el, { value }, { transition }) {
        if (transition && value) {
            transition.enter(el);
        }
    },
    updated(el, { value, oldValue }, { transition }) {
        if (!value === !oldValue)
            return;
        if (transition) {
            if (value) {
                transition.beforeEnter(el);
                setDisplay(el, true);
                transition.enter(el);
            }
            else {
                transition.leave(el, () => {
                    setDisplay(el, false);
                });
            }
        }
        else {
            setDisplay(el, value);
        }
    },
    beforeUnmount(el, { value }) {
        setDisplay(el, value);
    }
};
function setDisplay(el, value) {
    el.style.display = value ? el._vod : 'none';
}

const rendererOptions = /*#__PURE__*/ extend({ patchProp }, nodeOps);
// lazy create the renderer - this makes core renderer logic tree-shakable
// in case the user only imports reactivity utilities from Vue.
let renderer;
function ensureRenderer() {
    return (renderer ||
        (renderer = createRenderer(rendererOptions)));
}
const createApp = ((...args) => {
    const app = ensureRenderer().createApp(...args);
    const { mount } = app;
    app.mount = (containerOrSelector) => {
        const container = normalizeContainer(containerOrSelector);
        if (!container)
            return;
        const component = app._component;
        if (!isFunction(component) && !component.render && !component.template) {
            // __UNSAFE__
            // Reason: potential execution of JS expressions in in-DOM template.
            // The user must make sure the in-DOM template is trusted. If it's
            // rendered by the server, the template should not contain any user data.
            component.template = container.innerHTML;
        }
        // clear content before mounting
        container.innerHTML = '';
        const proxy = mount(container, false, container instanceof SVGElement);
        if (container instanceof Element) {
            container.removeAttribute('v-cloak');
            container.setAttribute('data-v-app', '');
        }
        return proxy;
    };
    return app;
});
function normalizeContainer(container) {
    if (isString(container)) {
        const res = document.querySelector(container);
        return res;
    }
    return container;
}

var isVue2 = false;

/*!
  * pinia v2.0.33
  * (c) 2023 Eduardo San Martin Morote
  * @license MIT
  */

/**
 * setActivePinia must be called to handle SSR at the top of functions like
 * `fetch`, `setup`, `serverPrefetch` and others
 */
let activePinia;
/**
 * Sets or unsets the active pinia. Used in SSR and internally when calling
 * actions and getters
 *
 * @param pinia - Pinia instance
 */
const setActivePinia = (pinia) => (activePinia = pinia);
const piniaSymbol = (/* istanbul ignore next */ Symbol());

function isPlainObject(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
o) {
    return (o &&
        typeof o === 'object' &&
        Object.prototype.toString.call(o) === '[object Object]' &&
        typeof o.toJSON !== 'function');
}
// type DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }
// TODO: can we change these to numbers?
/**
 * Possible types for SubscriptionCallback
 */
var MutationType;
(function (MutationType) {
    /**
     * Direct mutation of the state:
     *
     * - `store.name = 'new name'`
     * - `store.$state.name = 'new name'`
     * - `store.list.push('new item')`
     */
    MutationType["direct"] = "direct";
    /**
     * Mutated the state with `$patch` and an object
     *
     * - `store.$patch({ name: 'newName' })`
     */
    MutationType["patchObject"] = "patch object";
    /**
     * Mutated the state with `$patch` and a function
     *
     * - `store.$patch(state => state.name = 'newName')`
     */
    MutationType["patchFunction"] = "patch function";
    // maybe reset? for $state = {} and $reset
})(MutationType || (MutationType = {}));

/**
 * Creates a Pinia instance to be used by the application
 */
function createPinia() {
    const scope = effectScope(true);
    // NOTE: here we could check the window object for a state and directly set it
    // if there is anything like it with Vue 3 SSR
    const state = scope.run(() => ref({}));
    let _p = [];
    // plugins added before calling app.use(pinia)
    let toBeInstalled = [];
    const pinia = markRaw({
        install(app) {
            // this allows calling useStore() outside of a component setup after
            // installing pinia's plugin
            setActivePinia(pinia);
            {
                pinia._a = app;
                app.provide(piniaSymbol, pinia);
                app.config.globalProperties.$pinia = pinia;
                toBeInstalled.forEach((plugin) => _p.push(plugin));
                toBeInstalled = [];
            }
        },
        use(plugin) {
            if (!this._a && !isVue2) {
                toBeInstalled.push(plugin);
            }
            else {
                _p.push(plugin);
            }
            return this;
        },
        _p,
        // it's actually undefined here
        // @ts-expect-error
        _a: null,
        _e: scope,
        _s: new Map(),
        state,
    });
    return pinia;
}

const noop = () => { };
function addSubscription(subscriptions, callback, detached, onCleanup = noop) {
    subscriptions.push(callback);
    const removeSubscription = () => {
        const idx = subscriptions.indexOf(callback);
        if (idx > -1) {
            subscriptions.splice(idx, 1);
            onCleanup();
        }
    };
    if (!detached && getCurrentScope()) {
        onScopeDispose(removeSubscription);
    }
    return removeSubscription;
}
function triggerSubscriptions(subscriptions, ...args) {
    subscriptions.slice().forEach((callback) => {
        callback(...args);
    });
}

function mergeReactiveObjects(target, patchToApply) {
    // Handle Map instances
    if (target instanceof Map && patchToApply instanceof Map) {
        patchToApply.forEach((value, key) => target.set(key, value));
    }
    // Handle Set instances
    if (target instanceof Set && patchToApply instanceof Set) {
        patchToApply.forEach(target.add, target);
    }
    // no need to go through symbols because they cannot be serialized anyway
    for (const key in patchToApply) {
        if (!patchToApply.hasOwnProperty(key))
            continue;
        const subPatch = patchToApply[key];
        const targetValue = target[key];
        if (isPlainObject(targetValue) &&
            isPlainObject(subPatch) &&
            target.hasOwnProperty(key) &&
            !isRef(subPatch) &&
            !isReactive(subPatch)) {
            // NOTE: here I wanted to warn about inconsistent types but it's not possible because in setup stores one might
            // start the value of a property as a certain type e.g. a Map, and then for some reason, during SSR, change that
            // to `undefined`. When trying to hydrate, we want to override the Map with `undefined`.
            target[key] = mergeReactiveObjects(targetValue, subPatch);
        }
        else {
            // @ts-expect-error: subPatch is a valid value
            target[key] = subPatch;
        }
    }
    return target;
}
const skipHydrateSymbol = /* istanbul ignore next */ Symbol();
/**
 * Returns whether a value should be hydrated
 *
 * @param obj - target variable
 * @returns true if `obj` should be hydrated
 */
function shouldHydrate(obj) {
    return !isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol);
}
const { assign } = Object;
function isComputed(o) {
    return !!(isRef(o) && o.effect);
}
function createOptionsStore(id, options, pinia, hot) {
    const { state, actions, getters } = options;
    const initialState = pinia.state.value[id];
    let store;
    function setup() {
        if (!initialState && (!("production" !== 'production') )) {
            /* istanbul ignore if */
            {
                pinia.state.value[id] = state ? state() : {};
            }
        }
        // avoid creating a state in pinia.state.value
        const localState = toRefs(pinia.state.value[id]);
        return assign(localState, actions, Object.keys(getters || {}).reduce((computedGetters, name) => {
            computedGetters[name] = markRaw(computed(() => {
                setActivePinia(pinia);
                // it was created just before
                const store = pinia._s.get(id);
                // @ts-expect-error
                // return getters![name].call(context, context)
                // TODO: avoid reading the getter while assigning with a global variable
                return getters[name].call(store, store);
            }));
            return computedGetters;
        }, {}));
    }
    store = createSetupStore(id, setup, options, pinia, hot, true);
    return store;
}
function createSetupStore($id, setup, options = {}, pinia, hot, isOptionsStore) {
    let scope;
    const optionsForPlugin = assign({ actions: {} }, options);
    // watcher options for $subscribe
    const $subscribeOptions = {
        deep: true,
        // flush: 'post',
    };
    // internal state
    let isListening; // set to true at the end
    let isSyncListening; // set to true at the end
    let subscriptions = markRaw([]);
    let actionSubscriptions = markRaw([]);
    let debuggerEvents;
    const initialState = pinia.state.value[$id];
    // avoid setting the state for option stores if it is set
    // by the setup
    if (!isOptionsStore && !initialState && (!("production" !== 'production') )) {
        /* istanbul ignore if */
        {
            pinia.state.value[$id] = {};
        }
    }
    ref({});
    // avoid triggering too many listeners
    // https://github.com/vuejs/pinia/issues/1129
    let activeListener;
    function $patch(partialStateOrMutator) {
        let subscriptionMutation;
        isListening = isSyncListening = false;
        if (typeof partialStateOrMutator === 'function') {
            partialStateOrMutator(pinia.state.value[$id]);
            subscriptionMutation = {
                type: MutationType.patchFunction,
                storeId: $id,
                events: debuggerEvents,
            };
        }
        else {
            mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator);
            subscriptionMutation = {
                type: MutationType.patchObject,
                payload: partialStateOrMutator,
                storeId: $id,
                events: debuggerEvents,
            };
        }
        const myListenerId = (activeListener = Symbol());
        nextTick().then(() => {
            if (activeListener === myListenerId) {
                isListening = true;
            }
        });
        isSyncListening = true;
        // because we paused the watcher, we need to manually call the subscriptions
        triggerSubscriptions(subscriptions, subscriptionMutation, pinia.state.value[$id]);
    }
    const $reset = isOptionsStore
        ? function $reset() {
            const { state } = options;
            const newState = state ? state() : {};
            // we use a patch to group all changes into one single subscription
            this.$patch(($state) => {
                assign($state, newState);
            });
        }
        : /* istanbul ignore next */
            noop;
    function $dispose() {
        scope.stop();
        subscriptions = [];
        actionSubscriptions = [];
        pinia._s.delete($id);
    }
    /**
     * Wraps an action to handle subscriptions.
     *
     * @param name - name of the action
     * @param action - action to wrap
     * @returns a wrapped action to handle subscriptions
     */
    function wrapAction(name, action) {
        return function () {
            setActivePinia(pinia);
            const args = Array.from(arguments);
            const afterCallbackList = [];
            const onErrorCallbackList = [];
            function after(callback) {
                afterCallbackList.push(callback);
            }
            function onError(callback) {
                onErrorCallbackList.push(callback);
            }
            // @ts-expect-error
            triggerSubscriptions(actionSubscriptions, {
                args,
                name,
                store,
                after,
                onError,
            });
            let ret;
            try {
                ret = action.apply(this && this.$id === $id ? this : store, args);
                // handle sync errors
            }
            catch (error) {
                triggerSubscriptions(onErrorCallbackList, error);
                throw error;
            }
            if (ret instanceof Promise) {
                return ret
                    .then((value) => {
                    triggerSubscriptions(afterCallbackList, value);
                    return value;
                })
                    .catch((error) => {
                    triggerSubscriptions(onErrorCallbackList, error);
                    return Promise.reject(error);
                });
            }
            // trigger after callbacks
            triggerSubscriptions(afterCallbackList, ret);
            return ret;
        };
    }
    const partialStore = {
        _p: pinia,
        // _s: scope,
        $id,
        $onAction: addSubscription.bind(null, actionSubscriptions),
        $patch,
        $reset,
        $subscribe(callback, options = {}) {
            const removeSubscription = addSubscription(subscriptions, callback, options.detached, () => stopWatcher());
            const stopWatcher = scope.run(() => watch(() => pinia.state.value[$id], (state) => {
                if (options.flush === 'sync' ? isSyncListening : isListening) {
                    callback({
                        storeId: $id,
                        type: MutationType.direct,
                        events: debuggerEvents,
                    }, state);
                }
            }, assign({}, $subscribeOptions, options)));
            return removeSubscription;
        },
        $dispose,
    };
    const store = reactive(partialStore);
    // store the partial store now so the setup of stores can instantiate each other before they are finished without
    // creating infinite loops.
    pinia._s.set($id, store);
    // TODO: idea create skipSerialize that marks properties as non serializable and they are skipped
    const setupStore = pinia._e.run(() => {
        scope = effectScope();
        return scope.run(() => setup());
    });
    // overwrite existing actions to support $onAction
    for (const key in setupStore) {
        const prop = setupStore[key];
        if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
            // mark it as a piece of state to be serialized
            if (!isOptionsStore) {
                // in setup stores we must hydrate the state and sync pinia state tree with the refs the user just created
                if (initialState && shouldHydrate(prop)) {
                    if (isRef(prop)) {
                        prop.value = initialState[key];
                    }
                    else {
                        // probably a reactive object, lets recursively assign
                        // @ts-expect-error: prop is unknown
                        mergeReactiveObjects(prop, initialState[key]);
                    }
                }
                // transfer the ref to the pinia state to keep everything in sync
                /* istanbul ignore if */
                {
                    pinia.state.value[$id][key] = prop;
                }
            }
            // action
        }
        else if (typeof prop === 'function') {
            // @ts-expect-error: we are overriding the function we avoid wrapping if
            const actionValue = wrapAction(key, prop);
            // this a hot module replacement store because the hotUpdate method needs
            // to do it with the right context
            /* istanbul ignore if */
            {
                // @ts-expect-error
                setupStore[key] = actionValue;
            }
            // list actions so they can be used in plugins
            // @ts-expect-error
            optionsForPlugin.actions[key] = prop;
        }
        else ;
    }
    // add the state, getters, and action properties
    /* istanbul ignore if */
    {
        assign(store, setupStore);
        // allows retrieving reactive objects with `storeToRefs()`. Must be called after assigning to the reactive object.
        // Make `storeToRefs()` work with `reactive()` #799
        assign(toRaw(store), setupStore);
    }
    // use this instead of a computed with setter to be able to create it anywhere
    // without linking the computed lifespan to wherever the store is first
    // created.
    Object.defineProperty(store, '$state', {
        get: () => (pinia.state.value[$id]),
        set: (state) => {
            $patch(($state) => {
                assign($state, state);
            });
        },
    });
    // apply all plugins
    pinia._p.forEach((extender) => {
        /* istanbul ignore else */
        {
            assign(store, scope.run(() => extender({
                store,
                app: pinia._a,
                pinia,
                options: optionsForPlugin,
            })));
        }
    });
    // only apply hydrate to option stores with an initial state in pinia
    if (initialState &&
        isOptionsStore &&
        options.hydrate) {
        options.hydrate(store.$state, initialState);
    }
    isListening = true;
    isSyncListening = true;
    return store;
}
function defineStore(
// TODO: add proper types from above
idOrOptions, setup, setupOptions) {
    let id;
    let options;
    const isSetupStore = typeof setup === 'function';
    if (typeof idOrOptions === 'string') {
        id = idOrOptions;
        // the option store setup will contain the actual options in this case
        options = isSetupStore ? setupOptions : setup;
    }
    else {
        options = idOrOptions;
        id = idOrOptions.id;
    }
    function useStore(pinia, hot) {
        const currentInstance = getCurrentInstance();
        pinia =
            // in test mode, ignore the argument provided as we can always retrieve a
            // pinia instance with getActivePinia()
            (pinia) ||
                (currentInstance && inject(piniaSymbol, null));
        if (pinia)
            setActivePinia(pinia);
        pinia = activePinia;
        if (!pinia._s.has(id)) {
            // creating the store registers it in `pinia._s`
            if (isSetupStore) {
                createSetupStore(id, setup, options, pinia);
            }
            else {
                createOptionsStore(id, options, pinia);
            }
        }
        const store = pinia._s.get(id);
        // StoreGeneric cannot be casted towards Store
        return store;
    }
    useStore.$id = id;
    return useStore;
}

/**
 * Creates an object of references with all the state, getters, and plugin-added
 * state properties of the store. Similar to `toRefs()` but specifically
 * designed for Pinia stores so methods and non reactive properties are
 * completely ignored.
 *
 * @param store - store to extract the refs from
 */
function storeToRefs(store) {
    // See https://github.com/vuejs/pinia/issues/852
    // It's easier to just use toRefs() even if it includes more stuff
    {
        store = toRaw(store);
        const refs = {};
        for (const key in store) {
            const value = store[key];
            if (isRef(value) || isReactive(value)) {
                // @ts-expect-error: the key is state or getter
                refs[key] =
                    // ---
                    toRef(store, key);
            }
        }
        return refs;
    }
}

const DEF_WSS = {
  "cnv.font.subset": false,
  "cnv.icon.shape": 0,
  "cnv.mat.pic": false,
  "cnv.mat.webp_quality": 90,
  "cnv.mat.snd": false,
  "cnv.mat.snd.codec": "opus"
};
const DEF_CFG = {
  book: {
    title: "",
    creator: "",
    cre_url: "",
    publisher: "",
    pub_url: "",
    detail: "",
    version: "1.0"
  },
  save_ns: "",
  window: {
    width: 300,
    height: 300
  },
  log: { max_len: 1024 },
  init: {
    bg_color: "#000000",
    tagch_msecwait: 10,
    auto_msecpagewait: 3500,
    escape: ""
  },
  debug: {
    devtool: false,
    token: false,
    tag: false,
    putCh: false,
    debugLog: false,
    baseTx: false,
    masume: false,
    variable: false
  },
  code: {},
  debuger_token: ""
};
const DEF_CFG4TST = {
  book: {
    title: "(作品タイトル)",
    creator: "(著作者)",
    //		cre_url		: 'https://twitter.com/',
    cre_url: "ugainovel@gmail.com",
    publisher: "(出版者)",
    pub_url: "https://ugainovel.blog.fc2.com/",
    detail: "(内容紹介)",
    version: "1.2.3"
  },
  save_ns: "tst_save_ns",
  window: {
    width: 800,
    height: 600
  },
  log: { max_len: 1024 },
  init: {
    bg_color: "#008800",
    tagch_msecwait: 10,
    auto_msecpagewait: 3500,
    escape: "\\"
  },
  debug: {
    devtool: false,
    token: false,
    tag: false,
    putCh: false,
    debugLog: false,
    baseTx: false,
    masume: false,
    variable: false
  },
  code: { script: true, dummy: false },
  debuger_token: ""
};
const DEF_CNVFONT = [
  { nm: "KFhimajihoso", mes: "OS（ユーザー別）へのインストール済みフォント", iSize: 1e4, oSize: 3e3, err: "" },
  { nm: "ipamjm", mes: "プロジェクト内（core/font/ 下）", iSize: 2e4, oSize: 4e3, err: "変換失敗です。入力ファイル ipamjm.ttf が存在するか確認してください" }
];
const DEF_OPTIMG = {
  sum: {
    baseSize: 0,
    webpSize: 0,
    pathImgCmpWebP: "",
    pathImgCmpBase: ""
  },
  hSize: {}
};
const DEF_OPTIMG4TST = {
  sum: {
    baseSize: 451e4,
    webpSize: 155e4,
    pathImgCmpWebP: "../",
    pathImgCmpBase: "../"
  },
  hSize: {
    // ソートテストのため、わざとソートを乱す
    "title_base": { baseSize: 6e3, webpSize: 1e3, fld_nm: "test/title_base", ext: "jpg" },
    "breakpage_b": { baseSize: 6002, webpSize: 3e3, fld_nm: "test/breakpage_b", ext: "png", webp_q: 45 },
    "breakline.5x20": { baseSize: 6001, webpSize: 2e3, fld_nm: "test/breakline.5x20", ext: "png" }
  }
};
const DEF_OPTSND = {
  sum: {
    baseSize: 0,
    optSize: 0,
    pathSndOpt: "",
    pathSndBase: ""
  },
  hSize: {}
};
const DEF_OPTSND4TST = {
  sum: {
    baseSize: 4510001,
    optSize: 1550001,
    pathSndOpt: "../",
    pathSndBase: "../"
  },
  hSize: {
    // ソートテストのため、わざとソートを乱す
    "free0509": { baseSize: 4e3, optSize: 1010, fld_nm: "test/free0509", ext: "wav" },
    "bow": { baseSize: 4002, optSize: 3010, fld_nm: "test/bow", ext: "mp4" },
    "wood04": { baseSize: 4001, optSize: 2010, fld_nm: "test/wood04", ext: "wav" }
  }
};
const DEF_TEMP = [];
const DEF_TEMP4TST = [
  { id: "/setting.sn:sys:TextLayer.Back.Alpha", nm: "sys:TextLayer.Back.Alpha", lbl: "メッセージ背景不透明度", type: "rng", val: "0.7", num: 0.7, max: 1, min: 0, step: 0.05 },
  { id: "/setting.sn:sysse_ok1", nm: "sysse_ok1", lbl: "軽い決定音", type: "txt", val: "BurstB_11" },
  { id: "/setting.sn:sysse_ok2", nm: "sysse_ok2", lbl: "重い決定音", type: "txt", val: "BellA_16" },
  { id: "/setting.sn:sysse_ok2_long", nm: "sysse_ok2_long", lbl: "もっと重い決定音", type: "txt", val: "BellB_11" },
  { id: "/setting.sn:sysse_cancel", nm: "sysse_cancel", lbl: "キャンセル音", type: "txt", val: "bell05" },
  { id: "/setting.sn:sysse_choice", nm: "sysse_choice", lbl: "マウスオーバー・選択音", type: "txt", val: "wood04" },
  { id: "/setting.sn:useSysMenu", nm: "useSysMenu", lbl: "メッセージにシステムボタンを配置するか", type: "chk", val: "false", bol: false },
  { id: "/setting.sn:def_fonts", nm: "def_fonts", lbl: "デフォルトフォント", type: "txt", val: "ipamjm, QuiMi_mincho" },
  { id: "/setting.sn:autoResume", nm: "autoResume", lbl: "（開発用ブラウザ版で）自動レジュームするか", type: "chk", val: "true", bol: true }
];

const hDisabled = ref({
  "cnv.font.subset": false,
  "cnv.mat.pic": false,
  "cnv.mat.snd": false
});
const useWss = defineStore("workspaceState", {
  state: () => ({ oWss: DEF_WSS }),
  // 初期値を返す関数
  getters: {},
  // state 及び他の getter へのアクセスが可能
  actions: {
    // State の更新
    init(oWss) {
      this.oWss = oWss;
      this.$subscribe(() => {
        if (hDisabled.value["cnv.font.subset"])
          return;
        if (hDisabled.value["cnv.mat.pic"])
          return;
        if (hDisabled.value["cnv.mat.snd"])
          return;
        cmd2Ex({ cmd: "update.oWss", oWss: toRaw(this.oWss) });
      });
      on("notice.Component", ({ id, mode }) => {
        if (id === "cnv.mat.snd.codec")
          return;
        switch (mode) {
          case "wait":
            hDisabled.value[id] = true;
            break;
          case "cancel":
            this.oWss[id] = !this.oWss[id];
            hDisabled.value[id] = false;
            break;
          case "comp":
            hDisabled.value[id] = false;
            break;
        }
      });
    }
  }
});

const vscode = "acquireVsCodeApi" in window ? acquireVsCodeApi() : void 0;
const isVSCode = vscode !== void 0;
const cmd2Ex = vscode ? (o) => vscode.postMessage(o) : (o) => console.log(`cmd2Ex:%o`, o);
const warn = (mes) => cmd2Ex({ cmd: "warn", mes });
const openURL = (url) => cmd2Ex({ cmd: "openURL", url });
const copyTxt = (id) => cmd2Ex({ cmd: "copyTxt", id });
const aHook = [];
const on = (nm, fnc) => aHook.push({ nm, fnc });
window.addEventListener("message", (e) => {
  if (!e.isTrusted) {
    warn("Setting.vue isTrusted=false");
    return;
  }
  go(e.data.cmd, e.data);
});
function go(nm, data) {
  for (const v of aHook) {
    if (v.nm === nm)
      v.fnc(data);
  }
}
cmd2Ex({ cmd: "?" });
const oVSCode = vscode?.getState() ?? {
  // 永続性回復
  active_tab: "basic"
};
let init$2 = false;
const useVSCode = () => {
  const st = defineStore("vscode.getState", {
    state: () => oVSCode
    // 初期値を返す関数
    //	getters	: {},	// state 及び他の getter へのアクセスが可能
    //	actions	: {},	// State の更新
  })();
  if (!init$2) {
    init$2 = true;
    st.$subscribe(() => vscode?.setState(oVSCode));
    const stCfg = useCfg();
    on("!", ({ oCfg, oWss }) => {
      stCfg.init(oCfg);
      const stWss = useWss();
      stWss.init(oWss);
      go("init", {});
    });
  }
  return st;
};
const getLeftRangeBadge = (value = 0, max = 0, min = 0) => {
  const val = Number((value - min) * 100 / (max - min));
  const pos = 10 - val * 0.2;
  return `calc(${val}% + (${pos}px))`;
};

const useCfg = defineStore("doc/prj/prj.json", {
  state: () => ({ oCfg: isVSCode ? DEF_CFG : DEF_CFG4TST }),
  // 初期値を返す関数
  getters: {
    // state 及び他の getter へのアクセスが可能
    //	getTitle(s) {return s.title;},
    // getter は全て computed 扱いになるため、引数に応じて結果を替える場合に
  },
  actions: {
    // State の更新
    init(oCfg) {
      this.oCfg = oCfg;
      this.$subscribe(() => this.subscribe(toRaw(this.oCfg)));
      on("update.oCfg", ({ oCfg: oCfg2 }) => this.oCfg = oCfg2);
    },
    // useField を使うと $subscribe が効かない
    subscribe(oCfg) {
      cmd2Ex({ cmd: "update.oCfg", oCfg });
    }
  }
});

/**
  * vee-validate v4.8.4
  * (c) 2023 Abdelrahman Awad
  * @license MIT
  */

function isCallable(fn) {
    return typeof fn === 'function';
}
function isNullOrUndefined(value) {
    return value === null || value === undefined;
}
const isObject = (obj) => obj !== null && !!obj && typeof obj === 'object' && !Array.isArray(obj);
function isIndex(value) {
    return Number(value) >= 0;
}
function toNumber(value) {
    const n = parseFloat(value);
    return isNaN(n) ? value : n;
}

const RULES = {};
/**
 * Gets an already defined rule
 */
function resolveRule(id) {
    return RULES[id];
}

const FormContextKey = Symbol('vee-validate-form');
const FieldContextKey = Symbol('vee-validate-field-instance');
const IS_ABSENT = Symbol('Default empty value');

const isClient = typeof window !== 'undefined';
function isLocator(value) {
    return isCallable(value) && !!value.__locatorRef;
}
function isTypedSchema(value) {
    return !!value && isCallable(value.parse) && value.__type === 'VVTypedSchema';
}
function isYupValidator(value) {
    return !!value && isCallable(value.validate);
}
function hasCheckedAttr(type) {
    return type === 'checkbox' || type === 'radio';
}
function isContainerValue(value) {
    return isObject(value) || Array.isArray(value);
}
/**
 * True if the value is an empty object or array
 */
function isEmptyContainer(value) {
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    return isObject(value) && Object.keys(value).length === 0;
}
/**
 * Checks if the path opted out of nested fields using `[fieldName]` syntax
 */
function isNotNestedPath(path) {
    return /^\[.+\]$/i.test(path);
}
/**
 * Checks if an element is a native HTML5 multi-select input element
 */
function isNativeMultiSelect(el) {
    return isNativeSelect(el) && el.multiple;
}
/**
 * Checks if an element is a native HTML5 select input element
 */
function isNativeSelect(el) {
    return el.tagName === 'SELECT';
}
/**
 * Checks if a tag name with attrs object will render a native multi-select element
 */
function isNativeMultiSelectNode(tag, attrs) {
    // The falsy value array is the values that Vue won't add the `multiple` prop if it has one of these values
    const hasTruthyBindingValue = ![false, null, undefined, 0].includes(attrs.multiple) && !Number.isNaN(attrs.multiple);
    return tag === 'select' && 'multiple' in attrs && hasTruthyBindingValue;
}
/**
 * Checks if a node should have a `:value` binding or not
 *
 * These nodes should not have a value binding
 * For files, because they are not reactive
 * For multi-selects because the value binding will reset the value
 */
function shouldHaveValueBinding(tag, attrs) {
    return !isNativeMultiSelectNode(tag, attrs) && attrs.type !== 'file' && !hasCheckedAttr(attrs.type);
}
function isFormSubmitEvent(evt) {
    return isEvent(evt) && evt.target && 'submit' in evt.target;
}
function isEvent(evt) {
    if (!evt) {
        return false;
    }
    if (typeof Event !== 'undefined' && isCallable(Event) && evt instanceof Event) {
        return true;
    }
    // this is for IE and Cypress #3161
    /* istanbul ignore next */
    if (evt && evt.srcElement) {
        return true;
    }
    return false;
}
function isPropPresent(obj, prop) {
    return prop in obj && obj[prop] !== IS_ABSENT;
}
/**
 * Compares if two values are the same borrowed from:
 * https://github.com/epoberezkin/fast-deep-equal
 * We added a case for file matching since `Object.keys` doesn't work with Files.
 * */
function isEqual(a, b) {
    if (a === b)
        return true;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
        if (a.constructor !== b.constructor)
            return false;
        // eslint-disable-next-line no-var
        var length, i, keys;
        if (Array.isArray(a)) {
            length = a.length;
            // eslint-disable-next-line eqeqeq
            if (length != b.length)
                return false;
            for (i = length; i-- !== 0;)
                if (!isEqual(a[i], b[i]))
                    return false;
            return true;
        }
        if (a instanceof Map && b instanceof Map) {
            if (a.size !== b.size)
                return false;
            for (i of a.entries())
                if (!b.has(i[0]))
                    return false;
            for (i of a.entries())
                if (!isEqual(i[1], b.get(i[0])))
                    return false;
            return true;
        }
        // We added this part for file comparison, arguably a little naive but should work for most cases.
        // #3911
        if (isFile(a) && isFile(b)) {
            if (a.size !== b.size)
                return false;
            if (a.name !== b.name)
                return false;
            if (a.lastModified !== b.lastModified)
                return false;
            if (a.type !== b.type)
                return false;
            return true;
        }
        if (a instanceof Set && b instanceof Set) {
            if (a.size !== b.size)
                return false;
            for (i of a.entries())
                if (!b.has(i[0]))
                    return false;
            return true;
        }
        if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
            length = a.length;
            // eslint-disable-next-line eqeqeq
            if (length != b.length)
                return false;
            for (i = length; i-- !== 0;)
                if (a[i] !== b[i])
                    return false;
            return true;
        }
        if (a.constructor === RegExp)
            return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf)
            return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString)
            return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length)
            return false;
        for (i = length; i-- !== 0;)
            if (!Object.prototype.hasOwnProperty.call(b, keys[i]))
                return false;
        for (i = length; i-- !== 0;) {
            // eslint-disable-next-line no-var
            var key = keys[i];
            if (!isEqual(a[key], b[key]))
                return false;
        }
        return true;
    }
    // true if both NaN, false otherwise
    // eslint-disable-next-line no-self-compare
    return a !== a && b !== b;
}
function isFile(a) {
    if (!isClient) {
        return false;
    }
    return a instanceof File;
}

function set(obj, key, val) {
	if (typeof val.value === 'object') val.value = klona(val.value);
	if (!val.enumerable || val.get || val.set || !val.configurable || !val.writable || key === '__proto__') {
		Object.defineProperty(obj, key, val);
	} else obj[key] = val.value;
}

function klona(x) {
	if (typeof x !== 'object') return x;

	var i=0, k, list, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		tmp = Object.create(x.__proto__ || null);
	} else if (str === '[object Array]') {
		tmp = Array(x.length);
	} else if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
	} else if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
	} else if (str === '[object Date]') {
		tmp = new Date(+x);
	} else if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
	} else if (str === '[object DataView]') {
		tmp = new x.constructor( klona(x.buffer) );
	} else if (str === '[object ArrayBuffer]') {
		tmp = x.slice(0);
	} else if (str.slice(-6) === 'Array]') {
		// ArrayBuffer.isView(x)
		// ~> `new` bcuz `Buffer.slice` => ref
		tmp = new x.constructor(x);
	}

	if (tmp) {
		for (list=Object.getOwnPropertySymbols(x); i < list.length; i++) {
			set(tmp, list[i], Object.getOwnPropertyDescriptor(x, list[i]));
		}

		for (i=0, list=Object.getOwnPropertyNames(x); i < list.length; i++) {
			if (Object.hasOwnProperty.call(tmp, k=list[i]) && tmp[k] === x[k]) continue;
			set(tmp, k, Object.getOwnPropertyDescriptor(x, k));
		}
	}

	return tmp || x;
}

function cleanupNonNestedPath(path) {
    if (isNotNestedPath(path)) {
        return path.replace(/\[|\]/gi, '');
    }
    return path;
}
function getFromPath(object, path, fallback) {
    if (!object) {
        return fallback;
    }
    if (isNotNestedPath(path)) {
        return object[cleanupNonNestedPath(path)];
    }
    const resolvedValue = (path || '')
        .split(/\.|\[(\d+)\]/)
        .filter(Boolean)
        .reduce((acc, propKey) => {
        if (isContainerValue(acc) && propKey in acc) {
            return acc[propKey];
        }
        return fallback;
    }, object);
    return resolvedValue;
}
/**
 * Sets a nested property value in a path, creates the path properties if it doesn't exist
 */
function setInPath(object, path, value) {
    if (isNotNestedPath(path)) {
        object[cleanupNonNestedPath(path)] = value;
        return;
    }
    const keys = path.split(/\.|\[(\d+)\]/).filter(Boolean);
    let acc = object;
    for (let i = 0; i < keys.length; i++) {
        // Last key, set it
        if (i === keys.length - 1) {
            acc[keys[i]] = value;
            return;
        }
        // Key does not exist, create a container for it
        if (!(keys[i] in acc) || isNullOrUndefined(acc[keys[i]])) {
            // container can be either an object or an array depending on the next key if it exists
            acc[keys[i]] = isIndex(keys[i + 1]) ? [] : {};
        }
        acc = acc[keys[i]];
    }
}
function unset(object, key) {
    if (Array.isArray(object) && isIndex(key)) {
        object.splice(Number(key), 1);
        return;
    }
    if (isObject(object)) {
        delete object[key];
    }
}
/**
 * Removes a nested property from object
 */
function unsetPath(object, path) {
    if (isNotNestedPath(path)) {
        delete object[cleanupNonNestedPath(path)];
        return;
    }
    const keys = path.split(/\.|\[(\d+)\]/).filter(Boolean);
    let acc = object;
    for (let i = 0; i < keys.length; i++) {
        // Last key, unset it
        if (i === keys.length - 1) {
            unset(acc, keys[i]);
            break;
        }
        // Key does not exist, exit
        if (!(keys[i] in acc) || isNullOrUndefined(acc[keys[i]])) {
            break;
        }
        acc = acc[keys[i]];
    }
    const pathValues = keys.map((_, idx) => {
        return getFromPath(object, keys.slice(0, idx).join('.'));
    });
    for (let i = pathValues.length - 1; i >= 0; i--) {
        if (!isEmptyContainer(pathValues[i])) {
            continue;
        }
        if (i === 0) {
            unset(object, keys[0]);
            continue;
        }
        unset(pathValues[i - 1], keys[i - 1]);
    }
}
/**
 * A typed version of Object.keys
 */
function keysOf(record) {
    return Object.keys(record);
}
// Uses same component provide as its own injections
// Due to changes in https://github.com/vuejs/vue-next/pull/2424
function injectWithSelf(symbol, def = undefined) {
    const vm = getCurrentInstance();
    return (vm === null || vm === void 0 ? void 0 : vm.provides[symbol]) || inject(symbol, def);
}
function resolveNextCheckboxValue(currentValue, checkedValue, uncheckedValue) {
    if (Array.isArray(currentValue)) {
        const newVal = [...currentValue];
        // Use isEqual since checked object values can possibly fail the equality check #3883
        const idx = newVal.findIndex(v => isEqual(v, checkedValue));
        idx >= 0 ? newVal.splice(idx, 1) : newVal.push(checkedValue);
        return newVal;
    }
    return isEqual(currentValue, checkedValue) ? uncheckedValue : checkedValue;
}
function debounceAsync(inner, ms = 0) {
    let timer = null;
    let resolves = [];
    return function (...args) {
        // Run the function after a certain amount of time
        if (timer) {
            window.clearTimeout(timer);
        }
        timer = window.setTimeout(() => {
            // Get the result of the inner function, then apply it to the resolve function of
            // each promise that has been created since the last time the inner function was run
            const result = inner(...args);
            resolves.forEach(r => r(result));
            resolves = [];
        }, ms);
        return new Promise(resolve => resolves.push(resolve));
    };
}
function applyModelModifiers(value, modifiers) {
    if (!isObject(modifiers)) {
        return value;
    }
    if (modifiers.number) {
        return toNumber(value);
    }
    return value;
}
function withLatest(fn, onDone) {
    let latestRun;
    return async function runLatest(...args) {
        const pending = fn(...args);
        latestRun = pending;
        const result = await pending;
        if (pending !== latestRun) {
            return result;
        }
        latestRun = undefined;
        onDone(result, args);
        return result;
    };
}
function computedDeep({ get, set }) {
    const baseRef = ref(klona(get()));
    watch(get, newValue => {
        if (isEqual(newValue, baseRef.value)) {
            return;
        }
        baseRef.value = klona(newValue);
    }, {
        deep: true,
    });
    watch(baseRef, newValue => {
        if (isEqual(newValue, get())) {
            return;
        }
        set(klona(newValue));
    }, {
        deep: true,
    });
    return baseRef;
}
function unravel(value) {
    if (isCallable(value)) {
        return value();
    }
    return unref(value);
}
function lazyToRef(value) {
    return computed(() => unravel(value));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeChildren = (tag, context, slotProps) => {
    if (!context.slots.default) {
        return context.slots.default;
    }
    if (typeof tag === 'string' || !tag) {
        return context.slots.default(slotProps());
    }
    return {
        default: () => { var _a, _b; return (_b = (_a = context.slots).default) === null || _b === void 0 ? void 0 : _b.call(_a, slotProps()); },
    };
};
/**
 * Vue adds a `_value` prop at the moment on the input elements to store the REAL value on them, real values are different than the `value` attribute
 * as they do not get casted to strings unlike `el.value` which preserves user-code behavior
 */
function getBoundValue(el) {
    if (hasValueBinding(el)) {
        return el._value;
    }
    return undefined;
}
/**
 * Vue adds a `_value` prop at the moment on the input elements to store the REAL value on them, real values are different than the `value` attribute
 * as they do not get casted to strings unlike `el.value` which preserves user-code behavior
 */
function hasValueBinding(el) {
    return '_value' in el;
}

function normalizeEventValue(value) {
    if (!isEvent(value)) {
        return value;
    }
    const input = value.target;
    // Vue sets the current bound value on `_value` prop
    // for checkboxes it it should fetch the value binding type as is (boolean instead of string)
    if (hasCheckedAttr(input.type) && hasValueBinding(input)) {
        return getBoundValue(input);
    }
    if (input.type === 'file' && input.files) {
        const files = Array.from(input.files);
        return input.multiple ? files : files[0];
    }
    if (isNativeMultiSelect(input)) {
        return Array.from(input.options)
            .filter(opt => opt.selected && !opt.disabled)
            .map(getBoundValue);
    }
    // makes sure we get the actual `option` bound value
    // #3440
    if (isNativeSelect(input)) {
        const selectedOption = Array.from(input.options).find(opt => opt.selected);
        return selectedOption ? getBoundValue(selectedOption) : input.value;
    }
    return input.value;
}

/**
 * Normalizes the given rules expression.
 */
function normalizeRules(rules) {
    const acc = {};
    Object.defineProperty(acc, '_$$isNormalized', {
        value: true,
        writable: false,
        enumerable: false,
        configurable: false,
    });
    if (!rules) {
        return acc;
    }
    // Object is already normalized, skip.
    if (isObject(rules) && rules._$$isNormalized) {
        return rules;
    }
    if (isObject(rules)) {
        return Object.keys(rules).reduce((prev, curr) => {
            const params = normalizeParams(rules[curr]);
            if (rules[curr] !== false) {
                prev[curr] = buildParams(params);
            }
            return prev;
        }, acc);
    }
    /* istanbul ignore if */
    if (typeof rules !== 'string') {
        return acc;
    }
    return rules.split('|').reduce((prev, rule) => {
        const parsedRule = parseRule(rule);
        if (!parsedRule.name) {
            return prev;
        }
        prev[parsedRule.name] = buildParams(parsedRule.params);
        return prev;
    }, acc);
}
/**
 * Normalizes a rule param.
 */
function normalizeParams(params) {
    if (params === true) {
        return [];
    }
    if (Array.isArray(params)) {
        return params;
    }
    if (isObject(params)) {
        return params;
    }
    return [params];
}
function buildParams(provided) {
    const mapValueToLocator = (value) => {
        // A target param using interpolation
        if (typeof value === 'string' && value[0] === '@') {
            return createLocator(value.slice(1));
        }
        return value;
    };
    if (Array.isArray(provided)) {
        return provided.map(mapValueToLocator);
    }
    // #3073
    if (provided instanceof RegExp) {
        return [provided];
    }
    return Object.keys(provided).reduce((prev, key) => {
        prev[key] = mapValueToLocator(provided[key]);
        return prev;
    }, {});
}
/**
 * Parses a rule string expression.
 */
const parseRule = (rule) => {
    let params = [];
    const name = rule.split(':')[0];
    if (rule.includes(':')) {
        params = rule.split(':').slice(1).join(':').split(',');
    }
    return { name, params };
};
function createLocator(value) {
    const locator = (crossTable) => {
        const val = getFromPath(crossTable, value) || crossTable[value];
        return val;
    };
    locator.__locatorRef = value;
    return locator;
}
function extractLocators(params) {
    if (Array.isArray(params)) {
        return params.filter(isLocator);
    }
    return keysOf(params)
        .filter(key => isLocator(params[key]))
        .map(key => params[key]);
}

const DEFAULT_CONFIG = {
    generateMessage: ({ field }) => `${field} is not valid.`,
    bails: true,
    validateOnBlur: true,
    validateOnChange: true,
    validateOnInput: false,
    validateOnModelUpdate: true,
};
let currentConfig = Object.assign({}, DEFAULT_CONFIG);
const getConfig = () => currentConfig;
const setConfig = (newConf) => {
    currentConfig = Object.assign(Object.assign({}, currentConfig), newConf);
};
const configure = setConfig;

/**
 * Validates a value against the rules.
 */
async function validate(value, rules, options = {}) {
    const shouldBail = options === null || options === void 0 ? void 0 : options.bails;
    const field = {
        name: (options === null || options === void 0 ? void 0 : options.name) || '{field}',
        rules,
        label: options === null || options === void 0 ? void 0 : options.label,
        bails: shouldBail !== null && shouldBail !== void 0 ? shouldBail : true,
        formData: (options === null || options === void 0 ? void 0 : options.values) || {},
    };
    const result = await _validate(field, value);
    const errors = result.errors;
    return {
        errors,
        valid: !errors.length,
    };
}
/**
 * Starts the validation process.
 */
async function _validate(field, value) {
    if (isTypedSchema(field.rules) || isYupValidator(field.rules)) {
        return validateFieldWithTypedSchema(value, field.rules);
    }
    // if a generic function or chain of generic functions
    if (isCallable(field.rules) || Array.isArray(field.rules)) {
        const ctx = {
            field: field.label || field.name,
            name: field.name,
            label: field.label,
            form: field.formData,
            value,
        };
        // Normalize the pipeline
        const pipeline = Array.isArray(field.rules) ? field.rules : [field.rules];
        const length = pipeline.length;
        const errors = [];
        for (let i = 0; i < length; i++) {
            const rule = pipeline[i];
            const result = await rule(value, ctx);
            const isValid = typeof result !== 'string' && result;
            if (isValid) {
                continue;
            }
            const message = typeof result === 'string' ? result : _generateFieldError(ctx);
            errors.push(message);
            if (field.bails) {
                return {
                    errors,
                };
            }
        }
        return {
            errors,
        };
    }
    const normalizedContext = Object.assign(Object.assign({}, field), { rules: normalizeRules(field.rules) });
    const errors = [];
    const rulesKeys = Object.keys(normalizedContext.rules);
    const length = rulesKeys.length;
    for (let i = 0; i < length; i++) {
        const rule = rulesKeys[i];
        const result = await _test(normalizedContext, value, {
            name: rule,
            params: normalizedContext.rules[rule],
        });
        if (result.error) {
            errors.push(result.error);
            if (field.bails) {
                return {
                    errors,
                };
            }
        }
    }
    return {
        errors,
    };
}
function isYupError(err) {
    return !!err && err.name === 'ValidationError';
}
function yupToTypedSchema(yupSchema) {
    const schema = {
        __type: 'VVTypedSchema',
        async parse(values) {
            var _a;
            try {
                const output = await yupSchema.validate(values, { abortEarly: false });
                return {
                    output,
                    errors: [],
                };
            }
            catch (err) {
                // Yup errors have a name prop one them.
                // https://github.com/jquense/yup#validationerrorerrors-string--arraystring-value-any-path-string
                if (!isYupError(err)) {
                    throw err;
                }
                if (!((_a = err.inner) === null || _a === void 0 ? void 0 : _a.length) && err.errors.length) {
                    return { errors: [{ path: err.path, errors: err.errors }] };
                }
                const errors = err.inner.reduce((acc, curr) => {
                    const path = curr.path || '';
                    if (!acc[path]) {
                        acc[path] = { errors: [], path };
                    }
                    acc[path].errors.push(...curr.errors);
                    return acc;
                }, {});
                return { errors: Object.values(errors) };
            }
        },
    };
    return schema;
}
/**
 * Handles yup validation
 */
async function validateFieldWithTypedSchema(value, schema) {
    const typedSchema = isTypedSchema(schema) ? schema : yupToTypedSchema(schema);
    const result = await typedSchema.parse(value);
    const messages = [];
    for (const error of result.errors) {
        if (error.errors.length) {
            messages.push(...error.errors);
        }
    }
    return {
        errors: messages,
    };
}
/**
 * Tests a single input value against a rule.
 */
async function _test(field, value, rule) {
    const validator = resolveRule(rule.name);
    if (!validator) {
        throw new Error(`No such validator '${rule.name}' exists.`);
    }
    const params = fillTargetValues(rule.params, field.formData);
    const ctx = {
        field: field.label || field.name,
        name: field.name,
        label: field.label,
        value,
        form: field.formData,
        rule: Object.assign(Object.assign({}, rule), { params }),
    };
    const result = await validator(value, params, ctx);
    if (typeof result === 'string') {
        return {
            error: result,
        };
    }
    return {
        error: result ? undefined : _generateFieldError(ctx),
    };
}
/**
 * Generates error messages.
 */
function _generateFieldError(fieldCtx) {
    const message = getConfig().generateMessage;
    if (!message) {
        return 'Field is invalid';
    }
    return message(fieldCtx);
}
function fillTargetValues(params, crossTable) {
    const normalize = (value) => {
        if (isLocator(value)) {
            return value(crossTable);
        }
        return value;
    };
    if (Array.isArray(params)) {
        return params.map(normalize);
    }
    return Object.keys(params).reduce((acc, param) => {
        acc[param] = normalize(params[param]);
        return acc;
    }, {});
}
async function validateTypedSchema(schema, values) {
    const typedSchema = isTypedSchema(schema) ? schema : yupToTypedSchema(schema);
    const validationResult = await typedSchema.parse(values);
    const results = {};
    const errors = {};
    for (const error of validationResult.errors) {
        const messages = error.errors;
        // Fixes issue with path mapping with Yup 1.0 including quotes around array indices
        const path = (error.path || '').replace(/\["(\d+)"\]/g, (_, m) => {
            return `[${m}]`;
        });
        results[path] = { valid: !messages.length, errors: messages };
        if (messages.length) {
            errors[path] = messages[0];
        }
    }
    return {
        valid: !validationResult.errors.length,
        results,
        errors,
        values: validationResult.value,
    };
}
async function validateObjectSchema(schema, values, opts) {
    const paths = keysOf(schema);
    const validations = paths.map(async (path) => {
        var _a, _b, _c;
        const strings = (_a = opts === null || opts === void 0 ? void 0 : opts.names) === null || _a === void 0 ? void 0 : _a[path];
        const fieldResult = await validate(getFromPath(values, path), schema[path], {
            name: (strings === null || strings === void 0 ? void 0 : strings.name) || path,
            label: strings === null || strings === void 0 ? void 0 : strings.label,
            values: values,
            bails: (_c = (_b = opts === null || opts === void 0 ? void 0 : opts.bailsMap) === null || _b === void 0 ? void 0 : _b[path]) !== null && _c !== void 0 ? _c : true,
        });
        return Object.assign(Object.assign({}, fieldResult), { path });
    });
    let isAllValid = true;
    const validationResults = await Promise.all(validations);
    const results = {};
    const errors = {};
    for (const result of validationResults) {
        results[result.path] = {
            valid: result.valid,
            errors: result.errors,
        };
        if (!result.valid) {
            isAllValid = false;
            errors[result.path] = result.errors[0];
        }
    }
    return {
        valid: isAllValid,
        results,
        errors,
    };
}

let ID_COUNTER = 0;
function useFieldState(path, init) {
    const { value, initialValue, setInitialValue } = _useFieldValue(path, init.modelValue, init.form);
    const { errorMessage, errors, setErrors } = _useFieldErrors(path, init.form);
    const meta = _useFieldMeta(value, initialValue, errors);
    const id = ID_COUNTER >= Number.MAX_SAFE_INTEGER ? 0 : ++ID_COUNTER;
    function setState(state) {
        var _a;
        if ('value' in state) {
            value.value = state.value;
        }
        if ('errors' in state) {
            setErrors(state.errors);
        }
        if ('touched' in state) {
            meta.touched = (_a = state.touched) !== null && _a !== void 0 ? _a : meta.touched;
        }
        if ('initialValue' in state) {
            setInitialValue(state.initialValue);
        }
    }
    return {
        id,
        path,
        value,
        initialValue,
        meta,
        errors,
        errorMessage,
        setState,
    };
}
/**
 * Creates the field value and resolves the initial value
 */
function _useFieldValue(path, modelValue, form) {
    const modelRef = ref(unref(modelValue));
    function resolveInitialValue() {
        if (!form) {
            return unref(modelRef);
        }
        return getFromPath(form.meta.value.initialValues, unref(path), unref(modelRef));
    }
    function setInitialValue(value) {
        if (!form) {
            modelRef.value = value;
            return;
        }
        form.stageInitialValue(unref(path), value, true);
    }
    const initialValue = computed(resolveInitialValue);
    // if no form is associated, use a regular ref.
    if (!form) {
        const value = ref(resolveInitialValue());
        return {
            value,
            initialValue,
            setInitialValue,
        };
    }
    // to set the initial value, first check if there is a current value, if there is then use it.
    // otherwise use the configured initial value if it exists.
    // prioritize model value over form values
    // #3429
    const currentValue = modelValue ? unref(modelValue) : getFromPath(form.values, unref(path), unref(initialValue));
    form.stageInitialValue(unref(path), currentValue, true);
    // otherwise use a computed setter that triggers the `setFieldValue`
    const value = computed({
        get() {
            return getFromPath(form.values, unref(path));
        },
        set(newVal) {
            form.setFieldValue(unref(path), newVal);
        },
    });
    return {
        value,
        initialValue,
        setInitialValue,
    };
}
/**
 * Creates meta flags state and some associated effects with them
 */
function _useFieldMeta(currentValue, initialValue, errors) {
    const meta = reactive({
        touched: false,
        pending: false,
        valid: true,
        validated: !!unref(errors).length,
        initialValue: computed(() => unref(initialValue)),
        dirty: computed(() => {
            return !isEqual(unref(currentValue), unref(initialValue));
        }),
    });
    watch(errors, value => {
        meta.valid = !value.length;
    }, {
        immediate: true,
        flush: 'sync',
    });
    return meta;
}
/**
 * Creates the error message state for the field state
 */
function _useFieldErrors(path, form) {
    function normalizeErrors(messages) {
        if (!messages) {
            return [];
        }
        return Array.isArray(messages) ? messages : [messages];
    }
    if (!form) {
        const errors = ref([]);
        return {
            errors,
            errorMessage: computed(() => errors.value[0]),
            setErrors: (messages) => {
                errors.value = normalizeErrors(messages);
            },
        };
    }
    const errors = computed(() => form.errorBag.value[unref(path)] || []);
    return {
        errors,
        errorMessage: computed(() => errors.value[0]),
        setErrors: (messages) => {
            form.setFieldErrorBag(unref(path), normalizeErrors(messages));
        },
    };
}

/**
 * Creates a field composite.
 */
function useField(path, rules, opts) {
    if (hasCheckedAttr(opts === null || opts === void 0 ? void 0 : opts.type)) {
        return useCheckboxField(path, rules, opts);
    }
    return _useField(path, rules, opts);
}
function _useField(path, rules, opts) {
    const { initialValue: modelValue, validateOnMount, bails, type, checkedValue, label, validateOnValueUpdate, uncheckedValue, controlled, keepValueOnUnmount, modelPropName, syncVModel, form: controlForm, } = normalizeOptions(opts);
    const injectedForm = controlled ? injectWithSelf(FormContextKey) : undefined;
    const form = controlForm || injectedForm;
    const name = lazyToRef(path);
    // a flag indicating if the field is about to be removed/unmounted.
    let markedForRemoval = false;
    const { id, value, initialValue, meta, setState, errors, errorMessage } = useFieldState(name, {
        modelValue,
        form,
    });
    if (syncVModel) {
        useVModel({ value, prop: modelPropName, handleChange });
    }
    /**
     * Handles common onBlur meta update
     */
    const handleBlur = () => {
        meta.touched = true;
    };
    const normalizedRules = computed(() => {
        let rulesValue = unref(rules);
        const schema = unref(form === null || form === void 0 ? void 0 : form.schema);
        if (schema && !isYupValidator(schema) && !isTypedSchema(schema)) {
            rulesValue = extractRuleFromSchema(schema, unref(name)) || rulesValue;
        }
        if (isYupValidator(rulesValue) ||
            isTypedSchema(rulesValue) ||
            isCallable(rulesValue) ||
            Array.isArray(rulesValue)) {
            return rulesValue;
        }
        return normalizeRules(rulesValue);
    });
    async function validateCurrentValue(mode) {
        var _a, _b;
        if (form === null || form === void 0 ? void 0 : form.validateSchema) {
            return (_a = (await form.validateSchema(mode)).results[unref(name)]) !== null && _a !== void 0 ? _a : { valid: true, errors: [] };
        }
        return validate(value.value, normalizedRules.value, {
            name: unref(name),
            label: unref(label),
            values: (_b = form === null || form === void 0 ? void 0 : form.values) !== null && _b !== void 0 ? _b : {},
            bails,
        });
    }
    const validateWithStateMutation = withLatest(async () => {
        meta.pending = true;
        meta.validated = true;
        return validateCurrentValue('validated-only');
    }, result => {
        if (markedForRemoval) {
            result.valid = true;
            result.errors = [];
        }
        setState({ errors: result.errors });
        meta.pending = false;
        return result;
    });
    const validateValidStateOnly = withLatest(async () => {
        return validateCurrentValue('silent');
    }, result => {
        if (markedForRemoval) {
            result.valid = true;
        }
        meta.valid = result.valid;
        return result;
    });
    function validate$1(opts) {
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === 'silent') {
            return validateValidStateOnly();
        }
        return validateWithStateMutation();
    }
    // Common input/change event handler
    function handleChange(e, shouldValidate = true) {
        const newValue = normalizeEventValue(e);
        value.value = newValue;
        if (!validateOnValueUpdate && shouldValidate) {
            validateWithStateMutation();
        }
    }
    // Runs the initial validation
    onMounted(() => {
        if (validateOnMount) {
            return validateWithStateMutation();
        }
        // validate self initially if no form was handling this
        // forms should have their own initial silent validation run to make things more efficient
        if (!form || !form.validateSchema) {
            validateValidStateOnly();
        }
    });
    function setTouched(isTouched) {
        meta.touched = isTouched;
    }
    let unwatchValue;
    let lastWatchedValue = klona(value.value);
    function watchValue() {
        unwatchValue = watch(value, (val, oldVal) => {
            if (isEqual(val, oldVal) && isEqual(val, lastWatchedValue)) {
                return;
            }
            const validateFn = validateOnValueUpdate ? validateWithStateMutation : validateValidStateOnly;
            validateFn();
            lastWatchedValue = klona(val);
        }, {
            deep: true,
        });
    }
    watchValue();
    function resetField(state) {
        var _a;
        unwatchValue === null || unwatchValue === void 0 ? void 0 : unwatchValue();
        const newValue = state && 'value' in state ? state.value : initialValue.value;
        setState({
            value: klona(newValue),
            initialValue: klona(newValue),
            touched: (_a = state === null || state === void 0 ? void 0 : state.touched) !== null && _a !== void 0 ? _a : false,
            errors: (state === null || state === void 0 ? void 0 : state.errors) || [],
        });
        meta.pending = false;
        meta.validated = false;
        validateValidStateOnly();
        // need to watch at next tick to avoid triggering the value watcher
        nextTick(() => {
            watchValue();
        });
    }
    function setValue(newValue) {
        value.value = newValue;
    }
    function setErrors(errors) {
        setState({ errors: Array.isArray(errors) ? errors : [errors] });
    }
    const field = {
        id,
        name,
        label,
        value,
        meta,
        errors,
        errorMessage,
        type,
        checkedValue,
        uncheckedValue,
        bails,
        keepValueOnUnmount,
        resetField,
        handleReset: () => resetField(),
        validate: validate$1,
        handleChange,
        handleBlur,
        setState,
        setTouched,
        setErrors,
        setValue,
    };
    provide(FieldContextKey, field);
    if (isRef(rules) && typeof unref(rules) !== 'function') {
        watch(rules, (value, oldValue) => {
            if (isEqual(value, oldValue)) {
                return;
            }
            meta.validated ? validateWithStateMutation() : validateValidStateOnly();
        }, {
            deep: true,
        });
    }
    // if no associated form return the field API immediately
    if (!form) {
        return field;
    }
    // associate the field with the given form
    form.register(field);
    onBeforeUnmount(() => {
        markedForRemoval = true;
        form.unregister(field);
    });
    // extract cross-field dependencies in a computed prop
    const dependencies = computed(() => {
        const rulesVal = normalizedRules.value;
        // is falsy, a function schema or a yup schema
        if (!rulesVal ||
            isCallable(rulesVal) ||
            isYupValidator(rulesVal) ||
            isTypedSchema(rulesVal) ||
            Array.isArray(rulesVal)) {
            return {};
        }
        return Object.keys(rulesVal).reduce((acc, rule) => {
            const deps = extractLocators(rulesVal[rule])
                .map((dep) => dep.__locatorRef)
                .reduce((depAcc, depName) => {
                const depValue = getFromPath(form.values, depName) || form.values[depName];
                if (depValue !== undefined) {
                    depAcc[depName] = depValue;
                }
                return depAcc;
            }, {});
            Object.assign(acc, deps);
            return acc;
        }, {});
    });
    // Adds a watcher that runs the validation whenever field dependencies change
    watch(dependencies, (deps, oldDeps) => {
        // Skip if no dependencies or if the field wasn't manipulated
        if (!Object.keys(deps).length) {
            return;
        }
        const shouldValidate = !isEqual(deps, oldDeps);
        if (shouldValidate) {
            meta.validated ? validateWithStateMutation() : validateValidStateOnly();
        }
    });
    return field;
}
/**
 * Normalizes partial field options to include the full options
 */
function normalizeOptions(opts) {
    var _a;
    const defaults = () => ({
        initialValue: undefined,
        validateOnMount: false,
        bails: true,
        label: undefined,
        validateOnValueUpdate: true,
        keepValueOnUnmount: undefined,
        modelPropName: 'modelValue',
        syncVModel: true,
        controlled: true,
    });
    const isVModelSynced = (_a = opts === null || opts === void 0 ? void 0 : opts.syncVModel) !== null && _a !== void 0 ? _a : true;
    const initialValue = isVModelSynced && !('initialValue' in (opts || {}))
        ? getCurrentModelValue(getCurrentInstance(), (opts === null || opts === void 0 ? void 0 : opts.modelPropName) || 'modelValue')
        : opts === null || opts === void 0 ? void 0 : opts.initialValue;
    if (!opts) {
        return Object.assign(Object.assign({}, defaults()), { initialValue });
    }
    // TODO: Deprecate this in next major release
    const checkedValue = 'valueProp' in opts ? opts.valueProp : opts.checkedValue;
    const controlled = 'standalone' in opts ? !opts.standalone : opts.controlled;
    return Object.assign(Object.assign(Object.assign({}, defaults()), (opts || {})), { initialValue, controlled: controlled !== null && controlled !== void 0 ? controlled : true, checkedValue });
}
/**
 * Extracts the validation rules from a schema
 */
function extractRuleFromSchema(schema, fieldName) {
    // no schema at all
    if (!schema) {
        return undefined;
    }
    // there is a key on the schema object for this field
    return schema[fieldName];
}
function useCheckboxField(name, rules, opts) {
    const form = !(opts === null || opts === void 0 ? void 0 : opts.standalone) ? injectWithSelf(FormContextKey) : undefined;
    const checkedValue = opts === null || opts === void 0 ? void 0 : opts.checkedValue;
    const uncheckedValue = opts === null || opts === void 0 ? void 0 : opts.uncheckedValue;
    function patchCheckboxApi(field) {
        const handleChange = field.handleChange;
        const checked = computed(() => {
            const currentValue = unref(field.value);
            const checkedVal = unref(checkedValue);
            return Array.isArray(currentValue)
                ? currentValue.findIndex(v => isEqual(v, checkedVal)) >= 0
                : isEqual(checkedVal, currentValue);
        });
        function handleCheckboxChange(e, shouldValidate = true) {
            var _a;
            if (checked.value === ((_a = e === null || e === void 0 ? void 0 : e.target) === null || _a === void 0 ? void 0 : _a.checked)) {
                if (shouldValidate) {
                    field.validate();
                }
                return;
            }
            let newValue = normalizeEventValue(e);
            // Single checkbox field without a form to toggle it's value
            if (!form) {
                newValue = resolveNextCheckboxValue(unref(field.value), unref(checkedValue), unref(uncheckedValue));
            }
            handleChange(newValue, shouldValidate);
        }
        return Object.assign(Object.assign({}, field), { checked,
            checkedValue,
            uncheckedValue, handleChange: handleCheckboxChange });
    }
    return patchCheckboxApi(_useField(name, rules, opts));
}
function useVModel({ prop, value, handleChange }) {
    const vm = getCurrentInstance();
    /* istanbul ignore next */
    if (!vm) {
        return;
    }
    const propName = prop || 'modelValue';
    const emitName = `update:${propName}`;
    // Component doesn't have a model prop setup (must be defined on the props)
    if (!(propName in vm.props)) {
        return;
    }
    watch(value, newValue => {
        if (isEqual(newValue, getCurrentModelValue(vm, propName))) {
            return;
        }
        vm.emit(emitName, newValue);
    });
    watch(() => getCurrentModelValue(vm, propName), propValue => {
        if (propValue === IS_ABSENT && value.value === undefined) {
            return;
        }
        const newValue = propValue === IS_ABSENT ? undefined : propValue;
        if (isEqual(newValue, applyModelModifiers(value.value, vm.props.modelModifiers))) {
            return;
        }
        handleChange(newValue);
    });
}
function getCurrentModelValue(vm, propName) {
    if (!vm) {
        return undefined;
    }
    return vm.props[propName];
}

const FieldImpl = defineComponent({
    name: 'Field',
    inheritAttrs: false,
    props: {
        as: {
            type: [String, Object],
            default: undefined,
        },
        name: {
            type: String,
            required: true,
        },
        rules: {
            type: [Object, String, Function],
            default: undefined,
        },
        validateOnMount: {
            type: Boolean,
            default: false,
        },
        validateOnBlur: {
            type: Boolean,
            default: undefined,
        },
        validateOnChange: {
            type: Boolean,
            default: undefined,
        },
        validateOnInput: {
            type: Boolean,
            default: undefined,
        },
        validateOnModelUpdate: {
            type: Boolean,
            default: undefined,
        },
        bails: {
            type: Boolean,
            default: () => getConfig().bails,
        },
        label: {
            type: String,
            default: undefined,
        },
        uncheckedValue: {
            type: null,
            default: undefined,
        },
        modelValue: {
            type: null,
            default: IS_ABSENT,
        },
        modelModifiers: {
            type: null,
            default: () => ({}),
        },
        'onUpdate:modelValue': {
            type: null,
            default: undefined,
        },
        standalone: {
            type: Boolean,
            default: false,
        },
        keepValue: {
            type: Boolean,
            default: undefined,
        },
    },
    setup(props, ctx) {
        const rules = toRef(props, 'rules');
        const name = toRef(props, 'name');
        const label = toRef(props, 'label');
        const uncheckedValue = toRef(props, 'uncheckedValue');
        const keepValue = toRef(props, 'keepValue');
        const { errors, value, errorMessage, validate: validateField, handleChange, handleBlur, setTouched, resetField, handleReset, meta, checked, setErrors, } = useField(name, rules, {
            validateOnMount: props.validateOnMount,
            bails: props.bails,
            standalone: props.standalone,
            type: ctx.attrs.type,
            initialValue: resolveInitialValue(props, ctx),
            // Only for checkboxes and radio buttons
            checkedValue: ctx.attrs.value,
            uncheckedValue,
            label,
            validateOnValueUpdate: false,
            keepValueOnUnmount: keepValue,
        });
        // If there is a v-model applied on the component we need to emit the `update:modelValue` whenever the value binding changes
        const onChangeHandler = function handleChangeWithModel(e, shouldValidate = true) {
            handleChange(e, shouldValidate);
            ctx.emit('update:modelValue', value.value);
        };
        const handleInput = (e) => {
            if (!hasCheckedAttr(ctx.attrs.type)) {
                value.value = normalizeEventValue(e);
            }
        };
        const onInputHandler = function handleInputWithModel(e) {
            handleInput(e);
            ctx.emit('update:modelValue', value.value);
        };
        const fieldProps = computed(() => {
            const { validateOnInput, validateOnChange, validateOnBlur, validateOnModelUpdate } = resolveValidationTriggers(props);
            const baseOnBlur = [handleBlur, ctx.attrs.onBlur, validateOnBlur ? validateField : undefined].filter(Boolean);
            const baseOnInput = [(e) => onChangeHandler(e, validateOnInput), ctx.attrs.onInput].filter(Boolean);
            const baseOnChange = [(e) => onChangeHandler(e, validateOnChange), ctx.attrs.onChange].filter(Boolean);
            const attrs = {
                name: props.name,
                onBlur: baseOnBlur,
                onInput: baseOnInput,
                onChange: baseOnChange,
            };
            attrs['onUpdate:modelValue'] = e => onChangeHandler(e, validateOnModelUpdate);
            if (hasCheckedAttr(ctx.attrs.type) && checked) {
                attrs.checked = checked.value;
            }
            const tag = resolveTag(props, ctx);
            if (shouldHaveValueBinding(tag, ctx.attrs)) {
                attrs.value = value.value;
            }
            return attrs;
        });
        function slotProps() {
            return {
                field: fieldProps.value,
                value: value.value,
                meta,
                errors: errors.value,
                errorMessage: errorMessage.value,
                validate: validateField,
                resetField,
                handleChange: onChangeHandler,
                handleInput: onInputHandler,
                handleReset,
                handleBlur,
                setTouched,
                setErrors,
            };
        }
        ctx.expose({
            setErrors,
            setTouched,
            reset: resetField,
            validate: validateField,
            handleChange,
        });
        return () => {
            const tag = resolveDynamicComponent(resolveTag(props, ctx));
            const children = normalizeChildren(tag, ctx, slotProps);
            if (tag) {
                return h(tag, Object.assign(Object.assign({}, ctx.attrs), fieldProps.value), children);
            }
            return children;
        };
    },
});
function resolveTag(props, ctx) {
    let tag = props.as || '';
    if (!props.as && !ctx.slots.default) {
        tag = 'input';
    }
    return tag;
}
function resolveValidationTriggers(props) {
    var _a, _b, _c, _d;
    const { validateOnInput, validateOnChange, validateOnBlur, validateOnModelUpdate } = getConfig();
    return {
        validateOnInput: (_a = props.validateOnInput) !== null && _a !== void 0 ? _a : validateOnInput,
        validateOnChange: (_b = props.validateOnChange) !== null && _b !== void 0 ? _b : validateOnChange,
        validateOnBlur: (_c = props.validateOnBlur) !== null && _c !== void 0 ? _c : validateOnBlur,
        validateOnModelUpdate: (_d = props.validateOnModelUpdate) !== null && _d !== void 0 ? _d : validateOnModelUpdate,
    };
}
function resolveInitialValue(props, ctx) {
    // Gets the initial value either from `value` prop/attr or `v-model` binding (modelValue)
    // For checkboxes and radio buttons it will always be the model value not the `value` attribute
    if (!hasCheckedAttr(ctx.attrs.type)) {
        return isPropPresent(props, 'modelValue') ? props.modelValue : ctx.attrs.value;
    }
    return isPropPresent(props, 'modelValue') ? props.modelValue : undefined;
}
const Field = FieldImpl;

let FORM_COUNTER = 0;
function resolveInitialValues(opts) {
    const providedValues = unref(opts === null || opts === void 0 ? void 0 : opts.initialValues) || {};
    const schema = unref(opts === null || opts === void 0 ? void 0 : opts.validationSchema);
    if (schema && isTypedSchema(schema) && isCallable(schema.cast)) {
        return klona(schema.cast(providedValues) || {});
    }
    return klona(providedValues);
}
function useForm(opts) {
    var _a;
    const formId = FORM_COUNTER++;
    const controlledModelPaths = new Set();
    // Prevents fields from double resetting their values, which causes checkboxes to toggle their initial value
    // TODO: This won't be needed if we centralize all the state inside the `form` for form inputs
    let RESET_LOCK = false;
    // A lookup containing fields or field groups
    const fieldsByPath = ref({});
    // If the form is currently submitting
    const isSubmitting = ref(false);
    // The number of times the user tried to submit the form
    const submitCount = ref(0);
    // field arrays managed by this form
    const fieldArrays = [];
    // a private ref for all form values
    const formValues = reactive(resolveInitialValues(opts));
    // the source of errors for the form fields
    const { errorBag, setErrorBag, setFieldErrorBag } = useErrorBag(opts === null || opts === void 0 ? void 0 : opts.initialErrors);
    // Gets the first error of each field
    const errors = computed(() => {
        return keysOf(errorBag.value).reduce((acc, key) => {
            const bag = errorBag.value[key];
            if (bag && bag.length) {
                acc[key] = bag[0];
            }
            return acc;
        }, {});
    });
    function getFirstFieldAtPath(path) {
        const fieldOrGroup = fieldsByPath.value[path];
        return Array.isArray(fieldOrGroup) ? fieldOrGroup[0] : fieldOrGroup;
    }
    function fieldExists(path) {
        return !!fieldsByPath.value[path];
    }
    /**
     * Holds a computed reference to all fields names and labels
     */
    const fieldNames = computed(() => {
        return keysOf(fieldsByPath.value).reduce((names, path) => {
            const field = getFirstFieldAtPath(path);
            if (field) {
                names[path] = { name: unref(field.name) || '', label: unref(field.label) || '' };
            }
            return names;
        }, {});
    });
    const fieldBailsMap = computed(() => {
        return keysOf(fieldsByPath.value).reduce((map, path) => {
            var _a;
            const field = getFirstFieldAtPath(path);
            if (field) {
                map[path] = (_a = field.bails) !== null && _a !== void 0 ? _a : true;
            }
            return map;
        }, {});
    });
    // mutable non-reactive reference to initial errors
    // we need this to process initial errors then unset them
    const initialErrors = Object.assign({}, ((opts === null || opts === void 0 ? void 0 : opts.initialErrors) || {}));
    const keepValuesOnUnmount = (_a = opts === null || opts === void 0 ? void 0 : opts.keepValuesOnUnmount) !== null && _a !== void 0 ? _a : false;
    // initial form values
    const { initialValues, originalInitialValues, setInitialValues } = useFormInitialValues(fieldsByPath, formValues, opts);
    // form meta aggregations
    const meta = useFormMeta(fieldsByPath, formValues, originalInitialValues, errors);
    const controlledValues = computed(() => {
        return [...controlledModelPaths, ...keysOf(fieldsByPath.value)].reduce((acc, path) => {
            const value = getFromPath(formValues, path);
            setInPath(acc, path, value);
            return acc;
        }, {});
    });
    const schema = opts === null || opts === void 0 ? void 0 : opts.validationSchema;
    /**
     * Batches validation runs in 5ms batches
     * Must have two distinct batch queues to make sure they don't override each other settings #3783
     */
    const debouncedSilentValidation = debounceAsync(_validateSchema, 5);
    const debouncedValidation = debounceAsync(_validateSchema, 5);
    const validateSchema = withLatest(async (mode) => {
        return (await mode) === 'silent' ? debouncedSilentValidation() : debouncedValidation();
    }, (formResult, [mode]) => {
        // fields by id lookup
        const fieldsById = formCtx.fieldsByPath.value || {};
        // errors fields names, we need it to also check if custom errors are updated
        const currentErrorsPaths = keysOf(formCtx.errorBag.value);
        // collect all the keys from the schema and all fields
        // this ensures we have a complete keymap of all the fields
        const paths = [
            ...new Set([...keysOf(formResult.results), ...keysOf(fieldsById), ...currentErrorsPaths]),
        ];
        // aggregates the paths into a single result object while applying the results on the fields
        return paths.reduce((validation, path) => {
            const field = fieldsById[path];
            const messages = (formResult.results[path] || { errors: [] }).errors;
            const fieldResult = {
                errors: messages,
                valid: !messages.length,
            };
            validation.results[path] = fieldResult;
            if (!fieldResult.valid) {
                validation.errors[path] = fieldResult.errors[0];
            }
            // field not rendered
            if (!field) {
                setFieldError(path, messages);
                return validation;
            }
            // always update the valid flag regardless of the mode
            applyFieldMutation(field, f => (f.meta.valid = fieldResult.valid));
            if (mode === 'silent') {
                return validation;
            }
            const wasValidated = Array.isArray(field) ? field.some(f => f.meta.validated) : field.meta.validated;
            if (mode === 'validated-only' && !wasValidated) {
                return validation;
            }
            applyFieldMutation(field, f => f.setState({ errors: fieldResult.errors }));
            return validation;
        }, { valid: formResult.valid, results: {}, errors: {} });
    });
    function makeSubmissionFactory(onlyControlled) {
        return function submitHandlerFactory(fn, onValidationError) {
            return function submissionHandler(e) {
                if (e instanceof Event) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                // Touch all fields
                setTouched(keysOf(fieldsByPath.value).reduce((acc, field) => {
                    acc[field] = true;
                    return acc;
                }, {}));
                isSubmitting.value = true;
                submitCount.value++;
                return validate()
                    .then(result => {
                    const values = klona(formValues);
                    if (result.valid && typeof fn === 'function') {
                        const controlled = klona(controlledValues.value);
                        let submittedValues = onlyControlled ? controlled : values;
                        if (result.values) {
                            submittedValues = result.values;
                        }
                        return fn(submittedValues, {
                            evt: e,
                            controlledValues: controlled,
                            setErrors,
                            setFieldError,
                            setTouched,
                            setFieldTouched,
                            setValues,
                            setFieldValue,
                            resetForm,
                            resetField,
                        });
                    }
                    if (!result.valid && typeof onValidationError === 'function') {
                        onValidationError({
                            values,
                            evt: e,
                            errors: result.errors,
                            results: result.results,
                        });
                    }
                })
                    .then(returnVal => {
                    isSubmitting.value = false;
                    return returnVal;
                }, err => {
                    isSubmitting.value = false;
                    // re-throw the err so it doesn't go silent
                    throw err;
                });
            };
        };
    }
    const handleSubmitImpl = makeSubmissionFactory(false);
    const handleSubmit = handleSubmitImpl;
    handleSubmit.withControlled = makeSubmissionFactory(true);
    const formCtx = {
        formId,
        fieldsByPath,
        values: formValues,
        controlledValues,
        errorBag,
        errors,
        schema,
        submitCount,
        meta,
        isSubmitting,
        fieldArrays,
        keepValuesOnUnmount,
        validateSchema: unref(schema) ? validateSchema : undefined,
        validate,
        register: registerField,
        unregister: unregisterField,
        setFieldErrorBag,
        validateField,
        setFieldValue,
        setValues,
        setErrors,
        setFieldError,
        setFieldTouched,
        setTouched,
        resetForm,
        resetField,
        handleSubmit,
        stageInitialValue,
        unsetInitialValue,
        setFieldInitialValue,
        useFieldModel,
    };
    function isFieldGroup(fieldOrGroup) {
        return Array.isArray(fieldOrGroup);
    }
    function applyFieldMutation(fieldOrGroup, mutation) {
        if (Array.isArray(fieldOrGroup)) {
            return fieldOrGroup.forEach(mutation);
        }
        return mutation(fieldOrGroup);
    }
    function mutateAllFields(mutation) {
        Object.values(fieldsByPath.value).forEach(field => {
            if (!field) {
                return;
            }
            // avoid resetting the field values, because they should've been reset already.
            applyFieldMutation(field, mutation);
        });
    }
    /**
     * Manually sets an error message on a specific field
     */
    function setFieldError(field, message) {
        setFieldErrorBag(field, message);
    }
    /**
     * Sets errors for the fields specified in the object
     */
    function setErrors(fields) {
        setErrorBag(fields);
    }
    /**
     * Sets a single field value
     */
    function setFieldValue(field, value, { force } = { force: false }) {
        var _a;
        const fieldInstance = fieldsByPath.value[field];
        const clonedValue = klona(value);
        // field wasn't found, create a virtual field as a placeholder
        if (!fieldInstance) {
            setInPath(formValues, field, clonedValue);
            return;
        }
        if (isFieldGroup(fieldInstance) && ((_a = fieldInstance[0]) === null || _a === void 0 ? void 0 : _a.type) === 'checkbox' && !Array.isArray(value)) {
            // Multiple checkboxes, and only one of them got updated
            const newValue = klona(resolveNextCheckboxValue(getFromPath(formValues, field) || [], value, undefined));
            setInPath(formValues, field, newValue);
            return;
        }
        let newValue = clonedValue;
        // Single Checkbox: toggles the field value unless the field is being reset then force it
        if (!isFieldGroup(fieldInstance) && fieldInstance.type === 'checkbox' && !force && !RESET_LOCK) {
            newValue = klona(resolveNextCheckboxValue(getFromPath(formValues, field), value, unref(fieldInstance.uncheckedValue)));
        }
        setInPath(formValues, field, newValue);
    }
    /**
     * Sets multiple fields values
     */
    function setValues(fields) {
        // clean up old values
        keysOf(formValues).forEach(key => {
            delete formValues[key];
        });
        // set up new values
        keysOf(fields).forEach(path => {
            setFieldValue(path, fields[path]);
        });
        // regenerate the arrays when the form values change
        fieldArrays.forEach(f => f && f.reset());
    }
    function createModel(path) {
        const { value } = _useFieldValue(path, undefined, formCtx);
        watch(value, () => {
            if (!fieldExists(unref(path))) {
                validate({ mode: 'validated-only' });
            }
        }, {
            deep: true,
        });
        controlledModelPaths.add(unref(path));
        return value;
    }
    function useFieldModel(path) {
        if (!Array.isArray(path)) {
            return createModel(path);
        }
        return path.map(createModel);
    }
    /**
     * Sets the touched meta state on a field
     */
    function setFieldTouched(field, isTouched) {
        const fieldInstance = fieldsByPath.value[field];
        if (fieldInstance) {
            applyFieldMutation(fieldInstance, f => f.setTouched(isTouched));
        }
    }
    /**
     * Sets the touched meta state on multiple fields
     */
    function setTouched(fields) {
        keysOf(fields).forEach(field => {
            setFieldTouched(field, !!fields[field]);
        });
    }
    function resetField(field, state) {
        const fieldInstance = fieldsByPath.value[field];
        if (fieldInstance) {
            applyFieldMutation(fieldInstance, f => f.resetField(state));
        }
    }
    /**
     * Resets all fields
     */
    function resetForm(state) {
        RESET_LOCK = true;
        // Reset all field states first
        mutateAllFields(f => f.resetField());
        // reset values
        const newValues = (state === null || state === void 0 ? void 0 : state.values) ? state.values : originalInitialValues.value;
        setInitialValues(newValues);
        setValues(newValues);
        if (state === null || state === void 0 ? void 0 : state.touched) {
            setTouched(state.touched);
        }
        setErrors((state === null || state === void 0 ? void 0 : state.errors) || {});
        submitCount.value = (state === null || state === void 0 ? void 0 : state.submitCount) || 0;
        nextTick(() => {
            RESET_LOCK = false;
        });
    }
    function insertFieldAtPath(field, path) {
        const rawField = markRaw(field);
        const fieldPath = path;
        // first field at that path
        if (!fieldsByPath.value[fieldPath]) {
            fieldsByPath.value[fieldPath] = rawField;
            return;
        }
        const fieldAtPath = fieldsByPath.value[fieldPath];
        if (fieldAtPath && !Array.isArray(fieldAtPath)) {
            fieldsByPath.value[fieldPath] = [fieldAtPath];
        }
        // add the new array to that path
        fieldsByPath.value[fieldPath] = [...fieldsByPath.value[fieldPath], rawField];
    }
    function removeFieldFromPath(field, path) {
        const fieldPath = path;
        const fieldAtPath = fieldsByPath.value[fieldPath];
        if (!fieldAtPath) {
            return;
        }
        // same field at path
        if (!isFieldGroup(fieldAtPath) && field.id === fieldAtPath.id) {
            delete fieldsByPath.value[fieldPath];
            return;
        }
        if (isFieldGroup(fieldAtPath)) {
            const idx = fieldAtPath.findIndex(f => f.id === field.id);
            if (idx === -1) {
                return;
            }
            fieldAtPath.splice(idx, 1);
            if (!fieldAtPath.length) {
                delete fieldsByPath.value[fieldPath];
            }
        }
    }
    function registerField(field) {
        const fieldPath = unref(field.name);
        insertFieldAtPath(field, fieldPath);
        if (isRef(field.name)) {
            // ensures when a field's name was already taken that it preserves its same value
            // necessary for fields generated by loops
            watch(field.name, async (newPath, oldPath) => {
                // cache the value
                await nextTick();
                removeFieldFromPath(field, oldPath);
                insertFieldAtPath(field, newPath);
                // re-validate if either path had errors before
                if (errors.value[oldPath] || errors.value[newPath]) {
                    // clear up both paths errors
                    setFieldError(oldPath, undefined);
                    validateField(newPath);
                }
                // clean up the old path if no other field is sharing that name
                // #3325
                await nextTick();
                if (!fieldExists(oldPath)) {
                    unsetPath(formValues, oldPath);
                }
            });
        }
        // if field already had errors (initial errors) that's not user-set, validate it again to ensure state is correct
        // the difference being that `initialErrors` will contain the error message while other errors (pre-validated schema) won't have them as initial errors
        // #3342
        const initialErrorMessage = unref(field.errorMessage);
        if (initialErrorMessage && (initialErrors === null || initialErrors === void 0 ? void 0 : initialErrors[fieldPath]) !== initialErrorMessage) {
            validateField(fieldPath);
        }
        // marks the initial error as "consumed" so it won't be matched later with same non-initial error
        delete initialErrors[fieldPath];
    }
    function unregisterField(field) {
        const fieldName = unref(field.name);
        const fieldInstance = fieldsByPath.value[fieldName];
        const isGroup = !!fieldInstance && isFieldGroup(fieldInstance);
        removeFieldFromPath(field, fieldName);
        // clears a field error on unmounted
        // we wait till next tick to make sure if the field is completely removed and doesn't have any siblings like checkboxes
        nextTick(() => {
            var _a;
            const shouldKeepValue = (_a = unref(field.keepValueOnUnmount)) !== null && _a !== void 0 ? _a : unref(keepValuesOnUnmount);
            const currentGroupValue = getFromPath(formValues, fieldName);
            // The boolean here is we check if the field still belongs to the same control group with that name
            // if another group claimed the name, we should avoid handling it since it is no longer the same group
            // this happens with `v-for` over some checkboxes and field arrays.
            // also if the group no longer exist we can assume this group was the last one that controlled it
            const isSameGroup = isGroup && (fieldInstance === fieldsByPath.value[fieldName] || !fieldsByPath.value[fieldName]);
            // group field that still has a dangling value, the field may exist or not after it was removed.
            // This used to be handled in the useField composable but the form has better context on when it should/not happen.
            // if it does belong to it that means the group still exists
            // #3844
            if (isSameGroup && !shouldKeepValue) {
                if (Array.isArray(currentGroupValue)) {
                    const valueIdx = currentGroupValue.findIndex(i => isEqual(i, unref(field.checkedValue)));
                    if (valueIdx > -1) {
                        const newVal = [...currentGroupValue];
                        newVal.splice(valueIdx, 1);
                        setFieldValue(fieldName, newVal, { force: true });
                    }
                }
                else if (currentGroupValue === unref(field.checkedValue)) {
                    // Remove field if it is a group but does not have an array value, like for radio inputs #3963
                    unsetPath(formValues, fieldName);
                }
            }
            // Field was removed entirely, we should unset its path
            // #3384
            if (!fieldExists(fieldName)) {
                setFieldError(fieldName, undefined);
                // Checks if the field was configured to be unset during unmount or not
                // Checks both the form-level config and field-level one
                // Field has the priority if it is set, otherwise it goes to the form settings
                if (shouldKeepValue) {
                    return;
                }
                // Don't apply emptyContainer check unless the current group value is an array
                if (isGroup && Array.isArray(currentGroupValue) && !isEmptyContainer(currentGroupValue)) {
                    return;
                }
                unsetPath(formValues, fieldName);
            }
        });
    }
    async function validate(opts) {
        const mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || 'force';
        if (mode === 'force') {
            mutateAllFields(f => (f.meta.validated = true));
        }
        if (formCtx.validateSchema) {
            return formCtx.validateSchema(mode);
        }
        // No schema, each field is responsible to validate itself
        const validations = await Promise.all(Object.values(fieldsByPath.value).map(field => {
            const fieldInstance = Array.isArray(field) ? field[0] : field;
            if (!fieldInstance) {
                return Promise.resolve({ key: '', valid: true, errors: [] });
            }
            return fieldInstance.validate(opts).then((result) => {
                return {
                    key: unref(fieldInstance.name),
                    valid: result.valid,
                    errors: result.errors,
                };
            });
        }));
        const results = {};
        const errors = {};
        for (const validation of validations) {
            results[validation.key] = {
                valid: validation.valid,
                errors: validation.errors,
            };
            if (validation.errors.length) {
                errors[validation.key] = validation.errors[0];
            }
        }
        return {
            valid: validations.every(r => r.valid),
            results,
            errors,
        };
    }
    async function validateField(field) {
        const fieldInstance = fieldsByPath.value[field];
        if (!fieldInstance) {
            return Promise.resolve({ errors: [], valid: true });
        }
        if (Array.isArray(fieldInstance)) {
            return fieldInstance.map(f => f.validate())[0];
        }
        return fieldInstance.validate();
    }
    function unsetInitialValue(path) {
        unsetPath(initialValues.value, path);
    }
    /**
     * Sneaky function to set initial field values
     */
    function stageInitialValue(path, value, updateOriginal = false) {
        setInPath(formValues, path, value);
        setFieldInitialValue(path, value);
        if (updateOriginal && !(opts === null || opts === void 0 ? void 0 : opts.initialValues)) {
            setInPath(originalInitialValues.value, path, klona(value));
        }
    }
    function setFieldInitialValue(path, value) {
        setInPath(initialValues.value, path, klona(value));
    }
    async function _validateSchema() {
        const schemaValue = unref(schema);
        if (!schemaValue) {
            return { valid: true, results: {}, errors: {} };
        }
        const formResult = isYupValidator(schemaValue) || isTypedSchema(schemaValue)
            ? await validateTypedSchema(schemaValue, formValues)
            : await validateObjectSchema(schemaValue, formValues, {
                names: fieldNames.value,
                bailsMap: fieldBailsMap.value,
            });
        return formResult;
    }
    const submitForm = handleSubmit((_, { evt }) => {
        if (isFormSubmitEvent(evt)) {
            evt.target.submit();
        }
    });
    // Trigger initial validation
    onMounted(() => {
        if (opts === null || opts === void 0 ? void 0 : opts.initialErrors) {
            setErrors(opts.initialErrors);
        }
        if (opts === null || opts === void 0 ? void 0 : opts.initialTouched) {
            setTouched(opts.initialTouched);
        }
        // if validate on mount was enabled
        if (opts === null || opts === void 0 ? void 0 : opts.validateOnMount) {
            validate();
            return;
        }
        // otherwise run initial silent validation through schema if available
        // the useField should skip their own silent validation if a yup schema is present
        if (formCtx.validateSchema) {
            formCtx.validateSchema('silent');
        }
    });
    if (isRef(schema)) {
        watch(schema, () => {
            var _a;
            (_a = formCtx.validateSchema) === null || _a === void 0 ? void 0 : _a.call(formCtx, 'validated-only');
        });
    }
    // Provide injections
    provide(FormContextKey, formCtx);
    return Object.assign(Object.assign({}, formCtx), { handleReset: () => resetForm(), submitForm });
}
/**
 * Manages form meta aggregation
 */
function useFormMeta(fieldsByPath, currentValues, initialValues, errors) {
    const MERGE_STRATEGIES = {
        touched: 'some',
        pending: 'some',
        valid: 'every',
    };
    const isDirty = computed(() => {
        return !isEqual(currentValues, unref(initialValues));
    });
    function calculateFlags() {
        const fields = Object.values(fieldsByPath.value).flat(1).filter(Boolean);
        return keysOf(MERGE_STRATEGIES).reduce((acc, flag) => {
            const mergeMethod = MERGE_STRATEGIES[flag];
            acc[flag] = fields[mergeMethod](field => field.meta[flag]);
            return acc;
        }, {});
    }
    const flags = reactive(calculateFlags());
    watchEffect(() => {
        const value = calculateFlags();
        flags.touched = value.touched;
        flags.valid = value.valid;
        flags.pending = value.pending;
    });
    return computed(() => {
        return Object.assign(Object.assign({ initialValues: unref(initialValues) }, flags), { valid: flags.valid && !keysOf(errors.value).length, dirty: isDirty.value });
    });
}
/**
 * Manages the initial values prop
 */
function useFormInitialValues(fields, formValues, opts) {
    const values = resolveInitialValues(opts);
    const providedValues = opts === null || opts === void 0 ? void 0 : opts.initialValues;
    // these are the mutable initial values as the fields are mounted/unmounted
    const initialValues = ref(values);
    // these are the original initial value as provided by the user initially, they don't keep track of conditional fields
    // this is important because some conditional fields will overwrite the initial values for other fields who had the same name
    // like array fields, any push/insert operation will overwrite the initial values because they "create new fields"
    // so these are the values that the reset function should use
    // these only change when the user explicitly changes the initial values or when the user resets them with new values.
    const originalInitialValues = ref(klona(values));
    function setInitialValues(values, updateFields = false) {
        initialValues.value = klona(values);
        originalInitialValues.value = klona(values);
        if (!updateFields) {
            return;
        }
        // update the pristine non-touched fields
        // those are excluded because it's unlikely you want to change the form values using initial values
        // we mostly watch them for API population or newly inserted fields
        // if the user API is taking too much time before user interaction they should consider disabling or hiding their inputs until the values are ready
        keysOf(fields.value).forEach(fieldPath => {
            const field = fields.value[fieldPath];
            const wasTouched = Array.isArray(field) ? field.some(f => f.meta.touched) : field === null || field === void 0 ? void 0 : field.meta.touched;
            if (!field || wasTouched) {
                return;
            }
            const newValue = getFromPath(initialValues.value, fieldPath);
            setInPath(formValues, fieldPath, klona(newValue));
        });
    }
    if (isRef(providedValues)) {
        watch(providedValues, value => {
            setInitialValues(value, true);
        }, {
            deep: true,
        });
    }
    return {
        initialValues,
        originalInitialValues,
        setInitialValues,
    };
}
function useErrorBag(initialErrors) {
    const errorBag = ref({});
    function normalizeErrorItem(message) {
        return Array.isArray(message) ? message : message ? [message] : [];
    }
    /**
     * Manually sets an error message on a specific field
     */
    function setFieldErrorBag(field, message) {
        if (!message) {
            delete errorBag.value[field];
            return;
        }
        errorBag.value[field] = normalizeErrorItem(message);
    }
    /**
     * Sets errors for the fields specified in the object
     */
    function setErrorBag(fields) {
        errorBag.value = keysOf(fields).reduce((acc, key) => {
            const message = fields[key];
            if (message) {
                acc[key] = normalizeErrorItem(message);
            }
            return acc;
        }, {});
    }
    if (initialErrors) {
        setErrorBag(initialErrors);
    }
    return {
        errorBag,
        setErrorBag,
        setFieldErrorBag,
    };
}

const FormImpl = defineComponent({
    name: 'Form',
    inheritAttrs: false,
    props: {
        as: {
            type: String,
            default: 'form',
        },
        validationSchema: {
            type: Object,
            default: undefined,
        },
        initialValues: {
            type: Object,
            default: undefined,
        },
        initialErrors: {
            type: Object,
            default: undefined,
        },
        initialTouched: {
            type: Object,
            default: undefined,
        },
        validateOnMount: {
            type: Boolean,
            default: false,
        },
        onSubmit: {
            type: Function,
            default: undefined,
        },
        onInvalidSubmit: {
            type: Function,
            default: undefined,
        },
        keepValues: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, ctx) {
        const initialValues = toRef(props, 'initialValues');
        const validationSchema = toRef(props, 'validationSchema');
        const keepValues = toRef(props, 'keepValues');
        const { errors, errorBag, values, meta, isSubmitting, submitCount, controlledValues, validate, validateField, handleReset, resetForm, handleSubmit, setErrors, setFieldError, setFieldValue, setValues, setFieldTouched, setTouched, resetField, } = useForm({
            validationSchema: validationSchema.value ? validationSchema : undefined,
            initialValues,
            initialErrors: props.initialErrors,
            initialTouched: props.initialTouched,
            validateOnMount: props.validateOnMount,
            keepValuesOnUnmount: keepValues,
        });
        const submitForm = handleSubmit((_, { evt }) => {
            if (isFormSubmitEvent(evt)) {
                evt.target.submit();
            }
        }, props.onInvalidSubmit);
        const onSubmit = props.onSubmit ? handleSubmit(props.onSubmit, props.onInvalidSubmit) : submitForm;
        function handleFormReset(e) {
            if (isEvent(e)) {
                // Prevent default form reset behavior
                e.preventDefault();
            }
            handleReset();
            if (typeof ctx.attrs.onReset === 'function') {
                ctx.attrs.onReset();
            }
        }
        function handleScopedSlotSubmit(evt, onSubmit) {
            const onSuccess = typeof evt === 'function' && !onSubmit ? evt : onSubmit;
            return handleSubmit(onSuccess, props.onInvalidSubmit)(evt);
        }
        function getValues() {
            return klona(values);
        }
        function getMeta() {
            return klona(meta.value);
        }
        function getErrors() {
            return klona(errors.value);
        }
        function slotProps() {
            return {
                meta: meta.value,
                errors: errors.value,
                errorBag: errorBag.value,
                values,
                isSubmitting: isSubmitting.value,
                submitCount: submitCount.value,
                controlledValues: controlledValues.value,
                validate,
                validateField,
                handleSubmit: handleScopedSlotSubmit,
                handleReset,
                submitForm,
                setErrors,
                setFieldError,
                setFieldValue,
                setValues,
                setFieldTouched,
                setTouched,
                resetForm,
                resetField,
                getValues,
                getMeta,
                getErrors,
            };
        }
        // expose these functions and methods as part of public API
        ctx.expose({
            setFieldError,
            setErrors,
            setFieldValue,
            setValues,
            setFieldTouched,
            setTouched,
            resetForm,
            validate,
            validateField,
            resetField,
            getValues,
            getMeta,
            getErrors,
        });
        return function renderForm() {
            // avoid resolving the form component as itself
            const tag = props.as === 'form' ? props.as : resolveDynamicComponent(props.as);
            const children = normalizeChildren(tag, ctx, slotProps);
            if (!props.as) {
                return children;
            }
            // Attributes to add on a native `form` tag
            const formAttrs = props.as === 'form'
                ? {
                    // Disables native validation as vee-validate will handle it.
                    novalidate: true,
                }
                : {};
            return h(tag, Object.assign(Object.assign(Object.assign({}, formAttrs), ctx.attrs), { onSubmit, onReset: handleFormReset }), children);
        };
    },
});
const Form = FormImpl;

function useFieldArray(arrayPath) {
    const form = injectWithSelf(FormContextKey, undefined);
    const fields = ref([]);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const noOp = () => { };
    const noOpApi = {
        fields,
        remove: noOp,
        push: noOp,
        swap: noOp,
        insert: noOp,
        update: noOp,
        replace: noOp,
        prepend: noOp,
        move: noOp,
    };
    if (!form) {
        return noOpApi;
    }
    if (!unref(arrayPath)) {
        return noOpApi;
    }
    const alreadyExists = form.fieldArrays.find(a => unref(a.path) === unref(arrayPath));
    if (alreadyExists) {
        return alreadyExists;
    }
    let entryCounter = 0;
    function getCurrentValues() {
        return getFromPath(form === null || form === void 0 ? void 0 : form.values, unref(arrayPath), []) || [];
    }
    function initFields() {
        const currentValues = getCurrentValues();
        fields.value = currentValues.map(createEntry);
        updateEntryFlags();
    }
    initFields();
    function updateEntryFlags() {
        const fieldsLength = fields.value.length;
        for (let i = 0; i < fieldsLength; i++) {
            const entry = fields.value[i];
            entry.isFirst = i === 0;
            entry.isLast = i === fieldsLength - 1;
        }
    }
    function createEntry(value) {
        const key = entryCounter++;
        const entry = {
            key,
            value: computedDeep({
                get() {
                    const currentValues = getFromPath(form === null || form === void 0 ? void 0 : form.values, unref(arrayPath), []) || [];
                    const idx = fields.value.findIndex(e => e.key === key);
                    return idx === -1 ? value : currentValues[idx];
                },
                set(value) {
                    const idx = fields.value.findIndex(e => e.key === key);
                    if (idx === -1) {
                        return;
                    }
                    update(idx, value);
                },
            }),
            isFirst: false,
            isLast: false,
        };
        return entry;
    }
    function afterMutation() {
        updateEntryFlags();
        // Should trigger a silent validation since a field may not do that #4096
        form === null || form === void 0 ? void 0 : form.validate({ mode: 'silent' });
    }
    function remove(idx) {
        const pathName = unref(arrayPath);
        const pathValue = getFromPath(form === null || form === void 0 ? void 0 : form.values, pathName);
        if (!pathValue || !Array.isArray(pathValue)) {
            return;
        }
        const newValue = [...pathValue];
        newValue.splice(idx, 1);
        form === null || form === void 0 ? void 0 : form.unsetInitialValue(pathName + `[${idx}]`);
        form === null || form === void 0 ? void 0 : form.setFieldValue(pathName, newValue);
        fields.value.splice(idx, 1);
        afterMutation();
    }
    function push(value) {
        const pathName = unref(arrayPath);
        const pathValue = getFromPath(form === null || form === void 0 ? void 0 : form.values, pathName);
        const normalizedPathValue = isNullOrUndefined(pathValue) ? [] : pathValue;
        if (!Array.isArray(normalizedPathValue)) {
            return;
        }
        const newValue = [...normalizedPathValue];
        newValue.push(value);
        form === null || form === void 0 ? void 0 : form.stageInitialValue(pathName + `[${newValue.length - 1}]`, value);
        form === null || form === void 0 ? void 0 : form.setFieldValue(pathName, newValue);
        fields.value.push(createEntry(value));
        afterMutation();
    }
    function swap(indexA, indexB) {
        const pathName = unref(arrayPath);
        const pathValue = getFromPath(form === null || form === void 0 ? void 0 : form.values, pathName);
        if (!Array.isArray(pathValue) || !(indexA in pathValue) || !(indexB in pathValue)) {
            return;
        }
        const newValue = [...pathValue];
        const newFields = [...fields.value];
        // the old switcheroo
        const temp = newValue[indexA];
        newValue[indexA] = newValue[indexB];
        newValue[indexB] = temp;
        const tempEntry = newFields[indexA];
        newFields[indexA] = newFields[indexB];
        newFields[indexB] = tempEntry;
        form === null || form === void 0 ? void 0 : form.setFieldValue(pathName, newValue);
        fields.value = newFields;
        updateEntryFlags();
    }
    function insert(idx, value) {
        const pathName = unref(arrayPath);
        const pathValue = getFromPath(form === null || form === void 0 ? void 0 : form.values, pathName);
        if (!Array.isArray(pathValue) || pathValue.length < idx) {
            return;
        }
        const newValue = [...pathValue];
        const newFields = [...fields.value];
        newValue.splice(idx, 0, value);
        newFields.splice(idx, 0, createEntry(value));
        form === null || form === void 0 ? void 0 : form.setFieldValue(pathName, newValue);
        fields.value = newFields;
        afterMutation();
    }
    function replace(arr) {
        const pathName = unref(arrayPath);
        form === null || form === void 0 ? void 0 : form.setFieldValue(pathName, arr);
        initFields();
        afterMutation();
    }
    function update(idx, value) {
        const pathName = unref(arrayPath);
        const pathValue = getFromPath(form === null || form === void 0 ? void 0 : form.values, pathName);
        if (!Array.isArray(pathValue) || pathValue.length - 1 < idx) {
            return;
        }
        form === null || form === void 0 ? void 0 : form.setFieldValue(`${pathName}[${idx}]`, value);
        form === null || form === void 0 ? void 0 : form.validate({ mode: 'validated-only' });
    }
    function prepend(value) {
        const pathName = unref(arrayPath);
        const pathValue = getFromPath(form === null || form === void 0 ? void 0 : form.values, pathName);
        const normalizedPathValue = isNullOrUndefined(pathValue) ? [] : pathValue;
        if (!Array.isArray(normalizedPathValue)) {
            return;
        }
        const newValue = [value, ...normalizedPathValue];
        form === null || form === void 0 ? void 0 : form.stageInitialValue(pathName + `[${newValue.length - 1}]`, value);
        form === null || form === void 0 ? void 0 : form.setFieldValue(pathName, newValue);
        fields.value.unshift(createEntry(value));
        afterMutation();
    }
    function move(oldIdx, newIdx) {
        const pathName = unref(arrayPath);
        const pathValue = getFromPath(form === null || form === void 0 ? void 0 : form.values, pathName);
        const newValue = isNullOrUndefined(pathValue) ? [] : [...pathValue];
        if (!Array.isArray(pathValue) || !(oldIdx in pathValue) || !(newIdx in pathValue)) {
            return;
        }
        const newFields = [...fields.value];
        const movedItem = newFields[oldIdx];
        newFields.splice(oldIdx, 1);
        newFields.splice(newIdx, 0, movedItem);
        const movedValue = newValue[oldIdx];
        newValue.splice(oldIdx, 1);
        newValue.splice(newIdx, 0, movedValue);
        form === null || form === void 0 ? void 0 : form.setFieldValue(pathName, newValue);
        fields.value = newFields;
        afterMutation();
    }
    const fieldArrayCtx = {
        fields,
        remove,
        push,
        swap,
        insert,
        update,
        replace,
        prepend,
        move,
    };
    form.fieldArrays.push(Object.assign({ path: arrayPath, reset: initFields }, fieldArrayCtx));
    onBeforeUnmount(() => {
        const idx = form.fieldArrays.findIndex(i => unref(i.path) === unref(arrayPath));
        if (idx >= 0) {
            form.fieldArrays.splice(idx, 1);
        }
    });
    // Makes sure to sync the form values with the array value if they go out of sync
    // #4153
    watch(getCurrentValues, formValues => {
        const fieldsValues = fields.value.map(f => f.value);
        // If form values are not the same as the current values then something overrode them.
        if (!isEqual(formValues, fieldsValues)) {
            initFields();
        }
    });
    return fieldArrayCtx;
}

defineComponent({
    name: 'FieldArray',
    inheritAttrs: false,
    props: {
        name: {
            type: String,
            required: true,
        },
    },
    setup(props, ctx) {
        const { push, remove, swap, insert, replace, update, prepend, move, fields } = useFieldArray(toRef(props, 'name'));
        function slotProps() {
            return {
                fields: fields.value,
                push,
                remove,
                swap,
                insert,
                update,
                replace,
                prepend,
                move,
            };
        }
        ctx.expose({
            push,
            remove,
            swap,
            insert,
            update,
            replace,
            prepend,
            move,
        });
        return () => {
            const children = normalizeChildren(undefined, ctx, slotProps);
            return children;
        };
    },
});

const ErrorMessageImpl = defineComponent({
    name: 'ErrorMessage',
    props: {
        as: {
            type: String,
            default: undefined,
        },
        name: {
            type: String,
            required: true,
        },
    },
    setup(props, ctx) {
        const form = inject(FormContextKey, undefined);
        const message = computed(() => {
            return form === null || form === void 0 ? void 0 : form.errors.value[props.name];
        });
        function slotProps() {
            return {
                message: message.value,
            };
        }
        return () => {
            // Renders nothing if there are no messages
            if (!message.value) {
                return undefined;
            }
            const tag = (props.as ? resolveDynamicComponent(props.as) : props.as);
            const children = normalizeChildren(tag, ctx, slotProps);
            const attrs = Object.assign({ role: 'alert' }, ctx.attrs);
            // If no tag was specified and there are children
            // render the slot as is without wrapping it
            if (!tag && (Array.isArray(children) || !children) && (children === null || children === void 0 ? void 0 : children.length)) {
                return children;
            }
            // If no children in slot
            // render whatever specified and fallback to a <span> with the message in it's contents
            if ((Array.isArray(children) || !children) && !(children === null || children === void 0 ? void 0 : children.length)) {
                return h(tag || 'span', attrs, message.value);
            }
            return h(tag, attrs, children);
        };
    },
});
const ErrorMessage = ErrorMessageImpl;

/**
 * Based on Kendo UI Core expression code <https://github.com/telerik/kendo-ui-core#license-information>
 */

function Cache(maxSize) {
  this._maxSize = maxSize;
  this.clear();
}
Cache.prototype.clear = function () {
  this._size = 0;
  this._values = Object.create(null);
};
Cache.prototype.get = function (key) {
  return this._values[key]
};
Cache.prototype.set = function (key, value) {
  this._size >= this._maxSize && this.clear();
  if (!(key in this._values)) this._size++;

  return (this._values[key] = value)
};

var SPLIT_REGEX = /[^.^\]^[]+|(?=\[\]|\.\.)/g,
  DIGIT_REGEX = /^\d+$/,
  LEAD_DIGIT_REGEX = /^\d/,
  SPEC_CHAR_REGEX = /[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g,
  CLEAN_QUOTES_REGEX = /^\s*(['"]?)(.*?)(\1)\s*$/,
  MAX_CACHE_SIZE = 512;

var pathCache = new Cache(MAX_CACHE_SIZE),
  setCache = new Cache(MAX_CACHE_SIZE),
  getCache = new Cache(MAX_CACHE_SIZE);

var propertyExpr = {
  Cache: Cache,

  split: split,

  normalizePath: normalizePath,

  setter: function (path) {
    var parts = normalizePath(path);

    return (
      setCache.get(path) ||
      setCache.set(path, function setter(obj, value) {
        var index = 0;
        var len = parts.length;
        var data = obj;

        while (index < len - 1) {
          var part = parts[index];
          if (
            part === '__proto__' ||
            part === 'constructor' ||
            part === 'prototype'
          ) {
            return obj
          }

          data = data[parts[index++]];
        }
        data[parts[index]] = value;
      })
    )
  },

  getter: function (path, safe) {
    var parts = normalizePath(path);
    return (
      getCache.get(path) ||
      getCache.set(path, function getter(data) {
        var index = 0,
          len = parts.length;
        while (index < len) {
          if (data != null || !safe) data = data[parts[index++]];
          else return
        }
        return data
      })
    )
  },

  join: function (segments) {
    return segments.reduce(function (path, part) {
      return (
        path +
        (isQuoted(part) || DIGIT_REGEX.test(part)
          ? '[' + part + ']'
          : (path ? '.' : '') + part)
      )
    }, '')
  },

  forEach: function (path, cb, thisArg) {
    forEach(Array.isArray(path) ? path : split(path), cb, thisArg);
  },
};

function normalizePath(path) {
  return (
    pathCache.get(path) ||
    pathCache.set(
      path,
      split(path).map(function (part) {
        return part.replace(CLEAN_QUOTES_REGEX, '$2')
      })
    )
  )
}

function split(path) {
  return path.match(SPLIT_REGEX) || ['']
}

function forEach(parts, iter, thisArg) {
  var len = parts.length,
    part,
    idx,
    isArray,
    isBracket;

  for (idx = 0; idx < len; idx++) {
    part = parts[idx];

    if (part) {
      if (shouldBeQuoted(part)) {
        part = '"' + part + '"';
      }

      isBracket = isQuoted(part);
      isArray = !isBracket && /^\d+$/.test(part);

      iter.call(thisArg, part, isBracket, isArray, idx, parts);
    }
  }
}

function isQuoted(str) {
  return (
    typeof str === 'string' && str && ["'", '"'].indexOf(str.charAt(0)) !== -1
  )
}

function hasLeadingNumber(part) {
  return part.match(LEAD_DIGIT_REGEX) && !part.match(DIGIT_REGEX)
}

function hasSpecialChars(part) {
  return SPEC_CHAR_REGEX.test(part)
}

function shouldBeQuoted(part) {
  return !isQuoted(part) && (hasLeadingNumber(part) || hasSpecialChars(part))
}

var toposortExports = {};
var toposort$1 = {
  get exports(){ return toposortExports; },
  set exports(v){ toposortExports = v; },
};

/**
 * Topological sorting function
 *
 * @param {Array} edges
 * @returns {Array}
 */

toposort$1.exports = function(edges) {
  return toposort(uniqueNodes(edges), edges)
};

toposortExports.array = toposort;

function toposort(nodes, edges) {
  var cursor = nodes.length
    , sorted = new Array(cursor)
    , visited = {}
    , i = cursor
    // Better data structures make algorithm much faster.
    , outgoingEdges = makeOutgoingEdges(edges)
    , nodesHash = makeNodesHash(nodes);

  // check for unknown nodes
  edges.forEach(function(edge) {
    if (!nodesHash.has(edge[0]) || !nodesHash.has(edge[1])) {
      throw new Error('Unknown node. There is an unknown node in the supplied edges.')
    }
  });

  while (i--) {
    if (!visited[i]) visit(nodes[i], i, new Set());
  }

  return sorted

  function visit(node, i, predecessors) {
    if(predecessors.has(node)) {
      var nodeRep;
      try {
        nodeRep = ", node was:" + JSON.stringify(node);
      } catch(e) {
        nodeRep = "";
      }
      throw new Error('Cyclic dependency' + nodeRep)
    }

    if (!nodesHash.has(node)) {
      throw new Error('Found unknown node. Make sure to provided all involved nodes. Unknown node: '+JSON.stringify(node))
    }

    if (visited[i]) return;
    visited[i] = true;

    var outgoing = outgoingEdges.get(node) || new Set();
    outgoing = Array.from(outgoing);

    if (i = outgoing.length) {
      predecessors.add(node);
      do {
        var child = outgoing[--i];
        visit(child, nodesHash.get(child), predecessors);
      } while (i)
      predecessors.delete(node);
    }

    sorted[--cursor] = node;
  }
}

function uniqueNodes(arr){
  var res = new Set();
  for (var i = 0, len = arr.length; i < len; i++) {
    var edge = arr[i];
    res.add(edge[0]);
    res.add(edge[1]);
  }
  return Array.from(res)
}

function makeOutgoingEdges(arr){
  var edges = new Map();
  for (var i = 0, len = arr.length; i < len; i++) {
    var edge = arr[i];
    if (!edges.has(edge[0])) edges.set(edge[0], new Set());
    if (!edges.has(edge[1])) edges.set(edge[1], new Set());
    edges.get(edge[0]).add(edge[1]);
  }
  return edges
}

function makeNodesHash(arr){
  var res = new Map();
  for (var i = 0, len = arr.length; i < len; i++) {
    res.set(arr[i], i);
  }
  return res
}

const toString = Object.prototype.toString;
const errorToString = Error.prototype.toString;
const regExpToString = RegExp.prototype.toString;
const symbolToString = typeof Symbol !== 'undefined' ? Symbol.prototype.toString : () => '';
const SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/;
function printNumber(val) {
  if (val != +val) return 'NaN';
  const isNegativeZero = val === 0 && 1 / val < 0;
  return isNegativeZero ? '-0' : '' + val;
}
function printSimpleValue(val, quoteStrings = false) {
  if (val == null || val === true || val === false) return '' + val;
  const typeOf = typeof val;
  if (typeOf === 'number') return printNumber(val);
  if (typeOf === 'string') return quoteStrings ? `"${val}"` : val;
  if (typeOf === 'function') return '[Function ' + (val.name || 'anonymous') + ']';
  if (typeOf === 'symbol') return symbolToString.call(val).replace(SYMBOL_REGEXP, 'Symbol($1)');
  const tag = toString.call(val).slice(8, -1);
  if (tag === 'Date') return isNaN(val.getTime()) ? '' + val : val.toISOString(val);
  if (tag === 'Error' || val instanceof Error) return '[' + errorToString.call(val) + ']';
  if (tag === 'RegExp') return regExpToString.call(val);
  return null;
}
function printValue(value, quoteStrings) {
  let result = printSimpleValue(value, quoteStrings);
  if (result !== null) return result;
  return JSON.stringify(value, function (key, value) {
    let result = printSimpleValue(this[key], quoteStrings);
    if (result !== null) return result;
    return value;
  }, 2);
}

function toArray(value) {
  return value == null ? [] : [].concat(value);
}

let strReg = /\$\{\s*(\w+)\s*\}/g;
class ValidationError extends Error {
  static formatError(message, params) {
    const path = params.label || params.path || 'this';
    if (path !== params.path) params = Object.assign({}, params, {
      path
    });
    if (typeof message === 'string') return message.replace(strReg, (_, key) => printValue(params[key]));
    if (typeof message === 'function') return message(params);
    return message;
  }
  static isError(err) {
    return err && err.name === 'ValidationError';
  }
  constructor(errorOrErrors, value, field, type) {
    super();
    this.value = void 0;
    this.path = void 0;
    this.type = void 0;
    this.errors = void 0;
    this.params = void 0;
    this.inner = void 0;
    this.name = 'ValidationError';
    this.value = value;
    this.path = field;
    this.type = type;
    this.errors = [];
    this.inner = [];
    toArray(errorOrErrors).forEach(err => {
      if (ValidationError.isError(err)) {
        this.errors.push(...err.errors);
        this.inner = this.inner.concat(err.inner.length ? err.inner : err);
      } else {
        this.errors.push(err);
      }
    });
    this.message = this.errors.length > 1 ? `${this.errors.length} errors occurred` : this.errors[0];
    if (Error.captureStackTrace) Error.captureStackTrace(this, ValidationError);
  }
}

let mixed = {
  default: '${path} is invalid',
  required: '${path} is a required field',
  defined: '${path} must be defined',
  notNull: '${path} cannot be null',
  oneOf: '${path} must be one of the following values: ${values}',
  notOneOf: '${path} must not be one of the following values: ${values}',
  notType: ({
    path,
    type,
    value,
    originalValue
  }) => {
    const castMsg = originalValue != null && originalValue !== value ? ` (cast from the value \`${printValue(originalValue, true)}\`).` : '.';
    return type !== 'mixed' ? `${path} must be a \`${type}\` type, ` + `but the final value was: \`${printValue(value, true)}\`` + castMsg : `${path} must match the configured type. ` + `The validated value was: \`${printValue(value, true)}\`` + castMsg;
  }
};
let string = {
  length: '${path} must be exactly ${length} characters',
  min: '${path} must be at least ${min} characters',
  max: '${path} must be at most ${max} characters',
  matches: '${path} must match the following: "${regex}"',
  email: '${path} must be a valid email',
  url: '${path} must be a valid URL',
  uuid: '${path} must be a valid UUID',
  trim: '${path} must be a trimmed string',
  lowercase: '${path} must be a lowercase string',
  uppercase: '${path} must be a upper case string'
};
let number = {
  min: '${path} must be greater than or equal to ${min}',
  max: '${path} must be less than or equal to ${max}',
  lessThan: '${path} must be less than ${less}',
  moreThan: '${path} must be greater than ${more}',
  positive: '${path} must be a positive number',
  negative: '${path} must be a negative number',
  integer: '${path} must be an integer'
};
let date = {
  min: '${path} field must be later than ${min}',
  max: '${path} field must be at earlier than ${max}'
};
let boolean = {
  isValue: '${path} field must be ${value}'
};
let object = {
  noUnknown: '${path} field has unspecified keys: ${unknown}'
};
let array = {
  min: '${path} field must have at least ${min} items',
  max: '${path} field must have less than or equal to ${max} items',
  length: '${path} must have ${length} items'
};
var locale = Object.assign(Object.create(null), {
  mixed,
  string,
  number,
  date,
  object,
  array,
  boolean
});

const isSchema = obj => obj && obj.__isYupSchema__;

class Condition {
  static fromOptions(refs, config) {
    if (!config.then && !config.otherwise) throw new TypeError('either `then:` or `otherwise:` is required for `when()` conditions');
    let {
      is,
      then,
      otherwise
    } = config;
    let check = typeof is === 'function' ? is : (...values) => values.every(value => value === is);
    return new Condition(refs, (values, schema) => {
      var _branch;
      let branch = check(...values) ? then : otherwise;
      return (_branch = branch == null ? void 0 : branch(schema)) != null ? _branch : schema;
    });
  }
  constructor(refs, builder) {
    this.fn = void 0;
    this.refs = refs;
    this.refs = refs;
    this.fn = builder;
  }
  resolve(base, options) {
    let values = this.refs.map(ref =>
    // TODO: ? operator here?
    ref.getValue(options == null ? void 0 : options.value, options == null ? void 0 : options.parent, options == null ? void 0 : options.context));
    let schema = this.fn(values, base, options);
    if (schema === undefined ||
    // @ts-ignore this can be base
    schema === base) {
      return base;
    }
    if (!isSchema(schema)) throw new TypeError('conditions must return a schema object');
    return schema.resolve(options);
  }
}

const prefixes = {
  context: '$',
  value: '.'
};
class Reference {
  constructor(key, options = {}) {
    this.key = void 0;
    this.isContext = void 0;
    this.isValue = void 0;
    this.isSibling = void 0;
    this.path = void 0;
    this.getter = void 0;
    this.map = void 0;
    if (typeof key !== 'string') throw new TypeError('ref must be a string, got: ' + key);
    this.key = key.trim();
    if (key === '') throw new TypeError('ref must be a non-empty string');
    this.isContext = this.key[0] === prefixes.context;
    this.isValue = this.key[0] === prefixes.value;
    this.isSibling = !this.isContext && !this.isValue;
    let prefix = this.isContext ? prefixes.context : this.isValue ? prefixes.value : '';
    this.path = this.key.slice(prefix.length);
    this.getter = this.path && propertyExpr.getter(this.path, true);
    this.map = options.map;
  }
  getValue(value, parent, context) {
    let result = this.isContext ? context : this.isValue ? value : parent;
    if (this.getter) result = this.getter(result || {});
    if (this.map) result = this.map(result);
    return result;
  }

  /**
   *
   * @param {*} value
   * @param {Object} options
   * @param {Object=} options.context
   * @param {Object=} options.parent
   */
  cast(value, options) {
    return this.getValue(value, options == null ? void 0 : options.parent, options == null ? void 0 : options.context);
  }
  resolve() {
    return this;
  }
  describe() {
    return {
      type: 'ref',
      key: this.key
    };
  }
  toString() {
    return `Ref(${this.key})`;
  }
  static isRef(value) {
    return value && value.__isYupRef;
  }
}

// @ts-ignore
Reference.prototype.__isYupRef = true;

const isAbsent = value => value == null;

function createValidation(config) {
  function validate({
    value,
    path = '',
    options,
    originalValue,
    schema
  }, panic, next) {
    const {
      name,
      test,
      params,
      message,
      skipAbsent
    } = config;
    let {
      parent,
      context,
      abortEarly = schema.spec.abortEarly
    } = options;
    function resolve(item) {
      return Reference.isRef(item) ? item.getValue(value, parent, context) : item;
    }
    function createError(overrides = {}) {
      const nextParams = Object.assign({
        value,
        originalValue,
        label: schema.spec.label,
        path: overrides.path || path,
        spec: schema.spec
      }, params, overrides.params);
      for (const key of Object.keys(nextParams)) nextParams[key] = resolve(nextParams[key]);
      const error = new ValidationError(ValidationError.formatError(overrides.message || message, nextParams), value, nextParams.path, overrides.type || name);
      error.params = nextParams;
      return error;
    }
    const invalid = abortEarly ? panic : next;
    let ctx = {
      path,
      parent,
      type: name,
      from: options.from,
      createError,
      resolve,
      options,
      originalValue,
      schema
    };
    const handleResult = validOrError => {
      if (ValidationError.isError(validOrError)) invalid(validOrError);else if (!validOrError) invalid(createError());else next(null);
    };
    const handleError = err => {
      if (ValidationError.isError(err)) invalid(err);else panic(err);
    };
    const shouldSkip = skipAbsent && isAbsent(value);
    if (!options.sync) {
      try {
        Promise.resolve(!shouldSkip ? test.call(ctx, value, ctx) : true).then(handleResult, handleError);
      } catch (err) {
        handleError(err);
      }
      return;
    }
    let result;
    try {
      var _result;
      result = !shouldSkip ? test.call(ctx, value, ctx) : true;
      if (typeof ((_result = result) == null ? void 0 : _result.then) === 'function') {
        throw new Error(`Validation test of type: "${ctx.type}" returned a Promise during a synchronous validate. ` + `This test will finish after the validate call has returned`);
      }
    } catch (err) {
      handleError(err);
      return;
    }
    handleResult(result);
  }
  validate.OPTIONS = config;
  return validate;
}

function getIn(schema, path, value, context = value) {
  let parent, lastPart, lastPartDebug;

  // root path: ''
  if (!path) return {
    parent,
    parentPath: path,
    schema
  };
  propertyExpr.forEach(path, (_part, isBracket, isArray) => {
    let part = isBracket ? _part.slice(1, _part.length - 1) : _part;
    schema = schema.resolve({
      context,
      parent,
      value
    });
    let isTuple = schema.type === 'tuple';
    let idx = isArray ? parseInt(part, 10) : 0;
    if (schema.innerType || isTuple) {
      if (isTuple && !isArray) throw new Error(`Yup.reach cannot implicitly index into a tuple type. the path part "${lastPartDebug}" must contain an index to the tuple element, e.g. "${lastPartDebug}[0]"`);
      if (value && idx >= value.length) {
        throw new Error(`Yup.reach cannot resolve an array item at index: ${_part}, in the path: ${path}. ` + `because there is no value at that index. `);
      }
      parent = value;
      value = value && value[idx];
      schema = isTuple ? schema.spec.types[idx] : schema.innerType;
    }

    // sometimes the array index part of a path doesn't exist: "nested.arr.child"
    // in these cases the current part is the next schema and should be processed
    // in this iteration. For cases where the index signature is included this
    // check will fail and we'll handle the `child` part on the next iteration like normal
    if (!isArray) {
      if (!schema.fields || !schema.fields[part]) throw new Error(`The schema does not contain the path: ${path}. ` + `(failed at: ${lastPartDebug} which is a type: "${schema.type}")`);
      parent = value;
      value = value && value[part];
      schema = schema.fields[part];
    }
    lastPart = part;
    lastPartDebug = isBracket ? '[' + _part + ']' : '.' + _part;
  });
  return {
    schema,
    parent,
    parentPath: lastPart
  };
}

class ReferenceSet extends Set {
  describe() {
    const description = [];
    for (const item of this.values()) {
      description.push(Reference.isRef(item) ? item.describe() : item);
    }
    return description;
  }
  resolveAll(resolve) {
    let result = [];
    for (const item of this.values()) {
      result.push(resolve(item));
    }
    return result;
  }
  clone() {
    return new ReferenceSet(this.values());
  }
  merge(newItems, removeItems) {
    const next = this.clone();
    newItems.forEach(value => next.add(value));
    removeItems.forEach(value => next.delete(value));
    return next;
  }
}

// tweaked from https://github.com/Kelin2025/nanoclone/blob/0abeb7635bda9b68ef2277093f76dbe3bf3948e1/src/index.js
function clone(src, seen = new Map()) {
  if (isSchema(src) || !src || typeof src !== 'object') return src;
  if (seen.has(src)) return seen.get(src);
  let copy;
  if (src instanceof Date) {
    // Date
    copy = new Date(src.getTime());
    seen.set(src, copy);
  } else if (src instanceof RegExp) {
    // RegExp
    copy = new RegExp(src);
    seen.set(src, copy);
  } else if (Array.isArray(src)) {
    // Array
    copy = new Array(src.length);
    seen.set(src, copy);
    for (let i = 0; i < src.length; i++) copy[i] = clone(src[i], seen);
  } else if (src instanceof Map) {
    // Map
    copy = new Map();
    seen.set(src, copy);
    for (const [k, v] of src.entries()) copy.set(k, clone(v, seen));
  } else if (src instanceof Set) {
    // Set
    copy = new Set();
    seen.set(src, copy);
    for (const v of src) copy.add(clone(v, seen));
  } else if (src instanceof Object) {
    // Object
    copy = {};
    seen.set(src, copy);
    for (const [k, v] of Object.entries(src)) copy[k] = clone(v, seen);
  } else {
    throw Error(`Unable to clone ${src}`);
  }
  return copy;
}

class Schema {
  constructor(options) {
    this.type = void 0;
    this.deps = [];
    this.tests = void 0;
    this.transforms = void 0;
    this.conditions = [];
    this._mutate = void 0;
    this.internalTests = {};
    this._whitelist = new ReferenceSet();
    this._blacklist = new ReferenceSet();
    this.exclusiveTests = Object.create(null);
    this._typeCheck = void 0;
    this.spec = void 0;
    this.tests = [];
    this.transforms = [];
    this.withMutation(() => {
      this.typeError(mixed.notType);
    });
    this.type = options.type;
    this._typeCheck = options.check;
    this.spec = Object.assign({
      strip: false,
      strict: false,
      abortEarly: true,
      recursive: true,
      nullable: false,
      optional: true,
      coerce: true
    }, options == null ? void 0 : options.spec);
    this.withMutation(s => {
      s.nonNullable();
    });
  }

  // TODO: remove
  get _type() {
    return this.type;
  }
  clone(spec) {
    if (this._mutate) {
      if (spec) Object.assign(this.spec, spec);
      return this;
    }

    // if the nested value is a schema we can skip cloning, since
    // they are already immutable
    const next = Object.create(Object.getPrototypeOf(this));

    // @ts-expect-error this is readonly
    next.type = this.type;
    next._typeCheck = this._typeCheck;
    next._whitelist = this._whitelist.clone();
    next._blacklist = this._blacklist.clone();
    next.internalTests = Object.assign({}, this.internalTests);
    next.exclusiveTests = Object.assign({}, this.exclusiveTests);

    // @ts-expect-error this is readonly
    next.deps = [...this.deps];
    next.conditions = [...this.conditions];
    next.tests = [...this.tests];
    next.transforms = [...this.transforms];
    next.spec = clone(Object.assign({}, this.spec, spec));
    return next;
  }
  label(label) {
    let next = this.clone();
    next.spec.label = label;
    return next;
  }
  meta(...args) {
    if (args.length === 0) return this.spec.meta;
    let next = this.clone();
    next.spec.meta = Object.assign(next.spec.meta || {}, args[0]);
    return next;
  }
  withMutation(fn) {
    let before = this._mutate;
    this._mutate = true;
    let result = fn(this);
    this._mutate = before;
    return result;
  }
  concat(schema) {
    if (!schema || schema === this) return this;
    if (schema.type !== this.type && this.type !== 'mixed') throw new TypeError(`You cannot \`concat()\` schema's of different types: ${this.type} and ${schema.type}`);
    let base = this;
    let combined = schema.clone();
    const mergedSpec = Object.assign({}, base.spec, combined.spec);
    combined.spec = mergedSpec;
    combined.internalTests = Object.assign({}, base.internalTests, combined.internalTests);

    // manually merge the blacklist/whitelist (the other `schema` takes
    // precedence in case of conflicts)
    combined._whitelist = base._whitelist.merge(schema._whitelist, schema._blacklist);
    combined._blacklist = base._blacklist.merge(schema._blacklist, schema._whitelist);

    // start with the current tests
    combined.tests = base.tests;
    combined.exclusiveTests = base.exclusiveTests;

    // manually add the new tests to ensure
    // the deduping logic is consistent
    combined.withMutation(next => {
      schema.tests.forEach(fn => {
        next.test(fn.OPTIONS);
      });
    });
    combined.transforms = [...base.transforms, ...combined.transforms];
    return combined;
  }
  isType(v) {
    if (v == null) {
      if (this.spec.nullable && v === null) return true;
      if (this.spec.optional && v === undefined) return true;
      return false;
    }
    return this._typeCheck(v);
  }
  resolve(options) {
    let schema = this;
    if (schema.conditions.length) {
      let conditions = schema.conditions;
      schema = schema.clone();
      schema.conditions = [];
      schema = conditions.reduce((prevSchema, condition) => condition.resolve(prevSchema, options), schema);
      schema = schema.resolve(options);
    }
    return schema;
  }
  resolveOptions(options) {
    var _options$strict, _options$abortEarly, _options$recursive;
    return Object.assign({}, options, {
      from: options.from || [],
      strict: (_options$strict = options.strict) != null ? _options$strict : this.spec.strict,
      abortEarly: (_options$abortEarly = options.abortEarly) != null ? _options$abortEarly : this.spec.abortEarly,
      recursive: (_options$recursive = options.recursive) != null ? _options$recursive : this.spec.recursive
    });
  }

  /**
   * Run the configured transform pipeline over an input value.
   */

  cast(value, options = {}) {
    let resolvedSchema = this.resolve(Object.assign({
      value
    }, options));
    let allowOptionality = options.assert === 'ignore-optionality';
    let result = resolvedSchema._cast(value, options);
    if (options.assert !== false && !resolvedSchema.isType(result)) {
      if (allowOptionality && isAbsent(result)) {
        return result;
      }
      let formattedValue = printValue(value);
      let formattedResult = printValue(result);
      throw new TypeError(`The value of ${options.path || 'field'} could not be cast to a value ` + `that satisfies the schema type: "${resolvedSchema.type}". \n\n` + `attempted value: ${formattedValue} \n` + (formattedResult !== formattedValue ? `result of cast: ${formattedResult}` : ''));
    }
    return result;
  }
  _cast(rawValue, _options) {
    let value = rawValue === undefined ? rawValue : this.transforms.reduce((prevValue, fn) => fn.call(this, prevValue, rawValue, this), rawValue);
    if (value === undefined) {
      value = this.getDefault();
    }
    return value;
  }
  _validate(_value, options = {}, panic, next) {
    let {
      path,
      originalValue = _value,
      strict = this.spec.strict
    } = options;
    let value = _value;
    if (!strict) {
      value = this._cast(value, Object.assign({
        assert: false
      }, options));
    }
    let initialTests = [];
    for (let test of Object.values(this.internalTests)) {
      if (test) initialTests.push(test);
    }
    this.runTests({
      path,
      value,
      originalValue,
      options,
      tests: initialTests
    }, panic, initialErrors => {
      // even if we aren't ending early we can't proceed further if the types aren't correct
      if (initialErrors.length) {
        return next(initialErrors, value);
      }
      this.runTests({
        path,
        value,
        originalValue,
        options,
        tests: this.tests
      }, panic, next);
    });
  }

  /**
   * Executes a set of validations, either schema, produced Tests or a nested
   * schema validate result.
   */
  runTests(runOptions, panic, next) {
    let fired = false;
    let {
      tests,
      value,
      originalValue,
      path,
      options
    } = runOptions;
    let panicOnce = arg => {
      if (fired) return;
      fired = true;
      panic(arg, value);
    };
    let nextOnce = arg => {
      if (fired) return;
      fired = true;
      next(arg, value);
    };
    let count = tests.length;
    let nestedErrors = [];
    if (!count) return nextOnce([]);
    let args = {
      value,
      originalValue,
      path,
      options,
      schema: this
    };
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      test(args, panicOnce, function finishTestRun(err) {
        if (err) {
          nestedErrors = nestedErrors.concat(err);
        }
        if (--count <= 0) {
          nextOnce(nestedErrors);
        }
      });
    }
  }
  asNestedTest({
    key,
    index,
    parent,
    parentPath,
    originalParent,
    options
  }) {
    const k = key != null ? key : index;
    if (k == null) {
      throw TypeError('Must include `key` or `index` for nested validations');
    }
    const isIndex = typeof k === 'number';
    let value = parent[k];
    const testOptions = Object.assign({}, options, {
      // Nested validations fields are always strict:
      //    1. parent isn't strict so the casting will also have cast inner values
      //    2. parent is strict in which case the nested values weren't cast either
      strict: true,
      parent,
      value,
      originalValue: originalParent[k],
      // FIXME: tests depend on `index` being passed around deeply,
      //   we should not let the options.key/index bleed through
      key: undefined,
      // index: undefined,
      [isIndex ? 'index' : 'key']: k,
      path: isIndex || k.includes('.') ? `${parentPath || ''}[${value ? k : `"${k}"`}]` : (parentPath ? `${parentPath}.` : '') + key
    });
    return (_, panic, next) => this.resolve(testOptions)._validate(value, testOptions, panic, next);
  }
  validate(value, options) {
    let schema = this.resolve(Object.assign({}, options, {
      value
    }));
    return new Promise((resolve, reject) => schema._validate(value, options, (error, parsed) => {
      if (ValidationError.isError(error)) error.value = parsed;
      reject(error);
    }, (errors, validated) => {
      if (errors.length) reject(new ValidationError(errors, validated));else resolve(validated);
    }));
  }
  validateSync(value, options) {
    let schema = this.resolve(Object.assign({}, options, {
      value
    }));
    let result;
    schema._validate(value, Object.assign({}, options, {
      sync: true
    }), (error, parsed) => {
      if (ValidationError.isError(error)) error.value = parsed;
      throw error;
    }, (errors, validated) => {
      if (errors.length) throw new ValidationError(errors, value);
      result = validated;
    });
    return result;
  }
  isValid(value, options) {
    return this.validate(value, options).then(() => true, err => {
      if (ValidationError.isError(err)) return false;
      throw err;
    });
  }
  isValidSync(value, options) {
    try {
      this.validateSync(value, options);
      return true;
    } catch (err) {
      if (ValidationError.isError(err)) return false;
      throw err;
    }
  }
  _getDefault() {
    let defaultValue = this.spec.default;
    if (defaultValue == null) {
      return defaultValue;
    }
    return typeof defaultValue === 'function' ? defaultValue.call(this) : clone(defaultValue);
  }
  getDefault(options
  // If schema is defaulted we know it's at least not undefined
  ) {
    let schema = this.resolve(options || {});
    return schema._getDefault();
  }
  default(def) {
    if (arguments.length === 0) {
      return this._getDefault();
    }
    let next = this.clone({
      default: def
    });
    return next;
  }
  strict(isStrict = true) {
    return this.clone({
      strict: isStrict
    });
  }
  nullability(nullable, message) {
    const next = this.clone({
      nullable
    });
    next.internalTests.nullable = createValidation({
      message,
      name: 'nullable',
      test(value) {
        return value === null ? this.schema.spec.nullable : true;
      }
    });
    return next;
  }
  optionality(optional, message) {
    const next = this.clone({
      optional
    });
    next.internalTests.optionality = createValidation({
      message,
      name: 'optionality',
      test(value) {
        return value === undefined ? this.schema.spec.optional : true;
      }
    });
    return next;
  }
  optional() {
    return this.optionality(true);
  }
  defined(message = mixed.defined) {
    return this.optionality(false, message);
  }
  nullable() {
    return this.nullability(true);
  }
  nonNullable(message = mixed.notNull) {
    return this.nullability(false, message);
  }
  required(message = mixed.required) {
    return this.clone().withMutation(next => next.nonNullable(message).defined(message));
  }
  notRequired() {
    return this.clone().withMutation(next => next.nullable().optional());
  }
  transform(fn) {
    let next = this.clone();
    next.transforms.push(fn);
    return next;
  }

  /**
   * Adds a test function to the schema's queue of tests.
   * tests can be exclusive or non-exclusive.
   *
   * - exclusive tests, will replace any existing tests of the same name.
   * - non-exclusive: can be stacked
   *
   * If a non-exclusive test is added to a schema with an exclusive test of the same name
   * the exclusive test is removed and further tests of the same name will be stacked.
   *
   * If an exclusive test is added to a schema with non-exclusive tests of the same name
   * the previous tests are removed and further tests of the same name will replace each other.
   */

  test(...args) {
    let opts;
    if (args.length === 1) {
      if (typeof args[0] === 'function') {
        opts = {
          test: args[0]
        };
      } else {
        opts = args[0];
      }
    } else if (args.length === 2) {
      opts = {
        name: args[0],
        test: args[1]
      };
    } else {
      opts = {
        name: args[0],
        message: args[1],
        test: args[2]
      };
    }
    if (opts.message === undefined) opts.message = mixed.default;
    if (typeof opts.test !== 'function') throw new TypeError('`test` is a required parameters');
    let next = this.clone();
    let validate = createValidation(opts);
    let isExclusive = opts.exclusive || opts.name && next.exclusiveTests[opts.name] === true;
    if (opts.exclusive) {
      if (!opts.name) throw new TypeError('Exclusive tests must provide a unique `name` identifying the test');
    }
    if (opts.name) next.exclusiveTests[opts.name] = !!opts.exclusive;
    next.tests = next.tests.filter(fn => {
      if (fn.OPTIONS.name === opts.name) {
        if (isExclusive) return false;
        if (fn.OPTIONS.test === validate.OPTIONS.test) return false;
      }
      return true;
    });
    next.tests.push(validate);
    return next;
  }
  when(keys, options) {
    if (!Array.isArray(keys) && typeof keys !== 'string') {
      options = keys;
      keys = '.';
    }
    let next = this.clone();
    let deps = toArray(keys).map(key => new Reference(key));
    deps.forEach(dep => {
      // @ts-ignore readonly array
      if (dep.isSibling) next.deps.push(dep.key);
    });
    next.conditions.push(typeof options === 'function' ? new Condition(deps, options) : Condition.fromOptions(deps, options));
    return next;
  }
  typeError(message) {
    let next = this.clone();
    next.internalTests.typeError = createValidation({
      message,
      name: 'typeError',
      test(value) {
        if (!isAbsent(value) && !this.schema._typeCheck(value)) return this.createError({
          params: {
            type: this.schema.type
          }
        });
        return true;
      }
    });
    return next;
  }
  oneOf(enums, message = mixed.oneOf) {
    let next = this.clone();
    enums.forEach(val => {
      next._whitelist.add(val);
      next._blacklist.delete(val);
    });
    next.internalTests.whiteList = createValidation({
      message,
      name: 'oneOf',
      skipAbsent: true,
      test(value) {
        let valids = this.schema._whitelist;
        let resolved = valids.resolveAll(this.resolve);
        return resolved.includes(value) ? true : this.createError({
          params: {
            values: Array.from(valids).join(', '),
            resolved
          }
        });
      }
    });
    return next;
  }
  notOneOf(enums, message = mixed.notOneOf) {
    let next = this.clone();
    enums.forEach(val => {
      next._blacklist.add(val);
      next._whitelist.delete(val);
    });
    next.internalTests.blacklist = createValidation({
      message,
      name: 'notOneOf',
      test(value) {
        let invalids = this.schema._blacklist;
        let resolved = invalids.resolveAll(this.resolve);
        if (resolved.includes(value)) return this.createError({
          params: {
            values: Array.from(invalids).join(', '),
            resolved
          }
        });
        return true;
      }
    });
    return next;
  }
  strip(strip = true) {
    let next = this.clone();
    next.spec.strip = strip;
    return next;
  }

  /**
   * Return a serialized description of the schema including validations, flags, types etc.
   *
   * @param options Provide any needed context for resolving runtime schema alterations (lazy, when conditions, etc).
   */
  describe(options) {
    const next = (options ? this.resolve(options) : this).clone();
    const {
      label,
      meta,
      optional,
      nullable
    } = next.spec;
    const description = {
      meta,
      label,
      optional,
      nullable,
      default: next.getDefault(options),
      type: next.type,
      oneOf: next._whitelist.describe(),
      notOneOf: next._blacklist.describe(),
      tests: next.tests.map(fn => ({
        name: fn.OPTIONS.name,
        params: fn.OPTIONS.params
      })).filter((n, idx, list) => list.findIndex(c => c.name === n.name) === idx)
    };
    return description;
  }
}
// @ts-expect-error
Schema.prototype.__isYupSchema__ = true;
for (const method of ['validate', 'validateSync']) Schema.prototype[`${method}At`] = function (path, value, options = {}) {
  const {
    parent,
    parentPath,
    schema
  } = getIn(this, path, value, options.context);
  return schema[method](parent && parent[parentPath], Object.assign({}, options, {
    parent,
    path
  }));
};
for (const alias of ['equals', 'is']) Schema.prototype[alias] = Schema.prototype.oneOf;
for (const alias of ['not', 'nope']) Schema.prototype[alias] = Schema.prototype.notOneOf;

// Taken from HTML spec: https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
let rEmail =
// eslint-disable-next-line
/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
let rUrl =
// eslint-disable-next-line
/^((https?|ftp):)?\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;

// eslint-disable-next-line
let rUUID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
let isTrimmed = value => isAbsent(value) || value === value.trim();
let objStringTag = {}.toString();
function create$6() {
  return new StringSchema();
}
class StringSchema extends Schema {
  constructor() {
    super({
      type: 'string',
      check(value) {
        if (value instanceof String) value = value.valueOf();
        return typeof value === 'string';
      }
    });
    this.withMutation(() => {
      this.transform((value, _raw, ctx) => {
        if (!ctx.spec.coerce || ctx.isType(value)) return value;

        // don't ever convert arrays
        if (Array.isArray(value)) return value;
        const strValue = value != null && value.toString ? value.toString() : value;

        // no one wants plain objects converted to [Object object]
        if (strValue === objStringTag) return value;
        return strValue;
      });
    });
  }
  required(message) {
    return super.required(message).withMutation(schema => schema.test({
      message: message || mixed.required,
      name: 'required',
      skipAbsent: true,
      test: value => !!value.length
    }));
  }
  notRequired() {
    return super.notRequired().withMutation(schema => {
      schema.tests = schema.tests.filter(t => t.OPTIONS.name !== 'required');
      return schema;
    });
  }
  length(length, message = string.length) {
    return this.test({
      message,
      name: 'length',
      exclusive: true,
      params: {
        length
      },
      skipAbsent: true,
      test(value) {
        return value.length === this.resolve(length);
      }
    });
  }
  min(min, message = string.min) {
    return this.test({
      message,
      name: 'min',
      exclusive: true,
      params: {
        min
      },
      skipAbsent: true,
      test(value) {
        return value.length >= this.resolve(min);
      }
    });
  }
  max(max, message = string.max) {
    return this.test({
      name: 'max',
      exclusive: true,
      message,
      params: {
        max
      },
      skipAbsent: true,
      test(value) {
        return value.length <= this.resolve(max);
      }
    });
  }
  matches(regex, options) {
    let excludeEmptyString = false;
    let message;
    let name;
    if (options) {
      if (typeof options === 'object') {
        ({
          excludeEmptyString = false,
          message,
          name
        } = options);
      } else {
        message = options;
      }
    }
    return this.test({
      name: name || 'matches',
      message: message || string.matches,
      params: {
        regex
      },
      skipAbsent: true,
      test: value => value === '' && excludeEmptyString || value.search(regex) !== -1
    });
  }
  email(message = string.email) {
    return this.matches(rEmail, {
      name: 'email',
      message,
      excludeEmptyString: true
    });
  }
  url(message = string.url) {
    return this.matches(rUrl, {
      name: 'url',
      message,
      excludeEmptyString: true
    });
  }
  uuid(message = string.uuid) {
    return this.matches(rUUID, {
      name: 'uuid',
      message,
      excludeEmptyString: false
    });
  }

  //-- transforms --
  ensure() {
    return this.default('').transform(val => val === null ? '' : val);
  }
  trim(message = string.trim) {
    return this.transform(val => val != null ? val.trim() : val).test({
      message,
      name: 'trim',
      test: isTrimmed
    });
  }
  lowercase(message = string.lowercase) {
    return this.transform(value => !isAbsent(value) ? value.toLowerCase() : value).test({
      message,
      name: 'string_case',
      exclusive: true,
      skipAbsent: true,
      test: value => isAbsent(value) || value === value.toLowerCase()
    });
  }
  uppercase(message = string.uppercase) {
    return this.transform(value => !isAbsent(value) ? value.toUpperCase() : value).test({
      message,
      name: 'string_case',
      exclusive: true,
      skipAbsent: true,
      test: value => isAbsent(value) || value === value.toUpperCase()
    });
  }
}
create$6.prototype = StringSchema.prototype;

//
// String Interfaces
//

let isNaN$1 = value => value != +value;
function create$5() {
  return new NumberSchema();
}
class NumberSchema extends Schema {
  constructor() {
    super({
      type: 'number',
      check(value) {
        if (value instanceof Number) value = value.valueOf();
        return typeof value === 'number' && !isNaN$1(value);
      }
    });
    this.withMutation(() => {
      this.transform((value, _raw, ctx) => {
        if (!ctx.spec.coerce) return value;
        let parsed = value;
        if (typeof parsed === 'string') {
          parsed = parsed.replace(/\s/g, '');
          if (parsed === '') return NaN;
          // don't use parseFloat to avoid positives on alpha-numeric strings
          parsed = +parsed;
        }
        if (ctx.isType(parsed)) return parsed;
        return parseFloat(parsed);
      });
    });
  }
  min(min, message = number.min) {
    return this.test({
      message,
      name: 'min',
      exclusive: true,
      params: {
        min
      },
      skipAbsent: true,
      test(value) {
        return value >= this.resolve(min);
      }
    });
  }
  max(max, message = number.max) {
    return this.test({
      message,
      name: 'max',
      exclusive: true,
      params: {
        max
      },
      skipAbsent: true,
      test(value) {
        return value <= this.resolve(max);
      }
    });
  }
  lessThan(less, message = number.lessThan) {
    return this.test({
      message,
      name: 'max',
      exclusive: true,
      params: {
        less
      },
      skipAbsent: true,
      test(value) {
        return value < this.resolve(less);
      }
    });
  }
  moreThan(more, message = number.moreThan) {
    return this.test({
      message,
      name: 'min',
      exclusive: true,
      params: {
        more
      },
      skipAbsent: true,
      test(value) {
        return value > this.resolve(more);
      }
    });
  }
  positive(msg = number.positive) {
    return this.moreThan(0, msg);
  }
  negative(msg = number.negative) {
    return this.lessThan(0, msg);
  }
  integer(message = number.integer) {
    return this.test({
      name: 'integer',
      message,
      skipAbsent: true,
      test: val => Number.isInteger(val)
    });
  }
  truncate() {
    return this.transform(value => !isAbsent(value) ? value | 0 : value);
  }
  round(method) {
    var _method;
    let avail = ['ceil', 'floor', 'round', 'trunc'];
    method = ((_method = method) == null ? void 0 : _method.toLowerCase()) || 'round';

    // this exists for symemtry with the new Math.trunc
    if (method === 'trunc') return this.truncate();
    if (avail.indexOf(method.toLowerCase()) === -1) throw new TypeError('Only valid options for round() are: ' + avail.join(', '));
    return this.transform(value => !isAbsent(value) ? Math[method](value) : value);
  }
}
create$5.prototype = NumberSchema.prototype;

//
// Number Interfaces
//

/* eslint-disable */
/**
 *
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * NON-CONFORMANT EDITION.
 * © 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */

//              1 YYYY                 2 MM        3 DD              4 HH     5 mm        6 ss            7 msec         8 Z 9 ±    10 tzHH    11 tzmm
var isoReg = /^(\d{4}|[+\-]\d{6})(?:-?(\d{2})(?:-?(\d{2}))?)?(?:[ T]?(\d{2}):?(\d{2})(?::?(\d{2})(?:[,\.](\d{1,}))?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?)?)?$/;
function parseIsoDate(date) {
  var numericKeys = [1, 4, 5, 6, 7, 10, 11],
    minutesOffset = 0,
    timestamp,
    struct;
  if (struct = isoReg.exec(date)) {
    // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
    for (var i = 0, k; k = numericKeys[i]; ++i) struct[k] = +struct[k] || 0;

    // allow undefined days and months
    struct[2] = (+struct[2] || 1) - 1;
    struct[3] = +struct[3] || 1;

    // allow arbitrary sub-second precision beyond milliseconds
    struct[7] = struct[7] ? String(struct[7]).substr(0, 3) : 0;

    // timestamps without timezone identifiers should be considered local time
    if ((struct[8] === undefined || struct[8] === '') && (struct[9] === undefined || struct[9] === '')) timestamp = +new Date(struct[1], struct[2], struct[3], struct[4], struct[5], struct[6], struct[7]);else {
      if (struct[8] !== 'Z' && struct[9] !== undefined) {
        minutesOffset = struct[10] * 60 + struct[11];
        if (struct[9] === '+') minutesOffset = 0 - minutesOffset;
      }
      timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
    }
  } else timestamp = Date.parse ? Date.parse(date) : NaN;
  return timestamp;
}

// @ts-ignore
let invalidDate = new Date('');
let isDate = obj => Object.prototype.toString.call(obj) === '[object Date]';
class DateSchema extends Schema {
  constructor() {
    super({
      type: 'date',
      check(v) {
        return isDate(v) && !isNaN(v.getTime());
      }
    });
    this.withMutation(() => {
      this.transform((value, _raw, ctx) => {
        if (!ctx.spec.coerce || ctx.isType(value)) return value;
        value = parseIsoDate(value);

        // 0 is a valid timestamp equivalent to 1970-01-01T00:00:00Z(unix epoch) or before.
        return !isNaN(value) ? new Date(value) : DateSchema.INVALID_DATE;
      });
    });
  }
  prepareParam(ref, name) {
    let param;
    if (!Reference.isRef(ref)) {
      let cast = this.cast(ref);
      if (!this._typeCheck(cast)) throw new TypeError(`\`${name}\` must be a Date or a value that can be \`cast()\` to a Date`);
      param = cast;
    } else {
      param = ref;
    }
    return param;
  }
  min(min, message = date.min) {
    let limit = this.prepareParam(min, 'min');
    return this.test({
      message,
      name: 'min',
      exclusive: true,
      params: {
        min
      },
      skipAbsent: true,
      test(value) {
        return value >= this.resolve(limit);
      }
    });
  }
  max(max, message = date.max) {
    let limit = this.prepareParam(max, 'max');
    return this.test({
      message,
      name: 'max',
      exclusive: true,
      params: {
        max
      },
      skipAbsent: true,
      test(value) {
        return value <= this.resolve(limit);
      }
    });
  }
}
DateSchema.INVALID_DATE = invalidDate;

function setLocale(custom) {
  Object.keys(custom).forEach(type => {
    // @ts-ignore
    Object.keys(custom[type]).forEach(method => {
      // @ts-ignore
      locale[type][method] = custom[type][method];
    });
  });
}

const _hoisted_1$7 = { class: "row" };
const _hoisted_2$7 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.title",
  class: "form-label"
}, "作品タイトル名", -1);
const _hoisted_3$7 = ["textContent"];
const _hoisted_4$7 = /* @__PURE__ */ createBaseVNode("label", {
  for: "save_ns",
  class: "form-label"
}, "プロジェクト名", -1);
const _hoisted_5$7 = ["textContent"];
const _hoisted_6$7 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.creator",
  class: "form-label"
}, "著作者", -1);
const _hoisted_7$6 = ["textContent"];
const _hoisted_8$6 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.cre_url",
  class: "form-label"
}, "連絡先URL・mail", -1);
const _hoisted_9$6 = { class: "input-group input-group-sm has-validation" };
const _hoisted_10$6 = ["disabled"];
const _hoisted_11$5 = ["textContent"];
const _hoisted_12$5 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.publisher",
  class: "form-label"
}, "出版者", -1);
const _hoisted_13$5 = ["textContent"];
const _hoisted_14$5 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.pub_url",
  class: "form-label"
}, "出版者URL", -1);
const _hoisted_15$5 = { class: "input-group input-group-sm has-validation" };
const _hoisted_16$5 = ["disabled"];
const _hoisted_17$5 = ["textContent"];
const _hoisted_18$5 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.detail",
  class: "form-label"
}, "内容：プロジェクトの説明", -1);
const _hoisted_19$4 = ["textContent"];
const _sfc_main$7 = /* @__PURE__ */ defineComponent({
  __name: "StgBasic",
  setup(__props) {
    const stCfg = useCfg();
    const { oCfg } = storeToRefs(stCfg);
    setLocale({
      mixed: {
        required: "必須入力項目です",
        notOneOf: "あなたの作品情報に変更してください"
      },
      string: {
        url: "URL形式ではありません"
      }
    });
    const { value: v_save_ns, errorMessage: em_save_ns, meta: mv_save_ns } = useField(
      "oCfg.save_ns",
      create$6().required().matches(/^[\w\.]+$/, "英数字か[_.]のみです").notOneOf(["hatsune", "uc"]),
      { initialValue: oCfg.value.save_ns }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_title, errorMessage: em_title, meta: mv_title } = useField(
      "oCfg.book.title",
      create$6().required().notOneOf(["初音館にて", "桜の樹の下には"]),
      { initialValue: oCfg.value.book.title }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_creator, errorMessage: em_creator, meta: mv_creator } = useField(
      "oCfg.book.creator",
      create$6().required().notOneOf(["ふぁみべぇ"]),
      { initialValue: oCfg.value.book.creator }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_cre_url, errorMessage: em_cre_url, meta: mv_cre_url } = useField(
      "oCfg.book.cre_url",
      create$6().required().notOneOf(["https://twitter.com/famibee", "https://twitter.com/ugainovel"]).test(
        "is-url_or_mail",
        () => "URL（https:〜）かメールアドレスを指定してください",
        (v = "") => /https?:\/\//.test(v) ? create$6().url().isValid(v) : create$6().email().isValid(v)
      ),
      { initialValue: oCfg.value.book.cre_url }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_publisher, errorMessage: em_publisher, meta: mv_publisher } = useField(
      "oCfg.book.publisher",
      create$6().required().notOneOf(["電子演劇部"]),
      { initialValue: oCfg.value.book.publisher }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_pub_url, errorMessage: em_pub_url, meta: mv_pub_url } = useField(
      "oCfg.book.pub_url",
      create$6().required().url().notOneOf(["https://famibee.blog.fc2.com/", "https://ugainovel.blog.fc2.com/"]),
      { initialValue: oCfg.value.book.pub_url }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_detail, errorMessage: em_detail, meta: mv_detail } = useField(
      "oCfg.book.detail",
      create$6().required().notOneOf([
        "江戸川乱歩「孤島の鬼」二次創作ノベルゲームサンプルです。",
        "梶井基次郎「桜の樹の下には」をノベルゲーム化したものです。"
      ]),
      { initialValue: oCfg.value.book.detail }
      // ブラウザテスト用、VSCodeで上書き
    );
    on("init", () => {
      const o = oCfg.value;
      v_save_ns.value = o.save_ns;
      v_title.value = o.book.title;
      v_creator.value = o.book.creator;
      v_cre_url.value = o.book.cre_url;
      v_publisher.value = o.book.publisher;
      v_pub_url.value = o.book.pub_url;
      v_detail.value = o.book.detail;
    });
    const subscribe = () => {
      const o = toRaw(oCfg.value);
      const o2 = {
        ...o,
        save_ns: v_save_ns.value,
        book: {
          ...o.book,
          title: v_title.value,
          creator: v_creator.value,
          cre_url: v_cre_url.value,
          publisher: v_publisher.value,
          pub_url: v_pub_url.value,
          detail: v_detail.value
        }
      };
      stCfg.subscribe(o2);
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$7, [
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-6 px-1 pb-2", { "was-validated": unref(mv_title).valid }])
        }, [
          _hoisted_2$7,
          withDirectives(createBaseVNode("input", {
            type: "text",
            id: "book.title",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(v_title) ? v_title.value = $event : null),
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_title).valid }]),
            onInput: subscribe,
            placeholder: "（日本語名でＯＫ）",
            "aria-label": "作品タイトル名",
            "aria-describedby": "Title"
          }, null, 34), [
            [vModelText, unref(v_title)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_title))
          }, null, 8, _hoisted_3$7)
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-6 px-1 pb-2", { "was-validated": unref(mv_save_ns).valid }])
        }, [
          _hoisted_4$7,
          withDirectives(createBaseVNode("input", {
            type: "text",
            id: "save_ns",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(v_save_ns) ? v_save_ns.value = $event : null),
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_save_ns).valid }]),
            onInput: subscribe,
            placeholder: "com.fc2.blog.famibee 的な出版者ＵＲＬの逆順ドメイン推奨",
            "aria-label": "プロジェクト名",
            "aria-describedby": "Project name"
          }, null, 34), [
            [vModelText, unref(v_save_ns)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_save_ns))
          }, null, 8, _hoisted_5$7)
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-6 px-1 py-2", { "was-validated": unref(mv_creator).valid }])
        }, [
          _hoisted_6$7,
          withDirectives(createBaseVNode("input", {
            type: "text",
            id: "book.creator",
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(v_creator) ? v_creator.value = $event : null),
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_creator).valid }]),
            onInput: subscribe,
            placeholder: "ペンネーム、ハンドル名など",
            "aria-label": "著作者",
            "aria-describedby": "Contact"
          }, null, 34), [
            [vModelText, unref(v_creator)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_creator))
          }, null, 8, _hoisted_7$6)
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-6 px-1 py-2", { "was-validated": unref(mv_cre_url).valid }])
        }, [
          _hoisted_8$6,
          createBaseVNode("div", _hoisted_9$6, [
            withDirectives(createBaseVNode("input", {
              type: "text",
              id: "book.cre_url",
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(v_cre_url) ? v_cre_url.value = $event : null),
              class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_cre_url).valid }]),
              onInput: subscribe,
              placeholder: "メアド、SNSなど",
              "aria-label": "連絡先ＵＲＬ",
              "aria-describedby": "Contact URL"
            }, null, 34), [
              [vModelText, unref(v_cre_url)]
            ]),
            createBaseVNode("button", {
              type: "button",
              class: "btn btn-info",
              onClick: _cache[4] || (_cache[4] = ($event) => unref(openURL)(unref(v_cre_url))),
              disabled: !unref(mv_cre_url).valid
            }, "Open", 8, _hoisted_10$6),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_cre_url))
            }, null, 8, _hoisted_11$5)
          ])
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-6 px-1 py-2", { "was-validated": unref(mv_publisher).valid }])
        }, [
          _hoisted_12$5,
          withDirectives(createBaseVNode("input", {
            type: "text",
            id: "book.publisher",
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef(v_publisher) ? v_publisher.value = $event : null),
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_publisher).valid }]),
            onInput: subscribe,
            placeholder: "サークル名、団体名など",
            "aria-label": "出版者",
            "aria-describedby": "Publisher"
          }, null, 34), [
            [vModelText, unref(v_publisher)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_publisher))
          }, null, 8, _hoisted_13$5)
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-6 px-1 py-2", { "was-validated": unref(mv_pub_url).valid }])
        }, [
          _hoisted_14$5,
          createBaseVNode("div", _hoisted_15$5, [
            withDirectives(createBaseVNode("input", {
              type: "url",
              id: "book.pub_url",
              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => isRef(v_pub_url) ? v_pub_url.value = $event : null),
              class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_pub_url).valid }]),
              onInput: subscribe,
              placeholder: "ご自身の公式サイトなど",
              "aria-label": "出版者ＵＲＬ",
              "aria-describedby": "Publisher URL"
            }, null, 34), [
              [vModelText, unref(v_pub_url)]
            ]),
            createBaseVNode("button", {
              type: "button",
              class: "btn btn-info",
              onClick: _cache[7] || (_cache[7] = ($event) => unref(openURL)(unref(v_pub_url))),
              disabled: !unref(mv_pub_url).valid
            }, "Open", 8, _hoisted_16$5),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_pub_url))
            }, null, 8, _hoisted_17$5)
          ])
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["col-12 px-1 py-3", { "was-validated": unref(mv_detail).valid }])
        }, [
          _hoisted_18$5,
          withDirectives(createBaseVNode("textarea", {
            id: "book.detail",
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_detail).valid }]),
            "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => isRef(v_detail) ? v_detail.value = $event : null),
            onInput: subscribe,
            placeholder: "インストーラーに表示する内容説明",
            "aria-label": "プロジェクトの説明",
            "aria-describedby": "Project description"
          }, null, 34), [
            [vModelText, unref(v_detail)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_detail))
          }, null, 8, _hoisted_19$4)
        ], 2)
      ]);
    };
  }
});

const _hoisted_1$6 = { class: "row" };
const _hoisted_2$6 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.width",
  class: "form-label"
}, "アプリの横幅", -1);
const _hoisted_3$6 = ["textContent"];
const _hoisted_4$6 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.height",
  class: "form-label"
}, "アプリの縦幅", -1);
const _hoisted_5$6 = ["textContent"];
const _hoisted_6$6 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.version",
  class: "form-label"
}, "バージョン", -1);
const _hoisted_7$5 = ["textContent"];
const _hoisted_8$5 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.max_len",
  class: "form-label"
}, "ログ保存長", -1);
const _hoisted_9$5 = ["textContent"];
const _hoisted_10$5 = /* @__PURE__ */ createBaseVNode("div", { class: "col-12 px-1 pt-3" }, [
  /* @__PURE__ */ createBaseVNode("h5", null, "初期値")
], -1);
const _hoisted_11$4 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.tagch_msecwait",
  class: "form-label"
}, "文字表示待ち時間(ms)", -1);
const _hoisted_12$4 = ["textContent"];
const _hoisted_13$4 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.auto_msecpagewait",
  class: "form-label"
}, "自動読み時文字表示待ち(ms)", -1);
const _hoisted_14$4 = ["textContent"];
const _hoisted_15$4 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.escape",
  class: "form-label"
}, "エスケープ文字", -1);
const _hoisted_16$4 = ["textContent"];
const _hoisted_17$4 = { class: "col-6 col-sm-3 px-1 py-2" };
const _hoisted_18$4 = /* @__PURE__ */ createBaseVNode("label", {
  for: "book.bg_color",
  class: "form-label"
}, "背景色", -1);
const _sfc_main$6 = /* @__PURE__ */ defineComponent({
  __name: "StgApp",
  setup(__props) {
    const stCfg = useCfg();
    const { oCfg } = storeToRefs(stCfg);
    const { value: v_width, errorMessage: em_width, meta: mv_width } = useField(
      "oCfg.window.width",
      create$5().required("必須の項目です").integer("整数にして下さい").min(300, "最小値 300 以上にして下さい"),
      { initialValue: oCfg.value.window.width }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_height, errorMessage: em_height, meta: mv_height } = useField(
      "oCfg.window.height",
      create$5().required("必須の項目です").integer("整数にして下さい").min(300, "最小値 300 以上にして下さい"),
      { initialValue: oCfg.value.window.height }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_version, errorMessage: em_version, meta: mv_version } = useField(
      "oCfg.version",
      create$6().required("必須の項目です").matches(/^[\w\.\-]+$/, "英数字か[_-.]のみです"),
      { initialValue: oCfg.value.book.version }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_max_len, errorMessage: em_max_len, meta: mv_max_len } = useField(
      "oCfg.window.max_len",
      create$5().required("必須の項目です").integer("整数にして下さい").min(10, "最小値 10 以上にして下さい"),
      { initialValue: oCfg.value.log.max_len }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_tagch_msecwait, errorMessage: em_tagch_msecwait, meta: mv_tagch_msecwait } = useField(
      "oCfg.window.tagch_msecwait",
      create$5().required("必須の項目です").integer("整数にして下さい").min(1, "最小値 1 以上にして下さい"),
      { initialValue: oCfg.value.init.tagch_msecwait }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_auto_msecpagewait, errorMessage: em_auto_msecpagewait, meta: mv_auto_msecpagewait } = useField(
      "oCfg.window.auto_msecpagewait",
      create$5().required("必須の項目です").integer("整数にして下さい").min(1, "最小値 1 以上にして下さい"),
      { initialValue: oCfg.value.init.auto_msecpagewait }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_escape, errorMessage: em_escape, meta: mv_escape } = useField(
      "oCfg.escape",
      create$6().ensure().matches(/^[^ &()*;[\]]*$/, "推奨されない文字です"),
      //	.matches(/^[^ &()*;[\]]*$/, {message: '推奨されない文字です',excludeEmptyString: true}),
      { initialValue: oCfg.value.init.escape }
      // ブラウザテスト用、VSCodeで上書き
    );
    const { value: v_bg_color } = useField(
      "oCfg.window.bg_color",
      create$6().required("必須の項目です").matches(/#\d{6}/, "#000000 形式ではありません"),
      { initialValue: oCfg.value.init.bg_color }
      // ブラウザテスト用、VSCodeで上書き
    );
    on("init", () => {
      const o = oCfg.value;
      v_width.value = o.window.width;
      v_height.value = o.window.height;
      v_version.value = o.book.version;
      v_max_len.value = o.log.max_len;
      v_tagch_msecwait.value = o.init.tagch_msecwait;
      v_auto_msecpagewait.value = o.init.auto_msecpagewait;
      v_escape.value = o.init.escape;
      v_bg_color.value = o.init.bg_color;
    });
    const subscribe = () => {
      const o = toRaw(oCfg.value);
      const o2 = {
        // 二段階目も個別にコピー
        ...o,
        book: { ...o.book, version: v_version.value },
        window: {
          width: v_width.value,
          height: v_height.value
        },
        log: { max_len: v_max_len.value },
        init: {
          tagch_msecwait: v_tagch_msecwait.value,
          auto_msecpagewait: v_auto_msecpagewait.value,
          escape: v_escape.value.replaceAll(/[ &()*;[\]]/g, ""),
          // 本体の正規表現に都合悪い（グループに誤解釈など）文字削除
          bg_color: v_bg_color.value
        }
      };
      stCfg.subscribe(o2);
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$6, [
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_width).valid }])
        }, [
          _hoisted_2$6,
          withDirectives(createBaseVNode("input", {
            type: "number",
            id: "book.width",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(v_width) ? v_width.value = $event : null),
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_width).valid }]),
            onInput: subscribe,
            placeholder: "横幅ドット数",
            "aria-label": "アプリの横幅",
            "aria-describedby": "Width of application display area"
          }, null, 34), [
            [vModelText, unref(v_width)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_width))
          }, null, 8, _hoisted_3$6)
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_height).valid }])
        }, [
          _hoisted_4$6,
          withDirectives(createBaseVNode("input", {
            type: "number",
            id: "book.height",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(v_height) ? v_height.value = $event : null),
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_height).valid }]),
            onInput: subscribe,
            placeholder: "縦幅ドット数",
            "aria-label": "アプリの縦幅",
            "aria-describedby": "Weight of application display area"
          }, null, 34), [
            [vModelText, unref(v_height)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_height))
          }, null, 8, _hoisted_5$6)
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_version).valid }])
        }, [
          _hoisted_6$6,
          withDirectives(createBaseVNode("input", {
            type: "text",
            id: "book.version",
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(v_version) ? v_version.value = $event : null),
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_version).valid }]),
            onInput: subscribe,
            placeholder: "1.0.0 など",
            "aria-label": "バージョン",
            "aria-describedby": "version"
          }, null, 34), [
            [vModelText, unref(v_version)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_version))
          }, null, 8, _hoisted_7$5)
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_max_len).valid }])
        }, [
          _hoisted_8$5,
          withDirectives(createBaseVNode("input", {
            type: "number",
            id: "book.max_len",
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(v_max_len) ? v_max_len.value = $event : null),
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_max_len).valid }]),
            onInput: subscribe,
            placeholder: "何ページ分保存するか",
            "aria-label": "ログ保存長",
            "aria-describedby": "Log retention length"
          }, null, 34), [
            [vModelText, unref(v_max_len)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_max_len))
          }, null, 8, _hoisted_9$5)
        ], 2),
        _hoisted_10$5,
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_tagch_msecwait).valid }])
        }, [
          _hoisted_11$4,
          withDirectives(createBaseVNode("input", {
            type: "number",
            id: "book.tagch_msecwait",
            "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => isRef(v_tagch_msecwait) ? v_tagch_msecwait.value = $event : null),
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_tagch_msecwait).valid }]),
            onInput: subscribe,
            placeholder: "ミリ秒単位で指定",
            "aria-label": "文字表示待ち時間(ms)",
            "aria-describedby": "Character display waiting time"
          }, null, 34), [
            [vModelText, unref(v_tagch_msecwait)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_tagch_msecwait))
          }, null, 8, _hoisted_12$4)
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_auto_msecpagewait).valid }])
        }, [
          _hoisted_13$4,
          withDirectives(createBaseVNode("input", {
            type: "number",
            id: "book.auto_msecpagewait",
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef(v_auto_msecpagewait) ? v_auto_msecpagewait.value = $event : null),
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_auto_msecpagewait).valid }]),
            onInput: subscribe,
            placeholder: "ミリ秒単位で指定",
            "aria-label": "自動読み時文字表示待ち時間(ms)",
            "aria-describedby": "Waiting time for character display during automatic reading"
          }, null, 34), [
            [vModelText, unref(v_auto_msecpagewait)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_auto_msecpagewait))
          }, null, 8, _hoisted_14$4)
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_escape).valid }])
        }, [
          _hoisted_15$4,
          withDirectives(createBaseVNode("input", {
            type: "text",
            id: "book.escape",
            "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => isRef(v_escape) ? v_escape.value = $event : null),
            class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_escape).valid }]),
            onInput: subscribe,
            placeholder: "半角記号推奨",
            "aria-label": "エスケープ文字",
            "aria-describedby": "Escape character"
          }, null, 34), [
            [vModelText, unref(v_escape)]
          ]),
          createBaseVNode("div", {
            class: "invalid-feedback",
            textContent: toDisplayString(unref(em_escape))
          }, null, 8, _hoisted_16$4)
        ], 2),
        createBaseVNode("div", _hoisted_17$4, [
          _hoisted_18$4,
          withDirectives(createBaseVNode("input", {
            type: "color",
            id: "book.bg_color",
            "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => isRef(v_bg_color) ? v_bg_color.value = $event : null),
            class: "form-control form-control-sm form-control-color",
            onInput: subscribe,
            "aria-label": "背景色",
            "aria-describedby": "Background color"
          }, null, 544), [
            [vModelText, unref(v_bg_color)]
          ])
        ])
      ]);
    };
  }
});

let init$1 = false;
const useTemp = () => {
  const st = defineStore("doc/prj/**/setting.sn", {
    state: () => ({
      // 初期値を返す関数
      aTemp: isVSCode ? DEF_TEMP : DEF_TEMP4TST,
      err: ""
    }),
    getters: {
      // state 及び他の getter へのアクセスが可能
      //	getTitle(s) {return s.title;},
      // getter は全て computed 扱いになるため、引数に応じて結果を替える場合に
    },
    actions: {}
    // State の更新
  })();
  if (!init$1) {
    init$1 = true;
    st.$subscribe(() => cmd2Ex({
      cmd: "update.aTemp",
      aRes: st.aTemp.map(({ type, nm, val, num, bol }) => {
        switch (type) {
          case "txt":
            return { nm, val: toRaw(val) };
          case "rng":
            return { nm, val: String(num) };
          case "chk":
            return { nm, val: String(bol) };
          default:
            return { nm, val: toRaw(val) };
        }
      })
    }));
    on("update.aTemp", ({ aTemp, err }) => {
      st.aTemp = aTemp.map((v) => {
        switch (v.type) {
          case "txt":
            return v;
          case "rng":
            return { ...v, num: Number(v.val) };
          case "chk":
            return { ...v, bol: v.val != "false" };
          default:
            return v;
        }
      });
      st.err = err;
    });
  }
  return st;
};

const _hoisted_1$5 = ["innerHTML"];
const _hoisted_2$5 = {
  key: 1,
  class: "row"
};
const _hoisted_3$5 = {
  key: 0,
  class: "form-check"
};
const _hoisted_4$5 = ["onUpdate:modelValue"];
const _hoisted_5$5 = ["for", "textContent"];
const _hoisted_6$5 = {
  key: 1,
  class: "range-wrap"
};
const _hoisted_7$4 = ["textContent"];
const _hoisted_8$4 = ["for", "textContent"];
const _hoisted_9$4 = ["onUpdate:modelValue"];
const _hoisted_10$4 = ["for", "textContent"];
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "StgTemp",
  setup(__props) {
    configure({
      validateOnBlur: true,
      validateOnChange: true,
      validateOnInput: true,
      // false,
      validateOnModelUpdate: true
    });
    const stTemp = useTemp();
    const { aTemp, err } = storeToRefs(stTemp);
    const isRequired = (value) => {
      return value ? true : "This field is required";
    };
    return (_ctx, _cache) => {
      return unref(err) ? (openBlock(), createElementBlock("div", {
        key: 0,
        class: "alert alert-danger",
        role: "alert",
        innerHTML: unref(err)
      }, null, 8, _hoisted_1$5)) : (openBlock(), createElementBlock("div", _hoisted_2$5, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(unref(aTemp), ({ id, lbl, type, num, max, min, step }, i) => {
          return openBlock(), createBlock(unref(Form), {
            key: i,
            class: "col-6 col-sm-3 px-1 pb-2"
          }, {
            default: withCtx(({ meta }) => [
              type === "chk" ? (openBlock(), createElementBlock("div", _hoisted_3$5, [
                withDirectives(createBaseVNode("input", mergeProps({
                  type: "checkbox",
                  "onUpdate:modelValue": ($event) => unref(aTemp)[i].bol = $event
                }, { id }, { class: "form-check-input mb-3 sn_checkbox" }), null, 16, _hoisted_4$5), [
                  [vModelCheckbox, unref(aTemp)[i].bol]
                ]),
                createBaseVNode("label", {
                  class: "form-check-label",
                  for: id,
                  textContent: toDisplayString(lbl)
                }, null, 8, _hoisted_5$5)
              ])) : type === "rng" ? (openBlock(), createElementBlock("div", _hoisted_6$5, [
                createBaseVNode("div", {
                  class: "range-badge range-badge-down",
                  style: normalizeStyle({ left: unref(getLeftRangeBadge)(num, max, min) })
                }, [
                  createBaseVNode("span", {
                    textContent: toDisplayString(unref(aTemp)[i].num)
                  }, null, 8, _hoisted_7$4)
                ], 4),
                createBaseVNode("label", {
                  for: id,
                  class: "form-label",
                  textContent: toDisplayString(lbl)
                }, null, 8, _hoisted_8$4),
                withDirectives(createBaseVNode("input", mergeProps({
                  type: "range",
                  "onUpdate:modelValue": ($event) => unref(aTemp)[i].num = $event
                }, { id, max, min, step }, { class: "form-range my-1" }), null, 16, _hoisted_9$4), [
                  [vModelText, unref(aTemp)[i].num]
                ])
              ])) : (openBlock(), createElementBlock("div", {
                key: 2,
                class: normalizeClass({ "was-validated": meta.valid })
              }, [
                createBaseVNode("label", {
                  for: id,
                  class: "form-label",
                  textContent: toDisplayString(lbl)
                }, null, 8, _hoisted_10$4),
                createVNode(unref(Field), mergeProps({
                  modelValue: unref(aTemp)[i].val,
                  "onUpdate:modelValue": ($event) => unref(aTemp)[i].val = $event
                }, { id, name: id, type: type === "num" ? "number" : "text", placeholder: lbl }, {
                  class: ["form-control form-control-sm", { "is-invalid": !meta.valid }],
                  rules: isRequired
                }), null, 16, ["modelValue", "onUpdate:modelValue", "class"]),
                createVNode(unref(ErrorMessage), {
                  name: id,
                  class: "invalid-feedback"
                }, null, 8, ["name"])
              ], 2))
            ]),
            _: 2
          }, 1024);
        }), 128))
      ]));
    };
  }
});

const _hoisted_1$4 = { class: "row" };
const _hoisted_2$4 = /* @__PURE__ */ createBaseVNode("div", { class: "col-12 px-1 pt-3" }, [
  /* @__PURE__ */ createBaseVNode("h5", null, "暗号化しないフォルダ")
], -1);
const _hoisted_3$4 = { class: "col-4 col-sm-3 col-lg-2 col-xxl-1" };
const _hoisted_4$4 = { class: "form-check" };
const _hoisted_5$4 = ["id", "onUpdate:modelValue"];
const _hoisted_6$4 = ["textContent"];
const _hoisted_7$3 = /* @__PURE__ */ createBaseVNode("div", { class: "col-12 px-1 pt-3" }, [
  /* @__PURE__ */ createBaseVNode("h5", null, "デバッグスイッチ")
], -1);
const _hoisted_8$3 = { class: "col-4 col-sm-3 col-lg-2 col-xxl-1" };
const _hoisted_9$3 = { class: "form-check" };
const _hoisted_10$3 = ["id", "onUpdate:modelValue"];
const _hoisted_11$3 = ["for", "textContent"];
const _hoisted_12$3 = /* @__PURE__ */ createBaseVNode("div", { class: "col-12 px-1 pt-3" }, [
  /* @__PURE__ */ createBaseVNode("h5", null, "セーブデータ保存先を開く")
], -1);
const _hoisted_13$3 = { class: "col-6 col-sm-6 px-1 py-2" };
const _hoisted_14$3 = { class: "form-check" };
const _hoisted_15$3 = /* @__PURE__ */ createBaseVNode("label", {
  class: "form-label",
  for: "open.dev.save_path"
}, "参考資料：開発者向け情報", -1);
const _hoisted_16$3 = { class: "input-group input-group-sm" };
const _hoisted_17$3 = /* @__PURE__ */ createBaseVNode("span", { class: "input-group-text" }, "【セーブデータの保存場所】", -1);
const _hoisted_18$3 = /* @__PURE__ */ createStaticVNode('<div class="col-6 col-sm-6 px-1 py-2"><form class="form-check"><label class="form-label">ブラウザ版</label><div class="input-group input-group-sm"><span class="input-group-text">ブラウザのローカルストレージに保存されます</span></div></form></div>', 1);
const _hoisted_19$3 = { class: "col-6 col-sm-6 px-1 py-2" };
const _hoisted_20$3 = { class: "form-check" };
const _hoisted_21$3 = /* @__PURE__ */ createBaseVNode("label", {
  class: "form-label",
  for: "copy.folder_save_app"
}, "アプリ版（通常実行）", -1);
const _hoisted_22$3 = { class: "input-group input-group-sm" };
const _hoisted_23$3 = /* @__PURE__ */ createBaseVNode("span", { class: "input-group-text" }, "手動で開いて下さい", -1);
const _hoisted_24$3 = { class: "col-6 col-sm-6 px-1 py-2" };
const _hoisted_25$3 = { class: "form-check" };
const _hoisted_26$3 = /* @__PURE__ */ createBaseVNode("label", {
  class: "form-label",
  for: "open.folder_save_dbg"
}, "アプリ版（デバッグ実行）", -1);
const _hoisted_27$2 = { class: "input-group input-group-sm" };
const _hoisted_28$2 = /* @__PURE__ */ createBaseVNode("span", { class: "input-group-text" }, ".vscode/storage/", -1);
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "StgDebug",
  setup(__props) {
    const stCfg = useCfg();
    const { oCfg } = storeToRefs(stCfg);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$4, [
        _hoisted_2$4,
        (openBlock(true), createElementBlock(Fragment, null, renderList(unref(oCfg).code, (_v, nm) => {
          return openBlock(), createElementBlock("div", _hoisted_3$4, [
            createBaseVNode("div", _hoisted_4$4, [
              withDirectives(createBaseVNode("input", {
                id: "code." + nm,
                class: "form-check-input mb-3 sn_checkbox",
                type: "checkbox",
                "onUpdate:modelValue": ($event) => unref(oCfg).code[nm] = $event
              }, null, 8, _hoisted_5$4), [
                [vModelCheckbox, unref(oCfg).code[nm]]
              ]),
              createBaseVNode("label", {
                class: "form-check-label",
                textContent: toDisplayString(nm)
              }, null, 8, _hoisted_6$4)
            ])
          ]);
        }), 256)),
        _hoisted_7$3,
        (openBlock(true), createElementBlock(Fragment, null, renderList(unref(oCfg).debug, (_v, nm) => {
          return openBlock(), createElementBlock("div", _hoisted_8$3, [
            createBaseVNode("div", _hoisted_9$3, [
              withDirectives(createBaseVNode("input", {
                id: "debug." + nm,
                class: "form-check-input mb-3 sn_checkbox",
                type: "checkbox",
                "onUpdate:modelValue": ($event) => unref(oCfg).debug[nm] = $event
              }, null, 8, _hoisted_10$3), [
                [vModelCheckbox, unref(oCfg).debug[nm]]
              ]),
              createBaseVNode("label", {
                class: "form-check-label",
                for: "debug." + nm,
                textContent: toDisplayString(nm)
              }, null, 8, _hoisted_11$3)
            ])
          ]);
        }), 256)),
        _hoisted_12$3,
        createBaseVNode("div", _hoisted_13$3, [
          createBaseVNode("form", _hoisted_14$3, [
            _hoisted_15$3,
            createBaseVNode("div", _hoisted_16$3, [
              _hoisted_17$3,
              createBaseVNode("button", {
                class: "btn btn-info btn-lg",
                type: "button",
                id: "open.dev.save_path",
                onClick: _cache[0] || (_cache[0] = ($event) => unref(openURL)("https://famibee.github.io/SKYNovel/dev.html#save_path"))
              }, "Open")
            ])
          ])
        ]),
        _hoisted_18$3,
        createBaseVNode("div", _hoisted_19$3, [
          createBaseVNode("form", _hoisted_20$3, [
            _hoisted_21$3,
            createBaseVNode("div", _hoisted_22$3, [
              _hoisted_23$3,
              createBaseVNode("button", {
                class: "btn btn-info",
                type: "button",
                id: "copy.folder_save_app",
                onClick: _cache[1] || (_cache[1] = ($event) => unref(copyTxt)("copy.folder_save_app"))
              }, "Copy Path")
            ])
          ])
        ]),
        createBaseVNode("div", _hoisted_24$3, [
          createBaseVNode("form", _hoisted_25$3, [
            _hoisted_26$3,
            createBaseVNode("div", _hoisted_27$2, [
              _hoisted_28$2,
              createBaseVNode("button", {
                class: "btn btn-info",
                type: "button",
                id: "open.folder_save_dbg",
                onClick: _cache[2] || (_cache[2] = ($event) => unref(openURL)("ws-folder:///.vscode/storage/"))
              }, "Open")
            ])
          ])
        ])
      ]);
    };
  }
});

let init = false;
const useOInfo = () => {
  const st = defineStore("OInfo", {
    state: () => ({
      aCnvFont: DEF_CNVFONT,
      oOptImg: isVSCode ? DEF_OPTIMG : DEF_OPTIMG4TST,
      oOptSnd: isVSCode ? DEF_OPTSND : DEF_OPTSND4TST
    }),
    // 初期値を返す関数
    //	getters	: {},	// state 及び他の getter へのアクセスが可能
    actions: {
      // State の更新
      setACnvFont(aCnvFont) {
        this.aCnvFont = aCnvFont;
      },
      setOptImg(oOptImg) {
        this.oOptImg = oOptImg;
      },
      setOptSnd(oOptSnd) {
        this.oOptSnd = oOptSnd;
      }
    }
  })();
  if (!init) {
    init = true;
    on("update.cnvFont", ({ aCnvFont }) => st.setACnvFont(aCnvFont));
    on("update.optImg", ({ oOptImg }) => st.setOptImg(oOptImg));
    on("update.optSnd", ({ oOptSnd }) => st.setOptSnd(oOptSnd));
  }
  return st;
};

(()=>{var t={792:(t,e,i)=>{i.d(e,{Z:()=>n});var s=i(609),o=i.n(s)()((function(t){return t[1]}));o.push([t.id,':host{--divider-width: 1px;--divider-color: #fff;--divider-shadow: none;--default-handle-width: 50px;--default-handle-color: #fff;--default-handle-opacity: 1;--default-handle-shadow: none;--handle-position-start: 50%;position:relative;display:inline-block;overflow:hidden;line-height:0;direction:ltr}@media screen and (-webkit-min-device-pixel-ratio: 0)and (min-resolution: 0.001dpcm){:host{outline-offset:1px}}:host(:focus){outline:2px solid -webkit-focus-ring-color}::slotted(*){-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.first{position:absolute;left:0;top:0;right:0;line-height:normal;font-size:100%;max-height:100%;height:100%;width:100%;--exposure: 50%;--keyboard-transition-time: 0ms;--default-transition-time: 0ms;--transition-time: var(--default-transition-time)}.first .first-overlay-container{position:relative;clip-path:inset(0 var(--exposure) 0 0);transition:clip-path var(--transition-time);height:100%}.first .first-overlay{overflow:hidden;height:100%}.first.focused{will-change:clip-path}.first.focused .first-overlay-container{will-change:clip-path}.second{position:relative}.handle-container{transform:translateX(50%);position:absolute;top:0;right:var(--exposure);height:100%;transition:right var(--transition-time),bottom var(--transition-time)}.focused .handle-container{will-change:right}.divider{position:absolute;height:100%;width:100%;left:0;top:0;display:flex;align-items:center;justify-content:center;flex-direction:column}.divider:after{content:" ";display:block;height:100%;border-left-width:var(--divider-width);border-left-style:solid;border-left-color:var(--divider-color);box-shadow:var(--divider-shadow)}.handle{position:absolute;top:var(--handle-position-start);pointer-events:none;box-sizing:border-box;margin-left:1px;transform:translate(calc(-50% - 0.5px), -50%);line-height:0}.default-handle{width:var(--default-handle-width);opacity:var(--default-handle-opacity);transition:all 1s;filter:drop-shadow(var(--default-handle-shadow))}.default-handle path{stroke:var(--default-handle-color)}.vertical .first-overlay-container{clip-path:inset(0 0 var(--exposure) 0)}.vertical .handle-container{transform:translateY(50%);height:auto;top:unset;bottom:var(--exposure);width:100%;left:0;flex-direction:row}.vertical .divider:after{height:1px;width:100%;border-top-width:var(--divider-width);border-top-style:solid;border-top-color:var(--divider-color);border-left:0}.vertical .handle{top:auto;left:var(--handle-position-start);transform:translate(calc(-50% - 0.5px), -50%) rotate(90deg)}',""]);const n=o;},609:t=>{t.exports=function(t){var e=[];return e.toString=function(){return this.map((function(e){var i=t(e);return e[2]?"@media ".concat(e[2]," {").concat(i,"}"):i})).join("")},e.i=function(t,i,s){"string"==typeof t&&(t=[[null,t,""]]);var o={};if(s)for(var n=0;n<this.length;n++){var r=this[n][0];null!=r&&(o[r]=!0);}for(var a=0;a<t.length;a++){var d=[].concat(t[a]);s&&o[d[0]]||(i&&(d[2]?d[2]="".concat(i," and ").concat(d[2]):d[2]=i),e.push(d));}},e};}},e={};function i(s){var o=e[s];if(void 0!==o)return o.exports;var n=e[s]={id:s,exports:{}};return t[s](n,n.exports,i),n.exports}i.n=t=>{var e=t&&t.__esModule?()=>t.default:()=>t;return i.d(e,{a:e}),e},i.d=(t,e)=>{for(var s in e)i.o(e,s)&&!i.o(t,s)&&Object.defineProperty(t,s,{enumerable:!0,get:e[s]});},i.o=(t,e)=>Object.prototype.hasOwnProperty.call(t,e),(()=>{var t=i(792);const e="rendered",s=(t,e)=>{const i=t.getBoundingClientRect();let s,o;return "mousedown"===e.type?(s=e.clientX,o=e.clientY):(s=e.touches[0].clientX,o=e.touches[0].clientY),s>=i.x&&s<=i.x+i.width&&o>=i.y&&o<=i.y+i.height},o=document.createElement("template");o.innerHTML='<div class="second" id="second"> <slot name="second"><slot name="before"></slot></slot> </div> <div class="first" id="first"> <div class="first-overlay"> <div class="first-overlay-container" id="firstImageContainer"> <slot name="first"><slot name="after"></slot></slot> </div> </div> <div class="handle-container"> <div class="divider"></div> <div class="handle" id="handle"> <slot name="handle"> <svg xmlns="http://www.w3.org/2000/svg" class="default-handle" viewBox="-8 -3 16 6"> <path d="M -5 -2 L -7 0 L -5 2 M 5 -2 L 7 0 L 5 2" fill="none" vector-effect="non-scaling-stroke"/> </svg> </slot> </div> </div> </div> ';const n={ArrowLeft:-1,ArrowRight:1},r=["horizontal","vertical"],a=t=>({x:t.touches[0].pageX,y:t.touches[0].pageY}),d=t=>({x:t.pageX,y:t.pageY});class h extends HTMLElement{constructor(){super(),this.exposure=this.hasAttribute("value")?parseFloat(this.getAttribute("value")):50,this.slideOnHover=!1,this.slideDirection="horizontal",this.keyboard="enabled",this.isMouseDown=!1,this.animationDirection=0,this.isFocused=!1,this.handle=!1,this.onMouseMove=t=>{if(this.isMouseDown||this.slideOnHover){const e=d(t);this.slideToPage(e);}},this.bodyUserSelectStyle="",this.onMouseDown=t=>{if(this.slideOnHover)return;if(this.handle&&!s(this.handleElement,t))return;t.preventDefault(),window.addEventListener("mousemove",this.onMouseMove),window.addEventListener("mouseup",this.onWindowMouseUp),this.isMouseDown=!0,this.enableTransition();const e=d(t);this.slideToPage(e),this.focus(),this.bodyUserSelectStyle=window.document.body.style.userSelect,window.document.body.style.userSelect="none";},this.onWindowMouseUp=()=>{this.isMouseDown=!1,window.document.body.style.userSelect=this.bodyUserSelectStyle,window.removeEventListener("mousemove",this.onMouseMove),window.removeEventListener("mouseup",this.onWindowMouseUp);},this.touchStartPoint=null,this.isTouchComparing=!1,this.hasTouchMoved=!1,this.onTouchStart=t=>{this.handle&&!s(this.handleElement,t)||(this.touchStartPoint=a(t),this.isFocused&&(this.enableTransition(),this.slideToPage(this.touchStartPoint)));},this.onTouchMove=t=>{if(null===this.touchStartPoint)return;const e=a(t);if(this.isTouchComparing)return this.slideToPage(e),t.preventDefault(),!1;if(!this.hasTouchMoved){const i=Math.abs(e.y-this.touchStartPoint.y),s=Math.abs(e.x-this.touchStartPoint.x);if("horizontal"===this.slideDirection&&i<s||"vertical"===this.slideDirection&&i>s)return this.isTouchComparing=!0,this.focus(),this.slideToPage(e),t.preventDefault(),!1;this.hasTouchMoved=!0;}},this.onTouchEnd=()=>{this.isTouchComparing=!1,this.hasTouchMoved=!1,this.touchStartPoint=null;},this.onBlur=()=>{this.stopSlideAnimation(),this.isFocused=!1,this.firstElement.classList.remove("focused");},this.onFocus=()=>{this.isFocused=!0,this.firstElement.classList.add("focused");},this.onKeyDown=t=>{if("disabled"===this.keyboard)return;const e=n[t.key];this.animationDirection!==e&&void 0!==e&&(this.animationDirection=e,this.startSlideAnimation());},this.onKeyUp=t=>{if("disabled"===this.keyboard)return;const e=n[t.key];void 0!==e&&this.animationDirection===e&&this.stopSlideAnimation();},this.resetDimensions=()=>{this.imageWidth=this.offsetWidth,this.imageHeight=this.offsetHeight;};const e=this.attachShadow({mode:"open"}),i=document.createElement("style");i.innerHTML=t.Z,this.getAttribute("nonce")&&i.setAttribute("nonce",this.getAttribute("nonce")),e.appendChild(i),e.appendChild(o.content.cloneNode(!0)),this.firstElement=e.getElementById("first"),this.secondElement=e.getElementById("second"),this.handleElement=e.getElementById("handle");}get value(){return this.exposure}set value(t){const e=parseFloat(t);e!==this.exposure&&(this.exposure=e,this.enableTransition(),this.setExposure());}get hover(){return this.slideOnHover}set hover(t){this.slideOnHover="false"!==t.toString().toLowerCase(),this.removeEventListener("mousemove",this.onMouseMove),this.slideOnHover&&this.addEventListener("mousemove",this.onMouseMove);}get direction(){return this.slideDirection}set direction(t){this.slideDirection=t.toString().toLowerCase(),this.slide(0),this.firstElement.classList.remove(...r),r.includes(this.slideDirection)&&this.firstElement.classList.add(this.slideDirection);}static get observedAttributes(){return ["hover","direction"]}connectedCallback(){this.hasAttribute("tabindex")||(this.tabIndex=0),this.addEventListener("dragstart",(t=>(t.preventDefault(),!1))),new ResizeObserver(this.resetDimensions).observe(this),this.setExposure(0),this.keyboard=this.hasAttribute("keyboard")&&"disabled"===this.getAttribute("keyboard")?"disabled":"enabled",this.addEventListener("keydown",this.onKeyDown),this.addEventListener("keyup",this.onKeyUp),this.addEventListener("focus",this.onFocus),this.addEventListener("blur",this.onBlur),this.addEventListener("touchstart",this.onTouchStart,{passive:!0}),this.addEventListener("touchmove",this.onTouchMove,{passive:!1}),this.addEventListener("touchend",this.onTouchEnd),this.addEventListener("mousedown",this.onMouseDown),this.handle=this.hasAttribute("handle"),this.hover=!!this.hasAttribute("hover")&&this.getAttribute("hover"),this.direction=this.hasAttribute("direction")?this.getAttribute("direction"):"horizontal",this.resetDimensions(),this.classList.contains(e)||this.classList.add(e),this.querySelectorAll('[slot="before"], [slot="after"]').length>0&&console.warn('<img-comparison-slider>: slot names "before" and "after" are deprecated and soon won\'t be supported. Please use slot="first" instead of slot="after", and slot="second" instead of slot="before".');}disconnectedCallback(){this.transitionTimer&&window.clearTimeout(this.transitionTimer);}attributeChangedCallback(t,e,i){"hover"===t&&(this.hover=i),"direction"===t&&(this.direction=i),"keyboard"===t&&(this.keyboard="disabled"===i?"disabled":"enabled");}setExposure(t=0){var e;this.exposure=((e=this.exposure+t)<0?0:e>100?100:e),this.firstElement.style.setProperty("--exposure",100-this.exposure+"%");}slide(t=0){this.setExposure(t);const e=new Event("slide");this.dispatchEvent(e);}slideToPage(t){"horizontal"===this.slideDirection&&this.slideToPageX(t.x),"vertical"===this.slideDirection&&this.slideToPageY(t.y);}slideToPageX(t){const e=t-this.getBoundingClientRect().left-window.scrollX;this.exposure=e/this.imageWidth*100,this.slide(0);}slideToPageY(t){const e=t-this.getBoundingClientRect().top-window.scrollY;this.exposure=e/this.imageHeight*100,this.slide(0);}enableTransition(){this.firstElement.style.setProperty("--transition-time","100ms"),this.transitionTimer=window.setTimeout((()=>{this.firstElement.style.setProperty("--transition-time","var(--default-transition-time)"),this.transitionTimer=null;}),100);}startSlideAnimation(){let t=null,e=this.animationDirection;this.firstElement.style.setProperty("--transition-time","var(--keyboard-transition-time)");const i=s=>{if(0===this.animationDirection||e!==this.animationDirection)return;null===t&&(t=s);const o=(s-t)/16.666666666666668*this.animationDirection;this.slide(o),setTimeout((()=>window.requestAnimationFrame(i)),0),t=s;};window.requestAnimationFrame(i);}stopSlideAnimation(){this.animationDirection=0,this.firstElement.style.setProperty("--transition-time","var(--default-transition-time)");}}"undefined"!=typeof window&&window.customElements.define("img-comparison-slider",h);})();})();

const ImgComparisonSlider = defineComponent({
    name: 'ImgComparisonSlider',
    setup(_, { slots }) {
        return () => h('img-comparison-slider', slots.default());
    },
});

const _hoisted_1$3 = { class: "col-6 col-sm-4 px-2" };
const _hoisted_2$3 = { class: "form-check form-switch py-2" };
const _hoisted_3$3 = ["disabled"];
const _hoisted_4$3 = /* @__PURE__ */ createBaseVNode("label", {
  for: "cnv.mat.pic",
  class: "form-check-label"
}, "jpg・png を WebP に変換", -1);
const _hoisted_5$3 = { class: "col-6 col-sm-3 px-1" };
const _hoisted_6$3 = { class: "range-wrap" };
const _hoisted_7$2 = ["textContent"];
const _hoisted_8$2 = /* @__PURE__ */ createBaseVNode("label", {
  for: "cnv.mat.webp_quality",
  class: "form-label"
}, "基本の変換画質", -1);
const _hoisted_9$2 = ["disabled"];
const _hoisted_10$2 = {
  key: 0,
  class: "col-6 col-sm-5 px-1"
};
const _hoisted_11$2 = { class: "table table-striped" };
const _hoisted_12$2 = /* @__PURE__ */ createBaseVNode("thead", null, [
  /* @__PURE__ */ createBaseVNode("tr", null, [
    /* @__PURE__ */ createBaseVNode("th", null, "元画像サイズ合計"),
    /* @__PURE__ */ createBaseVNode("th", null, "webp変換後"),
    /* @__PURE__ */ createBaseVNode("th", null, "削減率")
  ])
], -1);
const _hoisted_13$2 = ["textContent"];
const _hoisted_14$2 = ["textContent"];
const _hoisted_15$2 = ["textContent"];
const _hoisted_16$2 = {
  key: 1,
  class: "col-12 px-1"
};
const _hoisted_17$2 = {
  id: "clpMatCnv",
  class: "accordion-collapse"
};
const _hoisted_18$2 = { class: "accordion-body p-0 tbody_scroll" };
const _hoisted_19$2 = {
  id: "tblMatCnv",
  class: "table table-striped table-hover accordion bg-secondary"
};
const _hoisted_20$2 = /* @__PURE__ */ createBaseVNode("thead", { class: "sticky-top" }, [
  /* @__PURE__ */ createBaseVNode("tr", null, [
    /* @__PURE__ */ createBaseVNode("th", null, "ファイル名"),
    /* @__PURE__ */ createBaseVNode("th", null, "変換画質"),
    /* @__PURE__ */ createBaseVNode("th", { style: { "text-align": "right" } }, "元画像サイズ"),
    /* @__PURE__ */ createBaseVNode("th", { style: { "text-align": "right" } }, "webp変換後"),
    /* @__PURE__ */ createBaseVNode("th", null, "削減率")
  ])
], -1);
const _hoisted_21$2 = ["href", "data-bs-target", "aria-controls"];
const _hoisted_22$2 = ["textContent"];
const _hoisted_23$2 = ["textContent"];
const _hoisted_24$2 = ["textContent"];
const _hoisted_25$2 = ["textContent"];
const _hoisted_26$2 = ["textContent"];
const _hoisted_27$1 = ["id", "aria-labelledby"];
const _hoisted_28$1 = {
  colspan: "4",
  class: "accordion-body"
};
const _hoisted_29$1 = { class: "row" };
const _hoisted_30$1 = { class: "col-6 col-sm-4 px-2" };
const _hoisted_31$1 = { class: "form-check form-switch py-2" };
const _hoisted_32$1 = ["id", "checked", "onChange", "disabled"];
const _hoisted_33$1 = ["for"];
const _hoisted_34$1 = { class: "col-6 col-sm-3 px-1" };
const _hoisted_35$1 = { class: "range-wrap" };
const _hoisted_36$1 = ["textContent"];
const _hoisted_37$1 = ["onUpdate:modelValue", "disabled", "onChange"];
const _hoisted_38$1 = { class: "col-12 px-1" };
const _hoisted_39$1 = { class: "position-relative d-flex justify-content-evenly" };
const _hoisted_40$1 = ["src"];
const _hoisted_41$1 = ["src"];
const _hoisted_42$1 = /* @__PURE__ */ createBaseVNode("svg", {
  slot: "handle",
  width: "100",
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "-8 -3 16 6"
}, [
  /* @__PURE__ */ createBaseVNode("path", {
    stroke: "#fff",
    d: "M -5 -2 L -7 0 L -5 2 M -5 -2 L -5 2 M 5 -2 L 7 0 L 5 2 M 5 -2 L 5 2",
    "stroke-width": "2",
    fill: "#ffa658",
    "vector-effect": "non-scaling-stroke"
  })
], -1);
const _hoisted_43 = /* @__PURE__ */ createBaseVNode("button", {
  type: "button",
  class: "btn btn-light position-absolute top-50 start-0",
  disabled: ""
}, "WebP", -1);
const _hoisted_44 = ["textContent"];
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "StgImgOpt",
  setup(__props) {
    const stOInfo = useOInfo();
    const { oOptImg } = storeToRefs(stOInfo);
    const sortHSize = () => Object.entries(oOptImg.value.hSize).map(([nm, v]) => ({ nm, id: "acdMC" + nm.replaceAll(".", "_"), ...v })).sort((a, b) => a.nm < b.nm ? -1 : 1);
    const chgRangeWebpQDef = (el) => {
      const webp_q = Number(el.target.value);
      oWss.value["cnv.mat.webp_quality"] = webp_q;
      const q = { cmd: "change.range.webp_q_def", webp_q };
      cmd2Ex(q);
    };
    const stWss = useWss();
    const { oWss } = storeToRefs(stWss);
    const chkChg = (el, e) => {
      const no_def = Boolean(el.target.checked);
      const webp_q = oWss.value["cnv.mat.webp_quality"];
      if (no_def)
        oOptImg.value.hSize[e.nm].webp_q = webp_q;
      else
        delete oOptImg.value.hSize[e.nm].webp_q;
      const q = { cmd: "change.range.webp_q", nm: e.nm, no_def, webp_q };
      cmd2Ex(q);
    };
    const chgRangeWebpQ = (el, e) => {
      const q = { cmd: "change.range.webp_q", nm: e.nm, no_def: true, webp_q: Number(el.target.value) };
      cmd2Ex(q);
    };
    const updImg = (src) => src + "?" + (/* @__PURE__ */ new Date()).getTime();
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment, null, [
        createBaseVNode("div", _hoisted_1$3, [
          createBaseVNode("div", _hoisted_2$3, [
            withDirectives(createBaseVNode("input", {
              type: "checkbox",
              id: "cnv.mat.pic",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(oWss)["cnv.mat.pic"] = $event),
              disabled: unref(hDisabled)["cnv.mat.pic"],
              class: "form-check-input sn_checkbox sn-chk"
            }, null, 8, _hoisted_3$3), [
              [vModelCheckbox, unref(oWss)["cnv.mat.pic"]]
            ]),
            _hoisted_4$3
          ])
        ]),
        createBaseVNode("div", _hoisted_5$3, [
          createBaseVNode("div", _hoisted_6$3, [
            createBaseVNode("div", {
              class: "range-badge range-badge-down",
              style: normalizeStyle({ left: unref(getLeftRangeBadge)(unref(oWss)["cnv.mat.webp_quality"], 100, 5) })
            }, [
              createBaseVNode("span", {
                textContent: toDisplayString(unref(oWss)["cnv.mat.webp_quality"])
              }, null, 8, _hoisted_7$2)
            ], 4),
            _hoisted_8$2,
            withDirectives(createBaseVNode("input", {
              type: "range",
              id: "cnv.mat.webp_quality",
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(oWss)["cnv.mat.webp_quality"] = $event),
              max: "100",
              min: "5",
              step: "5",
              disabled: unref(hDisabled)["cnv.mat.pic"],
              onChange: _cache[2] || (_cache[2] = ($event) => chgRangeWebpQDef($event)),
              class: "form-range my-1 sn-vld"
            }, null, 40, _hoisted_9$2), [
              [vModelText, unref(oWss)["cnv.mat.webp_quality"]]
            ])
          ])
        ]),
        unref(oOptImg).sum.baseSize > 0 ? (openBlock(), createElementBlock("div", _hoisted_10$2, [
          createBaseVNode("table", _hoisted_11$2, [
            _hoisted_12$2,
            createBaseVNode("tbody", null, [
              createBaseVNode("tr", null, [
                createBaseVNode("td", {
                  style: { "text-align": "right" },
                  textContent: toDisplayString(unref(oOptImg).sum.baseSize.toLocaleString("ja-JP") + " byte")
                }, null, 8, _hoisted_13$2),
                createBaseVNode("td", {
                  style: { "text-align": "right" },
                  textContent: toDisplayString(unref(oOptImg).sum.webpSize.toLocaleString("ja-JP") + " byte")
                }, null, 8, _hoisted_14$2),
                createBaseVNode("td", {
                  textContent: toDisplayString((unref(oOptImg).sum.webpSize / unref(oOptImg).sum.baseSize).toLocaleString("ja-JP"))
                }, null, 8, _hoisted_15$2)
              ])
            ])
          ])
        ])) : createCommentVNode("", true),
        unref(oOptImg).sum.baseSize > 0 ? (openBlock(), createElementBlock("div", _hoisted_16$2, [
          createBaseVNode("div", null, [
            createBaseVNode("div", _hoisted_17$2, [
              createBaseVNode("div", _hoisted_18$2, [
                createBaseVNode("table", _hoisted_19$2, [
                  _hoisted_20$2,
                  createBaseVNode("tbody", null, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(sortHSize(), (e) => {
                      return openBlock(), createElementBlock(Fragment, {
                        key: e.key
                      }, [
                        createBaseVNode("tr", {
                          href: "#" + e.id,
                          class: "accordion-header",
                          "data-bs-toggle": "collapse",
                          "data-bs-target": "#" + e.id,
                          "aria-expanded": "true",
                          "aria-controls": e.id
                        }, [
                          createBaseVNode("td", {
                            textContent: toDisplayString(e.nm)
                          }, null, 8, _hoisted_22$2),
                          createBaseVNode("td", {
                            textContent: toDisplayString(e.webp_q ?? `${unref(oWss)["cnv.mat.webp_quality"]} (基本の値)`)
                          }, null, 8, _hoisted_23$2),
                          createBaseVNode("td", {
                            style: { "text-align": "right" },
                            textContent: toDisplayString(e.baseSize.toLocaleString("ja-JP") + " byte")
                          }, null, 8, _hoisted_24$2),
                          createBaseVNode("td", {
                            style: { "text-align": "right" },
                            textContent: toDisplayString(e.webpSize.toLocaleString("ja-JP") + " byte")
                          }, null, 8, _hoisted_25$2),
                          createBaseVNode("td", {
                            textContent: toDisplayString((e.webpSize / e.baseSize).toLocaleString("ja-JP"))
                          }, null, 8, _hoisted_26$2)
                        ], 8, _hoisted_21$2),
                        createBaseVNode("tr", {
                          id: e.id,
                          "data-bs-parent": "#tblMatCnv",
                          "aria-labelledby": e.id,
                          class: "accordion-collapse collapse"
                        }, [
                          createBaseVNode("td", _hoisted_28$1, [
                            createBaseVNode("div", _hoisted_29$1, [
                              createBaseVNode("div", _hoisted_30$1, [
                                createBaseVNode("div", _hoisted_31$1, [
                                  createBaseVNode("input", {
                                    type: "checkbox",
                                    id: "cnv.mat.pic." + e.id,
                                    checked: e.webp_q !== void 0,
                                    onChange: ($event) => chkChg($event, e),
                                    disabled: unref(hDisabled)["cnv.mat.pic"],
                                    class: "form-check-input sn_checkbox sn-chk"
                                  }, null, 40, _hoisted_32$1),
                                  createBaseVNode("label", {
                                    for: "cnv.mat.pic." + e.id,
                                    class: "form-check-label text-white"
                                  }, "画質を個別設定", 8, _hoisted_33$1)
                                ])
                              ]),
                              createBaseVNode("div", _hoisted_34$1, [
                                createBaseVNode("div", _hoisted_35$1, [
                                  createBaseVNode("div", {
                                    class: "range-badge",
                                    style: normalizeStyle({ left: unref(getLeftRangeBadge)(e.webp_q, 100, 5) })
                                  }, [
                                    withDirectives(createBaseVNode("span", {
                                      textContent: toDisplayString(e.webp_q)
                                    }, null, 8, _hoisted_36$1), [
                                      [vShow, e.webp_q !== void 0]
                                    ])
                                  ], 4),
                                  withDirectives(createBaseVNode("input", {
                                    type: "range",
                                    "onUpdate:modelValue": ($event) => unref(oOptImg).hSize[e.nm].webp_q = $event,
                                    max: "100",
                                    min: "5",
                                    step: "5",
                                    disabled: e.webp_q === void 0 || unref(hDisabled)["cnv.mat.pic"],
                                    onChange: ($event) => chgRangeWebpQ($event, e),
                                    class: "form-range my-1 sn-vld"
                                  }, null, 40, _hoisted_37$1), [
                                    [vModelText, unref(oOptImg).hSize[e.nm].webp_q]
                                  ])
                                ])
                              ]),
                              createBaseVNode("div", _hoisted_38$1, [
                                createBaseVNode("div", _hoisted_39$1, [
                                  createVNode(unref(ImgComparisonSlider), null, {
                                    default: withCtx(() => [
                                      createBaseVNode("img", {
                                        loading: "lazy",
                                        slot: "first",
                                        src: updImg(unref(oOptImg).sum.pathImgCmpWebP + e.fld_nm + ".webp")
                                      }, null, 8, _hoisted_40$1),
                                      createBaseVNode("img", {
                                        loading: "lazy",
                                        slot: "second",
                                        src: updImg(unref(oOptImg).sum.pathImgCmpBase + e.fld_nm + "." + e.ext)
                                      }, null, 8, _hoisted_41$1),
                                      _hoisted_42$1
                                    ]),
                                    _: 2
                                  }, 1024),
                                  _hoisted_43,
                                  createBaseVNode("button", {
                                    type: "button",
                                    class: "btn btn-light position-absolute bottom-50 end-0",
                                    textContent: toDisplayString(e.ext),
                                    disabled: ""
                                  }, null, 8, _hoisted_44)
                                ])
                              ])
                            ])
                          ])
                        ], 8, _hoisted_27$1)
                      ], 64);
                    }), 128))
                  ])
                ])
              ])
            ])
          ])
        ])) : createCommentVNode("", true)
      ], 64);
    };
  }
});

const StgImgOpt_vue_vue_type_style_index_0_lang = '';

const _hoisted_1$2 = { class: "col-6 col-sm-4 px-2" };
const _hoisted_2$2 = { class: "form-check form-switch py-2" };
const _hoisted_3$2 = ["disabled"];
const _hoisted_4$2 = /* @__PURE__ */ createBaseVNode("label", {
  for: "cnv.mat.snd",
  class: "form-check-label"
}, "mp3・wav をコーデック変換", -1);
const _hoisted_5$2 = { class: "col-6 col-sm-3 px-1 sn_select" };
const _hoisted_6$2 = /* @__PURE__ */ createBaseVNode("label", {
  for: "cnv.mat.snd.codec",
  class: "form-label"
}, "音声コーデック", -1);
const _hoisted_7$1 = /* @__PURE__ */ createBaseVNode("i", { class: "fas fa-angle-down sn_select_v" }, null, -1);
const _hoisted_8$1 = /* @__PURE__ */ createBaseVNode("option", {
  value: "opus",
  selected: ""
}, "(.m4a) Opus", -1);
const _hoisted_9$1 = /* @__PURE__ */ createBaseVNode("option", { value: "aac" }, "(.aac) Advanced Audio Coding", -1);
const _hoisted_10$1 = /* @__PURE__ */ createBaseVNode("option", { value: "ogg" }, "(.ogg) Vorbis", -1);
const _hoisted_11$1 = [
  _hoisted_8$1,
  _hoisted_9$1,
  _hoisted_10$1
];
const _hoisted_12$1 = {
  key: 0,
  class: "col-6 col-sm-5 px-1"
};
const _hoisted_13$1 = { class: "table table-striped" };
const _hoisted_14$1 = /* @__PURE__ */ createBaseVNode("thead", null, [
  /* @__PURE__ */ createBaseVNode("tr", null, [
    /* @__PURE__ */ createBaseVNode("th", null, "元音声サイズ合計"),
    /* @__PURE__ */ createBaseVNode("th", null, "変換後"),
    /* @__PURE__ */ createBaseVNode("th", null, "削減率")
  ])
], -1);
const _hoisted_15$1 = ["textContent"];
const _hoisted_16$1 = ["textContent"];
const _hoisted_17$1 = ["textContent"];
const _hoisted_18$1 = {
  key: 1,
  class: "col-12 px-1"
};
const _hoisted_19$1 = { class: "p-0 tbody_scroll" };
const _hoisted_20$1 = { class: "table table-striped bg-secondary" };
const _hoisted_21$1 = /* @__PURE__ */ createBaseVNode("thead", { class: "sticky-top" }, [
  /* @__PURE__ */ createBaseVNode("tr", null, [
    /* @__PURE__ */ createBaseVNode("th", null, "ファイル名"),
    /* @__PURE__ */ createBaseVNode("th", { style: { "text-align": "right" } }, "元音声サイズ"),
    /* @__PURE__ */ createBaseVNode("th", { style: { "text-align": "right" } }, "変換後"),
    /* @__PURE__ */ createBaseVNode("th", null, "削減率")
  ])
], -1);
const _hoisted_22$1 = ["href", "data-bs-target", "aria-controls"];
const _hoisted_23$1 = ["textContent"];
const _hoisted_24$1 = ["textContent"];
const _hoisted_25$1 = ["textContent"];
const _hoisted_26$1 = ["textContent"];
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "StgSndOpt",
  setup(__props) {
    const stOInfo = useOInfo();
    const { oOptSnd } = storeToRefs(stOInfo);
    const stWss = useWss();
    const { oWss } = storeToRefs(stWss);
    const sortHSize = () => Object.entries(oOptSnd.value.hSize).map(([nm, v]) => ({ nm, id: "acdMC" + nm.replaceAll(".", "_"), ...v })).sort((a, b) => a.nm < b.nm ? -1 : 1);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment, null, [
        createBaseVNode("div", _hoisted_1$2, [
          createBaseVNode("div", _hoisted_2$2, [
            withDirectives(createBaseVNode("input", {
              type: "checkbox",
              id: "cnv.mat.snd",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(oWss)["cnv.mat.snd"] = $event),
              disabled: unref(hDisabled)["cnv.mat.snd"],
              class: "form-check-input sn_checkbox sn-chk"
            }, null, 8, _hoisted_3$2), [
              [vModelCheckbox, unref(oWss)["cnv.mat.snd"]]
            ]),
            _hoisted_4$2
          ])
        ]),
        createBaseVNode("div", _hoisted_5$2, [
          _hoisted_6$2,
          _hoisted_7$1,
          withDirectives(createBaseVNode("select", {
            id: "cnv.mat.snd.codec",
            class: "form-select form-select-sm mb-3",
            "aria-label": ".form-select-sm example",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(oWss)["cnv.mat.snd.codec"] = $event)
          }, _hoisted_11$1, 512), [
            [vModelSelect, unref(oWss)["cnv.mat.snd.codec"]]
          ])
        ]),
        unref(oOptSnd).sum.baseSize > 0 ? (openBlock(), createElementBlock("div", _hoisted_12$1, [
          createBaseVNode("table", _hoisted_13$1, [
            _hoisted_14$1,
            createBaseVNode("tbody", null, [
              createBaseVNode("tr", null, [
                createBaseVNode("td", {
                  style: { "text-align": "right" },
                  textContent: toDisplayString(unref(oOptSnd).sum.baseSize.toLocaleString("ja-JP") + " byte")
                }, null, 8, _hoisted_15$1),
                createBaseVNode("td", {
                  style: { "text-align": "right" },
                  textContent: toDisplayString(unref(oOptSnd).sum.optSize.toLocaleString("ja-JP") + " byte")
                }, null, 8, _hoisted_16$1),
                createBaseVNode("td", {
                  textContent: toDisplayString((unref(oOptSnd).sum.optSize / unref(oOptSnd).sum.baseSize).toLocaleString("ja-JP"))
                }, null, 8, _hoisted_17$1)
              ])
            ])
          ])
        ])) : createCommentVNode("", true),
        unref(oOptSnd).sum.baseSize > 0 ? (openBlock(), createElementBlock("div", _hoisted_18$1, [
          createBaseVNode("div", null, [
            createBaseVNode("div", null, [
              createBaseVNode("div", _hoisted_19$1, [
                createBaseVNode("table", _hoisted_20$1, [
                  _hoisted_21$1,
                  createBaseVNode("tbody", null, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(sortHSize(), (e) => {
                      return openBlock(), createElementBlock("tr", {
                        key: e.key,
                        href: "#" + e.id,
                        "data-bs-toggle": "collapse",
                        "data-bs-target": "#" + e.id,
                        "aria-expanded": "true",
                        "aria-controls": e.id
                      }, [
                        createBaseVNode("td", {
                          textContent: toDisplayString(e.nm)
                        }, null, 8, _hoisted_23$1),
                        createBaseVNode("td", {
                          style: { "text-align": "right" },
                          textContent: toDisplayString(e.baseSize.toLocaleString("ja-JP") + " byte")
                        }, null, 8, _hoisted_24$1),
                        createBaseVNode("td", {
                          style: { "text-align": "right" },
                          textContent: toDisplayString(e.optSize.toLocaleString("ja-JP") + " byte")
                        }, null, 8, _hoisted_25$1),
                        createBaseVNode("td", {
                          textContent: toDisplayString((e.optSize / e.baseSize).toLocaleString("ja-JP"))
                        }, null, 8, _hoisted_26$1)
                      ], 8, _hoisted_22$1);
                    }), 128))
                  ])
                ])
              ])
            ])
          ])
        ])) : createCommentVNode("", true)
      ], 64);
    };
  }
});

const _hoisted_1$1 = { class: "row" };
const _hoisted_2$1 = { class: "col-6 col-sm-8 px-1 py-2" };
const _hoisted_3$1 = /* @__PURE__ */ createBaseVNode("label", {
  for: "open.readme.txt",
  class: "form-label"
}, "readme.txtを開く", -1);
const _hoisted_4$1 = { class: "input-group input-group-sm" };
const _hoisted_5$1 = /* @__PURE__ */ createBaseVNode("span", { class: "input-group-text" }, "【build/include/readme.txt】", -1);
const _hoisted_6$1 = { class: "col-6 col-sm-4 px-1 py-2" };
const _hoisted_7 = /* @__PURE__ */ createBaseVNode("label", { class: "form-label" }, "フォントサイズ最適化", -1);
const _hoisted_8 = { class: "form-check form-switch mb-1" };
const _hoisted_9 = ["disabled"];
const _hoisted_10 = /* @__PURE__ */ createBaseVNode("label", {
  for: "cnv.font.subset",
  class: "form-check-label"
}, "必要最小限にする", -1);
const _hoisted_11 = { class: "col-12 px-1 py-3" };
const _hoisted_12 = /* @__PURE__ */ createBaseVNode("label", { class: "form-label" }, "フォント情報", -1);
const _hoisted_13 = { class: "table table-striped" };
const _hoisted_14 = /* @__PURE__ */ createBaseVNode("thead", null, [
  /* @__PURE__ */ createBaseVNode("tr", null, [
    /* @__PURE__ */ createBaseVNode("th", null, "Filename"),
    /* @__PURE__ */ createBaseVNode("th", null, "元ファイルの場所"),
    /* @__PURE__ */ createBaseVNode("th", { style: { "text-align": "right" } }, "Size（元ファイル）"),
    /* @__PURE__ */ createBaseVNode("th", { style: { "text-align": "right" } }, "Size（出力結果）"),
    /* @__PURE__ */ createBaseVNode("th", null, "削減率")
  ])
], -1);
const _hoisted_15 = ["textContent"];
const _hoisted_16 = ["textContent"];
const _hoisted_17 = ["textContent"];
const _hoisted_18 = ["textContent"];
const _hoisted_19 = ["textContent"];
const _hoisted_20 = { key: 0 };
const _hoisted_21 = /* @__PURE__ */ createBaseVNode("td", null, null, -1);
const _hoisted_22 = ["textContent"];
const _hoisted_23 = /* @__PURE__ */ createBaseVNode("div", { class: "col-12 px-1 pt-3" }, [
  /* @__PURE__ */ createBaseVNode("h5", null, "アプリアイコン")
], -1);
const _hoisted_24 = { class: "container" };
const _hoisted_25 = { class: "row" };
const _hoisted_26 = { class: "col-6 col-lg-2 col-xxl-1" };
const _hoisted_27 = ["src"];
const _hoisted_28 = { class: "col-6 col-lg-2 col-xxl-1" };
const _hoisted_29 = /* @__PURE__ */ createBaseVNode("div", { class: "row" }, [
  /* @__PURE__ */ createBaseVNode("div", { class: "col-12 px-1 pt-3" }, [
    /* @__PURE__ */ createBaseVNode("h6", null, "画像から自動作成")
  ])
], -1);
const _hoisted_30 = { class: "row" };
const _hoisted_31 = { class: "col form-check mb-3" };
const _hoisted_32 = { class: "list-group" };
const _hoisted_33 = { class: "list-group-item" };
const _hoisted_34 = /* @__PURE__ */ createBaseVNode("label", {
  class: "form-check-label stretched-link",
  for: "rgCnvIconShape0"
}, "加工しない", -1);
const _hoisted_35 = { class: "list-group-item" };
const _hoisted_36 = /* @__PURE__ */ createBaseVNode("label", {
  class: "form-check-label stretched-link",
  for: "rgCnvIconShape1"
}, "丸に", -1);
const _hoisted_37 = { class: "list-group-item" };
const _hoisted_38 = /* @__PURE__ */ createBaseVNode("label", {
  class: "form-check-label stretched-link",
  for: "rgCnvIconShape2"
}, "角丸に", -1);
const _hoisted_39 = { class: "row" };
const _hoisted_40 = { class: "col form-check mb-3" };
const _hoisted_41 = { class: "input-group input-group-sm" };
const _hoisted_42 = ["textContent"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "StgPkg",
  setup(__props) {
    const stOInfo = useOInfo();
    const { aCnvFont } = storeToRefs(stOInfo);
    const stWss = useWss();
    const { oWss } = storeToRefs(stWss);
    const qselectIcon = {
      cmd: "selectFile",
      title: "アプリアイコン",
      openlabel: "素材画像を選択",
      path: "build/icon.png"
    };
    const selectIcon = () => cmd2Ex(qselectIcon);
    const srcIcon = ref("data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjY0MCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCIgdmlld0JveD0iMCAwIDY0MCA2NDAiIHdpZHRoPSI2NDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxwYXRoIGlkPSJhIiBkPSJtMCAzMjBjMCAxNzYuNzIgMTQzLjI4IDMyMCAzMjAgMzIwczMyMC0xNDMuMjggMzIwLTMyMC0xNDMuMjgtMzIwLTMyMC0zMjAtMzIwIDE0My4yOC0zMjAgMzIwem0yMDAgMTAwdi0yMDBoODB2MjAwem0xNjAgMHYtMjAwaDgwdjIwMHoiLz48L2RlZnM+PHBhdGggZD0ibTE0Ny40OSAxODAuNDFoMzUyLjR2MjgyLjY5aC0zNTIuNHoiIGZpbGw9IiNmZmYiLz48dXNlIGZpbGw9IiMyZTJlMmUiIHhsaW5rOmhyZWY9IiNhIi8+PHVzZSBmaWxsPSJub25lIiB4bGluazpocmVmPSIjYSIvPjwvc3ZnPg==");
    const updIconImg = (src) => srcIcon.value = src + "?" + (/* @__PURE__ */ new Date()).getTime();
    on("!", (data) => updIconImg(data.pathIcon));
    const select_icon_err = ref("");
    on("updimg", (data) => {
      updIconImg(data.pathIcon);
      select_icon_err.value = data.err_mes;
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createBaseVNode("div", _hoisted_2$1, [
          _hoisted_3$1,
          createBaseVNode("div", _hoisted_4$1, [
            _hoisted_5$1,
            createBaseVNode("button", {
              type: "button",
              id: "open.readme.txt",
              class: "btn btn-info btn-lg",
              onClick: _cache[0] || (_cache[0] = ($event) => unref(openURL)("ws-file:///build/include/readme.txt"))
            }, "Open")
          ])
        ]),
        createBaseVNode("div", _hoisted_6$1, [
          _hoisted_7,
          createBaseVNode("div", _hoisted_8, [
            withDirectives(createBaseVNode("input", {
              type: "checkbox",
              id: "cnv.font.subset",
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(oWss)["cnv.font.subset"] = $event),
              disabled: unref(hDisabled)["cnv.font.subset"],
              class: "form-check-input sn_checkbox sn-chk"
            }, null, 8, _hoisted_9), [
              [vModelCheckbox, unref(oWss)["cnv.font.subset"]]
            ]),
            _hoisted_10
          ])
        ]),
        createBaseVNode("div", _hoisted_11, [
          _hoisted_12,
          createBaseVNode("table", _hoisted_13, [
            _hoisted_14,
            createBaseVNode("tbody", null, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(aCnvFont), (e) => {
                return openBlock(), createElementBlock(Fragment, {
                  key: e.nm
                }, [
                  createBaseVNode("tr", {
                    style: normalizeStyle({ borderBottom: e.err ? "hidden" : "inherit" })
                  }, [
                    createBaseVNode("td", {
                      textContent: toDisplayString(e.nm)
                    }, null, 8, _hoisted_15),
                    createBaseVNode("td", {
                      textContent: toDisplayString(e.mes)
                    }, null, 8, _hoisted_16),
                    createBaseVNode("td", {
                      style: { "text-align": "right" },
                      textContent: toDisplayString(e.iSize.toLocaleString("ja-JP") + " byte")
                    }, null, 8, _hoisted_17),
                    createBaseVNode("td", {
                      style: { "text-align": "right" },
                      textContent: toDisplayString(e.oSize.toLocaleString("ja-JP") + " byte")
                    }, null, 8, _hoisted_18),
                    createBaseVNode("td", {
                      textContent: toDisplayString((e.oSize / e.iSize).toLocaleString("ja-JP"))
                    }, null, 8, _hoisted_19)
                  ], 4),
                  e.err ? (openBlock(), createElementBlock("tr", _hoisted_20, [
                    _hoisted_21,
                    createBaseVNode("td", {
                      textContent: toDisplayString(e.err),
                      colspan: "4",
                      style: { "color": "red" }
                    }, null, 8, _hoisted_22)
                  ])) : createCommentVNode("", true)
                ], 64);
              }), 128))
            ])
          ])
        ]),
        _hoisted_23,
        createBaseVNode("div", _hoisted_24, [
          createBaseVNode("div", _hoisted_25, [
            createBaseVNode("div", _hoisted_26, [
              createBaseVNode("img", {
                loading: "lazy",
                src: srcIcon.value,
                onClick: selectIcon,
                class: "img-fluid sn-dragdrop"
              }, null, 8, _hoisted_27)
            ]),
            createBaseVNode("div", _hoisted_28, [
              _hoisted_29,
              createBaseVNode("div", _hoisted_30, [
                createBaseVNode("div", _hoisted_31, [
                  createBaseVNode("ul", _hoisted_32, [
                    createBaseVNode("li", _hoisted_33, [
                      withDirectives(createBaseVNode("input", {
                        type: "radio",
                        class: "form-check-input",
                        name: "rgCnvIconShape",
                        value: "0",
                        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(oWss)["cnv.icon.shape"] = $event),
                        id: "rgCnvIconShape0",
                        checked: ""
                      }, null, 512), [
                        [vModelRadio, unref(oWss)["cnv.icon.shape"]]
                      ]),
                      _hoisted_34
                    ]),
                    createBaseVNode("li", _hoisted_35, [
                      withDirectives(createBaseVNode("input", {
                        type: "radio",
                        class: "form-check-input",
                        name: "rgCnvIconShape",
                        value: "1",
                        "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => unref(oWss)["cnv.icon.shape"] = $event),
                        id: "rgCnvIconShape1"
                      }, null, 512), [
                        [vModelRadio, unref(oWss)["cnv.icon.shape"]]
                      ]),
                      _hoisted_36
                    ]),
                    createBaseVNode("li", _hoisted_37, [
                      withDirectives(createBaseVNode("input", {
                        type: "radio",
                        class: "form-check-input",
                        name: "rgCnvIconShape",
                        value: "2",
                        "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => unref(oWss)["cnv.icon.shape"] = $event),
                        id: "rgCnvIconShape2"
                      }, null, 512), [
                        [vModelRadio, unref(oWss)["cnv.icon.shape"]]
                      ]),
                      _hoisted_38
                    ])
                  ])
                ])
              ]),
              createBaseVNode("div", _hoisted_39, [
                createBaseVNode("div", _hoisted_40, [
                  createBaseVNode("div", _hoisted_41, [
                    createBaseVNode("button", {
                      type: "button",
                      onClick: selectIcon,
                      class: "btn btn-info"
                    }, "ファイルを選択"),
                    withDirectives(createBaseVNode("span", {
                      class: "alert alert-danger",
                      role: "alert",
                      textContent: toDisplayString(select_icon_err.value)
                    }, null, 8, _hoisted_42), [
                      [vShow, select_icon_err.value !== ""]
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
    };
  }
});

const _hoisted_1 = {
  class: "nav nav-tabs",
  role: "tablist"
};
const _hoisted_2 = ["id", "href", "aria-controls", "aria-selected", "onClick", "textContent"];
const _hoisted_3 = {
  class: "tab-content mt-2",
  id: "nav-tabContent"
};
const _hoisted_4 = ["id", "aria-labelledby"];
const _hoisted_5 = { class: "container-fluid" };
const _hoisted_6 = { class: "row" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Setting",
  setup(__props) {
    const stVSCode = useVSCode();
    const { active_tab } = storeToRefs(stVSCode);
    const aTab = [
      { id: "basic", nm: "基本情報", cmp: _sfc_main$7 },
      { id: "app", nm: "アプリ", cmp: _sfc_main$6 },
      { id: "temp", nm: "テンプレ", cmp: _sfc_main$5 },
      { id: "debug", nm: "デバッグ", cmp: _sfc_main$4 },
      { id: "imgopt", nm: "画像最適化", cmp: _sfc_main$3 },
      { id: "sndopt", nm: "音声最適化", cmp: _sfc_main$2 },
      { id: "pkg", nm: "パッケージ", cmp: _sfc_main$1 }
    ];
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment, null, [
        createBaseVNode("nav", null, [
          createBaseVNode("div", _hoisted_1, [
            (openBlock(), createElementBlock(Fragment, null, renderList(aTab, (t) => {
              return createBaseVNode("a", {
                id: `nav-${t.id}-tab`,
                href: `#nav-${t.id}`,
                "aria-controls": `nav-${t.id}`,
                class: normalizeClass({
                  "nav-link": true,
                  active: t.id === unref(active_tab)
                }),
                "data-bs-toggle": "tab",
                role: "tab",
                "aria-selected": t.id === unref(active_tab) ? "true" : void 0,
                onClick: ($event) => active_tab.value = t.id,
                textContent: toDisplayString(t.nm)
              }, null, 10, _hoisted_2);
            }), 64))
          ])
        ]),
        createBaseVNode("div", _hoisted_3, [
          (openBlock(), createElementBlock(Fragment, null, renderList(aTab, (t) => {
            return createBaseVNode("div", {
              id: `nav-${t.id}`,
              key: t.id,
              class: normalizeClass([{
                show: t.id === unref(active_tab),
                active: t.id === unref(active_tab)
              }, "tab-pane fade"]),
              "aria-labelledby": `nav-${t.id}-tab`,
              role: "tabpanel"
            }, [
              createBaseVNode("div", _hoisted_5, [
                createBaseVNode("div", _hoisted_6, [
                  (openBlock(), createBlock(resolveDynamicComponent(t.cmp)))
                ])
              ])
            ], 10, _hoisted_4);
          }), 64))
        ])
      ], 64);
    };
  }
});

createApp(_sfc_main).use(createPinia()).mount("#app");
