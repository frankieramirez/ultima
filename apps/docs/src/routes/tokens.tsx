import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import { Code, Table } from '@ultima/ui';
import { APCAcontrast, sRGBtoY } from 'apca-w3';

import { CopyButton } from '../copy-button';
import { Note, Page, Section, TextLink } from '../page';
import { Swatch } from '../swatch';
import { contrast, tokenGroups, tokensByName, type Token } from '../token-data';
import { describeToken } from '../token-roles';

const MODES = ['dark', 'light'] as const;

const slide = stylex.keyframes({ from: { marginInlineStart: 0 }, to: { marginInlineStart: '75%' } });

const styles = stylex.create({
  rows: {
    borderTopColor: color['--ult-color-border'],
    borderTopStyle: 'solid',
    borderTopWidth: border.hairline,
    marginBlockStart: space['--ult-space-6'],
  },
  row: {
    alignItems: 'start',
    borderBottomColor: color['--ult-color-border'],
    borderBottomStyle: 'solid',
    borderBottomWidth: border.hairline,
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: 'minmax(16rem, 22rem) 1fr',
    paddingBlock: space['--ult-space-6'],
  },
  identity: {
    alignItems: 'baseline',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-3'],
  },
  name: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-3'],
  },
  description: {
    color: color['--ult-color-text-muted'],
    flexBasis: '100%',
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-snug'],
  },
  swatches: {
    display: 'grid',
    gap: space['--ult-space-5'],
    gridTemplateColumns: 'repeat(2, minmax(6rem, 12rem))',
  },
  example: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-6'],
    minHeight: space['--ult-space-11'],
  },
  value: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-3'],
    minWidth: '10rem',
  },
  bar: {
    backgroundColor: color['--ult-color-accent'],
    borderRadius: radius['--ult-radius-xs'],
    height: space['--ult-space-5'],
  },
  sample: {
    color: color['--ult-color-text'],
    lineHeight: font['--ult-font-leading-tight'],
  },
  square: {
    backgroundColor: color['--ult-color-surface-hover'],
    borderColor: color['--ult-color-border-strong'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    height: space['--ult-space-11'],
    width: space['--ult-space-11'],
  },
  tile: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderRadius: radius['--ult-radius-md'],
    height: space['--ult-space-11'],
    width: space['--ult-space-12'],
  },
  track: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-full'],
    height: space['--ult-space-6'],
    overflow: 'hidden',
    width: space['--ult-space-12'],
  },
  dot: {
    animationDirection: 'alternate',
    animationIterationCount: 'infinite',
    animationName: slide,
    animationTimingFunction: 'ease-in-out',
    backgroundColor: color['--ult-color-highlight'],
    borderRadius: radius['--ult-radius-full'],
    height: space['--ult-space-6'],
    width: space['--ult-space-6'],
  },
  override: {
    marginBlockStart: space['--ult-space-6'],
  },
  scroll: {
    marginBlockStart: space['--ult-space-6'],
  },
  pairings: {
    minWidth: '48rem',
  },
  mono: {
    fontFamily: font['--ult-font-mono'],
  },
  numeric: {
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  },
});

const example = stylex.create({
  width: (value: string) => ({ width: value }),
  fontSize: (value: string) => ({ fontSize: value }),
  radius: (value: string) => ({ borderRadius: value }),
  shadow: (value: string) => ({ boxShadow: value }),
});

const durationFromToken = stylex.create({
  value: (token: string) => ({ animationDuration: `var(${token})` }),
});

const PAIRING_COLUMNS = [
  { label: 'Foreground' },
  { label: 'Background' },
  { label: 'WCAG dark', numeric: true },
  { label: 'WCAG light', numeric: true },
  { label: 'APCA dark', numeric: true },
  { label: 'APCA light', numeric: true },
];

const OVERRIDE_CSS = `:root {
  --ult-color-accent: #7c5cff;
  --ult-color-accent-hover: #8f74ff;
}`;

const OVERRIDE_STYLEX = `import * as stylex from '@stylexjs/stylex';
import { color } from '@ultima/tokens/tokens.stylex';

export const brand = stylex.createTheme(color, {
  '--ult-color-accent': '#7c5cff',
  '--ult-color-accent-hover': '#8f74ff',
});`;

function capitalize(group: string): string {
  return group.charAt(0).toUpperCase() + group.slice(1);
}

export function TokensPage() {
  return (
    <Page
      title="Tokens"
      lede={
        <>
          Every semantic token in the system, in both color modes at once. The names are stable
          across releases and the values are not, so read a token by its name and never by the
          value it holds today. Generated from{' '}
          <TextLink href="/tokens.json">/tokens.json</TextLink>; the same tokens as custom
          properties are at <TextLink href="/tokens.css">/tokens.css</TextLink>.
        </>
      }
    >
      {tokenGroups.map((group) => (
        <Section key={group.name} title={capitalize(group.name)}>
          <div {...stylex.props(styles.rows)}>
            {group.tokens.map((token) => (
              <Row key={token.name} token={token} />
            ))}
          </div>
        </Section>
      ))}

      <Pairings />
      <Overriding />
    </Page>
  );
}

function Row({ token }: { token: Token }) {
  const description = describeToken(token.name);
  return (
    <div {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.identity)}>
        <code {...stylex.props(styles.name)}>{token.name}</code>
        <CopyButton text={token.name} ariaLabel={`Copy ${token.name}`} />
        {description ? <span {...stylex.props(styles.description)}>{description}</span> : null}
      </div>
      {token.group === 'color' ? <ModeSwatches token={token} /> : <OtherValue token={token} />}
    </div>
  );
}

function ModeSwatches({ token }: { token: Token }) {
  return (
    <div {...stylex.props(styles.swatches)}>
      {MODES.map((mode) => {
        const { scale, step, value } = token[mode];
        return (
          <Swatch
            key={mode}
            value={value}
            caption={value}
            note={scale && step ? `${mode} · ${scale} ${step}` : mode}
          />
        );
      })}
    </div>
  );
}

function OtherValue({ token }: { token: Token }) {
  return (
    <div {...stylex.props(styles.example)}>
      <span {...stylex.props(styles.value)}>{token.dark.value}</span>
      <Example token={token} />
    </div>
  );
}

function Example({ token }: { token: Token }) {
  const value = token.dark.value;
  switch (token.group) {
    case 'space':
      return <div {...stylex.props(styles.bar, example.width(value))} />;
    case 'text':
      return <span {...stylex.props(styles.sample, example.fontSize(value))}>Ag</span>;
    case 'radius':
      return <div {...stylex.props(styles.square, example.radius(value))} />;
    case 'shadow':
      return <div {...stylex.props(styles.tile, example.shadow(value))} />;
    case 'motion':
      return (
        <div {...stylex.props(styles.track)}>
          <div {...stylex.props(styles.dot, durationFromToken.value(token.name))} />
        </div>
      );
    default:
      return null;
  }
}

const OPAQUE_HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function rgb(hex: string): [number, number, number] | null {
  const match = OPAQUE_HEX.exec(hex);
  if (!match) return null;
  const [, r = '', g = '', b = ''] = match;
  return [Number.parseInt(r, 16), Number.parseInt(g, 16), Number.parseInt(b, 16)];
}

/** Lc for an opaque pair, or null when either value carries alpha the algorithm cannot read. */
function lightnessContrast(foreground: string, background: string): number | null {
  const [ink, ground] = [rgb(foreground), rgb(background)];
  if (!ink || !ground) return null;
  return Math.abs(Math.round(APCAcontrast(sRGBtoY(ink), sRGBtoY(ground))));
}

function Pairings() {
  return (
    <Section title="Pairings">
      <Note>
        The WCAG 2.2 ratios are the build gate: the tokens package refuses to write an export where
        any of them falls under its minimum. The APCA figures beside them are advice, computed in
        your browser and never able to fail a build. Lc is shown as a magnitude; its sign only
        records which of the pair is lighter.
      </Note>
      <Table.Scroll aria-labelledby="pairings-caption" style={styles.scroll}>
        <Table.Root style={styles.pairings}>
          <Table.Caption id="pairings-caption">
            Every semantic pairing, measured in both color modes.
          </Table.Caption>
          <Table.Head>
            <Table.Row>
              {PAIRING_COLUMNS.map((column) => (
                <Table.HeadCell key={column.label} style={column.numeric ? styles.numeric : null}>
                  {column.label}
                </Table.HeadCell>
              ))}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {contrast.map((pairing) => {
              const foreground = tokensByName.get(pairing.foreground);
              const background = tokensByName.get(pairing.background);
              return (
                <Table.Row key={`${pairing.foreground} on ${pairing.background}`}>
                  <Table.Cell style={styles.mono}>{pairing.foreground}</Table.Cell>
                  <Table.Cell style={styles.mono}>{pairing.background}</Table.Cell>
                  {MODES.map((mode) => (
                    <Table.Cell key={mode} style={styles.numeric}>{`${pairing[mode].toFixed(2)}:1`}</Table.Cell>
                  ))}
                  {MODES.map((mode) => {
                    const lc =
                      foreground && background
                        ? lightnessContrast(foreground[mode].value, background[mode].value)
                        : null;
                    return (
                      <Table.Cell key={mode} style={styles.numeric}>
                        {lc === null ? '—' : `Lc ${lc}`}
                      </Table.Cell>
                    );
                  })}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Table.Scroll>
    </Section>
  );
}

function Overriding() {
  return (
    <Section title="Overriding">
      <Note>
        A token is a custom property with the name you see above, so a consumer that reads the CSS
        export re-skins with plain CSS on the root. A consumer compiling with StyleX gets the same
        result from <Code>createTheme</Code>, which returns a class to put on any subtree.
      </Note>
      <Code variant="block" style={styles.override}>
        {OVERRIDE_CSS}
      </Code>
      <Code variant="block" style={styles.override}>
        {OVERRIDE_STYLEX}
      </Code>
    </Section>
  );
}
