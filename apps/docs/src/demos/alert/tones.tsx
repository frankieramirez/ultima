import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Alert, type AlertTone } from '@ultima/ui';

const tones: AlertTone[] = ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'];

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-4'],
  },
  copy: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-2'],
  },
});

const copy: Record<AlertTone, { title: string; description: string }> = {
  neutral: { title: 'Maintenance window', description: 'The registry will be read-only from 02:00 to 03:00 UTC.' },
  accent: { title: 'New tokens available', description: 'Pull the latest palette before editing a component.' },
  highlight: { title: 'Copyable example', description: 'The running demo and the printed source are the same file.' },
  success: { title: 'Contrast gate passing', description: 'Every required pairing clears WCAG 2.2 AA in both modes.' },
  warning: { title: 'Disk almost full', description: '87% of 500 GB used.' },
  danger: { title: 'Publish blocked', description: 'The palette failed the contrast gate.' },
};

export default function Tones() {
  return (
    <div {...stylex.props(styles.stack)}>
      {tones.map((tone) => (
        <Alert.Root key={tone} tone={tone}>
          <div {...stylex.props(styles.copy)}>
            <Alert.Title>{copy[tone].title}</Alert.Title>
            <Alert.Description>{copy[tone].description}</Alert.Description>
          </div>
        </Alert.Root>
      ))}
    </div>
  );
}
