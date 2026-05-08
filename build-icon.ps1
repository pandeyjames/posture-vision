$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$IconPath = Join-Path $AppDir "assets\posture-vision.ico"
$Sizes = @(16, 24, 32, 48, 64, 128, 256)
$Pngs = @()

foreach ($Size in $Sizes) {
    $Bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
    $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $Graphics.Clear([System.Drawing.Color]::Transparent)

    $Scale = $Size / 256.0
    $Radius = [Math]::Round(56 * $Scale)
    $Rect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
    $Path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $Diameter = $Radius * 2
    $Path.AddArc($Rect.X, $Rect.Y, $Diameter, $Diameter, 180, 90)
    $Path.AddArc($Rect.Right - $Diameter, $Rect.Y, $Diameter, $Diameter, 270, 90)
    $Path.AddArc($Rect.Right - $Diameter, $Rect.Bottom - $Diameter, $Diameter, $Diameter, 0, 90)
    $Path.AddArc($Rect.X, $Rect.Bottom - $Diameter, $Diameter, $Diameter, 90, 90)
    $Path.CloseFigure()

    $TealBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#0f766e"))
    $WhiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#f8faf9"))
    $WhitePen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#f8faf9")), ([Math]::Max(2, 18 * $Scale))
    $BodyPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#f8faf9")), ([Math]::Max(3, 22 * $Scale))
    $GreenPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#86efac")), ([Math]::Max(2, 12 * $Scale))

    foreach ($Pen in @($WhitePen, $BodyPen, $GreenPen)) {
        $Pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $Pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $Pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    }

    $Graphics.FillPath($TealBrush, $Path)
    $Graphics.FillEllipse($WhiteBrush, [float](100 * $Scale), [float](36 * $Scale), [float](56 * $Scale), [float](56 * $Scale))
    $Graphics.DrawLine($BodyPen, [float](128 * $Scale), [float](91 * $Scale), [float](128 * $Scale), [float](155 * $Scale))
    $Graphics.DrawArc($BodyPen, [float](78 * $Scale), [float](122 * $Scale), [float](100 * $Scale), [float](58 * $Scale), 25, 130)
    $Graphics.DrawLine($WhitePen, [float](78 * $Scale), [float](205 * $Scale), [float](178 * $Scale), [float](205 * $Scale))
    $Graphics.DrawLine($GreenPen, [float](174 * $Scale), [float](62 * $Scale), [float](209 * $Scale), [float](62 * $Scale))
    $Graphics.DrawLine($GreenPen, [float](191 * $Scale), [float](44 * $Scale), [float](209 * $Scale), [float](62 * $Scale))
    $Graphics.DrawLine($GreenPen, [float](191 * $Scale), [float](80 * $Scale), [float](209 * $Scale), [float](62 * $Scale))

    $Stream = New-Object System.IO.MemoryStream
    $Bitmap.Save($Stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $Pngs += ,$Stream.ToArray()

    $Graphics.Dispose()
    $Bitmap.Dispose()
    $TealBrush.Dispose()
    $WhiteBrush.Dispose()
    $WhitePen.Dispose()
    $BodyPen.Dispose()
    $GreenPen.Dispose()
}

$FileStream = [System.IO.File]::Create($IconPath)
$Writer = New-Object System.IO.BinaryWriter $FileStream
$Writer.Write([UInt16]0)
$Writer.Write([UInt16]1)
$Writer.Write([UInt16]$Pngs.Count)

$Offset = 6 + (16 * $Pngs.Count)
for ($Index = 0; $Index -lt $Pngs.Count; $Index += 1) {
    $Size = $Sizes[$Index]
    $Bytes = $Pngs[$Index]
    $Writer.Write([byte]$(if ($Size -ge 256) { 0 } else { $Size }))
    $Writer.Write([byte]$(if ($Size -ge 256) { 0 } else { $Size }))
    $Writer.Write([byte]0)
    $Writer.Write([byte]0)
    $Writer.Write([UInt16]1)
    $Writer.Write([UInt16]32)
    $Writer.Write([UInt32]$Bytes.Length)
    $Writer.Write([UInt32]$Offset)
    $Offset += $Bytes.Length
}

foreach ($Bytes in $Pngs) {
    $Writer.Write($Bytes)
}

$Writer.Close()
$FileStream.Close()
Write-Output "Created $IconPath"
