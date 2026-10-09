import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { arch, release, type } from 'node:os';
import { join, relative } from 'node:path';
import { chromium, firefox, webkit, type Browser, type BrowserType, type Page } from 'playwright';
import type { ResolvedDraft, TokenTable } from '../packages/tokens/src/theme/draft.ts';
import type { Run } from './consumer-helpers.ts';
import { browserErrors, type BrowserLog } from './consumer-next.ts';
import { BUNDLES, BUNDLE_ITEMS, bundleCases, type Bundle, type ConsumerReport, type Engine } from './consumer-report.ts';
import { consumerValues, sceneProbes } from './consumer-values.ts';

/** Every assertion a bundle cell executes, in order; a cell passes only when each one ran and held. */
export const BUNDLE_ASSERTIONS = {
  'theme-css': ['non-stock-tokens', 'control-paint', 'layered-reset', 'state-styles', 'scoped-portal', 'reduced-motion'],
  'overlay-keyboard': ['dialog-open', 'initial-focus', 'tab-containment', 'escape-close', 'focus-restored', 'select-keyboard', 'select-pointer', 'popup-clipping', 'scroll-lock'],
  form: ['labels', 'uncontrolled-defaults', 'controlled-update', 'disabled-read-only', 'required-rejection', 'checkbox-select', 'submitted-form-data', 'reset'],
} as const satisfies Record<Bundle, readonly string[]>;
const CELLS_PER_ENGINE = 2;
const CELL_TIMEOUT_MS = 120_000;
const LAUNCHERS: Record<Engine, BrowserType> = { chromium, firefox, webkit };

const RESET = '@layer reset { *, *::before, *::after { box-sizing: border-box; } body { margin: 0; } button { margin: 0; padding: 0; border: 0; background: none; font: inherit; } }\n';

/** The probes the Projects scene lacks: a disabled control, a popup per scoped mode, a clipped Select and a complete form. */
export const PROBES_SOURCE = `import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover } from '@/components/ui/popover';
import { Select } from '@/components/ui/select';

function Options({ values }: { values: string[] }) {
  return <Select.Portal><Select.Positioner><Select.Popup><Select.List>
    {values.map((value) => <Select.Item key={value} value={value}><Select.ItemIndicator /><Select.ItemText>{value}</Select.ItemText></Select.Item>)}
  </Select.List></Select.Popup></Select.Positioner></Select.Portal>;
}

function Scope({ mode }: { mode: 'dark' | 'light' }) {
  const container = useRef<HTMLDivElement>(null);
  return <section data-theme={mode} aria-label={\`\${mode} scope\`}>
    <Popover.Root>
      <Popover.Trigger render={<Button variant="outline" />}>{\`Open \${mode} scope\`}</Popover.Trigger>
      <Popover.Portal container={container}><Popover.Positioner><Popover.Popup><Popover.Title>{\`\${mode} scope popup\`}</Popover.Title></Popover.Popup></Popover.Positioner></Popover.Portal>
    </Popover.Root>
    <div ref={container} />
  </section>;
}

function AccountForm() {
  const [handle, setHandle] = useState('');
  const [notify, setNotify] = useState(true);
  const [plan, setPlan] = useState('Starter');
  const [invalid, setInvalid] = useState(false);
  const [result, setResult] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!String(data.get('fullName') ?? '').trim()) { setInvalid(true); setResult(''); return; }
    setInvalid(false);
    setResult(JSON.stringify(Object.fromEntries([...data.entries()].map(([key, value]) => [key, String(value)]).sort(([a], [b]) => a < b ? -1 : 1))));
  }
  function reset() { setHandle(''); setNotify(true); setPlan('Starter'); setInvalid(false); setResult(''); }
  return <form aria-label="Account" noValidate onSubmit={submit} onReset={reset}>
    <Field.Root name="fullName" invalid={invalid}>
      <Field.Label>Full name</Field.Label>
      <Input required onValueChange={(value) => { if (value.trim()) setInvalid(false); }} />
      {invalid ? <Field.Error match>Enter a full name.</Field.Error> : null}
    </Field.Root>
    <Field.Root name="team"><Field.Label>Team</Field.Label><Input defaultValue="Platform" /></Field.Root>
    <Field.Root name="handle"><Field.Label>Handle</Field.Label><Input value={handle} onValueChange={setHandle} /></Field.Root>
    <output aria-label="Handle preview">{handle ? \`@\${handle}\` : ''}</output>
    <Field.Root name="workspace"><Field.Label>Workspace</Field.Label><Input readOnly defaultValue="northwind" /></Field.Root>
    <Field.Root name="legacy" disabled><Field.Label>Legacy ID</Field.Label><Input defaultValue="L-1" /></Field.Root>
    <label><Checkbox.Root name="notify" checked={notify} onCheckedChange={setNotify}><Checkbox.Indicator /></Checkbox.Root> Notify owner</label>
    <Select.Root name="plan" value={plan} onValueChange={(value) => setPlan(value ?? 'Starter')}>
      <Select.Label>Plan</Select.Label>
      <Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger>
      <Options values={['Starter', 'Pro']} />
    </Select.Root>
    <Button type="submit">Submit account</Button>
    <Button type="reset" variant="outline">Reset account</Button>
    <p role="status" aria-label="Account result">{result}</p>
  </form>;
}

export default function BundleProbes() {
  return <section aria-label="Bundle probes" style={{ background: 'var(--ult-color-surface)', color: 'var(--ult-color-text)', padding: '2rem' }}>
    <Button disabled>Unavailable</Button>
    <Scope mode="dark" />
    <Scope mode="light" />
    <div data-testid="clip" style={{ overflow: 'hidden' }}>
      <Select.Root defaultValue="North">
        <Select.Label>Region</Select.Label>
        <Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger>
        <Options values={['North', 'South', 'East', 'West']} />
      </Select.Root>
    </div>
    <AccountForm />
  </section>;
}
`;

/** Adds the probe items, the layered reset and the probes beneath the Projects scene in the Vite fixture. */
export async function bundleScene(app: string, execute: Run): Promise<void> {
  await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', ...BUNDLE_ITEMS.map((id) => `@ultima/${id}`), '--yes']);
  await writeFile(join(app, 'src/index.css'), `${RESET}${await readFile(join(app, 'src/index.css'), 'utf8')}`);
  await writeFile(join(app, 'src/BundleProbes.tsx'), PROBES_SOURCE);
  await writeFile(join(app, 'src/App.tsx'), "import ThemeConsumer from './ThemeConsumer';\nimport BundleProbes from './BundleProbes';\nexport default function App() { return <><ThemeConsumer /><BundleProbes /></>; }\n");
}

/** The served output every engine loads, and the lockfile it was installed from. */
async function fixtureIdentity(app: string): Promise<{ hash: string; lock: string }> {
  const hash = createHash('sha256');
  const walk = async (folder: string): Promise<string[]> => (await Promise.all((await readdir(folder, { withFileTypes: true })).map((item) => item.isDirectory() ? walk(join(folder, item.name)) : [join(folder, item.name)]))).flat();
  const dist = join(app, 'dist');
  for (const file of (await walk(dist)).sort()) hash.update(`${relative(dist, file)}\0`).update(await readFile(file)).update('\0');
  return { hash: hash.digest('hex'), lock: createHash('sha256').update(await readFile(join(app, 'package-lock.json'))).digest('hex') };
}

export const bundleReproduction = (engine: Engine, fault?: string) => ['node', '--experimental-strip-types', 'scripts/consumer-proof.ts', '--layout', 'vite', '--delivery-path', 'css', '--exercise', 'bundles', '--engine', engine, ...(fault ? ['--fault', fault] : [])];

type Assertion = { name: string; expected: unknown; actual: unknown; status: 'passed' | 'failed'; error?: string };
type Check = (name: string, expected: unknown, action: () => Promise<unknown>) => Promise<void>;
type Cell = { page: Page; check: Check; table: TokenTable; mode: 'dark' | 'light'; tables: ResolvedDraft; stock: TokenTable; id: string; engine: Engine };

const settle = (page: Page) => page.evaluate(async () => {
  await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
  await Promise.all(document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
});
const computedColors = (page: Page, values: Record<string, string>) => page.evaluate((values) => {
  const probe = document.createElement('span');
  document.body.append(probe);
  const result = Object.fromEntries(Object.entries(values).map(([name, value]) => { probe.style.color = value; return [name, getComputedStyle(probe).color]; }));
  probe.remove();
  return result;
}, values);
const focusedInside = (page: Page, selector: string) => page.evaluate((selector) => !!document.activeElement && !!document.activeElement.closest(selector), selector);

async function themeCss({ page, check, table, mode, tables, stock, id, engine }: Cell) {
  const { control, portal: dialog } = sceneProbes(page);
  const trigger = page.getByRole('button', { name: 'Edit Aster', exact: true });
  await trigger.click();
  await dialog.waitFor();
  await settle(page);
  const snapshot = await consumerValues(page, table, mode, id, 'vite', 'css', engine);
  await check('non-stock-tokens', { mismatched: [], stock: [] }, async () => {
    const neutral = await computedColors(page, Object.fromEntries(['surface', 'accent', 'success'].map((name) => [name, stock[`--ult-color-${name}`]!])));
    const draft = await computedColors(page, Object.fromEntries(Object.keys(neutral).map((name) => [name, table[`--ult-color-${name}`]!])));
    return { mismatched: snapshot.failures.filter((failure) => / --ult-|color-scheme/.test(failure)), stock: Object.keys(neutral).filter((name) => neutral[name] === draft[name]) };
  });
  await check('control-paint', { paint: snapshot.expected, extraction: snapshot.extraction.expected }, async () => ({ paint: snapshot.actual, extraction: snapshot.extraction.actual }));
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  await check('layered-reset', { bodyMargin: '0px', layer: true, beatsReset: true }, async () => {
    const expected = await computedColors(page, { accent: table['--ult-color-accent']! });
    return control.evaluate((element, accent) => {
      const layer = [...document.styleSheets].some((sheet) => [...sheet.cssRules].some((rule) => rule instanceof CSSLayerBlockRule && rule.name === 'reset' && /\bbutton\b/.test(rule.cssText)));
      const css = getComputedStyle(element);
      return { bodyMargin: getComputedStyle(document.body).marginTop, layer, beatsReset: css.backgroundColor === accent && css.paddingLeft !== '0px' };
    }, expected.accent);
  });
  await check('state-styles', { hover: true, focusVisible: true, outline: true, disabledOpacity: '0.5' }, async () => {
    const expected = await computedColors(page, { hover: table['--ult-color-accent-hover']!, focus: table['--ult-color-border-focus']! });
    await control.hover();
    await settle(page);
    const hover = await control.evaluate((element) => getComputedStyle(element).backgroundColor) === expected.hover;
    await page.mouse.move(0, 0);
    await control.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    const focus = await control.evaluate((element) => ({ visible: element.matches(':focus-visible'), outline: getComputedStyle(element).outlineColor }));
    const disabledOpacity = await page.getByRole('button', { name: 'Unavailable', exact: true }).evaluate((element) => getComputedStyle(element).opacity);
    return { hover, focusVisible: focus.visible, outline: focus.outline === expected.focus, disabledOpacity };
  });
  const scoped = { inScope: true, colorScheme: '', mismatched: [] as string[] };
  await check('scoped-portal', { dark: { ...scoped, colorScheme: 'dark' }, light: { ...scoped, colorScheme: 'light' } }, async () => {
    const result: Record<string, typeof scoped> = {};
    for (const scope of ['dark', 'light'] as const) {
      const scopeTable = Object.fromEntries(Object.entries(tables[scope]).filter(([token]) => token.startsWith('--ult-color-')));
      const expected = await computedColors(page, scopeTable);
      await page.getByRole('button', { name: `Open ${scope} scope`, exact: true }).click();
      const popup = page.getByRole('dialog', { name: `${scope} scope popup`, exact: true });
      await popup.waitFor();
      await settle(page);
      result[scope] = await popup.evaluate((element, { scope, expected }) => {
        const probe = document.createElement('span');
        element.append(probe);
        const mismatched = Object.entries(expected).flatMap(([token, value]) => {
          probe.style.color = `var(${token})`;
          return getComputedStyle(probe).color === value ? [] : [token];
        });
        probe.remove();
        return { inScope: !!element.closest(`section[data-theme="${scope}"]`), colorScheme: getComputedStyle(element).colorScheme, mismatched };
      }, { scope, expected });
      await page.keyboard.press('Escape');
      await popup.waitFor({ state: 'hidden' });
    }
    return result;
  });
  const reduced = { fast: '1ms', base: '1ms', slow: '1ms', loop: '0s' };
  await check('reduced-motion', { control: reduced, portal: reduced, transitionMs: 1, usable: true }, async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await trigger.click();
    await dialog.waitFor();
    await settle(page);
    const motion = (element: Element) => Object.fromEntries(['fast', 'base', 'slow', 'loop'].map((key) => [key, getComputedStyle(element).getPropertyValue(`--ult-motion-${key}`).trim()]));
    const values = { control: await control.evaluate(motion), portal: await dialog.evaluate(motion), transitionMs: await dialog.evaluate((element) => Math.round(Number.parseFloat(getComputedStyle(element).transitionDuration) * 1000)) };
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    const usable = await trigger.evaluate((element) => element === document.activeElement);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    return { ...values, usable };
  });
}

async function overlayKeyboard({ page, check }: Cell) {
  const { portal: dialog } = sceneProbes(page);
  const trigger = page.getByRole('button', { name: 'Edit Aster', exact: true });
  // Base UI's open modal Dialog sets aria-hidden on the app root, so this probe finds the heading by markup, not role.
  const heading = page.locator('main h1');
  await check('dialog-open', { visible: true, portalled: true }, async () => {
    await trigger.focus();
    await page.keyboard.press('Enter');
    await dialog.waitFor();
    await settle(page);
    return { visible: await dialog.isVisible(), portalled: await dialog.evaluate((element) => element.closest('main') === null) };
  });
  await check('initial-focus', { inside: true, tag: 'INPUT', label: 'Name' }, () => dialog.evaluate((element) => {
    const active = document.activeElement as HTMLInputElement | null;
    return { inside: !!active && element.contains(active), tag: active?.tagName ?? null, label: active?.labels?.[0]?.textContent?.trim() ?? null };
  }));
  await check('tab-containment', { forward: true, backward: true, visited: true }, async () => {
    const steps: { key: string; inside: boolean; name: string | null }[] = [];
    for (const key of ['Tab', 'Shift+Tab']) for (let index = 0; index < 6; index++) {
      await page.keyboard.press(key);
      await settle(page);
      steps.push({ key, inside: await focusedInside(page, '[role="dialog"]'), name: await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim() ?? null) });
    }
    return { forward: steps.filter((step) => step.key === 'Tab').every((step) => step.inside), backward: steps.filter((step) => step.key === 'Shift+Tab').every((step) => step.inside), visited: new Set(steps.map((step) => step.name)).size > 1 };
  });
  await check('escape-close', true, async () => { await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); return await dialog.count() === 0; });
  await check('focus-restored', true, () => trigger.evaluate((element) => element === document.activeElement));
  const owner = page.getByRole('combobox', { name: 'Owner', exact: true });
  const listbox = page.getByRole('listbox');
  await check('select-keyboard', { value: 'Tomás Ruiz', focused: true }, async () => {
    await page.mouse.move(0, 0);
    await owner.focus();
    await page.keyboard.press('ArrowDown');
    await listbox.waitFor();
    const target = page.getByRole('option', { name: 'Tomás Ruiz', exact: true }).and(page.locator('[data-highlighted]'));
    for (let index = 0; index < 6 && !(await target.count()); index++) {
      await page.keyboard.press('ArrowDown');
      await settle(page);
    }
    await page.keyboard.press('Enter');
    await listbox.waitFor({ state: 'hidden' });
    return { value: (await owner.textContent())?.trim(), focused: await owner.evaluate((element) => element === document.activeElement) };
  });
  await check('select-pointer', 'Priya Shah', async () => {
    await owner.click();
    await page.getByRole('option', { name: 'Priya Shah', exact: true }).click();
    await listbox.waitFor({ state: 'hidden' });
    return (await owner.textContent())?.trim();
  });
  await check('popup-clipping', { outsideClip: true, unclipped: true }, async () => {
    await page.getByRole('combobox', { name: 'Region', exact: true }).click();
    await listbox.waitFor();
    await settle(page);
    const result = await listbox.evaluate((element) => {
      const clip = document.querySelector('[data-testid="clip"]')!;
      const options = [...element.querySelectorAll('[role="option"]')];
      const unclipped = options.length === 4 && options.every((option) => {
        const rect = option.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return rect.top >= 0 && rect.bottom <= innerHeight && !!hit && option.contains(hit);
      });
      return { outsideClip: !clip.contains(element), unclipped };
    });
    await page.keyboard.press('Escape');
    await listbox.waitFor({ state: 'hidden' });
    return result;
  });
  await check('scroll-lock', { scrollable: true, locked: true, restored: true, scrollsAfter: true }, async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    const top = () => heading.evaluate((element) => Math.round(element.getBoundingClientRect().top));
    const wheel = async () => { await page.mouse.move(640, 600); await page.mouse.wheel(0, 300); await page.waitForTimeout(250); await settle(page); };
    const scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight);
    const before = await top();
    await trigger.click();
    await dialog.waitFor();
    await settle(page);
    await wheel();
    const during = await top();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await settle(page);
    const after = await top();
    await wheel();
    return { scrollable, locked: during === before, restored: after === before, scrollsAfter: await top() < before };
  });
}

async function form({ page, check }: Cell) {
  const account = page.getByRole('form', { name: 'Account', exact: true });
  const textbox = (name: string) => account.getByRole('textbox', { name, exact: true });
  const notify = account.getByRole('checkbox', { name: 'Notify owner', exact: true });
  const plan = account.getByRole('combobox', { name: 'Plan', exact: true });
  const result = account.getByRole('status', { name: 'Account result', exact: true });
  const preview = account.getByRole('status', { name: 'Handle preview', exact: true });
  const text = async (locator: ReturnType<Page['getByRole']>) => (await locator.textContent())?.trim() ?? '';
  await account.scrollIntoViewIfNeeded();
  const names = ['Full name', 'Team', 'Handle', 'Workspace', 'Legacy ID'];
  await check('labels', Object.fromEntries([...names, 'Notify owner', 'Plan'].map((name) => [name, 1])), async () => ({
    ...Object.fromEntries(await Promise.all(names.map(async (name) => [name, await textbox(name).count()]))),
    'Notify owner': await notify.count(),
    Plan: await plan.count(),
  }));
  await check('uncontrolled-defaults', { team: 'Platform', workspace: 'northwind', legacy: 'L-1', notify: 'true', plan: 'Starter' }, async () => ({
    team: await textbox('Team').inputValue(), workspace: await textbox('Workspace').inputValue(), legacy: await textbox('Legacy ID').inputValue(),
    notify: await notify.getAttribute('aria-checked'), plan: await text(plan),
  }));
  await check('controlled-update', { value: 'ada', preview: '@ada' }, async () => {
    await textbox('Handle').click();
    await page.keyboard.type('ada');
    return { value: await textbox('Handle').inputValue(), preview: await text(preview) };
  });
  await check('disabled-read-only', { disabled: true, disabledFocus: false, readOnlyValue: 'northwind', readOnlyFocus: true }, async () => {
    const legacy = textbox('Legacy ID');
    await legacy.evaluate((element: HTMLElement) => element.focus());
    const disabledFocus = await legacy.evaluate((element) => element === document.activeElement);
    const workspace = textbox('Workspace');
    await workspace.click();
    await page.keyboard.type('x');
    return { disabled: await legacy.isDisabled(), disabledFocus, readOnlyValue: await workspace.inputValue(), readOnlyFocus: await workspace.evaluate((element) => element === document.activeElement) };
  });
  await check('required-rejection', { invalid: 'true', error: ['Enter a full name.'], result: '' }, async () => {
    await account.getByRole('button', { name: 'Submit account', exact: true }).click();
    const name = textbox('Full name');
    return {
      invalid: await name.getAttribute('aria-invalid'),
      error: await name.evaluate((element) => (element.getAttribute('aria-describedby') ?? '').split(/\s+/).map((id) => document.getElementById(id)?.textContent).filter(Boolean)),
      result: await text(result),
    };
  });
  await check('checkbox-select', { notify: 'false', plan: 'Pro', focused: true }, async () => {
    await notify.focus();
    await page.keyboard.press('Space');
    const checked = await notify.getAttribute('aria-checked');
    await plan.focus();
    await page.keyboard.press('ArrowDown');
    await page.getByRole('listbox').waitFor();
    const target = page.getByRole('option', { name: 'Pro', exact: true }).and(page.locator('[data-highlighted]'));
    for (let index = 0; index < 4 && !(await target.count()); index++) {
      await page.keyboard.press('ArrowDown');
      await settle(page);
    }
    await page.keyboard.press('Enter');
    await page.getByRole('listbox').waitFor({ state: 'hidden' });
    return { notify: checked, plan: await text(plan), focused: await plan.evaluate((element) => element === document.activeElement) };
  });
  await check('submitted-form-data', { fullName: 'Ada Lovelace', handle: 'ada', plan: 'Pro', team: 'Platform', workspace: 'northwind' }, async () => {
    await textbox('Full name').fill('Ada Lovelace');
    await page.keyboard.press('Enter');
    await result.filter({ hasText: /\S/ }).waitFor();
    return JSON.parse(await text(result));
  });
  await check('reset', { fullName: '', team: 'Platform', handle: '', preview: '', notify: 'true', plan: 'Starter', invalid: null, result: '' }, async () => {
    await textbox('Team').fill('Operations');
    await account.getByRole('button', { name: 'Reset account', exact: true }).click();
    await settle(page);
    return {
      fullName: await textbox('Full name').inputValue(), team: await textbox('Team').inputValue(), handle: await textbox('Handle').inputValue(), preview: await text(preview),
      notify: await notify.getAttribute('aria-checked'), plan: await text(plan), invalid: await textbox('Full name').getAttribute('aria-invalid'), result: await text(result),
    };
  });
}

const EXERCISES: Record<Bundle, (cell: Cell) => Promise<void>> = { 'theme-css': themeCss, 'overlay-keyboard': overlayKeyboard, form };

export type BundleSnapshot = {
  id: string; engine: Engine; bundle: Bundle; mode: 'dark' | 'light';
  browser: { name: Engine; version: string }; userAgent: string | null; platform: NonNullable<ConsumerReport['platform']>; fixture: NonNullable<ConsumerReport['fixture']>;
  assertions: Assertion[]; failures: string[]; reproduceArgv: string[]; reproduce: string; artifacts: Record<string, string>;
};

const platformIdentity = () => ({ os: type(), release: release(), arch: arch() });

async function runCell(browser: Browser, engine: Engine, id: string, url: string, output: string, report: ConsumerReport, tables: ResolvedDraft, stock: ResolvedDraft, fixture: NonNullable<ConsumerReport['fixture']>, fault?: string) {
  const name = id.split('/').at(-1)!;
  const bundle = BUNDLES.find((candidate) => name.startsWith(`${candidate}-`))!;
  const mode = name.endsWith('-dark') ? 'dark' : 'light';
  const file = `${engine}-${name}`;
  const context = await browser.newContext({ colorScheme: mode, reducedMotion: 'no-preference', viewport: { width: 1280, height: 720 } });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const log: BrowserLog = { console: [], pageErrors: [], failedRequests: [] };
  const errors = browserErrors(page, log);
  const assertions: Assertion[] = [];
  const failures: string[] = [];
  const check: Check = async (assertion, expected, action) => {
    let actual: unknown = null;
    let error: string | undefined;
    try { actual = await action(); } catch (caught) { error = String(caught); }
    const status = !error && JSON.stringify(actual) === JSON.stringify(expected) ? 'passed' : 'failed';
    assertions.push({ name: assertion, expected, actual, status, ...(error ? { error } : {}) });
    if (status === 'failed') failures.push(`${assertion}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${error ? ` (${error})` : ''}`);
  };
  const work = (async () => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.locator('body[data-hydrated="true"]').waitFor();
    await EXERCISES[bundle]({ page, check, table: tables[mode], mode, tables, stock: stock[mode], id, engine });
  })();
  work.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timed out after ${CELL_TIMEOUT_MS / 1000}s`)), CELL_TIMEOUT_MS); })]);
  } catch (error) { failures.push(String(error)); }
  finally { clearTimeout(timer); }
  for (const assertion of BUNDLE_ASSERTIONS[bundle]) if (!assertions.some((row) => row.name === assertion)) assertions.push({ name: assertion, expected: 'reached', actual: null, status: 'failed', error: 'not reached' });
  failures.push(...errors);
  const userAgent = await page.evaluate(() => navigator.userAgent).catch(() => null);
  const artifacts: Record<string, string> = { browser: `${file}.browser.json` };
  await page.screenshot({ path: join(output, `${file}.png`), fullPage: true }).then(() => { artifacts.screenshot = `${file}.png`; }, (error) => failures.push(`screenshot unavailable: ${error}`));
  const trace = failures.length ? `${file}.trace.zip` : undefined;
  await context.tracing.stop(trace ? { path: join(output, trace) } : {}).then(() => { if (trace) artifacts.trace = trace; }, (error) => failures.push(`trace unavailable: ${error}`));
  await context.close();
  await writeFile(join(output, artifacts.browser!), `${JSON.stringify(log, null, 2)}\n`);
  const reproduceArgv = bundleReproduction(engine, fault);
  const snapshot: BundleSnapshot = { id, engine, bundle, mode, browser: { name: engine, version: browser.version() }, userAgent, platform: report.platform!, fixture, assertions, failures, reproduceArgv, reproduce: reproduceArgv.join(' '), artifacts };
  await writeFile(join(output, `${file}.values.json`), `${JSON.stringify(snapshot, null, 2)}\n`);
  report.executed.push(id);
  report.cases.push({ id, status: failures.length ? 'failed' : 'passed', snapshot: `${file}.values.json`, failures });
}

/**
 * Runs every requested engine's cells against the one served build. An engine that cannot launch leaves
 * its cells unexecuted and records why, so the run is incomplete rather than passing on fewer engines.
 */
export async function bundleProof(url: string, app: string, report: ConsumerReport, output: string, tables: ResolvedDraft, stock: ResolvedDraft, engines: readonly Engine[], fault?: string, launch = (engine: Engine) => LAUNCHERS[engine].launch({ headless: true })): Promise<void> {
  const fixture = await fixtureIdentity(app);
  report.fixture = fixture;
  report.platform = platformIdentity();
  for (const engine of engines) {
    let browser: Browser;
    try { browser = await launch(engine); }
    catch (error) {
      // Playwright frames a missing host dependency in box drawing; keep the words.
      const reason = String(error).split('\n').map((line) => line.replace(/[║╔╗╚╝═]/g, '').trim()).filter(Boolean).slice(0, 4).join(' ');
      report.errors.push(`${engine} could not launch: ${reason}`);
      continue;
    }
    try {
      report.versions[engine] = browser.version();
      const queue = bundleCases([engine]);
      await Promise.all(Array.from({ length: CELLS_PER_ENGINE }, async () => {
        for (let id = queue.shift(); id; id = queue.shift()) await runCell(browser, engine, id, url, output, report, tables, stock, fixture, fault);
      }));
    } finally { await browser.close(); }
  }
}

/** What the verifier requires of a retained bundle snapshot: its identity, every assertion and the evidence a failure needs. */
export function bundleSnapshotProblems(snapshot: unknown, row: { id: string; status: string; failures: string[] }, report: Pick<ConsumerReport, 'fixture' | 'versions'>): string[] {
  const value = snapshot as Partial<BundleSnapshot> | null;
  if (!value || typeof value !== 'object') return ['missing bundle snapshot'];
  const problems: string[] = [];
  const [, , engine, name] = row.id.split('/');
  const bundle = BUNDLES.find((candidate) => name?.startsWith(`${candidate}-`));
  if (value.id !== row.id || value.engine !== engine || value.bundle !== bundle || JSON.stringify(value.failures) !== JSON.stringify(row.failures)) problems.push('snapshot disagrees with its case');
  if (!bundle) return [...problems, 'unknown bundle case'];
  const names = Array.isArray(value.assertions) ? value.assertions.map((assertion) => assertion?.name) : [];
  if (names.length !== BUNDLE_ASSERTIONS[bundle].length || BUNDLE_ASSERTIONS[bundle].some((assertion) => !names.includes(assertion))) problems.push('incomplete bundle assertion inventory');
  if (row.status === 'passed' && value.assertions?.some((assertion) => assertion.status !== 'passed' || JSON.stringify(assertion.expected) !== JSON.stringify(assertion.actual))) problems.push('passing cell holds a failed assertion');
  if (!value.browser || value.browser.name !== engine || value.browser.version !== report.versions?.[engine as Engine] || !value.platform?.os || JSON.stringify(value.fixture) !== JSON.stringify(report.fixture)) problems.push('browser, platform or fixture identity disagrees with the report');
  if (JSON.stringify(value.reproduceArgv) !== JSON.stringify(bundleReproduction(engine as Engine, value.reproduceArgv?.includes('--fault') ? value.reproduceArgv.at(-1) : undefined)) || value.reproduce !== value.reproduceArgv?.join(' ')) problems.push('invalid reproduction');
  for (const kind of ['browser', row.status === 'passed' ? 'screenshot' : 'trace']) if (typeof value.artifacts?.[kind] !== 'string') problems.push(`missing ${kind} artifact`);
  return problems;
}
