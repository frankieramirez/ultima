import { Avatar } from '@ultima/ui';

const PORTRAIT =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%235a4fcf'/%3E%3Ccircle cx='32' cy='24' r='12' fill='%23ddd9f7'/%3E%3Cpath d='M8 64c3-16 13-22 24-22s21 6 24 22' fill='%23ddd9f7'/%3E%3C/svg%3E";

export default function BasicAvatar() {
  return (
    <Avatar.Root>
      <Avatar.Fallback>FR</Avatar.Fallback>
      <Avatar.Image src={PORTRAIT} alt="Frankie Ramirez" />
    </Avatar.Root>
  );
}
