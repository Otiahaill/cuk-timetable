/* Preferences tests — CampusPulse */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  readPrefs,
  writePrefs,
  readPref,
  writePref,
  DEFAULT_PREFS,
  STORAGE_KEY,
} from './prefs';

const mockStorage: Record<string, string> = {};

function clearMockStorage() {
  for (const key of Object.keys(mockStorage)) {
    delete mockStorage[key];
  }
}

beforeEach(() => {
  clearMockStorage();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => mockStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
    }),
    clear: vi.fn(() => {
      clearMockStorage();
    }),
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
    const stored = {
      courseCode: 'BCHM1.1',
      hiddenUnitCodes: ['BCHM1101'],
      theme: 'dark',
      dataVersion: 'v1',
    };
    mockStorage[STORAGE_KEY] = JSON.stringify(stored);
    expect(readPrefs()).toEqual({ ...DEFAULT_PREFS, ...stored });
  });

  it('merges with defaults for missing fields', () => {
    mockStorage[STORAGE_KEY] = JSON.stringify({ courseCode: 'BCHM1.1' });
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
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    expect(() => writePrefs(DEFAULT_PREFS)).not.toThrow();
  });
});

describe('readPref / writePref (hook-free accessors)', () => {
  it('writes and reads a single preference', () => {
    writePref('dataVersion', '2026.11-r1');
    expect(readPref('dataVersion')).toBe('2026.11-r1');
  });

  it('does not wipe other preferences', () => {
    writePref('courseCode', 'BCHM1.1');
    writePref('dataVersion', '2026.11-r1');
    const prefs = readPrefs();
    expect(prefs.courseCode).toBe('BCHM1.1');
    expect(prefs.dataVersion).toBe('2026.11-r1');
  });
});

describe('STORAGE_KEY', () => {
  it('uses a versioned key', () => {
    expect(STORAGE_KEY).toBe('cukt:v1:prefs');
  });
});
