import { Avatar } from '@ultima/ui';

const PORTRAIT =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%232f6b4f'/%3E%3Ccircle cx='32' cy='24' r='12' fill='%23d7efe2'/%3E%3Cpath d='M8 64c3-16 13-22 24-22s21 6 24 22' fill='%23d7efe2'/%3E%3C/svg%3E";

export default function KeepMountedAvatar() {
  return (
    <Avatar.Root>
      <Avatar.Fallback>LT</Avatar.Fallback>
      <Avatar.Image src={PORTRAIT} alt="Linnea Torres" keepMounted loading="lazy" />
    </Avatar.Root>
  );
}
