import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import {
  AUTOSAVE_BACKUP_KEY,
  AUTOSAVE_KEY,
  decodeFragment,
  draftFingerprint,
  encodeFragment,
  parseDraft,
  resolveDraft,
  serializeDraft,
  stockDraft,
  type ThemeDraft,
} from '@ultima/tokens';
import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { routeTree } from '../router';
import '../styles.css';

function mount(path = '/theme-studio') {
  const history = createMemoryHistory({ initialEntries: [path] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
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

async function uploadDraft(screen: { container: HTMLElement }, draft: ThemeDraft | string) {
  const input = screen.container.ownerDocument.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).not.toBeNull();
  const content = typeof draft === 'string' ? draft : serializeDraft(draft);
  await userEvent.upload(input!, new File([content], 'ultima-theme.json', { type: 'application/json' }));
}

test('the export dialog lists four downloads, the install flow, font faces, and the fingerprint', async () => {
  const screen = await mount();

  await userEvent.click(screen.getByRole('button', { name: /Export/ }));
  const dialog = screen.getByRole('dialog');
  await expect.element(dialog.getByRole('heading', { name: 'Export theme' })).toBeVisible();

  for (const name of [
    'ultima-theme.json',
    'ultima-theme.css',
    'ultima-theme.stylex.ts',
    'ultima-theme.registry.json',
  ]) {
    await expect.element(dialog.getByRole('button', { name: new RegExp(name.replaceAll('.', '\\.')) })).toBeVisible();
  }

  await expect.element(dialog.getByText(/npx shadcn add \.\/ultima-theme\.registry\.json/)).toBeVisible();
  await expect.element(dialog.getByText(/after the application.*StyleX output/i)).toBeVisible();
  await expect.element(dialog.getByText(/data-theme/)).toBeVisible();
  await expect.element(dialog.getByText(/reinstall/i)).toBeVisible();
  await expect.element(dialog.getByText(/editable source/i)).toBeVisible();
  await expect.element(dialog.getByText(/IBM Plex Sans/)).toBeVisible();
  await expect.element(dialog.getByText(/IBM Plex Mono/)).toBeVisible();
  await expect.element(dialog.getByText(/consumer/i)).toBeVisible();
  await expect.element(dialog.getByText(new RegExp(draftFingerprint(stockDraft())))).toBeVisible();
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

test('each download produces a valid artifact', async () => {
  const downloads = spyOnDownloads();
  const screen = await mount();
  await userEvent.click(screen.getByRole('button', { name: /Export/ }));
  const dialog = screen.getByRole('dialog');

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

  await userEvent.click(dialog.getByRole('button', { name: /ultima-theme\.registry\.json/ }));
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

test('an invalid draft lists failing pairings and gates downloads on acknowledgment', async () => {
  const downloads = spyOnDownloads();
  const screen = await mount();
  await uploadDraft(screen, failingDraft());

  await userEvent.click(screen.getByRole('button', { name: /Export/ }));
  const dialog = screen.getByRole('dialog');
  await expect.element(dialog.getByRole('heading', { name: /token-contrast pairings/i })).toBeVisible();
  await expect.element(dialog.getByText(/--ult-color-text on --ult-color-surface:/)).toBeVisible();

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

  const status = () => dialog.element().querySelector('[role="status"]')!;
  expect(status()).not.toBeNull();
  expect(status()).toHaveAttribute('aria-atomic', 'true');
  await expect.poll(() => status().textContent).toBe('Draft encoded');

  await userEvent.click(dialog.getByRole('button', { name: 'Copy link' }));
  await expect.poll(() => status().textContent).toBe('Link copied');

  await userEvent.click(dialog.getByRole('button', { name: 'Copied' }));
  await expect.poll(() => status().textContent).toBe('Link copied\u2060');
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
    .poll(() => dialog.element().querySelector('[role="status"]')?.textContent)
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

test('a corrupt autosave is quarantined with a notice', async () => {
  localStorage.setItem(AUTOSAVE_KEY, '{not a draft');
  const screen = await mount();

  const alert = screen.getByText('Autosave notice').element().parentElement!;
  expect(alert.textContent).toMatch(/quarantined/i);
  const editor = screen.getByRole('complementary', { name: 'Theme editor' }).element();
  await expect.poll(() => editor.querySelector('[role="status"]')?.textContent).toMatch(
    /quarantined/i,
  );
  expect(localStorage.getItem(AUTOSAVE_BACKUP_KEY)).toBe('{not a draft');
  expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull();

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

  await uploadDraft(screen, incoming);
  const confirm = screen.getByRole('alertdialog');
  await expect.element(confirm.getByText(/Replace the autosaved draft/i)).toBeVisible();

  await userEvent.click(confirm.getByRole('button', { name: 'Cancel' }));
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  expect(getComputedStyle(pane).getPropertyValue('--ult-space-1').trim()).toBe('0.125rem');

  await uploadDraft(screen, incoming);
  await userEvent.click(screen.getByRole('button', { name: 'Replace draft' }));
  await vi.waitFor(() => {
    expect(getComputedStyle(pane).getPropertyValue('--ult-space-1').trim()).toBe('0.09375rem');
  });
});

test('an upload matching the autosave loads without a warning', async () => {
  localStorage.setItem(AUTOSAVE_KEY, serializeDraft(stockDraft()));
  const screen = await mount();

  await uploadDraft(screen, stockDraft());
  await expect.element(screen.getByText(/Replace the autosaved draft/i)).not.toBeInTheDocument();
  const pane = screen.getByRole('region', { name: 'Dark preview' }).element();
  expect(getComputedStyle(pane).getPropertyValue('--ult-space-1').trim()).toBe('0.125rem');
});
