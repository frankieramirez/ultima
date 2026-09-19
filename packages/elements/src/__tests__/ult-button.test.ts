import { afterEach, beforeAll, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import tokensCss from '../../../tokens/dist/tokens.css?inline';
import ultimaBundle from '../../dist/ultima.js?raw';
import perElementBundle from '../../dist/ult-button.js?raw';

const VARIANTS = ['solid', 'outline', 'ghost'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;
const TONES = ['accent', 'danger'] as const;

function inner(host: Element): HTMLButtonElement {
  const button = host.querySelector('button');
  if (!button) throw new Error('ult-button rendered no inner button');
  return button;
}

function mount(attrs: Record<string, string> = {}, text = 'Action', parent: HTMLElement = document.body): HTMLElement {
  const host = document.createElement('ult-button');
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
    script.src = new URL('../../dist/ult-button.js', import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('dist/ult-button.js failed to load'));
    document.head.appendChild(script);
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
});

for (const variant of VARIANTS) {
  for (const size of SIZES) {
    for (const tone of TONES) {
      test(`${variant} / ${size} / ${tone} mounts through the parser`, async () => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<ult-button variant="${variant}" size="${size}" tone="${tone}">Action</ult-button>`;
        document.body.appendChild(wrapper);
        await expect.element(inner(wrapper.querySelector('ult-button') as Element)).toBeVisible();
      });
    }
  }
}

test('omitted axes match solid / md / accent', () => {
  const implicit = inner(mount({}, 'Default'));
  const explicit = inner(mount({ variant: 'solid', size: 'md', tone: 'accent' }, 'Explicit'));
  expect(implicit.className).not.toBe('');
  expect(implicit.className).toBe(explicit.className);
});

test('axes set after connection restyle the button', () => {
  const host = mount();
  const button = inner(host);
  const initial = button.className;
  host.setAttribute('variant', 'outline');
  expect(button.className).not.toBe(initial);
  const outlined = button.className;
  host.setAttribute('size', 'lg');
  expect(button.className).not.toBe(outlined);
});

test('an unknown axis value falls back to the default', () => {
  const host = mount({ variant: 'nonsense' });
  const fallback = mount({ variant: 'solid' });
  expect(inner(host).className).toBe(inner(fallback).className);
});

test('the button is named by its text', async () => {
  mount({}, 'Save changes');
  await expect.element(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
});

test('keyboard focus draws the root outline', async () => {
  const host = mount({}, 'Focus me');
  const button = inner(host);
  await userEvent.tab();
  expect(document.activeElement).toBe(button);
  expect(parseFloat(getComputedStyle(button).outlineWidth)).toBeGreaterThan(0);
  expect(getComputedStyle(button).outlineStyle).toBe('solid');
});

test('disabled mirrors into data-disabled and dims the root', () => {
  const host = mount({ disabled: '' }, 'Disabled');
  const button = inner(host);
  expect(button.disabled).toBe(true);
  expect(button).toHaveAttribute('data-disabled');
  const disabledOpacity = parseFloat(getComputedStyle(button).opacity);
  expect(disabledOpacity).toBeLessThan(1);
  host.removeAttribute('disabled');
  expect(button.disabled).toBe(false);
  expect(button).not.toHaveAttribute('data-disabled');
  expect(parseFloat(getComputedStyle(button).opacity)).toBeGreaterThan(disabledOpacity);
  expect(getComputedStyle(button).cursor).toBe('pointer');
});

test('disconnect and reconnect keep the element live', () => {
  const host = mount();
  const connected = inner(host).className;
  host.remove();
  host.setAttribute('variant', 'outline');
  document.body.appendChild(host);
  expect(inner(host).className).not.toBe(connected);
});

test('part= marks the inner styling target', () => {
  const host = mount();
  expect(inner(host).getAttribute('part')).toBe('root');
});

test('a consumer [part] selector reaches the inner target', () => {
  const probe = document.createElement('style');
  probe.textContent = 'ult-button [part="root"] { text-decoration: underline; }';
  document.head.appendChild(probe);
  const host = mount();
  expect(getComputedStyle(inner(host)).textDecorationLine).toContain('underline');
  probe.remove();
});

test('data-theme re-themes through the tokens stylesheet', async () => {
  const host = mount({ variant: 'solid' });
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
  const host = mount({ variant: 'solid' }, 'Overridden', wrapper);
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
    expect(bundle).toContain("customElements.define('ult-button'");
  }
});
