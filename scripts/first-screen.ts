/**
 * The first-screen exercise harness (docs/spec/adoption-delivery.md#first-screen-exercise). One run gives a
 * fresh coding agent the committed brief and the documented entry command in an empty directory outside any
 * checkout, then measures what it built and writes the run record.
 *
 *   pnpm --filter @ultima/docs build
 *   node --experimental-strip-types scripts/first-screen.ts serve
 *   node --experimental-strip-types scripts/first-screen.ts run --layout vite|next-app|next-src [--root <dir>] [--model <name>] [--timeout <minutes>]
 *   node --experimental-strip-types scripts/first-screen.ts measure <run-dir>
 *
 * The candidate build is served at a loopback origin that stands in for the public host: every
 * `https://ultima.systems` in a served text response and in the served CLI tarball reads as that origin, except the
 * generated DESIGN.md link whose region digest both sides compute, and
 * `/npm/` answers `ultima-design` with the candidate tarball and redirects every other package to npm.
 * The agent runs Claude Code in safe mode, so no CLAUDE.md, memory, skill, plugin, hook or MCP server reaches it.
 */
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, realpathSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { extname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import ts from 'typescript';

import { MIME, isNavigation, resolveFile } from '../apps/docs/scripts/static-server.ts';
import { THEME_REGISTRY_PATH } from '../packages/tokens/src/theme/registry-url.ts';
import { type ExternalReport, externalProof } from './consumer-external.ts';
import { BRIEF, LAYOUTS, type Layout, briefBrand, verdict } from './first-screen-record.ts';
import { packCli, repository, run } from './consumer-helpers.ts';
import { hashSource } from './verification/source.ts';

export const PUBLIC_ORIGIN = 'https://ultima.systems';
export const EVIDENCE = 'docs/evidence/first-screen/runs';
const APP = 'larder';
const NOTES = 'exercise-notes.json';
const DIST = join(repository, 'apps/docs/dist');
const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

/** The generated DESIGN.md link, which the theme worker and the CLI's freshness check must both keep verbatim. */
const DESIGN_LINK = `](${PUBLIC_ORIGIN}/llms.txt) before adding or changing components`;

/** A text with the public origin read as the loopback one, except the generated DESIGN.md link. */
export function rewrite(text: string, origin: string): string {
  return text.split(DESIGN_LINK).map((part) => part.replaceAll(PUBLIC_ORIGIN, origin)).join(DESIGN_LINK);
}

type Served = { origin: string; requests: string[]; close(): Promise<void> };

/** The candidate CLI, packed and with its printed origin moved to the loopback host, as `ultima-design@<version>`. */
async function serveableCli(work: string, origin: string) {
  await run(repository, 'pnpm', ['--filter', 'ultima-design', 'build']);
  const packed = await packCli(work);
  const unpack = join(work, 'cli');
  await mkdir(unpack, { recursive: true });
  await run(unpack, 'tar', ['-xzf', packed]);
  const files = await readdir(join(unpack, 'package'), { recursive: true });
  for (const name of files) {
    const path = join(unpack, 'package', name);
    if (!(await stat(path)).isFile() || !/\.(js|md|json)$/.test(name)) continue;
    const text = await readFile(path, 'utf8');
    if (text.includes(PUBLIC_ORIGIN)) await writeFile(path, rewrite(text, origin));
  }
  const manifest = JSON.parse(await readFile(join(unpack, 'package/package.json'), 'utf8'));
  const served = join(work, `ultima-design-${manifest.version}.tgz`);
  await run(unpack, 'tar', ['-czf', served, 'package']);
  const bytes = await readFile(served);
  return {
    version: manifest.version as string,
    path: served,
    packedDigest: sha256(await readFile(packed)),
    servedDigest: sha256(bytes),
    manifest,
    integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
    shasum: createHash('sha1').update(bytes).digest('hex'),
  };
}

/** Serves the docs build, the theme worker and the npm shim at one loopback origin. */
export async function servePublic(work: string, port = 0): Promise<Served & { cli: Awaited<ReturnType<typeof serveableCli>> }> {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('no docs build: run pnpm --filter @ultima/docs build first');
  const root = realpathSync(DIST);
  const worker = existsSync(join(root, '_worker.js')) ? (await import(pathToFileURL(join(root, '_worker.js')).href)).default : null;
  const requests: string[] = [];
  let origin = '';
  let cli: Awaited<ReturnType<typeof serveableCli>> | undefined;
  const server = createServer(async (request, response) => {
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const log = (status: number) => requests.push(`${method} ${url.pathname}${url.search ? '?…' : ''} ${status}`);
    const text = (status: number, body: string, type: string) => {
      log(status);
      response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
      response.end(method === 'HEAD' ? undefined : body);
    };
    try {
      if (url.pathname.startsWith('/npm/')) {
        const name = decodeURIComponent(url.pathname.slice('/npm/'.length));
        if (name === 'ultima-design' && cli) {
          const { version, manifest, integrity, shasum } = cli;
          const tarball = `${origin}/npm/ultima-design/-/ultima-design-${version}.tgz`;
          return text(200, JSON.stringify({ name, 'dist-tags': { latest: version }, versions: { [version]: { ...manifest, _id: `${name}@${version}`, dist: { tarball, integrity, shasum } } } }), MIME['.json']!);
        }
        if (cli && name === `ultima-design/-/ultima-design-${cli.version}.tgz`) {
          log(200);
          response.writeHead(200, { 'content-type': 'application/octet-stream' });
          return createReadStream(cli.path).pipe(response);
        }
        log(302);
        response.writeHead(302, { location: `https://registry.npmjs.org/${url.pathname.slice('/npm/'.length)}${url.search}` });
        return response.end();
      }
      if (url.pathname === THEME_REGISTRY_PATH && worker) {
        const result: Response = await worker.fetch(new Request(new URL(`${url.pathname}${url.search}`, origin), { method }));
        return text(result.status, rewrite(await result.text(), origin), result.headers.get('content-type') ?? MIME['.json']!);
      }
      if (method !== 'GET' && method !== 'HEAD') return text(405, 'method not allowed', MIME['.txt']!);
      let file = resolveFile(root, url.pathname);
      if (file === 'outside') return text(403, 'outside the build root', MIME['.txt']!);
      // Cloudflare Pages serves a build without a 404.html as a single-page app: an unmatched page path gets index.html.
      if (file === null && isNavigation(method, url.pathname, 'text/html')) file = join(root, 'index.html');
      if (file === null) return text(404, 'not found', MIME['.txt']!);
      const type = MIME[extname(file)] ?? 'application/octet-stream';
      if (/^(text\/|application\/(json|manifest))/.test(type)) return text(200, rewrite(await readFile(file, 'utf8'), origin), type);
      log(200);
      response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
      if (method === 'HEAD') response.end();
      else createReadStream(file).pipe(response);
    } catch (error) {
      text(500, String(error), MIME['.txt']!);
    }
  });
  await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', done); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no loopback address');
  origin = `http://127.0.0.1:${address.port}`;
  cli = await serveableCli(work, origin);
  return {
    origin, requests, cli,
    close: () => new Promise<void>((done) => { server.closeAllConnections(); server.close(() => done()); }),
  };
}

/** Makes the brief's theme in the served Theme Studio: Neutral with the brand generating the Accent palette and a hue accent fill, then Export theme's install command. */
export async function studioTheme(origin: string, brand: string, output: string): Promise<{ command: string; url: string }> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15000);
    await page.goto(`${origin}/theme-studio`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Accent', exact: true }).click();
    const hex = page.getByRole('textbox', { name: 'Accent hex' });
    await hex.fill(brand);
    await hex.press('Enter');
    await page.getByRole('button', { name: 'Generate Accent palette' }).click();
    // Neutral fills accents with ink; the brand accent needs its own hue.
    await page.getByRole('group', { name: 'Accent fill' }).getByRole('button', { name: 'Hue', exact: true }).click();
    await page.getByRole('button', { name: 'Export theme' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Export theme' });
    await dialog.getByRole('button', { name: 'Copy install command' }).waitFor();
    const command = (await dialog.locator('pre').first().textContent())?.trim() ?? '';
    await page.screenshot({ path: join(output, 'studio-export.png') });
    const url = /"([^"]+\/r\/theme\.json\?theme=[^"]+)"/.exec(command)?.[1];
    if (!url) throw new Error(`Export theme showed no URL install command: ${command}`);
    return { command, url };
  } finally {
    await browser.close();
  }
}

export function prompt(brief: string, layout: Layout, origin: string, theme: string): string {
  return [
    brief.trim(),
    '',
    '## This run',
    '',
    `Ultima's public site for this run is ${origin}. Treat it as the public host: its docs, /llms.txt, registry and Theme Studio are there. Do not use any other copy of Ultima, and do not search the web for it. npm resolves \`ultima-design\` to the version served there.`,
    '',
    `Start in this empty directory. The documented entry command for this layout is:`,
    '',
    '```bash',
    `npx ultima-design@latest init ${APP} ${LAYOUTS[layout]}`,
    '```',
    '',
    `The brand theme was made in Theme Studio from the brand color. Its Export theme dialog gave this install command:`,
    '',
    '```bash',
    theme,
    '```',
    '',
    `Build the screen in ./${APP}. Work only in this directory and with the public host above. When you finish, write ./${NOTES} (beside ./${APP}, not inside it) as JSON: { "interventions": [{ "step", "action", "reason" }], "decisions": [{ "choice", "options", "why" }] }. An intervention is any action the guidance or CLI output did not print or link. A decision is any choice about setting up, theming or styling with Ultima that the guidance did not settle and that changed the output; product choices the brief leaves to you, such as data, copy and arrangement, are not decisions here. Empty arrays mean none. Keep scratch files inside this directory.`,
  ].join('\n');
}

const UNITLESS = new Set(['fontWeight', 'opacity', 'zIndex', 'flex', 'flexGrow', 'flexShrink', 'order', 'lineHeight', 'aspectRatio', 'gridRow', 'gridRowStart', 'gridRowEnd', 'gridColumn', 'gridColumnStart', 'gridColumnEnd', 'columnCount', 'scale', 'animationIterationCount', 'fillOpacity', 'strokeOpacity', 'WebkitLineClamp', 'lineClamp']);
const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/;
const LENGTH = /(?<![\w.-])-?\d*\.?\d+(?:px|rem|em|pt|pc|cm|mm|in|Q|ch|ex)\b/;
const NAMED = /^(?:white|black|red|green|blue|gray|grey|orange|purple|pink|yellow|silver|navy|teal|maroon)$/i;
export type RawPaint = { file: string; line: number; property: string; value: string; kind: 'color' | 'length' | 'shadow' };

/** A literal style value's raw paint, or null when it is a token, keyword, relative unit or number that is no length. */
export function rawValue(property: string, value: string | number): RawPaint['kind'] | null {
  if (typeof value === 'number') return value !== 0 && !UNITLESS.has(property) ? 'length' : null;
  if (/shadow/i.test(property) && value.trim() !== 'none' && !/^var\(/.test(value.trim())) return 'shadow';
  if (COLOR.test(value) || (/color|fill|stroke|background|border|outline/i.test(property) && NAMED.test(value.trim()))) return 'color';
  return LENGTH.test(value) ? 'length' : null;
}

/** Consumer-authored source: not installed (no Ultima stamp), not the theme or a token module, not build output. */
async function consumerFiles(app: string): Promise<string[]> {
  const out: string[] = [];
  for (const name of await readdir(app, { recursive: true })) {
    if (/(^|\/)(node_modules|dist|\.next|out|\.ultima)(\/|$)/.test(name) || !/\.(tsx?|css)$/.test(name) || /\.d\.ts$/.test(name)) continue;
    if (/(^|\/)ultima-theme\.|(^|\/)(vite|next|eslint|postcss|babel)\.config\./.test(name) || name.startsWith('ultima.')) continue;
    const text = await readFile(join(app, name), 'utf8');
    // An installed registry file ends with its `@ultima/<item> <revision> <hash>` stamp.
    if (/^(?:\/\/|\/\*) @ultima\/\S+ \S+ \S+/m.test(text.trimEnd().split('\n').at(-1) ?? '') || /\bdefine(?:Vars|Consts)\b/.test(text)) continue;
    out.push(name);
  }
  return out.sort();
}

/** Every raw color, length or shadow in consumer-authored StyleX objects, inline styles and CSS declarations. */
export async function rawPaint(app: string): Promise<{ files: string[]; findings: RawPaint[] }> {
  const files = await consumerFiles(app);
  const findings: RawPaint[] = [];
  const postcss = (await import(pathToFileURL(join(repository, 'packages/cli/node_modules/postcss/lib/postcss.js')).href)).default;
  for (const file of files) {
    const text = await readFile(join(app, file), 'utf8');
    if (file.endsWith('.css')) {
      postcss.parse(text).walkDecls((decl: { prop: string; value: string; source?: { start?: { line: number } } }) => {
        if (decl.prop.startsWith('--')) return;
        const kind = rawValue(decl.prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), decl.value);
        if (kind) findings.push({ file, line: decl.source?.start?.line ?? 0, property: decl.prop, value: decl.value, kind });
      });
      continue;
    }
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visitObject = (object: ts.ObjectLiteralExpression) => {
      for (const property of object.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const name = property.name.getText(source).replace(/^['"]|['"]$/g, '');
        const initializer = property.initializer;
        const literals: ts.Expression[] = ts.isObjectLiteralExpression(initializer) ? [] : [initializer];
        if (ts.isObjectLiteralExpression(initializer)) {
          // A nested object is a StyleX condition map (`{ default, ':hover', '@media …' }`) or a namespace.
          for (const inner of initializer.properties) {
            if (!ts.isPropertyAssignment(inner)) continue;
            if (ts.isObjectLiteralExpression(inner.initializer)) visitObject(inner.initializer);
            else literals.push(inner.initializer);
          }
        }
        for (const literal of literals) {
          const value = ts.isStringLiteralLike(literal) ? literal.text : ts.isNumericLiteral(literal) ? Number(literal.text)
            : ts.isPrefixUnaryExpression(literal) && ts.isNumericLiteral(literal.operand) ? -Number(literal.operand.text) : null;
          if (value === null) continue;
          const kind = rawValue(name, value);
          if (kind) findings.push({ file, line: source.getLineAndCharacterOfPosition(literal.getStart(source)).line + 1, property: name, value: String(value), kind });
        }
      }
    };
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && /(^|\.)create$/.test(node.expression.getText(source))) {
        for (const argument of node.arguments) {
          if (!ts.isObjectLiteralExpression(argument)) continue;
          for (const namespace of argument.properties) if (ts.isPropertyAssignment(namespace) && ts.isObjectLiteralExpression(namespace.initializer)) visitObject(namespace.initializer);
        }
      }
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'style' && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression && ts.isObjectLiteralExpression(node.initializer.expression)) visitObject(node.initializer.expression);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { files, findings };
}

type Command = { argv: string; exit: number | null; output: string };
async function capture(cwd: string, command: string, args: string[], env: NodeJS.ProcessEnv): Promise<Command> {
  return new Promise((done) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (data: Buffer) => { output += data; });
    child.stderr.on('data', (data: Buffer) => { output += data; });
    child.on('error', (error) => done({ argv: [command, ...args].join(' '), exit: null, output: String(error) }));
    child.on('close', (exit) => done({ argv: [command, ...args].join(' '), exit, output }));
  });
}

/** The S4 lint as the project configured it: `not-configured` when it has no ESLint config that applies the Ultima fragment. */
async function lint(app: string, env: NodeJS.ProcessEnv) {
  const config = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.ts'].find((name) => existsSync(join(app, name)));
  if (!config || !existsSync(join(app, 'node_modules/.bin/eslint'))) return { state: 'not-configured' as const, config: config ?? null, errors: null, warnings: null, exit: null };
  const fragment = (await readFile(join(app, config), 'utf8')).includes('ultimaStylex');
  const result = await capture(app, 'npx', ['--no-install', 'eslint', '.', '--format', 'json'], env);
  let errors: number | null = null;
  let warnings: number | null = null;
  try {
    const rows = JSON.parse(result.output.slice(result.output.indexOf('['))) as { errorCount: number; warningCount: number }[];
    errors = rows.reduce((sum, row) => sum + row.errorCount, 0);
    warnings = rows.reduce((sum, row) => sum + row.warningCount, 0);
  } catch { /* the exit code below still records the run */ }
  return { state: fragment ? 'configured' as const : 'missing-fragment' as const, config, errors, warnings, exit: result.exit };
}

/** The Bash commands and fetched URLs from a stream-json transcript, and whether anything reached the live host or another checkout. */
export function transcriptFacts(lines: string[], work: string) {
  const commands: string[] = [];
  const fetches: string[] = [];
  let model: string | null = null;
  let session: string | null = null;
  let result: Record<string, unknown> | null = null;
  for (const line of lines) {
    let event: { type?: string; subtype?: string; model?: string; session_id?: string; message?: { content?: { type: string; name?: string; input?: Record<string, unknown> }[] } };
    try { event = JSON.parse(line); } catch { continue; }
    if (event.type === 'system' && event.subtype === 'init') { model = event.model ?? null; session = event.session_id ?? null; }
    if (event.type === 'result') result = event as Record<string, unknown>;
    for (const block of event.type === 'assistant' ? event.message?.content ?? [] : []) {
      if (block.type !== 'tool_use') continue;
      if (block.name === 'Bash' && typeof block.input?.command === 'string') commands.push(block.input.command);
      if (block.name === 'WebFetch' && typeof block.input?.url === 'string') fetches.push(block.input.url);
    }
  }
  const outside = [...commands, ...fetches].filter((text) => text.includes('ultima.systems') || /\/(orca|Projects|\.herdr)\//.test(text.replaceAll(work, '')));
  return { model, session, result, commands, fetches, outside };
}

/** Measures a finished run directory and writes its record. */
export async function measure(dir: string, env: NodeJS.ProcessEnv = process.env): Promise<Record<string, unknown>> {
  const record = JSON.parse(await readFile(join(dir, 'record.json'), 'utf8'));
  const app = join(dir, 'work', APP);
  const transcript = existsSync(join(dir, 'transcript.jsonl')) ? (await readFile(join(dir, 'transcript.jsonl'), 'utf8')).split('\n').filter(Boolean) : [];
  const facts = transcriptFacts(transcript, join(dir, 'work'));
  record.agent = { ...record.agent, model: facts.model, session: facts.session, turns: facts.result?.num_turns ?? null, costUsd: facts.result?.total_cost_usd ?? null, durationMs: facts.result?.duration_ms ?? null, outcome: facts.result?.subtype ?? null };
  record.transcript = { file: `${record.runId}.stream.jsonl.gz`, sha256: sha256(transcript.join('\n')), events: transcript.length, commands: facts.commands, fetches: facts.fetches, outsideReferences: facts.outside };
  const notes = await readFile(join(dir, 'work', NOTES), 'utf8').then((text) => JSON.parse(text), () => null);
  record.selfReport = notes;
  if (!existsSync(join(app, 'package.json'))) {
    record.styling = null;
    record.production = { status: 'incomplete', errors: [`no application at ${APP}`] };
  } else {
    const run = async (args: string[]) => {
      const result = await capture(app, 'npx', ['--no-install', 'ultima-design', ...args, '--json'], env);
      let report: unknown = null;
      try { report = JSON.parse(result.output.slice(result.output.indexOf('{'))); } catch { /* recorded as output */ }
      return { exit: result.exit, report, output: report ? undefined : result.output.slice(-4000) };
    };
    const check = await run(['check']);
    const doctor = await run(['doctor']);
    const counts = (check.report as { counts?: { errors: number; warnings?: number; advisories?: number } } | null)?.counts ?? null;
    record.styling = {
      check: { exit: check.exit, counts },
      doctor: { exit: doctor.exit },
      lint: await lint(app, env),
      rawPaint: await rawPaint(app),
    };
    await writeFile(join(dir, 'check.json'), `${JSON.stringify(check, null, 2)}\n`);
    await writeFile(join(dir, 'doctor.json'), `${JSON.stringify(doctor, null, 2)}\n`);
    const production: ExternalReport = await externalProof(app, join(dir, 'production'));
    record.production = { status: production.status, layout: production.layout, versions: production.versions, cases: production.cases, errors: production.errors };
    record.source = { ...record.source, draftDigest: production.source.draftDigest, draftFingerprint: production.source.draftFingerprint };
  }
  record.verdict = verdict(record);
  await writeFile(join(dir, 'record.json'), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

async function exercise(layout: Layout, options: { root: string; model?: string; timeout: number }) {
  const runId = `${new Date().toISOString().slice(0, 10)}-${layout}-${randomBytes(3).toString('hex')}`;
  const dir = join(options.root, runId);
  const work = join(dir, 'work');
  const tmp = join(dir, 'tmp');
  for (const path of [work, tmp, join(dir, 'npm-cache'), join(dir, 'serve')]) await mkdir(path, { recursive: true });
  const source = hashSource(repository);
  const brief = await readFile(join(repository, BRIEF), 'utf8');
  const served = await servePublic(join(dir, 'serve'));
  const env: NodeJS.ProcessEnv = {
    ...process.env, TMPDIR: tmp, npm_config_registry: `${served.origin}/npm/`, npm_config_cache: join(dir, 'npm-cache'),
    npm_config_update_notifier: 'false', NEXT_TELEMETRY_DISABLED: '1',
  };
  for (const name of Object.keys(env)) if (name.startsWith('CLAUDE') || name.startsWith('ORCA') || name === 'PNPM_SCRIPT_SRC_DIR' || name.startsWith('npm_package') || name.startsWith('npm_lifecycle')) delete env[name];
  const registryManifest = sha256(await readFile(join(DIST, 'r/registry.json')));
  const record: Record<string, unknown> = {
    schemaVersion: 1, runId, layout,
    brief: { path: BRIEF, sha256: sha256(brief), brand: briefBrand(brief) },
    source: {
      head: source.ok ? source.head : null, manifest: source.ok ? source.manifest.digest : null, registryManifest,
      cliTarball: { packed: served.cli.packedDigest, served: served.cli.servedDigest, version: served.cli.version },
    },
    host: { origin: served.origin, standsFor: PUBLIC_ORIGIN, npm: `${served.origin}/npm/` },
  };
  try {
    const theme = await studioTheme(served.origin, briefBrand(brief), dir);
    record.theme = { madeIn: 'Theme Studio', command: theme.command };
    const text = prompt(brief, layout, served.origin, theme.command);
    await writeFile(join(dir, 'prompt.md'), `${text}\n`);
    record.prompt = { sha256: sha256(text) };
    const settings = { permissions: { deny: ['WebSearch', 'WebFetch(domain:ultima.systems)', 'Read(~/orca/**)', 'Read(~/Projects/**)', 'Read(~/.herdr/**)'] } };
    const args = ['-p', text, '--safe-mode', '--strict-mcp-config', '--no-chrome', '--permission-mode', 'auto', '--output-format', 'stream-json', '--verbose', '--settings', JSON.stringify(settings), ...(options.model ? ['--model', options.model] : [])];
    const version = await capture(work, 'claude', ['--version'], env);
    const started = new Date();
    const transcript: string[] = [];
    const exit = await new Promise<number | null>((done) => {
      const child = spawn('claude', args, { cwd: work, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let buffer = '';
      child.stdout.on('data', (data: Buffer) => {
        buffer += data;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        transcript.push(...lines.filter(Boolean));
      });
      child.stderr.on('data', (data: Buffer) => process.stderr.write(data));
      const timer = setTimeout(() => child.kill('SIGTERM'), options.timeout * 60_000);
      child.on('close', (code) => { clearTimeout(timer); if (buffer.trim()) transcript.push(buffer.trim()); done(code); });
    });
    await writeFile(join(dir, 'transcript.jsonl'), `${transcript.join('\n')}\n`);
    record.agent = {
      harness: 'claude-code', version: version.output.trim(), flags: args.filter((arg) => arg !== text).map((arg) => (arg.startsWith('{') ? 'settings: deny WebSearch, the live host, and other checkouts' : arg)),
      cwd: 'an empty directory under ~/.cache/ultima-first-screen, outside any checkout', startedAt: started.toISOString(), finishedAt: new Date().toISOString(), exit,
    };
    await writeFile(join(dir, 'record.json'), `${JSON.stringify(record, null, 2)}\n`);
    await measure(dir, env);
  } finally {
    await writeFile(join(dir, 'requests.log'), `${served.requests.join('\n')}\n`);
    await served.close();
  }
  console.log(`first-screen ${layout}: ${dir}`);
  return dir;
}

/** Copies a run's retained record, transcript, production report and screenshots into the evidence directory. */
async function retain(dir: string) {
  const record = JSON.parse(await readFile(join(dir, 'record.json'), 'utf8'));
  const target = join(repository, EVIDENCE);
  await mkdir(join(target, record.runId), { recursive: true });
  await writeFile(join(target, `${record.runId}.json`), `${JSON.stringify(record, null, 2)}\n`);
  await writeFile(join(target, `${record.runId}.stream.jsonl.gz`), gzipSync(await readFile(join(dir, 'transcript.jsonl'))));
  for (const name of ['prompt.md', 'review.json', 'requests.log', 'check.json', 'doctor.json', 'studio-export.png']) if (existsSync(join(dir, name))) await cp(join(dir, name), join(target, record.runId, name));
  if (existsSync(join(dir, 'production'))) {
    for (const name of await readdir(join(dir, 'production'))) if (/\.(json|png)$/.test(name) && !name.endsWith('.axe.json')) await cp(join(dir, 'production', name), join(target, record.runId, 'production', name), { recursive: true });
  }
  console.log(relative(repository, join(target, `${record.runId}.json`)));
}

/** Applies the operator's transcript review and recomputes the verdict. */
async function review(recordPath: string, reviewPath: string) {
  const record = JSON.parse(await readFile(recordPath, 'utf8'));
  record.review = JSON.parse(await readFile(reviewPath, 'utf8'));
  record.verdict = verdict(record);
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`${record.runId}: ${record.verdict.status}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(repository, 'scripts/first-screen.ts')) {
  const [command, ...rest] = process.argv.slice(2);
  const flag = (name: string) => { const index = rest.indexOf(`--${name}`); return index === -1 ? undefined : rest[index + 1]; };
  const root = resolve(flag('root') ?? join(homedir(), '.cache/ultima-first-screen'));
  if (command === 'serve') {
    await mkdir(join(root, 'serve'), { recursive: true });
    const served = await servePublic(join(root, 'serve'), Number(flag('port') ?? 0));
    console.log(`serving the candidate at ${served.origin}; npm registry ${served.origin}/npm/`);
  } else if (command === 'studio') {
    const served = await servePublic(join(root, 'serve'));
    console.log(await studioTheme(served.origin, briefBrand(readFileSync(join(repository, BRIEF), 'utf8')), root));
    await served.close();
  } else if (command === 'run' && flag('layout') && flag('layout')! in LAYOUTS) {
    await exercise(flag('layout') as Layout, { root, model: flag('model'), timeout: Number(flag('timeout') ?? 90) });
  } else if (command === 'measure' && rest[0]) {
    console.log(JSON.stringify((await measure(resolve(rest[0])) as { verdict: unknown }).verdict, null, 2));
  } else if (command === 'retain' && rest[0]) {
    await retain(resolve(rest[0]));
  } else if (command === 'review' && rest[0] && rest[1]) {
    await review(resolve(rest[0]), resolve(rest[1]));
  } else if (command === 'clean' && rest[0]) {
    await rm(resolve(rest[0], 'work'), { recursive: true, force: true });
    await rm(resolve(rest[0], 'npm-cache'), { recursive: true, force: true });
    await rm(resolve(rest[0], 'tmp'), { recursive: true, force: true });
  } else {
    console.error('usage: first-screen.ts serve [--port n] | studio | run --layout vite|next-app|next-src [--root dir] [--model name] [--timeout minutes] | measure <run-dir> | review <record.json> <review.json> | retain <run-dir> | clean <run-dir>');
    process.exit(2);
  }
}
