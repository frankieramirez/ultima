import { afterEach, beforeAll, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import tokensCss from '../../../tokens/dist/tokens.css?inline';
import ultimaBundle from '../../dist/ultima.js?raw';
import perElementBundle from '../../dist/ult-stat.js?raw';

function mount(parent: HTMLElement = document.body): HTMLElement {
  const host = document.createElement('ult-stat');
  const label = document.createElement('ult-stat-label');
  label.textContent = 'Findings';
  const value = document.createElement('ult-stat-value');
  value.textContent = '42';
  host.append(label, value);
  parent.appendChild(host);
  return host;
}

function part(host: Element, name: string): HTMLElement {
  const el = host.querySelector(`[part="${name}"]`);
  if (!el) throw new Error(`ult-stat rendered no ${name} part`);
  return el as HTMLElement;
}

beforeAll(async () => {
  const tokens = document.createElement('style');
  tokens.textContent = tokensCss;
  document.head.appendChild(tokens);
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../../dist/ult-stat.js', import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('dist/ult-stat.js failed to load'));
    document.head.appendChild(script);
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
});

test('the stat family mounts through the parser', async () => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML =
    '<ult-stat><ult-stat-label>Findings</ult-stat-label><ult-stat-value>42</ult-stat-value></ult-stat>';
  document.body.appendChild(wrapper);
  const host = wrapper.querySelector('ult-stat') as Element;
  await expect.element(page.getByText('Findings')).toBeVisible();
  await expect.element(page.getByText('42')).toBeVisible();
  expect(part(host, 'root').tagName).toBe('DIV');
  expect(part(host, 'label').tagName).toBe('SPAN');
  expect(part(host, 'value').tagName).toBe('SPAN');
});

test('the stat family mounts through script', () => {
  const host = mount();
  expect(part(host, 'root').tagName).toBe('DIV');
  expect(part(host, 'label').tagName).toBe('SPAN');
  expect(part(host, 'value').tagName).toBe('SPAN');
});

test('the stat carries no axes: an attribute changes nothing', () => {
  const host = mount();
  const before = part(host, 'root').className;
  host.setAttribute('tone', 'danger');
  host.setAttribute('variant', 'solid');
  expect(before).not.toBe('');
  expect(part(host, 'root').className).toBe(before);
});

test('label and value are queryable by their text', async () => {
  mount();
  await expect.element(page.getByText('Findings')).toBeVisible();
  await expect.element(page.getByText('42')).toBeVisible();
});

test('tabbing through the stat focuses nothing inside it', async () => {
  const host = mount();
  await userEvent.tab();
  const root = part(host, 'root');
  expect(root.contains(document.activeElement)).toBe(false);
  for (const el of host.querySelectorAll('*')) {
    expect(getComputedStyle(el).outlineStyle).toBe('none');
  }
});

test('the stat carries no state and wires no primitive machine', () => {
  const host = mount();
  const rendered = host.querySelectorAll('*');
  for (const el of rendered) {
    expect(el.getAttributeNames().filter((name) => name.startsWith('data-'))).toEqual([]);
  }
  expect(host.querySelector('[data-scope], [data-part]')).toBeNull();
});

test('disconnect and reconnect keep the elements live', () => {
  const host = mount();
  const connected = part(host, 'value').className;
  host.remove();
  document.body.appendChild(host);
  expect(part(host, 'value').className).toBe(connected);
  expect(part(host, 'value').textContent).toBe('42');
});

test('part= marks the inner styling targets', () => {
  const host = mount();
  expect(part(host, 'root')).toBeTruthy();
  expect(part(host, 'label')).toBeTruthy();
  expect(part(host, 'value')).toBeTruthy();
});

test('a consumer [part] selector reaches the inner target', () => {
  const probe = document.createElement('style');
  probe.textContent = 'ult-stat-label [part="label"] { text-decoration: underline; }';
  document.head.appendChild(probe);
  const host = mount();
  expect(getComputedStyle(part(host, 'label')).textDecorationLine).toContain('underline');
  probe.remove();
});

test('data-theme re-themes through the tokens stylesheet', async () => {
  const host = mount();
  document.documentElement.setAttribute('data-theme', 'dark');
  await new Promise((resolve) => setTimeout(resolve, 200));
  const dark = getComputedStyle(part(host, 'value')).color;
  document.documentElement.setAttribute('data-theme', 'light');
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(getComputedStyle(part(host, 'value')).color).not.toBe(dark);
});

test('a consumer --ult-* override reaches the part', async () => {
  const wrapper = document.createElement('div');
  document.body.appendChild(wrapper);
  const host = mount(wrapper);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const before = getComputedStyle(part(host, 'value')).color;
  wrapper.style.setProperty('--ult-color-text', 'rgb(1, 2, 3)');
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(getComputedStyle(part(host, 'value')).color).not.toBe(before);
});

test('the bundle injects its stylesheet into the document', () => {
  expect(document.head.querySelector('style[data-ultima-elements]')).not.toBeNull();
});

test('the emitted bundles carry no runtime stylex or external imports', () => {
  for (const bundle of [perElementBundle, ultimaBundle]) {
    expect(bundle).not.toMatch(/^import |^export |stylex\.(create|attrs|props)/m);
    expect(bundle).toContain('data-ultima-elements');
    expect(bundle).toContain("customElements.define('ult-stat'");
    expect(bundle).toContain("customElements.define('ult-stat-label'");
    expect(bundle).toContain("customElements.define('ult-stat-value'");
  }
});
