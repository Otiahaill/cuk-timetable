/* Today screen — Next-class card + timeline per Stitch design */

import { useState, useEffect, useRef } from 'preact/hooks';
import { usePreferences } from '../lib/prefs';
import { loadTimetable, getClassesForCourse, getTodaysClasses, getNextClass, getCurrentMinutesInNairobi, formatTimeRange, formatMinutesUntil, detectClashes } from '../lib/data';
import { parseTime, formatTime } from '../lib/types';
import type { Class, TimetableData } from '../lib/types';
import { ClassDetailSheet } from '../components/ClassDetailSheet';

export function TodayScreen() {
  const { prefs } = usePreferences();
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showA2HS, setShowA2HS] = useState(false);
  const countdownIntervalRef = useRef<number | null>(null);
  const [nowMinutes, setNowMinutes] = useState(0);

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

  // Countdown timer - updates every 60 seconds (battery saving)
  useEffect(() => {
    const updateNow = () => {
      const now = getCurrentMinutesInNairobi();
      setNowMinutes(now);
    };

    updateNow();
    countdownIntervalRef.current = window.setInterval(updateNow, 60_000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // A2HS prompt detection
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setShowA2HS(true);
    };

    const handleAppInstalled = () => {
      setShowA2HS(false);
      (window as any).deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      setShowA2HS(false);
    } else {
      const visits = parseInt(localStorage.getItem('cukt:visits') || '0', 10);
      localStorage.setItem('cukt:visits', String(visits + 1));
      if (visits >= 1) {
        setShowA2HS(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = (window as any).deferredPrompt;
    if (prompt) {
      prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === 'accepted') {
        setShowA2HS(false);
      }
      (window as any).deferredPrompt = null;
    }
  };

  const handleDismissA2HS = () => {
    setShowA2HS(false);
    localStorage.setItem('cukt:a2hs_dismissed', 'true');
  };

  // Get today's classes for the selected course
  const todaysClasses = timetable && prefs.courseCode
    ? getTodaysClasses(
        getClassesForCourse(timetable, prefs.courseCode, prefs.hiddenUnitCodes)
      ).sort((a, b) => a.start.localeCompare(b.start))
    : [];

  // Get next class
  const nextClass = todaysClasses.length > 0
    ? getNextClass(todaysClasses, nowMinutes)
    : null;

  // Get remaining classes (after next class)
  const remainingClasses = nextClass
    ? todaysClasses.filter((c) => c !== nextClass)
    : todaysClasses;

  // Detect clashes
  const clashes = timetable && prefs.courseCode
    ? detectClashes(getClassesForCourse(timetable, prefs.courseCode, prefs.hiddenUnitCodes))
    : new Map();

  // Check if today is weekend
  const now = new Date();
  const nairobiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[nairobiTime.getDay()];
  const isWeekend = todayName === 'Saturday' || todayName === 'Sunday';

  // Format date header
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    return date.toLocaleDateString('en-KE', options);
  };

  const dateHeader = formatDate(nairobiTime);

  // Next Monday date for weekend
  const getNextMonday = () => {
    const d = new Date(nairobiTime);
    const day = d.getDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + daysUntilMonday);
    return d;
  };

  const nextMonday = getNextMonday();

  // Mode chip styles
  const modeColors: Record<string, { bg: string; text: string }> = {
    'Face to face': { bg: 'var(--color-mode-face-to-face-container)', text: 'var(--color-mode-face-to-face)' },
    Online: { bg: 'var(--color-mode-online-container)', text: 'var(--color-mode-online)' },
    Blended: { bg: 'var(--color-mode-blended-container)', text: 'var(--color-mode-blended)' },
  };

  const formatGap = (mins: number): string => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  const freeGaps = (() => {
    const allClasses = todaysClasses;
    if (allClasses.length < 2) return [] as Array<{ start: number; end: number; label: string; between: [Class, Class] }>;
    const gaps: Array<{ start: number; end: number; label: string; between: [Class, Class] }> = [];
    for (let i = 0; i < allClasses.length - 1; i++) {
      const currentEnd = parseTime(allClasses[i].end);
      const nextStart = parseTime(allClasses[i + 1].start);
      const gap = nextStart - currentEnd;
      if (gap > 30) {
        gaps.push({
          start: currentEnd,
          end: nextStart,
          label: `Free ${gap < 60 ? `${gap}m` : `${Math.floor(gap / 60)}h ${gap % 60 > 0 ? `${gap % 60}m` : ''}`}`,
          between: [allClasses[i], allClasses[i + 1]],
        });
      }
    }
    return gaps;
  })();

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

  const isBeforeFirstClass = nextClass !== null && nowMinutes < parseTime(nextClass.start);
  const hasNoClassesToday = todaysClasses.length === 0;

  return (
    <main className="container flex-1 flex flex-col" style={{ paddingTop: 'var(--space-gutter-lg)' }}>
      {/* A2HS Banner */}
      {showA2HS && !isWeekend && (
        <div className="mb-gutter-md p-gutter-md rounded-lg bg-amber-container border border-amber flex items-center justify-between gap-gutter-md animate-slide-down" role="banner">
          <div className="flex items-center gap-gutter-sm flex-1">
            <span className="material-symbols-outlined text-amber" aria-hidden="true">download</span>
            <div>
              <p className="font-label text-label-md text-on-amber-container">Install CampusPulse</p>
              <p className="font-body text-body-sm text-on-amber-container">Offline access, faster loads</p>
            </div>
          </div>
          <div className="flex gap-gutter-sm">
            <button type="button" onClick={handleDismissA2HS} className="btn btn-ghost text-label-md" aria-label="Dismiss">
              Not now
            </button>
            <button type="button" onClick={handleInstall} className="btn btn-primary text-label-md">
              Install
            </button>
          </div>
        </div>
      )}

      {/* Date Header */}
      <header className="mb-gutter-lg px-page-margin">
        <h1 className="font-headline text-headline-md text-on-surface">Today</h1>
        <p className="font-body text-body-md text-on-surface-variant">{dateHeader}</p>
      </header>

      {/* Next Class Card */}
      {nextClass && (
        <article className="mb-gutter-lg p-gutter-lg rounded-xl relative overflow-hidden px-page-margin"
          style={{ background: 'linear-gradient(135deg, var(--color-amber-container) 0%, var(--color-amber-container) 100%)', border: '2px solid var(--color-amber)' }}>
        <div className="flex items-start justify-between gap-gutter-md">
          <div className="flex-1">
            <div className="flex items-center gap-gutter-xs mb-gutter-xs">
              <span className="font-label text-label-sm text-on-amber-container bg-amber px-gutter-sm py-gutter-xs rounded-full">
                Next
              </span>
              {isBeforeFirstClass && (
                <span className="font-label text-label-sm text-on-amber-container" id="next-countdown">
                  Starts in {formatMinutesUntil(parseTime(nextClass.start) - nowMinutes)}
                </span>
              )}
              {!isBeforeFirstClass && (
                <span className="font-label text-label-sm text-on-amber-container bg-amber px-gutter-sm py-gutter-xs rounded-full animate-pulse">
                  Now
                </span>
              )}
            </div>
            <h2 className="font-headline text-headline-md text-on-amber-container text-balance">
              {nextClass.unit_code ? `${nextClass.unit_code} · ${nextClass.unit_name}` : nextClass.unit_name}
            </h2>
            <p className="font-body text-body-md text-on-amber-container mt-gutter-xs">
              {formatTimeRange(nextClass.start, nextClass.end)}
            </p>
          </div>
          <span
            className="inline-flex items-center px-gutter-md py-gutter-xs rounded-full font-label text-label-sm shrink-0"
            style={{ backgroundColor: modeColors[nextClass.mode]?.bg || 'var(--color-surface-container)', color: modeColors[nextClass.mode]?.text || 'var(--color-on-surface)' }}
          >
            {nextClass.mode}
          </span>
        </div>
        <div className="flex items-center justify-between gap-gutter-md mt-gutter-md pt-gutter-md border-t border-amber/30">
          <div className="flex items-center gap-gutter-sm text-on-amber-container">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">location_on</span>
            <span className="font-body text-body-md">{nextClass.venue}</span>
          </div>
          <div className="flex items-center gap-gutter-sm text-on-amber-container">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">person</span>
            <span className="font-body text-body-md">{nextClass.lecturer}</span>
          </div>
        </div>
      </article>
      )}

      {/* Empty States */}
      {hasNoClassesToday && !isWeekend && (
        <section className="flex-1 flex flex-col items-center justify-center gap-gutter-lg px-page-margin text-center mb-gutter-xl">
          <span className="material-symbols-outlined text-[64px] text-on-surface-variant" aria-hidden="true">event_available</span>
          <div>
            <h2 className="font-headline text-title-lg text-on-surface mb-gutter-xs">No classes today</h2>
            <p className="font-body text-body-md text-on-surface-variant">Enjoy your free day!</p>
          </div>
        </section>
      )}

      {isWeekend && (
        <section className="flex-1 flex flex-col items-center justify-center gap-gutter-lg px-page-margin text-center mb-gutter-xl">
          <span className="material-symbols-outlined text-[64px] text-on-surface-variant" aria-hidden="true">weekend</span>
          <div>
            <h2 className="font-headline text-title-lg text-on-surface mb-gutter-xs">Weekend — no classes</h2>
            <p className="font-body text-body-md text-on-surface-variant mb-gutter-md">
              Next classes on Monday, {nextMonday.getDate()} {nextMonday.toLocaleString('en-KE', { month: 'short' })}
            </p>
          </div>
        </section>
      )}

      {/* Timeline: Free gaps + Remaining classes */}
      {!hasNoClassesToday && !isWeekend && (
        <section className="flex-1 flex flex-col gap-gutter-md px-page-margin" aria-label="Today's schedule">
          {(() => {
            const items: Array<{ type: 'gap' | 'class'; data: Class | { label: string; between: [Class, Class] }; start: number }> = [];

            for (const gap of freeGaps) {
              items.push({
                type: 'gap',
                data: { label: gap.label, between: gap.between },
                start: gap.start,
              });
            }

            for (const cls of remainingClasses) {
              items.push({
                type: 'class',
                data: cls,
                start: parseTime(cls.start),
              });
            }

            items.sort((a, b) => a.start - b.start);

            return items.map((item, idx) => {
              if (item.type === 'gap') {
                const gap = item.data as { label: string; between: [Class, Class] };
                return (
                  <div key={`gap-${idx}`} className="p-gutter-md rounded-lg bg-surface-container-high border border-outline-variant/50 text-center">
                    <span className="material-symbols-outlined text-[20px] text-on-surface-variant align-middle" aria-hidden="true">schedule</span>
                    <span className="font-label text-label-md text-on-surface-variant ml-gutter-xs">{gap.label}</span>
                  </div>
                );
              } else {
                const cls = item.data as Class;
                const isClash = Array.from(clashes.values()).some((c) => c.some((cl) => cl.id === cls.id));
                return (
                  <button
                    key={`class-${cls.id}`}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`card p-gutter-md w-full text-left flex items-center gap-gutter-md active:opacity-80 transition-opacity ${
                      isClash ? 'border-2 border-error' : ''
                    }`}
                    aria-label={`${cls.unit_name} at ${formatTimeRange(cls.start, cls.end)}`}
                  >
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
      )}

      {/* Class Detail Bottom Sheet */}
      <ClassDetailSheet
        classData={selectedClass}
        isOpen={!!selectedClass}
        onClose={() => setSelectedClass(null)}
        onShare={(cls) => {
          const text = `${cls.unit_code ? cls.unit_code + ' · ' : ''}${cls.unit_name} ${formatTimeRange(cls.start, cls.end)} at {cls.venue} — CUK Timetable`;
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
