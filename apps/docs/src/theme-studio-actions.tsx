import { CheckIcon, CopyIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import {
  AUTOSAVE_KEY,
  decodeFragment,
  draftFingerprint,
  encodeFragment,
  gate,
  parseDraft,
  resolveDraft,
  restoreAutosave,
  saveAutosave,
  serializeDraft,
  stockDraft,
  toCss,
  toRegistryItem,
  toStylex,
  type FragmentEncodeResult,
  type StorageLike,
  type ThemeDraft,
} from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Alert, AlertDialog, Button, Checkbox, Code, Dialog, Input, Separator } from '@ultima/ui';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { readStored, removeStored, writeStored } from './storage';

const STORAGE: StorageLike = {
  getItem: readStored,
  setItem: (key, value) => writeStored(key, value),
  removeItem: removeStored,
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
  fallback: ThemeDraft | null;
};

const styles = stylex.create({
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
  acknowledge: {
    alignItems: 'center',
    display: 'flex',
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-3'],
  },
  heading: {
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-semibold'],
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
  shareUrl: {
    flexGrow: 1,
    minInlineSize: 0,
  },
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

function downloadDraft(draft: ThemeDraft): void {
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

export function useStudioDraft(): {
  draft: ThemeDraft;
  setDraft: Dispatch<SetStateAction<ThemeDraft>>;
  notice: string | null;
  dismissNotice: () => void;
  pending: PendingLoad | null;
  confirmPending: () => void;
  cancelPending: () => void;
  refusal: string | null;
  dismissRefusal: () => void;
  openFile: (file: File) => Promise<void>;
} {
  const [draft, setDraft] = useState(stockDraft);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingLoad | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const mounted = useRef(false);

  function offer(incoming: ThemeDraft, saved: ThemeDraft | null) {
    if (saved && draftFingerprint(saved) !== draftFingerprint(incoming)) {
      setPending({ draft: incoming, fallback: saved });
    } else {
      setDraft(incoming);
    }
  }

  function confirmPending() {
    if (pending) setDraft(pending.draft);
    setPending(null);
  }

  function cancelPending() {
    if (pending?.fallback) setDraft(pending.fallback);
    setPending(null);
  }

  useEffect(() => {
    let cancelled = false;
    const saved = restoreAutosave(STORAGE);
    if (saved.status === 'quarantined') {
      setNotice('The autosaved draft was corrupt; it was quarantined to a backup key.');
    }
    const restored = saved.status === 'restored' ? saved.draft : null;
    const hash = window.location.hash;
    if (!hash.startsWith(FRAGMENT_PREFIX)) {
      if (restored) setDraft(restored);
      return;
    }
    void decodeFragment(hash).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        offer(result.draft, restored);
      } else {
        setRefusal(result.message);
        if (restored) setDraft(restored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    saveAutosave(draft, STORAGE);
  }, [draft]);

  async function openFile(file: File) {
    const result = parseDraft(await file.text());
    if (!result.ok) {
      setRefusal(result.message);
      return;
    }
    offer(result.draft, storedDraft());
  }

  return {
    draft,
    setDraft,
    notice,
    dismissNotice: () => setNotice(null),
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
  const [dialog, setDialog] = useState<'export' | 'share' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button onClick={() => fileRef.current?.click()} size="sm" variant="outline">
        Open
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
      <Button onClick={() => setDialog('share')} size="sm" variant="outline">
        Share
      </Button>
      <Button onClick={() => setDialog('export')} size="sm">
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
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Viewport>
            <AlertDialog.Popup style={styles.popup}>
              <AlertDialog.Title>Replace the autosaved draft?</AlertDialog.Title>
              <AlertDialog.Description>
                A different draft is autosaved in this browser. Loading this draft replaces it as a
                single history entry.
              </AlertDialog.Description>
              <div {...stylex.props(styles.footer)}>
                <AlertDialog.Close render={<Button variant="ghost" />}>Cancel</AlertDialog.Close>
                <Button onClick={onConfirmPending}>Replace draft</Button>
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
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Viewport>
            <AlertDialog.Popup style={styles.popup}>
              <AlertDialog.Title>Draft refused</AlertDialog.Title>
              <AlertDialog.Description>{refusal}</AlertDialog.Description>
              <div {...stylex.props(styles.footer)}>
                <AlertDialog.Close render={<Button variant="ghost" />}>Close</AlertDialog.Close>
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
  const [acknowledged, setAcknowledged] = useState(false);
  const failures = gate(resolveDraft(draft)).filter((row) => !row.dark.pass || !row.light.pass);
  const gated = failures.length > 0 && !acknowledged;
  const faces = [
    ...new Set([...declaredFaces(draft.typography.sans), ...declaredFaces(draft.typography.mono)]),
  ];
  const downloads = [
    { name: 'ultima-theme.json', detail: 'Draft document', save: () => downloadDraft(draft) },
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
    {
      name: 'ultima-theme.registry.json',
      detail: 'Registry item',
      save: () => download('ultima-theme.registry.json', toRegistryItem(draft), 'application/json'),
    },
  ];

  return (
    <Dialog.Root
      onOpenChange={(next) => {
        if (!next) {
          setAcknowledged(false);
          onClose();
        }
      }}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Viewport>
          <Dialog.Popup style={styles.popup}>
            <div {...stylex.props(styles.stack)}>
              <div>
                <Dialog.Title>Export theme</Dialog.Title>
                <Dialog.Description>
                  Four downloads carry this draft into an existing Ultima application.
                </Dialog.Description>
              </div>
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
                  <label {...stylex.props(styles.acknowledge)}>
                    <Checkbox.Root
                      checked={acknowledged}
                      onCheckedChange={(next) => setAcknowledged(next === true)}
                    >
                      <Checkbox.Indicator />
                    </Checkbox.Root>
                    Export anyway: the artifacts still record the failed pairings.
                  </label>
                </>
              ) : null}
              <h3 {...stylex.props(styles.heading)}>Install</h3>
              <ol {...stylex.props(styles.steps)}>
                <li>
                  Download <Code>ultima-theme.registry.json</Code>.
                </li>
                <li>
                  Run <Code>npx shadcn add ./ultima-theme.registry.json</Code>.
                </li>
                <li>
                  Import <Code>ultima-theme.css</Code> after the application's StyleX output.
                </li>
                <li>
                  Set <Code>data-theme</Code> on the app root to <Code>dark</Code> or{' '}
                  <Code>light</Code>.
                </li>
              </ol>
              <p {...stylex.props(styles.note)}>
                Reinstalling regenerates and replaces the generated files. Keep{' '}
                <Code>ultima-theme.json</Code>: the draft is the editable source.
              </p>
              <h3 {...stylex.props(styles.heading)}>Downloads</h3>
              <ul {...stylex.props(styles.downloads)}>
                {downloads.map((item) => (
                  <li key={item.name} {...stylex.props(styles.download)}>
                    <Button
                      disabled={gated}
                      onClick={item.save}
                      size="sm"
                      variant="outline"
                    >
                      <DownloadSimpleIcon aria-hidden /> {item.name}
                    </Button>
                    <span {...stylex.props(styles.detail)}>{item.detail}</span>
                  </li>
                ))}
              </ul>
              <p {...stylex.props(styles.note)}>
                Declared font faces: {faces.length > 0 ? faces.join(', ') : 'none'}; loading them is
                the consumer's.
              </p>
              <Separator />
              <div {...stylex.props(styles.footer)}>
                <p {...stylex.props(styles.fingerprint)}>
                  Fingerprint <Code>{draftFingerprint(draft)}</Code>
                </p>
                <Dialog.Close render={<Button variant="ghost" />}>Close</Dialog.Close>
              </div>
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
  const [result, setResult] = useState<FragmentEncodeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const url = result
    ? `${window.location.origin}${window.location.pathname}${result.fragment}`
    : null;

  useEffect(() => {
    setResult(null);
    setCopied(false);
    if (!open) return;
    let live = true;
    void encodeFragment(draft).then((next) => {
      if (live) setResult(next);
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
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Viewport>
          <Dialog.Popup style={styles.popup}>
            <div {...stylex.props(styles.stack)}>
              <div>
                <Dialog.Title>Share theme</Dialog.Title>
                <Dialog.Description>
                  The link encodes this draft and reopens it.
                </Dialog.Description>
              </div>
              {result === null ? (
                <p {...stylex.props(styles.note)}>Encoding the draft…</p>
              ) : result.tooLong ? (
                <>
                  <p {...stylex.props(styles.note)}>
                    This draft is too large for a share link. Share the draft file instead.
                  </p>
                  <Button onClick={() => downloadDraft(draft)} size="sm" variant="outline">
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
                    style={styles.shareUrl}
                    value={url ?? ''}
                  />
                  <Button
                    onClick={() => {
                      if (url === null) return;
                      void navigator.clipboard
                        ?.writeText(url)
                        .then(() => setCopied(true))
                        .catch(() => {});
                    }}
                    size="sm"
                    variant="outline"
                  >
                    {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}{' '}
                    {copied ? 'Copied' : 'Copy link'}
                  </Button>
                </div>
              )}
              <div {...stylex.props(styles.footer)}>
                <Dialog.Close render={<Button variant="ghost" />}>Close</Dialog.Close>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
