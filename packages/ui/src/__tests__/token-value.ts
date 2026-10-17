/** What a token resolves to for one property, read off a probe so units and colour forms match. */
export function tokenValue(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const out = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return out;
}

export const TRANSPARENT = 'rgba(0, 0, 0, 0)';

/**
 * What the element's own StyleX classes declare for one property, before the browser snaps it.
 * A computed border width is already rounded to device pixels (0.5px reads 1px at a ratio of 1),
 * so a sub-pixel width is checked against the declaration instead.
 */
export function declaredValues(element: Element, property: string): string[] {
  const values: string[] = [];
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const classes = rule.selectorText.match(/^(?:\.[\w-]+)+$/) ? new Set(rule.selectorText.slice(1).split('.')) : null;
        const value = rule.style.getPropertyValue(property);
        if (classes?.size === 1 && element.classList.contains([...classes][0] as string) && value) values.push(value);
      } else if ('cssRules' in rule) {
        visit((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) visit(sheet.cssRules);
  return values;
}
