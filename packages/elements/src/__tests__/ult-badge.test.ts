import { afterEach, beforeAll, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import tokensCss from '../../../tokens/dist/tokens.css?inline';
import ultimaBundle from '../../dist/ultima.js?raw';
import perElementBundle from '../../dist/ult-badge.js?raw';

const VARIANTS = ['subtle', 'solid'] as const;
const TONES = ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'] as const;

function inner(host: Element): HTMLSpanElement {
  const span = host.querySelector('span');
  if (!span) throw new Error('ult-badge rendered no inner span');
  return span;
}

function mount(attrs: Record<string, string> = {}, text = 'Status', parent: HTMLElement = document.body): HTMLElement {
  const host = document.createElement('ult-badge');
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
    script.src = new URL('../../dist/ult-badge.js', import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('dist/ult-badge.js failed to load'));
    document.head.appendChild(script);
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
});

for (const variant of VARIANTS) {
  for (const tone of TONES) {
    test(`${variant} / ${tone} mounts through the parser`, async () => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `<ult-badge variant="${variant}" tone="${tone}">${variant} ${tone}</ult-badge>`;
      document.body.appendChild(wrapper);
      await expect.element(inner(wrapper.querySelector('ult-badge') as Element)).toBeVisible();
    });
  }
}

test('omitted axes match subtle / neutral', () => {
  const implicit = inner(mount({}, 'Default'));
  const explicit = inner(mount({ variant: 'subtle', tone: 'neutral' }, 'Explicit'));
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('axes set after connection restyle the badge', () => {
  const host = mount();
  const badge = inner(host);
  const initial = badge.className;
  host.setAttribute('variant', 'solid');
  expect(badge.className).not.toBe(initial);
  const solid = badge.className;
  host.setAttribute('tone', 'danger');
  expect(badge.className).not.toBe(solid);
});

test('an unknown axis value falls back to the default', () => {
  const host = mount({ variant: 'nonsense' });
  const fallback = mount({ variant: 'subtle' });
  expect(inner(host).className).toBe(inner(fallback).className);
});

test('the badge is a span queryable by its text', async () => {
  const badge = inner(mount({}, 'Passing'));
  expect(badge.tagName).toBe('SPAN');
  await expect.element(page.getByText('Passing')).toBeVisible();
});

test('tabbing past a badge focuses nothing inside it', async () => {
  const host = mount({}, 'Static');
  const badge = inner(host);
  await userEvent.tab();
  expect(badge.contains(document.activeElement)).toBe(false);
  expect(document.activeElement).not.toBe(badge);
  expect(getComputedStyle(badge).outlineStyle).toBe('none');
});

test('the badge carries no state: no data attributes, and hover changes nothing', async () => {
  const badge = inner(mount({}, 'Static'));
  expect(badge.getAttributeNames().filter((name) => name.startsWith('data-'))).toEqual([]);
  const before = getComputedStyle(badge).backgroundColor;
  await userEvent.hover(badge);
  expect(getComputedStyle(badge).backgroundColor).toBe(before);
});

test('no primitive machine is wired: no Zag scope or part markers render', () => {
  const host = mount();
  expect(host.querySelector('[data-scope], [data-part]')).toBeNull();
});

test('disconnect and reconnect keep the element live', () => {
  const host = mount();
  const connected = inner(host).className;
  host.remove();
  host.setAttribute('tone', 'success');
  document.body.appendChild(host);
  expect(inner(host).className).not.toBe(connected);
});

test('part= marks the inner styling target', () => {
  const host = mount();
  expect(inner(host).getAttribute('part')).toBe('root');
});

test('a consumer [part] selector reaches the inner target', () => {
  const probe = document.createElement('style');
  probe.textContent = 'ult-badge [part="root"] { text-decoration: underline; }';
  document.head.appendChild(probe);
  const host = mount();
  expect(getComputedStyle(inner(host)).textDecorationLine).toContain('underline');
  probe.remove();
});

test('data-theme re-themes through the tokens stylesheet', async () => {
  const host = mount({ variant: 'solid', tone: 'accent' });
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
  const host = mount({ variant: 'solid', tone: 'accent' }, 'Overridden', wrapper);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const before = getComputedStyle(inner(host)).backgroundColor;
  wrapper.style.setProperty('--ult-color-accent', 'rgb(1, 2, 3)');
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
    expect(bundle).toContain("customElements.define('ult-badge'");
  }
});
