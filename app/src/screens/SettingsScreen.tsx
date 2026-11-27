/* Settings screen — Full page per Stitch design */

import { useState, useEffect, useCallback } from 'preact/hooks';
import { h } from 'preact';
import { usePreferences } from '../lib/prefs';
import { loadTimetable, loadVersion, loadChanges, applyChanges, getClassesForCourse } from '../lib/data';
import type { TimetableData, Class } from '../lib/types';
import { ClassDetailSheet } from '../components/ClassDetailSheet';

export function SettingsScreen() {
  const { prefs, setTheme, setCourseCode, toggleUnitHidden, isUnitHidden, setDataVersion } = usePreferences();
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [showCourseUnits, setShowCourseUnits] = useState(false);
  const [courseUnits, setCourseUnits] = useState<Array<{ code: string | null; name: string }>>([]);
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
        setError('Failed to load data.');
        setLoading(false);
      });
  }, []);

  // Load course units when toggled
  useEffect(() => {
    if (showCourseUnits && timetable && prefs.courseCode) {
      const classes = getClassesForCourse(timetable, prefs.courseCode, []);
      const unitMap = new Map<string, string>();
      for (const cls of classes) {
        if (cls.unit_code && !unitMap.has(cls.unit_code)) {
          unitMap.set(cls.unit_code, cls.unit_name);
        }
      }
      setCourseUnits(Array.from(unitMap.entries()).map(([code, name]) => ({ code, name })));
    }
  }, [showCourseUnits, timetable, prefs.courseCode]);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      const versionInfo = await loadVersion();
      const currentVersion = prefs.dataVersion;
      const isNewer = currentVersion !== versionInfo.version;

      setLastChecked(new Date().toISOString());
      setUpdateAvailable(isNewer);

      if (isNewer) {
        // Apply atomic update
        const newTimetable = await loadTimetable();
        const changes = await loadChanges();
        let finalTimetable = newTimetable;

        if (changes) {
          finalTimetable = {
            ...newTimetable,
            classes: applyChanges(newTimetable.classes, changes),
          };
        }

        setTimetable(finalTimetable);
        setDataVersion(versionInfo.version);
        setUpdateAvailable(false);
      }
    } catch (err) {
      console.error('Update check failed:', err);
    } finally {
      setCheckingUpdate(false);
    }
  }, [prefs.dataVersion, setDataVersion]);

  // Theme toggle
  const handleThemeToggle = useCallback(() => {
    const themes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
    const currentIndex = themes.indexOf(prefs.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);

    // Apply immediately
    if (nextTheme === 'dark' || (nextTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [prefs.theme, setTheme]);

  // Apply theme on mount
  useEffect(() => {
    if (prefs.theme === 'dark' || (prefs.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [prefs.theme]);

  // Share app
  const shareApp = useCallback(() => {
    const text = 'Check your class timetable offline with CUK Timetable';
    const url = window.location.origin;
    if (navigator.share) {
      navigator.share({ title: 'CUK Timetable', text, url }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    }
  }, []);

  // Share today's classes
  const shareToday = useCallback(() => {
    if (!timetable || !prefs.courseCode) return;
    const classes = getClassesForCourse(timetable, prefs.courseCode, prefs.hiddenUnitCodes);
    const today = new Date();
    const nairobiTime = new Date(today.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[nairobiTime.getDay()];
    const todaysClasses = classes.filter((c) => c.day === todayName);

    if (todaysClasses.length === 0) {
      alert('No classes today to share.');
      return;
    }

    const text = `My ${todayName} classes on CUK Timetable: ${todaysClasses.map((c) => `${c.unit_code ? c.unit_code + ' · ' : ''}${c.unit_name} (${c.start}-${c.end} @ ${c.venue})`).join(', ')}`;
    if (navigator.share) {
      navigator.share({ title: `Today's Timetable`, text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  }, [timetable, prefs.courseCode, prefs.hiddenUnitCodes]);

  // Reset course (go back to onboarding)
  const resetCourse = useCallback(() => {
    if (confirm('This will reset your course and units. Continue?')) {
      setCourseCode(null);
      // The App component will show onboarding
      window.location.reload();
    }
  }, [setCourseCode]);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-page-margin">
        <div className="flex flex-col items-center gap-gutter-lg">
          <div className="w-[40px] h-[40px] border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-body text-body-md text-on-surface-variant">Loading settings…</p>
        </div>
      </main>
    );
  }

  // Theme label
  const themeLabels: Record<string, string> = {
    system: 'System default',
    light: 'Light',
    dark: 'Dark (OLED)',
  };

  return (
    <main className="container flex-1" style={{ paddingTop: 'var(--space-gutter-lg)' }}>
      <header className="mb-gutter-lg px-page-margin">
        <h1 className="font-headline text-headline-md text-on-surface">Settings</h1>
      </header>

      {/* Display & Battery */}
      <section className="card mb-gutter-lg px-page-margin">
        <h2 className="font-title text-title-md text-on-surface mb-gutter-md flex items-center gap-gutter-sm">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">display</span>
          Display & Battery
        </h2>

        <div className="flex items-center justify-between py-gutter-md border-b border-outline-variant">
          <div>
            <p className="font-label text-label-md text-on-surface">Dark theme</p>
            <p className="font-body text-body-sm text-on-surface-variant">Save battery on OLED screens</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.theme === 'dark' || (prefs.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)}
            onClick={handleThemeToggle}
            className={`toggle ${prefs.theme === 'dark' || (prefs.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? '' : ''}`}
            aria-label={`Dark theme, currently ${themeLabels[prefs.theme]}`}
          />
        </div>

        <div className="flex items-center justify-between py-gutter-md">
          <div>
            <p className="font-label text-label-md text-on-surface">Data saver</p>
            <p className="font-body text-body-sm text-on-surface-variant">Reduce data usage on mobile networks</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked="false"
            onClick={() => alert('Data saver coming soon')}
            className="toggle"
            aria-label="Data saver, currently off"
            disabled
          />
        </div>
      </section>

      {/* Notifications */}
      <section className="card mb-gutter-lg px-page-margin">
        <h2 className="font-title text-title-md text-on-surface mb-gutter-md flex items-center gap-gutter-sm">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">notifications</span>
          Notifications
        </h2>

        <div className="flex items-center justify-between py-gutter-md">
          <div>
            <p className="font-label text-label-md text-on-surface">Class reminders</p>
            <p className="font-body text-body-sm text-on-surface-variant">30 minutes before each class</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked="false"
            onClick={async () => {
              if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                alert(permission === 'granted' ? 'Reminders enabled!' : 'Permission denied');
              }
            }}
            className="toggle"
            aria-label="Class reminders, currently off"
          />
        </div>
      </section>

      {/* Timetable Data */}
      <section className="card mb-gutter-lg px-page-margin">
        <h2 className="font-title text-title-md text-on-surface mb-gutter-md flex items-center gap-gutter-sm">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">database</span>
          Timetable Data
        </h2>

        <div className="space-y-gutter-sm">
          <div className="flex items-center justify-between py-gutter-sm">
            <span className="font-body text-body-md text-on-surface-variant">Current version</span>
            <span className="font-mono text-body-md text-on-surface tabular-nums">{timetable?.meta?.version || 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between py-gutter-sm border-t border-outline-variant">
            <span className="font-body text-body-md text-on-surface-variant">Last updated</span>
            <span className="font-mono text-body-md text-on-surface tabular-nums">{timetable?.meta?.version ? '2026-11-27' : 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between py-gutter-sm border-t border-outline-variant">
            <span className="font-body text-body-md text-on-surface-variant">Total classes</span>
            <span className="font-body text-body-md text-on-surface tabular-nums">{timetable?.meta?.total_classes || 0}</span>
          </div>
          <div className="flex items-center justify-between py-gutter-sm border-t border-outline-variant">
            <span className="font-body text-body-md text-on-surface-variant">Total courses</span>
            <span className="font-body text-body-md text-on-surface tabular-nums">{timetable?.meta?.total_courses || 0}</span>
          </div>
          <div className="flex items-center justify-between py-gutter-sm border-t border-outline-variant">
            <span className="font-body text-body-md text-on-surface-variant">Last checked</span>
            <span className="font-body text-body-md text-on-surface">{lastChecked ? new Date(lastChecked).toLocaleString() : 'Never'}</span>
          </div>

          <button
            type="button"
            onClick={checkForUpdates}
            disabled={checkingUpdate}
            className="btn btn-primary w-full mt-gutter-md"
          >
            {checkingUpdate ? (
              <>
                <span className="material-symbols-outlined animate-spin" aria-hidden="true">sync</span>
                Checking…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" aria-hidden="true">system_update</span>
                Check for updates
              </>
            )}
          </button>

          {updateAvailable && (
            <div className="mt-gutter-md p-gutter-md rounded-lg bg-amber-container text-on-amber-container border border-amber">
              <p className="font-label text-label-md">Update available! Applying…</p>
            </div>
          )}
        </div>
      </section>

      {/* Course & Units */}
      <section className="card mb-gutter-lg px-page-margin">
        <h2 className="font-title text-title-md text-on-surface mb-gutter-md flex items-center gap-gutter-sm">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">school</span>
          Course & Units
        </h2>

        <div className="space-y-gutter-sm">
          <div className="flex items-center justify-between py-gutter-sm">
            <span className="font-body text-body-md text-on-surface-variant">Current course</span>
            <span className="font-mono text-body-md text-on-surface">{prefs.courseCode || 'Not set'}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowCourseUnits(!showCourseUnits)}
            className="btn btn-secondary w-full justify-start"
          >
            <span className="material-symbols-outlined" aria-hidden="true">{showCourseUnits ? 'expand_less' : 'expand_more'}</span>
            {showCourseUnits ? 'Hide units' : 'Manage units'}
          </button>

          {showCourseUnits && (
            <div className="flex flex-col gap-gutter-sm mt-gutter-sm">
              {courseUnits.length === 0 ? (
                <p className="font-body text-body-md text-on-surface-variant">No units found for this course.</p>
              ) : (
                courseUnits.map(({ code, name }) => (
                  <label key={code} className="flex items-center justify-between min-h-[48px] px-gutter-md py-gutter-sm rounded-lg bg-surface-container-low border border-outline-variant cursor-pointer">
                    <span className="font-body text-body-md">{name} <span className="font-mono text-body-sm text-on-surface-variant">({code || 'no code'})</span></span>
                    <input
                      type="checkbox"
                      checked={code ? !isUnitHidden(code) : false}
                      onChange={() => code && toggleUnitHidden(code)}
                      disabled={!code}
                      className="w-[24px] h-[24px] rounded text-primary focus:ring-0"
                    />
                  </label>
                ))
              )}
            </div>
          )}

          <button
            type="button"
            onClick={resetCourse}
            className="btn btn-ghost w-full justify-start text-error mt-gutter-sm"
          >
            <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            Change course (reset onboarding)
          </button>
        </div>
      </section>

      {/* Share & Install */}
      <section className="card mb-gutter-lg px-page-margin">
        <h2 className="font-title text-title-md text-on-surface mb-gutter-md flex items-center gap-gutter-sm">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">share</span>
          Share & Install
        </h2>

        <div className="space-y-gutter-sm">
          <button type="button" onClick={shareApp} className="btn btn-secondary w-full justify-start">
            <span className="material-symbols-outlined" aria-hidden="true">share</span>
            Share app (WhatsApp / System share)
          </button>

          <button type="button" onClick={shareToday} className="btn btn-secondary w-full justify-start">
            <span className="material-symbols-outlined" aria-hidden="true">today</span>
            Share today's classes
          </button>

          <div className="pt-gutter-sm border-t border-outline-variant">
            <p className="font-label text-label-md text-on-surface-variant mb-gutter-sm">Install</p>
            <p className="font-body text-body-sm text-on-surface-variant mb-gutter-sm">
              Open this page in Chrome/Safari → Menu → "Add to Home screen" / "Install app"
            </p>
          </div>
        </div>
      </section>

      {/* About / Data Notes */}
      <section className="card mb-gutter-xl px-page-margin">
        <h2 className="font-title text-title-md text-on-surface mb-gutter-md flex items-center gap-gutter-sm">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">info</span>
          About
        </h2>

        <div className="space-y-gutter-md text-on-surface-variant">
          <p className="font-body text-body-md">
            <strong>CUK Timetable</strong> — Personalised class timetable for Co-operative University of Kenya students.
          </p>
          <p className="font-body text-body-sm">Built as an offline-first PWA. No accounts, no tracking, no ads.</p>

          <h3 className="font-label text-label-md text-on-surface">Data source</h3>
          <p className="font-body text-body-sm">
            CUK "Final Degree, Diploma & Certificate Teaching Timetable, Sept–Dec 2026" (84-page PDF).
            Extracted to JSON with 1,334 classes across 208 courses.
          </p>

          <h3 className="font-label text-label-md text-on-surface">Known data quality issues</h3>
          <ul className="font-body text-body-sm space-y-gutter-xs pl-gutter-lg list-disc">
            <li>5 same-slot clashes exist in the source PDF (marked with red badge)</li>
            <li>Diploma/certificate mode derived from venue (Online if venue=ONLINE)</li>
            <li>Unit codes fixed: BECO4104 (was BECO 41O4), BHRM4.1SSP deduplicated</li>
            <li>Null unit codes: BIT3.1SSP (BUCU1105 inferred), BNEC2.1SSP</li>
          </ul>

          <h3 className="font-label text-label-md text-on-surface">Privacy</h3>
          <p className="font-body text-body-sm">
            Your course and unit choices are stored locally in your browser only.
            No data leaves your device except when you explicitly share.
          </p>

          <p className="font-body text-body-sm text-on-surface-variant mt-gutter-md">
            Unofficial — based on the published timetable. Not affiliated with CUK administration.
          </p>
        </div>
      </section>
    </main>
  );
}
