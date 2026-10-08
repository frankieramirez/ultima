import type { Page } from 'playwright';
import type { TokenTable } from '../packages/tokens/src/theme/draft.ts';
import type { ConsumerLayout, DeliveryPath } from './consumer-report.ts';

export async function consumerValues(page: Page, table: TokenTable, mode: 'dark' | 'light', id: string, layout: ConsumerLayout, deliveryPath: DeliveryPath) {
  return page.evaluate(({ table, mode, id, layout, deliveryPath }) => {
    const subtree = deliveryPath === 'stylex-subtree';
    const rootElement = subtree ? document.querySelector('[data-testid="proof-root"]')! : document.documentElement;
    const root = getComputedStyle(rootElement);
    const control = document.querySelector('[data-testid="proof-control"]')!;
    const popup = document.querySelector('[data-testid="proof-portal"]')!;
    const a = document.createElement('div');
    const b = document.createElement('div');
    document.body.append(a, b);
    const canonical = (value: string) => value.replace(/rgba\(([^,]+), ([^,]+), ([^,]+), ([\d.]+)\)/g, (_, r, g, b, alpha) => `rgba(${r}, ${g}, ${b}, ${Math.round(Number(alpha) * 255) / 255})`).replace(/-?\d*\.?\d+/g, (number) => String(Math.round(Number(number) * 1000) / 1000));
    const normalize = (value: string, property = 'color') => {
      b.style.cssText = 'font-size:16px';
      b.style.setProperty(property, value);
      return canonical(getComputedStyle(b).getPropertyValue(property));
    };
    const failures: string[] = [];
    const variablesFor = (element: Element) => Object.fromEntries(Object.entries(table).map(([token, value]) => {
      const property = token.startsWith('--ult-color-') ? 'color' : token.startsWith('--ult-space-') ? 'margin-left' : token.startsWith('--ult-text-') ? 'font-size' : token.startsWith('--ult-radius-') ? 'border-radius' : token.startsWith('--ult-shadow-') ? 'box-shadow' : token.startsWith('--ult-filter-') ? 'filter' : token.startsWith('--ult-motion-') ? 'transition-duration' : token.includes('tracking') ? 'letter-spacing' : token.includes('leading') ? 'line-height' : token.includes('weight') ? 'font-weight' : 'font-family';
      const raw = getComputedStyle(element).getPropertyValue(token).trim();
      a.style.cssText = 'font-size:16px';
      a.style.setProperty(property, raw);
      const actual = canonical(getComputedStyle(a).getPropertyValue(property));
      const expected = normalize(value, property);
      if (!raw || actual !== expected) failures.push(`${element.tagName} ${token}: expected ${expected}, got ${raw ? actual : 'missing'}`);
      return [token, { expected, actual, raw, draft: value }];
    }));
    const variables = variablesFor(rootElement);
    const controlVariables = variablesFor(control);
    const portalVariables = variablesFor(popup);
    const expected = {
      root: { backgroundColor: normalize(table['--ult-color-surface']!), color: normalize(table['--ult-color-text']!) },
      control: { backgroundColor: normalize(table['--ult-color-accent']!), color: normalize(table['--ult-color-accent-contrast']!) },
      status: { backgroundColor: normalize(table['--ult-color-success']!), color: normalize(table['--ult-color-success-contrast']!) },
      portal: { backgroundColor: normalize(table['--ult-color-surface-raised']!), color: normalize(table['--ult-color-text']!) },
    };
    const paint = (element: Element | null) => element ? { backgroundColor: canonical(getComputedStyle(element).backgroundColor), color: canonical(getComputedStyle(element).color) } : null;
    const actual = { root: paint(rootElement), control: paint(control), status: paint(document.querySelector('[data-testid="proof-status"]')), portal: paint(popup) };
    for (const part of ['root', 'control', 'status', 'portal'] as const) for (const property of ['backgroundColor', 'color'] as const) if (actual[part]?.[property] !== expected[part][property]) failures.push(`${part}.${property}: expected ${expected[part][property]}, got ${actual[part]?.[property] ?? 'missing element'}`);
    for (const element of [rootElement, control, popup]) if (getComputedStyle(element).colorScheme !== mode) failures.push(`${element.tagName} color-scheme differs from ${mode}`);
    const portal = { inContainer: !!popup.closest('[data-proof-portal-container]'), documentSurface: getComputedStyle(document.documentElement).getPropertyValue('--ult-color-surface').trim(), subtreeSurface: root.getPropertyValue('--ult-color-surface').trim(), colorScheme: getComputedStyle(popup).colorScheme };
    if (subtree && (!portal.inContainer || portal.documentSurface === portal.subtreeSurface)) failures.push('portal must inherit the distinct subtree inside its container');
    const css = getComputedStyle(control);
    const extraction = { tokens: { height: table['--ult-space-10'], radius: table['--ult-radius-md'] }, expected: { height: normalize(table['--ult-space-10']!, 'height'), radius: normalize(table['--ult-radius-md']!, 'border-radius'), display: 'inline-flex' }, actual: { height: css.height, radius: css.borderRadius, display: css.display } };
    for (const property of ['height', 'radius', 'display'] as const) if (extraction.actual[property] !== extraction.expected[property]) failures.push(`control.${property}: expected ${extraction.expected[property]}, got ${extraction.actual[property]}`);
    a.remove(); b.remove();
    return { id, mode, engine: 'chromium', layout, deliveryPath, variables, controlVariables, portalVariables, expected, actual, extraction, portal, colorScheme: root.colorScheme, controlColorScheme: css.colorScheme, failures };
  }, { table, mode, id, layout, deliveryPath });
}
