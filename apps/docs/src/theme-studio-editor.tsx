import * as stylex from '@stylexjs/stylex';
import {
  generateScales,
  seedFromSrgb,
  type DensityFactor,
  type MeasurePreset,
  type PairingResult,
  type ResolvedDraft,
  type ScaleName,
  type ShapePreset,
  type ThemeDraft,
  type TypeScale,
} from '@ultima/tokens';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import {
  ColorField,
  Field,
  Input,
  ScrollArea,
  Select,
  Separator,
  Slider,
  Toggle,
  ToggleGroup,
} from '@ultima/ui';
import { useMemo, useState } from 'react';

import { breakpoints } from './breakpoints.stylex';
import {
  GROUPS,
  MONO_PRESETS,
  SANS_PRESETS,
  SCALE_ROLES,
  keepOne,
  presetValue,
  resetGroup,
  sliderNumber,
  type GroupId,
} from './theme-studio-draft';
import { SwatchChip } from './swatch';
import { ThemeStudioGroup } from './theme-studio-group';
import type { DraftEdit } from './theme-studio-store';
import { TokenRows, type ModeOffenders } from './theme-studio-token-row';
import { ThemeStudioValidation } from './theme-studio-validation';

const styles = stylex.create({
  selector: {
    display: { default: 'flex', [breakpoints.RAIL]: 'none' },
    flexDirection: 'row',
    flexShrink: 0,
    overflow: 'auto',
  },
  groups: { flexGrow: 1, minBlockSize: 0, minInlineSize: 0 },
  groupsContent: {
    // Base UI's ScrollArea.Content writes `min-width: fit-content` inline, so a wide input would
    // widen the scrolled content past the rail without this.
    contain: 'inline-size',
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-8'],
  },
  swatches: { display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-3'] },
  swatchItem: {
    blockSize: 'auto',
    paddingBlock: space['--ult-space-1'],
    paddingInline: space['--ult-space-1'],
  },
  detail: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-5'] },
  roleTitle: {
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  roleNote: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
  },
  hexRow: { alignItems: 'center', display: 'flex', gap: space['--ult-space-4'] },
  hexInput: { flexGrow: 1, minInlineSize: 0 },
  seed: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-3'] },
  // The mono micro-label voice names each slider once; the thumb's own label carries it for assistive tech.
  seedHead: {
    alignItems: 'baseline',
    display: 'flex',
    fontFamily: font['--ult-font-mono'],
    justifyContent: 'space-between',
  },
  seedLabel: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-1'],
    letterSpacing: font['--ult-font-tracking-wide'],
  },
  seedValue: { fontSize: text['--ult-text-2'] },
  preset: { display: 'flex', flexWrap: 'wrap' },
  group: { display: { default: 'none', [breakpoints.RAIL]: 'flex' }, flexDirection: 'column', flexShrink: 0 },
  groupActive: { display: 'flex' },
  divider: { marginBlockEnd: space['--ult-space-8'] },
  stack: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-6'] },
  row: { alignItems: 'center', display: 'flex', gap: space['--ult-space-4'] },
  role: {
    flexShrink: 0,
    fontSize: text['--ult-text-3'],
    inlineSize: `calc(${space['--ult-space-12']} + ${space['--ult-space-8']})`,
  },
  slider: { flexGrow: 1, minInlineSize: 0 },
});

const SCALE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Ultima', value: 'stock' },
  { label: '1.125', value: '1.125' },
  { label: '1.2', value: '1.2' },
  { label: '1.25', value: '1.25' },
  { label: '1.333', value: '1.333' },
];

const MEASURE_OPTIONS: { label: string; value: MeasurePreset }[] = [
  { label: 'Compact', value: 'compact' },
  { label: 'Default', value: 'default' },
  { label: 'Loose', value: 'loose' },
];

function parseScale(value: string): TypeScale {
  return value === 'stock' ? 'stock' : (Number(value) as TypeScale);
}

function FamilySelect({
  label,
  name,
  presets,
  stack,
  onStack,
}: {
  label: string;
  name: string;
  presets: readonly { label: string; value: string }[];
  stack: string;
  onStack: (stack: string) => void;
}) {
  const matched = presetValue(stack, presets);
  const items = [
    ...presets.map((preset) => ({ label: preset.label, value: preset.value })),
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <>
      <Select.Root
        items={items}
        onValueChange={(next) => {
          if (next == null) return;
          onStack(next === 'custom' ? stack : next);
        }}
        value={matched}
      >
        <Field.Root name={name}>
          <Select.Label>{label}</Select.Label>
          <Select.Trigger size="sm">
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
        </Field.Root>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup>
              <Select.List>
                {items.map((item) => (
                  <Select.Item key={item.value} value={item.value}>
                    <Select.ItemIndicator />
                    <Select.ItemText>{item.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <Input
        aria-label={`Custom ${label.toLowerCase()} stack`}
        onValueChange={onStack}
        size="sm"
        value={stack}
      />
    </>
  );
}

function PresetGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Field.Root name={label}>
      <Field.Label>{label}</Field.Label>
      <ToggleGroup.Root
        aria-label={label}
        onValueChange={(next, eventDetails) => {
          const selected = keepOne(next, () => eventDetails.cancel());
          if (selected) onChange(selected);
        }}
        style={styles.preset}
        value={[value]}
      >
        {options.map((option) => (
          <ToggleGroup.Item key={option.value} value={option.value}>
            {option.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </Field.Root>
  );
}

const ROLE_NOTES: Record<ScaleName, string> = {
  mithril: 'Surfaces, text, and borders.',
  arcane: 'Buttons, selection, and focus.',
  mana: 'Links, marks, and progress.',
  verdant: 'Confirmations and passing checks.',
  ember: 'Cautions that still need a look.',
  ruin: 'Errors and destructive actions.',
};

function scaleTitle(scale: ScaleName): string {
  return `${scale.charAt(0).toUpperCase()}${scale.slice(1)} / ${SCALE_ROLES[scale]}`;
}

function SeedSlider({
  label,
  max,
  name,
  onChange,
  onCommit,
  unit,
  value,
}: {
  label: string;
  max: number;
  name: string;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  unit: string;
  value: number;
}) {
  return (
    <div {...stylex.props(styles.seed)}>
      <div aria-hidden data-seed-header {...stylex.props(styles.seedHead)}>
        <span {...stylex.props(styles.seedLabel)}>{label}</span>
        <span {...stylex.props(styles.seedValue)}>
          {value}
          {unit}
        </span>
      </div>
      <Slider.Root
        max={max}
        min={0}
        onValueChange={(next) => onChange(sliderNumber(next))}
        onValueCommitted={(next) => onCommit(sliderNumber(next))}
        step={1}
        value={value}
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb aria-label={name} />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}

function ColorControls({
  draft,
  update,
  commit,
}: {
  draft: ThemeDraft;
  update: (edit: DraftEdit) => void;
  commit: (edit: DraftEdit) => void;
}) {
  const [scale, setScale] = useState<ScaleName>('arcane');
  const scales = useMemo(() => generateScales(draft.color), [draft.color]);
  const role = SCALE_ROLES[scale];
  const seed = draft.color[scale];
  const swatch = scales[scale].dark[8] ?? '#000000';

  const patch = (apply: (edit: DraftEdit) => void, key: 'hue' | 'saturation') => (value: number) => {
    apply((current) => ({
      ...current,
      color: {
        ...current.color,
        [scale]: { ...current.color[scale], [key]: key === 'hue' ? value : value / 100 },
      },
    }));
  };

  return (
    <div {...stylex.props(styles.stack)}>
      <div aria-label="Color roles" role="group" {...stylex.props(styles.swatches)}>
        {(Object.keys(SCALE_ROLES) as ScaleName[]).map((name) => (
          <Toggle
            aria-label={SCALE_ROLES[name]}
            key={name}
            onPressedChange={(pressed) => {
              if (pressed) setScale(name);
            }}
            pressed={scale === name}
            style={styles.swatchItem}
            variant="outline"
          >
            <SwatchChip value={scales[name].dark[8] ?? '#000000'} />
          </Toggle>
        ))}
      </div>
      <div {...stylex.props(styles.detail)}>
        <div>
          <p {...stylex.props(styles.roleTitle)}>{scaleTitle(scale)}</p>
          <p {...stylex.props(styles.roleNote)}>{ROLE_NOTES[scale]}</p>
        </div>
        <ColorField.Root
          key={scale}
          onValueChange={(hex) => {
            commit((current) => ({
              ...current,
              color: { ...current.color, [scale]: seedFromSrgb(hex, scale, current.color[scale]) },
            }));
          }}
          size="sm"
          value={swatch}
        >
          <div {...stylex.props(styles.hexRow)}>
            <ColorField.Swatch aria-label={`${role} seed`} />
            <ColorField.Input aria-label={`${role} hex`} style={styles.hexInput} />
          </div>
          <ColorField.Portal>
            <ColorField.Positioner sideOffset={8}>
              <ColorField.Popup>
                <ColorField.Picker />
              </ColorField.Popup>
            </ColorField.Positioner>
          </ColorField.Portal>
        </ColorField.Root>
        <SeedSlider
          label="HUE"
          max={359}
          name={`${role} hue`}
          onChange={patch(update, 'hue')}
          onCommit={patch(commit, 'hue')}
          unit="°"
          value={seed.hue}
        />
        <SeedSlider
          label="SAT"
          max={150}
          name={`${role} saturation`}
          onChange={patch(update, 'saturation')}
          onCommit={patch(commit, 'saturation')}
          unit="%"
          value={Math.round(seed.saturation * 100)}
        />
      </div>
    </div>
  );
}

function TypographyControls({
  draft,
  update,
  commit,
}: {
  draft: ThemeDraft;
  update: (edit: DraftEdit) => void;
  commit: (edit: DraftEdit) => void;
}) {
  const type = draft.typography;
  return (
    <div {...stylex.props(styles.stack)}>
      <FamilySelect
        label="Sans family"
        name="sans-family"
        onStack={(sans) => commit((current) => ({ ...current, typography: { ...current.typography, sans } }))}
        presets={SANS_PRESETS}
        stack={type.sans}
      />
      <FamilySelect
        label="Mono family"
        name="mono-family"
        onStack={(mono) => commit((current) => ({ ...current, typography: { ...current.typography, mono } }))}
        presets={MONO_PRESETS}
        stack={type.mono}
      />
      <Slider.Root
        max={18}
        min={14}
        onValueChange={(value) => {
          update((current) => ({
            ...current,
            typography: { ...current.typography, baseSizePx: sliderNumber(value) },
          }));
        }}
        onValueCommitted={(value) => {
          commit((current) => ({
            ...current,
            typography: { ...current.typography, baseSizePx: sliderNumber(value) },
          }));
        }}
        step={0.5}
        value={type.baseSizePx}
      >
        <Slider.Label>Base size</Slider.Label>
        <Slider.Value />
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <PresetGroup
        label="Type scale"
        onChange={(value) =>
          commit((current) => ({
            ...current,
            typography: { ...current.typography, scale: parseScale(value) },
          }))
        }
        options={SCALE_OPTIONS}
        value={String(type.scale)}
      />
      <PresetGroup
        label="Leading"
        onChange={(value) =>
          commit((current) => ({
            ...current,
            typography: { ...current.typography, leading: value as MeasurePreset },
          }))
        }
        options={MEASURE_OPTIONS}
        value={type.leading}
      />
      <PresetGroup
        label="Tracking"
        onChange={(value) =>
          commit((current) => ({
            ...current,
            typography: { ...current.typography, tracking: value as MeasurePreset },
          }))
        }
        options={MEASURE_OPTIONS}
        value={type.tracking}
      />
    </div>
  );
}

type GroupLabel = (typeof GROUPS)[number]['label'];

function optionLabel(options: readonly { label: string; value: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

const DENSITY_OPTIONS = [
  { label: 'Compact', value: '0.75' },
  { label: 'Cosy', value: '1' },
  { label: 'Roomy', value: '1.25' },
] as const;
const SHAPE_OPTIONS = [
  { label: 'Sharp', value: 'sharp' },
  { label: 'Default', value: 'default' },
  { label: 'Round', value: 'round' },
] as const;
const ELEVATION_OPTIONS = [
  { label: 'Flat', value: '0' },
  { label: 'Subtle', value: '0.5' },
  { label: 'Default', value: '1' },
  { label: 'Pronounced', value: '1.5' },
] as const;
const MOTION_OPTIONS = [
  { label: 'Brisk', value: '0.6' },
  { label: 'Default', value: '1' },
  { label: 'Gentle', value: '1.5' },
] as const;

function familyLabel(stack: string, presets: readonly { label: string; value: string }[]): string {
  return presets.find((preset) => preset.value === stack)?.label ?? 'Custom';
}

function summarize(group: GroupId, draft: ThemeDraft): string {
  switch (group) {
    case 'color':
      return 'Six seeds, one gate.';
    case 'typography':
      return `${familyLabel(draft.typography.sans, SANS_PRESETS)} / ${familyLabel(draft.typography.mono, MONO_PRESETS)}`;
    case 'density':
      return optionLabel(DENSITY_OPTIONS, String(draft.density));
    case 'shape':
      return optionLabel(SHAPE_OPTIONS, draft.shape);
    case 'elevation':
      return optionLabel(ELEVATION_OPTIONS, String(draft.elevation));
    case 'motion':
      return optionLabel(MOTION_OPTIONS, String(draft.motion));
  }
}

export function ThemeStudioEditor({
  draft,
  group,
  onGroupChange,
  onShuffleGroup,
  resolved,
  results,
  update,
  commit,
}: {
  draft: ThemeDraft;
  group: GroupLabel;
  onGroupChange: (group: GroupLabel) => void;
  onShuffleGroup: (group: GroupId) => void;
  resolved: ResolvedDraft;
  results: PairingResult[];
  update: (edit: DraftEdit) => void;
  commit: (edit: DraftEdit) => void;
}) {
  const offenders = useMemo<ModeOffenders>(() => {
    const dark = new Set<string>();
    const light = new Set<string>();
    for (const result of results) {
      if (!result.dark.pass) {
        dark.add(result.foreground);
        dark.add(result.background);
      }
      if (!result.light.pass) {
        light.add(result.foreground);
        light.add(result.background);
      }
    }
    return { dark, light };
  }, [results]);

  return (
    <>
      <ToggleGroup.Root
        aria-label="Theme groups"
        onValueChange={(next, eventDetails) => {
          const selected = keepOne(next, () => eventDetails.cancel());
          if (selected) onGroupChange(selected as GroupLabel);
        }}
        style={styles.selector}
        value={[group]}
      >
        {GROUPS.map((item) => (
          <ToggleGroup.Item key={item.id} value={item.label}>
            {item.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <ScrollArea.Root style={styles.groups}>
        <ScrollArea.Viewport>
          <ScrollArea.Content style={styles.groupsContent}>
            {GROUPS.map((item, index) => (
              <section
                aria-labelledby={`${item.label.toLowerCase()}-group`}
                key={item.id}
                {...stylex.props(styles.group, group === item.label && styles.groupActive)}
              >
                {index > 0 ? <Separator style={styles.divider} /> : null}
                <ThemeStudioGroup
                  label={item.label}
                  locked={draft.locks[item.id]}
                  summary={summarize(item.id, draft)}
                  onLock={(locked) =>
                    commit((current) => ({ ...current, locks: { ...current.locks, [item.id]: locked } }))
                  }
                  onReset={() => commit((current) => resetGroup(current, item.id))}
                  onShuffle={() => onShuffleGroup(item.id)}
                  panel={
                    <TokenRows
                      draft={draft}
                      group={item.id}
                      offenders={offenders}
                      resolved={resolved}
                      setDraft={(action) => commit(typeof action === 'function' ? action : () => action)}
                    />
                  }
                >
                  {item.id === 'color' ? (
                    <ColorControls draft={draft} update={update} commit={commit} />
                  ) : null}
                  {item.id === 'typography' ? (
                    <TypographyControls draft={draft} update={update} commit={commit} />
                  ) : null}
                  {item.id === 'density' ? (
                    <PresetGroup
                      label="Density preset"
                      onChange={(value) =>
                        commit((current) => ({ ...current, density: Number(value) as DensityFactor }))
                      }
                      options={DENSITY_OPTIONS}
                      value={String(draft.density)}
                    />
                  ) : null}
                  {item.id === 'shape' ? (
                    <PresetGroup
                      label="Shape preset"
                      onChange={(value) => commit((current) => ({ ...current, shape: value as ShapePreset }))}
                      options={SHAPE_OPTIONS}
                      value={draft.shape}
                    />
                  ) : null}
                  {item.id === 'elevation' ? (
                    <PresetGroup
                      label="Elevation strength"
                      onChange={(value) => commit((current) => ({ ...current, elevation: Number(value) }))}
                      options={ELEVATION_OPTIONS}
                      value={String(draft.elevation)}
                    />
                  ) : null}
                  {item.id === 'motion' ? (
                    <PresetGroup
                      label="Motion speed"
                      onChange={(value) => commit((current) => ({ ...current, motion: Number(value) }))}
                      options={MOTION_OPTIONS}
                      value={String(draft.motion)}
                    />
                  ) : null}
                </ThemeStudioGroup>
              </section>
            ))}
            <ThemeStudioValidation results={results} />
          </ScrollArea.Content>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </>
  );
}
