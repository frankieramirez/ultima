import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { resolveDraft } from '@ultima/tokens';
import type { CSSProperties } from 'react';
import { describe, expect, onTestFinished, test } from 'vitest';
import { render } from 'vitest-browser-react';

import {
  COLOR_ROLES,
  DRIFT_MS,
  EASE_MS,
  FRAME_MS,
  type FieldState,
  type Frame,
  createLoop,
  driftSeconds,
  fieldColors,
  shaderDefaults,
} from '../dot-field';
import { routeTree } from '../router';
import { siteDraft } from '../site-theme-draft';
import { siteTheme } from '../theme';
import shader from '../../../../ultima-assets/shaders/dot-field.glsl?raw';

const SITE = resolveDraft(siteDraft());

function rgb(hex: string) {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
}

describe('colour', () => {
  test.each(['dark', 'light'] as const)('maps ground, dim and bright to the site tokens in %s', async (mode) => {
    const screen = await render(
      <div {...stylex.props(siteTheme[mode])}>
        <canvas data-testid="field" />
      </div>,
    );
    const colors = fieldColors(screen.getByTestId('field').element());
    expect(colors).not.toBeNull();
    for (const [uniform, token] of Object.entries(COLOR_ROLES)) {
      const expected = rgb(SITE[mode][token]!);
      colors![uniform as keyof typeof COLOR_ROLES].forEach((channel, index) => expect(channel).toBeCloseTo(expected[index]!, 5));
    }
  });

  test('a changed highlight recolours the field with no code change', async () => {
    const screen = await render(
      <div {...stylex.props(siteTheme.dark)}>
        <div style={{ '--ult-color-highlight-active': '#ff0000' } as CSSProperties}>
          <canvas data-testid="field" />
        </div>
      </div>,
    );
    expect(fieldColors(screen.getByTestId('field').element())?.u_bright).toEqual([1, 0, 0]);
  });

  test.each([
    ['empty', 'initial'],
    ['not a colour', 'not-a-colour'],
  ])('reads no colours when a token is %s, rather than keeping a stale one', async (_, value) => {
    const screen = await render(
      <div {...stylex.props(siteTheme.dark)}>
        <div style={{ '--ult-color-highlight-border': value } as CSSProperties}>
          <canvas data-testid="field" />
        </div>
      </div>,
    );
    expect(fieldColors(screen.getByTestId('field').element())).toBeNull();
  });

  test("takes geometry and motion from the shader's @default annotations and never its hex colours", () => {
    expect(shaderDefaults(shader)).toEqual({
      u_cell: 16,
      u_dot: 2,
      u_speed: 0.05,
      u_steps: 6,
      u_focus_x: 0.85,
      u_focus_y: 0.9,
      u_reach: 0.75,
      u_floor: 0.12,
      u_glow: 0.7,
    });
  });
});

const DISPLAY_FRAME_MS = 1000 / 60;

function harness() {
  const draws: (Frame & { at: number })[] = [];
  const states: FieldState[] = [];
  let next: ((now: number) => void) | null = null;
  let now = 0;
  const loop = createLoop(
    (frame) => draws.push({ ...frame, at: now }),
    (state) => states.push(state),
    {
      request: (callback) => {
        next = callback;
        return 1;
      },
      cancel: () => {
        next = null;
      },
    },
    () => 300,
  );
  const advance = (ms: number) => {
    const until = now + ms;
    while (now < until) {
      now += DISPLAY_FRAME_MS;
      const callback = next;
      next = null;
      callback?.(now);
    }
  };
  return { loop, draws, states, advance, pending: () => next !== null };
}

describe('drift', () => {
  test('runs at full speed, eases to rest over the last second and then holds', () => {
    expect(driftSeconds(0)).toBe(0);
    expect(driftSeconds(DRIFT_MS - EASE_MS)).toBe(4);
    expect(driftSeconds(DRIFT_MS - EASE_MS + 10) - driftSeconds(DRIFT_MS - EASE_MS)).toBeCloseTo(0.01, 3);
    expect(driftSeconds(DRIFT_MS) - driftSeconds(DRIFT_MS - 10)).toBeLessThan(0.0001);
    expect(driftSeconds(DRIFT_MS * 3)).toBe(driftSeconds(DRIFT_MS));
  });

  test('settles five seconds after the first frame, at no more than 30 frames a second', () => {
    const { draws, states, advance, pending } = harness();
    advance(DRIFT_MS + 2000);
    expect(states[0]).toBe('running');
    expect(states.at(-1)).toBe('settled');
    expect(states.filter((state) => state === 'settled')).toHaveLength(1);
    expect(draws.at(-1)!.at - draws[0]!.at).toBeGreaterThanOrEqual(DRIFT_MS);
    expect(draws.at(-1)!.at - draws[0]!.at).toBeLessThan(DRIFT_MS + 2 * FRAME_MS);
    for (let index = 1; index < draws.length; index += 1) {
      expect(draws[index]!.at - draws[index - 1]!.at).toBeGreaterThanOrEqual(FRAME_MS - 1);
    }
    expect(draws.at(-1)!.time).toBe(driftSeconds(DRIFT_MS));
    expect(pending()).toBe(false);
  });
});

describe('stops', () => {
  test.each([
    ['the document is hidden', 'setHidden'],
    ['the hero is off-screen', 'setOnScreen'],
  ] as const)('while %s, and resumes the drift where it left off', (_, method) => {
    const { loop, draws, advance, pending } = harness();
    advance(1000);
    const before = draws.length;
    const time = draws.at(-1)!.time;
    loop[method](method === 'setHidden');
    expect(pending()).toBe(false);
    advance(10_000);
    expect(draws).toHaveLength(before);
    loop[method](method !== 'setHidden');
    advance(100);
    expect(draws.length).toBeGreaterThan(before);
    expect(draws[before]!.time - time).toBeCloseTo(0.1, 5);
  });

  test('at rest, and draws once for a redraw or a glow move', () => {
    const { loop, draws, advance, pending } = harness();
    advance(DRIFT_MS + 500);
    const rest = draws.length;
    loop.redraw();
    advance(1000);
    expect(draws).toHaveLength(rest + 1);
    loop.pointer(40, 60);
    advance(1000);
    expect(draws).toHaveLength(rest + 2);
    expect(draws.at(-1)).toMatchObject({ glow: 1, x: 40, y: 60, time: driftSeconds(DRIFT_MS) });
    expect(pending()).toBe(false);
  });

  test('after the glow fades out when the pointer leaves', () => {
    const { loop, draws, advance, pending } = harness();
    advance(DRIFT_MS + 500);
    loop.pointer(40, 60);
    advance(100);
    loop.leave();
    advance(1000);
    expect(draws.at(-1)!.glow).toBe(0);
    expect(pending()).toBe(false);
  });

  test('under reduced motion after one still frame at time zero, with no glow', () => {
    const { loop, draws, states, advance, pending } = harness();
    loop.setReduced(true);
    advance(DRIFT_MS * 2);
    expect(draws).toHaveLength(1);
    expect(draws[0]).toMatchObject({ time: 0, glow: 0 });
    expect(states).toEqual(['still']);
    loop.pointer(40, 60);
    advance(1000);
    expect(draws).toHaveLength(1);
    expect(pending()).toBe(false);
  });

  test('paints a resized canvas at once, without advancing the drift or asking for a frame', () => {
    const { loop, draws, advance, pending } = harness();
    advance(DRIFT_MS + 500);
    const rest = draws.length;
    loop.paintNow();
    expect(draws).toHaveLength(rest + 1);
    expect(draws.at(-1)!.time).toBe(driftSeconds(DRIFT_MS));
    expect(pending()).toBe(false);
  });

  test('when stopped', () => {
    const { loop, draws, advance, pending } = harness();
    advance(500);
    const before = draws.length;
    loop.stop();
    loop.redraw();
    advance(1000);
    expect(draws).toHaveLength(before);
    expect(pending()).toBe(false);
  });
});

describe('load', () => {
  test('a visitor sending Save-Data gets no field, and the hero still renders', async () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    onTestFinished(() => {
      delete (navigator as { connection?: unknown }).connection;
    });
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const screen = await render(<RouterProvider router={createRouter({ routeTree, history })} />);
    await expect.element(screen.getByRole('heading', { level: 1, name: 'A system for building interfaces.' })).toBeVisible();
    const field = document.querySelector('[data-hero] [data-field]');
    await expect.poll(() => field?.getAttribute('data-field')).toBe('off');
    await new Promise((resolve) => requestIdleCallback(() => requestAnimationFrame(resolve)));
    expect(field?.getAttribute('data-field')).toBe('off');
    expect(field?.querySelector('canvas')).toBeNull();
  });
});
