import { ArrowRightIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { palette, type ColorMode, type ScaleName } from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Badge, Button, Card } from '@ultima/ui';
import type { CSSProperties } from 'react';

import { breakpoints } from './breakpoints.stylex';
import { SwatchChip } from './swatch';
import { useResolvedScheme } from './theme';

const ROLES: Record<ScaleName, { role: string; use: string; tag?: string }> = {
  mithril: { role: 'Neutral', use: 'surfaces · text · borders', tag: 'IN USE · THIS SITE' },
  arcane: { role: 'Accent', use: 'in the Ultima preset' },
  mana: { role: 'Highlight and action', use: 'in the Ultima preset', tag: 'IN USE · THIS SITE' },
  verdant: { role: 'Success', use: 'confirmation · healthy state', tag: 'IN USE · STATUS' },
  ember: { role: 'Warning', use: 'caution · pending state', tag: 'IN USE · STATUS' },
  ruin: { role: 'Danger', use: 'destructive · failure', tag: 'IN USE · STATUS' },
};

const styles = stylex.create({
  list: { display: 'flex', flexDirection: 'column', listStyle: 'none', margin: 0, padding: 0 },
  band: {
    alignItems: { default: 'stretch', [breakpoints.DESKTOP]: 'center' },
    borderBottomWidth: 0,
    borderInlineWidth: 0,
    borderRadius: 0,
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.DESKTOP]: 'row' },
    gap: { default: space['--ult-space-5'], [breakpoints.DESKTOP]: space['--ult-space-10'] },
    paddingBlock: { default: space['--ult-space-7'], [breakpoints.DESKTOP]: '1.375rem' },
    paddingInline: { default: space['--ult-space-7'], [breakpoints.WIDE]: space['--ult-space-12'] },
  },
  title: {
    alignItems: { default: 'center', [breakpoints.DESKTOP]: 'baseline' },
    display: 'flex',
    flexShrink: 0,
    gap: { default: space['--ult-space-5'], [breakpoints.DESKTOP]: space['--ult-space-10'] },
    inlineSize: { default: 'auto', [breakpoints.DESKTOP]: '36rem' },
  },
  index: {
    color: color['--ult-color-text-muted'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    letterSpacing: font['--ult-font-tracking-wide'],
  },
  name: {
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: { default: '2.75rem', [breakpoints.DESKTOP]: '6rem' },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: '-0.03em',
    lineHeight: 0.95,
    margin: 0,
  },
  role: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-3'],
    minInlineSize: 0,
  },
  roleName: { fontSize: text['--ult-text-5'], fontWeight: font['--ult-font-weight-semibold'], margin: 0 },
  use: {
    color: color['--ult-color-text-muted'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    margin: 0,
  },
  tag: { fontFamily: font['--ult-font-mono'], letterSpacing: font['--ult-font-tracking-wide'] },
  apply: { color: 'inherit', paddingInline: 0 },
  ladder: {
    blockSize: { default: space['--ult-space-9'], [breakpoints.DESKTOP]: '4.5rem' },
    display: 'grid',
    flexShrink: 0,
    gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
    inlineSize: { default: '100%', [breakpoints.DESKTOP]: '25.5rem' },
  },
  step: { blockSize: '100%', borderRadius: 0, inlineSize: '100%' },
});

const STEPS = { ground: 2, rule: 4, text: 12 } as const;

/**
 * Per scale and mode, the step for the band's name (large text, 3:1 on step 2) and for its small muted
 * text (4.5:1 on step 2). The frames draw names in step 9 and mithril's in 12; light ember's 9 measures
 * 1.92 and its 11 measures 3.01, so it takes 11 for the name and 12 for small text.
 */
export const BAND_INK: Record<ScaleName, Record<ColorMode, { name: number; muted: number }>> = {
  mithril: { dark: { name: 12, muted: 11 }, light: { name: 12, muted: 11 } },
  arcane: { dark: { name: 9, muted: 11 }, light: { name: 9, muted: 11 } },
  mana: { dark: { name: 9, muted: 11 }, light: { name: 9, muted: 11 } },
  verdant: { dark: { name: 9, muted: 11 }, light: { name: 9, muted: 11 } },
  ember: { dark: { name: 9, muted: 11 }, light: { name: 11, muted: 12 } },
  ruin: { dark: { name: 9, muted: 11 }, light: { name: 9, muted: 11 } },
};

const ink = stylex.create({ name: (value: string) => ({ color: value }) });

export function ScaleBands({ onPreviewAccent }: { onPreviewAccent: () => void }) {
  const mode = useResolvedScheme();
  return (
    <ol aria-label="The six scales" {...stylex.props(styles.list)}>
      {palette.map((scale, index) => {
        const steps = scale[mode];
        const step = (n: number) => steps[n - 1]!;
        const { role, use, tag } = ROLES[scale.name];
        const boundary = {
          '--ult-color-surface-raised': step(STEPS.ground),
          '--ult-color-border': step(STEPS.rule),
          '--ult-color-text': step(STEPS.text),
          '--ult-color-text-muted': step(BAND_INK[scale.name][mode].muted),
        } as CSSProperties;
        const name = step(BAND_INK[scale.name][mode].name);
        return (
          <li key={scale.name} style={boundary}>
            <Card.Root style={styles.band}>
              <div {...stylex.props(styles.title)}>
                <span {...stylex.props(styles.index)}>{String(index + 1).padStart(2, '0')}</span>
                <h3 {...stylex.props(styles.name, ink.name(name))}>{scale.name.toUpperCase()}</h3>
              </div>
              <div {...stylex.props(styles.role)}>
                <p {...stylex.props(styles.roleName)}>{role}</p>
                <p {...stylex.props(styles.use)}>{use}</p>
                {tag ? (
                  <Badge style={styles.tag}>{tag}</Badge>
                ) : (
                  <Button size="sm" variant="ghost" onClick={onPreviewAccent} style={[styles.apply, ink.name(name)]}>
                    Preview as accent <ArrowRightIcon aria-hidden />
                  </Button>
                )}
              </div>
              <div aria-hidden {...stylex.props(styles.ladder)}>
                {steps.map((value, n) => (
                  <SwatchChip key={n} value={value} style={styles.step} />
                ))}
              </div>
            </Card.Root>
          </li>
        );
      })}
    </ol>
  );
}
