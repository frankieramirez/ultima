const sources = import.meta.glob<string>('../../../docs/adr/*.md', { query: '?raw', import: 'default', eager: true });

const SOURCE_ROOT = 'https://github.com/frankieramirez/ultima/blob/main/docs/adr';

export type DecisionRecord = {
  number: string;
  title: string;
  status: 'Accepted' | 'Amended';
  href: string;
};

export const records: DecisionRecord[] = Object.entries(sources)
  .map(([path, source]) => {
    const file = path.slice(path.lastIndexOf('/') + 1);
    const heading = /^# (\d+)\. (.+)$/m.exec(source);
    if (!heading?.[1] || !heading[2]) throw new Error(`docs/adr/${file} needs a "# <number>. <title>" heading`);
    return {
      number: heading[1].padStart(4, '0'),
      title: heading[2],
      status: /^(## Amendment\b|Amended \d)/m.test(source) ? 'Amended' : 'Accepted',
      href: `${SOURCE_ROOT}/${file}`,
    } satisfies DecisionRecord;
  })
  .sort((a, b) => a.number.localeCompare(b.number));
