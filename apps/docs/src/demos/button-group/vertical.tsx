import { ButtonGroup } from '@ultima/ui';

export default function VerticalButtonGroup() {
  return (
    <ButtonGroup.Root aria-label="Move item" orientation="vertical">
      <ButtonGroup.Item>Move to top</ButtonGroup.Item>
      <ButtonGroup.Item>Move up</ButtonGroup.Item>
      <ButtonGroup.Item>Move down</ButtonGroup.Item>
      <ButtonGroup.Item>Move to bottom</ButtonGroup.Item>
    </ButtonGroup.Root>
  );
}
