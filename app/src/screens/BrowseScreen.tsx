/* Browse screen — Search + filter chips + results per Stitch */

import { useState, useEffect, useMemo } from 'preact/hooks';
import { usePreferences } from '../lib/prefs';
import { loadTimetable, getClassesForCourse, searchClasses, filterClasses, parseTime, formatTimeRange, formatTime } from '../lib/data';
import type { Class, TimetableData } from '../lib/types';
import { ClassDetailSheet } from '../components/ClassDetailSheet';

type FilterType = 'mode' | 'day' | 'venue' | 'level';

export function BrowseScreen() {
  const { prefs, isUnitHidden } = usePreferences();
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<FilterType, string | null>>({
    mode: null,
    day: null,
    venue: null,
    level: null,
  });
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  // Load timetable
  useEffect(() => {
    loadTimetable()
      .then((data) => {
        setTimetable(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load timetable:', err);
        setError('Failed to load timetable. Please check your connection.');
        setLoading(false);
      });
  }, []);

  // Get all classes for selected course (or all if no course selected)
  const baseClasses = useMemo(() => {
    if (!timetable) return [] as Class[];
    if (prefs.courseCode) {
      return getClassesForCourse(timetable, prefs.courseCode, prefs.hiddenUnitCodes);
    }
    return timetable.classes.filter((c) => !isUnitHidden(c.unit_code || ''));
  }, [timetable, prefs.courseCode, prefs.hiddenUnitCodes]);

  // Unique filter options from base classes
  const filterOptions = useMemo(() => {
    const modes = new Set<string>();
    const days = new Set<string>();
    const venues = new Set<string>();
    const levels = new Set<string>();

    for (const cls of baseClasses) {
      modes.add(cls.mode);
      days.add(cls.day);
      venues.add(cls.venue);
      levels.add(cls.level);
    }

    return {
      mode: Array.from(modes).sort(),
      day: Array.from(days).sort((a, b) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(a) - ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(b)),
      venue: Array.from(venues).sort(),
      level: Array.from(levels).sort(),
    };
  }, [baseClasses]);

  // Apply search and filters
  const filteredClasses = useMemo(() => {
    let result = baseClasses;

    if (searchQuery.trim()) {
      result = searchClasses(result, searchQuery);
    }

    const filters: { mode?: string; day?: string; venue?: string; level?: string } = {};
    if (selectedFilters.mode) filters.mode = selectedFilters.mode;
    if (selectedFilters.day) filters.day = selectedFilters.day;
    if (selectedFilters.venue) filters.venue = selectedFilters.venue;
    if (selectedFilters.level) filters.level = selectedFilters.level;

    result = filterClasses(result, filters);

    result.sort((a, b) => {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return parseTime(a.start) - parseTime(b.start);
    });

    return result;
  }, [baseClasses, searchQuery, selectedFilters]);

  // Toggle filter
  const toggleFilter = (type: FilterType, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [type]: prev[type] === value ? null : value,
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedFilters({ mode: null, day: null, venue: null, level: null });
  };

  // Check if any filters active
  const hasActiveFilters = Object.values(selectedFilters).some((v) => v !== null);

  // Mode chip styles
  const modeColors: Record<string, { bg: string; text: string }> = {
    'Face to face': { bg: 'var(--color-mode-face-to-face-container)', text: 'var(--color-mode-face-to-face)' },
    Online: { bg: 'var(--color-mode-online-container)', text: 'var(--color-mode-online)' },
    Blended: { bg: 'var(--color-mode-blended-container)', text: 'var(--color-mode-blended)' },
  };

  // Filter chip component
  const FilterChips = ({ label, options, type }: { label: string; options: string[]; type: FilterType }) => (
    <div className="flex items-center gap-gutter-sm px-gutter-sm">
      <span className="font-label text-label-sm text-on-surface-variant whitespace-nowrap">{label}</span>
      <div className="flex gap-gutter-sm overflow-x-auto pb-gutter-xs" role="group" aria-label={`${label} filters`}>
        {options.map((option) => {
          const isActive = selectedFilters[type] === option;
          let chipStyle: Record<string, string> = {};

          if (type === 'mode') {
            const colors = modeColors[option] || { bg: 'var(--color-surface-container)', text: 'var(--color-on-surface)' };
            chipStyle = isActive ? { backgroundColor: colors.text, color: colors.bg } : { backgroundColor: colors.bg, color: colors.text };
          } else {
            chipStyle = isActive ? { backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' } : { backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' };
          }

          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleFilter(type, option)}
              className={`filter-chip inline-flex items-center justify-center min-h-[48px] px-gutter-lg rounded-full font-label text-label-md whitespace-nowrap border ${isActive ? '' : 'border-outline-variant'}`}
              style={chipStyle}
              aria-pressed={isActive}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-page-margin">
        <div className="flex flex-col items-center gap-gutter-lg">
          <div className="w-[40px] h-[40px] border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-body text-body-md text-on-surface-variant">Loading classes…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-gutter-lg px-page-margin text-center">
        <span className="material-symbols-outlined text-[48px] text-error" aria-hidden="true">error</span>
        <p className="font-body text-body-md text-on-surface-variant max-w-[320px]">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
          Retry
        </button>
      </main>
    );
  }

  if (!prefs.courseCode) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-gutter-lg px-page-margin text-center">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant" aria-hidden="true">school</span>
        <p className="font-body text-body-lg text-on-surface">No course selected</p>
        <p className="font-body text-body-md text-on-surface-variant max-w-[320px]">
          Complete onboarding to browse your classes, or browse all courses.
        </p>
      </main>
    );
  }

  return (
    <main className="container flex-1 flex flex-col" style={{ paddingTop: 'var(--space-gutter-lg)' }}>
      {/* Pinned Search Bar */}
      <div className="sticky top-0 z-10 px-page-margin pb-gutter-md bg-surface/80 backdrop-blur-sm" style={{ backdropFilter: 'blur(8px)' }}>
        <form className="flex items-center w-full min-h-[48px] px-gutter-md rounded-lg bg-surface-container-high border border-outline-variant focus-within:border-primary" onSubmit={(e) => e.preventDefault()}>
          <span className="material-symbols-outlined text-[22px] text-on-surface-variant mr-gutter-sm" aria-hidden="true">search</span>
          <input
            type="search"
            placeholder="Search unit, code, lecturer, venue…"
            value={searchQuery}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            className="w-full bg-transparent border-0 p-0 text-body-md text-on-surface placeholder:text-outline focus:ring-0"
            aria-label="Search classes"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="btn btn-icon p-gutter-sm text-on-surface-variant" aria-label="Clear search">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          )}
        </form>
      </div>

      {/* Filter Chips */}
      <div className="sticky top-[60px] z-10 px-page-margin pb-gutter-md bg-surface/80 backdrop-blur-sm flex flex-col gap-gutter-sm" style={{ backdropFilter: 'blur(8px)' }}>
        <FilterChips label="Mode" options={filterOptions.mode} type="mode" />
        <FilterChips label="Day" options={filterOptions.day} type="day" />
        <FilterChips label="Venue" options={filterOptions.venue} type="venue" />
        <FilterChips label="Level" options={filterOptions.level} type="level" />
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="btn btn-ghost text-label-md self-start mx-gutter-sm">
            <span className="material-symbols-outlined" aria-hidden="true">filter_alt_off</span>
            Clear all filters
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="px-page-margin pb-gutter-sm">
        <p className="font-label text-label-md text-on-surface-variant">
          {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'} found
        </p>
      </div>

      {/* Results List */}
      <section className="flex-1 px-page-margin pb-gutter-xl" aria-label="Class results">
        {filteredClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-gutter-lg py-gutter-xl text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant" aria-hidden="true">search_off</span>
            <p className="font-headline text-title-lg text-on-surface">No classes match</p>
            <p className="font-body text-body-md text-on-surface-variant max-w-[320px]">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          filteredClasses.map((cls, idx) => {
            return (
              <button
                key={`${cls.id}-${idx}`}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className="card p-gutter-md w-full text-left flex items-center gap-gutter-md active:opacity-80 transition-opacity mb-gutter-sm"
                aria-label={`${cls.unit_name} on ${cls.day} at ${formatTimeRange(cls.start, cls.end)}`}
              >
                <div className="flex flex-col items-start justify-center min-w-[72px] shrink-0">
                  <span className="font-headline text-title-md text-on-surface tabular-nums">
                    {formatTime(parseTime(cls.start))}
                  </span>
                  <span className="font-body text-label-sm text-on-surface-variant">
                    {formatTime(parseTime(cls.end))}
                  </span>
                  <span className="font-label text-label-sm text-on-surface-variant capitalize">{cls.day.slice(0, 3)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-title text-title-md text-on-surface truncate">
                    {cls.unit_code ? `${cls.unit_code} · ${cls.unit_name}` : cls.unit_name}
                  </h3>
                  <p className="font-body text-body-sm text-on-surface-variant truncate flex items-center gap-gutter-xs">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">location_on</span>
                    {cls.venue}
                  </p>
                  <p className="font-body text-body-sm text-on-surface-variant truncate flex items-center gap-gutter-xs">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">person</span>
                    {cls.lecturer}
                  </p>
                </div>
                <span
                  className="inline-flex items-center px-gutter-sm py-gutter-xs rounded-full font-label text-label-sm shrink-0"
                  style={{ backgroundColor: modeColors[cls.mode]?.bg || 'var(--color-surface-container)', color: modeColors[cls.mode]?.text || 'var(--color-on-surface)' }}
                >
                  {cls.mode}
                </span>
              </button>
            )
          })
        )}
      </section>

      {/* Class Detail Bottom Sheet */}
      <ClassDetailSheet
        classData={selectedClass}
        isOpen={!!selectedClass}
        onClose={() => setSelectedClass(null)}
        onShare={(cls) => {
          const text = `${cls.unit_code ? cls.unit_code + ' · ' : ''}${cls.unit_name} ${formatTimeRange(cls.start, cls.end)} at ${cls.venue} — CUK Timetable`;
          if (navigator.share) {
            navigator.share({ title: cls.unit_name, text }).catch(() => {});
          } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
          }
        }}
      />
    </main>
  );
}
