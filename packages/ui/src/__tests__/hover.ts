/**
 * Whether the element's stylesheet rules paint a `:hover` only inside `@media (hover: hover)`, so a
 * tapped control doesn't stay lit on a phone. Reads the rules matching the element's classes.
 */
export function hoversOnlyWhereHover(element: Element): boolean {
  const classes = [...element.classList].map((name) => `.${name}`);
  const found = { gated: false, bare: false };
  const visit = (rules: CSSRuleList, media: string | null): void => {
    for (const rule of rules) {
      if (rule instanceof CSSMediaRule) visit(rule.cssRules, rule.conditionText);
      else if (rule instanceof CSSLayerBlockRule) visit(rule.cssRules, media);
      else if (
        rule instanceof CSSStyleRule &&
        rule.selectorText.includes(':hover') &&
        classes.some((name) => rule.selectorText.includes(name)) &&
        (rule.style.backgroundColor !== '' || rule.style.color !== '')
      ) {
        if (media === '(hover: hover)') found.gated = true;
        else found.bare = true;
      }
    }
  };
  for (const sheet of document.styleSheets) visit(sheet.cssRules, null);
  return found.gated && !found.bare;
}
