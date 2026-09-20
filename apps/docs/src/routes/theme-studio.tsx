import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import {
  colorScheme,
  darkTheme,
  resolveDraft,
  SHUFFLE_ATTEMPT_LIMIT,
  stockDraft,
  type GuidedGroup,
  type ShuffleExhaustion,
} from '@ultima/tokens';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Alert, Button, Separator } from '@ultima/ui';
import { useMemo, useState } from 'react';

import { BrandLogo } from '../brand-logo';
import { GROUPS } from '../theme-studio-draft';
import { ThemeStudioEditor } from '../theme-studio-editor';
import { ThemeStudioPreview } from '../theme-studio-preview';
import { ThemeStudioShuffleBar } from '../theme-studio-shuffle';
import { useStudioDraft } from '../theme-studio-store';

const RAIL = '@media (min-width: 52.5rem)';

const MODES = ['dark', 'light', 'compare'] as const;

type Group = (typeof GROUPS)[number]['label'];
type Mode = (typeof MODES)[number];

const styles = stylex.create({
  shell: {
    backgroundColor: color['--ult-color-surface'],
    blockSize: '100dvh',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    minBlockSize: 0,
  },
  header: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    inlineSize: '100%',
    paddingBlock: space['--ult-space-6'],
    paddingInline: space['--ult-space-8'],
  },
  brand: {
    display: 'inline-flex',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  brandLogo: { display: 'block', height: '0.8rem', width: 'auto' },
  title: {
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  meta: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-2'],
  },
  save: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-1'],
    marginInlineStart: 'auto',
  },
  actions: {
    display: 'flex',
    gap: space['--ult-space-4'],
  },
  body: {
    display: 'flex',
    flexDirection: { default: 'column', [RAIL]: 'row' },
    flexGrow: 1,
    minBlockSize: 0,
    minInlineSize: 0,
  },
  editor: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    gap: space['--ult-space-6'],
    inlineSize: { default: '100%', [RAIL]: '18.75rem' },
    minBlockSize: 0,
    order: { default: 1, [RAIL]: 0 },
    padding: space['--ult-space-8'],
  },
  groups: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minBlockSize: 0,
    minInlineSize: 0,
    overflow: 'auto',
  },
  status: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    marginBlockStart: 'auto',
    paddingBlockStart: space['--ult-space-6'],
  },
  statusCopy: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-1'],
  },
  notice: {
    flexShrink: 0,
  },
});

function groupLabel(id: GuidedGroup): string {
  return GROUPS.find((item) => item.id === id)?.label ?? id;
}

function ExhaustionNotice({ report }: { report: ShuffleExhaustion }) {
  const failures = report.failures
    .map(
      (row) =>
        `${row.foreground.replace('--ult-color-', '')} on ${row.background.replace('--ult-color-', '')}`,
    )
    .join(', ');
  const locks = report.locks.length
    ? ` Locked groups: ${report.locks.map(groupLabel).join(', ')}.`
    : ' No locked groups constrained the search.';
  return (
    <Alert.Root tone="danger" style={styles.notice}>
      <Alert.Title>No passing palette in {SHUFFLE_ATTEMPT_LIMIT} attempts</Alert.Title>
      <Alert.Description>
        Nothing changed. Failing pairings: {failures}.{locks}
      </Alert.Description>
    </Alert.Root>
  );
}

export function ThemeStudio() {
  const [mode, setMode] = useState<Mode>('dark');
  const [group, setGroup] = useState<Group>('Color');
  const store = useStudioDraft();
  const { draft } = store;
  const resolved = useMemo(() => resolveDraft(draft), [draft]);
  const locked = Object.values(draft.locks).filter(Boolean).length;
  const overrides = Object.keys(draft.overrides.dark).length + Object.keys(draft.overrides.light).length;

  return (
    <div {...stylex.props(darkTheme, colorScheme.dark, styles.shell)}>
      <header {...stylex.props(styles.header)}>
        <Link to="/" aria-label="Ultima home" {...stylex.props(styles.brand)}>
          <BrandLogo alt="" width={140} height={20} style={styles.brandLogo} />
        </Link>
        <h1 {...stylex.props(styles.title)}>Theme Studio</h1>
        <span {...stylex.props(styles.meta)}>Untitled theme</span>
        <span {...stylex.props(styles.save)}>Saved locally</span>
        <div {...stylex.props(styles.actions)}>
          <Button variant="outline" size="sm">
            Open
          </Button>
          <Button variant="outline" size="sm">
            Share
          </Button>
          <Button size="sm">
            Export theme
          </Button>
        </div>
      </header>
      <Separator />
      <div {...stylex.props(styles.body)}>
        <aside aria-label="Theme editor" {...stylex.props(styles.editor)}>
          <ThemeStudioShuffleBar
            canRedo={store.canRedo}
            canUndo={store.canUndo}
            fingerprint={store.fingerprint}
            onRedo={store.redo}
            onShuffle={() => store.shuffle('global')}
            onUndo={store.undo}
            onVariationChange={store.setVariation}
            variation={store.variation}
          />
          {store.exhaustion ? <ExhaustionNotice report={store.exhaustion} /> : null}
          <div {...stylex.props(styles.groups)}>
            <ThemeStudioEditor
              commit={store.commit}
              draft={draft}
              group={group}
              onGroupChange={setGroup}
              onShuffleGroup={store.shuffle}
              update={store.update}
            />
          </div>
          <div {...stylex.props(styles.status)}>
            <Button
              nativeButton={false}
              render={<Link to="/tokens" />}
              size="sm"
              variant="ghost"
            >
              Token contrast · View report <ArrowUpRightIcon aria-hidden />
            </Button>
            <span {...stylex.props(styles.statusCopy)}>Editing both modes</span>
            <span {...stylex.props(styles.statusCopy)}>
              {overrides} overrides · {locked} locked group{locked === 1 ? '' : 's'}
            </span>
            <Button onClick={() => store.commit(() => stockDraft())} size="sm" variant="ghost">
              Reset theme
            </Button>
          </div>
        </aside>
        <ThemeStudioPreview mode={mode} onModeChange={setMode} tables={resolved} />
      </div>
    </div>
  );
}
