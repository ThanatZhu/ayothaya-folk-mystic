"""Normalize whole painted locomotion poses; never deform or synthesize limbs."""
from pathlib import Path
import argparse
import json
import re
import numpy as np
from PIL import Image,ImageDraw,ImageFont

REPO=Path(__file__).resolve().parents[1]
ROOT=REPO.parent.parent if REPO.parent.name=="work" else REPO.parent
RAW=ROOT/"outputs/animation-life101/locomotion"
REFERENCES=ROOT/"outputs/character-size-audit/normalized-standing"
DEST=REPO/"assets/character-life101"
SIZE,FOOT=320,276

def clean(im):
    im=im.convert("RGBA")
    im.putalpha(im.getchannel("A").point(lambda a:a if a>=115 else 0))
    return im

def head_measure(im):
    """Longest continuous painted run in the head region, excluding loose props."""
    mask=np.array(im.getchannel("A"))>=115
    bounds=im.getchannel("A").getbbox()
    if not bounds:raise ValueError("empty sprite")
    runs=[]
    for y in range(bounds[1],bounds[3]):
        xs=np.flatnonzero(mask[y])
        if not len(xs):continue
        segments=np.split(xs,np.where(np.diff(xs)>1)[0]+1)
        segment=max(segments,key=len)
        runs.append((len(segment),int(segment[0]),int(segment[-1])+1,y))
    # A staff above the head is a thin segment; don't treat it as a crown.
    broad=max(r[0] for r in runs)
    first=next(i for i,r in enumerate(runs) if r[0]>=broad*.55)
    window=runs[first:first+max(10,round((bounds[3]-bounds[1])*.28))]
    width,x0,x1,y=max(window)
    return {"width":width,"center":(x0+x1)/2,"y":y,"bounds":list(bounds)}

def reference(id):
    name=id+"-basic.png" if any(id.startswith(c+"-") for c in ("novice","swordsman","lancer","hunter","boxer","rogue","shaman","acolyte")) else id+".png"
    return clean(Image.open(REFERENCES/name))

def build(group):
    files=sorted(RAW.glob(group+"-*.json"))
    records=[]
    for file in files:
        item=json.loads(file.read_text(encoding="utf-8-sig"))
        if not isinstance(item,dict):continue
        if item.get("action") not in ("walk","run") or "actors" not in item:continue
        png=file.with_suffix(".png")
        if not png.exists():continue
        im=clean(Image.open(png))
        cols,rows=item.get("grid",(4,1) if im.width/im.height>2 else (2,2))
        if cols*rows!=len(item["actors"]):raise ValueError(f"{file}: invalid grid")
        for index,id in enumerate(item["actors"]):
            box=(round(index%cols*im.width/cols),round(index//cols*im.height/rows),
                 round((index%cols+1)*im.width/cols),round((index//cols+1)*im.height/rows))
            if id in item.get("cells",{}):
                x,y,w,h=item["cells"][id]
                box=(x,y,x+w,y+h)
            cell=im.crop(box)
            head=head_measure(cell)
            refhead=head_measure(reference(id))
            override=item.get("calibration",{}).get(id,{})
            head.update(override.get("head",{}))
            scale=override.get("scale",refhead["width"]/head["width"])
            frame=Image.new("RGBA",(SIZE,SIZE))
            scaled=cell.resize((round(cell.width*scale),round(cell.height*scale)),Image.Resampling.LANCZOS)
            phase=item["phase"]
            lift=6 if item["action"]=="run" and phase in (0,2) else 0
            dx=round(SIZE/2-head["center"]*scale)
            dy=round(FOOT-lift-head["bounds"][3]*scale)
            frame.alpha_composite(scaled,(dx,dy))
            edges=np.array(frame.getchannel("A"))
            if any(np.any(edge>=115) for edge in [edges[0],edges[-1],edges[:,0],edges[:,-1]]):
                raise ValueError(f"{id}/{item['action']}/{phase}: cropped by frame; check calibration")
            records.append({"id":id,"action":item["action"],"phase":phase,"frame":frame,
                            "head":head,"referenceHead":refhead,"scale":scale,"offset":[dx,dy],
                            "rawFile":str(png),"rawCell":list(box),"review":item.get("review","pending")})
    actors={}
    contacts=[]
    for id in dict.fromkeys(r["id"] for r in records):
        own=[r for r in records if r["id"]==id]
        clips={}
        frames=[]
        for action,fps in (("walk",3.6),("run",5.5)):
            phases=sorted((r for r in own if r["action"]==action),key=lambda r:r["phase"])
            if [r["phase"] for r in phases]!=[0,1,2,3]:continue
            start=len(frames);frames.extend(phases)
            clips[action]={"frames":list(range(start,start+4)),"fps":fps,"loop":True,
                "note":"ภาพวาดใหม่ 4 จังหวะ · ขานำสลับข้าง แขนอิสระแกว่งสวนขา สัมภาระอยู่ด้านเดิม"}
        if not clips:continue
        atlas=Image.new("RGBA",(len(frames)*SIZE,SIZE))
        for i,r in enumerate(frames):atlas.alpha_composite(r["frame"],(i*SIZE,0))
        (DEST/"locomotion").mkdir(parents=True,exist_ok=True)
        atlas.save(DEST/"locomotion"/(id+".png"),optimize=True)
        actors[id]={"source":"locomotion/"+id+".png","review":"draft","facing":"right",
                    "frames":[{"rect":[i*SIZE,0,SIZE,SIZE]} for i in range(len(frames))],
                    "clips":clips,"gaitReview":{"phaseOrder":["near-contact","far-pass","far-contact","near-pass"],
                        "method":"individual whole-character painted phases; no mirrored phase substitution",
                        "status":"visual-preview"}}
        contacts.append((id,frames))
    (DEST/(group+"-locomotion.json")).write_text(json.dumps({"actors":actors},indent=2,ensure_ascii=False),encoding="utf-8")
    (RAW/(group+"-measurements.json")).write_text(json.dumps([{k:v for k,v in r.items() if k!="frame"} for r in records],indent=2),encoding="utf-8")
    if contacts:
        contact=Image.new("RGB",(SIZE*4,50+len(contacts)*SIZE*2),"#e8ecde")
        draw=ImageDraw.Draw(contact);font=ImageFont.load_default(size=16)
        for row,(id,frames) in enumerate(contacts):
            for action,subrow in (("walk",0),("run",1)):
                top=50+(row*2+subrow)*SIZE
                draw.text((8,top),id+" / "+action,fill="#244134",font=font)
                draw.line((0,top+FOOT,1280,top+FOOT),fill="#a8b598")
                for r in frames:
                    if r["action"]==action:contact.paste(r["frame"],(r["phase"]*SIZE,top),r["frame"])
        contact.save(RAW/(group+"-review.png"))
    print(json.dumps({"group":group,"actors":len(actors),"clips":{id:list(a["clips"]) for id,a in actors.items()}}))

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("group")
    build(parser.parse_args().group)
