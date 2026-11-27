import { useState, useEffect, useCallback } from 'preact/hooks';
import type { JSX } from 'preact';
import { TodayScreen } from './screens/TodayScreen';
import { WeekScreen } from './screens/WeekScreen';
import { BrowseScreen } from './screens/BrowseScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { usePreferences } from './lib/prefs';
import { loadTimetable, getCourses } from './lib/data';

type Tab = 'today' | 'week' | 'browse' | 'settings';

const TABS: { id: Tab; label: string; icon: (props: { active: boolean }) => JSX.Element }[] = [
  { id: 'today', label: 'Today', icon: todayIcon },
  { id: 'week', label: 'Week', icon: weekIcon },
  { id: 'browse', label: 'Browse', icon: browseIcon },
  { id: 'settings', label: 'Settings', icon: settingsIcon },
];

function todayIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function weekIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="2" x2="9" y2="22" />
      <line x1="15" y1="2" x2="15" y2="22" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="3" y1="16" x2="21" y2="16" />
    </svg>
  );
}

function browseIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function settingsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [courseValid, setCourseValid] = useState(true);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const prefs = usePreferences();

  // Check if onboarding is needed on mount
  useEffect(() => {
    if (!prefs.courseCode) {
      setShowOnboarding(true);
    } else {
      // Validate stored course exists in current data
      loadTimetable()
        .then((timetable) => {
          const courses = getCourses(timetable);
          const exists = courses.some((c) => c.code === prefs.courseCode);
          setCourseValid(exists);
          if (!exists) {
            setShowOnboarding(true);
          }
        })
        .catch(() => {
          // If data load fails, assume course is valid (offline)
          setCourseValid(true);
        });
    }
  }, [prefs.courseCode]);

  // Service Worker update handling
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleUpdateReady = () => {
      setShowUpdateToast(true);
    };

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after 2nd visit
      const visits = parseInt(localStorage.getItem('cukt:visits') || '0', 10);
      if (visits >= 1) {
        setShowInstallPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    };

    window.addEventListener('cukt:sw-update-ready', handleUpdateReady);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('cukt:sw-update-ready', handleUpdateReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Track visits for install prompt timing
  useEffect(() => {
    const visits = parseInt(localStorage.getItem('cukt:visits') || '0', 10);
    localStorage.setItem('cukt:visits', String(visits + 1));
  }, []);

  const renderScreen = useCallback(() => {
    switch (activeTab) {
      case 'today': return <TodayScreen />;
      case 'week': return <WeekScreen />;
      case 'browse': return <BrowseScreen />;
      case 'settings': return <SettingsScreen />;
    }
  }, [activeTab]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('cukt:a2hs_dismissed', 'true');
  };

  const handleReload = () => {
    window.location.reload();
  };

  if (showOnboarding) {
    return (
      <>
        <a href="#main" class="skip-link">Skip to main content</a>
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} recovery={!courseValid} />
      </>
    );
  }

  return (
    <>
      <a href="#main" class="skip-link">Skip to main content</a>
      <div id="main" style={{ flex: 1, paddingBottom: 'calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0))' }}>
        {renderScreen()}
      </div>
      <nav class="tab-bar" role="tablist" aria-label="Main navigation">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            aria-label={label}
            class={`tab-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            {icon({ active: activeTab === id })}
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Update Toast */}
      {showUpdateToast && (
        <div className="fixed bottom-[calc(var(--tab-bar-height) + 16px)] left-16 right-16 max-w-[430px] mx-auto z-50 animate-slide-up" role="alert" aria-live="polite">
          <div className="flex items-center justify-between p-gutter-md rounded-lg bg-primary text-on-primary shadow-lg">
            <span className="font-body text-body-md">New version ready</span>
            <div className="flex gap-gutter-sm">
              <button onClick={handleDismissInstall} className="btn btn-ghost text-label-sm text-on-primary">Later</button>
              <button onClick={handleReload} className="btn btn-primary text-label-sm">Reload</button>
            </div>
          </div>
        </div>
      )}

      {/* A2HS Install Prompt */}
      {showInstallPrompt && !showUpdateToast && (
        <div className="fixed bottom-[calc(var(--tab-bar-height) + 16px)] left-16 right-16 max-w-[430px] mx-auto z-50 animate-slide-up" role="dialog" aria-label="Install app">
          <div className="p-gutter-md rounded-lg bg-surface border border-outline shadow-lg">
            <div className="flex items-center gap-gutter-sm mb-gutter-sm">
              <span className="material-symbols-outlined text-primary" aria-hidden="true">download</span>
              <span className="font-title text-title-md text-on-surface">Install CampusPulse</span>
            </div>
            <p className="font-body text-body-sm text-on-surface-variant mb-gutter-md">
              Add to Home screen for offline access and faster loads.
            </p>
            <div className="flex gap-gutter-sm">
              <button onClick={handleDismissInstall} className="btn btn-ghost flex-1 text-label-md">Not now</button>
              <button onClick={handleInstall} className="btn btn-primary flex-1 text-label-md">Install</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
