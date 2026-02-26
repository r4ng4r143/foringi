import { useState, useEffect, useCallback, type ReactNode } from 'react';
import styles from './InfoPopup.module.css';

interface InfoPopupProps {
  label?: string;
  title: string;
  children: ReactNode;
}

export function InfoPopup({ label = '?', title, children }: InfoPopupProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, close]);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <>
          <div className={styles.overlay} onClick={close} />
          <div className={styles.popup}>
            <div className={styles.header}>
              <span className={styles.title}>{title}</span>
              <button type="button" className={styles.close} onClick={close}>&times;</button>
            </div>
            <div className={styles.body}>{children}</div>
          </div>
        </>
      )}
    </>
  );
}
