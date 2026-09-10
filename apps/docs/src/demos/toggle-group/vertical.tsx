import { ToggleGroup } from '@ultima/ui';

export default function VerticalToggleGroup() {
  return (
    <ToggleGroup.Root aria-label="Severity filter" defaultValue={['errors']} orientation="vertical">
      <ToggleGroup.Item value="errors">Errors</ToggleGroup.Item>
      <ToggleGroup.Item value="warnings">Warnings</ToggleGroup.Item>
      <ToggleGroup.Item value="notices">Notices</ToggleGroup.Item>
    </ToggleGroup.Root>
  );
}
