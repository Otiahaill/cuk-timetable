/* Shared class detail bottom sheet — used by Today, Week, Browse */

import { useEffect, useRef, useState } from 'preact/hooks';
import type { Class } from '../lib/types';
import { formatTimeRange } from '../lib/types';

interface ClassDetailSheetProps {
  classData: Class | null;
  isOpen: boolean;
  onClose: () => void;
  onShare?: (cls: Class) => void;
}

export function ClassDetailSheet({ classData, isOpen, onClose, onShare }: ClassDetailSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const delta = e.touches[0].clientY - startY;
    if (delta > 0) {
      setTranslateY(delta);
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!dragging) return;
    setDragging(false);
    if (translateY > 100) {
      onClose();
    }
    setTranslateY(0);
    setStartY(0);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !classData) return null;

  const modeColors: Record<string, { bg: string; text: string }> = {
    'Face to face': { bg: 'var(--color-mode-face-to-face-container)', text: 'var(--color-mode-face-to-face)' },
    Online: { bg: 'var(--color-mode-online-container)', text: 'var(--color-mode-online)' },
    Blended: { bg: 'var(--color-mode-blended-container)', text: 'var(--color-mode-blended)' },
  };

  const modeStyle = modeColors[classData.mode] || { bg: 'var(--color-surface-container)', text: 'var(--color-on-surface)' };

  return (
    <>
      <div
        className="overlay"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className="bottom-sheet drag-handle"
        style={{ transform: `translateY(${translateY}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <div className="flex items-center justify-between px-gutter-md py-gutter-sm border-b border-outline-variant">
          <h2 id="sheet-title" className="font-headline text-title-lg text-on-surface">
            {classData.unit_code ? `${classData.unit_code} · ${classData.unit_name}` : classData.unit_name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-icon p-gutter-sm rounded-full hover:bg-surface-variant"
            aria-label="Close details"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-gutter-lg gap-gutter-md flex flex-col">
          <div className="flex items-center justify-between gap-gutter-sm w-full">
            <span className="font-headline text-headline-md text-on-surface tabular-nums">
              {formatTimeRange(classData.start, classData.end)}
            </span>
            <span
              className="inline-flex items-center px-gutter-md py-gutter-xs rounded-full font-label text-label-sm"
              style={{ backgroundColor: modeStyle.bg, color: modeStyle.text }}
            >
              {classData.mode}
            </span>
          </div>

          <div className="flex items-start gap-gutter-md">
            <span className="material-symbols-outlined text-[24px] text-on-surface-variant mt-1" aria-hidden="true">location_on</span>
            <div className="flex-1">
              <p className="font-label text-label-md text-on-surface-variant">Venue</p>
              <p className="font-body text-body-lg text-on-surface">{classData.venue}</p>
            </div>
          </div>

          <div className="flex items-start gap-gutter-md">
            <span className="material-symbols-outlined text-[24px] text-on-surface-variant mt-1" aria-hidden="true">person</span>
            <div className="flex-1">
              <p className="font-label text-label-md text-on-surface-variant">Lecturer</p>
              <p className="font-body text-body-lg text-on-surface">{classData.lecturer}</p>
            </div>
          </div>

          {classData.class_size !== null && (
            <div className="flex items-start gap-gutter-md">
              <span className="material-symbols-outlined text-[24px] text-on-surface-variant mt-1" aria-hidden="true">groups</span>
              <div className="flex-1">
                <p className="font-label text-label-md text-on-surface-variant">Class size</p>
                <p className="font-body text-body-lg text-on-surface">{classData.class_size} students</p>
              </div>
            </div>
          )}

          {classData.groups.length > 0 && classData.groups[0] !== classData.course && (
            <div className="flex items-start gap-gutter-md">
              <span className="material-symbols-outlined text-[24px] text-on-surface-variant mt-1" aria-hidden="true">link</span>
              <div className="flex-1">
                <p className="font-label text-label-md text-on-surface-variant">Shared with</p>
                <p className="font-body text-body-md text-on-surface">
                  {classData.groups.filter((g) => g !== classData.course).join(', ')}
                </p>
              </div>
            </div>
          )}

          {classData.note && (
            <div className="p-gutter-md rounded-lg bg-amber-container text-on-amber-container border-l-4 border-amber">
              <p className="font-body text-body-md">{classData.note}</p>
            </div>
          )}

          {onShare && (
            <button
              type="button"
              onClick={() => onShare(classData)}
              className="btn btn-secondary w-full mt-gutter-md"
            >
              <span className="material-symbols-outlined" aria-hidden="true">share</span>
              Share class
            </button>
          )}
        </div>
      </div>
    </>
  );
}
