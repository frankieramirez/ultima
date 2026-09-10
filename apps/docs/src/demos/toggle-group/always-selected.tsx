import { useState } from 'react';
import { ToggleGroup } from '@ultima/ui';

type Density = 'compact' | 'cosy' | 'roomy';

export default function AlwaysSelected() {
  const [density, setDensity] = useState<Density[]>(['cosy']);

  return (
    <ToggleGroup.Root
      aria-label="Row density"
      onValueChange={(next, eventDetails) => {
        if (next.length === 0) {
          eventDetails.cancel();
          return;
        }
        setDensity(next);
      }}
      value={density}
    >
      <ToggleGroup.Item value="compact">Compact</ToggleGroup.Item>
      <ToggleGroup.Item value="cosy">Cosy</ToggleGroup.Item>
      <ToggleGroup.Item value="roomy">Roomy</ToggleGroup.Item>
    </ToggleGroup.Root>
  );
}
