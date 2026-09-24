/**
 * The production scenario runner, per Production browser verification in
 * docs/spec/agent-infrastructure.md. It drives the Playwright library against the built docs on an
 * owned loopback server: one browser per run, one fresh context per cell, cells in series. Each cell
 * starts with empty storage and the variant's viewport, color scheme, motion preference, locale and
 * timezone, and its binding reaches the app only through `open`, which waits for the document, the
 * `main` landmark, the self-hosted fonts and a clean asset load. The runner never injects CSS or replaces
 * application code; its page scripts read state, record the storage a cell began with and run the
 * installed axe.
 *
 * A cell passes only when its binding returned, at least one axe check ran clean and the page raised no
 * error, failed same-origin request or console error. An assertion, axe violation or page error is a
 * validation failure. A stuck readiness condition, an expired deadline, a crashed browser or a
 * cancellation is incomplete. There is no retry: a failed attempt stays failed.
 */
import { AssertionError } from 'node:assert';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';

import type { Browser, BrowserContext, ConsoleMessage, Page, Request, Response } from 'playwright';

import type { ProductionContext, ProductionScenario, ProductionVariant } from '../../../scripts/verification/production.ts';

export const RUNNER_VERSION = 1;

/** Initial operational limits from State, readiness and deadlines; hang limits, not budgets. */
export const LIMITS = {
  serverReadinessMs: 30_000,
  navigationMs: 15_000,
  conditionMs: 5_000,
  cellMs: 60_000,
  matrixMs: 600_000,
  teardownMs: 10_000,
};
export type Limits = typeof LIMITS;

export const VIEWPORTS = { desktop: { width: 1280, height: 720 }, narrow: { width: 390, height: 844 } } as const;

/** The self-hosted face the shell sets its text in; a fallback font is not a ready page. */
export const REQUIRED_FACE = 'IBM Plex Sans';

/** The WCAG A/AA rule tags the production axe checks run, colour contrast included. */
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export type Cell = {
  caseId: string;
  scenario: string;
  variant: ProductionVariant;
  /** The binding's repository-relative path. */
  binding: string;
  run: ProductionScenario['run'];
};

export type CellStatus = 'passed' | 'failed' | 'timed_out' | 'cancelled' | 'not_run';

export type AxeRecord = { state: string; url: string; violations: { id: string; impact: string | null; nodes: string[] }[] };

export type CellResult = {
  caseId: string;
  scenario: string;
  variant: ProductionVariant;
  binding: string;
  status: CellStatus;
  /** For `failed`: an assertion, axe or page failure is `validation`; readiness, a crash or setup is `incomplete`. */
  failure: { kind: 'validation' | 'incomplete'; message: string } | null;
  url: string | null;
  startedAt: string | null;
  durationMs: number | null;
  /** localStorage and sessionStorage key counts when the cell's first document started; both must be 0. */
  initialStorage: { local: number; session: number } | null;
  axe: AxeRecord[];
  pageErrors: string[];
  consoleErrors: string[];
  failedRequests: string[];
  /** Run-relative evidence: a settled screenshot for a pass; trace, screenshot, DOM and ARIA snapshot for a failure. */
  artifacts: { kind: 'screenshot' | 'trace' | 'dom' | 'aria'; path: string; label: string }[];
  missingArtifacts: { kind: string; reason: string }[];
};

export type RunnerOptions = {
  baseUrl: string;
  cells: Cell[];
  /** Absolute directory for this runner's evidence; paths in the result are relative to `relativeTo`. */
  evidence: string;
  relativeTo: string;
  /** Revision label stamped on every image's record. */
  revision: string;
  launch: () => Promise<Browser>;
  axeSource: string;
  limits?: Partial<Limits>;
  signal?: AbortSignal;
  onProgress?: (line: string) => void;
};

export type RunnerResult = {
  status: 'passed' | 'failed' | 'incomplete' | 'cancelled';
  browser: { version: string | null; launch: 'launched' | 'failed'; error: string | null };
  limits: Limits;
  cells: CellResult[];
  durationMs: number;
  closeErrors: string[];
};

class Readiness extends Error {}
class Deadline extends Error {}

/** The installed axe-core, which the page runs; never a second copy. */
export function installedAxe(): string {
  const require = createRequire(import.meta.url);
  return readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
}

const slug = (caseId: string) => caseId.replace(/[^a-zA-Z0-9.=-]+/g, '_');

function blank(cell: Cell): CellResult {
  return {
    caseId: cell.caseId,
    scenario: cell.scenario,
    variant: cell.variant,
    binding: cell.binding,
    status: 'not_run',
    failure: null,
    url: null,
    startedAt: null,
    durationMs: null,
    initialStorage: null,
    axe: [],
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
    artifacts: [],
    missingArtifacts: [],
  };
}

function within<T>(promise: Promise<T>, ms: number, error: () => Error): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(error()), Math.max(0, ms));
    }),
  ]).finally(() => clearTimeout(timer));
}

async function poll(condition: () => Promise<boolean>, ms: number, what: string): Promise<void> {
  const until = performance.now() + ms;
  for (;;) {
    if (await condition().catch(() => false)) return;
    if (performance.now() >= until) throw new Readiness(`${what} did not hold within ${ms}ms`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Runs every cell in series on one browser. Never retries. */
export async function runCells(options: RunnerOptions): Promise<RunnerResult> {
  const started = performance.now();
  const limits: Limits = { ...LIMITS, ...options.limits };
  const progress = options.onProgress ?? (() => {});
  const results = options.cells.map(blank);
  const result: RunnerResult = { status: 'incomplete', browser: { version: null, launch: 'failed', error: null }, limits, cells: results, durationMs: 0, closeErrors: [] };
  mkdirSync(options.evidence, { recursive: true });
  const matrixUntil = started + limits.matrixMs;
  const rel = (path: string) => relative(options.relativeTo, path);

  let browser: Browser;
  try {
    browser = await options.launch();
    result.browser = { version: browser.version(), launch: 'launched', error: null };
  } catch (error) {
    result.browser.error = `the browser could not launch: ${message(error)}`;
    for (const cell of results) cell.failure = { kind: 'incomplete', message: result.browser.error };
    result.durationMs = performance.now() - started;
    return result;
  }
  let crashed: string | null = null;
  browser.on('disconnected', () => {
    crashed ??= 'the browser disconnected';
  });

  try {
    for (const [index, cell] of options.cells.entries()) {
      const record = results[index] as CellResult;
      if (options.signal?.aborted) {
        record.failure = { kind: 'incomplete', message: 'the run was cancelled before this cell started' };
        continue;
      }
      if (crashed) {
        record.failure = { kind: 'incomplete', message: `${crashed} before this cell started` };
        continue;
      }
      const remaining = matrixUntil - performance.now();
      if (remaining <= 0) {
        record.failure = { kind: 'incomplete', message: `the production matrix deadline of ${limits.matrixMs}ms expired before this cell started` };
        continue;
      }
      progress(`production: ${cell.caseId} started`);
      await runCell(browser, cell, record, { ...options, limits, rel, cellMs: Math.min(limits.cellMs, remaining), crashed: () => crashed });
      progress(`production: ${cell.caseId} ${record.status}${record.failure ? `: ${record.failure.message}` : ''}`);
    }
  } finally {
    try {
      await within(browser.close(), limits.teardownMs, () => new Error('the browser did not close in time'));
    } catch (error) {
      result.closeErrors.push(message(error));
    }
  }
  result.durationMs = performance.now() - started;
  result.status = options.signal?.aborted
    ? 'cancelled'
    : results.some((cell) => cell.status === 'failed' && cell.failure?.kind === 'validation')
      ? 'failed'
      : results.every((cell) => cell.status === 'passed') && result.closeErrors.length === 0 && results.length > 0
        ? 'passed'
        : 'incomplete';
  return result;
}

type CellOptions = RunnerOptions & { limits: Limits; rel: (path: string) => string; cellMs: number; crashed: () => string | null };

async function runCell(browser: Browser, cell: Cell, record: CellResult, options: CellOptions) {
  const begun = performance.now();
  record.startedAt = new Date().toISOString();
  const { limits } = options;
  const origin = new URL(options.baseUrl).origin;
  const base = join(options.evidence, slug(cell.caseId));
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let checkedStorage = false;
  const stop = new AbortController();
  const onCancel = () => stop.abort(new Error('cancelled'));
  options.signal?.addEventListener('abort', onCancel, { once: true });

  const fail = (kind: 'validation' | 'incomplete', text: string) => {
    record.failure ??= { kind, message: text };
  };

  try {
    context = await browser.newContext({
      viewport: VIEWPORTS[cell.variant.viewport],
      deviceScaleFactor: 1,
      colorScheme: cell.variant.mode,
      reducedMotion: cell.variant.motion === 'reduced' ? 'reduce' : 'no-preference',
      locale: 'en-US',
      timezoneId: 'UTC',
      serviceWorkers: 'block',
    });
    await context.tracing.start({ screenshots: true, snapshots: true, title: cell.caseId });
    // Record what storage each document found before any app script ran; `open` reads it for the first one only.
    await context.addInitScript(() => {
      (window as unknown as { __ultimaInitialStorage?: { local: number; session: number } }).__ultimaInitialStorage = {
        local: localStorage.length,
        session: sessionStorage.length,
      };
    });
    page = await context.newPage();
    page.setDefaultTimeout(limits.conditionMs);
    page.setDefaultNavigationTimeout(limits.navigationMs);
    const live = page;
    live.on('pageerror', (error) => record.pageErrors.push(error.message));
    live.on('console', (entry: ConsoleMessage) => {
      if (entry.type() === 'error') record.consoleErrors.push(entry.text());
    });
    live.on('requestfailed', (request: Request) => {
      if (request.url().startsWith(origin)) record.failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText ?? 'failed'}`);
    });
    live.on('response', (response: Response) => {
      if (response.url().startsWith(origin) && response.status() >= 400) record.failedRequests.push(`${response.request().method()} ${new URL(response.url()).pathname}: ${response.status()}`);
    });

    const assetProblems = () => [...record.failedRequests, ...record.pageErrors.map((error) => `page error: ${error}`)];

    /** The document, the main landmark, the self-hosted face and a clean load; a 200 alone is not ready. */
    const ready = async (response: Response | null, what: string) => {
      if (!response || response.status() !== 200) throw new AssertionError({ message: `${what} answered ${response?.status() ?? 'nothing'}, not 200` });
      try {
        await poll(() => live.getByRole('main').first().isVisible(), limits.conditionMs * 2, 'the main landmark');
        await within(
          live.evaluate(() => document.fonts.ready.then(() => undefined)),
          limits.conditionMs,
          () => new Readiness('document.fonts.ready did not settle'),
        );
        await poll(
          () =>
            live.evaluate(
              (family) => [...document.fonts].some((face) => face.family.replace(/["']/g, '') === family && face.status === 'loaded'),
              REQUIRED_FACE,
            ),
          limits.conditionMs,
          `the self-hosted ${REQUIRED_FACE} face`,
        );
      } catch (error) {
        // A broken build shows up as a failed asset or page error before readiness gives up: that is a defect, not a hang.
        const problems = assetProblems();
        if (problems.length > 0) throw new AssertionError({ message: `the app never became ready because the build is broken: ${problems.join('; ')}` });
        throw error;
      }
      const problems = assetProblems();
      if (problems.length > 0) throw new AssertionError({ message: `the page loaded with failures: ${problems.join('; ')}` });
    };

    const open = async (pathname: string) => {
      const url = new URL(pathname, options.baseUrl).href;
      record.url = url;
      await ready(await live.goto(url, { waitUntil: 'load' }), pathname);
      if (!checkedStorage) {
        checkedStorage = true;
        record.initialStorage = (await live.evaluate(() => (window as unknown as { __ultimaInitialStorage?: { local: number; session: number } }).__ultimaInitialStorage)) ?? null;
        if (!record.initialStorage || record.initialStorage.local !== 0 || record.initialStorage.session !== 0) {
          throw new AssertionError({ message: `the cell did not start with empty storage: ${JSON.stringify(record.initialStorage)}` });
        }
      }
    };

    const reload = async () => {
      if (!checkedStorage) throw new AssertionError({ message: 'reload before open: the cell has no page to reload' });
      await ready(await live.reload({ waitUntil: 'load' }), `reloading ${new URL(live.url()).pathname}`);
    };

    const axe = async (state: string) => {
      await live.addScriptTag({ content: options.axeSource });
      const found = await live.evaluate(async (tags) => {
        const runner = (window as unknown as { axe: { run(context: Document, options: object): Promise<{ violations: { id: string; impact: string | null; nodes: { target: unknown[] }[] }[] }> } }).axe;
        const results = await runner.run(document, { runOnly: { type: 'tag', values: tags }, rules: { 'color-contrast': { enabled: true } } });
        return results.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map((node) => node.target.join(' ')) }));
      }, AXE_TAGS);
      record.axe.push({ state, url: live.url(), violations: found });
      if (found.length > 0) {
        throw new AssertionError({ message: `axe found ${found.length} violation(s) in the ${state} state: ${found.map((v) => `${v.id} (${v.nodes.join(', ')})`).join('; ')}` });
      }
    };

    const productionContext: ProductionContext = { page: live, variant: cell.variant, open, reload, axe };
    const cancelled = new Promise<never>((_, reject) => stop.signal.addEventListener('abort', () => reject(new Deadline('cancelled')), { once: true }));
    await within(Promise.race([cell.run(productionContext), cancelled]), options.cellMs - (performance.now() - begun), () => new Deadline(`the cell exceeded its ${options.cellMs}ms deadline`));
    if (record.axe.length === 0) throw new Readiness('the binding ran no axe check, so accessibility is unproven');
    const problems = [...record.pageErrors.map((error) => `page error: ${error}`), ...record.consoleErrors.map((error) => `console error: ${error}`), ...record.failedRequests];
    if (problems.length > 0) throw new AssertionError({ message: `the page reported errors: ${problems.join('; ')}` });
    record.status = 'passed';
  } catch (error) {
    if (options.signal?.aborted) {
      record.status = 'cancelled';
      fail('incomplete', 'the run was cancelled while the cell ran');
    } else if (options.crashed()) {
      record.status = 'failed';
      fail('incomplete', `${options.crashed()} while the cell ran: ${message(error)}`);
    } else if (error instanceof Deadline) {
      record.status = 'timed_out';
      fail('incomplete', error.message);
    } else if (error instanceof Readiness) {
      record.status = 'failed';
      fail('incomplete', error.message);
    } else if (!context || !page) {
      record.status = 'failed';
      fail('incomplete', `the cell could not start: ${message(error)}`);
    } else {
      // An assertion, a condition that never held, an axe violation or a broken page: the product failed.
      record.status = 'failed';
      fail('validation', message(error));
    }
  } finally {
    options.signal?.removeEventListener('abort', onCancel);
    await within(evidence(record, cell, context, page, base, options), options.limits.teardownMs, () => new Error('evidence capture exceeded its teardown allowance')).catch((error) =>
      record.missingArtifacts.push({ kind: 'evidence', reason: message(error) }),
    );
    if (context) await within(context.close(), options.limits.teardownMs, () => new Error('the context did not close')).catch((error) => record.missingArtifacts.push({ kind: 'context', reason: message(error) }));
    record.durationMs = performance.now() - begun;
  }
}

async function evidence(record: CellResult, cell: Cell, context: BrowserContext | null, page: Page | null, base: string, options: CellOptions) {
  const label = `${options.revision} ${cell.variant.mode} ${cell.variant.viewport} ${cell.scenario}`;
  const passed = record.status === 'passed';
  const capture = async (kind: CellResult['artifacts'][number]['kind'], path: string, state: string, work: () => Promise<unknown>) => {
    try {
      await work();
      record.artifacts.push({ kind, path: options.rel(path), label: `${label}: ${state}` });
    } catch (error) {
      record.missingArtifacts.push({ kind, reason: message(error) });
    }
  };
  if (page && !page.isClosed() && !options.crashed()) {
    await capture('screenshot', `${base}.png`, passed ? 'settled final state' : 'state at failure', () => page.screenshot({ path: `${base}.png`, fullPage: false, timeout: options.limits.conditionMs }));
    if (!passed) {
      await capture('dom', `${base}.html`, 'DOM at failure', async () => writeFileSync(`${base}.html`, await page.content()));
      await capture('aria', `${base}.aria.yml`, 'accessibility tree at failure', async () => writeFileSync(`${base}.aria.yml`, await page.locator('body').ariaSnapshot({ timeout: options.limits.conditionMs })));
    }
  } else if (!passed) {
    record.missingArtifacts.push({ kind: 'screenshot', reason: 'the page was not usable, so no image was taken' });
  }
  if (context) {
    if (passed) await context.tracing.stop().catch(() => undefined);
    else await capture('trace', `${base}.trace.zip`, 'trace from before navigation', () => context.tracing.stop({ path: `${base}.trace.zip` }));
  }
}
