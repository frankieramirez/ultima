import { afterEach, beforeAll, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import tokensCss from '../../../tokens/dist/tokens.css?inline';
import ultimaBundle from '../../dist/ultima.js?raw';
import perElementBundle from '../../dist/ult-card.js?raw';

// The proof bar read in element terms (docs/spec/ultima.md, What an element
// build ticket proves). Items with no Card instance: 4 (Card composes no
// primitive), 5 (Card declares no axes or states), and 8 (Zag never reads
// element styles).
const PARTS = {
  'ult-card': 'root',
  'ult-card-header': 'header',
  'ult-card-title': 'title',
  'ult-card-description': 'description',
  'ult-card-body': 'body',
  'ult-card-footer': 'footer',
} as const;

const MARKUP = `
  <ult-card>
    <ult-card-header>
      <ult-card-title>Latency</ult-card-title>
      <ult-card-description>p95 over the last hour</ult-card-description>
    </ult-card-header>
    <ult-card-body>Body</ult-card-body>
    <ult-card-footer>Footer</ult-card-footer>
  </ult-card>`;

function target(scope: ParentNode, part: string): HTMLElement {
  const inner = scope.querySelector(`[part="${part}"]`);
  if (!(inner instanceof HTMLElement)) throw new Error(`no inner target part="${part}"`);
  return inner;
}

function mount(parent: HTMLElement = document.body): HTMLElement {
  const card = document.createElement('ult-card');
  const header = document.createElement('ult-card-header');
  const title = document.createElement('ult-card-title');
  title.textContent = 'Latency';
  const description = document.createElement('ult-card-description');
  description.textContent = 'p95 over the last hour';
  header.append(title, description);
  const body = document.createElement('ult-card-body');
  body.textContent = 'Body';
  const footer = document.createElement('ult-card-footer');
  footer.textContent = 'Footer';
  card.append(header, body, footer);
  parent.appendChild(card);
  return card;
}

beforeAll(async () => {
  const tokens = document.createElement('style');
  tokens.textContent = tokensCss;
  document.head.appendChild(tokens);
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../../dist/ult-card.js', import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('dist/ult-card.js failed to load'));
    document.head.appendChild(script);
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
});

test('every part mounts through the parser', async () => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = MARKUP;
  document.body.appendChild(wrapper);
  for (const part of Object.values(PARTS)) {
    await expect.element(target(wrapper, part)).toBeVisible();
  }
});

test('every part mounts on an element created by script', async () => {
  const card = mount();
  for (const part of Object.values(PARTS)) {
    await expect.element(target(card, part)).toBeVisible();
  }
});

test('the title is a level 3 heading', async () => {
  mount();
  await expect.element(page.getByRole('heading', { level: 3, name: 'Latency' })).toBeVisible();
});

test('tabbing into the card focuses nothing inside it', async () => {
  const card = mount();
  await userEvent.tab();
  expect(card.contains(document.activeElement)).toBe(false);
  expect(getComputedStyle(target(card, 'root')).outlineStyle).toBe('none');
});

test('part= marks each inner styling target', () => {
  mount();
  for (const [tag, part] of Object.entries(PARTS)) {
    const host = document.querySelector(tag);
    expect(host?.firstElementChild, `${tag} has no inner target`).toHaveAttribute('part', part);
  }
});

test('a consumer [part] selector reaches an inner target', () => {
  const probe = document.createElement('style');
  probe.textContent = 'ult-card [part="body"] { text-decoration: underline; }';
  document.head.appendChild(probe);
  const card = mount();
  expect(getComputedStyle(target(card, 'body')).textDecorationLine).toContain('underline');
  probe.remove();
});

test('disconnect and reconnect keep the family live', async () => {
  const card = mount();
  card.remove();
  document.body.appendChild(card);
  for (const part of Object.values(PARTS)) {
    await expect.element(target(card, part)).toBeVisible();
  }
  expect(card.querySelectorAll('[part="title"]')).toHaveLength(1);
  await expect.element(page.getByRole('heading', { level: 3, name: 'Latency' })).toBeVisible();
});

test('data-theme re-themes through the tokens stylesheet', async () => {
  const card = mount();
  document.documentElement.setAttribute('data-theme', 'dark');
  await new Promise((resolve) => setTimeout(resolve, 200));
  const dark = getComputedStyle(target(card, 'root')).backgroundColor;
  document.documentElement.setAttribute('data-theme', 'light');
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(getComputedStyle(target(card, 'root')).backgroundColor).not.toBe(dark);
});

test('a consumer --ult-* override reaches the part', async () => {
  const wrapper = document.createElement('div');
  document.body.appendChild(wrapper);
  const card = mount(wrapper);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const before = getComputedStyle(target(card, 'root')).backgroundColor;
  wrapper.style.setProperty('--ult-color-surface-raised', 'rgb(1, 2, 3)');
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(getComputedStyle(target(card, 'root')).backgroundColor).not.toBe(before);
});

test('the bundle injects its stylesheet into the document', () => {
  expect(document.head.querySelector('style[data-ultima-elements]')).not.toBeNull();
});

test('the emitted bundles carry no runtime stylex or external imports', () => {
  for (const bundle of [perElementBundle, ultimaBundle]) {
    expect(bundle).not.toMatch(/^import |^export |stylex\.(create|attrs|props)/m);
    expect(bundle).toContain('data-ultima-elements');
    for (const tag of Object.keys(PARTS)) {
      expect(bundle).toContain(`customElements.define('${tag}'`);
    }
  }
});
