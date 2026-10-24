// Renders the share video: the Dashboard 01 block, live from the production docs build, re-themed
// through Theme Studio's four presets beside the og.png title treatment. Run with `pnpm og:video`
// (needs ffmpeg on PATH and the Playwright Chromium the repo pins); `--skip-build` reuses an
// existing apps/docs/dist. docs/spec/ultima.md, Discovery surface.
//
// Nothing is screen-recorded. Each frame sets the block's tokens to a value computed from the frame
// number, waits for the screen to settle and takes a screenshot, so a rerun produces the same frames.
// The loop starts halfway through the Neutral hold and ends inside it, so the last frame is the
// first frame and the cut back to the start has no seam.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { startStaticServer } from '../apps/docs/scripts/static-server.ts';
import { presetDraft, resolveDraft, THEME_PRESETS, type TokenTable } from '../packages/tokens/src/theme/draft.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const DIST = `${root}apps/docs/dist`;
const OUT_DIR = `${root}apps/docs/public/og`;
export const VIDEO = `${OUT_DIR}/theme-studio.mp4`;
export const POSTER = `${OUT_DIR}/theme-studio.jpg`;

const WIDTH = 1200;
const HEIGHT = 630;
const FPS = 30;
// Frames each preset holds, then moves to the next one over; four presets make an 8 second loop.
const HOLD = 36;
const MOVE = 24;
const SEGMENT = HOLD + MOVE;
export const FRAMES = SEGMENT * THEME_PRESETS.length;
// Frame 0 sits halfway through Neutral's hold, so frames 0 and FRAMES - 1 both show Neutral at rest.
const OFFSET = HOLD / 2;
const POSTER_FRAME = SEGMENT * THEME_PRESETS.findIndex(({ id }) => id === 'ultima');
// The brand artwork's ink and paper, from docs/brand.md.
const INK = '#0d0e0e';
const PAPER = '#eeeeea';
const SCREEN = '/blocks/dashboard-01/preview';
const CAPTURE = '/__og-video';

const tables: TokenTable[] = THEME_PRESETS.map(({ id }) => resolveDraft(presetDraft(id)).dark);

const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

const PART = /#[0-9a-f]{6}(?:[0-9a-f]{2})?\b|-?\d*\.?\d+/gi;

function channels(hex: string): number[] {
  const digits = hex.slice(1).padEnd(8, 'f');
  return [0, 2, 4, 6].map((at) => parseInt(digits.slice(at, at + 2), 16));
}

/**
 * One token value part way from `a` to `b`. Values with the same shape (a color, a length, a shadow)
 * move number by number and hex color by hex color; anything else, a font stack, switches halfway.
 */
export function mix(a: string, b: string, t: number): string {
  if (a === b || t <= 0) return a;
  if (t >= 1) return b;
  const partsA = a.match(PART) ?? [];
  const partsB = b.match(PART) ?? [];
  const sameShape =
    a.replace(PART, '·') === b.replace(PART, '·') &&
    partsA.every((part, index) => part.startsWith('#') === partsB[index]!.startsWith('#'));
  if (!sameShape) return t < 0.5 ? a : b;
  let index = 0;
  return a.replace(PART, (part) => {
    const other = partsB[index++]!;
    if (!part.startsWith('#')) return String(Number((Number(part) + (Number(other) - Number(part)) * t).toFixed(4)));
    const from = channels(part);
    const to = channels(other);
    const mixed = from.map((value, channel) => Math.round(value + (to[channel]! - value) * t));
    const hex = mixed.map((value) => value.toString(16).padStart(2, '0')).join('');
    return `#${part.length === 9 || other.length === 9 ? hex : hex.slice(0, 6)}`;
  });
}

/** The tokens on screen at a frame, and how much of each preset's label is lit. */
export function frameAt(frame: number): { tokens: TokenTable; weights: number[] } {
  const step = (frame + OFFSET) % FRAMES;
  const from = Math.floor(step / SEGMENT);
  const to = (from + 1) % tables.length;
  const t = ease(Math.max(0, step % SEGMENT - HOLD + 1) / MOVE);
  const tokens = Object.fromEntries(Object.entries(tables[from]!).map(([name, value]) => [name, mix(value, tables[to]![name]!, t)]));
  const weights = tables.map((_, index) => (index === from ? 1 - t : 0) + (index === to ? t : 0));
  return { tokens, weights };
}

const capturePage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
@font-face { font-family: 'IBM Plex Sans'; src: url(/fonts/IBMPlexSans-Regular.woff2) format('woff2'); }
@font-face { font-family: 'IBM Plex Mono'; src: url(/fonts/IBMPlexMono-Regular.woff2) format('woff2'); }
html, body { margin: 0; inline-size: ${WIDTH}px; block-size: ${HEIGHT}px; overflow: hidden; background: ${INK}; color: ${PAPER}; }
.brand { position: absolute; inset: 72px auto 64px 64px; inline-size: 320px; display: flex; flex-direction: column; }
.brand img { display: block; inline-size: 288px; }
.tagline { font: 400 27px/1.3 'IBM Plex Sans', sans-serif; margin: 40px 0 0; }
.studio { margin-block-start: auto; font: 400 15px/1 'IBM Plex Mono', monospace; text-transform: uppercase; letter-spacing: 0.08em; }
.studio p { margin: 0 0 18px; opacity: 0.55; }
.studio ol { display: flex; gap: 20px; list-style: none; margin: 0; padding: 0; }
.studio li { opacity: var(--lit); }
.address { font: 400 18px/1 'IBM Plex Mono', monospace; margin: 44px 0 0; }
.window { position: absolute; inset: 72px -2px -2px 440px; overflow: hidden; border: 1px solid; }
.window iframe { border: 0; display: block; inline-size: 1100px; block-size: 820px; transform: scale(0.69); transform-origin: 0 0; }
</style></head><body>
<div class="brand">
  <img src="/brand/ultima-logo-dark.svg" alt="ultima">
  <p class="tagline">React components.<br>Your source.</p>
  <div class="studio"><p>Theme Studio</p><ol>${THEME_PRESETS.map(({ label }) => `<li>${label}</li>`).join('')}</ol></div>
  <p class="address">ultima.systems</p>
</div>
<div class="window"><iframe src="${SCREEN}" title="Dashboard 01"></iframe></div>
</body></html>`;

function requireFfmpeg() {
  const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    console.error('og:video needs ffmpeg with libx264 on PATH. Install it (for example `apt install ffmpeg`) and rerun.');
    process.exit(1);
  }
}

async function main() {
  requireFfmpeg();
  if (!process.argv.includes('--skip-build')) {
    const build = spawnSync('pnpm', ['--filter', '@ultima/docs', 'build'], { cwd: root, stdio: 'inherit' });
    if (build.status !== 0) throw new Error('The docs build failed');
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const server = await startStaticServer({ root: DIST, nonce: 'og-video', manifestDigest: 'og-video' });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    await context.addInitScript(() => localStorage.setItem('ultima-theme', 'dark'));
    const page = await context.newPage();
    await page.route(`${server.url}${CAPTURE}`, (route) => route.fulfill({ contentType: 'text/html', body: capturePage }));
    await page.goto(`${server.url}${CAPTURE}`, { waitUntil: 'networkidle' });
    const screen = page.frames().find((frame) => frame.url().endsWith(SCREEN));
    if (!screen) throw new Error(`${SCREEN} did not load`);
    await screen.waitForSelector('main');
    // Tokens move once per frame, so a component's own transition would lag a frame behind them.
    await screen.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
    await page.evaluate(() => document.fonts.ready);
    await screen.evaluate(() => document.fonts.ready);

    const show = async (frame: number) => {
      const { tokens, weights } = frameAt(frame);
      await screen.evaluate((values) => {
        for (const [name, value] of Object.entries(values)) document.documentElement.style.setProperty(name, value);
      }, tokens);
      await page.evaluate(
        ({ weights, border, radius }) => {
          document.querySelectorAll<HTMLElement>('.studio li').forEach((item, index) => item.style.setProperty('--lit', String(0.35 + 0.65 * weights[index]!)));
          const window = document.querySelector<HTMLElement>('.window')!;
          window.style.borderColor = border;
          window.style.borderStartStartRadius = radius;
        },
        { weights, border: tokens['--ult-color-border-strong']!, radius: tokens['--ult-radius-xl']! },
      );
      // The chart measures its box and redraws a frame or two after the spacing moves, so wait
      // until the markup is the same across two animation frames.
      await screen.evaluate(async () => {
        const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        let before = '';
        for (let attempt = 0; attempt < 60; attempt++) {
          await nextFrame();
          const now = document.body.innerHTML;
          if (now === before) return;
          before = now;
        }
        throw new Error('The screen did not settle');
      });
    };

    // The chart keeps what it measured on earlier frames, so one uncaptured loop first puts the
    // screen in the state the captured loop ends in.
    for (let frame = 0; frame < FRAMES; frame++) await show(frame);

    const ffmpeg = spawn(
      'ffmpeg',
      [
        '-v', 'error', '-y',
        '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(FPS), '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-tune', 'animation',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
        '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact',
        VIDEO,
      ],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    const done = new Promise<void>((resolve, reject) => {
      ffmpeg.on('error', reject);
      ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
    });
    for (let frame = 0; frame < FRAMES; frame++) {
      await show(frame);
      const png = await page.screenshot({ type: 'png' });
      if (!ffmpeg.stdin.write(png)) await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    }
    ffmpeg.stdin.end();
    await done;

    await show(POSTER_FRAME);
    await page.screenshot({ path: POSTER, type: 'jpeg', quality: 88 });
  } finally {
    await browser.close();
    await server.close();
  }
  console.log(`Wrote ${VIDEO} and ${POSTER}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
