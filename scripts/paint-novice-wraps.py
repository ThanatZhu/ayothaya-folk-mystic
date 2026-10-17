# The crafted novice weapon is a pair of red cloth hand wraps painted into the equipment41 art. The redrawn side-view
# walk (assets/animation37/novice-walk-*.png) has bare forearms, so this paints the wraps onto them for equipment41:
# skin-coloured pixels in the arm band (below the face/neck, above the shins) of connected arm blobs → dark red cloth
# keeping the original shading, with thin gold rings like the idle art. Outlines and everything else stay untouched.
# usage: python scripts/paint-novice-wraps.py <animation37 walk png> <equipment41 walk png>
import sys
from collections import deque
import numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = np.array(Image.open(src).convert('RGBA')).astype(float); r, g, b, a = (im[..., k] for k in range(4))
H, W = a.shape; ys = np.arange(H)[:, None].repeat(W, 1)
skin = (a > 200) & (r > 150) & (g > r * .52) & (g < r * .86) & (b < g * .78)
band = skin & (ys >= 148) & (ys < 226)              # face/neck end ~140, shins start ~230 in the 320 px frame
label = np.zeros((H, W), int); keep = np.zeros((H, W), bool); n = 0
for y0, x0 in zip(*np.nonzero(band)):               # drop specks (shirt shadows): arms are big blobs
    if label[y0, x0]: continue
    n += 1; q = deque([(y0, x0)]); label[y0, x0] = n; blob = []
    while q:
        y, x = q.popleft(); blob.append((y, x))
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < H and 0 <= nx < W and band[ny, nx] and not label[ny, nx]: label[ny, nx] = n; q.append((ny, nx))
    if len(blob) >= 60 and min(y for y, _ in blob) < 195:   # a blob that only starts below 195 is a lifted knee, not an arm
        for y, x in blob: keep[y, x] = True
# fist highlights are paler peach than the arm: take them when they touch a wrapped arm (2 px)
peach = (a > 200) & (r > 140) & (b < g * .9) & (g < r * .95) & (ys < 230)
for _ in range(2):
    grown = keep.copy(); grown[1:] |= keep[:-1]; grown[:-1] |= keep[1:]; grown[:, 1:] |= keep[:, :-1]; grown[:, :-1] |= keep[:, 1:]
    keep |= grown & peach
shade = np.clip((r + g + b) / 3 / 190, .4, 1.1)
ring = (ys % 9 == 0)
col = np.where(ring[..., None], np.array([206., 160., 70.]), np.array([128., 26., 38.])) * shade[..., None]
out = im.copy(); out[keep, :3] = np.clip(col[keep], 0, 255)
Image.fromarray(out.astype(np.uint8)).save(dst); print(dst, int(keep.sum()), 'px wrapped')
