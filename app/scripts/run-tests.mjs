/* Local test runner — works on this device without the native-binary deps.
 *
 * Node 26 can strip TypeScript types natively, so we register a loader hook
 * that resolves extensionless relative imports and strips types. Only the
 * pure `src/lib` modules are exercised here (no JSX), which is exactly where
 * the logic lives.
 *
 * Usage: node scripts/run-tests.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';

const SRC = path.resolve('src');
const ROOT = path.resolve('.');

/* ---- Resolver + type-stripping loader --------------------------------- */
registerHooks({
  resolve(specifier, context, nextResolve) {
    // Map the bare "vitest" specifier onto the local shim
    if (specifier === 'vitest') {
      return {
        url: pathToFileURL(path.join(SRC, 'lib', '__vitest-shim.ts')).href,
        shortCircuit: true,
        format: 'module-typescript',
      };
    }
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const base = specifier.startsWith('/')
        ? path.join(ROOT, specifier)
        : path.resolve(path.dirname(context.parentURL.replace('file://', '')), specifier);
      const candidates = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        path.join(base, 'index.ts'),
        path.join(base, 'index.tsx'),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) {
          return { url: pathToFileURL(c).href, shortCircuit: true, format: 'module-typescript' };
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts') || url.endsWith('.tsx')) {
      const source = fs.readFileSync(fileURLToPath(url), 'utf8');
      return { source, format: 'module-typescript', shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

/* ---- Minimal Vitest-compatible harness -------------------------------- */
const suites = [];
let currentSuite = null;
const beforeEachHooks = [];
const afterEachHooks = [];

globalThis.__describe = (name, fn) => {
  currentSuite = { name, tests: [] };
  suites.push(currentSuite);
  fn();
  currentSuite = null;
};
globalThis.__it = (name, fn) => {
  if (!currentSuite) currentSuite = { name: 'default', tests: [] };
  currentSuite.tests.push({ name, fn });
};
globalThis.__beforeEach = (fn) => {
  beforeEachHooks.push(fn);
};
globalThis.__afterEach = (fn) => {
  afterEachHooks.push(fn);
};
globalThis.__expect = expect;

function describe(name, fn) {
  globalThis.__describe(name, fn);
}
function it(name, fn) {
  globalThis.__it(name, fn);
}
function expect(actual) {
  const fail = (msg) => {
    throw new Error(msg);
  };
  const api = {
    toBe(expected) {
      if (!Object.is(actual, expected))
        fail(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual(expected) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) fail(`expected ${b}, got ${a}`);
    },
    toContain(sub) {
      const ok = Array.isArray(actual) ? actual.includes(sub) : String(actual).includes(sub);
      if (!ok) fail(`expected ${JSON.stringify(actual)} to contain ${JSON.stringify(sub)}`);
    },
    toHaveLength(n) {
      if (actual?.length !== n) fail(`expected length ${n}, got ${actual?.length}`);
    },
    toBeNull() {
      if (actual !== null) fail(`expected null, got ${JSON.stringify(actual)}`);
    },
    toBeUndefined() {
      if (actual !== undefined) fail(`expected undefined, got ${JSON.stringify(actual)}`);
    },
    toBeTruthy() {
      if (!actual) fail(`expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) fail(`expected falsy, got ${JSON.stringify(actual)}`);
    },
    toThrow() {
      let threw = false;
      try {
        actual();
      } catch {
        threw = true;
      }
      if (!threw) fail('expected function to throw');
    },
    toHaveBeenCalledWith(...args) {
      const calls = actual?.mock?.calls ?? [];
      const matchesArg = (call, arg) => {
        if (arg && typeof arg === 'object' && '__stringContaining' in arg) {
          return String(call).includes(arg.__stringContaining);
        }
        if (arg && typeof arg === 'object' && '__any' in arg) {
          return typeof call === arg.__any.name.toLowerCase();
        }
        return JSON.stringify(call) === JSON.stringify(arg);
      };
      const match = calls.some((call) => args.every((arg, i) => matchesArg(call[i], arg)));
      if (!match) fail(`expected mock to have been called with ${JSON.stringify(args)}`);
    },
    toHaveBeenCalled() {
      if (!actual?.mock?.calls?.length) fail('expected mock to have been called');
    },
  };
  api.not = {
    toBe: (e) => {
      if (Object.is(actual, e)) fail(`expected not ${JSON.stringify(e)}`);
    },
    toEqual: (e) => {
      if (JSON.stringify(actual) === JSON.stringify(e)) fail(`expected not ${JSON.stringify(e)}`);
    },
    toContain: (s) => {
      const ok = Array.isArray(actual) ? actual.includes(s) : String(actual).includes(s);
      if (ok) fail(`expected not to contain ${JSON.stringify(s)}`);
    },
    toThrow: () => {
      try {
        actual();
      } catch {
        fail('expected function not to throw');
      }
    },
  };
  api.toBeGreaterThan = (n) => {
    if (!(actual > n)) fail(`expected ${actual} > ${n}`);
  };
  api.toBeLessThan = (n) => {
    if (!(actual < n)) fail(`expected ${actual} < ${n}`);
  };
  return api;
}

expect.stringContaining = (sub) => ({
  __stringContaining: sub,
});
expect.any = (ctor) => ({
  __any: ctor,
});
globalThis.__expectStringContaining = expect.stringContaining;

/* ---- localStorage shim ------------------------------------------------ */
const viStub = {
  fn: (impl) => {
    const f = (...args) => {
      f.mock.calls.push(args);
      return impl?.(...args);
    };
    f.mock = { calls: [] };
    f.mockImplementation = (i) => {
      impl = i;
      return f;
    };
    f.mockRestore = () => f;
    return f;
  },
  spyOn: (obj, key) => {
    const original = obj[key];
    const spy = viStub.fn(original?.bind(obj));
    spy.mockRestore = () => {
      obj[key] = original;
    };
    obj[key] = spy;
    return spy;
  },
  useFakeTimers: () => {
    globalThis.__fakeTimers = true;
  },
  useRealTimers: () => {
    globalThis.__fakeTimers = false;
    globalThis.__fixedTime = undefined;
  },
  setSystemTime: (d) => {
    globalThis.__fixedTime = d instanceof Date ? d.getTime() : new Date(d).getTime();
  },
  stubGlobal: (key, value) => {
    globalThis[key] = value;
  },
  unstubAllGlobals: () => {},
};

/* Fake clock: patch Date so `new Date()` honours vi.setSystemTime() */
const RealDate = globalThis.Date;
class MockDate extends RealDate {
  constructor(...args) {
    if (args.length === 0 && globalThis.__fixedTime !== undefined) {
      super(globalThis.__fixedTime);
    } else {
      super(...args);
    }
  }
  static now() {
    return globalThis.__fixedTime !== undefined ? globalThis.__fixedTime : RealDate.now();
  }
}
globalThis.Date = MockDate;

globalThis.__vi = viStub;

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

/* ---- Discover + run --------------------------------------------------- */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.test\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

const testFiles = walk(SRC);

let passed = 0;
let failed = 0;

for (const tf of testFiles) {
  suites.length = 0;
  beforeEachHooks.length = 0;
  afterEachHooks.length = 0;
  try {
    await import(pathToFileURL(tf).href);
  } catch (e) {
    console.log(`✗ ${path.relative(SRC, tf)} failed to load: ${e.message}`);
    failed++;
    continue;
  }
  for (const suite of suites) {
    for (const t of suite.tests) {
      try {
        for (const hook of beforeEachHooks) hook();
        t.fn();
        for (const hook of afterEachHooks) hook();
        passed++;
      } catch (e) {
        failed++;
        console.log(`✗ ${suite.name} > ${t.name}\n    ${e.message}`);
      }
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
