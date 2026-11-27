/* Week screen — placeholder */

import { h } from 'preact';

export function WeekScreen() {
  return (
    <main class="container" style={{ paddingTop: 'var(--space-gutter-lg)', paddingBottom: 'var(--space-gutter-xl)' }}>
      <header style={{ marginBottom: 'var(--space-gutter-lg)' }}>
        <h1 style={{ font: 'var(--text-headline-md)' }}>Week</h1>
      </header>
      <div class="card" style={{ textAlign: 'center', padding: 'var(--space-gutter-xl)' }}>
        <p style={{ color: 'var(--color-on-surface-variant)' }}>Day chips + timeline + clash markers (M4)</p>
      </div>
    </main>
  );
}
