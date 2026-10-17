import { CheckCircleIcon, CloudArrowUpIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, space, text } from '@ultima/tokens/tokens.stylex';
import { Icon } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-7'],
  },
  line: {
    alignItems: 'center',
    color: color['--ult-color-text'],
    display: 'flex',
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-3'],
  },
  synced: { color: color['--ult-color-success-text'] },
  large: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-9'] },
});

export default function Named() {
  return (
    <div {...stylex.props(styles.stack)}>
      <span {...stylex.props(styles.line)}>
        quarterly-report.pdf
        <Icon aria-label="Synced" style={styles.synced}><CheckCircleIcon /></Icon>
      </span>
      <Icon style={styles.large}><CloudArrowUpIcon /></Icon>
    </div>
  );
}
