/* Shared types and pure helpers — CampusPulse */

export interface TimetableMeta {
  title: string;
  institution: string;
  source_file: string;
  source_pages: number;
  time_format: string;
  total_classes: number;
  total_courses: number;
  notes: string[];
  data_quality: {
    fixed_or_inferred: string[];
    same_slot_clashes_in_source: string[];
  };
  version?: string;
}

export interface Course {
  code: string;
  level: 'degree' | 'diploma/certificate';
  class_count: number;
}

export type Mode = 'Face to face' | 'Online' | 'Blended';
export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export interface Class {
  id: string;
  course: string;
  unit_code: string | null;
  unit_name: string;
  lecturer: string;
  class_size: number | null;
  day: Day;
  start: string;
  end: string;
  mode: Mode;
  venue: string;
  level: 'degree' | 'diploma/certificate';
  groups: string[];
  note?: string;
  source_page: number;
}

export interface TimetableData {
  meta: TimetableMeta;
  courses: Course[];
  classes: Class[];
}

export interface VersionInfo {
  version: string;
  updated: string;
  timetable_sha256: string;
  message: string;
}

export interface ChangeOverride {
  match: {
    course: string;
    unit_code: string | null;
    day: Day;
    start: string;
  };
  set?: Partial<Class>;
  cancel?: boolean;
  reason: string;
  date: string;
}

export interface ChangesData {
  version: string;
  updated: string;
  changes: ChangeOverride[];
}

/** Composite key for stable class identification across data versions */
export function classKey(c: Pick<Class, 'course' | 'unit_code' | 'day' | 'start'>): string {
  return `${c.course}|${c.unit_code ?? 'NULL'}|${c.day}|${c.start}`;
}

/**
 * Parse a 12-hour time into minutes since midnight (0-1439).
 *
 * Accepts "7:00AM", "7:00 AM", "12:00PM" (the printed PDF format) and the
 * output of `formatTime` (which uses a space before the meridiem).
 * Throws on anything that is not a valid 12-hour time.
 */
export function parseTime(timeStr: string): number {
  if (typeof timeStr !== 'string') {
    throw new Error(`Invalid time format: ${String(timeStr)}`);
  }
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) throw new Error(`Invalid time format: ${timeStr}`);

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 1 || hours > 12) throw new Error(`Invalid hour in time: ${timeStr}`);
  if (minutes < 0 || minutes > 59) throw new Error(`Invalid minute in time: ${timeStr}`);

  const meridiem = match[3].toUpperCase();
  let total = hours * 60 + minutes;
  if (meridiem === 'PM' && hours !== 12) total += 12 * 60;
  if (meridiem === 'AM' && hours === 12) total = minutes;
  return total;
}

/** Format minutes -> "7:00 AM" */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${meridiem}`;
}

/** Format time range -> "7:00 AM – 10:00 AM" */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(parseTime(start))} – ${formatTime(parseTime(end))}`;
}

/** Get day index 0-4 (Mon-Fri) */
export function dayIndex(day: Day): number {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(day);
}

/** Check if class is hidden by user preferences */
export function isClassHidden(cls: Class, hiddenUnitCodes: string[]): boolean {
  return cls.unit_code !== null && hiddenUnitCodes.includes(cls.unit_code);
}

/* ------------------------------------------------------------------ */
/* Africa/Nairobi time helpers                                          */
/* ------------------------------------------------------------------ */

export const NAIROBI_TIMEZONE = 'Africa/Nairobi';

const nairobiFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: NAIROBI_TIMEZONE,
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Weekday name in Africa/Nairobi, e.g. "Monday" */
export function getNairobiDayName(date: Date = new Date()): string {
  const part = nairobiFormatter.formatToParts(date).find((p) => p.type === 'weekday');
  return part?.value ?? 'Monday';
}

/** Minutes since midnight in Africa/Nairobi */
export function getNairobiMinutes(date: Date = new Date()): number {
  const parts = nairobiFormatter.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return hour * 60 + minute;
}

/** True when the current Africa/Nairobi date is Saturday or Sunday */
export function isNairobiWeekend(date: Date = new Date()): boolean {
  const day = getNairobiDayName(date);
  return day === 'Saturday' || day === 'Sunday';
}

/** Formatted long date in Africa/Nairobi, e.g. "Friday, 27 November 2026" */
export function formatNairobiDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: NAIROBI_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** The next Monday date (Africa/Nairobi) from the given date */
export function getNextMondayDate(date: Date = new Date()): Date {
  const dayName = getNairobiDayName(date);
  const order = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const idx = order.indexOf(dayName);
  const daysUntilMonday = idx === 0 ? 1 : idx === 6 ? 2 : 8 - idx;
  const d = new Date(date);
  d.setDate(d.getDate() + daysUntilMonday);
  return d;
}
