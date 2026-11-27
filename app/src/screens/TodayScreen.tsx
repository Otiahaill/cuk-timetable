/* Today screen — placeholder */

import { h } from 'preact';

export function TodayScreen() {
  return (
    <main class="container" style={{ paddingTop: 'var(--space-gutter-lg)', paddingBottom: 'var(--space-gutter-xl)' }}>
      <header style={{ marginBottom: 'var(--space-gutter-lg)' }}>
        <h1 style={{ font: 'var(--text-headline-md)', marginBottom: 'var(--space-gutter-xs)' }}>Today</h1>
        <p style={{ color: 'var(--color-on-surface-variant)', font: 'var(--text-body-md)' }}>Monday, 27 November 2026</p>
      </header>
      <div class="card" style={{ textAlign: 'center', padding: 'var(--space-gutter-xl)' }}>
        <p style={{ color: 'var(--color-on-surface-variant)' }}>Next class card + timeline (M3)</p>
      </div>
    </main>
  );
}
