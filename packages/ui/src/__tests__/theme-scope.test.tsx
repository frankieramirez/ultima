/// <reference types="vite/client" />

import * as stylex from '@stylexjs/stylex';
import { darkTheme, lightTheme } from '@ultima/tokens';
import { color, font, motion } from '@ultima/tokens/tokens.stylex';
import { Dialog } from '@ultima/ui/dialog';
import { Select } from '@ultima/ui/select';
import { setThemeMode } from '@ultima/ui/theme-mode';
import { ThemeScope, useThemeScopeContainer } from '@ultima/ui/theme-scope';
import plexMono from '../../../../apps/docs/public/fonts/IBMPlexMono-Regular.woff2?url';
import type { ReactNode } from 'react';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { cdp } from 'vitest/browser';
import { render } from 'vitest-browser-react';

const partialColor = stylex.createTheme(color, { '--ult-color-surface': '#010203' });
const slowMotion = stylex.createTheme(motion, {
  '--ult-motion-fast': { default: '500ms', '@media (prefers-reduced-motion: reduce)': '1ms' },
  '--ult-motion-base': { default: '600ms', '@media (prefers-reduced-motion: reduce)': '1ms' },
  '--ult-motion-slow': { default: '700ms', '@media (prefers-reduced-motion: reduce)': '1ms' },
  '--ult-motion-loop': { default: '2s', '@media (prefers-reduced-motion: reduce)': '0s' },
});
const plexFont = stylex.createTheme(font, { '--ult-font-sans': "'ScopeFace', sans-serif" });

const theme = { dark: [darkTheme, slowMotion, plexFont], light: [lightTheme, slowMotion, plexFont] };
const partial = { dark: [partialColor], light: [partialColor] };

const styles = stylex.create({
  light: { colorScheme: 'light' },
  sans: { fontFamily: font['--ult-font-sans'] },
  fallback: { fontFamily: 'sans-serif' },
});

const emulate = (features: { name: string; value: string }[]) => cdp().send('Emulation.setEmulatedMedia', { features });

const lightDocument = { name: 'prefers-color-scheme', value: 'light' };

beforeAll(() => emulate([lightDocument]));
afterAll(() => emulate([]));

const read = (element: Element, name = '--ult-color-surface') => getComputedStyle(element).getPropertyValue(name).trim();
const duration = (value: string) => parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
const scopes = () => [...document.querySelectorAll<HTMLElement>('[data-testid^="scope"]')];

function Popups({ contained = true }: { contained?: boolean }) {
  const container = useThemeScopeContainer();
  return (
    <>
      <Select.Root defaultOpen items={[{ value: 'a', label: 'Apple' }]}>
        <Select.Trigger aria-label="Fruit"><Select.Value /></Select.Trigger>
        <Select.Portal container={contained ? container : undefined}>
          <Select.Positioner>
            <Select.Popup data-testid="select">
              <Select.List>
                <Select.Item value="a"><Select.ItemText>Apple</Select.ItemText></Select.Item>
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <Dialog.Root defaultOpen modal={false}>
        <Dialog.Portal container={contained ? container : undefined}>
          <Dialog.Popup data-testid="dialog">
            <Dialog.Title>Archive</Dialog.Title>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function Scope({ children, mode = 'dark' }: { children: ReactNode; mode?: 'dark' | 'light' }) {
  return <ThemeScope data-testid="scope" theme={theme} mode={mode}>{children}</ThemeScope>;
}

test('the container is undefined outside every scope and the element inside one', async () => {
  const seen: (HTMLElement | null | undefined)[] = [];
  function Probe() {
    seen.push(useThemeScopeContainer());
    return null;
  }
  await render(<><Probe /><Scope><Probe /></Scope></>);
  await expect.poll(() => seen.at(-1)).toBe(scopes()[0]);
  expect(seen[0]).toBeUndefined();
  expect(seen).toContain(null);
});

test('a Select and a Dialog inside a scope mount in its element and read its values', async () => {
  const screen = await render(<Scope><Popups /></Scope>);
  const scope = scopes()[0]!;
  for (const id of ['select', 'dialog']) {
    const popup = screen.getByTestId(id);
    await expect.element(popup).toBeVisible();
    expect(scope.contains(popup.element())).toBe(true);
    expect(read(popup.element())).toBe(read(scope));
  }
  expect(read(scope)).not.toBe(read(document.documentElement));
  expect(getComputedStyle(scope).colorScheme).toBe('dark');
});

test('with the container omitted the popups mount under body and read the document theme', async () => {
  const screen = await render(<Scope><Popups contained={false} /></Scope>);
  const scope = scopes()[0]!;
  for (const id of ['select', 'dialog']) {
    const popup = screen.getByTestId(id);
    await expect.element(popup).toBeVisible();
    expect(scope.contains(popup.element())).toBe(false);
    expect(read(popup.element())).toBe(read(document.documentElement));
    expect(read(popup.element())).not.toBe(read(scope));
  }
});

test('an inner scope in the other mode overrides the outer one for content and popups', async () => {
  const screen = await render(
    <Scope>
      <Scope mode="light">
        <p data-testid="content">Inner</p>
        <Popups />
      </Scope>
    </Scope>,
  );
  const [outer, inner] = scopes();
  await expect.element(screen.getByTestId('dialog')).toBeVisible();
  expect(read(inner!)).not.toBe(read(outer!));
  expect(getComputedStyle(inner!).colorScheme).toBe('light');
  expect(read(screen.getByTestId('content').element())).toBe(read(inner!));
  for (const id of ['select', 'dialog']) {
    const popup = screen.getByTestId(id).element();
    expect(inner!.contains(popup)).toBe(true);
    expect(read(popup)).toBe(read(inner!));
  }
});

test("a partial theme's missing key falls back to the base default, never the outer scope", async () => {
  await render(
    <Scope>
      <ThemeScope data-testid="scope-partial" theme={partial} mode="dark">Partial</ThemeScope>
    </Scope>,
  );
  const [outer, inner] = scopes();
  expect(read(inner!)).toBe('#010203');
  expect(read(inner!, '--ult-color-text')).toBe(read(document.documentElement, '--ult-color-text'));
  expect(read(inner!, '--ult-color-text')).not.toBe(read(outer!, '--ult-color-text'));
});

test('without a mode the scope follows the document mode', async () => {
  await render(<ThemeScope data-testid="scope" theme={theme}>Follows</ThemeScope>);
  const scope = scopes()[0]!;
  try {
    setThemeMode('dark');
    await expect.poll(() => getComputedStyle(scope).colorScheme).toBe('dark');
    setThemeMode('light');
    await expect.poll(() => getComputedStyle(scope).colorScheme).toBe('light');
  } finally {
    setThemeMode('system');
    localStorage.removeItem('ultima-theme-mode');
  }
});

test('a style override wins over the theme', async () => {
  await render(<ThemeScope data-testid="scope" theme={theme} mode="dark" style={styles.light}>Styled</ThemeScope>);
  expect(getComputedStyle(scopes()[0]!).colorScheme).toBe('light');
});

test('reduced motion collapses durations inside a scope', async () => {
  await render(<Scope>Motion</Scope>);
  const scope = scopes()[0]!;
  expect(duration(read(scope, '--ult-motion-base'))).toBe(600);
  await emulate([lightDocument, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  try {
    expect(duration(read(scope, '--ult-motion-base'))).toBe(1);
    expect(duration(read(scope, '--ult-motion-loop'))).toBe(0);
  } finally {
    await emulate([lightDocument]);
  }
});

test("a loaded face named by the scope's stack renders", async () => {
  const face = await new FontFace('ScopeFace', `url(${plexMono})`).load();
  document.fonts.add(face);
  try {
    const screen = await render(
      <Scope>
        <span data-testid="scoped" {...stylex.props(styles.sans)}>iiiiiWWWWW</span>
        <span data-testid="fallback" {...stylex.props(styles.fallback)}>iiiiiWWWWW</span>
      </Scope>,
    );
    const width = (id: string) => screen.getByTestId(id).element().getBoundingClientRect().width;
    expect(getComputedStyle(screen.getByTestId('scoped').element()).fontFamily).toContain('ScopeFace');
    expect(width('scoped')).not.toBe(width('fallback'));
  } finally {
    document.fonts.delete(face);
  }
});
