import { ToggleGroup } from '@ultima/ui';

export default function MultipleToggleGroup() {
  return (
    <ToggleGroup.Root aria-label="Text formatting" defaultValue={['bold']} multiple>
      <ToggleGroup.Item value="bold">Bold</ToggleGroup.Item>
      <ToggleGroup.Item value="italic">Italic</ToggleGroup.Item>
      <ToggleGroup.Item value="underline" disabled>
        Underline
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
}
