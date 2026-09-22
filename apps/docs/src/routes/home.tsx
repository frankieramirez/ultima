import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, display, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Separator } from '@ultima/ui';

import { contrastStyles } from '../demos/home/contrast';
import Specimen from '../demos/home/specimen';
import Workbench from '../demos/home/workbench';
import { layoutStyles } from '../layout';

const DESKTOP = '@media (min-width: 64rem)';

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    inlineSize: '100%',
    marginInline: 'auto',
    maxInlineSize: '90rem',
  },
  hero: {
    alignItems: { default: 'start', [DESKTOP]: 'end' },
    display: 'flex',
    flexDirection: { default: 'column', [DESKTOP]: 'row' },
    gap: { default: space['--ult-space-10'], [DESKTOP]: space['--ult-space-12'] },
    paddingBlockStart: { default: space['--ult-space-9'], [DESKTOP]: space['--ult-space-12'] },
    paddingBlockEnd: space['--ult-space-11'],
  },
  editorial: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-8'],
    minInlineSize: 0,
  },
  index: {
    color: color['--ult-color-text-muted'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    letterSpacing: font['--ult-font-tracking-wide'],
    margin: 0,
  },
  pitch: {
    alignItems: 'flex-start',
    color: color['--ult-color-text'],
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
    gap: space['--ult-space-8'],
    inlineSize: { default: '100%', [DESKTOP]: '24.5rem' },
    paddingBlockEnd: { default: 0, [DESKTOP]: space['--ult-space-5'] },
  },
  proposition: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-6'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
  heroAction: {
    inlineSize: '100%',
    justifyContent: 'space-between',
    paddingInline: space['--ult-space-7'],
  },
  guide: {
    alignItems: 'center',
    color: { default: color['--ult-color-text-muted'], ':hover': color['--ult-color-text'] },
    display: 'inline-flex',
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-1'],
    textDecoration: 'none',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  specimen: {
    display: 'flex',
    flexDirection: 'column',
    paddingBlockEnd: space['--ult-space-11'],
  },
  metadata: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-6'],
  },
  scale: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    letterSpacing: font['--ult-font-tracking-wide'],
    margin: 0,
  },
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
  commands: {
    flexBasis: '26rem',
    flexGrow: 1,
    maxInlineSize: '40rem',
    minInlineSize: 0,
  },
});

export function Home() {
  return (
    <main {...stylex.props(styles.page)}>
      <section {...stylex.props(layoutStyles.gutterWide, styles.hero)}>
        <div {...stylex.props(styles.editorial)}>
          <p {...stylex.props(styles.index)}>01 / A SYSTEM FOR BUILDING</p>
          <h1 {...stylex.props(styles.pitch)}>
            <span>
              Good interfaces
              <br />
              start with
            </span>
            <span {...stylex.props(contrastStyles.mark)}>good parts.</span>
          </h1>
        </div>
        <div {...stylex.props(styles.intro)}>
          <p {...stylex.props(styles.proposition)}>
            React components with a common language. Precise tokens, Base UI behavior, and StyleX styling. Ready to
            become your code.
          </p>
          <Button size="lg" style={[contrastStyles.root, styles.heroAction]} render={<Link to="/components" />} nativeButton={false}>
            Explore the components <ArrowUpRightIcon aria-hidden />
          </Button>
          <Link to="/install" {...stylex.props(styles.guide)}>
            Installation guide <ArrowUpRightIcon aria-hidden />
          </Link>
        </div>
      </section>

      <section aria-labelledby="specimen-index" {...stylex.props(layoutStyles.gutterWide, styles.specimen)}>
        <Separator />
        <div {...stylex.props(styles.metadata)}>
          <p id="specimen-index" {...stylex.props(styles.index)}>02 / ANATOMY OF AN INTERFACE</p>
          <p {...stylex.props(styles.scale)}>TOKENS → COMPONENTS → YOUR PRODUCT</p>
        </div>
        <Specimen />
      </section>

      <section aria-labelledby="install-headline" {...stylex.props(layoutStyles.gutterWide, styles.workbench)}>
        <div {...stylex.props(styles.installIntro)}>
          <p {...stylex.props(styles.index)}>03 / MAKE IT YOURS</p>
          <h2 id="install-headline" {...stylex.props(styles.installHeadline)}>
            From our system
            <br />
            to your source.
          </h2>
          <p {...stylex.props(styles.installDescription)}>
            Set up StyleX, add a component, and take it from there. No hidden styling layer. No locked-in theme.
          </p>
        </div>
        <div {...stylex.props(styles.commands)}>
          <Workbench />
        </div>
      </section>
    </main>
  );
}
