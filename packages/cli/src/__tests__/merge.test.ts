import { describe, expect, it } from 'vitest';

import { merge3 } from '../merge.ts';

const lines = (...text: string[]) => text.map((line) => `${line}\n`).join('');
const labels = { local: 'local', base: '@ultima/select aaaaaaaaaaaa', served: '@ultima/select bbbbbbbbbbbb' };

describe('merge3', () => {
  const base = lines('a', 'b', 'c', 'd', 'e', 'f', 'g');

  it('takes a change made on one side, from either side', () => {
    expect(merge3(base, lines('a', 'B', 'c', 'd', 'e', 'f', 'g'), base)).toEqual({ text: lines('a', 'B', 'c', 'd', 'e', 'f', 'g'), conflicts: 0 });
    expect(merge3(base, base, lines('a', 'b', 'c', 'd', 'e', 'F', 'g'))).toEqual({ text: lines('a', 'b', 'c', 'd', 'e', 'F', 'g'), conflicts: 0 });
  });

  it('merges a local edit in one region with a served change in another', () => {
    const local = lines('a', 'b', 'local', 'c', 'd', 'e', 'f', 'g');
    const served = lines('a', 'b', 'c', 'd', 'e', 'served', 'g', 'h');
    expect(merge3(base, local, served)).toEqual({ text: lines('a', 'b', 'local', 'c', 'd', 'e', 'served', 'g', 'h'), conflicts: 0 });
  });

  it('takes a change made the same way on both sides once', () => {
    const both = lines('a', 'b', 'c', 'D', 'e', 'f', 'g');
    expect(merge3(base, both, both)).toEqual({ text: both, conflicts: 0 });
    expect(merge3(base, lines('a', 'B', 'c', 'D', 'e', 'f', 'g'), lines('a', 'b', 'c', 'D', 'e', 'F', 'g'))).toEqual({
      text: lines('a', 'B', 'c', 'D', 'e', 'F', 'g'),
      conflicts: 0,
    });
  });

  it('counts each region changed differently on both sides as one conflict, and marks it diff3 style', () => {
    const local = lines('a', 'local b', 'c', 'd', 'e', 'local f', 'g');
    const served = lines('a', 'served b', 'c', 'd', 'e', 'served f', 'g');
    const merged = merge3(base, local, served);
    expect(merged.conflicts).toBe(2);
    expect('withMarkers' in merged && merged.withMarkers(labels)).toBe(
      lines(
        'a',
        '<<<<<<< local',
        'local b',
        '||||||| @ultima/select aaaaaaaaaaaa',
        'b',
        '=======',
        'served b',
        '>>>>>>> @ultima/select bbbbbbbbbbbb',
        'c',
        'd',
        'e',
        '<<<<<<< local',
        'local f',
        '||||||| @ultima/select aaaaaaaaaaaa',
        'f',
        '=======',
        'served f',
        '>>>>>>> @ultima/select bbbbbbbbbbbb',
        'g',
      ),
    );
  });

  it('treats changes on adjacent lines as one conflict, so neither is kept without a look', () => {
    const merged = merge3(base, lines('a', 'B', 'c', 'd', 'e', 'f', 'g'), lines('a', 'b', 'C', 'd', 'e', 'f', 'g'));
    expect(merged.conflicts).toBe(1);
    expect('withMarkers' in merged && merged.withMarkers(labels)).toBe(
      lines('a', '<<<<<<< local', 'B', 'c', '||||||| @ultima/select aaaaaaaaaaaa', 'b', 'c', '=======', 'b', 'C', '>>>>>>> @ultima/select bbbbbbbbbbbb', 'd', 'e', 'f', 'g'),
    );
  });

  it('conflicts on two different insertions at the same place, and on a deletion against an edit', () => {
    expect(merge3(base, lines('a', 'x', 'b', 'c', 'd', 'e', 'f', 'g'), lines('a', 'y', 'b', 'c', 'd', 'e', 'f', 'g')).conflicts).toBe(1);
    const merged = merge3(base, lines('a', 'b', 'c', 'e', 'f', 'g'), lines('a', 'b', 'c', 'D', 'e', 'f', 'g'));
    expect(merged.conflicts).toBe(1);
    expect('withMarkers' in merged && merged.withMarkers(labels)).toContain(lines('<<<<<<< local', '||||||| @ultima/select aaaaaaaaaaaa', 'd', '=======', 'D'));
  });

  it('ends each side of a conflict on its own line when the file has no final newline', () => {
    const merged = merge3('a\nb', 'a\nlocal', 'a\nserved');
    expect('withMarkers' in merged && merged.withMarkers(labels)).toBe(
      lines('a', '<<<<<<< local', 'local', '||||||| @ultima/select aaaaaaaaaaaa', 'b', '=======', 'served', '>>>>>>> @ultima/select bbbbbbbbbbbb'),
    );
  });
});
