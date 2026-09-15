import { Progress } from '@ultima/ui';

export default function Indeterminate() {
  return (
    <Progress.Root value={null}>
      <Progress.Label>Restoring backup</Progress.Label>
      <Progress.Track>
        <Progress.Indicator />
      </Progress.Track>
    </Progress.Root>
  );
}
