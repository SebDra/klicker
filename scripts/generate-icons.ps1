# Erzeugt die PNG-App-Icons in public/icons (Windows PowerShell, .NET System.Drawing).
# Aufruf: powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force $outDir | Out-Null

$bg = [System.Drawing.ColorTranslator]::FromHtml('#2563eb')

function New-Icon([int]$size, [string]$file, [bool]$maskable, [bool]$rounded) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)

  $brush = New-Object System.Drawing.SolidBrush $bg
  if ($rounded) {
    $r = [int]($size * 0.22)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $r, $r, 180, 90)
    $path.AddArc($size - $r, 0, $r, $r, 270, 90)
    $path.AddArc($size - $r, $size - $r, $r, $r, 0, 90)
    $path.AddArc(0, $size - $r, $r, $r, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
  } else {
    $g.FillRectangle($brush, 0, 0, $size, $size)
  }

  # Maskable: Inhalt innerhalb der 80%-Sicherheitszone halten.
  $scale = if ($maskable) { 0.36 } else { 0.46 }
  $font = New-Object System.Drawing.Font 'Segoe UI', ([float]($size * $scale)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = 'Center'
  $fmt.LineAlignment = 'Center'
  $rect = New-Object System.Drawing.RectangleF 0, ([float]($size * 0.02)), $size, $size
  $g.DrawString('+1', $font, [System.Drawing.Brushes]::White, $rect, $fmt)

  $bmp.Save((Join-Path $outDir $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon 192 'icon-192.png' $false $true
New-Icon 512 'icon-512.png' $false $true
New-Icon 512 'icon-maskable-512.png' $true $false
# iOS rundet selbst ab und mag keine Transparenz -> volle Fläche.
New-Icon 180 'apple-touch-icon.png' $false $false
Write-Output "Icons erzeugt in $outDir"
