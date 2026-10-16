# Placeholder item atlas until the painted art arrives: 6x4 cells of 256 px, transparent, simple shapes + a Thai label.
# The finished art replaces assets/items42/items.png with the same layout (see docs/items42-art.md). Usage: python scripts/make-item-placeholders.py
import re, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parent.parent
src = (root / 'items.js').read_text(encoding='utf8')
import sys
# Pick exactly one sheet; never default, so a typo cannot overwrite painted art.
SHEETS = {'--items': (None, 'assets/items42/items.png'), '--gear': ('gear', 'assets/gear43/gear.png'), '--refine': ('refine', 'assets/refine44/refine.png'), '--cards': ('cards', 'assets/cards45/cards.png'), '--social': ('social', 'assets/social46/social.png'), '--emblems': ('emblems', 'assets/emblems47/emblems.png'), '--emotes': ('emotes', 'assets/emotes48/emotes.png'), '--items48': ('items48', 'assets/items48/items.png')}
picked = [a for a in sys.argv[1:] if a in SHEETS]
FORCE = '--force' in sys.argv
if len(picked) != 1 or len(sys.argv) != 2 + FORCE: sys.exit('usage: make-item-placeholders.py ' + ' | '.join(SHEETS) + ' [--force]')
ATLAS, OUT = SHEETS[picked[0]]
# A committed sheet may already be painted art: only --force replaces it.
if not FORCE and subprocess.run(['git', '-C', str(root), 'ls-files', '--error-unmatch', OUT], capture_output=True).returncode == 0:
    sys.exit('refusing to overwrite committed ' + OUT + ' (pass --force for a placeholder)')
pat = (r"'([a-z-]+)':\{atlas:'" + ATLAS + r"',icon:(\d+),name:'([^']+)',kind:'([a-z]+)'") if ATLAS else r"'([a-z-]+)':\{icon:(\d+),name:'([^']+)',kind:'([a-z]+)'"
items = re.findall(pat, src)
if ATLAS == 'emblems': items = [('emblem-%d' % (i + 1), str(i), str(i + 1), 'emblem') for i in range(24)]  # generated in items.js
if ATLAS == 'emotes': items = [('emote-%d' % (i + 1), str(i), str(i + 1), 'emote') for i in range(24)]
font = ImageFont.truetype(str(root / 'assets/fonts/Mali-Bold.ttf'), 34)
colors = {'loot': (198, 161, 100), 'potion': (205, 80, 70), 'ui': (244, 207, 122), 'reserved': (120, 130, 120), 'gear': (150, 170, 190), 'card': (200, 120, 200), 'emblem': (0, 0, 0), 'emote': (0, 0, 0), 'lure': (230, 220, 180), 'petfood': (200, 150, 90), 'egg': (235, 225, 200), 'scroll': (200, 120, 60)}
atlas = Image.new('RGBA', (1536, 1024), (0, 0, 0, 0))
for item_id, icon, name, kind in items:
    i = int(icon); x, y = i % 6 * 256, i // 6 * 256
    cell = Image.new('RGBA', (256, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(cell)
    c = colors[kind]
    if item_id.startswith('mp') : c = (70, 130, 210)
    if item_id == 'sticky-rice': c = (110, 160, 80)
    if kind == 'emote':
        d.ellipse((40, 40, 216, 180), fill=(255, 250, 235, 255), outline=(60, 40, 15, 255), width=6); d.polygon([(90, 170), (120, 172), (80, 215)], fill=(255, 250, 235, 255), outline=(60, 40, 15, 255))
        w = d.textlength(name, font=font); d.text(((256 - w) / 2, 90), name, font=font, fill=(80, 50, 20, 255))
        atlas.alpha_composite(cell, (x, y)); continue
    if kind == 'emblem':
        import colorsys
        c = tuple(int(v * 255) for v in colorsys.hsv_to_rgb(int(icon) / 24, .55, .85))
        d.polygon([(48, 40), (208, 40), (208, 130), (128, 215), (48, 130)], fill=c + (255,), outline=(60, 40, 15, 255))
        d.line([(48, 40), (208, 40), (208, 130), (128, 215), (48, 130), (48, 40)], fill=(230, 190, 90, 255), width=8)
        label = name; w = d.textlength(label, font=font); d.text(((256 - w) / 2, 90), label, font=font, fill=(255, 245, 220, 255), stroke_width=4, stroke_fill=(20, 30, 25, 255))
        atlas.alpha_composite(cell, (x, y)); continue
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
out = root / OUT; out.parent.mkdir(parents=True, exist_ok=True); atlas.save(out)
print('placeholder atlas:', len(items), 'items')
