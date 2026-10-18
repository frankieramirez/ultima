// docs/spec/ultima.md, Consumer CLI, Update, What it does per state. The line-based three-way merge of an installed
// base, the local file and the served file. Changes that overlap or touch on both sides, unless identical, conflict.
import { diffArrays } from 'diff';

export type Merge = { text: string; conflicts: 0 } | { conflicts: number; withMarkers(labels: MarkerLabels): string };

/** What follows `<<<<<<<`, `|||||||` and `>>>>>>>` on each conflict's marker lines. */
export type MarkerLabels = { local: string; base: string; served: string };

/** The base lines `start` to `end` replaced by `lines` on one side. */
type Edit = { side: 'local' | 'served'; start: number; end: number; lines: string[] };
type Chunk = string[] | { local: string[]; base: string[]; served: string[] };

const split = (text: string) => text.split(/(?<=\n)/).filter((line) => line !== '');

function edits(base: string[], text: string, side: Edit['side']): Edit[] {
  const found: Edit[] = [];
  let open: Edit | undefined;
  let at = 0;
  for (const change of diffArrays(base, split(text))) {
    if (!change.added && !change.removed) {
      if (open) found.push(open);
      open = undefined;
      at += change.count;
      continue;
    }
    open ??= { side, start: at, end: at, lines: [] };
    if (change.added) open.lines.push(...change.value);
    else {
      open.end += change.count;
      at += change.count;
    }
  }
  if (open) found.push(open);
  return found;
}

export function merge3(base: string, local: string, served: string): Merge {
  const original = split(base);
  const all = [...edits(original, local, 'local'), ...edits(original, served, 'served')].sort((a, b) => a.start - b.start || a.end - b.end);
  const chunks: Chunk[] = [];
  let at = 0;
  for (let index = 0; index < all.length; ) {
    const { start, end: first } = all[index] as Edit;
    const group: Edit[] = [];
    let end = first;
    for (; index < all.length && (all[index] as Edit).start <= end; index += 1) {
      end = Math.max(end, (all[index] as Edit).end);
      group.push(all[index] as Edit);
    }
    const side = (name: Edit['side']) => {
      const lines: string[] = [];
      let from = start;
      for (const edit of group.filter((candidate) => candidate.side === name)) {
        lines.push(...original.slice(from, edit.start), ...edit.lines);
        from = edit.end;
      }
      return [...lines, ...original.slice(from, end)];
    };
    chunks.push(original.slice(at, start));
    const [ours, theirs] = [side('local'), side('served')];
    if (group.every((edit) => edit.side === 'local') || ours.join('') === theirs.join('')) chunks.push(ours);
    else if (group.every((edit) => edit.side === 'served')) chunks.push(theirs);
    else chunks.push({ local: ours, base: original.slice(start, end), served: theirs });
    at = end;
  }
  chunks.push(original.slice(at));

  const conflicts = chunks.filter((chunk) => !Array.isArray(chunk)).length;
  if (conflicts === 0) return { text: chunks.flat().join(''), conflicts: 0 };
  const block = (lines: string[]) => {
    const text = lines.join('');
    return text === '' || text.endsWith('\n') ? text : `${text}\n`;
  };
  return {
    conflicts,
    withMarkers: (labels) =>
      chunks
        .map((chunk) =>
          Array.isArray(chunk)
            ? chunk.join('')
            : `<<<<<<< ${labels.local}\n${block(chunk.local)}||||||| ${labels.base}\n${block(chunk.base)}=======\n${block(chunk.served)}>>>>>>> ${labels.served}\n`,
        )
        .join(''),
  };
}
