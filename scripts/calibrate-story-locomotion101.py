"""Apply reviewed crown-to-sole scale to whole sprites in g04/g05."""
import importlib.util,json
from pathlib import Path
import numpy as np
from PIL import Image

repo=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("locomotion",repo/"scripts/import-locomotion101.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
audit=[]
for group in ("g04","g05"):
    for file in sorted(mod.RAW.glob(group+"-*.json")):
        item=json.loads(file.read_text(encoding="utf-8-sig"))
        if not isinstance(item,dict) or item.get("action") not in ("walk","run"):continue
        image=mod.clean(Image.open(file.with_suffix(".png")))
        for id in item["actors"]:
            x,y,w,h=item["cells"][id]
            cell=image.crop((x,y,x+w,y+h));head=mod.head_measure(cell)
            left,top,right,bottom=cell.getbbox()
            crown=top
            if id=="people-3":
                # The bamboo luggage rises above his crown. Measure the red cap,
                # not the luggage: the reviewed cap spans the upper central head.
                arr=np.array(cell).astype(float)
                red=(arr[:,:,0]>60)&(arr[:,:,0]>arr[:,:,1]*1.6)&(arr[:,:,2]>arr[:,:,1]*1.1)&(arr[:,:,3]>=115)
                red[:,:int(left+(right-left)*.28)]=False
                red[:,int(left+(right-left)*.73):]=False
                ys=np.where(red)[0]
                if not len(ys):raise ValueError("merchant cap not found")
                crown=int(ys.min())
            target=210 if item["phase"]%2==0 else (206 if item["action"]=="walk" else 204)
            scale=target/(bottom-crown)
            item.setdefault("calibration",{})[id]={
                "scale":scale,
                "crownY":crown,
                "targetCrownToSole":target,
                "method":"reviewed crown-to-sole; uniform whole-sprite resize; excludes merchant luggage above cap"
            }
            audit.append({"actor":id,"action":item["action"],"phase":item["phase"],"rawCrown":crown,"rawSole":bottom,"target":target,"scale":scale})
        file.write_text(json.dumps(item,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    mod.build(group)
(mod.RAW/"g04-g05-calibration-audit.json").write_text(json.dumps(audit,indent=2),encoding="utf-8")
