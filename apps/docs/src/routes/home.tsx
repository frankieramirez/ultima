import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, motion, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Card, Code } from '@ultima/ui';

import { CopyButton } from '../copy-button';
import { pages } from '../navigation';
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

const PAGES = pages.filter(({ to }) => to !== '/');

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
    display: 'flex',
    flexDirection: 'column',
  },
  stage: {
    flexGrow: 1,
    padding: space['--ult-space-7'],
  },
  captionLink: {
    color: { default: color['--ult-color-text-muted'], ':hover': color['--ult-color-text'] },
    fontSize: text['--ult-text-3'],
    textDecoration: 'none',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'color',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  install: {
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))',
  },
  blockBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  blockTarget: {
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  links: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  footer: {
    alignItems: 'center',
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
        <h1 {...stylex.props(styles.pitch)}>The final spell for the interfaces you build.</h1>
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
            <Card.Root key={name} style={styles.tile}>
              <Card.Body style={styles.stage}>
                <Demo />
              </Card.Body>
              <Card.Footer>
                <Link
                  to="/components/$name"
                  params={{ name: slug }}
                  {...stylex.props(styles.captionLink)}
                >
                  {name}
                </Link>
              </Card.Footer>
            </Card.Root>
          ))}
        </div>
      </section>

      <section {...stylex.props(styles.section)} aria-labelledby="install">
        <h2 id="install" {...stylex.props(styles.heading)}>
          Install
        </h2>
        <div {...stylex.props(styles.install)}>
          {INSTALL.map(({ target, commands }) => (
            <Card.Root key={target}>
              <Card.Header style={styles.blockBar}>
                <Card.Title render={<span />} style={styles.blockTarget}>
                  {target}
                </Card.Title>
                <CopyButton text={commands} ariaLabel={`Copy the ${target} install commands`} />
              </Card.Header>
              <Card.Body>
                <Code variant="block">{commands}</Code>
              </Card.Body>
            </Card.Root>
          ))}
        </div>
        <div {...stylex.props(styles.links)}>
          {PAGES.map(({ to, label }) => (
            <Button key={label} variant="outline" render={<Link to={to} />} nativeButton={false}>
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
