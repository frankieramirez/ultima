import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Code } from '@ultima/ui';

import { CopyButton } from '../copy-button';
import CardOverview from '../demos/card/overview';
import CodeBlock from '../demos/code/block';
import ButtonVariants from '../demos/button/variants';

const REPO = 'https://github.com/frankieramirez/ultima';
const HOST = 'https://ultima.systems';

const INSTALL = [
  {
    target: 'Vite',
    commands: `npx shadcn add ${HOST}/r/setup-vite.json\nnpx shadcn add @ultima/button`,
  },
  {
    target: 'Next.js App Router',
    commands: `npx shadcn add ${HOST}/r/setup-next.json\nnpx shadcn add @ultima/button`,
  },
];

const DEMOS = [
  { name: 'Button', slug: 'button', component: ButtonVariants },
  { name: 'Card and Stat', slug: 'card', component: CardOverview },
  { name: 'Code', slug: 'code', component: CodeBlock },
];

const PAGES = [
  { to: '/install' as const, label: 'Install' },
  { to: '/components' as const, label: 'Components' },
  { to: '/tokens' as const, label: 'Tokens' },
  { to: '/rationale' as const, label: 'Rationale' },
];

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-10'],
    marginInline: 'auto',
    maxWidth: '64rem',
    paddingBlock: space['--ult-space-10'],
    paddingInline: space['--ult-space-6'],
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
  },
  wordmark: {
    margin: 0,
  },
  logo: {
    display: 'block',
    height: 'auto',
    maxWidth: '34rem',
    width: '100%',
  },
  pitch: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-8'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
    maxWidth: '36rem',
  },
  prose: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-5'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    maxWidth: '44rem',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
  },
  heading: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  strip: {
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
  },
  tile: {
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  stage: {
    backgroundColor: color['--ult-color-surface-raised'],
    flexGrow: 1,
    padding: space['--ult-space-7'],
  },
  caption: {
    borderTopColor: color['--ult-color-border'],
    borderTopStyle: 'solid',
    borderTopWidth: border.hairline,
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-5'],
  },
  captionLink: {
    color: {
      default: color['--ult-color-text-muted'],
      ':hover': color['--ult-color-text'],
    },
    textDecoration: 'none',
  },
  install: {
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))',
  },
  block: {
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    overflow: 'hidden',
  },
  blockBar: {
    alignItems: 'center',
    borderBottomColor: color['--ult-color-border'],
    borderBottomStyle: 'solid',
    borderBottomWidth: border.hairline,
    color: color['--ult-color-text'],
    display: 'flex',
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-5'],
  },
  commands: {
    borderRadius: 0,
    borderWidth: 0,
  },
  links: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  footer: {
    alignItems: 'center',
    borderTopColor: color['--ult-color-border'],
    borderTopStyle: 'solid',
    borderTopWidth: border.hairline,
    color: color['--ult-color-text-muted'],
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-6'],
    paddingBlockStart: space['--ult-space-6'],
  },
  footerLink: {
    color: {
      default: color['--ult-color-text-muted'],
      ':hover': color['--ult-color-text'],
    },
    textDecoration: 'underline',
    textUnderlineOffset: space['--ult-space-2'],
  },
});

export function Home() {
  return (
    <main {...stylex.props(styles.page)}>
      <section {...stylex.props(styles.hero)}>
        <h1 {...stylex.props(styles.wordmark)}>
          <img src="/ultima-banner.svg" alt="Ultima" width={2172} height={724} {...stylex.props(styles.logo)} />
        </h1>
        <p {...stylex.props(styles.pitch)}>The final spell for the interfaces you build.</p>
        <p {...stylex.props(styles.prose)}>
          Ultima is a design system of tokens and React components, authored on Base UI and StyleX
          and distributed registry-first: the shadcn CLI copies the source into your project and you
          own it from there. It is for React projects that compile StyleX and want a dark-first kit
          whose light mode is a full peer. Ultima is v0 and in development.
        </p>
      </section>

      <section {...stylex.props(styles.section)} aria-labelledby="demos">
        <h2 id="demos" {...stylex.props(styles.heading)}>
          Live
        </h2>
        <div {...stylex.props(styles.strip)}>
          {DEMOS.map(({ name, slug, component: Demo }) => (
            <div key={name} {...stylex.props(styles.tile)}>
              <div {...stylex.props(styles.stage)}>
                <Demo />
              </div>
              <div {...stylex.props(styles.caption)}>
                <Link to="/components/$name" params={{ name: slug }} {...stylex.props(styles.captionLink)}>
                  {name}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section {...stylex.props(styles.section)} aria-labelledby="install">
        <h2 id="install" {...stylex.props(styles.heading)}>
          Install
        </h2>
        <div {...stylex.props(styles.install)}>
          {INSTALL.map(({ target, commands }) => (
            <div key={target} {...stylex.props(styles.block)}>
              <div {...stylex.props(styles.blockBar)}>
                {target}
                <CopyButton text={commands} />
              </div>
              <Code variant="block" style={styles.commands}>
                {commands}
              </Code>
            </div>
          ))}
        </div>
        <div {...stylex.props(styles.links)}>
          {PAGES.map(({ to, label }) => (
            <Button key={to} variant="outline" render={<Link to={to} />} nativeButton={false}>
              {label}
            </Button>
          ))}
        </div>
      </section>

      <footer {...stylex.props(styles.footer)}>
        <a href={REPO} {...stylex.props(styles.footerLink)}>
          GitHub
        </a>
        <a href={`${REPO}/blob/main/LICENSE`} {...stylex.props(styles.footerLink)}>
          MIT license
        </a>
      </footer>
    </main>
  );
}
