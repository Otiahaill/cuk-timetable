/* Data layer tests — CampusPulse */

import { describe, it, expect, vi } from 'vitest';
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
  getMinutesUntilStart,
  formatMinutesUntil,
  groupClassesByDay,
  detectClashes,
  searchClasses,
  filterClasses,
  getCourses,
} from './data';

import type { TimetableData, Class, ChangesData } from './types';

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
  courses: [{ code: 'BCHM1.1', level: 'degree', class_count: 3 }],
  classes: [mockClass, mockClass2, mockClassTue],
};

describe('Time parsing', () => {
  it('parses 7:00AM correctly', () => {
    expect(parseTime('7:00AM')).toBe(7 * 60);
  });

  it('parses 12:00AM (midnight) correctly', () => {
    expect(parseTime('12:00AM')).toBe(0);
  });

  it('parses 12:00PM (noon) correctly', () => {
    expect(parseTime('12:00PM')).toBe(12 * 60);
  });

  it('parses 1:00PM correctly', () => {
    expect(parseTime('1:00PM')).toBe(13 * 60);
  });

  it('parses 11:59PM correctly', () => {
    expect(parseTime('11:59PM')).toBe(23 * 60 + 59);
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
    expect(dayIndex('Saturday' as never)).toBe(-1);
    expect(dayIndex('Sunday' as never)).toBe(-1);
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
    expect(validateTimetable({ ...mockTimetable, meta: undefined })).toBe(false);
  });

  it('rejects a missing courses array', () => {
    expect(validateTimetable({ ...mockTimetable, courses: undefined })).toBe(false);
  });

  it('rejects a missing classes array', () => {
    expect(validateTimetable({ ...mockTimetable, classes: undefined })).toBe(false);
  });

  it('rejects a null array', () => {
    expect(validateTimetable({ ...mockTimetable, classes: null })).toBe(false);
  });

  it('rejects invalid course', () => {
    expect(
      validateTimetable({
        ...mockTimetable,
        courses: [{ code: 'X', level: 'invalid' as 'degree', class_count: 1 }],
      })
    ).toBe(false);
  });

  it('rejects invalid class day', () => {
    expect(
      validateTimetable({
        ...mockTimetable,
        classes: [{ ...mockClass, day: 'Someday' as Class['day'] }],
      })
    ).toBe(false);
  });

  it('rejects invalid mode', () => {
    expect(
      validateTimetable({
        ...mockTimetable,
        classes: [{ ...mockClass, mode: 'Hybrid' as Class['mode'] }],
      })
    ).toBe(false);
  });

  it('rejects invalid time format', () => {
    expect(
      validateTimetable({ ...mockTimetable, classes: [{ ...mockClass, start: '7:00' }] })
    ).toBe(false);
  });

  it('rejects a non-string time', () => {
    expect(
      validateTimetable({
        ...mockTimetable,
        classes: [{ ...mockClass, start: 700 as unknown as string }],
      })
    ).toBe(false);
  });

  it('rejects end time before start time', () => {
    expect(
      validateTimetable({
        ...mockTimetable,
        classes: [{ ...mockClass, start: '10:00AM', end: '7:00AM' }],
      })
    ).toBe(false);
  });

  it('rejects an invalid hour', () => {
    expect(
      validateTimetable({ ...mockTimetable, classes: [{ ...mockClass, start: '13:00AM' }] })
    ).toBe(false);
  });

  it('rejects an invalid minute', () => {
    expect(
      validateTimetable({ ...mockTimetable, classes: [{ ...mockClass, start: '7:60AM' }] })
    ).toBe(false);
  });

  it('rejects duplicate composite keys', () => {
    expect(
      validateTimetable({
        ...mockTimetable,
        classes: [mockClass, { ...mockClass, id: 'cls_002' }],
      })
    ).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(validateTimetable(null)).toBe(false);
    expect(validateTimetable('nope')).toBe(false);
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
    expect(
      validateChanges({
        ...validChanges,
        changes: [
          {
            match: {} as ChangesData['changes'][number]['match'],
            reason: '',
            date: '',
          },
        ],
      })
    ).toBe(false);
  });

  it('rejects invalid cancel type', () => {
    expect(
      validateChanges({
        ...validChanges,
        changes: [{ ...validChanges.changes[0], cancel: 'yes' as unknown as boolean }],
      })
    ).toBe(false);
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
    applyChanges(mockTimetable.classes, changes);
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Change matches no class')
    );
    consoleWarn.mockRestore();
  });

  it('does not mutate the original array', () => {
    const original = [...mockTimetable.classes];
    applyChanges(mockTimetable.classes, changes);
    expect(mockTimetable.classes).toEqual(original);
  });
});

describe('Course filtering', () => {
  it('returns classes for course minus hidden', () => {
    const result = getClassesForCourse(mockTimetable, 'BCHM1.1', ['BCHM1102']);
    expect(result.length).toBe(2);
    expect(result.every((c) => c.unit_code !== 'BCHM1102')).toBe(true);
  });

  it('returns empty for unknown course', () => {
    expect(getClassesForCourse(mockTimetable, 'UNKNOWN', []).length).toBe(0);
  });

  it('sorts by day then start time', () => {
    const result = getClassesForCourse(mockTimetable, 'BCHM1.1', []);
    expect(result.map((c) => c.day)).toEqual(['Monday', 'Monday', 'Tuesday']);
    expect(result[0].start).toBe('7:00AM');
  });

  it('sorts 10:00AM before 7:00AM correctly', () => {
    const early: Class = { ...mockClass, id: 'a', start: '7:00AM', end: '10:00AM' };
    const late: Class = { ...mockClass, id: 'b', start: '10:00AM', end: '1:00PM' };
    const result = getClassesForCourse(
      { ...mockTimetable, classes: [late, early] },
      'BCHM1.1',
      []
    );
    expect(result[0].id).toBe('a');
  });

  it('sorts courses by code', () => {
    const courses = getCourses({
      ...mockTimetable,
      courses: [
        { code: 'ZCODE', level: 'degree', class_count: 1 },
        { code: 'ACODE', level: 'degree', class_count: 1 },
      ],
    });
    expect(courses.map((c) => c.code)).toEqual(['ACODE', 'ZCODE']);
  });
});

describe('Today filtering', () => {
  it('returns Monday classes when today is Monday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-30T10:00:00+03:00'));
    const result = getTodaysClasses(mockTimetable.classes);
    expect(result.length).toBe(2);
    expect(result.every((c) => c.day === 'Monday')).toBe(true);
    vi.useRealTimers();
  });

  it('returns empty on weekend', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-05T10:00:00+03:00'));
    expect(getTodaysClasses(mockTimetable.classes).length).toBe(0);
    vi.useRealTimers();
  });

  it('sorts today classes by real clock order, not string order', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-30T06:00:00+03:00'));
    const result = getTodaysClasses(mockTimetable.classes);
    expect(result.map((c) => c.start)).toEqual(['7:00AM', '11:00AM']);
    vi.useRealTimers();
  });
});

describe('Next class', () => {
  const mondayClasses = [mockClass, mockClass2];

  it('returns first class before any class', () => {
    expect(getNextClass(mondayClasses, 6 * 60)?.unit_code).toBe('BCHM1101');
  });

  it('returns second class between classes', () => {
    expect(getNextClass(mondayClasses, 10 * 60 + 30)?.unit_code).toBe('BCHM1102');
  });

  it('returns the in-progress class while it is running', () => {
    expect(getNextClass(mondayClasses, 8 * 60)?.unit_code).toBe('BCHM1101');
  });

  it('returns null after last class', () => {
    expect(getNextClass(mondayClasses, 15 * 60)).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(getNextClass([], 10 * 60)).toBeNull();
  });
});

describe('Minutes until start', () => {
  it('calculates a number', () => {
    expect(typeof getMinutesUntilStart(mockClass)).toBe('number');
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
    expect(clashes.values().next().value?.length).toBe(2);
  });

  it('does not detect adjacent classes as clash', () => {
    const a: Class = { ...mockClass, id: 'a', start: '7:00AM', end: '10:00AM' };
    const b: Class = { ...mockClass, id: 'b', start: '10:00AM', end: '1:00PM' };

    expect(detectClashes([a, b]).size).toBe(0);
  });

  it('groups transitively overlapping classes into one entry', () => {
    const a: Class = { ...mockClass, id: 'a', start: '7:00AM', end: '10:00AM' };
    const b: Class = { ...mockClass, id: 'b', start: '8:00AM', end: '11:00AM' };
    const c: Class = { ...mockClass, id: 'c', start: '9:00AM', end: '12:00PM' };

    const clashes = detectClashes([a, b, c]);
    expect(clashes.size).toBe(1);
    expect(clashes.values().next().value?.length).toBe(3);
  });

  it('does not clash across different days', () => {
    const mon: Class = { ...mockClass, id: 'm', day: 'Monday', start: '7:00AM', end: '10:00AM' };
    const tue: Class = { ...mockClass, id: 't', day: 'Tuesday', start: '7:00AM', end: '10:00AM' };

    expect(detectClashes([mon, tue]).size).toBe(0);
  });
});

describe('Search', () => {
  it('finds by unit name', () => {
    expect(searchClasses(mockTimetable.classes, 'chemistry').length).toBe(3);
  });

  it('finds by unit code', () => {
    const results = searchClasses(mockTimetable.classes, 'BCHM1101');
    expect(results.length).toBe(1);
    expect(results[0].unit_code).toBe('BCHM1101');
  });

  it('finds by lecturer', () => {
    expect(searchClasses(mockTimetable.classes, 'smith').length).toBe(3);
  });

  it('finds by venue', () => {
    expect(searchClasses(mockTimetable.classes, 'academic').length).toBe(3);
  });

  it('returns all for empty query', () => {
    expect(searchClasses(mockTimetable.classes, '').length).toBe(3);
    expect(searchClasses(mockTimetable.classes, '   ').length).toBe(3);
  });
});

describe('Filter', () => {
  it('filters by mode', () => {
    const mixed: Class[] = [mockClass, { ...mockClass, id: 'c2', mode: 'Online' }];
    expect(filterClasses(mixed, { mode: 'Face to face' }).length).toBe(1);
  });

  it('filters by day', () => {
    expect(filterClasses(mockTimetable.classes, { day: 'Monday' }).length).toBe(2);
  });

  it('filters by venue', () => {
    expect(filterClasses(mockTimetable.classes, { venue: 'ACADEMIC HALL' }).length).toBe(3);
  });

  it('filters by level', () => {
    expect(filterClasses(mockTimetable.classes, { level: 'degree' }).length).toBe(3);
  });

  it('combines filters (AND)', () => {
    const mixed: Class[] = [
      { ...mockClass, id: 'c1', mode: 'Face to face', day: 'Monday' },
      { ...mockClass, id: 'c2', mode: 'Online', day: 'Monday' },
      { ...mockClass, id: 'c3', mode: 'Face to face', day: 'Tuesday' },
    ];
    expect(filterClasses(mixed, { mode: 'Face to face', day: 'Monday' }).length).toBe(1);
  });
});
