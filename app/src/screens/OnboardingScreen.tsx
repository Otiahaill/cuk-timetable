/* Onboarding screen — 3-step flow per Stitch design */

import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { h, ComponentChildren } from 'preact';
import { usePreferences } from '../lib/prefs';
import { loadTimetable, getClassesForCourse } from '../lib/data';
import type { Course, Class, TimetableData } from '../lib/types';

interface OnboardingScreenProps {
  onComplete: () => void;
  recovery?: boolean; // true when stored course no longer exists in new data
}

type Step = 1 | 2 | 3;

interface CourseWithUnits extends Course {
  units: Array<{ code: string | null; name: string }>;
}

export function OnboardingScreen({ onComplete, recovery = false }: OnboardingScreenProps) {
  const { prefs, setCourseCode, toggleUnitHidden } = usePreferences();
  const [step, setStep] = useState<Step>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [courseUnits, setCourseUnits] = useState<CourseWithUnits['units']>([]);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load timetable data on mount
  useEffect(() => {
    loadTimetable()
      .then((data) => {
        setTimetable(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load timetable:', err);
        setError('Failed to load course data. Please check your connection.');
        setLoading(false);
      });
  }, []);

  // Focus search input on step 1
  useEffect(() => {
    if (step === 1 && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [step]);

  // Group courses by level for display
  const coursesByLevel = timetable
    ? {
        degree: timetable.courses.filter((c) => c.level === 'degree'),
        'diploma/certificate': timetable.courses.filter((c) => c.level === 'diploma/certificate'),
      }
    : { degree: [], 'diploma/certificate': [] };

  // Filter courses by search query
  const filteredCourses = (() => {
    if (!searchQuery.trim()) return coursesByLevel;
    const q = searchQuery.toLowerCase();
    return {
      degree: coursesByLevel.degree.filter((c) => c.code.toLowerCase().includes(q)),
      'diploma/certificate': coursesByLevel['diploma/certificate'].filter((c) =>
        c.code.toLowerCase().includes(q)
      ),
    };
  })();

  // Handle course selection
  const handlePickCourse = useCallback(
    (courseCode: string) => {
      if (!timetable) return;

      // Get units for this course
      const classes = getClassesForCourse(timetable, courseCode, []);
      const unitMap = new Map<string, string>();

      for (const cls of classes) {
        if (cls.unit_code && !unitMap.has(cls.unit_code)) {
          unitMap.set(cls.unit_code, cls.unit_name);
        }
      }

      const units = Array.from(unitMap.entries()).map(([code, name]) => ({ code, name }));
      setCourseUnits(units);
      setSelectedCourse(courseCode);
      setStep(2);
    },
    [timetable]
  );

  // Handle unit toggle
  const handleToggleUnit = useCallback(
    (unitCode: string | null) => {
      if (!unitCode) return;
      toggleUnitHidden(unitCode);
    },
    [toggleUnitHidden]
  );

  // Check if unit is hidden
  const isUnitHidden = (unitCode: string | null) => {
    if (!unitCode) return false;
    return prefs.hiddenUnitCodes.includes(unitCode);
  };

  // Proceed to next step or complete
  const handleNextStep = useCallback(() => {
    if (step === 1) {
      // Should not happen - course selection auto-advances
      setStep(2);
    } else if (step === 2) {
      if (selectedCourse) {
        setCourseCode(selectedCourse);
        setStep(3);
      }
    } else {
      onComplete();
    }
  }, [step, selectedCourse, setCourseCode, onComplete]);

  // Progress dots
  const renderProgressDots = () => (
    <div className="flex items-center justify-between gap-gutter-sm" aria-label={`Step ${step} of 3`}>
      <div className="flex items-center gap-gutter-sm">
        <span
          id="dot-1"
          className={`w-[8px] h-[8px] rounded-full transition-all duration-state-change ${
            step >= 1 ? 'w-[24px] bg-primary' : 'bg-outline-variant'
          }`}
        />
        <span
          id="dot-2"
          className={`w-[8px] h-[8px] rounded-full transition-all duration-state-change ${
            step >= 2 ? 'w-[24px] bg-primary' : 'bg-outline-variant'
          }`}
        />
        <span
          id="dot-3"
          className={`w-[8px] h-[8px] rounded-full transition-all duration-state-change ${
            step >= 3 ? 'w-[24px] bg-primary' : 'bg-outline-variant'
          }`}
        />
      </div>
      <button
        type="button"
        onClick={onComplete}
        className="inline-flex items-center justify-center min-h-[48px] px-gutter-sm font-label text-label-md text-on-surface-variant"
      >
        Skip
      </button>
    </div>
  );

  // Step 1: Course Search
  const renderStep1 = () => (
    <main id="step-1" className="flex-1 flex flex-col justify-center gap-gutter-lg py-gutter-lg" role="step" aria-labelledby="step1-title">
      <div className="flex flex-col gap-gutter-xs">
        <h1 id="step1-title" className="font-headline text-headline-lg text-on-surface text-balance">
          {recovery ? 'Pick your course again' : 'Pick your course'}
        </h1>
        <p className="font-body text-body-md text-on-surface-variant">
          {recovery
            ? 'Your previous course is no longer available in the updated timetable. Please select your current course.'
            : 'We only download classes for your degree to save data.'}
        </p>
      </div>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex items-center w-full min-h-[48px] px-gutter-md rounded-lg bg-surface-container-high border border-outline-variant focus-within:border-primary"
      >
        <span className="material-symbols-outlined text-[22px] text-on-surface-variant mr-gutter-sm" aria-hidden="true">
          search
        </span>
        <input
          ref={searchInputRef}
          id="course-search"
          type="search"
          autoFocus
          aria-label="Search your course"
          placeholder="Search BCHM1.1..."
          value={searchQuery}
          onInput={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-0 p-0 text-body-md text-on-surface placeholder:text-outline focus:ring-0"
        />
      </form>

      <div className="flex flex-col gap-gutter-sm max-h-[300px] overflow-y-auto">
        {(() => {
          const hasResults = filteredCourses.degree.length > 0 || filteredCourses['diploma/certificate'].length > 0;
          if (!hasResults) {
            return (
              <p className="text-on-surface-variant text-center py-gutter-xl">
                No courses match "{searchQuery}"
              </p>
            );
          }
          return (
            <>
              {filteredCourses.degree.length > 0 && (
                <div className="flex flex-col gap-gutter-xs">
                  <p className="font-label text-label-sm text-on-surface-variant px-gutter-sm">
                    Degree programmes
                  </p>
                  {filteredCourses.degree.map((course) => (
                    <button
                      key={course.code}
                      type="button"
                      onClick={() => handlePickCourse(course.code)}
                      className="course-option min-h-[48px] w-full text-left px-gutter-lg py-gutter-md rounded-lg bg-primary-container text-on-primary-container font-title text-title-md"
                    >
                      {course.code} · {course.class_count} classes
                    </button>
                  ))}
                </div>
              )}
              {filteredCourses['diploma/certificate'].length > 0 && (
                <div className="flex flex-col gap-gutter-xs">
                  <p className="font-label text-label-sm text-on-surface-variant px-gutter-sm">
                    Diploma / Certificate
                  </p>
                  {filteredCourses['diploma/certificate'].map((course) => (
                    <button
                      key={course.code}
                      type="button"
                      onClick={() => handlePickCourse(course.code)}
                      className="course-option min-h-[48px] w-full text-left px-gutter-lg py-gutter-md rounded-lg bg-surface-container-low text-on-surface border border-outline-variant font-title text-title-md"
                    >
                      {course.code} · {course.class_count} classes
                    </button>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </main>
  );

  // Step 2: Unit Checkboxes
  const renderStep2 = () => (
    <main id="step-2" className="flex-1 flex flex-col justify-center gap-gutter-lg py-gutter-lg" role="step" aria-labelledby="step2-title">
      <div className="flex flex-col gap-gutter-xs">
        <h1 id="step2-title" className="font-headline text-headline-lg text-on-surface text-balance">
          Tick your units
        </h1>
        <p className="font-body text-body-md text-on-surface-variant">
          Select the classes you are taking this semester.
        </p>
      </div>

      <div className="flex flex-col gap-gutter-sm">
        {courseUnits.length === 0 ? (
          <p className="text-on-surface-variant text-center py-gutter-xl">No units found for this course.</p>
        ) : (
          courseUnits.map(({ code, name }) => (
            <label
              key={code}
              className="flex items-center justify-between min-h-[48px] px-gutter-lg py-gutter-md rounded-lg bg-surface-container-low border border-outline-variant cursor-pointer"
            >
              <span className="font-title text-title-md">{name}</span>
              <input
                type="checkbox"
                checked={!isUnitHidden(code)}
                onChange={() => handleToggleUnit(code)}
                className="w-[24px] h-[24px] rounded text-primary focus:ring-0"
                aria-label={code ? `Include ${name}` : 'Include unit'}
              />
            </label>
          ))
        )}
      </div>
    </main>
  );

  // Step 3: Success
  const renderStep3 = () => (
    <main id="step-3" className="flex-1 flex flex-col justify-center gap-gutter-lg py-gutter-lg text-center" role="step" aria-labelledby="step3-title">
      <div className="w-[56px] h-[56px] rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mx-auto">
        <span className="material-symbols-outlined text-[28px]" aria-hidden="true">check</span>
      </div>
      <div className="flex flex-col gap-gutter-xs">
        <h1 id="step3-title" className="font-headline text-headline-lg text-on-surface">
          You are all set
        </h1>
        <p className="font-body text-body-md text-on-surface-variant max-w-[320px] mx-auto">
          Your timetable is saved offline. You can change units anytime in{' '}
          <a href="#settings" className="text-primary underline">Settings</a>
          .
        </p>
      </div>
    </main>
  );

  // Bottom action button
  const renderActionButton = () => {
    const labels = {
      1: 'Continue to units',
      2: 'Save timetable',
      3: 'Open Today',
    };
    const disabled = step === 1 && !selectedCourse;

    return (
      <footer className="pt-gutter-md pb-[env(safe-area-inset-bottom,0px)]">
        <button
          id="next-step-btn"
          type="button"
          onClick={handleNextStep}
          disabled={disabled}
          className={`w-full inline-flex items-center justify-center min-h-[48px] px-gutter-xl rounded-lg font-label text-label-lg active:opacity-80 transition-opacity ${
            disabled
              ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
              : 'bg-primary text-on-primary'
          }`}
        >
          <span id="next-step-label">{labels[step]}</span>
        </button>
      </footer>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[88vh] gap-gutter-lg px-page-margin">
        <div className="w-[40px] h-[40px] border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-body text-body-md text-on-surface-variant">Loading courses…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[88vh] gap-gutter-lg px-page-margin text-center">
        <span className="material-symbols-outlined text-[48px] text-error" aria-hidden="true">error</span>
        <p className="font-body text-body-md text-on-surface-variant max-w-[320px]">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-[88vh] flex flex-col justify-between bg-surface text-on-surface px-page-margin py-gutter-xl">
      {renderProgressDots()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {renderActionButton()}
    </div>
  );
}
