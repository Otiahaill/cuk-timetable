/* Types module tests — CampusPulse */

import { describe, it, expect } from 'vitest';
import {
  parseTime,
  formatTime,
  formatTimeRange,
  dayIndex,
  classKey,
  isClassHidden,
} from './types';

describe('parseTime edge cases (12-hour format)', () => {
  // 12AM / 12PM edge cases
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

  // Regular hours
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

  // Minutes precision
  it('parses 7:05AM correctly', () => {
    expect(parseTime('7:05AM')).toBe(7 * 60 + 5);
  });

  it('parses 7:59AM correctly', () => {
    expect(parseTime('7:59AM')).toBe(7 * 60 + 59);
  });

  // Case insensitivity
  it('parses lowercase am/pm', () => {
    expect(parseTime('7:00am')).toBe(7 * 60);
    expect(parseTime('7:00pm')).toBe(19 * 60);
  });

  it('parses mixed case am/pm', () => {
    expect(parseTime('7:00Am')).toBe(7 * 60);
    expect(parseTime('7:00Pm')).toBe(19 * 60);
  });

  // Invalid formats
  it('throws on 24-hour format', () => {
    expect(() => parseTime('19:00')).toThrow();
  });

  it('throws on missing meridiem', () => {
    expect(() => parseTime('7:00')).toThrow();
  });

  it('throws on invalid hour', () => {
    expect(() => parseTime('0:00AM')).toThrow(); // 12-hour uses 1-12
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

  it('round-trip: parseTime -> formatTime -> parseTime', () => {
    const testTimes = [
      '12:00AM', '12:30AM', '1:00AM', '7:00AM', '11:59AM',
      '12:00PM', '12:30PM', '1:00PM', '7:00PM', '11:59PM',
    ];
    for (const t of testTimes) {
      const mins = parseTime(t);
      const formatted = formatTime(mins);
      const reparsed = parseTime(formatted);
      expect(reparsed).toBe(mins);
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

  it('differs for different courses', () => {
    const key1 = classKey({ course: 'BCHM1.1', unit_code: 'BCHM1101', day: 'Monday', start: '7:00AM' });
    const key2 = classKey({ course: 'BCHM2.1', unit_code: 'BCHM1101', day: 'Monday', start: '7:00AM' });
    expect(key1).not.toBe(key2);
  });

  it('differs for different unit codes', () => {
    const key1 = classKey({ course: 'BCHM1.1', unit_code: 'BCHM1101', day: 'Monday', start: '7:00AM' });
    const key2 = classKey({ course: 'BCHM1.1', unit_code: 'BCHM1102', day: 'Monday', start: '7:00AM' });
    expect(key1).not.toBe(key2);
  });

  it('differs for different days', () => {
    const key1 = classKey({ course: 'BCHM1.1', unit_code: 'BCHM1101', day: 'Monday', start: '7:00AM' });
    const key2 = classKey({ course: 'BCHM1.1', unit_code: 'BCHM1101', day: 'Tuesday', start: '7:00AM' });
    expect(key1).not.toBe(key2);
  });

  it('differs for different start times', () => {
    const key1 = classKey({ course: 'BCHM1.1', unit_code: 'BCHM1101', day: 'Monday', start: '7:00AM' });
    const key2 = classKey({ course: 'BCHM1.1', unit_code: 'BCHM1101', day: 'Monday', start: '11:00AM' });
    expect(key1).not.toBe(key2);
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
    const clsNull = { ...cls, unit_code: null };
    expect(isClassHidden(clsNull, ['BCHM1101'])).toBe(false);
  });

  it('returns false for empty hidden list', () => {
    expect(isClassHidden(cls, [])).toBe(false);
  });
});

// Need to import Class type
import type { Class } from './types';
