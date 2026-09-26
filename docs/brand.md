# Ultima brand

Ultima gives developers React components they install as source. Its identity should feel at home beside their own work. The wordmark keeps the syntax of a CSS custom property, `--ultima:`, and the compact `u:` mark keeps the initial and colon when the full name will not fit.

## Color and typography

The primary identity is monochrome: ink `#171717` and paper `#FAFAF9`. Use the dark logo on dark backgrounds and the light logo on light backgrounds. A pure-white version is available for production contexts that require white artwork. Keep every character the same color, including the punctuation.

The wordmark uses IBM Plex Mono SemiBold with squared punctuation. The exported lettering is outlined SVG, so it needs no installed font. Supporting prose uses IBM Plex Sans; technical text uses IBM Plex Mono. The bundled fonts retain their [OFL license](../apps/docs/public/fonts/OFL.txt).

Blue remains available through the component palette. It is not required for brand recognition. Component states and theme previews keep their semantic colors; the brand does not redefine those tokens.

## Usage

- Use the full wordmark in the site header, README, and any introduction to Ultima. Write “Ultima” in prose.
- Reserve the compact mark for favicons, app icons, and avatars. Use the square avatar asset when a service applies its own circle or rounded mask.
- Leave at least one lowercase letter-height of space around the wordmark. The compact exports include their own padding; do not crop it away.
- Keep the wordmark at least 100 CSS pixels wide. Use the compact mark below that size. Check raster exports at their final display size.
- Preserve proportions. Do not recolor individual characters, add shadows or outlines, or place the mark on a busy image.
- The social card introduces the product with “React components. Your source.” and the site address. Keep practical product language alongside the name.

## Assets

All paths below are relative to `apps/docs/public/`.

| Asset | Files | Use |
| --- | --- | --- |
| Primary wordmarks | `brand/ultima-logo-dark.svg`, `brand/ultima-logo-light.svg` | Site and repository identity |
| Production wordmarks | `brand/ultima-logo-white.svg`, `brand/ultima-logo-ink.svg` | Single-color artwork |
| Compact marks | `brand/ultima-mark-{dark,light,white,ink}.svg` | Small placements on a chosen background |
| Default compact mark | `brand/ultima-mark.svg` | Ink, transparent background |
| Square avatar | `brand/ultima-avatar.svg`, `.png` | Repository or social avatar; PNG is 1024 × 1024 |
| Social card | `brand/ultima-social.svg`, `og.png` | Editable vector and 1200 × 630 share image |
| Browser icons | `favicon.svg`, `favicon.ico` | SVG and 16–256 px ICO sizes |
| Platform icons | `apple-touch-icon.png`, `android-chrome-*.png` | 180, 192, and 512 px icons |
| Review board | `brand/ultima-brand-board.png` | Both backgrounds and actual-size icon samples |

Every named wordmark also has a transparent PNG at 1600 px wide. Compact mark variants have 512 × 512 transparent PNGs. Prefer SVG on the web.

## Regeneration

Run from the repository root:

```sh
python3 -m venv .scratch/brand-venv
.scratch/brand-venv/bin/pip install -r scripts/brand-requirements.txt
.scratch/brand-venv/bin/python scripts/build-brand.py
```

CairoSVG also requires the system Cairo library. The generator uses the bundled fonts, produces vector outlines and raster exports from the same geometry, and writes provenance into PNG metadata. Edit the generator rather than its output. After regeneration, inspect the board and share image, then verify the site header in both modes at desktop and mobile widths.
