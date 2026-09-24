import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  root: {
    borderRadius: radius['--ult-radius-full'],
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    paddingInline: space['--ult-space-3'],
  },
});

class UltBadge extends HTMLElement {
  connectedCallback() {
    this.className = String(styles.root);
    this.style.display = 'inline-flex';
    this.style.width = `${Number(this.getAttribute('value'))}%`;
    this.style.color = 'red';
    this.style.setProperty('--gap', '4px');
    this.style.cssText = 'padding: 2px';
  }
}

customElements.define('ult-badge', UltBadge);

// The attribute tables the item's descriptor names, so the catalogue reads the family whole.
const VARIANTS = ['subtle', 'solid'] as const;
const TONES = ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'] as const;
void VARIANTS;
void TONES;
