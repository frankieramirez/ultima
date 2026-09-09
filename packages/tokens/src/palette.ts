import { arcane, ember, mana, mithril, ruin, verdant } from './tokens.stylex';

export type ColorMode = 'dark' | 'light';
export type ScaleName = 'mithril' | 'arcane' | 'mana' | 'verdant' | 'ember' | 'ruin';

const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
type Scale = Record<`${ColorMode}${(typeof steps)[number]}`, string>;

const list = (name: ScaleName, scale: Scale) => ({
  name,
  dark: steps.map((step) => scale[`dark${step}`]),
  light: steps.map((step) => scale[`light${step}`]),
});

export const palette = [
  list('mithril', mithril),
  list('arcane', arcane),
  list('mana', mana),
  list('verdant', verdant),
  list('ember', ember),
  list('ruin', ruin),
];
