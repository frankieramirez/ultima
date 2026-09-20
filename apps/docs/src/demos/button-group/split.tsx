import { ButtonGroup } from '@ultima/ui';

export default function SplitButtonGroup() {
  return (
    <ButtonGroup.Root aria-label="Publish options">
      <ButtonGroup.Item>Publish</ButtonGroup.Item>
      <ButtonGroup.Item variant="outline">Schedule</ButtonGroup.Item>
      <ButtonGroup.Item variant="outline" tone="danger">
        Discard draft
      </ButtonGroup.Item>
    </ButtonGroup.Root>
  );
}
