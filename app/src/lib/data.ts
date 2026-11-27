/* Data loading & validation — CampusPulse */

import type { TimetableData, Class, Course, VersionInfo, ChangesData } from './types';
import {
  classKey,
  parseTime,
  dayIndex,
  getNairobiDayName,
  getNairobiMinutes,
} from './types';

/**
 * Base URL for static data files.
 * Uses Vite's BASE_URL so the app works at "/" (Cloudflare) and
 * "/cuk-timetable/" (GitHub Pages) without hard-coded paths.
 */
export const BASE_URL = (import.meta.env?.BASE_URL as string | undefined) ?? '/';
const DATA_BASE = `${BASE_URL}data`.replace(/\/{2,}/g, '/');

/** Fetch JSON with optional cache-busting */
async function fetchJson<T>(path: string, cacheBust = false): Promise<T> {
  const url = cacheBust ? `${path}?v=${Date.now()}` : path;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

/** Validate timetable structure at runtime */
export function validateTimetable(data: unknown): data is TimetableData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  if (!d.meta || !d.courses || !d.classes) return false;
  if (!Array.isArray(d.courses) || !Array.isArray(d.classes)) return false;

  const meta = d.meta as Record<string, unknown>;
  if (typeof meta.title !== 'string' || typeof meta.institution !== 'string') return false;
  if (typeof meta.total_classes !== 'number' || typeof meta.total_courses !== 'number') return false;

  for (const course of d.courses) {
    if (!course || typeof course !== 'object') return false;
    const c = course as Record<string, unknown>;
    if (typeof c.code !== 'string' || typeof c.level !== 'string' || typeof c.class_count !== 'number') return false;
    if (c.level !== 'degree' && c.level !== 'diploma/certificate') return false;
  }

  const seenKeys = new Set<string>();
  for (const cls of d.classes) {
    if (!cls || typeof cls !== 'object') return false;
    const c = cls as Record<string, unknown>;

    if (typeof c.id !== 'string' || typeof c.course !== 'string') return false;
    if (typeof c.unit_name !== 'string' || typeof c.lecturer !== 'string') return false;
    if (typeof c.day !== 'string' || typeof c.start !== 'string' || typeof c.end !== 'string') return false;
    if (typeof c.mode !== 'string' || typeof c.venue !== 'string' || typeof c.level !== 'string') return false;
    if (!Array.isArray(c.groups)) return false;
    if (typeof c.source_page !== 'number') return false;

    if (c.unit_code !== null && typeof c.unit_code !== 'string') return false;
    if (c.class_size !== null && typeof c.class_size !== 'number') return false;
    if (c.note !== undefined && typeof c.note !== 'string') return false;

    if (!['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(c.day)) return false;
    if (!['Face to face', 'Online', 'Blended'].includes(c.mode)) return false;
    if (c.level !== 'degree' && c.level !== 'diploma/certificate') return false;

    try {
      const start = parseTime(c.start as string);
      const end = parseTime(c.end as string);
      if (end <= start) return false;
    } catch {
      return false;
    }

    const key = classKey({
      course: c.course as string,
      unit_code: c.unit_code as string | null,
      day: c.day as Class['day'],
      start: c.start as string,
    });
    if (seenKeys.has(key)) {
      console.warn(`Duplicate composite key: ${key}`);
      return false;
    }
    seenKeys.add(key);
  }

  return true;
}

/** Validate changes.json structure */
export function validateChanges(data: unknown): data is ChangesData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.version !== 'string' || typeof d.updated !== 'string') return false;
  if (!Array.isArray(d.changes)) return false;

  for (const change of d.changes) {
    if (!change || typeof change !== 'object') return false;
    const c = change as Record<string, unknown>;
    if (!c.match || typeof c.match !== 'object') return false;
    const m = c.match as Record<string, unknown>;
    if (typeof m.course !== 'string' || typeof m.day !== 'string' || typeof m.start !== 'string') return false;
    if (m.unit_code !== null && typeof m.unit_code !== 'string') return false;
    if (!c.reason || typeof c.reason !== 'string') return false;
    if (typeof c.date !== 'string') return false;
    if (c.cancel !== undefined && typeof c.cancel !== 'boolean') return false;
    if (c.set !== undefined && typeof c.set !== 'object') return false;
  }
  return true;
}

/** Load timetable.json with validation */
export async function loadTimetable(): Promise<TimetableData> {
  const data = await fetchJson<unknown>(`${DATA_BASE}/timetable.json`);
  if (!validateTimetable(data)) {
    throw new Error('Invalid timetable.json structure');
  }
  return data;
}

/** Load version.json (cache-busted) */
export async function loadVersion(): Promise<VersionInfo> {
  return fetchJson<VersionInfo>(`${DATA_BASE}/version.json`, true);
}

/** Load changes.json (optional) */
export async function loadChanges(): Promise<ChangesData | null> {
  try {
    const data = await fetchJson<unknown>(`${DATA_BASE}/changes.json`, true);
    if (validateChanges(data)) return data;
    console.warn('Invalid changes.json, ignoring');
    return null;
  } catch {
    return null;
  }
}

/** Apply changes.json overrides to classes */
export function applyChanges(classes: Class[], changes: ChangesData): Class[] {
  const result = [...classes];
  for (const change of changes.changes) {
    const matchKey = classKey({
      course: change.match.course,
      unit_code: change.match.unit_code,
      day: change.match.day,
      start: change.match.start,
    });

    const idx = result.findIndex((c) => classKey(c) === matchKey);
    if (idx === -1) {
      console.warn(`Change matches no class: ${matchKey} (${change.reason})`);
      continue;
    }

    const existing = result[idx];
    if (change.cancel) {
      result[idx] = {
        ...existing,
        note: `CANCELLED: ${change.reason}${existing.note ? ` | ${existing.note}` : ''}`,
      };
    } else if (change.set) {
      result[idx] = {
        ...existing,
        ...change.set,
        note: `CHANGED: ${change.reason}${existing.note ? ` | ${existing.note}` : ''}`,
      };
    }
  }
  return result;
}

/** Check if class is hidden by user preferences */
export function isHidden(cls: Class, hiddenUnitCodes: string[]): boolean {
  return cls.unit_code !== null && hiddenUnitCodes.includes(cls.unit_code);
}

/** Get classes for a course, minus hidden unit codes, sorted by day then time */
export function getClassesForCourse(
  timetable: TimetableData,
  courseCode: string,
  hiddenUnitCodes: string[]
): Class[] {
  return timetable.classes
    .filter((c) => c.course === courseCode)
    .filter((c) => !isHidden(c, hiddenUnitCodes))
    .sort((a, b) => dayIndex(a.day) - dayIndex(b.day) || parseTime(a.start) - parseTime(b.start));
}

/** Get all courses, sorted by code */
export function getCourses(timetable: TimetableData): Course[] {
  return [...timetable.courses].sort((a, b) => a.code.localeCompare(b.code));
}

/** Get classes for today (Africa/Nairobi), sorted by start time */
export function getTodaysClasses(classes: Class[], date: Date = new Date()): Class[] {
  const today = getNairobiDayName(date);
  if (today === 'Saturday' || today === 'Sunday') return [];
  return classes
    .filter((c) => c.day === today)
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));
}

/** Get next/current class from a time-sorted list */
export function getNextClass(
  classes: Class[],
  referenceMinutes?: number,
  date: Date = new Date()
): Class | null {
  const now = referenceMinutes ?? getNairobiMinutes(date);
  return classes.find((c) => parseTime(c.end) > now) ?? null;
}

/** Current time in minutes since midnight (Africa/Nairobi) */
export function getCurrentMinutesInNairobi(date: Date = new Date()): number {
  return getNairobiMinutes(date);
}

/** Minutes until a class starts (negative if already started) */
export function getMinutesUntilStart(cls: Class, date: Date = new Date()): number {
  return parseTime(cls.start) - getNairobiMinutes(date);
}

/** Format minutes as "24m" / "1h 30m" / "Now" */
export function formatMinutesUntil(mins: number): string {
  if (mins <= 0) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

/** Group classes by weekday (Mon–Fri), each day sorted by time */
export function groupClassesByDay(classes: Class[]): Map<string, Class[]> {
  const map = new Map<string, Class[]>();
  const days: Class['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  for (const day of days) map.set(day, []);

  for (const cls of classes) {
    const dayClasses = map.get(cls.day);
    if (dayClasses) dayClasses.push(cls);
  }

  for (const dayClasses of map.values()) {
    dayClasses.sort((a, b) => parseTime(a.start) - parseTime(b.start));
  }

  return map;
}

/**
 * Detect overlapping classes within the given set.
 * Classes that overlap transitively are grouped into one clash entry.
 */
export function detectClashes(classes: Class[]): Map<string, Class[]> {
  const clashes = new Map<string, Class[]>();
  const byDay = groupClassesByDay(classes);

  for (const [day, dayClasses] of byDay) {
    const n = dayClasses.length;
    const parent = Array.from({ length: n }, (_, i) => i);

    const find = (i: number): number => {
      let root = i;
      while (parent[root] !== root) root = parent[root];
      while (parent[i] !== root) {
        const next = parent[i];
        parent[i] = root;
        i = next;
      }
      return root;
    };
    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };

    for (let i = 0; i < n; i++) {
      const aStart = parseTime(dayClasses[i].start);
      const aEnd = parseTime(dayClasses[i].end);
      for (let j = i + 1; j < n; j++) {
        const bStart = parseTime(dayClasses[j].start);
        const bEnd = parseTime(dayClasses[j].end);
        if (aStart < bEnd && bStart < aEnd) union(i, j);
      }
    }

    const groups = new Map<number, Class[]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(dayClasses[i]);
    }

    for (const group of groups.values()) {
      if (group.length > 1) {
        const key = `${day}|${group.map((c) => classKey(c)).sort().join('|')}`;
        clashes.set(key, group);
      }
    }
  }

  return clashes;
}

/** Search classes by unit name, unit code, lecturer or venue */
export function searchClasses(classes: Class[], query: string): Class[] {
  const q = query.toLowerCase().trim();
  if (!q) return classes;

  return classes.filter(
    (c) =>
      c.unit_name.toLowerCase().includes(q) ||
      (c.unit_code?.toLowerCase().includes(q) ?? false) ||
      c.lecturer.toLowerCase().includes(q) ||
      c.venue.toLowerCase().includes(q)
  );
}

/** Filter classes by mode, day, venue, level */
export function filterClasses(
  classes: Class[],
  filters: { mode?: string; day?: string; venue?: string; level?: string }
): Class[] {
  return classes.filter((c) => {
    if (filters.mode && c.mode !== filters.mode) return false;
    if (filters.day && c.day !== filters.day) return false;
    if (filters.venue && c.venue !== filters.venue) return false;
    if (filters.level && c.level !== filters.level) return false;
    return true;
  });
}

/* Re-export the shared pure helpers so callers can import from one place. */
export {
  classKey,
  parseTime,
  formatTime,
  formatTimeRange,
  dayIndex,
  isClassHidden,
  getNairobiDayName,
  getNairobiMinutes,
  isNairobiWeekend,
  formatNairobiDate,
  getNextMondayDate,
} from './types';
