import * as stylex from '@stylexjs/stylex';
import {
  generateScales,
  seedFromSrgb,
  type DensityFactor,
  type MeasurePreset,
  type ScaleName,
  type ShapePreset,
  type ThemeDraft,
  type TypeScale,
} from '@ultima/tokens';
import { space, text } from '@ultima/tokens/tokens.stylex';
import { ColorField, Field, Input, Select, Slider, ToggleGroup } from '@ultima/ui';
import { useMemo, type Dispatch, type SetStateAction } from 'react';

import {
  GROUPS,
  MONO_PRESETS,
  SANS_PRESETS,
  SCALE_ROLES,
  keepOne,
  presetValue,
  resetGroup,
  sliderNumber,
} from './theme-studio-draft';
import { ThemeStudioGroup } from './theme-studio-group';

const RAIL = '@media (min-width: 52.5rem)';

const styles = stylex.create({
  selector: {
    display: { default: 'flex', [RAIL]: 'none' },
    flexDirection: 'row',
    flexShrink: 0,
    overflow: 'auto',
  },
  groups: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-8'],
    minBlockSize: 0,
    overflow: 'auto',
  },
  group: {
    display: { default: 'none', [RAIL]: 'flex' },
    flexDirection: 'column',
    flexShrink: 0,
  },
  groupActive: {
    display: 'flex',
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
  },
  role: {
    flexShrink: 0,
    fontSize: text['--ult-text-3'],
    inlineSize: `calc(${space['--ult-space-12']} + ${space['--ult-space-8']})`,
  },
  slider: {
    flexGrow: 1,
    minInlineSize: 0,
  },
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
  const items = [...presets.map((preset) => ({ label: preset.label, value: preset.value })), { label: 'Custom', value: 'custom' }];

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

function ColorControls({ draft, setDraft }: { draft: ThemeDraft; setDraft: Dispatch<SetStateAction<ThemeDraft>> }) {
  const scales = useMemo(() => generateScales(draft.color), [draft.color]);

  return (
    <div {...stylex.props(styles.stack)}>
      {(Object.keys(SCALE_ROLES) as ScaleName[]).map((scale) => {
        const role = SCALE_ROLES[scale];
        const seed = draft.color[scale];
        const swatch = scales[scale].dark[8] ?? '#000000';
        return (
          <div key={scale} {...stylex.props(styles.row)}>
            <ColorField.Root
              onValueChange={(hex) => {
                setDraft((current) => ({
                  ...current,
                  color: { ...current.color, [scale]: seedFromSrgb(hex, scale, current.color[scale]) },
                }));
              }}
              size="sm"
              value={swatch}
            >
              <ColorField.Swatch aria-label={`${role} seed`} />
              <ColorField.Portal>
                <ColorField.Positioner sideOffset={8}>
                  <ColorField.Popup>
                    <ColorField.Picker />
                  </ColorField.Popup>
                </ColorField.Positioner>
              </ColorField.Portal>
            </ColorField.Root>
            <span {...stylex.props(styles.role)}>{role}</span>
            <Slider.Root
              max={359}
              min={0}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  color: { ...current.color, [scale]: { ...current.color[scale], hue: sliderNumber(value) } },
                }));
              }}
              onValueCommitted={(value) => {
                setDraft((current) => ({
                  ...current,
                  color: { ...current.color, [scale]: { ...current.color[scale], hue: sliderNumber(value) } },
                }));
              }}
              step={1}
              style={styles.slider}
              value={seed.hue}
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Indicator />
                  <Slider.Thumb aria-label={`${role} hue`} />
                </Slider.Track>
              </Slider.Control>
            </Slider.Root>
            <Slider.Root
              max={150}
              min={0}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  color: {
                    ...current.color,
                    [scale]: { ...current.color[scale], saturation: sliderNumber(value) / 100 },
                  },
                }));
              }}
              onValueCommitted={(value) => {
                setDraft((current) => ({
                  ...current,
                  color: {
                    ...current.color,
                    [scale]: { ...current.color[scale], saturation: sliderNumber(value) / 100 },
                  },
                }));
              }}
              step={1}
              style={styles.slider}
              value={Math.round(seed.saturation * 100)}
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Indicator />
                  <Slider.Thumb aria-label={`${role} saturation`} />
                </Slider.Track>
              </Slider.Control>
            </Slider.Root>
          </div>
        );
      })}
    </div>
  );
}

function TypographyControls({
  draft,
  setDraft,
}: {
  draft: ThemeDraft;
  setDraft: Dispatch<SetStateAction<ThemeDraft>>;
}) {
  const type = draft.typography;
  return (
    <div {...stylex.props(styles.stack)}>
      <FamilySelect
        label="Sans family"
        name="sans-family"
        onStack={(sans) => setDraft((current) => ({ ...current, typography: { ...current.typography, sans } }))}
        presets={SANS_PRESETS}
        stack={type.sans}
      />
      <FamilySelect
        label="Mono family"
        name="mono-family"
        onStack={(mono) => setDraft((current) => ({ ...current, typography: { ...current.typography, mono } }))}
        presets={MONO_PRESETS}
        stack={type.mono}
      />
      <Slider.Root
        max={18}
        min={14}
        onValueChange={(value) => {
          setDraft((current) => ({
            ...current,
            typography: { ...current.typography, baseSizePx: sliderNumber(value) },
          }));
        }}
        onValueCommitted={(value) => {
          setDraft((current) => ({
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
          setDraft((current) => ({ ...current, typography: { ...current.typography, scale: parseScale(value) } }))
        }
        options={SCALE_OPTIONS}
        value={String(type.scale)}
      />
      <PresetGroup
        label="Leading"
        onChange={(value) =>
          setDraft((current) => ({
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
          setDraft((current) => ({
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

export function ThemeStudioEditor({
  draft,
  group,
  onGroupChange,
  setDraft,
}: {
  draft: ThemeDraft;
  group: GroupLabel;
  onGroupChange: (group: GroupLabel) => void;
  setDraft: Dispatch<SetStateAction<ThemeDraft>>;
}) {
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
      <div {...stylex.props(styles.groups)}>
        {GROUPS.map((item) => (
          <section
            aria-labelledby={`${item.label.toLowerCase()}-group`}
            key={item.id}
            {...stylex.props(styles.group, group === item.label && styles.groupActive)}
          >
            <ThemeStudioGroup
              label={item.label}
              locked={draft.locks[item.id]}
              onLock={(locked) =>
                setDraft((current) => ({ ...current, locks: { ...current.locks, [item.id]: locked } }))
              }
              onReset={() => setDraft((current) => resetGroup(current, item.id))}
              onShuffle={() => {}}
            >
              {item.id === 'color' ? <ColorControls draft={draft} setDraft={setDraft} /> : null}
              {item.id === 'typography' ? <TypographyControls draft={draft} setDraft={setDraft} /> : null}
              {item.id === 'density' ? (
                <PresetGroup
                  label="Density preset"
                  onChange={(value) => setDraft((current) => ({ ...current, density: Number(value) as DensityFactor }))}
                  options={[
                    { label: 'Compact', value: '0.75' },
                    { label: 'Cosy', value: '1' },
                    { label: 'Roomy', value: '1.25' },
                  ]}
                  value={String(draft.density)}
                />
              ) : null}
              {item.id === 'shape' ? (
                <PresetGroup
                  label="Shape preset"
                  onChange={(value) => setDraft((current) => ({ ...current, shape: value as ShapePreset }))}
                  options={[
                    { label: 'Sharp', value: 'sharp' },
                    { label: 'Default', value: 'default' },
                    { label: 'Round', value: 'round' },
                  ]}
                  value={draft.shape}
                />
              ) : null}
              {item.id === 'elevation' ? (
                <PresetGroup
                  label="Elevation strength"
                  onChange={(value) => setDraft((current) => ({ ...current, elevation: Number(value) }))}
                  options={[
                    { label: 'Flat', value: '0' },
                    { label: 'Subtle', value: '0.5' },
                    { label: 'Default', value: '1' },
                    { label: 'Pronounced', value: '1.5' },
                  ]}
                  value={String(draft.elevation)}
                />
              ) : null}
              {item.id === 'motion' ? (
                <PresetGroup
                  label="Motion speed"
                  onChange={(value) => setDraft((current) => ({ ...current, motion: Number(value) }))}
                  options={[
                    { label: 'Brisk', value: '0.6' },
                    { label: 'Default', value: '1' },
                    { label: 'Gentle', value: '1.5' },
                  ]}
                  value={String(draft.motion)}
                />
              ) : null}
            </ThemeStudioGroup>
          </section>
        ))}
      </div>
    </>
  );
}
