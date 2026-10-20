"""Pack authored NPC rest poses, preserving one body scale per identity.

This performs atlas preparation only: alpha-component extraction, uniform resize
and placement. It never synthesizes or bends body parts. Raw generation records
remain in outputs/animation-life-art/npcs outside the repository.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = Path(__file__).resolve().parents[1]
WORKSPACE = REPO.parent.parent if REPO.parent.name == 'work' else REPO.parent
RAW = WORKSPACE / 'outputs/animation-life-art/npcs'
REFERENCES = WORKSPACE / 'outputs/character-size-audit/normalized-standing'
DEST = REPO / 'assets/character-life100'
AUDIT = RAW / 'normalized-review'
FRAME, FOOT, BODY = 320, 276, 210

# Standing crown and sole exclude staff / luggage and include hair / headwear.
# The four anchors identify actor-body centers, excluding off-center props.
# Every generated pose in a row uses the SAME standing reference scale.
ROWS = [
    ('people-0', 1, 0, 62, 498, [232, 601, 940, 1300]),
    ('people-1', 1, 1, 20, 446, [226, 623, 960, 1310]),
    ('people-2', 2, 0, 89, 515, [181, 599, 965, 1345]),
    ('people-3', 2, 1, 64, 452, [139, 542, 909, 1350]),
    ('masters-arms-0', 3, 0, 47, 502, [182, 565, 948, 1340]),
    ('masters-arms-1', 3, 1, 22, 470, [213, 587, 971, 1340]),
    ('masters-arms-2', 4, 0, 37, 481, [190, 561, 944, 1340]),
    ('masters-arms-3', 4, 1, 11, 469, [187, 571, 955, 1330]),
    ('masters-mystic-0', 5, 0, 47, 484, [214, 583, 937, 1320]),
    ('masters-mystic-1', 5, 1, 7, 451, [240, 610, 962, 1310]),
    ('masters-mystic-2', 6, 0, 61, 510, [164, 515, 847, 1275]),
    ('masters-mystic-3', 6, 1, 24, 465, [161, 515, 847, 1275]),
    ('citizens-market-0', 7, 0, 96, 522, [181, 600, 960, 1350]),
    ('citizens-market-1', 7, 1, 54, 452, [174, 574, 924, 1325]),
    ('citizens-market-2', 8, 0, 61, 504, [185, 550, 868, 1340]),
    ('citizens-market-3', 8, 1, 21, 447, [187, 550, 868, 1320]),
    ('citizens-river-0', 9, 0, 82, 500, [213, 561, 929, 1340]),
    ('citizens-river-1', 9, 1, 46, 455, [215, 605, 975, 1350]),
    ('citizens-river-2', 10, 0, 65, 523, [173, 582, 922, 1330]),
    ('citizens-river-3', 10, 1, 33, 482, [179, 606, 932, 1333]),
]


def runs(values):
    padded = np.r_[False, values, False].astype(np.int8)
    return list(zip(np.flatnonzero(np.diff(padded) == 1),
                    np.flatnonzero(np.diff(padded) == -1)))


def alpha_components(mask):
    """8-connected components from horizontal runs; no optional scipy needed."""
    parents = []
    all_runs = []
    previous = []

    def find(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i

    for y, line in enumerate(mask):
        current = []
        left = 0
        for x0, x1 in runs(line):
            while left < len(previous) and previous[left][1] < x0:
                left += 1
            contacts = []
            for a, b, label in previous[left:]:
                if a > x1:
                    break
                if b >= x0:
                    contacts.append(find(label))
            if contacts:
                label = contacts[0]
                for other in contacts[1:]:
                    parents[find(other)] = find(label)
            else:
                label = len(parents)
                parents.append(label)
            current.append((int(x0), int(x1), label))
            all_runs.append((y, int(x0), int(x1), label))
        previous = current
    components = {}
    for y, x0, x1, label in all_runs:
        root = find(label)
        c = components.setdefault(root, {'runs': [], 'area': 0,
                                         'bbox': [99999, 99999, -1, -1]})
        c['runs'].append((y, x0, x1))
        c['area'] += x1-x0
        box = c['bbox']
        box[:] = [min(box[0], x0), min(box[1], y),
                  max(box[2], x1), max(box[3], y+1)]
    return list(components.values())


def gap_distance(a, b):
    dx = max(0, a[0]-b[2], b[0]-a[2])
    dy = max(0, a[1]-b[3], b[1]-a[3])
    return dx*dx + dy*dy


def extract_rows(image):
    alpha = np.asarray(image.getchannel('A'))
    mask = alpha >= 115
    row_gaps = [(a, b) for a, b in runs(~mask.any(axis=1))
                if a >= 450 and b <= 620]
    if not row_gaps:
        raise ValueError('No safe transparent separator between actor rows')
    row_gap = min(row_gaps, key=lambda g: abs(sum(g)/2-530))
    separator = int(sum(row_gap)/2)
    result = []
    for row, (top, bottom) in enumerate([(0, separator), (separator, 1024)]):
        components = alpha_components(mask[top:bottom])
        main = sorted(components, key=lambda c: c['area'], reverse=True)[:4]
        if len(main) != 4 or min(c['area'] for c in main) < 5000:
            raise ValueError('Expected four intact actor silhouettes')
        main.sort(key=lambda c: (c['bbox'][0]+c['bbox'][2])/2)
        groups = [[] for _ in main]
        for component in components:
            if component['area'] < 12:
                continue  # detached tiny alpha specks, not connected artwork
            if any(component is c for c in main):
                nearest = next(i for i, c in enumerate(main) if component is c)
            else:
                nearest = min(range(4), key=lambda i: (
                    gap_distance(component['bbox'], main[i]['bbox']),
                    abs(sum(component['bbox'][::2])-sum(main[i]['bbox'][::2]))))
            if gap_distance(component['bbox'], main[nearest]['bbox']) <= 80**2:
                groups[nearest].append(component)
        for col, group in enumerate(groups):
            own = np.zeros((bottom-top, image.width), dtype=np.uint8)
            for component in group:
                for y, x0, x1 in component['runs']:
                    own[y, x0:x1] = 255
            # Keep existing anti-aliased pixels around the detected silhouette.
            gate = np.asarray(Image.fromarray(own).filter(ImageFilter.MaxFilter(5))) > 0
            pixels = np.asarray(image.crop((0, top, image.width, bottom))).copy()
            pixels[:, :, 3] *= gate
            pose = Image.fromarray(pixels)
            box = pose.getchannel('A').getbbox()
            if box is None:
                raise ValueError('Empty pose')
            result.append({'row': row, 'col': col, 'image': pose.crop(box),
                           'box': [box[0], box[1]+top, box[2], box[3]+top],
                           'components': len(group)})
    return result, separator


def normalize(pose, scale, anchor):
    box = pose['box']
    width = round(pose['image'].width*scale)
    height = round(pose['image'].height*scale)
    painted = pose['image'].resize((width, height), Image.Resampling.LANCZOS)
    x = round(FRAME/2 - (anchor-box[0])*scale)
    y = FOOT-height
    if x < 0 or y < 0 or x+width > FRAME or y+height > FRAME:
        raise ValueError(f'Pose would be clipped: {x,y,width,height}')
    out = Image.new('RGBA', (FRAME, FRAME))
    out.alpha_composite(painted, (x, y))
    return out


def main():
    (DEST/'npc').mkdir(parents=True, exist_ok=True)
    AUDIT.mkdir(parents=True, exist_ok=True)
    extracted = {}
    for number in range(1, 11):
        suffix = '-v2' if number == 7 else ''
        source = RAW/f'npc-rest-{number:02d}{suffix}.png'
        image = Image.open(source).convert('RGBA')
        if image.size != (1536, 1024):
            raise ValueError(f'Unexpected source size {source}')
        extracted[number] = extract_rows(image)

    actors, measurements = {}, []
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
    contact = Image.new('RGBA', (FRAME*5, (FRAME+28)*len(ROWS)), (224, 218, 201, 255))
    draw = ImageDraw.Draw(contact)
    for index, (actor_id, number, row, crown, sole, anchors) in enumerate(ROWS):
        scale = BODY/(sole-crown)
        original = Image.open(REFERENCES/f'{actor_id}.png').convert('RGBA')
        if original.size != (FRAME, FRAME):
            raise ValueError('Standing reference must be copied unchanged at320px')
        poses = [p for p in extracted[number][0] if p['row'] == row]
        frames = [original] + [normalize(p, scale, anchor)
                               for p, anchor in zip(poses, anchors)]
        atlas = Image.new('RGBA', (FRAME*5, FRAME))
        for frame_index, frame in enumerate(frames):
            atlas.paste(frame, (FRAME*frame_index, 0))
            contact.alpha_composite(frame, (FRAME*frame_index, (FRAME+28)*index+28))
            draw.text((FRAME*frame_index+8, (FRAME+28)*index+6),
                      f'{actor_id}: {["original","blink","sit open","sit closed","sleep"][frame_index]}',
                      font=font, fill=(40,30,20))
            draw.line((FRAME*frame_index, (FRAME+28)*index+28+FOOT,
                       FRAME*(frame_index+1)-1, (FRAME+28)*index+28+FOOT),
                      fill=(112,144,139,255), width=1)
        atlas.save(DEST/'npc'/f'{actor_id}.png')
        actors[actor_id] = {
            'source': f'npc/{actor_id}.png',
            'frames': [{'rect': [i*FRAME, 0, FRAME, FRAME]} for i in range(5)],
            'clips': {
                'idle': {'frames': [0,1,0], 'frameDurations': [4.6,.14,.36],
                         'fps': 1, 'loop': True},
                'sit': {'frames': [2,3,2], 'frameDurations': [4.6,.16,.34],
                        'fps': 1, 'loop': True},
                'sleep': {'frames': [4], 'fps': 1, 'loop': True},
            },
            'review': 'draft',
        }
        measurements.append({
            'id': actor_id, 'raw': f'npc-rest-{number:02d}'+('-v2' if number==7 else '')+'.png',
            'row': row, 'standingBody': {'crown': crown, 'sole': sole},
            'uniformScale': scale, 'rowSeparator': extracted[number][1],
            'sourcePoses': [{k: v for k, v in p.items() if k != 'image'} for p in poses],
            'sourceBodyAnchors': anchors,
            'normalizedBounds': [list(f.getchannel('A').point(lambda x:255 if x>=115 else 0).getbbox())
                                 for f in frames],
        })
    (DEST/'npcs.json').write_text(json.dumps({'actors': actors}, indent=2), encoding='utf-8')
    (AUDIT/'measurements.json').write_text(json.dumps(measurements, indent=2), encoding='utf-8')
    # Separate four-row panels are easier to inspect than a single huge contact.
    for group in range(5):
        contact.crop((0, group*4*(FRAME+28), FRAME*5, (group+1)*4*(FRAME+28))).convert('RGB').save(
            AUDIT/f'npc-poses-{group+1}.png')
    contact.convert('RGB').save(AUDIT/'all-npc-poses.png')
    print(json.dumps({'actors': len(actors), 'frames': len(actors)*5,
                      'metadata': str(DEST/'npcs.json'), 'review': str(AUDIT)}))


if __name__ == '__main__':
    main()
