/* Preferences tests — CampusPulse */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readPrefs, writePrefs, DEFAULT_PREFS, STORAGE_KEY } from './prefs';

// Mock localStorage
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  mockStorage.clear();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => mockStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
    clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readPrefs', () => {
  it('returns defaults when nothing stored', () => {
    expect(readPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('returns parsed stored prefs', () => {
    const stored = { courseCode: 'BCHM1.1', hiddenUnitCodes: ['BCHM1101'], theme: 'dark', dataVersion: 'v1' };
    mockStorage[STORAGE_KEY] = JSON.stringify(stored);
    expect(readPrefs()).toEqual({ ...DEFAULT_PREFS, ...stored });
  });

  it('merges with defaults for missing fields', () => {
    const stored = { courseCode: 'BCHM1.1' }; // missing new fields
    mockStorage[STORAGE_KEY] = JSON.stringify(stored);
    const result = readPrefs();
    expect(result.courseCode).toBe('BCHM1.1');
    expect(result.hiddenUnitCodes).toEqual([]);
    expect(result.theme).toBe('system');
    expect(result.dataVersion).toBeNull();
  });

  it('handles corrupted JSON gracefully', () => {
    mockStorage[STORAGE_KEY] = 'not valid json';
    expect(readPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('handles non-object JSON gracefully', () => {
    mockStorage[STORAGE_KEY] = JSON.stringify('just a string');
    expect(readPrefs()).toEqual(DEFAULT_PREFS);
  });
});

describe('writePrefs', () => {
  it('writes prefs to localStorage', () => {
    const prefs = { courseCode: 'BCHM1.1', hiddenUnitCodes: [], theme: 'light', dataVersion: 'v1' };
    writePrefs(prefs);
    expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(prefs));
  });

  it('handles quota errors gracefully', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => { throw new Error('QuotaExceededError'); }),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    // Should not throw
    expect(() => writePrefs(DEFAULT_PREFS)).not.toThrow();
  });
});

describe('STORAGE_KEY', () => {
  it('uses versioned key', () => {
    expect(STORAGE_KEY).toBe('cukt:v1:prefs');
  });
});
