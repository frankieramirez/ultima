import * as stylex from '@stylexjs/stylex';
import { palette } from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { ScrollArea, Table } from '@ultima/ui';

import { Note, Page, Section, TextLink } from '../page';
import { Swatch } from '../swatch';
import { contrast } from '../token-data';

const MODES = ['dark', 'light'] as const;

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

const GATE_COLUMNS = [
  { label: 'Foreground' },
  { label: 'Background' },
  { label: 'Minimum', numeric: true },
  { label: 'Dark', numeric: true },
  { label: 'Light', numeric: true },
  { label: 'Result' },
];

const styles = stylex.create({
  scale: {
    marginBlockStart: space['--ult-space-8'],
  },
  scaleName: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-semibold'],
    marginBlock: 0,
  },
  ramps: {
    marginBlockStart: space['--ult-space-5'],
  },
  ramp: {
    display: 'grid',
    gap: space['--ult-space-3'],
    gridTemplateColumns: 'repeat(auto-fit, minmax(3.25rem, 1fr))',
    marginBlockStart: space['--ult-space-4'],
  },
  rampLabel: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-medium'],
    marginBlock: 0,
    marginBlockStart: space['--ult-space-5'],
  },
  anchor: {
    color: color['--ult-color-highlight-text'],
    fontWeight: font['--ult-font-weight-medium'],
  },
  pass: {
    color: color['--ult-color-success-text'],
  },
  fail: {
    color: color['--ult-color-danger-text'],
  },
  scroll: {
    marginBlockStart: space['--ult-space-6'],
  },
  steps: {
    minWidth: '24rem',
  },
  gate: {
    minWidth: '40rem',
  },
  mono: {
    fontFamily: font['--ult-font-mono'],
  },
  numeric: {
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  },
});

export function PalettePage() {
  return (
    <Page
      title="Palette"
      lede={
        <>
          Six scales, twelve steps each, a dark and a light value per step, generated in OKLCH and
          committed as hex. A step number means the same thing in both modes and in every scale;
          the ramp carries the inversion, so a semantic token resolves to one step number and not
          two.
        </>
      }
    >
      <Section title="Scales">
        {palette.map((scale) => (
          <div key={scale.name} {...stylex.props(styles.scale)}>
            <h3 {...stylex.props(styles.scaleName)}>{scale.name}</h3>
            <ScrollArea.Root style={styles.ramps}>
              <ScrollArea.Viewport>
                <ScrollArea.Content>
                  {MODES.map((mode) => (
                    <div key={mode}>
                      <p {...stylex.props(styles.rampLabel)}>{mode}</p>
                      <div {...stylex.props(styles.ramp)}>
                        {scale[mode].map((value, index) => (
                          <Swatch
                            key={value + index}
                            value={value}
                            caption={value}
                            note={<StepNote scale={scale.name} mode={mode} step={index + 1} />}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea.Content>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="horizontal">
                <ScrollArea.Thumb />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </div>
        ))}
      </Section>

      <Section title="Step convention">
        <Note>
          This deviates from Radix Colors on purpose. Ultima's interaction states are palette steps
          rather than colors derived at runtime, so step 11 is the active fill and the two text
          steps collapse into 12. The neutral has no solid fills, so its steps 9 to 11 serve as
          subtle, muted, and ordinary text weights.
        </Note>
        <Table.Scroll aria-labelledby="steps-caption" style={styles.scroll}>
          <Table.Root style={styles.steps}>
            <Table.Caption id="steps-caption">What each of the twelve steps is for.</Table.Caption>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell style={styles.numeric}>Step</Table.HeadCell>
                <Table.HeadCell>Meaning</Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {STEP_CONVENTION.map((meaning, index) => (
                <Table.Row key={meaning}>
                  <Table.Cell style={styles.numeric}>{index + 1}</Table.Cell>
                  <Table.Cell>{meaning}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.Scroll>
      </Section>

      <Section title="Contrast gate">
        <Note>
          WCAG 2.2 AA is a build gate, not advice. Every pairing below is measured in both modes
          when the tokens package builds, the check runs again in CI on every pull request, and a
          ratio under its minimum fails the build rather than shipping. The APCA figures live on{' '}
          <TextLink href="/tokens">/tokens</TextLink> instead, beside the semantic pairings, because
          they are advice about a role rather than a property of the steps.
        </Note>
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
                  <Table.Cell style={styles.numeric}>{`${pairing.minimum}:1`}</Table.Cell>
                  {MODES.map((mode) => (
                    <Table.Cell key={mode} style={styles.numeric}>{`${pairing[mode].toFixed(2)}:1`}</Table.Cell>
                  ))}
                  <Table.Cell>
                    <span {...stylex.props(pairing.pass ? styles.pass : styles.fail)}>
                      {pairing.pass ? 'Pass' : 'Fail'}
                    </span>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.Scroll>
      </Section>
    </Page>
  );
}

function StepNote({ scale, mode, step }: { scale: string; mode: string; step: number }) {
  const anchor = BRAND_ANCHORS[scale];
  if (anchor?.mode !== mode || anchor.step !== step) return <>{step}</>;
  return <span {...stylex.props(styles.anchor)}>{step} · brand anchor</span>;
}
