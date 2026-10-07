/**
 * The landing dot field, per Landing motion in docs/spec/ultima.md: Pen's own shader drawn behind the
 * hero in hand-written WebGL 1, one quad on one canvas. Geometry and motion come from the shader's
 * `@default` annotations; colour comes from the `site` tokens on the canvas. The landing route loads
 * this module as its own chunk once the hero has painted and the browser is idle.
 */
import * as stylex from '@stylexjs/stylex';
import { motion } from '@ultima/tokens/tokens.stylex';
import { useEffect, useRef, useState } from 'react';

import shader from '../../../ultima-assets/shaders/dot-field.glsl?raw';

export type FieldState = 'loading' | 'running' | 'settled' | 'still' | 'off';

export const DRIFT_MS = 5000;
export const EASE_MS = 1000;
export const FRAME_MS = 1000 / 30;
const MAX_RESUME_STEP_MS = 100;

/** Each numeric uniform's `@default`. The colour uniforms' hex defaults are never read. */
export function shaderDefaults(source: string): Record<string, number> {
  const defaults: Record<string, number> = {};
  for (const [, doc = '', name = ''] of source.matchAll(/\/\*\*([\s\S]*?)\*\/\s*uniform\s+float\s+(\w+);/g)) {
    const value = /@default\s+(-?[\d.]+)\s/.exec(doc)?.[1];
    if (value !== undefined) defaults[name] = Number(value);
  }
  return defaults;
}

export const COLOR_ROLES = {
  u_bg: '--ult-color-surface',
  u_dim: '--ult-color-highlight-border',
  u_bright: '--ult-color-highlight-active',
} as const;

export type Rgb = [number, number, number];

/**
 * The three colour uniforms, read from `element`'s computed `site` tokens as 0–1 channels. Null when a
 * token is empty or not a colour, so the field never paints a colour no token produced.
 */
export function fieldColors(element: Element): Record<keyof typeof COLOR_ROLES, Rgb> | null {
  const style = getComputedStyle(element);
  const values = Object.values(COLOR_ROLES).map((token) => style.getPropertyValue(token).trim());
  if (values.some((value) => !CSS.supports('color', value))) return null;
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const context = probe.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  const [u_bg, u_dim, u_bright] = values.map((value): Rgb => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
    return [r / 255, g / 255, b / 255];
  }) as [Rgb, Rgb, Rgb];
  return { u_bg, u_dim, u_bright };
}

/** The shader's clock, in seconds, after `elapsed` ms of drift: full speed, then eased to rest over the last second. */
export function driftSeconds(elapsed: number): number {
  const steady = DRIFT_MS - EASE_MS;
  if (elapsed <= steady) return Math.max(0, elapsed) / 1000;
  const s = Math.min(1, (elapsed - steady) / EASE_MS);
  return (steady + (EASE_MS * (1 - (1 - s) ** 3)) / 3) / 1000;
}

export type Frame = { time: number; glow: number; x: number; y: number };
export type Scheduler = { request(callback: (now: number) => void): number; cancel(id: number): void };

/**
 * When the field draws. It draws one frame to start, at most 30 a second while drifting or fading the
 * glow, and nothing at rest. It stops while the document is hidden or the hero is off-screen, and draws
 * again only for `redraw` or a glow move.
 */
export function createLoop(draw: (frame: Frame) => void, report: (state: FieldState) => void, scheduler: Scheduler, fadeMs: () => number) {
  let elapsed = 0;
  let last: number | null = null;
  let pending: number | null = null;
  let dirty = true;
  let hidden = false;
  let onScreen = true;
  let reduced = false;
  let stopped = false;
  let glow = 0;
  let leaving = false;
  let x = 0;
  let y = 0;

  const animating = () => !reduced && (elapsed < DRIFT_MS || (leaving && glow > 0));
  const wanted = () => !stopped && !hidden && onScreen && (dirty || animating());
  const schedule = () => {
    if (pending === null && wanted()) pending = scheduler.request(tick);
    else if (pending !== null && !wanted()) {
      scheduler.cancel(pending);
      pending = null;
    }
  };
  const paint = () => {
    dirty = false;
    draw({ time: reduced ? 0 : driftSeconds(elapsed), glow: reduced ? 0 : glow, x, y });
    report(reduced ? 'still' : elapsed >= DRIFT_MS ? 'settled' : 'running');
  };
  const tick = (now: number) => {
    pending = null;
    if (!wanted()) return;
    if (last !== null && now - last < FRAME_MS - 1) return schedule();
    const step = last === null ? 0 : Math.min(now - last, MAX_RESUME_STEP_MS);
    last = now;
    if (!reduced) elapsed = Math.min(DRIFT_MS, elapsed + step);
    if (leaving) glow = Math.max(0, glow - step / Math.max(1, fadeMs()));
    paint();
    schedule();
  };
  const set = (change: () => void) => {
    change();
    schedule();
  };

  schedule();
  return {
    setHidden: (value: boolean) => set(() => (hidden = value)),
    setOnScreen: (value: boolean) => set(() => (onScreen = value)),
    setReduced: (value: boolean) => set(() => ((reduced = value), (dirty = true))),
    redraw: () => set(() => (dirty = true)),
    /** Draws the current frame now, without advancing the drift: a resized canvas starts cleared. */
    paintNow: () => set(() => !stopped && paint()),
    /** Skips the drift, for a restored context, which draws once at rest. */
    settle: () => set(() => ((elapsed = DRIFT_MS), (dirty = true))),
    pointer: (atX: number, atY: number) =>
      set(() => {
        if (reduced) return;
        [x, y, glow, leaving, dirty] = [atX, atY, 1, false, true];
      }),
    leave: () => set(() => (leaving = true)),
    stop: () => set(() => (stopped = true)),
  };
}

const VERTEX = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
const DEFAULTS = shaderDefaults(shader);

function program(gl: WebGLRenderingContext) {
  const compile = (type: number, source: string) => {
    const part = gl.createShader(type);
    if (!part) return null;
    gl.shaderSource(part, source);
    gl.compileShader(part);
    return gl.getShaderParameter(part, gl.COMPILE_STATUS) ? part : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, shader);
  const linked = gl.createProgram();
  if (!vertex || !fragment || !linked) return null;
  gl.attachShader(linked, vertex);
  gl.attachShader(linked, fragment);
  gl.bindAttribLocation(linked, 0, 'p');
  gl.linkProgram(linked);
  if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) return null;
  gl.useProgram(linked);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  for (const [name, value] of Object.entries(DEFAULTS)) gl.uniform1f(gl.getUniformLocation(linked, name), value);
  return (name: string) => gl.getUniformLocation(linked, name);
}

function durationMs(value: string) {
  const amount = Number.parseFloat(value);
  return value.trim().endsWith('ms') ? amount : amount * 1000;
}

function startField(canvas: HTMLCanvasElement, report: (state: FieldState) => void): (() => void) | null {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  let uniform = gl && program(gl);
  let colors = fieldColors(canvas);
  if (!gl || !uniform || !colors) return null;

  const draw = ({ time, glow, x, y }: Frame) => {
    if (!uniform || !colors || gl.isContextLost()) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniform('u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(uniform('u_time'), time);
    gl.uniform2f(uniform('u_mouse'), x, y);
    gl.uniform1f(uniform('u_glow'), (DEFAULTS.u_glow ?? 0) * glow);
    for (const [name, rgb] of Object.entries(colors)) gl.uniform3f(uniform(name), ...rgb);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const frames: Scheduler = { request: (callback) => requestAnimationFrame(callback), cancel: (id) => cancelAnimationFrame(id) };
  const fade = () => durationMs(getComputedStyle(canvas).getPropertyValue('--ult-motion-slow'));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const noHover = matchMedia('(hover: none)');
  const begin = () => {
    const next = createLoop(draw, report, frames, fade);
    next.setReduced(reducedMotion.matches);
    next.setHidden(document.hidden);
    return next;
  };
  let loop = begin();

  const resize = new ResizeObserver(([entry]) => {
    const width = Math.max(1, Math.round(entry?.contentRect.width ?? canvas.width));
    const height = Math.max(1, Math.round(entry?.contentRect.height ?? canvas.height));
    if (width === canvas.width && height === canvas.height) return;
    canvas.width = width;
    canvas.height = height;
    loop.paintNow();
  });
  const visible = new IntersectionObserver(([entry]) => loop.setOnScreen(entry?.isIntersecting ?? true));
  const tokens = new MutationObserver(() => {
    const next = fieldColors(canvas);
    if (!next) return;
    colors = next;
    loop.redraw();
  });
  const onVisibility = () => loop.setHidden(document.hidden);
  const onMotion = () => loop.setReduced(reducedMotion.matches);
  const hero = canvas.closest('[data-hero]') ?? canvas.parentElement ?? canvas;
  const onPointer = (event: Event) => {
    const { pointerType, clientX, clientY } = event as PointerEvent;
    if (pointerType !== 'mouse' || noHover.matches) return;
    const box = canvas.getBoundingClientRect();
    loop.pointer(clientX - box.left, box.height - (clientY - box.top));
  };
  const onLeave = () => loop.leave();
  const onLost = (event: Event) => {
    event.preventDefault();
    loop.stop();
    report('off');
  };
  const onRestored = () => {
    uniform = program(gl);
    if (!uniform) return;
    loop = begin();
    loop.settle();
  };

  resize.observe(canvas);
  visible.observe(canvas);
  tokens.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', onMotion);
  hero.addEventListener('pointermove', onPointer);
  hero.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  return () => {
    loop.stop();
    resize.disconnect();
    visible.disconnect();
    tokens.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    reducedMotion.removeEventListener('change', onMotion);
    hero.removeEventListener('pointermove', onPointer);
    hero.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}

const styles = stylex.create({
  canvas: {
    blockSize: '100%',
    display: 'block',
    imageRendering: 'pixelated',
    inlineSize: '100%',
    opacity: 0,
    pointerEvents: 'none',
    transitionDuration: motion['--ult-motion-slow'],
    transitionProperty: 'opacity',
  },
  shown: { opacity: 1 },
  host: { blockSize: '100%' },
});

/**
 * The field. Each start gets a canvas of its own, because stopping loses the WebGL context, and a lost
 * context cannot draw for the next start.
 */
export function DotField({ onState }: { onState: (state: FieldState) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<FieldState>('loading');

  useEffect(() => {
    if (!host.current) return;
    const element = document.createElement('canvas');
    element.setAttribute('aria-hidden', 'true');
    element.className = stylex.props(styles.canvas).className ?? '';
    host.current.append(element);
    const stop = startField(element, setState);
    if (!stop) {
      element.remove();
      setState('off');
      return;
    }
    canvas.current = element;
    return () => {
      stop();
      element.remove();
      canvas.current = null;
    };
  }, []);
  useEffect(() => {
    if (canvas.current) canvas.current.className = stylex.props(styles.canvas, state !== 'loading' && state !== 'off' && styles.shown).className ?? '';
    onState(state);
  }, [onState, state]);

  return <div ref={host} {...stylex.props(styles.host)} />;
}
