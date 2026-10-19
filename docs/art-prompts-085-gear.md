# ไอคอนอุปกรณ์ช่องใหม่ (หมวก · ผ้าคลุม · รองเท้า) · 0.85

ตอนนี้เกมใช้ไอคอนชั่วคราวที่วาดด้วยโค้ด (`assets/gear85/gear.svg`) เมื่อ ChatGPT ใช้ได้อีกครั้ง:

1. แนบ `assets/gear43/gear.png` (ไอคอนอุปกรณ์ชุดเดิม) ให้ ChatGPT ดูสไตล์
2. วาง prompt ด้านล่าง
3. บันทึกเป็น `outputs/gear85.png` แล้วบอก Claude: "ได้ไอคอน gear85 แล้ว"
   Claude จะใส่แทนไฟล์ SVG (ตำแหน่งช่องเดิม ไม่ต้องแก้ข้อมูลไอเท็ม)

```
Use the attached icon sheet as the exact style reference: painted pixel-art game icons, warm Thai folk palette,
dark outline, soft drop shadow, transparent background.
Create ONE PNG, 1536 x 1024 px, fully transparent background, exactly 6 columns x 4 rows of 256 px cells.
Each icon is centred in its cell, fills about 75% of it, nothing touches the cell edge, no text or grid lines.
Row 1, left to right:
1 a white cotton travel headband with two short tails and a thin red stripe
2 a Thai conical palm-leaf hat (ngob) with a red chin cord
3 (leave empty)
4 a hand-woven beige cotton cloak with a wooden toggle
5 a deep red cloak with a gold yantra diamond pattern and gold hem
6 a pair of woven palm-leaf sandals
Row 2, left to right:
1 a pair of brown buffalo-leather shoes with pale stitching
2 tall dark ranger boots with brass bands
Rows 3-4 empty.
```
