import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span>No accounts. No tracking. Session data is temporary and deleted after 24 hours.</span>
      <span>
        <a href="https://github.com/r4ng4r143/foringi" target="_blank" rel="noopener noreferrer">GitHub</a>
        {' · '}
        MIT License
      </span>
      <a
        href="https://www.buymeacoffee.com/r4ng4ry"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.bmcBtn}
      >
        🧙 Buy me a booster
      </a>
    </footer>
  );
}
