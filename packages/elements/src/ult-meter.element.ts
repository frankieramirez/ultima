import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-2'],
    margin: 0,
  },
  label: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    letterSpacing: font['--ult-font-tracking-wide'],
    textTransform: 'uppercase',
  },
  track: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-full'],
    height: space['--ult-space-2'],
    overflow: 'hidden',
  },
  /** Base UI sets the indicator's own `width` and `height` inline, from `value`. */
  indicator: {
    borderRadius: radius['--ult-radius-full'],
  },
  value: {
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
  },
});

const indicatorTones = stylex.create({
  neutral: { backgroundColor: color['--ult-color-border-strong'] },
  highlight: { backgroundColor: color['--ult-color-highlight'] },
  success: { backgroundColor: color['--ult-color-success'] },
  warning: { backgroundColor: color['--ult-color-warning'] },
  danger: { backgroundColor: color['--ult-color-danger'] },
});

const valueTones = stylex.create({
  neutral: { color: color['--ult-color-text'] },
  highlight: { color: color['--ult-color-highlight-text'] },
  success: { color: color['--ult-color-success-text'] },
  warning: { color: color['--ult-color-warning-text'] },
  danger: { color: color['--ult-color-danger-text'] },
});

const TONES = ['neutral', 'highlight', 'success', 'warning', 'danger'] as const;
type MeterTone = (typeof TONES)[number];

// Compiled style objects are { <propKey>: '<classes>', $$css: true }; merging is
// last-write-wins per propKey, which is what styleq does for class strings.
function mergeStyles(
  ...list: ReadonlyArray<Record<string, string | boolean> | undefined>
): string {
  const byKey: Record<string, string> = {};
  for (const entry of list) {
    if (!entry) continue;
    for (const key of Object.keys(entry)) {
      if (key === '$$css') continue;
      byKey[key] = entry[key] as string;
    }
  }
  return Object.values(byKey).join(' ');
}

const appliedStyles = new WeakMap<HTMLElement, string>();
const ownAttributes = new WeakMap<HTMLElement, Record<string, string>>();
const labelIds = new WeakMap<HTMLElement, string>();
let labelCount = 0;

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function applyStyles(target: HTMLElement, classString: string) {
  const previous = appliedStyles.get(target);
  if (previous) for (const name of previous.split(' ')) target.classList.remove(name);
  appliedStyles.set(target, classString);
  for (const name of classString.split(' ')) target.classList.add(name);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function numberAttr(host: HTMLElement, name: string, fallback: number): number {
  const parsed = parseFloat(host.getAttribute(name) ?? '');
  return Number.isNaN(parsed) ? fallback : parsed;
}

function measurement(host: HTMLElement) {
  const min = numberAttr(host, 'min', 0);
  const max = numberAttr(host, 'max', 100);
  const raw = parseFloat(host.getAttribute('value') ?? '');
  const rawPercentage = ((raw - min) / (max - min)) * 100;
  const percentage = clamp(Number.isNaN(rawPercentage) ? 0 : rawPercentage, 0, 100);
  const value = clamp(Number.isNaN(raw) ? min : raw, min, max);
  const formatted = new Intl.NumberFormat(undefined, { style: 'percent' }).format(
    percentage / 100,
  );
  return { min, max, value, percentage, formatted };
}

function meterOf(part: HTMLElement): HTMLElement | null {
  return part.closest('ult-meter') as HTMLElement | null;
}

function toneOf(part: HTMLElement, meter: HTMLElement | null): MeterTone {
  return pick(part.getAttribute('tone') ?? meter?.getAttribute('tone') ?? null, TONES, 'neutral');
}

function syncIndicator(host: UltMeterIndicator) {
  const target = host.target;
  if (!target) return;
  const meter = meterOf(host);
  applyStyles(target, mergeStyles(styles.indicator, indicatorTones[toneOf(host, meter)]));
  target.style.width = `${meter ? measurement(meter).percentage : 0}%`;
}

function syncValue(host: UltMeterValue) {
  const target = host.target;
  if (!target) return;
  const meter = meterOf(host);
  applyStyles(target, mergeStyles(styles.value, valueTones[toneOf(host, meter)]));
  target.textContent = meter ? measurement(meter).formatted : '';
}

const FORWARDED = ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-valuetext'];

function syncMeter(host: UltMeter) {
  const root = host.target;
  if (!root) return;
  const { min, max, value, formatted } = measurement(host);
  root.setAttribute('aria-valuemin', String(min));
  root.setAttribute('aria-valuemax', String(max));
  root.setAttribute('aria-valuenow', String(value));
  const own = ownAttributes.get(root) ?? {};
  for (const name of FORWARDED) {
    const forwarded = host.getAttribute(name);
    if (forwarded !== null) {
      root.setAttribute(name, forwarded);
      own[`forwarded:${name}`] = forwarded;
      delete own[name];
    } else if (own[`forwarded:${name}`] !== undefined) {
      if (root.getAttribute(name) === own[`forwarded:${name}`]) root.removeAttribute(name);
      delete own[`forwarded:${name}`];
    }
  }
  if (
    !host.hasAttribute('aria-valuetext') &&
    root.getAttribute('aria-valuetext') === (own['aria-valuetext'] ?? null)
  ) {
    root.setAttribute('aria-valuetext', formatted);
    own['aria-valuetext'] = formatted;
  }
  if (!host.hasAttribute('aria-labelledby')) {
    const registered = labelIds.get(host);
    const labelledby = root.getAttribute('aria-labelledby');
    if (registered && (labelledby === null || labelledby === own['aria-labelledby'])) {
      root.setAttribute('aria-labelledby', registered);
      own['aria-labelledby'] = registered;
    } else if (!registered && labelledby !== null && labelledby === own['aria-labelledby']) {
      root.removeAttribute('aria-labelledby');
      delete own['aria-labelledby'];
    }
  }
  ownAttributes.set(root, own);
  for (const part of host.querySelectorAll('ult-meter-indicator')) {
    if (part.closest('ult-meter') === host) syncIndicator(part as UltMeterIndicator);
  }
  for (const part of host.querySelectorAll('ult-meter-value')) {
    if (part.closest('ult-meter') === host) syncValue(part as UltMeterValue);
  }
}

abstract class UltMeterPart extends HTMLElement {
  target: HTMLElement | null = null;

  connectedCallback() {
    if (!this.target) {
      const target = this.renderTarget();
      while (this.firstChild) target.appendChild(this.firstChild);
      this.appendChild(target);
      this.target = target;
    }
    this.mounted();
  }

  protected abstract renderTarget(): HTMLElement;

  protected mounted() {}
}

class UltMeter extends UltMeterPart {
  static observedAttributes = [
    'value',
    'min',
    'max',
    'tone',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'aria-valuetext',
  ];
  private tailed = false;

  protected renderTarget() {
    const root = document.createElement('div');
    root.setAttribute('part', 'root');
    root.setAttribute('role', 'meter');
    applyStyles(root, mergeStyles(styles.root));
    return root;
  }

  protected mounted() {
    if (!this.tailed) {
      this.tailed = true;
      const tail = document.createElement('span');
      tail.setAttribute('role', 'presentation');
      tail.style.cssText =
        'border:0;clip-path:inset(50%);height:1px;left:0;margin:-1px;overflow:hidden;padding:0;position:fixed;top:0;white-space:nowrap;width:1px';
      tail.textContent = 'x';
      this.target?.appendChild(tail);
    }
    syncMeter(this);
  }

  attributeChangedCallback() {
    syncMeter(this);
  }
}

class UltMeterLabel extends UltMeterPart {
  private meter: HTMLElement | null = null;

  protected renderTarget() {
    const label = document.createElement('span');
    label.setAttribute('part', 'label');
    label.setAttribute('role', 'presentation');
    applyStyles(label, mergeStyles(styles.label));
    return label;
  }

  protected mounted() {
    this.meter = meterOf(this);
    if (this.meter && this.target) {
      if (!this.target.id) this.target.id = `ult-meter-label-${++labelCount}`;
      labelIds.set(this.meter, this.target.id);
      syncMeter(this.meter as UltMeter);
    }
  }

  disconnectedCallback() {
    const meter = this.meter;
    this.meter = null;
    const id = this.target?.id;
    if (meter && id && labelIds.get(meter) === id) {
      labelIds.delete(meter);
      syncMeter(meter as UltMeter);
    }
  }
}

class UltMeterTrack extends UltMeterPart {
  protected renderTarget() {
    const track = document.createElement('div');
    track.setAttribute('part', 'track');
    applyStyles(track, mergeStyles(styles.track));
    return track;
  }
}

class UltMeterIndicator extends UltMeterPart {
  static observedAttributes = ['tone'];

  protected renderTarget() {
    const indicator = document.createElement('div');
    indicator.setAttribute('part', 'indicator');
    indicator.style.insetInlineStart = '0';
    indicator.style.height = 'inherit';
    return indicator;
  }

  protected mounted() {
    syncIndicator(this);
  }

  attributeChangedCallback() {
    syncIndicator(this);
  }
}

class UltMeterValue extends UltMeterPart {
  static observedAttributes = ['tone'];

  protected renderTarget() {
    const value = document.createElement('span');
    value.setAttribute('part', 'value');
    value.setAttribute('aria-hidden', 'true');
    return value;
  }

  protected mounted() {
    syncValue(this);
  }

  attributeChangedCallback() {
    syncValue(this);
  }
}

if (!customElements.get('ult-meter')) customElements.define('ult-meter', UltMeter);
if (!customElements.get('ult-meter-label')) customElements.define('ult-meter-label', UltMeterLabel);
if (!customElements.get('ult-meter-track')) customElements.define('ult-meter-track', UltMeterTrack);
if (!customElements.get('ult-meter-indicator'))
  customElements.define('ult-meter-indicator', UltMeterIndicator);
if (!customElements.get('ult-meter-value')) customElements.define('ult-meter-value', UltMeterValue);
