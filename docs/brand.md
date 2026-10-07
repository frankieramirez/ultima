# Ultima brand

The Compact identity uses a custom lowercase `ultima` wordmark and a squared `u` mark. The separated `l` and `t` preserve readability at header sizes.

## Color and typography

The wordmark uses ink `#0d0e0e` and paper `#eeeeea`. Use the dark logo on dark backgrounds and the light logo on light backgrounds. A pure-white version is available. Cyan `#31c6d2` is the background for browser and platform icons.

The wordmark is custom path artwork, with no font dependency. Site prose and controls use Figtree; headings use Space Grotesk; technical text and social-card captions use IBM Plex. Their bundled OFL licenses remain in `apps/docs/public/fonts/`.

These colors belong to the brand artwork. Component states and theme previews keep their semantic tokens.

## Usage

- Use the full wordmark in the site header, README, and any introduction to Ultima. Write “Ultima” in prose.
- Reserve the compact mark for favicons, app icons, and avatars. Use the square avatar asset when a service applies its own circle or rounded mask.
- Leave at least half a lowercase letter-height of space around the wordmark. The compact exports include their own padding; do not crop it away.
- Use a 24 CSS pixel height for the site header and mobile menu. Preserve the 714:197 aspect ratio. The wordmark has been inspected at 16, 20, 24 and 32 pixels high; prefer the compact mark when the full name cannot fit.
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

CairoSVG also requires the system Cairo library. The generator holds the custom wordmark paths, uses the bundled fonts for social-card captions, and produces vector and raster exports from the same geometry. It writes provenance into PNG metadata. Edit the generator rather than its output. After regeneration, inspect the board and share image, then verify the site header in both modes at desktop and mobile widths.
