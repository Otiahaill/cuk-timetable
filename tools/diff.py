#!/usr/bin/env python3
"""
Compare two timetable.json files and show human-readable differences.

Usage: python tools/diff.py old.json new.json
"""

import json
import sys
from typing import Any, Dict, List, Set, Tuple

def class_key(cls: Dict[str, Any]) -> str:
    """Generate composite key: course|unit_code|day|start"""
    return f"{cls['course']}|{cls.get('unit_code', 'NULL')}|{cls['day']}|{cls['start']}"

def format_class(cls: Dict[str, Any]) -> str:
    """Format a class for display."""
    unit = f"{cls.get('unit_code', 'NO CODE')} · " if cls.get('unit_code') else ''
    return f"  {cls['day']} {cls['start']}-{cls['end']} | {unit}{cls['unit_name']} @ {cls['venue']} ({cls['mode']})"

def diff_timetables(old: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
    """Compare two timetables."""
    old_classes = {class_key(c): c for c in old.get('classes', [])}
    new_classes = {class_key(c): c for c in new.get('classes', [])}

    old_keys = set(old_classes.keys())
    new_keys = set(new_classes.keys())

    added = new_keys - old_keys
    removed = old_keys - new_keys
    common = old_keys & new_keys

    # Check for modifications in common classes
    modified = []
    for key in common:
        old_cls = old_classes[key]
        new_cls = new_classes[key]
        changes = []

        # Compare all fields
        all_fields = set(old_cls.keys()) | set(new_cls.keys())
        for field in all_fields:
            old_val = old_cls.get(field)
            new_val = new_cls.get(field)
            if old_val != new_val:
                changes.append(f"    {field}: {old_val} → {new_val}")

        if changes:
            modified.append((key, changes))

    # Meta changes
    old_meta = old.get('meta', {})
    new_meta = new.get('meta', {})
    meta_changes = []
    for field in set(old_meta.keys()) | set(new_meta.keys()):
        old_val = old_meta.get(field)
        new_val = new_meta.get(field)
        if old_val != new_val:
            meta_changes.append(f"  {field}: {old_val} → {new_val}")

    # Course changes
    old_courses = {c['code']: c for c in old.get('courses', [])}
    new_courses = {c['code']: c for c in new.get('courses', [])}
    old_course_codes = set(old_courses.keys())
    new_course_codes = set(new_courses.keys())

    added_courses = new_course_codes - old_course_codes
    removed_courses = old_course_codes - new_course_codes

    return {
        'added': [new_classes[k] for k in sorted(added)],
        'removed': [old_classes[k] for k in sorted(removed)],
        'modified': modified,
        'meta_changes': meta_changes,
        'added_courses': sorted(added_courses),
        'removed_courses': sorted(removed_courses),
    }

def main():
    if len(sys.argv) != 3:
        print('Usage: python tools/diff.py old.json new.json')
        sys.exit(1)

    old_path, new_path = sys.argv[1], sys.argv[2]

    try:
        with open(old_path, 'r', encoding='utf-8') as f:
            old = json.load(f)
    except Exception as e:
        print(f'ERROR reading {old_path}: {e}')
        sys.exit(1)

    try:
        with open(new_path, 'r', encoding='utf-8') as f:
            new = json.load(f)
    except Exception as e:
        print(f'ERROR reading {new_path}: {e}')
        sys.exit(1)

    diff = diff_timetables(old, new)

    print(f'Diff: {old_path} → {new_path}')
    print('=' * 60)

    # Meta changes
    if diff['meta_changes']:
        print('\n📋 Meta changes:')
        for change in diff['meta_changes']:
            print(change)

    # Course changes
    if diff['added_courses']:
        print(f'\n➕ Courses added ({len(diff["added_courses"])}):')
        for code in diff['added_courses']:
            print(f'  + {code}')
    if diff['removed_courses']:
        print(f'\n➖ Courses removed ({len(diff["removed_courses"])}):')
        for code in diff['removed_courses']:
            print(f'  - {code}')

    # Class changes
    if diff['added']:
        print(f'\n➕ Classes added ({len(diff["added"])}):')
        for cls in diff['added']:
            print(format_class(cls))

    if diff['removed']:
        print(f'\n➖ Classes removed ({len(diff["removed"])}):')
        for cls in diff['removed']:
            print(format_class(cls))

    if diff['modified']:
        print(f'\n🔄 Classes modified ({len(diff["modified"])}):')
        for key, changes in diff['modified']:
            print(f'  {key}')
            for change in changes:
                print(change)

    # Summary
    total_changes = len(diff['added']) + len(diff['removed']) + len(diff['modified'])
    if total_changes == 0 and not diff['meta_changes'] and not diff['added_courses'] and not diff['removed_courses']:
        print('\n✓ No changes detected')
    else:
        print(f'\n📊 Summary: +{len(diff["added"])} -{len(diff["removed"])} ~{len(diff["modified"])} classes, {len(diff["meta_changes"])} meta, {len(diff["added_courses"])} courses added, {len(diff["removed_courses"])} removed')

if __name__ == '__main__':
    main()
