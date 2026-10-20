"""Pack authored sit-down in-betweens; preserve one scale across each actor."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[1]
WORKSPACE = REPO.parent.parent if REPO.parent.name == "work" else REPO.parent
SIZE, FOOT = 320, 276


def pack(args):
    (args.output/"transitions").mkdir(parents=True, exist_ok=True)
    actors, all_measurements = {}, []
    for metadata_file in sorted(args.source.glob("*-measurements.json")):
        if metadata_file.name == "normalized-transition-measurements.json":
            continue
        metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
        class_id = metadata["classId"]
        raw = Image.open(args.source/metadata["file"]).convert("RGBA")
        if raw.size != (1536,1024) or raw.getchannel("A").getpixel((0,0)) != 0:
            raise ValueError(f"Invalid dimensions or transparency: {metadata_file}")
        columns, dividers = metadata["columns"], metadata["rowDividers"]
        review_rows = []
        for row,calibration in enumerate(metadata["rows"]):
            gender = calibration["gender"]
            actor_id = f"{class_id}-{gender}"
            scale = calibration["scale"]
            frames, records = [], []
            for col in range(4):
                region = (columns[col],0 if row==0 else dividers[col],
                          columns[col+1],dividers[col] if row==0 else 1024)
                cell = raw.crop(region)
                alpha = cell.getchannel("A")
                box = alpha.point(lambda a:255 if a>=128 else 0).getbbox()
                if box is None:
                    raise ValueError(f"Missing sprite {actor_id}/{col}")
                painted = cell.crop(box)
                painted.putalpha(painted.getchannel("A").point(lambda a:0 if a<115 else a))
                x,y,w,h = region[0]+box[0],region[1]+box[1],box[2]-box[0],box[3]-box[1]
                width,height = round(w*scale),round(h*scale)
                dx = round(SIZE/2-(calibration["anchors"][col]-x)*scale)
                dy = FOOT-height
                if dx<0 or dx+width>SIZE or dy<0:
                    raise ValueError(f"Clipped frame {actor_id}/{col}")
                frame = Image.new("RGBA",(SIZE,SIZE))
                frame.alpha_composite(painted.resize((width,height),Image.Resampling.LANCZOS),(dx,dy))
                frames.append(frame)
                records.append({"rect":[x,y,w,h],"anchorX":calibration["anchors"][col],
                                "scale":scale,"normalizedHeight":height,"normalizedBounds":[dx,dy,dx+width,FOOT]})
            atlas = Image.new("RGBA",(SIZE*4,SIZE))
            for i,frame in enumerate(frames):
                atlas.alpha_composite(frame,(i*SIZE,0))
            atlas.save(args.output/"transitions"/f"{actor_id}.png",optimize=True)
            actors[actor_id] = {
                "source":f"transitions/{actor_id}.png","review":"draft","facing":"right",
                "frames":[{"rect":[i*SIZE,0,SIZE,SIZE],
                           "paintedBounds":records[i]["normalizedBounds"],
                           "sourceBounds":records[i]["rect"]} for i in range(4)],
                "sitDownOrder":[0,1,2,3],"standUpOrder":[3,2,1,0],
                "frameDurations":[.14,.18,.2,.2],"loop":False,
                "calibration":{"scale":scale,"foot":FOOT,"frameSize":SIZE,
                               "standingBodyHeight":210,"source":metadata["file"]},
                "notes":metadata["notes"],
            }
            all_measurements.append({"id":actor_id,"frames":records,"calibration":calibration})
            original = Image.open(args.standing/f"{actor_id}-basic.png").convert("RGBA")
            seated = Image.open(REPO/"assets/character-life100/player"/f"{actor_id}.png").convert("RGBA").crop((640,0,960,320))
            review_rows.append((actor_id,[original,*frames,seated]))
        contact = Image.new("RGB",(960,450),"#edf0e4")
        draw = ImageDraw.Draw(contact)
        font = ImageFont.load_default(size=12)
        for col,label in enumerate(("Original stand","Bend","Low squat","Knee down","Settling","Existing seated")):
            draw.text((col*160+10,12),label,fill="#35472c",font=font)
        for row,(actor_id,frames) in enumerate(review_rows):
            top = 40+row*200
            draw.text((10,top),actor_id,fill="#35472c",font=font)
            for col,frame in enumerate(frames):
                draw.line((col*160+10,top+163,col*160+150,top+163),fill="#bdc8ae")
                thumb=frame.resize((160,160),Image.Resampling.LANCZOS)
                contact.paste(thumb,(col*160,top+25),thumb)
        contact.save(args.source/f"{class_id}-transition-review.png")
        prompt_file=args.source/f"{class_id}-prompt.json"
        if prompt_file.exists():
            prompt=json.loads(prompt_file.read_text(encoding="utf-8-sig"))
            prompt.update(status="generated-review",output=str(args.source/metadata["file"]),source=metadata["source"])
            prompt_file.write_text(json.dumps(prompt,ensure_ascii=False,indent=2),encoding="utf-8")
    (args.output/"players-transitions.json").write_text(json.dumps({"actors":actors},ensure_ascii=False,indent=2),encoding="utf-8")
    (args.source/"normalized-transition-measurements.json").write_text(json.dumps(all_measurements,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"actors":len(actors),"output":str(args.output/"players-transitions.json")}))


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source",type=Path,default=WORKSPACE/"outputs/animation-life101/players/transitions")
    parser.add_argument("--standing",type=Path,default=WORKSPACE/"outputs/character-size-audit/normalized-standing")
    parser.add_argument("--output",type=Path,default=REPO/"assets/character-life101")
    pack(parser.parse_args())
