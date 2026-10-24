// The committed share video agrees with the tags and the cache rule that point at it, read from the
// MP4's own boxes so the check needs no ffmpeg. docs/spec/ultima.md, Discovery surface.
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

import { frameAt, FRAMES, POSTER, VIDEO } from '../og-video.ts';

const VIDEO_URL = 'https://ultima.systems/og/theme-studio.mp4';
const html = readFileSync(new URL('../../apps/docs/index.html', import.meta.url), 'utf8');
const meta = (key: string) => [...html.matchAll(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`, 'g'))].map((match) => match[1]);

type Box = { type: string; start: number; end: number };

function boxes(file: Buffer, start = 0, end = file.length): Box[] {
  const found: Box[] = [];
  for (let at = start; at + 8 <= end; ) {
    let size = file.readUInt32BE(at);
    let header = 8;
    if (size === 1) {
      size = Number(file.readBigUInt64BE(at + 8));
      header = 16;
    } else if (size === 0) size = end - at;
    found.push({ type: file.toString('latin1', at + 4, at + 8), start: at + header, end: at + size });
    at += size;
  }
  return found;
}

const child = (file: Buffer, box: Box, type: string) => boxes(file, box.start, box.end).find((inner) => inner.type === type);

function readMp4(path: string) {
  const file = readFileSync(path);
  const top = boxes(file);
  const moov = top.find(({ type }) => type === 'moov')!;
  const mvhd = child(file, moov, 'mvhd')!;
  const v1 = file[mvhd.start] === 1;
  const timescale = file.readUInt32BE(mvhd.start + (v1 ? 20 : 12));
  const duration = v1 ? Number(file.readBigUInt64BE(mvhd.start + 24)) : file.readUInt32BE(mvhd.start + 16);
  const tracks = boxes(file, moov.start, moov.end)
    .filter(({ type }) => type === 'trak')
    .map((trak) => {
      const tkhd = child(file, trak, 'tkhd')!;
      const size = tkhd.end - 8;
      const hdlr = child(file, child(file, trak, 'mdia')!, 'hdlr')!;
      return {
        handler: file.toString('latin1', hdlr.start + 8, hdlr.start + 12),
        width: file.readUInt32BE(size) / 65536,
        height: file.readUInt32BE(size + 4) / 65536,
      };
    });
  return { order: top.map(({ type }) => type), seconds: duration / timescale, tracks };
}

function jpegSize(path: string): { width: number; height: number } {
  const file = readFileSync(path);
  for (let at = 2; at < file.length; at += 2 + file.readUInt16BE(at + 2)) {
    const marker = file[at + 1]!;
    if (marker >= 0xc0 && marker <= 0xc2) return { height: file.readUInt16BE(at + 5), width: file.readUInt16BE(at + 7) };
  }
  throw new Error(`${path} has no frame header`);
}

test('the share video is a short, silent, fast-start 1200 × 630 MP4', () => {
  const video = readMp4(VIDEO);
  assert.ok(video.order.indexOf('moov') < video.order.indexOf('mdat'), 'moov comes before mdat');
  assert.deepEqual(video.tracks.map(({ handler }) => handler), ['vide'], 'one video track and no audio');
  assert.deepEqual([video.tracks[0]!.width, video.tracks[0]!.height], [1200, 630]);
  assert.ok(video.seconds >= 6 && video.seconds <= 10, `${video.seconds}s is 6 to 10 seconds`);
  assert.ok(statSync(VIDEO).size < 3 * 1024 * 1024, 'under 3 MB');
  assert.deepEqual(jpegSize(POSTER), { width: 1200, height: 630 });
});

test('index.html offers the video with og.png as the still fallback', () => {
  const video = readMp4(VIDEO).tracks[0]!;
  for (const key of ['og:video', 'og:video:url', 'og:video:secure_url']) assert.deepEqual(meta(key), [VIDEO_URL], key);
  assert.deepEqual(meta('og:video:type'), ['video/mp4']);
  assert.deepEqual(meta('og:video:width'), [String(video.width)]);
  assert.deepEqual(meta('og:video:height'), [String(video.height)]);
  assert.deepEqual(meta('og:image'), ['https://ultima.systems/og.png']);
  assert.deepEqual(meta('twitter:card'), ['summary_large_image']);
  assert.deepEqual(meta('twitter:player'), []);
});

test('_headers caches the video path without setting its type', () => {
  const headers = readFileSync(new URL('../../apps/docs/public/_headers', import.meta.url), 'utf8');
  const rule = /^\/og\/\*\n((?: {2}.+\n?)+)/m.exec(headers)?.[1];
  assert.ok(rule, 'an /og/* rule');
  assert.match(rule, /Cache-Control: public, max-age=86400, stale-while-revalidate=604800/);
  assert.doesNotMatch(rule, /Content-Type/i);
});

test('the loop ends on the frame it starts on', () => {
  assert.deepEqual(frameAt(FRAMES - 1), frameAt(0));
  assert.notDeepEqual(frameAt(FRAMES / 2), frameAt(0));
});
