import { docsStyles } from './docs-style';
import { StudioPortalContext } from './theme-studio-context';
import { breakpoints } from './breakpoints.stylex';
import { CheckIcon, CopyIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import {
  AUTOSAVE_KEY,
  decodeFragment,
  createRegistryUrl,
  draftFingerprint,
  encodeFragment,
  gate,
  parseDraft,
  presetLabel,
  isPresetEdited,
  resolveDraft,
  restoreAutosave,
  saveAutosave,
  serializeDraft,
  toCss,
  toDesignMd,
  toRegistryItem,
  toStylex,
  type FragmentEncodeResult,
  type StorageLike,
  type ThemeDraft,
} from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Accordion, Alert, AlertDialog, Button, Checkbox, Code, Dialog, Field, Input, Separator, Spinner, Tabs, ToggleGroup } from '@ultima/ui';
import { useContext, useEffect, useRef, useState } from 'react';

import { CopyButton } from './copy-button';
import { Fence } from './prose';
import { readStored } from './storage';
import { useStudioDraft as useStoreDraft } from './theme-studio-store';
import { headings } from './typography';

const STORAGE: StorageLike = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

const FRAGMENT_PREFIX = '#theme=';

const GENERIC_FAMILIES = new Set([
  '-apple-system',
  'blinkmacsystemfont',
  'cursive',
  'emoji',
  'fangsong',
  'fantasy',
  'math',
  'monospace',
  'sans-serif',
  'serif',
  'system-ui',
  'ui-monospace',
  'ui-rounded',
  'ui-sans-serif',
  'ui-serif',
]);

type PendingLoad = {
  draft: ThemeDraft;
};

const styles = stylex.create({
  action: { alignSelf: 'flex-start', maxInlineSize: '100%' },
  touch: { minBlockSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null }, minInlineSize: { default: space['--ult-space-11'], [breakpoints.RAIL]: null } },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
  },
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-3'],
    margin: 0,
    paddingInlineStart: space['--ult-space-7'],
  },
  downloads: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-3'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  download: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
    flexWrap: 'wrap',
  },
  detail: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
  },
  pairings: {
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    gap: space['--ult-space-2'],
    margin: 0,
    paddingInlineStart: space['--ult-space-7'],
  },
  heading: {
    margin: 0,
  },
  note: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    margin: 0,
  },
  footer: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
    justifyContent: 'flex-end',
  },
  fingerprint: {
    color: color['--ult-color-text-subtle'],
    flexGrow: 1,
    fontSize: text['--ult-text-2'],
    margin: 0,
  },
  share: {
    display: 'flex',
    gap: space['--ult-space-3'],
  },
  busy: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-3'],
  },
  shareUrl: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  status: {
    clipPath: 'inset(50%)',
    height: '1px',
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
  exportPopup: { inlineSize: '100%', maxInlineSize: '48rem', maxBlockSize: 'min(48rem, calc(100dvh - 4rem))', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' },
  exportHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space['--ult-space-5'], padding: space['--ult-space-6'], flexShrink: 0 },
  exportBody: { overflow: 'auto', minBlockSize: 0, padding: space['--ult-space-6'] },
  exportCopy: { fontSize: text['--ult-text-5'], lineHeight: font['--ult-font-leading-normal'], overflowWrap: 'anywhere' },
  exportPanel: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-8'], paddingBlockStart: space['--ult-space-6'] },
  exportTabs: { flexShrink: 0 },
  framework: { display: 'flex', flexWrap: 'wrap' },
  popup: {
    inlineSize: '100%',
    maxInlineSize: '30rem',
  },
});

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadDraft(draft: ThemeDraft): void {
  download('ultima-theme.json', serializeDraft(draft), 'application/json');
}

function declaredFaces(stack: string): string[] {
  return stack
    .split(',')
    .map((face) => face.trim().replace(/^['"]+|['"]+$/g, ''))
    .filter((face) => face !== '' && !GENERIC_FAMILIES.has(face.toLowerCase()));
}

function storedDraft(): ThemeDraft | null {
  const raw = readStored(AUTOSAVE_KEY);
  if (!raw) return null;
  const parsed = parseDraft(raw);
  return parsed.ok ? parsed.draft : null;
}

export function useStudioDraft(): ReturnType<typeof useStoreDraft> & {
  notice: string | null;
  dismissNotice: () => void;
  pending: PendingLoad | null;
  confirmPending: () => void;
  cancelPending: () => void;
  refusal: string | null;
  dismissRefusal: () => void;
  openFile: (file: File) => Promise<void>;
  saveStatus: 'saved' | 'unavailable' | 'loading';
} {
  const store = useStoreDraft();
  const { committedDraft } = store;
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingLoad | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unavailable' | 'loading'>('loading');

  const load = (next: ThemeDraft) => store.commit(() => next);

  function offer(incoming: ThemeDraft, saved: ThemeDraft | null) {
    if (saved && draftFingerprint(saved) !== draftFingerprint(incoming)) {
      setPending({ draft: incoming });
    } else {
      load(incoming);
    }
  }

  function confirmPending() {
    if (pending) load(pending.draft);
    setPending(null);
  }

  function cancelPending() {
    setPending(null);
  }

  useEffect(() => {
    let cancelled = false;
    let saved: ReturnType<typeof restoreAutosave>;
    try {
      saved = restoreAutosave(STORAGE);
    } catch {
      saved = { status: 'empty' };
      setSaveStatus('unavailable');
    }
    if (saved.status === 'quarantined') {
      const text = 'The autosaved draft was corrupt; it was quarantined to a backup key.';
      setNotice(text);
      store.announce(text);
    }
    const restored = saved.status === 'restored' ? saved.draft : null;
    if (restored) store.replace(restored);
    const hash = window.location.hash;
    if (!hash.startsWith(FRAGMENT_PREFIX)) {
      setReady(true);
      return;
    }
    void decodeFragment(hash).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        offer(result.draft, restored);
      } else {
        setRefusal(result.message);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || pending !== null) return;
    try {
      saveAutosave(committedDraft, STORAGE);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unavailable');
      store.announce('Local save unavailable. Download your draft to keep your changes.');
    }
  }, [committedDraft, ready, pending]);

  async function openFile(file: File) {
    let content: string;
    try { content = await file.text(); }
    catch { setRefusal('The draft file could not be read. Choose it again or open another JSON file.'); return; }
    const result = parseDraft(content);
    if (!result.ok) {
      setRefusal(result.message);
      return;
    }
    offer(result.draft, storedDraft());
  }

  return {
    ...store,
    saveStatus,
    notice,
    dismissNotice: () => {
      setNotice(null);
      store.announce('');
    },
    pending,
    confirmPending,
    cancelPending,
    refusal,
    dismissRefusal: () => setRefusal(null),
    openFile,
  };
}

export function StudioActions({
  draft,
  onOpenFile,
  pending,
  onConfirmPending,
  onCancelPending,
  refusal,
  onDismissRefusal,
}: {
  draft: ThemeDraft;
  onOpenFile: (file: File) => Promise<void>;
  pending: PendingLoad | null;
  onConfirmPending: () => void;
  onCancelPending: () => void;
  refusal: string | null;
  onDismissRefusal: () => void;
}) {
  const container = useContext(StudioPortalContext);
  const [dialog, setDialog] = useState<'export' | 'share' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button onClick={() => fileRef.current?.click()} size="sm" variant="outline" style={[docsStyles.square, styles.touch]}>
        Import
      </Button>
      <input
        accept=".json,application/json"
        aria-hidden="true"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void onOpenFile(file);
        }}
        ref={fileRef}
        tabIndex={-1}
        type="file"
      />
      <Button onClick={() => setDialog('share')} size="sm" variant="outline" style={[docsStyles.square, styles.touch]}>
        Share
      </Button>
      <Button onClick={() => setDialog('export')} size="sm" style={[docsStyles.square, styles.touch]}>
        Export theme
      </Button>
      <ExportDialog draft={draft} onClose={() => setDialog(null)} open={dialog === 'export'} />
      <ShareDialog draft={draft} onClose={() => setDialog(null)} open={dialog === 'share'} />
      <AlertDialog.Root
        onOpenChange={(open) => {
          if (!open) onCancelPending();
        }}
        open={pending !== null}
      >
        <AlertDialog.Portal container={container}>
          <AlertDialog.Backdrop forceRender />
          <AlertDialog.Viewport>
            <AlertDialog.Popup style={styles.popup}>
              <AlertDialog.Title>Replace the autosaved draft?</AlertDialog.Title>
              <AlertDialog.Description>
                A different draft is autosaved in this browser. Loading this draft replaces it as a
                single history entry.
              </AlertDialog.Description>
              <div {...stylex.props(styles.footer)}>
                <AlertDialog.Close render={<Button variant="ghost" style={[docsStyles.square, styles.touch]} />}>Cancel</AlertDialog.Close>
                <Button onClick={onConfirmPending} style={[docsStyles.square, styles.touch]}>Replace draft</Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <AlertDialog.Root
        onOpenChange={(open) => {
          if (!open) onDismissRefusal();
        }}
        open={refusal !== null}
      >
        <AlertDialog.Portal container={container}>
          <AlertDialog.Backdrop forceRender />
          <AlertDialog.Viewport>
            <AlertDialog.Popup style={styles.popup}>
              <AlertDialog.Title>Draft refused</AlertDialog.Title>
              <AlertDialog.Description>{refusal}</AlertDialog.Description>
              <div {...stylex.props(styles.footer)}>
                <AlertDialog.Close render={<Button variant="ghost" style={[docsStyles.square, styles.touch]} />}>Close</AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

function ExportDialog({
  draft,
  open,
  onClose,
}: {
  draft: ThemeDraft;
  open: boolean;
  onClose: () => void;
}) {
  const container = useContext(StudioPortalContext);
  const [acknowledgedDraft, setAcknowledgedDraft] = useState<string | null>(null);
  const fingerprint = draftFingerprint(draft);
  const acknowledgementKey = serializeDraft(draft);
  const acknowledged = acknowledgedDraft === acknowledgementKey;
  const [framework, setFramework] = useState('Vite');
  const importExample = framework === 'Vite' ? "// src/main.tsx\nimport './index.css';\nimport '../ultima-theme.css';" : framework === 'Next app' ? "// app/layout.tsx\nimport './ultima.css';\nimport '../ultima-theme.css';" : "// src/app/layout.tsx\nimport './ultima.css';\nimport '../../ultima-theme.css';";
  const failures = gate(resolveDraft(draft)).filter((row) => !row.dark.pass || !row.light.pass);
  const shippedFailure = failures.length > 0 && draft.preset != null && !isPresetEdited(draft);
  const gated = failures.length > 0 && (shippedFailure || !acknowledged);
  const [installUrl, setInstallUrl] = useState<{ draft: string; url: string | null; reason: 'too-long' | 'encoding-failed' | null } | null>(null);
  const currentInstall = installUrl?.draft === acknowledgementKey ? installUrl : null;
  const installCommand = !gated && currentInstall?.url ? `npx shadcn@latest add "${currentInstall.url}"` : null;
  useEffect(() => {
    if (!open || gated) return;
    let cancelled = false;
    void createRegistryUrl(draft, window.location.origin).then((result) => {
      if (!cancelled) setInstallUrl({ draft: acknowledgementKey, url: result.tooLong ? null : result.url, reason: result.tooLong ? 'too-long' : null });
    }).catch(() => {
      if (!cancelled) setInstallUrl({ draft: acknowledgementKey, url: null, reason: 'encoding-failed' });
    });
    return () => { cancelled = true; };
  }, [open, draft, gated, acknowledgementKey]);
  const faces = [
    ...new Set([...declaredFaces(draft.typography.sans), ...declaredFaces(draft.typography.mono)]),
  ];
  const registryDownload = () => download('ultima-theme.registry.json', toRegistryItem(draft), 'application/json');
  const downloads = [
    { name: 'ultima-theme.registry.json', detail: 'Registry item', save: registryDownload },
    { name: 'ultima-theme.json', detail: 'Draft document', save: () => downloadDraft(draft) },
    { name: 'DESIGN.md', detail: 'Design system for people and agents', save: () => download('DESIGN.md', toDesignMd(draft), 'text/markdown') },
    {
      name: 'ultima-theme.css',
      detail: 'Stylesheet',
      save: () => download('ultima-theme.css', toCss(draft), 'text/css'),
    },
    {
      name: 'ultima-theme.stylex.ts',
      detail: 'StyleX themes',
      save: () => download('ultima-theme.stylex.ts', toStylex(draft), 'text/plain'),
    },

  ];

  return (
    <Dialog.Root
      onOpenChange={(next) => {
        if (!next) {
          setAcknowledgedDraft(null);
          onClose();
        }
      }}
      open={open}
    >
      <Dialog.Portal container={container}>
        <Dialog.Backdrop forceRender />
        <Dialog.Viewport>
          <Dialog.Popup style={styles.exportPopup}>
            <div {...stylex.props(styles.exportHeader)}>
              <Dialog.Title style={styles.exportCopy}>Export theme</Dialog.Title>
              <Dialog.Close render={<Button variant="ghost" style={[docsStyles.square, styles.touch]} />}>Close</Dialog.Close>
            </div>
            <div {...stylex.props(styles.exportBody, styles.stack)}>
              <Dialog.Description style={styles.exportCopy}>Install {presetLabel(draft)}{isPresetEdited(draft) ? ' · Edited' : ''} in your application.</Dialog.Description>
              {failures.length === 0 ? <Alert.Root tone="success"><Alert.Title style={styles.exportCopy}>All {gate(resolveDraft(draft)).length * 2} token checks pass</Alert.Title></Alert.Root> : null}
              {failures.length > 0 ? (
                <>
                  <Alert.Root tone="warning">
                    <Alert.Title>Fails token-contrast pairings</Alert.Title>
                    <Alert.Description>
                      This draft fails {failures.length} pairing
                      {failures.length === 1 ? '' : 's'}. Exported artifacts record the failure.
                    </Alert.Description>
                  </Alert.Root>
                  <ul {...stylex.props(styles.pairings)}>
                    {failures.map((row) => (
                      <li key={`${row.foreground}-${row.background}`}>
                        {row.foreground} on {row.background}: dark {row.dark.ratio.toFixed(2)}:1,
                        light {row.light.ratio.toFixed(2)}:1 (needs {row.minimum}:1)
                      </li>
                    ))}
                  </ul>
                  {shippedFailure ? <p {...stylex.props(styles.note)}>This preset failed validation. Export is blocked; choose another preset or make a custom edit.</p> : <Field.Root name="acknowledge">
                    <Field.Item>
                      <Checkbox.Root
                        checked={acknowledged}
                        onCheckedChange={(next) => setAcknowledgedDraft(next === true ? acknowledgementKey : null)}
                      >
                        <Checkbox.Indicator />
                      </Checkbox.Root>
                      <Field.Label>
                        Export anyway: the artifacts still record the failed pairings.
                      </Field.Label>
                    </Field.Item>
                  </Field.Root>}
                </>
              ) : null}
              <Tabs.Root defaultValue="install">
                <Tabs.List aria-label="Export options" style={styles.exportTabs}>
                  <Tabs.Tab value="install" style={styles.exportCopy}>Install</Tabs.Tab>
                  <Tabs.Tab value="files" style={styles.exportCopy}>Files & fonts</Tabs.Tab>
                  <Tabs.Indicator />
                </Tabs.List>
                <Tabs.Panel value="install" style={styles.exportPanel}>
                  <section {...stylex.props(styles.stack)}>
                    <h3 {...stylex.props(headings.h3, styles.heading)}>1. Install the theme</h3>
                    {installCommand ? <>
                      <p {...stylex.props(styles.note, styles.exportCopy)}>Run this command in your project. It installs the stylesheet, editable draft, and DESIGN.md.</p>
                      <CopyButton ariaLabel="Copy install command" text={installCommand} variant="solid" style={[styles.touch, styles.action, styles.exportCopy]}>{(status) => status || 'Copy install command'}</CopyButton>
                      <Fence code={installCommand} lang="shell" wrap={false} />
                    </> : gated ? <Button disabled style={[docsStyles.square, styles.touch, styles.action]}>Copy install command</Button> : currentInstall?.reason ? <>
                      <p {...stylex.props(styles.note, styles.exportCopy)}>{currentInstall.reason === 'too-long' ? 'This theme is too large for an install URL.' : 'An install URL could not be created.'} Download the registry file, then run this command.</p>
                      <Button onClick={registryDownload} style={[docsStyles.square, styles.touch, styles.action]}><DownloadSimpleIcon aria-hidden /> Download registry file</Button>
                      <Fence code="npx shadcn add ./ultima-theme.registry.json" lang="shell" />
                    </> : <p role="status" {...stylex.props(styles.note, styles.exportCopy)}>Creating install command…</p>}
                  </section>
                  <section {...stylex.props(styles.stack)}>
                    <h3 {...stylex.props(headings.h3, styles.heading)}>2. Apply the stylesheet</h3>
                    <ToggleGroup.Root aria-label="Installation framework" value={[framework]} onValueChange={(next, details) => { if (next[0]) setFramework(next[0]); else details.cancel(); }} style={styles.framework}>
                      {['Vite', 'Next app', 'Next src/app'].map((name) => <ToggleGroup.Item key={name} value={name} style={[docsStyles.square, styles.touch, styles.exportCopy]}>{name}</ToggleGroup.Item>)}
                    </ToggleGroup.Root>
                    <Fence code={importExample} lang="tsx" />
                    <p {...stylex.props(styles.note, styles.exportCopy)}>Load the theme after the application's StyleX output.</p>
                    <p {...stylex.props(styles.note, styles.exportCopy)}>Set <Code>data-theme</Code> on html to <Code>dark</Code> or <Code>light</Code>. For System mode, remove data-theme from html.</p>
                  </section>
                  <Accordion.Root>
                    <Accordion.Item value="checks">
                      <Accordion.Header><Accordion.Trigger style={styles.exportCopy}>Check your application</Accordion.Trigger></Accordion.Header>
                      <Accordion.Panel>
                        <div {...stylex.props(styles.stack)}>
                          <Fence code={'npx ultima-design doctor\nnpx ultima-design check'} lang="shell" />
                          <p {...stylex.props(styles.note, styles.exportCopy)}>Verify a rendered control and an open popup in dark, light and system mode. Check keyboard focus and reduced motion. Token checks and command success alone do not prove browser parity.</p>
                        </div>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion.Root>
                  <p {...stylex.props(styles.note, styles.exportCopy)}><a href="/install#theme-adoption">Read the full adoption guide</a> for scoped themes and portal containers.</p>
                </Tabs.Panel>
                <Tabs.Panel value="files" style={styles.exportPanel}>
                  <section {...stylex.props(styles.stack)}>
                    <h3 {...stylex.props(headings.h3, styles.heading)}>Individual files</h3>
                    <ul {...stylex.props(styles.downloads)}>
                      {downloads.map((item) => (
                        <li key={item.name} {...stylex.props(styles.download)}>
                          <Button disabled={gated} onClick={item.save} variant="outline" style={[docsStyles.square, styles.touch]}><DownloadSimpleIcon aria-hidden /> {item.name}</Button>
                          <span {...stylex.props(styles.detail, styles.exportCopy)}>{item.detail}</span>
                        </li>
                      ))}
                    </ul>
                    <p {...stylex.props(styles.note, styles.exportCopy)}>Keep <Code>ultima-theme.json</Code>: the draft is the editable source. Reinstalling replaces the generated files, including <Code>DESIGN.md</Code>.</p>
                  </section>
                  <section {...stylex.props(styles.stack)}>
                    <h3 {...stylex.props(headings.h3, styles.heading)}>Fonts</h3>
                    <p {...stylex.props(styles.note, styles.exportCopy)}>Declared font faces: {faces.length > 0 ? faces.join(', ') : 'none'}. Loading them is the consumer's responsibility; the export includes stacks and fallbacks, but no font files.</p>
                    <p {...stylex.props(styles.note, styles.exportCopy)}>Sans stack: {draft.typography.sans}</p>
                    <p {...stylex.props(styles.note, styles.exportCopy)}>Mono stack: {draft.typography.mono}</p>
                    <p {...stylex.props(styles.note, styles.exportCopy)}>Provide the preferred faces with <Code>@font-face</Code> or your font loader.</p>
                  </section>
                  <p {...stylex.props(styles.fingerprint, styles.exportCopy)}>Fingerprint <Code>{fingerprint}</Code></p>
                </Tabs.Panel>
              </Tabs.Root>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ShareDialog({
  draft,
  open,
  onClose,
}: {
  draft: ThemeDraft;
  open: boolean;
  onClose: () => void;
}) {
  const container = useContext(StudioPortalContext);
  const [result, setResult] = useState<FragmentEncodeResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState('');
  const url = result
    ? `${window.location.origin}${window.location.pathname}${result.fragment}`
    : null;

  useEffect(() => {
    setResult(null);
    setFailed(false);
    setStatus('');
    if (!open) return;
    let live = true;
    void encodeFragment(draft).then((next) => {
      if (!live) return;
      setResult(next);
      setStatus(next.tooLong ? 'Draft too large for a share link' : 'Draft encoded');
    }).catch(() => {
      if (!live) return;
      setFailed(true);
      setStatus('Share link unavailable. Download the draft instead.');
    });
    return () => {
      live = false;
    };
  }, [open, draft]);

  return (
    <Dialog.Root
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      open={open}
    >
      <Dialog.Portal container={container}>
        <Dialog.Backdrop forceRender />
        <Dialog.Viewport>
          <Dialog.Popup style={styles.popup}>
            <div {...stylex.props(styles.stack)}>
              <div>
                <Dialog.Title>Share theme</Dialog.Title>
                <Dialog.Description>
                  The link encodes this draft and reopens it.
                </Dialog.Description>
              </div>
              {failed ? (
                <>
                  <p {...stylex.props(styles.note)}>A share link could not be created. Share the draft file instead.</p>
                  <Button onClick={() => downloadDraft(draft)} size="sm" variant="outline" style={[docsStyles.square, styles.touch]}>
                    <DownloadSimpleIcon aria-hidden /> ultima-theme.json
                  </Button>
                </>
              ) : result === null ? (
                <div aria-busy="true" {...stylex.props(styles.busy)}>
                  <Spinner />
                  <p {...stylex.props(styles.note)}>Encoding the draft…</p>
                </div>
              ) : result.tooLong ? (
                <>
                  <p {...stylex.props(styles.note)}>
                    This draft is too large for a share link. Share the draft file instead.
                  </p>
                  <Button onClick={() => downloadDraft(draft)} size="sm" variant="outline" style={[docsStyles.square, styles.touch]}>
                    <DownloadSimpleIcon aria-hidden /> ultima-theme.json
                  </Button>
                </>
              ) : (
                <div {...stylex.props(styles.share)}>
                  <Input
                    aria-label="Share URL"
                    onFocus={(event) => event.currentTarget.select()}
                    readOnly
                    size="sm"
                    style={[docsStyles.square, styles.shareUrl]}
                    value={url ?? ''}
                  />
                  <CopyButton text={url ?? ''} variant="outline" style={styles.touch}>
                    {(status) => (
                      <>
                        {status === 'Copied' ? (
                          <CheckIcon aria-hidden />
                        ) : (
                          <CopyIcon aria-hidden />
                        )}{' '}
                        {status || 'Copy link'}
                      </>
                    )}
                  </CopyButton>
                </div>
              )}
              <span
                aria-label="Share status"
                role="status"
                aria-atomic="true"
                {...stylex.props(styles.status)}
              >
                {status}
              </span>
              <div {...stylex.props(styles.footer)}>
                <Dialog.Close render={<Button variant="ghost" style={[docsStyles.square, styles.touch]} />}>Close</Dialog.Close>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
