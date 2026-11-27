#!/usr/bin/env python3
"""
Validate timetable.json against the data contract.

Checks:
- Required fields present
- Valid day/mode/level values
- Time format (12-hour)
- End time > start time
- Composite key uniqueness
- Unit codes have siblings (same unit_code appears in other courses)
- Same-course same-slot clashes (warning, not error)

Usage: python tools/validate.py [data/timetable.json]
"""

import json
import sys
from datetime import datetime
from typing import Any, Dict, List, Set, Tuple

REQUIRED_TOP_LEVEL = ['meta', 'courses', 'classes']
REQUIRED_META = ['title', 'institution', 'source_file', 'source_pages', 'time_format', 'total_classes', 'total_courses', 'notes', 'data_quality']
REQUIRED_COURSE = ['code', 'level', 'class_count']
REQUIRED_CLASS = ['id', 'course', 'unit_name', 'lecturer', 'day', 'start', 'end', 'mode', 'venue', 'level', 'groups', 'source_page']
VALID_DAYS = {'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'}
VALID_MODES = {'Face to face', 'Online', 'Blended'}
VALID_LEVELS = {'degree', 'diploma/certificate'}


def parse_time(time_str: str) -> int:
    """Parse '7:00AM' -> minutes since midnight."""
    import re
    match = re.match(r'^(\d{1,2}):(\d{2})(AM|PM)$', time_str, re.IGNORECASE)
    if not match:
        raise ValueError(f'Invalid time format: {time_str}')
    hours = int(match.group(1))
    minutes = int(match.group(2))
    meridiem = match.group(3).upper()
    if meridiem == 'PM' and hours != 12:
        hours += 12
    if meridiem == 'AM' and hours == 12:
        hours = 0
    return hours * 60 + minutes


def class_key(cls: Dict[str, Any]) -> str:
    """Generate composite key: course|unit_code|day|start"""
    return f"{cls['course']}|{cls.get('unit_code', 'NULL')}|{cls['day']}|{cls['start']}"


def validate(data: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    """Returns (errors, warnings)"""
    errors = []
    warnings = []

    # Top-level structure
    for field in REQUIRED_TOP_LEVEL:
        if field not in data:
            errors.append(f'Missing top-level field: {field}')

    if errors:
        return errors, warnings

    # Meta validation
    meta = data.get('meta', {})
    for field in REQUIRED_META:
        if field not in meta:
            errors.append(f'Missing meta field: {field}')

    if 'total_classes' in meta and meta['total_classes'] != len(data.get('classes', [])):
        warnings.append(f"meta.total_classes ({meta['total_classes']}) != actual classes ({len(data.get('classes', []))})")

    if 'total_courses' in meta and meta['total_courses'] != len(data.get('courses', [])):
        warnings.append(f"meta.total_courses ({meta['total_courses']}) != actual courses ({len(data.get('courses', []))})")

    # Courses validation
    course_codes = set()
    for i, course in enumerate(data.get('courses', [])):
        for field in REQUIRED_COURSE:
            if field not in course:
                errors.append(f'Course[{i}] missing field: {field}')
        if course.get('code') in course_codes:
            errors.append(f'Duplicate course code: {course["code"]}')
        course_codes.add(course.get('code', ''))
        if course.get('level') not in VALID_LEVELS:
            errors.append(f'Course[{i}] invalid level: {course.get("level")}')
        if not isinstance(course.get('class_count'), int) or course['class_count'] < 0:
            errors.append(f'Course[{i}] invalid class_count: {course.get("class_count")}')

    # Classes validation
    seen_keys: Set[str] = set()
    unit_code_to_courses: Dict[str, Set[str]] = {}
    class_by_course_day_time: Dict[Tuple[str, str, int], List[Dict]] = {}

    for i, cls in enumerate(data.get('classes', [])):
        # Required fields
        for field in REQUIRED_CLASS:
            if field not in cls:
                errors.append(f'Class[{i}] ({cls.get("id", "unknown")}) missing field: {field}')

        # Day
        if cls.get('day') not in VALID_DAYS:
            errors.append(f'Class[{i}] invalid day: {cls.get("day")}')

        # Mode
        if cls.get('mode') not in VALID_MODES:
            errors.append(f'Class[{i}] invalid mode: {cls.get("mode")}')

        # Level
        if cls.get('level') not in VALID_LEVELS:
            errors.append(f'Class[{i}] invalid level: {cls.get("level")}')

        # Time format and order
        try:
            start_mins = parse_time(cls['start'])
            end_mins = parse_time(cls['end'])
            if end_mins <= start_mins:
                errors.append(f'Class[{i}] end time <= start time: {cls["start"]} - {cls["end"]}')
        except ValueError as e:
            errors.append(f'Class[{i}] time parse error: {e}')

        # Groups array
        if not isinstance(cls.get('groups'), list):
            errors.append(f'Class[{i}] groups must be array')

        # Source page
        if not isinstance(cls.get('source_page'), int) or cls['source_page'] < 1:
            errors.append(f'Class[{i}] invalid source_page: {cls.get("source_page")}')

        # Composite key uniqueness
        key = class_key(cls)
        if key in seen_keys:
            errors.append(f'Duplicate composite key: {key}')
        seen_keys.add(key)

        # Track unit_code -> courses (for sibling check)
        unit_code = cls.get('unit_code')
        if unit_code:
            unit_code_to_courses.setdefault(unit_code, set()).add(cls['course'])

        # Track for same-course same-slot clash detection
        cdt_key = (cls['course'], cls['day'], start_mins)
        class_by_course_day_time.setdefault(cdt_key, []).append(cls)

    # Check unit codes have siblings (appear in multiple courses)
    for unit_code, courses in unit_code_to_courses.items():
        if len(courses) == 1:
            warnings.append(f'Unit code {unit_code} appears in only one course: {list(courses)[0]}')

    # Same-course same-slot clashes (warning, source may have them)
    for (course, day, start_mins), classes in class_by_course_day_time.items():
        if len(classes) > 1:
            # Check actual time overlap
            for i in range(len(classes)):
                for j in range(i + 1, len(classes)):
                    a, b = classes[i], classes[j]
                    a_end = parse_time(a['end'])
                    b_end = parse_time(b['end'])
                    if start_mins < b_end and parse_time(b['start']) < a_end:
                        warnings.append(
                            f'Same-course clash: {course} {day} {a["start"]}-{a["end"]} '
                            f'({a["unit_code"]}) vs ({b["unit_code"]})'
                        )

    return errors, warnings


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else 'data/timetable.json'

    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f'ERROR: File not found: {path}')
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f'ERROR: Invalid JSON: {e}')
        sys.exit(1)

    print(f'Validating {path}...')
    errors, warnings = validate(data)

    if warnings:
        print(f'\nWarnings ({len(warnings)}):')
        for w in warnings:
            print(f'  ⚠ {w}')

    if errors:
        print(f'\nErrors ({len(errors)}):')
        for e in errors:
            print(f'  ✗ {e}')
        sys.exit(1)

    print('\n✓ Validation passed!')
    print(f'  Courses: {len(data.get("courses", []))}')
    print(f'  Classes: {len(data.get("classes", []))}')
    if 'meta' in data:
        print(f"  Version: {data['meta'].get('version', 'N/A')}")


if __name__ == '__main__':
    main()
