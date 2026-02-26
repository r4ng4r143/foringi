import { useState, useEffect, useCallback } from 'react';
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
  const close = useCallback(onClose, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <>
      <div className={styles.overlay} onClick={close} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>User Guide</span>
          <button type="button" className={styles.close} onClick={close}>&times;</button>
        </div>
        <div className={styles.body} dangerouslySetInnerHTML={{ __html: guideHtml }} />
      </div>
    </>
  );
}
