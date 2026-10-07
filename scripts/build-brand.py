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
INK, PAPER, CYAN = '#0d0e0e', '#eeeeea', '#31c6d2'
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
        if box:
            letters.append((x, path, box))
        x += glyph.width
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
        metadata.add_text('Source', 'Generated from Compact path artwork by scripts/build-brand.py; social captions use IBM Plex (fonts/OFL.txt).')
        image.save((PUBLIC / name).with_suffix('.png'), pnginfo=metadata)


WORD_PATHS = (
    'M0 55H41V143Q41 155 54 155H88Q101 155 101 143V55H142V150Q142 194 99 194H43Q0 194 0 150Z',
    'M152 0H192V194H152Z',
    'M212 26H251V55H288V92H251V139Q251 156 269 156H288V194H263Q212 194 212 145V92H200V55H212Z',
    'M299 0H339V37H299ZM299 55H339V194H299Z',
    'M350 55H390V72Q403 52 427 52Q458 52 473 77Q490 52 518 52Q570 52 570 112V194H530V116Q530 91 508 91Q485 91 485 116V194H445V116Q445 91 423 91Q390 91 390 122V194H350Z',
    'M581 98Q585 52 650 52Q714 52 714 110V194H675V174Q660 197 626 197Q578 197 578 154Q578 113 631 113H675V108Q675 87 650 87Q626 87 622 98ZM675 140H638Q617 140 617 154Q617 168 638 168Q675 168 675 140Z',
)
word = ''.join(f'<path fill-rule="evenodd" d="{path}"/>' for path in WORD_PATHS)
word_width, word_height = 714, 197


def compact(foreground):
    return f'<path fill="{foreground}" d="M14 17H24V39Q24 42 27 42H37Q40 42 40 39V17H50V40Q50 52 38 52H26Q14 52 14 40Z"/>'


for variant, foreground in [('dark', PAPER), ('light', INK), ('white', '#FFFFFF'), ('ink', INK)]:
    save(f'brand/ultima-logo-{variant}.svg', svg('Ultima wordmark', word_width, word_height,
         f'<g fill="{foreground}">{word}</g>'), 1600)
    save(f'brand/ultima-mark-{variant}.svg', svg('Ultima compact mark', 64, 64, compact(foreground)), 512)
save('brand/ultima-mark.svg', svg('Ultima compact mark', 64, 64, compact(INK)))
icon_svg = svg('Ultima', 64, 64, f'<rect width="64" height="64" rx="12" fill="{CYAN}"/>{compact(INK)}')
save('favicon.svg', icon_svg)
save('brand/ultima-avatar.svg', svg('Ultima', 64, 64,
     f'<rect width="64" height="64" fill="{CYAN}"/>{compact(INK)}'), 1024)


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
          + f'<g fill="{PAPER}" transform="translate(80 120) scale({720/word_width})">{word}</g>'
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
