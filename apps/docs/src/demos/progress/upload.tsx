import { Progress } from '@ultima/ui';

export default function Upload() {
  return (
    <Progress.Root value={64} tone="highlight">
      <Progress.Label>Uploading footage</Progress.Label>
      <Progress.Track>
        <Progress.Indicator />
      </Progress.Track>
      <Progress.Value />
    </Progress.Root>
  );
}
