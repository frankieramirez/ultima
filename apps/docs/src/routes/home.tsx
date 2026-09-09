import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space } from '@ultima/tokens/tokens.stylex';
import { darkTheme, lightTheme } from '@ultima/tokens';

const styles = stylex.create({
  page: {
    margin: '0 auto',
    maxWidth: '48rem',
    padding: space.xl,
  },
  title: {
    fontSize: '1.5rem',
    margin: 0,
  },
  lede: {
    color: color.textMuted,
    marginBlock: space.md,
  },
  modes: {
    display: 'grid',
    gap: space.lg,
    gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
  },
  panel: {
    backgroundColor: color.surface,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderStyle: 'solid',
    borderWidth: '1px',
    color: color.text,
    padding: space.lg,
  },
  swatch: {
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    color: color.accentText,
    display: 'inline-block',
    fontFamily: font.mono,
    fontSize: '0.75rem',
    marginTop: space.md,
    padding: space.sm,
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
        <section {...stylex.props(darkTheme, styles.panel)}>
          <strong>Dark</strong>
          <div {...stylex.props(styles.swatch)}>color.accent</div>
        </section>
        <section {...stylex.props(lightTheme, styles.panel)}>
          <strong>Light</strong>
          <div {...stylex.props(styles.swatch)}>color.accent</div>
        </section>
      </div>
    </main>
  );
}
