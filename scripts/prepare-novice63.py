"""Read alpha bounds; write metadata only. The generated PNG is not modified."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
path=root/'assets/directional/novice-63.png'
im=Image.open(path).convert('RGBA');w,h=im.size
manifest={'version':1,'classId':'novice','stage':'painted-directional-rig','cell':192,'anchor':[96,180],
          'sources':{'atlas':{'path':'./assets/directional/novice-63.png','size':[w,h]}},'frames':{}}
directions=['S','SE','E','NE','N','NW','W','SW']
# Generated rows are not exact quarter-cells. Use measured transparent gutters,
# otherwise preceding-row sandals enter rear views and front-view feet are cut.
row_edges=[0,338,653,970,h]
for g,gender in enumerate(['male','female']):
    manifest['frames'][gender]={}
    for i,d in enumerate(directions):
        col=i%4;row=g*2+i//4
        x0,y0,x1,y1=round(col*w/4),row_edges[row],round((col+1)*w/4),row_edges[row+1]
        alpha=im.getchannel('A').crop((x0,y0,x1,y1));bounds=alpha.point(lambda v:255 if v>32 else 0).getbbox()
        if not bounds:raise ValueError(gender+'/'+d+' blank')
        l,t,r,b=bounds
        bottom=alpha.crop((l,max(t,b-18),r,b)).point(lambda v:255 if v>80 else 0).getbbox()
        footx=(bottom[0]+bottom[2])/2 if bottom else (r-l)/2
        manifest['frames'][gender][d]={'source':'atlas','rect':[x0+l,y0+t,r-l,b-t],'foot':[footx,b-t]}
(root/'assets/directional/novice-63.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'size':[w,h],'alpha':im.getchannel('A').getextrema(),'views':16,'file':'novice-63.json'}))
