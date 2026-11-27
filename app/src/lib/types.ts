/* Timetable data types — matches /data/timetable.json */

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
  version?: string; // Added by M1-02
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
  start: string; // "7:00AM"
  end: string;   // "10:00AM"
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
  updated: string; // YYYY-MM-DD
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

/** Composite key for stable class identification across versions */
export function classKey(c: Pick<Class, 'course' | 'unit_code' | 'day' | 'start'>): string {
  return `${c.course}|${c.unit_code ?? 'NULL'}|${c.day}|${c.start}`;
}

/** Parse "7:00AM" -> minutes since midnight (0-1439) */
export function parseTime(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (!match) throw new Error(`Invalid time format: ${timeStr}`);
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
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
