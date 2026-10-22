# Regenerates icons/icon-{16,32,48,128}.png. Usage: powershell -File scripts/make-icons.ps1 -OutDir icons
param([string]$OutDir)
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $OutDir | Out-Null

# Largest bold font (in px) whose rendering of $text fits within $maxW x $maxH.
function Get-FittingFont($g, [string]$text, [single]$maxW, [single]$maxH) {
  $px = $maxH
  while ($px -gt 4) {
    $font = New-Object System.Drawing.Font 'Segoe UI', $px, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $sz = $g.MeasureString($text, $font, [int]9999, [System.Drawing.StringFormat]::GenericTypographic)
    if ($sz.Width -le $maxW -and $sz.Height -le $maxH) { return $font }
    $font.Dispose()
    $px -= 0.5
  }
  return New-Object System.Drawing.Font 'Segoe UI', 4, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
}

foreach ($size in 16, 32, 48, 128) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)

  # Wide rounded rectangle, like a play button, centred in the square canvas
  $bw = [single]($size * 0.98)
  $bh = [single]($size * 0.70)
  $bx = [single](($size - $bw) / 2)
  $by = [single](($size - $bh) / 2)
  $d = [single]($bh * 0.5)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($bx, $by, $d, $d, 180, 90)
  $path.AddArc($bx + $bw - $d, $by, $d, $d, 270, 90)
  $path.AddArc($bx + $bw - $d, $by + $bh - $d, $d, $d, 0, 90)
  $path.AddArc($bx, $by + $bh - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 204, 0, 0))), $path)

  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = 'Center'
  $fmt.LineAlignment = 'Center'
  $innerW = [single]($bw * 0.86)

  # Two lines, "YouTube" over "GIF", in the same font size ("YouTube" is the wider word, so it sets the size)
  $font = Get-FittingFont $g 'YouTube' $innerW ([single]($bh * 0.42))
  $g.DrawString('YouTube', $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF $bx, ($by + $bh * 0.04), $bw, ($bh * 0.48)), $fmt)
  $g.DrawString('GIF', $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF $bx, ($by + $bh * 0.48), $bw, ($bh * 0.48)), $fmt)

  # Thin strike-through slash, kept inside the red shape
  $stroke = [single][Math]::Max(1.5, $size * 0.04)
  $mx = [single]($bw * 0.18)
  $my = [single]($bh * 0.12)
  $x1 = $bx + $mx; $y1 = $by + $bh - $my; $x2 = $bx + $bw - $mx; $y2 = $by + $my
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $stroke
  $pen.StartCap = 'Round'
  $pen.EndCap = 'Round'
  $g.DrawLine($pen, $x1, $y1, $x2, $y2)

  $bmp.Save((Join-Path $OutDir "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
