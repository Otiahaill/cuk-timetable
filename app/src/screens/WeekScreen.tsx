/* Week screen — Day chips + timeline + clash markers + week-at-a-glance per Stitch */

import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import { h } from 'preact';
import { usePreferences } from '../lib/prefs';
import { loadTimetable, getClassesForCourse, groupClassesByDay, detectClashes, parseTime, formatTimeRange, formatTime } from '../lib/data';
import type { Class, TimetableData } from '../lib/types';
import { ClassDetailSheet } from '../components/ClassDetailSheet';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function WeekScreen() {
  const { prefs, isUnitHidden } = usePreferences();
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const now = new Date();
    const nairobiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[nairobiTime.getDay()];
    return DAYS.includes(today as any) ? today : 'Monday';
  });
  const [showGlance, setShowGlance] = useState(false);
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

  // Get classes for selected course, grouped by day
  const classesByDay = useMemo(() => {
    if (!timetable || !prefs.courseCode) return new Map();
    const classes = getClassesForCourse(timetable, prefs.courseCode, prefs.hiddenUnitCodes);
    return groupClassesByDay(classes);
  }, [timetable, prefs.courseCode, prefs.hiddenUnitCodes]);

  // Detect clashes for selected course
  const clashes = useMemo(() => {
    if (!timetable || !prefs.courseCode) return new Map();
    const classes = getClassesForCourse(timetable, prefs.courseCode, prefs.hiddenUnitCodes);
    return detectClashes(classes);
  }, [timetable, prefs.courseCode, prefs.hiddenUnitCodes]);

  // Get today's name for highlighting
  const getTodayName = useCallback(() => {
    const now = new Date();
    const nairobiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[nairobiTime.getDay()];
  }, []);

  const todayName = getTodayName();
  const todayIndex = DAYS.indexOf(todayName);

  // Mode chip styles
  const modeColors: Record<string, { bg: string; text: string }> = {
    'Face to face': { bg: 'var(--color-mode-face-to-face-container)', text: 'var(--color-mode-face-to-face)' },
    Online: { bg: 'var(--color-mode-online-container)', text: 'var(--color-mode-online)' },
    Blended: { bg: 'var(--color-mode-blended-container)', text: 'var(--color-mode-blended)' },
  };

  // Check if a class has a clash
  const hasClash = (cls: Class) => {
    return Array.from(clashes.values()).some((c) => c.some((cl) => cl.id === cls.id));
  };

  // Get classes for a specific day
  const getDayClasses = (day: string) => classesByDay.get(day) || [];

  // Get dot count for week-at-a-glance
  const getDayDotCount = (day: string) => getDayClasses(day).length;

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-page-margin">
        <div className="flex flex-col items-center gap-gutter-lg">
          <div className="w-[40px] h-[40px] border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-body text-body-md text-on-surface-variant">Loading timetable…</p>
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
          Complete onboarding to see your timetable.
        </p>
      </main>
    );
  }

  return (
    <main className="container flex-1 flex flex-col" style={{ paddingTop: 'var(--space-gutter-lg)' }}>
      {/* Sticky Header with Week Label & Glance Toggle */}
      <header className="sticky top-0 z-10 px-page-margin pb-gutter-md bg-surface/80 backdrop-blur-sm" style={{ backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center justify-between gap-gutter-md mb-gutter-sm">
          <div>
            <h1 className="font-headline text-headline-md text-on-surface">Week</h1>
            <p className="font-body text-body-sm text-on-surface-variant">
              {prefs.courseCode} · {Array.from(classesByDay.values()).reduce((sum, arr) => sum + arr.length, 0)} classes
            </p>
          </div>
          <button
            type="button"
            id="glance-toggle-btn"
            onClick={() => setShowGlance(!showGlance)}
            aria-pressed={showGlance}
            className="btn btn-ghost min-h-[40px] px-gutter-md"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{showGlance ? 'view_module' : 'grid_view'}</span>
            <span className="font-label text-label-md">Week at a glance</span>
          </button>
        </div>

        {/* Week-at-a-glance Strip */}
        {!showGlance && (
          <button
            type="button"
            onClick={() => setShowGlance(true)}
            className="w-full py-gutter-sm rounded-lg bg-surface-container-low border border-outline-variant text-center font-label text-label-md text-on-surface-variant"
            aria-label="Show week at a glance"
          >
            Tap to expand week overview
          </button>
        )}

        {showGlance && (
          <div id="glance-strip" className="flex gap-gutter-xs overflow-x-auto pb-gutter-xs" role="list" aria-label="Week at a glance">
            {DAYS.map((day, idx) => (
              <div
                key={day}
                className="flex flex-col items-center gap-gutter-xs flex-shrink-0 w-[56px]"
                role="listitem"
              >
                <span className={`font-label text-label-sm ${idx === todayIndex ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {DAY_LABELS[idx]}
                </span>
                <div className="flex flex-col gap-1">
                  {Array.from({ length: getDayDotCount(day) }, (_, i) => (
                    <span
                      key={i}
                      className={`w-[8px] h-[8px] rounded-full ${idx === todayIndex ? 'bg-primary' : 'bg-outline'}`}
                    />
                  ))}
                  {getDayDotCount(day) === 0 && (
                    <span className="w-[8px] h-[8px] rounded-full bg-transparent border border-outline" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sticky Day Chips */}
        <div className="flex gap-gutter-sm overflow-x-auto pb-gutter-xs" role="tablist" aria-label="Days of the week">
          {DAYS.map((day, idx) => (
            <button
              key={day}
              role="tab"
              aria-selected={selectedDay === day}
              aria-label={day}
              onClick={() => setSelectedDay(day)}
              className={`flex items-center justify-center min-h-[48px] min-w-[64px] px-gutter-md rounded-full font-label text-label-md whitespace-nowrap transition-colors ${
                selectedDay === day
                  ? 'bg-primary text-on-primary shadow-sm'
                  : idx === todayIndex
                  ? 'bg-primary-container text-on-primary-container border border-primary'
                  : 'bg-surface-container-low text-on-surface border border-outline-variant'
              }`}
            >
              {DAY_LABELS[idx]}
            </button>
          ))}
        </div>
      </header>

      {/* Timeline for Selected Day */}
      <section className="flex-1 px-page-margin pb-gutter-xl" aria-labelledby={`day-${selectedDay}`}>
        <h2 id={`day-${selectedDay}`} className="sr-only">{selectedDay}</h2>

        {(() => {
          const dayClasses = getDayClasses(selectedDay);
          if (dayClasses.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center gap-gutter-lg py-gutter-xl text-center">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant" aria-hidden="true">event_available</span>
                <p className="font-headline text-title-lg text-on-surface">No classes on {selectedDay}</p>
                <p className="font-body text-body-md text-on-surface-variant max-w-[320px]">
                  Enjoy your free day!
                </p>
              </div>
            );
          }

          // Interleave free gaps and classes
          const items: Array<{ type: 'gap' | 'class'; data: Class | { label: string; between: [Class, Class] }; start: number }> = [];

          // Add free gaps
          for (let i = 0; i < dayClasses.length - 1; i++) {
            const currentEnd = parseTime(dayClasses[i].end);
            const nextStart = parseTime(dayClasses[i + 1].start);
            const gap = nextStart - currentEnd;
            if (gap > 30) {
              items.push({
                type: 'gap',
                data: { label: `Free ${gap < 60 ? `${gap}m` : `${Math.floor(gap / 60)}h ${gap % 60 > 0 ? `${gap % 60}m` : ''}`}`, between: [dayClasses[i], dayClasses[i + 1]] },
                start: currentEnd,
              });
            }
          }

          // Add classes
          for (const cls of dayClasses) {
            items.push({
              type: 'class',
              data: cls,
              start: parseTime(cls.start),
            });
          }

          // Sort by time
          items.sort((a, b) => a.start - b.start);

          return items.map((item, idx) => {
            if (item.type === 'gap') {
              const gap = item.data as { label: string; between: [Class, Class] };
              return (
                <div key={`gap-${idx}`} className="p-gutter-md rounded-lg bg-surface-container-high border border-outline-variant/50 text-center mb-gutter-sm">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant align-middle" aria-hidden="true">schedule</span>
                  <span className="font-label text-label-md text-on-surface-variant ml-gutter-xs">{gap.label}</span>
                </div>
              );
            } else {
              const cls = item.data as Class;
              const isClash = hasClash(cls);
              return (
                <button
                  key={`class-${cls.id}`}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`card p-gutter-md w-full text-left flex items-center gap-gutter-md active:opacity-80 transition-opacity mb-gutter-sm ${
                    isClash ? 'border-2 border-error relative' : ''
                  }`}
                  aria-label={`${cls.unit_name} at ${formatTimeRange(cls.start, cls.end)}`}
                >
                  {isClash && (
                    <span className="absolute -top-2 -right-2 w-[18px] h-[18px] rounded-full bg-error text-on-error flex items-center justify-center text-[10px] font-bold" aria-label="Clash">
                      !
                    </span>
                  )}
                  <div className="flex flex-col items-start justify-center min-w-[72px] shrink-0">
                    <span className="font-headline text-title-md text-on-surface tabular-nums">
                      {formatTime(parseTime(cls.start))}
                    </span>
                    <span className="font-body text-label-sm text-on-surface-variant">
                      {formatTime(parseTime(cls.end))}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-title text-title-md text-on-surface truncate">
                      {cls.unit_code ? `${cls.unit_code} · ${cls.unit_name}` : cls.unit_name}
                    </h3>
                    <p className="font-body text-body-sm text-on-surface-variant truncate flex items-center gap-gutter-xs">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">location_on</span>
                      {cls.venue}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center px-gutter-sm py-gutter-xs rounded-full font-label text-label-sm shrink-0"
                    style={{ backgroundColor: modeColors[cls.mode]?.bg || 'var(--color-surface-container)', color: modeColors[cls.mode]?.text || 'var(--color-on-surface)' }}
                  >
                    {cls.mode}
                  </span>
                  {isClash && (
                    <span className="material-symbols-outlined text-error shrink-0" aria-label="Clash detected">warning</span>
                  )}
                </button>
              );
            }
          });
        })()}
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
