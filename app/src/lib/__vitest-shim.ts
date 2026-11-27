/* Vitest shim used by the local runner (scripts/run-tests.mjs).
 * The real suite runs under Vitest in CI; this file lets the same test
 * files execute on-device without the native-binary dependencies.
 */

const expectFn = ((actual: unknown) => globalThis.__expect?.(actual)) as any;
expectFn.stringContaining = (sub: string) => ({ __stringContaining: sub });
expectFn.any = (ctor: unknown) => ({ __any: ctor });

export function describe(name: string, fn: () => void) {
  globalThis.__describe?.(name, fn);
}
export function it(name: string, fn: () => void) {
  globalThis.__it?.(name, fn);
}
export function test(name: string, fn: () => void) {
  globalThis.__it?.(name, fn);
}
export function beforeEach(fn: () => void) {
  globalThis.__beforeEach?.(fn);
}
export function afterEach(fn: () => void) {
  globalThis.__afterEach?.(fn);
}
export const expect = expectFn;

export const vi = {
  fn: (...a: unknown[]) => globalThis.__vi?.fn(...(a as [])),
  spyOn: (...a: unknown[]) => globalThis.__vi?.spyOn(...(a as [])),
  useFakeTimers: (...a: unknown[]) => globalThis.__vi?.useFakeTimers(...(a as [])),
  useRealTimers: (...a: unknown[]) => globalThis.__vi?.useRealTimers(...(a as [])),
  setSystemTime: (...a: unknown[]) => globalThis.__vi?.setSystemTime(...(a as [])),
  stubGlobal: (...a: unknown[]) => globalThis.__vi?.stubGlobal(...(a as [])),
  unstubAllGlobals: (...a: unknown[]) => globalThis.__vi?.unstubAllGlobals(...(a as [])),
};

export default { describe, it, test, expect, vi };
