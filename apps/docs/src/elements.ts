import { elements } from './generated/elements';

export { elements } from './generated/elements';

/**
 * The element catalogue as the docs site reads it: one entry per registry item that also ships as a
 * custom element. `generated/elements.ts` holds the entries, from the element descriptors and the
 * tags and value tables in `packages/elements/src/ult-<item>.element.ts`.
 */
export type ElementAttribute = {
  name: string;
  on: string;
  /** The allowed values, or a sentence when the attribute is free-form. */
  values: readonly string[] | string;
};

export type ElementEntry = {
  item: string;
  tag: string;
  /** Every tag the family defines, the root first. */
  tags: readonly string[];
  attributes: readonly ElementAttribute[];
  example: string;
};

export const ELEMENTS_BUNDLE = '/elements/ultima.js';

export function elementFor(item: string): ElementEntry {
  const entry = elements.find((element) => element.item === item);
  if (!entry) throw new Error(`no element ships for the "${item}" item`);
  return entry;
}

export function loadElements() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[src="${ELEMENTS_BUNDLE}"]`)) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = ELEMENTS_BUNDLE;
  document.head.append(script);
}
