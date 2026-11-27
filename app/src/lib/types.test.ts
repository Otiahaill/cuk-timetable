/* Types module tests — CampusPulse */

import { describe, it, expect } from 'vitest';
import {
  parseTime,
  formatTime,
  formatTimeRange,
  dayIndex,
  classKey,
  isClassHidden,
  getNairobiDayName,
  getNairobiMinutes,
  isNairobiWeekend,
  formatNairobiDate,
  getNextMondayDate,
} from './types';
import type { Class } from './types';

describe('parseTime edge cases (12-hour format)', () => {
  it('parses 12:00AM as midnight (0 minutes)', () => {
    expect(parseTime('12:00AM')).toBe(0);
  });

  it('parses 12:00PM as noon (720 minutes)', () => {
    expect(parseTime('12:00PM')).toBe(12 * 60);
  });

  it('parses 12:30AM as 0:30 (30 minutes)', () => {
    expect(parseTime('12:30AM')).toBe(30);
  });

  it('parses 12:30PM as 12:30 (750 minutes)', () => {
    expect(parseTime('12:30PM')).toBe(12 * 60 + 30);
  });

  it('parses 12:59AM as 0:59 (59 minutes)', () => {
    expect(parseTime('12:59AM')).toBe(59);
  });

  it('parses 12:59PM as 12:59 (779 minutes)', () => {
    expect(parseTime('12:59PM')).toBe(12 * 60 + 59);
  });

  it('parses 1:00AM as 1:00 (60 minutes)', () => {
    expect(parseTime('1:00AM')).toBe(60);
  });

  it('parses 11:00AM as 11:00 (660 minutes)', () => {
    expect(parseTime('11:00AM')).toBe(11 * 60);
  });

  it('parses 1:00PM as 13:00 (780 minutes)', () => {
    expect(parseTime('1:00PM')).toBe(13 * 60);
  });

  it('parses 11:00PM as 23:00 (1380 minutes)', () => {
    expect(parseTime('11:00PM')).toBe(23 * 60);
  });

  it('parses 7:05AM correctly', () => {
    expect(parseTime('7:05AM')).toBe(7 * 60 + 5);
  });

  it('parses 7:59AM correctly', () => {
    expect(parseTime('7:59AM')).toBe(7 * 60 + 59);
  });

  it('parses lowercase am/pm', () => {
    expect(parseTime('7:00am')).toBe(7 * 60);
    expect(parseTime('7:00pm')).toBe(19 * 60);
  });

  it('throws on 24-hour format', () => {
    expect(() => parseTime('19:00')).toThrow();
  });

  it('throws on missing meridiem', () => {
    expect(() => parseTime('7:00')).toThrow();
  });

  it('throws on invalid hour', () => {
    expect(() => parseTime('0:00AM')).toThrow();
    expect(() => parseTime('13:00AM')).toThrow();
  });

  it('throws on invalid minute', () => {
    expect(() => parseTime('7:60AM')).toThrow();
  });
});

describe('formatTime (inverse of parseTime)', () => {
  it('formats midnight correctly', () => {
    expect(formatTime(0)).toBe('12:00 AM');
  });

  it('formats noon correctly', () => {
    expect(formatTime(12 * 60)).toBe('12:00 PM');
  });

  it('formats 1:30 AM correctly', () => {
    expect(formatTime(90)).toBe('1:30 AM');
  });

  it('formats 1:30 PM correctly', () => {
    expect(formatTime(13 * 60 + 30)).toBe('1:30 PM');
  });

  it('formats 11:59 PM correctly', () => {
    expect(formatTime(23 * 60 + 59)).toBe('11:59 PM');
  });

  it('round-trips parseTime -> formatTime -> parseTime', () => {
    const testTimes = [
      '12:00AM', '12:30AM', '1:00AM', '7:00AM', '11:59AM',
      '12:00PM', '12:30PM', '1:00PM', '7:00PM', '11:59PM',
    ];
    for (const t of testTimes) {
      const mins = parseTime(t);
      expect(parseTime(formatTime(mins))).toBe(mins);
    }
  });
});

describe('formatTimeRange', () => {
  it('formats range correctly', () => {
    expect(formatTimeRange('7:00AM', '10:00AM')).toBe('7:00 AM – 10:00 AM');
    expect(formatTimeRange('12:00PM', '1:00PM')).toBe('12:00 PM – 1:00 PM');
    expect(formatTimeRange('11:30AM', '12:30PM')).toBe('11:30 AM – 12:30 PM');
  });
});

describe('dayIndex', () => {
  it('returns 0-4 for Mon-Fri', () => {
    expect(dayIndex('Monday')).toBe(0);
    expect(dayIndex('Friday')).toBe(4);
  });

  it('returns -1 for weekend', () => {
    expect(dayIndex('Saturday' as never)).toBe(-1);
    expect(dayIndex('Sunday' as never)).toBe(-1);
  });
});

describe('classKey (composite key)', () => {
  it('generates consistent key for same inputs', () => {
    const key1 = classKey({ course: 'BCHM1.1', unit_code: 'BCHM1101', day: 'Monday', start: '7:00AM' });
    const key2 = classKey({ course: 'BCHM1.1', unit_code: 'BCHM1101', day: 'Monday', start: '7:00AM' });
    expect(key1).toBe(key2);
  });

  it('handles null unit_code', () => {
    const key = classKey({ course: 'BCHM1.1', unit_code: null, day: 'Monday', start: '7:00AM' });
    expect(key).toBe('BCHM1.1|NULL|Monday|7:00AM');
  });

  it('differs for every component', () => {
    const base = { course: 'BCHM1.1', unit_code: 'BCHM1101', day: 'Monday' as const, start: '7:00AM' };
    const baseKey = classKey(base);
    expect(classKey({ ...base, course: 'BCHM2.1' })).not.toBe(baseKey);
    expect(classKey({ ...base, unit_code: 'BCHM1102' })).not.toBe(baseKey);
    expect(classKey({ ...base, day: 'Tuesday' })).not.toBe(baseKey);
    expect(classKey({ ...base, start: '11:00AM' })).not.toBe(baseKey);
  });
});

describe('isClassHidden', () => {
  const cls: Class = {
    id: 'cls_001',
    course: 'BCHM1.1',
    unit_code: 'BCHM1101',
    unit_name: 'TEST',
    lecturer: 'Dr. Smith',
    class_size: 30,
    day: 'Monday',
    start: '7:00AM',
    end: '10:00AM',
    mode: 'Face to face',
    venue: 'HALL',
    level: 'degree',
    groups: [],
    source_page: 1,
  };

  it('returns false for non-hidden unit', () => {
    expect(isClassHidden(cls, ['OTHER'])).toBe(false);
  });

  it('returns true for hidden unit', () => {
    expect(isClassHidden(cls, ['BCHM1101'])).toBe(true);
  });

  it('returns false for null unit_code', () => {
    expect(isClassHidden({ ...cls, unit_code: null }, ['BCHM1101'])).toBe(false);
  });

  it('returns false for empty hidden list', () => {
    expect(isClassHidden(cls, [])).toBe(false);
  });
});

describe('Africa/Nairobi time helpers', () => {
  it('returns the Nairobi weekday name', () => {
    // 2026-11-30T10:00:00+03:00 is a Monday in Nairobi
    expect(getNairobiDayName(new Date('2026-11-30T10:00:00+03:00'))).toBe('Monday');
  });

  it('returns Nairobi minutes since midnight', () => {
    expect(getNairobiMinutes(new Date('2026-11-30T07:30:00+03:00'))).toBe(7 * 60 + 30);
  });

  it('detects weekends', () => {
    expect(isNairobiWeekend(new Date('2026-12-05T10:00:00+03:00'))).toBe(true);
    expect(isNairobiWeekend(new Date('2026-11-30T10:00:00+03:00'))).toBe(false);
  });

  it('formats a long date', () => {
    expect(formatNairobiDate(new Date('2026-11-30T10:00:00+03:00'))).toContain('November');
  });

  it('finds the next Monday', () => {
    const monday = getNextMondayDate(new Date('2026-11-30T10:00:00+03:00'));
    expect(getNairobiDayName(monday)).toBe('Monday');
  });
});
