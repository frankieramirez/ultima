import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Code, Separator, Table } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { APCAcontrast, sRGBtoY } from 'apca-w3';

import { breakpoints } from '../breakpoints.stylex';
import { CopyButton } from '../copy-button';
import MotionTrack from '../demos/tokens/motion';
import RadiusSpecimen from '../demos/tokens/radius';
import ShadowSpecimen from '../demos/tokens/shadow';
import SpaceBar from '../demos/tokens/space';
import TypeSample from '../demos/tokens/text';
import { Kicker, Note, Page, Section, TextLink } from '../page';
import { Fence } from '../prose';
import { Swatch } from '../swatch';
import { contrast, tokenGroups, tokensByName, type Token } from '../token-data';
import { describeToken } from '../token-roles';

const MODES = ['dark', 'light'] as const;

const styles = stylex.create({
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-3'],
    marginBlockStart: space['--ult-space-6'],
  },
  /**
   * One grid template for every Token row and its column heads, settled on #372: name, purpose,
   * the two value columns, and the copy button on one line at desktop; below it, the name and
   * copy button, then the purpose, then the two values side by side. The purpose keeps a 12rem
   * floor and the name gives way to it, since the article is only about 42rem wide at 64rem with
   * the menu panel open.
   */
  row: {
    alignItems: 'center',
    columnGap: space['--ult-space-5'],
    display: 'grid',
    gridTemplateAreas: {
      default: '"name name copy" "purpose purpose purpose" "first second ."',
      [breakpoints.DESKTOP]: '"name purpose first second copy"',
    },
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) minmax(0, 1fr) 1.75rem',
      [breakpoints.DESKTOP]: 'minmax(0, 17.5rem) minmax(12rem, 1fr) repeat(2, 7.75rem) 1.75rem',
    },
    rowGap: space['--ult-space-2'],
  },
  heads: {
    gridTemplateAreas: {
      default: '"first second ."',
      [breakpoints.DESKTOP]: '"name purpose first second copy"',
    },
  },
  head: {
    display: { default: 'none', [breakpoints.DESKTOP]: 'block' },
    textTransform: 'uppercase',
  },
  valueHead: { display: 'block', textTransform: 'uppercase' },
  nameArea: { gridArea: 'name' },
  purposeArea: { gridArea: 'purpose' },
  name: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-snug'],
    overflowWrap: 'anywhere',
  },
  purpose: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-snug'],
  },
  first: { gridArea: 'first', minWidth: 0 },
  second: { gridArea: 'second', minWidth: 0 },
  /** Font and filter have no specimen, so the value takes both columns. */
  both: { gridColumn: 'first-start / second-end', gridRow: 'first' },
  copy: { display: 'flex', gridArea: 'copy', justifyContent: 'end' },
  divider: { gridColumn: '1 / -1' },
  value: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-snug'],
    overflowWrap: 'anywhere',
  },
  specimen: { alignItems: 'center', display: 'flex', minWidth: 0 },
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

/** The groups whose tokens have no drawable specimen, so their value spans both columns. */
const NO_SPECIMEN = new Set(['font', 'filter']);

function headsFor(group: string): string[] {
  if (group === 'color') return ['Dark', 'Light'];
  return NO_SPECIMEN.has(group) ? ['Value'] : ['Value', 'Specimen'];
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
            <Heads group={group.name} />
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

/** The column heads, a micro-label line in the breadcrumb voice. Each value cell names itself to a screen reader, so this line is hidden from one. */
function Heads({ group }: { group: string }) {
  const [first, second] = headsFor(group);
  return (
    <div aria-hidden {...stylex.props(styles.row, styles.heads)}>
      <Kicker style={[styles.head, styles.nameArea]}>Token</Kicker>
      <Kicker style={[styles.head, styles.purposeArea]}>Purpose</Kicker>
      <Kicker style={[styles.valueHead, second ? styles.first : styles.both]}>{first}</Kicker>
      {second ? <Kicker style={[styles.valueHead, styles.second]}>{second}</Kicker> : null}
    </div>
  );
}

function Row({ token }: { token: Token }) {
  const description = describeToken(token.name);
  return (
    <div {...stylex.props(styles.row)}>
      <code {...stylex.props(styles.name, styles.nameArea)}>{token.name}</code>
      {description ? <span {...stylex.props(styles.purpose, styles.purposeArea)}>{description}</span> : null}
      {token.group === 'color' ? <ModeSwatches token={token} /> : <OtherValue token={token} />}
      <div {...stylex.props(styles.copy)}>
        <CopyButton text={token.name} ariaLabel={`Copy ${token.name}`} />
      </div>
      <Separator style={styles.divider} />
    </div>
  );
}

function ModeSwatches({ token }: { token: Token }) {
  return MODES.map((mode, index) => {
    const { scale, step, value } = token[mode];
    return (
      <div key={mode} {...stylex.props(index === 0 ? styles.first : styles.second)}>
        <span {...stylex.props(visuallyHidden)}>{mode}</span>
        <Swatch
          layout="inline"
          value={value}
          caption={value}
          title={scale && step ? `${scale} ${step}` : undefined}
        />
      </div>
    );
  });
}

function OtherValue({ token }: { token: Token }) {
  if (NO_SPECIMEN.has(token.group)) {
    return <span {...stylex.props(styles.value, styles.both)}>{token.dark.value}</span>;
  }
  return (
    <>
      <span {...stylex.props(styles.value, styles.first)}>{token.dark.value}</span>
      <div {...stylex.props(styles.specimen, styles.second)}>
        <Example token={token} />
      </div>
    </>
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
      <Fence code={OVERRIDE_CSS} lang="css" />
      <Fence code={OVERRIDE_STYLEX} lang="ts" />
    </Section>
  );
}
