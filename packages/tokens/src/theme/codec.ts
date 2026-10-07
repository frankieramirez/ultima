import {
  THEME_DRAFT_VERSION,
  THEME_PRESETS,
  presetRevision,
  resolveDraft,
  shapePresets,
  stockDraft,
  type AccentFill,
  type DensityFactor,
  type GuidedGroup,
  type MeasurePreset,
  type ThemeDraft,
  type TokenTable,
  type TypeScale,
  type ThemePresetOrigin,
} from './draft.ts';
import { RECIPE_VERSION, SCALE_NAMES, type ScaleSeed, type ScaleSeeds } from './recipe.ts';

export type DraftParseReason = 'malformed' | 'unknown-version';

export type DraftParseResult =
  | { ok: true; draft: ThemeDraft }
  | { ok: false; reason: DraftParseReason; message: string };

const GUIDED_GROUPS: GuidedGroup[] = ['color', 'typography', 'density', 'shape', 'elevation', 'motion'];
const MEASURES: MeasurePreset[] = ['compact', 'default', 'loose'];
const ACCENT_FILLS: AccentFill[] = ['hue', 'ink'];
const DENSITIES: DensityFactor[] = [0.75, 1, 1.25];
const TYPE_SCALES: TypeScale[] = ['stock', 1.125, 1.2, 1.25, 1.333];
const SHUFFLE_KEYS = [...GUIDED_GROUPS, 'global'] as const;

function fail(reason: DraftParseReason, message: string): DraftParseResult {
  return { ok: false, reason, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOneOf<T>(value: unknown, allowed: readonly T[]): value is T {
  return (allowed as readonly unknown[]).includes(value);
}

function isFontStack(value: unknown): value is string {
  if (typeof value !== 'string' || /[;{}<>\u0000-\u0008\u000b\u000e-\u001f\u007f-\u009f]|\/\*|\*\//.test(value)) return false;
  let index = 0;
  const isSpace = (character: string | undefined) => character !== undefined && /[ \t\r\n\f]/.test(character);
  const skipSpace = () => { while (isSpace(value[index])) index++; };
  const skipEscape = () => {
    index++;
    if (index === value.length) return false;
    let digits = 0;
    while (digits < 6 && /[0-9a-fA-F]/.test(value[index] ?? '')) { index++; digits++; }
    if (digits === 0) {
      if (/[\r\n\f]/.test(value[index]!)) return false;
      index++;
    } else if (isSpace(value[index])) {
      if (value[index] === '\r' && value[index + 1] === '\n') index++;
      index++;
    }
    return true;
  };
  skipSpace();
  while (index < value.length) {
    const quote = value[index];
    let hasName = false;
    if (quote === '"' || quote === "'") {
      index++;
      while (index < value.length && value[index] !== quote) {
        if (value[index] === '\\') { if (!skipEscape()) return false; }
        else { if (/[\r\n\f]/.test(value[index]!)) return false; index++; }
        hasName = true;
      }
      if (value[index] !== quote) return false;
      index++;
      skipSpace();
    } else {
      while (index < value.length && value[index] !== ',') {
        const character = value[index]!;
        if (isSpace(character)) { index++; continue; }
        if (character === '\\') { if (!skipEscape()) return false; }
        else if (/[\w-]/.test(character) || character.charCodeAt(0) >= 0x80) index++;
        else return false;
        hasName = true;
      }
    }
    if (!hasName) return false;
    if (index === value.length) return true;
    if (value[index] !== ',') return false;
    index++;
    skipSpace();
  }
  return false;
}

const OVERRIDE_TOKENS = new Set(Object.keys(resolveDraft(stockDraft()).dark).filter(
  (name) => !['--ult-color-surface-overlay', '--ult-radius-full', '--ult-filter-backdrop'].includes(name),
));

function inRange(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= max;
}

function parseTokenTable(value: unknown): Partial<TokenTable> | string {
  if (!isRecord(value)) return 'Overrides must contain dark and light token tables.';
  const table: Partial<TokenTable> = {};
  for (const [name, token] of Object.entries(value)) {
    if (!OVERRIDE_TOKENS.has(name)) return `Override ${name} is unknown, fixed, or derived and cannot be edited.`;
    if (typeof token !== 'string' || !token.trim()) return `Override ${name} must be a non-empty value.`;
    if ((name === '--ult-font-sans' || name === '--ult-font-mono') && !isFontStack(token)) {
      return `Override ${name} must be a comma-separated list of font family names.`;
    }
    if (name.startsWith('--ult-color-')) {
      const hex = token.trim().toLowerCase();
      if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(hex)) {
        return `Override ${name} must use opaque sRGB hex: #rgb or #rrggbb. Convert other color formats to hex.`;
      }
      table[name] = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
    } else {
      if (name.startsWith('--ult-radius-') &&
          (!/^(?:\d+(?:\.\d+)?|\.\d+)px$/.test(token.trim()) || !inRange(Number.parseFloat(token), 0, 96))) {
        return `Override ${name} must be a radius from 0 to 96px.`;
      }
      table[name] = token.trim();
    }
  }
  return table;
}

function parseSeed(value: unknown): ScaleSeed | null {
  if (!isRecord(value) || !inRange(value.hue, 0, 360) || value.hue === 360 || !inRange(value.saturation, 0, 1.5)) return null;
  return { hue: value.hue, saturation: value.saturation };
}

function parseColor(value: unknown): ScaleSeeds | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== SCALE_NAMES.length || SCALE_NAMES.some((name) => !keys.includes(name))) return null;
  const color = {} as ScaleSeeds;
  for (const name of SCALE_NAMES) {
    const seed = parseSeed(value[name]);
    if (!seed) return null;
    color[name] = seed;
  }
  return color;
}

function parseTypography(value: unknown): ThemeDraft['typography'] | null {
  if (!isRecord(value)) return null;
  if (!isFontStack(value.sans) || !isFontStack(value.mono)) return null;
  if (!inRange(value.baseSizePx, 14, 18) || !isOneOf(value.scale, TYPE_SCALES)) return null;
  if (!isOneOf(value.leading, MEASURES) || !isOneOf(value.tracking, MEASURES)) return null;
  return {
    sans: value.sans,
    mono: value.mono,
    baseSizePx: value.baseSizePx,
    scale: value.scale,
    leading: value.leading,
    tracking: value.tracking,
  };
}

function parseOverrides(value: unknown): ThemeDraft['overrides'] | string {
  if (!isRecord(value)) return 'Draft must contain overrides for dark and light modes.';
  const dark = parseTokenTable(value.dark);
  const light = parseTokenTable(value.light);
  if (typeof dark === 'string') return `Dark: ${dark}`;
  if (typeof light === 'string') return `Light: ${light}`;
  return { dark, light };
}

function parseLocks(value: unknown): ThemeDraft['locks'] | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== GUIDED_GROUPS.length || GUIDED_GROUPS.some((name) => !keys.includes(name))) return null;
  const locks = {} as ThemeDraft['locks'];
  for (const group of GUIDED_GROUPS) {
    if (typeof value[group] !== 'boolean') return null;
    locks[group] = value[group];
  }
  return locks;
}

function parseShuffleSeeds(value: unknown): ThemeDraft['shuffleSeeds'] | null {
  if (!isRecord(value)) return null;
  const seeds: ThemeDraft['shuffleSeeds'] = {};
  for (const [key, seed] of Object.entries(value)) {
    if (!isOneOf(key, SHUFFLE_KEYS) || !isFiniteNumber(seed)) return null;
    seeds[key] = seed;
  }
  return seeds;
}

export const FRAGMENT_SAFE_LENGTH = 2048;

const FRAGMENT_PREFIX = '#theme=';

export type FragmentEncodeResult = {
  fragment: string;
  tooLong: boolean;
};

async function pipeThrough(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
  maxBytes = Infinity,
): Promise<Uint8Array> {
  const reader = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new Error('Theme draft exceeds the decoded size limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(value: string): Uint8Array | null {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  try {
    const binary = atob(`${padded}${pad}`);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function serializeDraft(draft: ThemeDraft): string {
  return `${JSON.stringify(draft, null, 2)}\n`;
}

export function draftFingerprint(draft: ThemeDraft): string {
  const source = serializeDraft(draft);
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

export async function encodeFragment(draft: ThemeDraft): Promise<FragmentEncodeResult> {
  const compressed = await pipeThrough(
    new TextEncoder().encode(serializeDraft(draft)),
    new CompressionStream('deflate'),
  );
  const fragment = `${FRAGMENT_PREFIX}${toBase64Url(compressed)}`;
  return { fragment, tooLong: fragment.length > FRAGMENT_SAFE_LENGTH };
}

export async function decodeFragment(hash: string, options: { maxBytes?: number } = {}): Promise<DraftParseResult> {
  if (!hash.startsWith(FRAGMENT_PREFIX)) {
    return fail('malformed', 'Theme fragment is missing the #theme= prefix.');
  }
  const bytes = fromBase64Url(hash.slice(FRAGMENT_PREFIX.length));
  if (!bytes) return fail('malformed', 'Theme fragment is not valid base64url.');
  try {
    const json = new TextDecoder().decode(
      await pipeThrough(bytes, new DecompressionStream('deflate'), options.maxBytes),
    );
    return parseDraft(json);
  } catch {
    return fail('malformed', 'Theme fragment could not be inflated.');
  }
}

export function parseDraft(input: string): DraftParseResult {
  if (typeof input !== 'string' || input.trim() === '') {
    return fail('malformed', 'Draft is empty or not JSON.');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch {
    return fail('malformed', 'Draft is not valid JSON.');
  }

  if (!isRecord(raw)) return fail('malformed', 'Draft must be an object.');
  if (!isFiniteNumber(raw.version)) return fail('malformed', 'Draft is missing a version.');
  if (raw.version !== 1 && raw.version !== 2 && raw.version !== THEME_DRAFT_VERSION) {
    return fail('unknown-version', `Draft version ${raw.version} is not supported.`);
  }
  if (!isFiniteNumber(raw.recipeVersion)) return fail('malformed', 'Draft is missing a recipe version.');

  if (raw.recipeVersion !== (raw.version === 1 ? RECIPE_VERSION : 2)) {
    return fail('unknown-version', `Recipe version ${raw.recipeVersion} is not supported for draft version ${raw.version}.`);
  }

  const version = raw.version;
  let preset: ThemePresetOrigin | null = null;
  if (version !== 1 && raw.preset !== null) {
    if (!isRecord(raw.preset)) return fail('malformed', 'Draft must declare a preset origin or null.');
    const revision = presetRevision(version);
    const id = raw.preset.id;
    const definition = THEME_PRESETS.find((item) => item.id === id);
    if (!definition || raw.preset.revision !== revision) {
      return fail('unknown-version', `Preset ${String(raw.preset.id)} revision ${String(raw.preset.revision)} is not supported for draft version ${version}.`);
    }
    preset = { id: definition.id, revision };
  }
  if (version === THEME_DRAFT_VERSION && !isOneOf(raw.accentFill, ACCENT_FILLS)) {
    return fail('malformed', 'Draft accent fill must be hue or ink.');
  }

  const color = parseColor(raw.color);
  const typography = parseTypography(raw.typography);
  const overrides = parseOverrides(raw.overrides);
  const locks = parseLocks(raw.locks);
  const shuffleSeeds = parseShuffleSeeds(raw.shuffleSeeds);
  if (!color) return fail('malformed', 'Color seeds need a hue from 0 up to 360 (exclusive) and saturation from 0 to 1.5.');
  if (!typography) return fail('malformed', 'Typography needs font stacks, a base size from 14 to 18px, and supported scale, leading, and tracking presets.');
  if (typeof overrides === 'string') return fail('malformed', overrides);
  if (!locks || !shuffleSeeds) {
    return fail('malformed', 'Draft is missing required fields.');
  }
  if (!isOneOf(raw.density, DENSITIES) || !isOneOf(raw.shape, shapePresets(version))) {
    return fail('malformed', 'Draft density or shape is not a known preset.');
  }
  if (!inRange(raw.elevation, 0, 2) || !inRange(raw.motion, 0.5, 2)) {
    return fail('malformed', 'Draft elevation must be from 0 to 2 and motion from 0.5 to 2.');
  }

  return {
    ok: true,
    draft: {
      version,
      recipeVersion: raw.recipeVersion,
      color,
      typography,
      density: raw.density,
      shape: raw.shape,
      elevation: raw.elevation,
      motion: raw.motion,
      overrides,
      locks,
      shuffleSeeds,
      ...(version !== 1 ? { preset } : {}),
      ...(version === THEME_DRAFT_VERSION ? { accentFill: raw.accentFill as AccentFill } : {}),
    },
  };
}
