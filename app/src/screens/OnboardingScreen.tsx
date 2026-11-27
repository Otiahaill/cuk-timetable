/* Onboarding screen — placeholder */

import { h } from 'preact';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  return (
    <main class="container" style={{ paddingTop: 'var(--space-gutter-xl)', paddingBottom: 'var(--space-gutter-xl)', textAlign: 'center' }}>
      <h1 style={{ font: 'var(--text-headline-lg)', marginBottom: 'var(--space-gutter-md)' }}>Welcome to CUK Timetable</h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-gutter-xl)', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
        Pick your course, choose your units, and see your personalised timetable.
      </p>
      <div class="card" style={{ textAlign: 'center', padding: 'var(--space-gutter-xl)' }}>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-gutter-lg)' }}>Course search + unit picker (M2)</p>
        <button class="btn btn-primary" onClick={onComplete}>Continue</button>
      </div>
    </main>
  );
}
