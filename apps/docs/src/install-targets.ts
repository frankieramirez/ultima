export const INSTALL_TARGETS = [
  {
    value: 'vite',
    label: 'Vite',
    commands: ['npx shadcn add https://ultima.systems/r/setup-vite.json', 'npx shadcn add @ultima/button'],
  },
  {
    value: 'next',
    label: 'Next.js',
    commands: ['npx shadcn add https://ultima.systems/r/setup-next.json', 'npx shadcn add @ultima/button'],
  },
] as const;
