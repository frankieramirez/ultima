import { MagnifyingGlassIcon, CaretDownIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import {
  Accordion,
  Button,
  Code,
  InputGroup,
  Separator,
  Table,
} from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { APCAcontrast, sRGBtoY } from 'apca-w3';

import { breakpoints } from '../breakpoints.stylex';
import { docsStyles } from '../docs-style';
import { CopyButton } from '../copy-button';
import MotionTrack from '../demos/tokens/motion';
import RadiusSpecimen from '../demos/tokens/radius';
import ShadowSpecimen from '../demos/tokens/shadow';
import SpaceBar from '../demos/tokens/space';
import TypeSample from '../demos/tokens/text';
import { Note, Page, Section, TextLink } from '../page';
import { Fence } from '../prose';
import { Swatch } from '../swatch';
import { contrast, tokenGroups, tokensByName, type Token } from '../token-data';
import { describeToken } from '../token-roles';

const MODES = ['dark', 'light'] as const;

const styles = stylex.create({
  search: { borderRadius: 0, marginBlockStart: space['--ult-space-9'] },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space['--ult-space-5'],
    marginBlock: space['--ult-space-7'],
  },
  actions: { display: 'flex', gap: space['--ult-space-4'] },
  disclosure: {
    paddingBlock: space['--ult-space-7'],
    paddingInline: space['--ult-space-6'],
    borderRadius: 0,
  },
  summary: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    flexGrow: 1,
    minInlineSize: 0,
  },
  groupTitle: {
    fontFamily: 'Space Grotesk, Figtree, sans-serif',
    fontSize: text['--ult-text-6'],
    margin: 0,
  },
  count: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-regular'],
    whiteSpace: 'nowrap',
  },
  chevron: {
    flexShrink: 0,
    transform: {
      default: 'rotate(0deg)',
      ':is([data-open])': 'rotate(180deg)',
    },
  },
  subGroup: { paddingInline: space['--ult-space-5'] },
  subTrigger: {
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-5'],
    borderRadius: 0,
  },
  subTitle: {
    display: 'flex',
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: space['--ult-space-5'],
  },
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-3'],
    marginBlockStart: space['--ult-space-6'],
  },
  row: {
    alignItems: 'center',
    columnGap: space['--ult-space-5'],
    display: 'grid',
    gridTemplateAreas: {
      default: '"name name copy" "purpose purpose purpose" "first second ."',
      [breakpoints.DESKTOP]:
        '"name copy first second" "purpose purpose first second"',
    },
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) minmax(0, 1fr) 1.75rem',
      [breakpoints.DESKTOP]: 'minmax(0, 1fr) 1.75rem repeat(2, 5rem)',
    },
    rowGap: space['--ult-space-3'],
    paddingBlock: space['--ult-space-5'],
  },
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
function colorSubgroup(token: Token) {
  const role = token.name.replace('--ult-color-', '').split('-')[0]!;
  return role === 'surface'
    ? 'Surfaces'
    : role === 'border'
      ? 'Borders'
      : capitalize(role);
}

export function TokensPage() {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [subgroups, setSubgroups] = useState<string[]>([]);
  const term = query.trim().toLowerCase();
  const groups = tokenGroups
    .map((group) => ({
      ...group,
      tokens: group.tokens.filter(
        (token) =>
          !term ||
          `${token.name} ${describeToken(token.name)}`
            .toLowerCase()
            .includes(term),
      ),
    }))
    .filter((group) => group.tokens.length > 0);
  const colorGroups = [
    ...new Set(
      groups
        .find((group) => group.name === 'color')
        ?.tokens.map(colorSubgroup) ?? [],
    ),
  ];
  const visible = term ? groups.map((group) => group.name) : expanded;
  const openSection = (id: string) => {
    flushSync(() => {
      setQuery('');
      setExpanded((current) => [...new Set([...current, id])]);
    });
  };
  useEffect(() => {
    const openHash = () => {
      const id = window.location.hash.slice(1);
      if (id) setExpanded((current) => [...new Set([...current, id])]);
    };
    openHash();
    window.addEventListener('hashchange', openHash);
    return () => window.removeEventListener('hashchange', openHash);
  }, []);
  return (
    <Page
      title="Tokens"
      breadcrumb={[
        { label: 'Documentation', to: '/install' },
        { label: 'Tokens' },
      ]}
      onSectionNavigate={openSection}
      lede="Explore semantic tokens in light and dark mode. Use their stable names to build and theme your interface; values can change between releases."
    >
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
      <div {...stylex.props(styles.toolbar)}>
        <span
          role="status"
          aria-label="Token search results"
          {...stylex.props(styles.purpose)}
        >
          {groups.reduce((count, group) => count + group.tokens.length, 0)}{' '}
          tokens · {groups.length} groups
        </span>
        <div {...stylex.props(styles.actions)}>
          <Button
            variant="ghost"
            size="sm"
            style={docsStyles.square}
            onClick={() => {
              setQuery('');
              setExpanded([
                ...tokenGroups.map((group) => group.name),
                'pairings',
              ]);
              setSubgroups([
                ...new Set(
                  tokenGroups
                    .find((group) => group.name === 'color')
                    ?.tokens.map(colorSubgroup),
                ),
              ]);
            }}
          >
            Expand all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={docsStyles.square}
            onClick={() => {
              setQuery('');
              setExpanded([]);
              setSubgroups([]);
            }}
          >
            Collapse all
          </Button>
        </div>
      </div>
      {groups.length === 0 && (
        <Note>No tokens match this search. Try a name or purpose.</Note>
      )}
      <Accordion.Root
        multiple
        value={visible}
        onValueChange={(value) => {
          if (!term) setExpanded(value as string[]);
        }}
      >
        {groups.map((group) => (
          <Accordion.Item key={group.name} value={group.name}>
            <Accordion.Header render={<h2 id={group.name} />}>
              <Accordion.Trigger
                aria-label={capitalize(group.name)}
                style={styles.disclosure}
              >
                <span {...stylex.props(styles.summary)}>
                  <span {...stylex.props(styles.groupTitle)}>
                    {capitalize(group.name)}
                  </span>
                  <span {...stylex.props(styles.purpose)}>
                    {groupDescriptions[group.name]}
                  </span>
                </span>
                <span {...stylex.props(styles.count)}>
                  {group.tokens.length} tokens
                </span>
                <CaretDownIcon
                  aria-hidden
                  data-open={visible.includes(group.name) ? '' : undefined}
                  {...stylex.props(styles.chevron)}
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>
              {group.name === 'color' ? (
                <Accordion.Root
                  multiple
                  value={term ? colorGroups : subgroups}
                  onValueChange={(value) => {
                    if (!term) setSubgroups(value as string[]);
                  }}
                >
                  {colorGroups.map((label) => (
                    <Accordion.Item
                      key={label}
                      value={label}
                      style={styles.subGroup}
                    >
                      <Accordion.Header render={<h3 />}>
                        <Accordion.Trigger
                          aria-label={`${label} colors`}
                          style={styles.subTrigger}
                        >
                          <span {...stylex.props(styles.subTitle)}>
                            {label}
                            <span {...stylex.props(styles.count)}>
                              {
                                group.tokens.filter(
                                  (token) => colorSubgroup(token) === label,
                                ).length
                              }
                            </span>
                          </span>
                          <CaretDownIcon aria-hidden />
                        </Accordion.Trigger>
                      </Accordion.Header>
                      <Accordion.Panel>
                        <div {...stylex.props(styles.rows)}>
                          {group.tokens
                            .filter((token) => colorSubgroup(token) === label)
                            .map((token) => (
                              <Row key={token.name} token={token} />
                            ))}
                        </div>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion.Root>
              ) : (
                <div {...stylex.props(styles.rows)}>
                  {group.tokens.map((token) => (
                    <Row key={token.name} token={token} />
                  ))}
                </div>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
        {!term && (
          <Accordion.Item value="pairings">
            <Accordion.Header render={<h2 id="pairings" />}>
              <Accordion.Trigger
                aria-label="Pairings"
                style={styles.disclosure}
              >
                <span {...stylex.props(styles.summary)}>
                  <span {...stylex.props(styles.groupTitle)}>Pairings</span>
                  <span {...stylex.props(styles.purpose)}>
                    Foreground and background contrast reference
                  </span>
                </span>
                <CaretDownIcon aria-hidden />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>
              <Pairings />
            </Accordion.Panel>
          </Accordion.Item>
        )}
      </Accordion.Root>
      <Overriding />
    </Page>
  );
}

function Row({ token }: { token: Token }) {
  const description = describeToken(token.name);
  return (
    <div {...stylex.props(styles.row)}>
      <code {...stylex.props(styles.name, styles.nameArea)}>{token.name}</code>
      {description ? (
        <span {...stylex.props(styles.purpose, styles.purposeArea)}>
          {description}
        </span>
      ) : null}
      {token.group === 'color' ? (
        <ModeSwatches token={token} />
      ) : (
        <OtherValue token={token} />
      )}
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
      <div
        key={mode}
        {...stylex.props(index === 0 ? styles.first : styles.second)}
      >
        <span {...stylex.props(visuallyHidden)}>{mode}</span>
        <Swatch
          layout="stacked"
          value={value}
          caption={value}
          note={`${mode}${scale && step ? ` · ${scale} ${step}` : ''}`}
          title={scale && step ? `${scale} ${step}` : undefined}
        />
      </div>
    );
  });
}

function OtherValue({ token }: { token: Token }) {
  if (NO_SPECIMEN.has(token.group)) {
    return (
      <span {...stylex.props(styles.value, styles.both)}>
        {token.dark.value}
      </span>
    );
  }
  return (
    <>
      <span {...stylex.props(styles.value, styles.first)}>
        {token.dark.value}
      </span>
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
  return [
    Number.parseInt(r, 16),
    Number.parseInt(g, 16),
    Number.parseInt(b, 16),
  ];
}

/** Lc for an opaque pair, or null when either value carries alpha the algorithm cannot read. */
function lightnessContrast(
  foreground: string,
  background: string,
): number | null {
  const [ink, ground] = [rgb(foreground), rgb(background)];
  if (!ink || !ground) return null;
  return Math.abs(Math.round(APCAcontrast(sRGBtoY(ink), sRGBtoY(ground))));
}

function Pairings() {
  return (
    <div>
      <Note>
        The WCAG 2.2 ratios are the build gate: the tokens package refuses to
        write an export where any of them falls under its minimum. The APCA
        figures beside them are advice, computed in your browser and never able
        to fail a build. Lc is shown as a magnitude; its sign only records which
        of the pair is lighter.
      </Note>
      <Table.Scroll aria-labelledby="pairings-caption" style={styles.scroll}>
        <Table.Root style={styles.pairings}>
          <Table.Caption id="pairings-caption">
            Every semantic pairing, measured in both color modes.
          </Table.Caption>
          <Table.Head>
            <Table.Row>
              {PAIRING_COLUMNS.map((column) => (
                <Table.HeadCell
                  key={column.label}
                  style={column.numeric ? styles.numeric : null}
                >
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
                <Table.Row
                  key={`${pairing.foreground} on ${pairing.background}`}
                >
                  <Table.Cell style={styles.mono}>
                    {pairing.foreground}
                  </Table.Cell>
                  <Table.Cell style={styles.mono}>
                    {pairing.background}
                  </Table.Cell>
                  {MODES.map((mode) => (
                    <Table.Cell
                      key={mode}
                      style={styles.numeric}
                    >{`${pairing[mode].toFixed(2)}:1`}</Table.Cell>
                  ))}
                  {MODES.map((mode) => {
                    const lc =
                      foreground && background
                        ? lightnessContrast(
                            foreground[mode].value,
                            background[mode].value,
                          )
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
    </div>
  );
}

function Overriding() {
  return (
    <Section title="Overriding">
      <Note>
        A token is a custom property with the name you see above, so a consumer
        that reads the CSS export re-skins with plain CSS on the root. A
        consumer compiling with StyleX gets the same result from{' '}
        <Code>createTheme</Code>, which returns a class to put on any subtree.
      </Note>
      <Fence code={OVERRIDE_CSS} lang="css" />
      <Fence code={OVERRIDE_STYLEX} lang="ts" />
    </Section>
  );
}
