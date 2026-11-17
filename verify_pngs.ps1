Add-Type -AssemblyName System.Drawing

$names = @("tron.png", "bnb.png", "binance.png", "usdt.png")
$dir = "C:\Users\rizva\.gemini\antigravity\scratch\trading-platform\client\public\icons"

foreach ($name in $names) {
    $p = Join-Path $dir $name
    $img = [System.Drawing.Bitmap]::FromFile($p)
    Write-Host "$name size: $($img.Width) x $($img.Height)"
    
    # Check (0,0) - should be 0 alpha (transparent)
    $cCorner = $img.GetPixel(0, 0)
    Write-Host "  Corner (0,0) Alpha=$($cCorner.A) (Expected 0)"
    
    # Check center - should be 255 alpha (solid)
    $cMid = $img.GetPixel([int]($img.Width/2), [int]($img.Height/2))
    Write-Host "  Center Alpha=$($cMid.A), R=$($cMid.R), G=$($cMid.G), B=$($cMid.B)"
    
    $img.Dispose()
}
