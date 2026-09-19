import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';

const FIXTURE_URL = '/elements.html';

const ELEMENTS = [
  { tag: 'ult-button', inner: 'button' },
  { tag: 'ult-table', inner: 'table' },
] as const;

const frames: HTMLIFrameElement[] = [];

type FixtureWindow = Window & { axe?: typeof axe };

async function loadFixture(): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.title = 'Ultima elements fixture';
  iframe.style.cssText = 'width:1280px;height:720px;border:0';
  iframe.src = FIXTURE_URL;
  const loaded = new Promise<void>((resolve, reject) => {
    iframe.addEventListener('load', () => resolve(), { once: true });
    iframe.addEventListener('error', () => reject(new Error(`${FIXTURE_URL} did not load over HTTP`)), {
      once: true,
    });
  });
  document.body.appendChild(iframe);
  frames.push(iframe);
  await loaded;
  const win = iframe.contentWindow;
  if (!win) throw new Error('the fixture iframe has no window');
  await Promise.race([
    Promise.all(ELEMENTS.map(({ tag }) => win.customElements.whenDefined(tag))),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${FIXTURE_URL} did not define the elements`)), 5000),
    ),
  ]);
  return iframe;
}

afterEach(() => {
  for (const frame of frames.splice(0)) frame.remove();
});

test('the fixture page renders every element in both color modes', async () => {
  const iframe = await loadFixture();
  const doc = iframe.contentDocument;
  if (!doc) throw new Error('the fixture iframe has no document');
  for (const theme of ['dark', 'light']) {
    for (const { tag, inner } of ELEMENTS) {
      const hosts = doc.querySelectorAll(`[data-theme="${theme}"] ${tag}`);
      expect(hosts.length, `no ${tag} demos in the ${theme} section`).toBeGreaterThan(0);
      for (const host of hosts) {
        expect(host.querySelector(inner), `${tag} rendered no inner ${inner}`).not.toBeNull();
      }
    }
  }
});

test('each registry item embeds the bytes the served bundle carries', async () => {
  for (const { tag } of ELEMENTS) {
    const itemUrl = `/r/${tag}.json`;
    const bundleUrl = `/elements/${tag}.js`;
    const [itemResponse, bundleResponse] = await Promise.all([
      fetch(itemUrl),
      fetch(bundleUrl),
    ]);
    expect(itemResponse.headers.get('content-type'), `${itemUrl} was not served`).toMatch(/json/);
    expect(
      bundleResponse.headers.get('content-type'),
      `${bundleUrl} was not served`,
    ).toMatch(/javascript/);
    const item = (await itemResponse.json()) as {
      type: string;
      files: { content: string }[];
    };
    expect(item.type).toBe('registry:item');
    expect(item.files[0]?.content).toBe(await bundleResponse.text());
  }
});

test('the fixture page has no axe violations', async () => {
  const iframe = await loadFixture();
  const doc = iframe.contentDocument;
  if (!doc) throw new Error('the fixture iframe has no document');
  const injection = doc.createElement('script');
  injection.textContent = axe.source;
  doc.head.appendChild(injection);
  const win = iframe.contentWindow as FixtureWindow;
  if (!win.axe) throw new Error('axe did not load inside the fixture page');
  const results = await win.axe.run(doc);
  expect(results.violations.map(describe)).toEqual([]);
});

function describe(violation: axe.Result) {
  return `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`;
}
