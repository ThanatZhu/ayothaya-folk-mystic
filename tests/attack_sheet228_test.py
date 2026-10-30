import sys,unittest
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from attack_sheet228 import extract_sheet

class CompleteFigures(unittest.TestCase):
 def sheet(self,bridge=False):
  im=Image.new('RGBA',(1200,1000));d=ImageDraw.Draw(im);tops=[8,260,450,635,815];heights=[240,180,170,160,170]
  for row,(top,height) in enumerate(zip(tops,heights)):
   for col in range(12):
    x=col*100+50;bottom=top+height-1
    d.ellipse((x-24,top,x+24,top+60),fill='#25252cff')
    d.rectangle((x-16,top+42,x+16,top+height*.66),fill='#b7734aff')
    d.rectangle((x-16,top+height*.6,x-4,bottom),fill='#313136ff')
    d.rectangle((x+4,top+height*.6,x+16,bottom),fill='#313136ff')
  if bridge:d.line((34,247,50,264),fill='#313136ff',width=1)
  return im,tops,heights
 def test_irregular_rows_preserve_the_complete_legs(self):
  im,tops,heights=self.sheet();rows=extract_sheet(im)
  for r,row in enumerate(rows):
   for c,f in enumerate(row):
    self.assertEqual(f['sourceBounds'][1],tops[r])
    self.assertEqual(f['sourceBounds'][3],tops[r]+heights[r])
    self.assertGreater(f['image'].getpixel((16,f['image'].height-2))[3],0)
  self.assertGreater(rows[0][0]['sourceBounds'][3],im.height/5,'regression: feet extend below the old equal-row crop')
 def test_thin_touch_between_rows_does_not_merge_or_cut_legs(self):
  im,tops,heights=self.sheet(bridge=True);rows=extract_sheet(im)
  for r in [0,1]:
   self.assertGreaterEqual(rows[r][0]['sourceBounds'][3],tops[r]+heights[r])
   self.assertLess(rows[r][0]['image'].height,250)

 def test_real_packed_views_have_safe_alpha_margins_and_restored_boxer_feet(self):
  import json
  root=Path(__file__).resolve().parents[1];count=0
  for path in (root/'assets/attack228').glob('*-male.json'):
   for meta_path in [path,path.with_name(path.name.replace('-male.json','-female.json'))]:
    meta=json.loads(meta_path.read_text(encoding='utf8'));self.assertEqual(meta['version'],228)
    for variant in meta['variants']:
     atlas=Image.open(root/'assets/attack228'/variant['image'])
     for row in range(8):
      for col in range(4):
       cell=atlas.crop((col*320,row*320,(col+1)*320,(row+1)*320))
       bounds=cell.getchannel('A').point(lambda v:255 if v>=115 else 0).getbbox()
       self.assertIsNotNone(bounds);self.assertGreaterEqual(min(bounds[:2]),2)
       self.assertLessEqual(max(bounds[2:]),318);count+=1
  self.assertEqual(count,1536)
  calibration=json.loads((root/'docs/attack-motion224-sources/calibration.json').read_text(encoding='utf8'))
  for frame in calibration['boxer-male/0/E']['frames']:
   self.assertGreaterEqual(frame['sourceBounds'][3],500,'full source feet must extend below the former 485px row cutoff')

if __name__=='__main__':unittest.main()

