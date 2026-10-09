import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { arch, release, type } from 'node:os';
import { join, relative } from 'node:path';
import { chromium, firefox, webkit, type Browser, type BrowserContext, type BrowserContextOptions, type BrowserType, type Locator, type Page } from 'playwright';
import type { ResolvedDraft, TokenTable } from '../packages/tokens/src/theme/draft.ts';
import type { Run } from './consumer-helpers.ts';
import { lifecycle } from './consumer-elements.ts';
import { browserErrors, hydrationProblems, hydrationState, type BrowserLog, type HydrationState } from './consumer-next.ts';
import { BUNDLE_ITEMS, MATRIX_BUNDLES, bundleCases, elementCases, type Bundle, type ConsumerLayout, type ConsumerReport, type Engine } from './consumer-report.ts';
import { consumerValues, sceneProbes } from './consumer-values.ts';

/** Every assertion a bundle cell executes, in order; a cell passes only when each one ran and held. */
export const BUNDLE_ASSERTIONS = {
  'theme-css': ['non-stock-tokens', 'control-paint', 'layered-reset', 'state-styles', 'scoped-portal', 'reduced-motion'],
  'overlay-keyboard': ['dialog-open', 'initial-focus', 'tab-containment', 'escape-close', 'focus-restored', 'select-keyboard', 'select-pointer', 'popup-clipping', 'scroll-lock'],
  form: ['labels', 'uncontrolled-defaults', 'controlled-update', 'disabled-read-only', 'required-rejection', 'checkbox-select', 'submitted-form-data', 'reset'],
  hydration: ['server-render', 'hydration', 'assets', 'dialog-keyboard', 'extraction', 'theme', 'portal-theme', 'escape-focus-return'],
  lifecycle: ['registration', 'upgrade', 'reconnect', 'attribute-update', 'tabs-keyboard', 'tabs-theme'],
  'date-picker': ['commit-typed', 'invalid-input', 'controlled-update', 'clear', 'calendar-selection', 'min-max-unavailable', 'range-en-gb', 'submitted-dates', 'reset', 'time-zones'],
  'direction-locale': ['rtl-document', 'translated-labels', 'navigation-layout', 'navigation-keyboard', 'tabs-layout', 'tabs-indicator', 'tabs-arrows', 'select-layout', 'select-keyboard', 'date-picker-layout', 'date-picker-glyphs', 'date-picker-keys'],
  'narrow-touch': ['touch-context', 'navigation-drawer', 'dialog-touch', 'select-touch', 'popover-dismiss', 'date-touch', 'reach-controls'],
} as const satisfies Record<Bundle, readonly string[]>;

/**
 * The RTL cases a component fails, named so the support page can exclude it from the RTL claim. A cell still
 * runs and records an excluded assertion; it fails the cell only when the component is not named here.
 */
export const RTL_EXCLUSIONS: Partial<Record<string, { component: string; reason: string }>> = {
  'tabs-indicator': { component: 'tabs', reason: 'Indicator sets inset-inline-start from Base UI\'s physical --active-tab-left, so under dir="rtl" it sits at the far end of the list instead of under the selected tab.' },
  'date-picker-glyphs': { component: 'date-picker', reason: 'PrevTrigger and NextTrigger draw fixed left and right chevrons, so under dir="rtl" previous points away from the inline start.' },
};
const CELLS_PER_ENGINE = 2;
/** About five times each bundle's slowest cell in the first complete CI run (#804; the #771 bundles from a local Firefox run until CI measures them), never under 30 seconds. */
export const CELL_DEADLINES_MS: Record<Bundle, number> = { 'theme-css': 60_000, 'overlay-keyboard': 30_000, form: 30_000, 'date-picker': 60_000, 'direction-locale': 30_000, 'narrow-touch': 60_000, hydration: 45_000, lifecycle: 30_000 };
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

/** The faults the bundles exercise seeds into its own probes. */
export const BUNDLE_FAULTS = ['wrong-submitted-date'] as const;
export type BundleFault = typeof BUNDLE_FAULTS[number];

const SERIALIZE = 'const serialize = (date: DateValue | undefined) => date ? date.toString() : \'\';';
/** The wrong submitted date: a calendar date read as a UTC instant and written in the browser's zone, a day early west of UTC. */
const WRONG_SERIALIZE = 'const serialize = (date: DateValue | undefined) => date ? new Date(date.toString()).toLocaleDateString(\'en-CA\') : \'\';';

/**
 * The Date Picker probes: an en-US single date with min, max and an unavailable day, and an en-GB range,
 * both controlled, in one form that submits each date's ISO year, month and day beside the typed text.
 */
export const DATE_PROBES_SOURCE = `import { useState, type FormEvent } from 'react';
import { parse, type DateValue, type ValueChangeDetails } from '@zag-js/date-picker';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';

${SERIALIZE}
const isDateUnavailable = (date: DateValue) => date.toString() === '2024-03-13';
/**
 * The documented entry parser. Zag's default falls back to the engine's Date.parse for any field it cannot read,
 * so the same keystrokes commit different dates in different engines. This accepts exact digits in the locale's
 * day and month order and a real calendar date, and returns nothing otherwise, so invalid text keeps the value.
 */
const parseEntry = (text: string, { locale }: { locale: string }) => {
  const match = /^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/.exec(text.trim());
  if (!match) return undefined;
  const [first, second, year] = match.slice(1).map(Number) as [number, number, number];
  const [month, day] = locale === 'en-GB' ? [second, first] : [first, second];
  try { return parse(\`\${year}-\${String(month).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`); }
  catch { return undefined; }
};

export function DateCalendar() {
  return <DatePicker.Portal><DatePicker.Positioner><DatePicker.Content>
    <DatePicker.View view="day">
      <DatePicker.ViewControl view="day">
        <DatePicker.PrevTrigger />
        <DatePicker.ViewTrigger><DatePicker.RangeText /></DatePicker.ViewTrigger>
        <DatePicker.NextTrigger />
      </DatePicker.ViewControl>
      <DatePicker.Table view="day" />
    </DatePicker.View>
  </DatePicker.Content></DatePicker.Positioner></DatePicker.Portal>;
}

type DateEvent = { picker: string; value: string[]; text: string[] };

export default function DateProbes() {
  const [release, setRelease] = useState<DateValue[]>([]);
  const [sprint, setSprint] = useState<DateValue[]>([]);
  const [events, setEvents] = useState<DateEvent[]>([]);
  const [result, setResult] = useState('');
  const record = (picker: string, set: (value: DateValue[]) => void) => (details: ValueChangeDetails) => {
    set(details.value);
    setEvents((list) => [...list, { picker, value: details.value.map(String), text: details.valueAsString }]);
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setResult(JSON.stringify(Object.fromEntries([...new Set(data.keys())].sort().map((key) => [key, data.getAll(key).map(String)]))));
  }
  function reset() { setRelease([]); setSprint([]); setResult(''); }
  return <form aria-label="Schedule" noValidate onSubmit={submit} onReset={reset} style={{ background: 'var(--ult-color-surface)', color: 'var(--ult-color-text)', display: 'grid', gap: '1rem', maxWidth: '22rem', padding: '2rem' }}>
    <section aria-label="Release picker">
      <DatePicker.Root name="release" locale="en-US" parse={parseEntry} value={release} onValueChange={record('release', setRelease)} min={parse('2024-01-15')} max={parse('2024-12-15')} isDateUnavailable={isDateUnavailable} defaultFocusedValue={parse('2024-02-01')}>
        <DatePicker.Label>Release date</DatePicker.Label>
        <DatePicker.Control><DatePicker.Input /><DatePicker.ClearTrigger /><DatePicker.Trigger /></DatePicker.Control>
        <DateCalendar />
      </DatePicker.Root>
      <input type="hidden" name="releaseIso" value={serialize(release[0])} />
    </section>
    <section aria-label="Sprint picker">
      <DatePicker.Root name="sprint" locale="en-GB" parse={parseEntry} selectionMode="range" value={sprint} onValueChange={record('sprint', setSprint)} defaultFocusedValue={parse('2024-03-01')}>
        <DatePicker.Label>Sprint window</DatePicker.Label>
        <DatePicker.Control><DatePicker.Input index={0} aria-label="Sprint start" /><DatePicker.Input index={1} aria-label="Sprint end" /><DatePicker.ClearTrigger /><DatePicker.Trigger /></DatePicker.Control>
        <DateCalendar />
      </DatePicker.Root>
      <input type="hidden" name="sprintStart" value={serialize(sprint[0])} />
      <input type="hidden" name="sprintEnd" value={serialize(sprint[1])} />
    </section>
    <output aria-label="Release value">{release.map(String).join(' ')}</output>
    <output aria-label="Sprint value">{sprint.map(String).join(' ')}</output>
    <output aria-label="Date events">{JSON.stringify(events)}</output>
    <Button type="button" variant="outline" onClick={() => setRelease([parse('2024-11-03')])}>Use fall-back day</Button>
    <Button type="submit">Submit schedule</Button>
    <Button type="reset" variant="outline">Reset schedule</Button>
    <p role="status" aria-label="Schedule result">{result}</p>
  </form>;
}
`;

/**
 * The RTL layout fixture: navigation, Tabs, Select and Date Picker under `dir="rtl"` with Arabic labels and
 * explicit translations. Base UI reads direction from its DirectionProvider and Zag from the `dir` prop. The
 * date stays en-GB, since Arabic date parsing is outside the support promise.
 */
export const DIRECTION_PROBES_SOURCE = `import { useEffect, useState } from 'react';
import { parse } from '@zag-js/date-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Select } from '@/components/ui/select';
import { Sidebar } from '@/components/ui/sidebar';
import { Tabs } from '@/components/ui/tabs';
import { DateCalendar } from './DateProbes';

const regions = ['الشمال', 'الجنوب', 'الشرق', 'الغرب'];
const translations = {
  trigger: (open: boolean) => open ? 'إغلاق التقويم' : 'فتح التقويم',
  clearTrigger: 'مسح التاريخ',
  prevTrigger: () => 'الشهر السابق',
  nextTrigger: () => 'الشهر التالي',
  content: 'التقويم',
};

export default function DirectionProbes() {
  const [page, setPage] = useState<'projects' | 'activity'>('projects');
  const [region, setRegion] = useState(regions[0]!);
  useEffect(() => { document.body.dataset.hydrated = 'true'; }, []);
  return <Sidebar.Root>
    <div style={{ background: 'var(--ult-color-surface)', color: 'var(--ult-color-text)', display: 'flex', fontFamily: 'var(--ult-font-sans)', minHeight: '100dvh' }}>
      <Sidebar.Panel aria-label="مساحة العمل">
        <Sidebar.List>
          <Sidebar.Item><Sidebar.Link href="#projects" active={page === 'projects'} onClick={() => setPage('projects')}>المشاريع</Sidebar.Link></Sidebar.Item>
          <Sidebar.Item><Sidebar.Link href="#activity" active={page === 'activity'} onClick={() => setPage('activity')}>النشاط</Sidebar.Link></Sidebar.Item>
        </Sidebar.List>
      </Sidebar.Panel>
      <main style={{ alignContent: 'start', display: 'grid', flexGrow: 1, gap: '2rem', padding: '2rem' }}>
        <h1>{page === 'projects' ? 'المشاريع' : 'النشاط'}</h1>
        <Tabs.Root defaultValue="overview">
          <Tabs.List aria-label="أقسام المشروع">
            <Tabs.Tab value="overview">نظرة عامة</Tabs.Tab>
            <Tabs.Tab value="members">الأعضاء</Tabs.Tab>
            <Tabs.Tab value="settings">الإعدادات</Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Panel value="overview">ملخص المشروع</Tabs.Panel>
          <Tabs.Panel value="members">أعضاء الفريق</Tabs.Panel>
          <Tabs.Panel value="settings">إعدادات المشروع</Tabs.Panel>
        </Tabs.Root>
        <div style={{ maxWidth: '20rem' }}>
          <Select.Root value={region} onValueChange={(value) => setRegion(value ?? regions[0]!)}>
            <Select.Label>المنطقة</Select.Label>
            <Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger>
            <Select.Portal><Select.Positioner><Select.Popup><Select.List>
              {regions.map((value) => <Select.Item key={value} value={value}><Select.ItemIndicator /><Select.ItemText>{value}</Select.ItemText></Select.Item>)}
            </Select.List></Select.Popup></Select.Positioner></Select.Portal>
          </Select.Root>
        </div>
        <section aria-label="منتقي التاريخ" style={{ maxWidth: '20rem' }}>
          <DatePicker.Root dir="rtl" locale="en-GB" translations={translations} positioning={{ placement: 'bottom-start' }} defaultValue={[parse('2024-02-29')]}>
            <DatePicker.Label>تاريخ الإطلاق</DatePicker.Label>
            <DatePicker.Control><DatePicker.Input /><DatePicker.ClearTrigger /><DatePicker.Trigger /></DatePicker.Control>
            <DateCalendar />
          </DatePicker.Root>
        </section>
      </main>
    </div>
  </Sidebar.Root>;
}
`;

/** `?dir=rtl` renders the RTL fixture alone, with the document's direction and language set before the first render. */
const APP_SOURCE = `import { DirectionProvider } from '@base-ui/react/direction-provider';
import ThemeConsumer from './ThemeConsumer';
import BundleProbes from './BundleProbes';
import DateProbes from './DateProbes';
import DirectionProbes from './DirectionProbes';

const rtl = new URLSearchParams(location.search).get('dir') === 'rtl';
if (rtl) Object.assign(document.documentElement, { dir: 'rtl', lang: 'ar' });

export default function App() {
  return <DirectionProvider direction={rtl ? 'rtl' : 'ltr'}>{rtl ? <DirectionProbes /> : <><ThemeConsumer /><BundleProbes /><DateProbes /></>}</DirectionProvider>;
}
`;

/** The probe files the bundles exercise writes into the Vite fixture's `src`, with a seeded fault applied. */
export const bundleFiles = (fault?: string): Record<string, string> => ({
  'BundleProbes.tsx': PROBES_SOURCE,
  'DateProbes.tsx': fault === 'wrong-submitted-date' ? DATE_PROBES_SOURCE.replace(SERIALIZE, WRONG_SERIALIZE) : DATE_PROBES_SOURCE,
  'DirectionProbes.tsx': DIRECTION_PROBES_SOURCE,
  'App.tsx': APP_SOURCE,
});

/** Adds the probe items, the layered reset and the probes beneath the Projects scene in the Vite fixture. */
export async function bundleScene(app: string, execute: Run, fault?: string): Promise<void> {
  await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', ...BUNDLE_ITEMS.map((id) => `@ultima/${id}`), '--yes']);
  await writeFile(join(app, 'src/index.css'), `${RESET}${await readFile(join(app, 'src/index.css'), 'utf8')}`);
  for (const [name, content] of Object.entries(bundleFiles(fault))) await writeFile(join(app, 'src', name), content);
}

async function fixtureIdentity(app: string, layout: ConsumerLayout): Promise<{ hash: string; lock: string }> {
  const hash = createHash('sha256');
  const root = join(app, layout === 'vite' ? 'dist' : '.next');
  const walk = async (folder: string): Promise<string[]> => (await Promise.all((await readdir(folder, { withFileTypes: true })).filter((item) => !(folder === root && item.name === 'cache')).map((item) => item.isDirectory() ? walk(join(folder, item.name)) : [join(folder, item.name)]))).flat();
  for (const file of (await walk(root)).sort()) hash.update(`${relative(root, file)}\0`).update(await readFile(file)).update('\0');
  return { hash: hash.digest('hex'), lock: createHash('sha256').update(await readFile(join(app, 'package-lock.json'))).digest('hex') };
}

export const bundleReproduction = (engine: Engine, fault?: string, layout: ConsumerLayout = 'vite', exercise: 'bundles' | 'elements' = 'bundles') => ['node', '--experimental-strip-types', 'scripts/consumer-proof.ts', '--layout', layout, '--delivery-path', 'css', '--exercise', exercise, '--engine', engine, ...(fault ? ['--fault', fault] : [])];

type Assertion = { name: string; expected: unknown; actual: unknown; status: 'passed' | 'failed' | 'excluded'; error?: string };
type Check = (name: string, expected: unknown, action: () => Promise<unknown>) => Promise<void>;
export type Cell = {
  page: Page; check: Check; table: TokenTable; mode: 'dark' | 'light'; tables: ResolvedDraft; stock: TokenTable; id: string; engine: Engine; layout: ConsumerLayout;
  browser: Browser; contextOptions: BrowserContextOptions; url: string; log: BrowserLog; errors: string[]; output: string; file: string; artifacts: Record<string, string>;
  open: (options: BrowserContextOptions) => Promise<Page>;
};

/** Each bundle's browser context beyond the shared mode, motion and desktop viewport, and the page it loads. */
const CONTEXTS: Partial<Record<Bundle, { options?: BrowserContextOptions; path?: string }>> = {
  'date-picker': { options: { timezoneId: 'America/New_York' } },
  'direction-locale': { path: '?dir=rtl' },
  'narrow-touch': { options: { viewport: { width: 390, height: 844 }, hasTouch: true, timezoneId: 'America/New_York' } },
};

export const settle = (page: Page) => page.evaluate(async () => {
  await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
  await Promise.all(document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
});
export const computedColors = (page: Page, values: Record<string, string>) => page.evaluate((values) => {
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

async function hydration({ browser, contextOptions, url, page, check, table, mode, id, engine, layout, log, errors, output, file, artifacts }: Cell) {
  const { portal: dialog } = sceneProbes(page);
  const trigger = page.getByRole('button', { name: 'Edit Aster', exact: true });
  const hydrated = await hydrationState(page);
  let server: HydrationState = { attributes: {}, content: null };
  await check('server-render', { status: 200, theme: mode, proofMode: mode, content: true, stylesheets: true }, async () => {
    const context = await browser.newContext({ ...contextOptions, javaScriptEnabled: false });
    try {
      await context.addCookies([{ name: 'proof-mode', value: mode, url }]);
      const serverPage = await context.newPage();
      const response = await serverPage.goto(url, { waitUntil: 'networkidle' });
      artifacts.server = `${file}.server.html`;
      await writeFile(join(output, artifacts.server), (await response?.text()) ?? '');
      server = await hydrationState(serverPage);
      const stylesheets = await serverPage.evaluate(() => document.querySelectorAll('link[rel="stylesheet"]').length > 0);
      return { status: response?.status() ?? null, theme: server.attributes['data-theme'], proofMode: server.attributes['data-proof-mode'], content: !!server.content, stylesheets };
    } finally { await context.close(); }
  });
  await check('hydration', [], async () => hydrationProblems({ server, hydrated, ready: await page.evaluate(() => document.body.dataset.hydrated === 'true'), errors: [...errors] }));
  await check('assets', { failed: [], styled: true }, async () => ({
    failed: log.failedRequests.filter((entry) => entry.required).map((entry) => entry.url),
    styled: await page.evaluate(() => [...document.styleSheets].some((sheet) => { try { return sheet.cssRules.length > 0; } catch { return false; } })),
  }));
  await check('dialog-keyboard', { open: true, focusInside: true, portalled: true }, async () => {
    await page.mouse.move(0, 0);
    await trigger.focus();
    await page.keyboard.press('Enter');
    await dialog.waitFor();
    await settle(page);
    return dialog.evaluate((element) => ({ open: element.checkVisibility(), focusInside: element.contains(document.activeElement), portalled: element.closest('main') === null }));
  });
  const snapshot = await consumerValues(page, table, mode, id, layout, 'css', engine).catch((error: unknown) => new Error(`values unavailable: ${error}`));
  const measured = snapshot instanceof Error ? undefined : snapshot;
  const values = <T>(pick: (values: NonNullable<typeof measured>) => T) => async () => { if (!measured) throw snapshot; return pick(measured); };
  const mismatched = (variables: Record<string, { expected: string; actual: string }>) => Object.entries(variables).filter(([, value]) => value.actual !== value.expected).map(([token]) => token);
  await check('extraction', measured?.extraction.expected ?? 'measured', values((current) => current.extraction.actual));
  await check('theme', { root: [], control: [], paint: measured && { root: measured.expected.root, control: measured.expected.control, status: measured.expected.status }, colorScheme: mode }, values((current) => ({
    root: mismatched(current.variables), control: mismatched(current.controlVariables), paint: { root: current.actual.root, control: current.actual.control, status: current.actual.status }, colorScheme: current.colorScheme,
  })));
  await check('portal-theme', { tokens: [], paint: measured?.expected.portal, colorScheme: mode }, values((current) => ({ tokens: mismatched(current.portalVariables), paint: current.actual.portal, colorScheme: current.portal.colorScheme })));
  await check('escape-focus-return', { closed: true, focused: true }, async () => {
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    return { closed: await dialog.count() === 0, focused: await trigger.evaluate((element) => element === document.activeElement) };
  });
}


/** One Date Picker's parts, found inside its labelled region or, for its popup, by its open state. */
function picker(page: Page, region: string) {
  const root = page.getByRole('region', { name: region, exact: true });
  const content = page.locator('[data-scope="date-picker"][data-part="content"][data-state="open"]');
  return {
    root, content,
    trigger: root.locator('[data-part="trigger"]'),
    clear: root.locator('[data-part="clear-trigger"]'),
    day: (iso: string) => content.locator(`[data-part="table-cell-trigger"][data-value="${iso}"]`),
    prev: content.locator('[data-part="prev-trigger"]'),
    next: content.locator('[data-part="next-trigger"]'),
    async month(label: string) {
      const index = (text: string) => { const date = new Date(`1 ${text}`); return date.getFullYear() * 12 + date.getMonth(); };
      for (let step = 0; step < 36; step++) {
        const shown = (await content.locator('[data-part="range-text"]').first().textContent())?.trim() ?? '';
        if (shown === label) return;
        await (index(shown) < index(label) ? this.next : this.prev).click();
      }
      throw new Error(`calendar never showed ${label}`);
    },
  };
}

/** The Schedule form's fields, outputs and the Date Picker commit gesture: type the text, then Enter. */
function schedule(page: Page) {
  const form = page.getByRole('form', { name: 'Schedule', exact: true });
  const output = (name: string) => form.getByRole('status', { name, exact: true });
  const read = async (name: string) => (await output(name).textContent())?.trim() ?? '';
  const events = async () => JSON.parse(await read('Date events') || '[]') as unknown[];
  return {
    form, read,
    release: picker(page, 'Release picker'),
    sprint: picker(page, 'Sprint picker'),
    input: form.getByRole('textbox', { name: 'Release date', exact: true }),
    start: form.getByRole('textbox', { name: 'Sprint start', exact: true }),
    end: form.getByRole('textbox', { name: 'Sprint end', exact: true }),
    async commit(field: Locator, value: string) {
      await field.click();
      await field.press('ControlOrMeta+a');
      await field.pressSequentially(value);
      await field.press('Enter');
      await settle(page);
    },
    /** The onValueChange payloads an action fires. */
    async fired(action: () => Promise<void>) {
      const before = (await events()).length;
      await action();
      await settle(page);
      return (await events()).slice(before);
    },
    async submit() {
      await form.getByRole('button', { name: 'Submit schedule', exact: true }).click();
      await output('Schedule result').filter({ hasText: /\S/ }).waitFor();
      return JSON.parse(await read('Schedule result')) as Record<string, string[]>;
    },
  };
}

const releaseEvent = (value: string[], text: string[]) => ({ picker: 'release', value, text });

async function datePicker({ page, check, open }: Cell) {
  const date = schedule(page);
  const { release, sprint, input } = date;
  const state = async () => ({ input: await input.inputValue(), value: await date.read('Release value') });
  await date.form.scrollIntoViewIfNeeded();
  await check('commit-typed', { input: '02/29/2024', value: '2024-02-29', events: [releaseEvent(['2024-02-29'], ['02/29/2024'])] }, async () => {
    const events = await date.fired(() => date.commit(input, '02/29/2024'));
    return { ...(await state()), events };
  });
  // Zag's input drops letters, and the fixture's parser rejects an impossible date, so each commit keeps the value and fires nothing.
  const kept = { input: '02/29/2024', value: '2024-02-29', events: [] };
  await check('invalid-input', { abc: kept, '04/31/2024': kept, '13/45/2024': kept, '2/30/2024': kept }, async () => {
    const result: Record<string, unknown> = {};
    for (const text of ['abc', '04/31/2024', '13/45/2024', '2/30/2024']) {
      const events = await date.fired(async () => { await date.commit(input, text); await page.keyboard.press('Tab'); });
      result[text] = { ...(await state()), events };
    }
    return result;
  });
  await check('controlled-update', { input: '11/03/2024', value: '2024-11-03', events: [] }, async () => {
    const events = await date.fired(() => date.form.getByRole('button', { name: 'Use fall-back day', exact: true }).click());
    return { ...(await state()), events };
  });
  await check('clear', { input: '', value: '', events: [releaseEvent([], [])] }, async () => {
    const events = await date.fired(() => release.clear.click());
    return { ...(await state()), events };
  });
  await check('calendar-selection', { input: '03/10/2024', value: '2024-03-10', events: [releaseEvent(['2024-03-10'], ['03/10/2024'])], closed: true }, async () => {
    const events = await date.fired(async () => {
      await release.trigger.click();
      await release.content.waitFor();
      await release.month('March 2024');
      await release.day('2024-03-10').click();
      await release.content.waitFor({ state: 'hidden' });
    });
    return { ...(await state()), events, closed: !(await release.content.count()) };
  });
  await check('min-max-unavailable', {
    unavailable: { marked: true, value: '2024-03-10', events: [] },
    min: { dayDisabled: true, prevDisabled: true, typed: '2024-01-15' },
    max: { dayDisabled: true, nextDisabled: true, typed: '2024-12-15' },
  }, async () => {
    await release.trigger.click();
    await release.content.waitFor();
    const marked = await release.day('2024-03-13').evaluate((element) => element.hasAttribute('data-unavailable'));
    const events = await date.fired(() => release.day('2024-03-13').click({ force: true }));
    const unavailable = { marked, value: await date.read('Release value'), events };
    await release.month('January 2024');
    const disabled = (locator: Locator) => locator.evaluate((element) => element.hasAttribute('data-disabled') || (element as HTMLButtonElement).disabled);
    const min = { dayDisabled: await disabled(release.day('2024-01-10')), prevDisabled: await disabled(release.prev), typed: '' };
    await page.keyboard.press('Escape');
    await release.content.waitFor({ state: 'hidden' });
    await date.commit(input, '01/10/2024');
    min.typed = await date.read('Release value');
    await date.commit(input, '12/20/2024');
    const typed = await date.read('Release value');
    await release.trigger.click();
    await release.content.waitFor();
    await release.month('December 2024');
    const max = { dayDisabled: await disabled(release.day('2024-12-16')), nextDisabled: await disabled(release.next), typed };
    await page.keyboard.press('Escape');
    await release.content.waitFor({ state: 'hidden' });
    return { unavailable, min, max };
  });
  const sprintEvents = [{ picker: 'sprint', value: ['2024-03-09'], text: ['09/03/2024'] }, { picker: 'sprint', value: ['2024-03-09', '2024-03-11'], text: ['09/03/2024', '11/03/2024'] }];
  await check('range-en-gb', { start: '09/03/2024', end: '11/03/2024', value: '2024-03-09 2024-03-11', events: sprintEvents }, async () => {
    const events = await date.fired(async () => {
      await date.commit(date.start, '09/03/2024');
      await date.commit(date.end, '11/03/2024');
    });
    return { start: await date.start.inputValue(), end: await date.end.inputValue(), value: await date.read('Sprint value'), events };
  });
  await check('submitted-dates', { release: ['02/29/2024'], releaseIso: ['2024-02-29'], sprint: ['09/03/2024', '11/03/2024'], sprintEnd: ['2024-03-11'], sprintStart: ['2024-03-09'] }, async () => {
    await date.commit(input, '02/29/2024');
    return date.submit();
  });
  await check('reset', { release: '', start: '', end: '', value: '', sprint: '', result: '' }, async () => {
    await date.form.getByRole('button', { name: 'Reset schedule', exact: true }).click();
    await settle(page);
    return { release: await input.inputValue(), start: await date.start.inputValue(), end: await date.end.inputValue(), value: await date.read('Release value'), sprint: await date.read('Sprint value'), result: await date.read('Schedule result') };
  });
  const typed = [['03/10/2024', '2024-03-10'], ['11/03/2024', '2024-11-03'], ['02/29/2024', '2024-02-29']] as const;
  const zones = ['UTC', 'America/New_York'];
  await check('time-zones', Object.fromEntries(zones.map((zone) => [zone, {
    zone,
    typed: typed.map(([text, iso]) => ({ release: [text], releaseIso: [iso] })),
    picked: [{ release: ['03/10/2024'], releaseIso: ['2024-03-10'] }, { release: ['11/03/2024'], releaseIso: ['2024-11-03'] }, { release: ['02/29/2024'], releaseIso: ['2024-02-29'] }],
  }])), async () => {
    const result: Record<string, unknown> = {};
    for (const zone of zones) {
      const other = await open({ timezoneId: zone });
      const zoned = schedule(other);
      const submitted = async () => { const { release, releaseIso } = await zoned.submit(); return { release, releaseIso }; };
      const typedRows = [];
      for (const [text] of typed) {
        await zoned.commit(zoned.input, text);
        typedRows.push(await submitted());
      }
      const picked = [];
      for (const [label, iso] of [['March 2024', '2024-03-10'], ['November 2024', '2024-11-03'], ['February 2024', '2024-02-29']]) {
        await zoned.release.trigger.click();
        await zoned.release.content.waitFor();
        await zoned.release.month(label!);
        await zoned.release.day(iso!).click();
        await zoned.release.content.waitFor({ state: 'hidden' });
        picked.push(await submitted());
      }
      result[zone] = { zone: await other.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone), typed: typedRows, picked };
    }
    return result;
  });
}
const box = (locator: Locator) => locator.evaluate((element) => { const rect = element.getBoundingClientRect(); return { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) }; });
const near = (a: number, b: number) => Math.abs(a - b) <= 2;
/** A geometry fact, or the measurements that broke it, so a failure carries its evidence. */
const holds = (ok: boolean, evidence: Record<string, unknown>) => ok || evidence;
const focusedName = (page: Page) => page.evaluate(() => document.activeElement?.textContent?.trim() ?? null);

async function directionLocale({ page, check }: Cell) {
  const nav = page.getByRole('navigation', { name: 'مساحة العمل', exact: true });
  const link = (name: string) => nav.getByRole('link', { name, exact: true });
  const tab = (name: string) => page.getByRole('tab', { name, exact: true });
  const tabNames = ['نظرة عامة', 'الأعضاء', 'الإعدادات'];
  const region = page.getByRole('combobox', { name: 'المنطقة', exact: true });
  const date = picker(page, 'منتقي التاريخ');
  const dateInput = date.root.getByRole('textbox', { name: 'تاريخ الإطلاق', exact: true });
  const openCalendar = async () => { await date.trigger.click(); await date.content.waitFor(); await settle(page); };
  const closeCalendar = async () => { await page.keyboard.press('Escape'); await date.content.waitFor({ state: 'hidden' }); };
  await check('rtl-document', { dir: 'rtl', lang: 'ar', direction: 'rtl', overflow: false }, () => page.evaluate(() => ({
    dir: document.documentElement.dir, lang: document.documentElement.lang, direction: getComputedStyle(document.body).direction,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  })));
  const labels = ['nav', 'المشاريع', 'النشاط', 'tablist', ...tabNames, 'المنطقة', 'تاريخ الإطلاق', 'فتح التقويم', 'مسح التاريخ', 'الشهر السابق', 'الشهر التالي'];
  await check('translated-labels', Object.fromEntries(labels.map((name) => [name, 1])), async () => {
    const counts: Record<string, number> = {
      nav: await nav.count(), 'المشاريع': await link('المشاريع').count(), 'النشاط': await link('النشاط').count(),
      tablist: await page.getByRole('tablist', { name: 'أقسام المشروع', exact: true }).count(),
      ...Object.fromEntries(await Promise.all(tabNames.map(async (name) => [name, await tab(name).count()]))),
      'المنطقة': await region.count(), 'تاريخ الإطلاق': await dateInput.count(),
      'فتح التقويم': await date.root.getByRole('button', { name: 'فتح التقويم', exact: true }).count(),
      'مسح التاريخ': await date.root.getByRole('button', { name: 'مسح التاريخ', exact: true }).count(),
    };
    await openCalendar();
    for (const name of ['الشهر السابق', 'الشهر التالي']) counts[name] = await date.content.getByRole('button', { name, exact: true }).count();
    await closeCalendar();
    return counts;
  });
  await check('navigation-layout', { panelAtInlineStart: true, mainAfterPanel: true, panelBorder: 'left', activeMark: 'right' }, async () => {
    const panel = await box(nav);
    const main = await box(page.locator('main'));
    const side = (locator: Locator, part: 'border' | 'mark') => locator.evaluate((element, part) => {
      const css = getComputedStyle(element);
      const [left, right] = [css.borderLeftWidth !== '0px' && (part === 'border' || css.borderLeftColor !== 'rgba(0, 0, 0, 0)'), css.borderRightWidth !== '0px' && (part === 'border' || css.borderRightColor !== 'rgba(0, 0, 0, 0)')];
      return left && !right ? 'left' : right && !left ? 'right' : `${css.borderLeftWidth} ${css.borderRightWidth}`;
    }, part);
    const viewport = await page.evaluate(() => document.documentElement.clientWidth);
    return { panelAtInlineStart: holds(near(panel.right, viewport), { panel, viewport }), mainAfterPanel: holds(main.right <= panel.left + 1, { main, panel }), panelBorder: await side(nav, 'border'), activeMark: await side(link('المشاريع'), 'mark') };
  });
  await check('navigation-keyboard', { focused: 'النشاط', heading: 'النشاط', current: 'page' }, async () => {
    await link('المشاريع').focus();
    await page.keyboard.press('Tab');
    const focused = await focusedName(page);
    await page.keyboard.press('Enter');
    await settle(page);
    return { focused, heading: (await page.locator('main h1').textContent())?.trim(), current: await link('النشاط').getAttribute('aria-current') };
  });
  await check('tabs-layout', { order: 'right-to-left', firstAtInlineStart: true }, async () => {
    const boxes = await Promise.all(tabNames.map((name) => box(tab(name))));
    const list = await box(page.getByRole('tablist'));
    return { order: boxes.every((rect, index) => !index || rect.right <= boxes[index - 1]!.left + 1) ? 'right-to-left' : boxes, firstAtInlineStart: holds(near(boxes[0]!.right, list.right), { first: boxes[0], list }) };
  });
  await check('tabs-indicator', { underSelected: true }, async () => {
    const selected = await box(tab(tabNames[0]!));
    const indicator = await box(page.getByRole('tablist').locator('[data-part], span').last());
    return { underSelected: holds(near(indicator.left, selected.left) && near(indicator.width, selected.width), { indicator, selected }) };
  });
  await check('tabs-arrows', { left: 'الأعضاء', selected: 'الأعضاء', panel: 'أعضاء الفريق', right: 'نظرة عامة' }, async () => {
    await tab(tabNames[0]!).focus();
    await page.keyboard.press('ArrowLeft');
    const left = await focusedName(page);
    await page.keyboard.press('Enter');
    await settle(page);
    const selected = (await page.getByRole('tab', { selected: true }).textContent())?.trim();
    const panel = (await page.getByRole('tabpanel').textContent())?.trim();
    await page.keyboard.press('ArrowRight');
    return { left, selected, panel, right: await focusedName(page) };
  });
  const listbox = page.getByRole('listbox');
  await check('select-layout', { iconAtInlineEnd: true, popupDirection: 'rtl', textAtInlineStart: true, alignedWithValue: true }, async () => {
    const value = await box(region.locator('[data-part="value"], span').first());
    const icon = await box(region.locator('svg').first());
    await region.click();
    await listbox.waitFor();
    await settle(page);
    const option = page.getByRole('option', { name: 'الشمال', exact: true });
    const text = await box(option.getByText('الشمال', { exact: true }));
    const row = await box(option);
    const direction = await listbox.evaluate((element) => getComputedStyle(element).direction);
    await page.keyboard.press('Escape');
    await listbox.waitFor({ state: 'hidden' });
    return { iconAtInlineEnd: holds(icon.right <= value.left, { icon, value }), popupDirection: direction, textAtInlineStart: holds(text.right > row.left + row.width / 2, { text, row }), alignedWithValue: holds(near(text.right, value.right), { text, value }) };
  });
  await check('select-keyboard', { value: 'الشرق', focused: true }, async () => {
    await page.mouse.move(0, 0);
    await region.focus();
    await page.keyboard.press('ArrowDown');
    await listbox.waitFor();
    const target = page.getByRole('option', { name: 'الشرق', exact: true }).and(page.locator('[data-highlighted]'));
    for (let index = 0; index < 6 && !(await target.count()); index++) {
      await page.keyboard.press('ArrowDown');
      await settle(page);
    }
    await page.keyboard.press('Enter');
    await listbox.waitFor({ state: 'hidden' });
    return { value: (await region.textContent())?.trim(), focused: await region.evaluate((element) => element === document.activeElement) };
  });
  await check('date-picker-layout', { triggerAtInlineEnd: true, weekStartsAtRight: true, prevAtInlineStart: true, popupAtInlineStart: true }, async () => {
    const control = await box(date.root.locator('[data-part="control"]'));
    const field = await box(dateInput);
    const trigger = await box(date.trigger);
    await openCalendar();
    const headers = date.content.locator('th');
    const first = await box(headers.first());
    const last = await box(headers.last());
    const prev = await box(date.prev);
    const next = await box(date.next);
    const popup = await box(date.content);
    await closeCalendar();
    return { triggerAtInlineEnd: holds(trigger.right <= field.left, { trigger, field }), weekStartsAtRight: holds(first.left > last.left, { first, last }), prevAtInlineStart: holds(prev.left > next.left, { prev, next }), popupAtInlineStart: holds(near(popup.right, control.right), { popup, control }) };
  });
  await check('date-picker-glyphs', { prev: 'right', next: 'left' }, async () => {
    await openCalendar();
    const pointing = (locator: Locator) => locator.evaluate((element) => {
      const path = element.querySelector('path') as SVGPathElement;
      const matrix = path.getScreenCTM()!;
      const start = path.getPointAtLength(0).matrixTransform(matrix);
      const apex = path.getPointAtLength(path.getTotalLength() / 2).matrixTransform(matrix);
      return apex.x > start.x ? 'right' : 'left';
    });
    const result = { prev: await pointing(date.prev), next: await pointing(date.next) };
    await closeCalendar();
    return result;
  });
  await check('date-picker-keys', { opened: '2024-02-29', left: '2024-03-01', right: '2024-02-29' }, async () => {
    await openCalendar();
    const focused = () => page.evaluate(() => document.activeElement?.getAttribute('data-value') ?? null);
    await page.waitForFunction(() => document.activeElement?.hasAttribute('data-value'));
    const opened = await focused();
    const press = async (key: string) => { await page.keyboard.press(key); await settle(page); return focused(); };
    const left = await press('ArrowLeft');
    const right = await press('ArrowRight');
    await closeCalendar();
    return { opened, left, right };
  });
}

async function narrowTouch({ page, check: record }: Cell) {
  // A check that leaves an overlay open would hide the next one's controls; close it so each check stands alone.
  const check: Check = async (name, expected, action) => {
    for (let index = 0; index < 3 && await page.locator('[role="dialog"]:visible, [role="listbox"]:visible, [data-scope="date-picker"][data-part="content"][data-state="open"]').count(); index++) {
      await page.keyboard.press('Escape');
      await settle(page);
    }
    await record(name, expected, action);
  };
  const width = () => page.evaluate(() => document.documentElement.scrollWidth);
  const fits = async (locator: Locator) => { const rect = await box(locator); return rect.left >= 0 && rect.right <= 390; };
  await check('touch-context', { width: 390, touch: true, scrollWidth: 390 }, async () => ({
    ...(await page.evaluate(() => ({ width: innerWidth, touch: matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 }))),
    scrollWidth: await width(),
  }));
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  const drawer = page.getByRole('dialog', { name: 'Workspace', exact: true });
  const heading = async () => (await page.locator('main h1').textContent())?.trim();
  const openDrawer = async () => { await menu.tap(); await drawer.waitFor(); await settle(page); };
  await check('navigation-drawer', { fits: true, navigated: 'Activity', restored: 'Projects', dismissed: true }, async () => {
    await openDrawer();
    const drawerFits = await fits(drawer);
    await drawer.getByRole('link', { name: 'Activity', exact: true }).tap();
    await drawer.waitFor({ state: 'hidden' });
    const navigated = await heading();
    await openDrawer();
    await drawer.getByRole('link', { name: 'Projects', exact: true }).tap();
    await drawer.waitFor({ state: 'hidden' });
    const restored = await heading();
    await openDrawer();
    const panel = await box(drawer);
    await page.touchscreen.tap(Math.round((panel.right + 390) / 2), 400);
    const dismissed = await drawer.waitFor({ state: 'hidden' }).then(() => true, () => false);
    return { fits: drawerFits, navigated, restored, dismissed };
  });
  await check('dialog-touch', { fits: true, closed: true, focusInside: true }, async () => {
    const dialog = page.getByRole('dialog', { name: 'Edit Aster', exact: true });
    await page.getByRole('button', { name: 'Edit Aster', exact: true }).tap();
    await dialog.waitFor();
    await settle(page);
    const dialogFits = await fits(dialog);
    const focusInside = await focusedInside(page, '[role="dialog"]');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).tap();
    await dialog.waitFor({ state: 'hidden' });
    return { fits: dialogFits, closed: !(await dialog.count()), focusInside };
  });
  await check('select-touch', { fits: true, value: 'Priya Shah' }, async () => {
    const owner = page.getByRole('combobox', { name: 'Owner', exact: true });
    await owner.tap();
    await page.getByRole('listbox').waitFor();
    await settle(page);
    const listFits = await fits(page.getByRole('listbox'));
    await page.getByRole('option', { name: 'Priya Shah', exact: true }).tap();
    await page.getByRole('listbox').waitFor({ state: 'hidden' });
    return { fits: listFits, value: (await owner.textContent())?.trim() };
  });
  await check('popover-dismiss', { opened: true, dismissed: true }, async () => {
    const popup = page.getByRole('dialog', { name: 'dark scope popup', exact: true });
    await page.getByRole('button', { name: 'Open dark scope', exact: true }).tap();
    await popup.waitFor();
    await settle(page);
    const opened = await popup.isVisible();
    await page.touchscreen.tap(4, 4);
    await popup.waitFor({ state: 'hidden' });
    return { opened, dismissed: !(await popup.count()) };
  });
  await check('date-touch', { fits: true, picked: '2024-02-29', closed: true, typed: '2024-11-03' }, async () => {
    const date = schedule(page);
    await date.release.trigger.tap();
    await date.release.content.waitFor();
    await settle(page);
    const calendarFits = await fits(date.release.content);
    await date.release.day('2024-02-29').tap();
    await date.release.content.waitFor({ state: 'hidden' });
    const picked = await date.read('Release value');
    const closed = !(await date.release.content.count());
    await date.input.tap();
    await date.input.press('ControlOrMeta+a');
    await date.input.pressSequentially('11/03/2024');
    await date.input.press('Enter');
    await settle(page);
    return { fits: calendarFits, picked, closed, typed: await date.read('Release value') };
  });
  await check('reach-controls', [], () => page.evaluate(() => {
    const selector = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="combobox"], [role="checkbox"], [role="tab"], [tabindex="0"]';
    const controls = [...document.querySelectorAll<HTMLElement>(selector)].filter((element) => element.getClientRects().length > 0 && !element.closest('[aria-hidden="true"], [inert]'));
    return controls.flatMap((element) => {
      element.scrollIntoView({ block: 'center', inline: 'nearest' });
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const reachable = rect.left >= 0 && rect.right <= innerWidth && !!hit && (element.contains(hit) || !!hit.closest('label')?.contains(element));
      const name = element.getAttribute('aria-label') ?? (element as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? element.textContent?.trim() ?? element.tagName;
      return reachable ? [] : [`${name} at ${Math.round(rect.left)}-${Math.round(rect.right)}`];
    });
  }));
}


const EXERCISES: Record<Bundle, (cell: Cell) => Promise<void>> = { 'theme-css': themeCss, 'overlay-keyboard': overlayKeyboard, form, 'date-picker': datePicker, 'direction-locale': directionLocale, 'narrow-touch': narrowTouch, hydration, lifecycle };

export type BundleSnapshot = {
  id: string; engine: Engine; bundle: Bundle; mode: 'dark' | 'light';
  browser: { name: Engine; version: string }; userAgent: string | null; platform: NonNullable<ConsumerReport['platform']>; fixture: NonNullable<ConsumerReport['fixture']>;
  assertions: Assertion[]; failures: string[]; durationMs: number; reproduceArgv: string[]; reproduce: string; artifacts: Record<string, string>;
};

const platformIdentity = () => ({ os: type(), release: release(), arch: arch() });

async function runCell(browser: Browser, engine: Engine, id: string, url: string, output: string, report: ConsumerReport, tables: ResolvedDraft, stock: ResolvedDraft, fixture: NonNullable<ConsumerReport['fixture']>, fault?: string) {
  const started = Date.now();
  const [layout, exercise, , name] = id.split('/') as [ConsumerLayout, 'bundles' | 'elements', Engine, string];
  const bundle = MATRIX_BUNDLES.find((candidate) => name.startsWith(`${candidate}-`))!;
  const mode = name.endsWith('-dark') ? 'dark' : 'light';
  const file = `${engine}-${name}`;
  const modeFromCookie = bundle === 'hydration';
  const oppositeScheme = mode === 'dark' ? 'light' : 'dark';
  const contextOptions: BrowserContextOptions = { colorScheme: modeFromCookie ? oppositeScheme : mode, reducedMotion: 'no-preference', viewport: { width: 1280, height: 720 }, ...CONTEXTS[bundle]?.options };
  const target = new URL(CONTEXTS[bundle]?.path ?? '', url).href;
  const context = await browser.newContext(contextOptions);
  if (modeFromCookie) await context.addCookies([{ name: 'proof-mode', value: mode, url }]);
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const log: BrowserLog = { console: [], pageErrors: [], failedRequests: [] };
  const errors = browserErrors(page, log);
  const extra: BrowserContext[] = [];
  const extraErrors: string[][] = [];
  const open = async (options: BrowserContextOptions) => {
    const other = await browser.newContext({ ...contextOptions, ...options });
    extra.push(other);
    const opened = await other.newPage();
    opened.setDefaultTimeout(5000);
    extraErrors.push(browserErrors(opened, log));
    await opened.goto(target, { waitUntil: 'networkidle' });
    await opened.locator('body[data-hydrated="true"]').waitFor();
    return opened;
  };
  const assertions: Assertion[] = [];
  const failures: string[] = [];
  const artifacts: Record<string, string> = { browser: `${file}.browser.json` };
  const check: Check = async (assertion, expected, action) => {
    let actual: unknown = null;
    let error: string | undefined;
    try { actual = await action(); } catch (caught) { error = String(caught); }
    const held = !error && JSON.stringify(actual) === JSON.stringify(expected);
    const status = held ? 'passed' : RTL_EXCLUSIONS[assertion] && bundle === 'direction-locale' ? 'excluded' : 'failed';
    assertions.push({ name: assertion, expected, actual, status, ...(error ? { error } : {}) });
    if (status === 'failed') failures.push(`${assertion}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${error ? ` (${error})` : ''}`);
  };
  const work = (async () => {
    await page.goto(target, { waitUntil: 'networkidle' });
    await page.locator('body[data-hydrated="true"]').waitFor();
    await EXERCISES[bundle]({ page, check, table: tables[mode], mode, tables, stock: stock[mode], id, engine, layout, browser, contextOptions, url, log, errors, output, file, artifacts, open });
  })();
  work.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = CELL_DEADLINES_MS[bundle];
  try {
    await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timed out after ${deadline / 1000}s`)), deadline); })]);
  } catch (error) { failures.push(String(error)); }
  finally { clearTimeout(timer); }
  for (const assertion of BUNDLE_ASSERTIONS[bundle]) if (!assertions.some((row) => row.name === assertion)) assertions.push({ name: assertion, expected: 'reached', actual: null, status: 'failed', error: 'not reached' });
  for (const other of extra) await other.close().catch(() => {});
  failures.push(...errors, ...extraErrors.flat());
  const userAgent = await page.evaluate(() => navigator.userAgent).catch(() => null);
  await page.screenshot({ path: join(output, `${file}.png`), fullPage: true }).then(() => { artifacts.screenshot = `${file}.png`; }, (error) => failures.push(`screenshot unavailable: ${error}`));
  const trace = failures.length ? `${file}.trace.zip` : undefined;
  await context.tracing.stop(trace ? { path: join(output, trace) } : {}).then(() => { if (trace) artifacts.trace = trace; }, (error) => failures.push(`trace unavailable: ${error}`));
  await context.close();
  await writeFile(join(output, artifacts.browser!), `${JSON.stringify(log, null, 2)}\n`);
  const reproduceArgv = bundleReproduction(engine, fault, layout, exercise);
  const snapshot: BundleSnapshot = { id, engine, bundle, mode, browser: { name: engine, version: browser.version() }, userAgent, platform: report.platform!, fixture, assertions, failures, durationMs: Date.now() - started, reproduceArgv, reproduce: reproduceArgv.join(' '), artifacts };
  await writeFile(join(output, `${file}.values.json`), `${JSON.stringify(snapshot, null, 2)}\n`);
  report.executed.push(id);
  report.cases.push({ id, status: failures.length ? 'failed' : 'passed', snapshot: `${file}.values.json`, failures });
}

/**
 * Runs every requested engine's cells against the one served build. An engine that cannot launch leaves
 * its cells unexecuted and records why, so the run is incomplete rather than passing on fewer engines.
 */
export async function bundleProof(url: string, app: string, report: ConsumerReport, output: string, tables: ResolvedDraft, stock: ResolvedDraft, engines: readonly Engine[], fault?: string, launch = (engine: Engine) => LAUNCHERS[engine].launch({ headless: true })): Promise<void> {
  const fixture = await fixtureIdentity(app, report.layout);
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
      const queue = report.exercise === 'elements' ? elementCases([engine]) : bundleCases([engine], report.layout);
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
  const [layout, exercise, engine, name] = row.id.split('/');
  const bundle = MATRIX_BUNDLES.find((candidate) => name?.startsWith(`${candidate}-`));
  if (value.id !== row.id || value.engine !== engine || value.bundle !== bundle || JSON.stringify(value.failures) !== JSON.stringify(row.failures)) problems.push('snapshot disagrees with its case');
  if (!bundle) return [...problems, 'unknown bundle case'];
  const names = Array.isArray(value.assertions) ? value.assertions.map((assertion) => assertion?.name) : [];
  if (names.length !== BUNDLE_ASSERTIONS[bundle].length || BUNDLE_ASSERTIONS[bundle].some((assertion) => !names.includes(assertion))) problems.push('incomplete bundle assertion inventory');
  const excused = (assertion: Assertion) => assertion.status === 'excluded' && bundle === 'direction-locale' && !!RTL_EXCLUSIONS[assertion.name];
  if (value.assertions?.some((assertion) => assertion.status === 'excluded' && !excused(assertion))) problems.push('an assertion is excluded without a named RTL exclusion');
  if (row.status === 'passed' && value.assertions?.some((assertion) => !excused(assertion) && (assertion.status !== 'passed' || JSON.stringify(assertion.expected) !== JSON.stringify(assertion.actual)))) problems.push('passing cell holds a failed assertion');
  if (!value.browser || value.browser.name !== engine || value.browser.version !== report.versions?.[engine as Engine] || !value.platform?.os || JSON.stringify(value.fixture) !== JSON.stringify(report.fixture)) problems.push('browser, platform or fixture identity disagrees with the report');
  if (JSON.stringify(value.reproduceArgv) !== JSON.stringify(bundleReproduction(engine as Engine, value.reproduceArgv?.includes('--fault') ? value.reproduceArgv.at(-1) : undefined, layout as ConsumerLayout, exercise as 'bundles' | 'elements')) || value.reproduce !== value.reproduceArgv?.join(' ')) problems.push('invalid reproduction');
  if (typeof value.durationMs !== 'number' || value.durationMs < 0) problems.push('missing cell duration');
  for (const kind of ['browser', row.status === 'passed' ? 'screenshot' : 'trace', ...(bundle === 'hydration' ? ['server'] : [])]) if (typeof value.artifacts?.[kind] !== 'string') problems.push(`missing ${kind} artifact`);
  return problems;
}
