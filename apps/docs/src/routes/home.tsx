import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space } from '@ultima/tokens/tokens.stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';

const styles = stylex.create({
  page: {
    margin: '0 auto',
    maxWidth: '48rem',
    padding: space['--ult-space-8'],
  },
  title: {
    fontSize: '1.5rem',
    margin: 0,
  },
  lede: {
    color: color['--ult-color-text-muted'],
    marginBlock: space['--ult-space-5'],
  },
  modes: {
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
  },
  panel: {
    backgroundColor: color['--ult-color-surface'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: '1px',
    color: color['--ult-color-text'],
    padding: space['--ult-space-6'],
  },
  swatch: {
    backgroundColor: color['--ult-color-accent'],
    borderRadius: radius['--ult-radius-sm'],
    color: color['--ult-color-accent-contrast'],
    display: 'inline-block',
    fontFamily: font['--ult-font-mono'],
    fontSize: '0.75rem',
    marginTop: space['--ult-space-5'],
    padding: space['--ult-space-4'],
  },
});

/**
 * The scaffold's proof of life: tokens resolve, both color modes render on one
 * page, and StyleX compiled. The real home page is decided in ULT-14.
 */
export function Home() {
  return (
    <main {...stylex.props(styles.page)}>
      <h1 {...stylex.props(styles.title)}>Ultima</h1>
      <p {...stylex.props(styles.lede)}>
        Scaffold only. Provisional tokens, no components yet.
      </p>
      <div {...stylex.props(styles.modes)}>
        <section {...stylex.props(darkTheme, colorScheme.dark, styles.panel)}>
          <strong>Dark</strong>
          <div {...stylex.props(styles.swatch)}>color['--ult-color-accent']</div>
        </section>
        <section {...stylex.props(lightTheme, colorScheme.light, styles.panel)}>
          <strong>Light</strong>
          <div {...stylex.props(styles.swatch)}>color['--ult-color-accent']</div>
        </section>
      </div>
    </main>
  );
}
