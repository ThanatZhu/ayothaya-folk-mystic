# Import the 0.56 walk hand-off (outputs/walk-handoff): 8-frame strips 2048×320, pivot (128,308), no per-frame trim.
# Side walk → frames 12–19 of each class; novice front/back → 20–27 / 28–35. One scale per strip so the walking
# body (crown-to-sole, median over the 8 frames) equals the class's calibrated idle standing height.
# Prints the world units per walk cycle (stride px × 8 frames → world) for character-motion.js walkCycle().
import json, shutil, statistics, sys
import numpy as np
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else '../../outputs/walk-handoff/'
STAND = {'novice': [234, 240], 'swordsman': [217, 222], 'lancer': [198, 211], 'hunter': [219, 226], 'boxer': [217, 226],
         'rogue': [216, 223], 'shaman': [221, 224], 'acolyte': [219, 226]}        # character-size.js animation37
STRIDE = {'acolyte': 16}                                                           # side stride px per frame (hand-off), else 20
def height(path):
    a = np.array(Image.open(path))[..., 3] > 128
    return statistics.median(308 - np.nonzero(a[:, i * 256:(i + 1) * 256].any(1))[0].min() for i in range(8))
cycles = {}
for cls in STAND:
    meta_path = f'assets/animation37/{cls}.json'; raw = open(meta_path, encoding='utf8').read(); m = json.loads(raw)
    strips = [(12, f'{cls}-walk-{{g}}.png')] if cls != 'novice' else [(20, 'novice-walk-front-{g}.png'), (28, 'novice-walk-back-{g}.png')]
    for gi, g in enumerate(['male', 'female']):
        frames = m['frames'][g][:20]
        for base, pattern in strips:
            name = pattern.format(g=g); shutil.copy(SRC + name, 'assets/animation37/' + name)
            h = height(SRC + name); s = round(STAND[cls][gi] * frames[0]['scale'] / h, 6)
            while len(frames) < base: frames.append(frames[12 + len(frames) % 8])   # (novice only) keep indexes dense
            new = [{'rect': [i * 256, 0, 256, 308], 'anchor': 128.0, 'scale': s, 'source': name} for i in range(8)]
            frames[base:base + 8] = new
            if base == 12 or cls == 'novice': cycles.setdefault(cls, round(8 * STRIDE.get(cls, 20) * 1.7227 / h, 3))
            print(f'{cls:9} {g:6} {name:30} body {h:5.1f}px scale {s}')
        m['frames'][g] = frames
    open(meta_path, 'w', encoding='utf8').write(json.dumps(m, indent=2) + ('\n' if raw.endswith('\n') else ''))
cycles['novice'] = 1.23   # side strip measured in 0.55 (stance foot), front/back use the same cadence
print('walkCycle', json.dumps(cycles))
