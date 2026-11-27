/* Preferences management — versioned localStorage */

export interface Preferences {
  courseCode: string | null;
  hiddenUnitCodes: string[];
  theme: 'system' | 'light' | 'dark';
  dataVersion: string | null;
}

const STORAGE_KEY = 'cukt:v1:prefs';
const DEFAULT_PREFS: Preferences = {
  courseCode: null,
  hiddenUnitCodes: [],
  theme: 'system',
  dataVersion: null,
};

function readPrefs(): Preferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch {
    // Ignore parse errors, return defaults
  }
  return DEFAULT_PREFS;
}

function writePrefs(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Quota exceeded or private mode — ignore
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => readPrefs());

  const updatePrefs = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(next);
      return next;
    });
  }, []);

  const setCourseCode = useCallback((courseCode: string) => {
    updatePrefs({ courseCode });
  }, [updatePrefs]);

  const toggleUnitHidden = useCallback((unitCode: string) => {
    setPrefs((prev) => {
      const hidden = prev.hiddenUnitCodes.includes(unitCode)
        ? prev.hiddenUnitCodes.filter((c) => c !== unitCode)
        : [...prev.hiddenUnitCodes, unitCode];
      const next = { ...prev, hiddenUnitCodes: hidden };
      writePrefs(next);
      return next;
    });
  }, []);

  const setTheme = useCallback((theme: Preferences['theme']) => {
    updatePrefs({ theme });
  }, [updatePrefs]);

  const setDataVersion = useCallback((version: string) => {
    updatePrefs({ dataVersion: version });
  }, [updatePrefs]);

  return {
    prefs,
    setCourseCode,
    toggleUnitHidden,
    setTheme,
    setDataVersion,
    isUnitHidden: (unitCode: string) => prefs.hiddenUnitCodes.includes(unitCode),
  };
}

// Re-export useState/useCallback for convenience
import { useState, useCallback } from 'preact/hooks';
