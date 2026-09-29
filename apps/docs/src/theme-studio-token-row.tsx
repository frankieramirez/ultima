import { docsStyles } from './docs-style';
import { StudioPortalContext } from './theme-studio-context';
import { breakpoints } from './breakpoints.stylex';
import {
  ArrowCounterClockwiseIcon,
  LinkSimpleHorizontalBreakIcon,
  LinkSimpleHorizontalIcon,
} from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import type { ColorMode, GuidedGroup, ResolvedDraft, ThemeDraft } from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, ColorField, Field, Input, Toggle } from '@ultima/ui';
import { useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { groupTokens, linkTokenOverride, resetTokenOverride, setTokenOverride } from './theme-studio-draft';

const styles = stylex.create({
  touch: { minBlockSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null }, minInlineSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null } },
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    paddingBlock: space['--ult-space-4'],
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-2'],
  },
  head: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-2'],
  },
  name: {
    color: color['--ult-color-text'],
    flexGrow: 1,
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    minInlineSize: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  status: {
    color: color['--ult-color-text-subtle'],
    flexShrink: 0,
    fontSize: text['--ult-text-1'],
    whiteSpace: 'nowrap',
  },
  statusOffending: {
    color: color['--ult-color-danger-text'],
  },
  fields: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: space['--ult-space-3'],
  },
  grow: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  colorField: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-2'],
    minInlineSize: 0,
  },
  icon: {
    paddingInline: space['--ult-space-4'],
  },
});

export type ModeOffenders = Record<ColorMode, ReadonlySet<string>>;

const NON_EMPTY = (value: string): string | undefined => (value.trim() ? value.trim() : undefined);

const NORMALIZE: Partial<Record<GuidedGroup, (value: string) => string | undefined>> = {
  shape: (value) => {
    const px = Number.parseFloat(value);
    if (!Number.isFinite(px)) return undefined;
    return `${Math.min(96, Math.max(0, px))}px`;
  },
};

function tokenLabel(token: string): string {
  return token.replace(/^--ult-/, '');
}

function ValueInput({
  label,
  normalize,
  offending,
  value,
  onCommit,
}: {
  label: string;
  normalize: (value: string) => string | undefined;
  offending: boolean;
  value: string;
  onCommit: (value: string) => void;
}) {
  return (
    <Input
      aria-invalid={offending || undefined}
      aria-label={label}
      defaultValue={value}
      key={value}
      onBlur={(event) => {
        const next = normalize(event.currentTarget.value);
        if (next === undefined) event.currentTarget.value = value;
        else if (next !== value) onCommit(next);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
      size="sm"
      spellCheck={false}
    style={[docsStyles.square, styles.touch]} />
  );
}

function TokenField({
  colorToken,
  label,
  modeLabel,
  normalize,
  offending,
  value,
  onCommit,
}: {
  colorToken: boolean;
  label: string;
  modeLabel?: string;
  normalize: (value: string) => string | undefined;
  offending: boolean;
  value: string;
  onCommit: (value: string) => void;
}) {
  const container = useContext(StudioPortalContext);
  return (
    <Field.Root name={label} style={styles.grow}>
      {modeLabel ? <Field.Label>{label}</Field.Label> : null}
      {colorToken ? (
        <ColorField.Root
          onValueChange={(hex) => {
            if (hex !== value) onCommit(hex);
          }}
          size="sm"
          value={value}
        >
          <div {...stylex.props(styles.colorField)}>
            <ColorField.Swatch aria-label={`${label} swatch`} style={styles.touch} />
            <ColorField.Input aria-invalid={offending || undefined} aria-label={label} data-studio-token={label} style={styles.touch} />
          </div>
          <ColorField.Portal container={container}>
            <ColorField.Positioner sideOffset={8}>
              <ColorField.Popup>
                <ColorField.Picker />
              </ColorField.Popup>
            </ColorField.Positioner>
          </ColorField.Portal>
        </ColorField.Root>
      ) : (
        <ValueInput
          label={label}
          normalize={normalize}
          offending={offending}
          onCommit={onCommit}
          value={value}
        />
      )}
    </Field.Root>
  );
}

function TokenRow({
  draft,
  group,
  offenders,
  resolved,
  setDraft,
  token,
}: {
  draft: ThemeDraft;
  group: GuidedGroup;
  offenders: ModeOffenders;
  resolved: ResolvedDraft;
  setDraft: Dispatch<SetStateAction<ThemeDraft>>;
  token: string;
}) {
  const darkOverride = draft.overrides.dark[token];
  const lightOverride = draft.overrides.light[token];
  const [split, setSplit] = useState<boolean | null>(null);
  const unlinked = split ?? darkOverride !== lightOverride;

  const overridden = darkOverride !== undefined || lightOverride !== undefined;
  const darkValue = darkOverride ?? resolved.dark[token] ?? '';
  const lightValue = lightOverride ?? resolved.light[token] ?? '';
  const colorToken = token.startsWith('--ult-color-');
  const normalize = NORMALIZE[group] ?? NON_EMPTY;
  const label = tokenLabel(token);
  const offending = { dark: offenders.dark.has(token), light: offenders.light.has(token) };
  const status = `${overridden ? 'Overridden' : 'Derived'}${unlinked ? ' · Unlinked' : overridden ? ' · Linked' : ''}`;

  const commit = (modes: 'both' | ColorMode) => (value: string) =>
    setDraft((current) => setTokenOverride(current, token, modes, value));

  return (
    <div {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(styles.name)}>{label}</span>
        <span {...stylex.props(styles.status, (offending.dark || offending.light) && styles.statusOffending)}>
          {status}
        </span>
        <Toggle
          aria-label={`Link ${token} modes`}
          onPressedChange={(pressed) => {
            setSplit(!pressed);
            if (pressed) setDraft((current) => linkTokenOverride(current, token));
          }}
          pressed={!unlinked}
          size="sm"
          style={[styles.icon, styles.touch]}
          variant="ghost"
        >
          {unlinked ? <LinkSimpleHorizontalBreakIcon aria-hidden /> : <LinkSimpleHorizontalIcon aria-hidden />}
        </Toggle>
        <Button
          aria-label={`Reset ${token}`}
          disabled={!overridden}
          onClick={() => setDraft((current) => resetTokenOverride(current, token))}
          size="sm"
          style={[docsStyles.square, styles.icon, styles.touch]}
          variant="ghost"
        >
          <ArrowCounterClockwiseIcon aria-hidden />
        </Button>
      </div>
      <div {...stylex.props(styles.fields)}>
        {unlinked ? (
          <>
            <TokenField
              colorToken={colorToken}
              label={`${token} dark`}
              modeLabel="Dark"
              normalize={normalize}
              offending={offending.dark}
              onCommit={commit('dark')}
              value={darkValue}
            />
            <TokenField
              colorToken={colorToken}
              label={`${token} light`}
              modeLabel="Light"
              normalize={normalize}
              offending={offending.light}
              onCommit={commit('light')}
              value={lightValue}
            />
          </>
        ) : (
          <TokenField
            colorToken={colorToken}
            label={token}
            normalize={normalize}
            offending={offending.dark || offending.light}
            onCommit={commit('both')}
            value={darkValue}
          />
        )}
      </div>
    </div>
  );
}

export function TokenRows({
  draft,
  group,
  offenders,
  resolved,
  setDraft,
  focusToken,
  focusRequest,
  onlyToken,
}: {
  draft: ThemeDraft;
  group: GuidedGroup;
  offenders: ModeOffenders;
  resolved: ResolvedDraft;
  setDraft: Dispatch<SetStateAction<ThemeDraft>>;
  focusToken?: string;
  focusRequest?: number;
  onlyToken?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusToken) return;
    const frame = requestAnimationFrame(() => {
      const field = root.current?.querySelector<HTMLInputElement>(`input[data-studio-token="${focusToken}"], input[data-studio-token="${focusToken} dark"]`);
      field?.focus();
      field?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusToken, focusRequest]);
  return (
    <div ref={root} {...stylex.props(styles.rows)}>
      {groupTokens(resolved.dark, group).filter((token) => !onlyToken || token === onlyToken).map((token) => (
        <TokenRow
          draft={draft}
          group={group}
          key={token}
          offenders={offenders}
          resolved={resolved}
          setDraft={setDraft}
          token={token}
        />
      ))}
    </div>
  );
}
