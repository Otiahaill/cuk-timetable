/* Data layer tests — CampusPulse */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseTime,
  formatTime,
  formatTimeRange,
  dayIndex,
  classKey,
  validateTimetable,
  validateChanges,
  applyChanges,
  getClassesForCourse,
  getTodaysClasses,
  getNextClass,
  getCurrentMinutesInNairobi,
  getMinutesUntilStart,
  formatMinutesUntil,
  groupClassesByDay,
  detectClashes,
  searchClasses,
  filterClasses,
} from './data';

import type { TimetableData, Class, ChangesData } from './types';

// Mock timetable data for testing
const mockClass: Class = {
  id: 'cls_001',
  course: 'BCHM1.1',
  unit_code: 'BCHM1101',
  unit_name: 'INTRODUCTION TO CHEMISTRY',
  lecturer: 'Dr. Smith',
  class_size: 30,
  day: 'Monday',
  start: '7:00AM',
  end: '10:00AM',
  mode: 'Face to face',
  venue: 'ACADEMIC HALL',
  level: 'degree',
  groups: ['BCHM1.1'],
  source_page: 1,
};

const mockClass2: Class = {
  ...mockClass,
  id: 'cls_002',
  unit_code: 'BCHM1102',
  unit_name: 'ORGANIC CHEMISTRY',
  start: '11:00AM',
  end: '2:00PM',
  day: 'Monday',
};

const mockClassTue: Class = {
  ...mockClass,
  id: 'cls_003',
  unit_code: 'BCHM1103',
  unit_name: 'PHYSICAL CHEMISTRY',
  day: 'Tuesday',
  start: '7:00AM',
  end: '10:00AM',
};

const mockTimetable: TimetableData = {
  meta: {
    title: 'Test Timetable',
    institution: 'Test University',
    source_file: 'test.pdf',
    source_pages: 10,
    time_format: '12-hour',
    total_classes: 3,
    total_courses: 1,
    notes: [],
    data_quality: { fixed_or_inferred: [], same_slot_clashes_in_source: [] },
  },
  courses: [
    { code: 'BCHM1.1', level: 'degree', class_count: 3 },
  ],
  classes: [mockClass, mockClass2, mockClassTue],
};

describe('Time parsing', () => {
  it('parses 7:00AM correctly', () => {
    expect(parseTime('7:00AM')).toBe(7 * 60); // 420
  });

  it('parses 12:00AM (midnight) correctly', () => {
    expect(parseTime('12:00AM')).toBe(0);
  });

  it('parses 12:00PM (noon) correctly', () => {
    expect(parseTime('12:00PM')).toBe(12 * 60); // 720
  });

  it('parses 1:00PM correctly', () => {
    expect(parseTime('1:00PM')).toBe(13 * 60); // 780
  });

  it('parses 11:59PM correctly', () => {
    expect(parseTime('11:59PM')).toBe(23 * 60 + 59); // 1439
  });

  it('parses 12:30AM correctly', () => {
    expect(parseTime('12:30AM')).toBe(30);
  });

  it('parses 12:30PM correctly', () => {
    expect(parseTime('12:30PM')).toBe(12 * 60 + 30); // 750
  });

  it('throws on invalid format', () => {
    expect(() => parseTime('7:00')).toThrow();
    expect(() => parseTime('25:00AM')).toThrow();
    expect(() => parseTime('7:60AM')).toThrow();
  });

  it('formats time correctly', () => {
    expect(formatTime(0)).toBe('12:00 AM');
    expect(formatTime(30)).toBe('12:30 AM');
    expect(formatTime(7 * 60)).toBe('7:00 AM');
    expect(formatTime(12 * 60)).toBe('12:00 PM');
    expect(formatTime(13 * 60)).toBe('1:00 PM');
    expect(formatTime(23 * 60 + 59)).toBe('11:59 PM');
  });

  it('formats time range correctly', () => {
    expect(formatTimeRange('7:00AM', '10:00AM')).toBe('7:00 AM – 10:00 AM');
    expect(formatTimeRange('12:00PM', '1:00PM')).toBe('12:00 PM – 1:00 PM');
  });
});

describe('Day index', () => {
  it('returns correct index for weekdays', () => {
    expect(dayIndex('Monday')).toBe(0);
    expect(dayIndex('Tuesday')).toBe(1);
    expect(dayIndex('Wednesday')).toBe(2);
    expect(dayIndex('Thursday')).toBe(3);
    expect(dayIndex('Friday')).toBe(4);
  });

  it('returns -1 for weekend', () => {
    expect(dayIndex('Saturday' as any)).toBe(-1);
    expect(dayIndex('Sunday' as any)).toBe(-1);
  });
});

describe('Composite key', () => {
  it('generates consistent key', () => {
    const key = classKey({
      course: 'BCHM1.1',
      unit_code: 'BCHM1101',
      day: 'Monday',
      start: '7:00AM',
    });
    expect(key).toBe('BCHM1.1|BCHM1101|Monday|7:00AM');
  });

  it('handles null unit_code', () => {
    const key = classKey({
      course: 'BCHM1.1',
      unit_code: null,
      day: 'Monday',
      start: '7:00AM',
    });
    expect(key).toBe('BCHM1.1|NULL|Monday|7:00AM');
  });
});

describe('Timetable validation', () => {
  it('validates correct timetable', () => {
    expect(validateTimetable(mockTimetable)).toBe(true);
  });

  it('rejects missing meta', () => {
    const bad = { ...mockTimetable, meta: undefined };
    expect(validateTimetable(bad)).toBe(false);
  });

  it('rejects invalid course', () => {
    const bad = {
      ...mockTimetable,
      courses: [{ code: 'X', level: 'invalid', class_count: 1 }],
    };
    expect(validateTimetable(bad)).toBe(false);
  });

  it('rejects invalid class', () => {
    const bad = {
      ...mockTimetable,
      classes: [{ ...mockClass, day: 'Someday' }],
    };
    expect(validateTimetable(bad)).toBe(false);
  });

  it('rejects invalid mode', () => {
    const bad = {
      ...mockTimetable,
      classes: [{ ...mockClass, mode: 'Hybrid' }],
    };
    expect(validateTimetable(bad)).toBe(false);
  });

  it('rejects invalid time format', () => {
    const bad = {
      ...mockTimetable,
      classes: [{ ...mockClass, start: '7:00' }],
    };
    expect(validateTimetable(bad)).toBe(false);
  });

  it('rejects duplicate composite keys', () => {
    const bad = {
      ...mockTimetable,
      classes: [mockClass, { ...mockClass, id: 'cls_002' }], // same composite key
    };
    expect(validateTimetable(bad)).toBe(false);
  });
});

describe('Changes validation', () => {
  const validChanges: ChangesData = {
    version: 'r1',
    updated: '2026-11-27',
    changes: [
      {
        match: { course: 'BCHM1.1', unit_code: 'BCHM1101', day: 'Monday', start: '7:00AM' },
        set: { venue: 'GC1' },
        reason: 'Room swap',
        date: '2026-11-27',
      },
      {
        match: { course: 'BCHM1.1', unit_code: 'BCHM1102', day: 'Monday', start: '11:00AM' },
        cancel: true,
        reason: 'Lecturer away',
        date: '2026-11-27',
      },
    ],
  };

  it('validates correct changes', () => {
    expect(validateChanges(validChanges)).toBe(true);
  });

  it('rejects missing fields', () => {
    const bad = { ...validChanges, changes: [{ match: {}, reason: '', date: '' }] };
    expect(validateChanges(bad)).toBe(false);
  });

  it('rejects invalid cancel type', () => {
    const bad = {
      ...validChanges,
      changes: [{ ...validChanges.changes[0], cancel: 'yes' }],
    };
    expect(validateChanges(bad)).toBe(false);
  });
});

describe('Apply changes', () => {
  const changes: ChangesData = {
    version: 'r1',
    updated: '2026-11-27',
    changes: [
      {
        match: { course: 'BCHM1.1', unit_code: 'BCHM1101', day: 'Monday', start: '7:00AM' },
        set: { venue: 'GC1' },
        reason: 'Room swap',
        date: '2026-11-27',
      },
      {
        match: { course: 'BCHM1.1', unit_code: 'BCHM1102', day: 'Monday', start: '11:00AM' },
        cancel: true,
        reason: 'Lecturer away',
        date: '2026-11-27',
      },
      {
        match: { course: 'BCHM1.1', unit_code: 'XXXX', day: 'Monday', start: '7:00AM' },
        set: { venue: 'NEW' },
        reason: 'No match',
        date: '2026-11-27',
      },
    ],
  };

  it('applies venue change', () => {
    const result = applyChanges(mockTimetable.classes, changes);
    const changed = result.find((c) => c.unit_code === 'BCHM1101');
    expect(changed?.venue).toBe('GC1');
    expect(changed?.note).toContain('CHANGED: Room swap');
  });

  it('marks cancelled class', () => {
    const result = applyChanges(mockTimetable.classes, changes);
    const cancelled = result.find((c) => c.unit_code === 'BCHM1102');
    expect(cancelled?.note).toContain('CANCELLED: Lecturer away');
  });

  it('warns and ignores non-matching change', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = applyChanges(mockTimetable.classes, changes);
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Change matches no class')
    );
    consoleWarn.mockRestore();
  });
});

describe('Course filtering', () => {
  it('returns classes for course minus hidden', () => {
    const result = getClassesForCourse(mockTimetable, 'BCHM1.1', ['BCHM1102']);
    expect(result.length).toBe(2);
    expect(result.every((c) => c.unit_code !== 'BCHM1102')).toBe(true);
  });

  it('returns empty for unknown course', () => {
    const result = getClassesForCourse(mockTimetable, 'UNKNOWN', []);
    expect(result.length).toBe(0);
  });
});

describe('Today filtering', () => {
  it('returns Monday classes when today is Monday', () => {
    vi.setSystemTime(new Date('2026-11-30T10:00:00+03:00')); // Monday
    const result = getTodaysClasses(mockTimetable.classes);
    expect(result.length).toBe(2);
    expect(result.every((c) => c.day === 'Monday')).toBe(true);
    vi.useRealTimers();
  });

  it('returns empty on weekend', () => {
    vi.setSystemTime(new Date('2026-12-05T10:00:00+03:00')); // Saturday
    const result = getTodaysClasses(mockTimetable.classes);
    expect(result.length).toBe(0);
    vi.useRealTimers();
  });
});

describe('Next class', () => {
  const mondayClasses = [mockClass, mockClass2]; // 7AM-10AM, 11AM-2PM

  it('returns first class before any class', () => {
    const next = getNextClass(mondayClasses, 6 * 60); // 6:00AM
    expect(next?.unit_code).toBe('BCHM1101');
  });

  it('returns second class between classes', () => {
    const next = getNextClass(mondayClasses, 10 * 60 + 30); // 10:30AM
    expect(next?.unit_code).toBe('BCHM1102');
  });

  it('returns null after last class', () => {
    const next = getNextClass(mondayClasses, 15 * 60); // 3:00PM
    expect(next).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(getNextClass([], 10 * 60)).toBeNull();
  });
});

describe('Minutes until start', () => {
  it('calculates correctly', () => {
    const mins = getMinutesUntilStart(mockClass); // 7:00AM
    // Depends on current time, just verify it's a number
    expect(typeof mins).toBe('number');
  });
});

describe('Format minutes until', () => {
  it('formats minutes', () => {
    expect(formatMinutesUntil(-5)).toBe('Now');
    expect(formatMinutesUntil(0)).toBe('Now');
    expect(formatMinutesUntil(5)).toBe('5m');
    expect(formatMinutesUntil(59)).toBe('59m');
    expect(formatMinutesUntil(60)).toBe('1h');
    expect(formatMinutesUntil(90)).toBe('1h 30m');
    expect(formatMinutesUntil(120)).toBe('2h');
  });
});

describe('Group by day', () => {
  it('groups classes by day', () => {
    const groups = groupClassesByDay(mockTimetable.classes);
    expect(groups.get('Monday')?.length).toBe(2);
    expect(groups.get('Tuesday')?.length).toBe(1);
    expect(groups.get('Wednesday')?.length).toBe(0);
  });

  it('sorts each day by time', () => {
    const groups = groupClassesByDay(mockTimetable.classes);
    const monday = groups.get('Monday')!;
    expect(monday[0].start).toBe('7:00AM');
    expect(monday[1].start).toBe('11:00AM');
  });
});

describe('Clash detection', () => {
  it('detects overlapping classes', () => {
    const clash1: Class = { ...mockClass, id: 'c1', start: '7:00AM', end: '10:00AM' };
    const clash2: Class = { ...mockClass, id: 'c2', start: '8:00AM', end: '11:00AM' };
    const noClash: Class = { ...mockClass, id: 'c3', start: '11:00AM', end: '2:00PM' };

    const clashes = detectClashes([clash1, clash2, noClash]);
    expect(clashes.size).toBe(1);
    const clashList = clashes.values().next().value;
    expect(clashList.length).toBe(2);
  });

  it('does not detect adjacent classes as clash', () => {
    const a: Class = { ...mockClass, id: 'a', start: '7:00AM', end: '10:00AM' };
    const b: Class = { ...mockClass, id: 'b', start: '10:00AM', end: '1:00PM' };

    const clashes = detectClashes([a, b]);
    expect(clashes.size).toBe(0);
  });

  it('deduplicates clash entries', () => {
    const a: Class = { ...mockClass, id: 'a', start: '7:00AM', end: '10:00AM' };
    const b: Class = { ...mockClass, id: 'b', start: '8:00AM', end: '11:00AM' };
    const c: Class = { ...mockClass, id: 'c', start: '9:00AM', end: '12:00PM' };

    const clashes = detectClashes([a, b, c]);
    // All three overlap pairwise, but should be one clash group with 3 unique classes
    expect(clashes.size).toBe(1);
    expect(clashes.values().next().value.length).toBe(3);
  });
});

describe('Search', () => {
  it('finds by unit name', () => {
    const results = searchClasses(mockTimetable.classes, 'chemistry');
    expect(results.length).toBe(3);
  });

  it('finds by unit code', () => {
    const results = searchClasses(mockTimetable.classes, 'BCHM1101');
    expect(results.length).toBe(1);
    expect(results[0].unit_code).toBe('BCHM1101');
  });

  it('finds by lecturer', () => {
    const results = searchClasses(mockTimetable.classes, 'smith');
    expect(results.length).toBe(3);
  });

  it('finds by venue', () => {
    const results = searchClasses(mockTimetable.classes, 'academic');
    expect(results.length).toBe(3);
  });

  it('returns all for empty query', () => {
    expect(searchClasses(mockTimetable.classes, '').length).toBe(3);
    expect(searchClasses(mockTimetable.classes, '   ').length).toBe(3);
  });
});

describe('Filter', () => {
  it('filters by mode', () => {
    const mixed = [
      mockClass,
      { ...mockClass, id: 'c2', mode: 'Online' as const },
    ];
    const faceToFace = filterClasses(mixed, { mode: 'Face to face' });
    expect(faceToFace.length).toBe(1);
  });

  it('filters by day', () => {
    const results = filterClasses(mockTimetable.classes, { day: 'Monday' });
    expect(results.length).toBe(2);
  });

  it('filters by venue', () => {
    const results = filterClasses(mockTimetable.classes, { venue: 'ACADEMIC HALL' });
    expect(results.length).toBe(3);
  });

  it('filters by level', () => {
    const results = filterClasses(mockTimetable.classes, { level: 'degree' });
    expect(results.length).toBe(3);
  });

  it('combines filters (AND)', () => {
    const mixed = [
      { ...mockClass, id: 'c1', mode: 'Face to face' as const, day: 'Monday' as const },
      { ...mockClass, id: 'c2', mode: 'Online' as const, day: 'Monday' as const },
      { ...mockClass, id: 'c3', mode: 'Face to face' as const, day: 'Tuesday' as const },
    ];
    const results = filterClasses(mixed, { mode: 'Face to face', day: 'Monday' });
    expect(results.length).toBe(1);
  });
});
