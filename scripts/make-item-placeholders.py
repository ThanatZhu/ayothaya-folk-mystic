# Placeholder item atlas until the painted art arrives: 6x4 cells of 256 px, transparent, simple shapes + a Thai label.
# The finished art replaces assets/items42/items.png with the same layout (see docs/items42-art.md). Usage: python scripts/make-item-placeholders.py
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parent.parent
src = (root / 'items.js').read_text(encoding='utf8')
import sys
GEAR = '--gear' in sys.argv  # 0.43 stat gear atlas instead of the 0.42 item atlas
REFINE = '--refine' in sys.argv  # 0.44 refine materials atlas
ATLAS = 'refine' if REFINE else 'gear' if GEAR else None
pat = (r"'([a-z-]+)':\{atlas:'" + ATLAS + r"',icon:(\d+),name:'([^']+)',kind:'([a-z]+)'") if ATLAS else r"'([a-z-]+)':\{icon:(\d+),name:'([^']+)',kind:'([a-z]+)'"
items = re.findall(pat, src)
font = ImageFont.truetype(str(root / 'assets/fonts/Mali-Bold.ttf'), 34)
colors = {'loot': (198, 161, 100), 'potion': (205, 80, 70), 'ui': (244, 207, 122), 'reserved': (120, 130, 120), 'gear': (150, 170, 190)}
atlas = Image.new('RGBA', (1536, 1024), (0, 0, 0, 0))
for item_id, icon, name, kind in items:
    i = int(icon); x, y = i % 6 * 256, i // 6 * 256
    cell = Image.new('RGBA', (256, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(cell)
    c = colors[kind]
    if item_id.startswith('mp') : c = (70, 130, 210)
    if item_id == 'sticky-rice': c = (110, 160, 80)
    if kind == 'potion':
        d.rounded_rectangle((88, 70, 168, 200), 30, fill=c + (255,), outline=(40, 25, 15, 255), width=6)
        d.rectangle((108, 44, 148, 74), fill=(170, 130, 80, 255), outline=(40, 25, 15, 255), width=5)
        if 'large' in item_id: d.rounded_rectangle((70, 100, 186, 210), 34, fill=c + (255,), outline=(40, 25, 15, 255), width=6)
    elif item_id.startswith('cowrie'):
        for k, (ox, oy) in enumerate([(0, 0)] if item_id == 'cowrie' else [(-40, 20), (40, 20), (0, -20)]):
            d.ellipse((88 + ox, 80 + oy, 168 + ox, 180 + oy), fill=(250, 238, 210, 255), outline=(120, 90, 50, 255), width=6)
            d.line((128 + ox, 95 + oy, 128 + ox, 165 + oy), fill=(120, 90, 50, 255), width=5)
    else:
        d.polygon([(128, 40), (210, 110), (180, 205), (76, 205), (46, 110)], fill=c + (255,), outline=(40, 25, 15, 255))
    label = name[:4]
    w = d.textlength(label, font=font)
    d.text(((256 - w) / 2, 206), label, font=font, fill=(255, 245, 220, 255), stroke_width=4, stroke_fill=(20, 30, 25, 255))
    atlas.alpha_composite(cell, (x, y))
out = root / ('assets/refine44/refine.png' if REFINE else 'assets/gear43/gear.png' if GEAR else 'assets/items42/items.png'); out.parent.mkdir(parents=True, exist_ok=True); atlas.save(out)
print('placeholder atlas:', len(items), 'items')
