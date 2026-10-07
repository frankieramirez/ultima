import { CheckIcon, InfoIcon, XIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { palette } from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card, ScrollArea, Separator, Stat, Table } from '@ultima/ui';
import { Fragment } from 'react';

import { breakpoints } from '../breakpoints.stylex';
import { Callout, FoundationLayout, FoundationTitle, P, SectionHeading } from '../foundation';
import { SwatchChip, Swatch } from '../swatch';
import { TextLink } from '../text-link';
import { useResolvedScheme } from '../theme';
import { contrast } from '../token-data';

const MODES = ['dark', 'light'] as const;
/** Twelve steps per scale; a literal, since StyleX reads it at compile time. */
const STEPS = 12;

const BRAND_ANCHORS: Record<string, { mode: string; step: number }> = {
  mithril: { mode: 'dark', step: 1 },
  mana: { mode: 'dark', step: 12 },
};

const STEP_CONVENTION = [
  'app background',
  'subtle background, raised surfaces',
  'component background at rest, subtle fills',
  'component background on hover',
  'component background when active or selected',
  'hairline border',
  'border on hover',
  'strong border, 3:1 against steps 1 and 2',
  'solid fill at rest',
  'solid fill on hover',
  'solid fill when active',
  'the hue as text, 4.5:1 against steps 1 to 3',
];

const STEP_BANDS: Record<number, string> = { 1: 'Backgrounds', 3: 'Components', 6: 'Borders', 9: 'Solids', 12: 'Text' };

const SAMPLE_SCALES = ['arcane', 'verdant', 'ruin'];

const GATE_COLUMNS = [
  { label: 'Foreground' },
  { label: 'Background' },
  { label: 'Minimum', numeric: true },
  { label: 'Dark', numeric: true },
  { label: 'Light', numeric: true },
  { label: 'Result' },
];

const styles = stylex.create({
  steps: {
    display: { default: 'none', [breakpoints.DESKTOP]: 'grid' },
    gap: space['--ult-space-2'],
    gridTemplateColumns: `5.75rem repeat(${STEPS}, minmax(0, 1fr))`,
    paddingBlockEnd: space['--ult-space-4'],
  },
  stepNumber: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    textAlign: 'center',
  },
  scale: {
    columnGap: space['--ult-space-2'],
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.DESKTOP]: '5.75rem minmax(0, 1fr)' },
    paddingBlock: space['--ult-space-5'],
  },
  scaleName: {
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-medium'],
    margin: 0,
  },
  modes: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-3'], minInlineSize: 0 },
  lightLabel: { marginBlockStart: space['--ult-space-3'] },
  ramp: {
    display: 'grid',
    gap: space['--ult-space-2'],
    gridTemplateColumns: {
      default: `repeat(6, minmax(0, 1fr))`,
      [breakpoints.DESKTOP]: `repeat(${STEPS}, minmax(0, 1fr))`,
    },
  },
  rampLabel: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    marginBlock: 0,
  },
  stepNoteHiddenOnDesktop: {
    blockSize: { default: null, [breakpoints.DESKTOP]: '1px' },
    clipPath: { default: null, [breakpoints.DESKTOP]: 'inset(50%)' },
    inlineSize: { default: null, [breakpoints.DESKTOP]: '1px' },
    overflow: { default: null, [breakpoints.DESKTOP]: 'hidden' },
    position: { default: null, [breakpoints.DESKTOP]: 'absolute' },
    whiteSpace: { default: null, [breakpoints.DESKTOP]: 'nowrap' },
  },
  anchor: {
    color: color['--ult-color-highlight-text'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  chips: { display: 'flex', gap: space['--ult-space-1'] },
  chip: { height: '1.375rem', width: '1.375rem' },
  band: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    letterSpacing: font['--ult-font-tracking-wide'],
    textTransform: 'uppercase',
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.WIDE]: 'repeat(3, minmax(0, 1fr))' },
    marginBlockStart: space['--ult-space-6'],
  },
  stat: { padding: space['--ult-space-6'] },
  statValue: {
    fontFamily: 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif',
    fontWeight: font['--ult-font-weight-medium'],
  },
  statNote: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-2'] },
  result: { alignItems: 'center', display: 'inline-flex', gap: space['--ult-space-2'] },
  pass: { color: color['--ult-color-success-text'] },
  fail: { color: color['--ult-color-danger-text'] },
  scroll: { marginBlockStart: space['--ult-space-6'] },
  stepTable: { minWidth: '24rem' },
  gate: { minWidth: '40rem' },
  mono: { fontFamily: font['--ult-font-mono'] },
  numeric: { fontVariantNumeric: 'tabular-nums', textAlign: 'right' },
});

const passing = contrast.filter((pairing) => pairing.pass).length;
const closest = contrast
  .flatMap((pairing) => MODES.map((mode) => ({ pairing, mode, margin: pairing[mode] / pairing.minimum })))
  .reduce((lowest, entry) => (entry.margin < lowest.margin ? entry : lowest));

export function PalettePage() {
  const scheme = useResolvedScheme();
  return (
    <FoundationLayout labels={[`${palette.length} scales · ${STEPS} steps · 2 modes`, 'Generated in OKLCH']}>
      <FoundationTitle
        title="Palette"
        lede="Six scales, twelve steps each, a dark and a light value per step, generated in OKLCH and committed as hex. A step number means the same thing in both modes and in every scale; the ramp carries the inversion, so a semantic token resolves to one step number and not two."
      />

      <section>
        <SectionHeading count={`${palette.length * STEPS * MODES.length} values`}>Scales</SectionHeading>
        <div aria-hidden {...stylex.props(styles.steps)}>
          <span />
          {Array.from({ length: STEPS }, (_, index) => (
            <span key={index} {...stylex.props(styles.stepNumber)}>
              {index + 1}
            </span>
          ))}
        </div>
        {palette.map((scale) => (
          <Fragment key={scale.name}>
            <Separator />
            <ScrollArea.Root>
              <ScrollArea.Viewport>
                <ScrollArea.Content>
                  <div {...stylex.props(styles.scale)}>
                    <h3 {...stylex.props(styles.scaleName)}>{scale.name}</h3>
                    <div {...stylex.props(styles.modes)}>
                      {MODES.map((mode) => (
                        <Fragment key={mode}>
                          <p {...stylex.props(styles.rampLabel, mode === 'light' && styles.lightLabel)}>
                            {mode}
                            <AnchorNote scale={scale.name} mode={mode} />
                          </p>
                          <div {...stylex.props(styles.ramp)}>
                            {scale[mode].map((value, index) => (
                              <Swatch
                                key={value + index}
                                value={value}
                                caption={value.slice(1)}
                                note={`step ${index + 1}`}
                                noteStyle={styles.stepNoteHiddenOnDesktop}
                                anchor={
                                  BRAND_ANCHORS[scale.name]?.mode === mode &&
                                  BRAND_ANCHORS[scale.name]?.step === index + 1
                                }
                              />
                            ))}
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </ScrollArea.Content>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="horizontal">
                <ScrollArea.Thumb />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </Fragment>
        ))}
        <Separator />
      </section>

      <section>
        <SectionHeading count={STEPS}>Step convention</SectionHeading>
        <Table.Scroll aria-labelledby="steps-caption" style={styles.scroll}>
          <Table.Root style={styles.stepTable}>
            <Table.Caption id="steps-caption">What each of the twelve steps is for.</Table.Caption>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell style={styles.numeric}>Step</Table.HeadCell>
                <Table.HeadCell>
                  <span {...stylex.props(styles.band)}>{SAMPLE_SCALES.join(', ')}</span>
                </Table.HeadCell>
                <Table.HeadCell>Meaning</Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {STEP_CONVENTION.map((meaning, index) => (
                <Fragment key={meaning}>
                  {STEP_BANDS[index + 1] && (
                    <Table.Row>
                      <Table.HeadCell colSpan={3} scope="colgroup" style={styles.band}>
                        {STEP_BANDS[index + 1]}
                      </Table.HeadCell>
                    </Table.Row>
                  )}
                  <Table.Row>
                    <Table.Cell style={[styles.numeric, styles.mono]}>{String(index + 1).padStart(2, '0')}</Table.Cell>
                    <Table.Cell>
                      <span {...stylex.props(styles.chips)}>
                        {SAMPLE_SCALES.map((name) => {
                          const value = palette.find((scale) => scale.name === name)?.[scheme][index];
                          return value ? <SwatchChip key={name} value={value} style={styles.chip} /> : null;
                        })}
                      </span>
                    </Table.Cell>
                    <Table.Cell>{meaning}</Table.Cell>
                  </Table.Row>
                </Fragment>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.Scroll>
        <Callout icon={<InfoIcon />} title="This deviates from Radix Colors on purpose.">
          Ultima's interaction states are palette steps rather than colors derived at runtime, so step 11 is the active
          fill and the two text steps collapse into 12. The neutral has no solid fills, so its steps 9 to 11 serve as
          subtle, muted, and ordinary text weights.
        </Callout>
      </section>

      <section>
        <SectionHeading count={contrast.length}>Contrast gate</SectionHeading>
        <P>
          WCAG 2.2 AA is a build gate, not advice. Every pairing below is measured in both modes when the tokens package
          builds, the check runs again in CI on every pull request, and a ratio under its minimum fails the build rather
          than shipping. The APCA figures live on <TextLink href="/tokens">/tokens</TextLink> instead, beside the
          semantic pairings, because they are advice about a role rather than a property of the steps.
        </P>
        <Card.Root style={styles.summary}>
          <Stat.Root style={styles.stat}>
            <Stat.Label>Pairings measured</Stat.Label>
            <Stat.Value style={styles.statValue}>{contrast.length}</Stat.Value>
          </Stat.Root>
          <Stat.Root style={styles.stat}>
            <Stat.Label>Pass in both modes</Stat.Label>
            <Stat.Value style={styles.statValue}>{passing}</Stat.Value>
          </Stat.Root>
          <Stat.Root style={styles.stat}>
            <Stat.Label>Closest to its minimum</Stat.Label>
            <Stat.Value style={styles.statValue}>{`${closest.pairing[closest.mode].toFixed(2)}:1`}</Stat.Value>
            <span {...stylex.props(styles.statNote)}>
              {closest.pairing.foreground.replace('--ult-color-', '')} on{' '}
              {closest.pairing.background.replace('--ult-color-', '')}, {closest.mode}
            </span>
          </Stat.Root>
        </Card.Root>
        <Table.Scroll aria-labelledby="gate-caption" style={styles.scroll}>
          <Table.Root style={styles.gate}>
            <Table.Caption id="gate-caption">
              Every gated pairing, its minimum, and the measured ratio in each mode.
            </Table.Caption>
            <Table.Head>
              <Table.Row>
                {GATE_COLUMNS.map((column) => (
                  <Table.HeadCell key={column.label} style={column.numeric ? styles.numeric : null}>
                    {column.label}
                  </Table.HeadCell>
                ))}
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {contrast.map((pairing) => (
                <Table.Row key={`${pairing.foreground} on ${pairing.background}`}>
                  <Table.Cell style={styles.mono}>{pairing.foreground}</Table.Cell>
                  <Table.Cell style={styles.mono}>{pairing.background}</Table.Cell>
                  <Table.Cell style={[styles.numeric, styles.mono]}>{`${pairing.minimum}:1`}</Table.Cell>
                  {MODES.map((mode) => (
                    <Table.Cell key={mode} style={[styles.numeric, styles.mono]}>
                      {`${pairing[mode].toFixed(2)}:1`}
                    </Table.Cell>
                  ))}
                  <Table.Cell>
                    <span {...stylex.props(styles.result, pairing.pass ? styles.pass : styles.fail)}>
                      {pairing.pass ? <CheckIcon aria-hidden /> : <XIcon aria-hidden />}
                      {pairing.pass ? 'Pass' : 'Fail'}
                    </span>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.Scroll>
      </section>
    </FoundationLayout>
  );
}

function AnchorNote({ scale, mode }: { scale: string; mode: string }) {
  const anchor = BRAND_ANCHORS[scale];
  if (anchor?.mode !== mode) return null;
  return <span {...stylex.props(styles.anchor)}> · step {anchor.step} is the brand anchor</span>;
}
