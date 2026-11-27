/* Update mechanism — CampusPulse */

import { loadVersion, loadTimetable, loadChanges, applyChanges } from './data';
import { usePreferences } from './prefs';
import type { TimetableData } from './types';

const DATA_BASE = '/data';
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

export interface UpdateResult {
  updated: boolean;
  version: string;
  message: string;
  hadChanges: boolean;
}

/** Check for updates and apply atomically */
export async function checkAndApplyUpdate(): Promise<UpdateResult> {
  try {
    const versionInfo = await loadVersion();
    const prefs = usePreferences();

    const currentVersion = prefs.prefs.dataVersion;
    if (currentVersion === versionInfo.version) {
      return {
        updated: false,
        version: versionInfo.version,
        message: 'Already up to date',
        hadChanges: false,
      };
    }

    const newTimetable = await loadTimetable();

    let hadChanges = false;
    let finalTimetable = newTimetable;

    try {
      const changes = await loadChanges();
      if (changes && changes.changes.length > 0) {
        finalTimetable = {
          ...newTimetable,
          classes: applyChanges(newTimetable.classes, changes),
        };
        hadChanges = true;
      }
    } catch {
      // changes.json is optional
    }

    prefs.setDataVersion(versionInfo.version);

    window.dispatchEvent(new CustomEvent('cukt:data-updated', {
      detail: { timetable: finalTimetable, version: versionInfo.version },
    }));

    return {
      updated: true,
      version: versionInfo.version,
      message: versionInfo.message,
      hadChanges,
    };
  } catch (error) {
    console.error('Update check failed:', error);
    throw error;
  }
}

/** Start periodic update checking */
export function startPeriodicUpdateCheck(onUpdate?: (result: UpdateResult) => void): () => void {
  const intervalId = window.setInterval(async () => {
    try {
      const result = await checkAndApplyUpdate();
      if (result.updated && onUpdate) {
        onUpdate(result);
      }
    } catch (error) {
      console.error('Periodic update check failed:', error);
    }
  }, UPDATE_CHECK_INTERVAL);

  return () => window.clearInterval(intervalId);
}

/** Manual update trigger (for "Check for updates" button) */
export async function manualUpdateCheck(): Promise<UpdateResult> {
  return checkAndApplyUpdate();
}

/** Subscribe to data updates from other tabs */
export function subscribeToUpdates(callback: (timetable: TimetableData, version: string) => void): () => void {
  const handler = (event: CustomEvent) => {
    if (event.type === 'cukt:data-updated' && event.detail) {
      callback(event.detail.timetable, event.detail.version);
    }
  };

  window.addEventListener('cukt:data-updated', handler as EventListener);
  return () => window.removeEventListener('cukt:data-updated', handler as EventListener);
}

/** Validate data integrity after update */
export async function validateUpdatedData(): Promise<boolean> {
  try {
    const versionInfo = await loadVersion();
    const response = await fetch(`${DATA_BASE}/timetable.json?v=${Date.now()}`);
    const buffer = await response.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return hashHex === versionInfo.timetable_sha256;
  } catch {
    return false;
  }
}
