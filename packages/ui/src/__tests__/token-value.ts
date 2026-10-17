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
