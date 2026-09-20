import { NativeSelect } from '@ultima/ui';

export default function NativeSelectGroups() {
  return (
    <NativeSelect.Root>
      <NativeSelect.Select aria-label="Crafting material" defaultValue="oak">
        <optgroup label="Wood">
          <option value="oak">Oak</option>
          <option value="pine">Pine</option>
        </optgroup>
        <optgroup label="Metal">
          <option value="iron">Iron</option>
          <option value="steel">Steel</option>
        </optgroup>
      </NativeSelect.Select>
    </NativeSelect.Root>
  );
}
