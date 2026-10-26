"""Pack the generated Chao Chuk art into foot-aligned game cells; no repainting."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
out=root/'assets/npc175'
source=Image.open(out/'chao-chuk-source.png').convert('RGBA')
w,h=source.size
assert w%2==0 and h%2==0
cells=[];bounds=[];scale=None
for i in range(4):
    cell=source.crop(((i%2)*w//2,(i//2)*h//2,(i%2+1)*w//2,(i//2+1)*h//2))
    bbox=cell.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
    assert bbox
    crop=cell.crop(bbox)
    if i==0:scale=210/crop.height
    fit=210/crop.height if i<3 else scale
    size=(round(crop.width*fit),round(crop.height*fit))
    art=crop.resize(size,Image.Resampling.LANCZOS)
    # Feet, rather than a pointing hand, determine horizontal registration.
    mask=crop.getchannel('A').crop((0,max(0,crop.height-25),crop.width,crop.height)).point(lambda a:255 if a>=128 else 0)
    foot=mask.getbbox();anchor=((foot[0]+foot[2])/2 if foot else crop.width/2)*fit
    canvas=Image.new('RGBA',(320,320))
    canvas.alpha_composite(art,(round(160-anchor),276-art.height))
    cells.append(canvas);bounds.append(list(bbox))
atlas=Image.new('RGBA',(1280,320))
for i,c in enumerate(cells):atlas.alpha_composite(c,(i*320,0))
atlas.save(out/'chao-chuk.png',optimize=True)
cells[0].save(out/'chao-chuk-standing.png',optimize=True)
b=cells[0].getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
cells[0].crop((max(0,b[0]-12),max(0,b[1]-12),min(320,b[2]+12),min(320,b[3]+12))).save(out/'chao-chuk-portrait.webp',quality=94)
meta={'id':'chao-chuk175','source':'./assets/npc175/chao-chuk.png','frameSize':320,'foot':276,'bodyHeight':210,'worldScale':0.78,'facing':'right','frames':[{'rect':[i*320,0,320,320]} for i in range(4)],'clips':{'idle':{'frames':[0,1,0],'frameDurations':[4.6,0.12,0.28],'loop':True},'talk':{'frames':[2,0],'frameDurations':[1.2,0.8],'loop':True},'sit':{'frames':[3],'fps':1,'loop':True}},'sourceBounds':bounds}
(out/'chao-chuk.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(source.size,[(p.name,p.stat().st_size) for p in out.iterdir()])
