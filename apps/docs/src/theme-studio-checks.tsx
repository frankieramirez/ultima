import { docsStyles } from './docs-style';
import { breakpoints } from './breakpoints.stylex';
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import type { ColorMode, PairingResult } from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui';
import { useId, type Ref } from 'react';

import { Kicker } from './page';
import type { ModeOffenders } from './theme-studio-token-row';

const MODES: readonly ColorMode[] = ['dark', 'light'];

export type CheckMark = { mode: ColorMode; pairing: PairingResult; pass: boolean };

export type DraftChecks = {
  results: PairingResult[];
  totalChecks: number;
  passedChecks: number;
  marks: CheckMark[];
  failures: PairingResult[];
  offenders: ModeOffenders;
};

export function draftChecks(results: PairingResult[]): DraftChecks {
  const marks = MODES.flatMap((mode) => results.map((pairing) => ({ mode, pairing, pass: pairing[mode].pass })));
  const offenders = { dark: new Set<string>(), light: new Set<string>() };
  for (const mark of marks) if (!mark.pass) offenders[mark.mode].add(mark.pairing.foreground).add(mark.pairing.background);
  return {
    results,
    totalChecks: marks.length,
    passedChecks: marks.filter((mark) => mark.pass).length,
    marks,
    failures: results.filter((pairing) => !pairing.dark.pass || !pairing.light.pass),
    offenders,
  };
}

export function failingPairings(checks: DraftChecks): string {
  const count = checks.failures.length;
  return `${count} pairing${count === 1 ? '' : 's'}`;
}

export function checksCount(checks: DraftChecks): string {
  return `${checks.passedChecks} of ${checks.totalChecks} pass`;
}

const styles = stylex.create({
  touch: { minBlockSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null } },
  root: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: { default: space['--ult-space-5'], [breakpoints.RAIL]: space['--ult-space-8'] },
    minInlineSize: 0,
  },
  label: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-1'] },
  count: {
    alignItems: 'center',
    display: 'flex',
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-3'],
    margin: 0,
  },
  pass: { color: color['--ult-color-success'] },
  fail: { color: color['--ult-color-danger'] },
  kicker: { margin: 0 },
  railStrip: { display: { default: 'none', [breakpoints.RAIL]: 'flex' }, flexDirection: 'column', flexShrink: 0, gap: space['--ult-space-2'] },
  row: { alignItems: 'center', display: 'flex', gap: space['--ult-space-4'] },
  mode: {
    color: color['--ult-color-text-subtle'],
    flexShrink: 0,
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    inlineSize: space['--ult-space-9'],
    letterSpacing: font['--ult-font-tracking-wide'],
  },
  marks: { display: 'flex', gap: space['--ult-space-1'] },
  mark: {
    blockSize: space['--ult-space-5'],
    inlineSize: space['--ult-space-2'],
  },
  markPass: { backgroundColor: color['--ult-color-success'] },
  markFail: { backgroundColor: color['--ult-color-danger'] },
});

export function ThemeStudioChecks({
  checks,
  onReport,
  reportRef,
}: {
  checks: DraftChecks;
  onReport: () => void;
  reportRef?: Ref<HTMLButtonElement>;
}) {
  const countId = useId();
  const failing = checks.passedChecks < checks.totalChecks;
  const Icon = failing ? WarningCircleIcon : CheckCircleIcon;
  return (
    <section aria-label="Token checks" {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.label)}>
        <p id={countId} {...stylex.props(styles.count)}>
          <Icon aria-hidden weight="fill" {...stylex.props(failing ? styles.fail : styles.pass)} />
          {checksCount(checks)}
        </p>
        <Kicker style={styles.kicker}>Token contrast · WCAG 2.2 AA</Kicker>
      </div>
      <div aria-hidden data-checks-strip {...stylex.props(styles.railStrip)}>
        {MODES.map((mode) => (
          <div key={mode} {...stylex.props(styles.row)}>
            <span {...stylex.props(styles.mode)}>{mode.toUpperCase()}</span>
            <span {...stylex.props(styles.marks)}>
              {checks.marks.filter((mark) => mark.mode === mode).map((mark) => (
                <span
                  data-check-mark
                  data-mode={mark.mode}
                  data-pairing={`${mark.pairing.foreground} on ${mark.pairing.background}`}
                  data-pass={mark.pass}
                  key={`${mark.pairing.foreground}|${mark.pairing.background}`}
                  {...stylex.props(styles.mark, mark.pass ? styles.markPass : styles.markFail)}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
      <Button aria-describedby={countId} onClick={onReport} ref={reportRef} size="sm" variant="ghost" style={[docsStyles.square, styles.touch]}>
        View draft report
      </Button>
    </section>
  );
}
