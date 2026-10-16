export const INSTALL_TARGETS = [
  {
    value: 'vite',
    label: 'Vite',
    commands: ['npx shadcn@4.21.4 add https://ultima.systems/r/setup-vite.json', 'npx shadcn@4.21.4 add @ultima/button'],
  },
  {
    value: 'next',
    label: 'Next.js',
    commands: ['npx shadcn@4.21.4 add https://ultima.systems/r/setup-next.json', 'npx shadcn@4.21.4 add @ultima/button'],
  },
] as const;
