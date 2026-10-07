import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, shadow, space, text } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  row: { alignItems: 'flex-end', display: 'flex', gap: space['--ult-space-1'], height: '1.375rem' },
  chip: { height: '1.125rem', width: space['--ult-space-5'] },
  bar: { backgroundColor: color['--ult-color-text-muted'], width: '0.375rem' },
  dash: { backgroundColor: color['--ult-color-text-muted'], height: '0.1875rem' },
  type: {
    color: color['--ult-color-text'],
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
  },
  corner: {
    borderColor: color['--ult-color-text-muted'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    borderStartStartRadius: radius['--ult-radius-md'],
    height: space['--ult-space-7'],
    width: space['--ult-space-7'],
  },
  lifted: {
    backgroundColor: color['--ult-color-surface-hover'],
    borderRadius: radius['--ult-radius-sm'],
    boxShadow: shadow['--ult-shadow-sm'],
    height: space['--ult-space-6'],
    width: '1.375rem',
  },
});

const fill = stylex.create({ chip: (value: string) => ({ backgroundColor: value }) });
const size = stylex.create({
  height: (value: string) => ({ height: value }),
  width: (value: string) => ({ width: value }),
});

const COLOR_ROLES = ['surface', 'border', 'text-subtle', 'text', 'success', 'warning', 'danger'];
const SPACE_STEPS = ['0.1875rem', '0.375rem', '0.5625rem', '0.875rem', '1.25rem'];
const MOTION_STEPS = ['0.25rem', '0.5rem', '0.75rem'];

export default function GroupGlyph({ group }: { group: string }) {
  switch (group) {
    case 'color':
      return (
        <span aria-hidden {...stylex.props(styles.row)}>
          {COLOR_ROLES.map((role) => (
            <span key={role} {...stylex.props(styles.chip, fill.chip(`var(--ult-color-${role})`))} />
          ))}
        </span>
      );
    case 'space':
      return (
        <span aria-hidden {...stylex.props(styles.row)}>
          {SPACE_STEPS.map((step) => (
            <span key={step} {...stylex.props(styles.bar, size.height(step))} />
          ))}
        </span>
      );
    case 'text':
      return (
        <span aria-hidden {...stylex.props(styles.row, styles.type)}>
          Aa
        </span>
      );
    case 'radius':
      return (
        <span aria-hidden {...stylex.props(styles.row)}>
          <span {...stylex.props(styles.corner)} />
        </span>
      );
    case 'shadow':
      return (
        <span aria-hidden {...stylex.props(styles.row)}>
          <span {...stylex.props(styles.lifted)} />
        </span>
      );
    case 'motion':
      return (
        <span aria-hidden {...stylex.props(styles.row)}>
          {MOTION_STEPS.map((step) => (
            <span key={step} {...stylex.props(styles.dash, size.width(step))} />
          ))}
        </span>
      );
    default:
      return null;
  }
}
