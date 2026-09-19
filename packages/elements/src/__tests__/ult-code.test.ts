import { afterEach, beforeAll, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import tokensCss from '../../../tokens/dist/tokens.css?inline';
import ultimaBundle from '../../dist/ultima.js?raw';
import perElementBundle from '../../dist/ult-code.js?raw';

const VARIANTS = ['inline', 'block'] as const;

function inner(host: Element): HTMLElement {
  const el = host.querySelector('code, pre');
  if (!el) throw new Error('ult-code rendered no inner root');
  return el as HTMLElement;
}

function mount(attrs: Record<string, string> = {}, text = 'npm test', parent: HTMLElement = document.body): HTMLElement {
  const host = document.createElement('ult-code');
  for (const [name, value] of Object.entries(attrs)) host.setAttribute(name, value);
  host.textContent = text;
  parent.appendChild(host);
  return host;
}

beforeAll(async () => {
  const tokens = document.createElement('style');
  tokens.textContent = tokensCss;
  document.head.appendChild(tokens);
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../../dist/ult-code.js', import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('dist/ult-code.js failed to load'));
    document.head.appendChild(script);
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
});

for (const variant of VARIANTS) {
  test(`${variant} mounts through the parser`, async () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<ult-code variant="${variant}">npm test</ult-code>`;
    document.body.appendChild(wrapper);
    await expect.element(inner(wrapper.querySelector('ult-code') as Element)).toBeVisible();
  });
}

test('omitted variant is inline, a bare code element', () => {
  const host = mount({}, 'implicit');
  const code = inner(host);
  const explicit = inner(mount({ variant: 'inline' }, 'explicit'));
  expect(code.tagName).toBe('CODE');
  expect(code.parentElement?.tagName).not.toBe('PRE');
  expect(code.className).not.toBe('');
  expect(code.className).toBe(explicit.className);
});

test('the block variant is a pre whose child is code', () => {
  const host = mount({ variant: 'block' }, 'block text');
  const pre = inner(host);
  expect(pre.tagName).toBe('PRE');
  expect(pre.children).toHaveLength(1);
  expect(pre.firstElementChild?.tagName).toBe('CODE');
  expect(pre.firstElementChild?.textContent).toBe('block text');
});

test('variant set after connection restructures the element', () => {
  const host = mount({}, 'npm test');
  expect(inner(host).tagName).toBe('CODE');
  host.setAttribute('variant', 'block');
  const pre = inner(host);
  expect(pre.tagName).toBe('PRE');
  expect(pre.firstElementChild?.tagName).toBe('CODE');
  expect(pre.firstElementChild?.textContent).toBe('npm test');
  host.setAttribute('variant', 'inline');
  const code = inner(host);
  expect(code.tagName).toBe('CODE');
  expect(code.parentElement).toBe(host);
  expect(code.textContent).toBe('npm test');
});

test('an unknown axis value falls back to inline', () => {
  const host = mount({ variant: 'nonsense' });
  const fallback = mount({ variant: 'inline' });
  expect(inner(host).tagName).toBe('CODE');
  expect(inner(host).className).toBe(inner(fallback).className);
});

test('the block variant wraps long lines instead of scrolling', () => {
  const host = mount({ variant: 'block' }, 'x'.repeat(400));
  const pre = inner(host);
  expect(getComputedStyle(pre).whiteSpace).toBe('pre-wrap');
  expect(pre.scrollWidth).toBe(pre.clientWidth);
  expect(pre).not.toHaveAttribute('tabindex');
});

test('the code is queryable by its text', async () => {
  mount({}, 'npm run build');
  await expect.element(page.getByText('npm run build')).toBeVisible();
});

test('tabbing through either variant focuses nothing inside it', async () => {
  const host = mount({}, 'inline');
  const block = mount({ variant: 'block' }, 'block');
  await userEvent.tab();
  for (const el of [...host.querySelectorAll('*'), ...block.querySelectorAll('*')]) {
    expect(el.contains(document.activeElement)).toBe(false);
    expect(getComputedStyle(el).outlineStyle).toBe('none');
  }
});

test('the code carries no state and wires no primitive machine', () => {
  const host = mount({ variant: 'block' });
  for (const el of host.querySelectorAll('*')) {
    expect(el.getAttributeNames().filter((name) => name.startsWith('data-'))).toEqual([]);
  }
  expect(host.querySelector('[data-scope], [data-part]')).toBeNull();
});

test('disconnect and reconnect keep the element live', () => {
  const host = mount({ variant: 'block' }, 'persisted');
  const connected = inner(host).className;
  host.remove();
  document.body.appendChild(host);
  const pre = inner(host);
  expect(pre.tagName).toBe('PRE');
  expect(pre.className).toBe(connected);
  expect(pre.textContent).toBe('persisted');
});

test('part= marks the inner styling target in both variants', () => {
  expect(inner(mount({})).getAttribute('part')).toBe('root');
  expect(inner(mount({ variant: 'block' })).getAttribute('part')).toBe('root');
});

test('a consumer [part] selector reaches the inner target', () => {
  const probe = document.createElement('style');
  probe.textContent = 'ult-code [part="root"] { text-decoration: underline; }';
  document.head.appendChild(probe);
  const host = mount();
  expect(getComputedStyle(inner(host)).textDecorationLine).toContain('underline');
  probe.remove();
});

test('data-theme re-themes through the tokens stylesheet', async () => {
  const host = mount();
  document.documentElement.setAttribute('data-theme', 'dark');
  await new Promise((resolve) => setTimeout(resolve, 200));
  const dark = getComputedStyle(inner(host)).backgroundColor;
  document.documentElement.setAttribute('data-theme', 'light');
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(getComputedStyle(inner(host)).backgroundColor).not.toBe(dark);
});

test('a consumer --ult-* override reaches the part', async () => {
  const wrapper = document.createElement('div');
  document.body.appendChild(wrapper);
  const host = mount({}, 'overridden', wrapper);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const before = getComputedStyle(inner(host)).backgroundColor;
  wrapper.style.setProperty('--ult-color-surface-sunken', 'rgb(1, 2, 3)');
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(getComputedStyle(inner(host)).backgroundColor).not.toBe(before);
});

test('the bundle injects its stylesheet into the document', () => {
  expect(document.head.querySelector('style[data-ultima-elements]')).not.toBeNull();
});

test('the emitted bundles carry no runtime stylex or external imports', () => {
  for (const bundle of [perElementBundle, ultimaBundle]) {
    expect(bundle).not.toMatch(/^import |^export |stylex\.(create|attrs|props)/m);
    expect(bundle).toContain('data-ultima-elements');
    expect(bundle).toMatch(/customElements\.define\(["']ult-code["']/);
  }
});
