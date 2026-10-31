import sys,unittest,json
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from attack_sheet228 import extract_sheet
ROOT=Path(__file__).resolve().parents[1]
class GaitFigures(unittest.TestCase):
 def test_eight_column_extraction_keeps_feet_beyond_nominal_rows(self):
  source=Image.open(ROOT/'docs/character-gait220-sources/novice-male.png')
  rows=extract_sheet(source,columns=8,grid_rows=5,recover_edge=False)
  self.assertEqual([len(row) for row in rows],[8]*5)
  for col in range(4):
   self.assertGreater(rows[0][col]['sourceBounds'][3],source.height/5)
   self.assertGreater(rows[2][col]['sourceBounds'][3],source.height*3/5)
  # A synthetic sprite's solid legs cross the old row boundary. Full alpha is retained.
  sheet=Image.new('RGBA',(800,1000));draw=ImageDraw.Draw(sheet)
  for r,top in enumerate([8,260,450,635,815]):
   for c in range(8):
    x=c*100+50;bottom=top+(240 if r==0 else 165)
    draw.ellipse((x-20,top,x+20,top+50),fill='#332211')
    draw.rectangle((x-12,top+40,x+12,bottom),fill='#443322')
  packed=extract_sheet(sheet,columns=8,grid_rows=5,recover_edge=False)
  self.assertEqual(packed[0][0]['sourceBounds'][3],249)
 def test_all_runtime_cells_have_complete_alpha_and_consistent_contact_height(self):
  total=0
  for meta_path in (ROOT/'assets/character-gait235').glob('*-male.json'):
   for p in [meta_path,meta_path.with_name(meta_path.name.replace('-male','-female'))]:
    m=json.loads(p.read_text());self.assertEqual(m['version'],235)
    for meta in [m,{**m,**m['tiers']['sd']}]:
     cell=meta['cell']
     for mode in ['walk','run']:
      atlas=Image.open(ROOT/'assets/character-gait235'/meta['clips'][mode]['image'])
      for row in range(8):
       for col in range(4):
        f=atlas.crop((col*cell,row*cell,(col+1)*cell,(row+1)*cell));bounds=f.getchannel('A').point(lambda v:255 if v>=115 else 0).getbbox()
        self.assertIsNotNone(bounds);self.assertGreaterEqual(min(bounds[:2]),1);self.assertLessEqual(max(bounds[2:]),cell-1);total+=1
  self.assertEqual(total,2048)
  calibration=json.loads((ROOT/'assets/character-gait235/calibration.json').read_text())
  for key,clip in calibration.items():
   fs=clip['frames'];height=sum(fs[i]['floor']-fs[i]['crown'] for i in [0,2])/2
   self.assertLess(abs(height-160),3,key)
   for f in fs:
    self.assertIn('sourceBounds',f)
    if '/walk/' in key:self.assertLessEqual(abs(f['floor']-240),1,key)
if __name__=='__main__':unittest.main()
