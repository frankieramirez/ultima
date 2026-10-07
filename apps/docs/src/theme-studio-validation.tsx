import { breakpoints } from './breakpoints.stylex';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui';

import type { DraftChecks } from './theme-studio-checks';

const styles = stylex.create({
  touch: { minBlockSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null } },
  root: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-2'],
  },
  title: {
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  summary: {
    color: color['--ult-color-text-subtle'],
    flexGrow: 1,
    fontSize: text['--ult-text-1'],
  },
  summaryFailing: {
    color: color['--ult-color-danger-text'],
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-2'],
    listStyle: 'none',
    margin: 0,
    paddingBlock: space['--ult-space-4'],
    paddingInline: 0,
  },
  pair: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-1'],
  },
  pairName: {
    color: color['--ult-color-text-muted'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    minInlineSize: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  pairModes: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-3'],
  },
  modeResult: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-1'],
    whiteSpace: 'nowrap',
  },
  modeFailing: {
    color: color['--ult-color-danger-text'],
  },
});

export function formatRatio(ratio: number): string {
  return String(Number(ratio.toPrecision(6)));
}

function shortName(token: string): string {
  return token.replace(/^--ult-color-/, '');
}

export function ThemeStudioValidation({ checks, onEdit }: { checks: DraftChecks; onEdit: (token: string) => void }) {
  const failing = checks.failures.length;
  const ordered = [...checks.failures, ...checks.results.filter((result) => !checks.failures.includes(result))];

  return (
    <section aria-label="Token contrast" {...stylex.props(styles.root)}>
      <header {...stylex.props(styles.header)}>
        <h2 {...stylex.props(styles.title)}>Token contrast</h2>
        <span {...stylex.props(styles.summary, failing > 0 && styles.summaryFailing)}>
          {failing === 0 ? 'All pairings pass' : `${failing} pairing${failing === 1 ? '' : 's'} failing`}
        </span>
      </header>
      <ul {...stylex.props(styles.list)}>
        {ordered.map((result) => (
          <li key={`${result.foreground}|${result.background}`} {...stylex.props(styles.pair)}>
            <span {...stylex.props(styles.pairName)}>
              {shortName(result.foreground)} on {shortName(result.background)} · min {result.minimum}:1
            </span>
            {checks.failures.includes(result) ? <Button size="sm" variant="outline" style={styles.touch} onClick={() => onEdit(result.foreground)}>Edit {shortName(result.foreground)}</Button> : null}
            <span {...stylex.props(styles.pairModes)}>
              {(['dark', 'light'] as const).map((mode) => (
                <span
                  key={mode}
                  {...stylex.props(styles.modeResult, !result[mode].pass && styles.modeFailing)}
                >
                  {mode === 'dark' ? 'Dark' : 'Light'} {formatRatio(result[mode].ratio)}:1{' '}
                  {result[mode].pass ? 'pass' : 'fail'}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
