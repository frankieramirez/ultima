import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import {
  AUTOSAVE_BACKUP_KEY,
  AUTOSAVE_KEY,
  decodeFragment,
  draftFingerprint,
  encodeFragment,
  parseDraft,
  presetDraft,
  resolveDraft,
  serializeDraft,
  stockDraft,
  toRegistryItem,
  type ThemeDraft,
} from '@ultima/tokens';
import { beforeEach, expect, onTestFinished, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { routeTree } from '../router';
import '../styles.css';

async function mount(path = '/theme-studio') {
  const history = createMemoryHistory({ initialEntries: [path] });
  const screen = await render(<RouterProvider router={createRouter({ routeTree, history })} />);
  await userEvent.click(screen.getByRole('button', { name: 'Edit Density', exact: true }));
  return screen;
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', window.location.pathname);
});

function draftWith(overrides: { dark: Record<string, string>; light: Record<string, string> }): ThemeDraft {
  const draft = stockDraft();
  draft.overrides = { dark: { ...overrides.dark }, light: { ...overrides.light } };
  return draft;
}

function failingDraft(): ThemeDraft {
  const tables = resolveDraft(stockDraft());
  return draftWith({
    dark: { '--ult-color-text': tables.dark['--ult-color-surface']! },
    light: { '--ult-color-text': tables.light['--ult-color-surface']! },
  });
}

async function uploadDraft(screen: { container: HTMLElement }, draft: ThemeDraft | string, confirm = true) {
  const input = screen.container.ownerDocument.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).not.toBeNull();
  const content = typeof draft === 'string' ? draft : serializeDraft(draft);
  const saved = parseDraft(localStorage.getItem(AUTOSAVE_KEY) ?? '');
  const incoming = parseDraft(content);
  await userEvent.upload(input!, new File([content], 'ultima-theme.json', { type: 'application/json' }));
  if (confirm && saved.ok && incoming.ok && draftFingerprint(saved.draft) !== draftFingerprint(incoming.draft)) await userEvent.click(page.getByRole('button', { name: 'Replace draft', exact: true }));
}

test('installation uses highlighted code and exact framework imports', async () => {
  const screen = await mount();
  await userEvent.click(screen.getByRole('button', { name: 'Export theme', exact: true }));
  const dialog = screen.getByRole('dialog', { name: 'Export theme' });
  await expect.element(dialog.getByRole('button', { name: 'Copy install command', exact: true })).toBeVisible();
  const imports = () => Array.from(dialog.element().querySelectorAll('pre')).find((code) => code.textContent?.includes('import '))!;
  expect(imports().textContent).toContain("import '../ultima-theme.css';");
  expect(imports().querySelectorAll('span').length).toBeGreaterThan(0);
  expect(imports().getBoundingClientRect().height).toBeGreaterThan(60);
  expect(getComputedStyle(imports()).fontSize).toBe('14px');
  await userEvent.click(dialog.getByRole('group', { name: 'Installation framework' }).getByRole('button', { name: 'Next src/app', exact: true }));
  expect(imports().textContent).toContain("import '../../ultima-theme.css';");
  await expect.element(dialog.getByText(/remove data-theme from html/i)).toBeVisible();
  await userEvent.click(dialog.getByRole('button', { name: 'Check your application', exact: true }));
  expect(dialog.element().textContent).toContain('npx ultima-design doctor');
  expect(dialog.element().querySelectorAll('pre').length).toBe(3);
});

test('export separates installation from files and font details', async () => {
  const screen = await mount();
  await userEvent.click(screen.getByRole('button', { name: /Export/ }));
  const dialog = screen.getByRole('dialog');
  await expect.element(dialog.getByRole('heading', { name: 'Export theme' })).toBeVisible();
  await expect.element(dialog.getByRole('button', { name: 'Copy install command', exact: true })).toBeVisible();
  expect(dialog.element().textContent).toContain('npx shadcn@latest add');
  expect(dialog.element().textContent).toContain('/r/theme.json?theme=');
  await expect.element(dialog.getByText(/after the application.*StyleX output/i)).toBeVisible();
  await expect.element(dialog.getByText(/data-theme/)).toBeVisible();
  expect(dialog.element().textContent).not.toContain('Declared font faces');
  await userEvent.click(dialog.getByRole('tab', { name: 'Files & fonts', exact: true }));
  for (const name of ['ultima-theme.json', 'ultima-theme.css', 'ultima-theme.stylex.ts']) {
    await expect.element(dialog.getByRole('button', { name: new RegExp(name.replaceAll('.', '\\.')) })).toBeVisible();
  }
  await expect.element(dialog.getByText(/reinstall/i)).toBeVisible();
  await expect.element(dialog.getByText(/editable source/i)).toBeVisible();
  await expect.element(dialog.getByText(/^Declared font faces:.*Figtree/)).toBeVisible();
  await expect.element(dialog.getByText(`Sans stack: ${presetDraft('neutral').typography.sans}`, { exact: true })).toBeVisible();
  await expect.element(dialog.getByText(`Mono stack: ${presetDraft('neutral').typography.mono}`, { exact: true })).toBeVisible();
  await expect.element(dialog.getByText(/consumer/i)).toBeVisible();
  await expect.element(dialog.getByText(new RegExp(draftFingerprint(presetDraft('neutral'))))).toBeVisible();
});

function spyOnDownloads() {
  const blobs: Blob[] = [];
  const names: string[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return `blob:mock-${blobs.length}`;
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.download);
  });
  return {
    async take(name: string) {
      const index = names.indexOf(name);
      expect(index).toBeGreaterThanOrEqual(0);
      return blobs[index]!.text();
    },
  };
}

test('the copied install URL serves the complete edited draft, including overrides and locks', async () => {
  const writeText = vi.fn(async (_text: string) => {});
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
  const draft = presetDraft('neutral');
  draft.typography.sans = 'Roboto, sans-serif';
  draft.locks.typography = true;
  draft.overrides.light['--ult-color-surface'] = '#ffffff';
  const screen = await mount();
  await uploadDraft(screen, draft);
  await userEvent.click(screen.getByRole('button', { name: 'Export theme', exact: true }));
  const dialog = screen.getByRole('dialog', { name: 'Export theme' });
  const copy = dialog.getByRole('button', { name: 'Copy install command', exact: true });
  await expect.element(copy).toBeVisible();
  await userEvent.click(copy);
  await expect.poll(() => writeText.mock.calls.length).toBe(1);
  const command = writeText.mock.calls[0]![0];
  const url = new URL(/^npx shadcn@latest add "(.+)"$/.exec(command)![1]!);
  expect(url.origin).toBe(window.location.origin);
  expect(url.pathname).toBe('/r/theme.json');
  expect(url.hash).toBe('');
  const commandBlock = Array.from(dialog.element().querySelectorAll('pre')).find((element) => element.textContent === command)!;
  expect(commandBlock.scrollWidth).toBeGreaterThan(commandBlock.clientWidth);
  expect(commandBlock.getBoundingClientRect().height).toBeLessThan(100);
  expect(commandBlock).toHaveAttribute('tabindex', '0');
  const response = await fetch(url);
  expect(response.status).toBe(200);
  expect(await response.text()).toBe(toRegistryItem(draft));
});

test.each(['encoding unavailable', 'URL too long', 'decoded draft too large'])('%s offers a working registry download', async (reason) => {
  const draft = presetDraft('neutral');
  if (reason === 'encoding unavailable') {
    vi.stubGlobal('CompressionStream', class { constructor() { throw new Error('Unavailable'); } });
    onTestFinished(() => { vi.unstubAllGlobals(); });
  } else {
    draft.typography.sans = reason === 'decoded draft too large' ? 'a'.repeat(70_000) : Array.from({ length: 1200 }, (_, i) => Math.imul(i, 2654435761).toString(36)).join('');
  }
  const downloads = spyOnDownloads();
  const screen = await mount();
  await uploadDraft(screen, draft);
  await userEvent.click(screen.getByRole('button', { name: 'Export theme', exact: true }));
  const dialog = screen.getByRole('dialog', { name: 'Export theme' });
  const download = dialog.getByRole('button', { name: 'Download registry file', exact: true });
  await expect.element(download).toBeVisible();
  expect(dialog.element().textContent).toContain('npx shadcn add ./ultima-theme.registry.json');
  await userEvent.click(download);
  expect(await downloads.take('ultima-theme.registry.json')).toBe(toRegistryItem(draft));
});

test('a failed share encoder offers the exact draft file instead of staying busy', async () => {
  vi.stubGlobal('CompressionStream', class { constructor() { throw new Error('Unavailable'); } });
  onTestFinished(() => { vi.unstubAllGlobals(); });
  const downloads = spyOnDownloads();
  const screen = await mount();
  await userEvent.click(screen.getByRole('button', { name: 'Share', exact: true }));
  const dialog = screen.getByRole('dialog', { name: 'Share theme' });
  await expect.element(dialog.getByText('A share link could not be created. Share the draft file instead.')).toBeVisible();
  await userEvent.click(dialog.getByRole('button', { name: 'ultima-theme.json', exact: true }));
  expect(await downloads.take('ultima-theme.json')).toBe(serializeDraft(presetDraft('neutral')));
});

test('each download produces a valid artifact', async () => {
  const downloads = spyOnDownloads();
  const screen = await mount();
  await userEvent.click(screen.getByRole('button', { name: /Export/ }));
  const dialog = screen.getByRole('dialog');

  await userEvent.click(dialog.getByRole('tab', { name: 'Files & fonts', exact: true }));
  await userEvent.click(dialog.getByRole('button', { name: /ultima-theme\.json/ }));
  const draftText = await downloads.take('ultima-theme.json');
  const parsed = parseDraft(draftText);
  expect(parsed.ok).toBe(true);

  await userEvent.click(dialog.getByRole('button', { name: /ultima-theme\.css/ }));
  const css = await downloads.take('ultima-theme.css');
  expect(css).toContain('[data-theme="dark"]');
  expect(css).toContain('[data-theme="light"]');
  expect(css).toContain('prefers-reduced-motion');

  await userEvent.click(dialog.getByRole('button', { name: /ultima-theme\.stylex\.ts/ }));
  const stylex = await downloads.take('ultima-theme.stylex.ts');
  expect(stylex).toContain('createTheme');
  expect(stylex).toContain('ultimaTheme');

  await userEvent.click(dialog.getByRole('button', { name: 'ultima-theme.registry.json', exact: true }));
  const registry = JSON.parse(await downloads.take('ultima-theme.registry.json')) as {
    type: string;
    files: { target: string }[];
  };
  expect(registry.type).toBe('registry:item');
  expect(registry.files.map((file) => file.target)).toEqual([
    '~/ultima-theme.css',
    '~/ultima-theme.json',
  ]);
});

test('an invalid draft lists failing pairings and gates URL installs and downloads on acknowledgment', async () => {
  const downloads = spyOnDownloads();
  const screen = await mount();
  await uploadDraft(screen, failingDraft());

  await userEvent.click(screen.getByRole('button', { name: /Export/ }));
  const dialog = screen.getByRole('dialog');
  await expect.element(dialog.getByRole('heading', { name: /token-contrast pairings/i })).toBeVisible();
  await expect.element(dialog.getByText(/--ult-color-text on --ult-color-surface:/)).toBeVisible();
  expect(dialog.getByRole('button', { name: 'Copy install command', exact: true }).element()).toBeDisabled();
  expect(dialog.element().textContent).not.toContain('/r/theme.json?theme=');
  await userEvent.click(dialog.getByRole('checkbox', { name: /Export anyway/ }));
  await expect.element(dialog.getByRole('button', { name: 'Copy install command', exact: true })).toBeEnabled();
  expect(dialog.element().textContent).toContain('/r/theme.json?theme=');
  await userEvent.click(dialog.getByRole('checkbox', { name: /Export anyway/ }));

  await userEvent.click(dialog.getByRole('tab', { name: 'Files & fonts', exact: true }));
  const download = dialog.getByRole('button', { name: /ultima-theme\.json/ });
  expect(download.element()).toBeDisabled();

  await userEvent.click(dialog.getByRole('checkbox', { name: /Export anyway/ }));
  expect(download.element()).not.toBeDisabled();

  await userEvent.click(download);
  const text = await downloads.take('ultima-theme.json');
  expect(parseDraft(text).ok).toBe(true);

  await userEvent.click(dialog.getByRole('button', { name: /ultima-theme\.css/ }));
  const css = await downloads.take('ultima-theme.css');
  expect(css).toContain('failed token-contrast pairings');
});

test('the share dialog announces encoding and copy in a pre-mounted status region', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: () => Promise.resolve() },
  });

  const screen = await mount();
  await userEvent.click(screen.getByRole('button', { name: 'Share' }));
  const dialog = screen.getByRole('dialog');

  const status = dialog.getByRole('status', { name: 'Share status' });
  expect(status.element()).toHaveAttribute('aria-atomic', 'true');
  await expect.poll(() => status.element().textContent).toBe('Draft encoded');

  const copyStatus = () =>
    dialog
      .getByRole('textbox', { name: 'Share URL' })
      .element()
      .parentElement!.querySelector('[role="status"]')!;

  await userEvent.click(dialog.getByRole('button', { name: 'Copy link' }));
  await expect.poll(() => copyStatus().textContent).toBe('Copied');

  await userEvent.click(dialog.getByRole('button', { name: 'Copied' }));
  await expect.poll(() => copyStatus().textContent).toBe('Copied\u2060');
});

test('share produces a fragment link that reopens the draft', async () => {
  const screen = await mount();
  await userEvent.click(
    screen.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Compact' }),
  );

  await userEvent.click(screen.getByRole('button', { name: 'Share' }));
  const field = screen.getByRole('textbox', { name: 'Share URL' });
  await expect.element(field).toBeVisible();
  const url = (field.element() as HTMLInputElement).value;
  expect(url).toContain('#theme=');
  const decoded = await decodeFragment(url.slice(url.indexOf('#theme=')));
  expect(decoded.ok).toBe(true);
  if (decoded.ok) expect(decoded.draft.density).toBe(0.75);
});

test('the share dialog announces busy while the link encodes', async () => {
  vi.spyOn(globalThis, 'CompressionStream').mockImplementation(function pendingEncode() {
    return new TransformStream({ transform: () => new Promise<void>(() => {}) });
  });
  onTestFinished(() => {
    vi.restoreAllMocks();
  });
  const screen = await mount();
  await userEvent.click(screen.getByRole('button', { name: 'Share' }));
  const dialog = screen.getByRole('dialog');

  const note = dialog.getByText('Encoding the draft…');
  await expect.element(note).toBeVisible();
  const busy = note.element().closest('[aria-busy="true"]');
  expect(busy).not.toBeNull();
  expect(busy!.querySelector('[aria-hidden="true"]')).not.toBeNull();

  vi.restoreAllMocks();
  await userEvent.click(dialog.getByRole('button', { name: 'Close' }));
  await userEvent.click(screen.getByRole('button', { name: 'Share' }));
  await expect.element(screen.getByRole('textbox', { name: 'Share URL' })).toBeVisible();
});

test('an oversize draft offers the draft file instead of a link', async () => {
  const downloads = spyOnDownloads();
  const draft = stockDraft();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  draft.typography.sans = Array.from(
    { length: 4000 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');

  const screen = await mount();
  await uploadDraft(screen, draft);
  await userEvent.click(screen.getByRole('button', { name: 'Share' }));

  const dialog = screen.getByRole('dialog');
  await expect.element(dialog.getByText(/Share the draft file instead/i)).toBeVisible();
  await expect.element(dialog.getByRole('textbox', { name: 'Share URL' })).not.toBeInTheDocument();
  await expect
    .poll(() => dialog.getByRole('status', { name: 'Share status' }).element().textContent)
    .toBe('Draft too large for a share link');

  await userEvent.click(dialog.getByRole('button', { name: /ultima-theme\.json/ }));
  const text = await downloads.take('ultima-theme.json');
  const parsed = parseDraft(text);
  expect(parsed.ok && parsed.draft.typography.sans === draft.typography.sans).toBe(true);
});

test('a share fragment loads its draft on open', async () => {
  const draft = stockDraft();
  draft.density = 0.75;
  const { fragment } = await encodeFragment(draft);
  window.location.hash = fragment;

  const screen = await mount();
  const pane = screen.getByRole('region', { name: 'Dark preview' });
  await expect.element(pane).toBeVisible();
  await vi.waitFor(() => {
    expect(
      getComputedStyle(pane.element()).getPropertyValue('--ult-space-1').trim(),
    ).toBe('0.09375rem');
  });
  await expect.element(screen.getByText(new RegExp(draftFingerprint(draft)))).toBeVisible();
});

test('the draft autosaves on change and restores across sessions', async () => {
  const first = await mount();
  await userEvent.click(
    first.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Compact' }),
  );
  const saved = localStorage.getItem(AUTOSAVE_KEY);
  expect(saved && parseDraft(saved).ok).toBe(true);

  await first.unmount();
  const second = await mount();
  const pane = second.container.querySelector<HTMLElement>('[aria-label="Dark preview"]');
  expect(pane).not.toBeNull();
  await vi.waitFor(() => {
    expect(getComputedStyle(pane!).getPropertyValue('--ult-space-1').trim()).toBe('0.09375rem');
  });
  const density = second.container.querySelector('[aria-label="Density preset"]');
  const compact = [...(density?.querySelectorAll('button') ?? [])].find(
    (button) => button.textContent === 'Compact',
  );
  expect(compact).toHaveAttribute('aria-pressed', 'true');
});

test('unavailable storage is visible and offers a recoverable draft download', async () => {
  const downloads = spyOnDownloads();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  onTestFinished(() => { vi.restoreAllMocks(); });
  const screen = await mount();
  await userEvent.click(screen.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Roomy' }));
  await expect.element(screen.getByText('Local save unavailable', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('Saved on this device', { exact: true })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Download draft', exact: true }));
  const parsed = parseDraft(await downloads.take('ultima-theme.json'));
  expect(parsed.ok && parsed.draft.density).toBe(1.25);
});

test('a corrupt autosave is quarantined with a notice', async () => {
  localStorage.setItem(AUTOSAVE_KEY, '{not a draft');
  const screen = await mount();

  const alert = screen.getByText('Autosave notice').element().parentElement!;
  expect(alert.textContent).toMatch(/quarantined/i);
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  await expect.poll(() => document.querySelector('[role="status"][aria-label="Draft status"]')?.textContent).toMatch(
    /quarantined/i,
  );
  expect(localStorage.getItem(AUTOSAVE_BACKUP_KEY)).toBe('{not a draft');
  expect(parseDraft(localStorage.getItem(AUTOSAVE_KEY)!).ok).toBe(true);

  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  await expect.poll(() => editor.textContent).not.toMatch(/quarantined/i);
});

test('a malformed or unknown-version upload is refused with the reason named', async () => {
  const screen = await mount();

  await uploadDraft(screen, '{ nope');
  let dialog = screen.getByRole('alertdialog');
  await expect.element(dialog.getByText(/not valid JSON/i)).toBeVisible();
  await userEvent.click(dialog.getByRole('button', { name: 'Close' }));

  await uploadDraft(screen, '{"version": 99}');
  dialog = screen.getByRole('alertdialog');
  await expect.element(dialog.getByText(/version 99 is not supported/i)).toBeVisible();
  await userEvent.click(dialog.getByRole('button', { name: 'Close' }));

  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  expect(getComputedStyle(pane).getPropertyValue('--ult-space-1').trim()).toBe('0.125rem');
});

test('loading a draft warns first when a differing autosave exists', async () => {
  localStorage.setItem(AUTOSAVE_KEY, serializeDraft(stockDraft()));
  const screen = await mount();
  const incoming = stockDraft();
  incoming.density = 0.75;

  await uploadDraft(screen, incoming, false);
  const confirm = screen.getByRole('alertdialog');
  await expect.element(confirm.getByText(/Replace the autosaved draft/i)).toBeVisible();

  await userEvent.click(confirm.getByRole('button', { name: 'Cancel' }));
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  expect(getComputedStyle(pane).getPropertyValue('--ult-space-1').trim()).toBe('0.125rem');

  await uploadDraft(screen, incoming, false);
  await userEvent.click(screen.getByRole('button', { name: 'Replace draft' }));
  await vi.waitFor(() => {
    expect(getComputedStyle(pane).getPropertyValue('--ult-space-1').trim()).toBe('0.09375rem');
  });
});

test('cancelling an import keeps the existing undo history', async () => {
  const screen = await mount();
  await userEvent.click(screen.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Roomy', exact: true }));
  await uploadDraft(screen, presetDraft('cinder'), false);
  await userEvent.click(screen.getByRole('alertdialog').getByRole('button', { name: 'Cancel', exact: true }));
  await expect.element(screen.getByRole('button', { name: 'Undo', exact: true })).not.toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Undo', exact: true }));
  expect(getComputedStyle(screen.getByRole('region', { name: 'Dark preview' }).element()).getPropertyValue('--ult-space-1').trim()).toBe('0.125rem');
});

test('export follows the site light mode', async () => {
  localStorage.setItem('ultima-theme', 'light');
  const screen = await mount();
  await userEvent.click(screen.getByRole('button', { name: 'Export theme', exact: true }));
  const dialog = screen.getByRole('dialog', { name: 'Export theme' }).element();
  expect(dialog.closest('main')).not.toBeNull();
  expect(getComputedStyle(dialog).colorScheme).toBe('light');
  expect(dialog.getBoundingClientRect().height).toBeLessThanOrEqual(window.innerHeight - 64);
  expect(getComputedStyle(dialog.querySelector('p')!).fontSize).toBe('16px');
});

test('an upload matching the autosave loads without a warning', async () => {
  localStorage.setItem(AUTOSAVE_KEY, serializeDraft(stockDraft()));
  const screen = await mount();

  await uploadDraft(screen, stockDraft());
  await expect.element(screen.getByText(/Replace the autosaved draft/i)).not.toBeInTheDocument();
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  expect(getComputedStyle(pane).getPropertyValue('--ult-space-1').trim()).toBe('0.125rem');
});
