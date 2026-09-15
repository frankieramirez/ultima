import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Combobox, Field } from '@ultima/ui';

const styles = stylex.create({
  box: {
    maxWidth: `calc(6 * ${space['--ult-space-12']})`,
  },
});

const schools = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
];

export default function ComboboxCanonical() {
  return (
    <div {...stylex.props(styles.box)}>
      <Field.Root name="school">
        <Field.Label>School of magic</Field.Label>
        <Combobox.Root items={schools}>
          <Combobox.InputGroup>
            <Combobox.Input placeholder="Search schools" />
            <Combobox.Clear aria-label="Clear school" />
            <Combobox.Trigger aria-label="Open school list">
              <Combobox.Icon />
            </Combobox.Trigger>
          </Combobox.InputGroup>
          <Combobox.Portal>
            <Combobox.Positioner sideOffset={4}>
              <Combobox.Popup>
                <Combobox.Empty>No school matches that search.</Combobox.Empty>
                <Combobox.List>
                  {(school: string) => (
                    <Combobox.Item key={school} value={school}>
                      <Combobox.ItemIndicator />
                      {school}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
        <Field.Description>The input is the control, so the label keeps its native for attribute.</Field.Description>
      </Field.Root>
    </div>
  );
}
