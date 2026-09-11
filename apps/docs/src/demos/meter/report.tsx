import { Meter } from '@ultima/ui';

export default function Report() {
  return (
    <Meter.Root value={68} tone="success">
      <Meter.Label>Accessibility score</Meter.Label>
      <Meter.Track>
        <Meter.Indicator />
      </Meter.Track>
      <Meter.Value />
    </Meter.Root>
  );
}
