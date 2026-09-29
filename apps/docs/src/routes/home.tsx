import { docsStyles } from '../docs-style';
import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, display, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui';

import { breakpoints } from '../breakpoints.stylex';
import { contrastStyles } from '../demos/home/contrast';
import Specimen from '../home-showcase';
import Workbench from '../demos/home/workbench';
import { layoutStyles } from '../layout';
import { Kicker } from '../page';
import { headings } from '../typography';
import { TextLink } from '../text-link';

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    inlineSize: '100%',
    marginInline: 'auto',
    maxInlineSize: '90rem',
  },
  hero: {
    alignItems: 'start',
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.DESKTOP]: 'row' },
    gap: { default: space['--ult-space-10'], [breakpoints.DESKTOP]: space['--ult-space-12'] },
    paddingBlockStart: { default: space['--ult-space-9'], [breakpoints.DESKTOP]: space['--ult-space-12'] },
    paddingBlockEnd: { default: space['--ult-space-10'], [breakpoints.DESKTOP]: space['--ult-space-11'] },
  },
  editorial: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-8'],
    minInlineSize: 0,
  },
  pitch: {
    alignItems: 'flex-start',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: { default: text['--ult-text-10'], [breakpoints.WIDE]: '3.875rem' },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tightest'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  intro: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    gap: space['--ult-space-8'],
    inlineSize: { default: '100%', [breakpoints.DESKTOP]: '24.5rem' },
    paddingBlockStart: { default: 0, [breakpoints.DESKTOP]: space['--ult-space-11'] },
  },
  proposition: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-6'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  heroAction: { inlineSize: '100%', justifyContent: 'space-between', paddingInline: space['--ult-space-7'] },
  guide: {
    fontSize: text['--ult-text-4'],
  },
  specimen: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-8'],
    paddingBlockEnd: space['--ult-space-11'],
  },
  showcaseHeading: { fontSize: text['--ult-text-10'] },
  workbench: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-8'],
    paddingBlockStart: space['--ult-space-5'],
    paddingBlockEnd: space['--ult-space-11'],
  },
  installIntro: {
    display: 'flex',
    flexBasis: '20rem',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-6'],
    minInlineSize: 0,
  },
  installHeadline: {
    color: color['--ult-color-text'],
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: display.headline,
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  installDescription: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-5'],
    lineHeight: font['--ult-font-leading-relaxed'],
    margin: 0,
  },
  commands: { flexBasis: '26rem', flexGrow: 1, maxInlineSize: '40rem', minInlineSize: 0 },
});

export function Home() {
  return (
    <main {...stylex.props(styles.page)}>
      <section {...stylex.props(layoutStyles.gutterWide, styles.hero)}>
        <div {...stylex.props(styles.editorial)}>
          <Kicker tone="muted">REACT + STYLEX</Kicker>
          <h1 {...stylex.props(styles.pitch)}>
            <span>
              React components.
              <br />
              Built with StyleX.
            </span>
            <span {...stylex.props(contrastStyles.mark)}>Yours to change.</span>
          </h1>
        </div>
        <div {...stylex.props(styles.intro)}>
          <p {...stylex.props(styles.proposition)}>
            Build on Base UI behavior and a shared system of semantic tokens. Install component source into your project and adapt it there.
          </p>
          <Button
            size="lg"
            style={[docsStyles.square, contrastStyles.root, styles.heroAction]}
            render={<Link to="/components" />}
            nativeButton={false}
          >
            Explore the components <ArrowUpRightIcon aria-hidden />
          </Button>
          <TextLink variant="muted" style={styles.guide} render={<Link to="/install" />}>
            Installation guide <ArrowUpRightIcon aria-hidden />
          </TextLink>
        </div>
      </section>

      <section aria-labelledby="specimen-index" {...stylex.props(layoutStyles.gutterWide, styles.specimen)}>
        <h2 id="specimen-index" {...stylex.props(headings.h1, styles.showcaseHeading)}>Meet the components.</h2>
        <p {...stylex.props(styles.installDescription)}>Explore the parts you can bring into your React project.</p>
        <Specimen />
      </section>

      <section aria-labelledby="install-headline" {...stylex.props(layoutStyles.gutterWide, styles.workbench)}>
        <div {...stylex.props(styles.installIntro)}>
          <Kicker tone="muted">03 / MAKE IT YOURS</Kicker>
          <h2 id="install-headline" {...stylex.props(styles.installHeadline)}>
            Start with one
            <br />
            component.
          </h2>
          <p {...stylex.props(styles.installDescription)}>
            Set up StyleX for your React project, then add your first component with the shadcn CLI.
          </p>
        </div>
        <div {...stylex.props(styles.commands)}>
          <Workbench />
        </div>
      </section>
    </main>
  );
}
