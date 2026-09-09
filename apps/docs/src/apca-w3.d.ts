// apca-w3 ships no types. Only the two entry points the pairings table calls
// are declared; see https://github.com/Myndex/apca-w3.
declare module 'apca-w3' {
  /** Screen luminance from an 8-bit sRGB triplet. */
  export function sRGBtoY(rgb: [number, number, number]): number;
  /** Lightness contrast in Lc, signed by text polarity. */
  export function APCAcontrast(textY: number, backgroundY: number): number;
}
