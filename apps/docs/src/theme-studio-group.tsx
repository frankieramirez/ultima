import { docsStyles } from './docs-style';
import { ArrowCounterClockwiseIcon, CaretDownIcon, LockSimpleIcon, ShuffleIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Collapsible, Toggle } from '@ultima/ui';
import type { ReactNode } from 'react';

const styles = stylex.create({
  root: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-6'] },
  header: { alignItems: 'flex-start', display: 'flex', gap: space['--ult-space-1'] },
  heading: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-2'],
    minInlineSize: 0,
    paddingBlockStart: space['--ult-space-2'],
  },
  title: {
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  summary: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  icon: { paddingInline: space['--ult-space-4'] },
});

export function ThemeStudioGroup({
  label,
  summary,
  locked,
  onLock,
  onReset,
  onShuffle,
  children,
  panel,
}: {
  label: string;
  summary: string;
  locked: boolean;
  onLock: (locked: boolean) => void;
  onReset: () => void;
  onShuffle: () => void;
  children: ReactNode;
  panel?: ReactNode;
}) {
  const titleId = `${label.toLowerCase()}-group`;

  return (
    <Collapsible.Root>
      <div {...stylex.props(styles.root)}>
        <header {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.heading)}>
            <h2 id={titleId} {...stylex.props(styles.title)}>
              {label}
            </h2>
            <p {...stylex.props(styles.summary)}>{summary}</p>
          </div>
          <Button
            aria-label={`Shuffle ${label}`}
            onClick={onShuffle}
            size="sm"
            style={[docsStyles.square, styles.icon]}
            variant="ghost"
          >
            <ShuffleIcon aria-hidden />
          </Button>
          <Toggle
            aria-label={`Lock ${label}`}
            onPressedChange={onLock}
            pressed={locked}
            size="sm"
            style={styles.icon}
            variant="ghost"
          >
            <LockSimpleIcon aria-hidden />
          </Toggle>
          <Button
            aria-label={`Reset ${label}`}
            onClick={onReset}
            size="sm"
            style={[docsStyles.square, styles.icon]}
            variant="ghost"
          >
            <ArrowCounterClockwiseIcon aria-hidden />
          </Button>
          <Collapsible.Trigger
            render={
              <Button aria-label={`${label} token overrides`} size="sm" style={[docsStyles.square, styles.icon]} variant="ghost" />
            }
          >
            <CaretDownIcon aria-hidden />
          </Collapsible.Trigger>
        </header>
        {children}
        <Collapsible.Panel>{panel}</Collapsible.Panel>
      </div>
    </Collapsible.Root>
  );
}
