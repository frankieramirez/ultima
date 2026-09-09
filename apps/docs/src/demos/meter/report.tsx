import { Meter } from '@ultima/ui';

export default function Report() {
  return (
    <Meter.Root value={68}>
      <Meter.Label>Accessibility score</Meter.Label>
      <Meter.Track>
        <Meter.Indicator tone="success" />
      </Meter.Track>
      <Meter.Value />
    </Meter.Root>
  );
}
