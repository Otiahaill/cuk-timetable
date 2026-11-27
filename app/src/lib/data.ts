/* Data loading & validation — CampusPulse */

import type { TimetableData, Class, Course, VersionInfo, ChangesData } from './types';
import { classKey, parseTime, dayIndex } from './types';

const DATA_BASE = '/data';

/** Fetch JSON with cache-busting for version.json */
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

  // Required top-level fields
  if (!d.meta || !d.courses || !d.classes) return false;
  if (!Array.isArray(d.courses) || !Array.isArray(d.classes)) return false;

  // Validate meta
  const meta = d.meta as Record<string, unknown>;
  if (typeof meta.title !== 'string' || typeof meta.institution !== 'string') return false;
  if (typeof meta.total_classes !== 'number' || typeof meta.total_courses !== 'number') return false;

  // Validate courses
  for (const course of d.courses) {
    if (!course || typeof course !== 'object') return false;
    const c = course as Record<string, unknown>;
    if (typeof c.code !== 'string' || typeof c.level !== 'string' || typeof c.class_count !== 'number') return false;
    if (!['degree', 'diploma/certificate'].includes(c.level)) return false;
  }

  // Validate classes
  const seenKeys = new Set<string>();
  for (const cls of d.classes) {
    if (!cls || typeof cls !== 'object') return false;
    const c = cls as Record<string, unknown>;

    // Required fields
    if (typeof c.id !== 'string' || typeof c.course !== 'string') return false;
    if (typeof c.unit_name !== 'string' || typeof c.lecturer !== 'string') return false;
    if (typeof c.day !== 'string' || typeof c.start !== 'string' || typeof c.end !== 'string') return false;
    if (typeof c.mode !== 'string' || typeof c.venue !== 'string' || typeof c.level !== 'string') return false;
    if (!Array.isArray(c.groups)) return false;
    if (typeof c.source_page !== 'number') return false;

    // Optional nullable fields
    if (c.unit_code !== null && typeof c.unit_code !== 'string') return false;
    if (c.class_size !== null && typeof c.class_size !== 'number') return false;
    if (c.note !== undefined && typeof c.note !== 'string') return false;

    // Validate day
    if (!['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(c.day)) return false;

    // Validate mode
    if (!['Face to face', 'Online', 'Blended'].includes(c.mode)) return false;

    // Validate level
    if (!['degree', 'diploma/certificate'].includes(c.level)) return false;

    // Validate time format (basic check)
    try {
      parseTime(c.start as string);
      parseTime(c.end as string);
    } catch {
      return false;
    }

    // Check composite key uniqueness
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

/** Load version.json */
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
    // 404 or other error — changes.json is optional
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

    if (change.cancel) {
      // Mark as cancelled by adding a special note
      result[idx] = {
        ...result[idx],
        note: `CANCELLED: ${change.reason}${result[idx].note ? ` | ${result[idx].note}` : ''}`,
      };
    } else if (change.set) {
      result[idx] = {
        ...result[idx],
        ...change.set,
        note: `CHANGED: ${change.reason}${result[idx].note ? ` | ${result[idx].note}` : ''}`,
      };
    }
  }
  return result;
}

/** Get classes for a specific course, minus hidden unit codes */
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

/** Check if class is hidden by user preferences */
export function isHidden(cls: Class, hiddenUnitCodes: string[]): boolean {
  return cls.unit_code !== null && hiddenUnitCodes.includes(cls.unit_code);
}

/** Get unique courses from timetable */
export function getCourses(timetable: TimetableData): Course[] {
  return [...timetable.courses].sort((a, b) => a.code.localeCompare(b.code));
}

/** Get classes for today (in Africa/Nairobi timezone) */
export function getTodaysClasses(classes: Class[]): Class[] {
  const now = new Date();
  // Use Africa/Nairobi timezone (UTC+3)
  const nairobiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[nairobiTime.getDay()];

  if (today === 'Saturday' || today === 'Sunday') {
    return [];
  }

  return classes.filter((c) => c.day === today);
}

/** Get next upcoming class from a list (assumes sorted by time) */
export function getNextClass(classes: Class[], referenceMinutes?: number): Class | null {
  const now = referenceMinutes ?? getCurrentMinutesInNairobi();
  return classes.find((c) => parseTime(c.end) > now) ?? null;
}

/** Get current time in minutes since midnight (Africa/Nairobi) */
export function getCurrentMinutesInNairobi(): number {
  const now = new Date();
  const nairobiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  return nairobiTime.getHours() * 60 + nairobiTime.getMinutes();
}

/** Get minutes until a class starts */
export function getMinutesUntilStart(cls: Class): number {
  const now = getCurrentMinutesInNairobi();
  const start = parseTime(cls.start);
  return start - now;
}

/** Format minutes as "Xm" or "Xh Ym" */
export function formatMinutesUntil(mins: number): string {
  if (mins <= 0) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

/** Group classes by day for Week view */
export function groupClassesByDay(classes: Class[]): Map<string, Class[]> {
  const map = new Map<string, Class[]>();
  const days: Class['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  for (const day of days) {
    map.set(day, []);
  }

  for (const cls of classes) {
    const dayClasses = map.get(cls.day);
    if (dayClasses) dayClasses.push(cls);
  }

  // Sort each day's classes by time
  for (const dayClasses of map.values()) {
    dayClasses.sort((a, b) => parseTime(a.start) - parseTime(b.start));
  }

  return map;
}

/** Detect clashes within a set of classes (same course, same day, overlapping times) */
export function detectClashes(classes: Class[]): Map<string, Class[]> {
  const clashes = new Map<string, Class[]>();
  const byDay = groupClassesByDay(classes);

  for (const [day, dayClasses] of byDay) {
    for (let i = 0; i < dayClasses.length; i++) {
      for (let j = i + 1; j < dayClasses.length; j++) {
        const a = dayClasses[i];
        const b = dayClasses[j];
        const aStart = parseTime(a.start);
        const aEnd = parseTime(a.end);
        const bStart = parseTime(b.start);
        const bEnd = parseTime(b.end);

        // Check overlap: a starts before b ends AND b starts before a ends
        if (aStart < bEnd && bStart < aEnd) {
          const key = `${day}-${a.start}-${b.start}`;
          if (!clashes.has(key)) clashes.set(key, []);
          clashes.get(key)!.push(a, b);
        }
      }
    }
  }

  // Deduplicate
  for (const [key, list] of clashes) {
    const unique = Array.from(new Map(list.map((c) => [classKey(c), c])).values());
    clashes.set(key, unique);
  }

  return clashes;
}

/** Search classes by query (unit name, code, lecturer, venue) */
export function searchClasses(classes: Class[], query: string): Class[] {
  const q = query.toLowerCase().trim();
  if (!q) return classes;

  return classes.filter((c) =>
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
