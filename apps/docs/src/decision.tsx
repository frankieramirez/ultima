import { ArrowUpRightIcon, CheckIcon, FileTextIcon, XIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card, Separator } from '@ultima/ui';
import type { ReactNode } from 'react';

import { breakpoints } from './breakpoints.stylex';
import { foundationStyles } from './foundation';
import { TextLink } from './text-link';
import { headings } from './typography';

const styles = stylex.create({
  head: {
    alignItems: 'flex-end',
    display: 'flex',
    gap: space['--ult-space-7'],
    marginBlockStart: '5.5rem',
    paddingBlockEnd: space['--ult-space-8'],
  },
  number: {
    color: color['--ult-color-text-subtle'],
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: { default: text['--ult-text-11'], [breakpoints.WIDE]: '5.5rem' },
    letterSpacing: font['--ult-font-tracking-tightest'],
    lineHeight: 0.85,
  },
  titles: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    minInlineSize: 0,
    paddingBlockEnd: space['--ult-space-2'],
  },
  title: {
    fontSize: { default: text['--ult-text-9'], [breakpoints.WIDE]: '2.5rem' },
    letterSpacing: font['--ult-font-tracking-tighter'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  record: {
    alignItems: 'center',
    display: 'inline-flex',
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-3'],
    textDecoration: 'none',
  },
  source: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-4'], margin: 0 },
  tradeoff: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.WIDE]: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
    marginBlock: space['--ult-space-8'],
  },
  side: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    padding: space['--ult-space-7'],
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  option: {
    display: 'flex',
    fontSize: text['--ult-text-5'],
    gap: space['--ult-space-5'],
    lineHeight: font['--ult-font-leading-snug'],
  },
  chosen: { color: color['--ult-color-text'], fontWeight: font['--ult-font-weight-medium'] },
  passed: { color: color['--ult-color-text-muted'] },
  mark: { flexShrink: 0, fontSize: text['--ult-text-5'], marginBlockStart: space['--ult-space-1'] },
});

export function Decision({
  number,
  title,
  record,
}: {
  number: string;
  title: string;
  record?: { label: string; href: string };
}) {
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <span aria-hidden {...stylex.props(styles.number)}>
          {number}
        </span>
        <div {...stylex.props(styles.titles)}>
          <h2 {...stylex.props(headings.h2, styles.title)}>{title}</h2>
          {record ? (
            <TextLink href={record.href} style={styles.record}>
              <FileTextIcon aria-hidden />
              {record.label}
              <ArrowUpRightIcon aria-hidden />
            </TextLink>
          ) : (
            <p {...stylex.props(styles.source)}>A principle in the spec</p>
          )}
        </div>
      </div>
      <Separator />
    </>
  );
}

export function Tradeoff({ chose, over }: { chose: ReactNode[]; over: ReactNode[] }) {
  return (
    <Card.Root style={styles.tradeoff}>
      <div {...stylex.props(styles.side)}>
        <p {...stylex.props(foundationStyles.label)}>Chose</p>
        <ul {...stylex.props(styles.options)}>
          {chose.map((option, index) => (
            <li key={index} {...stylex.props(styles.option, styles.chosen)}>
              <CheckIcon aria-hidden {...stylex.props(styles.mark)} />
              <span>{option}</span>
            </li>
          ))}
        </ul>
      </div>
      <Separator orientation="vertical" />
      <div {...stylex.props(styles.side)}>
        <p {...stylex.props(foundationStyles.label)}>Over</p>
        <ul {...stylex.props(styles.options)}>
          {over.map((option, index) => (
            <li key={index} {...stylex.props(styles.option, styles.passed)}>
              <XIcon aria-hidden {...stylex.props(styles.mark)} />
              <span>{option}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card.Root>
  );
}
