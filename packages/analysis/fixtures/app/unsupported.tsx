// Styling the check cannot read is listed as unsupported analysis, never a pass or a finding.
import styles from './card.module.css';

export function Card({ tint }: { tint: string }) {
  return (
    <div className="rounded-lg bg-red-500 p-4">
      <p className={styles.title} style={{ color: tint }}>
        Title
      </p>
    </div>
  );
}
