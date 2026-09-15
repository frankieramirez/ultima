const REDUCED_MOTION = 'prefers-reduced-motion';

/**
 * Every rule inside a `prefers-reduced-motion` query that sets `property`, across the sheets the
 * page has loaded. A looping component owes proof bar item 8 an `animation-name: none` under that
 * query, and Chromium reports the unreduced value from `getComputedStyle`, so the rule is the only
 * place the reduced half is readable without switching the browser's own preference.
 */
export function reducedMotionRules(property: string): CSSStyleRule[] {
  const found: CSSStyleRule[] = [];

  function walk(rules: CSSRuleList, reduced: boolean) {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        walk(rule.cssRules, reduced || rule.conditionText.includes(REDUCED_MOTION));
      } else if (rule instanceof CSSGroupingRule) {
        walk(rule.cssRules, reduced);
      } else if (reduced && rule instanceof CSSStyleRule && rule.style.getPropertyValue(property)) {
        found.push(rule);
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules, false);
    } catch {
      continue;
    }
  }

  return found;
}
