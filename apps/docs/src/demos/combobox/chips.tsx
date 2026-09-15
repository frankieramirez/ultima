import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Combobox, Field } from '@ultima/ui';

const styles = stylex.create({
  box: {
    maxWidth: `calc(6 * ${space['--ult-space-12']})`,
  },
  chips: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-2'],
    minWidth: 0,
  },
});

const reagents = ['Bloodstone', 'Garlic', 'Ginseng', 'Mandrake', 'Nightshade', 'Spider silk', 'Sulphurous ash'];

export default function ComboboxChips() {
  return (
    <div {...stylex.props(styles.box)}>
      <Field.Root name="reagents">
        <Field.Label>Reagents</Field.Label>
        <Combobox.Root items={reagents} multiple>
          <Combobox.InputGroup>
            <Combobox.Chips style={styles.chips}>
              <Combobox.Value>
                {(selected: string[]) =>
                  selected.map((reagent) => (
                    <Combobox.Chip key={reagent}>
                      {reagent}
                      <Combobox.ChipRemove aria-label={`Remove ${reagent}`} />
                    </Combobox.Chip>
                  ))
                }
              </Combobox.Value>
              <Combobox.Input placeholder="Search reagents" />
            </Combobox.Chips>
          </Combobox.InputGroup>
          <Combobox.Portal>
            <Combobox.Positioner sideOffset={4}>
              <Combobox.Popup>
                <Combobox.Empty>No reagent matches that search.</Combobox.Empty>
                <Combobox.List>
                  {(reagent: string) => (
                    <Combobox.Item key={reagent} value={reagent}>
                      <Combobox.ItemIndicator />
                      {reagent}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
        <Field.Description>Backspace removes the last chip.</Field.Description>
      </Field.Root>
    </div>
  );
}
