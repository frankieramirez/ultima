import { docsStyles } from './docs-style';
import { breakpoints } from './breakpoints.stylex';
import { ArrowCounterClockwiseIcon, CaretDownIcon, LockSimpleIcon, ShuffleIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Collapsible, Toggle } from '@ultima/ui';
import { useEffect, useState, type ReactNode } from 'react';

const styles = stylex.create({
  touch: { minBlockSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null }, minInlineSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null } },
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
    fontSize: text['--ult-text-5'],
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
  active,
  overrideRequest,
  summary,
  locked,
  onLock,
  onReset,
  onShuffle,
  children,
  panel,
}: {
  label: string;
  active: boolean;
  overrideRequest?: number;
  summary: string;
  locked: boolean;
  onLock: (locked: boolean) => void;
  onReset: () => void;
  onShuffle: () => void;
  children: ReactNode;
  panel?: ReactNode;
}) {
  const [open, setOpen] = useState(active);
  const [overridesOpen, setOverridesOpen] = useState(false);
  useEffect(() => { if (active) setOpen(true); }, [active]);
  useEffect(() => { if (overrideRequest) { setOpen(true); setOverridesOpen(true); } }, [overrideRequest]);
  const titleId = `${label.toLowerCase()}-group`;

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
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
            style={[docsStyles.square, styles.icon, styles.touch]}
            variant="ghost"
          >
            <ShuffleIcon aria-hidden />
          </Button>
          <Toggle
            aria-label={`Lock ${label}`}
            onPressedChange={onLock}
            pressed={locked}
            size="sm"
            style={[styles.icon, styles.touch]}
            variant="ghost"
          >
            <LockSimpleIcon aria-hidden />
          </Toggle>
          <Button
            aria-label={`Reset ${label}`}
            onClick={onReset}
            size="sm"
            style={[docsStyles.square, styles.icon, styles.touch]}
            variant="ghost"
          >
            <ArrowCounterClockwiseIcon aria-hidden />
          </Button>
          <Collapsible.Trigger
            render={<Button aria-label={`Edit ${label}`} size="sm" style={[docsStyles.square, styles.icon, styles.touch]} variant="ghost" />}
          >
            <CaretDownIcon aria-hidden />
          </Collapsible.Trigger>
        </header>
        <Collapsible.Panel>
          <div {...stylex.props(styles.root)}>{children}
            <Collapsible.Root open={overridesOpen} onOpenChange={setOverridesOpen}>
              <Collapsible.Trigger render={<Button variant="outline" size="sm" style={[docsStyles.square, styles.touch]} />}>{label} token overrides <CaretDownIcon aria-hidden /></Collapsible.Trigger>
              <Collapsible.Panel>{panel}</Collapsible.Panel>
            </Collapsible.Root>
          </div>
        </Collapsible.Panel>
      </div>
    </Collapsible.Root>
  );
}
