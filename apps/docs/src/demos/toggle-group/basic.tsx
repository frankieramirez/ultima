import { useState } from 'react';
import { ToggleGroup } from '@ultima/ui';

type View = 'list' | 'grid' | 'chart';

export default function BasicToggleGroup() {
  const [view, setView] = useState<View[]>(['list']);

  return (
    <ToggleGroup.Root aria-label="Result layout" onValueChange={setView} value={view}>
      <ToggleGroup.Item value="list">List</ToggleGroup.Item>
      <ToggleGroup.Item value="grid">Grid</ToggleGroup.Item>
      <ToggleGroup.Item value="chart">Chart</ToggleGroup.Item>
    </ToggleGroup.Root>
  );
}
