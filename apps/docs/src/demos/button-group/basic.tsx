import { ButtonGroup } from '@ultima/ui';

export default function BasicButtonGroup() {
  return (
    <ButtonGroup.Root aria-label="Text alignment">
      <ButtonGroup.Item>Left</ButtonGroup.Item>
      <ButtonGroup.Item>Center</ButtonGroup.Item>
      <ButtonGroup.Item>Right</ButtonGroup.Item>
      <ButtonGroup.Item>Justify</ButtonGroup.Item>
    </ButtonGroup.Root>
  );
}
