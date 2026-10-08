import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { items } from '../../../../registry/items.config.ts';

const SKILL = readFileSync(new URL('../../skill/ultima-design/SKILL.md', import.meta.url), 'utf8');
const ITEM = new RegExp(`(?<![\\w-])(?:${Object.keys(items).join('|')})(?![\\w-])`, 'i');

/** The constructs docs/spec/ultima.md, Consumer CLI, Skill, What may be prose, bans. Link targets are URLs, not prose. */
function lint(text: string): string[] {
  const lineCount = text.replace(/\n$/, '').split('\n').length;
  const prose = text.replace(/\]\([^)]*\)/g, ']()');
  const problems: string[] = [];
  if (/--ult-/.test(prose)) problems.push('token name');
  if (ITEM.test(prose.replace(/@ultima\/[\w-]+/g, ''))) problems.push('item name');
  if (/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i.test(prose)) problems.push('color literal');
  if (lineCount > 80) problems.push('over 80 lines');
  return problems;
}

describe('the consumer skill', () => {
  it('passes the lint', () => {
    expect(lint(SKILL)).toEqual([]);
  });

  it('spells every command npx ultima-design', () => {
    expect(SKILL).not.toMatch(/npx ultima(?!-design)/);
    expect(SKILL).toMatch(/npx ultima-design status/);
  });

  it('discovers the local theme before installed-item work without selecting a brand', () => {
    expect(SKILL.indexOf('## 3. Discover the local theme')).toBeLessThan(SKILL.indexOf('Learn what is installed'));
    for (const pointer of ['project instructions', 'DESIGN.md', 'application root', 'inherited guidance', 'entry/layout imports', 'portal containers', 'installed source', 'Preserve an existing product brand', 'authorized custom theme', 'https://ultima.systems/llms.txt#discover-and-maintain-the-product-theme']) {
      expect(SKILL).toContain(pointer);
    }
    expect(SKILL).toContain('npx ultima-design doctor --theme');
    expect(SKILL).toContain('npx --no-install ultima-design doctor --theme');
    expect(SKILL).toContain('Static matches do not prove rendering');
  });

  it('keeps local checks usable offline without claiming registry freshness', () => {
    expect(SKILL).toContain('npx --no-install ultima-design doctor');
    expect(SKILL).toContain('npx --no-install ultima-design check');
    expect(SKILL).toContain('leave unknown API choices unresolved');
    expect(SKILL).toContain('`status` and `diff` need the registry');
    expect(SKILL).toContain('unavailable comparisons do not prove freshness');
    expect(SKILL).toContain('When the registry is available, before adding an item');
    expect(SKILL).toContain('Offline, use `npx --no-install` for the checks below');
    expect(SKILL).toContain('A zero CLI exit cannot prove the theme rendered');
  });

  it.each([
    ['a token name', 'Read `--ult-color-accent` for the accent.', 'token name'],
    ['an item name', 'Wrap it in a Button.', 'item name'],
    ['a hyphenated item name', 'Use the dropdown-menu here.', 'item name'],
    ['a hex color', 'Paint it #1a2b3c.', 'color literal'],
    ['a functional color', 'Paint it oklch(0.6 0.1 250).', 'color literal'],
    ['more than 80 lines', 'line\n'.repeat(81), 'over 80 lines'],
  ])('fails on %s', (_, text, problem) => {
    expect(lint(text)).toEqual([problem]);
  });

  it('allows an item inside @ultima/<item> and a link target', () => {
    expect(lint('Add it with `npx shadcn add @ultima/button` ([reference](https://ultima.systems/tokens#add)).\n')).toEqual([]);
  });
});
