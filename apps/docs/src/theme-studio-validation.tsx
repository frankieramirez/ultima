import { docsStyles } from './docs-style';
import { breakpoints } from './breakpoints.stylex';
import * as stylex from '@stylexjs/stylex';
import { applyClosestPassingValue, fixTarget, type PairingResult, type ThemeDraft } from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui';
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';

import { Kicker } from './page';
import { failingPairings, type DraftChecks } from './theme-studio-checks';
import { resetTokenOverride } from './theme-studio-draft';
import type { DraftEdit } from './theme-studio-store';

const MODES = ['dark', 'light'] as const;

const styles = stylex.create({
  touch: { minBlockSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null } },
  root: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    gap: space['--ult-space-6'],
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
  modes: {
    display: 'grid',
    gap: space['--ult-space-4'],
    gridTemplateColumns: '1fr 1fr',
    margin: 0,
  },
  modeCount: {
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  pair: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-2'],
  },
  failure: {
    backgroundColor: color['--ult-color-danger-subtle'],
    gap: space['--ult-space-4'],
    padding: space['--ult-space-6'],
  },
  pairName: {
    color: color['--ult-color-text-muted'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    minInlineSize: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  failureName: {
    color: color['--ult-color-text'],
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
  fixes: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-3'],
  },
  fixNote: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-2'],
    margin: 0,
  },
});

export function formatRatio(ratio: number): string {
  return String(Number(ratio.toPrecision(6)));
}

function shortName(token: string): string {
  return token.replace(/^--ult-color-/, '');
}

function pairingKey(pairing: PairingResult): string {
  return `${pairing.foreground}|${pairing.background}`;
}

function fixNote(draft: ThemeDraft, fixed: ThemeDraft, target: string): string {
  const writes = MODES.filter((mode) => fixed.overrides[mode][target] !== draft.overrides[mode][target]).map(
    (mode) => `${fixed.overrides[mode][target]} in ${mode}`,
  );
  return `Sets ${shortName(target)} to ${writes.join(' and ')}.`;
}

function ModeResults({ result }: { result: PairingResult }) {
  return (
    <span {...stylex.props(styles.pairModes)}>
      {MODES.map((mode) => (
        <span key={mode} {...stylex.props(styles.modeResult, !result[mode].pass && styles.modeFailing)}>
          {mode === 'dark' ? 'Dark' : 'Light'} {formatRatio(result[mode].ratio)}:1 {result[mode].pass ? 'pass' : 'fail'}
        </span>
      ))}
    </span>
  );
}

function Failure({
  draft,
  deferredDraft,
  onCommit,
  onEdit,
  result,
}: {
  draft: ThemeDraft;
  /** The search reads a deferred draft, so a commit repaints the report before every failure is searched again. */
  deferredDraft: ThemeDraft;
  onCommit: (edit: DraftEdit) => void;
  onEdit: (token: string) => void;
  result: PairingResult;
}) {
  const noteId = useId();
  const { foreground, background, minimum } = result;
  const fix = useMemo(
    () => applyClosestPassingValue(deferredDraft, { foreground, background, minimum }),
    [deferredDraft, foreground, background, minimum],
  );
  const target = fixTarget(draft, result);
  const overridden = draft.overrides.dark[target] !== undefined || draft.overrides.light[target] !== undefined;
  return (
    <li {...stylex.props(styles.pair, styles.failure)}>
      <span {...stylex.props(styles.pairName, styles.failureName)}>
        {shortName(result.foreground)} on {shortName(result.background)} · min {result.minimum}:1
      </span>
      <ModeResults result={result} />
      <div {...stylex.props(styles.fixes)}>
        <Button
          aria-describedby={noteId}
          data-fix
          disabled={'reason' in fix}
          focusableWhenDisabled
          onClick={() =>
            onCommit((current) => {
              const next = applyClosestPassingValue(current, result);
              return 'draft' in next ? next.draft : current;
            })
          }
          size="sm"
          style={[docsStyles.square, styles.touch]}
        >
          Use closest passing value
        </Button>
        {overridden ? (
          <Button
            data-fix
            onClick={() => onCommit((current) => resetTokenOverride(current, target))}
            size="sm"
            variant="outline"
            style={[docsStyles.square, styles.touch]}
          >
            Reset to derived
          </Button>
        ) : null}
        <Button onClick={() => onEdit(target)} size="sm" variant="outline" style={[docsStyles.square, styles.touch]}>
          Edit {shortName(target)}
        </Button>
      </div>
      <p id={noteId} {...stylex.props(styles.fixNote)}>
        {'reason' in fix ? fix.reason : fixNote(deferredDraft, fix.draft, target)}
      </p>
    </li>
  );
}

export function ThemeStudioValidation({
  checks,
  draft,
  onCommit,
  onEdit,
}: {
  checks: DraftChecks;
  draft: ThemeDraft;
  onCommit: (edit: DraftEdit) => void;
  onEdit: (token: string) => void;
}) {
  const failing = checks.failures.length;
  const passing = checks.results.filter((result) => !checks.failures.includes(result));
  const deferredDraft = useDeferredValue(draft);
  const heading = useRef<HTMLHeadingElement>(null);
  const failures = useRef<HTMLUListElement>(null);
  // A fix or reset can unmount its own card; focus then moves to the card now at that place, or to the heading.
  const [refocus, setRefocus] = useState<number | null>(null);
  useEffect(() => {
    if (refocus === null) return;
    setRefocus(null);
    const cards = [...(failures.current?.children ?? [])];
    const card = cards[Math.min(refocus, cards.length - 1)];
    if (card?.contains(document.activeElement)) return;
    (card?.querySelector<HTMLElement>('[data-fix]') ?? heading.current)?.focus();
  }, [refocus, checks]);

  return (
    <section aria-label="Token contrast" {...stylex.props(styles.root)}>
      <header {...stylex.props(styles.header)}>
        <h2 ref={heading} tabIndex={-1} {...stylex.props(styles.title)}>Token contrast</h2>
        <span {...stylex.props(styles.summary, failing > 0 && styles.summaryFailing)}>
          {failing === 0 ? 'All pairings pass' : `${failingPairings(checks)} failing`}
        </span>
      </header>
      <dl {...stylex.props(styles.modes)}>
        {MODES.map((mode) => (
          <div key={mode}>
            <dt><Kicker>{mode.toUpperCase()}</Kicker></dt>
            <dd {...stylex.props(styles.modeCount)}>
              {checks.results.filter((result) => result[mode].pass).length} of {checks.results.length} pairings pass
            </dd>
          </div>
        ))}
      </dl>
      {failing > 0 ? (
        <>
          <Kicker tone="muted">Failing · {failing}</Kicker>
          <ul aria-label="Failing pairings" ref={failures} {...stylex.props(styles.list)}>
            {checks.failures.map((result, index) => (
              <Failure
                deferredDraft={deferredDraft}
                draft={draft}
                key={pairingKey(result)}
                onCommit={(edit) => {
                  onCommit(edit);
                  setRefocus(index);
                }}
                onEdit={onEdit}
                result={result}
              />
            ))}
          </ul>
        </>
      ) : null}
      <Kicker tone="muted">Passing · {passing.length}</Kicker>
      <ul aria-label="Passing pairings" {...stylex.props(styles.list)}>
        {passing.map((result) => (
          <li key={pairingKey(result)} {...stylex.props(styles.pair)}>
            <span {...stylex.props(styles.pairName)}>
              {shortName(result.foreground)} on {shortName(result.background)} · min {result.minimum}:1
            </span>
            <ModeResults result={result} />
          </li>
        ))}
      </ul>
    </section>
  );
}
