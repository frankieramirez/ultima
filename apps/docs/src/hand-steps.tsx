import { EyeSlashIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Badge, Separator } from '@ultima/ui';

import { setupItems } from '../../../registry/items.config';
import { breakpoints } from './breakpoints.stylex';
import { proseComponents } from './prose';

const { code: Code } = proseComponents;

const styles = stylex.create({
  list: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-5'],
    lineHeight: 1.65,
    listStyleType: 'decimal-leading-zero',
    overflowWrap: 'anywhere',
    marginBlock: space['--ult-space-5'],
    paddingInlineStart: space['--ult-space-9'],
  },
  step: {
    paddingBlockStart: space['--ult-space-6'],
    '::marker': {
      color: color['--ult-color-text-subtle'],
      fontFamily: font['--ult-font-mono'],
      fontSize: text['--ult-text-2'],
    },
  },
  row: {
    alignItems: 'start',
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.WIDE]: 'row' },
    gap: { default: space['--ult-space-4'], [breakpoints.WIDE]: space['--ult-space-8'] },
    justifyContent: 'space-between',
    paddingBlockEnd: space['--ult-space-6'],
  },
  badge: { alignItems: 'center', flexShrink: 0, gap: space['--ult-space-2'], whiteSpace: 'nowrap' },
});

export function HandSteps({ item }: { item: keyof typeof setupItems }) {
  return (
    <ol {...stylex.props(styles.list)}>
      {setupItems[item].handSteps.map((step) => (
        <li key={step.prose} {...stylex.props(styles.step)}>
          <div {...stylex.props(styles.row)}>
            <span>
              {step.prose.split('`').map((part, index) => (index % 2 === 1 ? <Code key={index}>{part}</Code> : part))}
            </span>
            {step.assertion ? (
              <Badge tone="success" style={styles.badge}>
                <ShieldCheckIcon aria-hidden /> doctor checks this
              </Badge>
            ) : (
              <Badge style={styles.badge}>
                <EyeSlashIcon aria-hidden /> can't be checked
              </Badge>
            )}
          </div>
          <Separator aria-hidden />
        </li>
      ))}
    </ol>
  );
}
