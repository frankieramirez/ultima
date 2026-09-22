import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Code, Separator, Table } from '@ultima/ui';
import { APCAcontrast, sRGBtoY } from 'apca-w3';

import { breakpoints } from '../breakpoints.stylex';
import { CopyButton } from '../copy-button';
import { HighlightedCode } from '../highlighted-code';
import MotionTrack from '../demos/tokens/motion';
import RadiusSpecimen from '../demos/tokens/radius';
import ShadowSpecimen from '../demos/tokens/shadow';
import SpaceBar from '../demos/tokens/space';
import TypeSample from '../demos/tokens/text';
import { Note, Page, Section, TextLink } from '../page';
import { Swatch } from '../swatch';
import { contrast, tokenGroups, tokensByName, type Token } from '../token-data';
import { describeToken } from '../token-roles';

const MODES = ['dark', 'light'] as const;

const styles = stylex.create({
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-7'],
    marginBlockStart: space['--ult-space-6'],
  },
  row: {
    alignItems: 'start',
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.DESKTOP]: 'minmax(16rem, 22rem) minmax(0, 1fr)' },
  },
  colorRow: {
    columnGap: space['--ult-space-9'],
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.DESKTOP]: 'minmax(16rem, 22rem) minmax(0, 1fr)', [breakpoints.INDEX]: 'minmax(18rem, 30rem) minmax(0, 1fr)' },
    paddingBlockEnd: space['--ult-space-6'],
  },
  divider: { gridColumn: '1 / -1' },
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
    lineHeight: font['--ult-font-leading-snug'],
    overflowWrap: 'anywhere',
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
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  example: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
    minHeight: space['--ult-space-11'],
  },
  value: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-3'],
    minWidth: '10rem',
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
    <div {...stylex.props(styles.row, token.group === 'color' && styles.colorRow)}>
      <div {...stylex.props(styles.identity)}>
        <code {...stylex.props(styles.name)}>{token.name}</code>
        <CopyButton text={token.name} ariaLabel={`Copy ${token.name}`} />
        {description ? <span {...stylex.props(styles.description)}>{description}</span> : null}
      </div>
      {token.group === 'color' ? <ModeSwatches token={token} /> : <OtherValue token={token} />}
      {token.group === 'color' && <Separator style={styles.divider} />}
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
  switch (token.group) {
    case 'space':
      return <SpaceBar token={token.name} />;
    case 'text':
      return <TypeSample token={token.name} />;
    case 'radius':
      return <RadiusSpecimen token={token.name} />;
    case 'shadow':
      return <ShadowSpecimen token={token.name} />;
    case 'motion':
      return <MotionTrack token={token.name} />;
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
      <HighlightedCode code={OVERRIDE_CSS} lang="css" style={styles.override} />
      <HighlightedCode code={OVERRIDE_STYLEX} lang="ts" style={styles.override} />
    </Section>
  );
}
