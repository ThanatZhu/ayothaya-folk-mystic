param([string]$Root = $PSScriptRoot)
Add-Type -AssemblyName System.Drawing
$taskRows=@{
 'skills-novice.png'=@(@(0,627,1254),@(0,627,1254));
 'skills-swordsman.png'=@(@(0,258,512,767,1024,1276,1536),@(0,255,504,741,1024));
 'skills-lancer.png'=@(@(0,255,511,767,1024,1279,1536),@(0,255,501,745,1024));
 'skills-hunter.png'=@(@(0,287,519,766,1023,1278,1536),@(0,248,485,727,1024));
 'skills-boxer.png'=@(@(0,289,538,768,1028,1280,1536),@(0,256,494,737,1024));
 'skills-rogue.png'=@(@(0,254,512,768,1025,1281,1536),@(0,256,510,762,1024));
 'skills-shaman.png'=@(@(0,256,513,766,1023,1279,1536),@(0,256,512,759,1024));
 'skills-acolyte.png'=@(@(0,258,513,767,1024,1278,1536),@(0,255,504,754,1024))
}
$taskManifest=Get-Content -LiteralPath (Join-Path $Root 'generation.json') -Raw | ConvertFrom-Json
$taskIcons=Join-Path $Root 'icons'
New-Item -ItemType Directory -Force -Path $taskIcons | Out-Null
$taskIndex=@()
foreach($taskSheet in $taskManifest.sheets){
 $taskSrc=[System.Drawing.Image]::FromFile((Join-Path (Join-Path $Root 'raw') $taskSheet.filename))
 $taskSize=[System.Drawing.Size]::new(256*$taskSheet.columns,256*$taskSheet.rows)
 $taskAtlas=[System.Drawing.Bitmap]::new($taskSize.Width,$taskSize.Height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $taskGraphic=[System.Drawing.Graphics]::FromImage($taskAtlas)
 $taskGraphic.Clear([System.Drawing.Color]::FromArgb(255,0,24,20))
 $taskGraphic.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $taskGraphic.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
 $taskGraphic.CompositingQuality=[System.Drawing.Drawing2D.CompositingQuality]::HighQuality
 $taskAttr=[System.Drawing.Imaging.ImageAttributes]::new()
 $taskAttr.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
 $taskBounds=$taskRows[$taskSheet.filename]
 $taskCols=$taskBounds[0].Count-1
 for($taskN=0;$taskN -lt $taskSheet.icons;$taskN++){
  $taskSX=$taskN%$taskCols;$taskSY=[math]::Floor($taskN/$taskCols)
  $taskL=$taskBounds[0][$taskSX]+3;$taskT=$taskBounds[1][$taskSY]+3
  $taskW=$taskBounds[0][$taskSX+1]-$taskL-3;$taskH=$taskBounds[1][$taskSY+1]-$taskT-3
  # Mechanical atlas packing only: preserve each generated illustration's aspect ratio.
  # The 20px inner safe area keeps every painting within its 256px game slot.
  $taskScale=216.0/[math]::Max($taskW,$taskH)
  $taskDW=[int][math]::Round($taskW*$taskScale);$taskDH=[int][math]::Round($taskH*$taskScale)
  $taskCX=$taskN%$taskSheet.columns;$taskCY=[int][math]::Floor($taskN/$taskSheet.columns)
  $taskDest=[System.Drawing.Rectangle]::new([int]($taskCX*256+(256-$taskDW)/2),[int]($taskCY*256+(256-$taskDH)/2),$taskDW,$taskDH)
  $taskGraphic.DrawImage($taskSrc,$taskDest,[single]$taskL,[single]$taskT,[single]$taskW,[single]$taskH,[System.Drawing.GraphicsUnit]::Pixel,$taskAttr)
  $taskKind=if($taskSheet.index -eq 1){if($taskN -eq 3){'ultimate'}else{'active'}}elseif($taskCY -eq 0){if($taskCX -eq 5){'ultimate'}else{'active'}}elseif($taskCY -lt 3){if($taskCX -lt 3){'active'}elseif($taskCX -eq 3){'ultimate'}else{'passive'}}else{'passive'}
  $taskName=$taskSheet.filename.Replace('skills-','').Replace('.png','')+'-r'+($taskCY+1)+'-c'+($taskCX+1)+'.png'
  $taskRect=[System.Drawing.Rectangle]::new($taskCX*256,$taskCY*256,256,256)
  $taskCell=$taskAtlas.Clone($taskRect,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $taskCell.Save((Join-Path $taskIcons $taskName),[System.Drawing.Imaging.ImageFormat]::Png);$taskCell.Dispose()
  $taskIndex+=@{sheet=$taskSheet.filename;file='icons/'+$taskName;class=$taskSheet.className;row=$taskCY+1;column=$taskCX+1;kind=$taskKind;x=$taskCX*256;y=$taskCY*256;width=256;height=256}
 }
 $taskAtlas.Save((Join-Path $Root $taskSheet.filename),[System.Drawing.Imaging.ImageFormat]::Png)
 $taskAttr.Dispose();$taskGraphic.Dispose();$taskAtlas.Dispose();$taskSrc.Dispose()
}
@{cellSize=256;innerPadding=20;totalIcons=$taskIndex.Count;icons=$taskIndex;normalization='Generated artwork, aspect-preserving mechanical atlas packing; no runtime integration'} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Root 'icon-map.json') -Encoding utf8
Write-Output ("Packed "+$taskIndex.Count+" icons into 8 sheets.")

