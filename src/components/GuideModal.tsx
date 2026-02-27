import { useState, useEffect, useRef } from 'react';
import { renderMarkdown } from '../content/markdown';
import guideRaw from '../../GUIDE.md?raw';
import styles from './GuideModal.module.css';

const guideHtml = renderMarkdown(guideRaw);

export function GuideButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className ?? styles.trigger} onClick={() => setOpen(true)}>
        Guide
      </button>
      {open && <GuideModal onClose={() => setOpen(false)} />}
    </>
  );
}

function GuideModal({ onClose }: { onClose: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href?.startsWith('#')) {
        e.preventDefault();
        const el = bodyRef.current?.querySelector(href);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>User Guide</span>
          <button type="button" className={styles.close} onClick={onClose}>&times;</button>
        </div>
        <div
          ref={bodyRef}
          className={styles.body}
          dangerouslySetInnerHTML={{ __html: guideHtml }}
          onClick={handleClick}
        />
      </div>
    </>
  );
}
