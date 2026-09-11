import { Meter } from '@ultima/ui';

export default function Override() {
  return (
    <Meter.Root value={92} tone="danger">
      <Meter.Label>Storage used</Meter.Label>
      <Meter.Track>
        <Meter.Indicator />
      </Meter.Track>
      <Meter.Value tone="neutral" />
    </Meter.Root>
  );
}
