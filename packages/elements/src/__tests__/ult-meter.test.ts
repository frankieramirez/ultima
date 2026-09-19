import { afterEach, beforeAll, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import tokensCss from '../../../tokens/dist/tokens.css?inline';
import ultimaBundle from '../../dist/ultima.js?raw';
import perElementBundle from '../../dist/ult-meter.js?raw';

const TONES = ['neutral', 'highlight', 'success', 'warning', 'danger'] as const;
const PARTS = ['root', 'label', 'track', 'indicator', 'value'] as const;

const INNER = `
  <ult-meter-label>Disk used</ult-meter-label>
  <ult-meter-track><ult-meter-indicator></ult-meter-indicator></ult-meter-track>
  <ult-meter-value></ult-meter-value>
`;

function part(host: Element, name: (typeof PARTS)[number]): HTMLElement {
  const found = name === 'root' ? host : host.querySelector(`[part="${name}"]`);
  if (!found) throw new Error(`ult-meter rendered no part "${name}"`);
  return found as HTMLElement;
}

const fillOf = (meter: Element) => part(meter, 'indicator');
const trackOf = (meter: Element) => part(meter, 'track');
const valueOf = (meter: Element) => part(meter, 'value');
const fillColor = (meter: Element) => getComputedStyle(fillOf(meter)).backgroundColor;
const valueColor = (meter: Element) => getComputedStyle(valueOf(meter)).color;

function mount(
  attrs: Record<string, string> = {},
  inner = INNER,
  parent: HTMLElement = document.body,
): HTMLElement {
  const host = document.createElement('ult-meter');
  for (const [name, value] of Object.entries(attrs)) host.setAttribute(name, value);
  host.innerHTML = inner;
  parent.appendChild(host);
  return host;
}

function parse(attrs = ''): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<ult-meter value="40" ${attrs}>${INNER}</ult-meter>`;
  document.body.appendChild(wrapper);
  return wrapper.querySelector('ult-meter') as HTMLElement;
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 200));
}

beforeAll(async () => {
  const tokens = document.createElement('style');
  tokens.textContent = tokensCss;
  document.head.appendChild(tokens);
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../../dist/ult-meter.js', import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('dist/ult-meter.js failed to load'));
    document.head.appendChild(script);
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
});

for (const tone of TONES) {
  test(`${tone} mounts through the parser`, async () => {
    const host = parse(`tone="${tone}"`);
    for (const name of PARTS) {
      expect(part(host, name).getAttribute('part'), `missing part ${name}`).toBe(name);
    }
    await expect.element(host).toBeVisible();
  });

  test(`${tone} mounts built by script`, () => {
    const host = mount({ value: '40', tone });
    for (const name of PARTS) {
      expect(part(host, name).getAttribute('part'), `missing part ${name}`).toBe(name);
    }
    expect(fillOf(host).className).not.toBe('');
  });
}

test('an omitted tone matches neutral', () => {
  const implicit = mount({ value: '40' });
  const explicit = mount({ value: '40', tone: 'neutral' });
  expect(fillOf(implicit).className).not.toBe('');
  expect(fillOf(implicit).className).toBe(fillOf(explicit).className);
  expect(valueOf(implicit).className).toBe(valueOf(explicit).className);
});

test('tone set after connection restyles the indicator and the value', () => {
  const host = mount({ value: '40' });
  const before = [fillOf(host).className, valueOf(host).className];
  host.setAttribute('tone', 'danger');
  expect(fillOf(host).className).not.toBe(before[0]);
  expect(valueOf(host).className).not.toBe(before[1]);
});

test('an unknown tone falls back to neutral', () => {
  const host = mount({ value: '40', tone: 'nonsense' });
  const neutral = mount({ value: '40', tone: 'neutral' });
  expect(fillOf(host).className).toBe(fillOf(neutral).className);
  expect(valueOf(host).className).toBe(valueOf(neutral).className);
});

test('the root tone reaches the indicator and the value', () => {
  const plain = mount({ value: '40' });
  const alarming = mount({ value: '40', tone: 'danger' });
  const repeated = mount(
    { value: '40' },
    `
      <ult-meter-label>Repeated</ult-meter-label>
      <ult-meter-track><ult-meter-indicator tone="danger"></ult-meter-indicator></ult-meter-track>
      <ult-meter-value tone="danger"></ult-meter-value>
    `,
  );
  expect(fillColor(alarming)).not.toBe(fillColor(plain));
  expect(valueColor(alarming)).not.toBe(valueColor(plain));
  expect(fillColor(alarming)).toBe(fillColor(repeated));
  expect(valueColor(alarming)).toBe(valueColor(repeated));
});

test("a part's own tone wins over the one the root provides", () => {
  const inherited = mount({ value: '40', tone: 'danger' });
  const overridden = mount(
    { value: '40', tone: 'danger' },
    `
      <ult-meter-label>Overridden</ult-meter-label>
      <ult-meter-track><ult-meter-indicator tone="success"></ult-meter-indicator></ult-meter-track>
      <ult-meter-value tone="neutral"></ult-meter-value>
    `,
  );
  const neutral = mount({ value: '40' });
  expect(fillColor(overridden)).not.toBe(fillColor(inherited));
  expect(valueColor(overridden)).not.toBe(valueColor(inherited));
  expect(valueColor(overridden)).toBe(valueColor(neutral));
});

test('parts outside a meter fall back to neutral', () => {
  const loose = document.createElement('div');
  loose.innerHTML = `
    <ult-meter-track><ult-meter-indicator></ult-meter-indicator></ult-meter-track>
    <ult-meter-value></ult-meter-value>
  `;
  document.body.appendChild(loose);
  const rooted = mount({ value: '40', tone: 'neutral' });
  const looseIndicator = loose.querySelector('ult-meter-indicator') as HTMLElement;
  const looseValue = loose.querySelector('ult-meter-value') as HTMLElement;
  expect(looseIndicator.className).toBe(fillOf(rooted).className);
  expect(looseValue.className).toBe(valueOf(rooted).className);
});

test('the label names the meter', async () => {
  const host = mount({ value: '40' });
  await expect.element(page.getByRole('meter', { name: 'Disk used' })).toBeVisible();
  const label = host.querySelector('ult-meter-label') as HTMLElement;
  expect(host.getAttribute('aria-labelledby')).toBe(label.id);
});

test('aria-label on the meter names it when there is no label part', async () => {
  mount({ value: '40', 'aria-label': 'Memory' }, '<ult-meter-value></ult-meter-value>');
  await expect.element(page.getByRole('meter', { name: 'Memory' })).toBeVisible();
});

test('nothing in a meter takes focus', async () => {
  const host = mount({ value: '40' });
  const after = document.createElement('button');
  after.type = 'button';
  after.textContent = 'After';
  document.body.appendChild(after);
  await expect.element(host).toBeVisible();
  await userEvent.tab();
  expect(document.activeElement).toBe(after);
  expect(host.contains(document.activeElement)).toBe(false);
});

test('the value reaches aria and the indicator fills that share of the track', async () => {
  const host = mount({ value: '40' });
  await expect.element(host).toBeVisible();
  expect(host).toHaveAttribute('aria-valuenow', '40');
  expect(host).toHaveAttribute('aria-valuemin', '0');
  expect(host).toHaveAttribute('aria-valuemax', '100');
  expect(fillOf(host).getBoundingClientRect().width).toBeCloseTo(
    trackOf(host).getBoundingClientRect().width * 0.4,
    1,
  );
  expect(valueOf(host).textContent).toBe('40%');
});

test('min and max bound the reading', () => {
  const host = mount({ value: '40', min: '20', max: '60' });
  expect(host).toHaveAttribute('aria-valuemin', '20');
  expect(host).toHaveAttribute('aria-valuemax', '60');
  expect(host).toHaveAttribute('aria-valuenow', '40');
  expect(fillOf(host).getBoundingClientRect().width).toBeCloseTo(
    trackOf(host).getBoundingClientRect().width * 0.5,
    1,
  );
});

test('an out-of-range value clamps to the range', () => {
  const host = mount({ value: '120' });
  expect(host).toHaveAttribute('aria-valuenow', '100');
  expect(fillOf(host).style.width).toBe('100%');
});

test('value set after connection updates aria, fill, and text', () => {
  const host = mount({ value: '40' });
  host.setAttribute('value', '80');
  expect(host).toHaveAttribute('aria-valuenow', '80');
  expect(part(host, 'value').textContent).toBe('80%');
  expect(fillOf(host).style.width).toBe('80%');
});

test('an explicit aria-valuetext wins over the formatted value', () => {
  const host = mount({ value: '40', 'aria-valuetext': '4 of 10 bars' });
  expect(host).toHaveAttribute('aria-valuetext', '4 of 10 bars');
  host.setAttribute('value', '80');
  expect(host).toHaveAttribute('aria-valuetext', '4 of 10 bars');
});

test('removing the label drops the registered name', () => {
  const host = mount({ value: '40' });
  expect(host.hasAttribute('aria-labelledby')).toBe(true);
  (host.querySelector('ult-meter-label') as HTMLElement).remove();
  expect(host.hasAttribute('aria-labelledby')).toBe(false);
});

test('disconnect and reconnect keep the element live', () => {
  const host = mount({ value: '40' });
  const connected = fillOf(host).className;
  host.remove();
  host.setAttribute('tone', 'danger');
  document.body.appendChild(host);
  expect(fillOf(host).className).not.toBe(connected);
});

test('part= marks the styling targets', () => {
  const host = mount({ value: '40' });
  for (const name of PARTS) expect(part(host, name).getAttribute('part')).toBe(name);
});

test('a consumer [part] selector reaches the target', () => {
  const probe = document.createElement('style');
  probe.textContent = 'ult-meter [part="track"] { height: 2rem; }';
  document.head.appendChild(probe);
  const host = mount({ value: '40' });
  expect(parseFloat(getComputedStyle(trackOf(host)).height)).toBe(32);
  probe.remove();
});

test('data-theme re-themes through the tokens stylesheet', async () => {
  const host = mount({ value: '40', tone: 'danger' });
  document.documentElement.setAttribute('data-theme', 'dark');
  await settle();
  const dark = fillColor(host);
  document.documentElement.setAttribute('data-theme', 'light');
  await settle();
  expect(fillColor(host)).not.toBe(dark);
});

test('a consumer --ult-* override reaches the part', async () => {
  const wrapper = document.createElement('div');
  document.body.appendChild(wrapper);
  const host = mount({ value: '40', tone: 'danger' }, INNER, wrapper);
  await settle();
  const before = fillColor(host);
  wrapper.style.setProperty('--ult-color-danger', 'rgb(1, 2, 3)');
  await settle();
  expect(fillColor(host)).not.toBe(before);
});

test('no primitive machine is wired (proof-bar item 4 has no element instance)', () => {
  const host = mount({ value: '40' });
  expect(host.querySelector('[data-part], [data-scope], [tabindex]')).toBeNull();
  expect(host.hasAttribute('tabindex')).toBe(false);
});

test('no primitive reads element styles (proof-bar item 8 has no element instance)', () => {
  const host = mount({ value: '40' });
  expect(fillOf(host).style.width).toBe('40%');
  expect(trackOf(host).querySelector('[part="indicator"]')).toBe(fillOf(host));
});

test('the bundle injects its stylesheet into the document', () => {
  expect(document.head.querySelector('style[data-ultima-elements]')).not.toBeNull();
});

test('the emitted bundles carry no runtime stylex or external imports', () => {
  for (const bundle of [perElementBundle, ultimaBundle]) {
    expect(bundle).not.toMatch(/^import |^export |stylex\.(create|attrs|props)/m);
    expect(bundle).toContain('data-ultima-elements');
    expect(bundle).toContain("customElements.define('ult-meter'");
  }
});
