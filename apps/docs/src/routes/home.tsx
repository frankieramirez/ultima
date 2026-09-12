import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Separator } from '@ultima/ui';

import Playground from '../demos/home/playground';
import { actionStyles } from '../demos/home/action';



const FEATURES = [
  {
    title: 'StyleX at the core',
    description: 'A component vocabulary that speaks StyleX, from your first token to your final interface.',
  },
  {
    title: 'Make it unmistakably yours',
    description: 'Shape the color, rhythm, and feel of your product through a shared token foundation.',
  },
  {
    title: 'Own every detail',
    description: 'Bring the components into your codebase. Compose, adapt, and build beyond the defaults.',
  },
];

const DESKTOP = '@media (min-width: 48rem)';

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-10'],
    paddingBlock: space['--ult-space-10'],
    paddingInlineStart: { default: space['--ult-space-6'], [DESKTOP]: '3.5rem' },
    paddingInlineEnd: { default: space['--ult-space-6'], [DESKTOP]: space['--ult-space-12'] },
  },
  hero: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-8'] },
  eyebrow: {
    color: color['--ult-color-accent-text'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    letterSpacing: '0.1em',
    margin: 0,
  },
  pitch: {
    color: color['--ult-color-text'],
    fontSize: { default: 'clamp(2.25rem, 6vw, 4.5rem)', [DESKTOP]: 'clamp(2.75rem, 4.5vw, 4.5rem)' },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: '-0.04em',
    lineHeight: 1.04,
    margin: 0,
  },
  prose: {
    color: color['--ult-color-text-muted'],
    fontSize: { default: text['--ult-text-6'], [DESKTOP]: text['--ult-text-7'] },
    lineHeight: 1.5,
    margin: 0,
  },
  actions: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
    paddingBlockStart: space['--ult-space-4'],
  },
  mono: { fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'] },
  muted: { color: color['--ult-color-text-subtle'] },
  features: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-8'], paddingBlock: space['--ult-space-4'] },
  marker: { color: color['--ult-color-accent-text'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'], fontWeight: font['--ult-font-weight-regular'], margin: 0 },
  columns: {
    display: 'grid',
    gap: space['--ult-space-10'],
    gridTemplateColumns: { default: 'minmax(0, 1fr)', '@media (min-width: 64rem)': 'repeat(3, minmax(0, 1fr))' },
  },
  feature: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-5'] },
  number: { paddingBlockStart: space['--ult-space-2'] },
  heading: { color: color['--ult-color-text'], fontSize: text['--ult-text-7'], fontWeight: font['--ult-font-weight-medium'], margin: 0 },
  description: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-4'], lineHeight: font['--ult-font-leading-relaxed'], margin: 0 },
  invitation: { display: 'flex', flexDirection: 'column', gap: '1.75rem' },
  closing: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-8'], justifyContent: 'space-between' },
  closingCopy: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-4'] },
  closingTitle: { fontSize: text['--ult-text-9'], fontWeight: font['--ult-font-weight-medium'], margin: 0 },
  closingNote: { color: color['--ult-color-text-muted'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'], margin: 0 },
  footer: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-6'], justifyContent: 'space-between' },
  footerLinks: { display: 'flex', gap: space['--ult-space-6'] },
  footerLink: { fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'], paddingInline: 0 },
});

export function Home() {
  return (
    <main {...stylex.props(styles.page)}>
      <section {...stylex.props(styles.hero)}>
        <p {...stylex.props(styles.eyebrow)}>ULTIMA / UI FOR STYLEX</p>
        <h1 {...stylex.props(styles.pitch)}>Exceptional interfaces.<br />Down to the variable.</h1>
        <p {...stylex.props(styles.prose)}>
          Beautiful components. Expressive tokens. Code you own.<br />
          Built on Base UI and StyleX. Installed through the shadcn CLI.
        </p>
        <div {...stylex.props(styles.actions)}>
          <Button style={actionStyles.root} render={<Link to="/install" />} nativeButton={false}>Start building</Button>
          <Button variant="outline" render={<Link to="/components" />} nativeButton={false}>
            Explore components <ArrowUpRightIcon aria-hidden />
          </Button>
          <span {...stylex.props(styles.mono, styles.muted)}>Built with StyleX</span>
        </div>
      </section>

      <Playground />

      <section aria-labelledby="built-different" {...stylex.props(styles.features)}>
        <h2 id="built-different" {...stylex.props(styles.marker)}>--built-different</h2>
        <div {...stylex.props(styles.columns)}>
          {FEATURES.map(({ title, description }, index) => (
            <div key={title} {...stylex.props(styles.feature)}>
              <Separator />
              <span {...stylex.props(styles.mono, styles.muted, styles.number)}>0{index + 1}</span>
              <h3 {...stylex.props(styles.heading)}>{title}</h3>
              <p {...stylex.props(styles.description)}>{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section {...stylex.props(styles.invitation)}>
        <Separator />
        <div {...stylex.props(styles.closing)}>
          <div {...stylex.props(styles.closingCopy)}>
            <h2 {...stylex.props(styles.closingTitle)}>Your next interface starts here.</h2>
            <p {...stylex.props(styles.closingNote)}>A new foundation. Entirely your own.</p>
          </div>
          <Button style={actionStyles.root} render={<Link to="/components" />} nativeButton={false}>
            Browse the components <ArrowUpRightIcon aria-hidden />
          </Button>
        </div>
        <Separator />
      </section>

      <footer {...stylex.props(styles.footer)}>
        <span {...stylex.props(styles.mono, styles.muted)}>ULTIMA&nbsp; / &nbsp;The final spell for your interfaces.</span>
        <div {...stylex.props(styles.footerLinks)}>
          <Button variant="ghost" nativeButton={false} render={<a href="https://github.com/frankieramirez/ultima" />} style={styles.footerLink}>
            GitHub <ArrowUpRightIcon aria-hidden />
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link to="/install" />} style={styles.footerLink}>
            Documentation <ArrowUpRightIcon aria-hidden />
          </Button>
        </div>
      </footer>
    </main>
  );
}
