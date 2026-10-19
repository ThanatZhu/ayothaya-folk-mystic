# ท่าเดินใหม่ ผู้ฝึกตน (novice) · 0.73

## สิ่งที่ต้องทำ
1. เปิดแชตใหม่ใน ChatGPT แล้วแนบ 2 ไฟล์จาก repo:
   - `assets/animation37/novice.png` (ภาพตัวละครชุดเดิม ใช้เป็นต้นแบบหน้าตา ชุด และสัดส่วน)
   - `assets/animation37/novice-walk.png` (ท่าเดินชุดเก่า ใช้ดูขนาดและการจัดช่อง)
2. วาง Prompt A ในกล่องด้านล่าง ได้ภาพแล้วตรวจด้วยตา 4 ข้อ:
   - ครบ 16 ตัว เรียง 4×4 พื้นหลังโปร่งใส ไม่มีตัวหนังสือ
   - แถวบน 2 แถวเป็นผู้ชาย แถวล่าง 2 แถวเป็นผู้หญิง
   - หน้าตา ผม และชุดเหมือนภาพต้นแบบทุกตัว
   - ขาซ้ายกับขาขวาสลับกันชัด (ตัวที่ 1 กับตัวที่ 5 ต้องเป็นขาคนละข้าง)
   ถ้าข้อไหนไม่ผ่าน ใช้ Prompt แก้ (ท้ายไฟล์)
3. บันทึกเป็น `novice-walk73.png` วางที่ `outputs/novice-walk73.png`
4. (ถ้ามีแรง) ใช้ Prompt B ทำท่าเดินหันหน้าเข้ากล้อง/หันหลัง บันทึกเป็น `novice-walk73-frontback.png`
5. ส่งข้อความกลับมาว่า "ถึง Claude: ได้ภาพท่าเดิน novice-walk73 แล้ว"

Claude จะตัดช่อง หาจุดเท้า จัดให้ทุกเฟรมยืนบนพื้นระดับเดียวกัน ใส่ในเกม ทดสอบ แล้วขึ้นเว็บ
ถ้าผู้ฝึกตนออกมาดี ค่อยทำอาชีพอื่นด้วย prompt เดียวกัน (เปลี่ยนชื่อไฟล์ต้นแบบ)

---

## Prompt A: ท่าเดินด้านข้าง 8 เฟรม ชาย + หญิง
```
Use the attached character sheet (novice.png) as the exact identity reference: same face, hair, topknot, clothes,
colors, chibi proportions (big head, small body) and painted pixel-art finish. Use the attached walk sheet only
to match sprite size and cell layout.

Create ONE new PNG: a smooth WALK CYCLE sprite sheet. Square canvas 1254 x 1254 px, fully TRANSPARENT background
(real alpha, no white, no checkerboard, no floor, no shadow, no glow). Exactly 4 columns x 4 rows of equal cells.
Each sprite fills about 70% of its cell height, centered horizontally, and ALL sprites stand on the SAME baseline
at the same height in every cell, so the feet line up row to row. Leave clear empty gutters; nothing touches a
cell edge; nothing is cropped (complete feet, hands and hair).

Rows 1-2 = the male character, rows 3-4 = the female character, 8 frames each, read left to right, top to bottom.
Every frame: three-quarter view walking toward screen RIGHT, same camera angle, same scale, same outfit.
The 8 frames are ONE continuous walk cycle, evenly spaced in time:
1 left foot forward contact (heel down, right foot back)
2 down: weight on left leg, knees bent, body slightly lower
3 passing: right leg swings past the left, body at normal height
4 up: on left toes, right leg forward in the air, body slightly higher
5 right foot forward contact (mirror of frame 1: RIGHT foot in front)
6 down: weight on right leg
7 passing: left leg swings past the right
8 up: on right toes, left leg forward in the air
Arms swing opposite to the legs (left leg forward = right arm forward). The head bobs only 2-3 pixels.
Frames 1 and 5 must clearly show DIFFERENT legs in front. Keep the head and torso shape identical across
frames; only legs, arms and a small body bob change.

No text, numbers, labels, grid lines or cell borders. Game asset texture, not a poster.
```

## Prompt B: เดินหันหน้าเข้ากล้อง และหันหลัง (ไม่บังคับ)
```
Same identity reference and style as before. ONE PNG, 1254 x 1254 px, transparent background, 4 x 4 equal cells,
sprites ~70% of cell height on one shared baseline, nothing cropped, no text or grid.
Row 1: male walking TOWARD the camera, 4 frames: left foot forward, passing, right foot forward, passing.
Row 2: male walking AWAY from the camera (back view), same 4 frames.
Row 3: female walking toward the camera, same 4 frames.
Row 4: female walking away from the camera, same 4 frames.
Arms swing opposite to legs, small head bob only, outfit and proportions identical to the reference.
```

## Prompt แก้ (ใช้เมื่อภาพไม่ผ่าน)
- ขาไม่สลับ: `redo: frames 1 and 5 must have opposite legs in front; make the stride clearly visible`
- หน้าตาเพี้ยน: `redo: keep the face, hair and outfit exactly like the attached novice.png reference in every frame`
- ตัวลอยไม่เท่ากัน: `redo: every sprite stands on the same baseline height in its cell; feet line up across a row`
- พื้นหลังไม่ใส: `redo: transparent background only, no floor, no shadow, no grid lines, no text`
