import { docsStyles } from '../docs-style';
import { StudioPortalContext } from '../theme-studio-context';
import { XIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import {
  gate,
  resolveDraft,
  SHUFFLE_ATTEMPT_LIMIT,
  resetDraft,
  type ShuffleExhaustion,
} from '@ultima/tokens';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Alert, Button, Dialog, Separator } from '@ultima/ui';
import { useEffect, useMemo, useRef, useState } from 'react';

import { breakpoints } from '../breakpoints.stylex';
import { downloadDraft, StudioActions, useStudioDraft } from '../theme-studio-actions';
import { draftSummary, GROUPS, groupLabel } from '../theme-studio-draft';
import { CompleteThemePicker, ThemeStudioEditor } from '../theme-studio-editor';
import { ThemeStudioPreview } from '../theme-studio-preview';
import { ThemeStudioShuffleBar } from '../theme-studio-shuffle';
import { ThemeStudioValidation } from '../theme-studio-validation';
import { TokenRows, type ModeOffenders } from '../theme-studio-token-row';

const MODES = ['dark', 'light', 'compare'] as const;
const RAIL_QUERY = '(min-width: 52.5rem)';

type Group = (typeof GROUPS)[number]['label'];
type Mode = (typeof MODES)[number];

const styles = stylex.create({
  touch: { minBlockSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null }, minInlineSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null } },
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
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-8'],
  },
  title: {
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  save: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-1'],
    marginInlineStart: 'auto',
  },
  actions: { display: 'flex', gap: space['--ult-space-4'] },
  body: {
    display: 'flex',
    flexDirection: 'row',
    flexGrow: 1,
    minBlockSize: 0,
    minInlineSize: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  editor: {
    borderInlineEndColor: color['--ult-color-border'],
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: { default: 0, [breakpoints.RAIL]: border.hairline },
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: { default: 1, [breakpoints.RAIL]: 0 },
    gap: space['--ult-space-8'],
    inlineSize: { default: '100%', [breakpoints.RAIL]: '20rem' },
    minBlockSize: 0,
    overflow: 'hidden',
    paddingBlockStart: space['--ult-space-8'],
    paddingBlockEnd: 0,
    paddingInline: space['--ult-space-6'],
    flexGrow: { default: 1, [breakpoints.RAIL]: 0 },
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
    flexDirection: 'row',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    borderBlockStartColor: color['--ult-color-border'],
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: border.hairline,
    marginBlockStart: 'auto',
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-6'],
  },
  statusCopy: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-1'] },
  announce: {
    clipPath: 'inset(50%)',
    height: '1px',
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
  notice: { flexShrink: 0 },
  footerInfo: { display: { default: 'none', [breakpoints.RAIL]: 'inline' } },
  edit: { marginInlineStart: 'auto', minBlockSize: space['--ult-space-11'] },
  drawerViewport: { padding: 0, placeItems: 'end stretch' },
  drawer: { blockSize: 'min(44rem, calc(100dvh - 5rem))', display: 'flex', flexDirection: 'column', inlineSize: '100%', maxInlineSize: '100%', minBlockSize: 0, overflow: 'hidden', padding: 0 },
  dialogHeader: { alignItems: 'center', display: 'flex', gap: space['--ult-space-5'], justifyContent: 'space-between', padding: space['--ult-space-6'], flexShrink: 0 },
  close: { minBlockSize: space['--ult-space-11'], minInlineSize: space['--ult-space-11'] },
  report: { inlineSize: '100%', maxInlineSize: '48rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 },
  reportBody: { overflow: 'auto', padding: space['--ult-space-6'], minBlockSize: 0 },
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
  const [wide, setWide] = useState(() => window.matchMedia(RAIL_QUERY).matches);
  const [editorOpen, setEditorOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [repair, setRepair] = useState<{ token: string; serial: number } | null>(null);
  const reportTrigger = useRef<HTMLButtonElement>(null);
  const shell = useRef<HTMLElement>(null);
  useEffect(() => {
    const query = window.matchMedia(RAIL_QUERY);
    const update = () => { setWide(query.matches); if (query.matches) setEditorOpen(false); };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
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
  const failing = pairings.reduce((count, row) => count + Number(!row.dark.pass) + Number(!row.light.pass), 0);

  const offenders = useMemo<ModeOffenders>(() => {
    const dark = new Set<string>();
    const light = new Set<string>();
    for (const result of pairings) for (const mode of ['dark', 'light'] as const) {
      if (!result[mode].pass) { (mode === 'dark' ? dark : light).add(result.foreground); (mode === 'dark' ? dark : light).add(result.background); }
    }
    return { dark, light };
  }, [pairings]);
  const status = (
    <div {...stylex.props(styles.status)}>
      <Button ref={reportTrigger} onClick={() => setReportOpen(true)} size="sm" variant="ghost" style={[docsStyles.square, styles.touch]}>
        {failing ? `${failing} token checks failing` : `${pairings.length * 2} / ${pairings.length * 2} checks pass`} · View draft report
      </Button>
      <span {...stylex.props(styles.statusCopy, styles.footerInfo)}>Editing both modes · {draftSummary(draft)}</span>
      {wide || editorOpen ? <Button onClick={() => store.commit((current) => resetDraft(current))} size="sm" variant="ghost" style={[docsStyles.square, styles.touch]}>Reset theme</Button> : null}
    </div>
  );

  const editor = (
    <aside aria-label="Theme editor" {...stylex.props(styles.editor)}>
      <CompleteThemePicker commit={store.commit} draft={draft} />
      {notice !== null ? <Alert.Root tone="warning"><Alert.Title>Autosave notice</Alert.Title><Alert.Description>{notice}</Alert.Description><Button onClick={dismissNotice} size="sm" variant="ghost">Dismiss</Button></Alert.Root> : null}
      <ThemeStudioShuffleBar canRedo={store.canRedo} canUndo={store.canUndo} fingerprint={store.fingerprint} onRedo={store.redo} onShuffle={() => store.shuffle('global')} onUndo={store.undo} onVariationChange={store.setVariation} variation={store.variation} />
      {store.exhaustion ? <ExhaustionNotice report={store.exhaustion} /> : null}
      <div {...stylex.props(styles.groups)}><ThemeStudioEditor commit={store.commit} draft={draft} group={group} onGroupChange={setGroup} onShuffleGroup={store.shuffle} resolved={resolved} results={pairings} update={store.update} /></div>
    </aside>
  );

  return (
    <main ref={shell} {...stylex.props(styles.shell)}>
      <StudioPortalContext value={shell}>
      <div {...stylex.props(styles.subBar)}>
        <h1 {...stylex.props(styles.title)}>Theme Studio</h1>
        <span aria-live="polite" {...stylex.props(styles.save)}>
          {store.saveStatus === 'saved' ? 'Saved on this device' : store.saveStatus === 'loading' ? 'Restoring draft…' : 'Not saved on this device'}
        </span>
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
      {store.saveStatus === 'unavailable' ? (
        <Alert.Root tone="warning" style={styles.notice}>
          <Alert.Title>Local save unavailable</Alert.Title>
          <Alert.Description>Your changes stay in this tab. Download the draft before leaving.</Alert.Description>
          <Button onClick={() => downloadDraft(draft)} size="sm" variant="outline">Download draft</Button>
        </Alert.Root>
      ) : null}
      <div {...stylex.props(styles.body)}>
        {wide ? editor : null}
        <ThemeStudioPreview mode={mode} onModeChange={setMode} tables={resolved} />
      </div>
      {wide ? status : (
        <Dialog.Root open={editorOpen} onOpenChange={setEditorOpen}>
          <div {...stylex.props(styles.status)}>
            <Button ref={reportTrigger} onClick={() => setReportOpen(true)} size="sm" variant="ghost" style={styles.touch}>{failing ? `${failing} checks failing` : 'Token checks pass'}</Button>
            <Dialog.Trigger render={<Button style={styles.edit} />}>Edit theme</Dialog.Trigger>
          </div>
          <Dialog.Portal container={shell}><Dialog.Backdrop forceRender /><Dialog.Viewport style={styles.drawerViewport}><Dialog.Popup style={styles.drawer}>
            <div {...stylex.props(styles.dialogHeader)}><Dialog.Title>Edit theme</Dialog.Title><Dialog.Close render={<Button aria-label="Close editor" variant="ghost" style={styles.close} />}><XIcon aria-hidden /></Dialog.Close></div>
            <Dialog.Description style={styles.announce}>Generate and customize your theme. Every edit updates both preview modes.</Dialog.Description>
            {editor}{status}
          </Dialog.Popup></Dialog.Viewport></Dialog.Portal>
        </Dialog.Root>
      )}
      <Dialog.Root open={reportOpen} onOpenChange={setReportOpen}>
        <Dialog.Portal container={shell}><Dialog.Backdrop forceRender /><Dialog.Viewport><Dialog.Popup style={styles.report} finalFocus={reportTrigger}>
          <div {...stylex.props(styles.dialogHeader)}><Dialog.Title>This draft's token checks</Dialog.Title><Dialog.Close render={<Button aria-label="Close draft report" variant="ghost" style={styles.close} />}><XIcon aria-hidden /></Dialog.Close></div>
          <Dialog.Description style={styles.reportBody}>Declared token pairings in both modes. Check your rendered components too.</Dialog.Description>
          <div {...stylex.props(styles.reportBody)}>
            {repair ? <section aria-label="Repair token"><h2>Edit {repair.token.replace('--ult-color-', '')}</h2><TokenRows draft={draft} group="color" offenders={offenders} resolved={resolved} setDraft={(action) => store.commit(typeof action === 'function' ? action : () => action)} onlyToken={repair.token} focusToken={repair.token} focusRequest={repair.serial} /><Separator /></section> : null}
            <ThemeStudioValidation results={pairings} expanded onEdit={(token) => setRepair((current) => ({ token, serial: (current?.serial ?? 0) + 1 }))} />
          </div>
        </Dialog.Popup></Dialog.Viewport></Dialog.Portal>
      </Dialog.Root>
      <span role="status" aria-label="Draft status" aria-atomic="true" {...stylex.props(styles.announce)}>{store.announcement}</span>
      </StudioPortalContext>
    </main>
  );
}
