"""Pack generated equipped pose artwork; only crop, uniformly scale and register cells."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT.parent.parent / 'outputs/life-crafted106'
OUTPUT = ROOT / 'assets/character-life106'
OUTPUT.mkdir(exist_ok=True)
base = json.loads((ROOT/'assets/character-life100/manifest.json').read_text(encoding='utf-8'))
result = {'version':1,'frameSize':320,'foot':276,'bodyHeight':210,'actors':{}}
measurements = {}
for actor_id in ['shaman-male','shaman-female','rogue-male','rogue-female']:
    raw = Image.open(INPUT/(actor_id+'-generated.png')).convert('RGBA')
    reference = Image.open(INPUT/(actor_id+'-reference.png')).convert('RGBA')
    assert raw.getpixel((0,0))[3] == 0
    cells = [raw.crop((round(i%4*raw.width/4),round(i//4*raw.height/5),round((i%4+1)*raw.width/4),round((i//4+1)*raw.height/5))) for i in range(17)]
    bounds = lambda im: im.getchannel('A').point(lambda a:255 if a>=115 else 0).getbbox()
    first = bounds(cells[0]); scale = 210/(first[3]-first[1])
    atlas = Image.new('RGBA',(1280,1600)); records = []
    for index,cell in enumerate(cells):
        box = bounds(cell)
        assert box is not None
        original = reference.crop((index%4*320,index//4*320,index%4*320+320,index//4*320+320))
        original_box = bounds(original)
        trimmed = cell.crop(box)
        trimmed = trimmed.resize((round(trimmed.width*scale),round(trimmed.height*scale)),Image.Resampling.LANCZOS)
        x = round((original_box[0]+original_box[2])/2-trimmed.width/2)
        y = original_box[3]-trimmed.height
        assert x>=0 and y>=0 and x+trimmed.width<=320 and y+trimmed.height<=320,(actor_id,index,x,y)
        atlas.alpha_composite(trimmed,(index%4*320+x,index//4*320+y))
        records.append({'sourceBounds':box,'placedBounds':[x,y,x+trimmed.width,y+trimmed.height]})
    atlas.save(OUTPUT/(actor_id+'.png'),optimize=True)
    clips = json.loads(json.dumps(base['actors'][actor_id]['clips']))
    # The female seated blink redraw moves the staff. Keep the coherent open-eye
    # seated frame and the renderer's breathing rather than switching weapon poses.
    if actor_id=='shaman-female': clips['sit']={'frames':[2],'fps':1,'loop':True}
    result['actors'][actor_id]={'source':'../character-life106/'+actor_id+'.png','facing':'right','review':'reviewed',
        'frames':[{'rect':[i%4*320,i//4*320,320,320]} for i in range(17)],'clips':clips,
        'equipment':actor_id.split('-')[0]+'-weapon-crafted'}
    measurements[actor_id]={'scale':scale,'frames':records,'unusedFrames':[3] if actor_id=='shaman-female' else []}
(OUTPUT/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(INPUT/'registration.json').write_text(json.dumps(measurements,indent=2),encoding='utf-8')
print('Packed four equipped actors with seven clips each')
