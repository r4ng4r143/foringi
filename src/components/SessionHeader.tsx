import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useStore } from '../store/store';
import styles from './SessionHeader.module.css';

export function SessionHeader() {
  const sessionCode = useStore(s => s.sessionCode);
  const sessionName = useStore(s => s.sessionName);
  const playerCount = useStore(s => Object.keys(s.players).length);
  const clearSession = useStore(s => s.clearSession);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const joinUrl = sessionCode
    ? `${window.location.origin}/join/${sessionCode}`
    : '';

  useEffect(() => {
    if (!canvasRef.current || !joinUrl) return;
    QRCode.toCanvas(canvasRef.current, joinUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });
  }, [joinUrl]);

  const copyCode = async () => {
    if (!sessionCode) return;
    await navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!sessionCode) return null;

  return (
    <div className={styles.header}>
      <div className={styles.info}>
        <h2 className={styles.name}>{sessionName}</h2>
        <div className={styles.codeRow}>
          <span className={styles.code}>{sessionCode}</span>
          <button className={styles.copyBtn} onClick={copyCode}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className={styles.players}>{playerCount} player{playerCount !== 1 ? 's' : ''} signed up</p>
        <button className={styles.endBtn} onClick={clearSession}>End Session</button>
      </div>
      <div className={styles.qr}>
        <canvas ref={canvasRef} />
        <p className={styles.qrHint}>Scan to join</p>
      </div>
    </div>
  );
}
