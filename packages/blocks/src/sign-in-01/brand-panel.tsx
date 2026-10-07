import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Avatar } from '@ultima/ui/avatar';

import { LogoGlyph } from './icons';

const DESKTOP = '@media (min-width: 48rem)';

const styles = stylex.create({
  panel: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-11'],
    justifyContent: 'space-between',
    padding: { default: space['--ult-space-6'], [DESKTOP]: space['--ult-space-11'] },
  },
  logo: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
  },
  name: {
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-none'],
  },
  testimonial: {
    display: { default: 'none', [DESKTOP]: 'flex' },
    flexDirection: 'column',
    gap: space['--ult-space-7'],
    margin: 0,
  },
  quote: {
    fontSize: text['--ult-text-8'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
  },
  author: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
  },
  person: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-1'],
  },
  personName: {
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-snug'],
  },
  role: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-snug'],
  },
});

export function BrandPanel() {
  return (
    <aside aria-label="Customer story" {...stylex.props(styles.panel)}>
      <div {...stylex.props(styles.logo)}>
        <LogoGlyph />
        <span {...stylex.props(styles.name)}>Northwind</span>
      </div>
      <figure {...stylex.props(styles.testimonial)}>
        <blockquote {...stylex.props(styles.quote)}>
          <p {...stylex.props(styles.quote)}>“We moved four teams onto Northwind in a week. Nobody asked for training.”</p>
        </blockquote>
        <figcaption {...stylex.props(styles.author)}>
          <Avatar.Root aria-hidden="true">
            <Avatar.Fallback>PR</Avatar.Fallback>
          </Avatar.Root>
          <span {...stylex.props(styles.person)}>
            <span {...stylex.props(styles.personName)}>Priya Raman</span>
            <span {...stylex.props(styles.role)}>COO, Kestrel Health</span>
          </span>
        </figcaption>
      </figure>
    </aside>
  );
}
