import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import {
  colorScheme,
  darkTheme,
  gate,
  resolveDraft,
  SHUFFLE_ATTEMPT_LIMIT,
  stockDraft,
  type ShuffleExhaustion,
} from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Alert, Button, Separator } from '@ultima/ui';
import { useMemo, useState } from 'react';

import { breakpoints } from '../breakpoints.stylex';
import { StudioActions, useStudioDraft } from '../theme-studio-actions';
import { draftSummary, GROUPS, groupLabel } from '../theme-studio-draft';
import { ThemeStudioEditor } from '../theme-studio-editor';
import { ThemeStudioPreview } from '../theme-studio-preview';
import { ThemeStudioShuffleBar } from '../theme-studio-shuffle';

const MODES = ['dark', 'light', 'compare'] as const;

type Group = (typeof GROUPS)[number]['label'];
type Mode = (typeof MODES)[number];

const styles = stylex.create({
  shell: {
    backgroundColor: color['--ult-color-surface'],
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    fontFamily: font['--ult-font-sans'],
    minBlockSize: 0,
  },
  subBar: {
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
  title: {
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
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
    flexDirection: { default: 'column', [breakpoints.RAIL]: 'row' },
    flexGrow: 1,
    minBlockSize: 0,
    minInlineSize: 0,
  },
  editor: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: { default: 1, [breakpoints.RAIL]: 0 },
    gap: space['--ult-space-6'],
    inlineSize: { default: '100%', [breakpoints.RAIL]: '18.75rem' },
    minBlockSize: { default: '27rem', [breakpoints.RAIL]: 0 },
    order: { default: 1, [breakpoints.RAIL]: 0 },
    overflow: { default: 'auto', [breakpoints.RAIL]: 'visible' },
    padding: space['--ult-space-8'],
  },
  groups: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minBlockSize: { default: '9rem', [breakpoints.RAIL]: 0 },
    minInlineSize: 0,
    overflow: 'auto',
  },
  status: {
    alignItems: { default: 'flex-start', [breakpoints.RAIL]: 'center' },
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.RAIL]: 'row' },
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
  announce: {
    clipPath: 'inset(50%)',
    height: '1px',
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
  notice: {
    flexShrink: 0,
  },
});

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
  const {
    draft,
    notice,
    dismissNotice,
    pending,
    confirmPending,
    cancelPending,
    refusal,
    dismissRefusal,
    openFile,
  } = store;
  const resolved = useMemo(() => resolveDraft(draft), [draft]);
  const pairings = useMemo(() => gate(resolved), [resolved]);

  return (
    <main {...stylex.props(darkTheme, colorScheme.dark, styles.shell)}>
      <div {...stylex.props(styles.subBar)}>
        <h1 {...stylex.props(styles.title)}>Theme Studio</h1>
        <span {...stylex.props(styles.save)}>Saved locally</span>
        <div {...stylex.props(styles.actions)}>
          <StudioActions
            draft={draft}
            onCancelPending={cancelPending}
            onConfirmPending={confirmPending}
            onDismissRefusal={dismissRefusal}
            onOpenFile={openFile}
            pending={pending}
            refusal={refusal}
          />
        </div>
      </div>
      <Separator />
      <div {...stylex.props(styles.body)}>
        <aside aria-label="Theme editor" {...stylex.props(styles.editor)}>
          {notice !== null ? (
            <Alert.Root tone="warning">
              <Alert.Title>Autosave notice</Alert.Title>
              <Alert.Description>{notice}</Alert.Description>
              <Button onClick={dismissNotice} size="sm" variant="ghost">
                Dismiss
              </Button>
            </Alert.Root>
          ) : null}
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
              resolved={resolved}
              results={pairings}
              update={store.update}
            />
          </div>
          <div {...stylex.props(styles.status)}>
            <span role="status" aria-atomic="true" {...stylex.props(styles.announce)}>
              {store.announcement}
            </span>
            <Button
              nativeButton={false}
              render={<Link to="/tokens" />}
              size="sm"
              variant="ghost"
            >
              Token contrast · View report <ArrowUpRightIcon aria-hidden />
            </Button>
            <span {...stylex.props(styles.statusCopy)}>Editing both modes</span>
            <span {...stylex.props(styles.statusCopy)}>{draftSummary(draft)}</span>
            <Button onClick={() => store.commit(() => stockDraft())} size="sm" variant="ghost">
              Reset theme
            </Button>
          </div>
        </aside>
        <ThemeStudioPreview mode={mode} onModeChange={setMode} tables={resolved} />
      </div>
    </main>
  );
}
