/**
* @vue/shared v3.5.12
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function makeMap(str) {
  const map = /* @__PURE__ */ Object.create(null);
  for (const key of str.split(",")) map[key] = 1;
  return (val) => val in map;
}
const EMPTY_OBJ = {};
const EMPTY_ARR = [];
const NOOP = () => {
};
const NO = () => false;
const isOn = (key) => key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110 && // uppercase letter
(key.charCodeAt(2) > 122 || key.charCodeAt(2) < 97);
const isModelListener = (key) => key.startsWith("onUpdate:");
const extend = Object.assign;
const remove = (arr, el) => {
  const i = arr.indexOf(el);
  if (i > -1) {
    arr.splice(i, 1);
  }
};
const hasOwnProperty$1 = Object.prototype.hasOwnProperty;
const hasOwn = (val, key) => hasOwnProperty$1.call(val, key);
const isArray$1 = Array.isArray;
const isMap$1 = (val) => toTypeString(val) === "[object Map]";
const isSet$1 = (val) => toTypeString(val) === "[object Set]";
const isDate$2 = (val) => toTypeString(val) === "[object Date]";
const isFunction = (val) => typeof val === "function";
const isString$1 = (val) => typeof val === "string";
const isSymbol$1 = (val) => typeof val === "symbol";
const isObject$1 = (val) => val !== null && typeof val === "object";
const isPromise = (val) => {
  return (isObject$1(val) || isFunction(val)) && isFunction(val.then) && isFunction(val.catch);
};
const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);
const toRawType = (value) => {
  return toTypeString(value).slice(8, -1);
};
const isPlainObject$2 = (val) => toTypeString(val) === "[object Object]";
const isIntegerKey = (key) => isString$1(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
const isReservedProp = /* @__PURE__ */ makeMap(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
);
const cacheStringFunction = (fn) => {
  const cache = /* @__PURE__ */ Object.create(null);
  return (str) => {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  };
};
const camelizeRE = /-(\w)/g;
const camelize = cacheStringFunction(
  (str) => {
    return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "");
  }
);
const hyphenateRE = /\B([A-Z])/g;
const hyphenate = cacheStringFunction(
  (str) => str.replace(hyphenateRE, "-$1").toLowerCase()
);
const capitalize = cacheStringFunction((str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
});
const toHandlerKey = cacheStringFunction(
  (str) => {
    const s = str ? `on${capitalize(str)}` : ``;
    return s;
  }
);
const hasChanged = (value, oldValue) => !Object.is(value, oldValue);
const invokeArrayFns = (fns, ...arg) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](...arg);
  }
};
const def = (obj, key, value, writable = false) => {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: false,
    writable,
    value
  });
};
const looseToNumber = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? val : n;
};
let _globalThis;
const getGlobalThis = () => {
  return _globalThis || (_globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
};
function normalizeStyle(value) {
  if (isArray$1(value)) {
    const res = {};
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const normalized = isString$1(item) ? parseStringStyle(item) : normalizeStyle(item);
      if (normalized) {
        for (const key in normalized) {
          res[key] = normalized[key];
        }
      }
    }
    return res;
  } else if (isString$1(value) || isObject$1(value)) {
    return value;
  }
}
const listDelimiterRE = /;(?![^(]*\))/g;
const propertyDelimiterRE = /:([^]+)/;
const styleCommentRE = /\/\*[^]*?\*\//g;
function parseStringStyle(cssText) {
  const ret = {};
  cssText.replace(styleCommentRE, "").split(listDelimiterRE).forEach((item) => {
    if (item) {
      const tmp = item.split(propertyDelimiterRE);
      tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim());
    }
  });
  return ret;
}
function normalizeClass(value) {
  let res = "";
  if (isString$1(value)) {
    res = value;
  } else if (isArray$1(value)) {
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeClass(value[i]);
      if (normalized) {
        res += normalized + " ";
      }
    }
  } else if (isObject$1(value)) {
    for (const name in value) {
      if (value[name]) {
        res += name + " ";
      }
    }
  }
  return res.trim();
}
const specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`;
const isSpecialBooleanAttr = /* @__PURE__ */ makeMap(specialBooleanAttrs);
function includeBooleanAttr(value) {
  return !!value || value === "";
}
function looseCompareArrays(a, b) {
  if (a.length !== b.length) return false;
  let equal = true;
  for (let i = 0; equal && i < a.length; i++) {
    equal = looseEqual(a[i], b[i]);
  }
  return equal;
}
function looseEqual(a, b) {
  if (a === b) return true;
  let aValidType = isDate$2(a);
  let bValidType = isDate$2(b);
  if (aValidType || bValidType) {
    return aValidType && bValidType ? a.getTime() === b.getTime() : false;
  }
  aValidType = isSymbol$1(a);
  bValidType = isSymbol$1(b);
  if (aValidType || bValidType) {
    return a === b;
  }
  aValidType = isArray$1(a);
  bValidType = isArray$1(b);
  if (aValidType || bValidType) {
    return aValidType && bValidType ? looseCompareArrays(a, b) : false;
  }
  aValidType = isObject$1(a);
  bValidType = isObject$1(b);
  if (aValidType || bValidType) {
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
      if (aHasKey && !bHasKey || !aHasKey && bHasKey || !looseEqual(a[key], b[key])) {
        return false;
      }
    }
  }
  return String(a) === String(b);
}
function looseIndexOf(arr, val) {
  return arr.findIndex((item) => looseEqual(item, val));
}
const isRef$2 = (val) => {
  return !!(val && val["__v_isRef"] === true);
};
const toDisplayString = (val) => {
  return isString$1(val) ? val : val == null ? "" : isArray$1(val) || isObject$1(val) && (val.toString === objectToString || !isFunction(val.toString)) ? isRef$2(val) ? toDisplayString(val.value) : JSON.stringify(val, replacer, 2) : String(val);
};
const replacer = (_key, val) => {
  if (isRef$2(val)) {
    return replacer(_key, val.value);
  } else if (isMap$1(val)) {
    return {
      [`Map(${val.size})`]: [...val.entries()].reduce(
        (entries, [key, val2], i) => {
          entries[stringifySymbol(key, i) + " =>"] = val2;
          return entries;
        },
        {}
      )
    };
  } else if (isSet$1(val)) {
    return {
      [`Set(${val.size})`]: [...val.values()].map((v) => stringifySymbol(v))
    };
  } else if (isSymbol$1(val)) {
    return stringifySymbol(val);
  } else if (isObject$1(val) && !isArray$1(val) && !isPlainObject$2(val)) {
    return String(val);
  }
  return val;
};
const stringifySymbol = (v, i = "") => {
  var _a;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    isSymbol$1(v) ? `Symbol(${(_a = v.description) != null ? _a : i})` : v
  );
};

/**
* @vue/reactivity v3.5.12
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
let activeEffectScope;
class EffectScope {
  constructor(detached = false) {
    this.detached = detached;
    this._active = true;
    this.effects = [];
    this.cleanups = [];
    this._isPaused = false;
    this.parent = activeEffectScope;
    if (!detached && activeEffectScope) {
      this.index = (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(
        this
      ) - 1;
    }
  }
  get active() {
    return this._active;
  }
  pause() {
    if (this._active) {
      this._isPaused = true;
      let i, l;
      if (this.scopes) {
        for (i = 0, l = this.scopes.length; i < l; i++) {
          this.scopes[i].pause();
        }
      }
      for (i = 0, l = this.effects.length; i < l; i++) {
        this.effects[i].pause();
      }
    }
  }
  /**
   * Resumes the effect scope, including all child scopes and effects.
   */
  resume() {
    if (this._active) {
      if (this._isPaused) {
        this._isPaused = false;
        let i, l;
        if (this.scopes) {
          for (i = 0, l = this.scopes.length; i < l; i++) {
            this.scopes[i].resume();
          }
        }
        for (i = 0, l = this.effects.length; i < l; i++) {
          this.effects[i].resume();
        }
      }
    }
  }
  run(fn) {
    if (this._active) {
      const currentEffectScope = activeEffectScope;
      try {
        activeEffectScope = this;
        return fn();
      } finally {
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
      if (!this.detached && this.parent && !fromParent) {
        const last = this.parent.scopes.pop();
        if (last && last !== this) {
          this.parent.scopes[this.index] = last;
          last.index = this.index;
        }
      }
      this.parent = void 0;
      this._active = false;
    }
  }
}
function effectScope(detached) {
  return new EffectScope(detached);
}
function getCurrentScope() {
  return activeEffectScope;
}
function onScopeDispose(fn, failSilently = false) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn);
  }
}
let activeSub;
const pausedQueueEffects = /* @__PURE__ */ new WeakSet();
class ReactiveEffect {
  constructor(fn) {
    this.fn = fn;
    this.deps = void 0;
    this.depsTail = void 0;
    this.flags = 1 | 4;
    this.next = void 0;
    this.cleanup = void 0;
    this.scheduler = void 0;
    if (activeEffectScope && activeEffectScope.active) {
      activeEffectScope.effects.push(this);
    }
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    if (this.flags & 64) {
      this.flags &= ~64;
      if (pausedQueueEffects.has(this)) {
        pausedQueueEffects.delete(this);
        this.trigger();
      }
    }
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags & 2 && !(this.flags & 32)) {
      return;
    }
    if (!(this.flags & 8)) {
      batch(this);
    }
  }
  run() {
    if (!(this.flags & 1)) {
      return this.fn();
    }
    this.flags |= 2;
    cleanupEffect(this);
    prepareDeps(this);
    const prevEffect = activeSub;
    const prevShouldTrack = shouldTrack;
    activeSub = this;
    shouldTrack = true;
    try {
      return this.fn();
    } finally {
      cleanupDeps(this);
      activeSub = prevEffect;
      shouldTrack = prevShouldTrack;
      this.flags &= ~2;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let link = this.deps; link; link = link.nextDep) {
        removeSub(link);
      }
      this.deps = this.depsTail = void 0;
      cleanupEffect(this);
      this.onStop && this.onStop();
      this.flags &= ~1;
    }
  }
  trigger() {
    if (this.flags & 64) {
      pausedQueueEffects.add(this);
    } else if (this.scheduler) {
      this.scheduler();
    } else {
      this.runIfDirty();
    }
  }
  /**
   * @internal
   */
  runIfDirty() {
    if (isDirty(this)) {
      this.run();
    }
  }
  get dirty() {
    return isDirty(this);
  }
}
let batchDepth = 0;
let batchedSub;
let batchedComputed;
function batch(sub, isComputed = false) {
  sub.flags |= 8;
  if (isComputed) {
    sub.next = batchedComputed;
    batchedComputed = sub;
    return;
  }
  sub.next = batchedSub;
  batchedSub = sub;
}
function startBatch() {
  batchDepth++;
}
function endBatch() {
  if (--batchDepth > 0) {
    return;
  }
  if (batchedComputed) {
    let e = batchedComputed;
    batchedComputed = void 0;
    while (e) {
      const next = e.next;
      e.next = void 0;
      e.flags &= ~8;
      e = next;
    }
  }
  let error;
  while (batchedSub) {
    let e = batchedSub;
    batchedSub = void 0;
    while (e) {
      const next = e.next;
      e.next = void 0;
      e.flags &= ~8;
      if (e.flags & 1) {
        try {
          ;
          e.trigger();
        } catch (err) {
          if (!error) error = err;
        }
      }
      e = next;
    }
  }
  if (error) throw error;
}
function prepareDeps(sub) {
  for (let link = sub.deps; link; link = link.nextDep) {
    link.version = -1;
    link.prevActiveLink = link.dep.activeLink;
    link.dep.activeLink = link;
  }
}
function cleanupDeps(sub) {
  let head;
  let tail = sub.depsTail;
  let link = tail;
  while (link) {
    const prev = link.prevDep;
    if (link.version === -1) {
      if (link === tail) tail = prev;
      removeSub(link);
      removeDep(link);
    } else {
      head = link;
    }
    link.dep.activeLink = link.prevActiveLink;
    link.prevActiveLink = void 0;
    link = prev;
  }
  sub.deps = head;
  sub.depsTail = tail;
}
function isDirty(sub) {
  for (let link = sub.deps; link; link = link.nextDep) {
    if (link.dep.version !== link.version || link.dep.computed && (refreshComputed(link.dep.computed) || link.dep.version !== link.version)) {
      return true;
    }
  }
  if (sub._dirty) {
    return true;
  }
  return false;
}
function refreshComputed(computed2) {
  if (computed2.flags & 4 && !(computed2.flags & 16)) {
    return;
  }
  computed2.flags &= ~16;
  if (computed2.globalVersion === globalVersion) {
    return;
  }
  computed2.globalVersion = globalVersion;
  const dep = computed2.dep;
  computed2.flags |= 2;
  if (dep.version > 0 && !computed2.isSSR && computed2.deps && !isDirty(computed2)) {
    computed2.flags &= ~2;
    return;
  }
  const prevSub = activeSub;
  const prevShouldTrack = shouldTrack;
  activeSub = computed2;
  shouldTrack = true;
  try {
    prepareDeps(computed2);
    const value = computed2.fn(computed2._value);
    if (dep.version === 0 || hasChanged(value, computed2._value)) {
      computed2._value = value;
      dep.version++;
    }
  } catch (err) {
    dep.version++;
    throw err;
  } finally {
    activeSub = prevSub;
    shouldTrack = prevShouldTrack;
    cleanupDeps(computed2);
    computed2.flags &= ~2;
  }
}
function removeSub(link, soft = false) {
  const { dep, prevSub, nextSub } = link;
  if (prevSub) {
    prevSub.nextSub = nextSub;
    link.prevSub = void 0;
  }
  if (nextSub) {
    nextSub.prevSub = prevSub;
    link.nextSub = void 0;
  }
  if (dep.subs === link) {
    dep.subs = prevSub;
    if (!prevSub && dep.computed) {
      dep.computed.flags &= ~4;
      for (let l = dep.computed.deps; l; l = l.nextDep) {
        removeSub(l, true);
      }
    }
  }
  if (!soft && !--dep.sc && dep.map) {
    dep.map.delete(dep.key);
  }
}
function removeDep(link) {
  const { prevDep, nextDep } = link;
  if (prevDep) {
    prevDep.nextDep = nextDep;
    link.prevDep = void 0;
  }
  if (nextDep) {
    nextDep.prevDep = prevDep;
    link.nextDep = void 0;
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
  shouldTrack = last === void 0 ? true : last;
}
function cleanupEffect(e) {
  const { cleanup } = e;
  e.cleanup = void 0;
  if (cleanup) {
    const prevSub = activeSub;
    activeSub = void 0;
    try {
      cleanup();
    } finally {
      activeSub = prevSub;
    }
  }
}
let globalVersion = 0;
class Link {
  constructor(sub, dep) {
    this.sub = sub;
    this.dep = dep;
    this.version = dep.version;
    this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class Dep {
  constructor(computed2) {
    this.computed = computed2;
    this.version = 0;
    this.activeLink = void 0;
    this.subs = void 0;
    this.map = void 0;
    this.key = void 0;
    this.sc = 0;
  }
  track(debugInfo) {
    if (!activeSub || !shouldTrack || activeSub === this.computed) {
      return;
    }
    let link = this.activeLink;
    if (link === void 0 || link.sub !== activeSub) {
      link = this.activeLink = new Link(activeSub, this);
      if (!activeSub.deps) {
        activeSub.deps = activeSub.depsTail = link;
      } else {
        link.prevDep = activeSub.depsTail;
        activeSub.depsTail.nextDep = link;
        activeSub.depsTail = link;
      }
      addSub(link);
    } else if (link.version === -1) {
      link.version = this.version;
      if (link.nextDep) {
        const next = link.nextDep;
        next.prevDep = link.prevDep;
        if (link.prevDep) {
          link.prevDep.nextDep = next;
        }
        link.prevDep = activeSub.depsTail;
        link.nextDep = void 0;
        activeSub.depsTail.nextDep = link;
        activeSub.depsTail = link;
        if (activeSub.deps === link) {
          activeSub.deps = next;
        }
      }
    }
    return link;
  }
  trigger(debugInfo) {
    this.version++;
    globalVersion++;
    this.notify(debugInfo);
  }
  notify(debugInfo) {
    startBatch();
    try {
      if (false) ;
      for (let link = this.subs; link; link = link.prevSub) {
        if (link.sub.notify()) {
          ;
          link.sub.dep.notify();
        }
      }
    } finally {
      endBatch();
    }
  }
}
function addSub(link) {
  link.dep.sc++;
  if (link.sub.flags & 4) {
    const computed2 = link.dep.computed;
    if (computed2 && !link.dep.subs) {
      computed2.flags |= 4 | 16;
      for (let l = computed2.deps; l; l = l.nextDep) {
        addSub(l);
      }
    }
    const currentTail = link.dep.subs;
    if (currentTail !== link) {
      link.prevSub = currentTail;
      if (currentTail) currentTail.nextSub = link;
    }
    link.dep.subs = link;
  }
}
const targetMap = /* @__PURE__ */ new WeakMap();
const ITERATE_KEY = Symbol(
  ""
);
const MAP_KEY_ITERATE_KEY = Symbol(
  ""
);
const ARRAY_ITERATE_KEY = Symbol(
  ""
);
function track(target, type, key) {
  if (shouldTrack && activeSub) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, dep = new Dep());
      dep.map = depsMap;
      dep.key = key;
    }
    {
      dep.track();
    }
  }
}
function trigger(target, type, key, newValue, oldValue, oldTarget) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    globalVersion++;
    return;
  }
  const run = (dep) => {
    if (dep) {
      {
        dep.trigger();
      }
    }
  };
  startBatch();
  if (type === "clear") {
    depsMap.forEach(run);
  } else {
    const targetIsArray = isArray$1(target);
    const isArrayIndex = targetIsArray && isIntegerKey(key);
    if (targetIsArray && key === "length") {
      const newLength = Number(newValue);
      depsMap.forEach((dep, key2) => {
        if (key2 === "length" || key2 === ARRAY_ITERATE_KEY || !isSymbol$1(key2) && key2 >= newLength) {
          run(dep);
        }
      });
    } else {
      if (key !== void 0 || depsMap.has(void 0)) {
        run(depsMap.get(key));
      }
      if (isArrayIndex) {
        run(depsMap.get(ARRAY_ITERATE_KEY));
      }
      switch (type) {
        case "add":
          if (!targetIsArray) {
            run(depsMap.get(ITERATE_KEY));
            if (isMap$1(target)) {
              run(depsMap.get(MAP_KEY_ITERATE_KEY));
            }
          } else if (isArrayIndex) {
            run(depsMap.get("length"));
          }
          break;
        case "delete":
          if (!targetIsArray) {
            run(depsMap.get(ITERATE_KEY));
            if (isMap$1(target)) {
              run(depsMap.get(MAP_KEY_ITERATE_KEY));
            }
          }
          break;
        case "set":
          if (isMap$1(target)) {
            run(depsMap.get(ITERATE_KEY));
          }
          break;
      }
    }
  }
  endBatch();
}
function getDepFromReactive(object, key) {
  const depMap = targetMap.get(object);
  return depMap && depMap.get(key);
}
function reactiveReadArray(array) {
  const raw = toRaw$1(array);
  if (raw === array) return raw;
  track(raw, "iterate", ARRAY_ITERATE_KEY);
  return isShallow(array) ? raw : raw.map(toReactive);
}
function shallowReadArray(arr) {
  track(arr = toRaw$1(arr), "iterate", ARRAY_ITERATE_KEY);
  return arr;
}
const arrayInstrumentations = {
  __proto__: null,
  [Symbol.iterator]() {
    return iterator(this, Symbol.iterator, toReactive);
  },
  concat(...args) {
    return reactiveReadArray(this).concat(
      ...args.map((x) => isArray$1(x) ? reactiveReadArray(x) : x)
    );
  },
  entries() {
    return iterator(this, "entries", (value) => {
      value[1] = toReactive(value[1]);
      return value;
    });
  },
  every(fn, thisArg) {
    return apply(this, "every", fn, thisArg, void 0, arguments);
  },
  filter(fn, thisArg) {
    return apply(this, "filter", fn, thisArg, (v) => v.map(toReactive), arguments);
  },
  find(fn, thisArg) {
    return apply(this, "find", fn, thisArg, toReactive, arguments);
  },
  findIndex(fn, thisArg) {
    return apply(this, "findIndex", fn, thisArg, void 0, arguments);
  },
  findLast(fn, thisArg) {
    return apply(this, "findLast", fn, thisArg, toReactive, arguments);
  },
  findLastIndex(fn, thisArg) {
    return apply(this, "findLastIndex", fn, thisArg, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(fn, thisArg) {
    return apply(this, "forEach", fn, thisArg, void 0, arguments);
  },
  includes(...args) {
    return searchProxy(this, "includes", args);
  },
  indexOf(...args) {
    return searchProxy(this, "indexOf", args);
  },
  join(separator) {
    return reactiveReadArray(this).join(separator);
  },
  // keys() iterator only reads `length`, no optimisation required
  lastIndexOf(...args) {
    return searchProxy(this, "lastIndexOf", args);
  },
  map(fn, thisArg) {
    return apply(this, "map", fn, thisArg, void 0, arguments);
  },
  pop() {
    return noTracking(this, "pop");
  },
  push(...args) {
    return noTracking(this, "push", args);
  },
  reduce(fn, ...args) {
    return reduce(this, "reduce", fn, args);
  },
  reduceRight(fn, ...args) {
    return reduce(this, "reduceRight", fn, args);
  },
  shift() {
    return noTracking(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(fn, thisArg) {
    return apply(this, "some", fn, thisArg, void 0, arguments);
  },
  splice(...args) {
    return noTracking(this, "splice", args);
  },
  toReversed() {
    return reactiveReadArray(this).toReversed();
  },
  toSorted(comparer) {
    return reactiveReadArray(this).toSorted(comparer);
  },
  toSpliced(...args) {
    return reactiveReadArray(this).toSpliced(...args);
  },
  unshift(...args) {
    return noTracking(this, "unshift", args);
  },
  values() {
    return iterator(this, "values", toReactive);
  }
};
function iterator(self, method, wrapValue) {
  const arr = shallowReadArray(self);
  const iter = arr[method]();
  if (arr !== self && !isShallow(self)) {
    iter._next = iter.next;
    iter.next = () => {
      const result = iter._next();
      if (result.value) {
        result.value = wrapValue(result.value);
      }
      return result;
    };
  }
  return iter;
}
const arrayProto = Array.prototype;
function apply(self, method, fn, thisArg, wrappedRetFn, args) {
  const arr = shallowReadArray(self);
  const needsWrap = arr !== self && !isShallow(self);
  const methodFn = arr[method];
  if (methodFn !== arrayProto[method]) {
    const result2 = methodFn.apply(self, args);
    return needsWrap ? toReactive(result2) : result2;
  }
  let wrappedFn = fn;
  if (arr !== self) {
    if (needsWrap) {
      wrappedFn = function(item, index) {
        return fn.call(this, toReactive(item), index, self);
      };
    } else if (fn.length > 2) {
      wrappedFn = function(item, index) {
        return fn.call(this, item, index, self);
      };
    }
  }
  const result = methodFn.call(arr, wrappedFn, thisArg);
  return needsWrap && wrappedRetFn ? wrappedRetFn(result) : result;
}
function reduce(self, method, fn, args) {
  const arr = shallowReadArray(self);
  let wrappedFn = fn;
  if (arr !== self) {
    if (!isShallow(self)) {
      wrappedFn = function(acc, item, index) {
        return fn.call(this, acc, toReactive(item), index, self);
      };
    } else if (fn.length > 3) {
      wrappedFn = function(acc, item, index) {
        return fn.call(this, acc, item, index, self);
      };
    }
  }
  return arr[method](wrappedFn, ...args);
}
function searchProxy(self, method, args) {
  const arr = toRaw$1(self);
  track(arr, "iterate", ARRAY_ITERATE_KEY);
  const res = arr[method](...args);
  if ((res === -1 || res === false) && isProxy(args[0])) {
    args[0] = toRaw$1(args[0]);
    return arr[method](...args);
  }
  return res;
}
function noTracking(self, method, args = []) {
  pauseTracking();
  startBatch();
  const res = toRaw$1(self)[method].apply(self, args);
  endBatch();
  resetTracking();
  return res;
}
const isNonTrackableKeys = /* @__PURE__ */ makeMap(`__proto__,__v_isRef,__isVue`);
const builtInSymbols = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((key) => key !== "arguments" && key !== "caller").map((key) => Symbol[key]).filter(isSymbol$1)
);
function hasOwnProperty(key) {
  if (!isSymbol$1(key)) key = String(key);
  const obj = toRaw$1(this);
  track(obj, "has", key);
  return obj.hasOwnProperty(key);
}
class BaseReactiveHandler {
  constructor(_isReadonly = false, _isShallow = false) {
    this._isReadonly = _isReadonly;
    this._isShallow = _isShallow;
  }
  get(target, key, receiver) {
    const isReadonly2 = this._isReadonly, isShallow2 = this._isShallow;
    if (key === "__v_isReactive") {
      return !isReadonly2;
    } else if (key === "__v_isReadonly") {
      return isReadonly2;
    } else if (key === "__v_isShallow") {
      return isShallow2;
    } else if (key === "__v_raw") {
      if (receiver === (isReadonly2 ? isShallow2 ? shallowReadonlyMap : readonlyMap : isShallow2 ? shallowReactiveMap : reactiveMap).get(target) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)) {
        return target;
      }
      return;
    }
    const targetIsArray = isArray$1(target);
    if (!isReadonly2) {
      let fn;
      if (targetIsArray && (fn = arrayInstrumentations[key])) {
        return fn;
      }
      if (key === "hasOwnProperty") {
        return hasOwnProperty;
      }
    }
    const res = Reflect.get(
      target,
      key,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      isRef$1(target) ? target : receiver
    );
    if (isSymbol$1(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res;
    }
    if (!isReadonly2) {
      track(target, "get", key);
    }
    if (isShallow2) {
      return res;
    }
    if (isRef$1(res)) {
      return targetIsArray && isIntegerKey(key) ? res : res.value;
    }
    if (isObject$1(res)) {
      return isReadonly2 ? readonly(res) : reactive(res);
    }
    return res;
  }
}
class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow2 = false) {
    super(false, isShallow2);
  }
  set(target, key, value, receiver) {
    let oldValue = target[key];
    if (!this._isShallow) {
      const isOldValueReadonly = isReadonly$1(oldValue);
      if (!isShallow(value) && !isReadonly$1(value)) {
        oldValue = toRaw$1(oldValue);
        value = toRaw$1(value);
      }
      if (!isArray$1(target) && isRef$1(oldValue) && !isRef$1(value)) {
        if (isOldValueReadonly) {
          return false;
        } else {
          oldValue.value = value;
          return true;
        }
      }
    }
    const hadKey = isArray$1(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
    const result = Reflect.set(
      target,
      key,
      value,
      isRef$1(target) ? target : receiver
    );
    if (target === toRaw$1(receiver)) {
      if (!hadKey) {
        trigger(target, "add", key, value);
      } else if (hasChanged(value, oldValue)) {
        trigger(target, "set", key, value);
      }
    }
    return result;
  }
  deleteProperty(target, key) {
    const hadKey = hasOwn(target, key);
    target[key];
    const result = Reflect.deleteProperty(target, key);
    if (result && hadKey) {
      trigger(target, "delete", key, void 0);
    }
    return result;
  }
  has(target, key) {
    const result = Reflect.has(target, key);
    if (!isSymbol$1(key) || !builtInSymbols.has(key)) {
      track(target, "has", key);
    }
    return result;
  }
  ownKeys(target) {
    track(
      target,
      "iterate",
      isArray$1(target) ? "length" : ITERATE_KEY
    );
    return Reflect.ownKeys(target);
  }
}
class ReadonlyReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow2 = false) {
    super(true, isShallow2);
  }
  set(target, key) {
    return true;
  }
  deleteProperty(target, key) {
    return true;
  }
}
const mutableHandlers = /* @__PURE__ */ new MutableReactiveHandler();
const readonlyHandlers = /* @__PURE__ */ new ReadonlyReactiveHandler();
const shallowReactiveHandlers = /* @__PURE__ */ new MutableReactiveHandler(true);
const shallowReadonlyHandlers = /* @__PURE__ */ new ReadonlyReactiveHandler(true);
const toShallow = (value) => value;
const getProto = (v) => Reflect.getPrototypeOf(v);
function createIterableMethod(method, isReadonly2, isShallow2) {
  return function(...args) {
    const target = this["__v_raw"];
    const rawTarget = toRaw$1(target);
    const targetIsMap = isMap$1(rawTarget);
    const isPair = method === "entries" || method === Symbol.iterator && targetIsMap;
    const isKeyOnly = method === "keys" && targetIsMap;
    const innerIterator = target[method](...args);
    const wrap = isShallow2 ? toShallow : isReadonly2 ? toReadonly : toReactive;
    !isReadonly2 && track(
      rawTarget,
      "iterate",
      isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
    );
    return {
      // iterator protocol
      next() {
        const { value, done } = innerIterator.next();
        return done ? { value, done } : {
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
  return function(...args) {
    return type === "delete" ? false : type === "clear" ? void 0 : this;
  };
}
function createInstrumentations(readonly2, shallow) {
  const instrumentations = {
    get(key) {
      const target = this["__v_raw"];
      const rawTarget = toRaw$1(target);
      const rawKey = toRaw$1(key);
      if (!readonly2) {
        if (hasChanged(key, rawKey)) {
          track(rawTarget, "get", key);
        }
        track(rawTarget, "get", rawKey);
      }
      const { has } = getProto(rawTarget);
      const wrap = shallow ? toShallow : readonly2 ? toReadonly : toReactive;
      if (has.call(rawTarget, key)) {
        return wrap(target.get(key));
      } else if (has.call(rawTarget, rawKey)) {
        return wrap(target.get(rawKey));
      } else if (target !== rawTarget) {
        target.get(key);
      }
    },
    get size() {
      const target = this["__v_raw"];
      !readonly2 && track(toRaw$1(target), "iterate", ITERATE_KEY);
      return Reflect.get(target, "size", target);
    },
    has(key) {
      const target = this["__v_raw"];
      const rawTarget = toRaw$1(target);
      const rawKey = toRaw$1(key);
      if (!readonly2) {
        if (hasChanged(key, rawKey)) {
          track(rawTarget, "has", key);
        }
        track(rawTarget, "has", rawKey);
      }
      return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
    },
    forEach(callback, thisArg) {
      const observed = this;
      const target = observed["__v_raw"];
      const rawTarget = toRaw$1(target);
      const wrap = shallow ? toShallow : readonly2 ? toReadonly : toReactive;
      !readonly2 && track(rawTarget, "iterate", ITERATE_KEY);
      return target.forEach((value, key) => {
        return callback.call(thisArg, wrap(value), wrap(key), observed);
      });
    }
  };
  extend(
    instrumentations,
    readonly2 ? {
      add: createReadonlyMethod("add"),
      set: createReadonlyMethod("set"),
      delete: createReadonlyMethod("delete"),
      clear: createReadonlyMethod("clear")
    } : {
      add(value) {
        if (!shallow && !isShallow(value) && !isReadonly$1(value)) {
          value = toRaw$1(value);
        }
        const target = toRaw$1(this);
        const proto = getProto(target);
        const hadKey = proto.has.call(target, value);
        if (!hadKey) {
          target.add(value);
          trigger(target, "add", value, value);
        }
        return this;
      },
      set(key, value) {
        if (!shallow && !isShallow(value) && !isReadonly$1(value)) {
          value = toRaw$1(value);
        }
        const target = toRaw$1(this);
        const { has, get } = getProto(target);
        let hadKey = has.call(target, key);
        if (!hadKey) {
          key = toRaw$1(key);
          hadKey = has.call(target, key);
        }
        const oldValue = get.call(target, key);
        target.set(key, value);
        if (!hadKey) {
          trigger(target, "add", key, value);
        } else if (hasChanged(value, oldValue)) {
          trigger(target, "set", key, value);
        }
        return this;
      },
      delete(key) {
        const target = toRaw$1(this);
        const { has, get } = getProto(target);
        let hadKey = has.call(target, key);
        if (!hadKey) {
          key = toRaw$1(key);
          hadKey = has.call(target, key);
        }
        get ? get.call(target, key) : void 0;
        const result = target.delete(key);
        if (hadKey) {
          trigger(target, "delete", key, void 0);
        }
        return result;
      },
      clear() {
        const target = toRaw$1(this);
        const hadItems = target.size !== 0;
        const result = target.clear();
        if (hadItems) {
          trigger(
            target,
            "clear",
            void 0,
            void 0);
        }
        return result;
      }
    }
  );
  const iteratorMethods = [
    "keys",
    "values",
    "entries",
    Symbol.iterator
  ];
  iteratorMethods.forEach((method) => {
    instrumentations[method] = createIterableMethod(method, readonly2, shallow);
  });
  return instrumentations;
}
function createInstrumentationGetter(isReadonly2, shallow) {
  const instrumentations = createInstrumentations(isReadonly2, shallow);
  return (target, key, receiver) => {
    if (key === "__v_isReactive") {
      return !isReadonly2;
    } else if (key === "__v_isReadonly") {
      return isReadonly2;
    } else if (key === "__v_raw") {
      return target;
    }
    return Reflect.get(
      hasOwn(instrumentations, key) && key in target ? instrumentations : target,
      key,
      receiver
    );
  };
}
const mutableCollectionHandlers = {
  get: /* @__PURE__ */ createInstrumentationGetter(false, false)
};
const shallowCollectionHandlers = {
  get: /* @__PURE__ */ createInstrumentationGetter(false, true)
};
const readonlyCollectionHandlers = {
  get: /* @__PURE__ */ createInstrumentationGetter(true, false)
};
const shallowReadonlyCollectionHandlers = {
  get: /* @__PURE__ */ createInstrumentationGetter(true, true)
};
const reactiveMap = /* @__PURE__ */ new WeakMap();
const shallowReactiveMap = /* @__PURE__ */ new WeakMap();
const readonlyMap = /* @__PURE__ */ new WeakMap();
const shallowReadonlyMap = /* @__PURE__ */ new WeakMap();
function targetTypeMap(rawType) {
  switch (rawType) {
    case "Object":
    case "Array":
      return 1;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return 2;
    default:
      return 0;
  }
}
function getTargetType(value) {
  return value["__v_skip"] || !Object.isExtensible(value) ? 0 : targetTypeMap(toRawType(value));
}
function reactive(target) {
  if (isReadonly$1(target)) {
    return target;
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  );
}
function shallowReactive(target) {
  return createReactiveObject(
    target,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  );
}
function readonly(target) {
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  );
}
function shallowReadonly(target) {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap
  );
}
function createReactiveObject(target, isReadonly2, baseHandlers, collectionHandlers, proxyMap) {
  if (!isObject$1(target)) {
    return target;
  }
  if (target["__v_raw"] && !(isReadonly2 && target["__v_isReactive"])) {
    return target;
  }
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  const targetType = getTargetType(target);
  if (targetType === 0) {
    return target;
  }
  const proxy = new Proxy(
    target,
    targetType === 2 ? collectionHandlers : baseHandlers
  );
  proxyMap.set(target, proxy);
  return proxy;
}
function isReactive$1(value) {
  if (isReadonly$1(value)) {
    return isReactive$1(value["__v_raw"]);
  }
  return !!(value && value["__v_isReactive"]);
}
function isReadonly$1(value) {
  return !!(value && value["__v_isReadonly"]);
}
function isShallow(value) {
  return !!(value && value["__v_isShallow"]);
}
function isProxy(value) {
  return value ? !!value["__v_raw"] : false;
}
function toRaw$1(observed) {
  const raw = observed && observed["__v_raw"];
  return raw ? toRaw$1(raw) : observed;
}
function markRaw(value) {
  if (!hasOwn(value, "__v_skip") && Object.isExtensible(value)) {
    def(value, "__v_skip", true);
  }
  return value;
}
const toReactive = (value) => isObject$1(value) ? reactive(value) : value;
const toReadonly = (value) => isObject$1(value) ? readonly(value) : value;
function isRef$1(r) {
  return r ? r["__v_isRef"] === true : false;
}
function ref(value) {
  return createRef(value, false);
}
function shallowRef(value) {
  return createRef(value, true);
}
function createRef(rawValue, shallow) {
  if (isRef$1(rawValue)) {
    return rawValue;
  }
  return new RefImpl(rawValue, shallow);
}
class RefImpl {
  constructor(value, isShallow2) {
    this.dep = new Dep();
    this["__v_isRef"] = true;
    this["__v_isShallow"] = false;
    this._rawValue = isShallow2 ? value : toRaw$1(value);
    this._value = isShallow2 ? value : toReactive(value);
    this["__v_isShallow"] = isShallow2;
  }
  get value() {
    {
      this.dep.track();
    }
    return this._value;
  }
  set value(newValue) {
    const oldValue = this._rawValue;
    const useDirectValue = this["__v_isShallow"] || isShallow(newValue) || isReadonly$1(newValue);
    newValue = useDirectValue ? newValue : toRaw$1(newValue);
    if (hasChanged(newValue, oldValue)) {
      this._rawValue = newValue;
      this._value = useDirectValue ? newValue : toReactive(newValue);
      {
        this.dep.trigger();
      }
    }
  }
}
function unref(ref2) {
  return isRef$1(ref2) ? ref2.value : ref2;
}
function toValue(source) {
  return isFunction(source) ? source() : unref(source);
}
const shallowUnwrapHandlers = {
  get: (target, key, receiver) => key === "__v_raw" ? target : unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key];
    if (isRef$1(oldValue) && !isRef$1(value)) {
      oldValue.value = value;
      return true;
    } else {
      return Reflect.set(target, key, value, receiver);
    }
  }
};
function proxyRefs(objectWithRefs) {
  return isReactive$1(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
function toRefs(object) {
  const ret = isArray$1(object) ? new Array(object.length) : {};
  for (const key in object) {
    ret[key] = propertyToRef(object, key);
  }
  return ret;
}
class ObjectRefImpl {
  constructor(_object, _key, _defaultValue) {
    this._object = _object;
    this._key = _key;
    this._defaultValue = _defaultValue;
    this["__v_isRef"] = true;
    this._value = void 0;
  }
  get value() {
    const val = this._object[this._key];
    return this._value = val === void 0 ? this._defaultValue : val;
  }
  set value(newVal) {
    this._object[this._key] = newVal;
  }
  get dep() {
    return getDepFromReactive(toRaw$1(this._object), this._key);
  }
}
class GetterRefImpl {
  constructor(_getter) {
    this._getter = _getter;
    this["__v_isRef"] = true;
    this["__v_isReadonly"] = true;
    this._value = void 0;
  }
  get value() {
    return this._value = this._getter();
  }
}
function toRef(source, key, defaultValue) {
  if (isRef$1(source)) {
    return source;
  } else if (isFunction(source)) {
    return new GetterRefImpl(source);
  } else if (isObject$1(source) && arguments.length > 1) {
    return propertyToRef(source, key, defaultValue);
  } else {
    return ref(source);
  }
}
function propertyToRef(source, key, defaultValue) {
  const val = source[key];
  return isRef$1(val) ? val : new ObjectRefImpl(source, key, defaultValue);
}
class ComputedRefImpl {
  constructor(fn, setter, isSSR) {
    this.fn = fn;
    this.setter = setter;
    this._value = void 0;
    this.dep = new Dep(this);
    this.__v_isRef = true;
    this.deps = void 0;
    this.depsTail = void 0;
    this.flags = 16;
    this.globalVersion = globalVersion - 1;
    this.next = void 0;
    this.effect = this;
    this["__v_isReadonly"] = !setter;
    this.isSSR = isSSR;
  }
  /**
   * @internal
   */
  notify() {
    this.flags |= 16;
    if (!(this.flags & 8) && // avoid infinite self recursion
    activeSub !== this) {
      batch(this, true);
      return true;
    }
  }
  get value() {
    const link = this.dep.track();
    refreshComputed(this);
    if (link) {
      link.version = this.dep.version;
    }
    return this._value;
  }
  set value(newValue) {
    if (this.setter) {
      this.setter(newValue);
    }
  }
}
function computed$1(getterOrOptions, debugOptions, isSSR = false) {
  let getter;
  let setter;
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  const cRef = new ComputedRefImpl(getter, setter, isSSR);
  return cRef;
}
const INITIAL_WATCHER_VALUE = {};
const cleanupMap = /* @__PURE__ */ new WeakMap();
let activeWatcher = void 0;
function onWatcherCleanup(cleanupFn, failSilently = false, owner = activeWatcher) {
  if (owner) {
    let cleanups = cleanupMap.get(owner);
    if (!cleanups) cleanupMap.set(owner, cleanups = []);
    cleanups.push(cleanupFn);
  }
}
function watch$1(source, cb, options = EMPTY_OBJ) {
  const { immediate, deep, once, scheduler, augmentJob, call } = options;
  const reactiveGetter = (source2) => {
    if (deep) return source2;
    if (isShallow(source2) || deep === false || deep === 0)
      return traverse$1(source2, 1);
    return traverse$1(source2);
  };
  let effect2;
  let getter;
  let cleanup;
  let boundCleanup;
  let forceTrigger = false;
  let isMultiSource = false;
  if (isRef$1(source)) {
    getter = () => source.value;
    forceTrigger = isShallow(source);
  } else if (isReactive$1(source)) {
    getter = () => reactiveGetter(source);
    forceTrigger = true;
  } else if (isArray$1(source)) {
    isMultiSource = true;
    forceTrigger = source.some((s) => isReactive$1(s) || isShallow(s));
    getter = () => source.map((s) => {
      if (isRef$1(s)) {
        return s.value;
      } else if (isReactive$1(s)) {
        return reactiveGetter(s);
      } else if (isFunction(s)) {
        return call ? call(s, 2) : s();
      } else ;
    });
  } else if (isFunction(source)) {
    if (cb) {
      getter = call ? () => call(source, 2) : source;
    } else {
      getter = () => {
        if (cleanup) {
          pauseTracking();
          try {
            cleanup();
          } finally {
            resetTracking();
          }
        }
        const currentEffect = activeWatcher;
        activeWatcher = effect2;
        try {
          return call ? call(source, 3, [boundCleanup]) : source(boundCleanup);
        } finally {
          activeWatcher = currentEffect;
        }
      };
    }
  } else {
    getter = NOOP;
  }
  if (cb && deep) {
    const baseGetter = getter;
    const depth = deep === true ? Infinity : deep;
    getter = () => traverse$1(baseGetter(), depth);
  }
  const scope = getCurrentScope();
  const watchHandle = () => {
    effect2.stop();
    if (scope) {
      remove(scope.effects, effect2);
    }
  };
  if (once && cb) {
    const _cb = cb;
    cb = (...args) => {
      _cb(...args);
      watchHandle();
    };
  }
  let oldValue = isMultiSource ? new Array(source.length).fill(INITIAL_WATCHER_VALUE) : INITIAL_WATCHER_VALUE;
  const job = (immediateFirstRun) => {
    if (!(effect2.flags & 1) || !effect2.dirty && !immediateFirstRun) {
      return;
    }
    if (cb) {
      const newValue = effect2.run();
      if (deep || forceTrigger || (isMultiSource ? newValue.some((v, i) => hasChanged(v, oldValue[i])) : hasChanged(newValue, oldValue))) {
        if (cleanup) {
          cleanup();
        }
        const currentWatcher = activeWatcher;
        activeWatcher = effect2;
        try {
          const args = [
            newValue,
            // pass undefined as the old value when it's changed for the first time
            oldValue === INITIAL_WATCHER_VALUE ? void 0 : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE ? [] : oldValue,
            boundCleanup
          ];
          call ? call(cb, 3, args) : (
            // @ts-expect-error
            cb(...args)
          );
          oldValue = newValue;
        } finally {
          activeWatcher = currentWatcher;
        }
      }
    } else {
      effect2.run();
    }
  };
  if (augmentJob) {
    augmentJob(job);
  }
  effect2 = new ReactiveEffect(getter);
  effect2.scheduler = scheduler ? () => scheduler(job, false) : job;
  boundCleanup = (fn) => onWatcherCleanup(fn, false, effect2);
  cleanup = effect2.onStop = () => {
    const cleanups = cleanupMap.get(effect2);
    if (cleanups) {
      if (call) {
        call(cleanups, 4);
      } else {
        for (const cleanup2 of cleanups) cleanup2();
      }
      cleanupMap.delete(effect2);
    }
  };
  if (cb) {
    if (immediate) {
      job(true);
    } else {
      oldValue = effect2.run();
    }
  } else if (scheduler) {
    scheduler(job.bind(null, true), true);
  } else {
    effect2.run();
  }
  watchHandle.pause = effect2.pause.bind(effect2);
  watchHandle.resume = effect2.resume.bind(effect2);
  watchHandle.stop = watchHandle;
  return watchHandle;
}
function traverse$1(value, depth = Infinity, seen) {
  if (depth <= 0 || !isObject$1(value) || value["__v_skip"]) {
    return value;
  }
  seen = seen || /* @__PURE__ */ new Set();
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  depth--;
  if (isRef$1(value)) {
    traverse$1(value.value, depth, seen);
  } else if (isArray$1(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse$1(value[i], depth, seen);
    }
  } else if (isSet$1(value) || isMap$1(value)) {
    value.forEach((v) => {
      traverse$1(v, depth, seen);
    });
  } else if (isPlainObject$2(value)) {
    for (const key in value) {
      traverse$1(value[key], depth, seen);
    }
    for (const key of Object.getOwnPropertySymbols(value)) {
      if (Object.prototype.propertyIsEnumerable.call(value, key)) {
        traverse$1(value[key], depth, seen);
      }
    }
  }
  return value;
}

/**
* @vue/runtime-core v3.5.12
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
const stack = [];
let isWarning = false;
function warn$1(msg, ...args) {
  if (isWarning) return;
  isWarning = true;
  pauseTracking();
  const instance = stack.length ? stack[stack.length - 1].component : null;
  const appWarnHandler = instance && instance.appContext.config.warnHandler;
  const trace = getComponentTrace();
  if (appWarnHandler) {
    callWithErrorHandling(
      appWarnHandler,
      instance,
      11,
      [
        // eslint-disable-next-line no-restricted-syntax
        msg + args.map((a) => {
          var _a, _b;
          return (_b = (_a = a.toString) == null ? void 0 : _a.call(a)) != null ? _b : JSON.stringify(a);
        }).join(""),
        instance && instance.proxy,
        trace.map(
          ({ vnode }) => `at <${formatComponentName(instance, vnode.type)}>`
        ).join("\n"),
        trace
      ]
    );
  } else {
    const warnArgs = [`[Vue warn]: ${msg}`, ...args];
    if (trace.length && // avoid spamming console during tests
    true) {
      warnArgs.push(`
`, ...formatTrace(trace));
    }
    console.warn(...warnArgs);
  }
  resetTracking();
  isWarning = false;
}
function getComponentTrace() {
  let currentVNode = stack[stack.length - 1];
  if (!currentVNode) {
    return [];
  }
  const normalizedStack = [];
  while (currentVNode) {
    const last = normalizedStack[0];
    if (last && last.vnode === currentVNode) {
      last.recurseCount++;
    } else {
      normalizedStack.push({
        vnode: currentVNode,
        recurseCount: 0
      });
    }
    const parentInstance = currentVNode.component && currentVNode.component.parent;
    currentVNode = parentInstance && parentInstance.vnode;
  }
  return normalizedStack;
}
function formatTrace(trace) {
  const logs = [];
  trace.forEach((entry, i) => {
    logs.push(...i === 0 ? [] : [`
`], ...formatTraceEntry(entry));
  });
  return logs;
}
function formatTraceEntry({ vnode, recurseCount }) {
  const postfix = recurseCount > 0 ? `... (${recurseCount} recursive calls)` : ``;
  const isRoot = vnode.component ? vnode.component.parent == null : false;
  const open = ` at <${formatComponentName(
    vnode.component,
    vnode.type,
    isRoot
  )}`;
  const close = `>` + postfix;
  return vnode.props ? [open, ...formatProps(vnode.props), close] : [open + close];
}
function formatProps(props) {
  const res = [];
  const keys = Object.keys(props);
  keys.slice(0, 3).forEach((key) => {
    res.push(...formatProp(key, props[key]));
  });
  if (keys.length > 3) {
    res.push(` ...`);
  }
  return res;
}
function formatProp(key, value, raw) {
  if (isString$1(value)) {
    value = JSON.stringify(value);
    return raw ? value : [`${key}=${value}`];
  } else if (typeof value === "number" || typeof value === "boolean" || value == null) {
    return raw ? value : [`${key}=${value}`];
  } else if (isRef$1(value)) {
    value = formatProp(key, toRaw$1(value.value), true);
    return raw ? value : [`${key}=Ref<`, value, `>`];
  } else if (isFunction(value)) {
    return [`${key}=fn${value.name ? `<${value.name}>` : ``}`];
  } else {
    value = toRaw$1(value);
    return raw ? value : [`${key}=`, value];
  }
}
function callWithErrorHandling(fn, instance, type, args) {
  try {
    return args ? fn(...args) : fn();
  } catch (err) {
    handleError(err, instance, type);
  }
}
function callWithAsyncErrorHandling(fn, instance, type, args) {
  if (isFunction(fn)) {
    const res = callWithErrorHandling(fn, instance, type, args);
    if (res && isPromise(res)) {
      res.catch((err) => {
        handleError(err, instance, type);
      });
    }
    return res;
  }
  if (isArray$1(fn)) {
    const values = [];
    for (let i = 0; i < fn.length; i++) {
      values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
    }
    return values;
  }
}
function handleError(err, instance, type, throwInDev = true) {
  const contextVNode = instance ? instance.vnode : null;
  const { errorHandler, throwUnhandledErrorInProduction } = instance && instance.appContext.config || EMPTY_OBJ;
  if (instance) {
    let cur = instance.parent;
    const exposedInstance = instance.proxy;
    const errorInfo = `https://vuejs.org/error-reference/#runtime-${type}`;
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
    if (errorHandler) {
      pauseTracking();
      callWithErrorHandling(errorHandler, null, 10, [
        err,
        exposedInstance,
        errorInfo
      ]);
      resetTracking();
      return;
    }
  }
  logError(err, type, contextVNode, throwInDev, throwUnhandledErrorInProduction);
}
function logError(err, type, contextVNode, throwInDev = true, throwInProd = false) {
  if (throwInProd) {
    throw err;
  } else {
    console.error(err);
  }
}
const queue = [];
let flushIndex = -1;
const pendingPostFlushCbs = [];
let activePostFlushCbs = null;
let postFlushIndex = 0;
const resolvedPromise = /* @__PURE__ */ Promise.resolve();
let currentFlushPromise = null;
function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise;
  return fn ? p.then(this ? fn.bind(this) : fn) : p;
}
function findInsertionIndex(id) {
  let start = flushIndex + 1;
  let end = queue.length;
  while (start < end) {
    const middle = start + end >>> 1;
    const middleJob = queue[middle];
    const middleJobId = getId(middleJob);
    if (middleJobId < id || middleJobId === id && middleJob.flags & 2) {
      start = middle + 1;
    } else {
      end = middle;
    }
  }
  return start;
}
function queueJob(job) {
  if (!(job.flags & 1)) {
    const jobId = getId(job);
    const lastJob = queue[queue.length - 1];
    if (!lastJob || // fast path when the job id is larger than the tail
    !(job.flags & 2) && jobId >= getId(lastJob)) {
      queue.push(job);
    } else {
      queue.splice(findInsertionIndex(jobId), 0, job);
    }
    job.flags |= 1;
    queueFlush();
  }
}
function queueFlush() {
  if (!currentFlushPromise) {
    currentFlushPromise = resolvedPromise.then(flushJobs);
  }
}
function queuePostFlushCb(cb) {
  if (!isArray$1(cb)) {
    if (activePostFlushCbs && cb.id === -1) {
      activePostFlushCbs.splice(postFlushIndex + 1, 0, cb);
    } else if (!(cb.flags & 1)) {
      pendingPostFlushCbs.push(cb);
      cb.flags |= 1;
    }
  } else {
    pendingPostFlushCbs.push(...cb);
  }
  queueFlush();
}
function flushPreFlushCbs(instance, seen, i = flushIndex + 1) {
  for (; i < queue.length; i++) {
    const cb = queue[i];
    if (cb && cb.flags & 2) {
      if (instance && cb.id !== instance.uid) {
        continue;
      }
      queue.splice(i, 1);
      i--;
      if (cb.flags & 4) {
        cb.flags &= ~1;
      }
      cb();
      if (!(cb.flags & 4)) {
        cb.flags &= ~1;
      }
    }
  }
}
function flushPostFlushCbs(seen) {
  if (pendingPostFlushCbs.length) {
    const deduped = [...new Set(pendingPostFlushCbs)].sort(
      (a, b) => getId(a) - getId(b)
    );
    pendingPostFlushCbs.length = 0;
    if (activePostFlushCbs) {
      activePostFlushCbs.push(...deduped);
      return;
    }
    activePostFlushCbs = deduped;
    for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
      const cb = activePostFlushCbs[postFlushIndex];
      if (cb.flags & 4) {
        cb.flags &= ~1;
      }
      if (!(cb.flags & 8)) cb();
      cb.flags &= ~1;
    }
    activePostFlushCbs = null;
    postFlushIndex = 0;
  }
}
const getId = (job) => job.id == null ? job.flags & 2 ? -1 : Infinity : job.id;
function flushJobs(seen) {
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex];
      if (job && !(job.flags & 8)) {
        if (false) ;
        if (job.flags & 4) {
          job.flags &= ~1;
        }
        callWithErrorHandling(
          job,
          job.i,
          job.i ? 15 : 14
        );
        if (!(job.flags & 4)) {
          job.flags &= ~1;
        }
      }
    }
  } finally {
    for (; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex];
      if (job) {
        job.flags &= ~1;
      }
    }
    flushIndex = -1;
    queue.length = 0;
    flushPostFlushCbs();
    currentFlushPromise = null;
    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs();
    }
  }
}
let currentRenderingInstance = null;
let currentScopeId = null;
function setCurrentRenderingInstance(instance) {
  const prev = currentRenderingInstance;
  currentRenderingInstance = instance;
  currentScopeId = instance && instance.type.__scopeId || null;
  return prev;
}
function withCtx(fn, ctx = currentRenderingInstance, isNonScopedSlot) {
  if (!ctx) return fn;
  if (fn._n) {
    return fn;
  }
  const renderFnWithContext = (...args) => {
    if (renderFnWithContext._d) {
      setBlockTracking(-1);
    }
    const prevInstance = setCurrentRenderingInstance(ctx);
    let res;
    try {
      res = fn(...args);
    } finally {
      setCurrentRenderingInstance(prevInstance);
      if (renderFnWithContext._d) {
        setBlockTracking(1);
      }
    }
    return res;
  };
  renderFnWithContext._n = true;
  renderFnWithContext._c = true;
  renderFnWithContext._d = true;
  return renderFnWithContext;
}
function withDirectives(vnode, directives) {
  if (currentRenderingInstance === null) {
    return vnode;
  }
  const instance = getComponentPublicInstance(currentRenderingInstance);
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
        traverse$1(value);
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
      pauseTracking();
      callWithAsyncErrorHandling(hook, instance, 8, [
        vnode.el,
        binding,
        vnode,
        prevVNode
      ]);
      resetTracking();
    }
  }
}
const TeleportEndKey = Symbol("_vte");
const isTeleport = (type) => type.__isTeleport;
function setTransitionHooks(vnode, hooks) {
  if (vnode.shapeFlag & 6 && vnode.component) {
    vnode.transition = hooks;
    setTransitionHooks(vnode.component.subTree, hooks);
  } else if (vnode.shapeFlag & 128) {
    vnode.ssContent.transition = hooks.clone(vnode.ssContent);
    vnode.ssFallback.transition = hooks.clone(vnode.ssFallback);
  } else {
    vnode.transition = hooks;
  }
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function defineComponent(options, extraOptions) {
  return isFunction(options) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    /* @__PURE__ */ (() => extend({ name: options.name }, extraOptions, { setup: options }))()
  ) : options;
}
function markAsyncBoundary(instance) {
  instance.ids = [instance.ids[0] + instance.ids[2]++ + "-", 0, 0];
}
function setRef(rawRef, oldRawRef, parentSuspense, vnode, isUnmount = false) {
  if (isArray$1(rawRef)) {
    rawRef.forEach(
      (r, i) => setRef(
        r,
        oldRawRef && (isArray$1(oldRawRef) ? oldRawRef[i] : oldRawRef),
        parentSuspense,
        vnode,
        isUnmount
      )
    );
    return;
  }
  if (isAsyncWrapper(vnode) && !isUnmount) {
    return;
  }
  const refValue = vnode.shapeFlag & 4 ? getComponentPublicInstance(vnode.component) : vnode.el;
  const value = isUnmount ? null : refValue;
  const { i: owner, r: ref3 } = rawRef;
  const oldRef = oldRawRef && oldRawRef.r;
  const refs = owner.refs === EMPTY_OBJ ? owner.refs = {} : owner.refs;
  const setupState = owner.setupState;
  const rawSetupState = toRaw$1(setupState);
  const canSetSetupRef = setupState === EMPTY_OBJ ? () => false : (key) => {
    return hasOwn(rawSetupState, key);
  };
  if (oldRef != null && oldRef !== ref3) {
    if (isString$1(oldRef)) {
      refs[oldRef] = null;
      if (canSetSetupRef(oldRef)) {
        setupState[oldRef] = null;
      }
    } else if (isRef$1(oldRef)) {
      oldRef.value = null;
    }
  }
  if (isFunction(ref3)) {
    callWithErrorHandling(ref3, owner, 12, [value, refs]);
  } else {
    const _isString = isString$1(ref3);
    const _isRef = isRef$1(ref3);
    if (_isString || _isRef) {
      const doSet = () => {
        if (rawRef.f) {
          const existing = _isString ? canSetSetupRef(ref3) ? setupState[ref3] : refs[ref3] : ref3.value;
          if (isUnmount) {
            isArray$1(existing) && remove(existing, refValue);
          } else {
            if (!isArray$1(existing)) {
              if (_isString) {
                refs[ref3] = [refValue];
                if (canSetSetupRef(ref3)) {
                  setupState[ref3] = refs[ref3];
                }
              } else {
                ref3.value = [refValue];
                if (rawRef.k) refs[rawRef.k] = ref3.value;
              }
            } else if (!existing.includes(refValue)) {
              existing.push(refValue);
            }
          }
        } else if (_isString) {
          refs[ref3] = value;
          if (canSetSetupRef(ref3)) {
            setupState[ref3] = value;
          }
        } else if (_isRef) {
          ref3.value = value;
          if (rawRef.k) refs[rawRef.k] = value;
        } else ;
      };
      if (value) {
        doSet.id = -1;
        queuePostRenderEffect(doSet, parentSuspense);
      } else {
        doSet();
      }
    }
  }
}
getGlobalThis().requestIdleCallback || ((cb) => setTimeout(cb, 1));
getGlobalThis().cancelIdleCallback || ((id) => clearTimeout(id));
const isAsyncWrapper = (i) => !!i.type.__asyncLoader;
const isKeepAlive = (vnode) => vnode.type.__isKeepAlive;
function onActivated(hook, target) {
  registerKeepAliveHook(hook, "a", target);
}
function onDeactivated(hook, target) {
  registerKeepAliveHook(hook, "da", target);
}
function registerKeepAliveHook(hook, type, target = currentInstance) {
  const wrappedHook = hook.__wdc || (hook.__wdc = () => {
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
  const injected = injectHook(
    type,
    hook,
    keepAliveRoot,
    true
    /* prepend */
  );
  onUnmounted(() => {
    remove(keepAliveRoot[type], injected);
  }, target);
}
function injectHook(type, hook, target = currentInstance, prepend = false) {
  if (target) {
    const hooks = target[type] || (target[type] = []);
    const wrappedHook = hook.__weh || (hook.__weh = (...args) => {
      pauseTracking();
      const reset = setCurrentInstance(target);
      const res = callWithAsyncErrorHandling(hook, target, type, args);
      reset();
      resetTracking();
      return res;
    });
    if (prepend) {
      hooks.unshift(wrappedHook);
    } else {
      hooks.push(wrappedHook);
    }
    return wrappedHook;
  }
}
const createHook = (lifecycle) => (hook, target = currentInstance) => {
  if (!isInSSRComponentSetup || lifecycle === "sp") {
    injectHook(lifecycle, (...args) => hook(...args), target);
  }
};
const onBeforeMount = createHook("bm");
const onMounted = createHook("m");
const onBeforeUpdate = createHook(
  "bu"
);
const onUpdated = createHook("u");
const onBeforeUnmount = createHook(
  "bum"
);
const onUnmounted = createHook("um");
const onServerPrefetch = createHook(
  "sp"
);
const onRenderTriggered = createHook("rtg");
const onRenderTracked = createHook("rtc");
function onErrorCaptured(hook, target = currentInstance) {
  injectHook("ec", hook, target);
}
const COMPONENTS = "components";
const NULL_DYNAMIC_COMPONENT = Symbol.for("v-ndc");
function resolveDynamicComponent(component) {
  if (isString$1(component)) {
    return resolveAsset(COMPONENTS, component, false) || component;
  } else {
    return component || NULL_DYNAMIC_COMPONENT;
  }
}
function resolveAsset(type, name, warnMissing = true, maybeSelfReference = false) {
  const instance = currentRenderingInstance || currentInstance;
  if (instance) {
    const Component = instance.type;
    {
      const selfName = getComponentName(
        Component,
        false
      );
      if (selfName && (selfName === name || selfName === camelize(name) || selfName === capitalize(camelize(name)))) {
        return Component;
      }
    }
    const res = (
      // local registration
      // check instance[type] first which is resolved for options API
      resolve(instance[type] || Component[type], name) || // global registration
      resolve(instance.appContext[type], name)
    );
    if (!res && maybeSelfReference) {
      return Component;
    }
    return res;
  }
}
function resolve(registry, name) {
  return registry && (registry[name] || registry[camelize(name)] || registry[capitalize(camelize(name))]);
}
function renderList(source, renderItem, cache, index) {
  let ret;
  const cached = cache;
  const sourceIsArray = isArray$1(source);
  if (sourceIsArray || isString$1(source)) {
    const sourceIsReactiveArray = sourceIsArray && isReactive$1(source);
    let needsWrap = false;
    if (sourceIsReactiveArray) {
      needsWrap = !isShallow(source);
      source = shallowReadArray(source);
    }
    ret = new Array(source.length);
    for (let i = 0, l = source.length; i < l; i++) {
      ret[i] = renderItem(
        needsWrap ? toReactive(source[i]) : source[i],
        i,
        void 0,
        cached
      );
    }
  } else if (typeof source === "number") {
    ret = new Array(source);
    for (let i = 0; i < source; i++) {
      ret[i] = renderItem(i + 1, i, void 0, cached);
    }
  } else if (isObject$1(source)) {
    if (source[Symbol.iterator]) {
      ret = Array.from(
        source,
        (item, i) => renderItem(item, i, void 0, cached)
      );
    } else {
      const keys = Object.keys(source);
      ret = new Array(keys.length);
      for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i];
        ret[i] = renderItem(source[key], key, i, cached);
      }
    }
  } else {
    ret = [];
  }
  return ret;
}
const getPublicInstance = (i) => {
  if (!i) return null;
  if (isStatefulComponent(i)) return getComponentPublicInstance(i);
  return getPublicInstance(i.parent);
};
const publicPropertiesMap = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ extend(/* @__PURE__ */ Object.create(null), {
    $: (i) => i,
    $el: (i) => i.vnode.el,
    $data: (i) => i.data,
    $props: (i) => i.props,
    $attrs: (i) => i.attrs,
    $slots: (i) => i.slots,
    $refs: (i) => i.refs,
    $parent: (i) => getPublicInstance(i.parent),
    $root: (i) => getPublicInstance(i.root),
    $host: (i) => i.ce,
    $emit: (i) => i.emit,
    $options: (i) => resolveMergedOptions(i) ,
    $forceUpdate: (i) => i.f || (i.f = () => {
      queueJob(i.update);
    }),
    $nextTick: (i) => i.n || (i.n = nextTick.bind(i.proxy)),
    $watch: (i) => instanceWatch.bind(i) 
  })
);
const hasSetupBinding = (state, key) => state !== EMPTY_OBJ && !state.__isScriptSetup && hasOwn(state, key);
const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    if (key === "__v_skip") {
      return true;
    }
    const { ctx, setupState, data, props, accessCache, type, appContext } = instance;
    let normalizedProps;
    if (key[0] !== "$") {
      const n = accessCache[key];
      if (n !== void 0) {
        switch (n) {
          case 1:
            return setupState[key];
          case 2:
            return data[key];
          case 4:
            return ctx[key];
          case 3:
            return props[key];
        }
      } else if (hasSetupBinding(setupState, key)) {
        accessCache[key] = 1;
        return setupState[key];
      } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
        accessCache[key] = 2;
        return data[key];
      } else if (
        // only cache other properties when instance has declared (thus stable)
        // props
        (normalizedProps = instance.propsOptions[0]) && hasOwn(normalizedProps, key)
      ) {
        accessCache[key] = 3;
        return props[key];
      } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
        accessCache[key] = 4;
        return ctx[key];
      } else if (shouldCacheAccess) {
        accessCache[key] = 0;
      }
    }
    const publicGetter = publicPropertiesMap[key];
    let cssModule, globalProperties;
    if (publicGetter) {
      if (key === "$attrs") {
        track(instance.attrs, "get", "");
      }
      return publicGetter(instance);
    } else if (
      // css module (injected by vue-loader)
      (cssModule = type.__cssModules) && (cssModule = cssModule[key])
    ) {
      return cssModule;
    } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
      accessCache[key] = 4;
      return ctx[key];
    } else if (
      // global properties
      globalProperties = appContext.config.globalProperties, hasOwn(globalProperties, key)
    ) {
      {
        return globalProperties[key];
      }
    } else ;
  },
  set({ _: instance }, key, value) {
    const { data, setupState, ctx } = instance;
    if (hasSetupBinding(setupState, key)) {
      setupState[key] = value;
      return true;
    } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
      data[key] = value;
      return true;
    } else if (hasOwn(instance.props, key)) {
      return false;
    }
    if (key[0] === "$" && key.slice(1) in instance) {
      return false;
    } else {
      {
        ctx[key] = value;
      }
    }
    return true;
  },
  has({
    _: { data, setupState, accessCache, ctx, appContext, propsOptions }
  }, key) {
    let normalizedProps;
    return !!accessCache[key] || data !== EMPTY_OBJ && hasOwn(data, key) || hasSetupBinding(setupState, key) || (normalizedProps = propsOptions[0]) && hasOwn(normalizedProps, key) || hasOwn(ctx, key) || hasOwn(publicPropertiesMap, key) || hasOwn(appContext.config.globalProperties, key);
  },
  defineProperty(target, key, descriptor) {
    if (descriptor.get != null) {
      target._.accessCache[key] = 0;
    } else if (hasOwn(descriptor, "value")) {
      this.set(target, key, descriptor.value, null);
    }
    return Reflect.defineProperty(target, key, descriptor);
  }
};
function normalizePropsOrEmits(props) {
  return isArray$1(props) ? props.reduce(
    (normalized, p) => (normalized[p] = null, normalized),
    {}
  ) : props;
}
let shouldCacheAccess = true;
function applyOptions(instance) {
  const options = resolveMergedOptions(instance);
  const publicThis = instance.proxy;
  const ctx = instance.ctx;
  shouldCacheAccess = false;
  if (options.beforeCreate) {
    callHook(options.beforeCreate, instance, "bc");
  }
  const {
    // state
    data: dataOptions,
    computed: computedOptions,
    methods,
    watch: watchOptions,
    provide: provideOptions,
    inject: injectOptions,
    // lifecycle
    created,
    beforeMount,
    mounted,
    beforeUpdate,
    updated,
    activated,
    deactivated,
    beforeDestroy,
    beforeUnmount,
    destroyed,
    unmounted,
    render,
    renderTracked,
    renderTriggered,
    errorCaptured,
    serverPrefetch,
    // public API
    expose,
    inheritAttrs,
    // assets
    components,
    directives,
    filters
  } = options;
  const checkDuplicateProperties = null;
  if (injectOptions) {
    resolveInjections(injectOptions, ctx, checkDuplicateProperties);
  }
  if (methods) {
    for (const key in methods) {
      const methodHandler = methods[key];
      if (isFunction(methodHandler)) {
        {
          ctx[key] = methodHandler.bind(publicThis);
        }
      }
    }
  }
  if (dataOptions) {
    const data = dataOptions.call(publicThis, publicThis);
    if (!isObject$1(data)) ; else {
      instance.data = reactive(data);
    }
  }
  shouldCacheAccess = true;
  if (computedOptions) {
    for (const key in computedOptions) {
      const opt = computedOptions[key];
      const get = isFunction(opt) ? opt.bind(publicThis, publicThis) : isFunction(opt.get) ? opt.get.bind(publicThis, publicThis) : NOOP;
      const set = !isFunction(opt) && isFunction(opt.set) ? opt.set.bind(publicThis) : NOOP;
      const c = computed({
        get,
        set
      });
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => c.value,
        set: (v) => c.value = v
      });
    }
  }
  if (watchOptions) {
    for (const key in watchOptions) {
      createWatcher(watchOptions[key], ctx, publicThis, key);
    }
  }
  if (provideOptions) {
    const provides = isFunction(provideOptions) ? provideOptions.call(publicThis) : provideOptions;
    Reflect.ownKeys(provides).forEach((key) => {
      provide(key, provides[key]);
    });
  }
  if (created) {
    callHook(created, instance, "c");
  }
  function registerLifecycleHook(register, hook) {
    if (isArray$1(hook)) {
      hook.forEach((_hook) => register(_hook.bind(publicThis)));
    } else if (hook) {
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
  if (isArray$1(expose)) {
    if (expose.length) {
      const exposed = instance.exposed || (instance.exposed = {});
      expose.forEach((key) => {
        Object.defineProperty(exposed, key, {
          get: () => publicThis[key],
          set: (val) => publicThis[key] = val
        });
      });
    } else if (!instance.exposed) {
      instance.exposed = {};
    }
  }
  if (render && instance.render === NOOP) {
    instance.render = render;
  }
  if (inheritAttrs != null) {
    instance.inheritAttrs = inheritAttrs;
  }
  if (components) instance.components = components;
  if (directives) instance.directives = directives;
  if (serverPrefetch) {
    markAsyncBoundary(instance);
  }
}
function resolveInjections(injectOptions, ctx, checkDuplicateProperties = NOOP) {
  if (isArray$1(injectOptions)) {
    injectOptions = normalizeInject(injectOptions);
  }
  for (const key in injectOptions) {
    const opt = injectOptions[key];
    let injected;
    if (isObject$1(opt)) {
      if ("default" in opt) {
        injected = inject(
          opt.from || key,
          opt.default,
          true
        );
      } else {
        injected = inject(opt.from || key);
      }
    } else {
      injected = inject(opt);
    }
    if (isRef$1(injected)) {
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => injected.value,
        set: (v) => injected.value = v
      });
    } else {
      ctx[key] = injected;
    }
  }
}
function callHook(hook, instance, type) {
  callWithAsyncErrorHandling(
    isArray$1(hook) ? hook.map((h2) => h2.bind(instance.proxy)) : hook.bind(instance.proxy),
    instance,
    type
  );
}
function createWatcher(raw, ctx, publicThis, key) {
  let getter = key.includes(".") ? createPathGetter(publicThis, key) : () => publicThis[key];
  if (isString$1(raw)) {
    const handler = ctx[raw];
    if (isFunction(handler)) {
      {
        watch(getter, handler);
      }
    }
  } else if (isFunction(raw)) {
    {
      watch(getter, raw.bind(publicThis));
    }
  } else if (isObject$1(raw)) {
    if (isArray$1(raw)) {
      raw.forEach((r) => createWatcher(r, ctx, publicThis, key));
    } else {
      const handler = isFunction(raw.handler) ? raw.handler.bind(publicThis) : ctx[raw.handler];
      if (isFunction(handler)) {
        watch(getter, handler, raw);
      }
    }
  } else ;
}
function resolveMergedOptions(instance) {
  const base = instance.type;
  const { mixins, extends: extendsOptions } = base;
  const {
    mixins: globalMixins,
    optionsCache: cache,
    config: { optionMergeStrategies }
  } = instance.appContext;
  const cached = cache.get(base);
  let resolved;
  if (cached) {
    resolved = cached;
  } else if (!globalMixins.length && !mixins && !extendsOptions) {
    {
      resolved = base;
    }
  } else {
    resolved = {};
    if (globalMixins.length) {
      globalMixins.forEach(
        (m) => mergeOptions(resolved, m, optionMergeStrategies, true)
      );
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
    mixins.forEach(
      (m) => mergeOptions(to, m, strats, true)
    );
  }
  for (const key in from) {
    if (asMixin && key === "expose") ; else {
      const strat = internalOptionMergeStrats[key] || strats && strats[key];
      to[key] = strat ? strat(to[key], from[key]) : from[key];
    }
  }
  return to;
}
const internalOptionMergeStrats = {
  data: mergeDataFn,
  props: mergeEmitsOrPropsOptions,
  emits: mergeEmitsOrPropsOptions,
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
    return extend(
      isFunction(to) ? to.call(this, this) : to,
      isFunction(from) ? from.call(this, this) : from
    );
  };
}
function mergeInject(to, from) {
  return mergeObjectOptions(normalizeInject(to), normalizeInject(from));
}
function normalizeInject(raw) {
  if (isArray$1(raw)) {
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
  return to ? extend(/* @__PURE__ */ Object.create(null), to, from) : from;
}
function mergeEmitsOrPropsOptions(to, from) {
  if (to) {
    if (isArray$1(to) && isArray$1(from)) {
      return [.../* @__PURE__ */ new Set([...to, ...from])];
    }
    return extend(
      /* @__PURE__ */ Object.create(null),
      normalizePropsOrEmits(to),
      normalizePropsOrEmits(from != null ? from : {})
    );
  } else {
    return from;
  }
}
function mergeWatchOptions(to, from) {
  if (!to) return from;
  if (!from) return to;
  const merged = extend(/* @__PURE__ */ Object.create(null), to);
  for (const key in from) {
    merged[key] = mergeAsArray(to[key], from[key]);
  }
  return merged;
}
function createAppContext() {
  return {
    app: null,
    config: {
      isNativeTag: NO,
      performance: false,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: void 0,
      warnHandler: void 0,
      compilerOptions: {}
    },
    mixins: [],
    components: {},
    directives: {},
    provides: /* @__PURE__ */ Object.create(null),
    optionsCache: /* @__PURE__ */ new WeakMap(),
    propsCache: /* @__PURE__ */ new WeakMap(),
    emitsCache: /* @__PURE__ */ new WeakMap()
  };
}
let uid$1 = 0;
function createAppAPI(render, hydrate) {
  return function createApp(rootComponent, rootProps = null) {
    if (!isFunction(rootComponent)) {
      rootComponent = extend({}, rootComponent);
    }
    if (rootProps != null && !isObject$1(rootProps)) {
      rootProps = null;
    }
    const context = createAppContext();
    const installedPlugins = /* @__PURE__ */ new WeakSet();
    const pluginCleanupFns = [];
    let isMounted = false;
    const app = context.app = {
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
        if (installedPlugins.has(plugin)) ; else if (plugin && isFunction(plugin.install)) {
          installedPlugins.add(plugin);
          plugin.install(app, ...options);
        } else if (isFunction(plugin)) {
          installedPlugins.add(plugin);
          plugin(app, ...options);
        } else ;
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
      mount(rootContainer, isHydrate, namespace) {
        if (!isMounted) {
          const vnode = app._ceVNode || createVNode(rootComponent, rootProps);
          vnode.appContext = context;
          if (namespace === true) {
            namespace = "svg";
          } else if (namespace === false) {
            namespace = void 0;
          }
          if (isHydrate && hydrate) {
            hydrate(vnode, rootContainer);
          } else {
            render(vnode, rootContainer, namespace);
          }
          isMounted = true;
          app._container = rootContainer;
          rootContainer.__vue_app__ = app;
          return getComponentPublicInstance(vnode.component);
        }
      },
      onUnmount(cleanupFn) {
        pluginCleanupFns.push(cleanupFn);
      },
      unmount() {
        if (isMounted) {
          callWithAsyncErrorHandling(
            pluginCleanupFns,
            app._instance,
            16
          );
          render(null, app._container);
          delete app._container.__vue_app__;
        }
      },
      provide(key, value) {
        context.provides[key] = value;
        return app;
      },
      runWithContext(fn) {
        const lastApp = currentApp;
        currentApp = app;
        try {
          return fn();
        } finally {
          currentApp = lastApp;
        }
      }
    };
    return app;
  };
}
let currentApp = null;
function provide(key, value) {
  if (!currentInstance) ; else {
    let provides = currentInstance.provides;
    const parentProvides = currentInstance.parent && currentInstance.parent.provides;
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}
function inject(key, defaultValue, treatDefaultAsFactory = false) {
  const instance = currentInstance || currentRenderingInstance;
  if (instance || currentApp) {
    const provides = currentApp ? currentApp._context.provides : instance ? instance.parent == null ? instance.vnode.appContext && instance.vnode.appContext.provides : instance.parent.provides : void 0;
    if (provides && key in provides) {
      return provides[key];
    } else if (arguments.length > 1) {
      return treatDefaultAsFactory && isFunction(defaultValue) ? defaultValue.call(instance && instance.proxy) : defaultValue;
    } else ;
  }
}
function hasInjectionContext() {
  return !!(currentInstance || currentRenderingInstance || currentApp);
}
const internalObjectProto = {};
const createInternalObject = () => Object.create(internalObjectProto);
const isInternalObject = (obj) => Object.getPrototypeOf(obj) === internalObjectProto;
function initProps(instance, rawProps, isStateful, isSSR = false) {
  const props = {};
  const attrs = createInternalObject();
  instance.propsDefaults = /* @__PURE__ */ Object.create(null);
  setFullProps(instance, rawProps, props, attrs);
  for (const key in instance.propsOptions[0]) {
    if (!(key in props)) {
      props[key] = void 0;
    }
  }
  if (isStateful) {
    instance.props = isSSR ? props : shallowReactive(props);
  } else {
    if (!instance.type.props) {
      instance.props = attrs;
    } else {
      instance.props = props;
    }
  }
  instance.attrs = attrs;
}
function updateProps(instance, rawProps, rawPrevProps, optimized) {
  const {
    props,
    attrs,
    vnode: { patchFlag }
  } = instance;
  const rawCurrentProps = toRaw$1(props);
  const [options] = instance.propsOptions;
  let hasAttrsChanged = false;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    (optimized || patchFlag > 0) && !(patchFlag & 16)
  ) {
    if (patchFlag & 8) {
      const propsToUpdate = instance.vnode.dynamicProps;
      for (let i = 0; i < propsToUpdate.length; i++) {
        let key = propsToUpdate[i];
        if (isEmitListener(instance.emitsOptions, key)) {
          continue;
        }
        const value = rawProps[key];
        if (options) {
          if (hasOwn(attrs, key)) {
            if (value !== attrs[key]) {
              attrs[key] = value;
              hasAttrsChanged = true;
            }
          } else {
            const camelizedKey = camelize(key);
            props[camelizedKey] = resolvePropValue(
              options,
              rawCurrentProps,
              camelizedKey,
              value,
              instance,
              false
            );
          }
        } else {
          if (value !== attrs[key]) {
            attrs[key] = value;
            hasAttrsChanged = true;
          }
        }
      }
    }
  } else {
    if (setFullProps(instance, rawProps, props, attrs)) {
      hasAttrsChanged = true;
    }
    let kebabKey;
    for (const key in rawCurrentProps) {
      if (!rawProps || // for camelCase
      !hasOwn(rawProps, key) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((kebabKey = hyphenate(key)) === key || !hasOwn(rawProps, kebabKey))) {
        if (options) {
          if (rawPrevProps && // for camelCase
          (rawPrevProps[key] !== void 0 || // for kebab-case
          rawPrevProps[kebabKey] !== void 0)) {
            props[key] = resolvePropValue(
              options,
              rawCurrentProps,
              key,
              void 0,
              instance,
              true
            );
          }
        } else {
          delete props[key];
        }
      }
    }
    if (attrs !== rawCurrentProps) {
      for (const key in attrs) {
        if (!rawProps || !hasOwn(rawProps, key) && true) {
          delete attrs[key];
          hasAttrsChanged = true;
        }
      }
    }
  }
  if (hasAttrsChanged) {
    trigger(instance.attrs, "set", "");
  }
}
function setFullProps(instance, rawProps, props, attrs) {
  const [options, needCastKeys] = instance.propsOptions;
  let hasAttrsChanged = false;
  let rawCastValues;
  if (rawProps) {
    for (let key in rawProps) {
      if (isReservedProp(key)) {
        continue;
      }
      const value = rawProps[key];
      let camelKey;
      if (options && hasOwn(options, camelKey = camelize(key))) {
        if (!needCastKeys || !needCastKeys.includes(camelKey)) {
          props[camelKey] = value;
        } else {
          (rawCastValues || (rawCastValues = {}))[camelKey] = value;
        }
      } else if (!isEmitListener(instance.emitsOptions, key)) {
        if (!(key in attrs) || value !== attrs[key]) {
          attrs[key] = value;
          hasAttrsChanged = true;
        }
      }
    }
  }
  if (needCastKeys) {
    const rawCurrentProps = toRaw$1(props);
    const castValues = rawCastValues || EMPTY_OBJ;
    for (let i = 0; i < needCastKeys.length; i++) {
      const key = needCastKeys[i];
      props[key] = resolvePropValue(
        options,
        rawCurrentProps,
        key,
        castValues[key],
        instance,
        !hasOwn(castValues, key)
      );
    }
  }
  return hasAttrsChanged;
}
function resolvePropValue(options, props, key, value, instance, isAbsent) {
  const opt = options[key];
  if (opt != null) {
    const hasDefault = hasOwn(opt, "default");
    if (hasDefault && value === void 0) {
      const defaultValue = opt.default;
      if (opt.type !== Function && !opt.skipFactory && isFunction(defaultValue)) {
        const { propsDefaults } = instance;
        if (key in propsDefaults) {
          value = propsDefaults[key];
        } else {
          const reset = setCurrentInstance(instance);
          value = propsDefaults[key] = defaultValue.call(
            null,
            props
          );
          reset();
        }
      } else {
        value = defaultValue;
      }
      if (instance.ce) {
        instance.ce._setProp(key, value);
      }
    }
    if (opt[
      0
      /* shouldCast */
    ]) {
      if (isAbsent && !hasDefault) {
        value = false;
      } else if (opt[
        1
        /* shouldCastTrue */
      ] && (value === "" || value === hyphenate(key))) {
        value = true;
      }
    }
  }
  return value;
}
const mixinPropsCache = /* @__PURE__ */ new WeakMap();
function normalizePropsOptions(comp, appContext, asMixin = false) {
  const cache = asMixin ? mixinPropsCache : appContext.propsCache;
  const cached = cache.get(comp);
  if (cached) {
    return cached;
  }
  const raw = comp.props;
  const normalized = {};
  const needCastKeys = [];
  let hasExtends = false;
  if (!isFunction(comp)) {
    const extendProps = (raw2) => {
      hasExtends = true;
      const [props, keys] = normalizePropsOptions(raw2, appContext, true);
      extend(normalized, props);
      if (keys) needCastKeys.push(...keys);
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
  if (isArray$1(raw)) {
    for (let i = 0; i < raw.length; i++) {
      const normalizedKey = camelize(raw[i]);
      if (validatePropName(normalizedKey)) {
        normalized[normalizedKey] = EMPTY_OBJ;
      }
    }
  } else if (raw) {
    for (const key in raw) {
      const normalizedKey = camelize(key);
      if (validatePropName(normalizedKey)) {
        const opt = raw[key];
        const prop = normalized[normalizedKey] = isArray$1(opt) || isFunction(opt) ? { type: opt } : extend({}, opt);
        const propType = prop.type;
        let shouldCast = false;
        let shouldCastTrue = true;
        if (isArray$1(propType)) {
          for (let index = 0; index < propType.length; ++index) {
            const type = propType[index];
            const typeName = isFunction(type) && type.name;
            if (typeName === "Boolean") {
              shouldCast = true;
              break;
            } else if (typeName === "String") {
              shouldCastTrue = false;
            }
          }
        } else {
          shouldCast = isFunction(propType) && propType.name === "Boolean";
        }
        prop[
          0
          /* shouldCast */
        ] = shouldCast;
        prop[
          1
          /* shouldCastTrue */
        ] = shouldCastTrue;
        if (shouldCast || hasOwn(prop, "default")) {
          needCastKeys.push(normalizedKey);
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
  if (key[0] !== "$" && !isReservedProp(key)) {
    return true;
  }
  return false;
}
const isInternalKey = (key) => key[0] === "_" || key === "$stable";
const normalizeSlotValue = (value) => isArray$1(value) ? value.map(normalizeVNode) : [normalizeVNode(value)];
const normalizeSlot = (key, rawSlot, ctx) => {
  if (rawSlot._n) {
    return rawSlot;
  }
  const normalized = withCtx((...args) => {
    if (false) ;
    return normalizeSlotValue(rawSlot(...args));
  }, ctx);
  normalized._c = false;
  return normalized;
};
const normalizeObjectSlots = (rawSlots, slots, instance) => {
  const ctx = rawSlots._ctx;
  for (const key in rawSlots) {
    if (isInternalKey(key)) continue;
    const value = rawSlots[key];
    if (isFunction(value)) {
      slots[key] = normalizeSlot(key, value, ctx);
    } else if (value != null) {
      const normalized = normalizeSlotValue(value);
      slots[key] = () => normalized;
    }
  }
};
const normalizeVNodeSlots = (instance, children) => {
  const normalized = normalizeSlotValue(children);
  instance.slots.default = () => normalized;
};
const assignSlots = (slots, children, optimized) => {
  for (const key in children) {
    if (optimized || key !== "_") {
      slots[key] = children[key];
    }
  }
};
const initSlots = (instance, children, optimized) => {
  const slots = instance.slots = createInternalObject();
  if (instance.vnode.shapeFlag & 32) {
    const type = children._;
    if (type) {
      assignSlots(slots, children, optimized);
      if (optimized) {
        def(slots, "_", type, true);
      }
    } else {
      normalizeObjectSlots(children, slots);
    }
  } else if (children) {
    normalizeVNodeSlots(instance, children);
  }
};
const updateSlots = (instance, children, optimized) => {
  const { vnode, slots } = instance;
  let needDeletionCheck = true;
  let deletionComparisonTarget = EMPTY_OBJ;
  if (vnode.shapeFlag & 32) {
    const type = children._;
    if (type) {
      if (optimized && type === 1) {
        needDeletionCheck = false;
      } else {
        assignSlots(slots, children, optimized);
      }
    } else {
      needDeletionCheck = !children.$stable;
      normalizeObjectSlots(children, slots);
    }
    deletionComparisonTarget = children;
  } else if (children) {
    normalizeVNodeSlots(instance, children);
    deletionComparisonTarget = { default: 1 };
  }
  if (needDeletionCheck) {
    for (const key in slots) {
      if (!isInternalKey(key) && deletionComparisonTarget[key] == null) {
        delete slots[key];
      }
    }
  }
};
const queuePostRenderEffect = queueEffectWithSuspense;
function createRenderer(options) {
  return baseCreateRenderer(options);
}
function baseCreateRenderer(options, createHydrationFns) {
  const target = getGlobalThis();
  target.__VUE__ = true;
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    setScopeId: hostSetScopeId = NOOP,
    insertStaticContent: hostInsertStaticContent
  } = options;
  const patch = (n1, n2, container, anchor = null, parentComponent = null, parentSuspense = null, namespace = void 0, slotScopeIds = null, optimized = !!n2.dynamicChildren) => {
    if (n1 === n2) {
      return;
    }
    if (n1 && !isSameVNodeType(n1, n2)) {
      anchor = getNextHostNode(n1);
      unmount(n1, parentComponent, parentSuspense, true);
      n1 = null;
    }
    if (n2.patchFlag === -2) {
      optimized = false;
      n2.dynamicChildren = null;
    }
    const { type, ref: ref3, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor);
        break;
      case Comment:
        processCommentNode(n1, n2, container, anchor);
        break;
      case Static:
        if (n1 == null) {
          mountStaticNode(n2, container, anchor, namespace);
        }
        break;
      case Fragment$1:
        processFragment(
          n1,
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
        break;
      default:
        if (shapeFlag & 1) {
          processElement(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
        } else if (shapeFlag & 6) {
          processComponent(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
        } else if (shapeFlag & 64) {
          type.process(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized,
            internals
          );
        } else if (shapeFlag & 128) {
          type.process(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized,
            internals
          );
        } else ;
    }
    if (ref3 != null && parentComponent) {
      setRef(ref3, n1 && n1.ref, parentSuspense, n2 || n1, !n2);
    }
  };
  const processText = (n1, n2, container, anchor) => {
    if (n1 == null) {
      hostInsert(
        n2.el = hostCreateText(n2.children),
        container,
        anchor
      );
    } else {
      const el = n2.el = n1.el;
      if (n2.children !== n1.children) {
        hostSetText(el, n2.children);
      }
    }
  };
  const processCommentNode = (n1, n2, container, anchor) => {
    if (n1 == null) {
      hostInsert(
        n2.el = hostCreateComment(n2.children || ""),
        container,
        anchor
      );
    } else {
      n2.el = n1.el;
    }
  };
  const mountStaticNode = (n2, container, anchor, namespace) => {
    [n2.el, n2.anchor] = hostInsertStaticContent(
      n2.children,
      container,
      anchor,
      namespace,
      n2.el,
      n2.anchor
    );
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
  const processElement = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    if (n2.type === "svg") {
      namespace = "svg";
    } else if (n2.type === "math") {
      namespace = "mathml";
    }
    if (n1 == null) {
      mountElement(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        optimized
      );
    } else {
      patchElement(
        n1,
        n2,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        optimized
      );
    }
  };
  const mountElement = (vnode, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    let el;
    let vnodeHook;
    const { props, shapeFlag, transition, dirs } = vnode;
    el = vnode.el = hostCreateElement(
      vnode.type,
      namespace,
      props && props.is,
      props
    );
    if (shapeFlag & 8) {
      hostSetElementText(el, vnode.children);
    } else if (shapeFlag & 16) {
      mountChildren(
        vnode.children,
        el,
        null,
        parentComponent,
        parentSuspense,
        resolveChildrenNamespace(vnode, namespace),
        slotScopeIds,
        optimized
      );
    }
    if (dirs) {
      invokeDirectiveHook(vnode, null, parentComponent, "created");
    }
    setScopeId(el, vnode, vnode.scopeId, slotScopeIds, parentComponent);
    if (props) {
      for (const key in props) {
        if (key !== "value" && !isReservedProp(key)) {
          hostPatchProp(el, key, null, props[key], namespace, parentComponent);
        }
      }
      if ("value" in props) {
        hostPatchProp(el, "value", null, props.value, namespace);
      }
      if (vnodeHook = props.onVnodeBeforeMount) {
        invokeVNodeHook(vnodeHook, parentComponent, vnode);
      }
    }
    if (dirs) {
      invokeDirectiveHook(vnode, null, parentComponent, "beforeMount");
    }
    const needCallTransitionHooks = needTransition(parentSuspense, transition);
    if (needCallTransitionHooks) {
      transition.beforeEnter(el);
    }
    hostInsert(el, container, anchor);
    if ((vnodeHook = props && props.onVnodeMounted) || needCallTransitionHooks || dirs) {
      queuePostRenderEffect(() => {
        vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
        needCallTransitionHooks && transition.enter(el);
        dirs && invokeDirectiveHook(vnode, null, parentComponent, "mounted");
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
      if (vnode === subTree || isSuspense(subTree.type) && (subTree.ssContent === vnode || subTree.ssFallback === vnode)) {
        const parentVNode = parentComponent.vnode;
        setScopeId(
          el,
          parentVNode,
          parentVNode.scopeId,
          parentVNode.slotScopeIds,
          parentComponent.parent
        );
      }
    }
  };
  const mountChildren = (children, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized, start = 0) => {
    for (let i = start; i < children.length; i++) {
      const child = children[i] = optimized ? cloneIfMounted(children[i]) : normalizeVNode(children[i]);
      patch(
        null,
        child,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        optimized
      );
    }
  };
  const patchElement = (n1, n2, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    const el = n2.el = n1.el;
    let { patchFlag, dynamicChildren, dirs } = n2;
    patchFlag |= n1.patchFlag & 16;
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    let vnodeHook;
    parentComponent && toggleRecurse(parentComponent, false);
    if (vnodeHook = newProps.onVnodeBeforeUpdate) {
      invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
    }
    if (dirs) {
      invokeDirectiveHook(n2, n1, parentComponent, "beforeUpdate");
    }
    parentComponent && toggleRecurse(parentComponent, true);
    if (oldProps.innerHTML && newProps.innerHTML == null || oldProps.textContent && newProps.textContent == null) {
      hostSetElementText(el, "");
    }
    if (dynamicChildren) {
      patchBlockChildren(
        n1.dynamicChildren,
        dynamicChildren,
        el,
        parentComponent,
        parentSuspense,
        resolveChildrenNamespace(n2, namespace),
        slotScopeIds
      );
    } else if (!optimized) {
      patchChildren(
        n1,
        n2,
        el,
        null,
        parentComponent,
        parentSuspense,
        resolveChildrenNamespace(n2, namespace),
        slotScopeIds,
        false
      );
    }
    if (patchFlag > 0) {
      if (patchFlag & 16) {
        patchProps(el, oldProps, newProps, parentComponent, namespace);
      } else {
        if (patchFlag & 2) {
          if (oldProps.class !== newProps.class) {
            hostPatchProp(el, "class", null, newProps.class, namespace);
          }
        }
        if (patchFlag & 4) {
          hostPatchProp(el, "style", oldProps.style, newProps.style, namespace);
        }
        if (patchFlag & 8) {
          const propsToUpdate = n2.dynamicProps;
          for (let i = 0; i < propsToUpdate.length; i++) {
            const key = propsToUpdate[i];
            const prev = oldProps[key];
            const next = newProps[key];
            if (next !== prev || key === "value") {
              hostPatchProp(el, key, prev, next, namespace, parentComponent);
            }
          }
        }
      }
      if (patchFlag & 1) {
        if (n1.children !== n2.children) {
          hostSetElementText(el, n2.children);
        }
      }
    } else if (!optimized && dynamicChildren == null) {
      patchProps(el, oldProps, newProps, parentComponent, namespace);
    }
    if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
      queuePostRenderEffect(() => {
        vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
        dirs && invokeDirectiveHook(n2, n1, parentComponent, "updated");
      }, parentSuspense);
    }
  };
  const patchBlockChildren = (oldChildren, newChildren, fallbackContainer, parentComponent, parentSuspense, namespace, slotScopeIds) => {
    for (let i = 0; i < newChildren.length; i++) {
      const oldVNode = oldChildren[i];
      const newVNode = newChildren[i];
      const container = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        oldVNode.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (oldVNode.type === Fragment$1 || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !isSameVNodeType(oldVNode, newVNode) || // - In the case of a component, it could contain anything.
        oldVNode.shapeFlag & (6 | 64)) ? hostParentNode(oldVNode.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          fallbackContainer
        )
      );
      patch(
        oldVNode,
        newVNode,
        container,
        null,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        true
      );
    }
  };
  const patchProps = (el, oldProps, newProps, parentComponent, namespace) => {
    if (oldProps !== newProps) {
      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          if (!isReservedProp(key) && !(key in newProps)) {
            hostPatchProp(
              el,
              key,
              oldProps[key],
              null,
              namespace,
              parentComponent
            );
          }
        }
      }
      for (const key in newProps) {
        if (isReservedProp(key)) continue;
        const next = newProps[key];
        const prev = oldProps[key];
        if (next !== prev && key !== "value") {
          hostPatchProp(el, key, prev, next, namespace, parentComponent);
        }
      }
      if ("value" in newProps) {
        hostPatchProp(el, "value", oldProps.value, newProps.value, namespace);
      }
    }
  };
  const processFragment = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    const fragmentStartAnchor = n2.el = n1 ? n1.el : hostCreateText("");
    const fragmentEndAnchor = n2.anchor = n1 ? n1.anchor : hostCreateText("");
    let { patchFlag, dynamicChildren, slotScopeIds: fragmentSlotScopeIds } = n2;
    if (fragmentSlotScopeIds) {
      slotScopeIds = slotScopeIds ? slotScopeIds.concat(fragmentSlotScopeIds) : fragmentSlotScopeIds;
    }
    if (n1 == null) {
      hostInsert(fragmentStartAnchor, container, anchor);
      hostInsert(fragmentEndAnchor, container, anchor);
      mountChildren(
        // #10007
        // such fragment like `<></>` will be compiled into
        // a fragment which doesn't have a children.
        // In this case fallback to an empty array
        n2.children || [],
        container,
        fragmentEndAnchor,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        optimized
      );
    } else {
      if (patchFlag > 0 && patchFlag & 64 && dynamicChildren && // #2715 the previous fragment could've been a BAILed one as a result
      // of renderSlot() with no valid children
      n1.dynamicChildren) {
        patchBlockChildren(
          n1.dynamicChildren,
          dynamicChildren,
          container,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds
        );
        if (
          // #2080 if the stable fragment has a key, it's a <template v-for> that may
          //  get moved around. Make sure all root level vnodes inherit el.
          // #2134 or if it's a component root, it may also get moved around
          // as the component is being moved.
          n2.key != null || parentComponent && n2 === parentComponent.subTree
        ) {
          traverseStaticChildren(
            n1,
            n2,
            true
            /* shallow */
          );
        }
      } else {
        patchChildren(
          n1,
          n2,
          container,
          fragmentEndAnchor,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
      }
    }
  };
  const processComponent = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    n2.slotScopeIds = slotScopeIds;
    if (n1 == null) {
      if (n2.shapeFlag & 512) {
        parentComponent.ctx.activate(
          n2,
          container,
          anchor,
          namespace,
          optimized
        );
      } else {
        mountComponent(
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace,
          optimized
        );
      }
    } else {
      updateComponent(n1, n2, optimized);
    }
  };
  const mountComponent = (initialVNode, container, anchor, parentComponent, parentSuspense, namespace, optimized) => {
    const instance = initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent,
      parentSuspense
    );
    if (isKeepAlive(initialVNode)) {
      instance.ctx.renderer = internals;
    }
    {
      setupComponent(instance, false, optimized);
    }
    if (instance.asyncDep) {
      parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect, optimized);
      if (!initialVNode.el) {
        const placeholder = instance.subTree = createVNode(Comment);
        processCommentNode(null, placeholder, container, anchor);
      }
    } else {
      setupRenderEffect(
        instance,
        initialVNode,
        container,
        anchor,
        parentSuspense,
        namespace,
        optimized
      );
    }
  };
  const updateComponent = (n1, n2, optimized) => {
    const instance = n2.component = n1.component;
    if (shouldUpdateComponent(n1, n2, optimized)) {
      if (instance.asyncDep && !instance.asyncResolved) {
        updateComponentPreRender(instance, n2, optimized);
        return;
      } else {
        instance.next = n2;
        instance.update();
      }
    } else {
      n2.el = n1.el;
      instance.vnode = n2;
    }
  };
  const setupRenderEffect = (instance, initialVNode, container, anchor, parentSuspense, namespace, optimized) => {
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        let vnodeHook;
        const { el, props } = initialVNode;
        const { bm, m, parent, root, type } = instance;
        const isAsyncWrapperVNode = isAsyncWrapper(initialVNode);
        toggleRecurse(instance, false);
        if (bm) {
          invokeArrayFns(bm);
        }
        if (!isAsyncWrapperVNode && (vnodeHook = props && props.onVnodeBeforeMount)) {
          invokeVNodeHook(vnodeHook, parent, initialVNode);
        }
        toggleRecurse(instance, true);
        if (el && hydrateNode) {
          const hydrateSubTree = () => {
            instance.subTree = renderComponentRoot(instance);
            hydrateNode(
              el,
              instance.subTree,
              instance,
              parentSuspense,
              null
            );
          };
          if (isAsyncWrapperVNode && type.__asyncHydrate) {
            type.__asyncHydrate(
              el,
              instance,
              hydrateSubTree
            );
          } else {
            hydrateSubTree();
          }
        } else {
          if (root.ce) {
            root.ce._injectChildStyle(type);
          }
          const subTree = instance.subTree = renderComponentRoot(instance);
          patch(
            null,
            subTree,
            container,
            anchor,
            instance,
            parentSuspense,
            namespace
          );
          initialVNode.el = subTree.el;
        }
        if (m) {
          queuePostRenderEffect(m, parentSuspense);
        }
        if (!isAsyncWrapperVNode && (vnodeHook = props && props.onVnodeMounted)) {
          const scopedInitialVNode = initialVNode;
          queuePostRenderEffect(
            () => invokeVNodeHook(vnodeHook, parent, scopedInitialVNode),
            parentSuspense
          );
        }
        if (initialVNode.shapeFlag & 256 || parent && isAsyncWrapper(parent.vnode) && parent.vnode.shapeFlag & 256) {
          instance.a && queuePostRenderEffect(instance.a, parentSuspense);
        }
        instance.isMounted = true;
        initialVNode = container = anchor = null;
      } else {
        let { next, bu, u, parent, vnode } = instance;
        {
          const nonHydratedAsyncRoot = locateNonHydratedAsyncRoot(instance);
          if (nonHydratedAsyncRoot) {
            if (next) {
              next.el = vnode.el;
              updateComponentPreRender(instance, next, optimized);
            }
            nonHydratedAsyncRoot.asyncDep.then(() => {
              if (!instance.isUnmounted) {
                componentUpdateFn();
              }
            });
            return;
          }
        }
        let originNext = next;
        let vnodeHook;
        toggleRecurse(instance, false);
        if (next) {
          next.el = vnode.el;
          updateComponentPreRender(instance, next, optimized);
        } else {
          next = vnode;
        }
        if (bu) {
          invokeArrayFns(bu);
        }
        if (vnodeHook = next.props && next.props.onVnodeBeforeUpdate) {
          invokeVNodeHook(vnodeHook, parent, next, vnode);
        }
        toggleRecurse(instance, true);
        const nextTree = renderComponentRoot(instance);
        const prevTree = instance.subTree;
        instance.subTree = nextTree;
        patch(
          prevTree,
          nextTree,
          // parent may have changed if it's in a teleport
          hostParentNode(prevTree.el),
          // anchor may have changed if it's in a fragment
          getNextHostNode(prevTree),
          instance,
          parentSuspense,
          namespace
        );
        next.el = nextTree.el;
        if (originNext === null) {
          updateHOCHostEl(instance, nextTree.el);
        }
        if (u) {
          queuePostRenderEffect(u, parentSuspense);
        }
        if (vnodeHook = next.props && next.props.onVnodeUpdated) {
          queuePostRenderEffect(
            () => invokeVNodeHook(vnodeHook, parent, next, vnode),
            parentSuspense
          );
        }
      }
    };
    instance.scope.on();
    const effect2 = instance.effect = new ReactiveEffect(componentUpdateFn);
    instance.scope.off();
    const update = instance.update = effect2.run.bind(effect2);
    const job = instance.job = effect2.runIfDirty.bind(effect2);
    job.i = instance;
    job.id = instance.uid;
    effect2.scheduler = () => queueJob(job);
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
    flushPreFlushCbs(instance);
    resetTracking();
  };
  const patchChildren = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized = false) => {
    const c1 = n1 && n1.children;
    const prevShapeFlag = n1 ? n1.shapeFlag : 0;
    const c2 = n2.children;
    const { patchFlag, shapeFlag } = n2;
    if (patchFlag > 0) {
      if (patchFlag & 128) {
        patchKeyedChildren(
          c1,
          c2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
        return;
      } else if (patchFlag & 256) {
        patchUnkeyedChildren(
          c1,
          c2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
        return;
      }
    }
    if (shapeFlag & 8) {
      if (prevShapeFlag & 16) {
        unmountChildren(c1, parentComponent, parentSuspense);
      }
      if (c2 !== c1) {
        hostSetElementText(container, c2);
      }
    } else {
      if (prevShapeFlag & 16) {
        if (shapeFlag & 16) {
          patchKeyedChildren(
            c1,
            c2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
        } else {
          unmountChildren(c1, parentComponent, parentSuspense, true);
        }
      } else {
        if (prevShapeFlag & 8) {
          hostSetElementText(container, "");
        }
        if (shapeFlag & 16) {
          mountChildren(
            c2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
        }
      }
    }
  };
  const patchUnkeyedChildren = (c1, c2, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    c1 = c1 || EMPTY_ARR;
    c2 = c2 || EMPTY_ARR;
    const oldLength = c1.length;
    const newLength = c2.length;
    const commonLength = Math.min(oldLength, newLength);
    let i;
    for (i = 0; i < commonLength; i++) {
      const nextChild = c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]);
      patch(
        c1[i],
        nextChild,
        container,
        null,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        optimized
      );
    }
    if (oldLength > newLength) {
      unmountChildren(
        c1,
        parentComponent,
        parentSuspense,
        true,
        false,
        commonLength
      );
    } else {
      mountChildren(
        c2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        optimized,
        commonLength
      );
    }
  };
  const patchKeyedChildren = (c1, c2, container, parentAnchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    let i = 0;
    const l2 = c2.length;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]);
      if (isSameVNodeType(n1, n2)) {
        patch(
          n1,
          n2,
          container,
          null,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
      } else {
        break;
      }
      i++;
    }
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2] = optimized ? cloneIfMounted(c2[e2]) : normalizeVNode(c2[e2]);
      if (isSameVNodeType(n1, n2)) {
        patch(
          n1,
          n2,
          container,
          null,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
      } else {
        break;
      }
      e1--;
      e2--;
    }
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
        while (i <= e2) {
          patch(
            null,
            c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]),
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
          i++;
        }
      }
    } else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i], parentComponent, parentSuspense, true);
        i++;
      }
    } else {
      const s1 = i;
      const s2 = i;
      const keyToNewIndexMap = /* @__PURE__ */ new Map();
      for (i = s2; i <= e2; i++) {
        const nextChild = c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]);
        if (nextChild.key != null) {
          keyToNewIndexMap.set(nextChild.key, i);
        }
      }
      let j;
      let patched = 0;
      const toBePatched = e2 - s2 + 1;
      let moved = false;
      let maxNewIndexSoFar = 0;
      const newIndexToOldIndexMap = new Array(toBePatched);
      for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0;
      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        if (patched >= toBePatched) {
          unmount(prevChild, parentComponent, parentSuspense, true);
          continue;
        }
        let newIndex;
        if (prevChild.key != null) {
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          for (j = s2; j <= e2; j++) {
            if (newIndexToOldIndexMap[j - s2] === 0 && isSameVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }
        if (newIndex === void 0) {
          unmount(prevChild, parentComponent, parentSuspense, true);
        } else {
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          patch(
            prevChild,
            c2[newIndex],
            container,
            null,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
          patched++;
        }
      }
      const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : EMPTY_ARR;
      j = increasingNewIndexSequence.length - 1;
      for (i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + i;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;
        if (newIndexToOldIndexMap[i] === 0) {
          patch(
            null,
            nextChild,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            move(nextChild, container, anchor, 2);
          } else {
            j--;
          }
        }
      }
    }
  };
  const move = (vnode, container, anchor, moveType, parentSuspense = null) => {
    const { el, type, transition, children, shapeFlag } = vnode;
    if (shapeFlag & 6) {
      move(vnode.component.subTree, container, anchor, moveType);
      return;
    }
    if (shapeFlag & 128) {
      vnode.suspense.move(container, anchor, moveType);
      return;
    }
    if (shapeFlag & 64) {
      type.move(vnode, container, anchor, internals);
      return;
    }
    if (type === Fragment$1) {
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
    const needTransition2 = moveType !== 2 && shapeFlag & 1 && transition;
    if (needTransition2) {
      if (moveType === 0) {
        transition.beforeEnter(el);
        hostInsert(el, container, anchor);
        queuePostRenderEffect(() => transition.enter(el), parentSuspense);
      } else {
        const { leave, delayLeave, afterLeave } = transition;
        const remove22 = () => hostInsert(el, container, anchor);
        const performLeave = () => {
          leave(el, () => {
            remove22();
            afterLeave && afterLeave();
          });
        };
        if (delayLeave) {
          delayLeave(el, remove22, performLeave);
        } else {
          performLeave();
        }
      }
    } else {
      hostInsert(el, container, anchor);
    }
  };
  const unmount = (vnode, parentComponent, parentSuspense, doRemove = false, optimized = false) => {
    const {
      type,
      props,
      ref: ref3,
      children,
      dynamicChildren,
      shapeFlag,
      patchFlag,
      dirs,
      cacheIndex
    } = vnode;
    if (patchFlag === -2) {
      optimized = false;
    }
    if (ref3 != null) {
      setRef(ref3, null, parentSuspense, vnode, true);
    }
    if (cacheIndex != null) {
      parentComponent.renderCache[cacheIndex] = void 0;
    }
    if (shapeFlag & 256) {
      parentComponent.ctx.deactivate(vnode);
      return;
    }
    const shouldInvokeDirs = shapeFlag & 1 && dirs;
    const shouldInvokeVnodeHook = !isAsyncWrapper(vnode);
    let vnodeHook;
    if (shouldInvokeVnodeHook && (vnodeHook = props && props.onVnodeBeforeUnmount)) {
      invokeVNodeHook(vnodeHook, parentComponent, vnode);
    }
    if (shapeFlag & 6) {
      unmountComponent(vnode.component, parentSuspense, doRemove);
    } else {
      if (shapeFlag & 128) {
        vnode.suspense.unmount(parentSuspense, doRemove);
        return;
      }
      if (shouldInvokeDirs) {
        invokeDirectiveHook(vnode, null, parentComponent, "beforeUnmount");
      }
      if (shapeFlag & 64) {
        vnode.type.remove(
          vnode,
          parentComponent,
          parentSuspense,
          internals,
          doRemove
        );
      } else if (dynamicChildren && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !dynamicChildren.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (type !== Fragment$1 || patchFlag > 0 && patchFlag & 64)) {
        unmountChildren(
          dynamicChildren,
          parentComponent,
          parentSuspense,
          false,
          true
        );
      } else if (type === Fragment$1 && patchFlag & (128 | 256) || !optimized && shapeFlag & 16) {
        unmountChildren(children, parentComponent, parentSuspense);
      }
      if (doRemove) {
        remove2(vnode);
      }
    }
    if (shouldInvokeVnodeHook && (vnodeHook = props && props.onVnodeUnmounted) || shouldInvokeDirs) {
      queuePostRenderEffect(() => {
        vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
        shouldInvokeDirs && invokeDirectiveHook(vnode, null, parentComponent, "unmounted");
      }, parentSuspense);
    }
  };
  const remove2 = (vnode) => {
    const { type, el, anchor, transition } = vnode;
    if (type === Fragment$1) {
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
    if (vnode.shapeFlag & 1 && transition && !transition.persisted) {
      const { leave, delayLeave } = transition;
      const performLeave = () => leave(el, performRemove);
      if (delayLeave) {
        delayLeave(vnode.el, performRemove, performLeave);
      } else {
        performLeave();
      }
    } else {
      performRemove();
    }
  };
  const removeFragment = (cur, end) => {
    let next;
    while (cur !== end) {
      next = hostNextSibling(cur);
      hostRemove(cur);
      cur = next;
    }
    hostRemove(end);
  };
  const unmountComponent = (instance, parentSuspense, doRemove) => {
    const { bum, scope, job, subTree, um, m, a } = instance;
    invalidateMount(m);
    invalidateMount(a);
    if (bum) {
      invokeArrayFns(bum);
    }
    scope.stop();
    if (job) {
      job.flags |= 8;
      unmount(subTree, instance, parentSuspense, doRemove);
    }
    if (um) {
      queuePostRenderEffect(um, parentSuspense);
    }
    queuePostRenderEffect(() => {
      instance.isUnmounted = true;
    }, parentSuspense);
    if (parentSuspense && parentSuspense.pendingBranch && !parentSuspense.isUnmounted && instance.asyncDep && !instance.asyncResolved && instance.suspenseId === parentSuspense.pendingId) {
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
  const getNextHostNode = (vnode) => {
    if (vnode.shapeFlag & 6) {
      return getNextHostNode(vnode.component.subTree);
    }
    if (vnode.shapeFlag & 128) {
      return vnode.suspense.next();
    }
    const el = hostNextSibling(vnode.anchor || vnode.el);
    const teleportEnd = el && el[TeleportEndKey];
    return teleportEnd ? hostNextSibling(teleportEnd) : el;
  };
  let isFlushing = false;
  const render = (vnode, container, namespace) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode, null, null, true);
      }
    } else {
      patch(
        container._vnode || null,
        vnode,
        container,
        null,
        null,
        null,
        namespace
      );
    }
    container._vnode = vnode;
    if (!isFlushing) {
      isFlushing = true;
      flushPreFlushCbs();
      flushPostFlushCbs();
      isFlushing = false;
    }
  };
  const internals = {
    p: patch,
    um: unmount,
    m: move,
    r: remove2,
    mt: mountComponent,
    mc: mountChildren,
    pc: patchChildren,
    pbc: patchBlockChildren,
    n: getNextHostNode,
    o: options
  };
  let hydrate;
  let hydrateNode;
  return {
    render,
    hydrate,
    createApp: createAppAPI(render, hydrate)
  };
}
function resolveChildrenNamespace({ type, props }, currentNamespace) {
  return currentNamespace === "svg" && type === "foreignObject" || currentNamespace === "mathml" && type === "annotation-xml" && props && props.encoding && props.encoding.includes("html") ? void 0 : currentNamespace;
}
function toggleRecurse({ effect: effect2, job }, allowed) {
  if (allowed) {
    effect2.flags |= 32;
    job.flags |= 4;
  } else {
    effect2.flags &= ~32;
    job.flags &= ~4;
  }
}
function needTransition(parentSuspense, transition) {
  return (!parentSuspense || parentSuspense && !parentSuspense.pendingBranch) && transition && !transition.persisted;
}
function traverseStaticChildren(n1, n2, shallow = false) {
  const ch1 = n1.children;
  const ch2 = n2.children;
  if (isArray$1(ch1) && isArray$1(ch2)) {
    for (let i = 0; i < ch1.length; i++) {
      const c1 = ch1[i];
      let c2 = ch2[i];
      if (c2.shapeFlag & 1 && !c2.dynamicChildren) {
        if (c2.patchFlag <= 0 || c2.patchFlag === 32) {
          c2 = ch2[i] = cloneIfMounted(ch2[i]);
          c2.el = c1.el;
        }
        if (!shallow && c2.patchFlag !== -2)
          traverseStaticChildren(c1, c2);
      }
      if (c2.type === Text) {
        c2.el = c1.el;
      }
    }
  }
}
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
        c = u + v >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
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
function locateNonHydratedAsyncRoot(instance) {
  const subComponent = instance.subTree.component;
  if (subComponent) {
    if (subComponent.asyncDep && !subComponent.asyncResolved) {
      return subComponent;
    } else {
      return locateNonHydratedAsyncRoot(subComponent);
    }
  }
}
function invalidateMount(hooks) {
  if (hooks) {
    for (let i = 0; i < hooks.length; i++)
      hooks[i].flags |= 8;
  }
}
const ssrContextKey = Symbol.for("v-scx");
const useSSRContext = () => {
  {
    const ctx = inject(ssrContextKey);
    return ctx;
  }
};
function watchEffect(effect2, options) {
  return doWatch(effect2, null, options);
}
function watch(source, cb, options) {
  return doWatch(source, cb, options);
}
function doWatch(source, cb, options = EMPTY_OBJ) {
  const { immediate, deep, flush, once } = options;
  const baseWatchOptions = extend({}, options);
  const runsImmediately = cb && immediate || !cb && flush !== "post";
  let ssrCleanup;
  if (isInSSRComponentSetup) {
    if (flush === "sync") {
      const ctx = useSSRContext();
      ssrCleanup = ctx.__watcherHandles || (ctx.__watcherHandles = []);
    } else if (!runsImmediately) {
      const watchStopHandle = () => {
      };
      watchStopHandle.stop = NOOP;
      watchStopHandle.resume = NOOP;
      watchStopHandle.pause = NOOP;
      return watchStopHandle;
    }
  }
  const instance = currentInstance;
  baseWatchOptions.call = (fn, type, args) => callWithAsyncErrorHandling(fn, instance, type, args);
  let isPre = false;
  if (flush === "post") {
    baseWatchOptions.scheduler = (job) => {
      queuePostRenderEffect(job, instance && instance.suspense);
    };
  } else if (flush !== "sync") {
    isPre = true;
    baseWatchOptions.scheduler = (job, isFirstRun) => {
      if (isFirstRun) {
        job();
      } else {
        queueJob(job);
      }
    };
  }
  baseWatchOptions.augmentJob = (job) => {
    if (cb) {
      job.flags |= 4;
    }
    if (isPre) {
      job.flags |= 2;
      if (instance) {
        job.id = instance.uid;
        job.i = instance;
      }
    }
  };
  const watchHandle = watch$1(source, cb, baseWatchOptions);
  if (isInSSRComponentSetup) {
    if (ssrCleanup) {
      ssrCleanup.push(watchHandle);
    } else if (runsImmediately) {
      watchHandle();
    }
  }
  return watchHandle;
}
function instanceWatch(source, value, options) {
  const publicThis = this.proxy;
  const getter = isString$1(source) ? source.includes(".") ? createPathGetter(publicThis, source) : () => publicThis[source] : source.bind(publicThis, publicThis);
  let cb;
  if (isFunction(value)) {
    cb = value;
  } else {
    cb = value.handler;
    options = value;
  }
  const reset = setCurrentInstance(this);
  const res = doWatch(getter, cb.bind(publicThis), options);
  reset();
  return res;
}
function createPathGetter(ctx, path) {
  const segments = path.split(".");
  return () => {
    let cur = ctx;
    for (let i = 0; i < segments.length && cur; i++) {
      cur = cur[segments[i]];
    }
    return cur;
  };
}
const getModelModifiers = (props, modelName) => {
  return modelName === "modelValue" || modelName === "model-value" ? props.modelModifiers : props[`${modelName}Modifiers`] || props[`${camelize(modelName)}Modifiers`] || props[`${hyphenate(modelName)}Modifiers`];
};
function emit(instance, event, ...rawArgs) {
  if (instance.isUnmounted) return;
  const props = instance.vnode.props || EMPTY_OBJ;
  let args = rawArgs;
  const isModelListener2 = event.startsWith("update:");
  const modifiers = isModelListener2 && getModelModifiers(props, event.slice(7));
  if (modifiers) {
    if (modifiers.trim) {
      args = rawArgs.map((a) => isString$1(a) ? a.trim() : a);
    }
    if (modifiers.number) {
      args = rawArgs.map(looseToNumber);
    }
  }
  let handlerName;
  let handler = props[handlerName = toHandlerKey(event)] || // also try camelCase event handler (#2249)
  props[handlerName = toHandlerKey(camelize(event))];
  if (!handler && isModelListener2) {
    handler = props[handlerName = toHandlerKey(hyphenate(event))];
  }
  if (handler) {
    callWithAsyncErrorHandling(
      handler,
      instance,
      6,
      args
    );
  }
  const onceHandler = props[handlerName + `Once`];
  if (onceHandler) {
    if (!instance.emitted) {
      instance.emitted = {};
    } else if (instance.emitted[handlerName]) {
      return;
    }
    instance.emitted[handlerName] = true;
    callWithAsyncErrorHandling(
      onceHandler,
      instance,
      6,
      args
    );
  }
}
function normalizeEmitsOptions(comp, appContext, asMixin = false) {
  const cache = appContext.emitsCache;
  const cached = cache.get(comp);
  if (cached !== void 0) {
    return cached;
  }
  const raw = comp.emits;
  let normalized = {};
  let hasExtends = false;
  if (!isFunction(comp)) {
    const extendEmits = (raw2) => {
      const normalizedFromExtend = normalizeEmitsOptions(raw2, appContext, true);
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
  if (isArray$1(raw)) {
    raw.forEach((key) => normalized[key] = null);
  } else {
    extend(normalized, raw);
  }
  if (isObject$1(comp)) {
    cache.set(comp, normalized);
  }
  return normalized;
}
function isEmitListener(options, key) {
  if (!options || !isOn(key)) {
    return false;
  }
  key = key.slice(2).replace(/Once$/, "");
  return hasOwn(options, key[0].toLowerCase() + key.slice(1)) || hasOwn(options, hyphenate(key)) || hasOwn(options, key);
}
function markAttrsAccessed() {
}
function renderComponentRoot(instance) {
  const {
    type: Component,
    vnode,
    proxy,
    withProxy,
    propsOptions: [propsOptions],
    slots,
    attrs,
    emit: emit2,
    render,
    renderCache,
    props,
    data,
    setupState,
    ctx,
    inheritAttrs
  } = instance;
  const prev = setCurrentRenderingInstance(instance);
  let result;
  let fallthroughAttrs;
  try {
    if (vnode.shapeFlag & 4) {
      const proxyToUse = withProxy || proxy;
      const thisProxy = false ? new Proxy(proxyToUse, {
        get(target, key, receiver) {
          warn$1(
            `Property '${String(
              key
            )}' was accessed via 'this'. Avoid using 'this' in templates.`
          );
          return Reflect.get(target, key, receiver);
        }
      }) : proxyToUse;
      result = normalizeVNode(
        render.call(
          thisProxy,
          proxyToUse,
          renderCache,
          false ? shallowReadonly(props) : props,
          setupState,
          data,
          ctx
        )
      );
      fallthroughAttrs = attrs;
    } else {
      const render2 = Component;
      if (false) ;
      result = normalizeVNode(
        render2.length > 1 ? render2(
          false ? shallowReadonly(props) : props,
          false ? {
            get attrs() {
              markAttrsAccessed();
              return shallowReadonly(attrs);
            },
            slots,
            emit: emit2
          } : { attrs, slots, emit: emit2 }
        ) : render2(
          false ? shallowReadonly(props) : props,
          null
        )
      );
      fallthroughAttrs = Component.props ? attrs : getFunctionalFallthrough(attrs);
    }
  } catch (err) {
    blockStack.length = 0;
    handleError(err, instance, 1);
    result = createVNode(Comment);
  }
  let root = result;
  if (fallthroughAttrs && inheritAttrs !== false) {
    const keys = Object.keys(fallthroughAttrs);
    const { shapeFlag } = root;
    if (keys.length) {
      if (shapeFlag & (1 | 6)) {
        if (propsOptions && keys.some(isModelListener)) {
          fallthroughAttrs = filterModelListeners(
            fallthroughAttrs,
            propsOptions
          );
        }
        root = cloneVNode(root, fallthroughAttrs, false, true);
      }
    }
  }
  if (vnode.dirs) {
    root = cloneVNode(root, null, false, true);
    root.dirs = root.dirs ? root.dirs.concat(vnode.dirs) : vnode.dirs;
  }
  if (vnode.transition) {
    setTransitionHooks(root, vnode.transition);
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
    if (key === "class" || key === "style" || isOn(key)) {
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
  if (nextVNode.dirs || nextVNode.transition) {
    return true;
  }
  if (optimized && patchFlag >= 0) {
    if (patchFlag & 1024) {
      return true;
    }
    if (patchFlag & 16) {
      if (!prevProps) {
        return !!nextProps;
      }
      return hasPropsChanged(prevProps, nextProps, emits);
    } else if (patchFlag & 8) {
      const dynamicProps = nextVNode.dynamicProps;
      for (let i = 0; i < dynamicProps.length; i++) {
        const key = dynamicProps[i];
        if (nextProps[key] !== prevProps[key] && !isEmitListener(emits, key)) {
          return true;
        }
      }
    }
  } else {
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
    if (nextProps[key] !== prevProps[key] && !isEmitListener(emitsOptions, key)) {
      return true;
    }
  }
  return false;
}
function updateHOCHostEl({ vnode, parent }, el) {
  while (parent) {
    const root = parent.subTree;
    if (root.suspense && root.suspense.activeBranch === vnode) {
      root.el = vnode.el;
    }
    if (root === vnode) {
      (vnode = parent.vnode).el = el;
      parent = parent.parent;
    } else {
      break;
    }
  }
}
const isSuspense = (type) => type.__isSuspense;
function queueEffectWithSuspense(fn, suspense) {
  if (suspense && suspense.pendingBranch) {
    if (isArray$1(fn)) {
      suspense.effects.push(...fn);
    } else {
      suspense.effects.push(fn);
    }
  } else {
    queuePostFlushCb(fn);
  }
}
const Fragment$1 = Symbol.for("v-fgt");
const Text = Symbol.for("v-txt");
const Comment = Symbol.for("v-cmt");
const Static = Symbol.for("v-stc");
const blockStack = [];
let currentBlock = null;
function openBlock(disableTracking = false) {
  blockStack.push(currentBlock = disableTracking ? null : []);
}
function closeBlock() {
  blockStack.pop();
  currentBlock = blockStack[blockStack.length - 1] || null;
}
let isBlockTreeEnabled = 1;
function setBlockTracking(value) {
  isBlockTreeEnabled += value;
  if (value < 0 && currentBlock) {
    currentBlock.hasOnce = true;
  }
}
function setupBlock(vnode) {
  vnode.dynamicChildren = isBlockTreeEnabled > 0 ? currentBlock || EMPTY_ARR : null;
  closeBlock();
  if (isBlockTreeEnabled > 0 && currentBlock) {
    currentBlock.push(vnode);
  }
  return vnode;
}
function createElementBlock(type, props, children, patchFlag, dynamicProps, shapeFlag) {
  return setupBlock(
    createBaseVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      shapeFlag,
      true
    )
  );
}
function createBlock(type, props, children, patchFlag, dynamicProps) {
  return setupBlock(
    createVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      true
    )
  );
}
function isVNode(value) {
  return value ? value.__v_isVNode === true : false;
}
function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
const normalizeKey = ({ key }) => key != null ? key : null;
const normalizeRef = ({
  ref: ref3,
  ref_key,
  ref_for
}) => {
  if (typeof ref3 === "number") {
    ref3 = "" + ref3;
  }
  return ref3 != null ? isString$1(ref3) || isRef$1(ref3) || isFunction(ref3) ? { i: currentRenderingInstance, r: ref3, k: ref_key, f: !!ref_for } : ref3 : null;
};
function createBaseVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, shapeFlag = type === Fragment$1 ? 0 : 1, isBlockNode = false, needFullChildrenNormalization = false) {
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
    targetStart: null,
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
    if (shapeFlag & 128) {
      type.normalize(vnode);
    }
  } else if (children) {
    vnode.shapeFlag |= isString$1(children) ? 8 : 16;
  }
  if (isBlockTreeEnabled > 0 && // avoid a block node from tracking itself
  !isBlockNode && // has current parent block
  currentBlock && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (vnode.patchFlag > 0 || shapeFlag & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  vnode.patchFlag !== 32) {
    currentBlock.push(vnode);
  }
  return vnode;
}
const createVNode = _createVNode;
function _createVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, isBlockNode = false) {
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    type = Comment;
  }
  if (isVNode(type)) {
    const cloned = cloneVNode(
      type,
      props,
      true
      /* mergeRef: true */
    );
    if (children) {
      normalizeChildren$1(cloned, children);
    }
    if (isBlockTreeEnabled > 0 && !isBlockNode && currentBlock) {
      if (cloned.shapeFlag & 6) {
        currentBlock[currentBlock.indexOf(type)] = cloned;
      } else {
        currentBlock.push(cloned);
      }
    }
    cloned.patchFlag = -2;
    return cloned;
  }
  if (isClassComponent(type)) {
    type = type.__vccOpts;
  }
  if (props) {
    props = guardReactiveProps(props);
    let { class: klass, style } = props;
    if (klass && !isString$1(klass)) {
      props.class = normalizeClass(klass);
    }
    if (isObject$1(style)) {
      if (isProxy(style) && !isArray$1(style)) {
        style = extend({}, style);
      }
      props.style = normalizeStyle(style);
    }
  }
  const shapeFlag = isString$1(type) ? 1 : isSuspense(type) ? 128 : isTeleport(type) ? 64 : isObject$1(type) ? 4 : isFunction(type) ? 2 : 0;
  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode,
    true
  );
}
function guardReactiveProps(props) {
  if (!props) return null;
  return isProxy(props) || isInternalObject(props) ? extend({}, props) : props;
}
function cloneVNode(vnode, extraProps, mergeRef = false, cloneTransition = false) {
  const { props, ref: ref3, patchFlag, children, transition } = vnode;
  const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props;
  const cloned = {
    __v_isVNode: true,
    __v_skip: true,
    type: vnode.type,
    props: mergedProps,
    key: mergedProps && normalizeKey(mergedProps),
    ref: extraProps && extraProps.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      mergeRef && ref3 ? isArray$1(ref3) ? ref3.concat(normalizeRef(extraProps)) : [ref3, normalizeRef(extraProps)] : normalizeRef(extraProps)
    ) : ref3,
    scopeId: vnode.scopeId,
    slotScopeIds: vnode.slotScopeIds,
    children: children,
    target: vnode.target,
    targetStart: vnode.targetStart,
    targetAnchor: vnode.targetAnchor,
    staticCount: vnode.staticCount,
    shapeFlag: vnode.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: extraProps && vnode.type !== Fragment$1 ? patchFlag === -1 ? 16 : patchFlag | 16 : patchFlag,
    dynamicProps: vnode.dynamicProps,
    dynamicChildren: vnode.dynamicChildren,
    appContext: vnode.appContext,
    dirs: vnode.dirs,
    transition,
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
  if (transition && cloneTransition) {
    setTransitionHooks(
      cloned,
      transition.clone(cloned)
    );
  }
  return cloned;
}
function createTextVNode(text = " ", flag = 0) {
  return createVNode(Text, null, text, flag);
}
function createStaticVNode(content, numberOfNodes) {
  const vnode = createVNode(Static, null, content);
  vnode.staticCount = numberOfNodes;
  return vnode;
}
function createCommentVNode(text = "", asBlock = false) {
  return asBlock ? (openBlock(), createBlock(Comment, null, text)) : createVNode(Comment, null, text);
}
function normalizeVNode(child) {
  if (child == null || typeof child === "boolean") {
    return createVNode(Comment);
  } else if (isArray$1(child)) {
    return createVNode(
      Fragment$1,
      null,
      // #3666, avoid reference pollution when reusing vnode
      child.slice()
    );
  } else if (isVNode(child)) {
    return cloneIfMounted(child);
  } else {
    return createVNode(Text, null, String(child));
  }
}
function cloneIfMounted(child) {
  return child.el === null && child.patchFlag !== -1 || child.memo ? child : cloneVNode(child);
}
function normalizeChildren$1(vnode, children) {
  let type = 0;
  const { shapeFlag } = vnode;
  if (children == null) {
    children = null;
  } else if (isArray$1(children)) {
    type = 16;
  } else if (typeof children === "object") {
    if (shapeFlag & (1 | 64)) {
      const slot = children.default;
      if (slot) {
        slot._c && (slot._d = false);
        normalizeChildren$1(vnode, slot());
        slot._c && (slot._d = true);
      }
      return;
    } else {
      type = 32;
      const slotFlag = children._;
      if (!slotFlag && !isInternalObject(children)) {
        children._ctx = currentRenderingInstance;
      } else if (slotFlag === 3 && currentRenderingInstance) {
        if (currentRenderingInstance.slots._ === 1) {
          children._ = 1;
        } else {
          children._ = 2;
          vnode.patchFlag |= 1024;
        }
      }
    }
  } else if (isFunction(children)) {
    children = { default: children, _ctx: currentRenderingInstance };
    type = 32;
  } else {
    children = String(children);
    if (shapeFlag & 64) {
      type = 16;
      children = [createTextVNode(children)];
    } else {
      type = 8;
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
      if (key === "class") {
        if (ret.class !== toMerge.class) {
          ret.class = normalizeClass([ret.class, toMerge.class]);
        }
      } else if (key === "style") {
        ret.style = normalizeStyle([ret.style, toMerge.style]);
      } else if (isOn(key)) {
        const existing = ret[key];
        const incoming = toMerge[key];
        if (incoming && existing !== incoming && !(isArray$1(existing) && existing.includes(incoming))) {
          ret[key] = existing ? [].concat(existing, incoming) : incoming;
        }
      } else if (key !== "") {
        ret[key] = toMerge[key];
      }
    }
  }
  return ret;
}
function invokeVNodeHook(hook, instance, vnode, prevVNode = null) {
  callWithAsyncErrorHandling(hook, instance, 7, [
    vnode,
    prevVNode
  ]);
}
const emptyAppContext = createAppContext();
let uid = 0;
function createComponentInstance(vnode, parent, suspense) {
  const type = vnode.type;
  const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext;
  const instance = {
    uid: uid++,
    vnode,
    type,
    parent,
    appContext,
    root: null,
    // to be immediately set
    next: null,
    subTree: null,
    // will be set synchronously right after creation
    effect: null,
    update: null,
    // will be set synchronously right after creation
    job: null,
    scope: new EffectScope(
      true
      /* detached */
    ),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: parent ? parent.provides : Object.create(appContext.provides),
    ids: parent ? parent.ids : ["", 0, 0],
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
    // to be set immediately
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
  if (vnode.ce) {
    vnode.ce(instance);
  }
  return instance;
}
let currentInstance = null;
const getCurrentInstance = () => currentInstance || currentRenderingInstance;
let internalSetCurrentInstance;
let setInSSRSetupState;
{
  const g = getGlobalThis();
  const registerGlobalSetter = (key, setter) => {
    let setters;
    if (!(setters = g[key])) setters = g[key] = [];
    setters.push(setter);
    return (v) => {
      if (setters.length > 1) setters.forEach((set) => set(v));
      else setters[0](v);
    };
  };
  internalSetCurrentInstance = registerGlobalSetter(
    `__VUE_INSTANCE_SETTERS__`,
    (v) => currentInstance = v
  );
  setInSSRSetupState = registerGlobalSetter(
    `__VUE_SSR_SETTERS__`,
    (v) => isInSSRComponentSetup = v
  );
}
const setCurrentInstance = (instance) => {
  const prev = currentInstance;
  internalSetCurrentInstance(instance);
  instance.scope.on();
  return () => {
    instance.scope.off();
    internalSetCurrentInstance(prev);
  };
};
const unsetCurrentInstance = () => {
  currentInstance && currentInstance.scope.off();
  internalSetCurrentInstance(null);
};
function isStatefulComponent(instance) {
  return instance.vnode.shapeFlag & 4;
}
let isInSSRComponentSetup = false;
function setupComponent(instance, isSSR = false, optimized = false) {
  isSSR && setInSSRSetupState(isSSR);
  const { props, children } = instance.vnode;
  const isStateful = isStatefulComponent(instance);
  initProps(instance, props, isStateful, isSSR);
  initSlots(instance, children, optimized);
  const setupResult = isStateful ? setupStatefulComponent(instance, isSSR) : void 0;
  isSSR && setInSSRSetupState(false);
  return setupResult;
}
function setupStatefulComponent(instance, isSSR) {
  const Component = instance.type;
  instance.accessCache = /* @__PURE__ */ Object.create(null);
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
  const { setup } = Component;
  if (setup) {
    pauseTracking();
    const setupContext = instance.setupContext = setup.length > 1 ? createSetupContext(instance) : null;
    const reset = setCurrentInstance(instance);
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      0,
      [
        instance.props,
        setupContext
      ]
    );
    const isAsyncSetup = isPromise(setupResult);
    resetTracking();
    reset();
    if ((isAsyncSetup || instance.sp) && !isAsyncWrapper(instance)) {
      markAsyncBoundary(instance);
    }
    if (isAsyncSetup) {
      setupResult.then(unsetCurrentInstance, unsetCurrentInstance);
      if (isSSR) {
        return setupResult.then((resolvedResult) => {
          handleSetupResult(instance, resolvedResult, isSSR);
        }).catch((e) => {
          handleError(e, instance, 0);
        });
      } else {
        instance.asyncDep = setupResult;
      }
    } else {
      handleSetupResult(instance, setupResult, isSSR);
    }
  } else {
    finishComponentSetup(instance, isSSR);
  }
}
function handleSetupResult(instance, setupResult, isSSR) {
  if (isFunction(setupResult)) {
    if (instance.type.__ssrInlineRender) {
      instance.ssrRender = setupResult;
    } else {
      instance.render = setupResult;
    }
  } else if (isObject$1(setupResult)) {
    instance.setupState = proxyRefs(setupResult);
  } else ;
  finishComponentSetup(instance, isSSR);
}
let compile;
function finishComponentSetup(instance, isSSR, skipOptions) {
  const Component = instance.type;
  if (!instance.render) {
    if (!isSSR && compile && !Component.render) {
      const template = Component.template || resolveMergedOptions(instance).template;
      if (template) {
        const { isCustomElement, compilerOptions } = instance.appContext.config;
        const { delimiters, compilerOptions: componentCompilerOptions } = Component;
        const finalCompilerOptions = extend(
          extend(
            {
              isCustomElement,
              delimiters
            },
            compilerOptions
          ),
          componentCompilerOptions
        );
        Component.render = compile(template, finalCompilerOptions);
      }
    }
    instance.render = Component.render || NOOP;
  }
  {
    const reset = setCurrentInstance(instance);
    pauseTracking();
    try {
      applyOptions(instance);
    } finally {
      resetTracking();
      reset();
    }
  }
}
const attrsProxyHandlers = {
  get(target, key) {
    track(target, "get", "");
    return target[key];
  }
};
function createSetupContext(instance) {
  const expose = (exposed) => {
    instance.exposed = exposed || {};
  };
  {
    return {
      attrs: new Proxy(instance.attrs, attrsProxyHandlers),
      slots: instance.slots,
      emit: instance.emit,
      expose
    };
  }
}
function getComponentPublicInstance(instance) {
  if (instance.exposed) {
    return instance.exposeProxy || (instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
      get(target, key) {
        if (key in target) {
          return target[key];
        } else if (key in publicPropertiesMap) {
          return publicPropertiesMap[key](instance);
        }
      },
      has(target, key) {
        return key in target || key in publicPropertiesMap;
      }
    }));
  } else {
    return instance.proxy;
  }
}
const classifyRE$1 = /(?:^|[-_])(\w)/g;
const classify$1 = (str) => str.replace(classifyRE$1, (c) => c.toUpperCase()).replace(/[-_]/g, "");
function getComponentName(Component, includeInferred = true) {
  return isFunction(Component) ? Component.displayName || Component.name : Component.name || includeInferred && Component.__name;
}
function formatComponentName(instance, Component, isRoot = false) {
  let name = getComponentName(Component);
  if (!name && Component.__file) {
    const match = Component.__file.match(/([^/\\]+)\.\w+$/);
    if (match) {
      name = match[1];
    }
  }
  if (!name && instance && instance.parent) {
    const inferFromRegistry = (registry) => {
      for (const key in registry) {
        if (registry[key] === Component) {
          return key;
        }
      }
    };
    name = inferFromRegistry(
      instance.components || instance.parent.type.components
    ) || inferFromRegistry(instance.appContext.components);
  }
  return name ? classify$1(name) : isRoot ? `App` : `Anonymous`;
}
function isClassComponent(value) {
  return isFunction(value) && "__vccOpts" in value;
}
const computed = (getterOrOptions, debugOptions) => {
  const c = computed$1(getterOrOptions, debugOptions, isInSSRComponentSetup);
  return c;
};
function h(type, propsOrChildren, children) {
  const l = arguments.length;
  if (l === 2) {
    if (isObject$1(propsOrChildren) && !isArray$1(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      }
      return createVNode(type, propsOrChildren);
    } else {
      return createVNode(type, null, propsOrChildren);
    }
  } else {
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2);
    } else if (l === 3 && isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}
const version = "3.5.12";

/**
* @vue/runtime-dom v3.5.12
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
let policy = void 0;
const tt = typeof window !== "undefined" && window.trustedTypes;
if (tt) {
  try {
    policy = /* @__PURE__ */ tt.createPolicy("vue", {
      createHTML: (val) => val
    });
  } catch (e) {
  }
}
const unsafeToTrustedHTML = policy ? (val) => policy.createHTML(val) : (val) => val;
const svgNS = "http://www.w3.org/2000/svg";
const mathmlNS = "http://www.w3.org/1998/Math/MathML";
const doc = typeof document !== "undefined" ? document : null;
const templateContainer = doc && /* @__PURE__ */ doc.createElement("template");
const nodeOps = {
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null);
  },
  remove: (child) => {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },
  createElement: (tag, namespace, is, props) => {
    const el = namespace === "svg" ? doc.createElementNS(svgNS, tag) : namespace === "mathml" ? doc.createElementNS(mathmlNS, tag) : is ? doc.createElement(tag, { is }) : doc.createElement(tag);
    if (tag === "select" && props && props.multiple != null) {
      el.setAttribute("multiple", props.multiple);
    }
    return el;
  },
  createText: (text) => doc.createTextNode(text),
  createComment: (text) => doc.createComment(text),
  setText: (node, text) => {
    node.nodeValue = text;
  },
  setElementText: (el, text) => {
    el.textContent = text;
  },
  parentNode: (node) => node.parentNode,
  nextSibling: (node) => node.nextSibling,
  querySelector: (selector) => doc.querySelector(selector),
  setScopeId(el, id) {
    el.setAttribute(id, "");
  },
  // __UNSAFE__
  // Reason: innerHTML.
  // Static content here can only come from compiled templates.
  // As long as the user only uses trusted templates, this is safe.
  insertStaticContent(content, parent, anchor, namespace, start, end) {
    const before = anchor ? anchor.previousSibling : parent.lastChild;
    if (start && (start === end || start.nextSibling)) {
      while (true) {
        parent.insertBefore(start.cloneNode(true), anchor);
        if (start === end || !(start = start.nextSibling)) break;
      }
    } else {
      templateContainer.innerHTML = unsafeToTrustedHTML(
        namespace === "svg" ? `<svg>${content}</svg>` : namespace === "mathml" ? `<math>${content}</math>` : content
      );
      const template = templateContainer.content;
      if (namespace === "svg" || namespace === "mathml") {
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
const vtcKey = Symbol("_vtc");
function patchClass(el, value, isSVG) {
  const transitionClasses = el[vtcKey];
  if (transitionClasses) {
    value = (value ? [value, ...transitionClasses] : [...transitionClasses]).join(" ");
  }
  if (value == null) {
    el.removeAttribute("class");
  } else if (isSVG) {
    el.setAttribute("class", value);
  } else {
    el.className = value;
  }
}
const vShowOriginalDisplay = Symbol("_vod");
const vShowHidden = Symbol("_vsh");
const vShow = {
  beforeMount(el, { value }, { transition }) {
    el[vShowOriginalDisplay] = el.style.display === "none" ? "" : el.style.display;
    if (transition && value) {
      transition.beforeEnter(el);
    } else {
      setDisplay(el, value);
    }
  },
  mounted(el, { value }, { transition }) {
    if (transition && value) {
      transition.enter(el);
    }
  },
  updated(el, { value, oldValue }, { transition }) {
    if (!value === !oldValue) return;
    if (transition) {
      if (value) {
        transition.beforeEnter(el);
        setDisplay(el, true);
        transition.enter(el);
      } else {
        transition.leave(el, () => {
          setDisplay(el, false);
        });
      }
    } else {
      setDisplay(el, value);
    }
  },
  beforeUnmount(el, { value }) {
    setDisplay(el, value);
  }
};
function setDisplay(el, value) {
  el.style.display = value ? el[vShowOriginalDisplay] : "none";
  el[vShowHidden] = !value;
}
const CSS_VAR_TEXT = Symbol("");
const displayRE = /(^|;)\s*display\s*:/;
function patchStyle(el, prev, next) {
  const style = el.style;
  const isCssString = isString$1(next);
  let hasControlledDisplay = false;
  if (next && !isCssString) {
    if (prev) {
      if (!isString$1(prev)) {
        for (const key in prev) {
          if (next[key] == null) {
            setStyle(style, key, "");
          }
        }
      } else {
        for (const prevStyle of prev.split(";")) {
          const key = prevStyle.slice(0, prevStyle.indexOf(":")).trim();
          if (next[key] == null) {
            setStyle(style, key, "");
          }
        }
      }
    }
    for (const key in next) {
      if (key === "display") {
        hasControlledDisplay = true;
      }
      setStyle(style, key, next[key]);
    }
  } else {
    if (isCssString) {
      if (prev !== next) {
        const cssVarText = style[CSS_VAR_TEXT];
        if (cssVarText) {
          next += ";" + cssVarText;
        }
        style.cssText = next;
        hasControlledDisplay = displayRE.test(next);
      }
    } else if (prev) {
      el.removeAttribute("style");
    }
  }
  if (vShowOriginalDisplay in el) {
    el[vShowOriginalDisplay] = hasControlledDisplay ? style.display : "";
    if (el[vShowHidden]) {
      style.display = "none";
    }
  }
}
const importantRE = /\s*!important$/;
function setStyle(style, name, val) {
  if (isArray$1(val)) {
    val.forEach((v) => setStyle(style, name, v));
  } else {
    if (val == null) val = "";
    if (name.startsWith("--")) {
      style.setProperty(name, val);
    } else {
      const prefixed = autoPrefix(style, name);
      if (importantRE.test(val)) {
        style.setProperty(
          hyphenate(prefixed),
          val.replace(importantRE, ""),
          "important"
        );
      } else {
        style[prefixed] = val;
      }
    }
  }
}
const prefixes$1 = ["Webkit", "Moz", "ms"];
const prefixCache = {};
function autoPrefix(style, rawName) {
  const cached = prefixCache[rawName];
  if (cached) {
    return cached;
  }
  let name = camelize(rawName);
  if (name !== "filter" && name in style) {
    return prefixCache[rawName] = name;
  }
  name = capitalize(name);
  for (let i = 0; i < prefixes$1.length; i++) {
    const prefixed = prefixes$1[i] + name;
    if (prefixed in style) {
      return prefixCache[rawName] = prefixed;
    }
  }
  return rawName;
}
const xlinkNS = "http://www.w3.org/1999/xlink";
function patchAttr(el, key, value, isSVG, instance, isBoolean = isSpecialBooleanAttr(key)) {
  if (isSVG && key.startsWith("xlink:")) {
    if (value == null) {
      el.removeAttributeNS(xlinkNS, key.slice(6, key.length));
    } else {
      el.setAttributeNS(xlinkNS, key, value);
    }
  } else {
    if (value == null || isBoolean && !includeBooleanAttr(value)) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(
        key,
        isBoolean ? "" : isSymbol$1(value) ? String(value) : value
      );
    }
  }
}
function patchDOMProp(el, key, value, parentComponent, attrName) {
  if (key === "innerHTML" || key === "textContent") {
    if (value != null) {
      el[key] = key === "innerHTML" ? unsafeToTrustedHTML(value) : value;
    }
    return;
  }
  const tag = el.tagName;
  if (key === "value" && tag !== "PROGRESS" && // custom elements may use _value internally
  !tag.includes("-")) {
    const oldValue = tag === "OPTION" ? el.getAttribute("value") || "" : el.value;
    const newValue = value == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      el.type === "checkbox" ? "on" : ""
    ) : String(value);
    if (oldValue !== newValue || !("_value" in el)) {
      el.value = newValue;
    }
    if (value == null) {
      el.removeAttribute(key);
    }
    el._value = value;
    return;
  }
  let needRemove = false;
  if (value === "" || value == null) {
    const type = typeof el[key];
    if (type === "boolean") {
      value = includeBooleanAttr(value);
    } else if (value == null && type === "string") {
      value = "";
      needRemove = true;
    } else if (type === "number") {
      value = 0;
      needRemove = true;
    }
  }
  try {
    el[key] = value;
  } catch (e) {
  }
  needRemove && el.removeAttribute(attrName || key);
}
function addEventListener(el, event, handler, options) {
  el.addEventListener(event, handler, options);
}
function removeEventListener(el, event, handler, options) {
  el.removeEventListener(event, handler, options);
}
const veiKey = Symbol("_vei");
function patchEvent(el, rawName, prevValue, nextValue, instance = null) {
  const invokers = el[veiKey] || (el[veiKey] = {});
  const existingInvoker = invokers[rawName];
  if (nextValue && existingInvoker) {
    existingInvoker.value = nextValue;
  } else {
    const [name, options] = parseName(rawName);
    if (nextValue) {
      const invoker = invokers[rawName] = createInvoker(
        nextValue,
        instance
      );
      addEventListener(el, name, invoker, options);
    } else if (existingInvoker) {
      removeEventListener(el, name, existingInvoker, options);
      invokers[rawName] = void 0;
    }
  }
}
const optionsModifierRE = /(?:Once|Passive|Capture)$/;
function parseName(name) {
  let options;
  if (optionsModifierRE.test(name)) {
    options = {};
    let m;
    while (m = name.match(optionsModifierRE)) {
      name = name.slice(0, name.length - m[0].length);
      options[m[0].toLowerCase()] = true;
    }
  }
  const event = name[2] === ":" ? name.slice(3) : hyphenate(name.slice(2));
  return [event, options];
}
let cachedNow = 0;
const p = /* @__PURE__ */ Promise.resolve();
const getNow = () => cachedNow || (p.then(() => cachedNow = 0), cachedNow = Date.now());
function createInvoker(initialValue, instance) {
  const invoker = (e) => {
    if (!e._vts) {
      e._vts = Date.now();
    } else if (e._vts <= invoker.attached) {
      return;
    }
    callWithAsyncErrorHandling(
      patchStopImmediatePropagation(e, invoker.value),
      instance,
      5,
      [e]
    );
  };
  invoker.value = initialValue;
  invoker.attached = getNow();
  return invoker;
}
function patchStopImmediatePropagation(e, value) {
  if (isArray$1(value)) {
    const originalStop = e.stopImmediatePropagation;
    e.stopImmediatePropagation = () => {
      originalStop.call(e);
      e._stopped = true;
    };
    return value.map(
      (fn) => (e2) => !e2._stopped && fn && fn(e2)
    );
  } else {
    return value;
  }
}
const isNativeOn = (key) => key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110 && // lowercase letter
key.charCodeAt(2) > 96 && key.charCodeAt(2) < 123;
const patchProp = (el, key, prevValue, nextValue, namespace, parentComponent) => {
  const isSVG = namespace === "svg";
  if (key === "class") {
    patchClass(el, nextValue, isSVG);
  } else if (key === "style") {
    patchStyle(el, prevValue, nextValue);
  } else if (isOn(key)) {
    if (!isModelListener(key)) {
      patchEvent(el, key, prevValue, nextValue, parentComponent);
    }
  } else if (key[0] === "." ? (key = key.slice(1), true) : key[0] === "^" ? (key = key.slice(1), false) : shouldSetAsProp(el, key, nextValue, isSVG)) {
    patchDOMProp(el, key, nextValue);
    if (!el.tagName.includes("-") && (key === "value" || key === "checked" || key === "selected")) {
      patchAttr(el, key, nextValue, isSVG, parentComponent, key !== "value");
    }
  } else if (
    // #11081 force set props for possible async custom element
    el._isVueCE && (/[A-Z]/.test(key) || !isString$1(nextValue))
  ) {
    patchDOMProp(el, camelize(key), nextValue, parentComponent, key);
  } else {
    if (key === "true-value") {
      el._trueValue = nextValue;
    } else if (key === "false-value") {
      el._falseValue = nextValue;
    }
    patchAttr(el, key, nextValue, isSVG);
  }
};
function shouldSetAsProp(el, key, value, isSVG) {
  if (isSVG) {
    if (key === "innerHTML" || key === "textContent") {
      return true;
    }
    if (key in el && isNativeOn(key) && isFunction(value)) {
      return true;
    }
    return false;
  }
  if (key === "spellcheck" || key === "draggable" || key === "translate") {
    return false;
  }
  if (key === "form") {
    return false;
  }
  if (key === "list" && el.tagName === "INPUT") {
    return false;
  }
  if (key === "type" && el.tagName === "TEXTAREA") {
    return false;
  }
  if (key === "width" || key === "height") {
    const tag = el.tagName;
    if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS" || tag === "SOURCE") {
      return false;
    }
  }
  if (isNativeOn(key) && isString$1(value)) {
    return false;
  }
  return key in el;
}
const getModelAssigner = (vnode) => {
  const fn = vnode.props["onUpdate:modelValue"] || false;
  return isArray$1(fn) ? (value) => invokeArrayFns(fn, value) : fn;
};
function onCompositionStart(e) {
  e.target.composing = true;
}
function onCompositionEnd(e) {
  const target = e.target;
  if (target.composing) {
    target.composing = false;
    target.dispatchEvent(new Event("input"));
  }
}
const assignKey = Symbol("_assign");
const vModelText = {
  created(el, { modifiers: { lazy, trim, number } }, vnode) {
    el[assignKey] = getModelAssigner(vnode);
    const castToNumber = number || vnode.props && vnode.props.type === "number";
    addEventListener(el, lazy ? "change" : "input", (e) => {
      if (e.target.composing) return;
      let domValue = el.value;
      if (trim) {
        domValue = domValue.trim();
      }
      if (castToNumber) {
        domValue = looseToNumber(domValue);
      }
      el[assignKey](domValue);
    });
    if (trim) {
      addEventListener(el, "change", () => {
        el.value = el.value.trim();
      });
    }
    if (!lazy) {
      addEventListener(el, "compositionstart", onCompositionStart);
      addEventListener(el, "compositionend", onCompositionEnd);
      addEventListener(el, "change", onCompositionEnd);
    }
  },
  // set value on mounted so it's after min/max for type="range"
  mounted(el, { value }) {
    el.value = value == null ? "" : value;
  },
  beforeUpdate(el, { value, oldValue, modifiers: { lazy, trim, number } }, vnode) {
    el[assignKey] = getModelAssigner(vnode);
    if (el.composing) return;
    const elValue = (number || el.type === "number") && !/^0\d/.test(el.value) ? looseToNumber(el.value) : el.value;
    const newValue = value == null ? "" : value;
    if (elValue === newValue) {
      return;
    }
    if (document.activeElement === el && el.type !== "range") {
      if (lazy && value === oldValue) {
        return;
      }
      if (trim && el.value.trim() === newValue) {
        return;
      }
    }
    el.value = newValue;
  }
};
const vModelCheckbox = {
  // #4096 array checkboxes need to be deep traversed
  deep: true,
  created(el, _, vnode) {
    el[assignKey] = getModelAssigner(vnode);
    addEventListener(el, "change", () => {
      const modelValue = el._modelValue;
      const elementValue = getValue(el);
      const checked = el.checked;
      const assign = el[assignKey];
      if (isArray$1(modelValue)) {
        const index = looseIndexOf(modelValue, elementValue);
        const found = index !== -1;
        if (checked && !found) {
          assign(modelValue.concat(elementValue));
        } else if (!checked && found) {
          const filtered = [...modelValue];
          filtered.splice(index, 1);
          assign(filtered);
        }
      } else if (isSet$1(modelValue)) {
        const cloned = new Set(modelValue);
        if (checked) {
          cloned.add(elementValue);
        } else {
          cloned.delete(elementValue);
        }
        assign(cloned);
      } else {
        assign(getCheckboxValue(el, checked));
      }
    });
  },
  // set initial checked on mount to wait for true-value/false-value
  mounted: setChecked,
  beforeUpdate(el, binding, vnode) {
    el[assignKey] = getModelAssigner(vnode);
    setChecked(el, binding, vnode);
  }
};
function setChecked(el, { value, oldValue }, vnode) {
  el._modelValue = value;
  let checked;
  if (isArray$1(value)) {
    checked = looseIndexOf(value, vnode.props.value) > -1;
  } else if (isSet$1(value)) {
    checked = value.has(vnode.props.value);
  } else {
    if (value === oldValue) return;
    checked = looseEqual(value, getCheckboxValue(el, true));
  }
  if (el.checked !== checked) {
    el.checked = checked;
  }
}
const vModelRadio = {
  created(el, { value }, vnode) {
    el.checked = looseEqual(value, vnode.props.value);
    el[assignKey] = getModelAssigner(vnode);
    addEventListener(el, "change", () => {
      el[assignKey](getValue(el));
    });
  },
  beforeUpdate(el, { value, oldValue }, vnode) {
    el[assignKey] = getModelAssigner(vnode);
    if (value !== oldValue) {
      el.checked = looseEqual(value, vnode.props.value);
    }
  }
};
const vModelSelect = {
  // <select multiple> value need to be deep traversed
  deep: true,
  created(el, { value, modifiers: { number } }, vnode) {
    const isSetModel = isSet$1(value);
    addEventListener(el, "change", () => {
      const selectedVal = Array.prototype.filter.call(el.options, (o) => o.selected).map(
        (o) => number ? looseToNumber(getValue(o)) : getValue(o)
      );
      el[assignKey](
        el.multiple ? isSetModel ? new Set(selectedVal) : selectedVal : selectedVal[0]
      );
      el._assigning = true;
      nextTick(() => {
        el._assigning = false;
      });
    });
    el[assignKey] = getModelAssigner(vnode);
  },
  // set value in mounted & updated because <select> relies on its children
  // <option>s.
  mounted(el, { value }) {
    setSelected(el, value);
  },
  beforeUpdate(el, _binding, vnode) {
    el[assignKey] = getModelAssigner(vnode);
  },
  updated(el, { value }) {
    if (!el._assigning) {
      setSelected(el, value);
    }
  }
};
function setSelected(el, value) {
  const isMultiple = el.multiple;
  const isArrayValue = isArray$1(value);
  if (isMultiple && !isArrayValue && !isSet$1(value)) {
    return;
  }
  for (let i = 0, l = el.options.length; i < l; i++) {
    const option = el.options[i];
    const optionValue = getValue(option);
    if (isMultiple) {
      if (isArrayValue) {
        const optionType = typeof optionValue;
        if (optionType === "string" || optionType === "number") {
          option.selected = value.some((v) => String(v) === String(optionValue));
        } else {
          option.selected = looseIndexOf(value, optionValue) > -1;
        }
      } else {
        option.selected = value.has(optionValue);
      }
    } else if (looseEqual(getValue(option), value)) {
      if (el.selectedIndex !== i) el.selectedIndex = i;
      return;
    }
  }
  if (!isMultiple && el.selectedIndex !== -1) {
    el.selectedIndex = -1;
  }
}
function getValue(el) {
  return "_value" in el ? el._value : el.value;
}
function getCheckboxValue(el, checked) {
  const key = checked ? "_trueValue" : "_falseValue";
  return key in el ? el[key] : checked;
}
const rendererOptions = /* @__PURE__ */ extend({ patchProp }, nodeOps);
let renderer;
function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions));
}
const createApp = (...args) => {
  const app = ensureRenderer().createApp(...args);
  const { mount } = app;
  app.mount = (containerOrSelector) => {
    const container = normalizeContainer(containerOrSelector);
    if (!container) return;
    const component = app._component;
    if (!isFunction(component) && !component.render && !component.template) {
      component.template = container.innerHTML;
    }
    if (container.nodeType === 1) {
      container.textContent = "";
    }
    const proxy = mount(container, false, resolveRootNamespace(container));
    if (container instanceof Element) {
      container.removeAttribute("v-cloak");
      container.setAttribute("data-v-app", "");
    }
    return proxy;
  };
  return app;
};
function resolveRootNamespace(container) {
  if (container instanceof SVGElement) {
    return "svg";
  }
  if (typeof MathMLElement === "function" && container instanceof MathMLElement) {
    return "mathml";
  }
}
function normalizeContainer(container) {
  if (isString$1(container)) {
    const res = document.querySelector(container);
    return res;
  }
  return container;
}

var isVue2 = false;

/*!
 * pinia v2.2.4
 * (c) 2024 Eduardo San Martin Morote
 * @license MIT
 */
let activePinia;
const setActivePinia = (pinia) => activePinia = pinia;
const piniaSymbol = (
  /* istanbul ignore next */
  Symbol()
);
function isPlainObject$1(o) {
  return o && typeof o === "object" && Object.prototype.toString.call(o) === "[object Object]" && typeof o.toJSON !== "function";
}
var MutationType;
(function(MutationType2) {
  MutationType2["direct"] = "direct";
  MutationType2["patchObject"] = "patch object";
  MutationType2["patchFunction"] = "patch function";
})(MutationType || (MutationType = {}));
function createPinia() {
  const scope = effectScope(true);
  const state = scope.run(() => ref({}));
  let _p = [];
  let toBeInstalled = [];
  const pinia = markRaw({
    install(app) {
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
      } else {
        _p.push(plugin);
      }
      return this;
    },
    _p,
    // it's actually undefined here
    // @ts-expect-error
    _a: null,
    _e: scope,
    _s: /* @__PURE__ */ new Map(),
    state
  });
  return pinia;
}
const noop = () => {
};
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
const fallbackRunWithContext = (fn) => fn();
const ACTION_MARKER = Symbol();
const ACTION_NAME = Symbol();
function mergeReactiveObjects(target, patchToApply) {
  if (target instanceof Map && patchToApply instanceof Map) {
    patchToApply.forEach((value, key) => target.set(key, value));
  } else if (target instanceof Set && patchToApply instanceof Set) {
    patchToApply.forEach(target.add, target);
  }
  for (const key in patchToApply) {
    if (!patchToApply.hasOwnProperty(key))
      continue;
    const subPatch = patchToApply[key];
    const targetValue = target[key];
    if (isPlainObject$1(targetValue) && isPlainObject$1(subPatch) && target.hasOwnProperty(key) && !isRef$1(subPatch) && !isReactive$1(subPatch)) {
      target[key] = mergeReactiveObjects(targetValue, subPatch);
    } else {
      target[key] = subPatch;
    }
  }
  return target;
}
const skipHydrateSymbol = (
  /* istanbul ignore next */
  Symbol()
);
function shouldHydrate(obj) {
  return !isPlainObject$1(obj) || !obj.hasOwnProperty(skipHydrateSymbol);
}
const { assign } = Object;
function isComputed(o) {
  return !!(isRef$1(o) && o.effect);
}
function createOptionsStore(id, options, pinia, hot) {
  const { state, actions, getters } = options;
  const initialState = pinia.state.value[id];
  let store;
  function setup() {
    if (!initialState && true) {
      {
        pinia.state.value[id] = state ? state() : {};
      }
    }
    const localState = toRefs(pinia.state.value[id]);
    return assign(localState, actions, Object.keys(getters || {}).reduce((computedGetters, name) => {
      computedGetters[name] = markRaw(computed(() => {
        setActivePinia(pinia);
        const store2 = pinia._s.get(id);
        return getters[name].call(store2, store2);
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
  const $subscribeOptions = { deep: true };
  let isListening;
  let isSyncListening;
  let subscriptions = [];
  let actionSubscriptions = [];
  let debuggerEvents;
  const initialState = pinia.state.value[$id];
  if (!isOptionsStore && !initialState && true) {
    {
      pinia.state.value[$id] = {};
    }
  }
  ref({});
  let activeListener;
  function $patch(partialStateOrMutator) {
    let subscriptionMutation;
    isListening = isSyncListening = false;
    if (typeof partialStateOrMutator === "function") {
      partialStateOrMutator(pinia.state.value[$id]);
      subscriptionMutation = {
        type: MutationType.patchFunction,
        storeId: $id,
        events: debuggerEvents
      };
    } else {
      mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator);
      subscriptionMutation = {
        type: MutationType.patchObject,
        payload: partialStateOrMutator,
        storeId: $id,
        events: debuggerEvents
      };
    }
    const myListenerId = activeListener = Symbol();
    nextTick().then(() => {
      if (activeListener === myListenerId) {
        isListening = true;
      }
    });
    isSyncListening = true;
    triggerSubscriptions(subscriptions, subscriptionMutation, pinia.state.value[$id]);
  }
  const $reset = isOptionsStore ? function $reset2() {
    const { state } = options;
    const newState = state ? state() : {};
    this.$patch(($state) => {
      assign($state, newState);
    });
  } : (
    /* istanbul ignore next */
    noop
  );
  function $dispose() {
    scope.stop();
    subscriptions = [];
    actionSubscriptions = [];
    pinia._s.delete($id);
  }
  const action = (fn, name = "") => {
    if (ACTION_MARKER in fn) {
      fn[ACTION_NAME] = name;
      return fn;
    }
    const wrappedAction = function() {
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
      triggerSubscriptions(actionSubscriptions, {
        args,
        name: wrappedAction[ACTION_NAME],
        store,
        after,
        onError
      });
      let ret;
      try {
        ret = fn.apply(this && this.$id === $id ? this : store, args);
      } catch (error) {
        triggerSubscriptions(onErrorCallbackList, error);
        throw error;
      }
      if (ret instanceof Promise) {
        return ret.then((value) => {
          triggerSubscriptions(afterCallbackList, value);
          return value;
        }).catch((error) => {
          triggerSubscriptions(onErrorCallbackList, error);
          return Promise.reject(error);
        });
      }
      triggerSubscriptions(afterCallbackList, ret);
      return ret;
    };
    wrappedAction[ACTION_MARKER] = true;
    wrappedAction[ACTION_NAME] = name;
    return wrappedAction;
  };
  const partialStore = {
    _p: pinia,
    // _s: scope,
    $id,
    $onAction: addSubscription.bind(null, actionSubscriptions),
    $patch,
    $reset,
    $subscribe(callback, options2 = {}) {
      const removeSubscription = addSubscription(subscriptions, callback, options2.detached, () => stopWatcher());
      const stopWatcher = scope.run(() => watch(() => pinia.state.value[$id], (state) => {
        if (options2.flush === "sync" ? isSyncListening : isListening) {
          callback({
            storeId: $id,
            type: MutationType.direct,
            events: debuggerEvents
          }, state);
        }
      }, assign({}, $subscribeOptions, options2)));
      return removeSubscription;
    },
    $dispose
  };
  const store = reactive(partialStore);
  pinia._s.set($id, store);
  const runWithContext = pinia._a && pinia._a.runWithContext || fallbackRunWithContext;
  const setupStore = runWithContext(() => pinia._e.run(() => (scope = effectScope()).run(() => setup({ action }))));
  for (const key in setupStore) {
    const prop = setupStore[key];
    if (isRef$1(prop) && !isComputed(prop) || isReactive$1(prop)) {
      if (!isOptionsStore) {
        if (initialState && shouldHydrate(prop)) {
          if (isRef$1(prop)) {
            prop.value = initialState[key];
          } else {
            mergeReactiveObjects(prop, initialState[key]);
          }
        }
        {
          pinia.state.value[$id][key] = prop;
        }
      }
    } else if (typeof prop === "function") {
      const actionValue = action(prop, key);
      {
        setupStore[key] = actionValue;
      }
      optionsForPlugin.actions[key] = prop;
    } else ;
  }
  {
    assign(store, setupStore);
    assign(toRaw$1(store), setupStore);
  }
  Object.defineProperty(store, "$state", {
    get: () => pinia.state.value[$id],
    set: (state) => {
      $patch(($state) => {
        assign($state, state);
      });
    }
  });
  pinia._p.forEach((extender) => {
    {
      assign(store, scope.run(() => extender({
        store,
        app: pinia._a,
        pinia,
        options: optionsForPlugin
      })));
    }
  });
  if (initialState && isOptionsStore && options.hydrate) {
    options.hydrate(store.$state, initialState);
  }
  isListening = true;
  isSyncListening = true;
  return store;
}
// @__NO_SIDE_EFFECTS__
function defineStore(idOrOptions, setup, setupOptions) {
  let id;
  let options;
  const isSetupStore = typeof setup === "function";
  if (typeof idOrOptions === "string") {
    id = idOrOptions;
    options = isSetupStore ? setupOptions : setup;
  } else {
    options = idOrOptions;
    id = idOrOptions.id;
  }
  function useStore(pinia, hot) {
    const hasContext = hasInjectionContext();
    pinia = // in test mode, ignore the argument provided as we can always retrieve a
    // pinia instance with getActivePinia()
    (pinia) || (hasContext ? inject(piniaSymbol, null) : null);
    if (pinia)
      setActivePinia(pinia);
    pinia = activePinia;
    if (!pinia._s.has(id)) {
      if (isSetupStore) {
        createSetupStore(id, setup, options, pinia);
      } else {
        createOptionsStore(id, options, pinia);
      }
    }
    const store = pinia._s.get(id);
    return store;
  }
  useStore.$id = id;
  return useStore;
}
function storeToRefs(store) {
  {
    store = toRaw$1(store);
    const refs = {};
    for (const key in store) {
      const value = store[key];
      if (isRef$1(value) || isReactive$1(value)) {
        refs[key] = // ---
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
    dumpHtm: false,
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
    dumpHtm: false,
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
        if (hDisabled.value["cnv.font.subset"]) return;
        if (hDisabled.value["cnv.mat.pic"]) return;
        if (hDisabled.value["cnv.mat.snd"]) return;
        cmd2Ex({ cmd: "update.oWss", oWss: toRaw$1(this.oWss) });
      });
      on$1("notice.Component", ({ id, mode }) => {
        if (id === "cnv.mat.snd.codec") return;
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
const on$1 = (nm, fnc) => aHook.push({ nm, fnc });
window.addEventListener("message", (e) => {
  if (!e.isTrusted) {
    warn("Setting.vue isTrusted=false");
    return;
  }
  go(e.data.cmd, e.data);
});
function go(nm, data) {
  for (const v of aHook) {
    if (v.nm === nm) v.fnc(data);
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
    on$1("!", ({ oCfg, oWss }) => {
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
      this.$subscribe(() => this.subscribe(toRaw$1(this.oCfg)));
      on$1("update.oCfg", ({ oCfg: oCfg2 }) => this.oCfg = oCfg2);
    },
    // useField を使うと $subscribe が効かない
    subscribe(oCfg) {
      cmd2Ex({ cmd: "update.oCfg", oCfg });
    }
  }
});

var __create$1 = Object.create;
var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames$1 = Object.getOwnPropertyNames;
var __getProtoOf$1 = Object.getPrototypeOf;
var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
var __esm$1 = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames$1(fn)[0]])(fn = 0)), res;
};
var __commonJS$1 = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames$1(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps$1 = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames$1(from))
      if (!__hasOwnProp$1.call(to, key) && key !== except)
        __defProp$1(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc$1(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM$1 = (mod, isNodeMode, target2) => (target2 = mod != null ? __create$1(__getProtoOf$1(mod)) : {}, __copyProps$1(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  __defProp$1(target2, "default", { value: mod, enumerable: true }) ,
  mod
));

// ../../node_modules/.pnpm/tsup@8.3.0_@microsoft+api-extractor@7.43.0_@types+node@20.16.11__@swc+core@1.5.29_jiti@2.0.0__khi6fwhekjxtif3xyxfitrs5gq/node_modules/tsup/assets/esm_shims.js
var init_esm_shims$1 = __esm$1({
  "../../node_modules/.pnpm/tsup@8.3.0_@microsoft+api-extractor@7.43.0_@types+node@20.16.11__@swc+core@1.5.29_jiti@2.0.0__khi6fwhekjxtif3xyxfitrs5gq/node_modules/tsup/assets/esm_shims.js"() {
  }
});

// ../../node_modules/.pnpm/rfdc@1.4.1/node_modules/rfdc/index.js
var require_rfdc = __commonJS$1({
  "../../node_modules/.pnpm/rfdc@1.4.1/node_modules/rfdc/index.js"(exports, module) {
    init_esm_shims$1();
    module.exports = rfdc2;
    function copyBuffer(cur) {
      if (cur instanceof Buffer) {
        return Buffer.from(cur);
      }
      return new cur.constructor(cur.buffer.slice(), cur.byteOffset, cur.length);
    }
    function rfdc2(opts) {
      opts = opts || {};
      if (opts.circles) return rfdcCircles(opts);
      const constructorHandlers = /* @__PURE__ */ new Map();
      constructorHandlers.set(Date, (o) => new Date(o));
      constructorHandlers.set(Map, (o, fn) => new Map(cloneArray(Array.from(o), fn)));
      constructorHandlers.set(Set, (o, fn) => new Set(cloneArray(Array.from(o), fn)));
      if (opts.constructorHandlers) {
        for (const handler2 of opts.constructorHandlers) {
          constructorHandlers.set(handler2[0], handler2[1]);
        }
      }
      let handler = null;
      return opts.proto ? cloneProto : clone;
      function cloneArray(a, fn) {
        const keys = Object.keys(a);
        const a2 = new Array(keys.length);
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          const cur = a[k];
          if (typeof cur !== "object" || cur === null) {
            a2[k] = cur;
          } else if (cur.constructor !== Object && (handler = constructorHandlers.get(cur.constructor))) {
            a2[k] = handler(cur, fn);
          } else if (ArrayBuffer.isView(cur)) {
            a2[k] = copyBuffer(cur);
          } else {
            a2[k] = fn(cur);
          }
        }
        return a2;
      }
      function clone(o) {
        if (typeof o !== "object" || o === null) return o;
        if (Array.isArray(o)) return cloneArray(o, clone);
        if (o.constructor !== Object && (handler = constructorHandlers.get(o.constructor))) {
          return handler(o, clone);
        }
        const o2 = {};
        for (const k in o) {
          if (Object.hasOwnProperty.call(o, k) === false) continue;
          const cur = o[k];
          if (typeof cur !== "object" || cur === null) {
            o2[k] = cur;
          } else if (cur.constructor !== Object && (handler = constructorHandlers.get(cur.constructor))) {
            o2[k] = handler(cur, clone);
          } else if (ArrayBuffer.isView(cur)) {
            o2[k] = copyBuffer(cur);
          } else {
            o2[k] = clone(cur);
          }
        }
        return o2;
      }
      function cloneProto(o) {
        if (typeof o !== "object" || o === null) return o;
        if (Array.isArray(o)) return cloneArray(o, cloneProto);
        if (o.constructor !== Object && (handler = constructorHandlers.get(o.constructor))) {
          return handler(o, cloneProto);
        }
        const o2 = {};
        for (const k in o) {
          const cur = o[k];
          if (typeof cur !== "object" || cur === null) {
            o2[k] = cur;
          } else if (cur.constructor !== Object && (handler = constructorHandlers.get(cur.constructor))) {
            o2[k] = handler(cur, cloneProto);
          } else if (ArrayBuffer.isView(cur)) {
            o2[k] = copyBuffer(cur);
          } else {
            o2[k] = cloneProto(cur);
          }
        }
        return o2;
      }
    }
    function rfdcCircles(opts) {
      const refs = [];
      const refsNew = [];
      const constructorHandlers = /* @__PURE__ */ new Map();
      constructorHandlers.set(Date, (o) => new Date(o));
      constructorHandlers.set(Map, (o, fn) => new Map(cloneArray(Array.from(o), fn)));
      constructorHandlers.set(Set, (o, fn) => new Set(cloneArray(Array.from(o), fn)));
      if (opts.constructorHandlers) {
        for (const handler2 of opts.constructorHandlers) {
          constructorHandlers.set(handler2[0], handler2[1]);
        }
      }
      let handler = null;
      return opts.proto ? cloneProto : clone;
      function cloneArray(a, fn) {
        const keys = Object.keys(a);
        const a2 = new Array(keys.length);
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          const cur = a[k];
          if (typeof cur !== "object" || cur === null) {
            a2[k] = cur;
          } else if (cur.constructor !== Object && (handler = constructorHandlers.get(cur.constructor))) {
            a2[k] = handler(cur, fn);
          } else if (ArrayBuffer.isView(cur)) {
            a2[k] = copyBuffer(cur);
          } else {
            const index = refs.indexOf(cur);
            if (index !== -1) {
              a2[k] = refsNew[index];
            } else {
              a2[k] = fn(cur);
            }
          }
        }
        return a2;
      }
      function clone(o) {
        if (typeof o !== "object" || o === null) return o;
        if (Array.isArray(o)) return cloneArray(o, clone);
        if (o.constructor !== Object && (handler = constructorHandlers.get(o.constructor))) {
          return handler(o, clone);
        }
        const o2 = {};
        refs.push(o);
        refsNew.push(o2);
        for (const k in o) {
          if (Object.hasOwnProperty.call(o, k) === false) continue;
          const cur = o[k];
          if (typeof cur !== "object" || cur === null) {
            o2[k] = cur;
          } else if (cur.constructor !== Object && (handler = constructorHandlers.get(cur.constructor))) {
            o2[k] = handler(cur, clone);
          } else if (ArrayBuffer.isView(cur)) {
            o2[k] = copyBuffer(cur);
          } else {
            const i = refs.indexOf(cur);
            if (i !== -1) {
              o2[k] = refsNew[i];
            } else {
              o2[k] = clone(cur);
            }
          }
        }
        refs.pop();
        refsNew.pop();
        return o2;
      }
      function cloneProto(o) {
        if (typeof o !== "object" || o === null) return o;
        if (Array.isArray(o)) return cloneArray(o, cloneProto);
        if (o.constructor !== Object && (handler = constructorHandlers.get(o.constructor))) {
          return handler(o, cloneProto);
        }
        const o2 = {};
        refs.push(o);
        refsNew.push(o2);
        for (const k in o) {
          const cur = o[k];
          if (typeof cur !== "object" || cur === null) {
            o2[k] = cur;
          } else if (cur.constructor !== Object && (handler = constructorHandlers.get(cur.constructor))) {
            o2[k] = handler(cur, cloneProto);
          } else if (ArrayBuffer.isView(cur)) {
            o2[k] = copyBuffer(cur);
          } else {
            const i = refs.indexOf(cur);
            if (i !== -1) {
              o2[k] = refsNew[i];
            } else {
              o2[k] = cloneProto(cur);
            }
          }
        }
        refs.pop();
        refsNew.pop();
        return o2;
      }
    }
  }
});

// src/index.ts
init_esm_shims$1();

// src/constants.ts
init_esm_shims$1();

// src/env.ts
init_esm_shims$1();
var isBrowser = typeof navigator !== "undefined";
var target = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : {};
typeof target.chrome !== "undefined" && !!target.chrome.devtools;
isBrowser && target.self !== target.top;
var _a$1;
typeof navigator !== "undefined" && ((_a$1 = navigator.userAgent) == null ? void 0 : _a$1.toLowerCase().includes("electron"));

// src/general.ts
init_esm_shims$1();
var import_rfdc = __toESM$1(require_rfdc());
var classifyRE = /(?:^|[-_/])(\w)/g;
function toUpper(_, c) {
  return c ? c.toUpperCase() : "";
}
function classify(str) {
  return str && `${str}`.replace(classifyRE, toUpper);
}
function basename(filename, ext) {
  let normalizedFilename = filename.replace(/^[a-z]:/i, "").replace(/\\/g, "/");
  if (normalizedFilename.endsWith(`index${ext}`)) {
    normalizedFilename = normalizedFilename.replace(`/index${ext}`, ext);
  }
  const lastSlashIndex = normalizedFilename.lastIndexOf("/");
  const baseNameWithExt = normalizedFilename.substring(lastSlashIndex + 1);
  {
    const extIndex = baseNameWithExt.lastIndexOf(ext);
    return baseNameWithExt.substring(0, extIndex);
  }
}
var deepClone = (0, import_rfdc.default)({ circles: true });

const DEBOUNCE_DEFAULTS = {
  trailing: true
};
function debounce(fn, wait = 25, options = {}) {
  options = { ...DEBOUNCE_DEFAULTS, ...options };
  if (!Number.isFinite(wait)) {
    throw new TypeError("Expected `wait` to be a finite number");
  }
  let leadingValue;
  let timeout;
  let resolveList = [];
  let currentPromise;
  let trailingArgs;
  const applyFn = (_this, args) => {
    currentPromise = _applyPromised(fn, _this, args);
    currentPromise.finally(() => {
      currentPromise = null;
      if (options.trailing && trailingArgs && !timeout) {
        const promise = applyFn(_this, trailingArgs);
        trailingArgs = null;
        return promise;
      }
    });
    return currentPromise;
  };
  return function(...args) {
    if (currentPromise) {
      if (options.trailing) {
        trailingArgs = args;
      }
      return currentPromise;
    }
    return new Promise((resolve) => {
      const shouldCallNow = !timeout && options.leading;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        const promise = options.leading ? leadingValue : applyFn(this, args);
        for (const _resolve of resolveList) {
          _resolve(promise);
        }
        resolveList = [];
      }, wait);
      if (shouldCallNow) {
        leadingValue = applyFn(this, args);
        resolve(leadingValue);
      } else {
        resolveList.push(resolve);
      }
    });
  };
}
async function _applyPromised(fn, _this, args) {
  return await fn.apply(_this, args);
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target22) => (target22 = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  __defProp(target22, "default", { value: mod, enumerable: true }) ,
  mod
));

// ../../node_modules/.pnpm/tsup@8.3.0_@microsoft+api-extractor@7.43.0_@types+node@20.16.11__@swc+core@1.5.29_jiti@2.0.0__khi6fwhekjxtif3xyxfitrs5gq/node_modules/tsup/assets/esm_shims.js
var init_esm_shims = __esm({
  "../../node_modules/.pnpm/tsup@8.3.0_@microsoft+api-extractor@7.43.0_@types+node@20.16.11__@swc+core@1.5.29_jiti@2.0.0__khi6fwhekjxtif3xyxfitrs5gq/node_modules/tsup/assets/esm_shims.js"() {
  }
});

// ../../node_modules/.pnpm/speakingurl@14.0.1/node_modules/speakingurl/lib/speakingurl.js
var require_speakingurl = __commonJS({
  "../../node_modules/.pnpm/speakingurl@14.0.1/node_modules/speakingurl/lib/speakingurl.js"(exports, module) {
    init_esm_shims();
    (function(root) {
      var charMap = {
        // latin
        "\xC0": "A",
        "\xC1": "A",
        "\xC2": "A",
        "\xC3": "A",
        "\xC4": "Ae",
        "\xC5": "A",
        "\xC6": "AE",
        "\xC7": "C",
        "\xC8": "E",
        "\xC9": "E",
        "\xCA": "E",
        "\xCB": "E",
        "\xCC": "I",
        "\xCD": "I",
        "\xCE": "I",
        "\xCF": "I",
        "\xD0": "D",
        "\xD1": "N",
        "\xD2": "O",
        "\xD3": "O",
        "\xD4": "O",
        "\xD5": "O",
        "\xD6": "Oe",
        "\u0150": "O",
        "\xD8": "O",
        "\xD9": "U",
        "\xDA": "U",
        "\xDB": "U",
        "\xDC": "Ue",
        "\u0170": "U",
        "\xDD": "Y",
        "\xDE": "TH",
        "\xDF": "ss",
        "\xE0": "a",
        "\xE1": "a",
        "\xE2": "a",
        "\xE3": "a",
        "\xE4": "ae",
        "\xE5": "a",
        "\xE6": "ae",
        "\xE7": "c",
        "\xE8": "e",
        "\xE9": "e",
        "\xEA": "e",
        "\xEB": "e",
        "\xEC": "i",
        "\xED": "i",
        "\xEE": "i",
        "\xEF": "i",
        "\xF0": "d",
        "\xF1": "n",
        "\xF2": "o",
        "\xF3": "o",
        "\xF4": "o",
        "\xF5": "o",
        "\xF6": "oe",
        "\u0151": "o",
        "\xF8": "o",
        "\xF9": "u",
        "\xFA": "u",
        "\xFB": "u",
        "\xFC": "ue",
        "\u0171": "u",
        "\xFD": "y",
        "\xFE": "th",
        "\xFF": "y",
        "\u1E9E": "SS",
        // language specific
        // Arabic
        "\u0627": "a",
        "\u0623": "a",
        "\u0625": "i",
        "\u0622": "aa",
        "\u0624": "u",
        "\u0626": "e",
        "\u0621": "a",
        "\u0628": "b",
        "\u062A": "t",
        "\u062B": "th",
        "\u062C": "j",
        "\u062D": "h",
        "\u062E": "kh",
        "\u062F": "d",
        "\u0630": "th",
        "\u0631": "r",
        "\u0632": "z",
        "\u0633": "s",
        "\u0634": "sh",
        "\u0635": "s",
        "\u0636": "dh",
        "\u0637": "t",
        "\u0638": "z",
        "\u0639": "a",
        "\u063A": "gh",
        "\u0641": "f",
        "\u0642": "q",
        "\u0643": "k",
        "\u0644": "l",
        "\u0645": "m",
        "\u0646": "n",
        "\u0647": "h",
        "\u0648": "w",
        "\u064A": "y",
        "\u0649": "a",
        "\u0629": "h",
        "\uFEFB": "la",
        "\uFEF7": "laa",
        "\uFEF9": "lai",
        "\uFEF5": "laa",
        // Persian additional characters than Arabic
        "\u06AF": "g",
        "\u0686": "ch",
        "\u067E": "p",
        "\u0698": "zh",
        "\u06A9": "k",
        "\u06CC": "y",
        // Arabic diactrics
        "\u064E": "a",
        "\u064B": "an",
        "\u0650": "e",
        "\u064D": "en",
        "\u064F": "u",
        "\u064C": "on",
        "\u0652": "",
        // Arabic numbers
        "\u0660": "0",
        "\u0661": "1",
        "\u0662": "2",
        "\u0663": "3",
        "\u0664": "4",
        "\u0665": "5",
        "\u0666": "6",
        "\u0667": "7",
        "\u0668": "8",
        "\u0669": "9",
        // Persian numbers
        "\u06F0": "0",
        "\u06F1": "1",
        "\u06F2": "2",
        "\u06F3": "3",
        "\u06F4": "4",
        "\u06F5": "5",
        "\u06F6": "6",
        "\u06F7": "7",
        "\u06F8": "8",
        "\u06F9": "9",
        // Burmese consonants
        "\u1000": "k",
        "\u1001": "kh",
        "\u1002": "g",
        "\u1003": "ga",
        "\u1004": "ng",
        "\u1005": "s",
        "\u1006": "sa",
        "\u1007": "z",
        "\u1005\u103B": "za",
        "\u100A": "ny",
        "\u100B": "t",
        "\u100C": "ta",
        "\u100D": "d",
        "\u100E": "da",
        "\u100F": "na",
        "\u1010": "t",
        "\u1011": "ta",
        "\u1012": "d",
        "\u1013": "da",
        "\u1014": "n",
        "\u1015": "p",
        "\u1016": "pa",
        "\u1017": "b",
        "\u1018": "ba",
        "\u1019": "m",
        "\u101A": "y",
        "\u101B": "ya",
        "\u101C": "l",
        "\u101D": "w",
        "\u101E": "th",
        "\u101F": "h",
        "\u1020": "la",
        "\u1021": "a",
        // consonant character combos
        "\u103C": "y",
        "\u103B": "ya",
        "\u103D": "w",
        "\u103C\u103D": "yw",
        "\u103B\u103D": "ywa",
        "\u103E": "h",
        // independent vowels
        "\u1027": "e",
        "\u104F": "-e",
        "\u1023": "i",
        "\u1024": "-i",
        "\u1009": "u",
        "\u1026": "-u",
        "\u1029": "aw",
        "\u101E\u103C\u1031\u102C": "aw",
        "\u102A": "aw",
        // numbers
        "\u1040": "0",
        "\u1041": "1",
        "\u1042": "2",
        "\u1043": "3",
        "\u1044": "4",
        "\u1045": "5",
        "\u1046": "6",
        "\u1047": "7",
        "\u1048": "8",
        "\u1049": "9",
        // virama and tone marks which are silent in transliteration
        "\u1039": "",
        "\u1037": "",
        "\u1038": "",
        // Czech
        "\u010D": "c",
        "\u010F": "d",
        "\u011B": "e",
        "\u0148": "n",
        "\u0159": "r",
        "\u0161": "s",
        "\u0165": "t",
        "\u016F": "u",
        "\u017E": "z",
        "\u010C": "C",
        "\u010E": "D",
        "\u011A": "E",
        "\u0147": "N",
        "\u0158": "R",
        "\u0160": "S",
        "\u0164": "T",
        "\u016E": "U",
        "\u017D": "Z",
        // Dhivehi
        "\u0780": "h",
        "\u0781": "sh",
        "\u0782": "n",
        "\u0783": "r",
        "\u0784": "b",
        "\u0785": "lh",
        "\u0786": "k",
        "\u0787": "a",
        "\u0788": "v",
        "\u0789": "m",
        "\u078A": "f",
        "\u078B": "dh",
        "\u078C": "th",
        "\u078D": "l",
        "\u078E": "g",
        "\u078F": "gn",
        "\u0790": "s",
        "\u0791": "d",
        "\u0792": "z",
        "\u0793": "t",
        "\u0794": "y",
        "\u0795": "p",
        "\u0796": "j",
        "\u0797": "ch",
        "\u0798": "tt",
        "\u0799": "hh",
        "\u079A": "kh",
        "\u079B": "th",
        "\u079C": "z",
        "\u079D": "sh",
        "\u079E": "s",
        "\u079F": "d",
        "\u07A0": "t",
        "\u07A1": "z",
        "\u07A2": "a",
        "\u07A3": "gh",
        "\u07A4": "q",
        "\u07A5": "w",
        "\u07A6": "a",
        "\u07A7": "aa",
        "\u07A8": "i",
        "\u07A9": "ee",
        "\u07AA": "u",
        "\u07AB": "oo",
        "\u07AC": "e",
        "\u07AD": "ey",
        "\u07AE": "o",
        "\u07AF": "oa",
        "\u07B0": "",
        // Georgian https://en.wikipedia.org/wiki/Romanization_of_Georgian
        // National system (2002)
        "\u10D0": "a",
        "\u10D1": "b",
        "\u10D2": "g",
        "\u10D3": "d",
        "\u10D4": "e",
        "\u10D5": "v",
        "\u10D6": "z",
        "\u10D7": "t",
        "\u10D8": "i",
        "\u10D9": "k",
        "\u10DA": "l",
        "\u10DB": "m",
        "\u10DC": "n",
        "\u10DD": "o",
        "\u10DE": "p",
        "\u10DF": "zh",
        "\u10E0": "r",
        "\u10E1": "s",
        "\u10E2": "t",
        "\u10E3": "u",
        "\u10E4": "p",
        "\u10E5": "k",
        "\u10E6": "gh",
        "\u10E7": "q",
        "\u10E8": "sh",
        "\u10E9": "ch",
        "\u10EA": "ts",
        "\u10EB": "dz",
        "\u10EC": "ts",
        "\u10ED": "ch",
        "\u10EE": "kh",
        "\u10EF": "j",
        "\u10F0": "h",
        // Greek
        "\u03B1": "a",
        "\u03B2": "v",
        "\u03B3": "g",
        "\u03B4": "d",
        "\u03B5": "e",
        "\u03B6": "z",
        "\u03B7": "i",
        "\u03B8": "th",
        "\u03B9": "i",
        "\u03BA": "k",
        "\u03BB": "l",
        "\u03BC": "m",
        "\u03BD": "n",
        "\u03BE": "ks",
        "\u03BF": "o",
        "\u03C0": "p",
        "\u03C1": "r",
        "\u03C3": "s",
        "\u03C4": "t",
        "\u03C5": "y",
        "\u03C6": "f",
        "\u03C7": "x",
        "\u03C8": "ps",
        "\u03C9": "o",
        "\u03AC": "a",
        "\u03AD": "e",
        "\u03AF": "i",
        "\u03CC": "o",
        "\u03CD": "y",
        "\u03AE": "i",
        "\u03CE": "o",
        "\u03C2": "s",
        "\u03CA": "i",
        "\u03B0": "y",
        "\u03CB": "y",
        "\u0390": "i",
        "\u0391": "A",
        "\u0392": "B",
        "\u0393": "G",
        "\u0394": "D",
        "\u0395": "E",
        "\u0396": "Z",
        "\u0397": "I",
        "\u0398": "TH",
        "\u0399": "I",
        "\u039A": "K",
        "\u039B": "L",
        "\u039C": "M",
        "\u039D": "N",
        "\u039E": "KS",
        "\u039F": "O",
        "\u03A0": "P",
        "\u03A1": "R",
        "\u03A3": "S",
        "\u03A4": "T",
        "\u03A5": "Y",
        "\u03A6": "F",
        "\u03A7": "X",
        "\u03A8": "PS",
        "\u03A9": "O",
        "\u0386": "A",
        "\u0388": "E",
        "\u038A": "I",
        "\u038C": "O",
        "\u038E": "Y",
        "\u0389": "I",
        "\u038F": "O",
        "\u03AA": "I",
        "\u03AB": "Y",
        // Latvian
        "\u0101": "a",
        // 'č': 'c', // duplicate
        "\u0113": "e",
        "\u0123": "g",
        "\u012B": "i",
        "\u0137": "k",
        "\u013C": "l",
        "\u0146": "n",
        // 'š': 's', // duplicate
        "\u016B": "u",
        // 'ž': 'z', // duplicate
        "\u0100": "A",
        // 'Č': 'C', // duplicate
        "\u0112": "E",
        "\u0122": "G",
        "\u012A": "I",
        "\u0136": "k",
        "\u013B": "L",
        "\u0145": "N",
        // 'Š': 'S', // duplicate
        "\u016A": "U",
        // 'Ž': 'Z', // duplicate
        // Macedonian
        "\u040C": "Kj",
        "\u045C": "kj",
        "\u0409": "Lj",
        "\u0459": "lj",
        "\u040A": "Nj",
        "\u045A": "nj",
        "\u0422\u0441": "Ts",
        "\u0442\u0441": "ts",
        // Polish
        "\u0105": "a",
        "\u0107": "c",
        "\u0119": "e",
        "\u0142": "l",
        "\u0144": "n",
        // 'ó': 'o', // duplicate
        "\u015B": "s",
        "\u017A": "z",
        "\u017C": "z",
        "\u0104": "A",
        "\u0106": "C",
        "\u0118": "E",
        "\u0141": "L",
        "\u0143": "N",
        "\u015A": "S",
        "\u0179": "Z",
        "\u017B": "Z",
        // Ukranian
        "\u0404": "Ye",
        "\u0406": "I",
        "\u0407": "Yi",
        "\u0490": "G",
        "\u0454": "ye",
        "\u0456": "i",
        "\u0457": "yi",
        "\u0491": "g",
        // Romanian
        "\u0103": "a",
        "\u0102": "A",
        "\u0219": "s",
        "\u0218": "S",
        // 'ş': 's', // duplicate
        // 'Ş': 'S', // duplicate
        "\u021B": "t",
        "\u021A": "T",
        "\u0163": "t",
        "\u0162": "T",
        // Russian https://en.wikipedia.org/wiki/Romanization_of_Russian
        // ICAO
        "\u0430": "a",
        "\u0431": "b",
        "\u0432": "v",
        "\u0433": "g",
        "\u0434": "d",
        "\u0435": "e",
        "\u0451": "yo",
        "\u0436": "zh",
        "\u0437": "z",
        "\u0438": "i",
        "\u0439": "i",
        "\u043A": "k",
        "\u043B": "l",
        "\u043C": "m",
        "\u043D": "n",
        "\u043E": "o",
        "\u043F": "p",
        "\u0440": "r",
        "\u0441": "s",
        "\u0442": "t",
        "\u0443": "u",
        "\u0444": "f",
        "\u0445": "kh",
        "\u0446": "c",
        "\u0447": "ch",
        "\u0448": "sh",
        "\u0449": "sh",
        "\u044A": "",
        "\u044B": "y",
        "\u044C": "",
        "\u044D": "e",
        "\u044E": "yu",
        "\u044F": "ya",
        "\u0410": "A",
        "\u0411": "B",
        "\u0412": "V",
        "\u0413": "G",
        "\u0414": "D",
        "\u0415": "E",
        "\u0401": "Yo",
        "\u0416": "Zh",
        "\u0417": "Z",
        "\u0418": "I",
        "\u0419": "I",
        "\u041A": "K",
        "\u041B": "L",
        "\u041C": "M",
        "\u041D": "N",
        "\u041E": "O",
        "\u041F": "P",
        "\u0420": "R",
        "\u0421": "S",
        "\u0422": "T",
        "\u0423": "U",
        "\u0424": "F",
        "\u0425": "Kh",
        "\u0426": "C",
        "\u0427": "Ch",
        "\u0428": "Sh",
        "\u0429": "Sh",
        "\u042A": "",
        "\u042B": "Y",
        "\u042C": "",
        "\u042D": "E",
        "\u042E": "Yu",
        "\u042F": "Ya",
        // Serbian
        "\u0452": "dj",
        "\u0458": "j",
        // 'љ': 'lj',  // duplicate
        // 'њ': 'nj', // duplicate
        "\u045B": "c",
        "\u045F": "dz",
        "\u0402": "Dj",
        "\u0408": "j",
        // 'Љ': 'Lj', // duplicate
        // 'Њ': 'Nj', // duplicate
        "\u040B": "C",
        "\u040F": "Dz",
        // Slovak
        "\u013E": "l",
        "\u013A": "l",
        "\u0155": "r",
        "\u013D": "L",
        "\u0139": "L",
        "\u0154": "R",
        // Turkish
        "\u015F": "s",
        "\u015E": "S",
        "\u0131": "i",
        "\u0130": "I",
        // 'ç': 'c', // duplicate
        // 'Ç': 'C', // duplicate
        // 'ü': 'u', // duplicate, see langCharMap
        // 'Ü': 'U', // duplicate, see langCharMap
        // 'ö': 'o', // duplicate, see langCharMap
        // 'Ö': 'O', // duplicate, see langCharMap
        "\u011F": "g",
        "\u011E": "G",
        // Vietnamese
        "\u1EA3": "a",
        "\u1EA2": "A",
        "\u1EB3": "a",
        "\u1EB2": "A",
        "\u1EA9": "a",
        "\u1EA8": "A",
        "\u0111": "d",
        "\u0110": "D",
        "\u1EB9": "e",
        "\u1EB8": "E",
        "\u1EBD": "e",
        "\u1EBC": "E",
        "\u1EBB": "e",
        "\u1EBA": "E",
        "\u1EBF": "e",
        "\u1EBE": "E",
        "\u1EC1": "e",
        "\u1EC0": "E",
        "\u1EC7": "e",
        "\u1EC6": "E",
        "\u1EC5": "e",
        "\u1EC4": "E",
        "\u1EC3": "e",
        "\u1EC2": "E",
        "\u1ECF": "o",
        "\u1ECD": "o",
        "\u1ECC": "o",
        "\u1ED1": "o",
        "\u1ED0": "O",
        "\u1ED3": "o",
        "\u1ED2": "O",
        "\u1ED5": "o",
        "\u1ED4": "O",
        "\u1ED9": "o",
        "\u1ED8": "O",
        "\u1ED7": "o",
        "\u1ED6": "O",
        "\u01A1": "o",
        "\u01A0": "O",
        "\u1EDB": "o",
        "\u1EDA": "O",
        "\u1EDD": "o",
        "\u1EDC": "O",
        "\u1EE3": "o",
        "\u1EE2": "O",
        "\u1EE1": "o",
        "\u1EE0": "O",
        "\u1EDE": "o",
        "\u1EDF": "o",
        "\u1ECB": "i",
        "\u1ECA": "I",
        "\u0129": "i",
        "\u0128": "I",
        "\u1EC9": "i",
        "\u1EC8": "i",
        "\u1EE7": "u",
        "\u1EE6": "U",
        "\u1EE5": "u",
        "\u1EE4": "U",
        "\u0169": "u",
        "\u0168": "U",
        "\u01B0": "u",
        "\u01AF": "U",
        "\u1EE9": "u",
        "\u1EE8": "U",
        "\u1EEB": "u",
        "\u1EEA": "U",
        "\u1EF1": "u",
        "\u1EF0": "U",
        "\u1EEF": "u",
        "\u1EEE": "U",
        "\u1EED": "u",
        "\u1EEC": "\u01B0",
        "\u1EF7": "y",
        "\u1EF6": "y",
        "\u1EF3": "y",
        "\u1EF2": "Y",
        "\u1EF5": "y",
        "\u1EF4": "Y",
        "\u1EF9": "y",
        "\u1EF8": "Y",
        "\u1EA1": "a",
        "\u1EA0": "A",
        "\u1EA5": "a",
        "\u1EA4": "A",
        "\u1EA7": "a",
        "\u1EA6": "A",
        "\u1EAD": "a",
        "\u1EAC": "A",
        "\u1EAB": "a",
        "\u1EAA": "A",
        // 'ă': 'a', // duplicate
        // 'Ă': 'A', // duplicate
        "\u1EAF": "a",
        "\u1EAE": "A",
        "\u1EB1": "a",
        "\u1EB0": "A",
        "\u1EB7": "a",
        "\u1EB6": "A",
        "\u1EB5": "a",
        "\u1EB4": "A",
        "\u24EA": "0",
        "\u2460": "1",
        "\u2461": "2",
        "\u2462": "3",
        "\u2463": "4",
        "\u2464": "5",
        "\u2465": "6",
        "\u2466": "7",
        "\u2467": "8",
        "\u2468": "9",
        "\u2469": "10",
        "\u246A": "11",
        "\u246B": "12",
        "\u246C": "13",
        "\u246D": "14",
        "\u246E": "15",
        "\u246F": "16",
        "\u2470": "17",
        "\u2471": "18",
        "\u2472": "18",
        "\u2473": "18",
        "\u24F5": "1",
        "\u24F6": "2",
        "\u24F7": "3",
        "\u24F8": "4",
        "\u24F9": "5",
        "\u24FA": "6",
        "\u24FB": "7",
        "\u24FC": "8",
        "\u24FD": "9",
        "\u24FE": "10",
        "\u24FF": "0",
        "\u24EB": "11",
        "\u24EC": "12",
        "\u24ED": "13",
        "\u24EE": "14",
        "\u24EF": "15",
        "\u24F0": "16",
        "\u24F1": "17",
        "\u24F2": "18",
        "\u24F3": "19",
        "\u24F4": "20",
        "\u24B6": "A",
        "\u24B7": "B",
        "\u24B8": "C",
        "\u24B9": "D",
        "\u24BA": "E",
        "\u24BB": "F",
        "\u24BC": "G",
        "\u24BD": "H",
        "\u24BE": "I",
        "\u24BF": "J",
        "\u24C0": "K",
        "\u24C1": "L",
        "\u24C2": "M",
        "\u24C3": "N",
        "\u24C4": "O",
        "\u24C5": "P",
        "\u24C6": "Q",
        "\u24C7": "R",
        "\u24C8": "S",
        "\u24C9": "T",
        "\u24CA": "U",
        "\u24CB": "V",
        "\u24CC": "W",
        "\u24CD": "X",
        "\u24CE": "Y",
        "\u24CF": "Z",
        "\u24D0": "a",
        "\u24D1": "b",
        "\u24D2": "c",
        "\u24D3": "d",
        "\u24D4": "e",
        "\u24D5": "f",
        "\u24D6": "g",
        "\u24D7": "h",
        "\u24D8": "i",
        "\u24D9": "j",
        "\u24DA": "k",
        "\u24DB": "l",
        "\u24DC": "m",
        "\u24DD": "n",
        "\u24DE": "o",
        "\u24DF": "p",
        "\u24E0": "q",
        "\u24E1": "r",
        "\u24E2": "s",
        "\u24E3": "t",
        "\u24E4": "u",
        "\u24E6": "v",
        "\u24E5": "w",
        "\u24E7": "x",
        "\u24E8": "y",
        "\u24E9": "z",
        // symbols
        "\u201C": '"',
        "\u201D": '"',
        "\u2018": "'",
        "\u2019": "'",
        "\u2202": "d",
        "\u0192": "f",
        "\u2122": "(TM)",
        "\xA9": "(C)",
        "\u0153": "oe",
        "\u0152": "OE",
        "\xAE": "(R)",
        "\u2020": "+",
        "\u2120": "(SM)",
        "\u2026": "...",
        "\u02DA": "o",
        "\xBA": "o",
        "\xAA": "a",
        "\u2022": "*",
        "\u104A": ",",
        "\u104B": ".",
        // currency
        "$": "USD",
        "\u20AC": "EUR",
        "\u20A2": "BRN",
        "\u20A3": "FRF",
        "\xA3": "GBP",
        "\u20A4": "ITL",
        "\u20A6": "NGN",
        "\u20A7": "ESP",
        "\u20A9": "KRW",
        "\u20AA": "ILS",
        "\u20AB": "VND",
        "\u20AD": "LAK",
        "\u20AE": "MNT",
        "\u20AF": "GRD",
        "\u20B1": "ARS",
        "\u20B2": "PYG",
        "\u20B3": "ARA",
        "\u20B4": "UAH",
        "\u20B5": "GHS",
        "\xA2": "cent",
        "\xA5": "CNY",
        "\u5143": "CNY",
        "\u5186": "YEN",
        "\uFDFC": "IRR",
        "\u20A0": "EWE",
        "\u0E3F": "THB",
        "\u20A8": "INR",
        "\u20B9": "INR",
        "\u20B0": "PF",
        "\u20BA": "TRY",
        "\u060B": "AFN",
        "\u20BC": "AZN",
        "\u043B\u0432": "BGN",
        "\u17DB": "KHR",
        "\u20A1": "CRC",
        "\u20B8": "KZT",
        "\u0434\u0435\u043D": "MKD",
        "z\u0142": "PLN",
        "\u20BD": "RUB",
        "\u20BE": "GEL"
      };
      var lookAheadCharArray = [
        // burmese
        "\u103A",
        // Dhivehi
        "\u07B0"
      ];
      var diatricMap = {
        // Burmese
        // dependent vowels
        "\u102C": "a",
        "\u102B": "a",
        "\u1031": "e",
        "\u1032": "e",
        "\u102D": "i",
        "\u102E": "i",
        "\u102D\u102F": "o",
        "\u102F": "u",
        "\u1030": "u",
        "\u1031\u102B\u1004\u103A": "aung",
        "\u1031\u102C": "aw",
        "\u1031\u102C\u103A": "aw",
        "\u1031\u102B": "aw",
        "\u1031\u102B\u103A": "aw",
        "\u103A": "\u103A",
        // this is special case but the character will be converted to latin in the code
        "\u1000\u103A": "et",
        "\u102D\u102F\u1000\u103A": "aik",
        "\u1031\u102C\u1000\u103A": "auk",
        "\u1004\u103A": "in",
        "\u102D\u102F\u1004\u103A": "aing",
        "\u1031\u102C\u1004\u103A": "aung",
        "\u1005\u103A": "it",
        "\u100A\u103A": "i",
        "\u1010\u103A": "at",
        "\u102D\u1010\u103A": "eik",
        "\u102F\u1010\u103A": "ok",
        "\u103D\u1010\u103A": "ut",
        "\u1031\u1010\u103A": "it",
        "\u1012\u103A": "d",
        "\u102D\u102F\u1012\u103A": "ok",
        "\u102F\u1012\u103A": "ait",
        "\u1014\u103A": "an",
        "\u102C\u1014\u103A": "an",
        "\u102D\u1014\u103A": "ein",
        "\u102F\u1014\u103A": "on",
        "\u103D\u1014\u103A": "un",
        "\u1015\u103A": "at",
        "\u102D\u1015\u103A": "eik",
        "\u102F\u1015\u103A": "ok",
        "\u103D\u1015\u103A": "ut",
        "\u1014\u103A\u102F\u1015\u103A": "nub",
        "\u1019\u103A": "an",
        "\u102D\u1019\u103A": "ein",
        "\u102F\u1019\u103A": "on",
        "\u103D\u1019\u103A": "un",
        "\u101A\u103A": "e",
        "\u102D\u102F\u101C\u103A": "ol",
        "\u1009\u103A": "in",
        "\u1036": "an",
        "\u102D\u1036": "ein",
        "\u102F\u1036": "on",
        // Dhivehi
        "\u07A6\u0787\u07B0": "ah",
        "\u07A6\u0781\u07B0": "ah"
      };
      var langCharMap = {
        "en": {},
        // default language
        "az": {
          // Azerbaijani
          "\xE7": "c",
          "\u0259": "e",
          "\u011F": "g",
          "\u0131": "i",
          "\xF6": "o",
          "\u015F": "s",
          "\xFC": "u",
          "\xC7": "C",
          "\u018F": "E",
          "\u011E": "G",
          "\u0130": "I",
          "\xD6": "O",
          "\u015E": "S",
          "\xDC": "U"
        },
        "cs": {
          // Czech
          "\u010D": "c",
          "\u010F": "d",
          "\u011B": "e",
          "\u0148": "n",
          "\u0159": "r",
          "\u0161": "s",
          "\u0165": "t",
          "\u016F": "u",
          "\u017E": "z",
          "\u010C": "C",
          "\u010E": "D",
          "\u011A": "E",
          "\u0147": "N",
          "\u0158": "R",
          "\u0160": "S",
          "\u0164": "T",
          "\u016E": "U",
          "\u017D": "Z"
        },
        "fi": {
          // Finnish
          // 'å': 'a', duplicate see charMap/latin
          // 'Å': 'A', duplicate see charMap/latin
          "\xE4": "a",
          // ok
          "\xC4": "A",
          // ok
          "\xF6": "o",
          // ok
          "\xD6": "O"
          // ok
        },
        "hu": {
          // Hungarian
          "\xE4": "a",
          // ok
          "\xC4": "A",
          // ok
          // 'á': 'a', duplicate see charMap/latin
          // 'Á': 'A', duplicate see charMap/latin
          "\xF6": "o",
          // ok
          "\xD6": "O",
          // ok
          // 'ő': 'o', duplicate see charMap/latin
          // 'Ő': 'O', duplicate see charMap/latin
          "\xFC": "u",
          "\xDC": "U",
          "\u0171": "u",
          "\u0170": "U"
        },
        "lt": {
          // Lithuanian
          "\u0105": "a",
          "\u010D": "c",
          "\u0119": "e",
          "\u0117": "e",
          "\u012F": "i",
          "\u0161": "s",
          "\u0173": "u",
          "\u016B": "u",
          "\u017E": "z",
          "\u0104": "A",
          "\u010C": "C",
          "\u0118": "E",
          "\u0116": "E",
          "\u012E": "I",
          "\u0160": "S",
          "\u0172": "U",
          "\u016A": "U"
        },
        "lv": {
          // Latvian
          "\u0101": "a",
          "\u010D": "c",
          "\u0113": "e",
          "\u0123": "g",
          "\u012B": "i",
          "\u0137": "k",
          "\u013C": "l",
          "\u0146": "n",
          "\u0161": "s",
          "\u016B": "u",
          "\u017E": "z",
          "\u0100": "A",
          "\u010C": "C",
          "\u0112": "E",
          "\u0122": "G",
          "\u012A": "i",
          "\u0136": "k",
          "\u013B": "L",
          "\u0145": "N",
          "\u0160": "S",
          "\u016A": "u",
          "\u017D": "Z"
        },
        "pl": {
          // Polish
          "\u0105": "a",
          "\u0107": "c",
          "\u0119": "e",
          "\u0142": "l",
          "\u0144": "n",
          "\xF3": "o",
          "\u015B": "s",
          "\u017A": "z",
          "\u017C": "z",
          "\u0104": "A",
          "\u0106": "C",
          "\u0118": "e",
          "\u0141": "L",
          "\u0143": "N",
          "\xD3": "O",
          "\u015A": "S",
          "\u0179": "Z",
          "\u017B": "Z"
        },
        "sv": {
          // Swedish
          // 'å': 'a', duplicate see charMap/latin
          // 'Å': 'A', duplicate see charMap/latin
          "\xE4": "a",
          // ok
          "\xC4": "A",
          // ok
          "\xF6": "o",
          // ok
          "\xD6": "O"
          // ok
        },
        "sk": {
          // Slovak
          "\xE4": "a",
          "\xC4": "A"
        },
        "sr": {
          // Serbian
          "\u0459": "lj",
          "\u045A": "nj",
          "\u0409": "Lj",
          "\u040A": "Nj",
          "\u0111": "dj",
          "\u0110": "Dj"
        },
        "tr": {
          // Turkish
          "\xDC": "U",
          "\xD6": "O",
          "\xFC": "u",
          "\xF6": "o"
        }
      };
      var symbolMap = {
        "ar": {
          "\u2206": "delta",
          "\u221E": "la-nihaya",
          "\u2665": "hob",
          "&": "wa",
          "|": "aw",
          "<": "aqal-men",
          ">": "akbar-men",
          "\u2211": "majmou",
          "\xA4": "omla"
        },
        "az": {},
        "ca": {
          "\u2206": "delta",
          "\u221E": "infinit",
          "\u2665": "amor",
          "&": "i",
          "|": "o",
          "<": "menys que",
          ">": "mes que",
          "\u2211": "suma dels",
          "\xA4": "moneda"
        },
        "cs": {
          "\u2206": "delta",
          "\u221E": "nekonecno",
          "\u2665": "laska",
          "&": "a",
          "|": "nebo",
          "<": "mensi nez",
          ">": "vetsi nez",
          "\u2211": "soucet",
          "\xA4": "mena"
        },
        "de": {
          "\u2206": "delta",
          "\u221E": "unendlich",
          "\u2665": "Liebe",
          "&": "und",
          "|": "oder",
          "<": "kleiner als",
          ">": "groesser als",
          "\u2211": "Summe von",
          "\xA4": "Waehrung"
        },
        "dv": {
          "\u2206": "delta",
          "\u221E": "kolunulaa",
          "\u2665": "loabi",
          "&": "aai",
          "|": "noonee",
          "<": "ah vure kuda",
          ">": "ah vure bodu",
          "\u2211": "jumula",
          "\xA4": "faisaa"
        },
        "en": {
          "\u2206": "delta",
          "\u221E": "infinity",
          "\u2665": "love",
          "&": "and",
          "|": "or",
          "<": "less than",
          ">": "greater than",
          "\u2211": "sum",
          "\xA4": "currency"
        },
        "es": {
          "\u2206": "delta",
          "\u221E": "infinito",
          "\u2665": "amor",
          "&": "y",
          "|": "u",
          "<": "menos que",
          ">": "mas que",
          "\u2211": "suma de los",
          "\xA4": "moneda"
        },
        "fa": {
          "\u2206": "delta",
          "\u221E": "bi-nahayat",
          "\u2665": "eshgh",
          "&": "va",
          "|": "ya",
          "<": "kamtar-az",
          ">": "bishtar-az",
          "\u2211": "majmooe",
          "\xA4": "vahed"
        },
        "fi": {
          "\u2206": "delta",
          "\u221E": "aarettomyys",
          "\u2665": "rakkaus",
          "&": "ja",
          "|": "tai",
          "<": "pienempi kuin",
          ">": "suurempi kuin",
          "\u2211": "summa",
          "\xA4": "valuutta"
        },
        "fr": {
          "\u2206": "delta",
          "\u221E": "infiniment",
          "\u2665": "Amour",
          "&": "et",
          "|": "ou",
          "<": "moins que",
          ">": "superieure a",
          "\u2211": "somme des",
          "\xA4": "monnaie"
        },
        "ge": {
          "\u2206": "delta",
          "\u221E": "usasruloba",
          "\u2665": "siqvaruli",
          "&": "da",
          "|": "an",
          "<": "naklebi",
          ">": "meti",
          "\u2211": "jami",
          "\xA4": "valuta"
        },
        "gr": {},
        "hu": {
          "\u2206": "delta",
          "\u221E": "vegtelen",
          "\u2665": "szerelem",
          "&": "es",
          "|": "vagy",
          "<": "kisebb mint",
          ">": "nagyobb mint",
          "\u2211": "szumma",
          "\xA4": "penznem"
        },
        "it": {
          "\u2206": "delta",
          "\u221E": "infinito",
          "\u2665": "amore",
          "&": "e",
          "|": "o",
          "<": "minore di",
          ">": "maggiore di",
          "\u2211": "somma",
          "\xA4": "moneta"
        },
        "lt": {
          "\u2206": "delta",
          "\u221E": "begalybe",
          "\u2665": "meile",
          "&": "ir",
          "|": "ar",
          "<": "maziau nei",
          ">": "daugiau nei",
          "\u2211": "suma",
          "\xA4": "valiuta"
        },
        "lv": {
          "\u2206": "delta",
          "\u221E": "bezgaliba",
          "\u2665": "milestiba",
          "&": "un",
          "|": "vai",
          "<": "mazak neka",
          ">": "lielaks neka",
          "\u2211": "summa",
          "\xA4": "valuta"
        },
        "my": {
          "\u2206": "kwahkhyaet",
          "\u221E": "asaonasme",
          "\u2665": "akhyait",
          "&": "nhin",
          "|": "tho",
          "<": "ngethaw",
          ">": "kyithaw",
          "\u2211": "paungld",
          "\xA4": "ngwekye"
        },
        "mk": {},
        "nl": {
          "\u2206": "delta",
          "\u221E": "oneindig",
          "\u2665": "liefde",
          "&": "en",
          "|": "of",
          "<": "kleiner dan",
          ">": "groter dan",
          "\u2211": "som",
          "\xA4": "valuta"
        },
        "pl": {
          "\u2206": "delta",
          "\u221E": "nieskonczonosc",
          "\u2665": "milosc",
          "&": "i",
          "|": "lub",
          "<": "mniejsze niz",
          ">": "wieksze niz",
          "\u2211": "suma",
          "\xA4": "waluta"
        },
        "pt": {
          "\u2206": "delta",
          "\u221E": "infinito",
          "\u2665": "amor",
          "&": "e",
          "|": "ou",
          "<": "menor que",
          ">": "maior que",
          "\u2211": "soma",
          "\xA4": "moeda"
        },
        "ro": {
          "\u2206": "delta",
          "\u221E": "infinit",
          "\u2665": "dragoste",
          "&": "si",
          "|": "sau",
          "<": "mai mic ca",
          ">": "mai mare ca",
          "\u2211": "suma",
          "\xA4": "valuta"
        },
        "ru": {
          "\u2206": "delta",
          "\u221E": "beskonechno",
          "\u2665": "lubov",
          "&": "i",
          "|": "ili",
          "<": "menshe",
          ">": "bolshe",
          "\u2211": "summa",
          "\xA4": "valjuta"
        },
        "sk": {
          "\u2206": "delta",
          "\u221E": "nekonecno",
          "\u2665": "laska",
          "&": "a",
          "|": "alebo",
          "<": "menej ako",
          ">": "viac ako",
          "\u2211": "sucet",
          "\xA4": "mena"
        },
        "sr": {},
        "tr": {
          "\u2206": "delta",
          "\u221E": "sonsuzluk",
          "\u2665": "ask",
          "&": "ve",
          "|": "veya",
          "<": "kucuktur",
          ">": "buyuktur",
          "\u2211": "toplam",
          "\xA4": "para birimi"
        },
        "uk": {
          "\u2206": "delta",
          "\u221E": "bezkinechnist",
          "\u2665": "lubov",
          "&": "i",
          "|": "abo",
          "<": "menshe",
          ">": "bilshe",
          "\u2211": "suma",
          "\xA4": "valjuta"
        },
        "vn": {
          "\u2206": "delta",
          "\u221E": "vo cuc",
          "\u2665": "yeu",
          "&": "va",
          "|": "hoac",
          "<": "nho hon",
          ">": "lon hon",
          "\u2211": "tong",
          "\xA4": "tien te"
        }
      };
      var uricChars = [";", "?", ":", "@", "&", "=", "+", "$", ",", "/"].join("");
      var uricNoSlashChars = [";", "?", ":", "@", "&", "=", "+", "$", ","].join("");
      var markChars = [".", "!", "~", "*", "'", "(", ")"].join("");
      var getSlug = function getSlug2(input, opts) {
        var separator = "-";
        var result = "";
        var diatricString = "";
        var convertSymbols = true;
        var customReplacements = {};
        var maintainCase;
        var titleCase;
        var truncate;
        var uricFlag;
        var uricNoSlashFlag;
        var markFlag;
        var symbol;
        var langChar;
        var lucky;
        var i;
        var ch;
        var l;
        var lastCharWasSymbol;
        var lastCharWasDiatric;
        var allowedChars = "";
        if (typeof input !== "string") {
          return "";
        }
        if (typeof opts === "string") {
          separator = opts;
        }
        symbol = symbolMap.en;
        langChar = langCharMap.en;
        if (typeof opts === "object") {
          maintainCase = opts.maintainCase || false;
          customReplacements = opts.custom && typeof opts.custom === "object" ? opts.custom : customReplacements;
          truncate = +opts.truncate > 1 && opts.truncate || false;
          uricFlag = opts.uric || false;
          uricNoSlashFlag = opts.uricNoSlash || false;
          markFlag = opts.mark || false;
          convertSymbols = opts.symbols === false || opts.lang === false ? false : true;
          separator = opts.separator || separator;
          if (uricFlag) {
            allowedChars += uricChars;
          }
          if (uricNoSlashFlag) {
            allowedChars += uricNoSlashChars;
          }
          if (markFlag) {
            allowedChars += markChars;
          }
          symbol = opts.lang && symbolMap[opts.lang] && convertSymbols ? symbolMap[opts.lang] : convertSymbols ? symbolMap.en : {};
          langChar = opts.lang && langCharMap[opts.lang] ? langCharMap[opts.lang] : opts.lang === false || opts.lang === true ? {} : langCharMap.en;
          if (opts.titleCase && typeof opts.titleCase.length === "number" && Array.prototype.toString.call(opts.titleCase)) {
            opts.titleCase.forEach(function(v) {
              customReplacements[v + ""] = v + "";
            });
            titleCase = true;
          } else {
            titleCase = !!opts.titleCase;
          }
          if (opts.custom && typeof opts.custom.length === "number" && Array.prototype.toString.call(opts.custom)) {
            opts.custom.forEach(function(v) {
              customReplacements[v + ""] = v + "";
            });
          }
          Object.keys(customReplacements).forEach(function(v) {
            var r;
            if (v.length > 1) {
              r = new RegExp("\\b" + escapeChars(v) + "\\b", "gi");
            } else {
              r = new RegExp(escapeChars(v), "gi");
            }
            input = input.replace(r, customReplacements[v]);
          });
          for (ch in customReplacements) {
            allowedChars += ch;
          }
        }
        allowedChars += separator;
        allowedChars = escapeChars(allowedChars);
        input = input.replace(/(^\s+|\s+$)/g, "");
        lastCharWasSymbol = false;
        lastCharWasDiatric = false;
        for (i = 0, l = input.length; i < l; i++) {
          ch = input[i];
          if (isReplacedCustomChar(ch, customReplacements)) {
            lastCharWasSymbol = false;
          } else if (langChar[ch]) {
            ch = lastCharWasSymbol && langChar[ch].match(/[A-Za-z0-9]/) ? " " + langChar[ch] : langChar[ch];
            lastCharWasSymbol = false;
          } else if (ch in charMap) {
            if (i + 1 < l && lookAheadCharArray.indexOf(input[i + 1]) >= 0) {
              diatricString += ch;
              ch = "";
            } else if (lastCharWasDiatric === true) {
              ch = diatricMap[diatricString] + charMap[ch];
              diatricString = "";
            } else {
              ch = lastCharWasSymbol && charMap[ch].match(/[A-Za-z0-9]/) ? " " + charMap[ch] : charMap[ch];
            }
            lastCharWasSymbol = false;
            lastCharWasDiatric = false;
          } else if (ch in diatricMap) {
            diatricString += ch;
            ch = "";
            if (i === l - 1) {
              ch = diatricMap[diatricString];
            }
            lastCharWasDiatric = true;
          } else if (
            // process symbol chars
            symbol[ch] && !(uricFlag && uricChars.indexOf(ch) !== -1) && !(uricNoSlashFlag && uricNoSlashChars.indexOf(ch) !== -1)
          ) {
            ch = lastCharWasSymbol || result.substr(-1).match(/[A-Za-z0-9]/) ? separator + symbol[ch] : symbol[ch];
            ch += input[i + 1] !== void 0 && input[i + 1].match(/[A-Za-z0-9]/) ? separator : "";
            lastCharWasSymbol = true;
          } else {
            if (lastCharWasDiatric === true) {
              ch = diatricMap[diatricString] + ch;
              diatricString = "";
              lastCharWasDiatric = false;
            } else if (lastCharWasSymbol && (/[A-Za-z0-9]/.test(ch) || result.substr(-1).match(/A-Za-z0-9]/))) {
              ch = " " + ch;
            }
            lastCharWasSymbol = false;
          }
          result += ch.replace(new RegExp("[^\\w\\s" + allowedChars + "_-]", "g"), separator);
        }
        if (titleCase) {
          result = result.replace(/(\w)(\S*)/g, function(_, i2, r) {
            var j = i2.toUpperCase() + (r !== null ? r : "");
            return Object.keys(customReplacements).indexOf(j.toLowerCase()) < 0 ? j : j.toLowerCase();
          });
        }
        result = result.replace(/\s+/g, separator).replace(new RegExp("\\" + separator + "+", "g"), separator).replace(new RegExp("(^\\" + separator + "+|\\" + separator + "+$)", "g"), "");
        if (truncate && result.length > truncate) {
          lucky = result.charAt(truncate) === separator;
          result = result.slice(0, truncate);
          if (!lucky) {
            result = result.slice(0, result.lastIndexOf(separator));
          }
        }
        if (!maintainCase && !titleCase) {
          result = result.toLowerCase();
        }
        return result;
      };
      var createSlug = function createSlug2(opts) {
        return function getSlugWithConfig(input) {
          return getSlug(input, opts);
        };
      };
      var escapeChars = function escapeChars2(input) {
        return input.replace(/[-\\^$*+?.()|[\]{}\/]/g, "\\$&");
      };
      var isReplacedCustomChar = function(ch, customReplacements) {
        for (var c in customReplacements) {
          if (customReplacements[c] === ch) {
            return true;
          }
        }
      };
      if (typeof module !== "undefined" && module.exports) {
        module.exports = getSlug;
        module.exports.createSlug = createSlug;
      } else if (typeof define !== "undefined" && define.amd) {
        define([], function() {
          return getSlug;
        });
      } else {
        try {
          if (root.getSlug || root.createSlug) {
            throw "speakingurl: globals exists /(getSlug|createSlug)/";
          } else {
            root.getSlug = getSlug;
            root.createSlug = createSlug;
          }
        } catch (e) {
        }
      }
    })(exports);
  }
});

// ../../node_modules/.pnpm/speakingurl@14.0.1/node_modules/speakingurl/index.js
var require_speakingurl2 = __commonJS({
  "../../node_modules/.pnpm/speakingurl@14.0.1/node_modules/speakingurl/index.js"(exports, module) {
    init_esm_shims();
    module.exports = require_speakingurl();
  }
});

// src/index.ts
init_esm_shims();

// src/core/index.ts
init_esm_shims();

// src/compat/index.ts
init_esm_shims();

// src/ctx/index.ts
init_esm_shims();

// src/ctx/api.ts
init_esm_shims();

// src/core/component/state/editor.ts
init_esm_shims();

// src/shared/stub-vue.ts
init_esm_shims();
function isReadonly(value) {
  return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
}
function isReactive(value) {
  if (isReadonly(value)) {
    return isReactive(value["__v_raw" /* RAW */]);
  }
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}
function isRef(r) {
  return !!(r && r.__v_isRef === true);
}
function toRaw(observed) {
  const raw = observed && observed["__v_raw" /* RAW */];
  return raw ? toRaw(raw) : observed;
}
var Fragment = Symbol.for("v-fgt");

// src/core/component/utils/index.ts
init_esm_shims();
function getComponentTypeName(options) {
  var _a25;
  const name = options.name || options._componentTag || options.__VUE_DEVTOOLS_COMPONENT_GUSSED_NAME__ || options.__name;
  if (name === "index" && ((_a25 = options.__file) == null ? void 0 : _a25.endsWith("index.vue"))) {
    return "";
  }
  return name;
}
function getComponentFileName(options) {
  const file = options.__file;
  if (file)
    return classify(basename(file, ".vue"));
}
function saveComponentGussedName(instance, name) {
  instance.type.__VUE_DEVTOOLS_COMPONENT_GUSSED_NAME__ = name;
  return name;
}
function getAppRecord(instance) {
  if (instance.__VUE_DEVTOOLS_NEXT_APP_RECORD__)
    return instance.__VUE_DEVTOOLS_NEXT_APP_RECORD__;
  else if (instance.root)
    return instance.appContext.app.__VUE_DEVTOOLS_NEXT_APP_RECORD__;
}
async function getComponentId(options) {
  const { app, uid, instance } = options;
  try {
    if (instance.__VUE_DEVTOOLS_NEXT_UID__)
      return instance.__VUE_DEVTOOLS_NEXT_UID__;
    const appRecord = await getAppRecord(app);
    if (!appRecord)
      return null;
    const isRoot = appRecord.rootInstance === instance;
    return `${appRecord.id}:${isRoot ? "root" : uid}`;
  } catch (e) {
  }
}
function isFragment(instance) {
  var _a25;
  const subTreeType = (_a25 = instance.subTree) == null ? void 0 : _a25.type;
  return subTreeType === Fragment;
}
function getInstanceName(instance) {
  var _a25, _b25, _c;
  const name = getComponentTypeName((instance == null ? void 0 : instance.type) || {});
  if (name)
    return name;
  if ((instance == null ? void 0 : instance.root) === instance)
    return "Root";
  for (const key in (_b25 = (_a25 = instance.parent) == null ? void 0 : _a25.type) == null ? void 0 : _b25.components) {
    if (instance.parent.type.components[key] === (instance == null ? void 0 : instance.type))
      return saveComponentGussedName(instance, key);
  }
  for (const key in (_c = instance.appContext) == null ? void 0 : _c.components) {
    if (instance.appContext.components[key] === (instance == null ? void 0 : instance.type))
      return saveComponentGussedName(instance, key);
  }
  const fileName = getComponentFileName((instance == null ? void 0 : instance.type) || {});
  if (fileName)
    return fileName;
  return "Anonymous Component";
}
function getComponentInstance(appRecord, instanceId) {
  instanceId = instanceId || `${appRecord.id}:root`;
  const instance = appRecord.instanceMap.get(instanceId);
  return instance || appRecord.instanceMap.get(":root");
}

// src/core/component/state/editor.ts
var StateEditor = class {
  constructor() {
    this.refEditor = new RefStateEditor();
  }
  set(object, path, value, cb) {
    const sections = Array.isArray(path) ? path : path.split(".");
    while (sections.length > 1) {
      const section = sections.shift();
      if (object instanceof Map)
        object = object.get(section);
      if (object instanceof Set)
        object = Array.from(object.values())[section];
      else object = object[section];
      if (this.refEditor.isRef(object))
        object = this.refEditor.get(object);
    }
    const field = sections[0];
    const item = this.refEditor.get(object)[field];
    if (cb) {
      cb(object, field, value);
    } else {
      if (this.refEditor.isRef(item))
        this.refEditor.set(item, value);
      else object[field] = value;
    }
  }
  get(object, path) {
    const sections = Array.isArray(path) ? path : path.split(".");
    for (let i = 0; i < sections.length; i++) {
      if (object instanceof Map)
        object = object.get(sections[i]);
      else
        object = object[sections[i]];
      if (this.refEditor.isRef(object))
        object = this.refEditor.get(object);
      if (!object)
        return void 0;
    }
    return object;
  }
  has(object, path, parent = false) {
    if (typeof object === "undefined")
      return false;
    const sections = Array.isArray(path) ? path.slice() : path.split(".");
    const size = !parent ? 1 : 2;
    while (object && sections.length > size) {
      const section = sections.shift();
      object = object[section];
      if (this.refEditor.isRef(object))
        object = this.refEditor.get(object);
    }
    return object != null && Object.prototype.hasOwnProperty.call(object, sections[0]);
  }
  createDefaultSetCallback(state) {
    return (object, field, value) => {
      if (state.remove || state.newKey) {
        if (Array.isArray(object))
          object.splice(field, 1);
        else if (toRaw(object) instanceof Map)
          object.delete(field);
        else if (toRaw(object) instanceof Set)
          object.delete(Array.from(object.values())[field]);
        else Reflect.deleteProperty(object, field);
      }
      if (!state.remove) {
        const target22 = object[state.newKey || field];
        if (this.refEditor.isRef(target22))
          this.refEditor.set(target22, value);
        else if (toRaw(object) instanceof Map)
          object.set(state.newKey || field, value);
        else if (toRaw(object) instanceof Set)
          object.add(value);
        else
          object[state.newKey || field] = value;
      }
    };
  }
};
var RefStateEditor = class {
  set(ref, value) {
    if (isRef(ref)) {
      ref.value = value;
    } else {
      if (ref instanceof Set && Array.isArray(value)) {
        ref.clear();
        value.forEach((v) => ref.add(v));
        return;
      }
      const currentKeys = Object.keys(value);
      if (ref instanceof Map) {
        const previousKeysSet2 = new Set(ref.keys());
        currentKeys.forEach((key) => {
          ref.set(key, Reflect.get(value, key));
          previousKeysSet2.delete(key);
        });
        previousKeysSet2.forEach((key) => ref.delete(key));
        return;
      }
      const previousKeysSet = new Set(Object.keys(ref));
      currentKeys.forEach((key) => {
        Reflect.set(ref, key, Reflect.get(value, key));
        previousKeysSet.delete(key);
      });
      previousKeysSet.forEach((key) => Reflect.deleteProperty(ref, key));
    }
  }
  get(ref) {
    return isRef(ref) ? ref.value : ref;
  }
  isRef(ref) {
    return isRef(ref) || isReactive(ref);
  }
};

// src/core/component/tree/el.ts
init_esm_shims();
function getRootElementsFromComponentInstance(instance) {
  if (isFragment(instance))
    return getFragmentRootElements(instance.subTree);
  if (!instance.subTree)
    return [];
  return [instance.subTree.el];
}
function getFragmentRootElements(vnode) {
  if (!vnode.children)
    return [];
  const list = [];
  vnode.children.forEach((childVnode) => {
    if (childVnode.component)
      list.push(...getRootElementsFromComponentInstance(childVnode.component));
    else if (childVnode == null ? void 0 : childVnode.el)
      list.push(childVnode.el);
  });
  return list;
}

// src/core/component-highlighter/index.ts
init_esm_shims();

// src/core/component/state/bounding-rect.ts
init_esm_shims();
function createRect() {
  const rect = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    get width() {
      return rect.right - rect.left;
    },
    get height() {
      return rect.bottom - rect.top;
    }
  };
  return rect;
}
var range;
function getTextRect(node) {
  if (!range)
    range = document.createRange();
  range.selectNode(node);
  return range.getBoundingClientRect();
}
function getFragmentRect(vnode) {
  const rect = createRect();
  if (!vnode.children)
    return rect;
  for (let i = 0, l = vnode.children.length; i < l; i++) {
    const childVnode = vnode.children[i];
    let childRect;
    if (childVnode.component) {
      childRect = getComponentBoundingRect(childVnode.component);
    } else if (childVnode.el) {
      const el = childVnode.el;
      if (el.nodeType === 1 || el.getBoundingClientRect)
        childRect = el.getBoundingClientRect();
      else if (el.nodeType === 3 && el.data.trim())
        childRect = getTextRect(el);
    }
    if (childRect)
      mergeRects(rect, childRect);
  }
  return rect;
}
function mergeRects(a, b) {
  if (!a.top || b.top < a.top)
    a.top = b.top;
  if (!a.bottom || b.bottom > a.bottom)
    a.bottom = b.bottom;
  if (!a.left || b.left < a.left)
    a.left = b.left;
  if (!a.right || b.right > a.right)
    a.right = b.right;
  return a;
}
var DEFAULT_RECT = {
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0
};
function getComponentBoundingRect(instance) {
  const el = instance.subTree.el;
  if (typeof window === "undefined") {
    return DEFAULT_RECT;
  }
  if (isFragment(instance))
    return getFragmentRect(instance.subTree);
  else if ((el == null ? void 0 : el.nodeType) === 1)
    return el == null ? void 0 : el.getBoundingClientRect();
  else if (instance.subTree.component)
    return getComponentBoundingRect(instance.subTree.component);
  else
    return DEFAULT_RECT;
}

// src/core/component-highlighter/index.ts
var CONTAINER_ELEMENT_ID = "__vue-devtools-component-inspector__";
var CARD_ELEMENT_ID = "__vue-devtools-component-inspector__card__";
var COMPONENT_NAME_ELEMENT_ID = "__vue-devtools-component-inspector__name__";
var INDICATOR_ELEMENT_ID = "__vue-devtools-component-inspector__indicator__";
var containerStyles = {
  display: "block",
  zIndex: 2147483640,
  position: "fixed",
  backgroundColor: "#42b88325",
  border: "1px solid #42b88350",
  borderRadius: "5px",
  transition: "all 0.1s ease-in",
  pointerEvents: "none"
};
var cardStyles = {
  fontFamily: "Arial, Helvetica, sans-serif",
  padding: "5px 8px",
  borderRadius: "4px",
  textAlign: "left",
  position: "absolute",
  left: 0,
  color: "#e9e9e9",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: "24px",
  backgroundColor: "#42b883",
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)"
};
var indicatorStyles = {
  display: "inline-block",
  fontWeight: 400,
  fontStyle: "normal",
  fontSize: "12px",
  opacity: 0.7
};
function getContainerElement() {
  return document.getElementById(CONTAINER_ELEMENT_ID);
}
function getCardElement() {
  return document.getElementById(CARD_ELEMENT_ID);
}
function getIndicatorElement() {
  return document.getElementById(INDICATOR_ELEMENT_ID);
}
function getNameElement() {
  return document.getElementById(COMPONENT_NAME_ELEMENT_ID);
}
function getStyles(bounds) {
  return {
    left: `${Math.round(bounds.left * 100) / 100}px`,
    top: `${Math.round(bounds.top * 100) / 100}px`,
    width: `${Math.round(bounds.width * 100) / 100}px`,
    height: `${Math.round(bounds.height * 100) / 100}px`
  };
}
function create(options) {
  var _a25;
  const containerEl = document.createElement("div");
  containerEl.id = (_a25 = options.elementId) != null ? _a25 : CONTAINER_ELEMENT_ID;
  Object.assign(containerEl.style, {
    ...containerStyles,
    ...getStyles(options.bounds),
    ...options.style
  });
  const cardEl = document.createElement("span");
  cardEl.id = CARD_ELEMENT_ID;
  Object.assign(cardEl.style, {
    ...cardStyles,
    top: options.bounds.top < 35 ? 0 : "-35px"
  });
  const nameEl = document.createElement("span");
  nameEl.id = COMPONENT_NAME_ELEMENT_ID;
  nameEl.innerHTML = `&lt;${options.name}&gt;&nbsp;&nbsp;`;
  const indicatorEl = document.createElement("i");
  indicatorEl.id = INDICATOR_ELEMENT_ID;
  indicatorEl.innerHTML = `${Math.round(options.bounds.width * 100) / 100} x ${Math.round(options.bounds.height * 100) / 100}`;
  Object.assign(indicatorEl.style, indicatorStyles);
  cardEl.appendChild(nameEl);
  cardEl.appendChild(indicatorEl);
  containerEl.appendChild(cardEl);
  document.body.appendChild(containerEl);
  return containerEl;
}
function update(options) {
  const containerEl = getContainerElement();
  const cardEl = getCardElement();
  const nameEl = getNameElement();
  const indicatorEl = getIndicatorElement();
  if (containerEl) {
    Object.assign(containerEl.style, {
      ...containerStyles,
      ...getStyles(options.bounds)
    });
    Object.assign(cardEl.style, {
      top: options.bounds.top < 35 ? 0 : "-35px"
    });
    nameEl.innerHTML = `&lt;${options.name}&gt;&nbsp;&nbsp;`;
    indicatorEl.innerHTML = `${Math.round(options.bounds.width * 100) / 100} x ${Math.round(options.bounds.height * 100) / 100}`;
  }
}
function highlight(instance) {
  const bounds = getComponentBoundingRect(instance);
  const name = getInstanceName(instance);
  const container = getContainerElement();
  container ? update({ bounds, name }) : create({ bounds, name });
}
function unhighlight() {
  const el = getContainerElement();
  if (el)
    el.style.display = "none";
}
var inspectInstance = null;
function inspectFn(e) {
  const target22 = e.target;
  if (target22) {
    const instance = target22.__vueParentComponent;
    if (instance) {
      inspectInstance = instance;
      const el = instance.vnode.el;
      if (el) {
        const bounds = getComponentBoundingRect(instance);
        const name = getInstanceName(instance);
        const container = getContainerElement();
        container ? update({ bounds, name }) : create({ bounds, name });
      }
    }
  }
}
function selectComponentFn(e, cb) {
  var _a25;
  e.preventDefault();
  e.stopPropagation();
  if (inspectInstance) {
    const app = (_a25 = activeAppRecord.value) == null ? void 0 : _a25.app;
    getComponentId({
      app,
      uid: app.uid,
      instance: inspectInstance
    }).then((id) => {
      cb(id);
    });
  }
}
var inspectComponentHighLighterSelectFn = null;
function cancelInspectComponentHighLighter() {
  unhighlight();
  window.removeEventListener("mouseover", inspectFn);
  window.removeEventListener("click", inspectComponentHighLighterSelectFn, true);
  inspectComponentHighLighterSelectFn = null;
}
function inspectComponentHighLighter() {
  window.addEventListener("mouseover", inspectFn);
  return new Promise((resolve) => {
    function onSelect(e) {
      e.preventDefault();
      e.stopPropagation();
      selectComponentFn(e, (id) => {
        window.removeEventListener("click", onSelect, true);
        inspectComponentHighLighterSelectFn = null;
        window.removeEventListener("mouseover", inspectFn);
        const el = getContainerElement();
        if (el)
          el.style.display = "none";
        resolve(JSON.stringify({ id }));
      });
    }
    inspectComponentHighLighterSelectFn = onSelect;
    window.addEventListener("click", onSelect, true);
  });
}
function scrollToComponent(options) {
  const instance = getComponentInstance(activeAppRecord.value, options.id);
  if (instance) {
    const [el] = getRootElementsFromComponentInstance(instance);
    if (typeof el.scrollIntoView === "function") {
      el.scrollIntoView({
        behavior: "smooth"
      });
    } else {
      const bounds = getComponentBoundingRect(instance);
      const scrollTarget = document.createElement("div");
      const styles = {
        ...getStyles(bounds),
        position: "absolute"
      };
      Object.assign(scrollTarget.style, styles);
      document.body.appendChild(scrollTarget);
      scrollTarget.scrollIntoView({
        behavior: "smooth"
      });
      setTimeout(() => {
        document.body.removeChild(scrollTarget);
      }, 2e3);
    }
    setTimeout(() => {
      const bounds = getComponentBoundingRect(instance);
      if (bounds.width || bounds.height) {
        const name = getInstanceName(instance);
        const el2 = getContainerElement();
        el2 ? update({ ...options, name, bounds }) : create({ ...options, name, bounds });
        setTimeout(() => {
          if (el2)
            el2.style.display = "none";
        }, 1500);
      }
    }, 1200);
  }
}

// src/core/component-inspector/index.ts
init_esm_shims();
var _a, _b;
(_b = (_a = target).__VUE_DEVTOOLS_COMPONENT_INSPECTOR_ENABLED__) != null ? _b : _a.__VUE_DEVTOOLS_COMPONENT_INSPECTOR_ENABLED__ = true;
function waitForInspectorInit(cb) {
  let total = 0;
  const timer = setInterval(() => {
    if (target.__VUE_INSPECTOR__) {
      clearInterval(timer);
      total += 30;
      cb();
    }
    if (total >= /* 5s */
    5e3)
      clearInterval(timer);
  }, 30);
}
function setupInspector() {
  const inspector = target.__VUE_INSPECTOR__;
  const _openInEditor = inspector.openInEditor;
  inspector.openInEditor = async (...params) => {
    inspector.disable();
    _openInEditor(...params);
  };
}
function getComponentInspector() {
  return new Promise((resolve) => {
    function setup() {
      setupInspector();
      resolve(target.__VUE_INSPECTOR__);
    }
    if (!target.__VUE_INSPECTOR__) {
      waitForInspectorInit(() => {
        setup();
      });
    } else {
      setup();
    }
  });
}

// src/core/open-in-editor/index.ts
init_esm_shims();

// src/ctx/state.ts
init_esm_shims();

// src/core/timeline/storage.ts
init_esm_shims();
var TIMELINE_LAYERS_STATE_STORAGE_ID = "__VUE_DEVTOOLS_KIT_TIMELINE_LAYERS_STATE__";
function getTimelineLayersStateFromStorage() {
  if (!isBrowser || typeof localStorage === "undefined") {
    return {
      recordingState: false,
      mouseEventEnabled: false,
      keyboardEventEnabled: false,
      componentEventEnabled: false,
      performanceEventEnabled: false,
      selected: ""
    };
  }
  const state = localStorage.getItem(TIMELINE_LAYERS_STATE_STORAGE_ID);
  return state ? JSON.parse(state) : {
    recordingState: false,
    mouseEventEnabled: false,
    keyboardEventEnabled: false,
    componentEventEnabled: false,
    performanceEventEnabled: false,
    selected: ""
  };
}

// src/ctx/hook.ts
init_esm_shims();

// src/ctx/inspector.ts
init_esm_shims();

// src/ctx/timeline.ts
init_esm_shims();
var _a2, _b2;
(_b2 = (_a2 = target).__VUE_DEVTOOLS_KIT_TIMELINE_LAYERS) != null ? _b2 : _a2.__VUE_DEVTOOLS_KIT_TIMELINE_LAYERS = [];
var devtoolsTimelineLayers = new Proxy(target.__VUE_DEVTOOLS_KIT_TIMELINE_LAYERS, {
  get(target22, prop, receiver) {
    return Reflect.get(target22, prop, receiver);
  }
});
function addTimelineLayer(options, descriptor) {
  devtoolsTimelineLayers.push({
    ...options,
    descriptorId: descriptor.id,
    appRecord: getAppRecord(descriptor.app)
  });
}

// src/ctx/inspector.ts
var _a3, _b3;
(_b3 = (_a3 = target).__VUE_DEVTOOLS_KIT_INSPECTOR__) != null ? _b3 : _a3.__VUE_DEVTOOLS_KIT_INSPECTOR__ = [];
var devtoolsInspector = new Proxy(target.__VUE_DEVTOOLS_KIT_INSPECTOR__, {
  get(target22, prop, receiver) {
    return Reflect.get(target22, prop, receiver);
  }
});
var callInspectorUpdatedHook = debounce(() => {
  devtoolsContext.hooks.callHook("sendInspectorToClient" /* SEND_INSPECTOR_TO_CLIENT */, getActiveInspectors());
});
function addInspector(inspector, descriptor) {
  devtoolsInspector.push({
    options: inspector,
    descriptor,
    treeFilter: "",
    selectedNodeId: "",
    appRecord: getAppRecord(descriptor.app)
  });
  callInspectorUpdatedHook();
}
function getActiveInspectors() {
  return devtoolsInspector.filter((inspector) => inspector.descriptor.app === activeAppRecord.value.app).filter((inspector) => inspector.descriptor.id !== "components").map((inspector) => {
    var _a25;
    const descriptor = inspector.descriptor;
    const options = inspector.options;
    return {
      id: options.id,
      label: options.label,
      logo: descriptor.logo,
      icon: `custom-ic-baseline-${(_a25 = options == null ? void 0 : options.icon) == null ? void 0 : _a25.replace(/_/g, "-")}`,
      packageName: descriptor.packageName,
      homepage: descriptor.homepage,
      pluginId: descriptor.id
    };
  });
}
function getInspector(id, app) {
  return devtoolsInspector.find((inspector) => inspector.options.id === id && (app ? inspector.descriptor.app === app : true));
}
function createDevToolsCtxHooks() {
  const hooks2 = createHooks();
  hooks2.hook("addInspector" /* ADD_INSPECTOR */, ({ inspector, plugin }) => {
    addInspector(inspector, plugin.descriptor);
  });
  hooks2.hook("sendInspectorTree" /* SEND_INSPECTOR_TREE */, async ({ inspectorId, plugin }) => {
    var _a25;
    if (!inspectorId || !((_a25 = plugin == null ? void 0 : plugin.descriptor) == null ? void 0 : _a25.app))
      return;
    const inspector = getInspector(inspectorId, plugin.descriptor.app);
    const _payload = {
      app: plugin.descriptor.app,
      inspectorId,
      filter: (inspector == null ? void 0 : inspector.treeFilter) || "",
      rootNodes: []
    };
    await new Promise((resolve) => {
      hooks2.callHookWith(async (callbacks) => {
        await Promise.all(callbacks.map((cb) => cb(_payload)));
        resolve();
      }, "getInspectorTree" /* GET_INSPECTOR_TREE */);
    });
    hooks2.callHookWith(async (callbacks) => {
      await Promise.all(callbacks.map((cb) => cb({
        inspectorId,
        rootNodes: _payload.rootNodes
      })));
    }, "sendInspectorTreeToClient" /* SEND_INSPECTOR_TREE_TO_CLIENT */);
  });
  hooks2.hook("sendInspectorState" /* SEND_INSPECTOR_STATE */, async ({ inspectorId, plugin }) => {
    var _a25;
    if (!inspectorId || !((_a25 = plugin == null ? void 0 : plugin.descriptor) == null ? void 0 : _a25.app))
      return;
    const inspector = getInspector(inspectorId, plugin.descriptor.app);
    const _payload = {
      app: plugin.descriptor.app,
      inspectorId,
      nodeId: (inspector == null ? void 0 : inspector.selectedNodeId) || "",
      state: null
    };
    const ctx = {
      currentTab: `custom-inspector:${inspectorId}`
    };
    if (_payload.nodeId) {
      await new Promise((resolve) => {
        hooks2.callHookWith(async (callbacks) => {
          await Promise.all(callbacks.map((cb) => cb(_payload, ctx)));
          resolve();
        }, "getInspectorState" /* GET_INSPECTOR_STATE */);
      });
    }
    hooks2.callHookWith(async (callbacks) => {
      await Promise.all(callbacks.map((cb) => cb({
        inspectorId,
        nodeId: _payload.nodeId,
        state: _payload.state
      })));
    }, "sendInspectorStateToClient" /* SEND_INSPECTOR_STATE_TO_CLIENT */);
  });
  hooks2.hook("customInspectorSelectNode" /* CUSTOM_INSPECTOR_SELECT_NODE */, ({ inspectorId, nodeId, plugin }) => {
    const inspector = getInspector(inspectorId, plugin.descriptor.app);
    if (!inspector)
      return;
    inspector.selectedNodeId = nodeId;
  });
  hooks2.hook("timelineLayerAdded" /* TIMELINE_LAYER_ADDED */, ({ options, plugin }) => {
    addTimelineLayer(options, plugin.descriptor);
  });
  hooks2.hook("timelineEventAdded" /* TIMELINE_EVENT_ADDED */, ({ options, plugin }) => {
    hooks2.callHookWith(async (callbacks) => {
      await Promise.all(callbacks.map((cb) => cb(options)));
    }, "sendTimelineEventToClient" /* SEND_TIMELINE_EVENT_TO_CLIENT */);
  });
  hooks2.hook("getComponentInstances" /* GET_COMPONENT_INSTANCES */, async ({ app }) => {
    const appRecord = app.__VUE_DEVTOOLS_NEXT_APP_RECORD__;
    if (!appRecord)
      return null;
    const appId = appRecord.id.toString();
    const instances = [...appRecord.instanceMap].filter(([key]) => key.split(":")[0] === appId).map(([, instance]) => instance);
    return instances;
  });
  hooks2.hook("getComponentBounds" /* GET_COMPONENT_BOUNDS */, async ({ instance }) => {
    const bounds = getComponentBoundingRect(instance);
    return bounds;
  });
  hooks2.hook("getComponentName" /* GET_COMPONENT_NAME */, ({ instance }) => {
    const name = getInstanceName(instance);
    return name;
  });
  hooks2.hook("componentHighlight" /* COMPONENT_HIGHLIGHT */, ({ uid }) => {
    const instance = activeAppRecord.value.instanceMap.get(uid);
    if (instance) {
      highlight(instance);
    }
  });
  hooks2.hook("componentUnhighlight" /* COMPONENT_UNHIGHLIGHT */, () => {
    unhighlight();
  });
  return hooks2;
}

// src/ctx/state.ts
var _a4, _b4;
(_b4 = (_a4 = target).__VUE_DEVTOOLS_KIT_APP_RECORDS__) != null ? _b4 : _a4.__VUE_DEVTOOLS_KIT_APP_RECORDS__ = [];
var _a5, _b5;
(_b5 = (_a5 = target).__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__) != null ? _b5 : _a5.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__ = {};
var _a6, _b6;
(_b6 = (_a6 = target).__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD_ID__) != null ? _b6 : _a6.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD_ID__ = "";
var _a7, _b7;
(_b7 = (_a7 = target).__VUE_DEVTOOLS_KIT_CUSTOM_TABS__) != null ? _b7 : _a7.__VUE_DEVTOOLS_KIT_CUSTOM_TABS__ = [];
var _a8, _b8;
(_b8 = (_a8 = target).__VUE_DEVTOOLS_KIT_CUSTOM_COMMANDS__) != null ? _b8 : _a8.__VUE_DEVTOOLS_KIT_CUSTOM_COMMANDS__ = [];
var STATE_KEY = "__VUE_DEVTOOLS_KIT_GLOBAL_STATE__";
function initStateFactory() {
  return {
    connected: false,
    clientConnected: false,
    vitePluginDetected: true,
    appRecords: [],
    activeAppRecordId: "",
    tabs: [],
    commands: [],
    highPerfModeEnabled: true,
    devtoolsClientDetected: {},
    perfUniqueGroupId: 0,
    timelineLayersState: getTimelineLayersStateFromStorage()
  };
}
var _a9, _b9;
(_b9 = (_a9 = target)[STATE_KEY]) != null ? _b9 : _a9[STATE_KEY] = initStateFactory();
var callStateUpdatedHook = debounce((state) => {
  devtoolsContext.hooks.callHook("devtoolsStateUpdated" /* DEVTOOLS_STATE_UPDATED */, { state });
});
debounce((state, oldState) => {
  devtoolsContext.hooks.callHook("devtoolsConnectedUpdated" /* DEVTOOLS_CONNECTED_UPDATED */, { state, oldState });
});
var devtoolsAppRecords = new Proxy(target.__VUE_DEVTOOLS_KIT_APP_RECORDS__, {
  get(_target, prop, receiver) {
    if (prop === "value")
      return target.__VUE_DEVTOOLS_KIT_APP_RECORDS__;
    return target.__VUE_DEVTOOLS_KIT_APP_RECORDS__[prop];
  }
});
var activeAppRecord = new Proxy(target.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__, {
  get(_target, prop, receiver) {
    if (prop === "value")
      return target.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__;
    else if (prop === "id")
      return target.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD_ID__;
    return target.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__[prop];
  }
});
function updateAllStates() {
  callStateUpdatedHook({
    ...target[STATE_KEY],
    appRecords: devtoolsAppRecords.value,
    activeAppRecordId: activeAppRecord.id,
    tabs: target.__VUE_DEVTOOLS_KIT_CUSTOM_TABS__,
    commands: target.__VUE_DEVTOOLS_KIT_CUSTOM_COMMANDS__
  });
}
function setActiveAppRecord(app) {
  target.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__ = app;
  updateAllStates();
}
function setActiveAppRecordId(id) {
  target.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD_ID__ = id;
  updateAllStates();
}
var devtoolsState = new Proxy(target[STATE_KEY], {
  get(target22, property) {
    if (property === "appRecords") {
      return devtoolsAppRecords;
    } else if (property === "activeAppRecordId") {
      return activeAppRecord.id;
    } else if (property === "tabs") {
      return target.__VUE_DEVTOOLS_KIT_CUSTOM_TABS__;
    } else if (property === "commands") {
      return target.__VUE_DEVTOOLS_KIT_CUSTOM_COMMANDS__;
    }
    return target[STATE_KEY][property];
  },
  deleteProperty(target22, property) {
    delete target22[property];
    return true;
  },
  set(target22, property, value) {
    ({ ...target[STATE_KEY] });
    target22[property] = value;
    target[STATE_KEY][property] = value;
    return true;
  }
});
function openInEditor(options = {}) {
  var _a25, _b25, _c;
  const { file, host, baseUrl = window.location.origin, line = 0, column = 0 } = options;
  if (file) {
    if (host === "chrome-extension") {
      const fileName = file.replace(/\\/g, "\\\\");
      const _baseUrl = (_b25 = (_a25 = window.VUE_DEVTOOLS_CONFIG) == null ? void 0 : _a25.openInEditorHost) != null ? _b25 : "/";
      fetch(`${_baseUrl}__open-in-editor?file=${encodeURI(file)}`).then((response) => {
        if (!response.ok) {
          const msg = `Opening component ${fileName} failed`;
          console.log(`%c${msg}`, "color:red");
        }
      });
    } else if (devtoolsState.vitePluginDetected) {
      const _baseUrl = (_c = target.__VUE_DEVTOOLS_OPEN_IN_EDITOR_BASE_URL__) != null ? _c : baseUrl;
      target.__VUE_INSPECTOR__.openInEditor(_baseUrl, file, line, column);
    }
  }
}

// src/core/plugin/index.ts
init_esm_shims();

// src/api/index.ts
init_esm_shims();

// src/api/v6/index.ts
init_esm_shims();

// src/core/plugin/plugin-settings.ts
init_esm_shims();

// src/ctx/plugin.ts
init_esm_shims();
var _a10, _b10;
(_b10 = (_a10 = target).__VUE_DEVTOOLS_KIT_PLUGIN_BUFFER__) != null ? _b10 : _a10.__VUE_DEVTOOLS_KIT_PLUGIN_BUFFER__ = [];
var devtoolsPluginBuffer = new Proxy(target.__VUE_DEVTOOLS_KIT_PLUGIN_BUFFER__, {
  get(target22, prop, receiver) {
    return Reflect.get(target22, prop, receiver);
  }
});

// src/core/plugin/plugin-settings.ts
function _getSettings(settings) {
  const _settings = {};
  Object.keys(settings).forEach((key) => {
    _settings[key] = settings[key].defaultValue;
  });
  return _settings;
}
function getPluginLocalKey(pluginId) {
  return `__VUE_DEVTOOLS_NEXT_PLUGIN_SETTINGS__${pluginId}__`;
}
function getPluginSettingsOptions(pluginId) {
  var _a25, _b25, _c;
  const item = (_b25 = (_a25 = devtoolsPluginBuffer.find((item2) => {
    var _a26;
    return item2[0].id === pluginId && !!((_a26 = item2[0]) == null ? void 0 : _a26.settings);
  })) == null ? void 0 : _a25[0]) != null ? _b25 : null;
  return (_c = item == null ? void 0 : item.settings) != null ? _c : null;
}
function getPluginSettings(pluginId, fallbackValue) {
  var _a25, _b25, _c;
  const localKey = getPluginLocalKey(pluginId);
  if (localKey) {
    const localSettings = localStorage.getItem(localKey);
    if (localSettings) {
      return JSON.parse(localSettings);
    }
  }
  if (pluginId) {
    const item = (_b25 = (_a25 = devtoolsPluginBuffer.find((item2) => item2[0].id === pluginId)) == null ? void 0 : _a25[0]) != null ? _b25 : null;
    return _getSettings((_c = item == null ? void 0 : item.settings) != null ? _c : {});
  }
  return _getSettings(fallbackValue);
}
function initPluginSettings(pluginId, settings) {
  const localKey = getPluginLocalKey(pluginId);
  const localSettings = localStorage.getItem(localKey);
  if (!localSettings) {
    localStorage.setItem(localKey, JSON.stringify(_getSettings(settings)));
  }
}
function setPluginSettings(pluginId, key, value) {
  const localKey = getPluginLocalKey(pluginId);
  const localSettings = localStorage.getItem(localKey);
  const parsedLocalSettings = JSON.parse(localSettings || "{}");
  const updated = {
    ...parsedLocalSettings,
    [key]: value
  };
  localStorage.setItem(localKey, JSON.stringify(updated));
  devtoolsContext.hooks.callHookWith((callbacks) => {
    callbacks.forEach((cb) => cb({
      pluginId,
      key,
      oldValue: parsedLocalSettings[key],
      newValue: value,
      settings: updated
    }));
  }, "setPluginSettings" /* SET_PLUGIN_SETTINGS */);
}

// src/hook/index.ts
init_esm_shims();

// src/types/index.ts
init_esm_shims();

// src/types/app.ts
init_esm_shims();

// src/types/command.ts
init_esm_shims();

// src/types/component.ts
init_esm_shims();

// src/types/hook.ts
init_esm_shims();

// src/types/inspector.ts
init_esm_shims();

// src/types/plugin.ts
init_esm_shims();

// src/types/router.ts
init_esm_shims();

// src/types/tab.ts
init_esm_shims();

// src/types/timeline.ts
init_esm_shims();

// src/hook/index.ts
var _a11, _b11;
var devtoolsHooks = (_b11 = (_a11 = target).__VUE_DEVTOOLS_HOOK) != null ? _b11 : _a11.__VUE_DEVTOOLS_HOOK = createHooks();
var on = {
  vueAppInit(fn) {
    devtoolsHooks.hook("app:init" /* APP_INIT */, fn);
  },
  vueAppUnmount(fn) {
    devtoolsHooks.hook("app:unmount" /* APP_UNMOUNT */, fn);
  },
  vueAppConnected(fn) {
    devtoolsHooks.hook("app:connected" /* APP_CONNECTED */, fn);
  },
  componentAdded(fn) {
    return devtoolsHooks.hook("component:added" /* COMPONENT_ADDED */, fn);
  },
  componentEmit(fn) {
    return devtoolsHooks.hook("component:emit" /* COMPONENT_EMIT */, fn);
  },
  componentUpdated(fn) {
    return devtoolsHooks.hook("component:updated" /* COMPONENT_UPDATED */, fn);
  },
  componentRemoved(fn) {
    return devtoolsHooks.hook("component:removed" /* COMPONENT_REMOVED */, fn);
  },
  setupDevtoolsPlugin(fn) {
    devtoolsHooks.hook("devtools-plugin:setup" /* SETUP_DEVTOOLS_PLUGIN */, fn);
  },
  perfStart(fn) {
    return devtoolsHooks.hook("perf:start" /* PERFORMANCE_START */, fn);
  },
  perfEnd(fn) {
    return devtoolsHooks.hook("perf:end" /* PERFORMANCE_END */, fn);
  }
};
var hook = {
  on,
  setupDevToolsPlugin(pluginDescriptor, setupFn) {
    return devtoolsHooks.callHook("devtools-plugin:setup" /* SETUP_DEVTOOLS_PLUGIN */, pluginDescriptor, setupFn);
  }
};

// src/api/v6/index.ts
var DevToolsV6PluginAPI = class {
  constructor({ plugin, ctx }) {
    this.hooks = ctx.hooks;
    this.plugin = plugin;
  }
  get on() {
    return {
      // component inspector
      visitComponentTree: (handler) => {
        this.hooks.hook("visitComponentTree" /* VISIT_COMPONENT_TREE */, handler);
      },
      inspectComponent: (handler) => {
        this.hooks.hook("inspectComponent" /* INSPECT_COMPONENT */, handler);
      },
      editComponentState: (handler) => {
        this.hooks.hook("editComponentState" /* EDIT_COMPONENT_STATE */, handler);
      },
      // custom inspector
      getInspectorTree: (handler) => {
        this.hooks.hook("getInspectorTree" /* GET_INSPECTOR_TREE */, handler);
      },
      getInspectorState: (handler) => {
        this.hooks.hook("getInspectorState" /* GET_INSPECTOR_STATE */, handler);
      },
      editInspectorState: (handler) => {
        this.hooks.hook("editInspectorState" /* EDIT_INSPECTOR_STATE */, handler);
      },
      // timeline
      inspectTimelineEvent: (handler) => {
        this.hooks.hook("inspectTimelineEvent" /* INSPECT_TIMELINE_EVENT */, handler);
      },
      timelineCleared: (handler) => {
        this.hooks.hook("timelineCleared" /* TIMELINE_CLEARED */, handler);
      },
      // settings
      setPluginSettings: (handler) => {
        this.hooks.hook("setPluginSettings" /* SET_PLUGIN_SETTINGS */, handler);
      }
    };
  }
  // component inspector
  notifyComponentUpdate(instance) {
    var _a25;
    const inspector = getActiveInspectors().find((i) => i.packageName === this.plugin.descriptor.packageName);
    if (inspector == null ? void 0 : inspector.id) {
      if (instance) {
        const args = [
          instance.appContext.app,
          instance.uid,
          (_a25 = instance.parent) == null ? void 0 : _a25.uid,
          instance
        ];
        devtoolsHooks.callHook("component:updated" /* COMPONENT_UPDATED */, ...args);
      } else {
        devtoolsHooks.callHook("component:updated" /* COMPONENT_UPDATED */);
      }
      this.hooks.callHook("sendInspectorState" /* SEND_INSPECTOR_STATE */, { inspectorId: inspector.id, plugin: this.plugin });
    }
  }
  // custom inspector
  addInspector(options) {
    this.hooks.callHook("addInspector" /* ADD_INSPECTOR */, { inspector: options, plugin: this.plugin });
    if (this.plugin.descriptor.settings) {
      initPluginSettings(options.id, this.plugin.descriptor.settings);
    }
  }
  sendInspectorTree(inspectorId) {
    this.hooks.callHook("sendInspectorTree" /* SEND_INSPECTOR_TREE */, { inspectorId, plugin: this.plugin });
  }
  sendInspectorState(inspectorId) {
    this.hooks.callHook("sendInspectorState" /* SEND_INSPECTOR_STATE */, { inspectorId, plugin: this.plugin });
  }
  selectInspectorNode(inspectorId, nodeId) {
    this.hooks.callHook("customInspectorSelectNode" /* CUSTOM_INSPECTOR_SELECT_NODE */, { inspectorId, nodeId, plugin: this.plugin });
  }
  // timeline
  now() {
    return Date.now();
  }
  addTimelineLayer(options) {
    this.hooks.callHook("timelineLayerAdded" /* TIMELINE_LAYER_ADDED */, { options, plugin: this.plugin });
  }
  addTimelineEvent(options) {
    this.hooks.callHook("timelineEventAdded" /* TIMELINE_EVENT_ADDED */, { options, plugin: this.plugin });
  }
  // settings
  getSettings(pluginId) {
    return getPluginSettings(pluginId != null ? pluginId : this.plugin.descriptor.id, this.plugin.descriptor.settings);
  }
  // utilities
  getComponentInstances(app) {
    return this.hooks.callHook("getComponentInstances" /* GET_COMPONENT_INSTANCES */, { app });
  }
  getComponentBounds(instance) {
    return this.hooks.callHook("getComponentBounds" /* GET_COMPONENT_BOUNDS */, { instance });
  }
  getComponentName(instance) {
    return this.hooks.callHook("getComponentName" /* GET_COMPONENT_NAME */, { instance });
  }
  highlightElement(instance) {
    const uid = instance.__VUE_DEVTOOLS_NEXT_UID__;
    return this.hooks.callHook("componentHighlight" /* COMPONENT_HIGHLIGHT */, { uid });
  }
  unhighlightElement() {
    return this.hooks.callHook("componentUnhighlight" /* COMPONENT_UNHIGHLIGHT */);
  }
};

// src/api/index.ts
var DevToolsPluginAPI = DevToolsV6PluginAPI;

// src/core/plugin/components.ts
init_esm_shims();

// src/core/component/state/index.ts
init_esm_shims();

// src/core/component/state/process.ts
init_esm_shims();

// src/core/component/state/constants.ts
init_esm_shims();
var UNDEFINED = "__vue_devtool_undefined__";
var INFINITY = "__vue_devtool_infinity__";
var NEGATIVE_INFINITY = "__vue_devtool_negative_infinity__";
var NAN = "__vue_devtool_nan__";

// src/core/component/state/util.ts
init_esm_shims();

// src/core/component/state/is.ts
init_esm_shims();

// src/core/component/state/util.ts
var tokenMap = {
  [UNDEFINED]: "undefined",
  [NAN]: "NaN",
  [INFINITY]: "Infinity",
  [NEGATIVE_INFINITY]: "-Infinity"
};
Object.entries(tokenMap).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {});

// src/core/component/tree/walker.ts
init_esm_shims();

// src/core/component/tree/filter.ts
init_esm_shims();

// src/core/timeline/index.ts
init_esm_shims();

// src/core/timeline/perf.ts
init_esm_shims();

// src/core/vm/index.ts
init_esm_shims();

// src/core/plugin/index.ts
var _a12, _b12;
(_b12 = (_a12 = target).__VUE_DEVTOOLS_KIT__REGISTERED_PLUGIN_APPS__) != null ? _b12 : _a12.__VUE_DEVTOOLS_KIT__REGISTERED_PLUGIN_APPS__ = /* @__PURE__ */ new Set();
function callDevToolsPluginSetupFn(plugin, app) {
  const [pluginDescriptor, setupFn] = plugin;
  if (pluginDescriptor.app !== app)
    return;
  const api = new DevToolsPluginAPI({
    plugin: {
      setupFn,
      descriptor: pluginDescriptor
    },
    ctx: devtoolsContext
  });
  if (pluginDescriptor.packageName === "vuex") {
    api.on.editInspectorState((payload) => {
      api.sendInspectorState(payload.inspectorId);
    });
  }
  setupFn(api);
}
function registerDevToolsPlugin(app) {
  if (target.__VUE_DEVTOOLS_KIT__REGISTERED_PLUGIN_APPS__.has(app))
    return;
  target.__VUE_DEVTOOLS_KIT__REGISTERED_PLUGIN_APPS__.add(app);
  devtoolsPluginBuffer.forEach((plugin) => {
    callDevToolsPluginSetupFn(plugin, app);
  });
}

// src/core/router/index.ts
init_esm_shims();

// src/ctx/router.ts
init_esm_shims();
var ROUTER_KEY = "__VUE_DEVTOOLS_ROUTER__";
var ROUTER_INFO_KEY = "__VUE_DEVTOOLS_ROUTER_INFO__";
var _a13, _b13;
(_b13 = (_a13 = target)[ROUTER_INFO_KEY]) != null ? _b13 : _a13[ROUTER_INFO_KEY] = {
  currentRoute: null,
  routes: []
};
var _a14, _b14;
(_b14 = (_a14 = target)[ROUTER_KEY]) != null ? _b14 : _a14[ROUTER_KEY] = {};
new Proxy(target[ROUTER_INFO_KEY], {
  get(target22, property) {
    return target[ROUTER_INFO_KEY][property];
  }
});
new Proxy(target[ROUTER_KEY], {
  get(target22, property) {
    if (property === "value") {
      return target[ROUTER_KEY];
    }
  }
});

// src/core/router/index.ts
function getRoutes(router) {
  const routesMap = /* @__PURE__ */ new Map();
  return ((router == null ? void 0 : router.getRoutes()) || []).filter((i) => !routesMap.has(i.path) && routesMap.set(i.path, 1));
}
function filterRoutes(routes) {
  return routes.map((item) => {
    let { path, name, children, meta } = item;
    if (children == null ? void 0 : children.length)
      children = filterRoutes(children);
    return {
      path,
      name,
      children,
      meta
    };
  });
}
function filterCurrentRoute(route) {
  if (route) {
    const { fullPath, hash, href, path, name, matched, params, query } = route;
    return {
      fullPath,
      hash,
      href,
      path,
      name,
      params,
      query,
      matched: filterRoutes(matched)
    };
  }
  return route;
}
function normalizeRouterInfo(appRecord, activeAppRecord2) {
  function init() {
    var _a25;
    const router = (_a25 = appRecord.app) == null ? void 0 : _a25.config.globalProperties.$router;
    const currentRoute = filterCurrentRoute(router == null ? void 0 : router.currentRoute.value);
    const routes = filterRoutes(getRoutes(router));
    const c = console.warn;
    console.warn = () => {
    };
    target[ROUTER_INFO_KEY] = {
      currentRoute: currentRoute ? deepClone(currentRoute) : {},
      routes: deepClone(routes)
    };
    target[ROUTER_KEY] = router;
    console.warn = c;
  }
  init();
  hook.on.componentUpdated(debounce(() => {
    var _a25;
    if (((_a25 = activeAppRecord2.value) == null ? void 0 : _a25.app) !== appRecord.app)
      return;
    init();
    devtoolsContext.hooks.callHook("routerInfoUpdated" /* ROUTER_INFO_UPDATED */, { state: target[ROUTER_INFO_KEY] });
  }, 200));
}

// src/ctx/api.ts
function createDevToolsApi(hooks2) {
  return {
    // get inspector tree
    async getInspectorTree(payload) {
      const _payload = {
        ...payload,
        app: activeAppRecord.value.app,
        rootNodes: []
      };
      await new Promise((resolve) => {
        hooks2.callHookWith(async (callbacks) => {
          await Promise.all(callbacks.map((cb) => cb(_payload)));
          resolve();
        }, "getInspectorTree" /* GET_INSPECTOR_TREE */);
      });
      return _payload.rootNodes;
    },
    // get inspector state
    async getInspectorState(payload) {
      const _payload = {
        ...payload,
        app: activeAppRecord.value.app,
        state: null
      };
      const ctx = {
        currentTab: `custom-inspector:${payload.inspectorId}`
      };
      await new Promise((resolve) => {
        hooks2.callHookWith(async (callbacks) => {
          await Promise.all(callbacks.map((cb) => cb(_payload, ctx)));
          resolve();
        }, "getInspectorState" /* GET_INSPECTOR_STATE */);
      });
      return _payload.state;
    },
    // edit inspector state
    editInspectorState(payload) {
      const stateEditor2 = new StateEditor();
      const _payload = {
        ...payload,
        app: activeAppRecord.value.app,
        set: (obj, path = payload.path, value = payload.state.value, cb) => {
          stateEditor2.set(obj, path, value, cb || stateEditor2.createDefaultSetCallback(payload.state));
        }
      };
      hooks2.callHookWith((callbacks) => {
        callbacks.forEach((cb) => cb(_payload));
      }, "editInspectorState" /* EDIT_INSPECTOR_STATE */);
    },
    // send inspector state
    sendInspectorState(inspectorId) {
      const inspector = getInspector(inspectorId);
      hooks2.callHook("sendInspectorState" /* SEND_INSPECTOR_STATE */, { inspectorId, plugin: {
        descriptor: inspector.descriptor,
        setupFn: () => ({})
      } });
    },
    // inspect component inspector
    inspectComponentInspector() {
      return inspectComponentHighLighter();
    },
    // cancel inspect component inspector
    cancelInspectComponentInspector() {
      return cancelInspectComponentHighLighter();
    },
    // get component render code
    getComponentRenderCode(id) {
      const instance = getComponentInstance(activeAppRecord.value, id);
      if (instance)
        return !((instance == null ? void 0 : instance.type) instanceof Function) ? instance.render.toString() : instance.type.toString();
    },
    // scroll to component
    scrollToComponent(id) {
      return scrollToComponent({ id });
    },
    // open in editor
    openInEditor,
    // get vue inspector
    getVueInspector: getComponentInspector,
    // toggle app
    toggleApp(id) {
      const appRecord = devtoolsAppRecords.value.find((record) => record.id === id);
      if (appRecord) {
        setActiveAppRecordId(id);
        setActiveAppRecord(appRecord);
        normalizeRouterInfo(appRecord, activeAppRecord);
        callInspectorUpdatedHook();
        registerDevToolsPlugin(appRecord.app);
      }
    },
    // inspect dom
    inspectDOM(instanceId) {
      const instance = getComponentInstance(activeAppRecord.value, instanceId);
      if (instance) {
        const [el] = getRootElementsFromComponentInstance(instance);
        if (el) {
          target.__VUE_DEVTOOLS_INSPECT_DOM_TARGET__ = el;
        }
      }
    },
    updatePluginSettings(pluginId, key, value) {
      setPluginSettings(pluginId, key, value);
    },
    getPluginSettings(pluginId) {
      return {
        options: getPluginSettingsOptions(pluginId),
        values: getPluginSettings(pluginId)
      };
    }
  };
}

// src/ctx/env.ts
init_esm_shims();
var _a15, _b15;
(_b15 = (_a15 = target).__VUE_DEVTOOLS_ENV__) != null ? _b15 : _a15.__VUE_DEVTOOLS_ENV__ = {
  vitePluginDetected: false
};

// src/ctx/index.ts
var hooks = createDevToolsCtxHooks();
var _a16, _b16;
(_b16 = (_a16 = target).__VUE_DEVTOOLS_KIT_CONTEXT__) != null ? _b16 : _a16.__VUE_DEVTOOLS_KIT_CONTEXT__ = {
  hooks,
  get state() {
    return {
      ...devtoolsState,
      activeAppRecordId: activeAppRecord.id,
      activeAppRecord: activeAppRecord.value,
      appRecords: devtoolsAppRecords.value
    };
  },
  api: createDevToolsApi(hooks)
};
var devtoolsContext = target.__VUE_DEVTOOLS_KIT_CONTEXT__;

// src/core/app/index.ts
init_esm_shims();
__toESM(require_speakingurl2());
var _a17, _b17;
(_b17 = (_a17 = target).__VUE_DEVTOOLS_NEXT_APP_RECORD_INFO__) != null ? _b17 : _a17.__VUE_DEVTOOLS_NEXT_APP_RECORD_INFO__ = {
  id: 0,
  appIds: /* @__PURE__ */ new Set()
};

// src/core/high-perf-mode/index.ts
init_esm_shims();
function toggleHighPerfMode(state) {
  devtoolsState.highPerfModeEnabled = state != null ? state : !devtoolsState.highPerfModeEnabled;
}

// src/core/component/state/format.ts
init_esm_shims();

// src/core/component/state/reviver.ts
init_esm_shims();

// src/core/devtools-client/detected.ts
init_esm_shims();
function updateDevToolsClientDetected(params) {
  devtoolsState.devtoolsClientDetected = {
    ...devtoolsState.devtoolsClientDetected,
    ...params
  };
  const devtoolsClientVisible = Object.values(devtoolsState.devtoolsClientDetected).some(Boolean);
  toggleHighPerfMode(!devtoolsClientVisible);
}
var _a18, _b18;
(_b18 = (_a18 = target).__VUE_DEVTOOLS_UPDATE_CLIENT_DETECTED__) != null ? _b18 : _a18.__VUE_DEVTOOLS_UPDATE_CLIENT_DETECTED__ = updateDevToolsClientDetected;

// src/messaging/index.ts
init_esm_shims();

// src/messaging/presets/index.ts
init_esm_shims();

// src/messaging/presets/broadcast-channel/index.ts
init_esm_shims();

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/index.js
init_esm_shims();

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/class-registry.js
init_esm_shims();

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/registry.js
init_esm_shims();

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/double-indexed-kv.js
init_esm_shims();
var DoubleIndexedKV = class {
  constructor() {
    this.keyToValue = /* @__PURE__ */ new Map();
    this.valueToKey = /* @__PURE__ */ new Map();
  }
  set(key, value) {
    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }
  getByKey(key) {
    return this.keyToValue.get(key);
  }
  getByValue(value) {
    return this.valueToKey.get(value);
  }
  clear() {
    this.keyToValue.clear();
    this.valueToKey.clear();
  }
};

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/registry.js
var Registry = class {
  constructor(generateIdentifier) {
    this.generateIdentifier = generateIdentifier;
    this.kv = new DoubleIndexedKV();
  }
  register(value, identifier) {
    if (this.kv.getByValue(value)) {
      return;
    }
    if (!identifier) {
      identifier = this.generateIdentifier(value);
    }
    this.kv.set(identifier, value);
  }
  clear() {
    this.kv.clear();
  }
  getIdentifier(value) {
    return this.kv.getByValue(value);
  }
  getValue(identifier) {
    return this.kv.getByKey(identifier);
  }
};

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/class-registry.js
var ClassRegistry = class extends Registry {
  constructor() {
    super((c) => c.name);
    this.classToAllowedProps = /* @__PURE__ */ new Map();
  }
  register(value, options) {
    if (typeof options === "object") {
      if (options.allowProps) {
        this.classToAllowedProps.set(value, options.allowProps);
      }
      super.register(value, options.identifier);
    } else {
      super.register(value, options);
    }
  }
  getAllowedProps(value) {
    return this.classToAllowedProps.get(value);
  }
};

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/custom-transformer-registry.js
init_esm_shims();

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/util.js
init_esm_shims();
function valuesOfObj(record) {
  if ("values" in Object) {
    return Object.values(record);
  }
  const values = [];
  for (const key in record) {
    if (record.hasOwnProperty(key)) {
      values.push(record[key]);
    }
  }
  return values;
}
function find(record, predicate) {
  const values = valuesOfObj(record);
  if ("find" in values) {
    return values.find(predicate);
  }
  const valuesNotNever = values;
  for (let i = 0; i < valuesNotNever.length; i++) {
    const value = valuesNotNever[i];
    if (predicate(value)) {
      return value;
    }
  }
  return void 0;
}
function forEach$1(record, run) {
  Object.entries(record).forEach(([key, value]) => run(value, key));
}
function includes(arr, value) {
  return arr.indexOf(value) !== -1;
}
function findArr(record, predicate) {
  for (let i = 0; i < record.length; i++) {
    const value = record[i];
    if (predicate(value)) {
      return value;
    }
  }
  return void 0;
}

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/custom-transformer-registry.js
var CustomTransformerRegistry = class {
  constructor() {
    this.transfomers = {};
  }
  register(transformer) {
    this.transfomers[transformer.name] = transformer;
  }
  findApplicable(v) {
    return find(this.transfomers, (transformer) => transformer.isApplicable(v));
  }
  findByName(name) {
    return this.transfomers[name];
  }
};

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/plainer.js
init_esm_shims();

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/is.js
init_esm_shims();
var getType = (payload) => Object.prototype.toString.call(payload).slice(8, -1);
var isUndefined = (payload) => typeof payload === "undefined";
var isNull = (payload) => payload === null;
var isPlainObject2 = (payload) => {
  if (typeof payload !== "object" || payload === null)
    return false;
  if (payload === Object.prototype)
    return false;
  if (Object.getPrototypeOf(payload) === null)
    return true;
  return Object.getPrototypeOf(payload) === Object.prototype;
};
var isEmptyObject = (payload) => isPlainObject2(payload) && Object.keys(payload).length === 0;
var isArray = (payload) => Array.isArray(payload);
var isString = (payload) => typeof payload === "string";
var isNumber = (payload) => typeof payload === "number" && !isNaN(payload);
var isBoolean = (payload) => typeof payload === "boolean";
var isRegExp = (payload) => payload instanceof RegExp;
var isMap = (payload) => payload instanceof Map;
var isSet = (payload) => payload instanceof Set;
var isSymbol = (payload) => getType(payload) === "Symbol";
var isDate$1 = (payload) => payload instanceof Date && !isNaN(payload.valueOf());
var isError = (payload) => payload instanceof Error;
var isNaNValue = (payload) => typeof payload === "number" && isNaN(payload);
var isPrimitive2 = (payload) => isBoolean(payload) || isNull(payload) || isUndefined(payload) || isNumber(payload) || isString(payload) || isSymbol(payload);
var isBigint = (payload) => typeof payload === "bigint";
var isInfinite = (payload) => payload === Infinity || payload === -Infinity;
var isTypedArray = (payload) => ArrayBuffer.isView(payload) && !(payload instanceof DataView);
var isURL = (payload) => payload instanceof URL;

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/pathstringifier.js
init_esm_shims();
var escapeKey = (key) => key.replace(/\./g, "\\.");
var stringifyPath = (path) => path.map(String).map(escapeKey).join(".");
var parsePath = (string) => {
  const result = [];
  let segment = "";
  for (let i = 0; i < string.length; i++) {
    let char = string.charAt(i);
    const isEscapedDot = char === "\\" && string.charAt(i + 1) === ".";
    if (isEscapedDot) {
      segment += ".";
      i++;
      continue;
    }
    const isEndOfSegment = char === ".";
    if (isEndOfSegment) {
      result.push(segment);
      segment = "";
      continue;
    }
    segment += char;
  }
  const lastSegment = segment;
  result.push(lastSegment);
  return result;
};

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/transformer.js
init_esm_shims();
function simpleTransformation(isApplicable, annotation, transform, untransform) {
  return {
    isApplicable,
    annotation,
    transform,
    untransform
  };
}
var simpleRules = [
  simpleTransformation(isUndefined, "undefined", () => null, () => void 0),
  simpleTransformation(isBigint, "bigint", (v) => v.toString(), (v) => {
    if (typeof BigInt !== "undefined") {
      return BigInt(v);
    }
    console.error("Please add a BigInt polyfill.");
    return v;
  }),
  simpleTransformation(isDate$1, "Date", (v) => v.toISOString(), (v) => new Date(v)),
  simpleTransformation(isError, "Error", (v, superJson) => {
    const baseError = {
      name: v.name,
      message: v.message
    };
    superJson.allowedErrorProps.forEach((prop) => {
      baseError[prop] = v[prop];
    });
    return baseError;
  }, (v, superJson) => {
    const e = new Error(v.message);
    e.name = v.name;
    e.stack = v.stack;
    superJson.allowedErrorProps.forEach((prop) => {
      e[prop] = v[prop];
    });
    return e;
  }),
  simpleTransformation(isRegExp, "regexp", (v) => "" + v, (regex) => {
    const body = regex.slice(1, regex.lastIndexOf("/"));
    const flags = regex.slice(regex.lastIndexOf("/") + 1);
    return new RegExp(body, flags);
  }),
  simpleTransformation(
    isSet,
    "set",
    // (sets only exist in es6+)
    // eslint-disable-next-line es5/no-es6-methods
    (v) => [...v.values()],
    (v) => new Set(v)
  ),
  simpleTransformation(isMap, "map", (v) => [...v.entries()], (v) => new Map(v)),
  simpleTransformation((v) => isNaNValue(v) || isInfinite(v), "number", (v) => {
    if (isNaNValue(v)) {
      return "NaN";
    }
    if (v > 0) {
      return "Infinity";
    } else {
      return "-Infinity";
    }
  }, Number),
  simpleTransformation((v) => v === 0 && 1 / v === -Infinity, "number", () => {
    return "-0";
  }, Number),
  simpleTransformation(isURL, "URL", (v) => v.toString(), (v) => new URL(v))
];
function compositeTransformation(isApplicable, annotation, transform, untransform) {
  return {
    isApplicable,
    annotation,
    transform,
    untransform
  };
}
var symbolRule = compositeTransformation((s, superJson) => {
  if (isSymbol(s)) {
    const isRegistered = !!superJson.symbolRegistry.getIdentifier(s);
    return isRegistered;
  }
  return false;
}, (s, superJson) => {
  const identifier = superJson.symbolRegistry.getIdentifier(s);
  return ["symbol", identifier];
}, (v) => v.description, (_, a, superJson) => {
  const value = superJson.symbolRegistry.getValue(a[1]);
  if (!value) {
    throw new Error("Trying to deserialize unknown symbol");
  }
  return value;
});
var constructorToName = [
  Int8Array,
  Uint8Array,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
  Uint8ClampedArray
].reduce((obj, ctor) => {
  obj[ctor.name] = ctor;
  return obj;
}, {});
var typedArrayRule = compositeTransformation(isTypedArray, (v) => ["typed-array", v.constructor.name], (v) => [...v], (v, a) => {
  const ctor = constructorToName[a[1]];
  if (!ctor) {
    throw new Error("Trying to deserialize unknown typed array");
  }
  return new ctor(v);
});
function isInstanceOfRegisteredClass(potentialClass, superJson) {
  if (potentialClass == null ? void 0 : potentialClass.constructor) {
    const isRegistered = !!superJson.classRegistry.getIdentifier(potentialClass.constructor);
    return isRegistered;
  }
  return false;
}
var classRule = compositeTransformation(isInstanceOfRegisteredClass, (clazz, superJson) => {
  const identifier = superJson.classRegistry.getIdentifier(clazz.constructor);
  return ["class", identifier];
}, (clazz, superJson) => {
  const allowedProps = superJson.classRegistry.getAllowedProps(clazz.constructor);
  if (!allowedProps) {
    return { ...clazz };
  }
  const result = {};
  allowedProps.forEach((prop) => {
    result[prop] = clazz[prop];
  });
  return result;
}, (v, a, superJson) => {
  const clazz = superJson.classRegistry.getValue(a[1]);
  if (!clazz) {
    throw new Error("Trying to deserialize unknown class - check https://github.com/blitz-js/superjson/issues/116#issuecomment-773996564");
  }
  return Object.assign(Object.create(clazz.prototype), v);
});
var customRule = compositeTransformation((value, superJson) => {
  return !!superJson.customTransformerRegistry.findApplicable(value);
}, (value, superJson) => {
  const transformer = superJson.customTransformerRegistry.findApplicable(value);
  return ["custom", transformer.name];
}, (value, superJson) => {
  const transformer = superJson.customTransformerRegistry.findApplicable(value);
  return transformer.serialize(value);
}, (v, a, superJson) => {
  const transformer = superJson.customTransformerRegistry.findByName(a[1]);
  if (!transformer) {
    throw new Error("Trying to deserialize unknown custom value");
  }
  return transformer.deserialize(v);
});
var compositeRules = [classRule, symbolRule, customRule, typedArrayRule];
var transformValue = (value, superJson) => {
  const applicableCompositeRule = findArr(compositeRules, (rule) => rule.isApplicable(value, superJson));
  if (applicableCompositeRule) {
    return {
      value: applicableCompositeRule.transform(value, superJson),
      type: applicableCompositeRule.annotation(value, superJson)
    };
  }
  const applicableSimpleRule = findArr(simpleRules, (rule) => rule.isApplicable(value, superJson));
  if (applicableSimpleRule) {
    return {
      value: applicableSimpleRule.transform(value, superJson),
      type: applicableSimpleRule.annotation
    };
  }
  return void 0;
};
var simpleRulesByAnnotation = {};
simpleRules.forEach((rule) => {
  simpleRulesByAnnotation[rule.annotation] = rule;
});
var untransformValue = (json, type, superJson) => {
  if (isArray(type)) {
    switch (type[0]) {
      case "symbol":
        return symbolRule.untransform(json, type, superJson);
      case "class":
        return classRule.untransform(json, type, superJson);
      case "custom":
        return customRule.untransform(json, type, superJson);
      case "typed-array":
        return typedArrayRule.untransform(json, type, superJson);
      default:
        throw new Error("Unknown transformation: " + type);
    }
  } else {
    const transformation = simpleRulesByAnnotation[type];
    if (!transformation) {
      throw new Error("Unknown transformation: " + type);
    }
    return transformation.untransform(json, superJson);
  }
};

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/accessDeep.js
init_esm_shims();
var getNthKey = (value, n) => {
  const keys = value.keys();
  while (n > 0) {
    keys.next();
    n--;
  }
  return keys.next().value;
};
function validatePath(path) {
  if (includes(path, "__proto__")) {
    throw new Error("__proto__ is not allowed as a property");
  }
  if (includes(path, "prototype")) {
    throw new Error("prototype is not allowed as a property");
  }
  if (includes(path, "constructor")) {
    throw new Error("constructor is not allowed as a property");
  }
}
var getDeep = (object, path) => {
  validatePath(path);
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (isSet(object)) {
      object = getNthKey(object, +key);
    } else if (isMap(object)) {
      const row = +key;
      const type = +path[++i] === 0 ? "key" : "value";
      const keyOfRow = getNthKey(object, row);
      switch (type) {
        case "key":
          object = keyOfRow;
          break;
        case "value":
          object = object.get(keyOfRow);
          break;
      }
    } else {
      object = object[key];
    }
  }
  return object;
};
var setDeep = (object, path, mapper) => {
  validatePath(path);
  if (path.length === 0) {
    return mapper(object);
  }
  let parent = object;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (isArray(parent)) {
      const index = +key;
      parent = parent[index];
    } else if (isPlainObject2(parent)) {
      parent = parent[key];
    } else if (isSet(parent)) {
      const row = +key;
      parent = getNthKey(parent, row);
    } else if (isMap(parent)) {
      const isEnd = i === path.length - 2;
      if (isEnd) {
        break;
      }
      const row = +key;
      const type = +path[++i] === 0 ? "key" : "value";
      const keyOfRow = getNthKey(parent, row);
      switch (type) {
        case "key":
          parent = keyOfRow;
          break;
        case "value":
          parent = parent.get(keyOfRow);
          break;
      }
    }
  }
  const lastKey = path[path.length - 1];
  if (isArray(parent)) {
    parent[+lastKey] = mapper(parent[+lastKey]);
  } else if (isPlainObject2(parent)) {
    parent[lastKey] = mapper(parent[lastKey]);
  }
  if (isSet(parent)) {
    const oldValue = getNthKey(parent, +lastKey);
    const newValue = mapper(oldValue);
    if (oldValue !== newValue) {
      parent.delete(oldValue);
      parent.add(newValue);
    }
  }
  if (isMap(parent)) {
    const row = +path[path.length - 2];
    const keyToRow = getNthKey(parent, row);
    const type = +lastKey === 0 ? "key" : "value";
    switch (type) {
      case "key": {
        const newKey = mapper(keyToRow);
        parent.set(newKey, parent.get(keyToRow));
        if (newKey !== keyToRow) {
          parent.delete(keyToRow);
        }
        break;
      }
      case "value": {
        parent.set(keyToRow, mapper(parent.get(keyToRow)));
        break;
      }
    }
  }
  return object;
};

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/plainer.js
function traverse(tree, walker2, origin = []) {
  if (!tree) {
    return;
  }
  if (!isArray(tree)) {
    forEach$1(tree, (subtree, key) => traverse(subtree, walker2, [...origin, ...parsePath(key)]));
    return;
  }
  const [nodeValue, children] = tree;
  if (children) {
    forEach$1(children, (child, key) => {
      traverse(child, walker2, [...origin, ...parsePath(key)]);
    });
  }
  walker2(nodeValue, origin);
}
function applyValueAnnotations(plain, annotations, superJson) {
  traverse(annotations, (type, path) => {
    plain = setDeep(plain, path, (v) => untransformValue(v, type, superJson));
  });
  return plain;
}
function applyReferentialEqualityAnnotations(plain, annotations) {
  function apply(identicalPaths, path) {
    const object = getDeep(plain, parsePath(path));
    identicalPaths.map(parsePath).forEach((identicalObjectPath) => {
      plain = setDeep(plain, identicalObjectPath, () => object);
    });
  }
  if (isArray(annotations)) {
    const [root, other] = annotations;
    root.forEach((identicalPath) => {
      plain = setDeep(plain, parsePath(identicalPath), () => plain);
    });
    if (other) {
      forEach$1(other, apply);
    }
  } else {
    forEach$1(annotations, apply);
  }
  return plain;
}
var isDeep = (object, superJson) => isPlainObject2(object) || isArray(object) || isMap(object) || isSet(object) || isInstanceOfRegisteredClass(object, superJson);
function addIdentity(object, path, identities) {
  const existingSet = identities.get(object);
  if (existingSet) {
    existingSet.push(path);
  } else {
    identities.set(object, [path]);
  }
}
function generateReferentialEqualityAnnotations(identitites, dedupe) {
  const result = {};
  let rootEqualityPaths = void 0;
  identitites.forEach((paths) => {
    if (paths.length <= 1) {
      return;
    }
    if (!dedupe) {
      paths = paths.map((path) => path.map(String)).sort((a, b) => a.length - b.length);
    }
    const [representativePath, ...identicalPaths] = paths;
    if (representativePath.length === 0) {
      rootEqualityPaths = identicalPaths.map(stringifyPath);
    } else {
      result[stringifyPath(representativePath)] = identicalPaths.map(stringifyPath);
    }
  });
  if (rootEqualityPaths) {
    if (isEmptyObject(result)) {
      return [rootEqualityPaths];
    } else {
      return [rootEqualityPaths, result];
    }
  } else {
    return isEmptyObject(result) ? void 0 : result;
  }
}
var walker = (object, identities, superJson, dedupe, path = [], objectsInThisPath = [], seenObjects = /* @__PURE__ */ new Map()) => {
  var _a25;
  const primitive = isPrimitive2(object);
  if (!primitive) {
    addIdentity(object, path, identities);
    const seen = seenObjects.get(object);
    if (seen) {
      return dedupe ? {
        transformedValue: null
      } : seen;
    }
  }
  if (!isDeep(object, superJson)) {
    const transformed2 = transformValue(object, superJson);
    const result2 = transformed2 ? {
      transformedValue: transformed2.value,
      annotations: [transformed2.type]
    } : {
      transformedValue: object
    };
    if (!primitive) {
      seenObjects.set(object, result2);
    }
    return result2;
  }
  if (includes(objectsInThisPath, object)) {
    return {
      transformedValue: null
    };
  }
  const transformationResult = transformValue(object, superJson);
  const transformed = (_a25 = transformationResult == null ? void 0 : transformationResult.value) != null ? _a25 : object;
  const transformedValue = isArray(transformed) ? [] : {};
  const innerAnnotations = {};
  forEach$1(transformed, (value, index) => {
    if (index === "__proto__" || index === "constructor" || index === "prototype") {
      throw new Error(`Detected property ${index}. This is a prototype pollution risk, please remove it from your object.`);
    }
    const recursiveResult = walker(value, identities, superJson, dedupe, [...path, index], [...objectsInThisPath, object], seenObjects);
    transformedValue[index] = recursiveResult.transformedValue;
    if (isArray(recursiveResult.annotations)) {
      innerAnnotations[index] = recursiveResult.annotations;
    } else if (isPlainObject2(recursiveResult.annotations)) {
      forEach$1(recursiveResult.annotations, (tree, key) => {
        innerAnnotations[escapeKey(index) + "." + key] = tree;
      });
    }
  });
  const result = isEmptyObject(innerAnnotations) ? {
    transformedValue,
    annotations: !!transformationResult ? [transformationResult.type] : void 0
  } : {
    transformedValue,
    annotations: !!transformationResult ? [transformationResult.type, innerAnnotations] : innerAnnotations
  };
  if (!primitive) {
    seenObjects.set(object, result);
  }
  return result;
};

// ../../node_modules/.pnpm/copy-anything@3.0.5/node_modules/copy-anything/dist/index.js
init_esm_shims();

// ../../node_modules/.pnpm/is-what@4.1.16/node_modules/is-what/dist/index.js
init_esm_shims();
function getType2(payload) {
  return Object.prototype.toString.call(payload).slice(8, -1);
}
function isArray2(payload) {
  return getType2(payload) === "Array";
}
function isPlainObject3(payload) {
  if (getType2(payload) !== "Object")
    return false;
  const prototype = Object.getPrototypeOf(payload);
  return !!prototype && prototype.constructor === Object && prototype === Object.prototype;
}

// ../../node_modules/.pnpm/copy-anything@3.0.5/node_modules/copy-anything/dist/index.js
function assignProp(carry, key, newVal, originalObject, includeNonenumerable) {
  const propType = {}.propertyIsEnumerable.call(originalObject, key) ? "enumerable" : "nonenumerable";
  if (propType === "enumerable")
    carry[key] = newVal;
  if (includeNonenumerable && propType === "nonenumerable") {
    Object.defineProperty(carry, key, {
      value: newVal,
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
}
function copy(target22, options = {}) {
  if (isArray2(target22)) {
    return target22.map((item) => copy(item, options));
  }
  if (!isPlainObject3(target22)) {
    return target22;
  }
  const props = Object.getOwnPropertyNames(target22);
  const symbols = Object.getOwnPropertySymbols(target22);
  return [...props, ...symbols].reduce((carry, key) => {
    if (isArray2(options.props) && !options.props.includes(key)) {
      return carry;
    }
    const val = target22[key];
    const newVal = copy(val, options);
    assignProp(carry, key, newVal, target22, options.nonenumerable);
    return carry;
  }, {});
}

// ../../node_modules/.pnpm/superjson@2.2.1/node_modules/superjson/dist/index.js
var SuperJSON = class {
  /**
   * @param dedupeReferentialEqualities  If true, SuperJSON will make sure only one instance of referentially equal objects are serialized and the rest are replaced with `null`.
   */
  constructor({ dedupe = false } = {}) {
    this.classRegistry = new ClassRegistry();
    this.symbolRegistry = new Registry((s) => {
      var _a25;
      return (_a25 = s.description) != null ? _a25 : "";
    });
    this.customTransformerRegistry = new CustomTransformerRegistry();
    this.allowedErrorProps = [];
    this.dedupe = dedupe;
  }
  serialize(object) {
    const identities = /* @__PURE__ */ new Map();
    const output = walker(object, identities, this, this.dedupe);
    const res = {
      json: output.transformedValue
    };
    if (output.annotations) {
      res.meta = {
        ...res.meta,
        values: output.annotations
      };
    }
    const equalityAnnotations = generateReferentialEqualityAnnotations(identities, this.dedupe);
    if (equalityAnnotations) {
      res.meta = {
        ...res.meta,
        referentialEqualities: equalityAnnotations
      };
    }
    return res;
  }
  deserialize(payload) {
    const { json, meta } = payload;
    let result = copy(json);
    if (meta == null ? void 0 : meta.values) {
      result = applyValueAnnotations(result, meta.values, this);
    }
    if (meta == null ? void 0 : meta.referentialEqualities) {
      result = applyReferentialEqualityAnnotations(result, meta.referentialEqualities);
    }
    return result;
  }
  stringify(object) {
    return JSON.stringify(this.serialize(object));
  }
  parse(string) {
    return this.deserialize(JSON.parse(string));
  }
  registerClass(v, options) {
    this.classRegistry.register(v, options);
  }
  registerSymbol(v, identifier) {
    this.symbolRegistry.register(v, identifier);
  }
  registerCustom(transformer, name) {
    this.customTransformerRegistry.register({
      name,
      ...transformer
    });
  }
  allowErrorProps(...props) {
    this.allowedErrorProps.push(...props);
  }
};
SuperJSON.defaultInstance = new SuperJSON();
SuperJSON.serialize = SuperJSON.defaultInstance.serialize.bind(SuperJSON.defaultInstance);
SuperJSON.deserialize = SuperJSON.defaultInstance.deserialize.bind(SuperJSON.defaultInstance);
SuperJSON.stringify = SuperJSON.defaultInstance.stringify.bind(SuperJSON.defaultInstance);
SuperJSON.parse = SuperJSON.defaultInstance.parse.bind(SuperJSON.defaultInstance);
SuperJSON.registerClass = SuperJSON.defaultInstance.registerClass.bind(SuperJSON.defaultInstance);
SuperJSON.registerSymbol = SuperJSON.defaultInstance.registerSymbol.bind(SuperJSON.defaultInstance);
SuperJSON.registerCustom = SuperJSON.defaultInstance.registerCustom.bind(SuperJSON.defaultInstance);
SuperJSON.allowErrorProps = SuperJSON.defaultInstance.allowErrorProps.bind(SuperJSON.defaultInstance);

// src/messaging/presets/broadcast-channel/context.ts
init_esm_shims();

// src/messaging/presets/electron/index.ts
init_esm_shims();

// src/messaging/presets/electron/client.ts
init_esm_shims();

// src/messaging/presets/electron/context.ts
init_esm_shims();

// src/messaging/presets/electron/proxy.ts
init_esm_shims();

// src/messaging/presets/electron/server.ts
init_esm_shims();

// src/messaging/presets/extension/index.ts
init_esm_shims();

// src/messaging/presets/extension/client.ts
init_esm_shims();

// src/messaging/presets/extension/context.ts
init_esm_shims();

// src/messaging/presets/extension/proxy.ts
init_esm_shims();

// src/messaging/presets/extension/server.ts
init_esm_shims();

// src/messaging/presets/iframe/index.ts
init_esm_shims();

// src/messaging/presets/iframe/client.ts
init_esm_shims();

// src/messaging/presets/iframe/context.ts
init_esm_shims();

// src/messaging/presets/iframe/server.ts
init_esm_shims();

// src/messaging/presets/vite/index.ts
init_esm_shims();

// src/messaging/presets/vite/client.ts
init_esm_shims();

// src/messaging/presets/vite/context.ts
init_esm_shims();

// src/messaging/presets/vite/server.ts
init_esm_shims();

// src/messaging/presets/ws/index.ts
init_esm_shims();

// src/messaging/presets/ws/client.ts
init_esm_shims();

// src/messaging/presets/ws/context.ts
init_esm_shims();

// src/messaging/presets/ws/server.ts
init_esm_shims();

// src/messaging/index.ts
var _a19, _b19;
(_b19 = (_a19 = target).__VUE_DEVTOOLS_KIT_MESSAGE_CHANNELS__) != null ? _b19 : _a19.__VUE_DEVTOOLS_KIT_MESSAGE_CHANNELS__ = [];
var _a20, _b20;
(_b20 = (_a20 = target).__VUE_DEVTOOLS_KIT_RPC_CLIENT__) != null ? _b20 : _a20.__VUE_DEVTOOLS_KIT_RPC_CLIENT__ = null;
var _a21, _b21;
(_b21 = (_a21 = target).__VUE_DEVTOOLS_KIT_RPC_SERVER__) != null ? _b21 : _a21.__VUE_DEVTOOLS_KIT_RPC_SERVER__ = null;
var _a22, _b22;
(_b22 = (_a22 = target).__VUE_DEVTOOLS_KIT_VITE_RPC_CLIENT__) != null ? _b22 : _a22.__VUE_DEVTOOLS_KIT_VITE_RPC_CLIENT__ = null;
var _a23, _b23;
(_b23 = (_a23 = target).__VUE_DEVTOOLS_KIT_VITE_RPC_SERVER__) != null ? _b23 : _a23.__VUE_DEVTOOLS_KIT_VITE_RPC_SERVER__ = null;
var _a24, _b24;
(_b24 = (_a24 = target).__VUE_DEVTOOLS_KIT_BROADCAST_RPC_SERVER__) != null ? _b24 : _a24.__VUE_DEVTOOLS_KIT_BROADCAST_RPC_SERVER__ = null;

// src/shared/index.ts
init_esm_shims();

// src/shared/env.ts
init_esm_shims();

// src/shared/time.ts
init_esm_shims();

// src/shared/util.ts
init_esm_shims();

// src/core/component/state/replacer.ts
init_esm_shims();

// src/core/component/state/custom.ts
init_esm_shims();

// src/shared/transfer.ts
init_esm_shims();

/**
  * vee-validate v4.14.3
  * (c) 2024 Abdelrahman Awad
  * @license MIT
  */
function isCallable(fn) {
  return typeof fn === "function";
}
function isNullOrUndefined(value) {
  return value === null || value === void 0;
}
const isObject = (obj) => obj !== null && !!obj && typeof obj === "object" && !Array.isArray(obj);
function isIndex(value) {
  return Number(value) >= 0;
}
function toNumber$1(value) {
  const n = parseFloat(value);
  return isNaN(n) ? value : n;
}
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
function getTag(value) {
  if (value == null) {
    return value === void 0 ? "[object Undefined]" : "[object Null]";
  }
  return Object.prototype.toString.call(value);
}
function isPlainObject(value) {
  if (!isObjectLike(value) || getTag(value) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(value) === null) {
    return true;
  }
  let proto = value;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(value) === proto;
}
function merge(target, source) {
  Object.keys(source).forEach((key) => {
    if (isPlainObject(source[key]) && isPlainObject(target[key])) {
      if (!target[key]) {
        target[key] = {};
      }
      merge(target[key], source[key]);
      return;
    }
    target[key] = source[key];
  });
  return target;
}
function normalizeFormPath(path) {
  const pathArr = path.split(".");
  if (!pathArr.length) {
    return "";
  }
  let fullPath = String(pathArr[0]);
  for (let i = 1; i < pathArr.length; i++) {
    if (isIndex(pathArr[i])) {
      fullPath += `[${pathArr[i]}]`;
      continue;
    }
    fullPath += `.${pathArr[i]}`;
  }
  return fullPath;
}
const RULES = {};
function resolveRule(id) {
  return RULES[id];
}
function set(obj, key, val) {
  if (typeof val.value === "object") val.value = klona(val.value);
  if (!val.enumerable || val.get || val.set || !val.configurable || !val.writable || key === "__proto__") {
    Object.defineProperty(obj, key, val);
  } else obj[key] = val.value;
}
function klona(x) {
  if (typeof x !== "object") return x;
  var i = 0, k, list, tmp, str = Object.prototype.toString.call(x);
  if (str === "[object Object]") {
    tmp = Object.create(x.__proto__ || null);
  } else if (str === "[object Array]") {
    tmp = Array(x.length);
  } else if (str === "[object Set]") {
    tmp = /* @__PURE__ */ new Set();
    x.forEach(function(val) {
      tmp.add(klona(val));
    });
  } else if (str === "[object Map]") {
    tmp = /* @__PURE__ */ new Map();
    x.forEach(function(val, key) {
      tmp.set(klona(key), klona(val));
    });
  } else if (str === "[object Date]") {
    tmp = /* @__PURE__ */ new Date(+x);
  } else if (str === "[object RegExp]") {
    tmp = new RegExp(x.source, x.flags);
  } else if (str === "[object DataView]") {
    tmp = new x.constructor(klona(x.buffer));
  } else if (str === "[object ArrayBuffer]") {
    tmp = x.slice(0);
  } else if (str.slice(-6) === "Array]") {
    tmp = new x.constructor(x);
  }
  if (tmp) {
    for (list = Object.getOwnPropertySymbols(x); i < list.length; i++) {
      set(tmp, list[i], Object.getOwnPropertyDescriptor(x, list[i]));
    }
    for (i = 0, list = Object.getOwnPropertyNames(x); i < list.length; i++) {
      if (Object.hasOwnProperty.call(tmp, k = list[i]) && tmp[k] === x[k]) continue;
      set(tmp, k, Object.getOwnPropertyDescriptor(x, k));
    }
  }
  return tmp || x;
}
const FormContextKey = Symbol("vee-validate-form");
const PublicFormContextKey = Symbol("vee-validate-form-context");
const FieldContextKey = Symbol("vee-validate-field-instance");
const IS_ABSENT = Symbol("Default empty value");
const isClient = typeof window !== "undefined";
function isLocator(value) {
  return isCallable(value) && !!value.__locatorRef;
}
function isTypedSchema(value) {
  return !!value && isCallable(value.parse) && value.__type === "VVTypedSchema";
}
function isYupValidator(value) {
  return !!value && isCallable(value.validate);
}
function hasCheckedAttr(type) {
  return type === "checkbox" || type === "radio";
}
function isContainerValue(value) {
  return isObject(value) || Array.isArray(value);
}
function isEmptyContainer(value) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return isObject(value) && Object.keys(value).length === 0;
}
function isNotNestedPath(path) {
  return /^\[.+\]$/i.test(path);
}
function isNativeMultiSelect(el) {
  return isNativeSelect(el) && el.multiple;
}
function isNativeSelect(el) {
  return el.tagName === "SELECT";
}
function isNativeMultiSelectNode(tag, attrs) {
  const hasTruthyBindingValue = ![false, null, void 0, 0].includes(attrs.multiple) && !Number.isNaN(attrs.multiple);
  return tag === "select" && "multiple" in attrs && hasTruthyBindingValue;
}
function shouldHaveValueBinding(tag, attrs) {
  return !isNativeMultiSelectNode(tag, attrs) && attrs.type !== "file" && !hasCheckedAttr(attrs.type);
}
function isFormSubmitEvent(evt) {
  return isEvent(evt) && evt.target && "submit" in evt.target;
}
function isEvent(evt) {
  if (!evt) {
    return false;
  }
  if (typeof Event !== "undefined" && isCallable(Event) && evt instanceof Event) {
    return true;
  }
  if (evt && evt.srcElement) {
    return true;
  }
  return false;
}
function isPropPresent(obj, prop) {
  return prop in obj && obj[prop] !== IS_ABSENT;
}
function isEqual(a, b) {
  if (a === b)
    return true;
  if (a && b && typeof a === "object" && typeof b === "object") {
    if (a.constructor !== b.constructor)
      return false;
    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length)
        return false;
      for (i = length; i-- !== 0; )
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
      if (length != b.length)
        return false;
      for (i = length; i-- !== 0; )
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
    for (i = length; i-- !== 0; ) {
      var key = keys[i];
      if (!isEqual(a[key], b[key]))
        return false;
    }
    return true;
  }
  return a !== a && b !== b;
}
function isFile(a) {
  if (!isClient) {
    return false;
  }
  return a instanceof File;
}
function cleanupNonNestedPath(path) {
  if (isNotNestedPath(path)) {
    return path.replace(/\[|\]/gi, "");
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
  const resolvedValue = (path || "").split(/\.|\[(\d+)\]/).filter(Boolean).reduce((acc, propKey) => {
    if (isContainerValue(acc) && propKey in acc) {
      return acc[propKey];
    }
    return fallback;
  }, object);
  return resolvedValue;
}
function setInPath(object, path, value) {
  if (isNotNestedPath(path)) {
    object[cleanupNonNestedPath(path)] = value;
    return;
  }
  const keys = path.split(/\.|\[(\d+)\]/).filter(Boolean);
  let acc = object;
  for (let i = 0; i < keys.length; i++) {
    if (i === keys.length - 1) {
      acc[keys[i]] = value;
      return;
    }
    if (!(keys[i] in acc) || isNullOrUndefined(acc[keys[i]])) {
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
function unsetPath(object, path) {
  if (isNotNestedPath(path)) {
    delete object[cleanupNonNestedPath(path)];
    return;
  }
  const keys = path.split(/\.|\[(\d+)\]/).filter(Boolean);
  let acc = object;
  for (let i = 0; i < keys.length; i++) {
    if (i === keys.length - 1) {
      unset(acc, keys[i]);
      break;
    }
    if (!(keys[i] in acc) || isNullOrUndefined(acc[keys[i]])) {
      break;
    }
    acc = acc[keys[i]];
  }
  const pathValues = keys.map((_, idx) => {
    return getFromPath(object, keys.slice(0, idx).join("."));
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
function keysOf(record) {
  return Object.keys(record);
}
function injectWithSelf(symbol, def = void 0) {
  const vm = getCurrentInstance();
  return (vm === null || vm === void 0 ? void 0 : vm.provides[symbol]) || inject(symbol, def);
}
function resolveNextCheckboxValue(currentValue, checkedValue, uncheckedValue) {
  if (Array.isArray(currentValue)) {
    const newVal = [...currentValue];
    const idx = newVal.findIndex((v) => isEqual(v, checkedValue));
    idx >= 0 ? newVal.splice(idx, 1) : newVal.push(checkedValue);
    return newVal;
  }
  return isEqual(currentValue, checkedValue) ? uncheckedValue : checkedValue;
}
function debounceAsync(inner, ms = 0) {
  let timer = null;
  let resolves = [];
  return function(...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      const result = inner(...args);
      resolves.forEach((r) => r(result));
      resolves = [];
    }, ms);
    return new Promise((resolve) => resolves.push(resolve));
  };
}
function applyModelModifiers(value, modifiers) {
  if (!isObject(modifiers)) {
    return value;
  }
  if (modifiers.number) {
    return toNumber$1(value);
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
    latestRun = void 0;
    return onDone(result, args);
  };
}
function normalizeErrorItem(message) {
  return Array.isArray(message) ? message : message ? [message] : [];
}
function omit(obj, keys) {
  const target = {};
  for (const key in obj) {
    if (!keys.includes(key)) {
      target[key] = obj[key];
    }
  }
  return target;
}
function debounceNextTick(inner) {
  let lastTick = null;
  let resolves = [];
  return function(...args) {
    const thisTick = nextTick(() => {
      if (lastTick !== thisTick) {
        return;
      }
      const result = inner(...args);
      resolves.forEach((r) => r(result));
      resolves = [];
      lastTick = null;
    });
    lastTick = thisTick;
    return new Promise((resolve) => resolves.push(resolve));
  };
}
function normalizeChildren(tag, context, slotProps) {
  if (!context.slots.default) {
    return context.slots.default;
  }
  if (typeof tag === "string" || !tag) {
    return context.slots.default(slotProps());
  }
  return {
    default: () => {
      var _a, _b;
      return (_b = (_a = context.slots).default) === null || _b === void 0 ? void 0 : _b.call(_a, slotProps());
    }
  };
}
function getBoundValue(el) {
  if (hasValueBinding(el)) {
    return el._value;
  }
  return void 0;
}
function hasValueBinding(el) {
  return "_value" in el;
}
function parseInputValue(el) {
  if (el.type === "number") {
    return Number.isNaN(el.valueAsNumber) ? el.value : el.valueAsNumber;
  }
  if (el.type === "range") {
    return Number.isNaN(el.valueAsNumber) ? el.value : el.valueAsNumber;
  }
  return el.value;
}
function normalizeEventValue(value) {
  if (!isEvent(value)) {
    return value;
  }
  const input = value.target;
  if (hasCheckedAttr(input.type) && hasValueBinding(input)) {
    return getBoundValue(input);
  }
  if (input.type === "file" && input.files) {
    const files = Array.from(input.files);
    return input.multiple ? files : files[0];
  }
  if (isNativeMultiSelect(input)) {
    return Array.from(input.options).filter((opt) => opt.selected && !opt.disabled).map(getBoundValue);
  }
  if (isNativeSelect(input)) {
    const selectedOption = Array.from(input.options).find((opt) => opt.selected);
    return selectedOption ? getBoundValue(selectedOption) : input.value;
  }
  return parseInputValue(input);
}
function normalizeRules(rules) {
  const acc = {};
  Object.defineProperty(acc, "_$$isNormalized", {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });
  if (!rules) {
    return acc;
  }
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
  if (typeof rules !== "string") {
    return acc;
  }
  return rules.split("|").reduce((prev, rule) => {
    const parsedRule = parseRule(rule);
    if (!parsedRule.name) {
      return prev;
    }
    prev[parsedRule.name] = buildParams(parsedRule.params);
    return prev;
  }, acc);
}
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
    if (typeof value === "string" && value[0] === "@") {
      return createLocator(value.slice(1));
    }
    return value;
  };
  if (Array.isArray(provided)) {
    return provided.map(mapValueToLocator);
  }
  if (provided instanceof RegExp) {
    return [provided];
  }
  return Object.keys(provided).reduce((prev, key) => {
    prev[key] = mapValueToLocator(provided[key]);
    return prev;
  }, {});
}
const parseRule = (rule) => {
  let params = [];
  const name = rule.split(":")[0];
  if (rule.includes(":")) {
    params = rule.split(":").slice(1).join(":").split(",");
  }
  return { name, params };
};
function createLocator(value) {
  const locator = (crossTable) => {
    var _a;
    const val = (_a = getFromPath(crossTable, value)) !== null && _a !== void 0 ? _a : crossTable[value];
    return val;
  };
  locator.__locatorRef = value;
  return locator;
}
function extractLocators(params) {
  if (Array.isArray(params)) {
    return params.filter(isLocator);
  }
  return keysOf(params).filter((key) => isLocator(params[key])).map((key) => params[key]);
}
const DEFAULT_CONFIG = {
  generateMessage: ({ field }) => `${field} is not valid.`,
  bails: true,
  validateOnBlur: true,
  validateOnChange: true,
  validateOnInput: false,
  validateOnModelUpdate: true
};
let currentConfig = Object.assign({}, DEFAULT_CONFIG);
const getConfig = () => currentConfig;
const setConfig = (newConf) => {
  currentConfig = Object.assign(Object.assign({}, currentConfig), newConf);
};
const configure = setConfig;
async function validate(value, rules, options = {}) {
  const shouldBail = options === null || options === void 0 ? void 0 : options.bails;
  const field = {
    name: (options === null || options === void 0 ? void 0 : options.name) || "{field}",
    rules,
    label: options === null || options === void 0 ? void 0 : options.label,
    bails: shouldBail !== null && shouldBail !== void 0 ? shouldBail : true,
    formData: (options === null || options === void 0 ? void 0 : options.values) || {}
  };
  const result = await _validate(field, value);
  return Object.assign(Object.assign({}, result), { valid: !result.errors.length });
}
async function _validate(field, value) {
  const rules = field.rules;
  if (isTypedSchema(rules) || isYupValidator(rules)) {
    return validateFieldWithTypedSchema(value, Object.assign(Object.assign({}, field), { rules }));
  }
  if (isCallable(rules) || Array.isArray(rules)) {
    const ctx = {
      field: field.label || field.name,
      name: field.name,
      label: field.label,
      form: field.formData,
      value
    };
    const pipeline = Array.isArray(rules) ? rules : [rules];
    const length2 = pipeline.length;
    const errors2 = [];
    for (let i = 0; i < length2; i++) {
      const rule = pipeline[i];
      const result = await rule(value, ctx);
      const isValid = typeof result !== "string" && !Array.isArray(result) && result;
      if (isValid) {
        continue;
      }
      if (Array.isArray(result)) {
        errors2.push(...result);
      } else {
        const message = typeof result === "string" ? result : _generateFieldError(ctx);
        errors2.push(message);
      }
      if (field.bails) {
        return {
          errors: errors2
        };
      }
    }
    return {
      errors: errors2
    };
  }
  const normalizedContext = Object.assign(Object.assign({}, field), { rules: normalizeRules(rules) });
  const errors = [];
  const rulesKeys = Object.keys(normalizedContext.rules);
  const length = rulesKeys.length;
  for (let i = 0; i < length; i++) {
    const rule = rulesKeys[i];
    const result = await _test(normalizedContext, value, {
      name: rule,
      params: normalizedContext.rules[rule]
    });
    if (result.error) {
      errors.push(result.error);
      if (field.bails) {
        return {
          errors
        };
      }
    }
  }
  return {
    errors
  };
}
function isYupError(err) {
  return !!err && err.name === "ValidationError";
}
function yupToTypedSchema(yupSchema) {
  const schema = {
    __type: "VVTypedSchema",
    async parse(values, context) {
      var _a;
      try {
        const output = await yupSchema.validate(values, { abortEarly: false, context: (context === null || context === void 0 ? void 0 : context.formData) || {} });
        return {
          output,
          errors: []
        };
      } catch (err) {
        if (!isYupError(err)) {
          throw err;
        }
        if (!((_a = err.inner) === null || _a === void 0 ? void 0 : _a.length) && err.errors.length) {
          return { errors: [{ path: err.path, errors: err.errors }] };
        }
        const errors = err.inner.reduce((acc, curr) => {
          const path = curr.path || "";
          if (!acc[path]) {
            acc[path] = { errors: [], path };
          }
          acc[path].errors.push(...curr.errors);
          return acc;
        }, {});
        return { errors: Object.values(errors) };
      }
    }
  };
  return schema;
}
async function validateFieldWithTypedSchema(value, context) {
  const typedSchema = isTypedSchema(context.rules) ? context.rules : yupToTypedSchema(context.rules);
  const result = await typedSchema.parse(value, { formData: context.formData });
  const messages = [];
  for (const error of result.errors) {
    if (error.errors.length) {
      messages.push(...error.errors);
    }
  }
  return {
    value: result.value,
    errors: messages
  };
}
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
    rule: Object.assign(Object.assign({}, rule), { params })
  };
  const result = await validator(value, params, ctx);
  if (typeof result === "string") {
    return {
      error: result
    };
  }
  return {
    error: result ? void 0 : _generateFieldError(ctx)
  };
}
function _generateFieldError(fieldCtx) {
  const message = getConfig().generateMessage;
  if (!message) {
    return "Field is invalid";
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
  const validationResult = await typedSchema.parse(klona(values), { formData: klona(values) });
  const results = {};
  const errors = {};
  for (const error of validationResult.errors) {
    const messages = error.errors;
    const path = (error.path || "").replace(/\["(\d+)"\]/g, (_, m) => {
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
    source: "schema"
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
      values,
      bails: (_c = (_b = opts === null || opts === void 0 ? void 0 : opts.bailsMap) === null || _b === void 0 ? void 0 : _b[path]) !== null && _c !== void 0 ? _c : true
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
      errors: result.errors
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
    source: "schema"
  };
}
let ID_COUNTER = 0;
function useFieldState(path, init) {
  const { value, initialValue, setInitialValue } = _useFieldValue(path, init.modelValue, init.form);
  if (!init.form) {
    let setState2 = function(state2) {
      var _a;
      if ("value" in state2) {
        value.value = state2.value;
      }
      if ("errors" in state2) {
        setErrors(state2.errors);
      }
      if ("touched" in state2) {
        meta.touched = (_a = state2.touched) !== null && _a !== void 0 ? _a : meta.touched;
      }
      if ("initialValue" in state2) {
        setInitialValue(state2.initialValue);
      }
    };
    const { errors: errors2, setErrors } = createFieldErrors();
    const id = ID_COUNTER >= Number.MAX_SAFE_INTEGER ? 0 : ++ID_COUNTER;
    const meta = createFieldMeta(value, initialValue, errors2, init.schema);
    return {
      id,
      path,
      value,
      initialValue,
      meta,
      flags: { pendingUnmount: { [id]: false }, pendingReset: false },
      errors: errors2,
      setState: setState2
    };
  }
  const state = init.form.createPathState(path, {
    bails: init.bails,
    label: init.label,
    type: init.type,
    validate: init.validate,
    schema: init.schema
  });
  const errors = computed(() => state.errors);
  function setState(state2) {
    var _a, _b, _c;
    if ("value" in state2) {
      value.value = state2.value;
    }
    if ("errors" in state2) {
      (_a = init.form) === null || _a === void 0 ? void 0 : _a.setFieldError(unref(path), state2.errors);
    }
    if ("touched" in state2) {
      (_b = init.form) === null || _b === void 0 ? void 0 : _b.setFieldTouched(unref(path), (_c = state2.touched) !== null && _c !== void 0 ? _c : false);
    }
    if ("initialValue" in state2) {
      setInitialValue(state2.initialValue);
    }
  }
  return {
    id: Array.isArray(state.id) ? state.id[state.id.length - 1] : state.id,
    path,
    value,
    errors,
    meta: state,
    initialValue,
    flags: state.__flags,
    setState
  };
}
function _useFieldValue(path, modelValue, form) {
  const modelRef = ref(unref(modelValue));
  function resolveInitialValue2() {
    if (!form) {
      return unref(modelRef);
    }
    return getFromPath(form.initialValues.value, unref(path), unref(modelRef));
  }
  function setInitialValue(value2) {
    if (!form) {
      modelRef.value = value2;
      return;
    }
    form.setFieldInitialValue(unref(path), value2, true);
  }
  const initialValue = computed(resolveInitialValue2);
  if (!form) {
    const value2 = ref(resolveInitialValue2());
    return {
      value: value2,
      initialValue,
      setInitialValue
    };
  }
  const currentValue = resolveModelValue(modelValue, form, initialValue, path);
  form.stageInitialValue(unref(path), currentValue, true);
  const value = computed({
    get() {
      return getFromPath(form.values, unref(path));
    },
    set(newVal) {
      form.setFieldValue(unref(path), newVal, false);
    }
  });
  return {
    value,
    initialValue,
    setInitialValue
  };
}
function resolveModelValue(modelValue, form, initialValue, path) {
  if (isRef$1(modelValue)) {
    return unref(modelValue);
  }
  if (modelValue !== void 0) {
    return modelValue;
  }
  return getFromPath(form.values, unref(path), unref(initialValue));
}
function createFieldMeta(currentValue, initialValue, errors, schema) {
  const isRequired = computed(() => {
    var _a, _b, _c;
    return (_c = (_b = (_a = toValue(schema)) === null || _a === void 0 ? void 0 : _a.describe) === null || _b === void 0 ? void 0 : _b.call(_a).required) !== null && _c !== void 0 ? _c : false;
  });
  const meta = reactive({
    touched: false,
    pending: false,
    valid: true,
    required: isRequired,
    validated: !!unref(errors).length,
    initialValue: computed(() => unref(initialValue)),
    dirty: computed(() => {
      return !isEqual(unref(currentValue), unref(initialValue));
    })
  });
  watch(errors, (value) => {
    meta.valid = !value.length;
  }, {
    immediate: true,
    flush: "sync"
  });
  return meta;
}
function createFieldErrors() {
  const errors = ref([]);
  return {
    errors,
    setErrors: (messages) => {
      errors.value = normalizeErrorItem(messages);
    }
  };
}
function useField(path, rules, opts) {
  if (hasCheckedAttr(opts === null || opts === void 0 ? void 0 : opts.type)) {
    return useFieldWithChecked(path, rules, opts);
  }
  return _useField(path, rules, opts);
}
function _useField(path, rules, opts) {
  const { initialValue: modelValue, validateOnMount, bails, type, checkedValue, label, validateOnValueUpdate, uncheckedValue, controlled, keepValueOnUnmount, syncVModel, form: controlForm } = normalizeOptions(opts);
  const injectedForm = controlled ? injectWithSelf(FormContextKey) : void 0;
  const form = controlForm || injectedForm;
  const name = computed(() => normalizeFormPath(toValue(path)));
  const validator = computed(() => {
    const schema = toValue(form === null || form === void 0 ? void 0 : form.schema);
    if (schema) {
      return void 0;
    }
    const rulesValue = unref(rules);
    if (isYupValidator(rulesValue) || isTypedSchema(rulesValue) || isCallable(rulesValue) || Array.isArray(rulesValue)) {
      return rulesValue;
    }
    return normalizeRules(rulesValue);
  });
  const isTyped = !isCallable(validator.value) && isTypedSchema(toValue(rules));
  const { id, value, initialValue, meta, setState, errors, flags } = useFieldState(name, {
    modelValue,
    form,
    bails,
    label,
    type,
    validate: validator.value ? validate$1 : void 0,
    schema: isTyped ? rules : void 0
  });
  const errorMessage = computed(() => errors.value[0]);
  if (syncVModel) {
    useVModel({
      value,
      prop: syncVModel,
      handleChange,
      shouldValidate: () => validateOnValueUpdate && !flags.pendingReset
    });
  }
  const handleBlur = (evt, shouldValidate = false) => {
    meta.touched = true;
    if (shouldValidate) {
      validateWithStateMutation();
    }
  };
  async function validateCurrentValue(mode) {
    var _a, _b;
    if (form === null || form === void 0 ? void 0 : form.validateSchema) {
      const { results } = await form.validateSchema(mode);
      return (_a = results[toValue(name)]) !== null && _a !== void 0 ? _a : { valid: true, errors: [] };
    }
    if (validator.value) {
      return validate(value.value, validator.value, {
        name: toValue(name),
        label: toValue(label),
        values: (_b = form === null || form === void 0 ? void 0 : form.values) !== null && _b !== void 0 ? _b : {},
        bails
      });
    }
    return { valid: true, errors: [] };
  }
  const validateWithStateMutation = withLatest(async () => {
    meta.pending = true;
    meta.validated = true;
    return validateCurrentValue("validated-only");
  }, (result) => {
    if (flags.pendingUnmount[field.id]) {
      return result;
    }
    setState({ errors: result.errors });
    meta.pending = false;
    meta.valid = result.valid;
    return result;
  });
  const validateValidStateOnly = withLatest(async () => {
    return validateCurrentValue("silent");
  }, (result) => {
    meta.valid = result.valid;
    return result;
  });
  function validate$1(opts2) {
    if ((opts2 === null || opts2 === void 0 ? void 0 : opts2.mode) === "silent") {
      return validateValidStateOnly();
    }
    return validateWithStateMutation();
  }
  function handleChange(e, shouldValidate = true) {
    const newValue = normalizeEventValue(e);
    setValue(newValue, shouldValidate);
  }
  onMounted(() => {
    if (validateOnMount) {
      return validateWithStateMutation();
    }
    if (!form || !form.validateSchema) {
      validateValidStateOnly();
    }
  });
  function setTouched(isTouched) {
    meta.touched = isTouched;
  }
  function resetField(state) {
    var _a;
    const newValue = state && "value" in state ? state.value : initialValue.value;
    setState({
      value: klona(newValue),
      initialValue: klona(newValue),
      touched: (_a = state === null || state === void 0 ? void 0 : state.touched) !== null && _a !== void 0 ? _a : false,
      errors: (state === null || state === void 0 ? void 0 : state.errors) || []
    });
    meta.pending = false;
    meta.validated = false;
    validateValidStateOnly();
  }
  const vm = getCurrentInstance();
  function setValue(newValue, shouldValidate = true) {
    value.value = vm && syncVModel ? applyModelModifiers(newValue, vm.props.modelModifiers) : newValue;
    const validateFn = shouldValidate ? validateWithStateMutation : validateValidStateOnly;
    validateFn();
  }
  function setErrors(errors2) {
    setState({ errors: Array.isArray(errors2) ? errors2 : [errors2] });
  }
  const valueProxy = computed({
    get() {
      return value.value;
    },
    set(newValue) {
      setValue(newValue, validateOnValueUpdate);
    }
  });
  const field = {
    id,
    name,
    label,
    value: valueProxy,
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
    setValue
  };
  provide(FieldContextKey, field);
  if (isRef$1(rules) && typeof unref(rules) !== "function") {
    watch(rules, (value2, oldValue) => {
      if (isEqual(value2, oldValue)) {
        return;
      }
      meta.validated ? validateWithStateMutation() : validateValidStateOnly();
    }, {
      deep: true
    });
  }
  if (!form) {
    return field;
  }
  const dependencies = computed(() => {
    const rulesVal = validator.value;
    if (!rulesVal || isCallable(rulesVal) || isYupValidator(rulesVal) || isTypedSchema(rulesVal) || Array.isArray(rulesVal)) {
      return {};
    }
    return Object.keys(rulesVal).reduce((acc, rule) => {
      const deps = extractLocators(rulesVal[rule]).map((dep) => dep.__locatorRef).reduce((depAcc, depName) => {
        const depValue = getFromPath(form.values, depName) || form.values[depName];
        if (depValue !== void 0) {
          depAcc[depName] = depValue;
        }
        return depAcc;
      }, {});
      Object.assign(acc, deps);
      return acc;
    }, {});
  });
  watch(dependencies, (deps, oldDeps) => {
    if (!Object.keys(deps).length) {
      return;
    }
    const shouldValidate = !isEqual(deps, oldDeps);
    if (shouldValidate) {
      meta.validated ? validateWithStateMutation() : validateValidStateOnly();
    }
  });
  onBeforeUnmount(() => {
    var _a;
    const shouldKeepValue = (_a = toValue(field.keepValueOnUnmount)) !== null && _a !== void 0 ? _a : toValue(form.keepValuesOnUnmount);
    const path2 = toValue(name);
    if (shouldKeepValue || !form || flags.pendingUnmount[field.id]) {
      form === null || form === void 0 ? void 0 : form.removePathState(path2, id);
      return;
    }
    flags.pendingUnmount[field.id] = true;
    const pathState = form.getPathState(path2);
    const matchesId = Array.isArray(pathState === null || pathState === void 0 ? void 0 : pathState.id) && (pathState === null || pathState === void 0 ? void 0 : pathState.multiple) ? pathState === null || pathState === void 0 ? void 0 : pathState.id.includes(field.id) : (pathState === null || pathState === void 0 ? void 0 : pathState.id) === field.id;
    if (!matchesId) {
      return;
    }
    if ((pathState === null || pathState === void 0 ? void 0 : pathState.multiple) && Array.isArray(pathState.value)) {
      const valueIdx = pathState.value.findIndex((i) => isEqual(i, toValue(field.checkedValue)));
      if (valueIdx > -1) {
        const newVal = [...pathState.value];
        newVal.splice(valueIdx, 1);
        form.setFieldValue(path2, newVal);
      }
      if (Array.isArray(pathState.id)) {
        pathState.id.splice(pathState.id.indexOf(field.id), 1);
      }
    } else {
      form.unsetPathValue(toValue(name));
    }
    form.removePathState(path2, id);
  });
  return field;
}
function normalizeOptions(opts) {
  const defaults = () => ({
    initialValue: void 0,
    validateOnMount: false,
    bails: true,
    label: void 0,
    validateOnValueUpdate: true,
    keepValueOnUnmount: void 0,
    syncVModel: false,
    controlled: true
  });
  const isVModelSynced = !!(opts === null || opts === void 0 ? void 0 : opts.syncVModel);
  const modelPropName = typeof (opts === null || opts === void 0 ? void 0 : opts.syncVModel) === "string" ? opts.syncVModel : (opts === null || opts === void 0 ? void 0 : opts.modelPropName) || "modelValue";
  const initialValue = isVModelSynced && !("initialValue" in (opts || {})) ? getCurrentModelValue(getCurrentInstance(), modelPropName) : opts === null || opts === void 0 ? void 0 : opts.initialValue;
  if (!opts) {
    return Object.assign(Object.assign({}, defaults()), { initialValue });
  }
  const checkedValue = "valueProp" in opts ? opts.valueProp : opts.checkedValue;
  const controlled = "standalone" in opts ? !opts.standalone : opts.controlled;
  const syncVModel = (opts === null || opts === void 0 ? void 0 : opts.modelPropName) || (opts === null || opts === void 0 ? void 0 : opts.syncVModel) || false;
  return Object.assign(Object.assign(Object.assign({}, defaults()), opts || {}), {
    initialValue,
    controlled: controlled !== null && controlled !== void 0 ? controlled : true,
    checkedValue,
    syncVModel
  });
}
function useFieldWithChecked(name, rules, opts) {
  const form = !(opts === null || opts === void 0 ? void 0 : opts.standalone) ? injectWithSelf(FormContextKey) : void 0;
  const checkedValue = opts === null || opts === void 0 ? void 0 : opts.checkedValue;
  const uncheckedValue = opts === null || opts === void 0 ? void 0 : opts.uncheckedValue;
  function patchCheckedApi(field) {
    const handleChange = field.handleChange;
    const checked = computed(() => {
      const currentValue = toValue(field.value);
      const checkedVal = toValue(checkedValue);
      return Array.isArray(currentValue) ? currentValue.findIndex((v) => isEqual(v, checkedVal)) >= 0 : isEqual(checkedVal, currentValue);
    });
    function handleCheckboxChange(e, shouldValidate = true) {
      var _a, _b;
      if (checked.value === ((_a = e === null || e === void 0 ? void 0 : e.target) === null || _a === void 0 ? void 0 : _a.checked)) {
        if (shouldValidate) {
          field.validate();
        }
        return;
      }
      const path = toValue(name);
      const pathState = form === null || form === void 0 ? void 0 : form.getPathState(path);
      const value = normalizeEventValue(e);
      let newValue = (_b = toValue(checkedValue)) !== null && _b !== void 0 ? _b : value;
      if (form && (pathState === null || pathState === void 0 ? void 0 : pathState.multiple) && pathState.type === "checkbox") {
        newValue = resolveNextCheckboxValue(getFromPath(form.values, path) || [], newValue, void 0);
      } else if ((opts === null || opts === void 0 ? void 0 : opts.type) === "checkbox") {
        newValue = resolveNextCheckboxValue(toValue(field.value), newValue, toValue(uncheckedValue));
      }
      handleChange(newValue, shouldValidate);
    }
    return Object.assign(Object.assign({}, field), {
      checked,
      checkedValue,
      uncheckedValue,
      handleChange: handleCheckboxChange
    });
  }
  return patchCheckedApi(_useField(name, rules, opts));
}
function useVModel({ prop, value, handleChange, shouldValidate }) {
  const vm = getCurrentInstance();
  if (!vm || !prop) {
    return;
  }
  const propName = typeof prop === "string" ? prop : "modelValue";
  const emitName = `update:${propName}`;
  if (!(propName in vm.props)) {
    return;
  }
  watch(value, (newValue) => {
    if (isEqual(newValue, getCurrentModelValue(vm, propName))) {
      return;
    }
    vm.emit(emitName, newValue);
  });
  watch(() => getCurrentModelValue(vm, propName), (propValue) => {
    if (propValue === IS_ABSENT && value.value === void 0) {
      return;
    }
    const newValue = propValue === IS_ABSENT ? void 0 : propValue;
    if (isEqual(newValue, value.value)) {
      return;
    }
    handleChange(newValue, shouldValidate());
  });
}
function getCurrentModelValue(vm, propName) {
  if (!vm) {
    return void 0;
  }
  return vm.props[propName];
}
const FieldImpl = /* @__PURE__ */ defineComponent({
  name: "Field",
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object],
      default: void 0
    },
    name: {
      type: String,
      required: true
    },
    rules: {
      type: [Object, String, Function],
      default: void 0
    },
    validateOnMount: {
      type: Boolean,
      default: false
    },
    validateOnBlur: {
      type: Boolean,
      default: void 0
    },
    validateOnChange: {
      type: Boolean,
      default: void 0
    },
    validateOnInput: {
      type: Boolean,
      default: void 0
    },
    validateOnModelUpdate: {
      type: Boolean,
      default: void 0
    },
    bails: {
      type: Boolean,
      default: () => getConfig().bails
    },
    label: {
      type: String,
      default: void 0
    },
    uncheckedValue: {
      type: null,
      default: void 0
    },
    modelValue: {
      type: null,
      default: IS_ABSENT
    },
    modelModifiers: {
      type: null,
      default: () => ({})
    },
    "onUpdate:modelValue": {
      type: null,
      default: void 0
    },
    standalone: {
      type: Boolean,
      default: false
    },
    keepValue: {
      type: Boolean,
      default: void 0
    }
  },
  setup(props, ctx) {
    const rules = toRef(props, "rules");
    const name = toRef(props, "name");
    const label = toRef(props, "label");
    const uncheckedValue = toRef(props, "uncheckedValue");
    const keepValue = toRef(props, "keepValue");
    const { errors, value, errorMessage, validate: validateField, handleChange, handleBlur, setTouched, resetField, handleReset, meta, checked, setErrors, setValue } = useField(name, rules, {
      validateOnMount: props.validateOnMount,
      bails: props.bails,
      standalone: props.standalone,
      type: ctx.attrs.type,
      initialValue: resolveInitialValue(props, ctx),
      // Only for checkboxes and radio buttons
      checkedValue: ctx.attrs.value,
      uncheckedValue,
      label,
      validateOnValueUpdate: props.validateOnModelUpdate,
      keepValueOnUnmount: keepValue,
      syncVModel: true
    });
    const onChangeHandler = function handleChangeWithModel(e, shouldValidate = true) {
      handleChange(e, shouldValidate);
    };
    const sharedProps = computed(() => {
      const { validateOnInput, validateOnChange, validateOnBlur, validateOnModelUpdate } = resolveValidationTriggers(props);
      function baseOnBlur(e) {
        handleBlur(e, validateOnBlur);
        if (isCallable(ctx.attrs.onBlur)) {
          ctx.attrs.onBlur(e);
        }
      }
      function baseOnInput(e) {
        onChangeHandler(e, validateOnInput);
        if (isCallable(ctx.attrs.onInput)) {
          ctx.attrs.onInput(e);
        }
      }
      function baseOnChange(e) {
        onChangeHandler(e, validateOnChange);
        if (isCallable(ctx.attrs.onChange)) {
          ctx.attrs.onChange(e);
        }
      }
      const attrs = {
        name: props.name,
        onBlur: baseOnBlur,
        onInput: baseOnInput,
        onChange: baseOnChange
      };
      attrs["onUpdate:modelValue"] = (e) => onChangeHandler(e, validateOnModelUpdate);
      return attrs;
    });
    const fieldProps = computed(() => {
      const attrs = Object.assign({}, sharedProps.value);
      if (hasCheckedAttr(ctx.attrs.type) && checked) {
        attrs.checked = checked.value;
      }
      const tag = resolveTag(props, ctx);
      if (shouldHaveValueBinding(tag, ctx.attrs)) {
        attrs.value = value.value;
      }
      return attrs;
    });
    const componentProps = computed(() => {
      return Object.assign(Object.assign({}, sharedProps.value), { modelValue: value.value });
    });
    function slotProps() {
      return {
        field: fieldProps.value,
        componentField: componentProps.value,
        value: value.value,
        meta,
        errors: errors.value,
        errorMessage: errorMessage.value,
        validate: validateField,
        resetField,
        handleChange: onChangeHandler,
        handleInput: (e) => onChangeHandler(e, false),
        handleReset,
        handleBlur: sharedProps.value.onBlur,
        setTouched,
        setErrors,
        setValue
      };
    }
    ctx.expose({
      value,
      meta,
      errors,
      errorMessage,
      setErrors,
      setTouched,
      setValue,
      reset: resetField,
      validate: validateField,
      handleChange
    });
    return () => {
      const tag = resolveDynamicComponent(resolveTag(props, ctx));
      const children = normalizeChildren(tag, ctx, slotProps);
      if (tag) {
        return h(tag, Object.assign(Object.assign({}, ctx.attrs), fieldProps.value), children);
      }
      return children;
    };
  }
});
function resolveTag(props, ctx) {
  let tag = props.as || "";
  if (!props.as && !ctx.slots.default) {
    tag = "input";
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
    validateOnModelUpdate: (_d = props.validateOnModelUpdate) !== null && _d !== void 0 ? _d : validateOnModelUpdate
  };
}
function resolveInitialValue(props, ctx) {
  if (!hasCheckedAttr(ctx.attrs.type)) {
    return isPropPresent(props, "modelValue") ? props.modelValue : ctx.attrs.value;
  }
  return isPropPresent(props, "modelValue") ? props.modelValue : void 0;
}
const Field = FieldImpl;
let FORM_COUNTER = 0;
const PRIVATE_PATH_STATE_KEYS = ["bails", "fieldsCount", "id", "multiple", "type", "validate"];
function resolveInitialValues(opts) {
  const givenInitial = (opts === null || opts === void 0 ? void 0 : opts.initialValues) || {};
  const providedValues = Object.assign({}, toValue(givenInitial));
  const schema = unref(opts === null || opts === void 0 ? void 0 : opts.validationSchema);
  if (schema && isTypedSchema(schema) && isCallable(schema.cast)) {
    return klona(schema.cast(providedValues) || {});
  }
  return klona(providedValues);
}
function useForm(opts) {
  var _a;
  const formId = FORM_COUNTER++;
  let FIELD_ID_COUNTER = 0;
  const isSubmitting = ref(false);
  const isValidating = ref(false);
  const submitCount = ref(0);
  const fieldArrays = [];
  const formValues = reactive(resolveInitialValues(opts));
  const pathStates = ref([]);
  const extraErrorsBag = ref({});
  const pathStateLookup = ref({});
  const rebuildPathLookup = debounceNextTick(() => {
    pathStateLookup.value = pathStates.value.reduce((names, state) => {
      names[normalizeFormPath(toValue(state.path))] = state;
      return names;
    }, {});
  });
  function setFieldError(field, message) {
    const state = findPathState(field);
    if (!state) {
      if (typeof field === "string") {
        extraErrorsBag.value[normalizeFormPath(field)] = normalizeErrorItem(message);
      }
      return;
    }
    if (typeof field === "string") {
      const normalizedPath = normalizeFormPath(field);
      if (extraErrorsBag.value[normalizedPath]) {
        delete extraErrorsBag.value[normalizedPath];
      }
    }
    state.errors = normalizeErrorItem(message);
    state.valid = !state.errors.length;
  }
  function setErrors(paths) {
    keysOf(paths).forEach((path) => {
      setFieldError(path, paths[path]);
    });
  }
  if (opts === null || opts === void 0 ? void 0 : opts.initialErrors) {
    setErrors(opts.initialErrors);
  }
  const errorBag = computed(() => {
    const pathErrors = pathStates.value.reduce((acc, state) => {
      if (state.errors.length) {
        acc[state.path] = state.errors;
      }
      return acc;
    }, {});
    return Object.assign(Object.assign({}, extraErrorsBag.value), pathErrors);
  });
  const errors = computed(() => {
    return keysOf(errorBag.value).reduce((acc, key) => {
      const errors2 = errorBag.value[key];
      if (errors2 === null || errors2 === void 0 ? void 0 : errors2.length) {
        acc[key] = errors2[0];
      }
      return acc;
    }, {});
  });
  const fieldNames = computed(() => {
    return pathStates.value.reduce((names, state) => {
      names[state.path] = { name: state.path || "", label: state.label || "" };
      return names;
    }, {});
  });
  const fieldBailsMap = computed(() => {
    return pathStates.value.reduce((map, state) => {
      var _a2;
      map[state.path] = (_a2 = state.bails) !== null && _a2 !== void 0 ? _a2 : true;
      return map;
    }, {});
  });
  const initialErrors = Object.assign({}, (opts === null || opts === void 0 ? void 0 : opts.initialErrors) || {});
  const keepValuesOnUnmount = (_a = opts === null || opts === void 0 ? void 0 : opts.keepValuesOnUnmount) !== null && _a !== void 0 ? _a : false;
  const { initialValues, originalInitialValues, setInitialValues } = useFormInitialValues(pathStates, formValues, opts);
  const meta = useFormMeta(pathStates, formValues, originalInitialValues, errors);
  const controlledValues = computed(() => {
    return pathStates.value.reduce((acc, state) => {
      const value = getFromPath(formValues, state.path);
      setInPath(acc, state.path, value);
      return acc;
    }, {});
  });
  const schema = opts === null || opts === void 0 ? void 0 : opts.validationSchema;
  function createPathState(path, config) {
    var _a2, _b;
    const initialValue = computed(() => getFromPath(initialValues.value, toValue(path)));
    const pathStateExists = pathStateLookup.value[toValue(path)];
    const isCheckboxOrRadio = (config === null || config === void 0 ? void 0 : config.type) === "checkbox" || (config === null || config === void 0 ? void 0 : config.type) === "radio";
    if (pathStateExists && isCheckboxOrRadio) {
      pathStateExists.multiple = true;
      const id2 = FIELD_ID_COUNTER++;
      if (Array.isArray(pathStateExists.id)) {
        pathStateExists.id.push(id2);
      } else {
        pathStateExists.id = [pathStateExists.id, id2];
      }
      pathStateExists.fieldsCount++;
      pathStateExists.__flags.pendingUnmount[id2] = false;
      return pathStateExists;
    }
    const currentValue = computed(() => getFromPath(formValues, toValue(path)));
    const pathValue = toValue(path);
    const unsetBatchIndex = UNSET_BATCH.findIndex((_path) => _path === pathValue);
    if (unsetBatchIndex !== -1) {
      UNSET_BATCH.splice(unsetBatchIndex, 1);
    }
    const isRequired = computed(() => {
      var _a3, _b2, _c, _d;
      const schemaValue = toValue(schema);
      if (isTypedSchema(schemaValue)) {
        return (_b2 = (_a3 = schemaValue.describe) === null || _a3 === void 0 ? void 0 : _a3.call(schemaValue, toValue(path)).required) !== null && _b2 !== void 0 ? _b2 : false;
      }
      const configSchemaValue = toValue(config === null || config === void 0 ? void 0 : config.schema);
      if (isTypedSchema(configSchemaValue)) {
        return (_d = (_c = configSchemaValue.describe) === null || _c === void 0 ? void 0 : _c.call(configSchemaValue).required) !== null && _d !== void 0 ? _d : false;
      }
      return false;
    });
    const id = FIELD_ID_COUNTER++;
    const state = reactive({
      id,
      path,
      touched: false,
      pending: false,
      valid: true,
      validated: !!((_a2 = initialErrors[pathValue]) === null || _a2 === void 0 ? void 0 : _a2.length),
      required: isRequired,
      initialValue,
      errors: shallowRef([]),
      bails: (_b = config === null || config === void 0 ? void 0 : config.bails) !== null && _b !== void 0 ? _b : false,
      label: config === null || config === void 0 ? void 0 : config.label,
      type: (config === null || config === void 0 ? void 0 : config.type) || "default",
      value: currentValue,
      multiple: false,
      __flags: {
        pendingUnmount: { [id]: false },
        pendingReset: false
      },
      fieldsCount: 1,
      validate: config === null || config === void 0 ? void 0 : config.validate,
      dirty: computed(() => {
        return !isEqual(unref(currentValue), unref(initialValue));
      })
    });
    pathStates.value.push(state);
    pathStateLookup.value[pathValue] = state;
    rebuildPathLookup();
    if (errors.value[pathValue] && !initialErrors[pathValue]) {
      nextTick(() => {
        validateField(pathValue, { mode: "silent" });
      });
    }
    if (isRef$1(path)) {
      watch(path, (newPath) => {
        rebuildPathLookup();
        const nextValue = klona(currentValue.value);
        pathStateLookup.value[newPath] = state;
        nextTick(() => {
          setInPath(formValues, newPath, nextValue);
        });
      });
    }
    return state;
  }
  const debouncedSilentValidation = debounceAsync(_validateSchema, 5);
  const debouncedValidation = debounceAsync(_validateSchema, 5);
  const validateSchema = withLatest(async (mode) => {
    return await (mode === "silent" ? debouncedSilentValidation() : debouncedValidation());
  }, (formResult, [mode]) => {
    const currentErrorsPaths = keysOf(formCtx.errorBag.value);
    const paths = [
      .../* @__PURE__ */ new Set([...keysOf(formResult.results), ...pathStates.value.map((p) => p.path), ...currentErrorsPaths])
    ].sort();
    const results = paths.reduce((validation, _path) => {
      var _a2;
      const expectedPath = _path;
      const pathState = findPathState(expectedPath) || findHoistedPath(expectedPath);
      const messages = ((_a2 = formResult.results[expectedPath]) === null || _a2 === void 0 ? void 0 : _a2.errors) || [];
      const path = toValue(pathState === null || pathState === void 0 ? void 0 : pathState.path) || expectedPath;
      const fieldResult = mergeValidationResults({ errors: messages, valid: !messages.length }, validation.results[path]);
      validation.results[path] = fieldResult;
      if (!fieldResult.valid) {
        validation.errors[path] = fieldResult.errors[0];
      }
      if (pathState && extraErrorsBag.value[path]) {
        delete extraErrorsBag.value[path];
      }
      if (!pathState) {
        setFieldError(path, messages);
        return validation;
      }
      pathState.valid = fieldResult.valid;
      if (mode === "silent") {
        return validation;
      }
      if (mode === "validated-only" && !pathState.validated) {
        return validation;
      }
      setFieldError(pathState, fieldResult.errors);
      return validation;
    }, {
      valid: formResult.valid,
      results: {},
      errors: {},
      source: formResult.source
    });
    if (formResult.values) {
      results.values = formResult.values;
      results.source = formResult.source;
    }
    keysOf(results.results).forEach((path) => {
      var _a2;
      const pathState = findPathState(path);
      if (!pathState) {
        return;
      }
      if (mode === "silent") {
        return;
      }
      if (mode === "validated-only" && !pathState.validated) {
        return;
      }
      setFieldError(pathState, (_a2 = results.results[path]) === null || _a2 === void 0 ? void 0 : _a2.errors);
    });
    return results;
  });
  function mutateAllPathState(mutation) {
    pathStates.value.forEach(mutation);
  }
  function findPathState(path) {
    const normalizedPath = typeof path === "string" ? normalizeFormPath(path) : path;
    const pathState = typeof normalizedPath === "string" ? pathStateLookup.value[normalizedPath] : normalizedPath;
    return pathState;
  }
  function findHoistedPath(path) {
    const candidates = pathStates.value.filter((state) => path.startsWith(state.path));
    return candidates.reduce((bestCandidate, candidate) => {
      if (!bestCandidate) {
        return candidate;
      }
      return candidate.path.length > bestCandidate.path.length ? candidate : bestCandidate;
    }, void 0);
  }
  let UNSET_BATCH = [];
  let PENDING_UNSET;
  function unsetPathValue(path) {
    UNSET_BATCH.push(path);
    if (!PENDING_UNSET) {
      PENDING_UNSET = nextTick(() => {
        const sortedPaths = [...UNSET_BATCH].sort().reverse();
        sortedPaths.forEach((p) => {
          unsetPath(formValues, p);
        });
        UNSET_BATCH = [];
        PENDING_UNSET = null;
      });
    }
    return PENDING_UNSET;
  }
  function makeSubmissionFactory(onlyControlled) {
    return function submitHandlerFactory(fn, onValidationError) {
      return function submissionHandler(e) {
        if (e instanceof Event) {
          e.preventDefault();
          e.stopPropagation();
        }
        mutateAllPathState((s) => s.touched = true);
        isSubmitting.value = true;
        submitCount.value++;
        return validate2().then((result) => {
          const values = klona(formValues);
          if (result.valid && typeof fn === "function") {
            const controlled = klona(controlledValues.value);
            let submittedValues = onlyControlled ? controlled : values;
            if (result.values) {
              submittedValues = result.source === "schema" ? result.values : Object.assign({}, submittedValues, result.values);
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
              resetField
            });
          }
          if (!result.valid && typeof onValidationError === "function") {
            onValidationError({
              values,
              evt: e,
              errors: result.errors,
              results: result.results
            });
          }
        }).then((returnVal) => {
          isSubmitting.value = false;
          return returnVal;
        }, (err) => {
          isSubmitting.value = false;
          throw err;
        });
      };
    };
  }
  const handleSubmitImpl = makeSubmissionFactory(false);
  const handleSubmit = handleSubmitImpl;
  handleSubmit.withControlled = makeSubmissionFactory(true);
  function removePathState(path, id) {
    const idx = pathStates.value.findIndex((s) => {
      return s.path === path && (Array.isArray(s.id) ? s.id.includes(id) : s.id === id);
    });
    const pathState = pathStates.value[idx];
    if (idx === -1 || !pathState) {
      return;
    }
    nextTick(() => {
      validateField(path, { mode: "silent", warn: false });
    });
    if (pathState.multiple && pathState.fieldsCount) {
      pathState.fieldsCount--;
    }
    if (Array.isArray(pathState.id)) {
      const idIndex = pathState.id.indexOf(id);
      if (idIndex >= 0) {
        pathState.id.splice(idIndex, 1);
      }
      delete pathState.__flags.pendingUnmount[id];
    }
    if (!pathState.multiple || pathState.fieldsCount <= 0) {
      pathStates.value.splice(idx, 1);
      unsetInitialValue(path);
      rebuildPathLookup();
      delete pathStateLookup.value[path];
    }
  }
  function destroyPath(path) {
    keysOf(pathStateLookup.value).forEach((key) => {
      if (key.startsWith(path)) {
        delete pathStateLookup.value[key];
      }
    });
    pathStates.value = pathStates.value.filter((s) => !s.path.startsWith(path));
    nextTick(() => {
      rebuildPathLookup();
    });
  }
  const formCtx = {
    formId,
    values: formValues,
    controlledValues,
    errorBag,
    errors,
    schema,
    submitCount,
    meta,
    isSubmitting,
    isValidating,
    fieldArrays,
    keepValuesOnUnmount,
    validateSchema: unref(schema) ? validateSchema : void 0,
    validate: validate2,
    setFieldError,
    validateField,
    setFieldValue,
    setValues,
    setErrors,
    setFieldTouched,
    setTouched,
    resetForm,
    resetField,
    handleSubmit,
    useFieldModel,
    defineInputBinds,
    defineComponentBinds,
    defineField,
    stageInitialValue,
    unsetInitialValue,
    setFieldInitialValue,
    createPathState,
    getPathState: findPathState,
    unsetPathValue,
    removePathState,
    initialValues,
    getAllPathStates: () => pathStates.value,
    destroyPath,
    isFieldTouched,
    isFieldDirty,
    isFieldValid
  };
  function setFieldValue(field, value, shouldValidate = true) {
    const clonedValue = klona(value);
    const path = typeof field === "string" ? field : field.path;
    const pathState = findPathState(path);
    if (!pathState) {
      createPathState(path);
    }
    setInPath(formValues, path, clonedValue);
    if (shouldValidate) {
      validateField(path);
    }
  }
  function forceSetValues(fields, shouldValidate = true) {
    keysOf(formValues).forEach((key) => {
      delete formValues[key];
    });
    keysOf(fields).forEach((path) => {
      setFieldValue(path, fields[path], false);
    });
    if (shouldValidate) {
      validate2();
    }
  }
  function setValues(fields, shouldValidate = true) {
    merge(formValues, fields);
    fieldArrays.forEach((f) => f && f.reset());
    if (shouldValidate) {
      validate2();
    }
  }
  function createModel(path, shouldValidate) {
    const pathState = findPathState(toValue(path)) || createPathState(path);
    return computed({
      get() {
        return pathState.value;
      },
      set(value) {
        var _a2;
        const pathValue = toValue(path);
        setFieldValue(pathValue, value, (_a2 = toValue(shouldValidate)) !== null && _a2 !== void 0 ? _a2 : false);
      }
    });
  }
  function setFieldTouched(field, isTouched) {
    const pathState = findPathState(field);
    if (pathState) {
      pathState.touched = isTouched;
    }
  }
  function isFieldTouched(field) {
    const pathState = findPathState(field);
    if (pathState) {
      return pathState.touched;
    }
    return pathStates.value.filter((s) => s.path.startsWith(field)).some((s) => s.touched);
  }
  function isFieldDirty(field) {
    const pathState = findPathState(field);
    if (pathState) {
      return pathState.dirty;
    }
    return pathStates.value.filter((s) => s.path.startsWith(field)).some((s) => s.dirty);
  }
  function isFieldValid(field) {
    const pathState = findPathState(field);
    if (pathState) {
      return pathState.valid;
    }
    return pathStates.value.filter((s) => s.path.startsWith(field)).every((s) => s.valid);
  }
  function setTouched(fields) {
    if (typeof fields === "boolean") {
      mutateAllPathState((state) => {
        state.touched = fields;
      });
      return;
    }
    keysOf(fields).forEach((field) => {
      setFieldTouched(field, !!fields[field]);
    });
  }
  function resetField(field, state) {
    var _a2;
    const newValue = state && "value" in state ? state.value : getFromPath(initialValues.value, field);
    const pathState = findPathState(field);
    if (pathState) {
      pathState.__flags.pendingReset = true;
    }
    setFieldInitialValue(field, klona(newValue), true);
    setFieldValue(field, newValue, false);
    setFieldTouched(field, (_a2 = state === null || state === void 0 ? void 0 : state.touched) !== null && _a2 !== void 0 ? _a2 : false);
    setFieldError(field, (state === null || state === void 0 ? void 0 : state.errors) || []);
    nextTick(() => {
      if (pathState) {
        pathState.__flags.pendingReset = false;
      }
    });
  }
  function resetForm(resetState, opts2) {
    let newValues = klona((resetState === null || resetState === void 0 ? void 0 : resetState.values) ? resetState.values : originalInitialValues.value);
    newValues = (opts2 === null || opts2 === void 0 ? void 0 : opts2.force) ? newValues : merge(originalInitialValues.value, newValues);
    newValues = isTypedSchema(schema) && isCallable(schema.cast) ? schema.cast(newValues) : newValues;
    setInitialValues(newValues, { force: opts2 === null || opts2 === void 0 ? void 0 : opts2.force });
    mutateAllPathState((state) => {
      var _a2;
      state.__flags.pendingReset = true;
      state.validated = false;
      state.touched = ((_a2 = resetState === null || resetState === void 0 ? void 0 : resetState.touched) === null || _a2 === void 0 ? void 0 : _a2[state.path]) || false;
      setFieldValue(state.path, getFromPath(newValues, state.path), false);
      setFieldError(state.path, void 0);
    });
    (opts2 === null || opts2 === void 0 ? void 0 : opts2.force) ? forceSetValues(newValues, false) : setValues(newValues, false);
    setErrors((resetState === null || resetState === void 0 ? void 0 : resetState.errors) || {});
    submitCount.value = (resetState === null || resetState === void 0 ? void 0 : resetState.submitCount) || 0;
    nextTick(() => {
      validate2({ mode: "silent" });
      mutateAllPathState((state) => {
        state.__flags.pendingReset = false;
      });
    });
  }
  async function validate2(opts2) {
    const mode = (opts2 === null || opts2 === void 0 ? void 0 : opts2.mode) || "force";
    if (mode === "force") {
      mutateAllPathState((f) => f.validated = true);
    }
    if (formCtx.validateSchema) {
      return formCtx.validateSchema(mode);
    }
    isValidating.value = true;
    const validations = await Promise.all(pathStates.value.map((state) => {
      if (!state.validate) {
        return Promise.resolve({
          key: state.path,
          valid: true,
          errors: [],
          value: void 0
        });
      }
      return state.validate(opts2).then((result) => {
        return {
          key: state.path,
          valid: result.valid,
          errors: result.errors,
          value: result.value
        };
      });
    }));
    isValidating.value = false;
    const results = {};
    const errors2 = {};
    const values = {};
    for (const validation of validations) {
      results[validation.key] = {
        valid: validation.valid,
        errors: validation.errors
      };
      if (validation.value) {
        setInPath(values, validation.key, validation.value);
      }
      if (validation.errors.length) {
        errors2[validation.key] = validation.errors[0];
      }
    }
    return {
      valid: validations.every((r) => r.valid),
      results,
      errors: errors2,
      values,
      source: "fields"
    };
  }
  async function validateField(path, opts2) {
    var _a2;
    const state = findPathState(path);
    if (state && (opts2 === null || opts2 === void 0 ? void 0 : opts2.mode) !== "silent") {
      state.validated = true;
    }
    if (schema) {
      const { results } = await validateSchema((opts2 === null || opts2 === void 0 ? void 0 : opts2.mode) || "validated-only");
      return results[path] || { errors: [], valid: true };
    }
    if (state === null || state === void 0 ? void 0 : state.validate) {
      return state.validate(opts2);
    }
    !state && ((_a2 = opts2 === null || opts2 === void 0 ? void 0 : opts2.warn) !== null && _a2 !== void 0 ? _a2 : true);
    return Promise.resolve({ errors: [], valid: true });
  }
  function unsetInitialValue(path) {
    unsetPath(initialValues.value, path);
  }
  function stageInitialValue(path, value, updateOriginal = false) {
    setFieldInitialValue(path, value);
    setInPath(formValues, path, value);
    if (updateOriginal && !(opts === null || opts === void 0 ? void 0 : opts.initialValues)) {
      setInPath(originalInitialValues.value, path, klona(value));
    }
  }
  function setFieldInitialValue(path, value, updateOriginal = false) {
    setInPath(initialValues.value, path, klona(value));
    if (updateOriginal) {
      setInPath(originalInitialValues.value, path, klona(value));
    }
  }
  async function _validateSchema() {
    const schemaValue = unref(schema);
    if (!schemaValue) {
      return { valid: true, results: {}, errors: {}, source: "none" };
    }
    isValidating.value = true;
    const formResult = isYupValidator(schemaValue) || isTypedSchema(schemaValue) ? await validateTypedSchema(schemaValue, formValues) : await validateObjectSchema(schemaValue, formValues, {
      names: fieldNames.value,
      bailsMap: fieldBailsMap.value
    });
    isValidating.value = false;
    return formResult;
  }
  const submitForm = handleSubmit((_, { evt }) => {
    if (isFormSubmitEvent(evt)) {
      evt.target.submit();
    }
  });
  onMounted(() => {
    if (opts === null || opts === void 0 ? void 0 : opts.initialErrors) {
      setErrors(opts.initialErrors);
    }
    if (opts === null || opts === void 0 ? void 0 : opts.initialTouched) {
      setTouched(opts.initialTouched);
    }
    if (opts === null || opts === void 0 ? void 0 : opts.validateOnMount) {
      validate2();
      return;
    }
    if (formCtx.validateSchema) {
      formCtx.validateSchema("silent");
    }
  });
  if (isRef$1(schema)) {
    watch(schema, () => {
      var _a2;
      (_a2 = formCtx.validateSchema) === null || _a2 === void 0 ? void 0 : _a2.call(formCtx, "validated-only");
    });
  }
  provide(FormContextKey, formCtx);
  function defineField(path, config) {
    const label = isCallable(config) ? void 0 : config === null || config === void 0 ? void 0 : config.label;
    const pathState = findPathState(toValue(path)) || createPathState(path, { label });
    const evalConfig = () => isCallable(config) ? config(omit(pathState, PRIVATE_PATH_STATE_KEYS)) : config || {};
    function onBlur() {
      var _a2;
      pathState.touched = true;
      const validateOnBlur = (_a2 = evalConfig().validateOnBlur) !== null && _a2 !== void 0 ? _a2 : getConfig().validateOnBlur;
      if (validateOnBlur) {
        validateField(pathState.path);
      }
    }
    function onInput() {
      var _a2;
      const validateOnInput = (_a2 = evalConfig().validateOnInput) !== null && _a2 !== void 0 ? _a2 : getConfig().validateOnInput;
      if (validateOnInput) {
        nextTick(() => {
          validateField(pathState.path);
        });
      }
    }
    function onChange() {
      var _a2;
      const validateOnChange = (_a2 = evalConfig().validateOnChange) !== null && _a2 !== void 0 ? _a2 : getConfig().validateOnChange;
      if (validateOnChange) {
        nextTick(() => {
          validateField(pathState.path);
        });
      }
    }
    const props = computed(() => {
      const base = {
        onChange,
        onInput,
        onBlur
      };
      if (isCallable(config)) {
        return Object.assign(Object.assign({}, base), config(omit(pathState, PRIVATE_PATH_STATE_KEYS)).props || {});
      }
      if (config === null || config === void 0 ? void 0 : config.props) {
        return Object.assign(Object.assign({}, base), config.props(omit(pathState, PRIVATE_PATH_STATE_KEYS)));
      }
      return base;
    });
    const model = createModel(path, () => {
      var _a2, _b, _c;
      return (_c = (_a2 = evalConfig().validateOnModelUpdate) !== null && _a2 !== void 0 ? _a2 : (_b = getConfig()) === null || _b === void 0 ? void 0 : _b.validateOnModelUpdate) !== null && _c !== void 0 ? _c : true;
    });
    return [model, props];
  }
  function useFieldModel(pathOrPaths) {
    if (!Array.isArray(pathOrPaths)) {
      return createModel(pathOrPaths);
    }
    return pathOrPaths.map((p) => createModel(p, true));
  }
  function defineInputBinds(path, config) {
    const [model, props] = defineField(path, config);
    function onBlur() {
      props.value.onBlur();
    }
    function onInput(e) {
      const value = normalizeEventValue(e);
      setFieldValue(toValue(path), value, false);
      props.value.onInput();
    }
    function onChange(e) {
      const value = normalizeEventValue(e);
      setFieldValue(toValue(path), value, false);
      props.value.onChange();
    }
    return computed(() => {
      return Object.assign(Object.assign({}, props.value), {
        onBlur,
        onInput,
        onChange,
        value: model.value
      });
    });
  }
  function defineComponentBinds(path, config) {
    const [model, props] = defineField(path, config);
    const pathState = findPathState(toValue(path));
    function onUpdateModelValue(value) {
      model.value = value;
    }
    return computed(() => {
      const conf = isCallable(config) ? config(omit(pathState, PRIVATE_PATH_STATE_KEYS)) : config || {};
      return Object.assign({ [conf.model || "modelValue"]: model.value, [`onUpdate:${conf.model || "modelValue"}`]: onUpdateModelValue }, props.value);
    });
  }
  const ctx = Object.assign(Object.assign({}, formCtx), { values: readonly(formValues), handleReset: () => resetForm(), submitForm });
  provide(PublicFormContextKey, ctx);
  return ctx;
}
function useFormMeta(pathsState, currentValues, initialValues, errors) {
  const MERGE_STRATEGIES = {
    touched: "some",
    pending: "some",
    valid: "every"
  };
  const isDirty = computed(() => {
    return !isEqual(currentValues, unref(initialValues));
  });
  function calculateFlags() {
    const states = pathsState.value;
    return keysOf(MERGE_STRATEGIES).reduce((acc, flag) => {
      const mergeMethod = MERGE_STRATEGIES[flag];
      acc[flag] = states[mergeMethod]((s) => s[flag]);
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
function useFormInitialValues(pathsState, formValues, opts) {
  const values = resolveInitialValues(opts);
  const initialValues = ref(values);
  const originalInitialValues = ref(klona(values));
  function setInitialValues(values2, opts2) {
    if (opts2 === null || opts2 === void 0 ? void 0 : opts2.force) {
      initialValues.value = klona(values2);
      originalInitialValues.value = klona(values2);
    } else {
      initialValues.value = merge(klona(initialValues.value) || {}, klona(values2));
      originalInitialValues.value = merge(klona(originalInitialValues.value) || {}, klona(values2));
    }
    if (!(opts2 === null || opts2 === void 0 ? void 0 : opts2.updateFields)) {
      return;
    }
    pathsState.value.forEach((state) => {
      const wasTouched = state.touched;
      if (wasTouched) {
        return;
      }
      const newValue = getFromPath(initialValues.value, state.path);
      setInPath(formValues, state.path, klona(newValue));
    });
  }
  return {
    initialValues,
    originalInitialValues,
    setInitialValues
  };
}
function mergeValidationResults(a, b) {
  if (!b) {
    return a;
  }
  return {
    valid: a.valid && b.valid,
    errors: [...a.errors, ...b.errors]
  };
}
const FormImpl = /* @__PURE__ */ defineComponent({
  name: "Form",
  inheritAttrs: false,
  props: {
    as: {
      type: null,
      default: "form"
    },
    validationSchema: {
      type: Object,
      default: void 0
    },
    initialValues: {
      type: Object,
      default: void 0
    },
    initialErrors: {
      type: Object,
      default: void 0
    },
    initialTouched: {
      type: Object,
      default: void 0
    },
    validateOnMount: {
      type: Boolean,
      default: false
    },
    onSubmit: {
      type: Function,
      default: void 0
    },
    onInvalidSubmit: {
      type: Function,
      default: void 0
    },
    keepValues: {
      type: Boolean,
      default: false
    }
  },
  setup(props, ctx) {
    const validationSchema = toRef(props, "validationSchema");
    const keepValues = toRef(props, "keepValues");
    const { errors, errorBag, values, meta, isSubmitting, isValidating, submitCount, controlledValues, validate: validate2, validateField, handleReset, resetForm, handleSubmit, setErrors, setFieldError, setFieldValue, setValues, setFieldTouched, setTouched, resetField } = useForm({
      validationSchema: validationSchema.value ? validationSchema : void 0,
      initialValues: props.initialValues,
      initialErrors: props.initialErrors,
      initialTouched: props.initialTouched,
      validateOnMount: props.validateOnMount,
      keepValuesOnUnmount: keepValues
    });
    const submitForm = handleSubmit((_, { evt }) => {
      if (isFormSubmitEvent(evt)) {
        evt.target.submit();
      }
    }, props.onInvalidSubmit);
    const onSubmit = props.onSubmit ? handleSubmit(props.onSubmit, props.onInvalidSubmit) : submitForm;
    function handleFormReset(e) {
      if (isEvent(e)) {
        e.preventDefault();
      }
      handleReset();
      if (typeof ctx.attrs.onReset === "function") {
        ctx.attrs.onReset();
      }
    }
    function handleScopedSlotSubmit(evt, onSubmit2) {
      const onSuccess = typeof evt === "function" && !onSubmit2 ? evt : onSubmit2;
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
        isValidating: isValidating.value,
        submitCount: submitCount.value,
        controlledValues: controlledValues.value,
        validate: validate2,
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
        getErrors
      };
    }
    ctx.expose({
      setFieldError,
      setErrors,
      setFieldValue,
      setValues,
      setFieldTouched,
      setTouched,
      resetForm,
      validate: validate2,
      validateField,
      resetField,
      getValues,
      getMeta,
      getErrors,
      values,
      meta,
      errors
    });
    return function renderForm() {
      const tag = props.as === "form" ? props.as : !props.as ? null : resolveDynamicComponent(props.as);
      const children = normalizeChildren(tag, ctx, slotProps);
      if (!tag) {
        return children;
      }
      const formAttrs = tag === "form" ? {
        // Disables native validation as vee-validate will handle it.
        novalidate: true
      } : {};
      return h(tag, Object.assign(Object.assign(Object.assign({}, formAttrs), ctx.attrs), { onSubmit, onReset: handleFormReset }), children);
    };
  }
});
const Form = FormImpl;
const ErrorMessageImpl = /* @__PURE__ */ defineComponent({
  name: "ErrorMessage",
  props: {
    as: {
      type: String,
      default: void 0
    },
    name: {
      type: String,
      required: true
    }
  },
  setup(props, ctx) {
    const form = inject(FormContextKey, void 0);
    const message = computed(() => {
      return form === null || form === void 0 ? void 0 : form.errors.value[props.name];
    });
    function slotProps() {
      return {
        message: message.value
      };
    }
    return () => {
      if (!message.value) {
        return void 0;
      }
      const tag = props.as ? resolveDynamicComponent(props.as) : props.as;
      const children = normalizeChildren(tag, ctx, slotProps);
      const attrs = Object.assign({ role: "alert" }, ctx.attrs);
      if (!tag && (Array.isArray(children) || !children) && (children === null || children === void 0 ? void 0 : children.length)) {
        return children;
      }
      if ((Array.isArray(children) || !children) && !(children === null || children === void 0 ? void 0 : children.length)) {
        return h(tag || "span", attrs, message.value);
      }
      return h(tag, attrs, children);
    };
  }
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

var toposort$1 = {exports: {}};

/**
 * Topological sorting function
 *
 * @param {Array} edges
 * @returns {Array}
 */

toposort$1.exports = function(edges) {
  return toposort(uniqueNodes(edges), edges)
};

toposort$1.exports.array = toposort;

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

let _Symbol$toStringTag, _Symbol$hasInstance, _Symbol$toStringTag2;
let strReg = /\$\{\s*(\w+)\s*\}/g;
_Symbol$toStringTag = Symbol.toStringTag;
class ValidationErrorNoStack {
  constructor(errorOrErrors, value, field, type) {
    this.name = void 0;
    this.message = void 0;
    this.value = void 0;
    this.path = void 0;
    this.type = void 0;
    this.params = void 0;
    this.errors = void 0;
    this.inner = void 0;
    this[_Symbol$toStringTag] = 'Error';
    this.name = 'ValidationError';
    this.value = value;
    this.path = field;
    this.type = type;
    this.errors = [];
    this.inner = [];
    toArray(errorOrErrors).forEach(err => {
      if (ValidationError.isError(err)) {
        this.errors.push(...err.errors);
        const innerErrors = err.inner.length ? err.inner : [err];
        this.inner.push(...innerErrors);
      } else {
        this.errors.push(err);
      }
    });
    this.message = this.errors.length > 1 ? `${this.errors.length} errors occurred` : this.errors[0];
  }
}
_Symbol$hasInstance = Symbol.hasInstance;
_Symbol$toStringTag2 = Symbol.toStringTag;
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
  constructor(errorOrErrors, value, field, type, disableStack) {
    const errorNoStack = new ValidationErrorNoStack(errorOrErrors, value, field, type);
    if (disableStack) {
      return errorNoStack;
    }
    super();
    this.value = void 0;
    this.path = void 0;
    this.type = void 0;
    this.params = void 0;
    this.errors = [];
    this.inner = [];
    this[_Symbol$toStringTag2] = 'Error';
    this.name = errorNoStack.name;
    this.message = errorNoStack.message;
    this.type = errorNoStack.type;
    this.value = errorNoStack.value;
    this.path = errorNoStack.path;
    this.errors = errorNoStack.errors;
    this.inner = errorNoStack.inner;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
  static [_Symbol$hasInstance](inst) {
    return ValidationErrorNoStack[Symbol.hasInstance](inst) || super[Symbol.hasInstance](inst);
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
  datetime: '${path} must be a valid ISO date-time',
  datetime_precision: '${path} must be a valid ISO date-time with a sub-second precision of exactly ${precision} digits',
  datetime_offset: '${path} must be a valid ISO date-time with UTC "Z" timezone',
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
let tuple = {
  notType: params => {
    const {
      path,
      value,
      spec
    } = params;
    const typeLen = spec.types.length;
    if (Array.isArray(value)) {
      if (value.length < typeLen) return `${path} tuple value has too few items, expected a length of ${typeLen} but got ${value.length} for value: \`${printValue(value, true)}\``;
      if (value.length > typeLen) return `${path} tuple value has too many items, expected a length of ${typeLen} but got ${value.length} for value: \`${printValue(value, true)}\``;
    }
    return ValidationError.formatError(mixed.notType, params);
  }
};
var locale = Object.assign(Object.create(null), {
  mixed,
  string,
  number,
  date,
  object,
  array,
  boolean,
  tuple
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
      abortEarly = schema.spec.abortEarly,
      disableStackTrace = schema.spec.disableStackTrace
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
        spec: schema.spec,
        disableStackTrace: overrides.disableStackTrace || disableStackTrace
      }, params, overrides.params);
      for (const key of Object.keys(nextParams)) nextParams[key] = resolve(nextParams[key]);
      const error = new ValidationError(ValidationError.formatError(overrides.message || message, nextParams), value, nextParams.path, overrides.type || name, nextParams.disableStackTrace);
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
    if (shouldSkip) {
      return handleResult(true);
    }
    let result;
    try {
      var _result;
      result = test.call(ctx, value, ctx);
      if (typeof ((_result = result) == null ? void 0 : _result.then) === 'function') {
        if (options.sync) {
          throw new Error(`Validation test of type: "${ctx.type}" returned a Promise during a synchronous validate. ` + `This test will finish after the validate call has returned`);
        }
        return Promise.resolve(result).then(handleResult, handleError);
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

// If `CustomSchemaMeta` isn't extended with any keys, we'll fall back to a
// loose Record definition allowing free form usage.
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
      disableStackTrace: false,
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
    var _options$strict, _options$abortEarly, _options$recursive, _options$disableStack;
    return Object.assign({}, options, {
      from: options.from || [],
      strict: (_options$strict = options.strict) != null ? _options$strict : this.spec.strict,
      abortEarly: (_options$abortEarly = options.abortEarly) != null ? _options$abortEarly : this.spec.abortEarly,
      recursive: (_options$recursive = options.recursive) != null ? _options$recursive : this.spec.recursive,
      disableStackTrace: (_options$disableStack = options.disableStackTrace) != null ? _options$disableStack : this.spec.disableStackTrace
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
  _cast(rawValue, options) {
    let value = rawValue === undefined ? rawValue : this.transforms.reduce((prevValue, fn) => fn.call(this, prevValue, rawValue, this), rawValue);
    if (value === undefined) {
      value = this.getDefault(options);
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
          Array.isArray(err) ? nestedErrors.push(...err) : nestedErrors.push(err);
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
      path: isIndex || k.includes('.') ? `${parentPath || ''}[${isIndex ? k : `"${k}"`}]` : (parentPath ? `${parentPath}.` : '') + key
    });
    return (_, panic, next) => this.resolve(testOptions)._validate(value, testOptions, panic, next);
  }
  validate(value, options) {
    var _options$disableStack2;
    let schema = this.resolve(Object.assign({}, options, {
      value
    }));
    let disableStackTrace = (_options$disableStack2 = options == null ? void 0 : options.disableStackTrace) != null ? _options$disableStack2 : schema.spec.disableStackTrace;
    return new Promise((resolve, reject) => schema._validate(value, options, (error, parsed) => {
      if (ValidationError.isError(error)) error.value = parsed;
      reject(error);
    }, (errors, validated) => {
      if (errors.length) reject(new ValidationError(errors, validated, undefined, undefined, disableStackTrace));else resolve(validated);
    }));
  }
  validateSync(value, options) {
    var _options$disableStack3;
    let schema = this.resolve(Object.assign({}, options, {
      value
    }));
    let result;
    let disableStackTrace = (_options$disableStack3 = options == null ? void 0 : options.disableStackTrace) != null ? _options$disableStack3 : schema.spec.disableStackTrace;
    schema._validate(value, Object.assign({}, options, {
      sync: true
    }), (error, parsed) => {
      if (ValidationError.isError(error)) error.value = parsed;
      throw error;
    }, (errors, validated) => {
      if (errors.length) throw new ValidationError(errors, value, undefined, undefined, disableStackTrace);
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
  _getDefault(options) {
    let defaultValue = this.spec.default;
    if (defaultValue == null) {
      return defaultValue;
    }
    return typeof defaultValue === 'function' ? defaultValue.call(this, options) : clone(defaultValue);
  }
  getDefault(options
  // If schema is defaulted we know it's at least not undefined
  ) {
    let schema = this.resolve(options || {});
    return schema._getDefault(options);
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
      skipAbsent: true,
      test(value) {
        if (!this.schema._typeCheck(value)) return this.createError({
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

/**
 * This file is a modified version of the file from the following repository:
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * NON-CONFORMANT EDITION.
 * © 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */

// prettier-ignore
//                1 YYYY                2 MM        3 DD              4 HH     5 mm        6 ss           7 msec         8 Z 9 ±   10 tzHH    11 tzmm
const isoReg = /^(\d{4}|[+-]\d{6})(?:-?(\d{2})(?:-?(\d{2}))?)?(?:[ T]?(\d{2}):?(\d{2})(?::?(\d{2})(?:[,.](\d{1,}))?)?(?:(Z)|([+-])(\d{2})(?::?(\d{2}))?)?)?$/;
function parseIsoDate(date) {
  const struct = parseDateStruct(date);
  if (!struct) return Date.parse ? Date.parse(date) : Number.NaN;

  // timestamps without timezone identifiers should be considered local time
  if (struct.z === undefined && struct.plusMinus === undefined) {
    return new Date(struct.year, struct.month, struct.day, struct.hour, struct.minute, struct.second, struct.millisecond).valueOf();
  }
  let totalMinutesOffset = 0;
  if (struct.z !== 'Z' && struct.plusMinus !== undefined) {
    totalMinutesOffset = struct.hourOffset * 60 + struct.minuteOffset;
    if (struct.plusMinus === '+') totalMinutesOffset = 0 - totalMinutesOffset;
  }
  return Date.UTC(struct.year, struct.month, struct.day, struct.hour, struct.minute + totalMinutesOffset, struct.second, struct.millisecond);
}
function parseDateStruct(date) {
  var _regexResult$7$length, _regexResult$;
  const regexResult = isoReg.exec(date);
  if (!regexResult) return null;

  // use of toNumber() avoids NaN timestamps caused by “undefined”
  // values being passed to Date constructor
  return {
    year: toNumber(regexResult[1]),
    month: toNumber(regexResult[2], 1) - 1,
    day: toNumber(regexResult[3], 1),
    hour: toNumber(regexResult[4]),
    minute: toNumber(regexResult[5]),
    second: toNumber(regexResult[6]),
    millisecond: regexResult[7] ?
    // allow arbitrary sub-second precision beyond milliseconds
    toNumber(regexResult[7].substring(0, 3)) : 0,
    precision: (_regexResult$7$length = (_regexResult$ = regexResult[7]) == null ? void 0 : _regexResult$.length) != null ? _regexResult$7$length : undefined,
    z: regexResult[8] || undefined,
    plusMinus: regexResult[9] || undefined,
    hourOffset: toNumber(regexResult[10]),
    minuteOffset: toNumber(regexResult[11])
  };
}
function toNumber(str, defaultValue = 0) {
  return Number(str) || defaultValue;
}

// Taken from HTML spec: https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
let rEmail =
// eslint-disable-next-line
/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
let rUrl =
// eslint-disable-next-line
/^((https?|ftp):)?\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;

// eslint-disable-next-line
let rUUID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
let yearMonthDay = '^\\d{4}-\\d{2}-\\d{2}';
let hourMinuteSecond = '\\d{2}:\\d{2}:\\d{2}';
let zOrOffset = '(([+-]\\d{2}(:?\\d{2})?)|Z)';
let rIsoDateTime = new RegExp(`${yearMonthDay}T${hourMinuteSecond}(\\.\\d+)?${zOrOffset}$`);
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
  datetime(options) {
    let message = '';
    let allowOffset;
    let precision;
    if (options) {
      if (typeof options === 'object') {
        ({
          message = '',
          allowOffset = false,
          precision = undefined
        } = options);
      } else {
        message = options;
      }
    }
    return this.matches(rIsoDateTime, {
      name: 'datetime',
      message: message || string.datetime,
      excludeEmptyString: true
    }).test({
      name: 'datetime_offset',
      message: message || string.datetime_offset,
      params: {
        allowOffset
      },
      skipAbsent: true,
      test: value => {
        if (!value || allowOffset) return true;
        const struct = parseDateStruct(value);
        if (!struct) return false;
        return !!struct.z;
      }
    }).test({
      name: 'datetime_precision',
      message: message || string.datetime_precision,
      params: {
        precision
      },
      skipAbsent: true,
      test: value => {
        if (!value || precision == undefined) return true;
        const struct = parseDateStruct(value);
        if (!struct) return false;
        return struct.precision === precision;
      }
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

        // null -> NaN isn't useful; treat all nulls as null and let it fail on
        // nullability check vs TypeErrors
        if (ctx.isType(parsed) || parsed === null) return parsed;
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
        // null -> InvalidDate isn't useful; treat all nulls as null and let it fail on
        // nullability check vs TypeErrors
        if (!ctx.spec.coerce || ctx.isType(value) || value === null) return value;
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
const _hoisted_2$7 = ["textContent"];
const _hoisted_3$7 = ["textContent"];
const _hoisted_4$7 = ["textContent"];
const _hoisted_5$7 = { class: "input-group input-group-sm has-validation" };
const _hoisted_6$7 = ["disabled"];
const _hoisted_7$6 = ["textContent"];
const _hoisted_8$6 = ["textContent"];
const _hoisted_9$6 = { class: "input-group input-group-sm has-validation" };
const _hoisted_10$5 = ["disabled"];
const _hoisted_11$4 = ["textContent"];
const _hoisted_12$4 = ["textContent"];
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
    on$1("init", () => {
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
      const o2 = {
        save_ns: v_save_ns.value,
        book: {
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
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-6 px-1 pb-2", { "was-validated": unref(mv_title).valid }])
          },
          [
            _cache[9] || (_cache[9] = createBaseVNode(
              "label",
              {
                for: "book.title",
                class: "form-label"
              },
              "作品タイトル名",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "input",
              {
                type: "text",
                id: "book.title",
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef$1(v_title) ? v_title.value = $event : null),
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_title).valid }]),
                onInput: subscribe,
                placeholder: "（日本語名でＯＫ）",
                "aria-label": "作品タイトル名",
                "aria-describedby": "Title"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_title)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_title))
            }, null, 8, _hoisted_2$7)
          ],
          2
          /* CLASS */
        ),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-6 px-1 pb-2", { "was-validated": unref(mv_save_ns).valid }])
          },
          [
            _cache[10] || (_cache[10] = createBaseVNode(
              "label",
              {
                for: "save_ns",
                class: "form-label"
              },
              "プロジェクト名",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "input",
              {
                type: "text",
                id: "save_ns",
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef$1(v_save_ns) ? v_save_ns.value = $event : null),
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_save_ns).valid }]),
                onInput: subscribe,
                placeholder: "com.fc2.blog.famibee 的な出版者ＵＲＬの逆順ドメイン推奨",
                "aria-label": "プロジェクト名",
                "aria-describedby": "Project name"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_save_ns)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_save_ns))
            }, null, 8, _hoisted_3$7)
          ],
          2
          /* CLASS */
        ),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-6 px-1 py-2", { "was-validated": unref(mv_creator).valid }])
          },
          [
            _cache[11] || (_cache[11] = createBaseVNode(
              "label",
              {
                for: "book.creator",
                class: "form-label"
              },
              "著作者",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "input",
              {
                type: "text",
                id: "book.creator",
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef$1(v_creator) ? v_creator.value = $event : null),
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_creator).valid }]),
                onInput: subscribe,
                placeholder: "ペンネーム、ハンドル名など",
                "aria-label": "著作者",
                "aria-describedby": "Contact"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_creator)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_creator))
            }, null, 8, _hoisted_4$7)
          ],
          2
          /* CLASS */
        ),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-6 px-1 py-2", { "was-validated": unref(mv_cre_url).valid }])
          },
          [
            _cache[12] || (_cache[12] = createBaseVNode(
              "label",
              {
                for: "book.cre_url",
                class: "form-label"
              },
              "連絡先URL・mail",
              -1
              /* HOISTED */
            )),
            createBaseVNode("div", _hoisted_5$7, [
              withDirectives(createBaseVNode(
                "input",
                {
                  type: "text",
                  id: "book.cre_url",
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef$1(v_cre_url) ? v_cre_url.value = $event : null),
                  class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_cre_url).valid }]),
                  onInput: subscribe,
                  placeholder: "メアド、SNSなど",
                  "aria-label": "連絡先ＵＲＬ",
                  "aria-describedby": "Contact URL"
                },
                null,
                34
                /* CLASS, NEED_HYDRATION */
              ), [
                [vModelText, unref(v_cre_url)]
              ]),
              createBaseVNode("button", {
                type: "button",
                class: "btn btn-info",
                onClick: _cache[4] || (_cache[4] = ($event) => unref(openURL)(unref(v_cre_url))),
                disabled: !unref(mv_cre_url).valid
              }, "Open", 8, _hoisted_6$7),
              createBaseVNode("div", {
                class: "invalid-feedback",
                textContent: toDisplayString(unref(em_cre_url))
              }, null, 8, _hoisted_7$6)
            ])
          ],
          2
          /* CLASS */
        ),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-6 px-1 py-2", { "was-validated": unref(mv_publisher).valid }])
          },
          [
            _cache[13] || (_cache[13] = createBaseVNode(
              "label",
              {
                for: "book.publisher",
                class: "form-label"
              },
              "出版者",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "input",
              {
                type: "text",
                id: "book.publisher",
                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef$1(v_publisher) ? v_publisher.value = $event : null),
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_publisher).valid }]),
                onInput: subscribe,
                placeholder: "サークル名、団体名など",
                "aria-label": "出版者",
                "aria-describedby": "Publisher"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_publisher)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_publisher))
            }, null, 8, _hoisted_8$6)
          ],
          2
          /* CLASS */
        ),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-6 px-1 py-2", { "was-validated": unref(mv_pub_url).valid }])
          },
          [
            _cache[14] || (_cache[14] = createBaseVNode(
              "label",
              {
                for: "book.pub_url",
                class: "form-label"
              },
              "出版者URL",
              -1
              /* HOISTED */
            )),
            createBaseVNode("div", _hoisted_9$6, [
              withDirectives(createBaseVNode(
                "input",
                {
                  type: "url",
                  id: "book.pub_url",
                  "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => isRef$1(v_pub_url) ? v_pub_url.value = $event : null),
                  class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_pub_url).valid }]),
                  onInput: subscribe,
                  placeholder: "ご自身の公式サイトなど",
                  "aria-label": "出版者ＵＲＬ",
                  "aria-describedby": "Publisher URL"
                },
                null,
                34
                /* CLASS, NEED_HYDRATION */
              ), [
                [vModelText, unref(v_pub_url)]
              ]),
              createBaseVNode("button", {
                type: "button",
                class: "btn btn-info",
                onClick: _cache[7] || (_cache[7] = ($event) => unref(openURL)(unref(v_pub_url))),
                disabled: !unref(mv_pub_url).valid
              }, "Open", 8, _hoisted_10$5),
              createBaseVNode("div", {
                class: "invalid-feedback",
                textContent: toDisplayString(unref(em_pub_url))
              }, null, 8, _hoisted_11$4)
            ])
          ],
          2
          /* CLASS */
        ),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-12 px-1 py-3", { "was-validated": unref(mv_detail).valid }])
          },
          [
            _cache[15] || (_cache[15] = createBaseVNode(
              "label",
              {
                for: "book.detail",
                class: "form-label"
              },
              "内容：プロジェクトの説明",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "textarea",
              {
                id: "book.detail",
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_detail).valid }]),
                "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => isRef$1(v_detail) ? v_detail.value = $event : null),
                onInput: subscribe,
                placeholder: "インストーラーに表示する内容説明",
                "aria-label": "プロジェクトの説明",
                "aria-describedby": "Project description"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_detail)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_detail))
            }, null, 8, _hoisted_12$4)
          ],
          2
          /* CLASS */
        )
      ]);
    };
  }
});

const _hoisted_1$6 = { class: "row" };
const _hoisted_2$6 = ["textContent"];
const _hoisted_3$6 = ["textContent"];
const _hoisted_4$6 = ["textContent"];
const _hoisted_5$6 = ["textContent"];
const _hoisted_6$6 = ["textContent"];
const _hoisted_7$5 = ["textContent"];
const _hoisted_8$5 = ["textContent"];
const _hoisted_9$5 = { class: "col-6 col-sm-3 px-1 py-2" };
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
      create$6().required("必須の項目です").matches(
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
        // regex101: build, test, and debug regex https://regex101.com/r/vkijKf/1/
        // セマンティック バージョニング 2.0.0 | Semantic Versioning https://semver.org/lang/ja/
        { message: "1.0.0 など セマンティックバージョニング記述して下さい" }
      ),
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
    on$1("init", () => {
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
      const o2 = {
        // 二段階目も個別にコピー
        book: { version: v_version.value },
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
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_width).valid }])
          },
          [
            _cache[8] || (_cache[8] = createBaseVNode(
              "label",
              {
                for: "book.width",
                class: "form-label"
              },
              "アプリの横幅",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "input",
              {
                type: "number",
                id: "book.width",
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef$1(v_width) ? v_width.value = $event : null),
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_width).valid }]),
                onInput: subscribe,
                placeholder: "横幅ドット数",
                "aria-label": "アプリの横幅",
                "aria-describedby": "Width of application display area"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_width)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_width))
            }, null, 8, _hoisted_2$6)
          ],
          2
          /* CLASS */
        ),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_height).valid }])
          },
          [
            _cache[9] || (_cache[9] = createBaseVNode(
              "label",
              {
                for: "book.height",
                class: "form-label"
              },
              "アプリの縦幅",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "input",
              {
                type: "number",
                id: "book.height",
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef$1(v_height) ? v_height.value = $event : null),
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_height).valid }]),
                onInput: subscribe,
                placeholder: "縦幅ドット数",
                "aria-label": "アプリの縦幅",
                "aria-describedby": "Weight of application display area"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_height)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_height))
            }, null, 8, _hoisted_3$6)
          ],
          2
          /* CLASS */
        ),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_version).valid }])
          },
          [
            _cache[10] || (_cache[10] = createBaseVNode(
              "label",
              {
                for: "book.version",
                class: "form-label"
              },
              "バージョン",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "input",
              {
                type: "text",
                id: "book.version",
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef$1(v_version) ? v_version.value = $event : null),
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_version).valid }]),
                onInput: subscribe,
                placeholder: "1.0.0 など",
                "aria-label": "バージョン",
                "aria-describedby": "version"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_version)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_version))
            }, null, 8, _hoisted_4$6)
          ],
          2
          /* CLASS */
        ),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_max_len).valid }])
          },
          [
            _cache[11] || (_cache[11] = createBaseVNode(
              "label",
              {
                for: "book.max_len",
                class: "form-label"
              },
              "ログ保存長",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "input",
              {
                type: "number",
                id: "book.max_len",
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef$1(v_max_len) ? v_max_len.value = $event : null),
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_max_len).valid }]),
                onInput: subscribe,
                placeholder: "何ページ分保存するか",
                "aria-label": "ログ保存長",
                "aria-describedby": "Log retention length"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_max_len)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_max_len))
            }, null, 8, _hoisted_5$6)
          ],
          2
          /* CLASS */
        ),
        _cache[16] || (_cache[16] = createBaseVNode(
          "div",
          { class: "col-12 px-1 pt-3" },
          [
            createBaseVNode("h5", null, "初期値")
          ],
          -1
          /* HOISTED */
        )),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_tagch_msecwait).valid }])
          },
          [
            _cache[12] || (_cache[12] = createBaseVNode(
              "label",
              {
                for: "book.tagch_msecwait",
                class: "form-label"
              },
              "文字表示待ち時間(ms)",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "input",
              {
                type: "number",
                id: "book.tagch_msecwait",
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => isRef$1(v_tagch_msecwait) ? v_tagch_msecwait.value = $event : null),
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_tagch_msecwait).valid }]),
                onInput: subscribe,
                placeholder: "ミリ秒単位で指定",
                "aria-label": "文字表示待ち時間(ms)",
                "aria-describedby": "Character display waiting time"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_tagch_msecwait)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_tagch_msecwait))
            }, null, 8, _hoisted_6$6)
          ],
          2
          /* CLASS */
        ),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_auto_msecpagewait).valid }])
          },
          [
            _cache[13] || (_cache[13] = createBaseVNode(
              "label",
              {
                for: "book.auto_msecpagewait",
                class: "form-label"
              },
              "自動読み時文字表示待ち(ms)",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "input",
              {
                type: "number",
                id: "book.auto_msecpagewait",
                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef$1(v_auto_msecpagewait) ? v_auto_msecpagewait.value = $event : null),
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_auto_msecpagewait).valid }]),
                onInput: subscribe,
                placeholder: "ミリ秒単位で指定",
                "aria-label": "自動読み時文字表示待ち時間(ms)",
                "aria-describedby": "Waiting time for character display during automatic reading"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_auto_msecpagewait)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_auto_msecpagewait))
            }, null, 8, _hoisted_7$5)
          ],
          2
          /* CLASS */
        ),
        createBaseVNode(
          "div",
          {
            class: normalizeClass(["col-6 col-sm-3 px-1 py-2", { "was-validated": unref(mv_escape).valid }])
          },
          [
            _cache[14] || (_cache[14] = createBaseVNode(
              "label",
              {
                for: "book.escape",
                class: "form-label"
              },
              "エスケープ文字",
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "input",
              {
                type: "text",
                id: "book.escape",
                "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => isRef$1(v_escape) ? v_escape.value = $event : null),
                class: normalizeClass(["form-control form-control-sm", { "is-invalid": !unref(mv_escape).valid }]),
                onInput: subscribe,
                placeholder: "半角記号推奨",
                "aria-label": "エスケープ文字",
                "aria-describedby": "Escape character"
              },
              null,
              34
              /* CLASS, NEED_HYDRATION */
            ), [
              [vModelText, unref(v_escape)]
            ]),
            createBaseVNode("div", {
              class: "invalid-feedback",
              textContent: toDisplayString(unref(em_escape))
            }, null, 8, _hoisted_8$5)
          ],
          2
          /* CLASS */
        ),
        createBaseVNode("div", _hoisted_9$5, [
          _cache[15] || (_cache[15] = createBaseVNode(
            "label",
            {
              for: "book.bg_color",
              class: "form-label"
            },
            "背景色",
            -1
            /* HOISTED */
          )),
          withDirectives(createBaseVNode(
            "input",
            {
              type: "color",
              id: "book.bg_color",
              "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => isRef$1(v_bg_color) ? v_bg_color.value = $event : null),
              class: "form-control form-control-sm form-control-color",
              onInput: subscribe,
              "aria-label": "背景色",
              "aria-describedby": "Background color"
            },
            null,
            544
            /* NEED_HYDRATION, NEED_PATCH */
          ), [
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
            return { nm, val: toRaw$1(val) };
          case "rng":
            return { nm, val: String(num) };
          case "chk":
            return { nm, val: String(bol) };
          default:
            return { nm, val: toRaw$1(val) };
        }
      })
    }));
    on$1("update.aTemp", ({ aTemp, err }) => {
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
        (openBlock(true), createElementBlock(
          Fragment$1,
          null,
          renderList(unref(aTemp), ({ id, lbl, type, num, max, min, step }, i) => {
            return openBlock(), createBlock(
              unref(Form),
              {
                key: i,
                class: "col-6 col-sm-3 px-1 pb-2"
              },
              {
                default: withCtx(({ meta }) => [
                  type === "chk" ? (openBlock(), createElementBlock("div", _hoisted_3$5, [
                    withDirectives(createBaseVNode("input", mergeProps({
                      type: "checkbox",
                      "onUpdate:modelValue": ($event) => unref(aTemp)[i].bol = $event,
                      ref_for: true
                    }, { id }, { class: "form-check-input mb-3 sn_checkbox" }), null, 16, _hoisted_4$5), [
                      [vModelCheckbox, unref(aTemp)[i].bol]
                    ]),
                    createBaseVNode("label", {
                      class: "form-check-label",
                      for: id,
                      textContent: toDisplayString(lbl)
                    }, null, 8, _hoisted_5$5)
                  ])) : type === "rng" ? (openBlock(), createElementBlock("div", _hoisted_6$5, [
                    createBaseVNode(
                      "div",
                      {
                        class: "range-badge range-badge-down",
                        style: normalizeStyle({ left: unref(getLeftRangeBadge)(num, max, min) })
                      },
                      [
                        createBaseVNode("span", {
                          textContent: toDisplayString(unref(aTemp)[i].num)
                        }, null, 8, _hoisted_7$4)
                      ],
                      4
                      /* STYLE */
                    ),
                    createBaseVNode("label", {
                      for: id,
                      class: "form-label",
                      textContent: toDisplayString(lbl)
                    }, null, 8, _hoisted_8$4),
                    withDirectives(createBaseVNode("input", mergeProps({
                      type: "range",
                      "onUpdate:modelValue": ($event) => unref(aTemp)[i].num = $event,
                      ref_for: true
                    }, { id, max, min, step }, { class: "form-range my-1" }), null, 16, _hoisted_9$4), [
                      [vModelText, unref(aTemp)[i].num]
                    ])
                  ])) : (openBlock(), createElementBlock(
                    "div",
                    {
                      key: 2,
                      class: normalizeClass({ "was-validated": meta.valid })
                    },
                    [
                      createBaseVNode("label", {
                        for: id,
                        class: "form-label",
                        textContent: toDisplayString(lbl)
                      }, null, 8, _hoisted_10$4),
                      createVNode(unref(Field), mergeProps({
                        modelValue: unref(aTemp)[i].val,
                        "onUpdate:modelValue": ($event) => unref(aTemp)[i].val = $event,
                        ref_for: true
                      }, { id, name: id, type: type === "num" ? "number" : "text", placeholder: lbl }, {
                        class: ["form-control form-control-sm", { "is-invalid": !meta.valid }],
                        rules: isRequired
                      }), null, 16, ["modelValue", "onUpdate:modelValue", "class"]),
                      createVNode(unref(ErrorMessage), {
                        name: id,
                        class: "invalid-feedback"
                      }, null, 8, ["name"])
                    ],
                    2
                    /* CLASS */
                  ))
                ]),
                _: 2
                /* DYNAMIC */
              },
              1024
              /* DYNAMIC_SLOTS */
            );
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]));
    };
  }
});

const _hoisted_1$4 = { class: "row" };
const _hoisted_2$4 = { class: "col-4 col-sm-3 col-lg-2 col-xxl-1" };
const _hoisted_3$4 = { class: "form-check" };
const _hoisted_4$4 = ["id", "onUpdate:modelValue"];
const _hoisted_5$4 = ["textContent"];
const _hoisted_6$4 = { class: "col-4 col-sm-3 col-lg-2 col-xxl-1" };
const _hoisted_7$3 = { class: "form-check" };
const _hoisted_8$3 = ["id", "onUpdate:modelValue"];
const _hoisted_9$3 = ["for", "textContent"];
const _hoisted_10$3 = { class: "col-6 col-sm-6 px-1 py-2" };
const _hoisted_11$3 = { class: "form-check" };
const _hoisted_12$3 = { class: "input-group input-group-sm" };
const _hoisted_13$3 = { class: "col-6 col-sm-6 px-1 py-2" };
const _hoisted_14$3 = { class: "form-check" };
const _hoisted_15$3 = { class: "input-group input-group-sm" };
const _hoisted_16$3 = { class: "col-6 col-sm-6 px-1 py-2" };
const _hoisted_17$3 = { class: "form-check" };
const _hoisted_18$2 = { class: "input-group input-group-sm" };
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "StgDebug",
  setup(__props) {
    const stCfg = useCfg();
    const { oCfg } = storeToRefs(stCfg);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$4, [
        _cache[9] || (_cache[9] = createBaseVNode(
          "div",
          { class: "col-12 px-1 pt-3" },
          [
            createBaseVNode("h5", null, "暗号化しないフォルダ")
          ],
          -1
          /* HOISTED */
        )),
        (openBlock(true), createElementBlock(
          Fragment$1,
          null,
          renderList(unref(oCfg).code, (_v, nm) => {
            return openBlock(), createElementBlock("div", _hoisted_2$4, [
              createBaseVNode("div", _hoisted_3$4, [
                withDirectives(createBaseVNode("input", {
                  id: "code." + nm,
                  class: "form-check-input mb-3 sn_checkbox",
                  type: "checkbox",
                  "onUpdate:modelValue": ($event) => unref(oCfg).code[nm] = $event
                }, null, 8, _hoisted_4$4), [
                  [vModelCheckbox, unref(oCfg).code[nm]]
                ]),
                createBaseVNode("label", {
                  class: "form-check-label",
                  textContent: toDisplayString(nm)
                }, null, 8, _hoisted_5$4)
              ])
            ]);
          }),
          256
          /* UNKEYED_FRAGMENT */
        )),
        _cache[10] || (_cache[10] = createBaseVNode(
          "div",
          { class: "col-12 px-1 pt-3" },
          [
            createBaseVNode("h5", null, "デバッグスイッチ")
          ],
          -1
          /* HOISTED */
        )),
        (openBlock(true), createElementBlock(
          Fragment$1,
          null,
          renderList(unref(oCfg).debug, (_v, nm) => {
            return openBlock(), createElementBlock("div", _hoisted_6$4, [
              createBaseVNode("div", _hoisted_7$3, [
                withDirectives(createBaseVNode("input", {
                  id: "debug." + nm,
                  class: "form-check-input mb-3 sn_checkbox",
                  type: "checkbox",
                  "onUpdate:modelValue": ($event) => unref(oCfg).debug[nm] = $event
                }, null, 8, _hoisted_8$3), [
                  [vModelCheckbox, unref(oCfg).debug[nm]]
                ]),
                createBaseVNode("label", {
                  class: "form-check-label",
                  for: "debug." + nm,
                  textContent: toDisplayString(nm)
                }, null, 8, _hoisted_9$3)
              ])
            ]);
          }),
          256
          /* UNKEYED_FRAGMENT */
        )),
        _cache[11] || (_cache[11] = createBaseVNode(
          "div",
          { class: "col-12 px-1 pt-3" },
          [
            createBaseVNode("h5", null, "セーブデータ保存先を開く")
          ],
          -1
          /* HOISTED */
        )),
        createBaseVNode("div", _hoisted_10$3, [
          createBaseVNode("form", _hoisted_11$3, [
            _cache[4] || (_cache[4] = createBaseVNode(
              "label",
              {
                class: "form-label",
                for: "open.dev.save_path"
              },
              "参考資料：開発者向け情報",
              -1
              /* HOISTED */
            )),
            createBaseVNode("div", _hoisted_12$3, [
              _cache[3] || (_cache[3] = createBaseVNode(
                "span",
                { class: "input-group-text" },
                "【セーブデータの保存場所】",
                -1
                /* HOISTED */
              )),
              createBaseVNode("button", {
                class: "btn btn-info btn-lg",
                type: "button",
                id: "open.dev.save_path",
                onClick: _cache[0] || (_cache[0] = ($event) => unref(openURL)("https://famibee.github.io/SKYNovel/dev.html#save_path"))
              }, "Open")
            ])
          ])
        ]),
        _cache[12] || (_cache[12] = createStaticVNode('<div class="col-6 col-sm-6 px-1 py-2"><form class="form-check"><label class="form-label">ブラウザ版</label><div class="input-group input-group-sm"><span class="input-group-text">ブラウザのローカルストレージに保存されます</span></div></form></div>', 1)),
        createBaseVNode("div", _hoisted_13$3, [
          createBaseVNode("form", _hoisted_14$3, [
            _cache[6] || (_cache[6] = createBaseVNode(
              "label",
              {
                class: "form-label",
                for: "copy.folder_save_app"
              },
              "アプリ版（通常実行）",
              -1
              /* HOISTED */
            )),
            createBaseVNode("div", _hoisted_15$3, [
              _cache[5] || (_cache[5] = createBaseVNode(
                "span",
                { class: "input-group-text" },
                "手動で開いて下さい",
                -1
                /* HOISTED */
              )),
              createBaseVNode("button", {
                class: "btn btn-info",
                type: "button",
                id: "copy.folder_save_app",
                onClick: _cache[1] || (_cache[1] = ($event) => unref(copyTxt)("copy.folder_save_app"))
              }, "Copy Path")
            ])
          ])
        ]),
        createBaseVNode("div", _hoisted_16$3, [
          createBaseVNode("form", _hoisted_17$3, [
            _cache[8] || (_cache[8] = createBaseVNode(
              "label",
              {
                class: "form-label",
                for: "open.folder_save_dbg"
              },
              "アプリ版（デバッグ実行）",
              -1
              /* HOISTED */
            )),
            createBaseVNode("div", _hoisted_18$2, [
              _cache[7] || (_cache[7] = createBaseVNode(
                "span",
                { class: "input-group-text" },
                ".vscode/storage/",
                -1
                /* HOISTED */
              )),
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
    on$1("update.cnvFont", ({ aCnvFont }) => st.setACnvFont(aCnvFont));
    on$1("update.optImg", ({ oOptImg }) => st.setOptImg(oOptImg));
    on$1("update.optSnd", ({ oOptSnd }) => st.setOptSnd(oOptSnd));
  }
  return st;
};

(()=>{var t={792:(t,e,i)=>{i.d(e,{Z:()=>n});var s=i(609),o=i.n(s)()((function(t){return t[1]}));o.push([t.id,':host{--divider-width: 1px;--divider-color: #fff;--divider-shadow: none;--default-handle-width: 50px;--default-handle-color: #fff;--default-handle-opacity: 1;--default-handle-shadow: none;--handle-position-start: 50%;position:relative;display:inline-block;overflow:hidden;line-height:0;direction:ltr}@media screen and (-webkit-min-device-pixel-ratio: 0)and (min-resolution: 0.001dpcm){:host{outline-offset:1px}}:host(:focus){outline:2px solid -webkit-focus-ring-color}::slotted(*){-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.first{position:absolute;left:0;top:0;right:0;line-height:normal;font-size:100%;max-height:100%;height:100%;width:100%;--exposure: 50%;--keyboard-transition-time: 0ms;--default-transition-time: 0ms;--transition-time: var(--default-transition-time)}.first .first-overlay-container{position:relative;clip-path:inset(0 var(--exposure) 0 0);transition:clip-path var(--transition-time);height:100%}.first .first-overlay{overflow:hidden;height:100%}.first.focused{will-change:clip-path}.first.focused .first-overlay-container{will-change:clip-path}.second{position:relative}.handle-container{transform:translateX(50%);position:absolute;top:0;right:var(--exposure);height:100%;transition:right var(--transition-time),bottom var(--transition-time)}.focused .handle-container{will-change:right}.divider{position:absolute;height:100%;width:100%;left:0;top:0;display:flex;align-items:center;justify-content:center;flex-direction:column}.divider:after{content:" ";display:block;height:100%;border-left-width:var(--divider-width);border-left-style:solid;border-left-color:var(--divider-color);box-shadow:var(--divider-shadow)}.handle{position:absolute;top:var(--handle-position-start);pointer-events:none;box-sizing:border-box;margin-left:1px;transform:translate(calc(-50% - 0.5px), -50%);line-height:0}.default-handle{width:var(--default-handle-width);opacity:var(--default-handle-opacity);transition:all 1s;filter:drop-shadow(var(--default-handle-shadow))}.default-handle path{stroke:var(--default-handle-color)}.vertical .first-overlay-container{clip-path:inset(0 0 var(--exposure) 0)}.vertical .handle-container{transform:translateY(50%);height:auto;top:unset;bottom:var(--exposure);width:100%;left:0;flex-direction:row}.vertical .divider:after{height:1px;width:100%;border-top-width:var(--divider-width);border-top-style:solid;border-top-color:var(--divider-color);border-left:0}.vertical .handle{top:auto;left:var(--handle-position-start);transform:translate(calc(-50% - 0.5px), -50%) rotate(90deg)}',""]);const n=o;},609:t=>{t.exports=function(t){var e=[];return e.toString=function(){return this.map((function(e){var i=t(e);return e[2]?"@media ".concat(e[2]," {").concat(i,"}"):i})).join("")},e.i=function(t,i,s){"string"==typeof t&&(t=[[null,t,""]]);var o={};if(s)for(var n=0;n<this.length;n++){var r=this[n][0];null!=r&&(o[r]=!0);}for(var a=0;a<t.length;a++){var d=[].concat(t[a]);s&&o[d[0]]||(i&&(d[2]?d[2]="".concat(i," and ").concat(d[2]):d[2]=i),e.push(d));}},e};}},e={};function i(s){var o=e[s];if(void 0!==o)return o.exports;var n=e[s]={id:s,exports:{}};return t[s](n,n.exports,i),n.exports}i.n=t=>{var e=t&&t.__esModule?()=>t.default:()=>t;return i.d(e,{a:e}),e},i.d=(t,e)=>{for(var s in e)i.o(e,s)&&!i.o(t,s)&&Object.defineProperty(t,s,{enumerable:!0,get:e[s]});},i.o=(t,e)=>Object.prototype.hasOwnProperty.call(t,e),(()=>{var t=i(792);const e="rendered",s=(t,e)=>{const i=t.getBoundingClientRect();let s,o;return "mousedown"===e.type?(s=e.clientX,o=e.clientY):(s=e.touches[0].clientX,o=e.touches[0].clientY),s>=i.x&&s<=i.x+i.width&&o>=i.y&&o<=i.y+i.height};let o;const n={ArrowLeft:-1,ArrowRight:1},r=["horizontal","vertical"],a=t=>({x:t.touches[0].pageX,y:t.touches[0].pageY}),d=t=>({x:t.pageX,y:t.pageY}),h="undefined"!=typeof window&&(null===window||void 0===window?void 0:window.HTMLElement);"undefined"!=typeof window&&(window.document&&(o=document.createElement("template"),o.innerHTML='<div class="second" id="second"> <slot name="second"><slot name="before"></slot></slot> </div> <div class="first" id="first"> <div class="first-overlay"> <div class="first-overlay-container" id="firstImageContainer"> <slot name="first"><slot name="after"></slot></slot> </div> </div> <div class="handle-container"> <div class="divider"></div> <div class="handle" id="handle"> <slot name="handle"> <svg xmlns="http://www.w3.org/2000/svg" class="default-handle" viewBox="-8 -3 16 6"> <path d="M -5 -2 L -7 0 L -5 2 M 5 -2 L 7 0 L 5 2" fill="none" vector-effect="non-scaling-stroke"/> </svg> </slot> </div> </div> </div> '),window.customElements.define("img-comparison-slider",class extends h{constructor(){super(),this.exposure=this.hasAttribute("value")?parseFloat(this.getAttribute("value")):50,this.slideOnHover=!1,this.slideDirection="horizontal",this.keyboard="enabled",this.isMouseDown=!1,this.animationDirection=0,this.isFocused=!1,this.dragByHandle=!1,this.onMouseMove=t=>{if(this.isMouseDown||this.slideOnHover){const e=d(t);this.slideToPage(e);}},this.bodyUserSelectStyle="",this.bodyWebkitUserSelectStyle="",this.onMouseDown=t=>{if(this.slideOnHover)return;if(this.handle&&!s(this.handleElement,t))return;t.preventDefault(),window.addEventListener("mousemove",this.onMouseMove),window.addEventListener("mouseup",this.onWindowMouseUp),this.isMouseDown=!0,this.enableTransition();const e=d(t);this.slideToPage(e),this.focus(),this.bodyUserSelectStyle=window.document.body.style.userSelect,this.bodyWebkitUserSelectStyle=window.document.body.style.webkitUserSelect,window.document.body.style.userSelect="none",window.document.body.style.webkitUserSelect="none";},this.onWindowMouseUp=()=>{this.isMouseDown=!1,window.document.body.style.userSelect=this.bodyUserSelectStyle,window.document.body.style.webkitUserSelect=this.bodyWebkitUserSelectStyle,window.removeEventListener("mousemove",this.onMouseMove),window.removeEventListener("mouseup",this.onWindowMouseUp);},this.touchStartPoint=null,this.isTouchComparing=!1,this.hasTouchMoved=!1,this.onTouchStart=t=>{this.dragByHandle&&!s(this.handleElement,t)||(this.touchStartPoint=a(t),this.isFocused&&(this.enableTransition(),this.slideToPage(this.touchStartPoint)));},this.onTouchMove=t=>{if(null===this.touchStartPoint)return;const e=a(t);if(this.isTouchComparing)return this.slideToPage(e),t.preventDefault(),!1;if(!this.hasTouchMoved){const i=Math.abs(e.y-this.touchStartPoint.y),s=Math.abs(e.x-this.touchStartPoint.x);if("horizontal"===this.slideDirection&&i<s||"vertical"===this.slideDirection&&i>s)return this.isTouchComparing=!0,this.focus(),this.slideToPage(e),t.preventDefault(),!1;this.hasTouchMoved=!0;}},this.onTouchEnd=()=>{this.isTouchComparing=!1,this.hasTouchMoved=!1,this.touchStartPoint=null;},this.onBlur=()=>{this.stopSlideAnimation(),this.isFocused=!1,this.firstElement.classList.remove("focused");},this.onFocus=()=>{this.isFocused=!0,this.firstElement.classList.add("focused");},this.onKeyDown=t=>{if("disabled"===this.keyboard)return;const e=n[t.key];this.animationDirection!==e&&void 0!==e&&(this.animationDirection=e,this.startSlideAnimation());},this.onKeyUp=t=>{if("disabled"===this.keyboard)return;const e=n[t.key];void 0!==e&&this.animationDirection===e&&this.stopSlideAnimation();},this.resetDimensions=()=>{this.imageWidth=this.offsetWidth,this.imageHeight=this.offsetHeight;};const e=this.attachShadow({mode:"open"}),i=document.createElement("style");i.innerHTML=t.Z,this.getAttribute("nonce")&&i.setAttribute("nonce",this.getAttribute("nonce")),e.appendChild(i),e.appendChild(o.content.cloneNode(!0)),this.firstElement=e.getElementById("first"),this.handleElement=e.getElementById("handle");}set handle(t){this.dragByHandle="false"!==t.toString().toLowerCase();}get handle(){return this.dragByHandle}get value(){return this.exposure}set value(t){const e=parseFloat(t);e!==this.exposure&&(this.exposure=e,this.enableTransition(),this.setExposure());}get hover(){return this.slideOnHover}set hover(t){this.slideOnHover="false"!==t.toString().toLowerCase(),this.removeEventListener("mousemove",this.onMouseMove),this.slideOnHover&&this.addEventListener("mousemove",this.onMouseMove);}get direction(){return this.slideDirection}set direction(t){this.slideDirection=t.toString().toLowerCase(),this.slide(0),this.firstElement.classList.remove(...r),r.includes(this.slideDirection)&&this.firstElement.classList.add(this.slideDirection);}static get observedAttributes(){return ["hover","direction"]}connectedCallback(){this.hasAttribute("tabindex")||(this.tabIndex=0),this.addEventListener("dragstart",(t=>(t.preventDefault(),!1))),new ResizeObserver(this.resetDimensions).observe(this),this.setExposure(0),this.keyboard=this.hasAttribute("keyboard")&&"disabled"===this.getAttribute("keyboard")?"disabled":"enabled",this.addEventListener("keydown",this.onKeyDown),this.addEventListener("keyup",this.onKeyUp),this.addEventListener("focus",this.onFocus),this.addEventListener("blur",this.onBlur),this.addEventListener("touchstart",this.onTouchStart,{passive:!0}),this.addEventListener("touchmove",this.onTouchMove,{passive:!1}),this.addEventListener("touchend",this.onTouchEnd),this.addEventListener("mousedown",this.onMouseDown),this.handle=this.hasAttribute("handle")?this.getAttribute("handle"):this.dragByHandle,this.hover=this.hasAttribute("hover")?this.getAttribute("hover"):this.slideOnHover,this.direction=this.hasAttribute("direction")?this.getAttribute("direction"):this.slideDirection,this.resetDimensions(),this.classList.contains(e)||this.classList.add(e);}disconnectedCallback(){this.transitionTimer&&window.clearTimeout(this.transitionTimer);}attributeChangedCallback(t,e,i){"hover"===t&&(this.hover=i),"direction"===t&&(this.direction=i),"keyboard"===t&&(this.keyboard="disabled"===i?"disabled":"enabled");}setExposure(t=0){var e;this.exposure=((e=this.exposure+t)<0?0:e>100?100:e),this.firstElement.style.setProperty("--exposure",100-this.exposure+"%");}slide(t=0){this.setExposure(t);const e=new Event("slide");this.dispatchEvent(e);}slideToPage(t){"horizontal"===this.slideDirection&&this.slideToPageX(t.x),"vertical"===this.slideDirection&&this.slideToPageY(t.y);}slideToPageX(t){const e=t-this.getBoundingClientRect().left-window.scrollX;this.exposure=e/this.imageWidth*100,this.slide(0);}slideToPageY(t){const e=t-this.getBoundingClientRect().top-window.scrollY;this.exposure=e/this.imageHeight*100,this.slide(0);}enableTransition(){this.firstElement.style.setProperty("--transition-time","100ms"),this.transitionTimer=window.setTimeout((()=>{this.firstElement.style.setProperty("--transition-time","var(--default-transition-time)"),this.transitionTimer=null;}),100);}startSlideAnimation(){let t=null,e=this.animationDirection;this.firstElement.style.setProperty("--transition-time","var(--keyboard-transition-time)");const i=s=>{if(0===this.animationDirection||e!==this.animationDirection)return;null===t&&(t=s);const o=(s-t)/16.666666666666668*this.animationDirection;this.slide(o),setTimeout((()=>window.requestAnimationFrame(i)),0),t=s;};window.requestAnimationFrame(i);}stopSlideAnimation(){this.animationDirection=0,this.firstElement.style.setProperty("--transition-time","var(--default-transition-time)");}}));})();})();

const ImgComparisonSlider = defineComponent({
    name: 'ImgComparisonSlider',
    setup(_, { slots }) {
        return () => h('img-comparison-slider', slots.default());
    },
});

const _hoisted_1$3 = { class: "col-6 col-sm-4 px-2" };
const _hoisted_2$3 = { class: "form-check form-switch py-2" };
const _hoisted_3$3 = ["disabled"];
const _hoisted_4$3 = { class: "col-6 col-sm-3 px-1" };
const _hoisted_5$3 = { class: "range-wrap" };
const _hoisted_6$3 = ["textContent"];
const _hoisted_7$2 = ["disabled"];
const _hoisted_8$2 = {
  key: 0,
  class: "col-6 col-sm-5 px-1"
};
const _hoisted_9$2 = { class: "table table-striped" };
const _hoisted_10$2 = ["textContent"];
const _hoisted_11$2 = ["textContent"];
const _hoisted_12$2 = ["textContent"];
const _hoisted_13$2 = {
  key: 1,
  class: "col-12 px-1"
};
const _hoisted_14$2 = {
  id: "clpMatCnv",
  class: "accordion-collapse"
};
const _hoisted_15$2 = { class: "accordion-body p-0 tbody_scroll" };
const _hoisted_16$2 = {
  id: "tblMatCnv",
  class: "table table-striped table-hover accordion bg-secondary"
};
const _hoisted_17$2 = ["href", "data-bs-target", "aria-controls"];
const _hoisted_18$1 = ["textContent"];
const _hoisted_19$1 = ["textContent"];
const _hoisted_20$1 = ["textContent"];
const _hoisted_21$1 = ["textContent"];
const _hoisted_22$1 = ["textContent"];
const _hoisted_23$1 = ["id", "aria-labelledby"];
const _hoisted_24$1 = {
  colspan: "4",
  class: "accordion-body"
};
const _hoisted_25$1 = { class: "row" };
const _hoisted_26$1 = { class: "col-6 col-sm-4 px-2" };
const _hoisted_27$1 = { class: "form-check form-switch py-2" };
const _hoisted_28$1 = ["id", "checked", "onChange", "disabled"];
const _hoisted_29$1 = ["for"];
const _hoisted_30$1 = { class: "col-6 col-sm-3 px-1" };
const _hoisted_31$1 = { class: "range-wrap" };
const _hoisted_32 = ["textContent"];
const _hoisted_33 = ["onUpdate:modelValue", "disabled", "onChange"];
const _hoisted_34 = { class: "col-12 px-1" };
const _hoisted_35 = { class: "position-relative d-flex justify-content-evenly" };
const _hoisted_36 = ["src"];
const _hoisted_37 = ["src"];
const _hoisted_38 = ["textContent"];
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "StgImgOpt",
  setup(__props) {
    const stOInfo = useOInfo();
    const { oOptImg } = storeToRefs(stOInfo);
    const sortHSize = () => Object.entries(oOptImg.value.hSize).map(([nm, v], i) => ({ key: i, nm, id: "acdMC" + nm.replaceAll(".", "_"), ...v })).sort((a, b) => a.nm < b.nm ? -1 : 1);
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
      if (no_def) oOptImg.value.hSize[e.nm].webp_q = webp_q;
      else delete oOptImg.value.hSize[e.nm].webp_q;
      const q = { cmd: "change.range.webp_q", nm: e.nm, no_def, webp_q };
      cmd2Ex(q);
    };
    const chgRangeWebpQ = (el, e) => {
      const q = { cmd: "change.range.webp_q", nm: e.nm, no_def: true, webp_q: Number(el.target.value) };
      cmd2Ex(q);
    };
    const updImg = (src) => src + "?" + (/* @__PURE__ */ new Date()).getTime();
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(
        Fragment$1,
        null,
        [
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
              _cache[3] || (_cache[3] = createBaseVNode(
                "label",
                {
                  for: "cnv.mat.pic",
                  class: "form-check-label"
                },
                "jpg・png を WebP に変換",
                -1
                /* HOISTED */
              ))
            ])
          ]),
          createBaseVNode("div", _hoisted_4$3, [
            createBaseVNode("div", _hoisted_5$3, [
              createBaseVNode(
                "div",
                {
                  class: "range-badge range-badge-down",
                  style: normalizeStyle({ left: unref(getLeftRangeBadge)(unref(oWss)["cnv.mat.webp_quality"], 100, 5) })
                },
                [
                  createBaseVNode("span", {
                    textContent: toDisplayString(unref(oWss)["cnv.mat.webp_quality"])
                  }, null, 8, _hoisted_6$3)
                ],
                4
                /* STYLE */
              ),
              _cache[4] || (_cache[4] = createBaseVNode(
                "label",
                {
                  for: "cnv.mat.webp_quality",
                  class: "form-label"
                },
                "基本の変換画質",
                -1
                /* HOISTED */
              )),
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
              }, null, 40, _hoisted_7$2), [
                [vModelText, unref(oWss)["cnv.mat.webp_quality"]]
              ])
            ])
          ]),
          unref(oOptImg).sum.baseSize > 0 ? (openBlock(), createElementBlock("div", _hoisted_8$2, [
            createBaseVNode("table", _hoisted_9$2, [
              _cache[5] || (_cache[5] = createBaseVNode(
                "thead",
                null,
                [
                  createBaseVNode("tr", null, [
                    createBaseVNode("th", null, "元画像サイズ合計"),
                    createBaseVNode("th", null, "webp変換後"),
                    createBaseVNode("th", null, "削減率")
                  ])
                ],
                -1
                /* HOISTED */
              )),
              createBaseVNode("tbody", null, [
                createBaseVNode("tr", null, [
                  createBaseVNode("td", {
                    style: { "text-align": "right" },
                    textContent: toDisplayString(unref(oOptImg).sum.baseSize.toLocaleString("ja-JP") + " byte")
                  }, null, 8, _hoisted_10$2),
                  createBaseVNode("td", {
                    style: { "text-align": "right" },
                    textContent: toDisplayString(unref(oOptImg).sum.webpSize.toLocaleString("ja-JP") + " byte")
                  }, null, 8, _hoisted_11$2),
                  createBaseVNode("td", {
                    textContent: toDisplayString((unref(oOptImg).sum.webpSize / unref(oOptImg).sum.baseSize).toLocaleString("ja-JP"))
                  }, null, 8, _hoisted_12$2)
                ])
              ])
            ])
          ])) : createCommentVNode("v-if", true),
          unref(oOptImg).sum.baseSize > 0 ? (openBlock(), createElementBlock("div", _hoisted_13$2, [
            createBaseVNode("div", null, [
              createBaseVNode("div", _hoisted_14$2, [
                createBaseVNode("div", _hoisted_15$2, [
                  createBaseVNode("table", _hoisted_16$2, [
                    _cache[8] || (_cache[8] = createBaseVNode(
                      "thead",
                      { class: "sticky-top" },
                      [
                        createBaseVNode("tr", null, [
                          createBaseVNode("th", null, "ファイル名"),
                          createBaseVNode("th", null, "変換画質"),
                          createBaseVNode("th", { style: { "text-align": "right" } }, "元画像サイズ"),
                          createBaseVNode("th", { style: { "text-align": "right" } }, "webp変換後"),
                          createBaseVNode("th", null, "削減率")
                        ])
                      ],
                      -1
                      /* HOISTED */
                    )),
                    createBaseVNode("tbody", null, [
                      (openBlock(true), createElementBlock(
                        Fragment$1,
                        null,
                        renderList(sortHSize(), (e) => {
                          return openBlock(), createElementBlock(
                            Fragment$1,
                            {
                              key: e.key
                            },
                            [
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
                                }, null, 8, _hoisted_18$1),
                                createBaseVNode("td", {
                                  textContent: toDisplayString(e.webp_q ?? `${unref(oWss)["cnv.mat.webp_quality"]} (基本の値)`)
                                }, null, 8, _hoisted_19$1),
                                createBaseVNode("td", {
                                  style: { "text-align": "right" },
                                  textContent: toDisplayString(e.baseSize.toLocaleString("ja-JP") + " byte")
                                }, null, 8, _hoisted_20$1),
                                createBaseVNode("td", {
                                  style: { "text-align": "right" },
                                  textContent: toDisplayString(e.webpSize.toLocaleString("ja-JP") + " byte")
                                }, null, 8, _hoisted_21$1),
                                createBaseVNode("td", {
                                  textContent: toDisplayString((e.webpSize / e.baseSize).toLocaleString("ja-JP"))
                                }, null, 8, _hoisted_22$1)
                              ], 8, _hoisted_17$2),
                              createBaseVNode("tr", {
                                id: e.id,
                                "data-bs-parent": "#tblMatCnv",
                                "aria-labelledby": e.id,
                                class: "accordion-collapse collapse"
                              }, [
                                createBaseVNode("td", _hoisted_24$1, [
                                  createBaseVNode("div", _hoisted_25$1, [
                                    createBaseVNode("div", _hoisted_26$1, [
                                      createBaseVNode("div", _hoisted_27$1, [
                                        createBaseVNode("input", {
                                          type: "checkbox",
                                          id: "cnv.mat.pic." + e.id,
                                          checked: e.webp_q !== void 0,
                                          onChange: ($event) => chkChg($event, e),
                                          disabled: unref(hDisabled)["cnv.mat.pic"],
                                          class: "form-check-input sn_checkbox sn-chk"
                                        }, null, 40, _hoisted_28$1),
                                        createBaseVNode("label", {
                                          for: "cnv.mat.pic." + e.id,
                                          class: "form-check-label text-white"
                                        }, "画質を個別設定", 8, _hoisted_29$1)
                                      ])
                                    ]),
                                    createBaseVNode("div", _hoisted_30$1, [
                                      createBaseVNode("div", _hoisted_31$1, [
                                        createBaseVNode(
                                          "div",
                                          {
                                            class: "range-badge",
                                            style: normalizeStyle({ left: unref(getLeftRangeBadge)(e.webp_q, 100, 5) })
                                          },
                                          [
                                            withDirectives(createBaseVNode("span", {
                                              textContent: toDisplayString(e.webp_q)
                                            }, null, 8, _hoisted_32), [
                                              [vShow, e.webp_q !== void 0]
                                            ])
                                          ],
                                          4
                                          /* STYLE */
                                        ),
                                        withDirectives(createBaseVNode("input", {
                                          type: "range",
                                          "onUpdate:modelValue": ($event) => unref(oOptImg).hSize[e.nm].webp_q = $event,
                                          max: "100",
                                          min: "5",
                                          step: "5",
                                          disabled: e.webp_q === void 0 || unref(hDisabled)["cnv.mat.pic"],
                                          onChange: ($event) => chgRangeWebpQ($event, e),
                                          class: "form-range my-1 sn-vld"
                                        }, null, 40, _hoisted_33), [
                                          [vModelText, unref(oOptImg).hSize[e.nm].webp_q]
                                        ])
                                      ])
                                    ]),
                                    createBaseVNode("div", _hoisted_34, [
                                      createBaseVNode("div", _hoisted_35, [
                                        createVNode(
                                          unref(ImgComparisonSlider),
                                          null,
                                          {
                                            default: withCtx(() => [
                                              createBaseVNode("img", {
                                                loading: "lazy",
                                                slot: "first",
                                                src: updImg(unref(oOptImg).sum.pathImgCmpWebP + e.fld_nm + ".webp")
                                              }, null, 8, _hoisted_36),
                                              createBaseVNode("img", {
                                                loading: "lazy",
                                                slot: "second",
                                                src: updImg(unref(oOptImg).sum.pathImgCmpBase + e.fld_nm + "." + e.ext)
                                              }, null, 8, _hoisted_37),
                                              _cache[6] || (_cache[6] = createBaseVNode(
                                                "svg",
                                                {
                                                  slot: "handle",
                                                  width: "100",
                                                  xmlns: "http://www.w3.org/2000/svg",
                                                  viewBox: "-8 -3 16 6"
                                                },
                                                [
                                                  createBaseVNode("path", {
                                                    stroke: "#fff",
                                                    d: "M -5 -2 L -7 0 L -5 2 M -5 -2 L -5 2 M 5 -2 L 7 0 L 5 2 M 5 -2 L 5 2",
                                                    "stroke-width": "2",
                                                    fill: "#ffa658",
                                                    "vector-effect": "non-scaling-stroke"
                                                  })
                                                ],
                                                -1
                                                /* HOISTED */
                                              ))
                                            ]),
                                            _: 2
                                            /* DYNAMIC */
                                          },
                                          1024
                                          /* DYNAMIC_SLOTS */
                                        ),
                                        _cache[7] || (_cache[7] = createBaseVNode(
                                          "button",
                                          {
                                            type: "button",
                                            class: "btn btn-light position-absolute top-50 start-0",
                                            disabled: ""
                                          },
                                          "WebP",
                                          -1
                                          /* HOISTED */
                                        )),
                                        createBaseVNode("button", {
                                          type: "button",
                                          class: "btn btn-light position-absolute bottom-50 end-0",
                                          textContent: toDisplayString(e.ext),
                                          disabled: ""
                                        }, null, 8, _hoisted_38)
                                      ])
                                    ])
                                  ])
                                ])
                              ], 8, _hoisted_23$1)
                            ],
                            64
                            /* STABLE_FRAGMENT */
                          );
                        }),
                        128
                        /* KEYED_FRAGMENT */
                      ))
                    ])
                  ])
                ])
              ])
            ])
          ])) : createCommentVNode("v-if", true)
        ],
        64
        /* STABLE_FRAGMENT */
      );
    };
  }
});

const _hoisted_1$2 = { class: "col-6 col-sm-4 px-2" };
const _hoisted_2$2 = { class: "form-check form-switch py-2" };
const _hoisted_3$2 = ["disabled"];
const _hoisted_4$2 = { class: "col-6 col-sm-3 px-1 sn_select" };
const _hoisted_5$2 = {
  key: 0,
  class: "col-6 col-sm-5 px-1"
};
const _hoisted_6$2 = { class: "table table-striped" };
const _hoisted_7$1 = ["textContent"];
const _hoisted_8$1 = ["textContent"];
const _hoisted_9$1 = ["textContent"];
const _hoisted_10$1 = {
  key: 1,
  class: "col-12 px-1"
};
const _hoisted_11$1 = { class: "p-0 tbody_scroll" };
const _hoisted_12$1 = { class: "table table-striped bg-secondary" };
const _hoisted_13$1 = ["href", "data-bs-target", "aria-controls"];
const _hoisted_14$1 = ["textContent"];
const _hoisted_15$1 = ["textContent"];
const _hoisted_16$1 = ["textContent"];
const _hoisted_17$1 = ["textContent"];
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "StgSndOpt",
  setup(__props) {
    const stOInfo = useOInfo();
    const { oOptSnd } = storeToRefs(stOInfo);
    const stWss = useWss();
    const { oWss } = storeToRefs(stWss);
    const sortHSize = () => Object.entries(oOptSnd.value.hSize).map(([nm, v], i) => ({ key: i, nm, id: "acdMC" + nm.replaceAll(".", "_"), ...v })).sort((a, b) => a.nm < b.nm ? -1 : 1);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(
        Fragment$1,
        null,
        [
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
              _cache[2] || (_cache[2] = createBaseVNode(
                "label",
                {
                  for: "cnv.mat.snd",
                  class: "form-check-label"
                },
                "mp3・wav をコーデック変換",
                -1
                /* HOISTED */
              ))
            ])
          ]),
          createBaseVNode("div", _hoisted_4$2, [
            _cache[4] || (_cache[4] = createBaseVNode(
              "label",
              {
                for: "cnv.mat.snd.codec",
                class: "form-label"
              },
              "音声コーデック",
              -1
              /* HOISTED */
            )),
            _cache[5] || (_cache[5] = createBaseVNode(
              "i",
              { class: "fas fa-angle-down sn_select_v" },
              null,
              -1
              /* HOISTED */
            )),
            withDirectives(createBaseVNode(
              "select",
              {
                id: "cnv.mat.snd.codec",
                class: "form-select form-select-sm mb-3",
                "aria-label": ".form-select-sm example",
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(oWss)["cnv.mat.snd.codec"] = $event)
              },
              _cache[3] || (_cache[3] = [
                createBaseVNode(
                  "option",
                  {
                    value: "opus",
                    selected: ""
                  },
                  "(.m4a) Opus",
                  -1
                  /* HOISTED */
                ),
                createBaseVNode(
                  "option",
                  { value: "aac" },
                  "(.aac) Advanced Audio Coding",
                  -1
                  /* HOISTED */
                ),
                createBaseVNode(
                  "option",
                  { value: "ogg" },
                  "(.ogg) Vorbis",
                  -1
                  /* HOISTED */
                )
              ]),
              512
              /* NEED_PATCH */
            ), [
              [vModelSelect, unref(oWss)["cnv.mat.snd.codec"]]
            ])
          ]),
          unref(oOptSnd).sum.baseSize > 0 ? (openBlock(), createElementBlock("div", _hoisted_5$2, [
            createBaseVNode("table", _hoisted_6$2, [
              _cache[6] || (_cache[6] = createBaseVNode(
                "thead",
                null,
                [
                  createBaseVNode("tr", null, [
                    createBaseVNode("th", null, "元音声サイズ合計"),
                    createBaseVNode("th", null, "変換後"),
                    createBaseVNode("th", null, "削減率")
                  ])
                ],
                -1
                /* HOISTED */
              )),
              createBaseVNode("tbody", null, [
                createBaseVNode("tr", null, [
                  createBaseVNode("td", {
                    style: { "text-align": "right" },
                    textContent: toDisplayString(unref(oOptSnd).sum.baseSize.toLocaleString("ja-JP") + " byte")
                  }, null, 8, _hoisted_7$1),
                  createBaseVNode("td", {
                    style: { "text-align": "right" },
                    textContent: toDisplayString(unref(oOptSnd).sum.optSize.toLocaleString("ja-JP") + " byte")
                  }, null, 8, _hoisted_8$1),
                  createBaseVNode("td", {
                    textContent: toDisplayString((unref(oOptSnd).sum.optSize / unref(oOptSnd).sum.baseSize).toLocaleString("ja-JP"))
                  }, null, 8, _hoisted_9$1)
                ])
              ])
            ])
          ])) : createCommentVNode("v-if", true),
          unref(oOptSnd).sum.baseSize > 0 ? (openBlock(), createElementBlock("div", _hoisted_10$1, [
            createBaseVNode("div", null, [
              createBaseVNode("div", null, [
                createBaseVNode("div", _hoisted_11$1, [
                  createBaseVNode("table", _hoisted_12$1, [
                    _cache[7] || (_cache[7] = createBaseVNode(
                      "thead",
                      { class: "sticky-top" },
                      [
                        createBaseVNode("tr", null, [
                          createBaseVNode("th", null, "ファイル名"),
                          createBaseVNode("th", { style: { "text-align": "right" } }, "元音声サイズ"),
                          createBaseVNode("th", { style: { "text-align": "right" } }, "変換後"),
                          createBaseVNode("th", null, "削減率")
                        ])
                      ],
                      -1
                      /* HOISTED */
                    )),
                    createBaseVNode("tbody", null, [
                      (openBlock(true), createElementBlock(
                        Fragment$1,
                        null,
                        renderList(sortHSize(), (e) => {
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
                            }, null, 8, _hoisted_14$1),
                            createBaseVNode("td", {
                              style: { "text-align": "right" },
                              textContent: toDisplayString(e.baseSize.toLocaleString("ja-JP") + " byte")
                            }, null, 8, _hoisted_15$1),
                            createBaseVNode("td", {
                              style: { "text-align": "right" },
                              textContent: toDisplayString(e.optSize.toLocaleString("ja-JP") + " byte")
                            }, null, 8, _hoisted_16$1),
                            createBaseVNode("td", {
                              textContent: toDisplayString((e.optSize / e.baseSize).toLocaleString("ja-JP"))
                            }, null, 8, _hoisted_17$1)
                          ], 8, _hoisted_13$1);
                        }),
                        128
                        /* KEYED_FRAGMENT */
                      ))
                    ])
                  ])
                ])
              ])
            ])
          ])) : createCommentVNode("v-if", true)
        ],
        64
        /* STABLE_FRAGMENT */
      );
    };
  }
});

const _hoisted_1$1 = { class: "row" };
const _hoisted_2$1 = { class: "col-6 col-sm-8 px-1 py-2" };
const _hoisted_3$1 = { class: "input-group input-group-sm" };
const _hoisted_4$1 = { class: "col-6 col-sm-4 px-1 py-2" };
const _hoisted_5$1 = { class: "form-check form-switch mb-1" };
const _hoisted_6$1 = ["disabled"];
const _hoisted_7 = { class: "col-12 px-1 py-3" };
const _hoisted_8 = { class: "table table-striped" };
const _hoisted_9 = ["textContent"];
const _hoisted_10 = ["textContent"];
const _hoisted_11 = ["textContent"];
const _hoisted_12 = ["textContent"];
const _hoisted_13 = ["textContent"];
const _hoisted_14 = ["onClick"];
const _hoisted_15 = { key: 0 };
const _hoisted_16 = ["textContent"];
const _hoisted_17 = { class: "container" };
const _hoisted_18 = { class: "row" };
const _hoisted_19 = { class: "col-6 col-lg-2 col-xxl-1" };
const _hoisted_20 = ["src"];
const _hoisted_21 = { class: "col-6 col-lg-2 col-xxl-1" };
const _hoisted_22 = { class: "row" };
const _hoisted_23 = { class: "col form-check mb-3" };
const _hoisted_24 = { class: "list-group" };
const _hoisted_25 = { class: "list-group-item" };
const _hoisted_26 = { class: "list-group-item" };
const _hoisted_27 = { class: "list-group-item" };
const _hoisted_28 = { class: "row" };
const _hoisted_29 = { class: "col form-check mb-3" };
const _hoisted_30 = { class: "input-group input-group-sm" };
const _hoisted_31 = ["textContent"];
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
    on$1("!", (data) => updIconImg(data.pathIcon));
    const select_icon_err = ref("");
    on$1("updimg", (data) => {
      updIconImg(data.pathIcon);
      select_icon_err.value = data.err_mes;
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createBaseVNode("div", _hoisted_2$1, [
          _cache[6] || (_cache[6] = createBaseVNode(
            "label",
            {
              for: "open.readme.txt",
              class: "form-label"
            },
            "readme.txtを開く",
            -1
            /* HOISTED */
          )),
          createBaseVNode("div", _hoisted_3$1, [
            _cache[5] || (_cache[5] = createBaseVNode(
              "span",
              { class: "input-group-text" },
              "【build/include/readme.txt】",
              -1
              /* HOISTED */
            )),
            createBaseVNode("button", {
              type: "button",
              id: "open.readme.txt",
              class: "btn btn-info btn-lg",
              onClick: _cache[0] || (_cache[0] = ($event) => unref(openURL)("ws-file:///build/include/readme.txt"))
            }, "Open")
          ])
        ]),
        createBaseVNode("div", _hoisted_4$1, [
          _cache[8] || (_cache[8] = createBaseVNode(
            "label",
            { class: "form-label" },
            "フォントサイズ最適化",
            -1
            /* HOISTED */
          )),
          createBaseVNode("div", _hoisted_5$1, [
            withDirectives(createBaseVNode("input", {
              type: "checkbox",
              id: "cnv.font.subset",
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(oWss)["cnv.font.subset"] = $event),
              disabled: unref(hDisabled)["cnv.font.subset"],
              class: "form-check-input sn_checkbox sn-chk"
            }, null, 8, _hoisted_6$1), [
              [vModelCheckbox, unref(oWss)["cnv.font.subset"]]
            ]),
            _cache[7] || (_cache[7] = createBaseVNode(
              "label",
              {
                for: "cnv.font.subset",
                class: "form-check-label"
              },
              "必要最小限にする",
              -1
              /* HOISTED */
            ))
          ])
        ]),
        createBaseVNode("div", _hoisted_7, [
          _cache[11] || (_cache[11] = createBaseVNode(
            "label",
            { class: "form-label" },
            "フォント情報",
            -1
            /* HOISTED */
          )),
          createBaseVNode("table", _hoisted_8, [
            _cache[10] || (_cache[10] = createBaseVNode(
              "thead",
              null,
              [
                createBaseVNode("tr", null, [
                  createBaseVNode("th", null, "Filename"),
                  createBaseVNode("th", null, "元ファイルの場所"),
                  createBaseVNode("th", { style: { "text-align": "right" } }, "Size（元ファイル）"),
                  createBaseVNode("th", { style: { "text-align": "right" } }, "Size（出力結果）"),
                  createBaseVNode("th", null, "削減率"),
                  createBaseVNode("th", null, "ログ")
                ])
              ],
              -1
              /* HOISTED */
            )),
            createBaseVNode("tbody", null, [
              (openBlock(true), createElementBlock(
                Fragment$1,
                null,
                renderList(unref(aCnvFont), (e) => {
                  return openBlock(), createElementBlock(
                    Fragment$1,
                    {
                      key: e.nm
                    },
                    [
                      createBaseVNode(
                        "tr",
                        {
                          style: normalizeStyle({ borderBottom: e.err ? "hidden" : "inherit" })
                        },
                        [
                          createBaseVNode("td", {
                            textContent: toDisplayString(e.nm)
                          }, null, 8, _hoisted_9),
                          createBaseVNode("td", {
                            textContent: toDisplayString(e.mes)
                          }, null, 8, _hoisted_10),
                          createBaseVNode("td", {
                            style: { "text-align": "right" },
                            textContent: toDisplayString(e.iSize.toLocaleString("ja-JP") + " byte")
                          }, null, 8, _hoisted_11),
                          createBaseVNode("td", {
                            style: { "text-align": "right" },
                            textContent: toDisplayString(e.oSize.toLocaleString("ja-JP") + " byte")
                          }, null, 8, _hoisted_12),
                          createBaseVNode("td", {
                            textContent: toDisplayString((e.oSize / e.iSize).toLocaleString("ja-JP"))
                          }, null, 8, _hoisted_13),
                          createBaseVNode("td", null, [
                            createBaseVNode("button", {
                              type: "button",
                              id: "open.readme.txt",
                              class: "btn btn-info btn-sm",
                              onClick: ($event) => unref(openURL)("ws-file:///core/font/subset_font_" + e.nm + ".txt")
                            }, "Open", 8, _hoisted_14)
                          ])
                        ],
                        4
                        /* STYLE */
                      ),
                      e.err ? (openBlock(), createElementBlock("tr", _hoisted_15, [
                        _cache[9] || (_cache[9] = createBaseVNode(
                          "td",
                          null,
                          null,
                          -1
                          /* HOISTED */
                        )),
                        createBaseVNode("td", {
                          textContent: toDisplayString(e.err),
                          colspan: "5",
                          style: { "color": "red" }
                        }, null, 8, _hoisted_16)
                      ])) : createCommentVNode("v-if", true)
                    ],
                    64
                    /* STABLE_FRAGMENT */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])
        ]),
        _cache[16] || (_cache[16] = createBaseVNode(
          "div",
          { class: "col-12 px-1 pt-3" },
          [
            createBaseVNode("h5", null, "アプリアイコン")
          ],
          -1
          /* HOISTED */
        )),
        createBaseVNode("div", _hoisted_17, [
          createBaseVNode("div", _hoisted_18, [
            createBaseVNode("div", _hoisted_19, [
              createBaseVNode("img", {
                loading: "lazy",
                src: srcIcon.value,
                onClick: selectIcon,
                class: "img-fluid sn-dragdrop"
              }, null, 8, _hoisted_20)
            ]),
            createBaseVNode("div", _hoisted_21, [
              _cache[15] || (_cache[15] = createBaseVNode(
                "div",
                { class: "row" },
                [
                  createBaseVNode("div", { class: "col-12 px-1 pt-3" }, [
                    createBaseVNode("h6", null, "画像から自動作成")
                  ])
                ],
                -1
                /* HOISTED */
              )),
              createBaseVNode("div", _hoisted_22, [
                createBaseVNode("div", _hoisted_23, [
                  createBaseVNode("ul", _hoisted_24, [
                    createBaseVNode("li", _hoisted_25, [
                      withDirectives(createBaseVNode(
                        "input",
                        {
                          type: "radio",
                          class: "form-check-input",
                          name: "rgCnvIconShape",
                          value: "0",
                          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(oWss)["cnv.icon.shape"] = $event),
                          id: "rgCnvIconShape0",
                          checked: ""
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vModelRadio, unref(oWss)["cnv.icon.shape"]]
                      ]),
                      _cache[12] || (_cache[12] = createBaseVNode(
                        "label",
                        {
                          class: "form-check-label stretched-link",
                          for: "rgCnvIconShape0"
                        },
                        "加工しない",
                        -1
                        /* HOISTED */
                      ))
                    ]),
                    createBaseVNode("li", _hoisted_26, [
                      withDirectives(createBaseVNode(
                        "input",
                        {
                          type: "radio",
                          class: "form-check-input",
                          name: "rgCnvIconShape",
                          value: "1",
                          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => unref(oWss)["cnv.icon.shape"] = $event),
                          id: "rgCnvIconShape1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vModelRadio, unref(oWss)["cnv.icon.shape"]]
                      ]),
                      _cache[13] || (_cache[13] = createBaseVNode(
                        "label",
                        {
                          class: "form-check-label stretched-link",
                          for: "rgCnvIconShape1"
                        },
                        "丸に",
                        -1
                        /* HOISTED */
                      ))
                    ]),
                    createBaseVNode("li", _hoisted_27, [
                      withDirectives(createBaseVNode(
                        "input",
                        {
                          type: "radio",
                          class: "form-check-input",
                          name: "rgCnvIconShape",
                          value: "2",
                          "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => unref(oWss)["cnv.icon.shape"] = $event),
                          id: "rgCnvIconShape2"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vModelRadio, unref(oWss)["cnv.icon.shape"]]
                      ]),
                      _cache[14] || (_cache[14] = createBaseVNode(
                        "label",
                        {
                          class: "form-check-label stretched-link",
                          for: "rgCnvIconShape2"
                        },
                        "角丸に",
                        -1
                        /* HOISTED */
                      ))
                    ])
                  ])
                ])
              ]),
              createBaseVNode("div", _hoisted_28, [
                createBaseVNode("div", _hoisted_29, [
                  createBaseVNode("div", _hoisted_30, [
                    createBaseVNode("button", {
                      type: "button",
                      onClick: selectIcon,
                      class: "btn btn-info"
                    }, "ファイルを選択"),
                    withDirectives(createBaseVNode("span", {
                      class: "alert alert-danger",
                      role: "alert",
                      textContent: toDisplayString(select_icon_err.value)
                    }, null, 8, _hoisted_31), [
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
      return openBlock(), createElementBlock(
        Fragment$1,
        null,
        [
          createBaseVNode("nav", null, [
            createBaseVNode("div", _hoisted_1, [
              (openBlock(), createElementBlock(
                Fragment$1,
                null,
                renderList(aTab, (t) => {
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
                }),
                64
                /* STABLE_FRAGMENT */
              ))
            ])
          ]),
          createBaseVNode("div", _hoisted_3, [
            (openBlock(), createElementBlock(
              Fragment$1,
              null,
              renderList(aTab, (t) => {
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
              }),
              64
              /* STABLE_FRAGMENT */
            ))
          ])
        ],
        64
        /* STABLE_FRAGMENT */
      );
    };
  }
});

createApp(_sfc_main).use(createPinia()).mount("#app");
