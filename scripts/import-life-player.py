"""Pack the reviewed player rest sprites without changing their painted anatomy.

All generated poses in a gender row share the scale measured from its standing
body. Sitting and sleeping are never stretched to the standing height.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[1]
WORKSPACE = REPO.parent.parent if REPO.parent.name == "work" else REPO.parent
SIZE, FOOT, BODY = 320, 276, 210
CLASSES = ("novice", "swordsman", "lancer", "hunter", "boxer", "rogue", "shaman", "acolyte")


def pack(args):
    output = args.output
    (output/"player").mkdir(parents=True, exist_ok=True)
    actors, measurements, contacts = {}, [], []
    for class_id in CLASSES:
        meta = json.loads((args.source/f"{class_id}-measurements.json").read_text(encoding="utf-8"))
        raw = Image.open(meta["file"]).convert("RGBA")
        if raw.size != (1536, 1024):
            raise ValueError(f"{class_id}: unexpected source dimensions {raw.size}")
        if raw.getchannel("A").getpixel((0,0)) != 0:
            raise ValueError(f"{class_id}: source is not transparent")
        for sex_index, gender in enumerate(("male", "female")):
            actor_id = f"{class_id}-{gender}"
            body = meta["standingBody"][sex_index]
            scale = BODY/(body["soleY"]-body["crownY"])
            original = Image.open(args.standing/f"{actor_id}-basic.png").convert("RGBA")
            if original.size != (SIZE,SIZE):
                raise ValueError(f"{actor_id}: original is not a normalized frame")
            frames = [original]
            pose_records = [p for p in meta["poses"] if p["gender"] == gender]
            for pose in pose_records:
                x,y,w,h = pose["rect"]
                painted = raw.crop((x,y,x+w,y+h))
                # Generated alpha outside the painted silhouette is below the
                # game's alpha test. Remove only that invisible background haze.
                alpha = painted.getchannel("A").point(lambda a: 0 if a < 115 else a)
                painted.putalpha(alpha)
                width,height = round(w*scale),round(h*scale)
                frame = Image.new("RGBA",(SIZE,SIZE))
                scaled = painted.resize((width,height),Image.Resampling.LANCZOS)
                dx = round(SIZE/2-(pose["anchorX"]-x)*scale)
                dy = FOOT-height
                if dx < 0 or dx+width > SIZE or dy < 0 or dy+height > SIZE:
                    raise ValueError(f"{actor_id}/{pose['action']}: clipped frame {(dx,dy,width,height)}")
                frame.alpha_composite(scaled,(dx,dy))
                frames.append(frame)
            atlas = Image.new("RGBA",(SIZE*5,SIZE))
            for index,frame in enumerate(frames):
                atlas.alpha_composite(frame,(index*SIZE,0))
            atlas.save(output/"player"/f"{actor_id}.png",optimize=True)
            actors[actor_id] = {
                "source": f"player/{actor_id}.png", "facing": "right", "review": "draft",
                "frames": [{"rect":[i*SIZE,0,SIZE,SIZE]} for i in range(5)],
                "clips": {
                    "idle": {"frames":[0,1,0], "frameDurations":[4.6,.14,.36], "loop":True,
                             "note":"ท่ายืนเดิมสลับกะพริบตาเบา ๆ · ใช้สเกลส่วนสูงเดิม"},
                    "sit": {"frames":[2,3,2], "frameDurations":[4.6,.16,.34], "loop":True,
                            "note":"ภาพนั่งที่วาดใหม่ · คงขนาดศีรษะและสัดส่วนจากท่ายืน"},
                    "sleep": {"frames":[4], "fps":1, "loop":True,
                              "note":"ภาพท่านอน 1 เฟรม พร้อมจังหวะหายใจเบา ๆ แบบเดียวกับในเกม"},
                },
                "calibration": {"standingBodyHeight":BODY,"sourceBodyHeight":body["height"],
                                "scale":scale,"foot":FOOT,"frameSize":SIZE},
                "sourceSheet": Path(meta["file"]).name,
            }
            measurements.append({"id":actor_id,"scale":scale,"standingBody":body,
                                 "bounds":[list(f.getchannel("A").getbbox()) for f in frames],
                                 "sourceSheet":str(meta["file"]),"notes":meta["notes"]})
            contacts.append((actor_id,frames))
    (output/"players.json").write_text(json.dumps({"actors":actors},ensure_ascii=False,indent=2),encoding="utf-8")
    (args.source/"normalized-player-measurements.json").write_text(json.dumps(measurements,ensure_ascii=False,indent=2),encoding="utf-8")
    contact = Image.new("RGB",(800,45+len(contacts)*190),"#edf0e4")
    draw = ImageDraw.Draw(contact)
    font = ImageFont.load_default(size=12)
    for i,title in enumerate(("Original","Blink","Sit / open","Sit / closed","Sleep")):
        draw.text((i*160+12,13),title,fill="#31472d",font=font)
    for row,(actor_id,frames) in enumerate(contacts):
        top = 45+row*190
        draw.rectangle((0,top,799,top+189),outline="#cbd5c0")
        draw.text((12,top+5),actor_id,fill="#31472d",font=font)
        for col,frame in enumerate(frames):
            draw.line((col*160+10,top+25+138,col*160+150,top+25+138),fill="#bdc8ae")
            contact.paste(frame.resize((160,160),Image.Resampling.LANCZOS),(col*160,top+25),
                          frame.resize((160,160),Image.Resampling.LANCZOS))
    contact.save(args.source/"normalized-player-rest-contact.png")
    print(json.dumps({"actors":len(actors),"atlasCount":len(contacts),"framesPerActor":5,
                      "output":str(output/"players.json"),"contact":str(args.source/"normalized-player-rest-contact.png")}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source",type=Path,default=WORKSPACE/"outputs/animation-life-art/players")
    parser.add_argument("--standing",type=Path,default=WORKSPACE/"outputs/character-size-audit/normalized-standing")
    parser.add_argument("--output",type=Path,default=REPO/"assets/character-life100")
    pack(parser.parse_args())
