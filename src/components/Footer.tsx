import { useEffect, useRef } from 'react';
import styles from './Footer.module.css';

function BmcButton() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js';
    script.setAttribute('data-name', 'bmc-button');
    script.setAttribute('data-slug', 'r4ng4ry');
    script.setAttribute('data-color', '#FFDD00');
    script.setAttribute('data-emoji', '🧙');
    script.setAttribute('data-font', 'Arial');
    script.setAttribute('data-text', 'Buy me a booster');
    script.setAttribute('data-outline-color', '#000000');
    script.setAttribute('data-font-color', '#000000');
    script.setAttribute('data-coffee-color', '#ffffff');
    el.appendChild(script);
    return () => { el.innerHTML = ''; };
  }, []);

  return <div ref={containerRef} className={styles.bmcWrap} />;
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span>No accounts. No tracking. Session data is temporary and deleted after 24 hours.</span>
      <span>
        <a href="https://github.com/r4ng4r143/foringi" target="_blank" rel="noopener noreferrer">GitHub</a>
        {' · '}
        MIT License
      </span>
      <BmcButton />
    </footer>
  );
}
