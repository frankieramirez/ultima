/**
 * The measurement-only Studio observer of Production Studio measurements. It serves
 * the built docs, drives /theme-studio in Chromium, and times application-observed
 * update latency from input-handler entry to the frame after the committed draft and
 * its preview are visible. It asserts no product behavior and registers no scenario:
 * an interaction whose preview, contrast summary or export disagrees with its
 * committed draft is recorded as missing, never as a fast sample.
 *
 *   node --experimental-strip-types scripts/measure/studio.ts --out <dir> [--no-build]
 *     [--sessions 5] [--repetitions 20] [--cells dark-desktop,light-narrow]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

import { parseDraft, serializeDraft } from '../../packages/tokens/src/theme/codec.ts';
import { resolveDraft, stockDraft, type ThemeDraft } from '../../packages/tokens/src/theme/draft.ts';
import { toCss, toRegistryItem, toStylex } from '../../packages/tokens/src/theme/export.ts';
import { gate } from '../../packages/tokens/src/theme/gate.ts';
import { draftFingerprint } from '../../packages/tokens/src/theme/codec.ts';
import { AUTOSAVE_KEY } from '../../packages/tokens/src/theme/autosave.ts';
import { environment, runnerClass, sourceIdentity, treeHash } from './identity.ts';
import { SCHEMA_VERSION, summarizeInteraction } from './protocol.ts';
import { OVERRIDE_TOKEN, studioFixtures, type FixtureId } from './studio-fixtures.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const WORKLOAD_VERSION = 1;
const RANDOM_SEED = 20260923;
const DEADLINE_MS = 10_000;
const BURST_KEYS = 10;

const { values } = parseArgs({
  options: {
    out: { type: 'string' },
    build: { type: 'boolean', default: true },
    sessions: { type: 'string', default: '5' },
    repetitions: { type: 'string', default: '20' },
    cells: { type: 'string' },
    trace: { type: 'boolean', default: true },
  },
  allowNegative: true,
});
if (!values.out) {
  console.error('usage: studio.ts --out <dir> [--no-build] [--sessions 5] [--repetitions 20] [--cells ids]');
  process.exit(2);
}
const out = resolve(values.out);
mkdirSync(out, { recursive: true });
const SESSIONS = Number(values.sessions);
const REPETITIONS = Number(values.repetitions);

type Mode = 'dark' | 'light';
type Cell = { id: string; mode: Mode; viewport: { width: number; height: number }; narrow: boolean };
const CELLS: Cell[] = [
  { id: 'dark-desktop', mode: 'dark', viewport: { width: 1280, height: 720 }, narrow: false },
  { id: 'light-desktop', mode: 'light', viewport: { width: 1280, height: 720 }, narrow: false },
  { id: 'dark-narrow', mode: 'dark', viewport: { width: 390, height: 844 }, narrow: true },
  { id: 'light-narrow', mode: 'light', viewport: { width: 390, height: 844 }, narrow: true },
];
const cells = values.cells ? CELLS.filter((cell) => values.cells!.split(',').includes(cell.id)) : CELLS;

/* ---------- build and serve ---------- */

const dist = join(root, 'apps/docs/dist');
let buildMs: number | null = null;
if (values.build) {
  const started = performance.now();
  execFileSync('pnpm', ['--filter', '@ultima/docs', 'build'], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
  buildMs = performance.now() - started;
}
if (!existsSync(join(dist, 'index.html'))) {
  console.error('apps/docs/dist is absent: build the docs or drop --no-build');
  process.exit(1);
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function serve(): Promise<{ server: Server; origin: string }> {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    let file = normalize(join(dist, path));
    if (file !== dist && !file.startsWith(dist + sep)) {
      response.writeHead(403).end();
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) {
      if (extname(path)) {
        response.writeHead(404).end();
        return;
      }
      file = join(dist, 'index.html');
    }
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(readFileSync(file));
  });
  return new Promise((done) =>
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      done({ server, origin: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}` });
    }),
  );
}

/* ---------- in-page observer ---------- */

type Spec = {
  trigger: 'click' | 'keydown' | 'input';
  require: ('autosave' | 'preview' | 'download' | 'compare' | 'single' | 'exhausted')[];
  pane: string;
  entries?: number;
  autosaveHue?: number;
};

type Observation = {
  timedOut: boolean;
  entries: number;
  eventTimeStamp: number | null;
  marks: Record<string, number>;
  autosave: string | null;
  download: { name: string; text: string } | null;
  paneVars: Record<string, string>;
  contrastText: string | null;
  longTasks: { count: number; totalMs: number; maxMs: number } | null;
  eventTiming: { name: string; durationMs: number; processingMs: number }[] | null;
};

/** Installed before any application script; the same text runs in every compared build. */
function observer({ seed, autosaveKey }: { seed: number; autosaveKey: string }) {
  let state = seed >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  type Armed = {
    spec: Spec;
    entries: number;
    first: number | null;
    last: number | null;
    timeStamp: number | null;
    marks: Record<string, number>;
    autosave: string | null;
    download: { name: string; blob: Blob | undefined } | null;
    paneBefore: string | null;
    contrastBefore: string | null;
    framed: boolean;
    done: Promise<void>;
    resolve: () => void;
  };
  let armed: Armed | null = null;
  const longTasks: { start: number; duration: number }[] = [];
  const events: { name: string; start: number; duration: number; processingStart: number; processingEnd: number }[] = [];
  const supported = (type: string) => PerformanceObserver.supportedEntryTypes.includes(type);
  if (supported('longtask')) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push({ start: entry.startTime, duration: entry.duration });
    }).observe({ type: 'longtask', buffered: true });
  }
  if (supported('event')) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEventTiming[]) {
        events.push({
          name: entry.name,
          start: entry.startTime,
          duration: entry.duration,
          processingStart: entry.processingStart,
          processingEnd: entry.processingEnd,
        });
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  }

  const pane = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
  const contrast = () =>
    document.querySelector('[aria-label="Token contrast"] header')?.textContent?.trim() ?? null;

  function satisfied(a: Armed): boolean {
    if (a.entries < (a.spec.entries ?? 1)) return false;
    return a.spec.require.every((signal) => {
      switch (signal) {
        case 'autosave':
          return (
            a.marks.autosave !== undefined &&
            (a.spec.autosaveHue === undefined || JSON.parse(a.autosave ?? '{}').color?.arcane?.hue === a.spec.autosaveHue)
          );
        case 'preview':
          return a.marks.preview !== undefined;
        case 'download':
          return a.download !== null;
        case 'compare':
          return !!pane('Dark preview') && !!pane('Light preview');
        case 'single':
          return !!pane(a.spec.pane) && !pane(a.spec.pane === 'Dark preview' ? 'Light preview' : 'Dark preview');
        case 'exhausted':
          return !!document.querySelector('aside')?.textContent?.includes('No passing palette in');
      }
    });
  }

  function check() {
    const a = armed;
    if (!a || a.framed || a.first === null || !satisfied(a)) return;
    a.framed = true;
    a.marks.satisfied = performance.now();
    requestAnimationFrame(() => {
      a.marks.frame = performance.now();
      a.resolve();
    });
  }

  function mark(a: Armed, name: string) {
    if (a.first === null) return;
    a.marks[name] = performance.now();
  }

  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key: string, value: string) {
    setItem.call(this, key, value);
    const a = armed;
    if (a && key === autosaveKey && a.first !== null && !a.framed) {
      a.autosave = value;
      mark(a, 'autosave');
      check();
    }
  };
  const blobs = new Map<string, Blob>();
  const createObjectURL = URL.createObjectURL;
  URL.createObjectURL = (object: Blob | MediaSource) => {
    const url = createObjectURL(object);
    if (object instanceof Blob) blobs.set(url, object);
    return url;
  };
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    const a = armed;
    if (a && this.download && a.first !== null && !a.framed) {
      a.download = { name: this.download, blob: blobs.get(this.href) };
      mark(a, 'download');
      check();
    }
    return click.call(this);
  };

  new MutationObserver(() => {
    const a = armed;
    if (!a || a.first === null || a.framed) return;
    const style = pane(a.spec.pane)?.getAttribute('style') ?? null;
    if (style !== a.paneBefore) {
      a.paneBefore = style;
      mark(a, 'preview');
    }
    const text = contrast();
    if (text !== a.contrastBefore) {
      a.contrastBefore = text;
      mark(a, 'contrast');
    }
    check();
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'], characterData: true });

  const onEntry = (event: Event) => {
    const a = armed;
    if (!a || event.type !== a.spec.trigger || a.framed) return;
    const now = performance.now();
    a.entries += 1;
    if (a.first === null) {
      a.first = now;
      a.timeStamp = event.timeStamp;
    }
    a.last = now;
    // A burst completes only on signals after its last input.
    delete a.marks.autosave;
    delete a.marks.preview;
    queueMicrotask(check);
  };
  for (const type of ['click', 'keydown', 'input']) window.addEventListener(type, onEntry, { capture: true });

  (window as unknown as { __ultMeasure: unknown }).__ultMeasure = {
    ready: async () => {
      await document.fonts.ready;
      await new Promise((done) => requestAnimationFrame(done));
      return performance.now();
    },
    arm: (spec: Spec) => {
      let resolve = () => {};
      const done = new Promise<void>((settle) => (resolve = settle));
      armed = {
        spec,
        entries: 0,
        first: null,
        last: null,
        timeStamp: null,
        marks: {},
        autosave: null,
        download: null,
        paneBefore: pane(spec.pane)?.getAttribute('style') ?? null,
        contrastBefore: contrast(),
        framed: false,
        done,
        resolve,
      };
    },
    result: async (deadline: number): Promise<Observation> => {
      const a = armed!;
      const timedOut = await Promise.race([
        a.done.then(() => false),
        new Promise<boolean>((done) => setTimeout(() => done(true), deadline)),
      ]);
      armed = null;
      const start = a.first ?? 0;
      const end = a.marks.frame ?? performance.now();
      const within = longTasks.filter((task) => task.start + task.duration >= start && task.start <= end);
      const target = pane(a.spec.pane);
      const paneVars: Record<string, string> = {};
      if (target) {
        for (const name of Array.from(target.style)) {
          if (name.startsWith('--ult-')) paneVars[name] = target.style.getPropertyValue(name).trim();
        }
      }
      return {
        timedOut,
        entries: a.entries,
        eventTimeStamp: a.timeStamp,
        marks: { entry: start, ...(a.last !== null ? { lastEntry: a.last } : {}), ...a.marks },
        autosave: a.autosave,
        download: a.download ? { name: a.download.name, text: (await a.download.blob?.text()) ?? '' } : null,
        paneVars,
        contrastText: contrast(),
        longTasks: supported('longtask')
          ? {
              count: within.length,
              totalMs: within.reduce((sum, task) => sum + task.duration, 0),
              maxMs: Math.max(0, ...within.map((task) => task.duration)),
            }
          : null,
        eventTiming: supported('event')
          ? events
              .filter((entry) => entry.start >= (a.timeStamp ?? start) - 1 && entry.start <= end)
              .map((entry) => ({
                name: entry.name,
                durationMs: entry.duration,
                processingMs: entry.processingEnd - entry.processingStart,
              }))
          : null,
      };
    },
  };
}

/* ---------- coherence ---------- */

const EXPORTS: Record<string, (draft: ThemeDraft) => string> = {
  'ultima-theme.json': serializeDraft,
  'ultima-theme.css': toCss,
  'ultima-theme.stylex.ts': toStylex,
  'ultima-theme.registry.json': toRegistryItem,
};

function contrastSummary(draft: ThemeDraft): string {
  const failing = gate(resolveDraft(draft)).filter((result) => !result.dark.pass || !result.light.pass).length;
  return failing === 0 ? 'All pairings pass' : `${failing} pairing${failing === 1 ? '' : 's'} failing`;
}

/** Returns why an observation disagrees with its committed draft, or null when coherent. */
function incoherence(observation: Observation, mode: Mode, draft: ThemeDraft, requirePane: boolean): string | null {
  if (requirePane) {
    const resolved = resolveDraft(draft)[mode];
    const names = Object.keys(observation.paneVars);
    if (names.length === 0) return 'preview pane carries no token variables';
    const wrong = names.filter((name) => resolved[name] !== undefined && resolved[name] !== observation.paneVars[name]);
    if (wrong.length > 0) return `preview disagrees with the committed draft on ${wrong.slice(0, 3).join(', ')}`;
    const missing = Object.keys(resolved).filter((name) => !(name in observation.paneVars));
    if (missing.length > 0) return `preview lacks ${missing.slice(0, 3).join(', ')}`;
  }
  const summary = observation.contrastText?.replace(/\s+/g, ' ') ?? '';
  if (!summary.startsWith('Token contrast')) return 'contrast summary absent';
  if (!summary.includes(contrastSummary(draft))) return `contrast summary "${summary}" disagrees with the draft`;
  return null;
}

/* ---------- interactions ---------- */

type Context = { page: Page; cell: Cell; paneLabel: string; current: ThemeDraft; before: ThemeDraft | null };
type Interaction = {
  id: string;
  fixture: FixtureId;
  setup?: (ctx: Context) => Promise<void>;
  spec: (ctx: Context) => Spec;
  act: (ctx: Context) => Promise<void>;
  expect?: (ctx: Context, next: ThemeDraft) => string | null;
  teardown?: (ctx: Context) => Promise<void>;
};

async function showGroup(ctx: Context, label: string) {
  if (!ctx.cell.narrow) return;
  const button = ctx.page.getByRole('group', { name: 'Theme groups' }).getByRole('button', { name: label, exact: true });
  if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
}

const hueSlider = (ctx: Context) => ctx.page.getByRole('slider', { name: 'Accent hue' });

/**
 * Both override fixtures unlink the row, whose inputs are named only "Dark" and
 * "Light", so the mode's swatch anchors the input beside it.
 */
function overrideInput(ctx: Context) {
  return ctx.page
    .getByRole('button', { name: `${OVERRIDE_TOKEN} ${ctx.cell.mode} swatch`, exact: true })
    .locator('xpath=following::input[1]');
}

const editSpec = (ctx: Context, extra: Partial<Spec> = {}): Spec => ({
  trigger: 'click',
  require: ['autosave', 'preview'],
  pane: ctx.paneLabel,
  ...extra,
});

function exportsFor(fixture: FixtureId, suffix: string): Interaction[] {
  return Object.keys(EXPORTS).map((name) => ({
    id: `export-${name.replace('ultima-theme.', '').replace(/\./g, '-')}${suffix}`,
    fixture,
    setup: async (ctx) => {
      await ctx.page.getByRole('button', { name: /^Export/ }).click();
      await ctx.page.getByRole('dialog', { name: 'Export theme' }).waitFor();
    },
    spec: (ctx) => ({ trigger: 'click', require: ['download'], pane: ctx.paneLabel }),
    act: (ctx) => ctx.page.getByRole('dialog', { name: 'Export theme' }).getByRole('button', { name, exact: true }).click(),
    teardown: async (ctx) => {
      await ctx.page.keyboard.press('Escape');
      await ctx.page.getByRole('dialog', { name: 'Export theme' }).waitFor({ state: 'detached' });
    },
  }));
}

function overrideEdit(fixture: FixtureId, suffix: string): Interaction {
  const hex = (ctx: Context) => (ctx.cell.mode === 'dark' ? '#6f7cf0' : '#3344bb');
  return {
    id: `semantic-override${suffix}`,
    fixture,
    // Playwright's fill left this input empty without committing, so select-all and one insertText stand in for typing.
    setup: async (ctx) => {
      await showGroup(ctx, 'Color');
      const trigger = ctx.page.getByRole('button', { name: 'Color token overrides' });
      if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
      await overrideInput(ctx).click();
      await ctx.page.keyboard.press('ControlOrMeta+A');
    },
    spec: (ctx) => editSpec(ctx, { trigger: 'input' }),
    act: (ctx) => ctx.page.keyboard.insertText(hex(ctx)),
    expect: (ctx, next) => {
      const value = next.overrides[ctx.cell.mode][OVERRIDE_TOKEN];
      return value === hex(ctx) ? null : `override is ${value}`;
    },
    teardown: async (ctx) => {
      await ctx.page.getByRole('button', { name: 'Color token overrides' }).click();
    },
  };
}

const resetTheme = (fixture: FixtureId, suffix: string): Interaction => ({
  id: `reset-theme${suffix}`,
  fixture,
  spec: (ctx) => editSpec(ctx),
  act: (ctx) => ctx.page.getByRole('button', { name: 'Reset theme' }).click(),
  expect: (_ctx, next) => (draftFingerprint(next) === draftFingerprint(stockDraft()) ? null : 'reset did not reach stock'),
});

const undo = (fixture: FixtureId, suffix: string): Interaction => ({
  id: `undo${suffix}`,
  fixture,
  spec: (ctx) => editSpec(ctx),
  act: (ctx) => ctx.page.getByRole('button', { name: 'Undo', exact: true }).click(),
  expect: (ctx, next) =>
    ctx.before && draftFingerprint(next) === draftFingerprint(ctx.before) ? null : 'undo did not restore the prior draft',
});

const INTERACTIONS: Interaction[] = [
  {
    id: 'guided-edit',
    fixture: 'customized',
    setup: (ctx) => showGroup(ctx, 'Density'),
    spec: (ctx) => editSpec(ctx),
    act: (ctx) => ctx.page.getByRole('group', { name: 'Density preset' }).getByRole('button', { name: 'Roomy' }).click(),
    expect: (_ctx, next) => (next.density === 1.25 ? null : `density is ${next.density}`),
  },
  {
    id: 'slider-step',
    fixture: 'customized',
    setup: async (ctx) => {
      await showGroup(ctx, 'Color');
      await hueSlider(ctx).focus();
    },
    spec: (ctx) => editSpec(ctx, { trigger: 'keydown', autosaveHue: ctx.current.color.arcane.hue + 1 }),
    act: (ctx) => ctx.page.keyboard.press('ArrowRight'),
    expect: (ctx, next) => (next.color.arcane.hue === ctx.current.color.arcane.hue + 1 ? null : `hue is ${next.color.arcane.hue}`),
  },
  {
    id: 'slider-burst',
    fixture: 'customized',
    setup: async (ctx) => {
      await showGroup(ctx, 'Color');
      await hueSlider(ctx).focus();
    },
    spec: (ctx) =>
      editSpec(ctx, {
        trigger: 'keydown',
        entries: BURST_KEYS,
        autosaveHue: ctx.current.color.arcane.hue + BURST_KEYS,
      }),
    act: async (ctx) => {
      for (let key = 0; key < BURST_KEYS; key += 1) await ctx.page.keyboard.press('ArrowRight');
    },
    expect: (ctx, next) =>
      next.color.arcane.hue === ctx.current.color.arcane.hue + BURST_KEYS ? null : `hue is ${next.color.arcane.hue}`,
  },
  overrideEdit('customized', ''),
  resetTheme('customized', ''),
  undo('customized', ''),
  {
    id: 'preview-compare',
    fixture: 'customized',
    spec: (ctx) => ({ trigger: 'click', require: ['compare'], pane: ctx.paneLabel }),
    act: (ctx) => ctx.page.getByRole('group', { name: 'Preview color mode' }).getByRole('button', { name: 'Compare' }).click(),
  },
  {
    id: 'preview-single',
    fixture: 'customized',
    spec: (ctx) => ({ trigger: 'click', require: ['single'], pane: ctx.paneLabel }),
    act: (ctx) =>
      ctx.page
        .getByRole('group', { name: 'Preview color mode' })
        .getByRole('button', { name: ctx.cell.mode === 'dark' ? 'Dark' : 'Light', exact: true })
        .click(),
  },
  {
    id: 'shuffle-success',
    fixture: 'customized',
    spec: (ctx) => editSpec(ctx),
    act: (ctx) => ctx.page.getByRole('button', { name: 'Shuffle', exact: true }).click(),
    expect: (ctx, next) => (draftFingerprint(next) !== draftFingerprint(ctx.current) ? null : 'shuffle changed nothing'),
  },
  ...exportsFor('customized', ''),
  overrideEdit('max-overrides', '-max'),
  resetTheme('max-overrides', '-max'),
  undo('max-overrides', '-max'),
  ...exportsFor('max-overrides', '-max'),
  {
    id: 'shuffle-exhaustion',
    fixture: 'failing-contrast',
    spec: (ctx) => ({ trigger: 'click', require: ['exhausted'], pane: ctx.paneLabel }),
    act: (ctx) => ctx.page.getByRole('button', { name: 'Shuffle', exact: true }).click(),
  },
];

/* ---------- session driver ---------- */

const { fixtures, setSha256 } = studioFixtures();

type EventRecord = {
  interaction: string;
  fixture: FixtureId;
  durationMs: number | null;
  reason?: string;
  marks: Record<string, number>;
  eventTimeStamp: number | null;
  longTasks: Observation['longTasks'];
  eventTiming: Observation['eventTiming'];
};

async function ready(page: Page, cell: Cell): Promise<number> {
  await page.getByRole('heading', { name: 'Theme Studio' }).waitFor();
  await page.getByRole('region', { name: 'Live preview' }).waitFor();
  const modes = page.getByRole('group', { name: 'Preview color mode' });
  const label = cell.mode === 'dark' ? 'Dark' : 'Light';
  if ((await modes.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed')) !== 'true') {
    await modes.getByRole('button', { name: label, exact: true }).click();
  }
  // Attached, not visible: at 390x844 this revision lays the pane out with zero block size.
  await page.getByRole('region', { name: `${label} preview` }).waitFor({ state: 'attached' });
  return page.evaluate(() => (window as unknown as { __ultMeasure: { ready: () => Promise<number> } }).__ultMeasure.ready());
}

async function load(page: Page, cell: Cell, fixture: FixtureId) {
  await page.evaluate(([key, text]: string[]) => localStorage.setItem(key!, text!), [AUTOSAVE_KEY, fixtures[fixture].text]);
  await page.reload();
  await ready(page, cell);
}

async function runInteraction(ctx: Context, interaction: Interaction): Promise<EventRecord> {
  await interaction.setup?.(ctx);
  const spec = interaction.spec(ctx);
  await ctx.page.evaluate((armSpec: Spec) => (window as unknown as { __ultMeasure: { arm: (s: Spec) => void } }).__ultMeasure.arm(armSpec), spec);
  await interaction.act(ctx);
  const observation = await ctx.page.evaluate(
    (deadline: number) => (window as unknown as { __ultMeasure: { result: (d: number) => Promise<Observation> } }).__ultMeasure.result(deadline),
    DEADLINE_MS,
  );
  await interaction.teardown?.(ctx);

  const base = {
    interaction: interaction.id,
    fixture: interaction.fixture,
    marks: observation.marks,
    eventTimeStamp: observation.eventTimeStamp,
    longTasks: observation.longTasks,
    eventTiming: observation.eventTiming,
  };
  const missing = (reason: string): EventRecord => ({ ...base, durationMs: null, reason });
  if (observation.timedOut) return missing(`no completion within ${DEADLINE_MS} ms (${observation.entries} inputs seen)`);
  if (observation.marks.frame === undefined) return missing('no frame mark');

  let reason: string | null = null;
  if (spec.require.includes('autosave')) {
    const parsed = parseDraft(observation.autosave ?? '');
    if (!parsed.ok) return missing('autosave did not parse');
    reason = interaction.expect?.(ctx, parsed.draft) ?? incoherence(observation, ctx.cell.mode, parsed.draft, true);
    ctx.before = ctx.current;
    ctx.current = parsed.draft;
  } else if (spec.require.includes('download')) {
    const expected = EXPORTS[observation.download?.name ?? ''];
    reason = !expected
      ? `unexpected download ${observation.download?.name}`
      : expected(ctx.current) === observation.download?.text
        ? null
        : `${observation.download?.name} bytes disagree with the committed draft`;
  } else {
    reason = incoherence(observation, ctx.cell.mode, ctx.current, spec.require.includes('single'));
  }
  if (reason) return missing(reason);
  return { ...base, durationMs: observation.marks.frame - observation.marks.entry! };
}

async function sequence(page: Page, cell: Cell): Promise<EventRecord[]> {
  const records: EventRecord[] = [];
  let ctx: Context | null = null;
  let loaded: FixtureId | null = null;
  for (const interaction of INTERACTIONS) {
    if (!ctx || loaded !== interaction.fixture) {
      await load(page, cell, interaction.fixture);
      loaded = interaction.fixture;
      const parsed = parseDraft(fixtures[interaction.fixture].text);
      if (!parsed.ok) throw new Error(`fixture ${interaction.fixture} does not parse`);
      ctx = { page, cell, paneLabel: `${cell.mode === 'dark' ? 'Dark' : 'Light'} preview`, current: parsed.draft, before: null };
    }
    try {
      records.push(await runInteraction(ctx, interaction));
    } catch (error) {
      records.push({
        interaction: interaction.id,
        fixture: interaction.fixture,
        durationMs: null,
        reason: `harness error: ${(error as Error).message.split('\n')[0]}`,
        marks: {},
        eventTimeStamp: null,
        longTasks: null,
        eventTiming: null,
      });
      ctx = null;
    }
  }
  return records;
}

async function newSession(browser: Browser, origin: string, cell: Cell): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: cell.viewport,
    colorScheme: cell.mode,
    reducedMotion: 'no-preference',
    acceptDownloads: true,
  });
  await context.addInitScript(observer, { seed: RANDOM_SEED, autosaveKey: AUTOSAVE_KEY });
  const page = await context.newPage();
  page.setDefaultTimeout(DEADLINE_MS);
  await page.goto(`${origin}/theme-studio`);
  return { context, page };
}

const { server, origin } = await serve();
const browser = await chromium.launch();
const env = environment(root);
const source = sourceIdentity(root);
const results = [];

for (const cell of cells) {
  const sessions: { sessionId: string; firstNavigationMs: number; priming: EventRecord[]; sequences: { index: number; events: EventRecord[] }[] }[] = [];
  for (let n = 0; n < SESSIONS; n += 1) {
    const sessionId = `${cell.id}-s${n + 1}`;
    process.stderr.write(`[studio] ${sessionId}\n`);
    const { context, page } = await newSession(browser, origin, cell);
    const firstNavigationMs = await ready(page, cell);
    const priming = await sequence(page, cell);
    const sequences: { index: number; events: EventRecord[] }[] = [];
    for (let rep = 0; rep < REPETITIONS; rep += 1) sequences.push({ index: rep, events: await sequence(page, cell) });
    await context.close();
    sessions.push({ sessionId, firstNavigationMs, priming, sequences });
  }

  let trace: string | null = null;
  if (values.trace) {
    const { context, page } = await newSession(browser, origin, cell);
    await ready(page, cell);
    const path = join(out, 'traces', `${cell.id}.trace.json`);
    mkdirSync(dirname(path), { recursive: true });
    await browser.startTracing(page, { path, screenshots: false });
    await sequence(page, cell);
    await browser.stopTracing();
    writeFileSync(`${path}.gz`, gzipSync(readFileSync(path)));
    rmSync(path);
    trace = `traces/${cell.id}.trace.json.gz`;
    await context.close();
  }

  const summaries = Object.fromEntries(
    INTERACTIONS.map((interaction) => [
      interaction.id,
      summarizeInteraction(
        sessions.map((session) => ({
          sessionId: session.sessionId,
          events: session.sequences.map(
            (seq) => seq.events.find((event) => event.interaction === interaction.id)?.durationMs ?? null,
          ),
        })),
        SESSIONS,
        REPETITIONS,
      ),
    ]),
  );
  results.push({ cell, sessions, trace, summaries });
}

await browser.close();
server.close();

const supportedEntryTypes = await (async () => {
  const probe = await chromium.launch();
  const page = await probe.newPage();
  const types = await page.evaluate(() => PerformanceObserver.supportedEntryTypes);
  const version = probe.version();
  await probe.close();
  return { types, version };
})();

const report = {
  schemaVersion: SCHEMA_VERSION,
  kind: 'studio-interactions',
  workload: { id: 'studio-production-interactions', version: WORKLOAD_VERSION },
  label: 'application-observed update latency (laboratory, scripted input); not a field INP score',
  conditions: { runnerClass: runnerClass(env), harnessHash: source.harnessSha256, fixtureHash: setSha256 },
  source,
  environment: { ...env, chromium: supportedEntryTypes.version },
  build: {
    command: values.build ? ['pnpm', '--filter', '@ultima/docs', 'build'] : null,
    setupMs: buildMs,
    distSha256: treeHash(root, 'apps/docs/dist'),
    served: 'node:http on 127.0.0.1 port 0, HTML navigation fallback, 404 for missing assets, traversal refused',
  },
  protocol: {
    sessions: SESSIONS,
    repetitions: REPETITIONS,
    priming: 'one unmeasured sequence after the first navigation',
    reset: 'each sequence reloads with the fixture written to the autosave key',
    browserCold: 'every session is a new context: fresh storage and HTTP cache',
    randomSeed: RANDOM_SEED,
    deadlineMs: DEADLINE_MS,
    burstKeys: BURST_KEYS,
    marks: {
      entry: 'capture-phase listener on the triggering event (input-handler entry)',
      autosave: 'first write of the autosave key after entry: the committed draft',
      preview: "first change of the mode pane's inline token variables after entry",
      contrast: 'change of the Token contrast summary after entry, when it changes',
      satisfied: 'every required signal observed',
      frame: 'the next requestAnimationFrame callback after satisfied',
    },
    unavailable: [
      'internal marks for resolveDraft and gate: the unchanged application exposes none',
      'attribution of work to resolveDraft, gate, React, style/layout, shuffle and serialization: traces are retained, but the production build is minified without source maps',
      'observer overhead: not separately measured; the same observer runs in every compared build',
    ],
    supportedEntryTypes: supportedEntryTypes.types,
  },
  fixtures: Object.fromEntries(Object.entries(fixtures).map(([id, fixture]) => [id, { sha256: fixture.sha256, overrides: fixture.overrides, failingPairings: fixture.failingPairings }])),
  cells: results,
  budget: 'report-only',
};
writeFileSync(join(out, 'studio.json'), `${JSON.stringify(report)}\n`);
writeFileSync(join(out, 'studio-fixtures.json'), `${JSON.stringify(Object.fromEntries(Object.entries(fixtures).map(([id, fixture]) => [id, JSON.parse(fixture.text)])), null, 2)}\n`);
for (const result of results) {
  for (const [id, summary] of Object.entries(result.summaries)) {
    console.log(`${result.cell.id} ${id} ${summary.status} median ${summary.sessionMedian?.medianMs.toFixed(1) ?? '-'} p95 ${summary.sessionP95?.medianMs.toFixed(1) ?? '-'} missing ${summary.missing}`);
  }
}
