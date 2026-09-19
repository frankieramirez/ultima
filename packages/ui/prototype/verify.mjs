// PROTOTYPE verification for https://github.com/frankieramirez/ultima/issues/153
// Run: node packages/ui/prototype/verify.mjs
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const page = pathToFileURL(new URL('./index.html', import.meta.url).pathname).href;
const browser = await chromium.launch();
const ctx = await browser.newContext({ colorScheme: 'dark' });
const pg = await ctx.newPage();
await pg.goto(page);

const report = await pg.evaluate(() => {
  const inner = (el) => el.shadowRoot?.querySelector('button') ?? el.querySelector('button');
  const bg = (el) => getComputedStyle(inner(el)).backgroundColor;
  const out = {};
  const grab = (sel) => document.querySelectorAll(sel);
  out.lightAccent = bg(grab('ult-button')[0]);
  out.shadowAccent = bg(grab('ult-button-shadow')[0]);
  const themed = document.querySelector('section[data-theme="light"]');
  out.themeLight = bg(themed.querySelector('ult-button'));
  out.themeShadow = bg(themed.querySelector('ult-button-shadow'));
  const overridden = document.querySelector('section[style*="ff00ff"]');
  out.overrideLight = bg(overridden.querySelector('ult-button'));
  out.overrideShadow = bg(overridden.querySelector('ult-button-shadow'));
  out.disabledOpacity = getComputedStyle(grab('ult-button[disabled]')[0].querySelector('button')).opacity;
  out.disabledShadowOpacity = getComputedStyle(
    grab('ult-button-shadow[disabled]')[0].shadowRoot.querySelector('button'),
  ).opacity;
  const sm = grab('ult-button[size="sm"]')[0];
  const lg = grab('ult-button[size="lg"]')[0];
  out.sizeSm = getComputedStyle(inner(sm)).height;
  out.sizeLg = getComputedStyle(inner(lg)).height;
  const outlineBtn = grab('ult-button[variant="outline"]')[0];
  out.outlineBorder = getComputedStyle(inner(outlineBtn)).borderColor;
  const partEl = grab('ult-button-shadow')[0];
  out.partUnderline = getComputedStyle(partEl.shadowRoot.querySelector('button')).textDecorationLine;
  return out;
});

const expect = {
  lightAccent: 'rgb(131, 148, 255)',
  shadowAccent: 'rgb(131, 148, 255)',
  themeLight: 'rgb(86, 95, 222)',
  themeShadow: 'rgb(131, 148, 255)',
  overrideLight: 'rgb(255, 0, 255)',
  overrideShadow: 'rgb(131, 148, 255)',
  disabledOpacity: '0.5',
  disabledShadowOpacity: '0.5',
  sizeSm: '32px',
  sizeLg: '48px',
  outlineBorder: 'rgb(60, 61, 64)',
  partUnderline: 'underline',
};

let fail = 0;
for (const [key, want] of Object.entries(expect)) {
  const got = report[key];
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${key}: ${got}${ok ? '' : ` (want ${want})`}`);
}

// Focus ring: keyboard focus into a light-DOM and a shadow-DOM button.
await pg.keyboard.press('Tab');
let ring = await pg.evaluate(() => {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  const btn = el?.tagName === 'BUTTON' ? el : (el?.querySelector('button') ?? null);
  if (!btn) return `none (activeElement: ${el?.tagName})`;
  const cs = getComputedStyle(btn);
  return `${cs.outline} @ ${cs.outlineColor}, offset ${cs.outlineOffset}`;
});
console.log(`focus ring on first tabbable: ${ring}`);

await browser.close();
process.exit(fail ? 1 : 0);
