import { ArrowCounterClockwiseIcon, CaretDownIcon, LockSimpleIcon, ShuffleIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Collapsible, Toggle } from '@ultima/ui';
import type { ReactNode } from 'react';

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-2'],
  },
  title: {
    flexGrow: 1,
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  icon: {
    paddingInline: space['--ult-space-4'],
  },
});

export function ThemeStudioGroup({
  label,
  locked,
  onLock,
  onReset,
  onShuffle,
  children,
}: {
  label: string;
  locked: boolean;
  onLock: (locked: boolean) => void;
  onReset: () => void;
  onShuffle: () => void;
  children: ReactNode;
}) {
  const titleId = `${label.toLowerCase()}-group`;

  return (
    <Collapsible.Root>
      <div {...stylex.props(styles.root)}>
        <header {...stylex.props(styles.header)}>
          <h2 id={titleId} {...stylex.props(styles.title)}>
            {label}
          </h2>
          <Button aria-label={`Shuffle ${label}`} onClick={onShuffle} size="sm" style={styles.icon} variant="ghost">
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
          <Button aria-label={`Reset ${label}`} onClick={onReset} size="sm" style={styles.icon} variant="ghost">
            <ArrowCounterClockwiseIcon aria-hidden />
          </Button>
          <Collapsible.Trigger
            render={
              <Button aria-label={`${label} token overrides`} size="sm" style={styles.icon} variant="ghost" />
            }
          >
            <CaretDownIcon aria-hidden />
          </Collapsible.Trigger>
        </header>
        {children}
        <Collapsible.Panel />
      </div>
    </Collapsible.Root>
  );
}
