import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card, Code, InputGroup, Separator, Table } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { APCAcontrast, sRGBtoY } from 'apca-w3';

import { breakpoints } from '../breakpoints.stylex';
import { CopyButton } from '../copy-button';
import GroupGlyph from '../demos/tokens/glyph';
import MotionTrack from '../demos/tokens/motion';
import RadiusSpecimen from '../demos/tokens/radius';
import ShadowSpecimen from '../demos/tokens/shadow';
import SpaceBar from '../demos/tokens/space';
import TypeSample from '../demos/tokens/text';
import { FoundationLayout, FoundationTitle, P, SectionHeading } from '../foundation';
import { Note } from '../page';
import { Fence } from '../prose';
import { SplitSwatch } from '../swatch';
import { TextLink } from '../text-link';
import { contrast, tokenGroups, tokensByName, type Token } from '../token-data';
import { describeToken } from '../token-roles';

const MODES = ['dark', 'light'] as const;

const styles = stylex.create({
  controls: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
    justifyContent: 'space-between',
    marginBlockStart: space['--ult-space-9'],
  },
  search: { flexGrow: 1, maxInlineSize: '18.75rem' },
  status: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-3'] },
  index: {
    display: 'grid',
    gap: space['--ult-space-4'],
    gridTemplateColumns: {
      default: 'repeat(3, minmax(0, 1fr))',
      [breakpoints.DESKTOP]: 'repeat(6, minmax(0, 1fr))',
    },
    listStyle: 'none',
    margin: 0,
    marginBlockStart: space['--ult-space-7'],
    padding: 0,
  },
  tile: { blockSize: '100%' },
  tileLink: {
    alignItems: 'flex-start',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    padding: space['--ult-space-6'],
    textDecoration: 'none',
  },
  tileLabel: { alignItems: 'baseline', display: 'flex', gap: space['--ult-space-3'] },
  tileName: { fontSize: text['--ult-text-4'], fontWeight: font['--ult-font-weight-semibold'] },
  mono: { fontFamily: font['--ult-font-mono'] },
  subtle: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-1'] },
  subgroup: {
    alignItems: 'baseline',
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    justifyContent: 'space-between',
    letterSpacing: font['--ult-font-tracking-wide'],
    margin: 0,
    paddingBlockEnd: space['--ult-space-4'],
    paddingBlockStart: space['--ult-space-7'],
    textTransform: 'uppercase',
  },
  rows: { display: 'flex', flexDirection: 'column' },
  colorRow: {
    alignItems: 'center',
    columnGap: space['--ult-space-5'],
    display: 'grid',
    gridTemplateAreas: {
      default: '"swatch name name copy" "swatch dark light copy"',
      [breakpoints.DESKTOP]: '"swatch name dark light copy"',
    },
    gridTemplateColumns: {
      default: 'auto minmax(0, 1fr) minmax(0, 1fr) auto',
      [breakpoints.DESKTOP]: 'auto minmax(0, 1fr) 6rem 6rem auto',
    },
    paddingBlock: space['--ult-space-4'],
    rowGap: space['--ult-space-2'],
  },
  row: {
    alignItems: 'center',
    columnGap: space['--ult-space-6'],
    display: 'grid',
    gridTemplateAreas: {
      default: '"name name copy" "specimen value px"',
      [breakpoints.DESKTOP]: '"name specimen value px copy"',
    },
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) auto auto',
      [breakpoints.DESKTOP]: '15rem minmax(0, 1fr) 6rem 3rem auto',
    },
    paddingBlock: space['--ult-space-4'],
    rowGap: space['--ult-space-3'],
  },
  swatchArea: { gridArea: 'swatch' },
  nameArea: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-1'], gridArea: 'name', minInlineSize: 0 },
  darkArea: { gridArea: 'dark' },
  lightArea: { gridArea: 'light' },
  specimenArea: { alignItems: 'center', display: 'flex', gridArea: 'specimen', minInlineSize: 0, overflow: 'hidden' },
  valueArea: { gridArea: 'value' },
  pxArea: { gridArea: 'px' },
  px: { color: color['--ult-color-text-subtle'] },
  valueWithoutSpecimen: { gridColumn: 'specimen-start / px-end', gridRow: 'specimen' },
  copyArea: { display: 'flex', gridArea: 'copy', justifyContent: 'end' },
  divider: { gridColumn: '1 / -1' },
  name: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-snug'],
    overflowWrap: 'anywhere',
  },
  purpose: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-snug'],
  },
  value: {
    color: color['--ult-color-text-muted'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-snug'],
    overflowWrap: 'anywhere',
  },
  tiles: {
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: 'repeat(auto-fill, minmax(9.5rem, 1fr))',
  },
  tileCard: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-4'], padding: space['--ult-space-6'] },
  stage: {
    alignItems: 'center',
    blockSize: space['--ult-space-12'],
    display: 'flex',
    flexGrow: 1,
    justifyContent: 'center',
    paddingInlineStart: space['--ult-space-8'],
  },
  tileHead: { alignItems: 'flex-start', display: 'flex', marginBlockEnd: space['--ult-space-3'] },
  scroll: { marginBlockStart: space['--ult-space-6'] },
  pairings: { minWidth: '48rem' },
  numeric: { fontVariantNumeric: 'tabular-nums', textAlign: 'right' },
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

const groupDescriptions: Record<string, string> = {
  color: 'Surfaces, text, borders, and status colors',
  space: 'Spacing and control sizes',
  text: 'The type scale',
  font: 'Families, weights, leading, and tracking',
  radius: 'Corner shapes',
  shadow: 'Elevation in light and dark mode',
  filter: 'Backdrop effects',
  motion: 'Timing and easing',
};

const SECTIONS = [
  { id: 'color', title: 'Color', groups: ['color'] },
  { id: 'space', title: 'Space', groups: ['space'] },
  { id: 'type', title: 'Type', groups: ['text', 'font'] },
  { id: 'radius', title: 'Radius', groups: ['radius'] },
  { id: 'shadow-and-filter', title: 'Shadow and filter', groups: ['shadow', 'filter'] },
  { id: 'motion', title: 'Motion', groups: ['motion'] },
];

const REM_GROUPS = new Set(['space', 'text']);

function colorSubgroup(token: Token) {
  const role = token.name.replace('--ult-color-', '').split('-')[0]!;
  return role === 'surface' ? 'Surfaces' : role === 'border' ? 'Borders' : capitalize(role);
}

function remToPx(value: string): string | null {
  const rem = /^([\d.]+)rem$/.exec(value);
  return rem ? `${Number(rem[1]) * 16}px` : null;
}

const total = tokenGroups.reduce((count, group) => count + group.tokens.length, 0);

export function TokensPage() {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const groups = new Map(
    tokenGroups.map((group) => [
      group.name,
      group.tokens.filter(
        (token) => !term || `${token.name} ${describeToken(token.name)}`.toLowerCase().includes(term),
      ),
    ]),
  );
  const matching = [...groups.values()].filter((tokens) => tokens.length > 0);
  const count = matching.reduce((sum, tokens) => sum + tokens.length, 0);
  const sizeOf = (names: string[]) => names.reduce((sum, name) => sum + (groups.get(name)?.length ?? 0), 0);
  const fullSizeOf = (names: string[]) =>
    names.reduce((sum, name) => sum + (tokenGroups.find((group) => group.name === name)?.tokens.length ?? 0), 0);
  const clearSearchBeforeJump = () => flushSync(() => setQuery(''));

  return (
    <FoundationLayout labels={[`${total} tokens · ${tokenGroups.length} groups`, 'Names stable · values not']}>
      <FoundationTitle
        title="Tokens"
        lede="Explore semantic tokens in light and dark mode. Use their stable names to build and theme your interface; values can change between releases."
      />
      <div {...stylex.props(styles.controls)}>
        <InputGroup.Root style={styles.search}>
          <InputGroup.Addon>
            <MagnifyingGlassIcon aria-hidden />
          </InputGroup.Addon>
          <InputGroup.Input
            aria-label="Search tokens"
            placeholder="Search tokens by name or purpose…"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </InputGroup.Root>
        <span role="status" aria-label="Token search results" {...stylex.props(styles.status)}>
          {count} tokens · {matching.length} groups
        </span>
      </div>
      <nav aria-label="Token groups">
        <ul {...stylex.props(styles.index)}>
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <Card.Root style={styles.tile}>
                <TextLink href={`#${section.id}`} onClick={clearSearchBeforeJump} variant="muted" style={styles.tileLink}>
                  <GroupGlyph group={section.groups[0]!} />
                  <span {...stylex.props(styles.tileLabel)}>
                    <span {...stylex.props(styles.tileName)}>{section.title}</span>
                    <span {...stylex.props(styles.mono, styles.subtle)}>{fullSizeOf(section.groups)}</span>
                  </span>
                </TextLink>
              </Card.Root>
            </li>
          ))}
        </ul>
      </nav>
      {count === 0 && <Note>No tokens match this search. Try a name or purpose.</Note>}
      {SECTIONS.map((section) => {
        const size = sizeOf(section.groups);
        if (size === 0) return null;
        return (
          <section key={section.id}>
            <SectionHeading id={section.id} count={size}>
              {section.title}
            </SectionHeading>
            <P>{section.groups.map((name) => `${groupDescriptions[name]}.`).join(' ')}</P>
            {section.id === 'shadow-and-filter' ? (
              <Tiles tokens={section.groups.flatMap((name) => groups.get(name) ?? [])} />
            ) : (
              section.groups.map((name) => {
                const tokens = groups.get(name) ?? [];
                if (tokens.length === 0) return null;
                if (name === 'color') return <ColorGroup key={name} tokens={tokens} />;
                return (
                  <div key={name}>
                    {section.groups.length > 1 && <Subgroup id={name} label={capitalize(name)} count={tokens.length} />}
                    {name === 'radius' ? <Tiles tokens={tokens} /> : <Rows tokens={tokens} />}
                  </div>
                );
              })
            )}
          </section>
        );
      })}
      {!term && (
        <section>
          <SectionHeading id="pairings" count={contrast.length}>
            Pairings
          </SectionHeading>
          <Pairings />
        </section>
      )}
      <section>
        <SectionHeading id="overriding">Overriding</SectionHeading>
        <P>
          A token is a custom property with the name you see above, so a consumer that reads the CSS export re-skins
          with plain CSS on the root. A consumer compiling with StyleX gets the same result from{' '}
          <Code>createTheme</Code>, which returns a class to put on any subtree.
        </P>
        <Fence code={OVERRIDE_CSS} lang="css" title="theme.css" />
        <Fence code={OVERRIDE_STYLEX} lang="ts" title="brand.stylex.ts" />
      </section>
    </FoundationLayout>
  );
}

function Subgroup({ id, label, count }: { id?: string; label: string; count: number }) {
  return (
    <p id={id} {...stylex.props(styles.subgroup)}>
      <span>{label}</span>
      <span>{count} tokens</span>
    </p>
  );
}

function ColorGroup({ tokens }: { tokens: Token[] }) {
  const labels = [...new Set(tokens.map(colorSubgroup))];
  return labels.map((label) => {
    const members = tokens.filter((token) => colorSubgroup(token) === label);
    return (
      <div key={label}>
        <Subgroup label={label} count={members.length} />
        <Separator />
        <div {...stylex.props(styles.rows)}>
          {members.map((token) => (
            <ColorRow key={token.name} token={token} />
          ))}
        </div>
      </div>
    );
  });
}

function TokenName({ token }: { token: Token }) {
  return (
    <span {...stylex.props(styles.nameArea)}>
      <code {...stylex.props(styles.name)}>{token.name}</code>
      <span {...stylex.props(styles.purpose)}>{describeToken(token.name)}</span>
    </span>
  );
}

function Copy({ token }: { token: Token }) {
  return (
    <span {...stylex.props(styles.copyArea)}>
      <CopyButton text={token.name} ariaLabel={`Copy ${token.name}`} />
    </span>
  );
}

function ColorRow({ token }: { token: Token }) {
  return (
    <div data-token={token.name} {...stylex.props(styles.colorRow)}>
      <span {...stylex.props(styles.swatchArea)}>
        <SplitSwatch dark={token.dark.value} light={token.light.value} />
      </span>
      <TokenName token={token} />
      {MODES.map((mode) => (
        <span key={mode} {...stylex.props(styles.value, mode === 'dark' ? styles.darkArea : styles.lightArea)}>
          <span {...stylex.props(visuallyHidden)}>{mode} </span>
          {token[mode].value}
        </span>
      ))}
      <Copy token={token} />
      <Separator style={styles.divider} />
    </div>
  );
}

function Rows({ tokens }: { tokens: Token[] }) {
  return (
    <>
      <Separator />
      <div {...stylex.props(styles.rows)}>
        {tokens.map((token) => (
          <Row key={token.name} token={token} />
        ))}
      </div>
    </>
  );
}

function Row({ token }: { token: Token }) {
  const specimen = Specimen({ token });
  const px = REM_GROUPS.has(token.group) ? remToPx(token.dark.value) : null;
  return (
    <div data-token={token.name} {...stylex.props(styles.row)}>
      <TokenName token={token} />
      {specimen && <span {...stylex.props(styles.specimenArea)}>{specimen}</span>}
      <span {...stylex.props(styles.value, specimen ? styles.valueArea : styles.valueWithoutSpecimen)}>{token.dark.value}</span>
      {px && <span {...stylex.props(styles.value, styles.px, styles.pxArea)}>{px}</span>}
      <Copy token={token} />
      <Separator style={styles.divider} />
    </div>
  );
}

function isFirstOfGroup(tokens: Token[], index: number) {
  return index === 0 || tokens[index - 1]!.group !== tokens[index]!.group;
}

function Tiles({ tokens }: { tokens: Token[] }) {
  return (
    <div {...stylex.props(styles.tiles)}>
      {tokens.map((token, index) => (
        <Card.Root
          key={token.name}
          id={isFirstOfGroup(tokens, index) ? token.group : undefined}
          data-token={token.name}
          style={styles.tileCard}
        >
          <span {...stylex.props(styles.tileHead)}>
            <span {...stylex.props(styles.stage)}>{Specimen({ token }) ?? <Code>{token.dark.value}</Code>}</span>
            <Copy token={token} />
          </span>
          <code {...stylex.props(styles.name)}>{token.name}</code>
          <span {...stylex.props(styles.value)}>{token.dark.value}</span>
          <span {...stylex.props(styles.purpose)}>{describeToken(token.name)}</span>
        </Card.Root>
      ))}
    </div>
  );
}

function Specimen({ token }: { token: Token }): ReactNode {
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
    <>
      <P>
        The WCAG 2.2 ratios are the build gate: the tokens package refuses to write an export where any of them falls
        under its minimum. The APCA figures beside them are advice, computed in your browser and never able to fail a
        build. Lc is shown as a magnitude; its sign only records which of the pair is lighter.
      </P>
      <Table.Scroll aria-labelledby="pairings-caption" style={styles.scroll}>
        <Table.Root style={styles.pairings}>
          <Table.Caption id="pairings-caption">Every semantic pairing, measured in both color modes.</Table.Caption>
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
    </>
  );
}
