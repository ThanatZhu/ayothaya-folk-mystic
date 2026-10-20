"""Pack painted NPC sit-down intermediates without pose-dependent resizing."""
import importlib.util
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('npc_rest', REPO/'scripts/import-life-npc.py')
rest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rest)
RAW = rest.WORKSPACE/'outputs/animation-life101/npcs/transitions'
DEST = REPO/'assets/character-life101'
REVIEW = RAW/'normalized-review'
ANCHORS = [
    [230,610,991,1370], [220,600,978,1365],
    [181,595,984,1365], [150,550,910,1310],
    [200,570,963,1342], [222,590,974,1345],
    [205,570,965,1340], [190,567,951,1345],
    [210,583,957,1354], [235,625,985,1375],
    [225,580,940,1315], [225,580,940,1315],
    [195,595,965,1365], [200,590,960,1365],
    [200,556,900,1345], [170,565,950,1345],
    [210,585,965,1360], [220,605,985,1365],
    [190,590,970,1370], [210,595,980,1370],
]
# Heads were compared to the high-resolution existing rest atlases (the third
# generation reference). Small head-size corrections were checked against the
# standing and seated endpoint contact sheets. Each factor applies uniformly
# to all FOUR poses, never to individual crouched-body bounding heights.
HEAD_SCALE = {
    'people-0': .97, 'people-1': .95, 'people-2': .97, 'people-3': .97,
    'citizens-market-0': .96, 'citizens-market-2': .97,
    'citizens-river-1': .96, 'citizens-river-2': .97,
}


def extract(image):
    mask = np.asarray(image.getchannel('A')) >= 115
    components = rest.alpha_components(mask)
    main = sorted(components, key=lambda c: c['area'], reverse=True)[:8]
    if len(main) != 8 or min(c['area'] for c in main) < 5000:
        raise ValueError('Expected eight separate full-body drawings')
    main.sort(key=lambda c: c['bbox'][1]+c['bbox'][3])
    main = (sorted(main[:4], key=lambda c: c['bbox'][0]+c['bbox'][2])
            + sorted(main[4:], key=lambda c: c['bbox'][0]+c['bbox'][2]))
    groups = [[] for _ in main]
    for component in components:
        if component['area'] < 12:
            continue
        if any(component is c for c in main):
            nearest = next(i for i, c in enumerate(main) if component is c)
        else:
            nearest = min(range(8), key=lambda i: (
                rest.gap_distance(component['bbox'], main[i]['bbox']),
                abs(sum(component['bbox'][::2])-sum(main[i]['bbox'][::2]))
                + abs(sum(component['bbox'][1::2])-sum(main[i]['bbox'][1::2]))))
        if rest.gap_distance(component['bbox'], main[nearest]['bbox']) <= 80**2:
            groups[nearest].append(component)
    result = []
    pixels = np.asarray(image)
    for i, group in enumerate(groups):
        own = np.zeros(mask.shape, dtype=np.uint8)
        for component in group:
            for y, x0, x1 in component['runs']:
                own[y,x0:x1] = 255
        gate = np.asarray(Image.fromarray(own).filter(ImageFilter.MaxFilter(5))) > 0
        rgba = pixels.copy()
        rgba[:,:,3] *= gate
        pose = Image.fromarray(rgba)
        box = pose.getchannel('A').getbbox()
        if box is None:
            raise ValueError('Empty transition')
        result.append({'row': i//4, 'col': i%4, 'box': list(box),
                       'image': pose.crop(box), 'components': len(group)})
    return result


def main():
    (DEST/'transitions').mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    parsed = {}
    alpha_checks = []
    for number in range(1,11):
        name = f'npc-transition-{number:02d}'+('-v3' if number==1 else '')+'.png'
        image = Image.open(RAW/name).convert('RGBA')
        if image.size != (1536,1024):
            raise ValueError(f'Wrong canvas: {name}')
        parsed[number] = extract(image)
        alpha_checks.append({'source': name, 'size': list(image.size),
                             'alphaRange': image.getchannel('A').getextrema(),
                             'separateActors': len(parsed[number])})
    contact = Image.new('RGBA', (1920,348*20), (224,218,201,255))
    draw = ImageDraw.Draw(contact)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
    actors, measurements = {}, []
    for index, (actor_id,number,row,crown,sole,_) in enumerate(rest.ROWS):
        scale = 210/(sole-crown)*HEAD_SCALE.get(actor_id,1)
        poses = parsed[number][row*4:(row+1)*4]
        frames = [rest.normalize(p,scale,a) for p,a in zip(poses,ANCHORS[index])]
        atlas = Image.new('RGBA',(1280,320))
        for col,frame in enumerate(frames):
            atlas.paste(frame,(320*col,0))
            a = np.asarray(frame.getchannel('A'))
            if any((edge>=115).any() for edge in [a[0],a[-1],a[:,0],a[:,-1]]):
                raise ValueError(f'Clipped frame: {actor_id}:{col}')
        atlas.save(DEST/'transitions'/f'{actor_id}.png')
        entry = {
            'source': f'transitions/{actor_id}.png',
            'frames': [{'rect':[320*i,0,320,320]} for i in range(4)],
            'sitDownOrder': [0,1,2,3], 'standUpOrder': [3,2,1,0],
            'frameDurations': [.14,.18,.2,.2], 'review':'draft',
        }
        if actor_id == 'citizens-market-0':
            entry['reviewNotes'] = 'Kneeling/settling intermediate drawings are similar because skirt hides the knees.'
        if actor_id == 'masters-arms-3':
            entry['reviewNotes'] = 'Kneeling head is slightly higher than squat; inspect playback before accepting.'
        actors[actor_id] = entry
        original = Image.open(rest.REFERENCES/f'{actor_id}.png').convert('RGBA')
        rest_atlas = Image.open(REPO/'assets/character-life100/npc'/f'{actor_id}.png').convert('RGBA')
        target = rest_atlas.crop((640,0,960,320))
        for col,frame in enumerate([original,*frames,target]):
            contact.alpha_composite(frame,(320*col,348*index+28))
            draw.text((320*col+8,348*index+6),
                      actor_id+' '+['standing','bend','squat','kneel','settle','seated'][col],
                      font=font,fill=(40,30,20))
            draw.line((320*col,348*index+304,320*(col+1)-1,348*index+304),
                      fill=(112,144,139,255))
        measurements.append({
            'id':actor_id, 'source':f'npc-transition-{number:02d}'+('-v3' if number==1 else '')+'.png',
            'uniformScale':scale, 'referenceStandingCrown':crown,
            'referenceStandingSole':sole, 'headRatioCorrection':HEAD_SCALE.get(actor_id,1),
            'sourceBodyAnchors':ANCHORS[index],
            'sourcePoses':[{k:v for k,v in p.items() if k!='image'} for p in poses],
            'normalizedBounds':[list(f.getchannel('A').point(lambda x:255 if x>=115 else 0).getbbox())
                                for f in frames],
            'noFrameEdgeClipping':True,
        })
    (DEST/'npcs-transitions.json').write_text(json.dumps({'actors':actors},indent=2),encoding='utf-8')
    (REVIEW/'measurements.json').write_text(json.dumps(measurements,indent=2),encoding='utf-8')
    (REVIEW/'alpha-verification.json').write_text(json.dumps(alpha_checks,indent=2),encoding='utf-8')
    for i in range(5):
        contact.crop((0,348*4*i,1920,348*4*(i+1))).convert('RGB').save(
            REVIEW/f'npc-transitions-{i+1}.png')
    contact.convert('RGB').save(REVIEW/'all-npc-transitions.png')
    print(json.dumps({'actors':len(actors),'frames':80,'noFrameEdgeClipping':True,
                      'metadata':str(DEST/'npcs-transitions.json'),'review':str(REVIEW)}))


if __name__ == '__main__':
    main()
