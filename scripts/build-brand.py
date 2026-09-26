"""Regenerate the brand kit. See docs/brand.md for setup and usage."""

from html import escape
from io import BytesIO
from pathlib import Path

import cairosvg
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont
from PIL.PngImagePlugin import PngInfo

PUBLIC = Path(__file__).resolve().parents[1] / 'apps/docs/public'
BRAND = PUBLIC / 'brand'
INK, PAPER = '#171717', '#FAFAF9'
BRAND.mkdir(exist_ok=True)


def lettering(value, family='IBMPlexMono-SemiBold'):
    font = TTFont(PUBLIC / f'fonts/{family}.woff2')
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    letters, x = [], 0
    for char in value:
        glyph = glyphs[cmap[ord(char)]]
        pen, bounds = SVGPathPen(glyphs), BoundsPen(glyphs)
        glyph.draw(pen)
        glyph.draw(bounds)
        path, box = pen.getCommands(), bounds.bounds
        if char == '-':
            path, box = 'M30 260H450V380H30Z', (30, 260, 450, 380)
        elif char == ':':
            path, box = 'M200 0H340V140H200Z M200 360H340V500H200Z', (200, 0, 340, 500)
        if box:
            letters.append((x, path, box))
        x += 530 if char == '-' else glyph.width
    left = min(x + b[0] for x, _, b in letters)
    right = max(x + b[2] for x, _, b in letters)
    bottom = min(b[1] for _, _, b in letters)
    top = max(b[3] for _, _, b in letters)
    paths = ''.join(f'<path transform="translate({x-left} {top}) scale(1 -1)" d="{path}"/>' for x, path, _ in letters)
    return paths, right-left, top-bottom


def svg(label, width, height, content):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title">\n'
            f'<title id="title">{escape(label)}</title>\n{content}\n</svg>\n')


def save(name, source, width=None):
    (PUBLIC / name).write_text(source)
    if width:
        raw = cairosvg.svg2png(bytestring=source.encode(), output_width=width)
        image = Image.open(BytesIO(raw))
        metadata = PngInfo()
        metadata.add_text('Source', 'Generated from outlined IBM Plex lettering by scripts/build-brand.py; see fonts/OFL.txt.')
        image.save((PUBLIC / name).with_suffix('.png'), pnginfo=metadata)


word, word_width, word_height = lettering('--ultima:')
mark, mark_width, mark_height = lettering('u:')


def compact(foreground):
    scale = 40 / mark_width
    return f'<g fill="{foreground}" transform="translate(12 {(64-mark_height*scale)/2}) scale({scale})">{mark}</g>'


for variant, foreground in [('dark', PAPER), ('light', INK), ('white', '#FFFFFF'), ('ink', INK)]:
    save(f'brand/ultima-logo-{variant}.svg', svg('Ultima wordmark', word_width, word_height,
         f'<g fill="{foreground}">{word}</g>'), 1600)
    save(f'brand/ultima-mark-{variant}.svg', svg('Ultima compact mark', 64, 64, compact(foreground)), 512)
save('brand/ultima-mark.svg', svg('Ultima compact mark', 64, 64, compact(INK)))
icon_svg = svg('Ultima', 64, 64, f'<rect width="64" height="64" rx="14" fill="{INK}"/>{compact(PAPER)}')
save('favicon.svg', icon_svg)
save('brand/ultima-avatar.svg', svg('Ultima', 64, 64,
     f'<rect width="64" height="64" fill="{INK}"/>{compact(PAPER)}'), 1024)


def icon(size):
    # Raster platform icons use a full bleed background; the platform owns the mask.
    return Image.open(BytesIO(cairosvg.svg2png(
        url=str(BRAND / 'ultima-avatar.svg'), output_width=size*4, output_height=size*4,
    ))).convert('RGB').resize((size, size), Image.Resampling.LANCZOS)


for name, size in [('apple-touch-icon', 180), ('android-chrome-192x192', 192), ('android-chrome-512x512', 512)]:
    metadata = PngInfo()
    metadata.add_text('Source', 'Generated from brand/ultima-avatar.svg by scripts/build-brand.py.')
    icon(size).save(PUBLIC / f'{name}.png', pnginfo=metadata)
icon(256).save(PUBLIC / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])


def placed(value, x, y, width, fill, family='IBMPlexMono-SemiBold'):
    paths, natural_width, _ = lettering(value, family)
    return f'<g fill="{fill}" transform="translate({x} {y}) scale({width/natural_width})">{paths}</g>'


social = (f'<rect width="1200" height="630" fill="{INK}"/>'
          + placed('--ultima:', 80, 154, 960, PAPER)
          + placed('React components. Your source.', 84, 398, 660, PAPER, 'IBMPlexSans-Regular')
          + placed('ultima.systems', 84, 544, 210, PAPER, 'IBMPlexMono-Regular'))
save('brand/ultima-social.svg', svg('Ultima. React components. Your source.', 1200, 630, social))
save('og.svg', svg('Ultima. React components. Your source.', 1200, 630, social), 1200)
# The public share image keeps its established URL; the editable vector lives in brand/.
(PUBLIC / 'og.svg').unlink()

# A reproducible review board, with actual-size favicon samples.
board = Image.new('RGB', (1600, 1000), PAPER)
draw = ImageDraw.Draw(board)
draw.rectangle((0, 0, 1599, 449), fill=INK)
font = TTFont(PUBLIC / 'fonts/IBMPlexSans-Regular.woff2')
font.flavor = None
buffer = BytesIO()
font.save(buffer)
label_font = ImageFont.truetype(BytesIO(buffer.getvalue()), 22)
for variant, y, fg in [('dark', 0, PAPER), ('light', 450, INK)]:
    logo = Image.open(BRAND / f'ultima-logo-{variant}.png')
    logo.thumbnail((980, 200), Image.Resampling.LANCZOS)
    board.paste(logo, (72, y+126), logo)
    draw.text((72, y+48), 'Ultima / primary wordmark', fill=fg, font=label_font)
    compact_image = Image.open(BRAND / f'ultima-mark-{variant}.png').resize((220, 220), Image.Resampling.LANCZOS)
    board.paste(compact_image, (1260, y+105), compact_image)
    draw.text((1270, y+48), 'Compact mark', fill=fg, font=label_font)
draw.text((72, 937), 'Browser and app icons', fill=INK, font=label_font)
for size, x in [(16, 460), (32, 520), (48, 600), (64, 700)]:
    board.paste(icon(size), (x, 950-size//2))
metadata = PngInfo()
metadata.add_text('Source', 'Brand review board generated by scripts/build-brand.py from its vector assets.')
board.save(BRAND / 'ultima-brand-board.png', pnginfo=metadata)
print('Regenerated wordmarks, compact marks, avatar, platform icons, social card and brand board.')
