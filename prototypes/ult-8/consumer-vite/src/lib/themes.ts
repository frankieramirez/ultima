import * as stylex from '@stylexjs/stylex';
import { color } from './tokens.stylex';

export const darkTheme = stylex.createTheme(color, {
  surface: '#0b0d12',
  surfaceRaised: '#151922',
  text: '#e8eaf0',
  textMuted: '#9aa3b5',
  border: '#242a36',
  accent: '#7c6cff',
  accentText: '#ffffff',
});

export const lightTheme = stylex.createTheme(color, {
  surface: '#ffffff',
  surfaceRaised: '#f4f5f7',
  text: '#12151c',
  textMuted: '#5b6474',
  border: '#dfe2e8',
  accent: '#5b4ae0',
  accentText: '#ffffff',
});
