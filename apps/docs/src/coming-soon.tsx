import * as stylex from '@stylexjs/stylex';
import { border, color, display, font, motion, space, text } from '@ultima/tokens/tokens.stylex';
import { Card, Separator } from '@ultima/ui';

import { BrandLogo } from './brand-logo';
import { breakpoints } from './breakpoints.stylex';
import { contrastStyles } from './demos/home/contrast';
import { layoutStyles } from './layout';

// The six scales, each drawn in the semantic role it anchors, so the band follows the theme.
const SCALES = [
  { name: 'MITHRIL', role: 'NEUTRAL', color: color['--ult-color-border-strong'] },
  { name: 'ARCANE', role: 'ACCENT', color: color['--ult-color-accent'] },
  { name: 'MANA', role: 'HIGHLIGHT', color: color['--ult-color-highlight'] },
  { name: 'VERDANT', role: 'SUCCESS', color: color['--ult-color-success'] },
  { name: 'EMBER', role: 'WARNING', color: color['--ult-color-warning'] },
  { name: 'RUIN', role: 'DANGER', color: color['--ult-color-danger'] },
];

const charge = stylex.keyframes({
  from: { transform: 'scaleX(0)' },
  to: { transform: 'scaleX(1)' },
});

const blink = stylex.keyframes({
  '0%, 49%': { opacity: 1 },
  '50%, 100%': { opacity: 0 },
});

const styles = stylex.create({
  page: {
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    inlineSize: '100%',
    marginInline: 'auto',
    maxInlineSize: '90rem',
    minBlockSize: '100dvh',
  },
  top: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    paddingBlock: { default: space['--ult-space-8'], [breakpoints.WIDE]: space['--ult-space-9'] },
  },
  logo: { blockSize: 'auto', display: 'block' },
  kicker: {
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    letterSpacing: font['--ult-font-tracking-wide'],
    margin: 0,
  },
  subtle: { color: color['--ult-color-text-subtle'] },
  muted: { color: color['--ult-color-text-muted'] },
  hero: {
    alignItems: { default: 'stretch', [breakpoints.DESKTOP]: 'end' },
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.DESKTOP]: 'row' },
    gap: { default: space['--ult-space-10'], [breakpoints.DESKTOP]: space['--ult-space-12'] },
    justifyContent: 'space-between',
    // Centred between the header and the scales on a wide screen; below that, it sits on the scales.
    marginBlockEnd: { default: 0, [breakpoints.DESKTOP]: 'auto' },
    marginBlockStart: 'auto',
    paddingBlock: space['--ult-space-11'],
  },
  editorial: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-8'],
    minInlineSize: 0,
  },
  headline: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    fontSize: display.hero,
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tightest'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  intro: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    gap: space['--ult-space-9'],
    inlineSize: { default: '100%', [breakpoints.DESKTOP]: '25rem' },
    maxInlineSize: '36rem',
  },
  proposition: {
    color: color['--ult-color-text-muted'],
    fontSize: { default: text['--ult-text-5'], [breakpoints.WIDE]: text['--ult-text-6'] },
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  specimen: { inlineSize: '100%' },
  toolbar: {
    alignItems: 'center',
    borderBlockEndColor: color['--ult-color-border'],
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: border.hairline,
    display: 'flex',
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-6'],
  },
  state: { color: color['--ult-color-highlight-text'] },
  code: {
    color: color['--ult-color-text-muted'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-relaxed'],
    margin: 0,
    paddingBlock: space['--ult-space-7'],
    paddingInline: space['--ult-space-7'],
    whiteSpace: 'pre',
  },
  property: { color: color['--ult-color-accent-text'] },
  value: { color: color['--ult-color-highlight-text'] },
  caret: {
    animationDuration: motion['--ult-motion-loop'],
    animationIterationCount: 'infinite',
    animationName: blink,
    animationTimingFunction: 'step-end',
    backgroundColor: color['--ult-color-highlight'],
    display: 'inline-block',
    blockSize: '1.1em',
    inlineSize: '0.6em',
    marginInlineStart: space['--ult-space-3'],
    verticalAlign: 'text-bottom',
  },
  scales: {
    display: 'grid',
    gap: { default: space['--ult-space-7'], [breakpoints.WIDE]: space['--ult-space-8'] },
    gridTemplateColumns: { default: 'repeat(3, minmax(0, 1fr))', [breakpoints.DESKTOP]: 'repeat(6, minmax(0, 1fr))' },
    listStyle: 'none',
    margin: 0,
    padding: 0,
    paddingBlockEnd: { default: space['--ult-space-10'], [breakpoints.WIDE]: space['--ult-space-12'] },
  },
  scale: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-2'] },
  bar: {
    animationDuration: motion['--ult-motion-slow'],
    animationFillMode: 'both',
    animationName: charge,
    animationTimingFunction: 'ease-out',
    blockSize: space['--ult-space-1'],
    marginBlockEnd: space['--ult-space-5'],
    transformOrigin: 'left',
  },
  footer: {
    alignItems: { default: 'flex-start', [breakpoints.WIDE]: 'center' },
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.WIDE]: 'row' },
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-8'],
  },
});

const scaleStyles = stylex.create({
  bar: (fill: string, order: number) => ({
    animationDelay: `calc(${motion['--ult-motion-fast']} * ${order})`,
    backgroundColor: fill,
  }),
});

/**
 * What the production deploy serves until launch. The build swaps it in for the site entry; see
 * `comingSoon` in vite.config.ts.
 */
export function ComingSoon() {
  return (
    <div {...stylex.props(layoutStyles.gutterWide, styles.page)}>
      <header {...stylex.props(styles.top)}>
        <BrandLogo alt="Ultima" width={140} height={20} style={styles.logo} />
        <p {...stylex.props(styles.kicker, styles.subtle)}>V0 / IN DEVELOPMENT</p>
      </header>

      <main {...stylex.props(styles.hero)}>
        <div {...stylex.props(styles.editorial)}>
          <p {...stylex.props(styles.kicker, styles.subtle)}>00 / COMING SOON</p>
          <h1 {...stylex.props(styles.headline)}>
            <span>Ultima is still</span>
            <span {...stylex.props(contrastStyles.mark)}>charging.</span>
          </h1>
        </div>
        <div {...stylex.props(styles.intro)}>
          <p {...stylex.props(styles.proposition)}>
            Tokens and React components on Base UI and StyleX, installed as source through a shadcn
            registry. The documentation opens with v0.
          </p>
          <Card.Root style={styles.specimen} aria-hidden>
            <div {...stylex.props(styles.toolbar)}>
              <p {...stylex.props(styles.kicker, styles.subtle)}>ultima.css</p>
              <p {...stylex.props(styles.kicker, styles.state)}>BUILDING</p>
            </div>
            <pre {...stylex.props(styles.code)}>
              {':root {\n  '}
              <span {...stylex.props(styles.property)}>--ultima</span>
              {': '}
              <span {...stylex.props(styles.value)}>charging</span>
              {';'}
              <span {...stylex.props(styles.caret)} />
              {'\n}'}
            </pre>
          </Card.Root>
        </div>
      </main>

      <section aria-label="Scales">
        <ul {...stylex.props(styles.scales)}>
          {SCALES.map((scale, order) => (
            <li key={scale.name} {...stylex.props(styles.scale)}>
              <span {...stylex.props(styles.bar, scaleStyles.bar(scale.color, order))} />
              <span {...stylex.props(styles.kicker, styles.muted)}>{scale.name}</span>
              <span {...stylex.props(styles.kicker, styles.subtle)}>{scale.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <Separator />
      <footer {...stylex.props(styles.footer)}>
        <p {...stylex.props(styles.kicker, styles.subtle)}>ULTIMA / A SYSTEM FOR BUILDING INTERFACES</p>
        <p {...stylex.props(styles.kicker, styles.subtle)}>© 2026 Frankie Ramirez</p>
      </footer>
    </div>
  );
}
