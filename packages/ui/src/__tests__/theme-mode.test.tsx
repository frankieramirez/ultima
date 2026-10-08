import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ThemeModeScript, setThemeMode, themeModeScript, useThemeMode } from '../theme-mode';

afterEach(() => { vi.restoreAllMocks(); localStorage.removeItem('ultima-theme-mode'); localStorage.removeItem('custom-mode'); document.documentElement.removeAttribute('data-theme'); });


test('the script reads only explicit valid modes and removes stale attributes', () => {
  for (const mode of ['light', 'dark', 'system', 'unknown', null]) {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (mode === null) localStorage.removeItem('ultima-theme-mode');
    else localStorage.setItem('ultima-theme-mode', mode);
    new Function(themeModeScript())();
    expect(document.documentElement.getAttribute('data-theme')).toBe(mode === 'light' || mode === 'dark' ? mode : null);
  }
});

test('custom keys and HTML-sensitive keys are escaped and read without code injection', () => {
  const key = '</script>"\u2028\u2029';
  localStorage.setItem(key, 'light');
  expect(themeModeScript(key)).not.toContain('</script>');
  new Function(themeModeScript(key))();
  expect(document.documentElement.dataset.theme).toBe('light');
  localStorage.removeItem(key);
  const script = ThemeModeScript({ storageKey: 'custom-mode', nonce: 'nonce' });
  expect(script.props).toMatchObject({ nonce: 'nonce', dangerouslySetInnerHTML: { __html: themeModeScript('custom-mode') } });
});

test('the setter changes the document and hook, and system removes the attribute', async () => {
  function Probe() {
    const { mode, resolved, setMode } = useThemeMode('custom-mode');
    return <button onClick={() => setMode('light')}>{mode}:{resolved}</button>;
  }
  const screen = await render(<Probe />);
  await screen.getByRole('button').click();
  expect(localStorage.getItem('custom-mode')).toBe('light');
  await expect.element(screen.getByRole('button')).toHaveTextContent('light:light');
  setThemeMode('system', 'custom-mode');
  await expect.element(screen.getByRole('button')).toHaveTextContent(`system:${matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'}`);
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
});

test('storage events follow the selected key, including clear, but ignore session storage', async () => {
  function Probe() { const { mode } = useThemeMode('custom-mode'); return <output>{mode}</output>; }
  const screen = await render(<Probe />);
  window.dispatchEvent(new StorageEvent('storage', { key: 'custom-mode', newValue: 'light', storageArea: sessionStorage }));
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: 'dark' }));
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  window.dispatchEvent(new StorageEvent('storage', { key: 'custom-mode', newValue: 'light', storageArea: localStorage }));
  await expect.element(screen.getByRole('status')).toHaveTextContent('light');
  window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null, storageArea: localStorage }));
  await expect.element(screen.getByRole('status')).toHaveTextContent('system');
});

test('throwing reads fall back to system and throwing writes still notify mounted hooks', async () => {
  document.documentElement.dataset.theme = 'dark';
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  new Function(themeModeScript())();
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  function Probe() { const { mode, resolved } = useThemeMode(); return <output>{mode}:{resolved}</output>; }
  const screen = await render(<Probe />);
  let applied: string | undefined;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    applied = document.documentElement.dataset.theme;
    throw new Error('blocked');
  });
  setThemeMode('light');
  expect(applied).toBe('light');
  await expect.element(screen.getByRole('status')).toHaveTextContent('light:light');
});

test('the hook follows direct data-theme changes on the document', async () => {
  function Probe() { const { mode, resolved } = useThemeMode(); return <output>{mode}:{resolved}</output>; }
  const screen = await render(<Probe />);
  document.documentElement.setAttribute('data-theme', 'light');
  await expect.element(screen.getByRole('status')).toHaveTextContent('light:light');
  document.documentElement.setAttribute('data-theme', 'dark');
  await expect.element(screen.getByRole('status')).toHaveTextContent('dark:dark');
  document.documentElement.removeAttribute('data-theme');
  await expect.element(screen.getByRole('status')).toHaveTextContent(`system:${matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'}`);
});

test('system follows media changes while explicit modes stay pinned and subscriptions clean up', async () => {
  const media = new EventTarget() as MediaQueryList;
  let light = false;
  Object.defineProperty(media, 'matches', { get: () => light });
  vi.spyOn(window, 'matchMedia').mockReturnValue(media);
  const add = vi.spyOn(media, 'addEventListener');
  const remove = vi.spyOn(media, 'removeEventListener');
  function Probe() { const { mode, resolved } = useThemeMode(); return <output>{mode}:{resolved}</output>; }
  const screen = await render(<Probe />);
  await expect.element(screen.getByRole('status')).toHaveTextContent('system:dark');
  light = true;
  media.dispatchEvent(new Event('change'));
  await expect.element(screen.getByRole('status')).toHaveTextContent('system:light');
  setThemeMode('dark');
  media.dispatchEvent(new Event('change'));
  await expect.element(screen.getByRole('status')).toHaveTextContent('dark:dark');
  await screen.unmount();
  expect(remove.mock.calls.length).toBe(add.mock.calls.length);
});
