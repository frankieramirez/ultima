"""Regenerate brand assets: python3 -m pip install fonttools brotli pillow."""

from io import BytesIO
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont


PUBLIC = Path(__file__).resolve().parents[1] / 'apps/docs/public'
BLUE, INK, WHITE = '#126BFA', '#0B1020', '#FFFFFF'
font = TTFont(PUBLIC / 'fonts/IBMPlexMono-SemiBold.woff2')
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
units = font['head'].unitsPerEm
font.flavor = None
ttf = BytesIO()
font.save(ttf)
letters = []
x = 0
for char in '--ultima:':
    glyph = glyphs[cmap[ord(char)]]
    pen, bounds = SVGPathPen(glyphs), BoundsPen(glyphs)
    glyph.draw(pen)
    glyph.draw(bounds)
    path, box = pen.getCommands(), bounds.bounds
    if char == '-':
        path, box = 'M30 260H450V380H30Z', (30, 260, 450, 380)
    elif char == ':':
        path, box = 'M200 0H340V140H200Z M200 360H340V500H200Z', (200, 0, 340, 500)
    letters.append((char, x, path, box))
    x += 530 if char == '-' else glyph.width

left = min(x + b[0] for _, x, _, b in letters)
right = max(x + b[2] for _, x, _, b in letters)
bottom = min(b[1] for _, _, _, b in letters)
top = max(b[3] for _, _, _, b in letters)
width, height = right - left, top - bottom


def logo_svg(label, text_color, punctuation):
    paths = '\n'.join(
        f'  <path fill="{punctuation if char in "-:" else text_color}" '
        f'transform="translate({x-left} {top}) scale(1 -1)" d="{path}"/>'
        for char, x, path, _ in letters
    )
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
            f'role="img" aria-labelledby="title">\n  <title id="title">{label}</title>\n'
            f'{paths}\n</svg>\n')


for name, label, text, accent in [
    ('dark', 'Ultima logo for dark backgrounds', WHITE, BLUE),
    ('light', 'Ultima logo for light backgrounds', INK, BLUE),
    ('white', 'Ultima monochrome white logo', WHITE, WHITE),
    ('ink', 'Ultima monochrome ink logo', INK, INK),
]:
    (PUBLIC / f'brand/ultima-logo-{name}.svg').write_text(logo_svg(label, text, accent))

mark = ('  <g fill="' + BLUE + '">\n'
        '    <rect x="10" y="28" width="19" height="8"/>\n'
        '    <rect x="35" y="28" width="19" height="8"/>\n'
        '  </g>\n')
for path, label, background in [
    ('brand/ultima-mark.svg', 'Ultima compact mark', ''),
    ('favicon.svg', 'Ultima favicon', f'  <rect width="64" height="64" rx="14" fill="{INK}"/>\n'),
]:
    (PUBLIC / path).write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-labelledby="title">\n'
        f'  <title id="title">{label}</title>\n{background}{mark}</svg>\n')


def icon(size):
    scale = size * 4 / 64
    image = Image.new('RGB', (size * 4, size * 4), INK)
    draw = ImageDraw.Draw(image)
    for x in (10, 35):
        draw.rectangle((x * scale, 28 * scale, (x + 19) * scale - 1, 36 * scale - 1), fill=BLUE)
    return image.resize((size, size), Image.Resampling.LANCZOS)


for name, size in [('apple-touch-icon', 180), ('android-chrome-192x192', 192), ('android-chrome-512x512', 512)]:
    icon(size).save(PUBLIC / f'{name}.png')
icon(256).save(PUBLIC / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

scale = 4
image = Image.new('RGB', (1200 * scale, 630 * scale), INK)
draw = ImageDraw.Draw(image)
ratio = 1000 * scale / width
face = ImageFont.truetype(BytesIO(ttf.getvalue()), round(units * ratio))
for char, x, _, _ in letters:
    origin_x = 100 * scale + (x-left) * ratio
    baseline = (630 * scale-height*ratio)/2 + top*ratio
    if char in '-:':
        boxes = [(30, 260, 450, 380)] if char == '-' else [(200, 0, 340, 140), (200, 360, 340, 500)]
        for x0, y0, x1, y1 in boxes:
            draw.rectangle((origin_x+x0*ratio, baseline-y1*ratio, origin_x+x1*ratio, baseline-y0*ratio), fill=BLUE)
    else:
        draw.text((origin_x, baseline), char, font=face, anchor='ls', fill=WHITE)
image.resize((1200, 630), Image.Resampling.LANCZOS).save(PUBLIC / 'og.png')
print(f'Logo dimensions: {width} × {height}')
