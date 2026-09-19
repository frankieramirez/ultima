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

function applyStyles(host: HTMLElement, classString: string) {
  const previous = appliedStyles.get(host);
  if (previous) for (const name of previous.split(' ')) host.classList.remove(name);
  appliedStyles.set(host, classString);
  for (const name of classString.split(' ')) host.classList.add(name);
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

function syncIndicator(host: HTMLElement) {
  const meter = meterOf(host);
  applyStyles(host, mergeStyles(styles.indicator, indicatorTones[toneOf(host, meter)]));
  host.style.width = `${meter ? measurement(meter).percentage : 0}%`;
}

function syncValue(host: HTMLElement) {
  const meter = meterOf(host);
  applyStyles(host, mergeStyles(styles.value, valueTones[toneOf(host, meter)]));
  host.textContent = meter ? measurement(meter).formatted : '';
}

function syncMeter(host: HTMLElement) {
  const { min, max, value, formatted } = measurement(host);
  host.setAttribute('aria-valuemin', String(min));
  host.setAttribute('aria-valuemax', String(max));
  host.setAttribute('aria-valuenow', String(value));
  const own = ownAttributes.get(host) ?? {};
  if (host.getAttribute('aria-valuetext') === (own['aria-valuetext'] ?? null)) {
    host.setAttribute('aria-valuetext', formatted);
    own['aria-valuetext'] = formatted;
  }
  const registered = labelIds.get(host);
  const labelledby = host.getAttribute('aria-labelledby');
  if (registered && (labelledby === null || labelledby === own['aria-labelledby'])) {
    host.setAttribute('aria-labelledby', registered);
    own['aria-labelledby'] = registered;
  } else if (!registered && labelledby !== null && labelledby === own['aria-labelledby']) {
    host.removeAttribute('aria-labelledby');
    delete own['aria-labelledby'];
  }
  ownAttributes.set(host, own);
  for (const part of host.querySelectorAll('ult-meter-indicator')) {
    if (part.closest('ult-meter') === host) syncIndicator(part as HTMLElement);
  }
  for (const part of host.querySelectorAll('ult-meter-value')) {
    if (part.closest('ult-meter') === host) syncValue(part as HTMLElement);
  }
}

class UltMeter extends HTMLElement {
  static observedAttributes = ['value', 'min', 'max', 'tone'];
  private rendered = false;

  connectedCallback() {
    if (!this.rendered) {
      this.rendered = true;
      this.setAttribute('part', 'root');
      this.setAttribute('role', 'meter');
      applyStyles(this, mergeStyles(styles.root));
      const tail = document.createElement('span');
      tail.setAttribute('role', 'presentation');
      tail.style.cssText =
        'border:0;clip-path:inset(50%);height:1px;left:0;margin:-1px;overflow:hidden;padding:0;position:fixed;top:0;white-space:nowrap;width:1px';
      tail.textContent = 'x';
      this.appendChild(tail);
    }
    syncMeter(this);
  }

  attributeChangedCallback() {
    syncMeter(this);
  }
}

class UltMeterLabel extends HTMLElement {
  private meter: HTMLElement | null = null;

  connectedCallback() {
    if (!this.hasAttribute('part')) {
      this.setAttribute('part', 'label');
      this.setAttribute('role', 'presentation');
      applyStyles(this, mergeStyles(styles.label));
    }
    this.meter = meterOf(this);
    if (this.meter) {
      if (!this.id) this.id = `ult-meter-label-${++labelCount}`;
      labelIds.set(this.meter, this.id);
      syncMeter(this.meter);
    }
  }

  disconnectedCallback() {
    const meter = this.meter;
    this.meter = null;
    if (meter && this.id && labelIds.get(meter) === this.id) {
      labelIds.delete(meter);
      syncMeter(meter);
    }
  }
}

class UltMeterTrack extends HTMLElement {
  connectedCallback() {
    if (this.hasAttribute('part')) return;
    this.setAttribute('part', 'track');
    applyStyles(this, mergeStyles(styles.track));
  }
}

class UltMeterIndicator extends HTMLElement {
  static observedAttributes = ['tone'];

  connectedCallback() {
    if (!this.hasAttribute('part')) {
      this.setAttribute('part', 'indicator');
      this.style.display = 'block';
      this.style.insetInlineStart = '0';
      this.style.height = 'inherit';
    }
    syncIndicator(this);
  }

  attributeChangedCallback() {
    syncIndicator(this);
  }
}

class UltMeterValue extends HTMLElement {
  static observedAttributes = ['tone'];

  connectedCallback() {
    if (!this.hasAttribute('part')) {
      this.setAttribute('part', 'value');
      this.setAttribute('aria-hidden', 'true');
    }
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
